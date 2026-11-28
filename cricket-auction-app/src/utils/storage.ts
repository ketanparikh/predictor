import { Team, Player, AuctionTransaction, AuctionRules, TournamentInfo, AuctionOrderingMode, GradeCategoryMaxBid, SaveLogEntry, SaveSnapshot, ActiveAuctionSession, PlayerStatus } from '../types/auction';
import { initialTeams, initialAuctionRules, initialTournamentInfo } from '../data/demoData';
import { normalizeGrade, deduplicatePlayers } from './gradeUtils';

const STORAGE_KEYS = {
  TEAMS: 'cricket_auction_teams_v3',
  PLAYERS: 'cricket_auction_players_v3',
  TRANSACTIONS: 'cricket_auction_transactions_v3',
  RULES: 'cricket_auction_rules_v3',
  TOURNAMENT: 'cricket_auction_tournament_v3',
  CURRENT_PLAYER_ID: 'cricket_auction_current_ply_v3',
  CURRENT_BID: 'cricket_auction_current_bid_v3',
  CURRENT_BIDDER_ID: 'cricket_auction_current_bidder_v3',
  BID_HISTORY: 'cricket_auction_bid_history_v3',
  AUCTION_ORDER_MODE: 'cricket_auction_order_mode_v3',
  CUSTOM_ORDER_IDS: 'cricket_auction_custom_order_ids_v3',
  SAVE_LOGS: 'cricket_auction_save_logs_v3',
  SAVE_SNAPSHOTS: 'cricket_auction_save_snapshots_v3',
  PLAYER_OVERRIDES: 'cricket_auction_player_overrides_v3',
  ACTIVE_AUCTION_SESSION: 'cricket_auction_active_session_v3',
  LAST_SAVED: 'cricket_auction_last_saved_v3',
};

// Legacy keys to clean up automatically
const LEGACY_STORAGE_PREFIXES = [
  'cricket_auction_teams_v1', 'cricket_auction_teams_v2',
  'cricket_auction_players_v1', 'cricket_auction_players_v2',
  'cricket_auction_transactions_v1', 'cricket_auction_transactions_v2',
  'cricket_auction_rules_v1', 'cricket_auction_rules_v2',
  'cricket_auction_tournament_v1', 'cricket_auction_tournament_v2',
  'cricket_auction_current_ply_v1', 'cricket_auction_current_ply_v2',
  'cricket_auction_current_bid_v1', 'cricket_auction_current_bid_v2',
  'cricket_auction_current_bidder_v1', 'cricket_auction_current_bidder_v2',
  'cricket_auction_bid_history_v1', 'cricket_auction_bid_history_v2',
];

export interface AppStoredState {
  teams: Team[];
  players: Player[];
  transactions: AuctionTransaction[];
  rules: AuctionRules;
  tournament: TournamentInfo;
  currentPlayerId: string | null;
  currentBid: number;
  currentBidderId: string | null;
  bidHistory: Array<{ id: string; teamId: string; teamName: string; amount: number; timestamp: string }>;
  auctionOrderMode?: AuctionOrderingMode;
  customAuctionOrderIds?: string[];
  activeAuctionSession?: ActiveAuctionSession | null;
  lastSaved?: string;
}

const TARGET_PURSE = 100000;
const TARGET_SQUAD_SIZE = 9;

