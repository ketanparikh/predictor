import { describe, expect, it } from 'vitest';
import { initialAuctionRules, initialTeams } from '../data/demoData';
import type { AuctionRules, Player, PlayerGrade, PlayerRole, Team } from '../types/auction';
import { sanitizeAuctionRules, sanitizeTeamPurses } from './storage';
import {
  AUCTION_PROCESS,
  calculateMaxAllowableBidForPlayer,
  gradeBasePrice,
  getTeamGradeMetrics,
  isCaptainOrViceCaptain,
  leftoverSlotsAfterPurchase,
  remainingCategoryReserve,
  remainingGradeBudgetReserve,
  remainingLeadershipReserve,
  hasCaptainAndViceCaptain,
  captainFixedCost,
  auctionPurseAfterLeadership,
  validatePurchase,
} from './auctionValidation';

const emptyStats = {
  matches: 0,
  runs: 0,
  average: 0,
  strikeRate: 0,
  highestScore: 0,
  fifties: 0,
  hundreds: 0,
  wickets: 0,
  bowlingAverage: 0,
  economyRate: 0,
  bestBowling: '',
  catches: 0,
};

let playerSeq = 0;

function makePlayer(overrides: Partial<Player> & { grade: PlayerGrade }): Player {
  playerSeq += 1;
  const grade = overrides.grade;
  const basePrice =
    grade === 'A+' ? 7000 : grade === 'A' ? 5000 : grade === 'B' ? 3000 : 1000;
  return {
    id: overrides.id || `ply-${playerSeq}`,
    name: overrides.name || `Player ${playerSeq}`,
    age: 28,
    experience: 4,
    role: (overrides.role || 'Batsman') as PlayerRole,
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'None',
    basePrice,
    status: overrides.status || 'upcoming',
    stats: emptyStats,
    ...overrides,
    grade,
  };
}

function seedTeamWithLeadership(team: Team): { team: Team; captain: Player; viceCaptain: Player } {
  const captain = makePlayer({
    id: `${team.id}-cap`,
    name: `${team.name} Captain`,
    grade: 'A+',
    isCaptain: true,
    isPreAssignedCaptain: true,
    captainOfTeamId: team.id,
    status: 'sold',
    teamId: team.id,
  });
  const capCost = captainFixedCost(captain, initialAuctionRules);
  const vcCost = AUCTION_PROCESS.CAPTAIN_VC_BUDGET - capCost;
  const pricedCaptain = { ...captain, soldPrice: capCost };
  const viceCaptain = makePlayer({
    id: `${team.id}-vc`,
    name: `${team.name} VC`,
    grade: 'A',
    isViceCaptain: true,
    isPreAssignedViceCaptain: true,
    viceCaptainOfTeamId: team.id,
    status: 'sold',
    teamId: team.id,
    soldPrice: vcCost,
  });
  const seeded: Team = {
    ...team,
    captain: pricedCaptain.name,
    captainPlayerId: pricedCaptain.id,
    viceCaptain: viceCaptain.name,
    viceCaptainPlayerId: viceCaptain.id,
    squad: [pricedCaptain.id, viceCaptain.id],
    totalSpent: capCost + vcCost,
    remainingBudget: AUCTION_PROCESS.STARTING_PURSE - capCost - vcCost,
  };
  return { team: seeded, captain: pricedCaptain, viceCaptain };
}

function withCaptainProvision(cost: number): AuctionRules {
  return {
    ...initialAuctionRules,
    captainCostMode: cost > 0 ? 'custom' : 'zero',
    captainCustomCost: cost,
  };
}

function buy(
  team: Team,
  roster: Player[],
  player: Player,
  amount: number,
  rules: AuctionRules = initialAuctionRules,
): { team: Team; roster: Player[]; result: ReturnType<typeof validatePurchase> } {
  const result = validatePurchase(team, player, amount, roster, rules);
  if (!result.isValid) return { team, roster, result };
  const sold: Player = {
    ...player,
    status: 'sold',
    teamId: team.id,
    soldPrice: amount,
  };
  return {
    result,
    roster: roster.map((p) => (p.id === player.id ? sold : p)).concat(
      roster.some((p) => p.id === player.id) ? [] : [sold],
    ),
    team: {
      ...team,
      squad: team.squad.includes(player.id) ? team.squad : [...team.squad, player.id],
      totalSpent: team.totalSpent + amount,
      remainingBudget: team.remainingBudget - amount,
    },
  };
}

function buyLots(
  team: Team,
  roster: Player[],
  lots: Array<{ grade: PlayerGrade; price: number }>,
  rules: AuctionRules = initialAuctionRules,
): { team: Team; roster: Player[]; result: ReturnType<typeof validatePurchase> } {
  let state = { team, roster, result: { isValid: true } as ReturnType<typeof validatePurchase> };
  for (const lot of lots) {
    const player = makePlayer({ grade: lot.grade });
    state = buy(state.team, state.roster.concat(player), player, lot.price, rules);
    if (!state.result.isValid) return state;
  }
  return state;
}

describe('JCPL auction process setup', () => {
  it('has 12 teams with a predefined captain name and 100000 purse', () => {
    expect(initialTeams).toHaveLength(AUCTION_PROCESS.TEAM_COUNT);
    for (const team of initialTeams) {
      expect(team.captain?.trim()).toBeTruthy();
      expect(team.startingBudget).toBe(AUCTION_PROCESS.STARTING_PURSE);
      expect(team.remainingBudget).toBe(AUCTION_PROCESS.STARTING_PURSE);
    }
  });

  it('uses A/B/C base prices 5000 / 3000 / 1000 and 2A-3B-2C slots', () => {
    expect(initialAuctionRules.gradeBasePrices.gradeA).toBe(5000);
    expect(initialAuctionRules.gradeBasePrices.gradeB).toBe(3000);
    expect(initialAuctionRules.gradeBasePrices.gradeC).toBe(1000);
    expect(initialAuctionRules.squadRules.maxGradeA).toBe(2);
    expect(initialAuctionRules.squadRules.maxGradeB).toBe(3);
    expect(initialAuctionRules.squadRules.maxGradeC).toBe(2);
    expect(initialAuctionRules.squadRules.minSquadSize).toBe(9);
    expect(initialAuctionRules.squadRules.maxSquadSize).toBe(9);
    expect(initialAuctionRules.squadRules.maxCaptainViceCaptainSpending).toBe(50000);
    expect(AUCTION_PROCESS.CAPTAIN_ALLOCATED_FIRST).toBe(true);
    expect(AUCTION_PROCESS.CAPTAIN_VC_BUDGET).toBe(50000);
    expect(AUCTION_PROCESS.AUCTION_PURSE).toBe(50000);
    expect(initialAuctionRules.captainCostMode).toBe('zero');
    expect(captainFixedCost(makePlayer({ grade: 'A+' }), initialAuctionRules)).toBe(0);
    expect(captainFixedCost(makePlayer({ grade: 'C' }), initialAuctionRules)).toBe(0);
  });

  it('leaves 50000 points after captain + VC for the remaining 7 players', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[0]);
    const metrics = getTeamGradeMetrics(team, [captain, viceCaptain], initialAuctionRules);
    expect(metrics.combinedCapCost).toBe(AUCTION_PROCESS.CAPTAIN_VC_BUDGET);
    expect(metrics.remainingCapBudget).toBe(0);
    expect(team.remainingBudget).toBe(AUCTION_PROCESS.CAPTAIN_VC_BUDGET);
    expect(metrics.auctionPlayersCount).toBe(0);
    expect(metrics.aRemainingSlots).toBe(2);
    expect(metrics.bRemainingSlots).toBe(3);
    expect(metrics.cRemainingSlots).toBe(2);
    expect(metrics.aRemainingSlots + metrics.bRemainingSlots + metrics.cRemainingSlots).toBe(
      AUCTION_PROCESS.AUCTION_SLOTS,
    );
  });

  it('sanitizes legacy 50000 purse / 15-player squad back to 100000 / 9 with 2A 3B 2C', () => {
    const repaired = sanitizeAuctionRules({
      ...initialAuctionRules,
      startingBudget: 50000,
      squadRules: {
        ...initialAuctionRules.squadRules,
        minSquadSize: 15,
        maxSquadSize: 15,
        maxGradeA: 5,
        maxGradeB: 8,
        maxGradeC: 6,
      },
    } as AuctionRules);
    expect(repaired.startingBudget).toBe(100000);
    expect(repaired.squadRules.maxSquadSize).toBe(9);
    expect(repaired.squadRules.minSquadSize).toBe(9);
    expect(repaired.squadRules.maxGradeA).toBe(2);
    expect(repaired.squadRules.maxGradeB).toBe(3);
    expect(repaired.squadRules.maxGradeC).toBe(2);
  });
});

