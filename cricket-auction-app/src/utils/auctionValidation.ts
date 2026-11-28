import { Team, Player, PlayerGrade, AuctionRules } from '../types/auction';
import { normalizeGrade } from './gradeUtils';

/** Hard rules for a complete JCPL Mens auction. */
export const AUCTION_PROCESS = {
  TEAM_COUNT: 12,
  STARTING_PURSE: 100000,
  /** Combined captain (fixed base) + VC auction cannot exceed this. Unused remainder rolls into the 7-player purse. */
  CAPTAIN_VC_BUDGET: 50000,
  AUCTION_PURSE: 50000,
  CAPTAIN_ALLOCATED_FIRST: true,
  AUCTION_SLOTS: 7,
  SQUAD_SIZE: 9,
  GRADE_A_SLOTS: 9,
  GRADE_B_SLOTS: 9,
  GRADE_C_SLOTS: 9,
  GRADE_A_BUDGET: 100000,
  GRADE_B_BUDGET: 100000,
  GRADE_A_BASE: 1000,
  GRADE_B_BASE: 1000,
  GRADE_C_BASE: 1000,
  MIN_PLAYER_BASE_PRICE: 1000,
  MAX_SPONSORS_PER_TEAM: 1,
} as const;

export function gradeBasePrice(_grade: PlayerGrade, _rules?: AuctionRules): number {
  // Standardized base price: 1,000 points for all players regardless of grade
  return AUCTION_PROCESS.MIN_PLAYER_BASE_PRICE;
}

/**
 * Default captain cost from Captain Management when a per-team amount is not
 * passed. Each franchise may still pre-allocate a different cost (0–50,000).
 */
export function captainFixedCost(player: Player, rules?: AuctionRules): number {
  if (rules?.captainCostMode === 'basePrice') {
    return player.basePrice || gradeBasePrice(player.grade, rules);
  }
  if (rules?.captainCostMode === 'custom' && typeof rules.captainCustomCost === 'number') {
    return Math.max(0, Math.min(AUCTION_PROCESS.CAPTAIN_VC_BUDGET, rules.captainCustomCost));
  }
  return 0;
}

/** Unused part of the ₹50,000 C+VC cap, added to the other ₹50,000 for the 7-player auction. */
export function auctionPurseAfterLeadership(captainCost: number, viceCaptainCost: number): number {
  const used = captainCost + viceCaptainCost;
  const unusedLeadership = Math.max(0, AUCTION_PROCESS.CAPTAIN_VC_BUDGET - used);
  return AUCTION_PROCESS.AUCTION_PURSE + unusedLeadership;
}

export interface TeamGradeMetrics {
  // Grade A
  aCount: number;
  aLimit: number;
  aRemainingSlots: number;
  aSpent: number;
  aBudgetLimit: number;
  aRemainingBudget: number;

  // Grade B
  bCount: number;
  bLimit: number;
  bRemainingSlots: number;
  bSpent: number;
  bBudgetLimit: number;
  bRemainingBudget: number;

  // Grade C
  cCount: number;
  cLimit: number;
  cRemainingSlots: number;
  cSpent: number;

  // Captain & Vice Captain
  captainPlayer?: Player;
  captainCost: number;
  viceCaptainPlayer?: Player;
  viceCaptainCost: number;
  combinedCapCost: number;
  combinedCapLimit: number;
  remainingCapBudget: number;

  // Overall Squad
  auctionPlayersCount: number;
  totalSquadCount: number;
}

export function leftoverSlotsAfterPurchase(
  metrics: TeamGradeMetrics,
  _player: Player,
): { aLeft: number; bLeft: number; cLeft: number } {
  const totalSlotsLeft = Math.max(0, AUCTION_PROCESS.SQUAD_SIZE - metrics.totalSquadCount - 1);
  return { aLeft: totalSlotsLeft, bLeft: totalSlotsLeft, cLeft: totalSlotsLeft };
}

/**
 * Smart Franchise Purse Reserve:
 * Purse that must stay untouched so remaining squad slots can still be
 * filled at the minimum standardized base price (₹1,000 points per player).
 * There are no grade-specific quantity or spending caps.
 */
