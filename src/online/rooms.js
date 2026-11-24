import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase.js';
import * as Engine from '../game/engine.js';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateCode(length = 4) {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

export function getPlayerId() {
  let id = localStorage.getItem('tup-player-id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('tup-player-id', id);
  }
  return id;
}

export function getPlayerName() {
  return localStorage.getItem('tup-player-name') || '';
}

export function setPlayerName(name) {
  localStorage.setItem('tup-player-name', name);
}

function roomRef(code) {
  return doc(db, 'rooms', String(code).toUpperCase().trim());
}

export async function createRoom({ name, config }) {
  const playerId = getPlayerId();
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();
    const ref = roomRef(code);
    const snap = await getDoc(ref);
    if (snap.exists()) continue;
    await setDoc(ref, {
      code,
      createdAt: serverTimestamp(),
      hostId: playerId,
      status: 'lobby',
      config: {
        turnDuration: 40,
        deckSize: config.deckSize ?? 40,
        categoryIds: config.categoryIds ?? [],
        useCustomWords: Boolean(config.useCustomWords),
        customWords: config.customWords ?? [],
        teamNames: config.teamNames ?? ['Équipe 1', 'Équipe 2'],
      },
      players: [{ id: playerId, name: name.trim() || 'Joueur 1', team: 0, joinedAt: Date.now() }],
      game: null,
    });
    return code;
  }
  throw new Error('Impossible de créer un salon, réessaie.');
}

export async function joinRoom(code, name) {
  const playerId = getPlayerId();
  const clean = String(code).toUpperCase().trim();
  const ref = roomRef(clean);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Code invalide : aucun salon trouvé.');
    const room = snap.data();
    if (room.status !== 'lobby') throw new Error('Cette partie a déjà commencé.');
    const players = room.players ?? [];
    if (players.some((p) => p.id === playerId)) return;
    tx.update(ref, {
      players: [...players, { id: playerId, name: name.trim() || 'Joueur', team: 0, joinedAt: Date.now() }],
    });
  });
  return clean;
}

export function subscribeRoom(code, cb) {
  return onSnapshot(roomRef(code), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export async function setPlayerTeam(code, playerId, team) {
  await runTransaction(db, async (tx) => {
    const ref = roomRef(code);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const players = (snap.data().players ?? []).map((p) => (p.id === playerId ? { ...p, team } : p));
    tx.update(ref, { players });
  });
}

export async function leaveRoom(code, playerId) {
  await runTransaction(db, async (tx) => {
    const ref = roomRef(code);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data();
    const players = (room.players ?? []).filter((p) => p.id !== playerId);
    tx.update(ref, {
      players,
      hostId: room.hostId === playerId ? (players[0]?.id ?? room.hostId) : room.hostId,
    });
  });
}

export async function startGame(code, deck) {
  const playerId = getPlayerId();
  await runTransaction(db, async (tx) => {
    const ref = roomRef(code);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Salon introuvable.');
    const room = snap.data();
    if (room.hostId !== playerId) throw new Error('Seul l’hôte peut lancer la partie.');
    if (room.status !== 'lobby') return;
    const teamNames = room.config?.teamNames ?? ['Équipe 1', 'Équipe 2'];
    const teams = teamNames.map((name, i) => ({
      id: `team-${i}`,
      name,
      players: (room.players ?? []).filter((p) => p.team === i).map((p) => p.name),
    }));
    const game = Engine.createMatch({ teams, deck });
    tx.update(ref, { status: 'playing', game });
  });
}

export async function applyGameAction(code, type) {
  await runTransaction(db, async (tx) => {
    const ref = roomRef(code);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data();
    if (room.status !== 'playing' || !room.game) return;
    const now = Date.now();
    const duration = room.config?.turnDuration ?? 40;
    let game = room.game;
    if (type === 'beginTurn') game = Engine.beginTurn(game, now, duration);
    else if (type === 'found') game = Engine.markFound(game, now);
    else if (type === 'pass') game = Engine.passWord(game, now);
    else if (type === 'timeout') game = Engine.handleTimeout(game, now);
    else if (type === 'nextRound') game = Engine.nextRound(game);
    else return;
    tx.update(ref, { game, status: game.phase === 'gameEnd' ? 'finished' : room.status });
  });
}

export async function backToLobby(code) {
  const playerId = getPlayerId();
  await runTransaction(db, async (tx) => {
    const ref = roomRef(code);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data();
    if (room.hostId !== playerId) throw new Error('Seul l’hôte peut faire ça.');
    tx.update(ref, { status: 'lobby', game: null });
  });
}
