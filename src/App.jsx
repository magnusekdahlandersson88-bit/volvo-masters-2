import { useEffect, useMemo, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, onSnapshot, setDoc, collection, addDoc, query, orderBy } from 'firebase/firestore'
import './index.css'

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

  return { ...state, save }
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
    const results = rounds.map(r => playerRoundResult(player, r, courses, scores, playerHcp)).filter(r => r.played > 0)
    const best = [...results].sort((a,b) => b.adj - a.adj).slice(0,4)
    const total = Math.round(best.reduce((s,r) => s + r.adj, 0) * 10) / 10
    return { player, total, rounds: results.length, best, latest: results.at(-1) }
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
  const { identity, update: updateIdentity, clear: clearIdentity } = useLocalIdentity()
  const [view, setView] = useState('home')
  const [admin, setAdmin] = useState(false)
  const [selectedRound, setSelectedRound] = useState(1)
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
    const scores = clone(data.scores)
    scores[player] ||= {}
    scores[player][roundSlot] ||= { hcp:'', holeScores:Array(18).fill('') }
    scores[player][roundSlot].holeScores ||= Array(18).fill('')
    scores[player][roundSlot].holeScores[holeIndex] = value
    await data.save({ scores })
  }

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span>♛</span><div><b>VOLVO</b><small>MASTERS 2.4</small></div></div>
      <Nav view={view} setView={setView} />
      <button className="adminButton" onClick={admin ? () => setAdmin(false) : login}>{admin ? 'Lämna admin' : 'Admin'}</button>
    </aside>

    <main className="content">
      <Topbar loading={data.loading} admin={admin} identity={identity} clearIdentity={clearIdentity} />
      {view === 'home' && <Home board={board} nextRound={nextRound} nextCourse={nextCourse} setView={setView} />}
      {view === 'leaderboard' && <Leaderboard board={board} />}
      {view === 'rounds' && <Rounds rounds={data.rounds} courses={data.courses} setView={setView} setSelectedRound={setSelectedRound} />}
      {view === 'score' && <BallScorecard admin={admin} identity={identity} updateIdentity={updateIdentity} players={data.players} rounds={data.rounds} courses={data.courses} scores={data.scores} playerHcp={data.playerHcp} selectedRound={selectedRound} setSelectedRound={setSelectedRound} updateHole={updateHole} updateHcp={updateHcp} />}
      {view === 'players' && <Players players={data.players} board={board} playerHcp={data.playerHcp} updateHcp={updateHcp} admin={admin} />}
      {view === 'stats' && <Stats board={board} rounds={data.rounds} players={data.players} courses={data.courses} scores={data.scores} playerHcp={data.playerHcp} />}
      {view === 'chat' && <Chat players={data.players} identity={identity} />}
      {view === 'gallery' && <Gallery gallery={data.gallery} rounds={data.rounds} courses={data.courses} />}
    </main>

    <footer className="bottomNav"><Nav view={view} setView={setView} compact /></footer>
  </div>
}

