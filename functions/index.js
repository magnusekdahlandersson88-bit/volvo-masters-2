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
    console.log('Pushmottagare:', {
  senderDeviceId: message.senderDeviceId || null,
  antal: entries.length,
  enheter: entries.map((entry) => ({
    id: entry.id,
    deviceId: entry.deviceId || null,
    harToken: Boolean(entry.token),
  })),
})
    if (!entries.length) {
  console.log('Ingen registrerad mottagare hittades')
  return
}

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
  headers: {
    Urgency: 'high',
  },
  notification: {
    icon: 'https://volvo-masters.vercel.app/icons/icon-192.png',
    badge: 'https://volvo-masters.vercel.app/icons/badge-96.png',
  },
  fcmOptions: {
    link: 'https://volvo-masters.vercel.app/?view=chat',
  },
},
      })
      console.log('Pushresultat:', {
  lyckades: response.successCount,
  misslyckades: response.failureCount,
  fel: response.responses
    .map((result, index) => ({
      index,
      success: result.success,
      code: result.error?.code || null,
      message: result.error?.message || null,
    }))
    .filter((result) => !result.success),
})
      await removeInvalidTokens(batch, response)
    }

    await event.data.ref.set({ notificationSentAt: FieldValue.serverTimestamp() }, { merge: true })
  },
)
