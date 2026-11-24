# ⏱️ Time's Up Party

Jeu **Time's Up** entre amis en **PWA** (React + Vite), jouable **hors ligne** et installable sur téléphone.

## Fonctionnalités

- **Partie locale (hot-seat)** : un téléphone passe de main en main.
- **Partie en ligne** : salon privé par code à 4 lettres, chacun sur son téléphone, synchronisé en temps réel via **Firebase Firestore**.
- **2 équipes**, noms d'équipe personnalisables.
- **3 manches classiques, 40 s par tour** :
  1. 🗣️ décrire librement le mot
  2. 1️⃣ un seul mot
  3. 🤫 mimer sans parler
- **Chrono** affiché en anneau, le mot non deviné passe à l'autre équipe à la fin du temps, bouton « Passer » (le mot revient plus tard).
- **Scores en direct**, écrans de fin de manche et **podium final**.
- **Listes de mots françaises orientées Gen Z / étudiant** (~100 mots × 4 catégories : mèmes & internet 😂, vie étudiante 🎓, pop culture 🎬, sport & quotidien ⚽) **+ tes propres mots** (stockés localement, import par liste).
- Taille du paquet de mots réglable (20/30/40/50/tous).

## Installation

```bash
npm install
cp .env.example .env.local   # puis remplis avec ta config Firebase (voir ci-dessous)
npm run dev                   # http://localhost:5173
npm test                      # tests du moteur de jeu
npm run build                 # build de production dans dist/
npm run preview               # sert le build localement
```

## Configuration du mode en ligne (Firebase)

1. Crée un projet gratuit sur [console.firebase.google.com](https://console.firebase.google.com) (plan Spark).
2. Ajoute une **application Web** et copie les clés dans `.env.local` :
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
3. Active **Firestore Database** puis déploie les règles :
   ```bash
   npx firebase-tools login
   npx firebase-tools init firestore   # choisis ton projet
   npx firebase-tools deploy --only firestore:rules
   ```
   (les règles du fichier `firestore.rules` rendent les salons lisibles/éditables par code — suffisant entre amis ; pour empêcher totalement la triche sur les mots, il faudrait déplacer la logique en Cloud Functions).

Sans `.env.local`, l'app fonctionne normalement en **mode local** ; le mode en ligne affiche une notice.

## Déploiement

```bash
npm run build
npx firebase-tools deploy --only hosting   # ou Vercel / Netlify (dossier dist/)
```
Puis « Ajouter à l'écran d'accueil » sur téléphone : l'app s'installe comme une vraie app (PWA, fonctionne hors ligne grâce au service worker).

## Structure

```
src/
  game/engine.js        moteur de jeu pur (pioche, manches, tours, chrono, scores) — testé unitairement
  data/words.js         banque de mots FR (4 catégories)
  data/customWords.js   mots perso en localStorage
  online/rooms.js       salons Firestore (création, code, lobby, transitions de jeu en transactions)
  pages/                Home, LocalSetup, LocalGame, OnlineHome, Room (lobby + jeu + fin), WordsManager
  components/           Timer (anneau), ScoreBoard
```

## Règles implémentées

- 3 manches sur le même paquet de mots, remélangé à chaque manche.
- 40 s par tour ; tant que l'équipe trouve, elle continue avec le même chrono.
- À la fin du chrono, le mot en cours est conservé et passe à l'équipe suivante.
- « Passer » renvoie le mot en fin de pioche.
- La manche se termine quand tous les mots sont devinés ; la partie après la manche 3.
