import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  getFirestore,
  onSnapshot,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import type { AppStoredState } from './storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBdAGuFc3XcuBaJAu5YuI51B1q3q_cR4R4',
  authDomain: 'predictor-jcpl.firebaseapp.com',
  projectId: 'predictor-jcpl',
  storageBucket: 'predictor-jcpl.firebasestorage.app',
  messagingSenderId: '318152754285',
  appId: '1:318152754285:web:c2cecf045210c3c8422b64',
};

const STATE_DOC = ['auctionLive', 'current'] as const;

let db: Firestore | null = null;
let authReady: Promise<void> | null = null;

function initFirebase() {
  if (typeof window === 'undefined') return;
  if (db) return;
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  db = getFirestore(app);
  const auth = getAuth(app);
  authReady = new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, () => {
      unsub();
      resolve();
    });
  });
}

export async function pushAuctionStateToFirestore(state: AppStoredState) {
  try {
    initFirebase();
    if (!db) return;
    await authReady;
    await setDoc(doc(db, STATE_DOC[0], STATE_DOC[1]), {
      json: JSON.stringify(state),
      updatedAt: Date.now(),
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
    return onSnapshot(doc(db, STATE_DOC[0], STATE_DOC[1]), (snap) => {
      const raw = snap.data()?.json;
      if (typeof raw !== 'string') return;
      try {
        const parsed = JSON.parse(raw) as AppStoredState;
        if (parsed?.teams && parsed?.players) onState(parsed);
      } catch {}
    });
  } catch {
    return () => {};
  }
}
