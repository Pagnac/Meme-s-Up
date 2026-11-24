export default function ScoreBoard({ teams, scores, activeTeamId = null, round = null, roundCount = 3 }) {
  return (
    <div className="scoreboard-wrap">
      {round && <div className="round-pill">Manche {round}/{roundCount}</div>}
      <div className="scoreboard">
        {teams.map((t) => (
          <div key={t.id} className={`score-card${t.id === activeTeamId ? ' active' : ''}`}>
            <div className="score-name">{t.name}</div>
            {t.players?.length > 0 && <div className="score-players">{t.players.join(' · ')}</div>}
            <div className="score-points">{scores[t.id] ?? 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
