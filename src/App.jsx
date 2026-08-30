import { useEffect, useMemo, useState } from 'react'
import { initializeApp } from 'firebase/app'
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage'
import { getFirestore, doc, onSnapshot, setDoc, collection, addDoc ,query,
orderBy,} from "firebase/firestore";
import './index.css'
import LiveBallFollow from "./components/LiveBallFollow";
import LiveActivityFeed from "./components/LiveActivityFeed";
import Gallery from "./components/Gallery";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
const firebaseConfig = {
  apiKey: 'AIzaSyBx8lrLzDWoYAonfiWMvOIpkkDqOo2LC88',
  authDomain: 'volvo-masters.firebaseapp.com',
  projectId: 'volvo-masters',
  storageBucket: 'volvo-masters.firebasestorage.app',
  messagingSenderId: '158093315460',
  appId: '1:158093315460:web:561b64a7f3d24db0fb61d1'
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const storage = getStorage(app)
const VAPID_KEY = "BMJD9Wr_zDfFGIbAdSRqB39xtu93VvOl117StX3suiERk6l23O5uwW3lkkPtTwc5-h_oieWP5bheEhhBQtnnyk8"

function getDeviceId() {
  const key = 'vm_device_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(key, id)
  }
  return id
}

async function getMessagingInstance() {
  if (!(await isSupported())) return null
  return getMessaging(app)
}

async function registerPushToken(playerName = '') {
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('Den här webbläsaren stöder inte pushnotiser.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { enabled:false, reason:'denied' }

  const messaging = await getMessagingInstance()
  if (!messaging) throw new Error('Firebase Messaging stöds inte på den här enheten.')

  const serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  await navigator.serviceWorker.ready

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration,
  })
  if (!token) throw new Error('Ingen FCM-token kunde skapas.')

  await setDoc(doc(db, 'pushTokens', token), {
    token,
    deviceId: getDeviceId(),
    playerName: playerName || '',
    ownerName: playerName || '',
    updatedAt: Date.now(),
    createdAt: Date.now(),
    userAgent: navigator.userAgent,
    enabled: true,
    active: true,
  }, { merge:true })

  return { enabled:true, token }
}

const ADMIN_PASSWORD = '340426'
const DEFAULT_PAR = [4,3,5,4,4,3,5,4,4,4,3,5,4,4,3,5,4,4]
const DEFAULT_SI = [1,13,5,11,3,15,7,17,9,2,14,6,12,4,16,8,18,10]
const makeHoles = () => DEFAULT_PAR.map((par, i) => ({ par, si: DEFAULT_SI[i] }))

const DEFAULT_PLAYERS = [
  'Jonas Ottosson','Henrik Bergman','Magnus Ekdahl','Viktor Eriksson','Conny Pettersson','Per Nilsson',
  'Hugo Ottosson','Simon Rydgren','Philip Lecaros','Mattias Svensson','Jonatan Fagerström','Erik Skaremyr'
]

const DEFAULT_COURSES = [
  { id:1, name:'Breviken GK', tee:'Gul', location:'Karlsborg', par:72, cr:71.4, slope:136, emoji:'🏨', holes:makeHoles() },
  { id:2, name:'Billingen GK', tee:'53', location:'Skövde', par:70, cr:69.3, slope:132, emoji:'⛰️', holes:makeHoles() },
  { id:3, name:'Knistad Golf & Country Club', tee:'55', location:'Skövde', par:72, cr:70.3, slope:126, emoji:'🏰', holes:makeHoles() },
  { id:4, name:'Skövde GK', tee:'58', location:'Skövde', par:72, cr:71.9, slope:137, emoji:'🌿', holes:makeHoles() },
  { id:5, name:'Mariestad GK', tee:'57', location:'Mariestad', par:73, cr:71.9, slope:134, emoji:'🌊', holes:makeHoles() },
  { id:6, name:'Läckö GK', tee:'Gul', location:'Lidköping', par:72, cr:71.6, slope:138, emoji:'🏯', holes:makeHoles() }
]

const DEFAULT_ROUNDS = [
  { slot:1, courseId:1, date:'14 maj 2026', teeTimes:{1:'',2:'',3:''}, groups:[
    {id:1,name:'Fyrboll 1',players:['Magnus Ekdahl','Simon Rydgren','Hugo Ottosson','Jonatan Fagerström']},
    {id:2,name:'Fyrboll 2',players:['Viktor Eriksson','Philip Lecaros','Mattias Svensson','Erik Skaremyr']},
    {id:3,name:'Treboll',players:['Per Nilsson','Jonas Ottosson','Conny Pettersson']}
  ]},
  { slot:2, courseId:2, date:'29 maj 2026', teeTimes:{1:'',2:'',3:''}, groups:[
    {id:1,name:'Treboll',players:['Henrik Bergman','Conny Pettersson','Mattias Svensson']},
    {id:2,name:'Fyrboll 1',players:['Jonas Ottosson','Per Nilsson','Magnus Ekdahl','Simon Rydgren']},
    {id:3,name:'Fyrboll 2',players:['Hugo Ottosson','Erik Skaremyr','Jonatan Fagerström','Philip Lecaros']}
  ]},
  { slot:3, courseId:5, date:'21 jun 2026', teeTimes:{1:'',2:'',3:''}, groups:[
    {id:1,name:'Fyrboll 1',players:['Per Nilsson','Mattias Svensson','Erik Skaremyr','Simon Rydgren']},
    {id:2,name:'Treboll',players:['Conny Pettersson','Hugo Ottosson','Philip Lecaros']},
    {id:3,name:'Fyrboll 2',players:['Henrik Bergman','Viktor Eriksson','Jonas Ottosson','Magnus Ekdahl']}
  ]},
  { slot:4, courseId:3, date:'3 jul 2026', teeTimes:{1:'',2:'',3:''}, groups:[
    {id:1,name:'Fyrboll 1',players:['Henrik Bergman','Conny Pettersson','Magnus Ekdahl','Philip Lecaros']},
    {id:2,name:'Fyrboll 2',players:['Simon Rydgren','Jonas Ottosson','Jonatan Fagerström','Hugo Ottosson']},
    {id:3,name:'Treboll',players:['Viktor Eriksson','Per Nilsson','Erik Skaremyr']}
  ]},
  { slot:5, courseId:4, date:'7/8-26', teeTimes:{1:'',2:'',3:''}, groups:null },
  { slot:6, courseId:6, date:'', teeTimes:{1:'',2:'',3:''}, groups:null }
]

function chunkPlayers(players) {
  const chunks = []
  for (let i = 0; i < players.length; i += 4) {
    const groupPlayers = players.slice(i, i + 4)
    chunks.push({ id: chunks.length + 1, name: groupPlayers.length === 3 ? 'Treboll' : `Fyrboll ${chunks.length + 1}`, players: groupPlayers })
  }
  return chunks
}

function buildScores(players, rounds) {
  return Object.fromEntries(players.map(p => [p, Object.fromEntries(rounds.map(r => [r.slot, { hcp:'', holeScores:Array(18).fill('') }]))]))
}

function calcPlayingHcp(hcp, slope=113, cr=72, par=72) {
  const n = parseFloat(String(hcp ?? '').replace(',', '.'))
  if (Number.isNaN(n)) return 0
  return Math.round(n * slope / 113 + (cr - par))
}

function calcStableford(strokes, par, si, hcp) {
  if (strokes === '' || strokes == null) return null
  const s = Number(strokes)
  if (!s || Number.isNaN(s)) return null
  const h = Math.max(0, Number(hcp) || 0)
  const extra = Math.floor(h / 18) + (si <= (h % 18) ? 1 : 0)
  const net = s - par - extra
  if (net <= -2) return 4
  if (net === -1) return 3
  if (net === 0) return 2
  if (net === 1) return 1
  return 0
}

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}))
}

function useTournamentData() {
  const [state, setState] = useState({
    loading:true,
    players: DEFAULT_PLAYERS,
    courses: DEFAULT_COURSES,
    rounds: DEFAULT_ROUNDS,
    scores: buildScores(DEFAULT_PLAYERS, DEFAULT_ROUNDS),
    playerHcp: {},
    playerPhotos: {},
    heroImages: {},
    gallery: {},
    comments: {}
  })

  useEffect(() => {
    const ref = doc(db, 'tournament', 'data')
    return onSnapshot(ref, snap => {
      const data = snap.data()
      if (!data) return setState(s => ({...s, loading:false}))
      const players = data.players || DEFAULT_PLAYERS
      const rounds = data.rounds || DEFAULT_ROUNDS
      setState({
        loading:false,
        players,
        courses: data.courses || DEFAULT_COURSES,
        rounds,
        scores: data.scores || buildScores(players, rounds),
        playerHcp: data.playerHcp || {},
        playerPhotos: data.playerPhotos || {},
        heroImages: data.heroImages || {},
        gallery: data.gallery || {},
        comments: data.comments || {}
      })
    }, () => setState(s => ({...s, loading:false})))
  }, [])

  async function save(patch) {
    setState(s => ({...s, ...patch}))
    await setDoc(doc(db, 'tournament', 'data'), patch, { merge:true })
  }
  async function uploadMedia(file) {
  if (!file) return

  try {
    const id = `${Date.now()}-${file.name || 'photo.jpg'}`
    const fileRef = ref(storage, `gallery/${id}`)

    console.log('Laddar upp:', file.name, file.type, file.size)

    await uploadBytes(fileRef, file)
    const url = await getDownloadURL(fileRef)

    const item = {
      id,
      url,
      type: file.type || 'image/jpeg',
      name: file.name || 'Volvo Masters',
      createdAt: Date.now(),
    }

    const currentGallery = Array.isArray(state.gallery)
      ? state.gallery
      : Object.values(state.gallery || {}).flatMap(value =>
          Array.isArray(value) ? value : [value]
        )

    await save({
      gallery: [...currentGallery, item],
    })

    console.log('Uppladdning klar:', url)
  } catch (error) {
    console.error('Galleriuppladdning misslyckades:', error)

    alert(
      `Kunde inte ladda upp bilden.\n\n${error?.message || 'Okänt fel'}`
    )
  }
}
   async function deleteGalleryItem(item) {
  if (!item?.id) return

  try {
    const fileRef = ref(storage, `gallery/${item.id}`)

    await deleteObject(fileRef)

    const currentGallery = Array.isArray(state.gallery)
      ? state.gallery
      : Object.values(state.gallery || {}).flatMap(value =>
          Array.isArray(value) ? value : [value]
        )

    const nextGallery = currentGallery.filter(
      galleryItem => galleryItem?.id !== item.id
    )

    await save({
      gallery: nextGallery,
    })
  } catch (error) {
    console.error('Kunde inte ta bort galleriobjekt:', error)

    alert(
      `Kunde inte ta bort bilden.\n\n${error?.message || 'Okänt fel'}`
    )
  }
} 






  async function uploadPlayerPhoto(playerName, file) {
    if (!playerName || !file) return

    const safeName = playerName
      .toLowerCase()
      .replace(/[^a-z0-9åäö]+/gi, '-')
      .replace(/^-+|-+$/g, '')

    const extension = file.name?.split('.').pop() || 'jpg'
    const id = `${safeName}-${Date.now()}.${extension}`
    const fileRef = ref(storage, `player-photos/${id}`)

    await uploadBytes(fileRef, file)
    const url = await getDownloadURL(fileRef)

    await save({
      playerPhotos: {
        ...(state.playerPhotos || {}),
        [playerName]: url,
      },
    })

    return url
  }

  async function uploadHeroImage(viewId, file) {
    if (!viewId || !file) return

    if (!file.type?.startsWith('image/')) {
      throw new Error('Välj en bildfil.')
    }

    const extension = file.name?.split('.').pop() || 'jpg'
    const id = `${viewId}-${Date.now()}.${extension}`
    const fileRef = ref(storage, `hero-images/${id}`)

    await uploadBytes(fileRef, file)
    const url = await getDownloadURL(fileRef)

    await save({
      heroImages: {
        ...(state.heroImages || {}),
        [viewId]: url,
      },
    })

    return url
  }

  return {
  ...state,
  save,
  uploadMedia,
  deleteGalleryItem,
  uploadPlayerPhoto,
  uploadHeroImage
}
}