describe('sponsor uniqueness', () => {
  it('blocks a second sponsored player on the same team', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[1]);
    const first = makePlayer({
      grade: 'B',
      isSponsored: true,
      sponsorTag: 'Red Bull',
      status: 'sold',
      teamId: team.id,
      soldPrice: 3000,
    });
    const withSponsor: Team = {
      ...team,
      squad: [...team.squad, first.id],
      remainingBudget: team.remainingBudget - 3000,
      totalSpent: team.totalSpent + 3000,
    };
    const second = makePlayer({
      grade: 'C',
      isSponsored: true,
      sponsorTag: 'MRF',
    });
    const result = validatePurchase(
      withSponsor,
      second,
      1000,
      [captain, viceCaptain, first, second],
      initialAuctionRules,
    );
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/sponsor/i);
  });

  it('allows the first sponsored player and later unsponsored players', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[2]);
    const sponsor = makePlayer({ grade: 'A', isSponsored: true, sponsorTag: 'Nike' });
    const first = buy(team, [captain, viceCaptain, sponsor], sponsor, 5000);
    expect(first.result.isValid).toBe(true);
    const filler = makePlayer({ grade: 'B' });
    const second = buy(first.team, first.roster.concat(filler), filler, 3000);
    expect(second.result.isValid).toBe(true);
  });

  it('allows two different teams to each have one sponsor', () => {
    const seededA = seedTeamWithLeadership(initialTeams[8]);
    const seededB = seedTeamWithLeadership(initialTeams[9]);
    const sponsorA = makePlayer({ grade: 'C', isSponsored: true, sponsorTag: 'Pepsi' });
    const sponsorB = makePlayer({ grade: 'C', isSponsored: true, sponsorTag: 'Coca-Cola' });
    const buyA = buy(seededA.team, [seededA.captain, seededA.viceCaptain, sponsorA], sponsorA, 1000);
    const buyB = buy(seededB.team, [seededB.captain, seededB.viceCaptain, sponsorB], sponsorB, 1000);
    expect(buyA.result.isValid).toBe(true);
    expect(buyB.result.isValid).toBe(true);
  });
});

describe('grade mix 2A / 3B / 2C', () => {
  it('rejects a 3rd A, 4th B, or 3rd C', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[3]);
    let state = { team, roster: [captain, viceCaptain] as Player[] };
    const aPlayers = [makePlayer({ grade: 'A' }), makePlayer({ grade: 'A' }), makePlayer({ grade: 'A' })];
    const firstA = buy(state.team, state.roster.concat(aPlayers[0]), aPlayers[0], 5000);
    const secondA = buy(firstA.team, firstA.roster.concat(aPlayers[1]), aPlayers[1], 5000);
    expect(secondA.result.isValid).toBe(true);
    const thirdA = validatePurchase(
      secondA.team,
      aPlayers[2],
      5000,
      secondA.roster.concat(aPlayers[2]),
      initialAuctionRules,
    );
    expect(thirdA.isValid).toBe(false);
    expect(thirdA.error).toMatch(/A Grade player limit/);

    const bPlayers = [0, 1, 2, 3].map(() => makePlayer({ grade: 'B' }));
    let bState = secondA;
    for (let i = 0; i < 3; i += 1) {
      bState = buy(bState.team, bState.roster.concat(bPlayers[i]), bPlayers[i], 3000);
      expect(bState.result.isValid).toBe(true);
    }
    const fourthB = validatePurchase(
      bState.team,
      bPlayers[3],
      3000,
      bState.roster.concat(bPlayers[3]),
      initialAuctionRules,
    );
    expect(fourthB.isValid).toBe(false);

    const cPlayers = [makePlayer({ grade: 'C' }), makePlayer({ grade: 'C' }), makePlayer({ grade: 'C' })];
    const firstC = buy(bState.team, bState.roster.concat(cPlayers[0]), cPlayers[0], 1000);
    const secondC = buy(firstC.team, firstC.roster.concat(cPlayers[1]), cPlayers[1], 1000);
    expect(secondC.result.isValid).toBe(true);
    expect(secondC.team.squad).toHaveLength(9);
    const thirdC = validatePurchase(
      secondC.team,
      cPlayers[2],
      1000,
      secondC.roster.concat(cPlayers[2]),
      initialAuctionRules,
    );
    expect(thirdC.isValid).toBe(false);
  });

  it('does not count captain or VC toward the 2A auction slots', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[4]);
    const metrics = getTeamGradeMetrics(team, [captain, viceCaptain], initialAuctionRules);
    expect(metrics.aCount).toBe(0);
    expect(metrics.aRemainingSlots).toBe(2);
  });
});

