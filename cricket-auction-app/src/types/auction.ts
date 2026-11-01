export type PlayerRole = 'Batsman' | 'Bowler' | 'Wicketkeeper';
export type PlayerGrade = 'A+' | 'A' | 'B' | 'C';
export type BattingStyle = 'Right-hand bat' | 'Left-hand bat';
export type BowlingStyle = 
  | 'Right-arm fast' 
  | 'Right-arm medium' 
  | 'Left-arm fast' 
  | 'Left-arm medium' 
  | 'Right-arm off-break' 
  | 'Right-arm leg-break' 
  | 'Left-arm orthodox' 
  | 'Left-arm chinaman'
  | 'None';

export type PlayerStatus = 'upcoming' | 'in_auction' | 'sold' | 'unsold';

export interface PlayerStats {
  matches: number;
  runs: number;
  average: number;
  strikeRate: number;
  highestScore: number;
  fifties: number;
  hundreds: number;
  wickets: number;
  bowlingAverage: number;
  economyRate: number;
  bestBowling: string;
  catches: number;
  stumpings?: number;
}

export interface Player {
  id: string;
  name: string;
  age: number;
  ageCategory?: string; // e.g. "15 and Below" | "Above 15"
  gender?: string; // e.g. "Male" | "Female"
  dob?: string;
  photo?: string;
  experience: number; // in years
  role: PlayerRole;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
  grade: PlayerGrade;
  basePrice: number;
  stats: PlayerStats;
  description?: string;
  previousPerformance?: string;
  notes?: string;
  status: PlayerStatus;
  teamId?: string | null;
  soldPrice?: number | null;
  auctionOrder?: number;
  lotNumber?: number;
  category?: string;
  specialism?: string;
  isOverseas?: boolean;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  captainOfTeamId?: string;
  sponsorTag?: string;
  isSponsored?: boolean;
  cricheroesProfileUrl?: string;
  jcplPlayerId?: number;
  jcplSeasons?: string[];
  isPreAssignedCaptain?: boolean;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  color: string;
  secondaryColor?: string;
  owner?: string;
  captain?: string;
  captainPlayerId?: string;
  startingBudget: number;
  remainingBudget: number;
  totalSpent: number;
  squad: string[]; // Player IDs
  wishlist?: string[]; // Player IDs
}

export interface BidRecord {
  id: string;
  auctionId: string;
  playerId: string;
  teamId: string;
  teamName: string;
  amount: number;
  timestamp: string;
}

export interface AuctionTransaction {
  id: string;
  playerId: string;
  playerName: string;
  playerRole: PlayerRole;
  playerGrade: PlayerGrade;
  teamId: string;
  teamName: string;
  basePrice: number;
  soldPrice: number;
  timestamp: string;
  bidHistory: BidRecord[];
  undone?: boolean;
}

export interface SquadRules {
  minSquadSize: number;
  maxSquadSize: number;
  maxGradeAPlus?: number;
  maxGradeA?: number;
  maxGradeB?: number;
  maxGradeC?: number;
  minBatsmen?: number;
  minBowlers?: number;
  minWicketkeepers?: number;
  maxOverseas?: number;
}

export interface GradeBasePrices {
  gradeAPlus: number;
  gradeA: number;
  gradeB: number;
  gradeC: number;
}

export type AuctionOrderingMode = 'default' | 'grade' | 'custom';

export interface GradeCategoryMaxBid {
  id?: string;
  grade: PlayerGrade;
  category: PlayerRole | string; // e.g. "Batsman", "Bowler", "Wicketkeeper"
  maxBid: number;
}

export interface SaveLogEntry {
  id: string;
  timestamp: string;
  type: 'manual' | 'auto' | 'snapshot';
  status: 'success' | 'failure' | 'error';
  description: string;
  itemCountSummary?: {
    teams: number;
    players: number;
    transactions: number;
  };
}

export interface SaveSnapshot {
  id: string;
  timestamp: string;
  name?: string;
  type?: 'manual' | 'auto' | 'snapshot';
  description: string;
  teamsCount?: number;
  playersCount?: number;
  soldCount?: number;
  state: {
    players: Player[];
    teams: Team[];
    transactions: AuctionTransaction[];
    auctionOrderMode?: AuctionOrderingMode;
    customAuctionOrderIds?: string[];
    gradeCategoryMaxBids?: GradeCategoryMaxBid[];
    tournament: TournamentInfo;
    rules: AuctionRules;
    currentPlayerId?: string | null;
    currentBid?: number;
    currentBidderId?: string | null;
  };
}

export interface AuctionRules {
  startingBudget: number;
  minBidIncrement: number;
  quickIncrements: number[];
  timerDuration: number; // in seconds
  autoSellOnTimer: boolean;
  allowReAuction: boolean;
  soundEnabled: boolean;
  animationsEnabled: boolean;
  gradeBasePrices?: GradeBasePrices;
  gradeCategoryMaxBids?: GradeCategoryMaxBid[];
  captainCostMode?: 'zero' | 'custom' | 'basePrice';
  captainCustomCost?: number;
  squadRules: SquadRules;
}

export interface TournamentInfo {
  name: string;
  season: string;
  logo?: string;
  organizer: string;
  venue?: string;
  spectatorPin?: string;
}

export type ActiveNavTab = 
  | 'dashboard' 
  | 'live_auction' 
  | 'auction_order'
  | 'captain_management'
  | 'players' 
  | 'teams' 
  | 'history' 
  | 'unsold' 
  | 'analytics' 
  | 'ai_assistant' 
  | 'import_excel' 
  | 'save_logs'
  | 'settings'
  | 'complete';