function courseFor(courses, round) {
  return courses.find(c => c.id === round?.courseId) || courses[0] || DEFAULT_COURSES[0]
}

function playerRoundResult(player, round, courses, scores, playerHcp) {
  const course = courseFor(courses, round)
  const score = scores?.[player]?.[round?.slot]
  const holes = course.holes?.length === 18 ? course.holes : makeHoles()
  const hcp = score?.hcp || playerHcp?.[player] || ''
  const playing = calcPlayingHcp(hcp, course.slope, course.cr, course.par)
  const holeScores = score?.holeScores || Array(18).fill('')
  const played = holeScores.filter(v => v !== '' && Number(v) > 0).length
  const strokes = holeScores.reduce((sum, st) => st !== '' ? sum + Number(st) : sum, 0)
  const points = holeScores.reduce((sum, st, i) => {
    const pts = calcStableford(st, holes[i]?.par || 4, holes[i]?.si || i + 1, playing)
    return pts == null ? sum : sum + pts
  }, 0)
  const adj = points > 0 ? Math.round(points * (113 / (course.slope || 113)) * 10) / 10 : 0
  const net = strokes > 0 ? Math.round((strokes - playing) * 10) / 10 : 0
  const grossToPar = strokes > 0 ? strokes - (course.par || 72) : 0
  const netToPar = net > 0 ? Math.round((net - (course.par || 72)) * 10) / 10 : 0
  const holeBreakdown = holeScores.map((st, i) => {
    const par = holes[i]?.par || 4
    const si = holes[i]?.si || i + 1
    const n = Number(st)
    const pts = calcStableford(st, par, si, playing)
    const diff = st !== '' && n > 0 ? n - par : null
    return { hole:i+1, strokes: st, par, si, pts, diff }
  })
  return { player, course, played, strokes, points, adj, net, grossToPar, netToPar, playing, hcp, holeScores, holeBreakdown }
}

function leaderboard(players, rounds, courses, scores, playerHcp) {
  return players.map(player => {
    const results = rounds
      .map(r => playerRoundResult(player, r, courses, scores, playerHcp))
      .filter(r => r.played > 0)

    const totalGross = results.reduce((sum, r) => sum + (r.strokes || 0), 0)
    const totalNet = Math.round(results.reduce((sum, r) => sum + (r.net || 0), 0) * 10) / 10
    const totalRawPoints = results.reduce((sum, r) => sum + (r.points || 0), 0)
    const best = [...results].sort((a,b) => b.adj - a.adj).slice(0,4)
    const bestRaw = [...results].sort((a,b) => b.points - a.points).slice(0,4)
    const total = Math.round(best.reduce((sum, r) => sum + r.adj, 0) * 10) / 10
    const best4RawPoints = bestRaw.reduce((sum, r) => sum + r.points, 0)

    return {
      player,
      total,
      rounds: results.length,
      results,
      best,
      latest: results[results.length - 1],
      totalGross,
      totalNet,
      totalRawPoints,
      best4RawPoints,
      avgGross: results.length ? Math.round(totalGross / results.length * 10) / 10 : 0,
      avgNet: results.length ? Math.round(totalNet / results.length * 10) / 10 : 0,
      avgPoints: results.length ? Math.round(totalRawPoints / results.length * 10) / 10 : 0,
    }
  }).sort((a,b) => b.total - a.total || b.rounds - a.rounds)
}

function useLocalIdentity() {
  const [identity, setIdentity] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vm2_identity') || '{}') }
    catch { return {} }
  })
  function update(patch) {
    const next = { ...identity, ...patch }
    setIdentity(next)
    localStorage.setItem('vm2_identity', JSON.stringify(next))
  }
  function clear() {
    setIdentity({})
    localStorage.removeItem('vm2_identity')
  }
  return { identity, update, clear }
}

function App() {
  const data = useTournamentData()
  const uploadMedia = data.uploadMedia
  const uploadPlayerPhoto = data.uploadPlayerPhoto
  const uploadHeroImage = data.uploadHeroImage
  const { identity, update: updateIdentity, clear: clearIdentity } = useLocalIdentity()
  const [view, setView] = useState('home')
  const [admin, setAdmin] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  )
  const [notificationStatus, setNotificationStatus] = useState('')
  const [foregroundNotice, setForegroundNotice] = useState(null)

  useEffect(() => {
    const requestedView = new URLSearchParams(window.location.search).get('view')
    if (requestedView) setView(requestedView)
  }, [])

  useEffect(() => {
    let unsubscribe = () => {}
    let timer

    async function setupMessaging() {
      try {
        const messaging = await getMessagingInstance()
        if (!messaging) return
        unsubscribe = onMessage(messaging, payload => {
          const dataPayload = payload.data || {}
          const notice = {
            title: dataPayload.title || payload.notification?.title || 'Volvo Masters',
            body: dataPayload.body || payload.notification?.body || 'Ny händelse',
            view: dataPayload.view || 'home',
          }
          setForegroundNotice(notice)
          clearTimeout(timer)
          timer = setTimeout(() => setForegroundNotice(null), 6000)
        })
      } catch (error) {
        console.error('Kunde inte starta foreground-notiser', error)
      }
    }

    setupMessaging()
    return () => { unsubscribe(); clearTimeout(timer) }
  }, [])

  async function enableNotificationsForCurrentDevice() {
    setNotificationStatus('Aktiverar…')
    try {
      const result = await registerPushToken(identity?.marker || '')
      if (!result.enabled) {
        setNotificationStatus('Notiser är blockerade i telefonens inställningar.')
        return
      }
      setNotificationsEnabled(true)
      setNotificationStatus('Notiser är aktiverade.')
    } catch (error) {
      console.error(error)
      setNotificationStatus(error.message || 'Notiser kunde inte aktiveras.')
    }
  }
  const [selectedRound, setSelectedRound] = useState(1)
  const liveRound =
  [...data.rounds]
    .reverse()
    .find(r =>
      data.players.some(p =>
        playerRoundResult(
          p,
          r,
          data.courses,
          data.scores,
          data.playerHcp
        ).played > 0
      )
    ) ||
  data.rounds.find(r => r.slot === Number(selectedRound)) ||
  data.rounds[0]
  
  const board = useMemo(() => leaderboard(data.players, data.rounds, data.courses, data.scores, data.playerHcp), [data.players, data.rounds, data.courses, data.scores, data.playerHcp])
  const nextRound = data.rounds.find(r => !data.players.some(p => playerRoundResult(p, r, data.courses, data.scores, data.playerHcp).played > 0)) || data.rounds[0]
  const nextCourse = courseFor(data.courses, nextRound)

  function login() {
  const pwd = prompt('Adminlösenord')

  if (pwd === ADMIN_PASSWORD) {
    setAdmin(true)
    setView('admin')
  } else if (pwd) {
    alert('Fel lösenord')
  }
}

  async function updateHcp(player, value) {
    await data.save({ playerHcp: { ...data.playerHcp, [player]: value } })
  }

  async function updateHole(player, roundSlot, holeIndex, value, sendNotification = false) {
    const scores = clone(data.scores)
    scores[player] ||= {}
    scores[player][roundSlot] ||= { hcp:'', holeScores:Array(18).fill('') }
    scores[player][roundSlot].holeScores ||= Array(18).fill('')

    const previousValue =
      scores[player][roundSlot].holeScores[holeIndex] ?? ''

    scores[player][roundSlot].holeScores[holeIndex] = value
    await data.save({ scores })
    if (!sendNotification) return

    const strokes = Number(value)
    if (!strokes) return

    const round = data.rounds.find(item => item.slot === Number(roundSlot))
    const course = courseFor(data.courses, round)
    const holes =
      course?.holes?.length === 18 ? course.holes : makeHoles()
    const hole = holes[holeIndex] || { par: 4 }
    const diff = strokes - Number(hole.par || 4)

    let event = null

    if (strokes === 1) {
      event = {
        type: 'hole-in-one',
        icon: '🎯',
        title: '🎯 HOLE-IN-ONE!',
        body: `${player} gjorde hole-in-one på hål ${holeIndex + 1}!`,
      }
    } else if (diff <= -2) {
      event = {
        type: 'eagle',
        icon: '🦅',
        title: '🦅 Eagle!',
        body: `${player} gjorde eagle på hål ${holeIndex + 1}.`,
      }
    } else if (diff === -1) {
      event = {
        type: 'birdie',
        icon: '🐦',
        title: '🐦 Birdie!',
        body: `${player} gjorde birdie på hål ${holeIndex + 1}.`,
      }
    }

    if (!event) return

    const safePlayer = player
      .toLowerCase()
      .replace(/[^a-z0-9åäö]+/gi, '-')
      .replace(/^-+|-+$/g, '')

    const eventId =
      `r${roundSlot}-${safePlayer}-h${holeIndex + 1}-${event.type}`

    const eventData = {
      ...event,
      player,
      roundSlot: Number(roundSlot),
      hole: holeIndex + 1,
      strokes,
      par: Number(hole.par || 4),
      course: course?.name || '',
      createdAt: Date.now(),
      url: '/?view=live',
      view: 'live',
      tag: `volvo-masters-${event.type}`,
    }

    try {
      // Deterministic ID prevents duplicate push notifications if the same
      // score is saved repeatedly from one or several devices.
      await setDoc(doc(db, 'notifications', eventId), {
  ...eventData,
  eventKey: eventId,
})

      // Keep a deterministic live event document for the in-app feed.
      await setDoc(doc(db, 'liveEvents', eventId), eventData)
    } catch (error) {
      // Score saving must never fail just because a notification failed.
      console.error('Kunde inte skapa livehändelse', error)
    }
  }

  async function updateRoundGroups(roundSlot, groups, teeTimes = {}) {
    const rounds = data.rounds.map(round =>
      round.slot === roundSlot ? { ...round, groups, teeTimes } : round
    )
    await data.save({ rounds })
  }

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span>♛</span><div><b>VOLVO</b><small>MASTERS 2.4</small></div></div>
      <Nav view={view} setView={setView} admin={admin} onAdmin={login} />
      <button className="adminButton" onClick={admin ? () => { setAdmin(false); setView('home') } : login}>{admin ? 'Lämna admin' : 'Admin'}</button>
    </aside>

    <main className="content">
      {!notificationsEnabled && (
        <div className="notificationSetup">
          <button onClick={enableNotificationsForCurrentDevice} className="adminButton">
            Aktivera notiser
          </button>
          {notificationStatus && <small>{notificationStatus}</small>}
        </div>
      )}
      {foregroundNotice && (
        <button
          className="foregroundNotice"
          onClick={() => { setView(foregroundNotice.view); setForegroundNotice(null) }}
        >
          <span>🔔</span>
          <div><b>{foregroundNotice.title}</b><small>{foregroundNotice.body}</small></div>
        </button>
      )}
      <Topbar loading={data.loading} admin={admin} identity={identity} clearIdentity={clearIdentity} />
      
    

 
      {view !== 'home' && (
        <ViewHero
          view={view}
          rounds={data.rounds}
          courses={data.courses}
          selectedRound={selectedRound}
          identity={identity}
          board={board}
          admin={admin}
          heroImages={data.heroImages}
        />
      )}

      {view === 'home' && <Home
  board={board}
  nextRound={nextRound}
  nextCourse={nextCourse}
  setView={setView}
  rounds={data.rounds}
  setSelectedRound={setSelectedRound}
  heroImages={data.heroImages}
/>}
      {view === 'leaderboard' && <Leaderboard board={board} playerPhotos={data.playerPhotos} />}
      {view === 'rounds' && <Rounds admin={admin} players={data.players} rounds={data.rounds} courses={data.courses} scores={data.scores} playerHcp={data.playerHcp} setView={setView} setSelectedRound={setSelectedRound} updateRoundGroups={updateRoundGroups} />}
      {view === 'score' && <BallScorecard admin={admin} identity={identity} updateIdentity={updateIdentity} players={data.players} rounds={data.rounds} courses={data.courses} scores={data.scores} playerHcp={data.playerHcp} selectedRound={selectedRound} setSelectedRound={setSelectedRound} updateHole={updateHole} updateHcp={updateHcp} />}
      {view === 'live' && (
  <LiveBallFollow
    rounds={data.rounds}
    courses={data.courses}
    scores={data.scores}
    players={data.players}
    activeRound={liveRound}
  />
)}
      {view === 'players' && <Players players={data.players} board={board} rounds={data.rounds} courses={data.courses} scores={data.scores} playerHcp={data.playerHcp} playerPhotos={data.playerPhotos} updateHcp={updateHcp} admin={admin} />}
      {view === 'stats' && <Stats board={board} rounds={data.rounds} players={data.players} courses={data.courses} scores={data.scores} playerHcp={data.playerHcp} />}
      {view === 'chat' && <Chat players={data.players} identity={identity} />}
      {view === "gallery" && (
  <Gallery
  gallery={data.gallery}
  onUpload={uploadMedia}
  admin={admin}
  onDelete={data.deleteGalleryItem}
/>
)}
      {view === 'admin' && admin && (
        <AdminPanel
          players={data.players}
          rounds={data.rounds}
          courses={data.courses}
          playerHcp={data.playerHcp}
          playerPhotos={data.playerPhotos}
          uploadPlayerPhoto={uploadPlayerPhoto}
          heroImages={data.heroImages}
          uploadHeroImage={uploadHeroImage}
          save={data.save}
          updateRoundGroups={updateRoundGroups}
          enableNotifications={enableNotificationsForCurrentDevice}
          notificationsEnabled={notificationsEnabled}
        />
      )}
      {view === 'admin' && !admin && (
        <div className="panel adminLocked"><span>🔒</span><h2>Admin kräver inloggning</h2><button onClick={login}>Logga in</button></div>
      )}
    </main>

    <footer className="bottomNav">
  <Nav
    view={view}
    setView={setView}
    compact
    onAdmin={login}
    admin={admin}
  />
