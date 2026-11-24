import { Team, Player, PlayerGrade, AuctionRules } from '../types/auction';

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
  GRADE_A_SLOTS: 2,
  GRADE_B_SLOTS: 3,
  GRADE_C_SLOTS: 2,
  GRADE_A_BUDGET: 30000,
  GRADE_B_BUDGET: 18000,
  GRADE_A_BASE: 5000,
  GRADE_B_BASE: 3000,
  GRADE_C_BASE: 1000,
  MAX_SPONSORS_PER_TEAM: 1,
} as const;

export function gradeBasePrice(grade: PlayerGrade, rules?: AuctionRules): number {
  const prices = rules?.gradeBasePrices;
  if (grade === 'A+') return prices?.gradeAPlus ?? 7000;
  if (grade === 'A') return prices?.gradeA ?? AUCTION_PROCESS.GRADE_A_BASE;
  if (grade === 'B') return prices?.gradeB ?? AUCTION_PROCESS.GRADE_B_BASE;
  return prices?.gradeC ?? AUCTION_PROCESS.GRADE_C_BASE;
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
  player: Player,
): { aLeft: number; bLeft: number; cLeft: number } {
  let aLeft = metrics.aRemainingSlots;
  let bLeft = metrics.bRemainingSlots;
  let cLeft = metrics.cRemainingSlots;
  if (player.grade === 'A' || player.grade === 'A+') {
    aLeft = Math.max(0, aLeft - 1);
  } else if (player.grade === 'B') {
    bLeft = Math.max(0, bLeft - 1);
  } else if (player.grade === 'C') {
    cLeft = Math.max(0, cLeft - 1);
  }
  return { aLeft, bLeft, cLeft };
}

/**
 * Purse that must stay untouched so remaining 2A / 3B / 2C slots can still be
 * filled at grade base prices after this purchase.
 */
export function remainingCategoryReserve(
  metrics: TeamGradeMetrics,
  player: Player,
  rules: AuctionRules,
): number {
  const { aLeft, bLeft, cLeft } = leftoverSlotsAfterPurchase(metrics, player);
  return (
    aLeft * gradeBasePrice('A', rules) +
    bLeft * gradeBasePrice('B', rules) +
    cLeft * gradeBasePrice('C', rules)
  );
}

/**
 * Grade A/B budget that must stay untouched so leftover slots of the same
 * grade can still be bought at base price (A cap 30000, B cap 18000).
 */
export function remainingGradeBudgetReserve(
  metrics: TeamGradeMetrics,
  player: Player,
  rules: AuctionRules,
): number {
  const leftover = leftoverSlotsAfterPurchase(metrics, player);
  if (player.grade === 'A' || player.grade === 'A+') {
    return leftover.aLeft * gradeBasePrice('A', rules);
  }
  if (player.grade === 'B') {
    return leftover.bLeft * gradeBasePrice('B', rules);
  }
  return 0;
}

/**
 * Purse that must stay untouched for captain + VC (₹50,000 combined) when
 * one or both have not been allotted yet. Already-allotted leadership is not
 * reserved again, even if soldPrice is still 0.
 */
export function remainingLeadershipReserve(metrics: TeamGradeMetrics): number {
  if (hasCaptainAndViceCaptain(metrics)) return 0;
  return Math.max(0, metrics.remainingCapBudget);
}

/** Main auction (the extra 7 players) starts only after both captain and VC are allotted. */
export function hasCaptainAndViceCaptain(metrics: TeamGradeMetrics): boolean {
  return !!(metrics.captainPlayer && metrics.viceCaptainPlayer);
}

/**
 * Checks whether a player is designated as the Captain or Vice-Captain of a team.
 */
export function isCaptainOrViceCaptain(player: Player, team: Team): boolean {
  if (team.captainPlayerId === player.id || team.viceCaptainPlayerId === player.id) return true;
  if (player.captainOfTeamId === team.id || player.viceCaptainOfTeamId === team.id) return true;
  if ((player.isCaptain || player.isPreAssignedCaptain) && (player.teamId === team.id || team.squad.includes(player.id))) return true;
  if ((player.isViceCaptain || player.isPreAssignedViceCaptain) && (player.teamId === team.id || team.squad.includes(player.id))) return true;
  if (team.captain && player.name.trim().toLowerCase() === team.captain.trim().toLowerCase()) return true;
  if (team.viceCaptain && player.name.trim().toLowerCase() === team.viceCaptain.trim().toLowerCase()) return true;
  return false;
}

