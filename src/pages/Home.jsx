import { Link } from 'react-router-dom';
import { firebaseEnabled } from '../firebase.js';
import { getCustomWords } from '../data/customWords.js';

export default function Home() {
  const customCount = getCustomWords().length;
  return (
    <div className="container center-screen">
      <div className="logo">⏱️</div>
      <h1>Time's Up <span>Party</span></h1>
      <p className="tagline">3 manches · 40 secondes par tour · fous rires garantis</p>
      <div className="menu">
        <Link className="btn btn-primary btn-big" to="/local">
          🎮 Partie locale
          <small>Un seul téléphone, tout le monde autour</small>
        </Link>
        <Link className="btn btn-secondary btn-big" to="/online">
          🌐 Partie en ligne
          <small>Chacun sur son téléphone, salon privé par code{!firebaseEnabled && <em> — à configurer (.env.local)</em>}</small>
        </Link>
        <Link className="btn btn-ghost btn-big" to="/mots">
          ✏️ Mes mots perso
          <small>{customCount} mot{customCount > 1 ? 's' : ''} enregistré{customCount > 1 ? 's' : ''}</small>
        </Link>
      </div>
      <details className="rules">
        <summary>📖 Règles du jeu</summary>
        <ol>
          <li><strong>Manche 1</strong> 🗣️ : décris le mot librement.</li>
          <li><strong>Manche 2</strong> 1️⃣ : un seul mot pour le décrire.</li>
          <li><strong>Manche 3</strong> 🤫 : mime uniquement, sans parler.</li>
          <li>40 secondes par tour. L'équipe qui fait deviner marque un point par mot trouvé. Le mot non deviné à la fin du chrono passe à l'autre équipe.</li>
          <li>Les mêmes mots reviennent à chaque manche. L'équipe avec le plus de points après la manche 3 gagne !</li>
        </ol>
      </details>
    </div>
  );
}
