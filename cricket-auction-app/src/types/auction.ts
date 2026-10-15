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
  isOverseas?: boolean;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  captainOfTeamId?: string;
  sponsorTag?: string;
  isSponsored?: boolean;
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
  | 'players' 
  | 'teams' 
  | 'history' 
  | 'unsold' 
  | 'analytics' 
  | 'ai_assistant' 
  | 'import_excel' 
  | 'settings'
  | 'complete';