describe('complete-team purse reserve by category', () => {
  it('caps a C-grade bid so 2A + 3B + 1C can still be bought at base price', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[5]);
    const cheapC = makePlayer({ grade: 'C' });
    const { maxBid, minReserveRequired } = calculateMaxAllowableBidForPlayer(
      team,
      cheapC,
      [captain, viceCaptain, cheapC],
      initialAuctionRules,
    );
    // Remaining after this C: 2A + 3B + 1C = 10000 + 9000 + 1000
    expect(minReserveRequired).toBe(20000);
    expect(maxBid).toBe(30000);
    expect(
      validatePurchase(team, cheapC, 40000, [captain, viceCaptain, cheapC], initialAuctionRules).isValid,
    ).toBe(false);
    expect(
      validatePurchase(team, cheapC, 30000, [captain, viceCaptain, cheapC], initialAuctionRules).isValid,
    ).toBe(true);
  });

  it('caps an A-grade bid so the second A slot can still be bought at 5000', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[6]);
    const star = makePlayer({ grade: 'A' });
    const roster = [captain, viceCaptain, star];
    const metrics = getTeamGradeMetrics(team, roster, initialAuctionRules);
    const { maxBid, minReserveRequired } = calculateMaxAllowableBidForPlayer(
      team,
      star,
      roster,
      initialAuctionRules,
    );
    // After this A: 1A + 3B + 2C purse reserve = 5000 + 9000 + 2000 = 16000
    expect(minReserveRequired).toBe(16000);
    // A budget 30000 must keep 5000 for the leftover A slot → max 25000
    expect(remainingGradeBudgetReserve(metrics, star, initialAuctionRules)).toBe(5000);
    expect(maxBid).toBe(25000);
    expect(validatePurchase(team, star, 25001, roster, initialAuctionRules).isValid).toBe(false);
    expect(validatePurchase(team, star, 25000, roster, initialAuctionRules).isValid).toBe(true);
  });

  it('caps the first B-grade bid at 12000 so two more B players remain affordable', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[7]);
    const firstB = makePlayer({ grade: 'B' });
    const roster = [captain, viceCaptain, firstB];
    const { maxBid } = calculateMaxAllowableBidForPlayer(team, firstB, roster, initialAuctionRules);
    expect(maxBid).toBe(12000);
    expect(validatePurchase(team, firstB, 18000, roster, initialAuctionRules).isValid).toBe(false);
    expect(validatePurchase(team, firstB, 12000, roster, initialAuctionRules).isValid).toBe(true);
  });

  it('refuses a B-grade bid that would strand remaining A and C slots', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[10]);
    let state = { team, roster: [captain, viceCaptain] as Player[] };
    const firstB = makePlayer({ grade: 'B' });
    state = buy(state.team, state.roster.concat(firstB), firstB, 6000);
    expect(state.result.isValid).toBe(true);

    const secondB = makePlayer({ grade: 'B' });
    const reserve = remainingCategoryReserve(
      getTeamGradeMetrics(state.team, state.roster, initialAuctionRules),
      secondB,
      initialAuctionRules,
    );
    // After this B: 2A + 1B + 2C = 10000 + 3000 + 2000 = 15000
    expect(reserve).toBe(15000);
    const overspend = validatePurchase(
      state.team,
      secondB,
      state.team.remainingBudget - 14000,
      state.roster.concat(secondB),
      initialAuctionRules,
    );
    expect(overspend.isValid).toBe(false);
  });

  it('after a max C bid of 30000, still completes 2A + 3B + 1C at base prices', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[11]);
    let state = { team, roster: [captain, viceCaptain] as Player[] };
    const lots: Array<{ grade: PlayerGrade; price: number }> = [
      { grade: 'C', price: 30000 },
      { grade: 'A', price: 5000 },
      { grade: 'A', price: 5000 },
      { grade: 'B', price: 3000 },
      { grade: 'B', price: 3000 },
      { grade: 'B', price: 3000 },
      { grade: 'C', price: 1000 },
    ];
    for (const lot of lots) {
      const player = makePlayer({ grade: lot.grade });
      state = buy(state.team, state.roster.concat(player), player, lot.price);
      expect(state.result.isValid, state.result.error).toBe(true);
    }
    expect(state.team.squad).toHaveLength(9);
    expect(state.team.remainingBudget).toBe(0);
  });

  it('after a max first A bid of 25000, still completes the leftover A/B/C slots at base', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[0]);
    let state = { team, roster: [captain, viceCaptain] as Player[] };
    const lots: Array<{ grade: PlayerGrade; price: number }> = [
      { grade: 'A', price: 25000 },
      { grade: 'A', price: 5000 },
      { grade: 'B', price: 3000 },
      { grade: 'B', price: 3000 },
      { grade: 'B', price: 3000 },
      { grade: 'C', price: 1000 },
      { grade: 'C', price: 1000 },
    ];
    for (const lot of lots) {
      const player = makePlayer({ grade: lot.grade });
      state = buy(state.team, state.roster.concat(player), player, lot.price);
      expect(state.result.isValid, state.result.error).toBe(true);
    }
    const metrics = getTeamGradeMetrics(state.team, state.roster, initialAuctionRules);
    expect(metrics.aCount).toBe(2);
    expect(metrics.bCount).toBe(3);
    expect(metrics.cCount).toBe(2);
    expect(state.team.remainingBudget).toBe(9000);
  });
});

describe('full 12-team auction without a snag', () => {
  it('lets every team buy captain, VC, 2A, 3B and 2C at base prices', () => {
    const teams: Team[] = [];
    const roster: Player[] = [];

    for (const seed of initialTeams) {
      const { team, captain, viceCaptain } = seedTeamWithLeadership(seed);
      teams.push(team);
      roster.push(captain, viceCaptain);
    }

    expect(teams).toHaveLength(12);
    expect(new Set(teams.map((t) => t.captainPlayerId)).size).toBe(12);
    expect(new Set(teams.map((t) => t.viceCaptainPlayerId)).size).toBe(12);

    for (let t = 0; t < teams.length; t += 1) {
      const buys: Array<{ grade: PlayerGrade; price: number }> = [
        { grade: 'A', price: 5000 },
        { grade: 'A', price: 5000 },
        { grade: 'B', price: 3000 },
        { grade: 'B', price: 3000 },
        { grade: 'B', price: 3000 },
        { grade: 'C', price: 1000 },
        { grade: 'C', price: 1000 },
      ];
      for (const lot of buys) {
        const player = makePlayer({
          grade: lot.grade,
          isSponsored: t === 0 && lot.grade === 'A' && teams[t].squad.length === 2,
          sponsorTag: t === 0 && lot.grade === 'A' && teams[t].squad.length === 2 ? 'OnlySponsor' : undefined,
        });
        const next = buy(teams[t], roster.concat(player), player, lot.price);
        expect(next.result.isValid, next.result.error).toBe(true);
        teams[t] = next.team;
        roster.splice(0, roster.length, ...next.roster);
      }

      const metrics = getTeamGradeMetrics(teams[t], roster, initialAuctionRules);
      expect(metrics.aCount).toBe(2);
      expect(metrics.bCount).toBe(3);
      expect(metrics.cCount).toBe(2);
      expect(metrics.auctionPlayersCount).toBe(7);
      expect(teams[t].squad).toHaveLength(9);
      expect(teams[t].remainingBudget).toBeGreaterThanOrEqual(0);
    }

    const extra = makePlayer({ grade: 'C' });
    expect(validatePurchase(teams[0], extra, 1000, roster.concat(extra), initialAuctionRules).isValid).toBe(false);
  });
});

describe('invalid bid amounts', () => {
  it('rejects zero and negative bids', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[0]);
    const player = makePlayer({ grade: 'C' });
    const roster = [captain, viceCaptain, player];
    expect(validatePurchase(team, player, 0, roster, initialAuctionRules).isValid).toBe(false);
    expect(validatePurchase(team, player, -1000, roster, initialAuctionRules).isValid).toBe(false);
  });

  it('rejects a bid above remaining purse', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[1]);
    const player = makePlayer({ grade: 'C' });
    const result = validatePurchase(
      team,
      player,
      team.remainingBudget + 1,
      [captain, viceCaptain, player],
      initialAuctionRules,
    );
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/Insufficient budget/i);
  });

  it('rejects bids below grade base price', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[2]);
    const a = makePlayer({ grade: 'A' });
    const b = makePlayer({ grade: 'B' });
    const c = makePlayer({ grade: 'C' });
    expect(validatePurchase(team, a, 4999, [captain, viceCaptain, a], initialAuctionRules).isValid).toBe(false);
    expect(validatePurchase(team, b, 2999, [captain, viceCaptain, b], initialAuctionRules).isValid).toBe(false);
    expect(validatePurchase(team, c, 999, [captain, viceCaptain, c], initialAuctionRules).isValid).toBe(false);
    expect(validatePurchase(team, a, 5000, [captain, viceCaptain, a], initialAuctionRules).isValid).toBe(true);
    expect(validatePurchase(team, b, 3000, [captain, viceCaptain, b], initialAuctionRules).isValid).toBe(true);
    expect(validatePurchase(team, c, 1000, [captain, viceCaptain, c], initialAuctionRules).isValid).toBe(true);
  });
});

