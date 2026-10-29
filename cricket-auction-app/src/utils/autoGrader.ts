import { Player, PlayerGrade, PlayerRole, PlayerStats, GradeBasePrices } from '../types/auction';

export interface CohortStats {
  totalPlayers: number;
  playersWithStatsCount: number;
  // Batting aggregates
  maxRuns: number;
  avgRuns: number;
  medianRuns: number;
  maxAvg: number;
  avgAvg: number;
  maxSr: number;
  avgSr: number;
  maxFifties: number;
  maxHundreds: number;
  // Bowling aggregates
  maxWickets: number;
  avgWickets: number;
  medianWickets: number;
  bestEcon: number;
  avgEcon: number;
  bestBowlAvg: number;
  avgBowlAvg: number;
  // Fielding / Keeping
  maxCatches: number;
  maxStumpings: number;
  maxMatches: number;
  avgMatches: number;
}

export interface AutoGradeResult {
  player: Player;
  oldGrade: PlayerGrade;
  newGrade: PlayerGrade;
  oldBasePrice: number;
  newBasePrice: number;
  score: number; // 0 - 100
  reason: string;
  statsFilled: boolean;
  isCaptainLock: boolean;
}

export interface CohortGradingSummary {
  gradedPlayers: Player[];
  results: AutoGradeResult[];
  changedCount: number;
  statsFilledCount: number;
  gradeCounts: {
    'A+': number;
    'A': number;
    'B': number;
    'C': number;
  };
  cohortStats: CohortStats;
}

/**
 * Calculates statistical benchmarks across the participants currently in the tournament database.
 */
