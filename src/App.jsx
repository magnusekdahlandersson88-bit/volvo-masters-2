import { useEffect, useMemo, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, onSnapshot, setDoc, collection, addDoc, query, orderBy } from 'firebase/firestore'

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

const ADMIN_PASSWORD = '340426'
const GOLD = '#d6b35f'
const DEFAULT_PAR = [4,3,5,4,4,3,5,4,4,4,3,5,4,4,3,5,4,4]
const DEFAULT_SI = [1,13,5,11,3,15,7,17,9,2,14,6,12,4,16,8,18,10]
const makeHoles = () => DEFAULT_PAR.map((par, i) => ({ par, si: DEFAULT_SI[i] }))

const DEFAULT_PLAYERS = ['Jonas Ottosson','Henrik Bergman','Magnus Ekdahl','Viktor Eriksson','Conny Pettersson','Per Nilsson','Hugo Ottosson','Simon Rydgren','Philip Lecaros','Mattias Svensson','Jonatan Fagerström','Erik Skaremyr']
const DEFAULT_COURSES = [
  { id:1, name:'Breviken GK', tee:'Gul', location:'Karlsborg', par:72, cr:71.4, slope:136, emoji:'🏨', holes:makeHoles() },
  { id:2, name:'Billingen GK', tee:'53', location:'Skövde', par:70, cr:69.3, slope:132, emoji:'⛰️', holes:makeHoles() },
  { id:3, name:'Knistad Golf & Country Club', tee:'55', location:'Skövde', par:72, cr:70.3, slope:126, emoji:'🏰', holes:makeHoles() },
  { id:4, name:'Skövde GK', tee:'58', location:'Skövde', par:72, cr:71.9, slope:137, emoji:'🌿', holes:makeHoles() },
  { id:5, name:'Mariestad GK', tee:'57', location:'Mariestad', par:73, cr:71.9, slope:134, emoji:'🌊', holes:makeHoles() },
  { id:6, name:'Läckö GK', tee:'Gul', location:'Lidköping', par:72, cr:71.6, slope:138, emoji:'🏯', holes:makeHoles() }
]
const DEFAULT_ROUNDS = [
  { slot:1, courseId:1, date:'14 maj 2026', teeTimes:{1:'',2:'',3:''}, groups:[{id:1,name:'Fyrboll 1',players:['Magnus Ekdahl','Simon Rydgren','Hugo Ottosson','Jonatan Fagerström']},{id:2,name:'Fyrboll 2',players:['Viktor Eriksson','Philip Lecaros','Mattias Svensson','Erik Skaremyr']},{id:3,name:'Treboll',players:['Per Nilsson','Jonas Ottosson','Conny Pettersson']}]},
  { slot:2, courseId:2, date:'29 maj 2026', teeTimes:{1:'',2:'',3:''}, groups:[{id:1,name:'Treboll',players:['Henrik Bergman','Conny Pettersson','Mattias Svensson']},{id:2,name:'Fyrboll 1',players:['Jonas Ottosson','Per Nilsson','Magnus Ekdahl','Simon Rydgren']},{id:3,name:'Fyrboll 2',players:['Hugo Ottosson','Erik Skaremyr','Jonatan Fagerström','Philip Lecaros']}]},
  { slot:3, courseId:5, date:'21 jun 2026', teeTimes:{1:'',2:'',3:''}, groups:[{id:1,name:'Fyrboll 1',players:['Per Nilsson','Mattias Svensson','Erik Skaremyr','Simon Rydgren']},{id:2,name:'Treboll',players:['Conny Pettersson','Hugo Ottosson','Philip Lecaros']},{id:3,name:'Fyrboll 2',players:['Henrik Bergman','Viktor Eriksson','Jonas Ottosson','Magnus Ekdahl']}]},
  { slot:4, courseId:3, date:'3 jul 2026', teeTimes:{1:'',2:'',3:''}, groups:[{id:1,name:'Fyrboll 1',players:['Henrik Bergman','Conny Pettersson','Magnus Ekdahl','Philip Lecaros']},{id:2,name:'Fyrboll 2',players:['Simon Rydgren','Jonas Ottosson','Jonatan Fagerström','Hugo Ottosson']},{id:3,name:'Treboll',players:['Viktor Eriksson','Per Nilsson','Erik Skaremyr']}]},
  { slot:5, courseId:4, date:'', teeTimes:{1:'',2:'',3:''}, groups:null },
  { slot:6, courseId:6, date:'', teeTimes:{1:'',2:'',3:''}, groups:null }
]

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
  return { ...state, save }
}
function courseFor(courses, round) { return courses.find(c => c.id === round.courseId) || courses[0] || DEFAULT_COURSES[0] }
function playerRoundResult(player, round, courses, scores, playerHcp) {
  const course = courseFor(courses, round)
  const score = scores[player]?.[round.slot]
  const holes = course.holes?.length === 18 ? course.holes : makeHoles()
  const hcp = score?.hcp || playerHcp[player] || ''
  const playing = calcPlayingHcp(hcp, course.slope, course.cr, course.par)
  const holeScores = score?.holeScores || Array(18).fill('')
  const played = holeScores.filter(v => v !== '' && Number(v) > 0).length
  const strokes = holeScores.reduce((sum, st) => st !== '' ? sum + Number(st) : sum, 0)
  const points = holeScores.reduce((sum, st, i) => {
    const pts = calcStableford(st, holes[i]?.par || 4, holes[i]?.si || i + 1, playing)
    return pts == null ? sum : sum + pts
  }, 0)
  const adj = points > 0 ? Math.round(points * (113 / (course.slope || 113)) * 10) / 10 : 0
  return { player, course, played, strokes, points, adj, playing, hcp, holeScores }
}
function leaderboard(players, rounds, courses, scores, playerHcp) {
  return players.map(player => {
    const results = rounds.map(r => playerRoundResult(player, r, courses, scores, playerHcp)).filter(r => r.played > 0)
    const best = [...results].sort((a,b) => b.adj - a.adj).slice(0,4)
    const total = Math.round(best.reduce((s,r) => s + r.adj, 0) * 10) / 10
    return { player, total, rounds: results.length, best, latest: results.at(-1) }
  }).sort((a,b) => b.total - a.total || b.rounds - a.rounds)
}

