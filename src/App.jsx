import { useEffect, useMemo, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
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
    updatedAt: Date.now(),
    createdAt: Date.now(),
    userAgent: navigator.userAgent,
    enabled: true,
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
  if (!file) return;

  const id = `${Date.now()}-${file.name}`;
  const fileRef = ref(storage, `gallery/${id}`);

  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);

  const item = {
    id,
    url,
    type: file.type,
    name: file.name,
    createdAt: Date.now(),
  };

  const currentGallery = Array.isArray(state.gallery)
  ? state.gallery
  : Object.values(state.gallery || {});

await save({
  gallery: [...currentGallery, item],
});
}
  



  return { ...state, save, uploadMedia }
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

  async function updateHole(player, roundSlot, holeIndex, value) {
    const scores = clone(data.scores)
    scores[player] ||= {}
    scores[player][roundSlot] ||= { hcp:'', holeScores:Array(18).fill('') }
    scores[player][roundSlot].holeScores ||= Array(18).fill('')
    scores[player][roundSlot].holeScores[holeIndex] = value
    await data.save({ scores })
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
      <div
  style={{
    margin: "0 0 16px",
    padding: "14px 16px",
    borderRadius: "14px",
    background: notificationsEnabled
      ? "rgba(34, 197, 94, 0.14)"
      : "rgba(245, 158, 11, 0.14)",
    border: notificationsEnabled
      ? "1px solid rgba(34, 197, 94, 0.45)"
      : "1px solid rgba(245, 158, 11, 0.45)",
  }}
>
  <strong>
    {notificationsEnabled
      ? "🟢 Notiser aktiverade"
      : "🔔 Aktivera notiser"}
  </strong>

  <div style={{ marginTop: "5px", opacity: 0.85 }}>
    {notificationStatus}
  </div>

  {!notificationsEnabled && (
    <button
      type="button"
      onClick={enableNotificationsForCurrentDevice}
      style={{ marginTop: "10px" }}
    >
      Aktivera / försök igen
    </button>
  )}
</div>
      {view === 'home' && <Home
  board={board}
  nextRound={nextRound}
  nextCourse={nextCourse}
  setView={setView}
  rounds={data.rounds}
  setSelectedRound={setSelectedRound}
/>}
      {view === 'leaderboard' && <Leaderboard board={board} />}
      {view === 'rounds' && <Rounds admin={admin} players={data.players} rounds={data.rounds} courses={data.courses} scores={data.scores} playerHcp={data.playerHcp} setView={setView} setSelectedRound={setSelectedRound} updateRoundGroups={updateRoundGroups} />}
      {view === 'score' && <BallScorecard admin={admin} identity={identity} updateIdentity={updateIdentity} players={data.players} rounds={data.rounds} courses={data.courses} scores={data.scores} playerHcp={data.playerHcp} selectedRound={selectedRound} setSelectedRound={setSelectedRound} updateHole={updateHole} updateHcp={updateHcp} />}
      {view === 'live' && (
  <LiveBallFollow
    rounds={data.rounds}
    courses={data.courses}
    scores={data.scores}
    players={data.players}
  />
)}
      {view === 'players' && <Players players={data.players} board={board} rounds={data.rounds} courses={data.courses} scores={data.scores} playerHcp={data.playerHcp} updateHcp={updateHcp} admin={admin} />}
      {view === 'stats' && <Stats board={board} rounds={data.rounds} players={data.players} courses={data.courses} scores={data.scores} playerHcp={data.playerHcp} />}
      {view === 'chat' && <Chat players={data.players} identity={identity} />}
      {view === "gallery" && (
  <Gallery
    gallery={data.gallery}
    onUpload={uploadMedia}
  />
)}
      {view === 'admin' && admin && (
        <AdminPanel
          players={data.players}
          rounds={data.rounds}
          courses={data.courses}
          playerHcp={data.playerHcp}
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
  


function Home({board, nextRound, nextCourse, setView, rounds, setSelectedRound}) {
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
 return (
  <section className="homeGrid">
    <div
      className="heroCard"
      style={{
        backgroundImage: `linear-gradient(
          rgba(3, 19, 12, 0.35),
          rgba(3, 19, 12, 0.82)
        ), url(${COURSE_IMAGES[
  nextCourse.name
    .toLowerCase()
    .replace(" gk", "")
    .replace("ä", "a")
    .replace("ö", "o")
    .replace("å", "a")
]})`
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


function Leaderboard({ board }) {
  return (
    <section className="leaderboardPro">
      <div className="sectionHead">
        <h2>Leaderboard</h2>
        <span>Top 4 justerat mot slope</span>
      </div>

      <div className="podiumStage">
        {board.slice(0, 3).map((p, i) => (
          <div className={`podiumBlock place${i + 1}`} key={p.player}>
            <span>{["🥇", "🥈", "🥉"][i]}</span>
            <b>{p.player.split(" ")[0]}</b>
            <div className="leaderTotals">
              <strong>{p.total}p</strong>
              <small>{p.totalGross || 0} brutto · {p.totalNet || 0} netto · {p.totalRawPoints || 0} råpoäng</small>
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        {board.map((p, i) => (
          <div
            className={`leaderRow enhanced ${i < 3 ? "topThree" : ""}`}
            key={p.player}
          >
            <span className="rank">
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
            </span>

            <div>
              <b>{p.player}</b>
              <small>{p.rounds} spelade · bästa: {p.best?.[0]?.adj || 0}p</small>
            </div>

            <strong>{p.total}p</strong>
          </div>
        ))}
      </div>
    </section>
  );
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
    updateHole(player, round.slot, activeHole, value)
  }

  function addStroke(player, delta) {
  const current = scores?.[player]?.[round.slot]?.holeScores?.[activeHole] || ''
  const base = current === '' ? hole.par : Number(current)
  const next = Math.max(1, base + delta)

  setScore(player, String(next))

  setTimeout(() => {
    const updatedScores = {
      ...scores,
      [player]: {
        ...scores?.[player],
        [round.slot]: {
          ...scores?.[player]?.[round.slot],
          holeScores: {
            ...scores?.[player]?.[round.slot]?.holeScores,
            [activeHole]: String(next)
          }
        }
      }
    }

    const allDone = groupPlayers.every(p => {
      const v =
        p === player
          ? String(next)
          : updatedScores?.[p]?.[round.slot]?.holeScores?.[activeHole]

      return v !== undefined && v !== ''
    })

    if (allDone && activeHole < 17) {
      setActiveHole(activeHole + 1)
    }
  }, 150)
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
  <button onClick={() => setActiveHole(Math.max(0, activeHole - 1))}>
    ← Föregående
  </button>

  <button onClick={() => setActiveHole(Math.min(17, activeHole + 1))}>
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
        <button className="ghost" onClick={() => setActiveHole(h => Math.max(0, h - 1))}>← Föregående</button>
        <button onClick={() => setActiveHole(h => Math.min(17, h + 1))}>Nästa →</button>
      </div>
      <div className="miniHoles">{holes.map((h,i) => {
        const done = groupPlayers.every(p => scores?.[p]?.[round.slot]?.holeScores?.[i])
        return <button key={i} className={i === activeHole ? 'active' : done ? 'done' : ''} onClick={() => setActiveHole(i)}>{i+1}</button>
      })}</div>
    </div>

    <div className="panel wideScore groupOverview">
      <div className="sectionHead"><h2>Bollöversikt</h2><span>Live stableford</span></div>
      <div className="groupResults">{groupTotals.map(r => <div className="groupResult" key={r.player}><b>{r.player}</b><span>{r.played}/18 hål</span><strong>{r.points}p</strong><small>{r.strokes || '—'} slag</small></div>)}</div>
    </div>


    {admin && <div className="panel adminHcpBox"><h3>Admin · HCP</h3>{groupPlayers.map(p => <label key={p}>{p}<input value={playerHcp[p] || ''} onChange={e => updateHcp(p, e.target.value)} placeholder="HCP" /></label>)}</div>}
  </section>
}

function Players({ players, board, rounds, courses, scores, playerHcp, updateHcp, admin }) {
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
      <div className="bigAvatar">{initials}</div>
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


function AdminPanel({ players, rounds, courses, playerHcp, save, updateRoundGroups, enableNotifications, notificationsEnabled }) {
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

  const tabs = [['overview','Översikt'],['players','Spelare'],['rounds','Deltävlingar'],['groups','Bollar'],['courses','Banor'],['notifications','Notiser']]
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
      <div className="adminPlayerList">{players.map(player => <AdminPlayerRow key={player} player={player} hcp={playerHcp[player] || ''} onRename={renamePlayer} onHcp={value=>save({playerHcp:{...playerHcp,[player]:value}})} onRemove={removePlayer}/>)}</div>
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

    {tab==='notifications' && <div className="panel adminSection notificationAdmin">
      <span className="adminBigIcon">🔔</span><h3>Notiser</h3><p>Aktivera notiser på den här enheten. Testknappen visar en lokal notis så att du kan kontrollera telefonens behörighet.</p>
      <div className="adminActions"><button onClick={enableNotifications}>{notificationsEnabled?'Registrera om enheten':'Aktivera notiser'}</button><button className="ghost" onClick={()=>{ if(Notification.permission==='granted') new Notification('Volvo Masters',{body:'Testnotisen fungerar på den här enheten.',icon:'/favicon.svg'}); else alert('Aktivera notiser först.') }}>Skicka lokal testnotis</button></div>
      <small>Chattnotiser i bakgrunden skickas av Firebase-funktionen när telefonens FCM-token är registrerad.</small>
    </div>}
  </section>
}

function AdminPlayerRow({player,hcp,onRename,onHcp,onRemove}) {
  const [name,setName]=useState(player)
  useEffect(()=>setName(player),[player])
  return <div className="adminPlayerRow"><div className="adminAvatar">{player.split(' ').map(x=>x[0]).join('').slice(0,2)}</div><input value={name} onChange={e=>setName(e.target.value)} onBlur={()=>onRename(player,name)}/><label>HCP<input value={hcp} onChange={e=>onHcp(e.target.value)} placeholder="0,0"/></label><button className="danger ghost" onClick={()=>onRemove(player)}>Ta bort</button></div>
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