/** Restore Nov 1-safe auction rules: 100000 purse and 9-player squad cap. */
export function sanitizeAuctionRules(rules?: AuctionRules | null): AuctionRules {
  const source = rules || initialAuctionRules;
  let loadedRules: AuctionRules = {
    ...source,
    squadRules: {
      ...(source.squadRules || initialAuctionRules.squadRules),
      maxGradeAPlus: 9,
      maxGradeA: 9,
      maxGradeB: 9,
      maxGradeC: 9,
      maxGradeASpending: 100000,
      maxGradeBSpending: 100000,
    },
    gradeBasePrices: {
      gradeAPlus: 1000,
      gradeA: 1000,
      gradeB: 1000,
      gradeC: 1000,
      ...(source.gradeBasePrices || {}),
    },
  };

  loadedRules = {
    ...loadedRules,
    gradeBasePrices: {
      gradeAPlus: 1000,
      gradeA: 1000,
      gradeB: 1000,
      gradeC: 1000,
    },
  };

  if (!loadedRules.startingBudget || loadedRules.startingBudget === 50000) {
    loadedRules = {
      ...loadedRules,
      startingBudget: TARGET_PURSE,
    };
  }

  if (loadedRules.squadRules) {
    const squadRules = { ...loadedRules.squadRules };
    if (!squadRules.maxSquadSize || squadRules.maxSquadSize > TARGET_SQUAD_SIZE) {
      squadRules.maxSquadSize = TARGET_SQUAD_SIZE;
    }
    if (!squadRules.minSquadSize || squadRules.minSquadSize > TARGET_SQUAD_SIZE) {
      squadRules.minSquadSize = TARGET_SQUAD_SIZE;
    }
    if (!squadRules.maxGradeA || squadRules.maxGradeA > 2) {
      squadRules.maxGradeA = 2;
    }
    if (!squadRules.maxGradeB || squadRules.maxGradeB > 3) {
      squadRules.maxGradeB = 3;
    }
    if (!squadRules.maxGradeC || squadRules.maxGradeC > 2) {
      squadRules.maxGradeC = 2;
    }
    if (!squadRules.maxGradeASpending) {
      squadRules.maxGradeASpending = 30000;
    }
    if (!squadRules.maxGradeBSpending) {
      squadRules.maxGradeBSpending = 18000;
    }
    if (!squadRules.maxCaptainViceCaptainSpending) {
      squadRules.maxCaptainViceCaptainSpending = 50000;
    }
    loadedRules = { ...loadedRules, squadRules };
  }

  return loadedRules;
}

export function sanitizeTeamPurses(teams: Team[], purse = TARGET_PURSE): Team[] {
  return (teams || []).map((team) => {
    if (!team.startingBudget || team.startingBudget === 50000) {
      const spent = team.totalSpent || 0;
      return {
        ...team,
        startingBudget: purse,
        remainingBudget: Math.max(0, purse - spent),
      };
    }
    return team;
  });
}

/**
 * Enforces the strict rule that at most ONE player in the entire database can have status 'in_auction'.
 * Any stale or duplicate 'in_auction' flags on other players are immediately sanitized.
 */
export function sanitizeSingleActiveAuctionPlayer(
  players: Player[],
  currentPlayerId: string | null
): { sanitizedPlayers: Player[]; sanitizedCurrentPlayerId: string | null } {
  const activeId = currentPlayerId || null;
  const activePlayer = activeId ? (players || []).find(p => p.id === activeId) : null;

  // Active lot is valid only if player exists and is not already sold/assigned to a team
  const isTargetValid = !!activePlayer && activePlayer.status !== 'sold' && !activePlayer.teamId;
  const resolvedCurrentPlayerId = isTargetValid ? activeId : null;

  let hasAssignedActive = false;
  const sanitizedPlayers = (players || []).map(p => {
    // If this player is the resolved active player
    if (resolvedCurrentPlayerId && p.id === resolvedCurrentPlayerId) {
      hasAssignedActive = true;
      return { ...p, status: 'in_auction' as const };
    }

    // Every other player with 'in_auction' is strictly sanitized to upcoming or sold!
    if (p.status === 'in_auction') {
      return {
        ...p,
        status: (p.teamId ? 'sold' : 'upcoming') as PlayerStatus,
      };
    }

    return p;
  });

  return {
    sanitizedPlayers,
    sanitizedCurrentPlayerId: hasAssignedActive ? resolvedCurrentPlayerId : null,
  };
}

export function sanitizeAuctionState(state: AppStoredState): AppStoredState {
  const rules = sanitizeAuctionRules(state.rules);
  const teams = sanitizeTeamPurses(
    state.teams?.length ? state.teams : initialTeams,
    rules.startingBudget || TARGET_PURSE,
  );
  const { sanitizedPlayers, sanitizedCurrentPlayerId } = sanitizeSingleActiveAuctionPlayer(
    state.players || [],
    state.currentPlayerId || null
  );
  return {
    ...state,
    rules,
    teams,
    players: sanitizedPlayers,
    currentPlayerId: sanitizedCurrentPlayerId,
  };
}

