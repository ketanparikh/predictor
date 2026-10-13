import { Team, Player, AuctionTransaction, AuctionRules, TournamentInfo } from '../types/auction';
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

    // Normalize grade base prices to 5000, 3000, 1000
    if (
      !loadedRules.gradeBasePrices ||
      loadedRules.gradeBasePrices.gradeA === 5100 ||
      loadedRules.gradeBasePrices.gradeB === 3100 ||
      loadedRules.gradeBasePrices.gradeC === 1100
    ) {
      loadedRules = {
        ...loadedRules,
        gradeBasePrices: {
          gradeA: 5000,
          gradeB: 3000,
          gradeC: 1000,
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

    return {
      teams: rawTeams ? JSON.parse(rawTeams) : initialTeams,
      players: loadedPlayers,
      transactions: rawTransactions ? JSON.parse(rawTransactions) : [],
      rules: loadedRules,
      tournament: rawTournament ? JSON.parse(rawTournament) : initialTournamentInfo,
      currentPlayerId: rawCurrentPlayerId ? JSON.parse(rawCurrentPlayerId) : null,
      currentBid: rawCurrentBid ? Number(rawCurrentBid) : 0,
      currentBidderId: rawCurrentBidderId ? JSON.parse(rawCurrentBidderId) : null,
      bidHistory: rawBidHistory ? JSON.parse(rawBidHistory) : [],
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
  } catch (err) {
    console.error('Error saving auction state to localStorage:', err);
  }
};

export const exportStateAsJSON = (state: AppStoredState): void => {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `auction_backup_100_players_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

export const clearAuctionStorage = (): void => {
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  LEGACY_STORAGE_PREFIXES.forEach(k => localStorage.removeItem(k));
};