</footer>
  </div>
}

function Nav({ view, setView, compact=false, onAdmin, admin=false }) {
  const allItems = [
    ['home','⌂','Hem'], ['leaderboard','🏆','Leaderboard'], ['rounds','⛳','Rundor'], ['score','✍️','Score'],
    ['players','👥','Spelare'], ['stats','📊','Statistik'], ['chat','💬','Chat'],['live', '📡', 'Live'], ['gallery','🖼️','Galleri'], ['admin', '⚙️', 'Admin']
  ]
  


const visibleItems = allItems
  return <nav className={compact ? 'nav compact' : 'nav'}>{visibleItems.map(([id, icon, label]) =>  <button key={id} className={view === id ? 'active' : ''} onClick={() => {
  if (id === 'admin') {
    if (admin) setView('admin')
    else if (onAdmin) onAdmin()
  } else {
    setView(id)
  }
}}><span>{icon}</span>{!compact && label}</button>)}</nav>
}

function Topbar({ loading, admin, identity, clearIdentity }) {
  return (
    <header className="topbar brandTopbar">


      <div className="brandIdentity">
        <img
          className="brandLogo"
          src="/branding/vm-logo.png"
          alt="Volvo Masters"
        />

        <div className="brandText">
          <small>Live från Firebase</small>
          <h1>Volvo Masters</h1>
        </div>
      </div>

      <div className="pills">
        {identity?.marker && (
          <button
            className="identityPill"
            onClick={clearIdentity}
          >
            Markör: {identity.marker}
          </button>
        )}

        <span>{loading ? 'Synkar…' : 'Synkad'}</span>

        {admin && <b>Admin aktiv</b>}
      </div>
    </header>
  )
}
  