describe('captain and vice-captain budget edges', () => {
  it('allows each team a different pre-allocated captain cost, then VC up to the rest of 50000', () => {
    const teamA = { ...initialTeams[0], squad: [] as string[], totalSpent: 0, remainingBudget: 100000 };
    const teamB = { ...initialTeams[1], squad: [] as string[], totalSpent: 0, remainingBudget: 100000 };
    const capA = makePlayer({ grade: 'A+', isCaptain: true, captainOfTeamId: teamA.id });
    const capB = makePlayer({ grade: 'C', isCaptain: true, captainOfTeamId: teamB.id });
    expect(validatePurchase(teamA, capA, 10000, [capA], initialAuctionRules).isValid).toBe(true);
    expect(validatePurchase(teamB, capB, 25000, [capB], initialAuctionRules).isValid).toBe(true);
    expect(validatePurchase(teamA, capA, 50001, [capA], initialAuctionRules).isValid).toBe(false);
    expect(calculateMaxAllowableBidForPlayer(teamA, capA, [capA], initialAuctionRules).maxBid).toBe(50000);

    const afterA: Team = {
      ...teamA,
      captain: capA.name,
      captainPlayerId: capA.id,
      squad: [capA.id],
      totalSpent: 10000,
      remainingBudget: 90000,
    };
    const soldA = { ...capA, status: 'sold' as const, teamId: teamA.id, soldPrice: 10000 };
    const vcA = makePlayer({ grade: 'A', isViceCaptain: true, viceCaptainOfTeamId: teamA.id });
    expect(calculateMaxAllowableBidForPlayer(afterA, vcA, [soldA, vcA], initialAuctionRules).maxBid).toBe(40000);

    const afterB: Team = {
      ...teamB,
      captain: capB.name,
      captainPlayerId: capB.id,
      squad: [capB.id],
      totalSpent: 25000,
      remainingBudget: 75000,
    };
    const soldB = { ...capB, status: 'sold' as const, teamId: teamB.id, soldPrice: 25000 };
    const vcB = makePlayer({ grade: 'A', isViceCaptain: true, viceCaptainOfTeamId: teamB.id });
    expect(calculateMaxAllowableBidForPlayer(afterB, vcB, [soldB, vcB], initialAuctionRules).maxBid).toBe(25000);
    expect(validatePurchase(afterB, vcB, 25000, [soldB, vcB], initialAuctionRules).isValid).toBe(true);
    expect(validatePurchase(afterB, vcB, 25001, [soldB, vcB], initialAuctionRules).isValid).toBe(false);
  });

  it('optional global default still applies when a per-team amount is not passed', () => {
    const rules = withCaptainProvision(15000);
    const aPlus = makePlayer({ grade: 'A+', isCaptain: true, captainOfTeamId: initialTeams[0].id });
    const gradeC = makePlayer({ grade: 'C', isCaptain: true, captainOfTeamId: initialTeams[1].id });
    expect(captainFixedCost(aPlus, rules)).toBe(15000);
    expect(captainFixedCost(gradeC, rules)).toBe(15000);
  });

  it('rejects VC auction before the captain is allocated', () => {
    const team = { ...initialTeams[0], squad: [] as string[], totalSpent: 0, remainingBudget: 100000 };
    const vc = makePlayer({ grade: 'A', isViceCaptain: true, viceCaptainOfTeamId: team.id });
    const result = validatePurchase(team, vc, 5000, [vc], initialAuctionRules);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/Captain must be allocated/i);
    expect(calculateMaxAllowableBidForPlayer(team, vc, [vc], initialAuctionRules).maxBid).toBe(0);
  });

  it('does not count a B-grade VC or C-grade captain toward auction grade slots', () => {
    const team = { ...initialTeams[1], squad: [] as string[], totalSpent: 0, remainingBudget: 100000 };
    const captain = makePlayer({
      id: `${team.id}-cap-c`,
      grade: 'C',
      isCaptain: true,
      isPreAssignedCaptain: true,
      captainOfTeamId: team.id,
      status: 'sold',
      teamId: team.id,
      soldPrice: 20000,
    });
    const vc = makePlayer({
      id: `${team.id}-vc-b`,
      grade: 'B',
      isViceCaptain: true,
      isPreAssignedViceCaptain: true,
      viceCaptainOfTeamId: team.id,
      status: 'sold',
      teamId: team.id,
      soldPrice: 30000,
    });
    const seeded: Team = {
      ...team,
      captain: captain.name,
      captainPlayerId: captain.id,
      viceCaptain: vc.name,
      viceCaptainPlayerId: vc.id,
      squad: [captain.id, vc.id],
      totalSpent: 50000,
      remainingBudget: 50000,
    };
    expect(isCaptainOrViceCaptain(captain, seeded)).toBe(true);
    expect(isCaptainOrViceCaptain(vc, seeded)).toBe(true);
    const metrics = getTeamGradeMetrics(seeded, [captain, vc], initialAuctionRules);
    expect(metrics.aCount).toBe(0);
    expect(metrics.bCount).toBe(0);
    expect(metrics.cCount).toBe(0);
    expect(metrics.auctionPlayersCount).toBe(0);

    const filled = buyLots(seeded, [captain, vc], [
      { grade: 'A', price: 5000 },
      { grade: 'A', price: 5000 },
      { grade: 'B', price: 3000 },
      { grade: 'B', price: 3000 },
      { grade: 'B', price: 3000 },
      { grade: 'C', price: 1000 },
      { grade: 'C', price: 1000 },
    ]);
    expect(filled.result.isValid, filled.result.error).toBe(true);
    const done = getTeamGradeMetrics(filled.team, filled.roster, initialAuctionRules);
    expect(done.aCount).toBe(2);
    expect(done.bCount).toBe(3);
    expect(done.cCount).toBe(2);
  });

  it('identifies leadership by name when ids are missing', () => {
    const team = {
      ...initialTeams[2],
      captain: 'Name Only Captain',
      viceCaptain: 'Name Only VC',
      squad: [] as string[],
    };
    const captain = makePlayer({ name: 'Name Only Captain', grade: 'A+' });
    const vc = makePlayer({ name: 'Name Only VC', grade: 'A' });
    expect(isCaptainOrViceCaptain(captain, team)).toBe(true);
    expect(isCaptainOrViceCaptain(vc, team)).toBe(true);
  });
});

