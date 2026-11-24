import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { WORD_BANK } from '../data/words.js';
import { getCustomWords } from '../data/customWords.js';
import { buildDeck } from '../game/engine.js';

const DECK_SIZES = [
  { value: 20, label: '20 mots' },
  { value: 30, label: '30 mots' },
  { value: 40, label: '40 mots' },
  { value: 50, label: '50 mots' },
  { value: 0, label: 'Tous les mots' },
];

export default function LocalSetup() {
  const navigate = useNavigate();
  const [teamNames, setTeamNames] = useState(['Les Foudres', 'Les Légendes']);
  const [players, setPlayers] = useState([
    { name: '', team: 0 },
    { name: '', team: 1 },
  ]);
  const [newName, setNewName] = useState('');
  const [categories, setCategories] = useState(() => Object.fromEntries(WORD_BANK.map((c) => [c.id, true])));
  const [useCustom, setUseCustom] = useState(true);
  const [deckSize, setDeckSize] = useState(40);

  const customWords = useMemo(() => getCustomWords(), []);

  const deck = useMemo(
    () => buildDeck({
      categoryIds: WORD_BANK.filter((c) => categories[c.id]).map((c) => c.id),
      customWords: useCustom ? customWords : [],
      size: deckSize,
    }),
    [categories, useCustom, customWords, deckSize]
  );

  const addPlayer = () => {
    const name = newName.trim();
    if (!name) return;
    setPlayers((ps) => [...ps, { name, team: ps.length % 2 }]);
    setNewName('');
  };

  const updatePlayer = (i, patch) =>
    setPlayers((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const removePlayer = (i) => setPlayers((ps) => ps.filter((_, j) => j !== i));

  const teamCounts = [0, 1].map((t) => players.filter((p) => p.name.trim() && p.team === t).length);
  const canStart = teamCounts.every((c) => c >= 1) && deck.length > 0;

  const start = () => {
    const teams = [0, 1].map((t) => ({
      id: `team-${t}`,
      name: teamNames[t].trim() || `Équipe ${t + 1}`,
      players: players.filter((p) => p.name.trim() && p.team === t).map((p) => p.name.trim()),
    }));
    navigate('/local/play', { state: { teams, deck } });
  };

  return (
    <div className="container">
      <Link className="back-link" to="/">← Accueil</Link>
      <h2>🎮 Nouvelle partie locale</h2>

      <div className="card">
        <h3>Équipes</h3>
        {[0, 1].map((t) => (
          <input
            key={t}
            type="text"
            placeholder={`Nom de l'équipe ${t + 1}`}
            value={teamNames[t]}
            onChange={(e) => setTeamNames((n) => (t === 0 ? [e.target.value, n[1]] : [n[0], e.target.value]))}
          />
        ))}
      </div>

      <div className="card">
        <h3>Joueurs</h3>
        {players.map((p, i) => (
          <div className="player-row" key={i}>
            <input
              type="text"
              className="grow"
              placeholder={`Joueur ${i + 1}`}
              value={p.name}
              onChange={(e) => updatePlayer(i, { name: e.target.value })}
            />
            <div className="team-toggle">
              {[0, 1].map((t) => (
                <button
                  key={t}
                  className={p.team === t ? 'on' : ''}
                  onClick={() => updatePlayer(i, { team: t })}
                  title={`Équipe ${t + 1}`}
                >
                  {t + 1}
                </button>
              ))}
            </div>
            <button className="icon-btn" onClick={() => removePlayer(i)} title="Retirer">✕</button>
          </div>
        ))}
        <div className="row">
          <input
            type="text"
            className="grow"
            placeholder="Ajouter un joueur…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
          />
          <button className="btn btn-ghost" onClick={addPlayer}>＋</button>
        </div>
        <p className="muted">
          Équipe 1 : {teamCounts[0]} joueur(s) · Équipe 2 : {teamCounts[1]} joueur(s) — au moins 1 par équipe.
        </p>
      </div>

      <div className="card">
        <h3>Mots de la partie ({deck.length} sélectionnés)</h3>
        {WORD_BANK.map((c) => (
          <label className="check" key={c.id}>
            <input
              type="checkbox"
              checked={categories[c.id]}
              onChange={(e) => setCategories((cs) => ({ ...cs, [c.id]: e.target.checked }))}
            />
            {c.emoji} {c.label} ({c.words.length} mots)
          </label>
        ))}
        <label className="check">
          <input type="checkbox" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)} />
          ✏️ Mes mots perso ({customWords.length})
        </label>
        <select value={deckSize} onChange={(e) => setDeckSize(Number(e.target.value))}>
          {DECK_SIZES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <button className="btn btn-primary btn-big" disabled={!canStart} onClick={start}>
        ▶ Lancer la partie
      </button>
      {!canStart && <p className="muted">Ajoute au moins un joueur par équipe et une source de mots.</p>}
    </div>
  );
}