function ViewHero({ view, rounds, courses, selectedRound, identity, board, admin, heroImages = {} }) {
  const round =
    rounds.find(item => item.slot === Number(selectedRound)) ||
    rounds[0]

  const course = courseFor(courses, round)
  const leader = board?.[0]

  const heroContent = {
    leaderboard: {
      eyebrow: 'Säsongsställning',
      title: 'Leaderboard',
      subtitle: leader
        ? `${leader.player} leder på ${leader.total} poäng`
        : 'Säsongens ranking och toppresultat',
      badge: '🏆 Bästa 4 räknas',
      image: '/courses/skovde.jpg',
    },
    rounds: {
      eyebrow: 'Tävlingskalender',
      title: 'Deltävlingar',
      subtitle: `${rounds.length} rundor · Se banor, resultat och scorekort`,
      badge: '⛳ Volvo Masters Tour',
      image: '/courses/breviken.jpg',
    },
    score: {
      eyebrow: `Deltävling ${round?.slot || ''}`,
      title: 'Scorekort',
      subtitle: `${course?.name || 'Golfbana'} · ${round?.date || 'Datum kommer'}`,
      badge: identity?.marker
        ? `✍️ Markör: ${identity.marker}`
        : '✍️ Välj markör',
      image: getCourseImage(course),
    },
    players: {
      eyebrow: 'Spelarfältet',
      title: 'Spelare',
      subtitle: `${board?.length || 0} deltagare · Profiler, form och säsongsresultat`,
      badge: '👥 Volvo Masters',
      image: '/courses/knistad.jpg',
    },
    stats: {
      eyebrow: 'Säsongen i siffror',
      title: 'Statistik',
      subtitle: 'Birdies, rekord, formkurvor och de bästa prestationerna',
      badge: '📊 Data från alla rundor',
      image: '/courses/mariestad.jpg',
    },
    chat: {
      eyebrow: 'Klubbhuset',
      title: 'Chat',
      subtitle: 'Snack, uppdateringar och information från tävlingen',
      badge: '💬 Live-konversation',
      image: '/courses/billingen.jpg',
    },
    live: {
      eyebrow: 'Direkt från banan',
      title: 'Live',
      subtitle: 'Följ bollarna, hål för hål, medan tävlingen pågår',
      badge: '🔴 LIVE',
      image: '/courses/skovde.jpg',
    },
    gallery: {
      eyebrow: 'Volvo Masters-minnen',
      title: 'Galleri',
      subtitle: 'Bilder och ögonblick från banorna och tävlingarna',
      badge: '📷 Foto & video',
      image: '/courses/lacko.jpg',
    },
    admin: {
      eyebrow: 'Volvo Masters Control Center',
      title: 'Adminpanel',
      subtitle: admin
        ? 'Hantera spelare, bollar, banor och tävlingar'
        : 'Admininloggning krävs',
      badge: admin ? '🟢 Admin aktiv' : '🔒 Låst',
      image: '/courses/knistad.jpg',
    },
  }

  const content = heroContent[view]
  if (!content) return null

  const heroImage = heroImages[view] || content.image

  return (
    <section
      className={`viewHero viewHero-${view}`}
      style={{
        position: 'relative',
        minHeight: '260px',
        marginBottom: '24px',
        borderRadius: '28px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
        padding: 'clamp(24px, 5vw, 48px)',
        backgroundImage: `linear-gradient(
          90deg,
          rgba(2, 18, 11, 0.94) 0%,
          rgba(2, 18, 11, 0.72) 48%,
          rgba(2, 18, 11, 0.28) 100%
        ), url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '1px solid rgba(216, 189, 114, 0.25)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
      }}
    >
      <div style={{ position: 'relative', zIndex: 2, maxWidth: '720px' }}>
        <small
          style={{
            display: 'block',
            marginBottom: '10px',
            color: '#e2c675',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            fontWeight: 900,
          }}
        >
          {content.eyebrow}
        </small>

        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(38px, 7vw, 72px)',
            lineHeight: 0.95,
            letterSpacing: '-0.035em',
            color: '#fffdf2',
            textShadow: '0 3px 18px rgba(0,0,0,0.35)',
          }}
        >
          {content.title}
        </h1>

        <p
          style={{
            margin: '16px 0 20px',
            maxWidth: '650px',
            fontSize: 'clamp(16px, 2.2vw, 20px)',
            color: 'rgba(255,255,255,0.82)',
            lineHeight: 1.45,
          }}
        >
          {content.subtitle}
        </p>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: '40px',
            padding: '9px 14px',
            borderRadius: '999px',
            background: 'rgba(8, 35, 23, 0.72)',
            border: '1px solid rgba(226, 198, 117, 0.55)',
            color: '#f4df9c',
            fontWeight: 800,
            backdropFilter: 'blur(8px)',
          }}
        >
          {content.badge}
        </span>
      </div>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.04), transparent 30%, rgba(0,0,0,0.18))',
          pointerEvents: 'none',
        }}
      />

      <style>{`
        @media (max-width: 700px) {
          .viewHero {
            min-height: 215px !important;
            padding: 24px 20px !important;
            border-radius: 22px !important;
            background-position: center !important;
          }

          .viewHero h1 {
            font-size: 42px !important;
          }

          .viewHero p {
            font-size: 15px !important;
            margin: 12px 0 16px !important;
          }
        }
      `}</style>
    </section>
  )
}


function Home({board, nextRound, nextCourse, setView, rounds, setSelectedRound, heroImages = {}}) {
  const nextTeeTimes = (nextRound.groups || [])
    .map((group, index) => ({
      id: group.id ?? index + 1,
      name: group.name || `Boll ${index + 1}`,
      time: nextRound.teeTimes?.[group.id ?? index + 1] || ''
    }))
    .filter(item => item.time)

  function startScorecard() {
  setSelectedRound(nextRound.slot)
  setView('score')
}
const courseImageKey = nextCourse.name
  .toLowerCase()
  .replace(" golfklubb", "")
  .replace(" golf club", "")
  .replace(" gk", "")
  .replaceAll("ä", "a")
  .replaceAll("ö", "o")
  .replaceAll("å", "a")
  .trim()

const heroImage =
  heroImages.home ||
  COURSE_IMAGES[courseImageKey]
 return (
  <section className="homeGrid">
    <div
    
      className="heroCard"
      style={{
        backgroundImage: `linear-gradient(
          rgba(3, 19, 12, 0.35),
          rgba(3, 19, 12, 0.82)
        ), url(${heroImage})`
      }}
    >
      <small>Nästa deltävling</small>

      <h2>
        {nextCourse.emoji} {nextCourse.name}
      </h2>

      <p>
        {nextRound.date || "Datum kommer"} · Tee {nextCourse.tee} · Slope{" "}
        {nextCourse.slope}
      </p>

      <div className="nextTeeTimes" aria-label="Starttider för nästa deltävling">
        <span className="nextTeeTimesLabel">Starttider</span>
        {nextTeeTimes.length > 0 ? (
          <div className="nextTeeTimesList">
            {nextTeeTimes.map(item => (
              <span className="nextTeeTime" key={item.id}>
                <b>{item.name}</b>
                <strong>{item.time}</strong>
              </span>
            ))}
          </div>
        ) : (
          <span className="nextTeeTimesMissing">Starttider kommer</span>
        )}
      </div>

      <div className="heroActions">
        <button onClick={startScorecard}>Starta scorekort</button>
        <button onClick={() => setView("rounds")}>Visa rundor</button>
      </div>
    </div>

<Podium board={board} />
    
    <Metric title="Spelare" value="12" text="Volvo Masters-fält" />
    <Metric title="Deltävlingar" value="6" text="Bästa 4 räknas" />
  </section>
)
}

function Metric({title,value,text}) {
  return <div className="metric"><small>{title}</small><strong>{value}</strong><span>{text}</span></div>
}
function Podium({ board }) {
  const topThree = board.slice(0, 3)

  return (
    <div className="podium">
      <h3>Topp 3 totalt</h3>

      {topThree.map((p, i) => (
        <div className="podiumRow" key={p.player}>
          <span>{["🥇", "🥈", "🥉"][i]}</span>

          <div>
            <b>{p.player}</b>
          </div>

          <strong>{p.total}p</strong>
        </div>
      ))}
    </div>
  )
}


function Leaderboard({ board, playerPhotos = {} }) {
  const topThree = board.slice(0, 3)
  const podiumOrder = [topThree[1], topThree[0], topThree[2]].filter(Boolean)
  const medals = {
    0: '🥇',
    1: '🥈',
    2: '🥉',
  }

  function initials(name = '') {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  return (
    <section
      className="leaderboardPro"
      style={{
        display: 'grid',
        gap: '22px',
      }}
    >
      <div
        className="sectionHead"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'end',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <small
            style={{
              display: 'block',
              marginBottom: '6px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#d8bd72',
              fontWeight: 800,
            }}
          >
            Volvo Masters 2026
          </small>
          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(30px, 6vw, 54px)',
              lineHeight: 1,
            }}
          >
            Leaderboard
          </h2>
        </div>

        <span
          style={{
            padding: '10px 14px',
            borderRadius: '999px',
            border: '1px solid rgba(216, 189, 114, 0.45)',
            background: 'rgba(216, 189, 114, 0.10)',
            color: '#f4e5b8',
            fontWeight: 700,
          }}
        >
          Bästa 4 rundorna räknas
        </span>
      </div>

      <div
        className="podiumStage"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '14px',
          alignItems: 'end',
        }}
      >
        {podiumOrder.map(player => {
          const realPlace = board.findIndex(item => item.player === player.player)
          const isWinner = realPlace === 0

          return (
            <article
              key={player.player}
              style={{
                minHeight: isWinner ? '250px' : '210px',
                padding: isWinner ? '24px 18px' : '20px 16px',
                borderRadius: '24px',
                border: isWinner
                  ? '1px solid rgba(255, 215, 100, 0.85)'
                  : '1px solid rgba(255,255,255,0.12)',
                background: isWinner
                  ? 'linear-gradient(180deg, rgba(122, 91, 22, 0.96), rgba(26, 55, 40, 0.98))'
                  : 'linear-gradient(180deg, rgba(36, 73, 54, 0.98), rgba(17, 38, 29, 0.98))',
                boxShadow: isWinner
                  ? '0 18px 50px rgba(214, 174, 65, 0.22)'
                  : '0 14px 38px rgba(0,0,0,0.22)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'center',
                transform: 'none',
              }}
            >
              <div
                style={{
                  fontSize: isWinner ? '42px' : '34px',
                  lineHeight: 1,
                }}
              >
                {medals[realPlace]}
              </div>

              <div
                style={{
                  width: isWinner ? '82px' : '68px',
                  height: isWinner ? '82px' : '68px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  display: 'grid',
                  placeItems: 'center',
                  background: isWinner
                    ? 'linear-gradient(135deg, #f4dc89, #8d6f20)'
                    : 'linear-gradient(135deg, #3f7858, #1e4331)',
                  color: isWinner ? '#213024' : '#fff',
                  border: '3px solid rgba(255,255,255,0.18)',
                  fontSize: isWinner ? '25px' : '21px',
                  fontWeight: 900,
                }}
              >
                {playerPhotos[player.player] ? (
                  <img
                    src={playerPhotos[player.player]}
                    alt={player.player}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    onError={event => {
                      event.currentTarget.style.display = 'none'
                      event.currentTarget.parentElement.textContent = initials(player.player)
                    }}
                  />
                ) : (
                  initials(player.player)
                )}
              </div>

              <div>
                <b
                  style={{
                    display: 'block',
                    fontSize: isWinner ? '21px' : '18px',
                    marginBottom: '5px',
                  }}
                >
                  {player.player}
                </b>
                <small style={{ opacity: 0.72 }}>
                  {player.rounds} spelade rundor
                </small>
              </div>

              <div>
                <strong
                  style={{
                    display: 'block',
                    fontSize: isWinner ? '36px' : '29px',
                    color: '#f2d47e',
                    lineHeight: 1,
                  }}
                >
                  {player.total}p
                </strong>
                <small style={{ opacity: 0.72 }}>
                  Bästa rond {player.best?.[0]?.adj || 0}p
                </small>
              </div>
            </article>
          )
        })}
      </div>

      <div
        className="panel"
        style={{
          padding: '10px',
          borderRadius: '24px',
          overflow: 'hidden',
        }}
      >
        {board.map((player, index) => {
          const isTopThree = index < 3

          return (
            <div
              className={`leaderRow enhanced ${isTopThree ? 'topThree' : ''}`}
              key={player.player}
              style={{
                display: 'grid',
                gridTemplateColumns: '50px 52px minmax(0, 1fr) auto',
                alignItems: 'center',
                gap: '12px',
                padding: '14px',
                borderRadius: '16px',
                marginBottom: '8px',
                background: isTopThree
                  ? 'linear-gradient(90deg, rgba(216, 189, 114, 0.15), rgba(255,255,255,0.025))'
                  : 'rgba(255,255,255,0.035)',
                border: isTopThree
                  ? '1px solid rgba(216, 189, 114, 0.22)'
                  : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span
                className="rank"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 900,
                  fontSize: isTopThree ? '23px' : '18px',
                }}
              >
                {isTopThree ? medals[index] : index + 1}
              </span>

              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  display: 'grid',
                  placeItems: 'center',
                  background: isTopThree
                    ? 'linear-gradient(135deg, #b9963a, #4e672f)'
                    : 'rgba(255,255,255,0.08)',
                  fontWeight: 900,
                  fontSize: '14px',
                }}
              >
                {playerPhotos[player.player] ? (
                  <img
                    src={playerPhotos[player.player]}
                    alt={player.player}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    onError={event => {
                      event.currentTarget.style.display = 'none'
                      event.currentTarget.parentElement.textContent = initials(player.player)
                    }}
                  />
                ) : (
                  initials(player.player)
                )}
              </div>

              <div style={{ minWidth: 0 }}>
                <b
                  style={{
                    display: 'block',
                    fontSize: '17px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {player.player}
                </b>
                <small style={{ opacity: 0.7 }}>
                  {player.rounds} rundor · Snitt {player.avgPoints || 0}p · Bästa {player.best?.[0]?.adj || 0}p
                </small>
              </div>

              <div style={{ textAlign: 'right' }}>
                <strong
                  style={{
                    display: 'block',
                    fontSize: '24px',
                    color: '#f2d47e',
                  }}
                >
                  {player.total}p
                </strong>
                <small style={{ opacity: 0.65 }}>
                  {player.totalRawPoints || 0} råpoäng
                </small>
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        @media (max-width: 760px) {
          .leaderboardPro .podiumStage {
            grid-template-columns: 1fr 1fr 1fr !important;
            gap: 8px !important;
          }

          .leaderboardPro .podiumStage article {
            min-height: 185px !important;
            padding: 16px 8px !important;
            border-radius: 18px !important;
          }

          .leaderboardPro .podiumStage article:nth-child(2) {
            min-height: 215px !important;
          }

          .leaderboardPro .leaderRow.enhanced {
            grid-template-columns: 38px 42px minmax(0, 1fr) auto !important;
            gap: 8px !important;
            padding: 12px 8px !important;
          }

          .leaderboardPro .leaderRow.enhanced small {
            font-size: 11px !important;
          }
        }
      `}</style>
    </section>
  )
}

const COURSE_IMAGES = {
  billingen: '/courses/billingen.jpg',
  breviken: '/courses/breviken.jpg',
  knistad: '/courses/knistad.jpg',
  lacko: '/courses/lacko.jpg',
  mariestad: '/courses/mariestad.jpg',
  skovde: '/courses/skovde.jpg',
}

function getCourseImage(course) {
  const name = String(course?.name || '').toLowerCase()

  if (name.includes('billingen')) return COURSE_IMAGES.billingen
  if (name.includes('breviken')) return COURSE_IMAGES.breviken
  if (name.includes('knistad')) return COURSE_IMAGES.knistad
  if (name.includes('läckö') || name.includes('lacko')) {
    return COURSE_IMAGES.lacko
  }
  if (name.includes('mariestad')) return COURSE_IMAGES.mariestad
  if (name.includes('skövde') || name.includes('skovde')) {
    return COURSE_IMAGES.skovde
  }

  return COURSE_IMAGES.skovde
}

function scoreResultClass(diff) {
  if (diff == null) return 'scoreResult scoreResultEmpty'
  if (diff <= -2) return 'scoreResult scoreResultEagle'
  if (diff === -1) return 'scoreResult scoreResultBirdie'
  if (diff === 0) return 'scoreResult scoreResultPar'
  if (diff === 1) return 'scoreResult scoreResultBogey'
  return 'scoreResult scoreResultDouble'
}

function ScoreResult({ hole }) {
  const value = hole?.strokes
  return (
    <span
      className={scoreResultClass(hole?.diff)}
      title={hole?.diff == null ? 'Ingen score' : hole.diff <= -2 ? 'Eagle eller bättre' : hole.diff === -1 ? 'Birdie' : hole.diff === 0 ? 'Par' : hole.diff === 1 ? 'Bogey' : 'Dubbelbogey eller sämre'}
    >
      {value || '—'}
    </span>
  )
}

function PlayerScorecardModal({ result, round, onClose }) {
  if (!result) return null
  const front = result.holeBreakdown.slice(0, 9)
  const back = result.holeBreakdown.slice(9)
  const sum = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0)
  const playedHoles = result.holeBreakdown.filter(h => h.diff != null)
  const scoreSummary = {
    eagles: playedHoles.filter(h => h.diff <= -2).length,
    birdies: playedHoles.filter(h => h.diff === -1).length,
    pars: playedHoles.filter(h => h.diff === 0).length,
    bogeys: playedHoles.filter(h => h.diff === 1).length,
    doubles: playedHoles.filter(h => h.diff >= 2).length,
  }

  return (
    <div className="scoreModalBackdrop" onClick={onClose}>
      <div className="scoreModal panel" onClick={event => event.stopPropagation()}>
        <button className="scoreModalClose" onClick={onClose}>×</button>
        <div className="sectionHead">
          <div>
            <small>Rond {round.slot} · {round.date || 'Datum saknas'}</small>
            <h2>{result.player}</h2>
          </div>
          <span>{result.course.name}</span>
        </div>

        <div className="scoreTotals">
          <div><small>Brutto</small><strong>{result.strokes || '—'}</strong></div>
          <div><small>Netto</small><strong>{result.net || '—'}</strong></div>
          <div><small>Poäng</small><strong>{result.points}p</strong></div>
          <div><small>Spelhcp</small><strong>{result.playing}</strong></div>
        </div>

        <div className="roundScoreSummary" aria-label="Sammanfattning av rundan">
          <div><span className="scoreResult scoreResultEagle">E</span><small>Eagle+</small><strong>{scoreSummary.eagles}</strong></div>
          <div><span className="scoreResult scoreResultBirdie">B</span><small>Birdies</small><strong>{scoreSummary.birdies}</strong></div>
          <div><span className="scoreResult scoreResultPar">P</span><small>Par</small><strong>{scoreSummary.pars}</strong></div>
          <div><span className="scoreResult scoreResultBogey">+1</span><small>Bogeys</small><strong>{scoreSummary.bogeys}</strong></div>
          <div><span className="scoreResult scoreResultDouble">+2</span><small>Dubbel+</small><strong>{scoreSummary.doubles}</strong></div>
        </div>

        <div className="fullScorecardWrap">
          <table className="fullScorecard">
            <thead>
              <tr><th>Hål</th>{front.map(h => <th key={h.hole}>{h.hole}</th>)}<th>UT</th></tr>
            </thead>
            <tbody>
              <tr><th>Par</th>{front.map(h => <td key={h.hole}>{h.par}</td>)}<td>{sum(front, 'par')}</td></tr>
              <tr><th>SI</th>{front.map(h => <td key={h.hole}>{h.si}</td>)}<td>—</td></tr>
              <tr><th>Slag</th>{front.map(h => <td key={h.hole}><ScoreResult hole={h} /></td>)}<td>{sum(front, 'strokes') || '—'}</td></tr>
              <tr><th>Poäng</th>{front.map(h => <td key={h.hole}>{h.pts ?? '—'}</td>)}<td>{sum(front, 'pts')}</td></tr>
            </tbody>
          </table>

          <table className="fullScorecard">
            <thead>
              <tr><th>Hål</th>{back.map(h => <th key={h.hole}>{h.hole}</th>)}<th>IN</th><th>TOT</th></tr>
            </thead>
            <tbody>
              <tr><th>Par</th>{back.map(h => <td key={h.hole}>{h.par}</td>)}<td>{sum(back, 'par')}</td><td>{sum(result.holeBreakdown, 'par')}</td></tr>
              <tr><th>SI</th>{back.map(h => <td key={h.hole}>{h.si}</td>)}<td>—</td><td>—</td></tr>
              <tr><th>Slag</th>{back.map(h => <td key={h.hole}><ScoreResult hole={h} /></td>)}<td>{sum(back, 'strokes') || '—'}</td><td>{result.strokes || '—'}</td></tr>
              <tr><th>Poäng</th>{back.map(h => <td key={h.hole}>{h.pts ?? '—'}</td>)}<td>{sum(back, 'pts')}</td><td>{result.points}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function GroupEditor({ round, players, onSave }) {
  const initialGroups = round.groups?.length ? round.groups : chunkPlayers(players)
  const [groups, setGroups] = useState(() => clone(initialGroups))
  const [teeTimes, setTeeTimes] = useState(() => ({ ...(round.teeTimes || {}) }))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setGroups(clone(round.groups?.length ? round.groups : chunkPlayers(players)))
    setTeeTimes({ ...(round.teeTimes || {}) })
  }, [round, players])

  const usedPlayers = new Set(groups.flatMap(group => group.players || []))
  const availablePlayers = players.filter(player => !usedPlayers.has(player))

  function updateGroup(groupId, patch) {
    setGroups(current => current.map(group => group.id === groupId ? { ...group, ...patch } : group))
  }

  function updatePlayer(groupId, playerIndex, player) {
    setGroups(current => current.map(group => {
      if (group.id !== groupId) return group
      const nextPlayers = [...(group.players || [])]
      nextPlayers[playerIndex] = player
      return { ...group, players: nextPlayers }
    }))
  }

  function addPlayer(groupId) {
    const nextPlayer = availablePlayers[0]
    if (!nextPlayer) return
    setGroups(current => current.map(group =>
      group.id === groupId ? { ...group, players: [...(group.players || []), nextPlayer] } : group
    ))
  }

  function removePlayer(groupId, playerIndex) {
    setGroups(current => current.map(group =>
      group.id === groupId
        ? { ...group, players: (group.players || []).filter((_, index) => index !== playerIndex) }
        : group
    ))
  }

  function addGroup() {
    const nextId = Math.max(0, ...groups.map(group => Number(group.id) || 0)) + 1
    setGroups(current => [...current, { id: nextId, name: `Boll ${nextId}`, players: [] }])
  }

  function removeGroup(groupId) {
    setGroups(current => current.filter(group => group.id !== groupId))
  }

  async function save() {
    const cleaned = groups
      .map((group, index) => ({
        id: group.id || index + 1,
        name: group.name?.trim() || `Boll ${index + 1}`,
        players: (group.players || []).filter(Boolean),
      }))
      .filter(group => group.players.length > 0)
    setSaving(true)
    try { await onSave(cleaned, teeTimes) }
    finally { setSaving(false) }
  }

  return (
    <div className="groupEditor panel">
      <div className="sectionHead"><h3>Hantera bollar</h3><span>Ändringar sparas i Firebase</span></div>
      <div className="groupEditorGrid">
        {groups.map((group, groupIndex) => (
          <div className="groupEditCard" key={group.id}>
            <div className="groupEditHead">
              <input value={group.name || ''} onChange={event => updateGroup(group.id, { name:event.target.value })} aria-label="Bollnamn" />
              <input value={teeTimes[group.id] || ''} onChange={event => setTeeTimes(current => ({ ...current, [group.id]:event.target.value }))} placeholder="Starttid" aria-label="Starttid" />
              <button className="danger ghost" onClick={() => removeGroup(group.id)} disabled={groups.length === 1}>Ta bort</button>
            </div>

            <div className="groupPlayerEditors">
              {(group.players || []).map((player, playerIndex) => (
                <div className="groupPlayerEditor" key={`${group.id}-${playerIndex}`}>
                  <select value={player} onChange={event => updatePlayer(group.id, playerIndex, event.target.value)}>
                    {[player, ...availablePlayers].filter((value, index, arr) => value && arr.indexOf(value) === index).map(option => <option key={option}>{option}</option>)}
                  </select>
                  <button className="ghost" onClick={() => removePlayer(group.id, playerIndex)}>×</button>
                </div>
              ))}
            </div>

            <button className="ghost" onClick={() => addPlayer(group.id)} disabled={!availablePlayers.length}>+ Lägg till spelare</button>
            <small>Boll {groupIndex + 1} · {(group.players || []).length} spelare</small>
          </div>
        ))}
      </div>
      <div className="groupEditorActions">
        <button className="ghost" onClick={addGroup}>+ Ny boll</button>
        <button onClick={save} disabled={saving}>{saving ? 'Sparar…' : 'Spara bollar'}</button>
      </div>
    </div>
  )
}