describe('sponsor edge cases', () => {
  it('treats sponsorTag alone or isSponsored alone as sponsored', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[3]);
    const tagged = makePlayer({ grade: 'B', sponsorTag: 'MRF' });
    const flagged = makePlayer({ grade: 'C', isSponsored: true, sponsorTag: '' });
    const first = buy(team, [captain, viceCaptain, tagged], tagged, 3000);
    expect(first.result.isValid).toBe(true);
    const second = validatePurchase(
      first.team,
      flagged,
      1000,
      first.roster.concat(flagged),
      initialAuctionRules,
    );
    expect(second.isValid).toBe(false);
    expect(second.error).toMatch(/sponsor/i);
  });

  it('ignores whitespace-only sponsorTag', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[4]);
    const blank = makePlayer({ grade: 'C', sponsorTag: '   ' });
    const real = makePlayer({ grade: 'C', isSponsored: true, sponsorTag: 'Nike' });
    const first = buy(team, [captain, viceCaptain, blank], blank, 1000);
    expect(first.result.isValid).toBe(true);
    const second = buy(first.team, first.roster.concat(real), real, 1000);
    expect(second.result.isValid).toBe(true);
  });

  it('blocks a sponsored captain when the team already has a sponsored auction player', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[5]);
    const sponsor = makePlayer({ grade: 'A', isSponsored: true, sponsorTag: 'Adidas' });
    const first = buy(team, [captain, viceCaptain, sponsor], sponsor, 5000);
    expect(first.result.isValid).toBe(true);
    const extraCap = makePlayer({
      grade: 'A+',
      isCaptain: true,
      captainOfTeamId: team.id,
      isSponsored: true,
      sponsorTag: 'OtherBrand',
    });
    const result = validatePurchase(
      first.team,
      extraCap,
      1,
      first.roster.concat(extraCap),
      initialAuctionRules,
    );
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/sponsor/i);
  });
});

describe('already owned / already sold players', () => {
  it('rejects a player already sold to a different team', () => {
    const seeded = seedTeamWithLeadership(initialTeams[6]);
    const other = seedTeamWithLeadership(initialTeams[7]);
    const sold = makePlayer({
      grade: 'A',
      status: 'sold',
      teamId: other.team.id,
      soldPrice: 5000,
    });
    const result = validatePurchase(
      seeded.team,
      sold,
      5000,
      [seeded.captain, seeded.viceCaptain, other.captain, other.viceCaptain, sold],
      initialAuctionRules,
    );
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/already sold/i);
  });

  it('rejects buying a player already in this team squad', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[8]);
    const owned = makePlayer({
      grade: 'B',
      status: 'sold',
      teamId: team.id,
      soldPrice: 3000,
    });
    const withOwned: Team = {
      ...team,
      squad: [...team.squad, owned.id],
      totalSpent: team.totalSpent + 3000,
      remainingBudget: team.remainingBudget - 3000,
    };
    const result = validatePurchase(
      withOwned,
      owned,
      3000,
      [captain, viceCaptain, owned],
      initialAuctionRules,
    );
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/already in/i);
  });
});

describe('A+ counts as an A auction slot', () => {
  it('lets a team buy one A+ and one A, then blocks a third A-tier player', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[9]);
    const plus = makePlayer({ grade: 'A+' });
    const regular = makePlayer({ grade: 'A' });
    const extra = makePlayer({ grade: 'A+' });
    const first = buy(team, [captain, viceCaptain, plus], plus, 7000);
    expect(first.result.isValid, first.result.error).toBe(true);
    const second = buy(first.team, first.roster.concat(regular), regular, 5000);
    expect(second.result.isValid, second.result.error).toBe(true);
    const third = validatePurchase(
      second.team,
      extra,
      7000,
      second.roster.concat(extra),
      initialAuctionRules,
    );
    expect(third.isValid).toBe(false);
    expect(calculateMaxAllowableBidForPlayer(second.team, extra, second.roster.concat(extra), initialAuctionRules).maxBid).toBe(0);
  });

  it('reserves leftover A slots at 5000 even when the current lot is A+', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[10]);
    const plus = makePlayer({ grade: 'A+' });
    const metrics = getTeamGradeMetrics(team, [captain, viceCaptain, plus], initialAuctionRules);
    expect(remainingGradeBudgetReserve(metrics, plus, initialAuctionRules)).toBe(5000);
    expect(gradeBasePrice('A+', initialAuctionRules)).toBe(7000);
    expect(leftoverSlotsAfterPurchase(metrics, plus)).toEqual({ aLeft: 1, bLeft: 3, cLeft: 2 });
    const { maxBid } = calculateMaxAllowableBidForPlayer(
      team,
      plus,
      [captain, viceCaptain, plus],
      initialAuctionRules,
    );
    expect(maxBid).toBe(25000);
  });

  it('blocks a second A+ after the first A spent 25000 because only 5000 A budget remains', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[11]);
    const firstA = makePlayer({ grade: 'A' });
    const bought = buy(team, [captain, viceCaptain, firstA], firstA, 25000);
    expect(bought.result.isValid).toBe(true);
    const plus = makePlayer({ grade: 'A+' });
    expect(validatePurchase(bought.team, plus, 7000, bought.roster.concat(plus), initialAuctionRules).isValid).toBe(false);
    expect(validatePurchase(bought.team, makePlayer({ grade: 'A' }), 5000, bought.roster, initialAuctionRules).isValid).toBe(true);
  });
});

describe('maxBid is valid and maxBid+1 is not', () => {
  it('holds at the start of the auction for A, B and C', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[0]);
    for (const grade of ['A', 'B', 'C'] as PlayerGrade[]) {
      const player = makePlayer({ grade });
      const roster = [captain, viceCaptain, player];
      const { maxBid } = calculateMaxAllowableBidForPlayer(team, player, roster, initialAuctionRules);
      expect(maxBid).toBeGreaterThan(0);
      expect(validatePurchase(team, player, maxBid, roster, initialAuctionRules).isValid).toBe(true);
      expect(validatePurchase(team, player, maxBid + 1, roster, initialAuctionRules).isValid).toBe(false);
    }
  });

  it('tightens after 2A at 30000 and 3B at 18000 so each C can only go at 1000', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[1]);
    const filled = buyLots(team, [captain, viceCaptain], [
      { grade: 'A', price: 25000 },
      { grade: 'A', price: 5000 },
      { grade: 'B', price: 12000 },
      { grade: 'B', price: 3000 },
      { grade: 'B', price: 3000 },
    ]);
    expect(filled.result.isValid, filled.result.error).toBe(true);
    expect(filled.team.remainingBudget).toBe(2000);
    const firstC = makePlayer({ grade: 'C' });
    const { maxBid } = calculateMaxAllowableBidForPlayer(
      filled.team,
      firstC,
      filled.roster.concat(firstC),
      initialAuctionRules,
    );
    expect(maxBid).toBe(1000);
    expect(validatePurchase(filled.team, firstC, 1001, filled.roster.concat(firstC), initialAuctionRules).isValid).toBe(false);
    const boughtC = buy(filled.team, filled.roster.concat(firstC), firstC, 1000);
    expect(boughtC.result.isValid).toBe(true);
    const lastC = makePlayer({ grade: 'C' });
    expect(validatePurchase(boughtC.team, lastC, 1000, boughtC.roster.concat(lastC), initialAuctionRules).isValid).toBe(true);
    expect(validatePurchase(boughtC.team, lastC, 1001, boughtC.roster.concat(lastC), initialAuctionRules).isValid).toBe(false);
  });

  it('caps the second B at 3000 after the first B spent 12000', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[2]);
    const firstB = makePlayer({ grade: 'B' });
    const bought = buy(team, [captain, viceCaptain, firstB], firstB, 12000);
    expect(bought.result.isValid).toBe(true);
    const secondB = makePlayer({ grade: 'B' });
    const { maxBid } = calculateMaxAllowableBidForPlayer(
      bought.team,
      secondB,
      bought.roster.concat(secondB),
      initialAuctionRules,
    );
    expect(maxBid).toBe(3000);
    expect(validatePurchase(bought.team, secondB, 3001, bought.roster.concat(secondB), initialAuctionRules).isValid).toBe(false);
  });

  it('caps the second A at 5000 after the first A spent 25000', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[3]);
    const firstA = makePlayer({ grade: 'A' });
    const bought = buy(team, [captain, viceCaptain, firstA], firstA, 25000);
    const secondA = makePlayer({ grade: 'A' });
    const { maxBid } = calculateMaxAllowableBidForPlayer(
      bought.team,
      secondA,
      bought.roster.concat(secondA),
      initialAuctionRules,
    );
    expect(maxBid).toBe(5000);
  });

  it('returns maxBid 0 when that grade is already full', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[4]);
    const filled = buyLots(team, [captain, viceCaptain], [
      { grade: 'A', price: 5000 },
      { grade: 'A', price: 5000 },
    ]);
    const extraA = makePlayer({ grade: 'A' });
    expect(calculateMaxAllowableBidForPlayer(filled.team, extraA, filled.roster.concat(extraA), initialAuctionRules).maxBid).toBe(0);
    expect(calculateMaxAllowableBidForPlayer(filled.team, null, filled.roster, initialAuctionRules).maxBid).toBe(filled.team.remainingBudget);
  });
});