/**
 * Calculates grade counts, grade spending, and captain/vice-captain metrics for a team.
 * IMPORTANT: Captain and Vice-Captain are strictly excluded from grade counts and grade spending limits.
 */
export function getTeamGradeMetrics(
  team: Team,
  allPlayers: Player[],
  rules?: AuctionRules
): TeamGradeMetrics {
  const squadPlayers = allPlayers.filter(p => {
    if (isCaptainOrViceCaptain(p, team)) return true;
    if (team.squad && team.squad.includes(p.id)) {
      return p.status === 'sold';
    }
    if (p.teamId === team.id && p.status === 'sold') {
      return true;
    }
    return false;
  });

  // Identify Captain
  const captainPlayer = squadPlayers.find(p =>
    (team.captainPlayerId && p.id === team.captainPlayerId) ||
    p.captainOfTeamId === team.id ||
    p.id === team.captainPlayerId ||
    (p.isCaptain && (p.teamId === team.id || team.squad.includes(p.id))) ||
    (team.captain && p.name.trim().toLowerCase() === team.captain.trim().toLowerCase())
  ) || allPlayers.find(p => (team.captainPlayerId && p.id === team.captainPlayerId) || p.captainOfTeamId === team.id);

  // Identify Vice-Captain
  const viceCaptainPlayer = squadPlayers.find(p =>
    (team.viceCaptainPlayerId && p.id === team.viceCaptainPlayerId) ||
    p.viceCaptainOfTeamId === team.id ||
    p.id === team.viceCaptainPlayerId ||
    (p.isViceCaptain && (p.teamId === team.id || team.squad.includes(p.id))) ||
    (team.viceCaptain && p.name.trim().toLowerCase() === team.viceCaptain.trim().toLowerCase())
  ) || allPlayers.find(p => (team.viceCaptainPlayerId && p.id === team.viceCaptainPlayerId) || p.viceCaptainOfTeamId === team.id);

  const captainCost = captainPlayer?.soldPrice || 0;
  const viceCaptainCost = viceCaptainPlayer?.soldPrice || 0;
  const combinedCapCost = captainCost + viceCaptainCost;
  const combinedCapLimit = rules?.squadRules?.maxCaptainViceCaptainSpending ?? 50000;
  const remainingCapBudget = Math.max(0, combinedCapLimit - combinedCapCost);

  // Auction-purchased players (excluding Captain and Vice-Captain)
  const auctionPlayers = squadPlayers.filter(p => {
    if (captainPlayer && p.id === captainPlayer.id) return false;
    if (viceCaptainPlayer && p.id === viceCaptainPlayer.id) return false;
    return true;
  });

  // Grade A (A & A+): Strict hard cap of max 2 auction players (excluding Captain & Vice-Captain)
  const aPlayers = auctionPlayers.filter(p => p.grade === 'A' || p.grade === 'A+');
  const aLimit = Math.min(2, rules?.squadRules?.maxGradeA ?? 2);
  const aCount = aPlayers.length;
  const aRemainingSlots = Math.max(0, aLimit - aCount);
  const aSpent = aPlayers.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
  const aBudgetLimit = Math.min(30000, rules?.squadRules?.maxGradeASpending ?? 30000);
  const aRemainingBudget = Math.max(0, aBudgetLimit - aSpent);

  // Grade B: Strict hard cap of max 3 auction players (excluding Captain & Vice-Captain)
  const bPlayers = auctionPlayers.filter(p => p.grade === 'B');
  const bLimit = Math.min(3, rules?.squadRules?.maxGradeB ?? 3);
  const bCount = bPlayers.length;
  const bRemainingSlots = Math.max(0, bLimit - bCount);
  const bSpent = bPlayers.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
  const bBudgetLimit = Math.min(18000, rules?.squadRules?.maxGradeBSpending ?? 18000);
  const bRemainingBudget = Math.max(0, bBudgetLimit - bSpent);

  // Grade C: Strict hard cap of max 2 auction players (excluding Captain & Vice-Captain)
  const cPlayers = auctionPlayers.filter(p => p.grade === 'C');
  const cLimit = Math.min(2, rules?.squadRules?.maxGradeC ?? 2);
  const cCount = cPlayers.length;
  const cRemainingSlots = Math.max(0, cLimit - cCount);
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

  if (!hasCaptainAndViceCaptain(metrics)) {
    return {
      isValid: false,
      error: `Captain and Vice-Captain must be finalized before ${team.name} can bid in the main 7-player auction.`,
    };
  }

  if (team.squad.includes(player.id) || (player.teamId === team.id && player.status === 'sold')) {
    return {
      isValid: false,
      error: `${player.name} is already in ${team.name}'s squad.`,
    };
  }

  const minBase = gradeBasePrice(player.grade, rules);
  if (amount < minBase) {
    return {
      isValid: false,
      error: `Bid cannot be below the Grade ${player.grade} base price of ₹${minBase.toLocaleString('en-IN')}.`,
    };
  }

  // 3. Auction-Purchased Player Limits (Excluding Captain & Vice-Captain)
  if (metrics.auctionPlayersCount >= AUCTION_PROCESS.AUCTION_SLOTS) {
    return {
      isValid: false,
      error: `Squad limit reached! ${team.name} already has ${AUCTION_PROCESS.AUCTION_SLOTS} auction players besides Captain and Vice-Captain.`
    };
  }

  // 4. Grade-Wise Player Limits & Budgets
  const gradeBudgetReserve = remainingGradeBudgetReserve(metrics, player, rules);

  // Grade A (Strict hard limit: Max 2 players, Max ₹30,000 combined, leave base for leftover A slots)
  if (player.grade === 'A' || player.grade === 'A+') {
    if (metrics.aCount >= 2 || metrics.aRemainingSlots <= 0) {
      return {
        isValid: false,
        error: `A Grade player limit reached (${metrics.aCount}/2). Team ${team.name} already has the maximum allowed 2 Grade A players.`
      };
    }
    const aSpendable = metrics.aRemainingBudget - gradeBudgetReserve;
    if (amount > aSpendable) {
      return {
        isValid: false,
        error: `Insufficient A Grade budget remaining. Limit: ₹30,000, Spent: ₹${metrics.aSpent.toLocaleString('en-IN')}, Remaining: ₹${metrics.aRemainingBudget.toLocaleString('en-IN')}, must reserve ₹${gradeBudgetReserve.toLocaleString('en-IN')} for leftover A slots.`
      };
    }
  }

  // Grade B (Strict hard limit: Max 3 players, Max ₹18,000 combined, leave base for leftover B slots)
  if (player.grade === 'B') {
    if (metrics.bCount >= 3 || metrics.bRemainingSlots <= 0) {
      return {
        isValid: false,
        error: `B Grade player limit reached (${metrics.bCount}/3). Team ${team.name} already has the maximum allowed 3 Grade B players.`
      };
    }
    const bSpendable = metrics.bRemainingBudget - gradeBudgetReserve;
    if (amount > bSpendable) {
      return {
        isValid: false,
        error: `B Grade spending limit exceeded. Limit: ₹18,000, Spent: ₹${metrics.bSpent.toLocaleString('en-IN')}, Remaining: ₹${metrics.bRemainingBudget.toLocaleString('en-IN')}, must reserve ₹${gradeBudgetReserve.toLocaleString('en-IN')} for leftover B slots.`
      };
    }
  }

  // Grade C (Strict hard limit: Max 2 players)
  if (player.grade === 'C') {
    if (metrics.cCount >= 2 || metrics.cRemainingSlots <= 0) {
      return {
        isValid: false,
        error: `C Grade player limit reached (${metrics.cCount}/2). Team ${team.name} already has the maximum allowed 2 Grade C players.`
      };
    }
  }

  // 5. Reserve required so remaining 2A / 3B / 2C slots can still be filled at base price
  //    and so unassigned captain / VC still have their ₹50,000 combined purse.
  const minReserveRequired = remainingCategoryReserve(metrics, player, rules);
  const leadershipReserve = remainingLeadershipReserve(metrics);
  const totalReserve = minReserveRequired + leadershipReserve;
  if (amount > team.remainingBudget - totalReserve) {
    const slotsRemainingAfterThis =
      metrics.aRemainingSlots +
      metrics.bRemainingSlots +
      metrics.cRemainingSlots -
      1;
    return {
      isValid: false,
      error: `Overspending Alert! Must reserve ₹${totalReserve.toLocaleString('en-IN')} pts to complete remaining A/B/C slots (${Math.max(0, slotsRemainingAfterThis)} left after this buy)${leadershipReserve > 0 ? ' and captain/VC' : ''}.`
    };
  }

  return { isValid: true };
}