function Nav({view, setView, compact=false}) {
  const items = [
    ['home','⌂','Hem'], ['leaderboard','🏆','Leaderboard'], ['rounds','⛳','Rundor'], ['score','✍️','Score'],
    ['players','👥','Spelare'], ['stats','📊','Statistik'], ['chat','💬','Chat'], ['gallery','🖼️','Galleri']
  ]
  return <nav className={compact ? 'nav compact' : 'nav'}>{items.map(([id, icon, label]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><span>{icon}</span>{!compact && label}</button>)}</nav>
}

function Topbar({loading, admin, identity, clearIdentity}) {
  return <header className="topbar">
    <div><small>Live från Firebase</small><h1>Volvo Masters 2026</h1></div>
    <div className="pills">
      {identity?.marker && <button className="identityPill" onClick={clearIdentity}>Markör: {identity.marker}</button>}
      <span>{loading ? 'Synkar…' : 'Synkad'}</span>
      {admin && <b>Admin aktiv</b>}
    </div>
  </header>
}

function Home({board, nextRound, nextCourse, setView}) {
  return <section className="homeGrid">
    <div className="heroCard">
      <small>Nästa deltävling</small>
      <h2>{nextCourse.emoji} {nextCourse.name}</h2>
      <p>{nextRound.date || 'Datum kommer'} · Tee {nextCourse.tee} · Slope {nextCourse.slope}</p>
      <div className="heroActions"><button onClick={() => setView('score')}>Starta scorekort</button><button className="ghost" onClick={() => setView('rounds')}>Visa rundor</button></div>
    </div>
    <Podium board={board} />
    <Metric title="Spelare" value="12" text="Volvo Masters-fält" />
    <Metric title="Deltävlingar" value="6" text="Bästa 4 räknas" />
    <Metric title="Stableford" value="36" text="Målet per runda" />
    <div className="panel wide"><h3>Snabbval</h3><div className="quickGrid"><button onClick={()=>setView('leaderboard')}>🏆 Leaderboard</button><button onClick={()=>setView('score')}>✍️ Fyll score</button><button onClick={()=>setView('chat')}>💬 Chat</button><button onClick={()=>setView('stats')}>📊 Statistik</button></div></div>
  </section>
}

function Podium({board}) {
  const top = board.slice(0,3)
  return <div className="panel podium"><h3>Topp 3 totalt</h3>{top.map((p,i) => <div className="podiumRow" key={p.player}><span>{['🥇','🥈','🥉'][i]}</span><b>{p.player}</b><strong>{p.total}p</strong></div>)}</div>
}

function Metric({title,value,text}) {
  return <div className="metric"><small>{title}</small><strong>{value}</strong><span>{text}</span></div>
}

function Leaderboard({board}) {
  return <section className="leaderboardPro">
    <div className="sectionHead"><h2>Leaderboard</h2><span>Top 4 justerat mot slope</span></div>
    <div className="podiumStage">
      {board.slice(0,3).map((p,i)=><div className={`podiumBlock place${i+1}`} key={p.player}>
        <span>{['🥇','🥈','🥉'][i]}</span><b>{p.player.split(' ')[0]}</b><strong>{p.total}p</strong><small>{p.rounds} rundor</small>
      </div>)}
    </div>
    <div className="panel">
      {board.map((p,i) => <div className="leaderRow enhanced" key={p.player}>
        <span className="rank">{i+1}</span>
        <div><b>{p.player}</b><small>{p.rounds} spelade · bästa: {p.best?.[0]?.adj || 0}p · senaste: {p.latest?.points || 0}p</small></div>
        <strong>{p.total}p</strong>
      </div>)}
    </div>
  </section>
}

function Rounds({rounds, courses, setView, setSelectedRound}) {
  return <section className="cards">{rounds.map(r => {
    const c = courseFor(courses, r)
    const groups = r.groups || []
    return <article className="roundCard" key={r.slot}><div className="courseArt">{c.emoji}</div><small>Rond {r.slot}</small><h3>{c.name}</h3><p>{r.date || 'Datum kommer'} · {c.location}</p><div className="roundMeta"><span>Par {c.par}</span><span>Slope {c.slope}</span><span>Tee {c.tee}</span><span>{groups.length || 3} bollar</span></div><button onClick={() => { setSelectedRound(r.slot); setView('score') }}>Öppna score</button></article>
  })}</section>
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
        <span>{canEditGroup ? 'Du kan föra score för hela bollen' : 'Välj markör för att kunna fylla i score'}</span>
        <strong>{progress}%</strong>
        <div className="progress"><i style={{width:`${progress}%`}} /></div>
      </div>
    </div>

    <div className="panel holeCommander">
      <div className="holeTopline"><span>Hål {activeHole + 1} av 18</span><b>Par {hole.par} · SI {hole.si}</b></div>
      <div className="holeNumber">{activeHole + 1}</div>
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

function Players({players, board, playerHcp, updateHcp, admin}) {
  const [selected, setSelected] = useState(players[0] || '')
  const row = board.find(b => b.player === selected)
  const best = row?.best || []
  const latest = row?.latest
  const initials = selected.split(' ').map(x=>x[0]).join('').slice(0,2)
  return <section className="playersPro">
    <div className="panel playerHero">
      <div className="bigAvatar">{initials}</div>
      <div>
        <small>Spelarprofil</small>
        <h2>{selected}</h2>
        <p>{row?.rounds || 0} spelade rundor · {row?.total || 0}p totalt · senaste {latest ? `${latest.points}p` : 'ingen runda'}</p>
      </div>
      {admin && <label className="hcpEditor">HCP<input value={playerHcp[selected] || ''} onChange={e => updateHcp(selected, e.target.value)} placeholder="HCP" /></label>}
    </div>

    <div className="profileGrid">
      <div className="panel playerList">
        <h3>Spelare</h3>
        {players.map(p => {
          const b = board.find(x => x.player === p)
          return <button key={p} className={p === selected ? 'active' : ''} onClick={() => setSelected(p)}>
            <span>{p.split(' ')[0]}</span><b>{b?.total || 0}p</b>
          </button>
        })}
      </div>

      <div className="panel profileStats">
        <h3>Säsongskort</h3>
        <div className="stats four">
          <div><strong>{row?.total || 0}</strong><span>Poäng</span></div>
          <div><strong>{row?.rounds || 0}</strong><span>Rundor</span></div>
          <div><strong>{latest?.strokes || '—'}</strong><span>Senaste slag</span></div>
          <div><strong>{latest?.net || '—'}</strong><span>Senaste netto</span></div>
        </div>
        <h3>Bästa rundor</h3>
        <div className="roundHistory">
          {best.length ? best.map((r,i)=><div key={`${r.course.name}-${i}`}><span>{i+1}. {r.course.name}</span><b>{r.adj}p</b><small>{r.strokes || '—'} brutto · {r.net || '—'} netto</small></div>) : <p className="hint">Ingen registrerad runda ännu.</p>}
        </div>
      </div>
    </div>
  </section>
}

function Stats({board, rounds, players, courses, scores, playerHcp}) {
  const [mode, setMode] = useState('overview')
  const allRounds = players.flatMap(player => rounds.map(round => playerRoundResult(player, round, courses, scores, playerHcp)).filter(r => r.played > 0).map(r => ({...r, player})))
  const bestPoints = [...allRounds].sort((a,b)=>b.adj-a.adj)[0]
  const bestNet = [...allRounds].filter(r=>r.net>0).sort((a,b)=>a.net-b.net)[0]
  const bestGross = [...allRounds].filter(r=>r.strokes>0).sort((a,b)=>a.strokes-b.strokes)[0]
  const holes = allRounds.flatMap(r => r.holeBreakdown.filter(h => h.diff !== null).map(h => ({...h, player:r.player, course:r.course.name})))
  const birdies = holes.filter(h => h.diff === -1).length
  const eagles = holes.filter(h => h.diff <= -2).length
  const pars = holes.filter(h => h.diff === 0).length
  const bogeys = holes.filter(h => h.diff === 1).length
  const doubles = holes.filter(h => h.diff >= 2).length
  const perPlayer = players.map(player => {
    const pr = allRounds.filter(r => r.player === player)
    const ph = holes.filter(h => h.player === player)
    const avgPts = pr.length ? Math.round(pr.reduce((s,r)=>s+r.points,0)/pr.length*10)/10 : 0
    const avgNet = pr.filter(r=>r.net).length ? Math.round(pr.filter(r=>r.net).reduce((s,r)=>s+r.net,0)/pr.filter(r=>r.net).length*10)/10 : 0
    return {
      player,
      rounds: pr.length,
      points: pr.reduce((s,r)=>s+r.points,0),
      avgPts,
      avgNet,
      gross: pr.reduce((s,r)=>s+r.strokes,0),
      birdies: ph.filter(h=>h.diff===-1).length,
      eagles: ph.filter(h=>h.diff<=-2).length,
      pars: ph.filter(h=>h.diff===0).length,
      bogeys: ph.filter(h=>h.diff===1).length,
      doubles: ph.filter(h=>h.diff>=2).length,
    }
  }).sort((a,b)=>b.avgPts-a.avgPts || b.points-a.points)
  const topBirdiePlayer = [...perPlayer].sort((a,b)=>(b.birdies + b.eagles) - (a.birdies + a.eagles))[0]
  const topParPlayer = [...perPlayer].sort((a,b)=>b.pars-a.pars)[0]
  const hardest = Array.from({length:18}, (_,i) => {
    const hs = holes.filter(h => h.hole === i+1)
    const avgPts = hs.length ? hs.reduce((s,h)=>s+(h.pts ?? 0),0)/hs.length : 0
    const avgDiff = hs.length ? hs.reduce((s,h)=>s+(h.diff ?? 0),0)/hs.length : 0
    return {hole:i+1, played:hs.length, avgPts:Math.round(avgPts*10)/10, avgDiff:Math.round(avgDiff*10)/10}
  }).filter(h=>h.played).sort((a,b)=>a.avgPts-b.avgPts)
  const tabs = [['overview','Översikt'],['players','Spelare'],['records','Rekord'],['holes','Hål']]
  return <section className="statsPage">
    <div className="sectionHead"><h2>Statistikmotor</h2><span>Poäng · nettoslag · bruttoslag · håldata</span></div>
    <div className="statTabs">{tabs.map(([id,label]) => <button key={id} className={mode===id?'active':''} onClick={()=>setMode(id)}>{label}</button>)}</div>

    {mode === 'overview' && <div className="homeGrid">
      <Metric title="Registrerade rundor" value={allRounds.length} text="Totalt i systemet" />
      <Metric title="Bästa poängrunda" value={bestPoints ? `${bestPoints.adj}p` : '—'} text={bestPoints?.player || 'Ingen data'} />
      <Metric title="Bästa nettoslag" value={bestNet ? bestNet.net : '—'} text={bestNet?.player || 'Ingen data'} />
      <Metric title="Bästa bruttoslag" value={bestGross ? bestGross.strokes : '—'} text={bestGross?.player || 'Ingen data'} />
      <div className="panel wide statBreakdown"><h3>Hålfördelning</h3><div className="breakGrid"><span>🦅 Eagles <b>{eagles}</b></span><span>🐦 Birdies <b>{birdies}</b></span><span>✅ Par <b>{pars}</b></span><span>☝️ Bogeys <b>{bogeys}</b></span><span>✌️ Dubbel+ <b>{doubles}</b></span></div></div>
    </div>}

    {mode === 'players' && <div className="panel"><h3>Spelarstatistik</h3><div className="statTable"><div className="statTableHead"><span>Spelare</span><span>R</span><span>Snitt p</span><span>Snitt netto</span><span>Birdies</span><span>Par</span></div>{perPlayer.map(p => <div className="statTableRow" key={p.player}><b>{p.player}</b><span>{p.rounds}</span><span>{p.avgPts}</span><span>{p.avgNet || '—'}</span><span>{p.birdies + p.eagles}</span><span>{p.pars}</span></div>)}</div></div>}

    {mode === 'records' && <div className="cards">
      <article className="recordCard"><small>Bästa poäng</small><b>{bestPoints ? `${bestPoints.adj}p` : '—'}</b><span>{bestPoints?.player}</span><em>{bestPoints?.course?.name}</em></article>
      <article className="recordCard"><small>Bästa nettoslag</small><b>{bestNet ? bestNet.net : '—'}</b><span>{bestNet?.player}</span><em>{bestNet?.course?.name}</em></article>
      <article className="recordCard"><small>Bästa bruttoslag</small><b>{bestGross ? bestGross.strokes : '—'}</b><span>{bestGross?.player}</span><em>{bestGross?.course?.name}</em></article>
      <article className="recordCard"><small>Flest birdies/eagles</small><b>{(topBirdiePlayer?.birdies || 0) + (topBirdiePlayer?.eagles || 0)}</b><span>{topBirdiePlayer?.player}</span><em>Brutto birdies + eagles</em></article>
      <article className="recordCard"><small>Flest par</small><b>{topParPlayer?.pars || 0}</b><span>{topParPlayer?.player}</span><em>Brutto par totalt</em></article>
    </div>}

    {mode === 'holes' && <div className="panel"><h3>Svåraste hålen</h3>{hardest.slice(0,18).map(h => <div className="leaderRow" key={h.hole}><div><b>Hål {h.hole}</b><small>{h.played} registrerade scorer</small></div><strong>{h.avgPts}p</strong><span className="muted">{h.avgDiff > 0 ? '+' : ''}{h.avgDiff} mot par</span></div>)}</div>}
  </section>
}

function Chat({players, identity}) {
  const [messages, setMessages] = useState([])
  const [name, setName] = useState(identity?.marker || players[0] || '')
  const [text, setText] = useState('')
  useEffect(() => { if (identity?.marker) setName(identity.marker) }, [identity?.marker])
  useEffect(() => { const q = query(collection(db,'chat'), orderBy('time','asc')); return onSnapshot(q, snap => setMessages(snap.docs.map(d => ({id:d.id, ...d.data()}))), () => {}) }, [])
  async function send() {
    if (!text.trim()) return
    await addDoc(collection(db,'chat'), { name, text:text.trim(), time:Date.now(), timeStr:new Date().toLocaleString('sv-SE') })
    setText('')
  }
  return <section className="chatPanel"><div className="panel messages"><h2>Chat</h2>{messages.slice(-40).map(m => <div className="msg" key={m.id}><b>{m.name}</b><p>{m.text}</p><small>{m.timeStr}</small></div>)}</div><div className="panel composer"><select value={name} onChange={e=>setName(e.target.value)}>{players.map(p=><option key={p}>{p}</option>)}</select><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Skriv meddelande…"/><button onClick={send}>Skicka</button></div></section>
}

function Gallery({gallery, rounds, courses}) {
  const imgs = rounds.flatMap(r => (gallery?.[r.slot] || []).map(img => ({...img, course:courseFor(courses,r).name})))
  return <section className="cards">{imgs.length ? imgs.map((img,i)=><article className="galleryCard" key={i}><img src={img.url} /><b>{img.course}</b><p>{img.caption}</p></article>) : <div className="panel"><h2>Galleri</h2><p>Inga bilder ännu. Galleri är förberett för gamla appens dataformat.</p></div>}</section>
}

export default App