function Rounds({ admin, players, rounds, courses, scores, playerHcp, setView, setSelectedRound, updateRoundGroups }) {
  const [expandedRound, setExpandedRound] = useState(null)
  const [scorecard, setScorecard] = useState(null)

  return (
    <section className="roundsPage">
      <div className="cards roundCards">
        {rounds.map((round) => {
          const course = courseFor(courses, round)
          const groups = round.groups?.length ? round.groups : chunkPlayers(players)
          const image = getCourseImage(course)
          const results = players
            .map(player => playerRoundResult(player, round, courses, scores, playerHcp))
            .filter(result => result.played > 0)
            .sort((a, b) => b.points - a.points || a.net - b.net)
          const isExpanded = expandedRound === round.slot

          return (
            <article className="roundCard" key={round.slot}>
              <div className="roundImageWrap">
                <img className="roundImage" src={image} alt={course?.name || 'Golfbana'} />
                <div className="roundImageShade" />
                <div className="roundImageTitle">
                  <small>Deltävling {round.slot}</small>
                  <h3>{course?.emoji || '⛳'} {course?.name || 'Golfbana'}</h3>
                </div>
              </div>

              <div className="roundCardBody">
                <p className="roundMeta">
                  {round.date || 'Datum kommer'}
                  {course?.tee ? ` · Tee ${course.tee}` : ''}
                  {course?.slope ? ` · Slope ${course.slope}` : ''}
                </p>

                <div className="roundQuickStats">
                  <span><b>{groups.length}</b> bollar</span>
                  <span><b>{results.length}</b> färdiga scorer</span>
                  <span><b>{results[0]?.points || 0}p</b> bästa råpoäng</span>
                </div>

                <div className="roundCardActions">
                  <button type="button" onClick={() => { setSelectedRound(round.slot); setView('score') }}>Öppna scorekort</button>
                  <button className="ghost" type="button" onClick={() => setExpandedRound(isExpanded ? null : round.slot)}>{isExpanded ? 'Dölj resultat' : 'Visa resultat'}</button>
                </div>

                {isExpanded && (
                  <div className="roundResultsPanel">
                    <h4>Spelade scorekort</h4>
                    {results.length ? results.map((result, index) => (
                      <button className="roundPlayerResult" key={result.player} onClick={() => setScorecard({ result, round })}>
                        <span className="roundResultRank">{index + 1}</span>
                        <span><b>{result.player}</b><small>{result.played}/18 hål · {result.strokes} brutto · {result.net} netto</small></span>
                        <strong>{result.points}p</strong>
                        <span>Visa →</span>
                      </button>
                    )) : <p className="hint">Inga registrerade scorekort i denna deltävling ännu.</p>}
                  </div>
                )}

                {admin && isExpanded && (
                  <GroupEditor
                    round={round}
                    players={players}
                    onSave={(groups, teeTimes) => updateRoundGroups(round.slot, groups, teeTimes)}
                  />
                )}
              </div>
            </article>
          )
        })}
      </div>

      {scorecard && <PlayerScorecardModal result={scorecard.result} round={scorecard.round} onClose={() => setScorecard(null)} />}
    </section>
  )
}

function BallScorecard({admin, identity, updateIdentity, players, rounds, courses, scores, playerHcp, selectedRound, setSelectedRound, updateHole, updateHcp}) {
  const [activeHole, setActiveHole] = useState(0)
  const round = rounds.find(r => r.slot === Number(selectedRound)) || rounds[0]
  const course = courseFor(courses, round)
  const groups = round.groups?.length ? round.groups : chunkPlayers(players)
  const selectedGroup = groups.find(g => String(g.id) === String(identity.groupId)) || groups[0]
  const marker = identity.marker || ''
  const groupPlayers = selectedGroup?.players?.length ? selectedGroup.players : players.slice(0,4)
  const holes = course.holes?.length === 18 ? course.holes : makeHoles()
  const hole = holes[activeHole]
  const canEditGroup = admin || (marker && groupPlayers.includes(marker))

  useEffect(() => {
    if (!identity.groupId && groups[0]) updateIdentity({ groupId: groups[0].id })
  }, [identity.groupId, groups, updateIdentity])

  function setScore(player, value) {
  if (!canEditGroup) return
  updateHole(player, round.slot, activeHole, value, false)
}

function addStroke(player, delta) {
  const current =
    scores?.[player]?.[round.slot]?.holeScores?.[activeHole] || ''

  const base = current === '' ? hole.par : Number(current)
  const next = Math.max(1, base + delta)

  setScore(player, String(next))
}
async function confirmHoleBeforeLeaving(targetHole) {
  if (targetHole === activeHole) return

  const allDone = groupPlayers.every(player => {
    const value =
      scores?.[player]?.[round.slot]?.holeScores?.[activeHole]

    return value !== undefined && value !== ''
  })

  if (!allDone) {
    setActiveHole(targetHole)
    return
  }

  for (const player of groupPlayers) {
    const value =
      scores?.[player]?.[round.slot]?.holeScores?.[activeHole]

    await updateHole(
      player,
      round.slot,
      activeHole,
      value,
      true
    )
  }

  setActiveHole(targetHole)
}
 

  const groupTotals = groupPlayers.map(player => playerRoundResult(player, round, courses, scores, playerHcp))
  const completed = groupTotals.reduce((sum, r) => sum + r.played, 0)
  const totalSlots = groupPlayers.length * 18
  const progress = Math.round((completed / totalSlots) * 100)

  return <section className="ballScorePage">
    <div className="panel ballSetup">
      <div className="scoreBadge">Volvo Masters 2.2 · Boll-läge</div>
      <h2>{course.name}</h2>
      <p className="hint">{round.date || 'Datum kommer'} · Tee {course.tee} · Slope {course.slope}</p>

      <div className="setupGrid">
        <label>Rond<select value={selectedRound} onChange={e => { setSelectedRound(Number(e.target.value)); setActiveHole(0) }}>{rounds.map(r => <option key={r.slot} value={r.slot}>Rond {r.slot}</option>)}</select></label>
        <label>Boll<select value={selectedGroup?.id || ''} onChange={e => updateIdentity({ groupId: e.target.value, marker: '' })}>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
        <label>Jag är markör<select value={marker} onChange={e => updateIdentity({ marker: e.target.value })}><option value="">Välj namn</option>{groupPlayers.map(p => <option key={p}>{p}</option>)}</select></label>
      </div>

      <div className="groupPlayers">
        {groupPlayers.map(p => <span key={p} className={p === marker ? 'markerChip' : ''}>{p.split(' ')[0]}</span>)}
      </div>

      <div className="scoreSummary premiumSummary">
        <b>{selectedGroup?.name}</b>
        <small>{groupPlayers.length} spelare · Hål {activeHole + 1}/18</small>
        <span>{canEditGroup ? 'Du kan föra score för hela bollen' : 'Välj markör för att kunna fylla i score'}</span>
        <strong>{progress}%</strong>
        <div className="progress"><i style={{width:`${progress}%`}} /></div>
      </div>
    </div>

    <div className="panel holeCommander">
      <div className="holeTopline"><span>Hål {activeHole + 1} av 18</span><b>Par {hole.par} · SI {hole.si}</b></div>
      <div className="holeNumber">{activeHole + 1}</div>
      <div className="holeNav">
  <button onClick={() => confirmHoleBeforeLeaving(Math.max(0, activeHole - 1))}>
  ← Föregående
</button>

<button onClick={() => confirmHoleBeforeLeaving(Math.min(17, activeHole + 1))}>
  Nästa →
</button>
</div>
      <div className="groupScoreRows">
        {groupPlayers.map(player => {
          const result = playerRoundResult(player, round, courses, scores, playerHcp)
          const value = result.holeScores[activeHole] || ''
          const pts = calcStableford(value, hole.par, hole.si, result.playing)
          return <div className="scorePlayerRow" key={player}>
            <div><b>{player}</b><small>Spelhcp {result.playing} · totalt {result.points}p</small></div>
            <div className="scoreStepper">
              <button disabled={!canEditGroup} onClick={() => addStroke(player, -1)}>−</button>
              <input disabled={!canEditGroup} inputMode="numeric" value={value} placeholder="—" onChange={e => setScore(player, e.target.value.replace(/\D/g,'').slice(0,2))} />
              <button disabled={!canEditGroup} onClick={() => addStroke(player, 1)}>+</button>
            </div>
            <strong>{pts ?? '-'}p</strong>
          </div>
        })}
      </div>
      <div className="holeStepper">
        <button
  className="ghost"
  onClick={() => confirmHoleBeforeLeaving(Math.max(0, activeHole - 1))}
>
  ← Föregående
</button>

<button onClick={() => confirmHoleBeforeLeaving(Math.min(17, activeHole + 1))}>
  Nästa →
</button>
      </div>
      <div className="miniHoles">{holes.map((h,i) => {
        const done = groupPlayers.every(p => scores?.[p]?.[round.slot]?.holeScores?.[i])
        return <button key={i} className={i === activeHole ? 'active' : done ? 'done' : ''} onClick={() => confirmHoleBeforeLeaving(i)}>{i+1}</button>
      })}</div>
    </div>

    <div className="panel wideScore groupOverview">
      <div className="sectionHead"><h2>Bollöversikt</h2><span>Live stableford</span></div>
      <div className="groupResults compactGroupResults">
  {groupTotals.map(r => (
    <div className="groupResult compactGroupResult" key={r.player}>
      <div className="groupResultMain">
        <b>{r.player}</b>
        <span>{r.played}/18 hål</span>
      </div>

      <div className="groupResultScore">
        <strong>{r.points}p</strong>
        <small>{r.strokes || '—'} slag</small>
      </div>
    </div>
  ))}
</div>
    </div>


    {admin && <div className="panel adminHcpBox"><h3>Admin · HCP</h3>{groupPlayers.map(p => <label key={p}>{p}<input value={playerHcp[p] || ''} onChange={e => updateHcp(p, e.target.value)} placeholder="HCP" /></label>)}</div>}
  </section>
}

