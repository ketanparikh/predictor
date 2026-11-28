import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
import { 
  Team, 
  Player, 
  PlayerGrade,
  PlayerStatus,
  AuctionTransaction, 
  AuctionRules, 
  TournamentInfo, 
  BidRecord, 
  GradeBasePrices,
  AuctionOrderingMode,
  GradeCategoryMaxBid,
  SaveLogEntry,
  SaveSnapshot
} from '../types/auction';
import { initialTeams, initialAuctionRules, initialTournamentInfo } from '../data/demoData';
import {
  loadStoredState,
  saveStoredState,
  clearAuctionStorage,
  AppStoredState,
  loadSaveLogs,
  appendSaveLog,
  loadSaveSnapshots,
  createAndStoreSnapshot,
  getLastSavedTimestamp,
  loadPlayerOverrides,
  savePlayerOverride,
  saveAllPlayerOverrides,
  applyPlayerOverrides,
  sanitizeAuctionState,
} from '../utils/storage';
import {
  loadAuctionStateFromFirestore,
  pushAuctionStateToFirestore,
  pushPlayerStatsCatalogToFirestore,
  subscribeAuctionStateFromFirestore,
} from '../utils/firebaseSync';
import { soundFx } from '../utils/audio';
import { triggerSoldConfetti } from '../utils/confetti';
import { ParsedPlayerRow } from '../utils/excelParser';
import { bundledJcpl4AsPlayers, mergeBundledCareerStats, parsedRowToPlayer, regradeAuctionPlayers, shouldReplaceWithMensRoster } from '../utils/jcpl4Registrations';
import { validatePurchase, calculateMaxAllowableBidForPlayer, getTeamGradeMetrics, TeamGradeMetrics, captainFixedCost } from '../utils/auctionValidation';
import { normalizeGrade, isGradeMatch, canonicalPlayerNameKey, deduplicatePlayers } from '../utils/gradeUtils';

export interface LastAuctionResult {
  type: 'sold' | 'unsold';
  player: Player;
  teamId: string | null;
  teamName?: string;
  soldPrice: number | null;
  transactionId?: string;
  bidHistory: BidRecord[];
  currentBid: number;
  currentBidderId: string | null;
}

interface AuctionContextType {
  teams: Team[];
  players: Player[];
  transactions: AuctionTransaction[];
  rules: AuctionRules;
  tournament: TournamentInfo;
  currentPlayer: Player | null;
  currentBid: number;
  currentBidder: Team | null;
  bidHistory: BidRecord[];
  
  // Timer state
  timerSeconds: number;
  isTimerRunning: boolean;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  setCustomTimerDuration: (seconds: number) => void;

  // Auction Order Modes & Queue
  auctionOrderMode: AuctionOrderingMode;
  setAuctionOrderMode: (mode: AuctionOrderingMode) => void;
  customAuctionOrderIds: string[];
  setCustomAuctionOrder: (playerIds: string[]) => void;
  getOrderedUpcomingPlayers: () => Player[];
  nextUpcomingQueuePlayer: Player | null;

  // Grade & Category Maximum Bidding Limits
  getGradeCategoryMaxBid: (player: Player) => number | null;

  // Captain Allocation
  allocateCaptainToTeam: (teamId: string, playerId: string, cost?: number) => { success: boolean; message: string };
  removeCaptainFromTeam: (teamId: string) => { success: boolean; message: string };
  applyCaptainCostToAllAllotted: (cost: number) => { success: boolean; count: number; message: string };

  // Vice-Captain Allocation
  allocateViceCaptainToTeam: (teamId: string, playerId: string, cost?: number) => { success: boolean; message: string };
  removeViceCaptainFromTeam: (teamId: string) => { success: boolean; message: string };
  applyViceCaptainCostToAllAllotted: (cost: number) => { success: boolean; count: number; message: string };

  // Grade Metrics & Validation
  getTeamGradeMetrics: (team: Team) => TeamGradeMetrics;
  validatePurchaseForTeam: (team: Team, player: Player, amount: number) => { isValid: boolean; error?: string };

  // Data Saving, Auto-Save & Save Logs
  saveLogs: SaveLogEntry[];
  saveSnapshots: SaveSnapshot[];
  lastSavedTimestamp: string;
  triggerManualSave: (description?: string) => { success: boolean; message: string };
  restoreFromSnapshot: (snapshotId: string) => { success: boolean; message: string };

  // Auction Actions
  startAuctionForPlayer: (playerId: string) => void;
  placeBid: (teamId: string, incrementOrAmount?: number, isAbsoluteAmount?: boolean) => { success: boolean; message?: string };
  undoLastBid: () => void;
  markPlayerSold: () => { success: boolean; message?: string };
  directSellPlayer: (teamId: string, amount: number, playerToSell?: Player) => { success: boolean; message?: string };
  directAddPlayerToTeam: (teamId: string, playerId: string, amount: number) => { success: boolean; message: string };
  markPlayerUnsold: () => void;
  skipOrNextPlayer: () => void;
  reAuctionPlayer: (playerId: string) => void;
  undoTransaction: (transactionId: string) => void;
  lastActionResult: LastAuctionResult | null;
  undoLastResult: () => { success: boolean; message: string };

  // Spending Optimization
  calculateMaxAllowableBid: (team: Team, player?: Player | null) => { maxBid: number; minReserveRequired: number; remainingSlotsNeeded: number; reason?: string };

  // Mock Auction
  isMockAuction: boolean;
  toggleMockAuction: (enable?: boolean) => void;
  resetMockAuction: () => void;

  // Player Database Management
  addPlayer: (playerData: Omit<Player, 'id' | 'status'>) => Player;
  editPlayer: (player: Player) => void;
  bulkEditPlayerGrades: (
    playerIds: string[],
    targetGrade: PlayerGrade,
    modifiedBy?: string
  ) => { success: boolean; modifiedCount: number; message: string; bulkBatchId: string };
  bulkUpdatePlayers: (updatedPlayers: Player[], description?: string) => void;
  deletePlayer: (playerId: string) => void;
  deleteAllPlayers: () => void;
  restoreDeletedPlayers: (playersToRestore: Player[]) => void;
  importPlayers: (parsedRows: ParsedPlayerRow[], replaceExisting?: boolean) => void;

  // Team Management
  addTeam: (teamData: {
    name: string;
    shortName: string;
    logo?: string;
    color?: string;
    secondaryColor?: string;
    owner?: string;
    captain?: string;
    startingBudget?: number;
  }) => Team;
  removeTeam: (teamId: string) => { success: boolean; message: string };
  updateTeam: (team: Team) => void;
  updateTeamName: (teamId: string, name: string, shortName?: string) => void;
  updateAllTeams: (teamsList: Team[]) => void;
  resetTeamBudget: (teamId: string) => void;
  removePlayerFromSquad: (teamId: string, playerId: string) => void;
  toggleWishlist: (teamId: string, playerId: string) => void;

  // Configuration & Utilities
  updateRules: (rules: AuctionRules) => void;
  syncGradeBasePricesToPlayers: (gradePrices?: GradeBasePrices) => void;
  updateTournament: (info: TournamentInfo) => void;
  resetToDemoData: () => void;
  clearAllData: () => void;
  importBackupJSON: (jsonString: string) => boolean;

  // Auction Lifecycle & History Management
  restartAuction: (modifiedBy?: string) => Promise<{ success: boolean; message: string; reversedCount?: number; returnedCount?: number }>;
  clearAuctionHistory: (modifiedBy?: string) => Promise<{ success: boolean; message: string; deletedCount?: number }>;
}

const AuctionContext = createContext<AuctionContextType | undefined>(undefined);

const BROADCAST_CHANNEL_NAME = 'cricket_auction_sync_channel';

export function calculateMaxBidForTeam(
  team: Team,
  rules: AuctionRules,
  player?: Player | null,
  allPlayers: Player[] = [],
): { maxBid: number; minReserveRequired: number; remainingSlotsNeeded: number; reason?: string } {
  if (player) {
    return calculateMaxAllowableBidForPlayer(team, player, allPlayers, rules);
  }

  const minSquadSize = rules.squadRules.minSquadSize || 9;
  const currentSquadSize = team.squad.length;
  if (currentSquadSize >= minSquadSize - 1) {
    return {
      maxBid: Math.max(0, team.remainingBudget),
      minReserveRequired: 0,
      remainingSlotsNeeded: 0,
    };
  }

  const slotsRemainingAfterThis = Math.max(0, minSquadSize - (currentSquadSize + 1));
  const minReserveRequired = slotsRemainingAfterThis * (rules.gradeBasePrices?.gradeC ?? 1000);
  const maxBid = Math.max(0, team.remainingBudget - minReserveRequired);

  return {
    maxBid,
    minReserveRequired,
    remainingSlotsNeeded: slotsRemainingAfterThis,
    reason: slotsRemainingAfterThis > 0
      ? `Must reserve ${minReserveRequired.toLocaleString()} pts for ${slotsRemainingAfterThis} remaining squad slot(s).`
      : undefined,
  };
}

