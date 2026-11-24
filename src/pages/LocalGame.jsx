import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as Engine from '../game/engine.js';
import Timer from '../components/Timer.jsx';
import ScoreBoard from '../components/ScoreBoard.jsx';

export default function LocalGame() {
  const { state: init } = useLocation();
  const navigate = useNavigate();
  const [game, setGame] = useState(() => Engine.createMatch({ teams: init.teams, deck: init.deck }));
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (game.phase === 'turn' && game.turnEndsAt && now >= game.turnEndsAt) {
      setGame((g) => Engine.handleTimeout(g, Date.now()));
    }
  }, [now, game]);

  if (!init?.teams || !init?.deck) {
    return (
      <div className="container center-screen">
        <p>Aucune partie en cours.</p>
        <button className="btn btn-primary" onClick={() => navigate('/local')}>Nouvelle partie</button>
      </div>
    );
  }

  if (game.phase === 'roundIntro') {
    const info = Engine.currentRoundInfo(game);
    return (
      <div className="container center-screen">
        <div className="card round-intro">
          <div className="round-emoji">{info.emoji}</div>
          <h2>{info.title}</h2>
          <p className="rule">{info.rule}</p>
          <p className="muted">{game.deckAll.length} mots en jeu · chrono de 40 s</p>
          <button className="btn btn-primary btn-big" onClick={() => setGame((g) => Engine.beginTurn(g, Date.now()))}>
            C'est parti ▶
          </button>
        </div>
      </div>
    );
  }

  if (game.phase === 'roundEnd') {
    return (
      <div className="container center-screen">
        <div className="card">
          <h2>Fin de la manche {game.round} 🎉</h2>
          <ScoreBoard teams={game.teams} scores={game.scores} round={game.round} />
          <button className="btn btn-primary btn-big" onClick={() => setGame((g) => Engine.nextRound(g))}>
            Manche suivante ▶
          </button>
        </div>
      </div>
    );
  }

  if (game.phase === 'gameEnd') {
    const champs = Engine.winners(game);
    const tie = champs.length > 1;
    return (
      <div className="container center-screen">
        <div className="card">
          <div className="podium">{tie ? '🤝' : '🏆'}</div>
          <h2>{tie ? 'Égalité parfaite !' : `${champs[0].name} gagne !`}</h2>
          <ScoreBoard teams={game.teams} scores={game.scores} round={game.round} />
          <button
            className="btn btn-primary btn-big"
            onClick={() => setGame(Engine.createMatch({ teams: init.teams, deck: init.deck }))}
          >
            🔁 Rejouer avec les mêmes mots
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/')}>🏠 Accueil</button>
        </div>
      </div>
    );
  }

  const activeTeam = game.teams[game.turnTeamIndex];
  return (
    <div className="container">
      <ScoreBoard teams={game.teams} scores={game.scores} activeTeamId={activeTeam.id} round={game.round} />
      <div className="turn-banner">
        📱 Passe le téléphone à <strong>{activeTeam.name}</strong> !
      </div>
      <Timer endsAt={game.turnEndsAt} duration={40} />
      <div className="word-card">
        <span className="word">{game.currentWord}</span>
      </div>
      <div className="actions">
        <button className="btn btn-success btn-big" onClick={() => setGame((g) => Engine.markFound(g, Date.now()))}>
          ✅ Trouvé !
        </button>
        <button className="btn btn-ghost" onClick={() => setGame((g) => Engine.passWord(g, Date.now()))}>
          ⏭️ Passer (le mot reviendra plus tard)
        </button>
      </div>
      <p className="muted" style={{ textAlign: 'center' }}>
        {Engine.wordsLeft(game)} mot(s) restant(s) cette manche
      </p>
    </div>
  );
}
