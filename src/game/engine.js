import { WORD_BANK } from '../data/words.js';

export const TURN_DURATION = 40;

export const ROUNDS = [
  { n: 1, title: 'Manche 1', emoji: '🗣️', rule: 'Décris le mot librement : autant de mots et de phrases que tu veux.' },
  { n: 2, title: 'Manche 2', emoji: '1️⃣', rule: 'Un seul mot pour faire deviner.' },
  { n: 3, title: 'Manche 3', emoji: '🤫', rule: 'Mime uniquement : aucun mot, aucun son.' },
];

export function shuffle(input, rng = Math.random) {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildDeck({ categoryIds = [], customWords = [], size = 0, rng = Math.random } = {}) {
  const picked = categoryIds.flatMap((id) => WORD_BANK.find((c) => c.id === id)?.words ?? []);
  const seen = new Set();
  const unique = [];
  for (const raw of [...picked, ...customWords]) {
    const w = String(raw).trim().replace(/\s+/g, ' ');
    if (!w) continue;
    const key = w.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(w);
  }
  const deck = shuffle(unique, rng);
  return size > 0 ? deck.slice(0, size) : deck;
}

export function createMatch({ teams, deck, rng = Math.random }) {
  return {
    teams,
    deckAll: [...deck],
    round: 1,
    phase: 'roundIntro',
    queue: shuffle(deck, rng),
    currentWord: null,
    turnTeamIndex: 0,
    scores: Object.fromEntries(teams.map((t) => [t.id, 0])),
    turnEndsAt: null,
    history: [],
  };
}

function drawWord(state) {
  if (state.queue.length === 0) return { ...state, currentWord: null };
  const [word, ...rest] = state.queue;
  return { ...state, queue: rest, currentWord: word };
}

function endRound(state) {
  if (state.round >= ROUNDS.length) {
    return { ...state, phase: 'gameEnd', currentWord: null, turnEndsAt: null };
  }
  return { ...state, phase: 'roundEnd', currentWord: null, turnEndsAt: null };
}

export function startTurn(state, now, turnDuration = TURN_DURATION) {
  const s = state.currentWord ? state : drawWord(state);
  if (!s.currentWord) return endRound(s);
  return { ...s, phase: 'turn', turnEndsAt: now + turnDuration * 1000 };
}

export function beginTurn(state, now, turnDuration = TURN_DURATION) {
  if (state.phase !== 'roundIntro') return state;
  return startTurn(state, now, turnDuration);
}

export function markFound(state, now) {
  if (state.phase !== 'turn' || now > state.turnEndsAt) return state;
  const team = state.teams[state.turnTeamIndex];
  const scores = { ...state.scores, [team.id]: state.scores[team.id] + 1 };
  const s = {
    ...state,
    scores,
    currentWord: null,
    history: [...state.history, { type: 'found', word: state.currentWord, teamId: team.id, round: state.round }],
  };
  if (s.queue.length === 0) return endRound(s);
  return drawWord(s);
}

export function passWord(state, now) {
  if (state.phase !== 'turn' || now > state.turnEndsAt) return state;
  const team = state.teams[state.turnTeamIndex];
  const s = {
    ...state,
    currentWord: null,
    queue: [...state.queue, state.currentWord],
    history: [...state.history, { type: 'pass', word: state.currentWord, teamId: team.id, round: state.round }],
  };
  return drawWord(s);
}

export function handleTimeout(state, now) {
  if (state.phase !== 'turn' || now <= state.turnEndsAt) return state;
  const prevTeam = state.teams[state.turnTeamIndex];
  const s = {
    ...state,
    turnTeamIndex: (state.turnTeamIndex + 1) % state.teams.length,
    history: [...state.history, { type: 'timeout', teamId: prevTeam.id, round: state.round }],
  };
  return startTurn(s, now);
}

export function nextRound(state, rng = Math.random) {
  if (state.phase !== 'roundEnd') return state;
  return {
    ...state,
    round: state.round + 1,
    phase: 'roundIntro',
    queue: shuffle(state.deckAll, rng),
    currentWord: null,
    turnTeamIndex: 0,
    turnEndsAt: null,
  };
}

export function remainingTime(state, now) {
  if (state.phase !== 'turn' || !state.turnEndsAt) return 0;
  return Math.max(0, state.turnEndsAt - now);
}

export function wordsLeft(state) {
  return state.queue.length + (state.currentWord ? 1 : 0);
}

export function currentRoundInfo(state) {
  return ROUNDS[state.round - 1] ?? ROUNDS[ROUNDS.length - 1];
}

export function winners(state) {
  const scores = state.teams.map((t) => state.scores[t.id] ?? 0);
  const max = Math.max(...scores);
  return state.teams.filter((t, i) => scores[i] === max);
}
