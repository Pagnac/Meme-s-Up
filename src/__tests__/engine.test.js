import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TURN_DURATION,
  ROUNDS,
  buildDeck,
  createMatch,
  beginTurn,
  markFound,
  passWord,
  handleTimeout,
  nextRound,
  remainingTime,
  wordsLeft,
  winners,
} from '../game/engine.js';
import { WORD_BANK } from '../data/words.js';

function lcg(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const TEAMS = [
  { id: 'team-0', name: 'Équipe 1', players: ['Alice', 'Bob'] },
  { id: 'team-1', name: 'Équipe 2', players: ['Chloé'] },
];

test('les listes de mots contiennent ~100 mots par catégorie', () => {
  for (const cat of WORD_BANK) {
    assert.ok(cat.words.length >= 95, `${cat.id} a ${cat.words.length} mots`);
    assert.equal(new Set(cat.words.map((w) => w.toLowerCase())).size, cat.words.length, `${cat.id} a des doublons`);
  }
});

test('buildDeck sélectionne catégories + mots perso, dédoublonne et tronque', () => {
  const deck = buildDeck({ categoryIds: ['memes'], customWords: ['Mon mot perso', 'un CRUSH'], size: 0, rng: lcg(1) });
  assert.equal(deck.length, 100 + 1);
  assert.ok(deck.includes('Mon mot perso'));
  assert.ok(!deck.includes('un CRUSH'));

  const small = buildDeck({ categoryIds: ['memes'], size: 10, rng: lcg(2) });
  assert.equal(small.length, 10);

  const empty = buildDeck({ categoryIds: [], customWords: [], size: 0, rng: lcg(3) });
  assert.equal(empty.length, 0);
});

test('début de manche : un mot est tiré et le chrono démarre à 40s', () => {
  const deck = buildDeck({ categoryIds: ['memes'], size: 20, rng: lcg(4) });
  let g = createMatch({ teams: TEAMS, deck, rng: lcg(5) });
  assert.equal(g.phase, 'roundIntro');
  const now = 1_000_000;
  g = beginTurn(g, now);
  assert.equal(g.phase, 'turn');
  assert.ok(g.currentWord);
  assert.equal(g.turnEndsAt, now + TURN_DURATION * 1000);
  assert.equal(wordsLeft(g), 20);
  assert.equal(remainingTime(g, now + 5000), 35000);
});

test('mot trouvé : point marqué, mot suivant tiré, même équipe, même chrono', () => {
  const deck = buildDeck({ categoryIds: ['memes'], size: 5, rng: lcg(6) });
  let g = createMatch({ teams: TEAMS, deck, rng: lcg(7) });
  const now = 1_000_000;
  g = beginTurn(g, now);
  const first = g.currentWord;
  g = markFound(g, now + 3000);
  assert.equal(g.scores['team-0'], 1);
  assert.notEqual(g.currentWord, first);
  assert.equal(g.turnTeamIndex, 0);
  assert.equal(g.turnEndsAt, now + TURN_DURATION * 1000);
  assert.equal(wordsLeft(g), 4);
});

test('mot trouvé après la fin du chrono : ignoré', () => {
  const deck = buildDeck({ categoryIds: ['memes'], size: 5, rng: lcg(8) });
  let g = createMatch({ teams: TEAMS, deck, rng: lcg(9) });
  const now = 1_000_000;
  g = beginTurn(g, now);
  const after = markFound(g, now + TURN_DURATION * 1000 + 1);
  assert.equal(after.scores['team-0'], 0);
  assert.equal(after.currentWord, g.currentWord);
});

test('passer : le mot retourne dans la pioche et un autre est tiré', () => {
  const deck = buildDeck({ categoryIds: ['memes'], size: 5, rng: lcg(10) });
  let g = createMatch({ teams: TEAMS, deck, rng: lcg(11) });
  const now = 1_000_000;
  g = beginTurn(g, now);
  const word = g.currentWord;
  g = passWord(g, now + 1000);
  assert.equal(g.scores['team-0'], 0);
  assert.notEqual(g.currentWord, word);
  assert.ok(g.queue.includes(word));
  assert.equal(wordsLeft(g), 5);
});

test('fin du chrono : le tour passe à l’autre équipe, le mot non deviné est conservé', () => {
  const deck = buildDeck({ categoryIds: ['memes'], size: 5, rng: lcg(12) });
  let g = createMatch({ teams: TEAMS, deck, rng: lcg(13) });
  const now = 1_000_000;
  g = beginTurn(g, now);
  const word = g.currentWord;
  const t0 = g.turnEndsAt;
  g = handleTimeout(g, t0 + 50);
  assert.equal(g.turnTeamIndex, 1);
  assert.equal(g.currentWord, word);
  assert.ok(g.turnEndsAt > t0);
  // un timeout avant la fin du chrono ne change rien
  const g2 = handleTimeout(g, g.turnEndsAt - 1);
  assert.equal(g2.turnTeamIndex, 1);
});

test('une manche se termine quand tous les mots sont devinés, puis manche suivante avec le deck complet', () => {
  const deck = ['alpha', 'beta'];
  let g = createMatch({ teams: TEAMS, deck, rng: lcg(14) });
  const now = 1_000_000;
  g = beginTurn(g, now);
  g = markFound(g, now + 1000);
  g = markFound(g, now + 2000);
  assert.equal(g.phase, 'roundEnd');
  assert.equal(g.scores['team-0'], 2);
  assert.equal(g.currentWord, null);

  g = nextRound(g, lcg(15));
  assert.equal(g.round, 2);
  assert.equal(g.phase, 'roundIntro');
  assert.equal(g.queue.length, 2);
  assert.equal(g.turnTeamIndex, 0);

  g = beginTurn(g, now + 5000);
  assert.equal(g.phase, 'turn');
  assert.ok(g.currentWord);
});

test('après la manche 3, la partie est terminée et le gagnant est calculé', () => {
  const deck = ['alpha', 'beta'];
  let g = createMatch({ teams: TEAMS, deck, rng: lcg(16) });
  let now = 1_000_000;
  for (let round = 1; round <= ROUNDS.length; round++) {
    assert.equal(g.phase, 'roundIntro');
    g = beginTurn(g, now);
    let guard = 0;
    while (g.phase === 'turn' && guard++ < 100) {
      if (g.turnTeamIndex === 0) g = markFound(g, now);
      else g = handleTimeout(g, g.turnEndsAt + 1);
    }
    now += 100_000;
    if (round < ROUNDS.length) g = nextRound(g, lcg(100 + round));
  }
  assert.equal(g.phase, 'gameEnd');
  assert.equal(g.scores['team-0'], 2 * ROUNDS.length);
  const champs = winners(g);
  assert.equal(champs.length, 1);
  assert.equal(champs[0].id, 'team-0');
});
