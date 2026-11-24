import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { firebaseEnabled } from '../firebase.js';
import * as Rooms from '../online/rooms.js';
import { WORD_BANK } from '../data/words.js';
import { getCustomWords } from '../data/customWords.js';

const DECK_SIZES = [
  { value: 20, label: '20 mots' },
  { value: 30, label: '30 mots' },
  { value: 40, label: '40 mots' },
  { value: 50, label: '50 mots' },
  { value: 0, label: 'Tous les mots' },
];

export default function OnlineHome() {
  const navigate = useNavigate();
  const [name, setName] = useState(() => Rooms.getPlayerName());
  const [joinCode, setJoinCode] = useState('');
  const [teamNames, setTeamNames] = useState(['Équipe 1', 'Équipe 2']);
  const [categories, setCategories] = useState(() => Object.fromEntries(WORD_BANK.map((c) => [c.id, true])));
  const [useCustom, setUseCustom] = useState(true);
  const [deckSize, setDeckSize] = useState(40);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const customCount = useMemo(() => getCustomWords().length, []);

  const updateName = (v) => {
    setName(v);
    Rooms.setPlayerName(v);
  };

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      const code = await Rooms.createRoom({
        name,
        config: {
          deckSize,
          categoryIds: WORD_BANK.filter((c) => categories[c.id]).map((c) => c.id),
          useCustomWords: useCustom,
          customWords: useCustom ? getCustomWords() : [],
          teamNames,
        },
      });
      navigate(`/online/salon/${code}`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const join = async () => {
    setBusy(true);
    setError('');
    try {
      const code = await Rooms.joinRoom(joinCode, name);
      navigate(`/online/salon/${code}`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <Link className="back-link" to="/">← Accueil</Link>
      <h2>🌐 Partie en ligne</h2>

      {!firebaseEnabled && (
        <div className="alert">
          Le mode en ligne n'est pas encore configuré : crée un projet Firebase (gratuit), active Firestore,
          puis remplis le fichier <code>.env.local</code> (voir <code>.env.example</code> et le README).
          La partie locale, elle, fonctionne déjà sans configuration.
        </div>
      )}

      <div className="card">
        <h3>Ton pseudo</h3>
        <input
          type="text"
          placeholder="Ton pseudo…"
          value={name}
          onChange={(e) => updateName(e.target.value)}
          maxLength={24}
        />
      </div>

      <div className="card">
        <h3>Créer un salon</h3>
        <input
          type="text"
          placeholder="Nom équipe 1"
          value={teamNames[0]}
          onChange={(e) => setTeamNames([e.target.value, teamNames[1]])}
        />
        <input
          type="text"
          placeholder="Nom équipe 2"
          value={teamNames[1]}
          onChange={(e) => setTeamNames([teamNames[0], e.target.value])}
        />
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
          ✏️ Mes mots perso ({customCount})
        </label>
        <select value={deckSize} onChange={(e) => setDeckSize(Number(e.target.value))}>
          {DECK_SIZES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button className="btn btn-primary btn-big" onClick={create} disabled={busy || !firebaseEnabled}>
          {busy ? 'Création…' : '➕ Créer un salon'}
        </button>
      </div>

      <div className="divider">ou</div>

      <div className="card">
        <h3>Rejoindre un salon</h3>
        <div className="row">
          <input
            type="text"
            className="grow"
            placeholder="CODE (ex: K7X2)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            style={{ textTransform: 'uppercase', letterSpacing: '.2em', fontWeight: 700 }}
          />
          <button className="btn btn-secondary" onClick={join} disabled={busy || !firebaseEnabled || joinCode.trim().length < 4}>
            Rejoindre ▶
          </button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
    </div>
  );
}