export const loadStoredState = (): AppStoredState => {
  try {
    // Purge any outdated legacy v1 and v2 caches
    if (typeof window !== 'undefined' && window.localStorage) {
      LEGACY_STORAGE_PREFIXES.forEach(key => {
        try { localStorage.removeItem(key); } catch {}
      });
    }

    const rawTeams = localStorage.getItem(STORAGE_KEYS.TEAMS);
    const rawPlayers = localStorage.getItem(STORAGE_KEYS.PLAYERS);
    const rawTransactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const rawRules = localStorage.getItem(STORAGE_KEYS.RULES);
    const rawTournament = localStorage.getItem(STORAGE_KEYS.TOURNAMENT);
    const rawCurrentPlayerId = localStorage.getItem(STORAGE_KEYS.CURRENT_PLAYER_ID);
    const rawCurrentBid = localStorage.getItem(STORAGE_KEYS.CURRENT_BID);
    const rawCurrentBidderId = localStorage.getItem(STORAGE_KEYS.CURRENT_BIDDER_ID);
    const rawBidHistory = localStorage.getItem(STORAGE_KEYS.BID_HISTORY);

    let loadedPlayers: Player[] = rawPlayers ? JSON.parse(rawPlayers) : [];
    const parsedRules: AuctionRules = rawRules ? JSON.parse(rawRules) : initialAuctionRules;
    const loadedRules = sanitizeAuctionRules(parsedRules);
    if (JSON.stringify(parsedRules) !== JSON.stringify(loadedRules)) {
      localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(loadedRules));
    }

    if (!rawPlayers) {
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify([]));
    }

    // Sanitize any player base prices that were accidentally set to 5100, 3100, 1100
    let didSanitizePrices = false;
    loadedPlayers = loadedPlayers.map(p => {
      if (p.grade === 'A' && p.basePrice === 5100) {
        didSanitizePrices = true;
        return { ...p, basePrice: 5000 };
      }
      if (p.grade === 'B' && p.basePrice === 3100) {
        didSanitizePrices = true;
        return { ...p, basePrice: 3000 };
      }
      if (p.grade === 'C' && p.basePrice === 1100) {
        didSanitizePrices = true;
        return { ...p, basePrice: 1000 };
      }
      return p;
    });

    if (didSanitizePrices) {
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(loadedPlayers));
    }

    loadedPlayers = deduplicatePlayers(applyPlayerOverrides(deduplicatePlayers(loadedPlayers)));

    const parsedTeams: Team[] = rawTeams ? JSON.parse(rawTeams) : initialTeams;
    let loadedTeams = sanitizeTeamPurses(parsedTeams, loadedRules.startingBudget || TARGET_PURSE);
    if (JSON.stringify(parsedTeams) !== JSON.stringify(loadedTeams)) {
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(loadedTeams));
    }

    // For Mens tournament, ensure a minimum of 12 teams
    if (loadedTeams.length < 12) {
      const existingIds = new Set(loadedTeams.map(t => t.id));
      const toAdd = initialTeams.filter(t => !existingIds.has(t.id));
      loadedTeams = [...loadedTeams, ...toAdd];
      while (loadedTeams.length < 12) {
        const idx = loadedTeams.length + 1;
        loadedTeams.push({
          id: `team-${idx}`,
          name: `Franchise Team ${idx}`,
          shortName: `FT${idx}`,
          logo: '🏏',
          color: '#3b82f6',
          secondaryColor: '#1d4ed8',
          owner: 'Franchise Group',
          captain: `Captain ${idx}`,
          startingBudget: loadedRules.startingBudget || 100000,
          remainingBudget: loadedRules.startingBudget || 100000,
          totalSpent: 0,
          squad: [],
          wishlist: [],
        });
      }
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(loadedTeams));
    }

    const rawOrderMode = localStorage.getItem(STORAGE_KEYS.AUCTION_ORDER_MODE);
    const rawCustomOrderIds = localStorage.getItem(STORAGE_KEYS.CUSTOM_ORDER_IDS);
    const rawActiveSession = localStorage.getItem(STORAGE_KEYS.ACTIVE_AUCTION_SESSION);
    const rawLastSaved = localStorage.getItem(STORAGE_KEYS.LAST_SAVED);

    const parsedCurrentPlayerId = rawCurrentPlayerId ? JSON.parse(rawCurrentPlayerId) : null;
    const { sanitizedPlayers, sanitizedCurrentPlayerId } = sanitizeSingleActiveAuctionPlayer(
      loadedPlayers,
      parsedCurrentPlayerId
    );

    return {
      teams: loadedTeams,
      players: sanitizedPlayers,
      transactions: rawTransactions ? JSON.parse(rawTransactions) : [],
      rules: loadedRules,
      tournament: rawTournament ? JSON.parse(rawTournament) : initialTournamentInfo,
      currentPlayerId: sanitizedCurrentPlayerId,
      currentBid: rawCurrentBid ? Number(rawCurrentBid) : 0,
      currentBidderId: rawCurrentBidderId ? JSON.parse(rawCurrentBidderId) : null,
      bidHistory: rawBidHistory ? JSON.parse(rawBidHistory) : [],
      auctionOrderMode: (rawOrderMode as AuctionOrderingMode) || 'default',
      customAuctionOrderIds: rawCustomOrderIds ? JSON.parse(rawCustomOrderIds) : undefined,
      activeAuctionSession: rawActiveSession ? JSON.parse(rawActiveSession) : null,
      lastSaved: rawLastSaved || new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error loading stored auction state, resetting to demo:', err);
    return {
      teams: initialTeams,
      players: [],
      transactions: [],
      rules: initialAuctionRules,
      tournament: initialTournamentInfo,
      currentPlayerId: null,
      currentBid: 0,
      currentBidderId: null,
      bidHistory: [],
      auctionOrderMode: 'default',
      lastSaved: new Date().toISOString(),
    };
  }
};

