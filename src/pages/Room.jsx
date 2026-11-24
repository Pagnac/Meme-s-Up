import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { firebaseEnabled } from '../firebase.js';
import * as Rooms from '../online/rooms.js';
import * as Engine from '../game/engine.js';
import Timer from '../components/Timer.jsx';
import ScoreBoard from '../components/ScoreBoard.jsx';

export default function Room() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(undefined);
  const meId = Rooms.getPlayerId();

  useEffect(() => {
    if (!firebaseEnabled) return undefined;
    return Rooms.subscribeRoom(code, setRoom);
  }, [code]);

  if (!firebaseEnabled) {
    return (
      <div className="container center-screen">
        <div className="alert">Mode en ligne non configuré (voir .env.local / README).</div>
        <Link className="btn btn-primary" to="/online">Retour</Link>
      </div>
    );
  }
  if (room === undefined) {
    return <div className="container center-screen"><p className="muted">Connexion au salon…</p></div>;
  }
  if (room === null) {
    return (
      <div className="container center-screen">
        <div className="alert">Salon introuvable. Vérifie le code.</div>
        <Link className="btn btn-primary" to="/online">Retour</Link>
      </div>
    );
  }

  const me = (room.players ?? []).find((p) => p.id === meId);
  if (room.status === 'lobby') return <Lobby room={room} me={me} code={code} />;
  if (room.status === 'playing' && room.game) return <OnlineGame room={room} me={me} code={code} />;
  if (room.status === 'finished' && room.game) return <Finished room={room} me={me} code={code} navigate={navigate} />;
  return <div className="container center-screen"><p className="muted">État du salon inconnu.</p></div>;
}

