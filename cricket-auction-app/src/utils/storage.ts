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

    let loadedTeams: Team[] = rawTeams ? JSON.parse(rawTeams) : initialTeams;
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
          startingBudget: loadedRules.startingBudget || 50000,
          remainingBudget: loadedRules.startingBudget || 50000,
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
    const updated = [entry, ...logs].slice(0, 100); // keep last 100 operations
    localStorage.setItem(STORAGE_KEYS.SAVE_LOGS, JSON.stringify(updated));
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