export function computeCohortStats(players: Player[]): CohortStats {
  const playersWithStats = players.filter(p => {
    const s = p.stats;
    if (!s) return false;
    return s.matches > 0 || s.runs > 0 || s.wickets > 0 || s.average > 0 || s.strikeRate > 0;
  });

  const runsList: number[] = [];
  const avgList: number[] = [];
  const srList: number[] = [];
  const wktList: number[] = [];
  const econList: number[] = [];
  const bowlAvgList: number[] = [];
  const matchList: number[] = [];
  const catchList: number[] = [];
  const stumpList: number[] = [];
  const fiftiesList: number[] = [];
  const hundredsList: number[] = [];

  playersWithStats.forEach(p => {
    const s = p.stats;
    if (s.matches > 0) matchList.push(s.matches);
    if (s.runs > 0) runsList.push(s.runs);
    if (s.average > 0) avgList.push(s.average);
    if (s.strikeRate > 0) srList.push(s.strikeRate);
    if (s.wickets > 0) wktList.push(s.wickets);
    if (s.economyRate > 0 && s.economyRate < 25) econList.push(s.economyRate);
    if (s.bowlingAverage > 0 && s.bowlingAverage < 100) bowlAvgList.push(s.bowlingAverage);
    if (s.catches > 0) catchList.push(s.catches);
    if (s.stumpings && s.stumpings > 0) stumpList.push(s.stumpings);
    if (s.fifties > 0) fiftiesList.push(s.fifties);
    if (s.hundreds > 0) hundredsList.push(s.hundreds);
  });

  const median = (arr: number[], fallback: number): number => {
    if (arr.length === 0) return fallback;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const avg = (arr: number[], fallback: number): number => {
    if (arr.length === 0) return fallback;
    const sum = arr.reduce((acc, v) => acc + v, 0);
    return Math.round((sum / arr.length) * 10) / 10;
  };

  const maxVal = (arr: number[], fallback: number): number => {
    if (arr.length === 0) return fallback;
    return Math.max(...arr);
  };

  const minVal = (arr: number[], fallback: number): number => {
    if (arr.length === 0) return fallback;
    return Math.min(...arr);
  };

  return {
    totalPlayers: players.length,
    playersWithStatsCount: playersWithStats.length,
    maxRuns: maxVal(runsList, 150),
    avgRuns: avg(runsList, 45),
    medianRuns: median(runsList, 35),
    maxAvg: maxVal(avgList, 35),
    avgAvg: avg(avgList, 20),
    maxSr: maxVal(srList, 160),
    avgSr: avg(srList, 115),
    maxFifties: maxVal(fiftiesList, 1),
    maxHundreds: maxVal(hundredsList, 0),
    maxWickets: maxVal(wktList, 12),
    avgWickets: avg(wktList, 4),
    medianWickets: median(wktList, 3),
    bestEcon: minVal(econList, 5.5),
    avgEcon: avg(econList, 7.8),
    bestBowlAvg: minVal(bowlAvgList, 14.0),
    avgBowlAvg: avg(bowlAvgList, 22.0),
    maxCatches: maxVal(catchList, 6),
    maxStumpings: maxVal(stumpList, 2),
    maxMatches: maxVal(matchList, 10),
    avgMatches: avg(matchList, 5),
  };
}

/**
 * For players with empty / zero stats:
 * Generates realistic, tournament-participant calibrated baseline stats
 * based on the participant cohort averages so they aren't blank and can be graded fairly without a minimum threshold.
 */
export function generateParticipantBaselineStats(player: Player, cohort: CohortStats): PlayerStats {
  const expFactor = Math.min(Math.max((player.experience || 2) / 5, 0.6), 1.5);
  const role = player.role || 'Batsman';

  const matches = Math.max(1, Math.round((cohort.avgMatches * 0.75 + 1) * (0.8 + Math.random() * 0.4)));

  if (role === 'Batsman') {
    const baseAvg = Math.max(12, Math.round((cohort.avgAvg * 0.85 + (player.experience || 1) * 1.5) * expFactor));
    const baseSr = Math.max(85, Math.round((cohort.avgSr * 0.9 + 5) * (0.9 + Math.random() * 0.2)));
    const runs = Math.max(15, Math.round(matches * (baseAvg * 0.75)));
    const fifties = runs >= 70 ? 1 : 0;
    const highestScore = Math.min(runs, Math.max(20, Math.round(baseAvg * 1.4)));

    return {
      matches,
      runs,
      average: baseAvg,
      strikeRate: baseSr,
      highestScore,
      fifties,
      hundreds: 0,
      wickets: 0,
      bowlingAverage: 0,
      economyRate: 0,
      bestBowling: 'None',
      catches: Math.round(matches * 0.4),
      stumpings: 0,
    };
  }

  if (role === 'Bowler') {
    const wkts = Math.max(1, Math.round((cohort.avgWickets * 0.85 + 1) * expFactor));
    const econ = Math.round((cohort.avgEcon + (Math.random() * 1.2 - 0.6)) * 10) / 10;
    const bowlAvg = Math.round((cohort.avgBowlAvg + (Math.random() * 4 - 2)) * 10) / 10;
    const bestBowling = `${Math.min(wkts, Math.max(1, Math.round(wkts / 2)))}/${Math.max(12, Math.round(econ * 2.5))}`;

    return {
      matches,
      runs: Math.max(5, Math.round(matches * 4)),
      average: 8,
      strikeRate: 85,
      highestScore: 12,
      fifties: 0,
      hundreds: 0,
      wickets: wkts,
      bowlingAverage: bowlAvg,
      economyRate: econ,
      bestBowling,
      catches: Math.round(matches * 0.3),
      stumpings: 0,
    };
  }

  // Wicketkeeper
  const baseAvg = Math.max(12, Math.round(cohort.avgAvg * 0.8));
  const baseSr = Math.max(90, Math.round(cohort.avgSr * 0.85));
  const runs = Math.max(15, Math.round(matches * baseAvg * 0.7));
  const catches = Math.max(1, Math.round(matches * 0.8));
  const stumpings = Math.max(0, Math.round(matches * 0.3));

  return {
    matches,
    runs,
    average: baseAvg,
    strikeRate: baseSr,
    highestScore: Math.max(15, Math.round(baseAvg * 1.3)),
    fifties: 0,
    hundreds: 0,
    wickets: 0,
    bowlingAverage: 0,
    economyRate: 0,
    bestBowling: 'None',
    catches,
    stumpings,
  };
}

/**
 * Scores a player relative to the participant cohort on a 0-100 scale.
 * IMPORTANT: No minimum match or volume threshold is enforced!
 * Players with fewer matches are evaluated on their efficiency and rate metrics,
 * fairly benchmarking them against tournament participants.
 */
export function calculateParticipantRelativeScore(player: Player, cohort: CohortStats): { score: number; reason: string } {
  const stats = player.stats || {
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
    stumpings: 0,
  };

  const role = player.role || 'Batsman';

  // 1. Batting efficiency (0 - 45 pts)
  let battingScore = 0;
  if (stats.runs > 0 || stats.average > 0 || stats.strikeRate > 0) {
    // Relative average vs cohort average
    const normAvg = cohort.avgAvg > 0 ? stats.average / cohort.avgAvg : stats.average / 20;
    const avgPts = Math.min(Math.max(normAvg * 18, 2), 22);

    // Strike rate impact vs cohort average SR
    const normSr = cohort.avgSr > 0 ? stats.strikeRate / cohort.avgSr : stats.strikeRate / 115;
    const srPts = Math.min(Math.max(normSr * 14, 2), 18);

    // Relative run volume vs participant max/median (scaled so even modest runs give points without thresholds)
    const normRuns = cohort.maxRuns > 0 ? stats.runs / cohort.maxRuns : stats.runs / 100;
    const runPts = Math.min(Math.max(normRuns * 18, 1), 20);

    // Milestone bonus
    const milestoneBonus = Math.min(stats.fifties * 4 + stats.hundreds * 10, 8);

    battingScore = avgPts + srPts + runPts + milestoneBonus;
  }

  // 2. Bowling efficiency (0 - 45 pts)
  let bowlingScore = 0;
  if (stats.wickets > 0 || (stats.economyRate > 0 && stats.economyRate <= 15)) {
    // Wickets relative to cohort max/median
    const normWkts = cohort.maxWickets > 0 ? stats.wickets / cohort.maxWickets : stats.wickets / 8;
    const wktPts = Math.min(Math.max(normWkts * 24, 2), 28);

    // Economy efficiency: lower economy relative to cohort is rewarded
    let econPts = 8;
    if (stats.economyRate > 0) {
      const econRatio = cohort.avgEcon > 0 ? (cohort.avgEcon * 1.2 - stats.economyRate) / cohort.avgEcon : (9 - stats.economyRate) / 5;
      econPts = Math.min(Math.max(econRatio * 18, 0), 20);
    }

    // Bowling average impact
    let bowlAvgPts = 6;
    if (stats.bowlingAverage > 0) {
      const bowlRatio = cohort.avgBowlAvg > 0 ? (cohort.avgBowlAvg * 1.3 - stats.bowlingAverage) / cohort.avgBowlAvg : (28 - stats.bowlingAverage) / 15;
      bowlAvgPts = Math.min(Math.max(bowlRatio * 12, 0), 14);
    }

    bowlingScore = wktPts + econPts + bowlAvgPts;
  }

  // 3. Dismissals / Fielding
  const dismissals = (stats.catches || 0) + (stats.stumpings || 0) * 1.5;
  const fieldingPts = Math.min(dismissals * 2, 10);

  // 4. Experience bonus
  const expBonus = Math.min(Math.max((player.experience || 1) * 1.2, 1), 6);

  // Role Composite Calculation
  let finalScore = 20;
  let reason = '';

  const isDualThreat = stats.runs >= 20 && stats.wickets >= 2;

  if (role === 'Batsman') {
    if (isDualThreat) {
      finalScore = battingScore * 0.75 + bowlingScore * 0.35 + fieldingPts + expBonus;
      reason = `All-round impact (${stats.runs} R, ${stats.wickets} W, SR ${stats.strikeRate})`;
    } else {
      finalScore = battingScore * 1.1 + fieldingPts * 0.7 + expBonus;
      reason = stats.runs > 0 
        ? `Batter (${stats.runs} runs, avg ${stats.average.toFixed(1)}, SR ${stats.strikeRate.toFixed(1)})`
        : `Batsman (experience ${player.experience || 1} yrs)`;
    }
  } else if (role === 'Bowler') {
    if (isDualThreat) {
      finalScore = bowlingScore * 0.75 + battingScore * 0.35 + fieldingPts + expBonus;
      reason = `Bowling all-rounder (${stats.wickets} W, ${stats.runs} R, econ ${stats.economyRate.toFixed(1)})`;
    } else {
      finalScore = bowlingScore * 1.1 + fieldingPts * 0.7 + expBonus;
      reason = stats.wickets > 0
        ? `Strike bowler (${stats.wickets} wkts, econ ${stats.economyRate.toFixed(1)}, avg ${stats.bowlingAverage.toFixed(1)})`
        : `Bowler (experience ${player.experience || 1} yrs)`;
    }
  } else if (role === 'Wicketkeeper') {
    const keeperBonus = Math.min(((stats.catches || 0) + (stats.stumpings || 0) * 2) * 3, 20);
    finalScore = battingScore * 0.85 + keeperBonus + expBonus;
    reason = `Wicketkeeper-batter (${stats.runs} runs, ${stats.catches} ct, ${stats.stumpings || 0} st)`;
  }

  // Clamped between 15 and 99
  const clampedScore = Math.round(Math.min(Math.max(finalScore, 18), 98));

  return {
    score: clampedScore,
    reason,
  };
}

/**
 * Auto-grades all players in the tournament database based on participant statistics.
 * Does not require a minimum threshold.
 */
export function autoGradeCohort(
  players: Player[],
  gradeBasePrices: GradeBasePrices,
  options: {
    fillMissingStats?: boolean;
    updateBasePrices?: boolean;
    preserveCaptains?: boolean;
  } = {}
): CohortGradingSummary {
  const {
    fillMissingStats = true,
    updateBasePrices = true,
    preserveCaptains = true,
  } = options;

  const cohortStats = computeCohortStats(players);

  // 1. Fill missing stats if enabled
  const processedPlayers = players.map(p => {
    const s = p.stats;
    const hasNoStats = !s || (s.matches === 0 && s.runs === 0 && s.wickets === 0 && s.average === 0);
    if (hasNoStats && fillMissingStats) {
      const generated = generateParticipantBaselineStats(p, cohortStats);
      return {
        ...p,
        stats: generated,
        _statsAutoFilled: true,
      };
    }
    return p;
  });

  // Recompute cohort with filled stats for balanced distribution
  const finalCohortStats = computeCohortStats(processedPlayers);

  // 2. Score every participant without minimum thresholds
  const scoredList = processedPlayers.map(p => {
    const { score, reason } = calculateParticipantRelativeScore(p, finalCohortStats);
    return {
      player: p,
      score,
      reason,
      isCaptain: Boolean(p.isCaptain || p.isPreAssignedCaptain),
      isViceCaptain: Boolean(p.isViceCaptain),
    };
  });

  // 3. Determine grade cutoffs dynamically based on participant score distribution
  // We rank non-captains by score
  const nonCaptains = scoredList.filter(item => !(preserveCaptains && item.isCaptain));
  const sortedScores = nonCaptains.map(i => i.score).sort((a, b) => b - a);

  // Target percentiles:
  // Grade A+: top ~15%
  // Grade A : next ~25% (up to top 40%)
  // Grade B : next ~35% (up to top 75%)
  // Grade C : remaining ~25%
  const count = sortedScores.length;
  const aPlusIndex = Math.max(1, Math.floor(count * 0.15));
  const aIndex = Math.max(aPlusIndex + 1, Math.floor(count * 0.40));
  const bIndex = Math.max(aIndex + 1, Math.floor(count * 0.75));

  const aPlusCutoff = count > 0 ? sortedScores[Math.min(aPlusIndex - 1, count - 1)] : 78;
  const aCutoff = count > 0 ? sortedScores[Math.min(aIndex - 1, count - 1)] : 58;
  const bCutoff = count > 0 ? sortedScores[Math.min(bIndex - 1, count - 1)] : 38;

  const results: AutoGradeResult[] = [];
  const gradeCounts = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0 };

  const gradedPlayers: Player[] = scoredList.map(item => {
    const p = item.player;
    const oldGrade = p.grade;
    const oldBasePrice = p.basePrice;
    let newGrade: PlayerGrade = 'C';
    let gradeTitle = 'Grade C';

    if (preserveCaptains && item.isCaptain) {
      newGrade = 'A+';
      gradeTitle = 'Grade A+ (Designated Captain / Marquee)';
    } else if (item.score >= Math.max(aPlusCutoff, 75)) {
      newGrade = 'A+';
      gradeTitle = `Grade A+ • Top Tier Participant (Score: ${item.score}/100)`;
    } else if (item.score >= Math.max(aCutoff, 55) || item.isViceCaptain) {
      newGrade = 'A';
      gradeTitle = `Grade A • Elite Participant (Score: ${item.score}/100)`;
    } else if (item.score >= Math.max(bCutoff, 35)) {
      newGrade = 'B';
      gradeTitle = `Grade B • Core Participant (Score: ${item.score}/100)`;
    } else {
      newGrade = 'C';
      gradeTitle = `Grade C • Developing Participant (Score: ${item.score}/100)`;
    }

    gradeCounts[newGrade]++;

    let newBasePrice = p.basePrice;
    if (updateBasePrices) {
      if (newGrade === 'A+') newBasePrice = gradeBasePrices.gradeAPlus || 7000;
      else if (newGrade === 'A') newBasePrice = gradeBasePrices.gradeA || 5000;
      else if (newGrade === 'B') newBasePrice = gradeBasePrices.gradeB || 3000;
      else newBasePrice = gradeBasePrices.gradeC || 1000;
    }

    const fullReason = `${gradeTitle} — ${item.reason}`;

    results.push({
      player: p,
      oldGrade,
      newGrade,
      oldBasePrice,
      newBasePrice,
      score: item.score,
      reason: fullReason,
      statsFilled: Boolean((p as any)._statsAutoFilled),
      isCaptainLock: Boolean(preserveCaptains && item.isCaptain),
    });

    const updated: Player = {
      ...p,
      grade: newGrade,
      basePrice: newBasePrice,
    };
    delete (updated as any)._statsAutoFilled;

    return updated;
  });

  const changedCount = results.filter(r => r.oldGrade !== r.newGrade || r.oldBasePrice !== r.newBasePrice).length;
  const statsFilledCount = results.filter(r => r.statsFilled).length;

  return {
    gradedPlayers,
    results,
    changedCount,
    statsFilledCount,
    gradeCounts,
    cohortStats: finalCohortStats,
  };
}

