import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getCustomWords, addCustomWord, removeCustomWord, saveCustomWords } from '../data/customWords.js';

export default function WordsManager() {
  const [words, setWords] = useState(() => getCustomWords());
  const [input, setInput] = useState('');
  const [bulk, setBulk] = useState('');

  const add = () => {
    if (!input.trim()) return;
    setWords(addCustomWord(input));
    setInput('');
  };

  const addBulk = () => {
    const list = bulk.split(/[\n,;]+/).map((w) => w.trim()).filter(Boolean);
    let current = getCustomWords();
    for (const w of list) {
      if (!current.some((x) => x.toLowerCase() === w.toLowerCase())) current.push(w);
    }
    saveCustomWords(current);
    setWords(current);
    setBulk('');
  };

  return (
    <div className="container">
      <Link className="back-link" to="/">← Accueil</Link>
      <h2>✏️ Mes mots perso</h2>
      <p className="muted">
        Ces mots sont enregistrés sur cet appareil et peuvent être ajoutés à n'importe quelle partie.
      </p>

      <div className="card">
        <h3>Ajouter un mot</h3>
        <div className="row">
          <input
            type="text"
            className="grow"
            placeholder="Ex : La daronne, le prof de maths…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button className="btn btn-primary" onClick={add}>＋</button>
        </div>
        <h3>Importer une liste</h3>
        <textarea
          placeholder={'Un mot par ligne (ou séparés par des virgules)\nEx :\nLa daronne\nLe prof de maths\nLa coloc du 3e étage'}
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
        />
        <button className="btn btn-ghost" onClick={addBulk} disabled={!bulk.trim()}>Importer la liste</button>
      </div>

      <div className="card">
        <h3>{words.length} mot{words.length > 1 ? 's' : ''}</h3>
        <div className="word-chips">
          {words.map((w) => (
            <span className="chip" key={w}>
              {w}
              <button onClick={() => setWords(removeCustomWord(w))} title="Supprimer">✕</button>
            </span>
          ))}
          {words.length === 0 && <p className="muted">Aucun mot perso pour l'instant.</p>}
        </div>
        {words.length > 0 && (
          <button className="btn btn-danger" onClick={() => { saveCustomWords([]); setWords([]); }}>
            Tout effacer
          </button>
        )}
      </div>
    </div>
  );
}
