import { Team, Player, AuctionTransaction, AuctionRules, TournamentInfo, AuctionOrderingMode, GradeCategoryMaxBid, SaveLogEntry, SaveSnapshot } from '../types/auction';
import { initialTeams, initialPlayers, initialAuctionRules, initialTournamentInfo } from '../data/demoData';

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
  lastSaved?: string;
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

    let loadedPlayers: Player[] = rawPlayers ? JSON.parse(rawPlayers) : initialPlayers;
    let loadedRules: AuctionRules = rawRules ? JSON.parse(rawRules) : initialAuctionRules;

    // Normalize grade base prices to 7000, 5000, 3000, 1000
    if (
      !loadedRules.gradeBasePrices ||
      !loadedRules.gradeBasePrices.gradeAPlus ||
      loadedRules.gradeBasePrices.gradeA === 5100 ||
      loadedRules.gradeBasePrices.gradeB === 3100 ||
      loadedRules.gradeBasePrices.gradeC === 1100
    ) {
      loadedRules = {
        ...loadedRules,
        gradeBasePrices: {
          gradeAPlus: loadedRules.gradeBasePrices?.gradeAPlus || 7000,
          gradeA: loadedRules.gradeBasePrices?.gradeA || 5000,
          gradeB: loadedRules.gradeBasePrices?.gradeB || 3000,
          gradeC: loadedRules.gradeBasePrices?.gradeC || 1000,
        },
      };
      localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(loadedRules));
    }

    // If players are already stored in localStorage, preserve user's added players!
    // Only default to initialPlayers if localStorage was completely empty.
    if (!rawPlayers) {
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(initialPlayers));
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

    // Apply permanent player overrides (grades, stats, base prices saved by admin)
    loadedPlayers = applyPlayerOverrides(loadedPlayers);

    // Ensure purse / starting budget defaults to 100000
    if (!loadedRules.startingBudget || loadedRules.startingBudget === 50000) {
      loadedRules = {
        ...loadedRules,
        startingBudget: 100000,
      };
      localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(loadedRules));
    }

    // Ensure squad size and grade restrictions (A: 2, B: 3, C: 2)
    if (loadedRules.squadRules) {
      let rulesUpdated = false;
      if (!loadedRules.squadRules.maxSquadSize || loadedRules.squadRules.maxSquadSize > 9) {
        loadedRules.squadRules.maxSquadSize = 9;
        rulesUpdated = true;
      }
      if (!loadedRules.squadRules.minSquadSize || loadedRules.squadRules.minSquadSize > 9) {
        loadedRules.squadRules.minSquadSize = 9;
        rulesUpdated = true;
      }
      if (!loadedRules.squadRules.maxGradeA || loadedRules.squadRules.maxGradeA !== 2) {
        loadedRules.squadRules.maxGradeA = 2;
        rulesUpdated = true;
      }
      if (!loadedRules.squadRules.maxGradeB || loadedRules.squadRules.maxGradeB !== 3) {
        loadedRules.squadRules.maxGradeB = 3;
        rulesUpdated = true;
      }
      if (!loadedRules.squadRules.maxGradeC || loadedRules.squadRules.maxGradeC !== 2) {
        loadedRules.squadRules.maxGradeC = 2;
        rulesUpdated = true;
      }
      if (!loadedRules.squadRules.maxGradeASpending || loadedRules.squadRules.maxGradeASpending !== 30000) {
        loadedRules.squadRules.maxGradeASpending = 30000;
        rulesUpdated = true;
      }
      if (!loadedRules.squadRules.maxGradeBSpending || loadedRules.squadRules.maxGradeBSpending !== 18000) {
        loadedRules.squadRules.maxGradeBSpending = 18000;
        rulesUpdated = true;
      }
      if (!loadedRules.squadRules.maxCaptainViceCaptainSpending || loadedRules.squadRules.maxCaptainViceCaptainSpending !== 50000) {
        loadedRules.squadRules.maxCaptainViceCaptainSpending = 50000;
        rulesUpdated = true;
      }
      if (rulesUpdated) {
        localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(loadedRules));
      }
    }

    let loadedTeams: Team[] = rawTeams ? JSON.parse(rawTeams) : initialTeams;
    // Upgrade existing teams from legacy 50000 purse to 100000 purse
    let didUpdateTeamsPurse = false;
    loadedTeams = loadedTeams.map(t => {
      if (!t.startingBudget || t.startingBudget === 50000) {
        didUpdateTeamsPurse = true;
        const spent = t.totalSpent || 0;
        return {
          ...t,
          startingBudget: 100000,
          remainingBudget: Math.max(0, 100000 - spent),
        };
      }
      return t;
    });
    if (didUpdateTeamsPurse) {
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
    const rawLastSaved = localStorage.getItem(STORAGE_KEYS.LAST_SAVED);

    return {
      teams: loadedTeams,
      players: loadedPlayers,
      transactions: rawTransactions ? JSON.parse(rawTransactions) : [],
      rules: loadedRules,
      tournament: rawTournament ? JSON.parse(rawTournament) : initialTournamentInfo,
      currentPlayerId: rawCurrentPlayerId ? JSON.parse(rawCurrentPlayerId) : null,
      currentBid: rawCurrentBid ? Number(rawCurrentBid) : 0,
      currentBidderId: rawCurrentBidderId ? JSON.parse(rawCurrentBidderId) : null,
      bidHistory: rawBidHistory ? JSON.parse(rawBidHistory) : [],
      auctionOrderMode: (rawOrderMode as AuctionOrderingMode) || 'default',
      customAuctionOrderIds: rawCustomOrderIds ? JSON.parse(rawCustomOrderIds) : undefined,
      lastSaved: rawLastSaved || new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error loading stored auction state, resetting to demo:', err);
    return {
      teams: initialTeams,
      players: initialPlayers,
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
    if (state.players !== undefined) localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(state.players));
    if (state.transactions !== undefined) localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(state.transactions));
    if (state.rules !== undefined) localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(state.rules));
    if (state.tournament !== undefined) localStorage.setItem(STORAGE_KEYS.TOURNAMENT, JSON.stringify(state.tournament));
    if (state.currentPlayerId !== undefined) localStorage.setItem(STORAGE_KEYS.CURRENT_PLAYER_ID, JSON.stringify(state.currentPlayerId));
    if (state.currentBid !== undefined) localStorage.setItem(STORAGE_KEYS.CURRENT_BID, String(state.currentBid));
    if (state.currentBidderId !== undefined) localStorage.setItem(STORAGE_KEYS.CURRENT_BIDDER_ID, JSON.stringify(state.currentBidderId));
    if (state.bidHistory !== undefined) localStorage.setItem(STORAGE_KEYS.BID_HISTORY, JSON.stringify(state.bidHistory));
    if (state.auctionOrderMode !== undefined) localStorage.setItem(STORAGE_KEYS.AUCTION_ORDER_MODE, state.auctionOrderMode);
    if (state.customAuctionOrderIds !== undefined) localStorage.setItem(STORAGE_KEYS.CUSTOM_ORDER_IDS, JSON.stringify(state.customAuctionOrderIds));
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
    if (!patch) return p;
    return {
      ...p,
      ...patch,
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