describe('cannot complete a squad with the wrong mix', () => {
  it('cannot substitute a 3rd C for a missing B', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[5]);
    const filled = buyLots(team, [captain, viceCaptain], [
      { grade: 'A', price: 5000 },
      { grade: 'A', price: 5000 },
      { grade: 'B', price: 3000 },
      { grade: 'B', price: 3000 },
      { grade: 'C', price: 1000 },
      { grade: 'C', price: 1000 },
    ]);
    expect(filled.result.isValid).toBe(true);
    expect(filled.team.squad).toHaveLength(8);
    const extraC = makePlayer({ grade: 'C' });
    expect(validatePurchase(filled.team, extraC, 1000, filled.roster.concat(extraC), initialAuctionRules).isValid).toBe(false);
    const missingB = makePlayer({ grade: 'B' });
    expect(validatePurchase(filled.team, missingB, 3000, filled.roster.concat(missingB), initialAuctionRules).isValid).toBe(true);
  });

  it('cannot buy an 8th auction player even at C base after 2A 3B 2C', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[6]);
    const filled = buyLots(team, [captain, viceCaptain], [
      { grade: 'A', price: 5000 },
      { grade: 'A', price: 5000 },
      { grade: 'B', price: 3000 },
      { grade: 'B', price: 3000 },
      { grade: 'B', price: 3000 },
      { grade: 'C', price: 1000 },
      { grade: 'C', price: 1000 },
    ]);
    expect(filled.team.squad).toHaveLength(9);
    const extra = makePlayer({ grade: 'C' });
    const result = validatePurchase(filled.team, extra, 1000, filled.roster.concat(extra), initialAuctionRules);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/Squad limit|C Grade player limit/);
  });
});

describe('purse too tight to finish leftover slots', () => {
  it('returns maxBid 0 for an A when remaining purse cannot cover leftover B/C bases plus A base', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[7]);
    const drained: Team = { ...team, remainingBudget: 15000, totalSpent: 85000 };
    const star = makePlayer({ grade: 'A' });
    const { maxBid } = calculateMaxAllowableBidForPlayer(
      drained,
      star,
      [captain, viceCaptain, star],
      initialAuctionRules,
    );
    // After this A leftover 1A+3B+2C = 16000, purse 15000 → cannot afford
    expect(maxBid).toBe(0);
    expect(validatePurchase(drained, star, 5000, [captain, viceCaptain, star], initialAuctionRules).isValid).toBe(false);
  });

  it('allows an A at 5000 when remaining purse is exactly leftover reserve + 5000', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[8]);
    // leftover after this A: 16000, so 21000 remaining lets A go at exactly 5000
    const exact: Team = { ...team, remainingBudget: 21000, totalSpent: 79000 };
    const star = makePlayer({ grade: 'A' });
    expect(validatePurchase(exact, star, 5000, [captain, viceCaptain, star], initialAuctionRules).isValid).toBe(true);
    expect(validatePurchase(exact, star, 5001, [captain, viceCaptain, star], initialAuctionRules).isValid).toBe(false);
  });
});

describe('max-spend path still completes every category', () => {
  it('completes 2A 3B 2C after spending the max legal bid on the first player of each grade', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[9]);
    const filled = buyLots(team, [captain, viceCaptain], [
      { grade: 'A', price: 25000 },
      { grade: 'B', price: 12000 },
      { grade: 'C', price: 1000 },
      { grade: 'A', price: 5000 },
      { grade: 'B', price: 3000 },
      { grade: 'B', price: 3000 },
      { grade: 'C', price: 1000 },
    ]);
    expect(filled.result.isValid, filled.result.error).toBe(true);
    const metrics = getTeamGradeMetrics(filled.team, filled.roster, initialAuctionRules);
    expect(metrics.aCount).toBe(2);
    expect(metrics.bCount).toBe(3);
    expect(metrics.cCount).toBe(2);
    expect(metrics.auctionPlayersCount).toBe(7);
    expect(filled.team.squad).toHaveLength(9);
    expect(filled.team.remainingBudget).toBe(0);
  });

  it('completes every team in round-robin order at mixed legal prices', () => {
    const teams: Team[] = [];
    let roster: Player[] = [];
    for (const seed of initialTeams) {
      const seeded = seedTeamWithLeadership(seed);
      teams.push(seeded.team);
      roster.push(seeded.captain, seeded.viceCaptain);
    }

    const roundRobin: Array<{ grade: PlayerGrade; price: number }> = [
      { grade: 'C', price: 1000 },
      { grade: 'A', price: 5000 },
      { grade: 'B', price: 3000 },
      { grade: 'B', price: 3000 },
      { grade: 'A', price: 5000 },
      { grade: 'B', price: 3000 },
      { grade: 'C', price: 1000 },
    ];

    for (const lot of roundRobin) {
      for (let t = 0; t < teams.length; t += 1) {
        const player = makePlayer({ grade: lot.grade });
        const next = buy(teams[t], roster.concat(player), player, lot.price);
        expect(next.result.isValid, `team ${t} ${lot.grade}: ${next.result.error}`).toBe(true);
        teams[t] = next.team;
        roster = next.roster;
      }
    }

    for (const team of teams) {
      const metrics = getTeamGradeMetrics(team, roster, initialAuctionRules);
      expect(metrics.aCount).toBe(2);
      expect(metrics.bCount).toBe(3);
      expect(metrics.cCount).toBe(2);
      expect(team.squad).toHaveLength(9);
    }
  });
});