export const saveStoredState = (state: Partial<AppStoredState>) => {
  try {
    if (state.teams !== undefined) localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(state.teams));
    if (state.players !== undefined || state.currentPlayerId !== undefined) {
      const activeId = state.currentPlayerId !== undefined ? state.currentPlayerId : null;
      const targetPlayers = state.players !== undefined ? state.players : [];
      const { sanitizedPlayers, sanitizedCurrentPlayerId } = sanitizeSingleActiveAuctionPlayer(
        targetPlayers,
        activeId
      );
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(sanitizedPlayers));
      localStorage.setItem(STORAGE_KEYS.CURRENT_PLAYER_ID, JSON.stringify(sanitizedCurrentPlayerId));
    }
    if (state.transactions !== undefined) localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(state.transactions));
    if (state.rules !== undefined) localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(state.rules));
    if (state.tournament !== undefined) localStorage.setItem(STORAGE_KEYS.TOURNAMENT, JSON.stringify(state.tournament));
    if (state.currentBid !== undefined) localStorage.setItem(STORAGE_KEYS.CURRENT_BID, String(state.currentBid));
    if (state.currentBidderId !== undefined) localStorage.setItem(STORAGE_KEYS.CURRENT_BIDDER_ID, JSON.stringify(state.currentBidderId));
    if (state.bidHistory !== undefined) localStorage.setItem(STORAGE_KEYS.BID_HISTORY, JSON.stringify(state.bidHistory));
    if (state.auctionOrderMode !== undefined) localStorage.setItem(STORAGE_KEYS.AUCTION_ORDER_MODE, state.auctionOrderMode);
    if (state.customAuctionOrderIds !== undefined) localStorage.setItem(STORAGE_KEYS.CUSTOM_ORDER_IDS, JSON.stringify(state.customAuctionOrderIds));
    if (state.activeAuctionSession !== undefined) {
      if (state.activeAuctionSession) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_AUCTION_SESSION, JSON.stringify(state.activeAuctionSession));
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_AUCTION_SESSION);
      }
    }
    const now = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.LAST_SAVED, now);
  } catch (err) {
    console.error('Error saving auction state to localStorage:', err);
  }
};

// ================= PLAYER OVERRIDES MANAGEMENT (PERMANENT EDITS) =================

export const loadPlayerOverrides = (): Record<string, Partial<Player>> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PLAYER_OVERRIDES);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
};