function Players({ players, board, rounds, courses, scores, playerHcp, playerPhotos = {}, updateHcp, admin }) {
  const [selected, setSelected] = useState(players[0] || '')
  const [selectedScorecard, setSelectedScorecard] = useState(null)
  const row = board.find(item => item.player === selected)
  const initials = selected.split(' ').map(part => part[0]).join('').slice(0, 2)
  const playerRounds = rounds
    .map(round => ({ round, result: playerRoundResult(selected, round, courses, scores, playerHcp) }))
    .filter(item => item.result.played > 0)
    .sort((a, b) => Number(a.round.slot) - Number(b.round.slot))
  const recentRounds = playerRounds.slice(-5)
  const maxFormPoints = Math.max(1, ...recentRounds.map(item => item.result.points || 0))
  const seasonSummary = {
    gross: playerRounds.reduce((sum, item) => sum + (item.result.strokes || 0), 0),
    net: playerRounds.reduce((sum, item) => sum + (item.result.net || 0), 0),
    rawPoints: playerRounds.reduce((sum, item) => sum + (item.result.points || 0), 0),
    birdies: playerRounds.reduce((sum, item) => sum + item.result.holeBreakdown.filter(hole => hole.diff === -1).length, 0),
  }

  useEffect(() => {
    if (!selected && players.length) setSelected(players[0])
    if (selected && !players.includes(selected)) setSelected(players[0] || '')
  }, [players, selected])

  return <section className="playersPro">
    <div className="panel playerHero">
      <div className="bigAvatar" style={{ overflow:'hidden' }}>
        {playerPhotos[selected] ? (
          <img
            src={playerPhotos[selected]}
            alt={selected}
            style={{ width:'100%', height:'100%', objectFit:'cover' }}
          />
        ) : initials}
      </div>
      <div>
        <small>Spelarprofil</small>
        <h2>{selected}</h2>
        <p>{row?.rounds || 0} spelade rundor · {row?.total || 0}p justerat · {seasonSummary.rawPoints} råpoäng</p>
      </div>
      {admin && <label className="hcpEditor">HCP<input value={playerHcp[selected] || ''} onChange={event => updateHcp(selected, event.target.value)} placeholder="HCP" /></label>}
    </div>

    <div className="profileGrid">
      <div className="panel playerList">
        <h3>Spelare</h3>
        {players.map(player => {
          const playerBoard = board.find(item => item.player === player)
          return <button key={player} className={player === selected ? 'active' : ''} onClick={() => setSelected(player)}>
            <span>{player}</span><b>{playerBoard?.total || 0}p</b>
          </button>
        })}
      </div>

      <div className="profileMain">
        <div className="panel profileStats">
          <div className="sectionHead"><h3>Säsongskort</h3><span>{playerRounds.length} scorekort</span></div>
          <div className="stats profileStatGrid">
            <div><strong>{seasonSummary.gross || '—'}</strong><span>Brutto totalt</span></div>
            <div><strong>{seasonSummary.net || '—'}</strong><span>Netto totalt</span></div>
            <div><strong>{seasonSummary.rawPoints}</strong><span>Råpoäng</span></div>
            <div><strong>{row?.best4RawPoints || 0}</strong><span>Bästa 4</span></div>
            <div><strong>{row?.avgPoints || 0}</strong><span>Snittpoäng</span></div>
            <div><strong>{seasonSummary.birdies}</strong><span>Birdies</span></div>
          </div>
        </div>

        <div className="panel seasonFormPanel">
          <div className="sectionHead"><h3>Säsongens form</h3><span>Senaste fem rundorna</span></div>
          {recentRounds.length ? <div className="seasonFormChart">
            {recentRounds.map(({ round, result }) => <div className="seasonFormItem" key={round.slot}>
              <div className="seasonFormTrack"><span style={{ height: `${Math.max(8, Math.round((result.points / maxFormPoints) * 100))}%` }} /></div>
              <strong>{result.points}p</strong>
              <small>R{round.slot}</small>
            </div>)}
          </div> : <p className="hint">Ingen registrerad runda ännu.</p>}
        </div>

        <div className="panel playerRoundArchive">
          <div className="sectionHead"><h3>Alla scorekort</h3><span>Tryck för hål-för-hål</span></div>
          <div className="profileRoundList">
            {playerRounds.length ? playerRounds.map(({ round, result }) => <button className="profileRoundCard" key={round.slot} onClick={() => setSelectedScorecard({ round, result })}>
              <div>
                <small>Rond {round.slot} · {round.date || 'Datum saknas'}</small>
                <b>{result.course.name}</b>
              </div>
              <div className="profileRoundNumbers">
                <span><small>Brutto</small><strong>{result.strokes || '—'}</strong></span>
                <span><small>Netto</small><strong>{result.net || '—'}</strong></span>
                <span><small>Poäng</small><strong>{result.points}p</strong></span>
              </div>
              <span className="profileRoundArrow">›</span>
            </button>) : <p className="hint">Ingen registrerad runda ännu.</p>}
          </div>
        </div>
      </div>
    </div>

    {selectedScorecard && <PlayerScorecardModal result={selectedScorecard.result} round={selectedScorecard.round} onClose={() => setSelectedScorecard(null)} />}
  </section>
}

function Stats({board, rounds, players, courses, scores, playerHcp}) {
  const [mode, setMode] = useState('overview')
  const allRounds = players.flatMap(player =>
    rounds
      .map(round => playerRoundResult(player, round, courses, scores, playerHcp))
      .filter(result => result.played > 0)
      .map(result => ({ ...result, player }))
  )
  const bestPoints = [...allRounds].sort((a,b)=>b.points-a.points)[0]
  const bestAdjusted = [...allRounds].sort((a,b)=>b.adj-a.adj)[0]
  const bestNet = [...allRounds].filter(r=>r.net>0).sort((a,b)=>a.net-b.net)[0]
  const bestGross = [...allRounds].filter(r=>r.strokes>0).sort((a,b)=>a.strokes-b.strokes)[0]
  const holes = allRounds.flatMap(r => r.holeBreakdown.filter(h => h.diff !== null).map(h => ({...h, player:r.player, course:r.course.name})))
  const birdies = holes.filter(h => h.diff === -1).length
  const eagles = holes.filter(h => h.diff <= -2).length
  const pars = holes.filter(h => h.diff === 0).length
  const bogeys = holes.filter(h => h.diff === 1).length
  const doubles = holes.filter(h => h.diff >= 2).length
  const boardByPlayer = Object.fromEntries(board.map(row => [row.player, row]))

  const perPlayer = players.map(player => {
    const row = boardByPlayer[player] || {}
    const playerHoles = holes.filter(h => h.player === player)
    return {
      player,
      rounds: row.rounds || 0,
      totalGross: row.totalGross || 0,
      totalNet: row.totalNet || 0,
      totalRawPoints: row.totalRawPoints || 0,
      best4RawPoints: row.best4RawPoints || 0,
      adjustedBest4: row.total || 0,
      avgGross: row.avgGross || 0,
      avgNet: row.avgNet || 0,
      avgPoints: row.avgPoints || 0,
      birdies: playerHoles.filter(h=>h.diff===-1).length,
      eagles: playerHoles.filter(h=>h.diff<=-2).length,
      pars: playerHoles.filter(h=>h.diff===0).length,
      bogeys: playerHoles.filter(h=>h.diff===1).length,
      doubles: playerHoles.filter(h=>h.diff>=2).length,
    }
  }).sort((a,b)=>b.best4RawPoints-a.best4RawPoints || b.totalRawPoints-a.totalRawPoints)

  const topBirdiePlayer = [...perPlayer].sort((a,b)=>(b.birdies + b.eagles) - (a.birdies + a.eagles))[0]
  const topParPlayer = [...perPlayer].sort((a,b)=>b.pars-a.pars)[0]
  const hardest = Array.from({length:18}, (_,i) => {
    const holeRows = holes.filter(h => h.hole === i+1)
    const avgPoints = holeRows.length ? holeRows.reduce((sum,h)=>sum+(h.pts ?? 0),0)/holeRows.length : 0
    const avgDiff = holeRows.length ? holeRows.reduce((sum,h)=>sum+(h.diff ?? 0),0)/holeRows.length : 0
    return {hole:i+1, played:holeRows.length, avgPoints:Math.round(avgPoints*10)/10, avgDiff:Math.round(avgDiff*10)/10}
  }).filter(h=>h.played).sort((a,b)=>a.avgPoints-b.avgPoints)
  const tabs = [['overview','Översikt'],['players','Spelare'],['records','Rekord'],['holes','Hål']]

  return <section className="statsPage">
    <div className="sectionHead"><h2>Statistik</h2><span>Brutto · netto · råpoäng · bästa fyra</span></div>
    <div className="statTabs">{tabs.map(([id,label]) => <button key={id} className={mode===id?'active':''} onClick={()=>setMode(id)}>{label}</button>)}</div>

    {mode === 'overview' && <div className="homeGrid">
      <Metric title="Registrerade rundor" value={allRounds.length} text="Totalt i systemet" />
      <Metric title="Bästa råpoäng" value={bestPoints ? `${bestPoints.points}p` : '—'} text={bestPoints?.player || 'Ingen data'} />
      <Metric title="Bästa justerade poäng" value={bestAdjusted ? `${bestAdjusted.adj}p` : '—'} text={bestAdjusted?.player || 'Ingen data'} />
      <Metric title="Bästa nettoslag" value={bestNet ? bestNet.net : '—'} text={bestNet?.player || 'Ingen data'} />
      <Metric title="Bästa bruttoslag" value={bestGross ? bestGross.strokes : '—'} text={bestGross?.player || 'Ingen data'} />
      <div className="panel wide statBreakdown"><h3>Hålfördelning</h3><div className="breakGrid"><span>🦅 Eagles <b>{eagles}</b></span><span>🐦 Birdies <b>{birdies}</b></span><span>✅ Par <b>{pars}</b></span><span>☝️ Bogeys <b>{bogeys}</b></span><span>✌️ Dubbel+ <b>{doubles}</b></span></div></div>
    </div>}

    {mode === 'players' && <div className="panel statPanelScrollable">
      <h3>Spelarstatistik</h3>
      <div className="statTable extendedStatsTable">
        <div className="statTableHead"><span>Spelare</span><span>R</span><span>Brutto totalt</span><span>Netto totalt</span><span>Poäng totalt</span><span>Bästa 4</span><span>Justerat 4</span><span>Snitt p</span></div>
        {perPlayer.map(player => <div className="statTableRow" key={player.player}>
          <b>{player.player}</b><span>{player.rounds}</span><span>{player.totalGross || '—'}</span><span>{player.totalNet || '—'}</span><span>{player.totalRawPoints}p</span><span>{player.best4RawPoints}p</span><span>{player.adjustedBest4}p</span><span>{player.avgPoints}</span>
        </div>)}
      </div>
    </div>}

    {mode === 'records' && <div className="cards">
      <article className="recordCard"><small>Bästa råpoäng</small><b>{bestPoints ? `${bestPoints.points}p` : '—'}</b><span>{bestPoints?.player}</span><em>{bestPoints?.course?.name}</em></article>
      <article className="recordCard"><small>Bästa justerade poäng</small><b>{bestAdjusted ? `${bestAdjusted.adj}p` : '—'}</b><span>{bestAdjusted?.player}</span><em>{bestAdjusted?.course?.name}</em></article>
      <article className="recordCard"><small>Bästa nettoslag</small><b>{bestNet ? bestNet.net : '—'}</b><span>{bestNet?.player}</span><em>{bestNet?.course?.name}</em></article>
      <article className="recordCard"><small>Bästa bruttoslag</small><b>{bestGross ? bestGross.strokes : '—'}</b><span>{bestGross?.player}</span><em>{bestGross?.course?.name}</em></article>
      <article className="recordCard"><small>Flest birdies/eagles</small><b>{(topBirdiePlayer?.birdies || 0) + (topBirdiePlayer?.eagles || 0)}</b><span>{topBirdiePlayer?.player}</span><em>Brutto birdies + eagles</em></article>
      <article className="recordCard"><small>Flest par</small><b>{topParPlayer?.pars || 0}</b><span>{topParPlayer?.player}</span><em>Brutto par totalt</em></article>
    </div>}

    {mode === 'holes' && <div className="panel"><h3>Svåraste hålen</h3>{hardest.map(h => <div className="leaderRow" key={h.hole}><div><b>Hål {h.hole}</b><small>{h.played} registrerade scorer</small></div><strong>{h.avgPoints}p</strong><span className="muted">{h.avgDiff > 0 ? '+' : ''}{h.avgDiff} mot par</span></div>)}</div>}
  </section>
}


