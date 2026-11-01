import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import type { AppStoredState } from './storage';
import type { Player } from '../types/auction';
import { careerToAuctionStats, findJcplPlayer, getJcplIndex } from './jcplStats';
import bundledJcpl4 from '../data/jcpl4Registrations.json';

const firebaseConfig = {
  apiKey: 'AIzaSyBdAGuFc3XcuBaJAu5YuI51B1q3q_cR4R4',
  authDomain: 'predictor-jcpl.firebaseapp.com',
  projectId: 'predictor-jcpl',
  storageBucket: 'predictor-jcpl.firebasestorage.app',
  messagingSenderId: '318152754285',
  appId: '1:318152754285:web:c2cecf045210c3c8422b64',
};

const STATE_DOC = ['auctionLive', 'current'] as const;
const STATS_DOC = ['playerStats', 'catalog'] as const;
const SCOREBOARD_DOC = ['config', 'liveScoreboard'] as const;

let db: Firestore | null = null;
let authReady: Promise<void> | null = null;

function initFirebase() {
  if (typeof window === 'undefined') return;
  if (db) return;
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  db = getFirestore(app);
  const auth = getAuth(app);
  authReady = new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub();
        resolve();
        return;
      }
      signInAnonymously(auth)
        .catch(() => {})
        .finally(() => {
          unsub();
          resolve();
        });
    });
  });
}

function parseAuctionState(raw: unknown): AppStoredState | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw) as AppStoredState;
    if (parsed?.teams && parsed?.players) return parsed;
  } catch {}
  return null;
}

export async function loadAuctionStateFromFirestore(): Promise<AppStoredState | null> {
  try {
    initFirebase();
    if (!db) return null;
    await authReady;
    const snap = await getDoc(doc(db, STATE_DOC[0], STATE_DOC[1]));
    return parseAuctionState(snap.data()?.json);
  } catch {
    return null;
  }
}

export async function pushAuctionStateToFirestore(state: AppStoredState) {
  try {
    initFirebase();
    if (!db) return;
    await authReady;
    await setDoc(doc(db, STATE_DOC[0], STATE_DOC[1]), {
      json: JSON.stringify(state),
      updatedAt: Date.now(),
      playerCount: state.players?.length || 0,
      teamCount: state.teams?.length || 0,
    });
  } catch {
    // Permission or offline errors are ignored; local/Vite sync still applies.
  }
}

export function subscribeAuctionStateFromFirestore(
  onState: (state: AppStoredState) => void,
): () => void {
  try {
    initFirebase();
    if (!db) return () => {};
    return onSnapshot(doc(db, STATE_DOC[0], STATE_DOC[1]), (snap: any) => {
      const parsed = parseAuctionState(snap.data()?.json);
      if (parsed) onState(parsed);
    });
  } catch {
    return () => {};
  }
}

function excelRosterPlayers() {
  const rows = (bundledJcpl4 as { players?: Array<{ name?: string; skill?: string; cricheroesUrl?: string }> }).players || [];
  return rows.map((row, index) => {
    const name = String(row.name || '').trim();
    const hit = findJcplPlayer(name, row.cricheroesUrl);
    return {
      id: `jcpl4-${index}`,
      name,
      jcplPlayerId: hit?.playerId || null,
      jcplSeasons: hit?.seasons.map((s) => `${s.seasonLabel} ${s.category}`) || ['JCPL 4'],
      stats: hit ? careerToAuctionStats(hit) : {
        matches: 0,
        runs: 0,
        average: 0,
        strikeRate: 0,
        highestScore: 0,
        fifties: 0,
        hundreds: 0,
        wickets: 0,
        bowlingAverage: 0,
        economyRate: 0,
        bestBowling: '',
        catches: 0,
        stumpings: 0,
      },
      teamId: null,
      grade: 'C',
      role: row.skill || '',
      soldPrice: null,
      status: 'upcoming',
    };
  });
}

export async function pushPlayerStatsCatalogToFirestore(players: Player[] = []) {
  try {
    initFirebase();
    if (!db) return;
    await authReady;
    const auctionPlayers = players.length
      ? players.map((p) => ({
        id: p.id,
        name: p.name,
        jcplPlayerId: p.jcplPlayerId || null,
        jcplSeasons: p.jcplSeasons || [],
        stats: p.stats,
        teamId: p.teamId || null,
        grade: p.grade,
        role: p.role,
        soldPrice: p.soldPrice || null,
        status: p.status,
      }))
      : excelRosterPlayers();
    await setDoc(doc(db, STATS_DOC[0], STATS_DOC[1]), {
      jcpl: getJcplIndex(),
      auctionPlayers,
      updatedAt: Date.now(),
    });
  } catch {}
}

export async function pushLiveScoreboardConfig(config: Record<string, unknown>) {
  try {
    initFirebase();
    if (!db) return;
    await authReady;
    await setDoc(doc(db, SCOREBOARD_DOC[0], SCOREBOARD_DOC[1]), {
      ...config,
      updatedAt: Date.now(),
    });
  } catch {}
}