export function remainingCategoryReserve(
  metrics: TeamGradeMetrics,
  _player: Player,
  rules?: AuctionRules,
): number {
  const maxSquad = rules?.squadRules?.maxSquadSize ?? AUCTION_PROCESS.SQUAD_SIZE;
  const currentCount = metrics.totalSquadCount;
  const slotsRemainingAfter = Math.max(0, maxSquad - currentCount - 1);
  return slotsRemainingAfter * AUCTION_PROCESS.MIN_PLAYER_BASE_PRICE;
}

/**
 * Grade-specific budget reserve is removed as grade spending caps are completely eliminated.
 */
export function remainingGradeBudgetReserve(
  _metrics: TeamGradeMetrics,
  _player: Player,
  _rules?: AuctionRules,
): number {
  return 0;
}

/**
 * Purse that must stay untouched for captain + VC (₹50,000 combined) when
 * one or both have not been allotted yet. Already-allotted leadership is not
 * reserved again, even if soldPrice is still 0.
 */
export function remainingLeadershipReserve(_metrics: TeamGradeMetrics): number {
  // Leadership expenditure is already subtracted from team.remainingBudget directly.
  return 0;
}

/** Main auction (the extra 7 players) starts only after both captain and VC are allotted. */
export function hasCaptainAndViceCaptain(metrics: TeamGradeMetrics): boolean {
  return !!(metrics.captainPlayer && metrics.viceCaptainPlayer);
}

/**
 * Checks whether a player is designated as the Captain or Vice-Captain of a team.
 */
export function isCaptainOrViceCaptain(player: Player, team: Team): boolean {
  if (team.captainPlayerId && player.id === team.captainPlayerId) return true;
  if (team.viceCaptainPlayerId && player.id === team.viceCaptainPlayerId) return true;
  if (player.captainOfTeamId && player.captainOfTeamId === team.id) return true;
  if (player.viceCaptainOfTeamId && player.viceCaptainOfTeamId === team.id) return true;
  if ((player.isCaptain || player.isPreAssignedCaptain) && (player.teamId === team.id || (team.squad && team.squad.includes(player.id)))) return true;
  if ((player.isViceCaptain || player.isPreAssignedViceCaptain) && (player.teamId === team.id || (team.squad && team.squad.includes(player.id)))) return true;
  if (team.captain && player.name && player.name.trim().toLowerCase() === team.captain.trim().toLowerCase()) return true;
  if (team.viceCaptain && player.name && player.name.trim().toLowerCase() === team.viceCaptain.trim().toLowerCase()) return true;
  return false;
}

/**
 * Checks whether a player is designated as Captain or Vice-Captain of ANY team.
 */
export function isLeadershipPlayer(player: Player, allTeams: Team[]): { isLeadership: boolean; isCaptain: boolean; isViceCaptain: boolean; team?: Team } {
  for (const team of allTeams) {
    if (team.captainPlayerId === player.id || player.captainOfTeamId === team.id || (team.captain && player.name.trim().toLowerCase() === team.captain.trim().toLowerCase())) {
      return { isLeadership: true, isCaptain: true, isViceCaptain: false, team };
    }
    if (team.viceCaptainPlayerId === player.id || player.viceCaptainOfTeamId === team.id || (team.viceCaptain && player.name.trim().toLowerCase() === team.viceCaptain.trim().toLowerCase())) {
      return { isLeadership: true, isCaptain: false, isViceCaptain: true, team };
    }
    if ((player.isCaptain || player.isPreAssignedCaptain) && (player.teamId === team.id || (team.squad && team.squad.includes(player.id)))) {
      return { isLeadership: true, isCaptain: true, isViceCaptain: false, team };
    }
    if ((player.isViceCaptain || player.isPreAssignedViceCaptain) && (player.teamId === team.id || (team.squad && team.squad.includes(player.id)))) {
      return { isLeadership: true, isCaptain: false, isViceCaptain: true, team };
    }
  }
  return {
    isLeadership: Boolean(player.isCaptain || player.isViceCaptain || player.isPreAssignedCaptain || player.isPreAssignedViceCaptain),
    isCaptain: Boolean(player.isCaptain || player.isPreAssignedCaptain),
    isViceCaptain: Boolean(player.isViceCaptain || player.isPreAssignedViceCaptain),
  };
}