function AdminPanel({ players, rounds, courses, playerHcp, playerPhotos = {}, uploadPlayerPhoto, heroImages = {}, uploadHeroImage, save, updateRoundGroups, enableNotifications, notificationsEnabled }) {
  const [tab, setTab] = useState('overview')
  const [newPlayer, setNewPlayer] = useState('')
  const [status, setStatus] = useState('')
  const [roundDrafts, setRoundDrafts] = useState(() => clone(rounds))
  const [courseDrafts, setCourseDrafts] = useState(() => clone(courses))

  useEffect(() => setRoundDrafts(clone(rounds)), [rounds])
  useEffect(() => setCourseDrafts(clone(courses)), [courses])

  async function flash(message, task) {
    setStatus('Sparar…')
    try { await task(); setStatus(message) }
    catch (error) { console.error(error); setStatus('Kunde inte spara. Försök igen.') }
  }

  async function addPlayer() {
    const name = newPlayer.trim()
    if (!name || players.includes(name)) return
    await flash('Spelaren är tillagd.', () => save({ players:[...players, name], playerHcp:{...playerHcp, [name]:''} }))
    setNewPlayer('')
  }

  async function renamePlayer(oldName, nextName) {
    const name = nextName.trim()
    if (!name || name === oldName || players.includes(name)) return
    const nextPlayers = players.map(p => p === oldName ? name : p)
    const nextHcp = {...playerHcp, [name]:playerHcp[oldName] || ''}; delete nextHcp[oldName]
    const nextRounds = rounds.map(r => ({...r, groups:r.groups?.map(g => ({...g, players:g.players.map(p => p === oldName ? name : p)})) || r.groups}))
    await flash('Namnet är uppdaterat.', () => save({players:nextPlayers, playerHcp:nextHcp, rounds:nextRounds}))
  }

  async function removePlayer(name) {
    if (!confirm(`Ta bort ${name}? Resultatdata lämnas orörd.`)) return
    const nextPlayers = players.filter(p => p !== name)
    const nextRounds = rounds.map(r => ({...r, groups:r.groups?.map(g => ({...g, players:g.players.filter(p => p !== name)})) || r.groups}))
    await flash('Spelaren är borttagen.', () => save({players:nextPlayers, rounds:nextRounds}))
  }

  function updateRound(slot, patch) {
    setRoundDrafts(list => list.map(r => r.slot === slot ? {...r, ...patch} : r))
  }

  async function saveRounds() {
    await flash('Rundorna är sparade.', () => save({rounds:roundDrafts}))
  }

  function updateCourse(id, patch) {
    setCourseDrafts(list => list.map(c => c.id === id ? {...c, ...patch} : c))
  }

  async function saveCourses() {
    await flash('Banorna är sparade.', () => save({courses:courseDrafts}))
  }

  const tabs = [['overview','Översikt'],['players','Spelare'],['rounds','Deltävlingar'],['groups','Bollar'],['courses','Banor'],['heroes','Hero-bilder'],['notifications','Notiser']]
  return <section className="adminPage">
    <div className="adminHero">
      <div><small>VOLVO MASTERS CONTROL CENTER</small><h2>Adminpanel</h2><p>Ändringar sparas direkt i Firebase och syns för alla.</p></div>
      <div className="adminPulse"><i />Admin aktiv</div>
    </div>
    <div className="adminTabs">{tabs.map(([id,label]) => <button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</div>
    {status && <div className="adminStatus">{status}</div>}

    {tab==='overview' && <div className="adminOverviewGrid">
      <div className="adminMetric"><span>👥</span><strong>{players.length}</strong><small>Spelare</small></div>
      <div className="adminMetric"><span>⛳</span><strong>{rounds.length}</strong><small>Deltävlingar</small></div>
      <div className="adminMetric"><span>🏌️</span><strong>{courses.length}</strong><small>Banor</small></div>
      <div className="adminMetric"><span>🔔</span><strong>{notificationsEnabled?'På':'Av'}</strong><small>Notiser på denna enhet</small></div>
      <div className="panel adminWelcome"><h3>Snabbstart inför tävlingen</h3><ol><li>Kontrollera datum och bana under Deltävlingar.</li><li>Ordna spelarna under Bollar.</li><li>Kontrollera HCP under Spelare.</li><li>Öppna Score och välj markör.</li></ol></div>
    </div>}

    {tab==='players' && <div className="panel adminSection">
      <div className="adminSectionHead"><div><h3>Hantera spelare</h3><p>Lägg till, byt namn, ta bort och ändra HCP.</p></div><div className="adminInline"><input value={newPlayer} onChange={e=>setNewPlayer(e.target.value)} placeholder="Nytt spelarnamn"/><button onClick={addPlayer}>Lägg till</button></div></div>
      <div className="adminPlayerList">{players.map(player => <AdminPlayerRow
        key={player}
        player={player}
        hcp={playerHcp[player] || ''}
        photo={playerPhotos[player] || ''}
        onRename={renamePlayer}
        onHcp={value=>save({playerHcp:{...playerHcp,[player]:value}})}
        onUploadPhoto={file=>uploadPlayerPhoto(player, file)}
        onRemovePhoto={()=>save({playerPhotos:{...playerPhotos,[player]:''}})}
        onRemove={removePlayer}
      />)}</div>
    </div>}

    {tab==='rounds' && <div className="panel adminSection">
      <div className="adminSectionHead"><div><h3>Deltävlingar</h3><p>Ändra datum och bana.</p></div><button onClick={saveRounds}>Spara alla</button></div>
      <div className="adminRoundGrid">{roundDrafts.map(r => <div className="adminRoundCard" key={r.slot}><b>Deltävling {r.slot}</b><label>Datum<input value={r.date||''} onChange={e=>updateRound(r.slot,{date:e.target.value})}/></label><label>Bana<select value={r.courseId} onChange={e=>updateRound(r.slot,{courseId:Number(e.target.value)})}>{courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div>)}</div>
    </div>}

    {tab==='groups' && <div className="panel adminSection">
      <div className="adminSectionHead"><div><h3>Bollar och starttider</h3><p>Flytta spelare med rullistorna och spara rond för rond.</p></div></div>
      <div className="adminGroupsList">{rounds.map(r => <AdminRoundGroups key={r.slot} round={r} players={players} onSave={updateRoundGroups}/>)}</div>
    </div>}

    {tab==='courses' && <div className="panel adminSection">
      <div className="adminSectionHead"><div><h3>Banor</h3><p>Uppdatera tee, slope, CR och par.</p></div><button onClick={saveCourses}>Spara banor</button></div>
      <div className="adminCourseGrid">{courseDrafts.map(c => <div className="adminCourseCard" key={c.id}><h4>{c.name}</h4><label>Namn<input value={c.name} onChange={e=>updateCourse(c.id,{name:e.target.value})}/></label><div className="adminFieldGrid"><label>Tee<input value={c.tee||''} onChange={e=>updateCourse(c.id,{tee:e.target.value})}/></label><label>Par<input inputMode="numeric" value={c.par||''} onChange={e=>updateCourse(c.id,{par:Number(e.target.value)||''})}/></label><label>CR<input inputMode="decimal" value={c.cr||''} onChange={e=>updateCourse(c.id,{cr:Number(e.target.value)||''})}/></label><label>Slope<input inputMode="numeric" value={c.slope||''} onChange={e=>updateCourse(c.id,{slope:Number(e.target.value)||''})}/></label></div></div>)}</div>
    </div>}

    {tab==='heroes' && (
      <HeroImageAdmin
        heroImages={heroImages}
        onUpload={uploadHeroImage}
        onRemove={viewId =>
          save({
            heroImages: {
              ...heroImages,
              [viewId]: '',
            },
          })
        }
      />
    )}

    {tab==='notifications' && <div className="panel adminSection notificationAdmin">
      <span className="adminBigIcon">🔔</span><h3>Notiser</h3><p>Aktivera notiser på den här enheten. Testknappen visar en lokal notis så att du kan kontrollera telefonens behörighet.</p>
      <div className="adminActions"><button onClick={enableNotifications}>{notificationsEnabled?'Registrera om enheten':'Aktivera notiser'}</button><button className="ghost" onClick={()=>{ if(Notification.permission==='granted') new Notification('Volvo Masters',{body:'Testnotisen fungerar på den här enheten.',icon:'/favicon.svg'}); else alert('Aktivera notiser först.') }}>Skicka lokal testnotis</button></div>
      <small>Chattnotiser i bakgrunden skickas av Firebase-funktionen när telefonens FCM-token är registrerad.</small>
    </div>}
  </section>
}

function HeroImageAdmin({ heroImages = {}, onUpload, onRemove }) {
  const [uploading, setUploading] = useState('')

  const views = [
    ['home', '🏠 Hem', '/courses/skovde.jpg'],
    ['leaderboard', '🏆 Leaderboard', '/courses/skovde.jpg'],
    ['rounds', '⛳ Deltävlingar', '/courses/breviken.jpg'],
    ['score', '✍️ Scorekort', '/courses/skovde.jpg'],
    ['players', '👥 Spelare', '/courses/knistad.jpg'],
    ['stats', '📊 Statistik', '/courses/mariestad.jpg'],
    ['chat', '💬 Chat', '/courses/billingen.jpg'],
    ['live', '🔴 Live', '/courses/skovde.jpg'],
    ['gallery', '📷 Galleri', '/courses/lacko.jpg'],
    ['admin', '👑 Admin', '/courses/knistad.jpg'],
  ]

  async function handleUpload(viewId, event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type?.startsWith('image/')) {
      alert('Välj en bildfil.')
      event.target.value = ''
      return
    }

    setUploading(viewId)

    try {
      await onUpload(viewId, file)
      alert('Hero-bilden är uppdaterad.')
    } catch (error) {
      console.error(error)
      alert(error.message || 'Bilden kunde inte laddas upp.')
    } finally {
      setUploading('')
      event.target.value = ''
    }
  }

  return (
    <div className="panel adminSection">
      <div className="adminSectionHead">
        <div>
          <h3>Hero-bilder</h3>
          <p>Välj en befintlig bild eller ta ett nytt foto direkt med telefonen.</p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
        }}
      >
        {views.map(([viewId, label, fallback]) => {
          const currentImage = heroImages[viewId] || fallback
          const isUploading = uploading === viewId

          return (
            <article
              key={viewId}
              style={{
                overflow: 'hidden',
                borderRadius: '18px',
                border: '1px solid rgba(255,255,255,0.10)',
                background: 'rgba(255,255,255,0.035)',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  height: '150px',
                  backgroundImage: `linear-gradient(rgba(3,18,11,0.18), rgba(3,18,11,0.72)), url(${currentImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '16px',
                }}
              >
                <strong style={{ fontSize: '19px', color: '#fff' }}>
                  {label}
                </strong>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: '10px',
                  padding: '14px',
                }}
              >
                <label
                  style={{
                    position: 'relative',
                    display: 'flex',
                    width: '100%',
                    minHeight: '48px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #9b7a26, #3f6f49)',
                    border: '1px solid rgba(244,223,156,0.70)',
                    color: '#fff',
                    fontWeight: 900,
                    cursor: isUploading ? 'wait' : 'pointer',
                    overflow: 'hidden',
                  }}
                >
                  {isUploading ? 'Laddar upp…' : '🖼️ Välj från galleri'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={event => handleUpload(viewId, event)}
                    disabled={isUploading}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: isUploading ? 'wait' : 'pointer',
                    }}
                  />
                </label>

                <label
                  style={{
                    position: 'relative',
                    display: 'flex',
                    width: '100%',
                    minHeight: '48px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    color: '#fff',
                    fontWeight: 900,
                    cursor: isUploading ? 'wait' : 'pointer',
                    overflow: 'hidden',
                  }}
                >
                  {isUploading ? 'Laddar upp…' : '📷 Ta foto'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={event => handleUpload(viewId, event)}
                    disabled={isUploading}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: isUploading ? 'wait' : 'pointer',
                    }}
                  />
                </label>

                {heroImages[viewId] && (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => onRemove(viewId)}
                    disabled={isUploading}
                  >
                    Återställ standardbild
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}


function AdminPlayerRow({
  player,
  hcp,
  photo,
  onRename,
  onHcp,
  onUploadPhoto,
  onRemovePhoto,
  onRemove,
}) {
  const [name, setName] = useState(player)
  const [uploading, setUploading] = useState(false)

  useEffect(() => setName(player), [player])

  async function handlePhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type?.startsWith('image/')) {
      alert('Välj en bildfil.')
      event.target.value = ''
      return
    }

    setUploading(true)
    try {
      await onUploadPhoto(file)
    } catch (error) {
      console.error(error)
      alert(
  `Bilden kunde inte laddas upp.\n\n${error?.message || 'Okänt fel'}`
)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  return (
    <div
      className="adminPlayerRow"
      style={{
        display: 'grid',
        gridTemplateColumns: '64px minmax(0, 1fr)',
        gap: '12px',
        alignItems: 'center',
        padding: '14px',
        borderRadius: '16px',
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'visible',
      }}
    >
      <div
        className="adminAvatar"
        style={{
          overflow: 'hidden',
          width: '58px',
          height: '58px',
          minWidth: '58px',
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {photo ? (
          <img
            src={photo}
            alt={player}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          player.split(' ').map(x => x[0]).join('').slice(0, 2)
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <label style={{ display: 'block' }}>
          Namn
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={() => onRename(player, name)}
            style={{ width: '100%' }}
          />
        </label>

        <label style={{ display: 'block', marginTop: '10px' }}>
          HCP
          <input
            value={hcp}
            onChange={e => onHcp(e.target.value)}
            placeholder="0,0"
            style={{ width: '100%' }}
          />
        </label>
      </div>

      <div
        style={{
          gridColumn: '1 / -1',
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '10px',
          marginTop: '4px',
        }}
      >
        <label
          style={{
            display: 'flex',
            visibility: 'visible',
            opacity: 1,
            width: '100%',
            minHeight: '48px',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 16px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #9b7a26, #3f6f49)',
            border: '1px solid rgba(244, 223, 156, 0.7)',
            color: '#ffffff',
            fontWeight: 900,
            cursor: uploading ? 'wait' : 'pointer',
            boxSizing: 'border-box',
            position: 'relative',
            zIndex: 9999,
          }}
        >
          {uploading ? 'Laddar upp bild…' : photo ? '📷 Byt bild' : '📷 Lägg till bild'}
          <input
            type="file"
            accept="image/*"
            onChange={handlePhoto}
            disabled={uploading}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: uploading ? 'wait' : 'pointer',
            }}
          />
        </label>

        {photo && (
          <button
            type="button"
            className="ghost"
            onClick={onRemovePhoto}
            disabled={uploading}
            style={{ width: '100%', minHeight: '44px' }}
          >
            Ta bort bild
          </button>
        )}

        <button
          type="button"
          className="danger ghost"
          onClick={() => onRemove(player)}
          disabled={uploading}
          style={{ width: '100%', minHeight: '44px' }}
        >
          Ta bort spelare
        </button>
      </div>
    </div>
  )
}

function AdminRoundGroups({ round, players, onSave }) {
  const initialGroups = round.groups?.length
    ? clone(round.groups)
    : chunkPlayers(players)

  const [groups, setGroups] = useState(initialGroups)
  const [times, setTimes] = useState(round.teeTimes || {})
  const [saving, setSaving] = useState(false)
  const [addChoices, setAddChoices] = useState({})

  useEffect(() => {
    setGroups(
      round.groups?.length
        ? clone(round.groups)
        : chunkPlayers(players)
    )
    setTimes(round.teeTimes || {})
    setAddChoices({})
  }, [round, players])

  const usedPlayers = new Set(
    groups.flatMap(group => group.players || [])
  )
  const availablePlayers = players.filter(
    player => !usedPlayers.has(player)
  )

  function setPlayer(groupIndex, playerIndex, value) {
    setGroups(current =>
      current.map((group, gi) =>
        gi === groupIndex
          ? {
              ...group,
              players: group.players.map((player, pi) =>
                pi === playerIndex ? value : player
              ),
            }
          : group
      )
    )
  }

  async function removePlayerFromRound(groupIndex, playerIndex, playerName) {
    const shouldRemove = window.confirm(
      `Ta bort ${playerName} från deltävling ${round.slot}?`
    )

    if (!shouldRemove) return

    const nextGroups = groups.map((group, gi) =>
      gi === groupIndex
        ? {
            ...group,
            players: group.players.filter(
              (_, pi) => pi !== playerIndex
            ),
          }
        : group
    )

    setGroups(nextGroups)
  }

  function addPlayerToGroup(groupIndex, groupId) {
    const selectedPlayer =
      addChoices[groupId] || availablePlayers[0]

    if (!selectedPlayer) {
      window.alert('Det finns inga lediga spelare att lägga till.')
      return
    }

    setGroups(current =>
      current.map((group, gi) =>
        gi === groupIndex
          ? {
              ...group,
              players: [...(group.players || []), selectedPlayer],
            }
          : group
      )
    )

    setAddChoices(current => ({
      ...current,
      [groupId]: '',
    }))
  }

  async function saveGroups() {
    setSaving(true)

    const cleanedGroups = groups.map((group, index) => ({
      ...group,
      id: group.id ?? index + 1,
      name: group.name?.trim() || `Boll ${index + 1}`,
      players: (group.players || []).filter(Boolean),
    }))

    try {
      await onSave(round.slot, cleanedGroups, times)
      window.alert('Bollarna är sparade.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <details className="adminGroupRound">
      <summary>
        <b>Deltävling {round.slot}</b>
        <span>{round.date || 'Datum saknas'}</span>
      </summary>

      <div className="adminGroupCards">
        {groups.map((group, groupIndex) => (
          <div className="adminGroupCard" key={group.id}>
            <div className="adminGroupTitle">
              <input
                value={group.name || ''}
                onChange={event =>
                  setGroups(current =>
                    current.map((item, index) =>
                      index === groupIndex
                        ? { ...item, name: event.target.value }
                        : item
                    )
                  )
                }
              />

              <input
                className="teeTimeInput"
                type="time"
                value={times[group.id] || ''}
                onChange={event =>
                  setTimes(current => ({
                    ...current,
                    [group.id]: event.target.value,
                  }))
                }
              />
            </div>

            {(group.players || []).map((player, playerIndex) => (
              <div
                className="adminGroupPlayerRow"
                key={`${group.id}-${playerIndex}`}
              >
                <select
                  value={player}
                  onChange={event =>
                    setPlayer(
                      groupIndex,
                      playerIndex,
                      event.target.value
                    )
                  }
                >
                  {players.map(name => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>

                <div
                  role="button"
                  tabIndex={0}
                  title={`Ta bort ${player}`}
                  aria-label={`Ta bort ${player}`}
                  onClick={() => {
                    if (!saving) {
                      removePlayerFromRound(groupIndex, playerIndex, player)
                    }
                  }}
                  onKeyDown={event => {
                    if (!saving && (event.key === 'Enter' || event.key === ' ')) {
                      removePlayerFromRound(groupIndex, playerIndex, player)
                    }
                  }}
                  style={{
                    display: 'flex',
                    width: '42px',
                    minWidth: '42px',
                    height: '42px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '10px',
                    border: '2px solid #ff7b7b',
                    background: '#8b1e1e',
                    color: '#ffffff',
                    fontSize: '24px',
                    lineHeight: 1,
                    fontWeight: 900,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    position: 'relative',
                    zIndex: 9999,
                    flexShrink: 0,
                  }}
                >
                  ×
                </div>
              </div>
            ))}

            {!group.players?.length && (
              <p className="hint">Inga spelare i denna boll.</p>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: '10px',
                marginTop: '12px',
                alignItems: 'center',
              }}
            >
              <select
                value={addChoices[group.id] || ''}
                onChange={event =>
                  setAddChoices(current => ({
                    ...current,
                    [group.id]: event.target.value,
                  }))
                }
                disabled={!availablePlayers.length || saving}
                style={{ width: '100%', minWidth: 0 }}
              >
                <option value="">
                  {availablePlayers.length
                    ? 'Välj spelare att lägga till'
                    : 'Inga lediga spelare'}
                </option>
                {availablePlayers.map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => addPlayerToGroup(groupIndex, group.id)}
                disabled={!availablePlayers.length || saving}
                style={{ minHeight: '42px', whiteSpace: 'nowrap' }}
              >
                + Lägg till
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={saveGroups} disabled={saving}>
        {saving ? 'Sparar…' : 'Spara bollar'}
      </button>
    </details>
  )
}

function Chat({players, identity}) {
  const [messages, setMessages] = useState([])
  const [name, setName] = useState(identity?.marker || players[0] || '')
  const [text, setText] = useState('')
  useEffect(() => { if (identity?.marker) setName(identity.marker) }, [identity?.marker])
  useEffect(() => { const q = query(collection(db,'chat'), orderBy('time','asc')); return onSnapshot(q, snap => setMessages(snap.docs.map(d => ({id:d.id, ...d.data()}))), () => {}) }, [])
  async function send() {
    if (!text.trim()) return
    await addDoc(collection(db,'chat'), {
      name,
      text:text.trim(),
      time:Date.now(),
      timeStr:new Date().toLocaleString('sv-SE'),
      senderDeviceId:getDeviceId(),
      type:'chat',
    })
    setText('')
  }
  return <section className="chatPanel"><div className="panel messages"><h2>Chat</h2>{messages.slice(-40).map(m => <div className="msg" key={m.id}><b>{m.name}</b><p>{m.text}</p><small>{m.timeStr}</small></div>)}</div><div className="panel composer"><select value={name} onChange={e=>setName(e.target.value)}>{players.map(p => <option key={p}>{p}</option>)}</select><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Skriv meddelande…"/><button onClick={send}>Skicka</button></div></section>
}



export default App