describe('legacy sanitizers', () => {
  it('repairs 5100/3100/1100 grade bases', () => {
    const repaired = sanitizeAuctionRules({
      ...initialAuctionRules,
      gradeBasePrices: {
        gradeAPlus: 7000,
        gradeA: 5100,
        gradeB: 3100,
        gradeC: 1100,
      },
    });
    expect(repaired.gradeBasePrices.gradeA).toBe(5000);
    expect(repaired.gradeBasePrices.gradeB).toBe(3000);
    expect(repaired.gradeBasePrices.gradeC).toBe(1000);
  });

  it('restores a 50000 team purse without wiping already-spent points', () => {
    const repaired = sanitizeTeamPurses([
      {
        ...initialTeams[0],
        startingBudget: 50000,
        totalSpent: 12000,
        remainingBudget: 38000,
      },
    ]);
    expect(repaired[0].startingBudget).toBe(100000);
    expect(repaired[0].remainingBudget).toBe(88000);
  });

  it('keeps 12 unique captain names in the seed teams', () => {
    const names = initialTeams.map((t) => t.captain?.trim());
    expect(names.every(Boolean)).toBe(true);
    expect(new Set(names).size).toBe(12);
  });

  it('does not rewrite a team that already has a 100000 purse', () => {
    const repaired = sanitizeTeamPurses([
      {
        ...initialTeams[1],
        startingBudget: 100000,
        totalSpent: 21000,
        remainingBudget: 79000,
      },
    ]);
    expect(repaired[0].startingBudget).toBe(100000);
    expect(repaired[0].remainingBudget).toBe(79000);
  });
});

describe('captain first at fixed base, then VC auction, then 7-player auction', () => {
  it('blocks the main auction until both captain and VC are finalized', () => {
    const team = { ...initialTeams[0], squad: [] as string[], totalSpent: 0, remainingBudget: 100000 };
    const cheapC = makePlayer({ grade: 'C' });
    const raw = validatePurchase(team, cheapC, 1000, [cheapC], initialAuctionRules);
    expect(raw.isValid).toBe(false);
    expect(raw.error).toMatch(/finalized before/i);
    expect(calculateMaxAllowableBidForPlayer(team, cheapC, [cheapC], initialAuctionRules).maxBid).toBe(0);

    const captain = makePlayer({
      grade: 'A+',
      isCaptain: true,
      isPreAssignedCaptain: true,
      captainOfTeamId: team.id,
      status: 'sold',
      teamId: team.id,
      soldPrice: 15000,
    });
    const capOnly: Team = {
      ...team,
      captain: captain.name,
      captainPlayerId: captain.id,
      squad: [captain.id],
      totalSpent: 15000,
      remainingBudget: 85000,
    };
    expect(hasCaptainAndViceCaptain(getTeamGradeMetrics(capOnly, [captain], initialAuctionRules))).toBe(false);
    expect(validatePurchase(capOnly, cheapC, 1000, [captain, cheapC], initialAuctionRules).isValid).toBe(false);
  });

  it('adds unused C+VC cap to the other 50000 for the 7-player purse', () => {
    const rules = withCaptainProvision(15000);
    const team = { ...initialTeams[1], squad: [] as string[], totalSpent: 0, remainingBudget: 100000 };
    const captain = makePlayer({ grade: 'A+', isCaptain: true, captainOfTeamId: team.id });
    const fixed = captainFixedCost(captain, rules);
    const boughtCap = buy(team, [captain], captain, fixed, rules);
    expect(boughtCap.result.isValid, boughtCap.result.error).toBe(true);

    const vc = makePlayer({ grade: 'A', isViceCaptain: true, viceCaptainOfTeamId: team.id });
    const vcPrice = 10000;
    const boughtVc = buy(boughtCap.team, boughtCap.roster.concat(vc), vc, vcPrice, rules);
    expect(boughtVc.result.isValid, boughtVc.result.error).toBe(true);

    const unusedLeadership = AUCTION_PROCESS.CAPTAIN_VC_BUDGET - fixed - vcPrice;
    const auctionPurse = auctionPurseAfterLeadership(fixed, vcPrice);
    expect(auctionPurse).toBe(AUCTION_PROCESS.AUCTION_PURSE + unusedLeadership);
    expect(boughtVc.team.remainingBudget).toBe(auctionPurse);
    expect(hasCaptainAndViceCaptain(getTeamGradeMetrics(boughtVc.team, boughtVc.roster, initialAuctionRules))).toBe(true);

    const filled = buyLots(boughtVc.team, boughtVc.roster, [
      { grade: 'A', price: 5000 },
      { grade: 'A', price: 5000 },
      { grade: 'B', price: 3000 },
      { grade: 'B', price: 3000 },
      { grade: 'B', price: 3000 },
      { grade: 'C', price: 1000 },
      { grade: 'C', price: 1000 },
    ], rules);
    expect(filled.result.isValid, filled.result.error).toBe(true);
    expect(filled.team.squad).toHaveLength(9);
    expect(filled.team.remainingBudget).toBe(auctionPurse - 21000);
  });

  it('if VC spends the rest of the 50000 cap, the 7-player purse is exactly 50000', () => {
    const rules = withCaptainProvision(15000);
    const team = { ...initialTeams[2], squad: [] as string[], totalSpent: 0, remainingBudget: 100000 };
    const captain = makePlayer({ grade: 'A+', isCaptain: true, captainOfTeamId: team.id });
    const fixed = captainFixedCost(captain, rules);
    const boughtCap = buy(team, [captain], captain, fixed, rules);
    const vc = makePlayer({ grade: 'A', isViceCaptain: true, viceCaptainOfTeamId: team.id });
    const vcMax = AUCTION_PROCESS.CAPTAIN_VC_BUDGET - fixed;
    const boughtVc = buy(boughtCap.team, boughtCap.roster.concat(vc), vc, vcMax, rules);
    expect(boughtVc.result.isValid, boughtVc.result.error).toBe(true);
    expect(boughtVc.team.remainingBudget).toBe(AUCTION_PROCESS.AUCTION_PURSE);
    const extraVc = makePlayer({ grade: 'A', isViceCaptain: true, viceCaptainOfTeamId: team.id });
    expect(validatePurchase(boughtVc.team, extraVc, 1000, boughtVc.roster.concat(extraVc), rules).isValid).toBe(false);
  });
});

describe('mid-auction grade max bids', () => {
  it('after a 30000 C, leftover A and B can only be bought at base', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[3]);
    const firstC = makePlayer({ grade: 'C' });
    const bought = buy(team, [captain, viceCaptain, firstC], firstC, 30000);
    expect(bought.result.isValid).toBe(true);
    const star = makePlayer({ grade: 'A' });
    expect(calculateMaxAllowableBidForPlayer(bought.team, star, bought.roster.concat(star), initialAuctionRules).maxBid).toBe(5000);
    const workhorse = makePlayer({ grade: 'B' });
    expect(calculateMaxAllowableBidForPlayer(bought.team, workhorse, bought.roster.concat(workhorse), initialAuctionRules).maxBid).toBe(3000);
  });

  it('second B max is 9000 after the first B spent 6000 (leave 3000 for the third)', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[4]);
    const firstB = makePlayer({ grade: 'B' });
    const bought = buy(team, [captain, viceCaptain, firstB], firstB, 6000);
    const secondB = makePlayer({ grade: 'B' });
    const { maxBid } = calculateMaxAllowableBidForPlayer(
      bought.team,
      secondB,
      bought.roster.concat(secondB),
      initialAuctionRules,
    );
    expect(maxBid).toBe(9000);
    expect(validatePurchase(bought.team, secondB, 9001, bought.roster.concat(secondB), initialAuctionRules).isValid).toBe(false);
    expect(validatePurchase(bought.team, secondB, 9000, bought.roster.concat(secondB), initialAuctionRules).isValid).toBe(true);
  });

  it('third B max is 3000 after 12000 + 3000 already spent on B', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[5]);
    const first = buyLots(team, [captain, viceCaptain], [
      { grade: 'B', price: 12000 },
      { grade: 'B', price: 3000 },
    ]);
    const thirdB = makePlayer({ grade: 'B' });
    expect(calculateMaxAllowableBidForPlayer(first.team, thirdB, first.roster.concat(thirdB), initialAuctionRules).maxBid).toBe(3000);
  });

  it('rejects A+ below its 7000 base', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[6]);
    const plus = makePlayer({ grade: 'A+' });
    expect(validatePurchase(team, plus, 6999, [captain, viceCaptain, plus], initialAuctionRules).isValid).toBe(false);
    expect(validatePurchase(team, plus, 7000, [captain, viceCaptain, plus], initialAuctionRules).isValid).toBe(true);
  });
});