/**
 * Calculates grade counts, grade spending, and captain/vice-captain metrics for a team.
 * IMPORTANT: Captain and Vice-Captain are strictly excluded from grade counts and grade spending limits.
 * AUCTION PLAYERS MUST be strictly in team.squad AND p.status === 'sold' AND p.teamId === team.id.
 */
export function getTeamGradeMetrics(
  team: Team,
  allPlayers: Player[],
  rules?: AuctionRules
): TeamGradeMetrics {
  const squadPlayers = allPlayers.filter(p => {
    if (isCaptainOrViceCaptain(p, team)) return true;
    return Boolean(
      team.squad &&
      team.squad.includes(p.id) &&
      p.status === 'sold' &&
      p.teamId === team.id
    );
  });

  // Identify Captain
  const captainPlayer = squadPlayers.find(p =>
    (team.captainPlayerId && p.id === team.captainPlayerId) ||
    p.captainOfTeamId === team.id ||
    (p.isCaptain && (p.teamId === team.id || (team.squad && team.squad.includes(p.id)))) ||
    (team.captain && p.name && p.name.trim().toLowerCase() === team.captain.trim().toLowerCase())
  ) || allPlayers.find(p =>
    (team.captainPlayerId && p.id === team.captainPlayerId) ||
    p.captainOfTeamId === team.id ||
    (team.captain && p.name && p.name.trim().toLowerCase() === team.captain.trim().toLowerCase())
  );

  // Identify Vice-Captain
  const viceCaptainPlayer = squadPlayers.find(p =>
    (team.viceCaptainPlayerId && p.id === team.viceCaptainPlayerId) ||
    p.viceCaptainOfTeamId === team.id ||
    (p.isViceCaptain && (p.teamId === team.id || (team.squad && team.squad.includes(p.id)))) ||
    (team.viceCaptain && p.name && p.name.trim().toLowerCase() === team.viceCaptain.trim().toLowerCase())
  ) || allPlayers.find(p =>
    (team.viceCaptainPlayerId && p.id === team.viceCaptainPlayerId) ||
    p.viceCaptainOfTeamId === team.id ||
    (team.viceCaptain && p.name && p.name.trim().toLowerCase() === team.viceCaptain.trim().toLowerCase())
  );

  const captainCost = captainPlayer?.soldPrice || 0;
  const viceCaptainCost = viceCaptainPlayer?.soldPrice || 0;
  const combinedCapCost = captainCost + viceCaptainCost;
  const combinedCapLimit = rules?.squadRules?.maxCaptainViceCaptainSpending ?? 50000;
  const remainingCapBudget = Math.max(0, combinedCapLimit - combinedCapCost);

  // Auction-purchased players (strictly excluding Captain and Vice-Captain)
  const auctionPlayers = squadPlayers.filter(p => {
    if (captainPlayer && p.id === captainPlayer.id) return false;
    if (viceCaptainPlayer && p.id === viceCaptainPlayer.id) return false;
    if (isCaptainOrViceCaptain(p, team)) return false;
    return true;
  });

  const squadLimit = rules?.squadRules?.maxSquadSize ?? AUCTION_PROCESS.SQUAD_SIZE;
  const remainingSquadSlots = Math.max(0, squadLimit - squadPlayers.length);

  // Grade counts are for information and statistics (Grade caps are eliminated)
  const aPlayers = auctionPlayers.filter(p => {
    const g = normalizeGrade(p.grade);
    return g === 'A' || g === 'A+';
  });
  const aLimit = squadLimit; // No artificial grade cap
  const aCount = aPlayers.length;
  const aRemainingSlots = remainingSquadSlots;
  const aSpent = aPlayers.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
  const aBudgetLimit = team.startingBudget || 100000;
  const aRemainingBudget = team.remainingBudget;

  const bPlayers = auctionPlayers.filter(p => normalizeGrade(p.grade) === 'B');
  const bLimit = squadLimit; // No artificial grade cap
  const bCount = bPlayers.length;
  const bRemainingSlots = remainingSquadSlots;
  const bSpent = bPlayers.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
  const bBudgetLimit = team.startingBudget || 100000;
  const bRemainingBudget = team.remainingBudget;

  const cPlayers = auctionPlayers.filter(p => normalizeGrade(p.grade) === 'C');
  const cLimit = squadLimit; // No artificial grade cap
  const cCount = cPlayers.length;
  const cRemainingSlots = remainingSquadSlots;
  const cSpent = cPlayers.reduce((sum, p) => sum + (p.soldPrice || 0), 0);

  return {
    aCount,
    aLimit,
    aRemainingSlots,
    aSpent,
    aBudgetLimit,
    aRemainingBudget,

    bCount,
    bLimit,
    bRemainingSlots,
    bSpent,
    bBudgetLimit,
    bRemainingBudget,

    cCount,
    cLimit,
    cRemainingSlots,
    cSpent,

    captainPlayer,
    captainCost,
    viceCaptainPlayer,
    viceCaptainCost,
    combinedCapCost,
    combinedCapLimit,
    remainingCapBudget,

    auctionPlayersCount: auctionPlayers.length,
    totalSquadCount: squadPlayers.length,
  };
}

