export default function TournamentCenter({ rounds = [], scores = {}, players = [], activeRound }) {
  const round = activeRound || rounds[0];
  if (!round) return null;

  const events = players.flatMap(player => {
    const holes = scores?.[player]?.[round.slot]?.holeScores || [];
    return holes.map((score, i) => {
      if (!score) return null;
      return {
        player,
        hole: i + 1,
        score,
        text: `${player} rapporterade ${score} slag på hål ${i + 1}`,
      };
    }).filter(Boolean);
  }).slice(-10).reverse();

  return (
    <section className="tournamentCenter panel wideScore">
      <div className="sectionHead">
        <h2>Livecenter</h2>
        <span>Följ tävlingen i realtid</span>
      </div>

      <div className="liveGrid">
        <div>
          <h3>Följ bollar</h3>
          <p className="muted">Här bygger vi nästa steg: alla bollar, hålstatus och ledarboll.</p>
        </div>

        <div>
          <h3>Live från banan</h3>
          {events.length ? events.map((e, i) => (
            <div className="feedItem" key={`${e.player}-${e.hole}-${i}`}>
              <span className="feedDot">●</span>
              <div>
                <strong>{e.text}</strong>
                <small>Liveuppdatering</small>
              </div>
            </div>
          )) : <p className="muted">Inga scorer ännu.</p>}
        </div>
      </div>
    </section>
  );
}
