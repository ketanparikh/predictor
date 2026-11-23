import { Team, Player, AuctionRules } from '../types/auction';

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
  if (amount <= 0) {
    return { isValid: false, error: 'Sale or bid amount must be greater than 0.' };
  }

  if (amount > team.remainingBudget) {
    return {
      isValid: false,
      error: `Insufficient budget! ${team.name} has only ₹${team.remainingBudget.toLocaleString('en-IN')} points remaining.`
    };
  }

  const metrics = getTeamGradeMetrics(team, allPlayers, rules);

  // 1. Captain / Vice-Captain Budget Validation (≤ 50,000 points)
  const isCap = player.isCaptain || player.id === team.captainPlayerId || player.captainOfTeamId === team.id;
  const isVc = player.isViceCaptain || player.id === team.viceCaptainPlayerId || player.viceCaptainOfTeamId === team.id;

  if (isCap) {
    if (metrics.viceCaptainCost + amount > 50000) {
      return {
        isValid: false,
        error: `Captain and Vice-Captain combined budget cannot exceed 50,000 points. (Current VC: ₹${metrics.viceCaptainCost.toLocaleString('en-IN')}, Attempted Captain: ₹${amount.toLocaleString('en-IN')})`
      };
    }
    return { isValid: true };
  }

  if (isVc) {
    if (metrics.captainCost + amount > 50000) {
      return {
        isValid: false,
        error: `Captain and Vice-Captain combined budget cannot exceed 50,000 points. (Current Captain: ₹${metrics.captainCost.toLocaleString('en-IN')}, Attempted VC: ₹${amount.toLocaleString('en-IN')})`
      };
    }
    return { isValid: true };
  }

  // 2. Sponsor limit check: Max 1 sponsor per team
  const isPlayerSponsored = !!(player.isSponsored || (player.sponsorTag && player.sponsorTag.trim()));
  if (isPlayerSponsored) {
    const squadPlayers = allPlayers.filter(p => team.squad.includes(p.id));
    const existingSponsored = squadPlayers.find(p => (p.isSponsored || (p.sponsorTag && p.sponsorTag.trim())) && p.id !== player.id);
    if (existingSponsored) {
      return {
        isValid: false,
        error: `Sponsor limit reached! ${team.name} already has a sponsored player (${existingSponsored.name}). Each team can have at most 1 sponsored player.`
      };
    }
  }

  // 3. Auction-Purchased Player Limits (Excluding Captain & Vice-Captain)
  if (metrics.auctionPlayersCount >= 9) {
    return {
      isValid: false,
      error: `Squad limit reached! ${team.name} already has 9 auction players (excluding Captain & Vice-Captain).`
    };
  }

  // 4. Grade-Wise Player Limits & Budgets
  // Grade A (Strict hard limit: Max 2 players, Max ₹30,000 combined)
  if (player.grade === 'A' || player.grade === 'A+') {
    if (metrics.aCount >= 2 || metrics.aRemainingSlots <= 0) {
      return {
        isValid: false,
        error: `A Grade player limit reached (${metrics.aCount}/2). Team ${team.name} already has the maximum allowed 2 Grade A players.`
      };
    }
    if (amount > metrics.aRemainingBudget) {
      return {
        isValid: false,
        error: `Insufficient A Grade budget remaining. Limit: ₹30,000, Spent: ₹${metrics.aSpent.toLocaleString('en-IN')}, Remaining: ₹${metrics.aRemainingBudget.toLocaleString('en-IN')}.`
      };
    }
  }

  // Grade B (Strict hard limit: Max 3 players, Max ₹18,000 combined)
  if (player.grade === 'B') {
    if (metrics.bCount >= 3 || metrics.bRemainingSlots <= 0) {
      return {
        isValid: false,
        error: `B Grade player limit reached (${metrics.bCount}/3). Team ${team.name} already has the maximum allowed 3 Grade B players.`
      };
    }
    if (amount > metrics.bRemainingBudget) {
      return {
        isValid: false,
        error: `B Grade spending limit exceeded. Limit: ₹18,000, Spent: ₹${metrics.bSpent.toLocaleString('en-IN')}, Remaining: ₹${metrics.bRemainingBudget.toLocaleString('en-IN')}.`
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

  // 5. Reserve required for remaining squad slots
  const minSquadSize = rules.squadRules.minSquadSize || 9;
  const currentTotal = team.squad.length;
  const slotsRemainingAfterThis = Math.max(0, minSquadSize - (currentTotal + 1));
  const baseC = rules.gradeBasePrices?.gradeC ?? 1000;
  const minBasePrice = Math.min(
    rules.gradeBasePrices?.gradeAPlus ?? 7000,
    rules.gradeBasePrices?.gradeA ?? 5000,
    rules.gradeBasePrices?.gradeB ?? 3000,
    baseC
  );
  const minReserveRequired = slotsRemainingAfterThis * minBasePrice;

  if (amount > team.remainingBudget - minReserveRequired) {
    return {
      isValid: false,
      error: `Overspending Alert! Must reserve ₹${minReserveRequired.toLocaleString('en-IN')} pts for ${slotsRemainingAfterThis} remaining squad slot(s).`
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

  // Calculate reserve required to fill minimum required squad slots
  const minSquadSize = rules.squadRules.minSquadSize || 9;
  const currentSquadSize = team.squad.length;
  const slotsRemainingAfterThis = Math.max(0, minSquadSize - (currentSquadSize + 1));
  const baseC = rules.gradeBasePrices?.gradeC ?? 1000;
  const minBasePrice = Math.min(
    rules.gradeBasePrices?.gradeAPlus ?? 7000,
    rules.gradeBasePrices?.gradeA ?? 5000,
    rules.gradeBasePrices?.gradeB ?? 3000,
    baseC
  );
  const minReserveRequired = slotsRemainingAfterThis * minBasePrice;

  // Initial maxBid based on team remaining budget
  let maxBid = Math.max(0, team.remainingBudget - minReserveRequired);
  let reason: string | undefined = slotsRemainingAfterThis > 0
    ? `Must reserve ₹${minReserveRequired.toLocaleString('en-IN')} for ${slotsRemainingAfterThis} remaining slot(s).`
    : undefined;

  // Grade Spending Caps
  if (player.grade === 'A' || player.grade === 'A+') {
    if (metrics.aRemainingBudget < maxBid) {
      maxBid = metrics.aRemainingBudget;
      reason = `A Grade budget cap: ₹${metrics.aRemainingBudget.toLocaleString('en-IN')} remaining of ₹30,000.`;
    }
  } else if (player.grade === 'B') {
    if (metrics.bRemainingBudget < maxBid) {
      maxBid = metrics.bRemainingBudget;
      reason = `B Grade budget cap: ₹${metrics.bRemainingBudget.toLocaleString('en-IN')} remaining of ₹18,000.`;
    }
  }

  return {
    maxBid,
    minReserveRequired,
    remainingSlotsNeeded: slotsRemainingAfterThis,
    reason
  };
}