describe('player status and shared pool', () => {
  it('allows buying an unsold or in-auction player', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[7]);
    const unsold = makePlayer({ grade: 'B', status: 'unsold' });
    const live = makePlayer({ grade: 'C', status: 'in_auction' });
    expect(validatePurchase(team, unsold, 3000, [captain, viceCaptain, unsold], initialAuctionRules).isValid).toBe(true);
    expect(validatePurchase(team, live, 1000, [captain, viceCaptain, live], initialAuctionRules).isValid).toBe(true);
  });

  it('stops a second team from buying a player the first team just won', () => {
    const a = seedTeamWithLeadership(initialTeams[8]);
    const b = seedTeamWithLeadership(initialTeams[9]);
    const lot = makePlayer({ grade: 'A' });
    const first = buy(a.team, [a.captain, a.viceCaptain, b.captain, b.viceCaptain, lot], lot, 5000);
    expect(first.result.isValid).toBe(true);
    const sold = first.roster.find((p) => p.id === lot.id)!;
    expect(sold.status).toBe('sold');
    const second = validatePurchase(b.team, sold, 5000, first.roster, initialAuctionRules);
    expect(second.isValid).toBe(false);
    expect(second.error).toMatch(/already sold/i);
    expect(calculateMaxAllowableBidForPlayer(b.team, sold, first.roster, initialAuctionRules).maxBid).toBe(0);
  });

  it('lets all 12 teams each have exactly one sponsor of the same brand', () => {
    const teams: Team[] = [];
    let roster: Player[] = [];
    for (const seed of initialTeams) {
      const seeded = seedTeamWithLeadership(seed);
      teams.push(seeded.team);
      roster.push(seeded.captain, seeded.viceCaptain);
    }
    for (let t = 0; t < teams.length; t += 1) {
      const sponsor = makePlayer({ grade: 'C', isSponsored: true, sponsorTag: 'MRF' });
      const next = buy(teams[t], roster.concat(sponsor), sponsor, 1000);
      expect(next.result.isValid, next.result.error).toBe(true);
      teams[t] = next.team;
      roster = next.roster;
      const extra = makePlayer({ grade: 'B', isSponsored: true, sponsorTag: 'Nike' });
      expect(validatePurchase(teams[t], extra, 3000, roster.concat(extra), initialAuctionRules).isValid).toBe(false);
    }
  });
});

describe('malformed bids and empty purse', () => {
  it('rejects NaN, Infinity and non-numeric amounts', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[10]);
    const player = makePlayer({ grade: 'C' });
    const roster = [captain, viceCaptain, player];
    expect(validatePurchase(team, player, Number.NaN, roster, initialAuctionRules).isValid).toBe(false);
    expect(validatePurchase(team, player, Number.POSITIVE_INFINITY, roster, initialAuctionRules).isValid).toBe(false);
    expect(validatePurchase(team, player, Number.NEGATIVE_INFINITY, roster, initialAuctionRules).isValid).toBe(false);
  });

  it('rejects any auction buy when remaining budget is 0', () => {
    const { team, captain, viceCaptain } = seedTeamWithLeadership(initialTeams[11]);
    const broke: Team = { ...team, remainingBudget: 0, totalSpent: 100000 };
    const player = makePlayer({ grade: 'C' });
    expect(validatePurchase(broke, player, 1000, [captain, viceCaptain, player], initialAuctionRules).isValid).toBe(false);
  });

  it('caps VC at whatever is left of the 50000 purse after the captain provision', () => {
    const rules = withCaptainProvision(15000);
    const team = { ...initialTeams[0], squad: [] as string[], totalSpent: 0, remainingBudget: 100000 };
    const captain = makePlayer({
      grade: 'A+',
      isCaptain: true,
      isPreAssignedCaptain: true,
      captainOfTeamId: team.id,
      status: 'sold',
      teamId: team.id,
      soldPrice: 15000,
    });
    const seeded: Team = {
      ...team,
      captain: captain.name,
      captainPlayerId: captain.id,
      squad: [captain.id],
      totalSpent: 15000,
      remainingBudget: 85000,
    };
    const vc = makePlayer({ grade: 'A', isViceCaptain: true, viceCaptainOfTeamId: team.id });
    expect(calculateMaxAllowableBidForPlayer(seeded, vc, [captain, vc], rules).maxBid).toBe(35000);
    expect(validatePurchase(seeded, vc, 35000, [captain, vc], rules).isValid).toBe(true);
    expect(validatePurchase(seeded, vc, 35001, [captain, vc], rules).isValid).toBe(false);
  });
});

describe('12-team max-A then complete at base', () => {
  it('lets every team spend 25000 on the first A and still finish 1A 3B 2C', () => {
    const teams: Team[] = [];
    let roster: Player[] = [];
    for (const seed of initialTeams) {
      const seeded = seedTeamWithLeadership(seed);
      teams.push(seeded.team);
      roster.push(seeded.captain, seeded.viceCaptain);
    }

    for (let t = 0; t < teams.length; t += 1) {
      const star = makePlayer({ grade: 'A' });
      const next = buy(teams[t], roster.concat(star), star, 25000);
      expect(next.result.isValid, next.result.error).toBe(true);
      teams[t] = next.team;
      roster = next.roster;
    }

    const rest: Array<{ grade: PlayerGrade; price: number }> = [
      { grade: 'A', price: 5000 },
      { grade: 'B', price: 3000 },
      { grade: 'B', price: 3000 },
      { grade: 'B', price: 3000 },
      { grade: 'C', price: 1000 },
      { grade: 'C', price: 1000 },
    ];
    for (const lot of rest) {
      for (let t = 0; t < teams.length; t += 1) {
        const player = makePlayer({ grade: lot.grade });
        const next = buy(teams[t], roster.concat(player), player, lot.price);
        expect(next.result.isValid, `team ${t} ${lot.grade}: ${next.result.error}`).toBe(true);
        teams[t] = next.team;
        roster = next.roster;
      }
    }

    for (const team of teams) {
      const metrics = getTeamGradeMetrics(team, roster, initialAuctionRules);
      expect(metrics.aCount).toBe(2);
      expect(metrics.bCount).toBe(3);
      expect(metrics.cCount).toBe(2);
      expect(team.squad).toHaveLength(9);
      expect(team.remainingBudget).toBe(9000);
    }
  });
});