/**
 * Calculates the exact maximum allowable bid for a team on a specific player,
 * considering team purse, grade slot limits, grade spending caps, and squad reserve requirements.
 */
export function calculateMaxAllowableBidForPlayer(
  team: Team,
  player: Player | null | undefined,
  allPlayers: Player[],
  rules: AuctionRules
): { maxBid: number; minReserveRequired: number; remainingSlotsNeeded: number; reason?: string } {
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
      reason: `VC auction: up to ₹${maxBid.toLocaleString('en-IN')} so Captain + VC stay within ₹50,000. Unused cap rolls into the 7-player purse.`,
    };
  }

  if (!hasCaptainAndViceCaptain(metrics)) {
    return {
      maxBid: 0,
      minReserveRequired: AUCTION_PROCESS.CAPTAIN_VC_BUDGET,
      remainingSlotsNeeded: AUCTION_PROCESS.AUCTION_SLOTS,
      reason: `Captain and Vice-Captain must be finalized before ${team.name} can bid in the main 7-player auction.`,
    };
  }

  // If grade limit is already reached, maximum bid is strictly 0!
  if (player.grade === 'A' || player.grade === 'A+') {
    if (metrics.aCount >= 2 || metrics.aRemainingSlots <= 0) {
      return {
        maxBid: 0,
        minReserveRequired: 0,
        remainingSlotsNeeded: 0,
        reason: `A Grade player limit reached (${metrics.aCount}/2). Team ${team.name} has reached the maximum 2 Grade A players.`
      };
    }
  } else if (player.grade === 'B') {
    if (metrics.bCount >= 3 || metrics.bRemainingSlots <= 0) {
      return {
        maxBid: 0,
        minReserveRequired: 0,
        remainingSlotsNeeded: 0,
        reason: `B Grade player limit reached (${metrics.bCount}/3). Team ${team.name} has reached the maximum 3 Grade B players.`
      };
    }
  } else if (player.grade === 'C') {
    if (metrics.cCount >= 2 || metrics.cRemainingSlots <= 0) {
      return {
        maxBid: 0,
        minReserveRequired: 0,
        remainingSlotsNeeded: 0,
        reason: `C Grade player limit reached (${metrics.cCount}/2). Team ${team.name} has reached the maximum 2 Grade C players.`
      };
    }
  }

  const minReserveRequired = remainingCategoryReserve(metrics, player, rules);
  const leadershipReserve = remainingLeadershipReserve(metrics);
  const slotsRemainingAfterThis = Math.max(
    0,
    metrics.aRemainingSlots + metrics.bRemainingSlots + metrics.cRemainingSlots - 1,
  );

  let maxBid = Math.max(0, team.remainingBudget - minReserveRequired - leadershipReserve);
  let reason: string | undefined = minReserveRequired > 0
    ? `Must reserve ₹${minReserveRequired.toLocaleString('en-IN')} to complete remaining A/B/C slots.`
    : undefined;

  const gradeBudgetReserve = remainingGradeBudgetReserve(metrics, player, rules);

  // Grade spending caps, leaving base price for leftover slots of the same grade
  if (player.grade === 'A' || player.grade === 'A+') {
    const aSpendable = Math.max(0, metrics.aRemainingBudget - gradeBudgetReserve);
    if (aSpendable < maxBid) {
      maxBid = aSpendable;
      reason = `A Grade budget cap: ₹${aSpendable.toLocaleString('en-IN')} spendable of ₹30,000 (₹${gradeBudgetReserve.toLocaleString('en-IN')} reserved for leftover A slots).`;
    }
  } else if (player.grade === 'B') {
    const bSpendable = Math.max(0, metrics.bRemainingBudget - gradeBudgetReserve);
    if (bSpendable < maxBid) {
      maxBid = bSpendable;
      reason = `B Grade budget cap: ₹${bSpendable.toLocaleString('en-IN')} spendable of ₹18,000 (₹${gradeBudgetReserve.toLocaleString('en-IN')} reserved for leftover B slots).`;
    }
  }

  const minBase = gradeBasePrice(player.grade, rules);
  if (maxBid < minBase) {
    return {
      maxBid: 0,
      minReserveRequired,
      remainingSlotsNeeded: slotsRemainingAfterThis,
      reason: `Cannot bid on this player without dropping below the Grade ${player.grade} base of ₹${minBase.toLocaleString('en-IN')} or stranding leftover A/B/C slots.`,
    };
  }

  return {
    maxBid,
    minReserveRequired,
    remainingSlotsNeeded: slotsRemainingAfterThis,
    reason
  };
}