/**
 * Auto-grades a single player relative to the current tournament participants.
 */
export function autoGradeSinglePlayer(
  player: Player,
  allParticipants: Player[],
  gradeBasePrices: GradeBasePrices,
  options: { fillMissingStats?: boolean; updateBasePrice?: boolean } = {}
): { updatedPlayer: Player; score: number; reason: string; suggestedGrade: PlayerGrade; suggestedBasePrice: number } {
  const cohort = computeCohortStats(allParticipants);
  let evaluatedPlayer = { ...player };

  const s = evaluatedPlayer.stats;
  const hasNoStats = !s || (s.matches === 0 && s.runs === 0 && s.wickets === 0 && s.average === 0);
  if (hasNoStats && options.fillMissingStats !== false) {
    evaluatedPlayer.stats = generateParticipantBaselineStats(evaluatedPlayer, cohort);
  }

  const { score, reason } = calculateParticipantRelativeScore(evaluatedPlayer, cohort);

  let suggestedGrade: PlayerGrade = 'C';
  if (evaluatedPlayer.isCaptain || evaluatedPlayer.isPreAssignedCaptain) {
    suggestedGrade = 'A+';
  } else if (score >= 75) {
    suggestedGrade = 'A+';
  } else if (score >= 55 || evaluatedPlayer.isViceCaptain) {
    suggestedGrade = 'A';
  } else if (score >= 35) {
    suggestedGrade = 'B';
  } else {
    suggestedGrade = 'C';
  }

  let suggestedBasePrice = evaluatedPlayer.basePrice;
  if (options.updateBasePrice !== false) {
    if (suggestedGrade === 'A+') suggestedBasePrice = gradeBasePrices.gradeAPlus || 7000;
    else if (suggestedGrade === 'A') suggestedBasePrice = gradeBasePrices.gradeA || 5000;
    else if (suggestedGrade === 'B') suggestedBasePrice = gradeBasePrices.gradeB || 3000;
    else suggestedBasePrice = gradeBasePrices.gradeC || 1000;
  }

  const updatedPlayer: Player = {
    ...evaluatedPlayer,
    grade: suggestedGrade,
    basePrice: suggestedBasePrice,
  };

  return {
    updatedPlayer,
    score,
    reason: `Grade ${suggestedGrade} (Rating: ${score}/100) — ${reason}`,
    suggestedGrade,
    suggestedBasePrice,
  };
}
