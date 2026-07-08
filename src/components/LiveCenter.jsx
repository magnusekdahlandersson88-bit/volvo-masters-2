export default function LiveCenter({ rounds = [], scores = {}, players = [], activeRound }) {
  const round = activeRound || rounds[0];
  if (!round) return null;

  const groups = round.groups?.length
    ? round.groups
    : [{ id: "fallback", name: "Aktuell boll", players }];

  return (
    <section className="panel wideScore liveCenter">
      <div className="sectionHead">
        <h2>Livecenter</h2>
        <span>Följ tävlingen i realtid</span>
      </div>

      <div className="groupResults">
        {groups.map((group, index) => (
          <div className="groupResultCard" key={group.id || index}>
            <strong>{group.name || `Boll ${index + 1}`}</strong>
            {(group.players || players).map(player => {
              const holeScores = scores?.[player]?.[round.slot]?.holeScores || [];
              const played = holeScores.filter(Boolean).length;
              const strokes = holeScores.reduce((sum, h) => sum + (Number(h) || 0), 0);

              return (
                <div key={player} className="miniRow">
                  <span>{player}</span>
                  <b>{played}/18 hål · {strokes || "—"} slag</b>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
