export default function LiveActivityFeed({ rounds = [], scores = {}, players = [], activeRound }) {
  const round = activeRound || rounds[0];
  if (!round) return null;

  const events = players.flatMap(player => {
    const holeScores = scores?.[player]?.[round.slot]?.holeScores || [];
    return holeScores.map((score, i) => {
      if (!score) return null;
      const hole = i + 1;
      return {
        player,
        hole,
        text: `${player} rapporterade ${score} slag på hål ${hole}`,
      };
    }).filter(Boolean);
  }).slice(-8).reverse();

  return (
    <section className="live-feed panel wideScore">
      <div className="sectionHead">
        <h2>Live från banan</h2>
        <span>Senaste händelser</span>
      </div>

      {events.length ? (
        <div className="feedList">
          {events.map((event, i) => (
            <div className="feedItem" key={`${event.player}-${event.hole}-${i}`}>
              <span className="feedDot">●</span>
              <div>
                <strong>{event.text}</strong>
                <small>Liveuppdatering</small>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Inga rapporterade scorer ännu.</p>
      )}
    </section>
  );
}