export const savePlayerOverride = (playerId: string, override: Partial<Player>): void => {
  try {
    const current = loadPlayerOverrides();
    current[playerId] = { ...(current[playerId] || {}), ...override };
    localStorage.setItem(STORAGE_KEYS.PLAYER_OVERRIDES, JSON.stringify(current));

    // Also persist to server disk storage in background
    if (typeof fetch !== 'undefined') {
      fetch('/api/player-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [playerId]: current[playerId] }),
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to save player override:', err);
  }
};

export const saveAllPlayerOverrides = (overrides: Record<string, Partial<Player>>): void => {
  try {
    const current = loadPlayerOverrides();
    const merged = { ...current, ...overrides };
    localStorage.setItem(STORAGE_KEYS.PLAYER_OVERRIDES, JSON.stringify(merged));

    if (typeof fetch !== 'undefined') {
      fetch('/api/player-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to save all player overrides:', err);
  }
};

export const applyPlayerOverrides = (
  players: Player[],
  overrides?: Record<string, Partial<Player>>
): Player[] => {
  const ovr = overrides || loadPlayerOverrides();
  if (!ovr || Object.keys(ovr).length === 0) return players;

  // Build name-based lookup for resilience across ID regenerations or Excel re-imports
  const nameMap = new Map<string, Partial<Player>>();
  Object.values(ovr).forEach(patch => {
    if (patch && patch.name) {
      nameMap.set(patch.name.trim().toLowerCase(), patch);
    }
  });

  return players.map((p) => {
    const patch = ovr[p.id] || (p.name ? nameMap.get(p.name.trim().toLowerCase()) : undefined);
    if (!patch) return { ...p, grade: normalizeGrade(p.grade), basePrice: 1000 };
    return {
      ...p,
      ...patch,
      grade: patch.grade ? normalizeGrade(patch.grade) : normalizeGrade(p.grade),
      basePrice: 1000,
      stats: patch.stats ? { ...p.stats, ...patch.stats } : p.stats,
    };
  });
};

// ================= SAVE LOGS & SNAPSHOTS MANAGEMENT =================

export const loadSaveLogs = (): SaveLogEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVE_LOGS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

export const appendSaveLog = (entry: SaveLogEntry): void => {
  try {
    const logs = loadSaveLogs();
    const updated = [entry, ...logs.filter((l) => l.id !== entry.id)].slice(0, 500); // retain up to 500 audit logs
    localStorage.setItem(STORAGE_KEYS.SAVE_LOGS, JSON.stringify(updated));

    // Also sync to server disk log storage
    if (typeof fetch !== 'undefined') {
      fetch('/api/save-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      }).catch(() => {});
    }
  } catch {}
};

export const loadSaveSnapshots = (): SaveSnapshot[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVE_SNAPSHOTS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

export const createAndStoreSnapshot = (
  description: string,
  state: AppStoredState,
  name?: string
): SaveSnapshot => {
  const snapshot: SaveSnapshot = {
    id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    name: name || `Backup: ${description}`,
    description,
    state: {
      players: state.players,
      teams: state.teams,
      transactions: state.transactions,
      tournament: state.tournament,
      rules: state.rules,
      auctionOrderMode: state.auctionOrderMode,
      customAuctionOrderIds: state.customAuctionOrderIds,
      gradeCategoryMaxBids: state.rules.gradeCategoryMaxBids,
      currentPlayerId: state.currentPlayerId,
      currentBid: state.currentBid,
      currentBidderId: state.currentBidderId,
    },
  };

  try {
    const existing = loadSaveSnapshots();
    const updated = [snapshot, ...existing].slice(0, 20); // retain up to 20 restore points
    localStorage.setItem(STORAGE_KEYS.SAVE_SNAPSHOTS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to store snapshot:', err);
  }

  return snapshot;
};

export const getLastSavedTimestamp = (): string => {
  return localStorage.getItem(STORAGE_KEYS.LAST_SAVED) || new Date().toISOString();
};

export const exportStateAsJSON = (state: AppStoredState): void => {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `jcpl4_auction_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

export const clearAuctionStorage = (): void => {
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  LEGACY_STORAGE_PREFIXES.forEach(k => localStorage.removeItem(k));
};