export const AuctionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [players, setPlayers] = useState<Player[]>([]);
  const [transactions, setTransactions] = useState<AuctionTransaction[]>([]);
  const [rules, setRules] = useState<AuctionRules>(initialAuctionRules);
  const [tournament, setTournament] = useState<TournamentInfo>(initialTournamentInfo);
  
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [currentBidderId, setCurrentBidderId] = useState<string | null>(null);
  const [bidHistory, setBidHistory] = useState<BidRecord[]>([]);
  const [lastActionResult, setLastActionResult] = useState<LastAuctionResult | null>(null);

  // Mock Auction Mode state
  const [isMockAuction, setIsMockAuction] = useState<boolean>(false);
  const [mockSnapshot, setMockSnapshot] = useState<{
    teams: Team[];
    players: Player[];
    transactions: AuctionTransaction[];
    currentPlayerId: string | null;
    currentBid: number;
    currentBidderId: string | null;
    bidHistory: BidRecord[];
  } | null>(null);

  // Auction Order Mode & Custom Ordering State
  const [auctionOrderMode, setAuctionOrderMode] = useState<AuctionOrderingMode>('default');
  const [customAuctionOrderIds, setCustomAuctionOrderIds] = useState<string[]>([]);

  // Save Logs, Snapshots & History State
  const [saveLogs, setSaveLogs] = useState<SaveLogEntry[]>([]);
  const [saveSnapshots, setSaveSnapshots] = useState<SaveSnapshot[]>([]);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string>('');

  // Timer
  const [timerSeconds, setTimerSeconds] = useState<number>(15);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Broadcast channel for multi-screen sync
  const [channel, setChannel] = useState<BroadcastChannel | null>(null);

  // Helper to reliably check if current window is spectator/projector
  const isSpectatorOrProjectorView = (): boolean => {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash.toLowerCase();
    const isRemoteTunnel = window.location.hostname.includes('trycloudflare.com');
    if (hash === '#spectator' || hash === '#projector') return true;
    if (isRemoteTunnel && hash !== '#admin') return true;
    return false;
  };

  // Load initial state
  useEffect(() => {
    let cancelled = false;
    const isSpectator = isSpectatorOrProjectorView();

    const applyStored = (stored: AppStoredState) => {
      setTeams(stored.teams?.length ? stored.teams : initialTeams);
      setPlayers(stored.players);
      setTransactions(stored.transactions || []);
      const normalizedRules: AuctionRules = {
        ...(stored.rules || initialAuctionRules),
        squadRules: {
          ...(stored.rules?.squadRules || initialAuctionRules.squadRules),
          maxGradeA: 2,
          maxGradeB: 3,
          maxGradeC: 2,
          maxGradeASpending: 30000,
          maxGradeBSpending: 18000,
          maxCaptainViceCaptainSpending: 50000,
        }
      };
      setRules(normalizedRules);
      setTournament(stored.tournament || initialTournamentInfo);
      setCurrentPlayerId(stored.currentPlayerId ?? null);
      setCurrentBid(stored.currentBid ?? 0);
      setCurrentBidderId(stored.currentBidderId ?? null);
      setBidHistory((stored.bidHistory as unknown as BidRecord[]) || []);
      setAuctionOrderMode(stored.auctionOrderMode || 'default');
      if (stored.customAuctionOrderIds) setCustomAuctionOrderIds(stored.customAuctionOrderIds);
      setTimerSeconds(stored.rules?.timerDuration || 15);
      soundFx.setEnabled(stored.rules?.soundEnabled);
    };

    const withRoster = (state: AppStoredState): AppStoredState => {
      const sanitized = sanitizeAuctionState(state);
      const prices = sanitized.rules?.gradeBasePrices || initialAuctionRules.gradeBasePrices!;
      const basePlayers = shouldReplaceWithMensRoster(sanitized.players || [])
        ? bundledJcpl4AsPlayers(prices, 'mens')
        : sanitized.players;
      const deduplicated = deduplicatePlayers(basePlayers || []);
      const players = regradeAuctionPlayers(
        mergeBundledCareerStats(deduplicated, prices, 'mens'),
        prices,
        false, // preserve assigned grades!
      );
      // Ensure overrides are applied to the final roster so admin edits never revert
      const finalPlayers = applyPlayerOverrides(players, loadPlayerOverrides());
      return { ...sanitized, players: deduplicatePlayers(finalPlayers), teams: sanitized.teams };
    };

    if (isSpectator) {
      try {
        const cached = sessionStorage.getItem('cricket_auction_spectator_fast_cache');
        if (cached) {
          const parsed = withRoster(JSON.parse(cached) as AppStoredState);
          if (parsed.players.length && parsed.teams.length) {
            applyStored(parsed);
          }
        }
      } catch {}
    }

    void (async () => {
      const local = withRoster(loadStoredState());
      let serverState: AppStoredState | null = null;
      let serverOverrides: Record<string, Partial<Player>> = {};
      let serverLogs: SaveLogEntry[] = [];

      try {
        const [stateRes, overridesRes, logsRes] = await Promise.all([
          fetch('/api/auction-state').catch(() => null),
          fetch('/api/player-overrides').catch(() => null),
          fetch('/api/save-logs').catch(() => null),
        ]);
        if (stateRes && stateRes.ok) {
          serverState = await stateRes.json();
        }
        if (overridesRes && overridesRes.ok) {
          serverOverrides = await overridesRes.json();
        }
        if (logsRes && logsRes.ok) {
          serverLogs = await logsRes.json();
        }
      } catch {}

      const remote = await loadAuctionStateFromFirestore();
      if (cancelled) return;

      // Merge server overrides with local storage overrides
      const localOverrides = loadPlayerOverrides();
      const mergedOverrides = { ...serverOverrides, ...localOverrides };
      saveAllPlayerOverrides(mergedOverrides);

      // Choose base state: prefer disk serverState if it has players/teams, otherwise local
      let candidate: AppStoredState = local;
      if (serverState && serverState.players && serverState.players.length > 0) {
        candidate = serverState;
      } else if (remote && remote.players && remote.players.length > 0 && !local.players?.length) {
        candidate = remote;
      }

      const candidateTeams = candidate.teams?.length ? candidate.teams : local.teams;
      let candidatePlayers = candidate.players?.length ? candidate.players : local.players;

      // Always deduplicate player records across databases
      candidatePlayers = deduplicatePlayers(candidatePlayers);

      // Always apply permanent player overrides so administrator edits never revert
      candidatePlayers = applyPlayerOverrides(candidatePlayers, mergedOverrides);

      // Ensure team purses strictly align with captain, vice-captain, and transaction expenditures
      const alignedTeams = candidateTeams.map(t => {
        const cap = candidatePlayers.find(p =>
          (t.captainPlayerId && p.id === t.captainPlayerId) ||
          p.captainOfTeamId === t.id ||
          (p.isCaptain && (p.teamId === t.id || (t.squad && t.squad.includes(p.id)))) ||
          (t.captain && p.name && p.name.trim().toLowerCase() === t.captain.trim().toLowerCase())
        );
        const vc = candidatePlayers.find(p =>
          (t.viceCaptainPlayerId && p.id === t.viceCaptainPlayerId) ||
          p.viceCaptainOfTeamId === t.id ||
          (p.isViceCaptain && (p.teamId === t.id || (t.squad && t.squad.includes(p.id)))) ||
          (t.viceCaptain && p.name && p.name.trim().toLowerCase() === t.viceCaptain.trim().toLowerCase())
        );
        const leadershipCost = (cap?.soldPrice || 0) + (vc?.soldPrice || 0);

        const txSpent = (candidate.transactions || [])
          .filter(tx => !tx.undone && tx.teamId === t.id)
          .reduce((sum, tx) => sum + (tx.soldPrice || 0), 0);

        const expectedSpent = leadershipCost + txSpent;
        const startBudget = t.startingBudget || 100000;
        const expectedRemaining = Math.max(0, startBudget - expectedSpent);

        return {
          ...t,
          startingBudget: startBudget,
          totalSpent: expectedSpent,
          remainingBudget: expectedRemaining,
        };
      });

      const next = withRoster({
        ...candidate,
        teams: alignedTeams,
        players: candidatePlayers,
      });

      applyStored(next);
      if (!isSpectator) {
        saveStoredState(next);
      }

      // Merge save logs (server disk logs + local storage logs)
      const localLogs = loadSaveLogs();
      const logMap = new Map<string, SaveLogEntry>();
      [...serverLogs, ...localLogs].forEach(l => {
        if (l && l.id && !logMap.has(l.id)) logMap.set(l.id, l);
      });
      const mergedLogs = Array.from(logMap.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setSaveLogs(mergedLogs);
      localStorage.setItem('cricket_auction_save_logs_v3', JSON.stringify(mergedLogs));

      setSaveSnapshots(loadSaveSnapshots());
      setLastSavedTimestamp(getLastSavedTimestamp());
      setIsLoaded(true);
    })();

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      setChannel(bc);

      bc.onmessage = (event) => {
        if (event.data?.type === 'SYNC_STATE') {
          const isReadOnly = isSpectatorOrProjectorView();
          if (isReadOnly) {
            const payload = event.data.payload as AppStoredState;
            if (payload?.players?.length) {
              applyStored(withRoster(payload));
            }
          }
        }
      };

      return () => {
        cancelled = true;
        bc.close();
      };
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // Broadcast state helper (Same browser tabs)
  const broadcastState = useCallback((stateToBroadcast: AppStoredState) => {
    if (channel) {
      channel.postMessage({ type: 'SYNC_STATE', payload: stateToBroadcast });
    }
  }, [channel]);

  // Dedup ref to prevent spamming duplicate state pushes
  const lastPushedJsonRef = useRef<string>('');

  const fingerprintState = (state: AppStoredState) =>
    JSON.stringify({ ...state, lastSaved: undefined });

  // Push state to server (Cross-device Wi-Fi sync for mobile spectator phones & projector screens)
  const pushStateToServer = useCallback((stateToPush: AppStoredState) => {
    try {
      const json = fingerprintState(stateToPush);
      if (lastPushedJsonRef.current === json) return;
      lastPushedJsonRef.current = json;

      fetch('/api/auction-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
      }).catch(() => {});
      void pushAuctionStateToFirestore(stateToPush);
      void pushPlayerStatsCatalogToFirestore(stateToPush.players || []);
    } catch {}
  }, []);

  // Persist state changes (Admin mode only pushes to server to prevent spectators from overwriting)
  useEffect(() => {
    if (!isLoaded) return;
    const isReadOnly = isSpectatorOrProjectorView();
    if (isReadOnly) return; // Read-only views never overwrite server state

    const stateObj: AppStoredState = {
      teams,
      players,
      transactions,
      rules,
      tournament,
      currentPlayerId,
      currentBid,
      currentBidderId,
      bidHistory,
      auctionOrderMode,
      customAuctionOrderIds,
      lastSaved: new Date().toISOString(),
    };
    saveStoredState(stateObj);
    broadcastState(stateObj);
    pushStateToServer(stateObj);
    setLastSavedTimestamp(new Date().toISOString());
  }, [teams, players, transactions, rules, tournament, currentPlayerId, currentBid, currentBidderId, bidHistory, auctionOrderMode, customAuctionOrderIds, isLoaded, broadcastState, pushStateToServer]);

  // Network Real-Time Sync Listener (Live Spectator & Projector cross-device sync)
  useEffect(() => {
    const checkIsSpectatorOrProjector = () => isSpectatorOrProjectorView();

    const applyIncomingState = (payload: AppStoredState) => {
      if (!payload || !payload.teams?.length) return;
      if (!payload.players?.length) return;
      payload = sanitizeAuctionState(payload);
      const prices = payload.rules?.gradeBasePrices || initialAuctionRules.gradeBasePrices!;
      if (shouldReplaceWithMensRoster(payload.players)) {
        payload = { ...payload, players: bundledJcpl4AsPlayers(prices, 'mens') };
      }
      payload = {
        ...payload,
        players: deduplicatePlayers(
          regradeAuctionPlayers(
            mergeBundledCareerStats(deduplicatePlayers(payload.players || []), prices, 'mens'),
            prices,
            false,
          )
        ),
      };
      try {
        if (typeof window !== 'undefined' && checkIsSpectatorOrProjector()) {
          sessionStorage.setItem('cricket_auction_spectator_fast_cache', JSON.stringify(payload));
        }
      } catch {}
      const overrides = loadPlayerOverrides();
      const updatedPlayers = deduplicatePlayers(applyPlayerOverrides(payload.players, overrides));
      setPlayers(updatedPlayers);

      const alignedTeams = payload.teams.map(t => {
        const cap = updatedPlayers.find(p => p.id === t.captainPlayerId || (p.captainOfTeamId === t.id) || ((p.teamId === t.id || t.squad.includes(p.id)) && p.isCaptain));
        const vc = updatedPlayers.find(p => p.id === t.viceCaptainPlayerId || (p.viceCaptainOfTeamId === t.id) || ((p.teamId === t.id || t.squad.includes(p.id)) && p.isViceCaptain));
        const leadershipCost = (cap?.soldPrice || 0) + (vc?.soldPrice || 0);

        const txSpent = (payload.transactions || [])
          .filter(tx => !tx.undone && tx.teamId === t.id)
          .reduce((sum, tx) => sum + (tx.soldPrice || 0), 0);

        const expectedSpent = leadershipCost + txSpent;
        const startBudget = t.startingBudget || 100000;
        const expectedRemaining = Math.max(0, startBudget - expectedSpent);

        return {
          ...t,
          startingBudget: startBudget,
          totalSpent: expectedSpent,
          remainingBudget: expectedRemaining,
        };
      });
      setTeams(alignedTeams);
      setTransactions(payload.transactions || []);
      const normalizedIncomingRules: AuctionRules = {
        ...(payload.rules || initialAuctionRules),
        squadRules: {
          ...(payload.rules?.squadRules || initialAuctionRules.squadRules),
          maxGradeA: 2,
          maxGradeB: 3,
          maxGradeC: 2,
          maxGradeASpending: 30000,
          maxGradeBSpending: 18000,
          maxCaptainViceCaptainSpending: 50000,
        }
      };
      setRules(normalizedIncomingRules);
      setTournament(payload.tournament || initialTournamentInfo);
      setCurrentPlayerId(payload.currentPlayerId ?? null);
      setCurrentBid(payload.currentBid ?? 0);
      setCurrentBidderId(payload.currentBidderId ?? null);
      setBidHistory(payload.bidHistory as unknown as BidRecord[] || []);
      setAuctionOrderMode(payload.auctionOrderMode || 'default');
      if (payload.customAuctionOrderIds) {
        setCustomAuctionOrderIds(payload.customAuctionOrderIds);
      }
    };

    const fetchLatestServerState = () => {
      // Only spectators and projectors sync from server; admin is the authoritative source
      if (!checkIsSpectatorOrProjector()) return;

      fetch('/api/auction-state')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && checkIsSpectatorOrProjector()) {
            applyIncomingState(data);
          }
        })
        .catch(() => {});
    };

    // 1. Initial fetch from server (only for spectator or projector)
    if (checkIsSpectatorOrProjector()) {
      fetchLatestServerState();
    }

    const unsubFirestore = subscribeAuctionStateFromFirestore((data) => {
      if (!checkIsSpectatorOrProjector()) return;
      try {
        const incoming = fingerprintState(data);
        if (incoming === lastPushedJsonRef.current) return;
        lastPushedJsonRef.current = incoming;
      } catch {}
      applyIncomingState(data);
    });

    // 2. React immediately to hash changes (e.g. entering #spectator or #projector)
    const handleHashChange = () => {
      if (checkIsSpectatorOrProjector()) {
        fetchLatestServerState();
      }
    };
    window.addEventListener('hashchange', handleHashChange);

    // 3. Instant cross-tab storage listener (Zero latency on same device/browser)
    const handleStorageChange = (e: StorageEvent) => {
      if (checkIsSpectatorOrProjector()) {
        try {
          const stored = loadStoredState();
          applyIncomingState(stored);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 4. Server-Sent Events (SSE) for instant cross-device broadcast (< 15ms latency)
    let es: EventSource | null = null;
    const connectSSE = () => {
      try {
        es = new EventSource('/api/auction-stream');
        es.onmessage = (evt) => {
          try {
            if (evt.data && evt.data.trim().startsWith('{')) {
              const data = JSON.parse(evt.data) as AppStoredState;
              if (data && checkIsSpectatorOrProjector()) {
                applyIncomingState(data);
              }
            }
          } catch {}
        };
        es.onerror = () => {
          // Cloudflare tunnel reconnection handled gracefully by polling fallback
        };
      } catch {}
    };
    connectSSE();

    // 5. Fallback heartbeat polling for spectator & projector every 1 second
    const interval = setInterval(() => {
      if (checkIsSpectatorOrProjector()) {
        fetchLatestServerState();
      }
    }, 1000);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('storage', handleStorageChange);
      if (es) es.close();
      clearInterval(interval);
      unsubFirestore();
    };
  }, []);


  // Sync sound settings
  useEffect(() => {
    soundFx.setEnabled(rules.soundEnabled);
  }, [rules.soundEnabled]);

  const currentPlayer = players.find(p => p.id === currentPlayerId) || null;
  const currentBidder = teams.find(t => t.id === currentBidderId) || null;

  const toggleMockAuction = useCallback((enable?: boolean) => {
    setIsMockAuction(prev => {
      const nextVal = enable !== undefined ? enable : !prev;
      if (nextVal) {
        setMockSnapshot({
          teams: JSON.parse(JSON.stringify(teams)),
          players: JSON.parse(JSON.stringify(players)),
          transactions: JSON.parse(JSON.stringify(transactions)),
          currentPlayerId,
          currentBid,
          currentBidderId,
          bidHistory: JSON.parse(JSON.stringify(bidHistory)),
        });
      } else {
        if (mockSnapshot) {
          setTeams(mockSnapshot.teams);
          setPlayers(mockSnapshot.players);
          setTransactions(mockSnapshot.transactions);
          setCurrentPlayerId(mockSnapshot.currentPlayerId);
          setCurrentBid(mockSnapshot.currentBid);
          setCurrentBidderId(mockSnapshot.currentBidderId);
          setBidHistory(mockSnapshot.bidHistory);
          setMockSnapshot(null);
        }
      }
      return nextVal;
    });
  }, [teams, players, transactions, currentPlayerId, currentBid, currentBidderId, bidHistory, mockSnapshot]);

  const resetMockAuction = useCallback(() => {
    if (mockSnapshot) {
      setTeams(JSON.parse(JSON.stringify(mockSnapshot.teams)));
      setPlayers(JSON.parse(JSON.stringify(mockSnapshot.players)));
      setTransactions(JSON.parse(JSON.stringify(mockSnapshot.transactions)));
      setCurrentPlayerId(mockSnapshot.currentPlayerId);
      setCurrentBid(mockSnapshot.currentBid);
      setCurrentBidderId(mockSnapshot.currentBidderId);
      setBidHistory(JSON.parse(JSON.stringify(mockSnapshot.bidHistory)));
    }
  }, [mockSnapshot]);

  const calculateMaxAllowableBid = useCallback((team: Team, player?: Player | null) => {
    return calculateMaxAllowableBidForPlayer(team, player || currentPlayer, players, rules);
  }, [rules, currentPlayer, players]);

  const getTeamGradeMetricsHelper = useCallback((team: Team) => {
    return getTeamGradeMetrics(team, players, rules);
  }, [players, rules]);

  const validatePurchaseForTeam = useCallback((team: Team, player: Player, amount: number) => {
    return validatePurchase(team, player, amount, players, rules);
  }, [players, rules]);

  // Timer ticker
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          const next = prev - 1;
          if (next === 3) soundFx.playCountdown(1);
          if (next === 2) soundFx.playCountdown(2);
          if (next === 1) soundFx.playCountdown(3);
          if (next <= 0) {
            setIsTimerRunning(false);
            if (rules.autoSellOnTimer && currentBidderId && currentPlayerId) {
              markPlayerSold();
            }
          }
          return Math.max(next, 0);
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds, rules.autoSellOnTimer, currentBidderId, currentPlayerId]);

  const startTimer = useCallback(() => {
    setIsTimerRunning(true);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsTimerRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setIsTimerRunning(false);
    setTimerSeconds(rules.timerDuration);
  }, [rules.timerDuration]);

  const setCustomTimerDuration = useCallback((seconds: number) => {
    setTimerSeconds(seconds);
  }, []);

  // ================= SAVE LOGS & PERSISTENCE HELPERS =================
  const logAndPersistSave = useCallback((type: 'manual' | 'auto', description: string) => {
    const entry: SaveLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      type,
      status: 'success',
      description,
      itemCountSummary: {
        teams: teams.length,
        players: players.length,
        transactions: transactions.length,
      },
    };
    appendSaveLog(entry);
    setSaveLogs(loadSaveLogs());
    const ts = new Date().toISOString();
    setLastSavedTimestamp(ts);
  }, [teams.length, players.length, transactions.length]);

  const triggerManualSave = useCallback((description?: string): { success: boolean; message: string } => {
    try {
      const stateObj: AppStoredState = {
        teams,
        players,
        transactions,
        rules,
        tournament,
        currentPlayerId,
        currentBid,
        currentBidderId,
        bidHistory,
        auctionOrderMode,
        customAuctionOrderIds,
        lastSaved: new Date().toISOString(),
      };
      saveStoredState(stateObj);
      createAndStoreSnapshot(description || 'Manual Save by Organizer', stateObj);
      logAndPersistSave('manual', description || 'Manual Save by Organizer');
      setSaveSnapshots(loadSaveSnapshots());
      return { success: true, message: 'All auction data, teams, players, and logs saved successfully!' };
    } catch (err: any) {
      const failEntry: SaveLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'manual',
        status: 'failure',
        description: `Save failed: ${err?.message || 'Storage error'}`,
      };
      appendSaveLog(failEntry);
      setSaveLogs(loadSaveLogs());
      return { success: false, message: 'Failed to save data to local storage.' };
    }
  }, [teams, players, transactions, rules, tournament, currentPlayerId, currentBid, currentBidderId, bidHistory, auctionOrderMode, customAuctionOrderIds, logAndPersistSave]);

  const restoreFromSnapshot = useCallback((snapshotId: string): { success: boolean; message: string } => {
    const snaps = loadSaveSnapshots();
    const target = snaps.find(s => s.id === snapshotId);
    if (!target) return { success: false, message: 'Restore snapshot point not found.' };

    try {
      setTeams(target.state.teams);
      setPlayers(target.state.players);
      setTransactions(target.state.transactions);
      setTournament(target.state.tournament);
      setRules(target.state.rules);
      if (target.state.auctionOrderMode) setAuctionOrderMode(target.state.auctionOrderMode);
      if (target.state.customAuctionOrderIds) setCustomAuctionOrderIds(target.state.customAuctionOrderIds);
      setCurrentPlayerId(target.state.currentPlayerId ?? null);
      setCurrentBid(target.state.currentBid ?? 0);
      setCurrentBidderId(target.state.currentBidderId ?? null);

      saveStoredState(target.state);
      logAndPersistSave('manual', `Restored auction state to snapshot: "${target.name || target.description}"`);
      return { success: true, message: `Successfully restored state from ${new Date(target.timestamp).toLocaleString()}!` };
    } catch (err: any) {
      return { success: false, message: `Failed to restore snapshot: ${err?.message}` };
    }
  }, [logAndPersistSave]);

  // ================= AUCTION ORDERING & QUEUE LOGIC =================
  const getOrderedUpcomingPlayers = useCallback((): Player[] => {
    const upcoming = deduplicatePlayers(
      players.filter(p => p.status === 'upcoming' && !p.isCaptain && !p.isViceCaptain && !p.teamId)
    );
    if (auctionOrderMode === 'grade') {
      const gradeRank: Record<string, number> = { 'A+': 0, 'A': 1, 'B': 2, 'C': 3 };
      return [...upcoming].sort((a, b) => {
        const rankDiff = (gradeRank[normalizeGrade(a.grade)] ?? 99) - (gradeRank[normalizeGrade(b.grade)] ?? 99);
        if (rankDiff !== 0) return rankDiff;
        const orderA = a.auctionOrder ?? 99999;
        const orderB = b.auctionOrder ?? 99999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });
    }

    if (auctionOrderMode === 'custom' && customAuctionOrderIds.length > 0) {
      const orderMap = new Map<string, number>();
      customAuctionOrderIds.forEach((id, index) => orderMap.set(id, index));
      return [...upcoming].sort((a, b) => {
        const idxA = orderMap.has(a.id) ? (orderMap.get(a.id) as number) : 999999;
        const idxB = orderMap.has(b.id) ? (orderMap.get(b.id) as number) : 999999;
        if (idxA !== idxB) return idxA - idxB;
        return (a.auctionOrder ?? 9999) - (b.auctionOrder ?? 9999);
      });
    }

    // Default: Sort by player's assigned auctionOrder or original list position
    return [...upcoming].sort((a, b) => {
      const orderA = a.auctionOrder ?? 99999;
      const orderB = b.auctionOrder ?? 99999;
      if (orderA !== orderB) return orderA - orderB;
      return players.indexOf(a) - players.indexOf(b);
    });
  }, [players, auctionOrderMode, customAuctionOrderIds]);

  const nextUpcomingQueuePlayer = useMemo(() => {
    const ordered = getOrderedUpcomingPlayers();
    return ordered.length > 0 ? ordered[0] : null;
  }, [getOrderedUpcomingPlayers]);

  const setCustomAuctionOrder = useCallback((playerIds: string[]) => {
    setCustomAuctionOrderIds(playerIds);
    setAuctionOrderMode('custom');
    logAndPersistSave('auto', 'Updated custom player auction ordering');
  }, [logAndPersistSave]);

  const getGradeCategoryMaxBid = useCallback((_player: Player): number | null => {
    // Deactivated per Requirement 17: ensure hidden settings do not block valid bids
    return null;
  }, []);

  // ================= CAPTAIN ALLOCATION LOGIC =================
  const allocateCaptainToTeam = useCallback((
    teamId: string,
    playerId: string,
    customCost?: number
  ): { success: boolean; message: string } => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return { success: false, message: 'Franchise not found.' };

    const player = players.find(p => p.id === playerId);
    if (!player) return { success: false, message: 'Player not found.' };

    // Find if player is already assigned as captain or squad member to another team for seamless reassignment
    const prevAssignedTeamId = player.captainOfTeamId || (player.teamId && player.teamId !== teamId && player.isCaptain ? player.teamId : undefined);
    const prevAssignedTeam = prevAssignedTeamId ? teams.find(t => t.id === prevAssignedTeamId) : undefined;
    const prevCaptainOfTargetTeamId = team.captainPlayerId;

    let cost = 0;
    if (customCost !== undefined) {
      cost = customCost;
    } else if (rules.captainCostMode === 'basePrice') {
      cost = player.basePrice;
    } else if (rules.captainCostMode === 'custom' && rules.captainCustomCost !== undefined) {
      cost = rules.captainCustomCost;
    } else {
      cost = captainFixedCost(player, rules);
    }
    if (cost < 0 || cost > 50000) {
      return {
        success: false,
        message: `Captain cost must be between ₹0 and ₹50,000 (each team may have its own pre-allocated amount).`,
      };
    }

    // Determine current cost if player was already captain of this target team
    const isAlreadyCaptainOfThisTeam = prevCaptainOfTargetTeamId === playerId || (team.captain && team.captain.trim().toLowerCase() === player.name.trim().toLowerCase());
    const oldCaptainPrice = isAlreadyCaptainOfThisTeam ? (player.soldPrice || 0) : 0;
    const netCostDifference = cost - oldCaptainPrice;

    if (netCostDifference > team.remainingBudget) {
      return {
        success: false,
        message: `Insufficient purse! ${team.name} has only ₹${team.remainingBudget.toLocaleString('en-IN')} remaining, but this deduction requires ₹${netCostDifference.toLocaleString('en-IN')}.`
      };
    }

    if (player.id === team.viceCaptainPlayerId || (player.isViceCaptain && !isAlreadyCaptainOfThisTeam)) {
      return {
        success: false,
        message: `${player.name} is already assigned as Vice-Captain and cannot also be assigned as Captain.`
      };
    }

    const teamMetricsForCap = getTeamGradeMetrics(team, players, rules);
    if (teamMetricsForCap.viceCaptainCost + cost > 50000) {
      return {
        success: false,
        message: `Captain and Vice-Captain combined budget cannot exceed 50,000 points. (Current VC: ₹${teamMetricsForCap.viceCaptainCost.toLocaleString('en-IN')}, Attempted Captain: ₹${cost.toLocaleString('en-IN')})`
      };
    }

    // Update players state:
    // 1. Target player gets marked as sold captain, keeping their original grade!
    // 2. Previous captain of target team (if different) is reset to upcoming
    const updatedPlayers = players.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          isCaptain: true,
          isPreAssignedCaptain: true,
          captainOfTeamId: teamId,
          teamId: teamId,
          status: 'sold' as PlayerStatus,
          soldPrice: cost,
          // Preserve player's existing grade
          grade: p.grade || 'A',
        };
      }
      if (prevCaptainOfTargetTeamId && p.id === prevCaptainOfTargetTeamId && p.id !== playerId) {
        return {
          ...p,
          isCaptain: false,
          isPreAssignedCaptain: false,
          captainOfTeamId: undefined,
          teamId: null,
          status: 'upcoming' as PlayerStatus,
          soldPrice: null,
        };
      }
      return p;
    });

    // Also persist player override so captain status and cost persist permanently
    savePlayerOverride(playerId, {
      isCaptain: true,
      isPreAssignedCaptain: true,
      soldPrice: cost,
      teamId: teamId,
    });

    // Update teams state:
    const updatedTeams = teams.map(t => {
      // If this was the team previously holding this player, release player & refund previous cost
      if (prevAssignedTeam && t.id === prevAssignedTeam.id && t.id !== teamId) {
        const refundOldCost = player.soldPrice || 0;
        return {
          ...t,
          captain: undefined,
          captainPlayerId: undefined,
          squad: t.squad.filter(id => id !== playerId),
          remainingBudget: t.remainingBudget + refundOldCost,
          totalSpent: Math.max(0, t.totalSpent - refundOldCost),
        };
      }

      // Target team updates: set captain, add to squad, adjust budget
      if (t.id === teamId) {
        const startBudget = t.startingBudget || rules.startingBudget || 100000;
        const filteredSquad = t.squad.filter(id => id !== prevCaptainOfTargetTeamId && id !== playerId);
        const vcPlayer = players.find(p => p.id === t.viceCaptainPlayerId || p.viceCaptainOfTeamId === t.id);
        const vcCost = Number(vcPlayer?.soldPrice || 0);

        // Transaction auction spending
        const txSpent = (transactions || [])
          .filter(tx => !tx.undone && tx.teamId === t.id)
          .reduce((sum, tx) => sum + (tx.soldPrice || 0), 0);

        const totalSpent = cost + vcCost + txSpent;
        const remainingBudget = Math.max(0, startBudget - totalSpent);

        return {
          ...t,
          captain: player.name,
          captainPlayerId: player.id,
          squad: [...filteredSquad, player.id],
          startingBudget: startBudget,
          remainingBudget,
          totalSpent,
        };
      }
      return t;
    });

    setPlayers(updatedPlayers);
    setTeams(updatedTeams);

    // Synchronously write to localStorage and broadcast so changes are permanent immediately
    saveStoredState({ teams: updatedTeams, players: updatedPlayers });
    const snapshotState: AppStoredState = {
      teams: updatedTeams,
      players: updatedPlayers,
      transactions,
      rules,
      tournament,
      currentPlayerId,
      currentBid,
      currentBidderId,
      bidHistory,
      auctionOrderMode,
      customAuctionOrderIds,
      lastSaved: new Date().toISOString(),
    };
    broadcastState(snapshotState);
    pushStateToServer(snapshotState);

    const reassignedNotice = prevAssignedTeam ? ` (Reassigned from ${prevAssignedTeam.name})` : '';
    logAndPersistSave('auto', `Allocated Captain: ${player.name} to ${team.name}${reassignedNotice} (${cost > 0 ? `${cost.toLocaleString()} pts` : 'Free/Zero-Cost'})`);

    return {
      success: true,
      message: `Successfully assigned ${player.name} as Captain of ${team.name}!${reassignedNotice}`,
    };
  }, [teams, players, rules, transactions, tournament, currentPlayerId, currentBid, currentBidderId, bidHistory, auctionOrderMode, customAuctionOrderIds, broadcastState, pushStateToServer, logAndPersistSave]);

  const removeCaptainFromTeam = useCallback((teamId: string): { success: boolean; message: string } => {
    const team = teams.find(t => t.id === teamId);
    if (!team) {
      return { success: false, message: 'Team not found.' };
    }

    const captainPlayer = players.find(p => p.id === team.captainPlayerId || (p.teamId === teamId && p.isCaptain));
    if (!team.captainPlayerId && !captainPlayer) {
      return { success: false, message: 'No captain assigned to this team.' };
    }

    const captainIdToRemove = team.captainPlayerId || captainPlayer?.id;
    const refund = captainPlayer?.soldPrice || 0;

    const updatedPlayers = players.map(p => {
      if (p.id === captainIdToRemove) {
        return {
          ...p,
          isCaptain: false,
          isPreAssignedCaptain: false,
          captainOfTeamId: undefined,
          teamId: null,
          status: 'upcoming' as PlayerStatus,
          soldPrice: null,
        };
      }
      return p;
    });

    const updatedTeams = teams.map(t => {
      if (t.id === teamId) {
        return {
          ...t,
          captain: undefined,
          captainPlayerId: undefined,
          squad: t.squad.filter(id => id !== captainIdToRemove),
          remainingBudget: t.remainingBudget + refund,
          totalSpent: Math.max(0, t.totalSpent - refund),
        };
      }
      return t;
    });

    setPlayers(updatedPlayers);
    setTeams(updatedTeams);

    saveStoredState({ teams: updatedTeams, players: updatedPlayers });
    const snapshotState: AppStoredState = {
      teams: updatedTeams,
      players: updatedPlayers,
      transactions,
      rules,
      tournament,
      currentPlayerId,
      currentBid,
      currentBidderId,
      bidHistory,
      auctionOrderMode,
      customAuctionOrderIds,
      lastSaved: new Date().toISOString(),
    };
    broadcastState(snapshotState);
    pushStateToServer(snapshotState);

    logAndPersistSave('auto', `Removed Captain of ${team.name}`);

    return {
      success: true,
      message: `Captain removed from ${team.name} and returned to player pool.`,
    };
  }, [teams, players, transactions, rules, tournament, currentPlayerId, currentBid, currentBidderId, bidHistory, auctionOrderMode, customAuctionOrderIds, broadcastState, pushStateToServer, logAndPersistSave]);

  // ================= VICE-CAPTAIN ALLOCATION LOGIC =================
  const allocateViceCaptainToTeam = useCallback((
    teamId: string,
    playerId: string,
    customCost?: number
  ): { success: boolean; message: string } => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return { success: false, message: 'Franchise not found.' };

    const player = players.find(p => p.id === playerId);
    if (!player) return { success: false, message: 'Player not found.' };

    if (player.id === team.captainPlayerId || player.isCaptain) {
      return {
        success: false,
        message: `${player.name} is already assigned as Captain and cannot also be assigned as Vice-Captain.`
      };
    }

    const leadershipMetrics = getTeamGradeMetrics(team, players, rules);
    if (!leadershipMetrics.captainPlayer && !team.captainPlayerId) {
      return {
        success: false,
        message: `Captain must be allocated at a fixed base before ${team.name} can auction a Vice-Captain.`,
      };
    }

    const prevAssignedTeamId = player.viceCaptainOfTeamId || (player.teamId && player.teamId !== teamId && player.isViceCaptain ? player.teamId : undefined);
    const prevAssignedTeam = prevAssignedTeamId ? teams.find(t => t.id === prevAssignedTeamId) : undefined;
    const prevVcOfTargetTeamId = team.viceCaptainPlayerId;

    let cost = 0;
    if (customCost !== undefined) {
      cost = customCost;
    } else if (rules.captainCostMode === 'basePrice') {
      cost = player.basePrice;
    } else if (rules.captainCostMode === 'custom' && rules.captainCustomCost !== undefined) {
      cost = rules.captainCustomCost;
    } else {
      cost = 0;
    }

    // Determine current cost if player was already vice-captain of this target team
    const isAlreadyVcOfThisTeam = prevVcOfTargetTeamId === playerId || (team.viceCaptain && team.viceCaptain.trim().toLowerCase() === player.name.trim().toLowerCase());
    const oldVcPrice = isAlreadyVcOfThisTeam ? (player.soldPrice || 0) : 0;
    const netCostDifference = cost - oldVcPrice;

    if (netCostDifference > team.remainingBudget) {
      return {
        success: false,
        message: `Insufficient purse! ${team.name} has only ₹${team.remainingBudget.toLocaleString('en-IN')} remaining, but this deduction requires ₹${netCostDifference.toLocaleString('en-IN')}.`
      };
    }

    const teamMetricsForVc = getTeamGradeMetrics(team, players, rules);
    if (teamMetricsForVc.captainCost + cost > 50000) {
      return {
        success: false,
        message: `Captain and Vice-Captain combined budget cannot exceed 50,000 points. (Current Captain: ₹${teamMetricsForVc.captainCost.toLocaleString('en-IN')}, Attempted VC: ₹${cost.toLocaleString('en-IN')})`
      };
    }

    const updatedPlayers = players.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          isViceCaptain: true,
          isPreAssignedViceCaptain: true,
          viceCaptainOfTeamId: teamId,
          teamId: teamId,
          status: 'sold' as PlayerStatus,
          soldPrice: cost,
          grade: p.grade || 'A',
        };
      }
      if (prevVcOfTargetTeamId && p.id === prevVcOfTargetTeamId && p.id !== playerId) {
        return {
          ...p,
          isViceCaptain: false,
          isPreAssignedViceCaptain: false,
          viceCaptainOfTeamId: undefined,
          teamId: null,
          status: 'upcoming' as PlayerStatus,
          soldPrice: null,
        };
      }
      return p;
    });

    // Also persist player override so vice-captain status and cost persist permanently
    savePlayerOverride(playerId, {
      isViceCaptain: true,
      isPreAssignedViceCaptain: true,
      soldPrice: cost,
      teamId: teamId,
    });

    const updatedTeams = teams.map(t => {
      if (prevAssignedTeam && t.id === prevAssignedTeam.id && t.id !== teamId) {
        const refundOldCost = player.soldPrice || 0;
        return {
          ...t,
          viceCaptain: undefined,
          viceCaptainPlayerId: undefined,
          squad: t.squad.filter(id => id !== playerId),
          remainingBudget: t.remainingBudget + refundOldCost,
          totalSpent: Math.max(0, t.totalSpent - refundOldCost),
        };
      }

      if (t.id === teamId) {
        const startBudget = t.startingBudget || rules.startingBudget || 100000;
        const filteredSquad = t.squad.filter(id => id !== prevVcOfTargetTeamId && id !== playerId);
        const capPlayer = players.find(p => p.id === t.captainPlayerId || p.captainOfTeamId === t.id || (t.captain && p.name.trim().toLowerCase() === t.captain.trim().toLowerCase()));
        const capCost = Number(capPlayer?.soldPrice || 0);

        // Transaction auction spending
        const txSpent = (transactions || [])
          .filter(tx => !tx.undone && tx.teamId === t.id)
          .reduce((sum, tx) => sum + (tx.soldPrice || 0), 0);

        const totalSpent = capCost + cost + txSpent;
        const remainingBudget = Math.max(0, startBudget - totalSpent);

        return {
          ...t,
          viceCaptain: player.name,
          viceCaptainPlayerId: player.id,
          squad: [...filteredSquad, player.id],
          startingBudget: startBudget,
          remainingBudget,
          totalSpent,
        };
      }
      return t;
    });

    setPlayers(updatedPlayers);
    setTeams(updatedTeams);

    saveStoredState({ teams: updatedTeams, players: updatedPlayers });
    const snapshotState: AppStoredState = {
      teams: updatedTeams,
      players: updatedPlayers,
      transactions,
      rules,
      tournament,
      currentPlayerId,
      currentBid,
      currentBidderId,
      bidHistory,
      auctionOrderMode,
      customAuctionOrderIds,
      lastSaved: new Date().toISOString(),
    };
    broadcastState(snapshotState);
    pushStateToServer(snapshotState);

    const reassignedNotice = prevAssignedTeam ? ` (Reassigned from ${prevAssignedTeam.name})` : '';
    logAndPersistSave('auto', `Allocated Vice-Captain: ${player.name} to ${team.name}${reassignedNotice} (${cost > 0 ? `${cost.toLocaleString()} pts` : 'Free/Zero-Cost'})`);

    return {
      success: true,
      message: `Successfully assigned ${player.name} as Vice-Captain of ${team.name}!${reassignedNotice}`,
    };
  }, [teams, players, rules, transactions, tournament, currentPlayerId, currentBid, currentBidderId, bidHistory, auctionOrderMode, customAuctionOrderIds, broadcastState, pushStateToServer, logAndPersistSave]);

  const removeViceCaptainFromTeam = useCallback((teamId: string): { success: boolean; message: string } => {
    const team = teams.find(t => t.id === teamId);
    if (!team) {
      return { success: false, message: 'Team not found.' };
    }

    const vcPlayer = players.find(p => p.id === team.viceCaptainPlayerId || (p.teamId === teamId && p.isViceCaptain));
    if (!team.viceCaptainPlayerId && !vcPlayer) {
      return { success: false, message: 'No vice-captain assigned to this team.' };
    }

    const vcIdToRemove = team.viceCaptainPlayerId || vcPlayer?.id;
    const refund = vcPlayer?.soldPrice || 0;

    const updatedPlayers = players.map(p => {
      if (p.id === vcIdToRemove) {
        return {
          ...p,
          isViceCaptain: false,
          isPreAssignedViceCaptain: false,
          viceCaptainOfTeamId: undefined,
          teamId: null,
          status: 'upcoming' as PlayerStatus,
          soldPrice: null,
        };
      }
      return p;
    });

    const updatedTeams = teams.map(t => {
      if (t.id === teamId) {
        return {
          ...t,
          viceCaptain: undefined,
          viceCaptainPlayerId: undefined,
          squad: t.squad.filter(id => id !== vcIdToRemove),
          remainingBudget: t.remainingBudget + refund,
          totalSpent: Math.max(0, t.totalSpent - refund),
        };
      }
      return t;
    });

    setPlayers(updatedPlayers);
    setTeams(updatedTeams);

    saveStoredState({ teams: updatedTeams, players: updatedPlayers });
    const snapshotState: AppStoredState = {
      teams: updatedTeams,
      players: updatedPlayers,
      transactions,
      rules,
      tournament,
      currentPlayerId,
      currentBid,
      currentBidderId,
      bidHistory,
      auctionOrderMode,
      customAuctionOrderIds,
      lastSaved: new Date().toISOString(),
    };
    broadcastState(snapshotState);
    pushStateToServer(snapshotState);

    logAndPersistSave('auto', `Removed Vice-Captain of ${team.name}`);

    return {
      success: true,
      message: `Vice-Captain removed from ${team.name} and returned to player pool.`,
    };
  }, [teams, players, transactions, rules, tournament, currentPlayerId, currentBid, currentBidderId, bidHistory, auctionOrderMode, customAuctionOrderIds, broadcastState, pushStateToServer, logAndPersistSave]);

  // APPLY CAPTAIN COST ACROSS ALL ALLOTTED TEAMS (IMMEDIATE PURSE DEDUCTION)
  const applyCaptainCostToAllAllotted = useCallback((cost: number): { success: boolean; count: number; message: string } => {
    if (!Number.isFinite(cost) || cost < 0 || cost > 50000) {
      return { success: false, count: 0, message: 'Captain cost must be between ₹0 and ₹50,000 for all allotted captains.' };
    }
    let affectedCount = 0;
    const updatedPlayersMap = new Map<string, Player>();
    const updatedTeamsMap = new Map<string, Team>();

    teams.forEach(team => {
      const captain = team.captainPlayerId
        ? players.find(p => p.id === team.captainPlayerId)
        : players.find(p => p.captainOfTeamId === team.id || ((p.teamId === team.id || team.squad.includes(p.id)) && p.isCaptain) || (team.captain && p.name.trim().toLowerCase() === team.captain.trim().toLowerCase()));

      if (!captain) return;

      const oldCost = captain.soldPrice || 0;
      const netDiff = cost - oldCost;
      if (netDiff > team.remainingBudget) return;

      const tm = getTeamGradeMetrics(team, players, rules);
      if (tm.viceCaptainCost + cost > 50000) return;

      affectedCount++;
      const updatedCap: Player = {
        ...captain,
        isCaptain: true,
        isPreAssignedCaptain: true,
        captainOfTeamId: team.id,
        teamId: team.id,
        status: 'sold' as PlayerStatus,
        soldPrice: cost,
      };
      updatedPlayersMap.set(captain.id, updatedCap);
      savePlayerOverride(captain.id, {
        isCaptain: true,
        isPreAssignedCaptain: true,
        soldPrice: cost,
        teamId: team.id,
      });

      const startBudget = team.startingBudget || rules.startingBudget || 100000;
      const vc = team.viceCaptainPlayerId
        ? players.find(p => p.id === team.viceCaptainPlayerId)
        : players.find(p => p.viceCaptainOfTeamId === team.id || ((p.teamId === team.id || team.squad.includes(p.id)) && p.isViceCaptain));
      const vcCost = Number(vc?.soldPrice || 0);

      const txSpent = (transactions || [])
        .filter(tx => !tx.undone && tx.teamId === team.id)
        .reduce((sum, tx) => sum + (tx.soldPrice || 0), 0);

      const totalSpent = cost + vcCost + txSpent;
      const remainingBudget = Math.max(0, startBudget - totalSpent);

      updatedTeamsMap.set(team.id, {
        ...team,
        captain: captain.name,
        captainPlayerId: captain.id,
        startingBudget: startBudget,
        remainingBudget,
        totalSpent,
        squad: team.squad.includes(captain.id) ? team.squad : [...team.squad, captain.id],
      });
    });

    if (affectedCount === 0) {
      return { success: false, count: 0, message: 'No allotted captains found to update.' };
    }

    const nextPlayers = players.map(p => updatedPlayersMap.get(p.id) || p);
    const nextTeams = teams.map(t => updatedTeamsMap.get(t.id) || t);
    setPlayers(nextPlayers);
    setTeams(nextTeams);
    saveStoredState({ teams: nextTeams, players: nextPlayers });

    const newRules = { ...rules, captainCostMode: (cost > 0 ? 'custom' : 'zero') as 'custom' | 'zero', captainCustomCost: cost };
    setRules(newRules);

    const snapshotState: AppStoredState = {
      teams: nextTeams,
      players: nextPlayers,
      transactions,
      rules: newRules,
      tournament,
      currentPlayerId,
      currentBid,
      currentBidderId,
      bidHistory,
      auctionOrderMode,
      customAuctionOrderIds,
      lastSaved: new Date().toISOString(),
    };
    broadcastState(snapshotState);
    pushStateToServer(snapshotState);
    logAndPersistSave('auto', `Applied ₹${cost.toLocaleString('en-IN')} captain cost across ${affectedCount} franchises (purses updated)`);

    return {
      success: true,
      count: affectedCount,
      message: `Successfully set ₹${cost.toLocaleString('en-IN')} captain cost across ${affectedCount} franchises! Team purses updated.`,
    };
  }, [teams, players, rules, transactions, tournament, currentPlayerId, currentBid, currentBidderId, bidHistory, auctionOrderMode, customAuctionOrderIds, broadcastState, pushStateToServer, logAndPersistSave]);

  // APPLY VICE-CAPTAIN COST ACROSS ALL ALLOTTED TEAMS (IMMEDIATE PURSE DEDUCTION)
  const applyViceCaptainCostToAllAllotted = useCallback((cost: number): { success: boolean; count: number; message: string } => {
    let affectedCount = 0;
    const updatedPlayersMap = new Map<string, Player>();
    const updatedTeamsMap = new Map<string, Team>();

    teams.forEach(team => {
      const vc = team.viceCaptainPlayerId
        ? players.find(p => p.id === team.viceCaptainPlayerId)
        : players.find(p => p.viceCaptainOfTeamId === team.id || ((p.teamId === team.id || team.squad.includes(p.id)) && p.isViceCaptain) || (team.viceCaptain && p.name.trim().toLowerCase() === team.viceCaptain.trim().toLowerCase()));

      if (!vc) return;

      const oldCost = vc.soldPrice || 0;
      const netDiff = cost - oldCost;
      if (netDiff > team.remainingBudget) return;

      const tm = getTeamGradeMetrics(team, players, rules);
      if (tm.captainCost + cost > 50000) return;

      affectedCount++;
      const updatedVc: Player = {
        ...vc,
        isViceCaptain: true,
        isPreAssignedViceCaptain: true,
        viceCaptainOfTeamId: team.id,
        teamId: team.id,
        status: 'sold' as PlayerStatus,
        soldPrice: cost,
      };
      updatedPlayersMap.set(vc.id, updatedVc);
      savePlayerOverride(vc.id, {
        isViceCaptain: true,
        isPreAssignedViceCaptain: true,
        soldPrice: cost,
        teamId: team.id,
      });

      const startBudget = team.startingBudget || rules.startingBudget || 100000;
      const cap = team.captainPlayerId
        ? players.find(p => p.id === team.captainPlayerId)
        : players.find(p => p.captainOfTeamId === team.id || ((p.teamId === team.id || team.squad.includes(p.id)) && p.isCaptain) || (team.captain && p.name.trim().toLowerCase() === team.captain.trim().toLowerCase()));
      const capCost = Number(cap?.soldPrice || 0);

      const txSpent = (transactions || [])
        .filter(tx => !tx.undone && tx.teamId === team.id)
        .reduce((sum, tx) => sum + (tx.soldPrice || 0), 0);

      const totalSpent = capCost + cost + txSpent;
      const remainingBudget = Math.max(0, startBudget - totalSpent);

      updatedTeamsMap.set(team.id, {
        ...team,
        viceCaptain: vc.name,
        viceCaptainPlayerId: vc.id,
        startingBudget: startBudget,
        remainingBudget,
        totalSpent,
        squad: team.squad.includes(vc.id) ? team.squad : [...team.squad, vc.id],
      });
    });

    if (affectedCount === 0) {
      return { success: false, count: 0, message: 'No allotted vice-captains found to update.' };
    }

    const nextPlayers = players.map(p => updatedPlayersMap.get(p.id) || p);
    const nextTeams = teams.map(t => updatedTeamsMap.get(t.id) || t);
    setPlayers(nextPlayers);
    setTeams(nextTeams);
    saveStoredState({ teams: nextTeams, players: nextPlayers });

    const newRules = { ...rules, captainCostMode: (cost > 0 ? 'custom' : 'zero') as 'custom' | 'zero', captainCustomCost: cost };
    setRules(newRules);

    const snapshotState: AppStoredState = {
      teams: nextTeams,
      players: nextPlayers,
      transactions,
      rules: newRules,
      tournament,
      currentPlayerId,
      currentBid,
      currentBidderId,
      bidHistory,
      auctionOrderMode,
      customAuctionOrderIds,
      lastSaved: new Date().toISOString(),
    };
    broadcastState(snapshotState);
    pushStateToServer(snapshotState);
    logAndPersistSave('auto', `Applied ₹${cost.toLocaleString('en-IN')} vice-captain cost across ${affectedCount} franchises (purses updated)`);

    return {
      success: true,
      count: affectedCount,
      message: `Successfully set ₹${cost.toLocaleString('en-IN')} vice-captain cost across ${affectedCount} franchises! Team purses updated.`,
    };
  }, [teams, players, rules, transactions, tournament, currentPlayerId, currentBid, currentBidderId, bidHistory, auctionOrderMode, customAuctionOrderIds, broadcastState, pushStateToServer, logAndPersistSave]);

  // START AUCTION FOR A PLAYER
  const startAuctionForPlayer = useCallback((playerId: string) => {
    const ply = players.find(p => p.id === playerId);
    if (!ply) return;

    // Reset current auction round
    setCurrentPlayerId(playerId);
    setCurrentBid(ply.basePrice);
    setCurrentBidderId(null);
    setBidHistory([]);
    setIsTimerRunning(false);
    setTimerSeconds(rules.timerDuration);

    // Update player status to in_auction
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, status: 'in_auction' } : p));
  }, [players, rules.timerDuration]);

  // PLACE BID
  const placeBid = useCallback((
    teamId: string,
    incrementOrAmount?: number,
    isAbsoluteAmount: boolean = false
  ): { success: boolean; message?: string } => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return { success: false, message: 'Team not found.' };
    if (!currentPlayer) return { success: false, message: 'No player is currently on the auction block.' };

    let newBidAmount = 0;
    if (isAbsoluteAmount && incrementOrAmount) {
      newBidAmount = incrementOrAmount;
    } else {
      const increment = incrementOrAmount !== undefined ? incrementOrAmount : rules.minBidIncrement;
      newBidAmount = (currentBidderId === null) ? currentPlayer.basePrice : currentBid + increment;
    }

    // Rules validation
    if (newBidAmount <= 0) {
      return { success: false, message: 'Bid amount must be positive.' };
    }

    if (currentBidderId !== null && newBidAmount <= currentBid) {
      return { success: false, message: `New bid (${newBidAmount.toLocaleString()}) must exceed current bid (${currentBid.toLocaleString()}).` };
    }

    // Team Budget validation (Points cannot overflow)
    if (newBidAmount > team.remainingBudget) {
      return { 
        success: false, 
        message: `Insufficient budget! ${team.name} has only ${team.remainingBudget.toLocaleString()} points remaining.` 
      };
    }

    // Centralized auction rules & squad validation (Squad capacity & smart purse reserve)
    const purchaseValidation = validatePurchase(team, currentPlayer, newBidAmount, players, rules);
    if (!purchaseValidation.isValid) {
      return { success: false, message: purchaseValidation.error };
    }

    // Dynamic spending optimization check (Max allowable bid)
    const { maxBid, reason } = calculateMaxBidForTeam(team, rules, currentPlayer, players);
    if (newBidAmount > maxBid) {
      return {
        success: false,
        message: `Overspending Alert! ${team.name} can bid at most ${maxBid.toLocaleString()} pts. ${reason || 'Must reserve purse for remaining squad slots.'}`
      };
    }

    // Grade & Category Maximum Bidding Limits (Part 2, Req 9)
    const gradeCatCap = getGradeCategoryMaxBid(currentPlayer);
    if (gradeCatCap !== null && newBidAmount > gradeCatCap) {
      return {
        success: false,
        message: `Category Cap Exceeded! Grade ${currentPlayer.grade} ${currentPlayer.role} has a maximum bid limit of ${gradeCatCap.toLocaleString()} pts.`
      };
    }

    // Max Squad limit validation
    if (team.squad.length >= rules.squadRules.maxSquadSize) {
      return { 
        success: false, 
        message: `Squad full! ${team.name} already has maximum ${rules.squadRules.maxSquadSize} players.` 
      };
    }

    const squadPlayers = players.filter(p => team.squad.includes(p.id));

    // Sponsor limit check: Max 1 sponsor per team
    const isCurrentPlayerSponsored = !!(currentPlayer.isSponsored || (currentPlayer.sponsorTag && currentPlayer.sponsorTag.trim()));
    if (isCurrentPlayerSponsored) {
      const existingSponsored = squadPlayers.find(p => p.isSponsored || (p.sponsorTag && p.sponsorTag.trim()));
      if (existingSponsored) {
        return {
          success: false,
          message: `Sponsor limit reached! ${team.name} already has a sponsored player (${existingSponsored.name}${existingSponsored.sponsorTag ? ` - ${existingSponsored.sponsorTag}` : ''}). Each team can have at most 1 sponsored player.`
        };
      }
    }


    // Record bid
    const newRecord: BidRecord = {
      id: `bid-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      auctionId: `auc-${currentPlayer.id}`,
      playerId: currentPlayer.id,
      teamId: team.id,
      teamName: team.name,
      amount: newBidAmount,
      timestamp: new Date().toISOString(),
    };

    setCurrentBid(newBidAmount);
    setCurrentBidderId(team.id);
    const updatedHistory = [newRecord, ...bidHistory];
    setBidHistory(updatedHistory);

    // Save bid to persistent state immediately
    saveStoredState({
      currentBid: newBidAmount,
      currentBidderId: team.id,
      bidHistory: updatedHistory,
      currentPlayerId: currentPlayer.id,
    });

    // Record bid audit log
    const prevAmount = currentBid;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const logEntry: SaveLogEntry = {
      id: `bid-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now.toISOString(),
      type: 'bid',
      status: 'success',
      action: 'Bid Placed',
      playerName: currentPlayer.name,
      playerId: currentPlayer.id,
      fieldChanged: 'Highest Bid',
      previousValue: prevAmount > 0 ? `₹${prevAmount.toLocaleString('en-IN')}` : 'Base Price',
      newValue: `₹${newBidAmount.toLocaleString('en-IN')} (${team.name})`,
      modifiedBy: team.name,
      date: dateStr,
      time: timeStr,
      description: `Bid Placed: ${team.name} bid ₹${newBidAmount.toLocaleString('en-IN')} on ${currentPlayer.name} (Lot #${currentPlayer.auctionOrder || 1})`,
    };
    appendSaveLog(logEntry);
    setSaveLogs(prev => [logEntry, ...prev.filter(l => l.id !== logEntry.id)].slice(0, 500));

    // Reset timer on new bid
    setTimerSeconds(rules.timerDuration);
    soundFx.playBid();

    return { success: true };
  }, [teams, currentPlayer, currentBidderId, currentBid, rules, players, bidHistory]);

  // UNDO LAST BID
  const undoLastBid = useCallback(() => {
    if (bidHistory.length === 0) return;

    if (bidHistory.length === 1) {
      // Revert to initial state for current player
      setBidHistory([]);
      setCurrentBidderId(null);
      setCurrentBid(currentPlayer ? currentPlayer.basePrice : 0);
    } else {
      const remainingHistory = bidHistory.slice(1);
      const previousBid = remainingHistory[0];
      setBidHistory(remainingHistory);
      setCurrentBid(previousBid.amount);
      setCurrentBidderId(previousBid.teamId);
    }
  }, [bidHistory, currentPlayer]);

  // MARK PLAYER SOLD
  const markPlayerSold = useCallback((): { success: boolean; message?: string } => {
    if (!currentPlayer) return { success: false, message: 'No active player in auction.' };
    if (!currentBidderId) return { success: false, message: 'No team has placed a bid for this player yet. Use Unsold if no bids.' };

    const winningTeam = teams.find(t => t.id === currentBidderId);
    if (!winningTeam) return { success: false, message: 'Winning team could not be resolved.' };

    const finalPrice = currentBid;

    // Strict squad composition and smart reserve validation
    const saleValidation = validatePurchase(winningTeam, currentPlayer, finalPrice, players, rules);
    if (!saleValidation.isValid) {
      return { success: false, message: saleValidation.error };
    }

    // 1. Update Team Budget & Squad (Overflow guarded)
    const updatedTeams = teams.map(t => {
      if (t.id === winningTeam.id) {
        return {
          ...t,
          remainingBudget: Math.max(0, t.remainingBudget - finalPrice),
          totalSpent: t.totalSpent + finalPrice,
          squad: [...t.squad, currentPlayer.id],
        };
      }
      return t;
    });
    setTeams(updatedTeams);

    // 2. Update Player Status
    const updatedPlayers = players.map(p => {
      if (p.id === currentPlayer.id) {
        return {
          ...p,
          status: 'sold' as const,
          teamId: winningTeam.id,
          soldPrice: finalPrice,
        };
      }
      return p;
    });
    setPlayers(updatedPlayers);

    const txId = `tx-${Date.now()}`;
    const tx: AuctionTransaction = {
      id: txId,
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      playerRole: currentPlayer.role,
      playerGrade: currentPlayer.grade,
      teamId: winningTeam.id,
      teamName: winningTeam.name,
      basePrice: currentPlayer.basePrice,
      soldPrice: finalPrice,
      timestamp: new Date().toISOString(),
      bidHistory: [...bidHistory],
    };
    const updatedTransactions = [tx, ...transactions];
    setTransactions(updatedTransactions);

    // Persist sold state to storage immediately
    saveStoredState({
      teams: updatedTeams,
      players: updatedPlayers,
      transactions: updatedTransactions,
      currentPlayerId: null,
      currentBid: 0,
      currentBidderId: null,
      bidHistory: [],
    });

    // Record detailed audit log
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logEntry: SaveLogEntry = {
      id: `sale-${currentPlayer.id}-${Date.now()}`,
      timestamp: now.toISOString(),
      type: 'sale',
      status: 'success',
      action: 'Player Sold',
      playerName: currentPlayer.name,
      playerId: currentPlayer.id,
      fieldChanged: 'Status, Team, Price',
      previousValue: `Upcoming (Base ₹${currentPlayer.basePrice.toLocaleString('en-IN')})`,
      newValue: `Sold to ${winningTeam.name} for ₹${finalPrice.toLocaleString('en-IN')}`,
      modifiedBy: 'Auctioneer',
      date: dateStr,
      time: timeStr,
      description: `Auction Sale: ${currentPlayer.name} (Grade ${currentPlayer.grade}) sold to ${winningTeam.name} for ₹${finalPrice.toLocaleString('en-IN')} points`,
    };
    appendSaveLog(logEntry);
    setSaveLogs(prev => [logEntry, ...prev.filter(l => l.id !== logEntry.id)].slice(0, 500));

    // Track for 1-click Undo
    setLastActionResult({
      type: 'sold',
      player: currentPlayer,
      teamId: winningTeam.id,
      teamName: winningTeam.name,
      soldPrice: finalPrice,
      transactionId: txId,
      bidHistory: [...bidHistory],
      currentBid,
      currentBidderId,
    });

    // 4. Effects
    soundFx.playGavel();
    soundFx.playFanfare();
    if (rules.animationsEnabled) {
      triggerSoldConfetti();
    }

    // 5. Clear auction state for next player
    setIsTimerRunning(false);
    setCurrentPlayerId(null);
    setCurrentBid(0);
    setCurrentBidderId(null);
    setBidHistory([]);

    return { success: true };
  }, [currentPlayer, currentBidderId, teams, currentBid, bidHistory, rules.animationsEnabled, players, transactions]);

  // DIRECT SELL PLAYER (Single-screen quick assignment or direct from list)
  const directSellPlayer = useCallback((teamId: string, amount: number, playerToSell?: Player): { success: boolean; message?: string } => {
    const target = playerToSell || currentPlayer;
    if (!target) return { success: false, message: 'No active player selected for direct sell.' };
    if (target.status === 'sold') return { success: false, message: `${target.name} is already sold.` };

    const team = teams.find(t => t.id === teamId);
    if (!team) return { success: false, message: 'Selected franchise not found.' };

    if (amount <= 0) {
      return { success: false, message: 'Sale amount must be greater than 0.' };
    }

    if (team.squad.length >= rules.squadRules.maxSquadSize) {
      return { success: false, message: `Squad full! ${team.name} already has maximum ${rules.squadRules.maxSquadSize} players.` };
    }

    if (amount > team.remainingBudget) {
      return { success: false, message: `Insufficient budget! ${team.name} has only ${team.remainingBudget.toLocaleString()} points remaining.` };
    }

    // Centralized auction rules & squad validation (Squad capacity & smart purse reserve)
    const directSellValidation = validatePurchase(team, target, amount, players, rules);
    if (!directSellValidation.isValid) {
      return { success: false, message: directSellValidation.error };
    }

    const { maxBid, reason } = calculateMaxBidForTeam(team, rules, target, players);
    if (amount > maxBid) {
      return {
        success: false,
        message: `Overspending Alert! ${team.name} can spend at most ${maxBid.toLocaleString()} pts. ${reason || 'Must reserve purse for remaining squad slots.'}`
      };
    }

    const squadPlayers = players.filter(p => team.squad.includes(p.id));
    const isTargetSponsored = !!(target.isSponsored || (target.sponsorTag && target.sponsorTag.trim()));
    if (isTargetSponsored) {
      const existingSponsored = squadPlayers.find(p => p.isSponsored || (p.sponsorTag && p.sponsorTag.trim()));
      if (existingSponsored) {
        return {
          success: false,
          message: `Sponsor limit reached! ${team.name} already has a sponsored player (${existingSponsored.name}${existingSponsored.sponsorTag ? ` - ${existingSponsored.sponsorTag}` : ''}). Each team can have at most 1 sponsored player.`
        };
      }
    }

    const finalPrice = amount;

    const updatedTeams = teams.map(t => {
      if (t.id === team.id) {
        return {
          ...t,
          remainingBudget: Math.max(0, t.remainingBudget - finalPrice),
          totalSpent: t.totalSpent + finalPrice,
          squad: [...t.squad, target.id],
        };
      }
      return t;
    });
    setTeams(updatedTeams);

    const updatedPlayers = players.map(p => {
      if (p.id === target.id) {
        return {
          ...p,
          status: 'sold' as const,
          teamId: team.id,
          soldPrice: finalPrice,
        };
      }
      return p;
    });
    setPlayers(updatedPlayers);

    const txId = `tx-${Date.now()}`;
    const tx: AuctionTransaction = {
      id: txId,
      playerId: target.id,
      playerName: target.name,
      playerRole: target.role,
      playerGrade: target.grade,
      teamId: team.id,
      teamName: team.name,
      basePrice: target.basePrice,
      soldPrice: finalPrice,
      timestamp: new Date().toISOString(),
      bidHistory: [...bidHistory],
    };
    const updatedTransactions = [tx, ...transactions];
    setTransactions(updatedTransactions);

    // Save state immediately
    const isOnBlock = currentPlayer?.id === target.id;
    saveStoredState({
      teams: updatedTeams,
      players: updatedPlayers,
      transactions: updatedTransactions,
      ...(isOnBlock ? {
        currentPlayerId: null,
        currentBid: 0,
        currentBidderId: null,
        bidHistory: [],
      } : {}),
    });

    // Record audit log
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logEntry: SaveLogEntry = {
      id: `direct-sell-${target.id}-${Date.now()}`,
      timestamp: now.toISOString(),
      type: 'direct_sell',
      status: 'success',
      action: 'Direct Sell Completed',
      playerName: target.name,
      playerId: target.id,
      fieldChanged: 'Status, Team, Price',
      previousValue: `Upcoming (Base ₹${target.basePrice.toLocaleString('en-IN')})`,
      newValue: `Sold to ${team.name} for ₹${finalPrice.toLocaleString('en-IN')}`,
      modifiedBy: 'Administrator',
      date: dateStr,
      time: timeStr,
      description: `Direct Sell: ${target.name} (Grade ${target.grade}) directly sold to ${team.name} for ₹${finalPrice.toLocaleString('en-IN')} points`,
    };
    appendSaveLog(logEntry);
    setSaveLogs(prev => [logEntry, ...prev.filter(l => l.id !== logEntry.id)].slice(0, 500));

    if (isOnBlock) {
      setLastActionResult({
        type: 'sold',
        player: target,
        teamId: team.id,
        teamName: team.name,
        soldPrice: finalPrice,
        transactionId: txId,
        bidHistory: [...bidHistory],
        currentBid: finalPrice,
        currentBidderId: team.id,
      });

      soundFx.playGavel();
      soundFx.playFanfare();
      if (rules.animationsEnabled) {
        triggerSoldConfetti();
      }

      setIsTimerRunning(false);
      setCurrentPlayerId(null);
      setCurrentBid(0);
      setCurrentBidderId(null);
      setBidHistory([]);
    } else {
      soundFx.playGavel();
      if (rules.animationsEnabled) {
        triggerSoldConfetti();
      }
    }

    return { success: true };
  }, [currentPlayer, teams, players, rules, bidHistory, transactions, getGradeCategoryMaxBid]);

  // DIRECT ADD PLAYER TO TEAM (Administrator Direct Addition)
  const directAddPlayerToTeam = useCallback((
    teamId: string,
    playerId: string,
    amount: number
  ): { success: boolean; message: string } => {
    const targetPlayer = players.find(p => p.id === playerId);
    if (!targetPlayer) return { success: false, message: 'Player not found in database.' };

    const targetTeam = teams.find(t => t.id === teamId);
    if (!targetTeam) return { success: false, message: 'Purchasing franchise not found.' };

    if (targetPlayer.status === 'sold' || targetTeam.squad.includes(playerId)) {
      return { success: false, message: `${targetPlayer.name} is already sold or assigned to a franchise.` };
    }

    const maxSquadSize = rules?.squadRules?.maxSquadSize ?? 9;
    if (targetTeam.squad.length >= maxSquadSize) {
      return { success: false, message: `Squad limit reached! ${targetTeam.name} already has ${maxSquadSize} players.` };
    }

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 1000) {
      return { success: false, message: 'Purchase price must be at least ₹1,000 points.' };
    }

    if (amount > targetTeam.remainingBudget) {
      return {
        success: false,
        message: `Insufficient purse! ${targetTeam.name} has only ₹${targetTeam.remainingBudget.toLocaleString('en-IN')} points remaining.`
      };
    }

    // Smart Reserve check
    const slotsRemainingAfterThis = Math.max(0, maxSquadSize - targetTeam.squad.length - 1);
    const minReserveRequired = slotsRemainingAfterThis * 1000;
    if (amount > targetTeam.remainingBudget - minReserveRequired) {
      return {
        success: false,
        message: `Smart Reserve requirement! ${targetTeam.name} must reserve at least ₹${minReserveRequired.toLocaleString('en-IN')} points for the remaining ${slotsRemainingAfterThis} squad slot${slotsRemainingAfterThis !== 1 ? 's' : ''} (min ₹1,000/player). Max allowable price is ₹${Math.max(0, targetTeam.remainingBudget - minReserveRequired).toLocaleString('en-IN')}.`
      };
    }

    const validation = validatePurchase(targetTeam, targetPlayer, amount, players, rules);
    if (!validation.isValid) {
      return { success: false, message: validation.error || 'Validation failed.' };
    }

    const previousStatus = targetPlayer.status;
    const previousTeamId = targetPlayer.teamId;

    // 1. Update Player
    const updatedPlayers = players.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          status: 'sold' as const,
          teamId: targetTeam.id,
          soldPrice: amount,
        };
      }
      return p;
    });

    // 2. Update Team
    const updatedTeams = teams.map(t => {
      if (t.id === targetTeam.id) {
        const nextSquad = t.squad.includes(playerId) ? t.squad : [...t.squad, playerId];
        return {
          ...t,
          squad: nextSquad,
          remainingBudget: Math.max(0, t.remainingBudget - amount),
          totalSpent: t.totalSpent + amount,
        };
      }
      return t;
    });

    // 3. Create Transaction
    const txId = `tx-direct-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newTx: AuctionTransaction = {
      id: txId,
      playerId,
      playerName: targetPlayer.name,
      playerRole: targetPlayer.role,
      playerGrade: targetPlayer.grade,
      teamId: targetTeam.id,
      teamName: targetTeam.name,
      basePrice: targetPlayer.basePrice || 1000,
      soldPrice: amount,
      timestamp: new Date().toISOString(),
      bidHistory: [],
    };
    const updatedTx = [newTx, ...transactions];

    // 4. Update Current Player if this was currentPlayer
    if (currentPlayerId === playerId) {
      setCurrentPlayerId(null);
      setCurrentBid(0);
      setCurrentBidderId(null);
    }

    // 5. Update state
    setPlayers(updatedPlayers);
    setTeams(updatedTeams);
    setTransactions(updatedTx);

    // 6. Sound & animation
    soundFx.playGavel();
    if (rules.animationsEnabled) {
      triggerSoldConfetti();
    }

    // 7. Log & persist permanently
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logEntry: SaveLogEntry = {
      id: `direct-add-${targetPlayer.id}-${Date.now()}`,
      timestamp: now.toISOString(),
      type: 'direct_sell',
      status: 'success',
      action: 'Direct Player Added',
      playerName: targetPlayer.name,
      playerId: targetPlayer.id,
      fieldChanged: 'Status, Team, Price',
      previousValue: `Upcoming (Base ₹${(targetPlayer.basePrice || 1000).toLocaleString('en-IN')})`,
      newValue: `Sold to ${targetTeam.name} for ₹${amount.toLocaleString('en-IN')}`,
      modifiedBy: 'Administrator',
      date: dateStr,
      time: timeStr,
      description: `Direct Player Add: ${targetPlayer.name} directly added to ${targetTeam.name} squad for ₹${amount.toLocaleString('en-IN')} points`,
    };
    appendSaveLog(logEntry);
    setSaveLogs(prev => [logEntry, ...prev.filter(l => l.id !== logEntry.id)].slice(0, 500));

    saveStoredState({
      players: updatedPlayers,
      teams: updatedTeams,
      transactions: updatedTx,
    });

    return {
      success: true,
      message: `Successfully added ${targetPlayer.name} to ${targetTeam.name} for ₹${amount.toLocaleString('en-IN')} points!`,
    };
  }, [players, teams, rules, transactions, currentPlayer, logAndPersistSave]);

  // MARK PLAYER UNSOLD
  const markPlayerUnsold = useCallback(() => {
    if (!currentPlayer) return;

    // Track for 1-click Undo
    setLastActionResult({
      type: 'unsold',
      player: currentPlayer,
      teamId: null,
      soldPrice: null,
      bidHistory: [...bidHistory],
      currentBid,
      currentBidderId,
    });

    const updatedPlayers = players.map(p => {
      if (p.id === currentPlayer.id) {
        return {
          ...p,
          status: 'unsold' as const,
          teamId: null,
          soldPrice: null,
        };
      }
      return p;
    });
    setPlayers(updatedPlayers);

    // Save unsold state immediately
    saveStoredState({
      players: updatedPlayers,
      currentPlayerId: null,
      currentBid: 0,
      currentBidderId: null,
      bidHistory: [],
    });

    // Record audit log
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logEntry: SaveLogEntry = {
      id: `unsold-${currentPlayer.id}-${Date.now()}`,
      timestamp: now.toISOString(),
      type: 'unsold',
      status: 'success',
      action: 'Player Unsold',
      playerName: currentPlayer.name,
      playerId: currentPlayer.id,
      fieldChanged: 'Status',
      previousValue: 'Status: In Auction',
      newValue: 'Status: Unsold',
      modifiedBy: 'Auctioneer',
      date: dateStr,
      time: timeStr,
      description: `Player Unsold: ${currentPlayer.name} (Grade ${currentPlayer.grade}) marked unsold at base price ₹${currentPlayer.basePrice.toLocaleString('en-IN')}`,
    };
    appendSaveLog(logEntry);
    setSaveLogs(prev => [logEntry, ...prev.filter(l => l.id !== logEntry.id)].slice(0, 500));

    soundFx.playUnsold();

    setIsTimerRunning(false);
    setCurrentPlayerId(null);
    setCurrentBid(0);
    setCurrentBidderId(null);
    setBidHistory([]);
  }, [currentPlayer, currentBid, currentBidderId, bidHistory, players]);

  // UNDO LAST AUCTION RESULT (SOLD OR UNSOLD)
  const undoLastResult = useCallback((): { success: boolean; message: string } => {
    if (!lastActionResult) {
      return { success: false, message: 'No recent auction result to undo.' };
    }

    const { type, player, teamId, soldPrice, transactionId, bidHistory: savedHistory, currentBid: savedBid, currentBidderId: savedBidder } = lastActionResult;

    if (type === 'sold' && teamId && soldPrice) {
      // 1. Refund team budget & remove from squad
      setTeams(prev => prev.map(t => {
        if (t.id === teamId) {
          return {
            ...t,
            remainingBudget: t.remainingBudget + soldPrice,
            totalSpent: Math.max(0, t.totalSpent - soldPrice),
            squad: t.squad.filter(id => id !== player.id),
          };
        }
        return t;
      }));

      // 2. Remove recorded transaction
      if (transactionId) {
        setTransactions(prev => prev.filter(t => t.id !== transactionId));
      }
    }

    // 3. Revert player status to 'in_auction'
    setPlayers(prev => prev.map(p => {
      if (p.id === player.id) {
        return {
          ...p,
          status: 'in_auction',
          teamId: null,
          soldPrice: null,
        };
      }
      return p;
    }));

    // 4. Restore auction cockpit state
    setCurrentPlayerId(player.id);
    setCurrentBid(savedBid);
    setCurrentBidderId(savedBidder);
    setBidHistory(savedHistory);
    setIsTimerRunning(false);
    setTimerSeconds(rules.timerDuration);

    const playerName = player.name;
    setLastActionResult(null);

    return {
      success: true,
      message: `Reverted ${type === 'sold' ? 'sale' : 'unsold decision'} for ${playerName}. Player restored to active lot!`,
    };
  }, [lastActionResult, rules.timerDuration]);

  // SKIP / NEXT UPCOMING PLAYER
  const skipOrNextPlayer = useCallback(() => {
    const ordered = getOrderedUpcomingPlayers();
    if (ordered.length > 0) {
      startAuctionForPlayer(ordered[0].id);
    }
  }, [getOrderedUpcomingPlayers, startAuctionForPlayer]);

  // RE-AUCTION AN UNSOLD PLAYER
  const reAuctionPlayer = useCallback((playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          status: 'upcoming',
        };
      }
      return p;
    }));

    startAuctionForPlayer(playerId);
  }, [players, startAuctionForPlayer]);

  // UNDO TRANSACTION
  const undoTransaction = useCallback((transactionId: string) => {
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx || tx.undone) return;

    // 1. Restore team budget & remove from squad
    const updatedTeams = teams.map(t => {
      if (t.id === tx.teamId) {
        return {
          ...t,
          remainingBudget: t.remainingBudget + tx.soldPrice,
          totalSpent: Math.max(0, t.totalSpent - tx.soldPrice),
          squad: t.squad.filter(id => id !== tx.playerId),
        };
      }
      return t;
    });
    setTeams(updatedTeams);

    // 2. Return player to upcoming pool
    const updatedPlayers = players.map(p => {
      if (p.id === tx.playerId) {
        return {
          ...p,
          status: 'upcoming' as const,
          teamId: null,
          soldPrice: null,
        };
      }
      return p;
    });
    setPlayers(updatedPlayers);

    // 3. Mark transaction as undone
    const updatedTransactions = transactions.map(t => t.id === transactionId ? { ...t, undone: true } : t);
    setTransactions(updatedTransactions);

    // 4. Save state immediately
    saveStoredState({
      teams: updatedTeams,
      players: updatedPlayers,
      transactions: updatedTransactions,
    });

    // 5. Record audit log
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logEntry: SaveLogEntry = {
      id: `undo-${tx.playerId}-${Date.now()}`,
      timestamp: now.toISOString(),
      type: 'manual',
      status: 'success',
      action: 'Sale Undone',
      playerName: tx.playerName,
      playerId: tx.playerId,
      fieldChanged: 'Status, Team, Price',
      previousValue: `Sold to ${tx.teamName} for ₹${tx.soldPrice.toLocaleString('en-IN')}`,
      newValue: 'Status: Upcoming',
      modifiedBy: 'Administrator',
      date: dateStr,
      time: timeStr,
      description: `Sale Undone: ${tx.playerName} returned to upcoming pool; ₹${tx.soldPrice.toLocaleString('en-IN')} refunded to ${tx.teamName}`,
    };
    appendSaveLog(logEntry);
    setSaveLogs(prev => [logEntry, ...prev.filter(l => l.id !== logEntry.id)].slice(0, 500));
  }, [transactions, teams, players]);

  // ADD PLAYER (Guarded against duplicate entries)
  const addPlayer = useCallback((playerData: Omit<Player, 'id' | 'status'>): Player => {
    const nameKey = canonicalPlayerNameKey(playerData.name);
    const existing = players.find(p => canonicalPlayerNameKey(p.name) === nameKey);
    if (existing) {
      const updated: Player = {
        ...existing,
        ...playerData,
        grade: normalizeGrade(playerData.grade || existing.grade),
      };
      setPlayers(prev => {
        const next = deduplicatePlayers(prev.map(p => p.id === existing.id ? updated : p));
        saveStoredState({ players: next });
        return next;
      });
      return updated;
    }

    const newId = `ply-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newPlayer: Player = {
      ...playerData,
      id: newId,
      grade: normalizeGrade(playerData.grade),
      status: 'upcoming',
      auctionOrder: players.length + 1,
    };

    setPlayers(prev => {
      const updated = deduplicatePlayers([...prev, newPlayer]);
      saveStoredState({ players: updated });
      return updated;
    });
    return newPlayer;
  }, [players]);

  // EDIT PLAYER (With permanent storage and detailed audit logging)
  const editPlayer = useCallback((rawPlayer: Player, modifiedBy: string = 'Administrator') => {
    // 0. Ensure player grade is normalized
    const updatedPlayer: Player = {
      ...rawPlayer,
      grade: normalizeGrade(rawPlayer.grade),
    };

    // 1. Get previous player synchronously from current state
    const oldPlayer = players.find(p => p.id === updatedPlayer.id);

    // 2. Save permanent override immediately (in localStorage and server disk)
    savePlayerOverride(updatedPlayer.id, {
      name: updatedPlayer.name,
      grade: updatedPlayer.grade,
      basePrice: updatedPlayer.basePrice,
      role: updatedPlayer.role,
      age: updatedPlayer.age,
      stats: updatedPlayer.stats,
      photo: updatedPlayer.photo,
      battingStyle: updatedPlayer.battingStyle,
      bowlingStyle: updatedPlayer.bowlingStyle,
      sponsorTag: updatedPlayer.sponsorTag,
      isCaptain: updatedPlayer.isCaptain,
      isViceCaptain: updatedPlayer.isViceCaptain,
    });

    // 3. Update players state and persist state immediately
    setPlayers(prev => {
      const updated = prev.map(p => p.id === updatedPlayer.id ? { ...p, ...updatedPlayer } : p);
      saveStoredState({ players: updated });
      return updated;
    });

    // 3a. If this player is currently on the auction block and no bids placed yet, refresh starting bid
    if (currentPlayerId === updatedPlayer.id && currentBidderId === null) {
      setCurrentBid(updatedPlayer.basePrice);
    }

    // 4. Compute changed fields for the audit log
    const changedFields: string[] = [];
    let previousValueStr = '';
    let newValueStr = '';

    if (oldPlayer) {
      if (oldPlayer.grade !== updatedPlayer.grade) {
        changedFields.push('Grade');
        previousValueStr = `Grade: ${oldPlayer.grade}`;
        newValueStr = `Grade: ${updatedPlayer.grade}`;
      }
      if (oldPlayer.basePrice !== updatedPlayer.basePrice) {
        changedFields.push('Base Price');
        previousValueStr = previousValueStr ? `${previousValueStr}, ₹${oldPlayer.basePrice}` : `₹${oldPlayer.basePrice}`;
        newValueStr = newValueStr ? `${newValueStr}, ₹${updatedPlayer.basePrice}` : `₹${updatedPlayer.basePrice}`;
      }
      if (oldPlayer.name !== updatedPlayer.name) {
        changedFields.push('Name');
        previousValueStr = previousValueStr ? `${previousValueStr}, ${oldPlayer.name}` : oldPlayer.name;
        newValueStr = newValueStr ? `${newValueStr}, ${updatedPlayer.name}` : updatedPlayer.name;
      }
      if (oldPlayer.role !== updatedPlayer.role) {
        changedFields.push('Role');
      }
      if (JSON.stringify(oldPlayer.stats) !== JSON.stringify(updatedPlayer.stats)) {
        changedFields.push('Stats');
      }
    }

    const fieldChangedLabel = changedFields.length > 0 ? changedFields.join(', ') : 'Grade';
    const actionLabel = changedFields.includes('Grade') ? 'Grade Changed' : 'Player Edited';
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const logEntry: SaveLogEntry = {
      id: `edit-${updatedPlayer.id}-${Date.now()}`,
      timestamp: now.toISOString(),
      type: 'player_edit',
      status: 'success',
      action: actionLabel,
      playerName: updatedPlayer.name,
      playerId: updatedPlayer.id,
      fieldChanged: fieldChangedLabel,
      previousValue: previousValueStr || (oldPlayer?.grade ? `Grade: ${oldPlayer.grade}` : 'Original Record'),
      newValue: newValueStr || `Grade: ${updatedPlayer.grade}, Base: ₹${updatedPlayer.basePrice}`,
      modifiedBy,
      date: dateStr,
      time: timeStr,
      description: `Player: ${updatedPlayer.name} | Action: ${actionLabel} | Previous: ${previousValueStr || oldPlayer?.grade || '-'} | New: ${newValueStr || updatedPlayer.grade} | Status: Successfully Saved`,
    };

    appendSaveLog(logEntry);
    setSaveLogs(prev => [logEntry, ...prev.filter(l => l.id !== logEntry.id)].slice(0, 500));
  }, [players, currentPlayerId, currentBidderId]);

  // DEDICATED BULK EDIT PLAYER GRADES
  const bulkEditPlayerGrades = useCallback(
    (
      playerIds: string[],
      targetGrade: PlayerGrade,
      modifiedBy: string = 'Administrator'
    ): { success: boolean; modifiedCount: number; message: string; bulkBatchId: string } => {
      const normalizedTarget = normalizeGrade(targetGrade);
      const bulkBatchId = `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const targetIdSet = new Set(playerIds);
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB');
      const timeStr = now.toLocaleTimeString('en-IN');

      // Identify affected players
      const affectedPlayers = players.filter(
        p => targetIdSet.has(p.id) && normalizeGrade(p.grade) !== normalizedTarget
      );

      const newLogs: SaveLogEntry[] = [];

      // 1. Save permanent overrides & generate individual audit logs grouped under bulkBatchId
      affectedPlayers.forEach((p, index) => {
        const oldGrade = normalizeGrade(p.grade);
        savePlayerOverride(p.id, {
          grade: normalizedTarget,
          basePrice: 1000,
        });

        const entry: SaveLogEntry = {
          id: `log-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: now.toISOString(),
          date: dateStr,
          time: timeStr,
          type: 'bulk_edit',
          status: 'success',
          action: 'Bulk Grade Edit',
          fieldChanged: 'Grade',
          previousValue: `Grade: ${oldGrade}`,
          newValue: `Grade: ${normalizedTarget}`,
          modifiedBy,
          playerId: p.id,
          playerName: p.name,
          bulkBatchId,
          description: `Player: ${p.name} | Action: Bulk Grade Edit | Previous: Grade ${oldGrade} | New: Grade ${normalizedTarget} | Batch: ${bulkBatchId} | Status: Successfully Saved`,
        };

        appendSaveLog(entry);
        newLogs.push(entry);
      });

      if (newLogs.length > 0) {
        setSaveLogs(prev => [...newLogs.reverse(), ...prev].slice(0, 500));
      }

      const modifiedCount = affectedPlayers.length;

      // 2. Atomically update React state and write to server state cache
      setPlayers(prev => {
        const updated = prev.map(p => {
          if (targetIdSet.has(p.id)) {
            return {
              ...p,
              grade: normalizedTarget,
              basePrice: 1000,
            };
          }
          return p;
        });
        saveStoredState({ players: updated });
        return updated;
      });

      // 3. If current auction lot player was edited and no bid placed, update bid
      if (currentPlayerId && targetIdSet.has(currentPlayerId) && currentBidderId === null) {
        setCurrentBid(1000);
      }

      return {
        success: true,
        modifiedCount,
        message: `Successfully updated ${modifiedCount} player${modifiedCount === 1 ? '' : 's'} to Grade ${normalizedTarget}!`,
        bulkBatchId,
      };
    },
    [players, currentPlayerId, currentBidderId]
  );

  // BULK UPDATE PLAYERS
  const bulkUpdatePlayers = useCallback((updatedPlayers: Player[], description?: string) => {
    setPlayers(prev => {
      const map = new Map(updatedPlayers.map(p => [p.id, p]));
      const updated = prev.map(p => map.get(p.id) || p);
      saveStoredState({ players: updated });
      return updated;
    });
    logAndPersistSave('auto', description || `Auto-graded ${updatedPlayers.length} players`);
  }, [logAndPersistSave]);

  // DELETE PLAYER
  const deletePlayer = useCallback((playerId: string) => {
    setPlayers(prev => {
      const updated = prev.filter(p => p.id !== playerId);
      saveStoredState({ players: updated });
      return updated;
    });
    // Remove from team squads if present
    setTeams(prev => {
      const updated = prev.map(t => ({
        ...t,
        squad: t.squad.filter(id => id !== playerId),
        wishlist: (t.wishlist || []).filter(id => id !== playerId),
      }));
      saveStoredState({ teams: updated });
      return updated;
    });
  }, []);

  // DELETE ALL PLAYERS AT ONCE
  const deleteAllPlayers = useCallback(() => {
    setPlayers([]);
    saveStoredState({ players: [] });
    // Reset active auction if a player is in progress
    setCurrentPlayerId(null);
    setCurrentBid(0);
    setCurrentBidderId(null);
    setBidHistory([]);
    setIsTimerRunning(false);
    // Reset team rosters and restore full budgets
    setTeams(prev => {
      const updated = prev.map(t => ({
        ...t,
        squad: [],
        wishlist: [],
        totalSpent: 0,
        remainingBudget: t.startingBudget,
      }));
      saveStoredState({ teams: updated });
      return updated;
    });
    // Clear transactions
    setTransactions([]);
    saveStoredState({ transactions: [] });
  }, []);

  // RESTORE DELETED PLAYERS (UNDO DELETE)
  const restoreDeletedPlayers = useCallback((playersToRestore: Player[]) => {
    if (!playersToRestore || playersToRestore.length === 0) return;
    setPlayers(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const toAdd = playersToRestore.filter(p => !existingIds.has(p.id));
      const updated = [...prev, ...toAdd];
      saveStoredState({ players: updated });
      return updated;
    });
  }, []);

  // IMPORT PLAYERS FROM EXCEL (Deduplicated with merge)
  const importPlayers = useCallback((parsedRows: ParsedPlayerRow[], replaceExisting: boolean = false) => {
    const newPlayers: Player[] = parsedRows.map((r, idx) =>
      parsedRowToPlayer(
        {
          ...r,
          grade: normalizeGrade(r.grade),
          auctionOrder: r.auctionOrder !== undefined
            ? r.auctionOrder
            : ((replaceExisting ? 0 : players.length) + idx + 1),
        },
        idx,
        `ply-${Date.now()}-${idx}`,
      ),
    );

    if (replaceExisting) {
      const deduped = deduplicatePlayers(newPlayers);
      setPlayers(deduped);
      saveStoredState({ players: deduped });
    } else {
      setPlayers(prev => {
        const existingNameMap = new Map(prev.map(p => [canonicalPlayerNameKey(p.name), p]));
        const updatedList = [...prev];

        newPlayers.forEach(np => {
          const key = canonicalPlayerNameKey(np.name);
          if (existingNameMap.has(key)) {
            const idx = updatedList.findIndex(p => canonicalPlayerNameKey(p.name) === key);
            if (idx >= 0) {
              updatedList[idx] = {
                ...updatedList[idx],
                ...np,
                id: updatedList[idx].id,
                status: updatedList[idx].status,
                teamId: updatedList[idx].teamId,
                soldPrice: updatedList[idx].soldPrice,
              };
            }
          } else {
            updatedList.push(np);
          }
        });

        const deduped = deduplicatePlayers(updatedList);
        saveStoredState({ players: deduped });
        return deduped;
      });
    }
  }, [players]);

  // ADD NEW TEAM
  const addTeam = useCallback((teamData: {
    name: string;
    shortName: string;
    logo?: string;
    color?: string;
    secondaryColor?: string;
    owner?: string;
    captain?: string;
    startingBudget?: number;
  }): Team => {
    const budget = teamData.startingBudget !== undefined && !isNaN(teamData.startingBudget) && teamData.startingBudget > 0
      ? teamData.startingBudget
      : (rules.startingBudget || 100000);
    const newTeamId = `team-${Date.now()}`;
    const newTeam: Team = {
      id: newTeamId,
      name: teamData.name.trim(),
      shortName: (teamData.shortName || teamData.name.slice(0, 3)).trim().toUpperCase(),
      logo: teamData.logo || '🏏',
      color: teamData.color || '#3b82f6',
      secondaryColor: teamData.secondaryColor || '#1d4ed8',
      owner: teamData.owner?.trim() || 'Franchise Owner',
      captain: teamData.captain?.trim() || '',
      startingBudget: budget,
      remainingBudget: budget,
      totalSpent: 0,
      squad: [],
      wishlist: [],
    };

    setTeams(prev => {
      const updated = [...prev, newTeam];
      saveStoredState({ teams: updated });
      return updated;
    });

    return newTeam;
  }, [rules.startingBudget]);

  // REMOVE TEAM (With minimum 12 teams validation for Mens tournament)
  const removeTeam = useCallback((teamId: string): { success: boolean; message: string } => {
    let result = { success: false, message: '' };

    setTeams(prev => {
      if (prev.length <= 12) {
        result = {
          success: false,
          message: 'Tournament Rule: A minimum of 12 teams is required for the tournament.'
        };
        return prev;
      }

      const teamToRemove = prev.find(t => t.id === teamId);
      if (!teamToRemove) {
        result = { success: false, message: 'Team not found.' };
        return prev;
      }

      // Reset any players that belonged to this team back to 'upcoming'
      setPlayers(pPrev => pPrev.map(p => {
        if (p.teamId === teamId || teamToRemove.squad.includes(p.id)) {
          return {
            ...p,
            status: 'upcoming',
            teamId: null,
            soldPrice: null,
          };
        }
        return p;
      }));

      // Remove transactions involving this team
      setTransactions(tPrev => tPrev.filter(tx => tx.teamId !== teamId));

      // Reset active bidder if it was this team
      setCurrentBidderId(bId => (bId === teamId ? null : bId));

      const updated = prev.filter(t => t.id !== teamId);
      saveStoredState({ teams: updated });
      result = {
        success: true,
        message: `Successfully removed ${teamToRemove.name}. Squad players have been returned to the auction pool.`
      };
      return updated;
    });

    return result;
  }, []);

  // UPDATE TEAM
  const updateTeam = useCallback((updatedTeam: Team) => {
    setTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t));
  }, []);

  // UPDATE TEAM NAME & SHORT CODE
  const updateTeamName = useCallback((teamId: string, name: string, shortName?: string) => {
    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        return {
          ...t,
          name: name.trim() || t.name,
          shortName: shortName?.trim().toUpperCase() || t.shortName,
        };
      }
      return t;
    }));
  }, []);

  // UPDATE ALL TEAMS AT ONCE
  const updateAllTeams = useCallback((updatedTeams: Team[]) => {
    setTeams(updatedTeams);
  }, []);


  // RESET TEAM BUDGET
  const resetTeamBudget = useCallback((teamId: string) => {
    // Reset team budget and clear squad, captain & vice-captain
    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        return {
          ...t,
          captain: undefined,
          captainPlayerId: undefined,
          viceCaptain: undefined,
          viceCaptainPlayerId: undefined,
          remainingBudget: t.startingBudget,
          totalSpent: 0,
          squad: [],
        };
      }
      return t;
    }));

    // Reset status of players belonging to this team
    setPlayers(prev => prev.map(p => {
      if (p.teamId === teamId || p.captainOfTeamId === teamId || p.viceCaptainOfTeamId === teamId) {
        return {
          ...p,
          status: 'upcoming',
          teamId: null,
          soldPrice: null,
          isCaptain: false,
          isPreAssignedCaptain: false,
          captainOfTeamId: undefined,
          isViceCaptain: false,
          isPreAssignedViceCaptain: false,
          viceCaptainOfTeamId: undefined,
        };
      }
      return p;
    }));

    logAndPersistSave('auto', `Reset budget and squad for team`);
  }, [logAndPersistSave]);

  // REMOVE PLAYER FROM SQUAD
  const removePlayerFromSquad = useCallback((teamId: string, playerId: string) => {
    const player = players.find(p => p.id === playerId);
    const refundPrice = player?.soldPrice || 0;

    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        const isTeamCaptain = t.captainPlayerId === playerId || (player && t.captain === player.name);
        const isTeamVc = t.viceCaptainPlayerId === playerId || (player && t.viceCaptain === player.name);
        return {
          ...t,
          captain: isTeamCaptain ? undefined : t.captain,
          captainPlayerId: isTeamCaptain ? undefined : t.captainPlayerId,
          viceCaptain: isTeamVc ? undefined : t.viceCaptain,
          viceCaptainPlayerId: isTeamVc ? undefined : t.viceCaptainPlayerId,
          remainingBudget: t.remainingBudget + refundPrice,
          totalSpent: Math.max(0, t.totalSpent - refundPrice),
          squad: t.squad.filter(id => id !== playerId),
        };
      }
      return t;
    }));

    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          status: 'upcoming',
          teamId: null,
          soldPrice: null,
          isCaptain: false,
          isPreAssignedCaptain: false,
          captainOfTeamId: undefined,
          isViceCaptain: false,
          isPreAssignedViceCaptain: false,
          viceCaptainOfTeamId: undefined,
        };
      }
      return p;
    }));

    logAndPersistSave('auto', `Released player ${player?.name || playerId} from squad`);
  }, [players, logAndPersistSave]);

  // TOGGLE WISHLIST
  const toggleWishlist = useCallback((teamId: string, playerId: string) => {
    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        const currentWishlist = t.wishlist || [];
        const isPresent = currentWishlist.includes(playerId);
        return {
          ...t,
          wishlist: isPresent ? currentWishlist.filter(id => id !== playerId) : [...currentWishlist, playerId],
        };
      }
      return t;
    }));
  }, []);

  // UPDATE RULES
  const updateRules = useCallback((newRules: AuctionRules) => {
    setRules(newRules);
  }, []);

  // SYNC GRADE BASE PRICES TO ALL UPCOMING PLAYERS
  const syncGradeBasePricesToPlayers = useCallback((gradePrices?: GradeBasePrices) => {
    const prices = gradePrices || rules.gradeBasePrices || { gradeAPlus: 7000, gradeA: 5000, gradeB: 3000, gradeC: 1000 };
    setPlayers(prev => prev.map(p => {
      if (p.status === 'upcoming') {
        const newPrice = p.grade === 'A+' 
          ? prices.gradeAPlus 
          : p.grade === 'A' 
          ? prices.gradeA 
          : p.grade === 'B' 
          ? prices.gradeB 
          : prices.gradeC;
        return { ...p, basePrice: newPrice };
      }
      return p;
    }));
  }, [rules.gradeBasePrices]);

  // UPDATE TOURNAMENT INFO
  const updateTournament = useCallback((info: TournamentInfo) => {
    setTournament(info);
  }, []);

  // RESET TO DEMO DATA
  const resetToDemoData = useCallback(() => {
    clearAuctionStorage();
    const prices = initialAuctionRules.gradeBasePrices!;
    setTeams(initialTeams);
    setPlayers(bundledJcpl4AsPlayers(prices, 'mens'));
    setTransactions([]);
    setRules(initialAuctionRules);
    setTournament(initialTournamentInfo);
    setCurrentPlayerId(null);
    setCurrentBid(0);
    setCurrentBidderId(null);
    setBidHistory([]);
    setTimerSeconds(initialAuctionRules.timerDuration);
  }, []);

  // CLEAR ALL DATA
  const clearAllData = useCallback(() => {
    clearAuctionStorage();
    const emptyTeams = initialTeams.map(t => ({
      ...t,
      startingBudget: 100000,
      remainingBudget: 100000,
      totalSpent: 0,
      squad: [],
      wishlist: [],
    }));
    setTeams(emptyTeams);
    setPlayers([]);
    setTransactions([]);
    setRules(initialAuctionRules);
    setCurrentPlayerId(null);
    setCurrentBid(0);
    setCurrentBidderId(null);
    setBidHistory([]);
  }, []);

  // IMPORT BACKUP JSON
  const importBackupJSON = useCallback((jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString) as AppStoredState;
      if (parsed.teams && parsed.players) {
        setTeams(parsed.teams);
        setPlayers(parsed.players);
        setTransactions(parsed.transactions || []);
        setRules(parsed.rules || initialAuctionRules);
        setTournament(parsed.tournament || initialTournamentInfo);
        setCurrentPlayerId(parsed.currentPlayerId || null);
        setCurrentBid(parsed.currentBid || 0);
        setCurrentBidderId(parsed.currentBidderId || null);
        setBidHistory(parsed.bidHistory as unknown as BidRecord[] || []);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // RESTART AUCTION (Resets auction transactions & returning sold players to pool; PRESERVES Captains, Vice-Captains & player edits)
  const restartAuction = useCallback(async (modifiedBy: string = 'Administrator'): Promise<{ success: boolean; message: string; reversedCount?: number; returnedCount?: number }> => {
    try {
      const reversedCount = transactions.length;
      let returnedCount = 0;

      // 1. Identify leadership players across all franchises
      const getPlayerLeadershipInfo = (p: Player) => {
        for (const t of teams) {
          if (t.captainPlayerId === p.id || p.captainOfTeamId === t.id || (t.captain && p.name.trim().toLowerCase() === t.captain.trim().toLowerCase())) {
            return { isLeadership: true, isCaptain: true, isViceCaptain: false, teamId: t.id };
          }
          if (t.viceCaptainPlayerId === p.id || p.viceCaptainOfTeamId === t.id || (t.viceCaptain && p.name.trim().toLowerCase() === t.viceCaptain.trim().toLowerCase())) {
            return { isLeadership: true, isCaptain: false, isViceCaptain: true, teamId: t.id };
          }
          if ((p.isCaptain || p.isPreAssignedCaptain) && (p.teamId === t.id || (t.squad && t.squad.includes(p.id)))) {
            return { isLeadership: true, isCaptain: true, isViceCaptain: false, teamId: t.id };
          }
          if ((p.isViceCaptain || p.isPreAssignedViceCaptain) && (p.teamId === t.id || (t.squad && t.squad.includes(p.id)))) {
            return { isLeadership: true, isCaptain: false, isViceCaptain: true, teamId: t.id };
          }
        }
        return {
          isLeadership: Boolean(p.isCaptain || p.isViceCaptain || p.isPreAssignedCaptain || p.isPreAssignedViceCaptain),
          isCaptain: Boolean(p.isCaptain || p.isPreAssignedCaptain),
          isViceCaptain: Boolean(p.isViceCaptain || p.isPreAssignedViceCaptain),
          teamId: p.teamId || p.captainOfTeamId || p.viceCaptainOfTeamId,
        };
      };

      // 2. Reset sold auction players back to pool; strictly preserve Captains & Vice-Captains with their assigned price
      const nextPlayers: Player[] = players.map(p => {
        const info = getPlayerLeadershipInfo(p);
        if (info.isLeadership) {
          return {
            ...p,
            isCaptain: info.isCaptain,
            isViceCaptain: info.isViceCaptain,
            teamId: info.teamId || p.teamId,
            status: 'sold' as PlayerStatus,
            soldPrice: p.soldPrice !== null && p.soldPrice !== undefined ? p.soldPrice : 0,
          };
        }
        if (p.status === 'sold' || p.status === 'unsold' || p.teamId) {
          returnedCount++;
        }
        return {
          ...p,
          status: 'upcoming' as PlayerStatus,
          soldPrice: null,
          teamId: null,
          soldToTeamId: undefined,
        };
      });

      // 3. Reset team squads keeping ONLY Captain & Vice-Captain, aligning remainingBudget to (100,000 - leadershipCost)
      const startBudget = rules.startingBudget || 100000;
      const nextTeams: Team[] = teams.map(t => {
        const cap = nextPlayers.find(p =>
          (t.captainPlayerId && p.id === t.captainPlayerId) ||
          p.captainOfTeamId === t.id ||
          (p.isCaptain && (p.teamId === t.id || (t.squad && t.squad.includes(p.id)))) ||
          (t.captain && p.name.trim().toLowerCase() === t.captain.trim().toLowerCase())
        );

        const vc = nextPlayers.find(p =>
          (t.viceCaptainPlayerId && p.id === t.viceCaptainPlayerId) ||
          p.viceCaptainOfTeamId === t.id ||
          (p.isViceCaptain && (p.teamId === t.id || (t.squad && t.squad.includes(p.id)))) ||
          (t.viceCaptain && p.name.trim().toLowerCase() === t.viceCaptain.trim().toLowerCase())
        );

        const preservedSquad: string[] = [];
        if (cap && !preservedSquad.includes(cap.id)) preservedSquad.push(cap.id);
        if (vc && !preservedSquad.includes(vc.id)) preservedSquad.push(vc.id);

        const capCost = Number(cap?.soldPrice || 0);
        const vcCost = Number(vc?.soldPrice || 0);
        const leadershipCost = capCost + vcCost;
        const remainingBudget = Math.max(0, startBudget - leadershipCost);

        return {
          ...t,
          captain: cap ? cap.name : t.captain,
          captainPlayerId: cap ? cap.id : t.captainPlayerId,
          viceCaptain: vc ? vc.name : t.viceCaptain,
          viceCaptainPlayerId: vc ? vc.id : t.viceCaptainPlayerId,
          startingBudget: startBudget,
          totalSpent: leadershipCost,
          remainingBudget,
          squad: preservedSquad,
        };
      });

      const nextTransactions: any[] = [];

      // 4. Update React state in a single synchronous batch
      setPlayers(nextPlayers);
      setTeams(nextTeams);
      setTransactions(nextTransactions);
      setCurrentPlayerId(null);
      setCurrentBid(0);
      setCurrentBidderId(null);
      setBidHistory([]);
      setTimerSeconds(rules.timerDuration || 15);

      // 5. Save state to localStorage atomically
      saveStoredState({
        players: nextPlayers,
        teams: nextTeams,
        transactions: nextTransactions,
        currentPlayerId: null,
        currentBid: 0,
        currentBidderId: null,
        bidHistory: [],
      });

      // 6. Generate Restart Log Entry
      const now = new Date();
      const logEntry: SaveLogEntry = {
        id: `restart-${Date.now()}`,
        timestamp: now.toISOString(),
        type: 'restart',
        status: 'success',
        action: 'Auction Restarted',
        modifiedBy,
        date: now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
        time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        description: `Auction restarted: ${reversedCount} auction sales reversed, ${returnedCount} players returned to pool. Captain & Vice-Captain allotments preserved.`,
        metadata: {
          reversedCount,
          returnedCount,
          captainVcPreserved: true,
        },
      };

      appendSaveLog(logEntry);
      setSaveLogs(prev => [logEntry, ...prev.filter(l => l.id !== logEntry.id)].slice(0, 500));

      // 7. Broadcast state to all other windows & push to server
      const snapshotState: AppStoredState = {
        teams: nextTeams,
        players: nextPlayers,
        transactions: nextTransactions,
        rules,
        tournament,
        currentPlayerId: null,
        currentBid: 0,
        currentBidderId: null,
        bidHistory: [],
        auctionOrderMode,
        customAuctionOrderIds,
        lastSaved: now.toISOString(),
      };
      broadcastState(snapshotState);
      pushStateToServer(snapshotState);

      // 8. Push to server restart endpoint
      try {
        await fetch('/api/auction-restart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modifiedBy, teams: nextTeams, players: nextPlayers, transactions: [] }),
        });
      } catch {}

      return {
        success: true,
        message: 'AUCTION SUCCESSFULLY RESTARTED',
        reversedCount,
        returnedCount,
      };
    } catch (err) {
      console.error('Failed to restart auction:', err);
      return {
        success: false,
        message: 'Failed to restart auction',
      };
    }
  }, [teams, players, transactions, rules, tournament, auctionOrderMode, customAuctionOrderIds, broadcastState, pushStateToServer]);

  // CLEAR AUCTION HISTORY (Clears transaction history and bid logs WITHOUT touching player ownership, squads or budgets)
  const clearAuctionHistory = useCallback(async (modifiedBy: string = 'Administrator'): Promise<{ success: boolean; message: string; deletedCount?: number }> => {
    try {
      let deletedCount = 0;

      setTransactions(prev => {
        deletedCount = prev.length;
        saveStoredState({ transactions: [] });
        return [];
      });

      setBidHistory([]);
      saveStoredState({ bidHistory: [] });

      const now = new Date();
      const logEntry: SaveLogEntry = {
        id: `clear-history-${Date.now()}`,
        timestamp: now.toISOString(),
        type: 'clear_history',
        status: 'success',
        action: 'Auction History Cleared',
        modifiedBy,
        date: now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
        time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        description: `Auction history cleared: ${deletedCount} transaction records deleted. Player ownership & team configurations preserved.`,
        metadata: {
          deletedCount,
          playerOwnershipPreserved: true,
        },
      };

      appendSaveLog(logEntry);
      setSaveLogs(prev => [logEntry, ...prev].slice(0, 500));

      try {
        await fetch('/api/auction-clear-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modifiedBy }),
        });
      } catch {}

      return {
        success: true,
        message: 'Auction history successfully cleared',
        deletedCount,
      };
    } catch (err) {
      console.error('Failed to clear auction history:', err);
      return {
        success: false,
        message: 'Failed to clear auction history',
      };
    }
  }, []);

  return (
    <AuctionContext.Provider
      value={{
        teams,
        players,
        transactions,
        rules,
        tournament,
        currentPlayer,
        currentBid,
        currentBidder,
        bidHistory,
        timerSeconds,
        isTimerRunning,
        startTimer,
        pauseTimer,
        resetTimer,
        setCustomTimerDuration,
        startAuctionForPlayer,
        placeBid,
        undoLastBid,
        markPlayerSold,
        directSellPlayer,
        directAddPlayerToTeam,
        markPlayerUnsold,
        skipOrNextPlayer,
        reAuctionPlayer,
        undoTransaction,
        lastActionResult,
        undoLastResult,
        calculateMaxAllowableBid,
        isMockAuction,
        toggleMockAuction,
        resetMockAuction,
        addPlayer,
        editPlayer,
        bulkEditPlayerGrades,
        bulkUpdatePlayers,
        deletePlayer,
        deleteAllPlayers,
        restoreDeletedPlayers,
        importPlayers,
        addTeam,
        removeTeam,
        updateTeam,
        updateTeamName,
        updateAllTeams,
        resetTeamBudget,
        removePlayerFromSquad,

        // Auction Order Modes & Queue
        auctionOrderMode,
        setAuctionOrderMode,
        customAuctionOrderIds,
        setCustomAuctionOrder,
        getOrderedUpcomingPlayers,
        nextUpcomingQueuePlayer,

        // Grade & Category Maximum Bidding Limits
        getGradeCategoryMaxBid,

        // Captain Allocation
        allocateCaptainToTeam,
        removeCaptainFromTeam,
        applyCaptainCostToAllAllotted,

        // Vice-Captain Allocation
        allocateViceCaptainToTeam,
        removeViceCaptainFromTeam,
        applyViceCaptainCostToAllAllotted,

        // Grade Metrics & Validation
        getTeamGradeMetrics: getTeamGradeMetricsHelper,
        validatePurchaseForTeam,

        // Data Saving, Auto-Save & Save Logs
        saveLogs,
        saveSnapshots,
        lastSavedTimestamp,
        triggerManualSave,
        restoreFromSnapshot,

        // Auction Lifecycle & History Management
        restartAuction,
        clearAuctionHistory,

        toggleWishlist,
        updateRules,
        syncGradeBasePricesToPlayers,
        updateTournament,
        resetToDemoData,
        clearAllData,
        importBackupJSON,
      }}
    >
      {children}
    </AuctionContext.Provider>
  );
};

export const useAuction = (): AuctionContextType => {
  const context = useContext(AuctionContext);
  if (!context) {
    throw new Error('useAuction must be used within an AuctionProvider');
  }
  return context;
};
