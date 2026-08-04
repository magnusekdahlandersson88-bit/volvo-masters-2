const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')

initializeApp()

const db = getFirestore()

function previewText(value, maxLength = 110) {
  const text = String(value || '').trim()
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

async function loadEnabledTokens(excludedDeviceId = '') {
  const snapshot = await db.collection('pushTokens').where('enabled', '==', true).get()
  return snapshot.docs
    .map((document) => ({ id: document.id, ...document.data() }))
    .filter((entry) => entry.token && entry.deviceId !== excludedDeviceId)
}

async function removeInvalidTokens(entries, response) {
  const invalidCodes = new Set([
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
  ])

  const removals = []
  response.responses.forEach((result, index) => {
    if (!result.success && invalidCodes.has(result.error?.code)) {
      removals.push(db.collection('pushTokens').doc(entries[index].id).delete())
    }
  })
  await Promise.all(removals)
}

exports.notifyNewChatMessage = onDocumentCreated(
  {
    document: 'chat/{messageId}',
    region: 'europe-west1',
    retry: false,
  },
  async (event) => {
    const message = event.data?.data()
    if (!message || !message.text) return

    const entries = await loadEnabledTokens(message.senderDeviceId || '')
    if (!entries.length) return

    const title = `💬 ${message.name || 'Volvo Masters'}`
    const body = previewText(message.text)

    for (let start = 0; start < entries.length; start += 500) {
      const batch = entries.slice(start, start + 500)
      const response = await getMessaging().sendEachForMulticast({
        tokens: batch.map((entry) => entry.token),
        data: {
          title,
          body,
          view: 'chat',
          tag: `chat-${event.params.messageId}`,
          messageId: event.params.messageId,
        },
        android: {
          priority: 'high',
        },
        webpush: {
          headers: { Urgency: 'high' },
          fcmOptions: {
            link: '/?view=chat',
          },
        },
      })
      await removeInvalidTokens(batch, response)
    }

    await event.data.ref.set({ notificationSentAt: FieldValue.serverTimestamp() }, { merge: true })
  },
)