function App() {
  const data = useTournamentData()
  const [view, setView] = useState('home')
  const [admin, setAdmin] = useState(false)
  const [selectedRound, setSelectedRound] = useState(1)
  const [selectedPlayer, setSelectedPlayer] = useState(DEFAULT_PLAYERS[0])
  const board = useMemo(() => leaderboard(data.players, data.rounds, data.courses, data.scores, data.playerHcp), [data.players, data.rounds, data.courses, data.scores, data.playerHcp])
  const nextRound = data.rounds.find(r => !data.players.some(p => playerRoundResult(p, r, data.courses, data.scores, data.playerHcp).played > 0)) || data.rounds[0]
  const nextCourse = courseFor(data.courses, nextRound)

  function login() {
    const pwd = prompt('Adminlösenord')
    if (pwd === ADMIN_PASSWORD) setAdmin(true)
    else if (pwd) alert('Fel lösenord')
  }
  async function updateHcp(player, value) {
    await data.save({ playerHcp: { ...data.playerHcp, [player]: value } })
  }
  async function updateHole(player, roundSlot, holeIndex, value) {
    const scores = structuredClone(data.scores || {})
    scores[player] ||= {}
    scores[player][roundSlot] ||= { hcp:'', holeScores:Array(18).fill('') }
    scores[player][roundSlot].holeScores ||= Array(18).fill('')
    scores[player][roundSlot].holeScores[holeIndex] = value
    await data.save({ scores })
  }

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span>♛</span><div><b>VOLVO</b><small>MASTERS 2.0</small></div></div>
      <Nav view={view} setView={setView} />
      <button className="adminButton" onClick={admin ? () => setAdmin(false) : login}>{admin ? 'Lämna admin' : 'Admin'}</button>
    </aside>
    <main className="content">
      <Topbar loading={data.loading} admin={admin} />
      {view === 'home' && <Home board={board} nextRound={nextRound} nextCourse={nextCourse} setView={setView} />}
      {view === 'leaderboard' && <Leaderboard board={board} />}
      {view === 'rounds' && <Rounds rounds={data.rounds} courses={data.courses} setView={setView} setSelectedRound={setSelectedRound} />}
      {view === 'score' && <Scorecard admin={admin} players={data.players} rounds={data.rounds} courses={data.courses} scores={data.scores} playerHcp={data.playerHcp} selectedRound={selectedRound} setSelectedRound={setSelectedRound} selectedPlayer={selectedPlayer} setSelectedPlayer={setSelectedPlayer} updateHole={updateHole} updateHcp={updateHcp} />}
      {view === 'players' && <Players players={data.players} board={board} playerHcp={data.playerHcp} updateHcp={updateHcp} admin={admin} />}
      {view === 'stats' && <Stats board={board} rounds={data.rounds} players={data.players} courses={data.courses} scores={data.scores} playerHcp={data.playerHcp} />}
      {view === 'chat' && <Chat players={data.players} />}
      {view === 'gallery' && <Gallery gallery={data.gallery} rounds={data.rounds} courses={data.courses} />}
    </main>
    <footer className="bottomNav"><Nav view={view} setView={setView} compact /></footer>
  </div>
}
function Nav({view, setView, compact=false}) {
  const items = [['home','Hem','⌂'], ['leaderboard','Leaderboard','🏆'], ['rounds','Rundor','⛳'], ['score','Score','✍️'], ['players','Spelare','👥'], ['stats','Statistik','📊'], ['chat','Chat','💬'], ['gallery','Galleri','📷']]
  return <nav className={compact ? 'nav compact' : 'nav'}>{items.map(([id,label,icon]) => <button key={id} className={view===id ? 'active' : ''} onClick={() => setView(id)}><span>{icon}</span>{!compact && label}</button>)}</nav>
}
function Topbar({loading, admin}) { return <header className="topbar"><div><small>Live från Firebase</small><h1>Volvo Masters 2026</h1></div><div className="pills"><span>{loading ? 'Laddar…' : 'Synkad'}</span>{admin && <b>Adminläge</b>}</div></header> }
function Home({board, nextRound, nextCourse, setView}) {
  return <section className="homeGrid">
    <div className="heroCard"><p className="eyebrow">Nästa deltävling</p><h2>{nextCourse.emoji} {nextCourse.name}</h2><p>{nextRound.date || 'Datum kommer'} · Tee {nextCourse.tee} · Slope {nextCourse.slope}</p><div className="heroActions"><button onClick={() => setView('score')}>Starta scorekort</button><button className="ghost" onClick={() => setView('rounds')}>Visa rundor</button></div></div>
    <Podium board={board} />
    <Metric title="Spelare" value="12" text="Volvo Masters-fält" />
    <Metric title="Deltävlingar" value="6" text="Bästa 4 räknas" />
    <Metric title="Stableford" value="36" text="Målet per runda" />
    <div className="panel wide"><h3>Snabbval</h3><div className="quickGrid"><button onClick={()=>setView('leaderboard')}>🏆 Leaderboard</button><button onClick={()=>setView('score')}>✍️ Fyll score</button><button onClick={()=>setView('chat')}>💬 Chat</button><button onClick={()=>setView('stats')}>📊 Statistik</button></div></div>
  </section>
}
function Podium({board}) { const top = board.slice(0,3); return <div className="panel podium"><h3>Topp 3 totalt</h3>{top.map((p,i) => <div className="podiumRow" key={p.player}><span>{['🥇','🥈','🥉'][i]}</span><b>{p.player}</b><strong>{p.total}p</strong></div>)}</div> }
function Metric({title,value,text}) { return <div className="metric"><small>{title}</small><strong>{value}</strong><span>{text}</span></div> }
function Leaderboard({board}) { return <section className="panel"><div className="sectionHead"><h2>Leaderboard</h2><span>Top 4 justerat mot slope</span></div>{board.map((p,i) => <div className="leaderRow" key={p.player}><span className="rank">{i+1}</span><div><b>{p.player}</b><small>{p.rounds} spelade rundor</small></div><strong>{p.total}p</strong></div>)}</section> }
function Rounds({rounds, courses, setView, setSelectedRound}) { return <section className="cards">{rounds.map(r => { const c = courseFor(courses, r); return <article className="roundCard" key={r.slot}><div className="courseArt">{c.emoji}</div><small>Rond {r.slot}</small><h3>{c.name}</h3><p>{r.date || 'Datum kommer'} · {c.location}</p><div className="roundMeta"><span>Par {c.par}</span><span>Slope {c.slope}</span><span>Tee {c.tee}</span></div><button onClick={() => { setSelectedRound(r.slot); setView('score') }}>Öppna score</button></article> })}</section> }
function Scorecard({admin, players, rounds, courses, scores, playerHcp, selectedRound, setSelectedRound, selectedPlayer, setSelectedPlayer, updateHole, updateHcp}) {
  const round = rounds.find(r => r.slot === Number(selectedRound)) || rounds[0]
  const course = courseFor(courses, round)
  const result = playerRoundResult(selectedPlayer, round, courses, scores, playerHcp)
  const holes = course.holes?.length === 18 ? course.holes : makeHoles()
  return <section className="scoreLayout">
    <div className="panel controls"><h2>Scorekort</h2><label>Rond<select value={selectedRound} onChange={e => setSelectedRound(Number(e.target.value))}>{rounds.map(r => <option key={r.slot} value={r.slot}>Rond {r.slot}</option>)}</select></label><label>Spelare<select value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)}>{players.map(p => <option key={p}>{p}</option>)}</select></label><label>HCP<input disabled={!admin} value={playerHcp[selectedPlayer] || ''} onChange={e => updateHcp(selectedPlayer, e.target.value)} placeholder="Ange HCP" /></label><div className="scoreSummary"><b>{course.name}</b><span>Spelhcp {result.playing}</span><strong>{result.points}p</strong></div>{!admin && <p className="hint">Logga in som admin för att ändra score.</p>}</div>
    <div className="panel scoreTable"><div className="holesGrid">{holes.map((h,i) => <div className="holeBox" key={i}><small>Hål {i+1}</small><b>Par {h.par}</b><em>SI {h.si}</em><input disabled={!admin} inputMode="numeric" value={result.holeScores[i] || ''} onChange={e => updateHole(selectedPlayer, round.slot, i, e.target.value.replace(/\D/g,'').slice(0,2))} /><span>{calcStableford(result.holeScores[i], h.par, h.si, result.playing) ?? '-'}p</span></div>)}</div></div>
  </section>
}
function Players({players, board, playerHcp, updateHcp, admin}) { return <section className="cards">{players.map(p => { const row = board.find(b => b.player === p); return <article className="playerCard" key={p}><div className="avatar">{p.split(' ').map(x=>x[0]).join('').slice(0,2)}</div><h3>{p}</h3><p>Totalt {row?.total || 0}p · {row?.rounds || 0} rundor</p><input disabled={!admin} value={playerHcp[p] || ''} onChange={e => updateHcp(p, e.target.value)} placeholder="HCP" /></article> })}</section> }
function Stats({board, rounds, players, courses, scores, playerHcp}) {
  const bestRound = board.flatMap(p => p.best.map(r => ({...r, player:p.player}))).sort((a,b)=>b.adj-a.adj)[0]
  const totalPlayed = players.reduce((sum,p)=> sum + rounds.filter(r => playerRoundResult(p,r,courses,scores,playerHcp).played > 0).length,0)
  return <section className="homeGrid"><Metric title="Registrerade rundor" value={totalPlayed} text="Totalt i systemet"/><Metric title="Bästa runda" value={bestRound ? `${bestRound.adj}p` : '—'} text={bestRound?.player || 'Ingen data än'}/><Metric title="Ledare" value={board[0]?.total || 0} text={board[0]?.player || 'Ingen data'}/><div className="panel wide"><h2>Formtabell</h2>{board.slice(0,8).map(p => <div className="leaderRow" key={p.player}><div><b>{p.player}</b><small>{p.best.map(r=>r.adj).join(' · ') || 'Inga rundor'}</small></div><strong>{p.total}p</strong></div>)}</div></section>
}
function Chat({players}) {
  const [messages, setMessages] = useState([])
  const [name, setName] = useState(players[0] || '')
  const [text, setText] = useState('')
  useEffect(() => { const q = query(collection(db,'chat'), orderBy('time','asc')); return onSnapshot(q, snap => setMessages(snap.docs.map(d => ({id:d.id, ...d.data()}))), () => {}) }, [])
  async function send() { if (!text.trim()) return; await addDoc(collection(db,'chat'), { name, text:text.trim(), time:Date.now(), timeStr:new Date().toLocaleString('sv-SE') }); setText('') }
  return <section className="chatPanel"><div className="panel messages"><h2>Chat</h2>{messages.slice(-40).map(m => <div className="msg" key={m.id}><b>{m.name}</b><p>{m.text}</p><small>{m.timeStr}</small></div>)}</div><div className="panel composer"><select value={name} onChange={e=>setName(e.target.value)}>{players.map(p=><option key={p}>{p}</option>)}</select><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Skriv meddelande…"/><button onClick={send}>Skicka</button></div></section>
}
function Gallery({gallery, rounds, courses}) { const imgs = rounds.flatMap(r => (gallery[r.slot] || []).map(img => ({...img, course:courseFor(courses,r).name}))); return <section className="cards">{imgs.length ? imgs.map((img,i)=><article className="galleryCard" key={i}><img src={img.url} /><b>{img.course}</b><p>{img.caption}</p></article>) : <div className="panel"><h2>Galleri</h2><p>Inga bilder ännu. Galleri är förberett för gamla appens dataformat.</p></div>}</section> }
export default App