/**
 * Calculates aligned team purse and spending metrics taking into account
 * leadership allotments and auction spending.
 */
export function calculateTeamBudgetMetrics(
  team: Team,
  allPlayers: Player[],
  transactions: any[] = [],
  rules?: AuctionRules
): {
  startingBudget: number;
  totalSpent: number;
  remainingBudget: number;
  leadershipCost: number;
  auctionSpent: number;
} {
  const startBudget = team.startingBudget || rules?.startingBudget || 100000;
  const gradeMetrics = getTeamGradeMetrics(team, allPlayers, rules);
  const leadershipCost = gradeMetrics.combinedCapCost;

  // Actual auction spending from transactions (or squad auction players if transactions empty)
  const txSpent = (transactions || [])
    .filter(tx => !tx.undone && tx.teamId === team.id)
    .reduce((sum, tx) => sum + (tx.soldPrice || 0), 0);

  // If no transactions recorded but squad has auction players with soldPrice
  const squadAuctionSpent = gradeMetrics.aSpent + gradeMetrics.bSpent + gradeMetrics.cSpent;
  const auctionSpent = Math.max(txSpent, squadAuctionSpent);

  const totalSpent = leadershipCost + auctionSpent;
  const remainingBudget = Math.max(0, startBudget - totalSpent);

  return {
    startingBudget: startBudget,
    totalSpent,
    remainingBudget,
    leadershipCost,
    auctionSpent,
  };
}

/**
 * Validates whether a purchase (live bid, direct sell, allotment) can be made by a team.
 */
