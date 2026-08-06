export default function LiveBallFollow({ rounds = [], courses = [], scores = {}, players = [], activeRound }) {
  const round = activeRound || rounds[0];
  if (!round) return null;

  const course = courses.find(c => c.id === round.courseId);
  const groups = round.groups?.length
    ? round.groups
    : [{ id: "fallback", name: "Aktuell boll", players }];

  function playerProgress(player) {
    const holes = scores?.[player]?.[round.slot]?.holeScores || [];
    const played = holes.filter(h => h !== "" && Number(h) > 0).length;
    const strokes = holes.reduce((sum, h) => h !== "" ? sum + Number(h) : sum, 0);
    return { played, strokes };
  }

  return (
    <section className="live-follow livePage">
      <div className="section-head liveHero">
        <div>
          <p className="eyebrow">🔴 LIVE FRÅN BANAN</p>
          <h2>Följ andra bollar</h2>
          <span>{course?.name || "Aktuell rond"}</span>
        </div>
      </div>

      <div className="ball-grid liveCards">
        {groups.map((group, index) => {
          const groupPlayers = group.players || [];
          const progress = groupPlayers.map(playerProgress);
          const maxHole = Math.max(0, ...progress.map(p => p.played));

          return (
            <article className="ball-card liveCard" key={group.id || index}>
              <div className="ball-top">
                <strong>{group.name || `Boll ${index + 1}`}</strong>
                <span>Hål {maxHole}/18</span>
              </div>

             {groupPlayers.map(player => {
  const p = playerProgress(player);

  return (
    <div className="playerRow" key={player}>
      <span className="playerName">
        {player}
      </span>

      <span className="playerScore">
        {p.strokes || "-"} slag
      </span>
    </div>
  );
})}
<div className="liveStatus">
  <span className="dot"></span>
  {maxHole >= 18 ? "✅ Färdigspelad" : "🟢 Uppdateras live"}
</div>
            </article>
          );
        })}
      </div>
    </section>
  );
}