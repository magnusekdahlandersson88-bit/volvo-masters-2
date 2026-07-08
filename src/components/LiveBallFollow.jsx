export default function LiveBallFollow({ rounds = [], courses = [], scores = {}, players = [], activeRound }) {
  const round = activeRound || rounds[0];
  if (!round) return null;

  const groups = round.groups?.length
  ? round.groups
  : [{ id: "fallback", name: "Aktuell boll", players }];
  const course = courses.find(c => c.id === round.courseId);

  function playerProgress(player) {
    const s = scores[player]?.[round.slot];
    const holes = s?.holeScores || [];
    const played = holes.filter(h => h !== "" && Number(h) > 0).length;
    const strokes = holes.reduce((sum, h) => h !== "" ? sum + Number(h) : sum, 0);
    return { played, strokes };
  }

  return (
    <section className="live-follow">
      <div className="section-head">
        <div>
          <p className="eyebrow">Live</p>
          <h2>Följ andra bollar</h2>
        </div>
        <span>{course?.name || "Aktuell rond"}</span>
      </div>

      <div className="ball-grid">
        {groups.map((group, index) => {
          const groupPlayers = group.players || [];
          const progress = groupPlayers.map(playerProgress);
          const maxHole = Math.max(0, ...progress.map(p => p.played));

          return (
            <article className="ball-card" key={group.id || index}>
              <div className="ball-top">
                <strong>{group.name || `Boll ${index + 1}`}</strong>
                <span>Hål {maxHole}/18</span>
              </div>

              {groupPlayers.map(player => {
                const p = playerProgress(player);
                return (
                  <div className="ball-player" key={player}>
                    <span>{player}</span>
                    <b>{p.strokes || "—"} slag</b>
                  </div>
                );
              })}
            </article>
          );
        })}
      </div>
    </section>
  );
}