export function validatePurchase(
  team: Team,
  player: Player,
  amount: number,
  allPlayers: Player[],
  rules: AuctionRules
): { isValid: boolean; error?: string } {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
    return { isValid: false, error: 'Sale or bid amount must be a finite number greater than 0.' };
  }

  if (amount > team.remainingBudget) {
    return {
      isValid: false,
      error: `Insufficient budget! ${team.name} has only ₹${team.remainingBudget.toLocaleString('en-IN')} points remaining.`
    };
  }

  const metrics = getTeamGradeMetrics(team, allPlayers, rules);

  // 1. Process order: VC auction first, then captain, combined ≤ 50,000.
  //    Main 7-player auction starts only after both are finalized.
  const isCap = player.isCaptain || player.id === team.captainPlayerId || player.captainOfTeamId === team.id;
  const isVc = player.isViceCaptain || player.id === team.viceCaptainPlayerId || player.viceCaptainOfTeamId === team.id;

  if (amount === 0 && !isCap && !isVc) {
    return { isValid: false, error: 'Sale or bid amount must be a finite number greater than 0.' };
  }

  if (player.status === 'sold' && player.teamId && player.teamId !== team.id) {
    return {
      isValid: false,
      error: `${player.name} is already sold to another team.`,
    };
  }

  // Sponsor limit applies to every allotment, including captain / VC
  const isPlayerSponsored = !!(player.isSponsored || (player.sponsorTag && player.sponsorTag.trim()));
  if (isPlayerSponsored) {
    const squadPlayers = allPlayers.filter(p => team.squad.includes(p.id) || p.teamId === team.id);
    const existingSponsored = squadPlayers.find(p => (p.isSponsored || (p.sponsorTag && p.sponsorTag.trim())) && p.id !== player.id);
    if (existingSponsored) {
      return {
        isValid: false,
        error: `Sponsor limit reached! ${team.name} already has a sponsored player (${existingSponsored.name}). Each team can have at most 1 sponsored player.`
      };
    }
  }

  if (isCap) {
    if (metrics.captainPlayer && metrics.captainPlayer.id !== player.id) {
      return {
        isValid: false,
        error: `${team.name} already has a Captain (${metrics.captainPlayer.name}).`,
      };
    }
    if (metrics.viceCaptainCost + amount > AUCTION_PROCESS.CAPTAIN_VC_BUDGET) {
      return {
        isValid: false,
        error: `Captain and Vice-Captain combined budget cannot exceed 50,000 points. (Current VC: ₹${metrics.viceCaptainCost.toLocaleString('en-IN')}, Attempted Captain: ₹${amount.toLocaleString('en-IN')})`
      };
    }
    return { isValid: true };
  }

  if (isVc) {
    if (!metrics.captainPlayer) {
      return {
        isValid: false,
        error: `Captain must be allocated at a fixed base before ${team.name} can auction a Vice-Captain.`,
      };
    }
    if (metrics.viceCaptainPlayer && metrics.viceCaptainPlayer.id !== player.id) {
      return {
        isValid: false,
        error: `${team.name} already has a Vice-Captain (${metrics.viceCaptainPlayer.name}).`,
      };
    }
    const vcBase = gradeBasePrice(player.grade, rules);
    if (amount < vcBase) {
      return {
        isValid: false,
        error: `VC bid cannot be below the Grade ${player.grade} base price of ₹${vcBase.toLocaleString('en-IN')}.`,
      };
    }
    if (metrics.captainCost + amount > AUCTION_PROCESS.CAPTAIN_VC_BUDGET) {
      return {
        isValid: false,
        error: `Captain and Vice-Captain combined budget cannot exceed 50,000 points. (Current Captain: ₹${metrics.captainCost.toLocaleString('en-IN')}, Attempted VC: ₹${amount.toLocaleString('en-IN')})`
      };
    }
    return { isValid: true };
  }

  if (team.squad.includes(player.id) || (player.teamId === team.id && player.status === 'sold')) {
    return {
      isValid: false,
      error: `${player.name} is already in ${team.name}'s squad.`,
    };
  }

  // 3. Squad Capacity Check (Maximum 9 players per team)
  const maxSquadSize = rules?.squadRules?.maxSquadSize ?? AUCTION_PROCESS.SQUAD_SIZE;
  if (team.squad.length >= maxSquadSize) {
    return {
      isValid: false,
      error: `Squad limit reached! ${team.name} already has the maximum ${maxSquadSize} players.`
    };
  }

  // 4. Minimum Standard Base Price Check (Standard 1,000 pts for all grades)
  const minBase = AUCTION_PROCESS.MIN_PLAYER_BASE_PRICE;
  if (amount < minBase) {
    return {
      isValid: false,
      error: `Bid or sale amount cannot be below the standardized base price of ₹${minBase.toLocaleString('en-IN')} points.`,
    };
  }

  // 5. Smart Franchise Purse Management:
  //    Calculate mandatory reserve required to fill remaining unfilled squad slots at 1,000 pts minimum.
  const slotsRemainingAfterThis = Math.max(0, maxSquadSize - team.squad.length - 1);
  const minReserveRequired = slotsRemainingAfterThis * AUCTION_PROCESS.MIN_PLAYER_BASE_PRICE;

  if (amount > team.remainingBudget - minReserveRequired) {
    return {
      isValid: false,
      error: `Smart Reserve Alert! ${team.name} must reserve at least ₹${minReserveRequired.toLocaleString('en-IN')} points to fill remaining ${slotsRemainingAfterThis} squad slot${slotsRemainingAfterThis !== 1 ? 's' : ''} (min ₹1,000/player). Max allowable spend is ₹${Math.max(0, team.remainingBudget - minReserveRequired).toLocaleString('en-IN')}.`
    };
  }

  return { isValid: true };
}

/**
 * Calculates the exact maximum allowable bid for a team on a specific player,
 * considering team purse and smart squad reserve requirements.
 * (Grade caps are eliminated; team may purchase any combination of grades).
 */