function Lobby({ room, me, code }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const isHost = room.hostId === me?.id;
  const teamNames = room.config?.teamNames ?? ['Équipe 1', 'Équipe 2'];
  const playersByTeam = [0, 1].map((t) => (room.players ?? []).filter((p) => p.team === t));
  const canStart = isHost && playersByTeam.every((tp) => tp.length >= 1);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* presse-papiers indisponible */ }
  };

  const start = async () => {
    setBusy(true);
    setError('');
    try {
      const deck = Engine.buildDeck({
        categoryIds: room.config?.categoryIds ?? [],
        customWords: room.config?.useCustomWords ? (room.config?.customWords ?? []) : [],
        size: room.config?.deckSize ?? 40,
      });
      if (deck.length === 0) throw new Error('Aucun mot sélectionné dans la config du salon.');
      await Rooms.startGame(code, deck);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const leave = async () => {
    await Rooms.leaveRoom(code, me.id);
    navigate('/online');
  };

  return (
    <div className="container">
      <div className="row">
        <Link className="back-link" to="/online">← Quitter</Link>
        <span className="grow" />
        <button className="btn btn-ghost" onClick={leave} style={{ padding: '8px 14px' }}>🚪 Quitter le salon</button>
      </div>
      <h2>Salon en ligne 🌐</h2>
      <p className="muted" style={{ textAlign: 'center' }}>Donne ce code à tes amis :</p>
      <div className="code-display" onClick={copyCode}>{code}</div>
      <button className="btn btn-ghost" onClick={copyCode}>{copied ? '✅ Copié !' : '📋 Copier le code'}</button>

      <div className="card">
        <h3>Équipes & joueurs ({(room.players ?? []).length})</h3>
        {[0, 1].map((t) => (
          <div key={t}>
            <strong>{teamNames[t] || `Équipe ${t + 1}`}</strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
              {playersByTeam[t].map((p) => (
                <div className="player-row" key={p.id}>
                  <span className="pname">{p.name}{p.id === me?.id ? ' (toi)' : ''}</span>
                  <div className="team-toggle">
                    {[0, 1].map((other) => (
                      <button
                        key={other}
                        className={p.team === other ? 'on' : ''}
                        disabled={p.id !== me?.id}
                        onClick={() => Rooms.setPlayerTeam(code, p.id, other)}
                        title={p.id === me?.id ? `Rejoindre équipe ${other + 1}` : ''}
                      >
                        {other + 1}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {playersByTeam[t].length === 0 && <p className="muted">Personne pour l'instant…</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Configuration</h3>
        <p className="muted">
          {(room.config?.categoryIds ?? []).length} catégorie(s) · {room.config?.useCustomWords ? 'mots perso inclus · ' : ''}
          {room.config?.deckSize ? `${room.config.deckSize} mots` : 'tous les mots'} · 40 s par tour
        </p>
        {isHost ? (
          <button className="btn btn-primary btn-big" onClick={start} disabled={!canStart || busy}>
            {busy ? 'Lancement…' : '▶ Lancer la partie'}
          </button>
        ) : (
          <div className="notice">En attente de l'hôte ({(room.players ?? []).find((p) => p.id === room.hostId)?.name ?? '…'}) pour lancer la partie.</div>
        )}
        {!canStart && isHost && <p className="muted">Chaque équipe doit avoir au moins 1 joueur.</p>}
      </div>
      {error && <div className="alert">{error}</div>}
    </div>
  );
}

function OnlineGame({ room, me, code }) {
  const game = room.game;
  const [busy, setBusy] = useState(false);
  const lastTimeout = useRef(null);

  useEffect(() => {
    const id = setInterval(() => {
      if (game.phase === 'turn' && game.turnEndsAt && Date.now() >= game.turnEndsAt) {
        if (lastTimeout.current !== game.turnEndsAt) {
          lastTimeout.current = game.turnEndsAt;
          Rooms.applyGameAction(code, 'timeout').catch(() => {});
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, [code, game.phase, game.turnEndsAt]);

  const act = async (type) => {
    setBusy(true);
    try {
      await Rooms.applyGameAction(code, type);
    } catch { /* une autre client a gagné la transaction */ }
    finally {
      setBusy(false);
    }
  };

  if (game.phase === 'roundIntro') {
    const info = Engine.currentRoundInfo(game);
    return (
      <div className="container center-screen">
        <div className="card round-intro">
          <div className="round-emoji">{info.emoji}</div>
          <h2>{info.title}</h2>
          <p className="rule">{info.rule}</p>
          <p className="muted">{game.deckAll.length} mots en jeu · chrono de 40 s</p>
          <button className="btn btn-primary btn-big" onClick={() => act('beginTurn')} disabled={busy}>
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
          <button className="btn btn-primary btn-big" onClick={() => act('nextRound')} disabled={busy}>
            Manche suivante ▶
          </button>
        </div>
      </div>
    );
  }

  const activeTeam = game.teams[game.turnTeamIndex];
  const myTurn = me && me.team === game.turnTeamIndex;
  return (
    <div className="container">
      <ScoreBoard teams={game.teams} scores={game.scores} activeTeamId={activeTeam.id} round={game.round} />
      <div className="turn-banner">
        {myTurn ? <>À toi, <strong>{activeTeam.name}</strong> !</> : <>À l'équipe <strong>{activeTeam.name}</strong> de jouer…</>}
      </div>
      <Timer endsAt={game.turnEndsAt} duration={room.config?.turnDuration ?? 40} />
      <div className="word-card">
        <span className="word">{game.currentWord}</span>
      </div>
      {myTurn ? (
        <div className="actions">
          <button className="btn btn-success btn-big" onClick={() => act('found')} disabled={busy}>
            ✅ Trouvé !
          </button>
          <button className="btn btn-ghost" onClick={() => act('pass')} disabled={busy}>
            ⏭️ Passer (le mot reviendra plus tard)
          </button>
        </div>
      ) : (
        <p className="muted" style={{ textAlign: 'center' }}>Regarde bien, c'est à l'autre équipe ! 👀</p>
      )}
      <p className="muted" style={{ textAlign: 'center' }}>
        {Engine.wordsLeft(game)} mot(s) restant(s) cette manche
      </p>
    </div>
  );
}

function Finished({ room, me, code, navigate }) {
  const game = room.game;
  const champs = Engine.winners(game);
  const tie = champs.length > 1;
  const isHost = room.hostId === me?.id;
  const [busy, setBusy] = useState(false);
  return (
    <div className="container center-screen">
      <div className="card">
        <div className="podium">{tie ? '🤝' : '🏆'}</div>
        <h2>{tie ? 'Égalité parfaite !' : `${champs[0]?.name} gagne !`}</h2>
        <ScoreBoard teams={game.teams} scores={game.scores} round={game.round} />
        {isHost && (
          <button
            className="btn btn-primary btn-big"
            disabled={busy}
            onClick={async () => { setBusy(true); try { await Rooms.backToLobby(code); } finally { setBusy(false); } }}
          >
            🔁 Retour au salon (rejouer)
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => navigate('/')}>🏠 Accueil</button>
      </div>
    </div>
  );
}