export function calculateMaxAllowableBidForPlayer(
  team: Team,
  player: Player | null | undefined,
  allPlayers: Player[],
  rules: AuctionRules
): { maxBid: number; minReserveRequired: number; remainingSlotsNeeded: number; reason?: string } {
  const maxSquadSize = rules?.squadRules?.maxSquadSize ?? AUCTION_PROCESS.SQUAD_SIZE;

  if (!player) {
    return {
      maxBid: Math.max(0, team.remainingBudget),
      minReserveRequired: 0,
      remainingSlotsNeeded: 0
    };
  }

  const metrics = getTeamGradeMetrics(team, allPlayers, rules);

  const isCap = player.isCaptain || player.id === team.captainPlayerId || player.captainOfTeamId === team.id;
  const isVc = player.isViceCaptain || player.id === team.viceCaptainPlayerId || player.viceCaptainOfTeamId === team.id;

  if (player.status === 'sold' && player.teamId && player.teamId !== team.id) {
    return {
      maxBid: 0,
      minReserveRequired: 0,
      remainingSlotsNeeded: 0,
      reason: `${player.name} is already sold to another team.`,
    };
  }

  if (!isCap && !isVc && (team.squad.includes(player.id) || (player.teamId === team.id && player.status === 'sold'))) {
    return {
      maxBid: 0,
      minReserveRequired: 0,
      remainingSlotsNeeded: 0,
      reason: `${player.name} is already in ${team.name}'s squad.`,
    };
  }

  if (isCap) {
    const capLeft = Math.max(0, AUCTION_PROCESS.CAPTAIN_VC_BUDGET - metrics.viceCaptainCost);
    const maxBid = Math.min(Math.max(0, team.remainingBudget), capLeft);
    return {
      maxBid,
      minReserveRequired: 0,
      remainingSlotsNeeded: 0,
      reason: `Captain pre-allocated cost (per team) up to ₹${maxBid.toLocaleString('en-IN')} so Captain + VC stay within ₹50,000.`,
    };
  }

  if (isVc) {
    if (!metrics.captainPlayer) {
      return {
        maxBid: 0,
        minReserveRequired: 0,
        remainingSlotsNeeded: 0,
        reason: `Captain must be allocated at a fixed base before ${team.name} can auction a Vice-Captain.`,
      };
    }
    const capLeft = Math.max(0, AUCTION_PROCESS.CAPTAIN_VC_BUDGET - metrics.captainCost);
    const maxBid = Math.min(Math.max(0, team.remainingBudget), capLeft);
    return {
      maxBid,
      minReserveRequired: 0,
      remainingSlotsNeeded: 0,
      reason: `VC auction: up to ₹${maxBid.toLocaleString('en-IN')} so Captain + VC stay within ₹50,000.`,
    };
  }

  // Check squad capacity
  if (team.squad.length >= maxSquadSize) {
    return {
      maxBid: 0,
      minReserveRequired: 0,
      remainingSlotsNeeded: 0,
      reason: `Squad limit reached (${team.squad.length}/${maxSquadSize} players).`
    };
  }

  const slotsRemainingAfterThis = Math.max(0, maxSquadSize - team.squad.length - 1);
  const minReserveRequired = slotsRemainingAfterThis * AUCTION_PROCESS.MIN_PLAYER_BASE_PRICE;

  let maxBid = Math.max(0, team.remainingBudget - minReserveRequired);
  let reason: string | undefined = minReserveRequired > 0
    ? `Must reserve ₹${minReserveRequired.toLocaleString('en-IN')} to fill remaining ${slotsRemainingAfterThis} squad slot${slotsRemainingAfterThis !== 1 ? 's' : ''} (₹1,000/slot).`
    : undefined;

  if (maxBid < AUCTION_PROCESS.MIN_PLAYER_BASE_PRICE) {
    return {
      maxBid: 0,
      minReserveRequired,
      remainingSlotsNeeded: slotsRemainingAfterThis,
      reason: `Cannot bid without dropping below the mandatory squad reserve (₹1,000/slot).`,
    };
  }

  return {
    maxBid,
    minReserveRequired,
    remainingSlotsNeeded: slotsRemainingAfterThis,
    reason
  };
}
