import { Player, PlayerGrade, Team } from '../types/auction';

export interface PlayerAIInsights {
  suggestedGrade: PlayerGrade;
  confidenceScore: number; // 0-100%
  recommendedPriceRange: { min: number; max: number };
  strengths: string[];
  concerns: string[];
  summary: string;
}

export interface TeamStrategyAdvice {
  teamId: string;
  teamName: string;
  urgentNeeds: string[];
  recommendations: string[];
  spendingStatus: 'Thrifty' | 'Balanced' | 'Aggressive' | 'Exhausted';
  budgetSafetyMargin: number;
}

export function calculatePlayerRating(player: Partial<Player>): number {
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
  };

  const experience = player.experience || 1;
  const role = player.role || 'Batsman';

  let battingScore = 0;
  if (stats.matches > 0 || stats.runs > 0 || stats.average > 0) {
    const avgScore = Math.min((stats.average || 15) / 30, 1.3) * 35;
    const srScore = Math.min((stats.strikeRate || 100) / 130, 1.3) * 35;
    const volumeScore = Math.min((stats.runs || 0) / 200, 1.3) * 20;
    const fiftiesScore = Math.min(((stats.fifties || 0) * 2 + (stats.hundreds || 0) * 5) / 3, 1.0) * 10;
    battingScore = avgScore + srScore + volumeScore + fiftiesScore;
  }

  let bowlingScore = 0;
  if (stats.wickets > 0 || stats.economyRate > 0) {
    const wktScore = Math.min((stats.wickets || 0) / 10, 1.3) * 40;
    const econScore = stats.economyRate > 0 ? Math.max(0, (10 - stats.economyRate) / 4) * 35 : 20;
    const bowlAvgScore = stats.bowlingAverage > 0 ? Math.max(0, (30 - stats.bowlingAverage) / 15) * 25 : 20;
    bowlingScore = wktScore + econScore + bowlAvgScore;
  }

  let composite = 0;
  if (role === 'Batsman') {
    composite = battingScore * 0.85 + (experience * 2) + Math.min(stats.catches, 30) * 0.5;
  } else if (role === 'Bowler') {
    composite = bowlingScore * 0.85 + (experience * 2) + Math.min(stats.catches, 30) * 0.5;
  } else if (role === 'Wicketkeeper') {
    const keepingScore = Math.min(((stats.catches + (stats.stumpings || 0) * 2) / 40) * 25, 25);
    composite = (battingScore * 0.7) + keepingScore + (experience * 2);
  }

  return Math.round(Math.min(Math.max(composite, 10), 100));
}

export function generatePlayerAIInsights(player: Player): PlayerAIInsights {
  const rating = calculatePlayerRating(player);
  const stats = player.stats;

  let suggestedGrade: PlayerGrade = 'C';
  let minVal = 1000;
  let maxVal = 2500;

  if (rating >= 75) {
    suggestedGrade = 'A';
    minVal = Math.max(player.basePrice, 5000);
    maxVal = Math.round(minVal * 1.8 / 500) * 500;
  } else if (rating >= 50) {
    suggestedGrade = 'B';
    minVal = Math.max(player.basePrice, 2500);
    maxVal = Math.round(minVal * 1.5 / 500) * 500;
  } else {
    suggestedGrade = 'C';
    minVal = Math.max(player.basePrice, 1000);
    maxVal = Math.round(minVal * 1.4 / 200) * 200;
  }

  const strengths: string[] = [];
  const concerns: string[] = [];

  // Batting checks
  if (stats.average >= 35) strengths.push(`Exceptional batting average (${stats.average.toFixed(1)})`);
  if (stats.strikeRate >= 145) strengths.push(`High impact strike rate (${stats.strikeRate.toFixed(1)})`);
  if (stats.runs >= 2000) strengths.push(`Proven run-scorer (${stats.runs} career runs)`);
  if (stats.hundreds > 0) strengths.push(`Demonstrated century ability (${stats.hundreds} hundreds)`);

  // Bowling checks
  if (stats.wickets >= 50) strengths.push(`Experienced wicket taker (${stats.wickets} wickets)`);
  if (stats.economyRate > 0 && stats.economyRate <= 7.5) strengths.push(`Economical bowler (${stats.economyRate.toFixed(2)} RPO)`);
  if (stats.bowlingAverage > 0 && stats.bowlingAverage <= 24) strengths.push(`Stingy bowling average (${stats.bowlingAverage.toFixed(1)})`);

  // Experience / Field
  if (player.experience >= 7) strengths.push(`High tournament pedigree (${player.experience} years experience)`);
  if (stats.catches >= 30) strengths.push(`Safe hands in the field (${stats.catches} catches)`);

  // Concerns
  if (stats.matches === 0) concerns.push('Uncapped / pending match statistics');
  if (player.age >= 33) concerns.push('Senior veteran, potential stamina or longevity factor');
  if (player.role === 'Batsman' && stats.strikeRate > 0 && stats.strikeRate < 125) concerns.push('Moderate strike rate in fast-scoring formats');
  if (player.role === 'Bowler' && stats.economyRate >= 8.5) concerns.push('Can be expensive in high-pressure death overs');
  if (player.experience <= 2) concerns.push('Limited exposure to high-pressure tournament situations');

  if (strengths.length === 0) strengths.push('Good overall physical fitness and enthusiasm');
  if (concerns.length === 0) concerns.push('No obvious statistical weaknesses detected');

  const summary = `${player.name} (${player.role}, Grade ${player.grade}) holds an AI composite rating of ${rating}/100. Based on career metrics, fair market auction valuation sits between ${minVal.toLocaleString()} and ${maxVal.toLocaleString()} points.`;

  return {
    suggestedGrade,
    confidenceScore: Math.min(85 + (player.experience * 2), 98),
    recommendedPriceRange: { min: minVal, max: maxVal },
    strengths,
    concerns,
    summary,
  };
}

export function generateTournamentAIAdvice(teams: Team[], players: Player[]): {
  marketInsights: string[];
  teamStrategies: TeamStrategyAdvice[];
} {
  const soldPlayers = players.filter(p => p.status === 'sold');
  const remainingPlayers = players.filter(p => p.status === 'upcoming' || p.status === 'unsold');
  
  const remainingA = remainingPlayers.filter(p => p.grade === 'A').length;
  const remainingBowlers = remainingPlayers.filter(p => p.role === 'Bowler').length;
  const remainingBatsmen = remainingPlayers.filter(p => p.role === 'Batsman').length;
  const remainingKeepers = remainingPlayers.filter(p => p.role === 'Wicketkeeper').length;

  const marketInsights: string[] = [];

  if (remainingA <= 3) {
    marketInsights.push(`⚠️ Scarcity Alert: Only ${remainingA} Grade-A player(s) remain in the auction pool! Expect bidding wars.`);
  } else {
    marketInsights.push(`💎 ${remainingA} Grade-A elite marquee players are still available.`);
  }

  if (remainingBowlers <= 5) {
    marketInsights.push(`🎯 Quality bowler pool is depleting quickly (${remainingBowlers} remaining). Prices may spike.`);
  }

  // Find richest and most aggressive teams
  const sortedByBudget = [...teams].sort((a, b) => b.remainingBudget - a.remainingBudget);
  if (sortedByBudget.length > 0 && soldPlayers.length > 0) {
    marketInsights.push(`💰 Leaderboard: ${sortedByBudget[0].name} holds highest purchasing power (${sortedByBudget[0].remainingBudget.toLocaleString()} pts).`);
  }

  const teamStrategies: TeamStrategyAdvice[] = teams.map(team => {
    const squadPlayers = players.filter(p => team.squad.includes(p.id));
    const batsCount = squadPlayers.filter(p => p.role === 'Batsman').length;
    const bowlCount = squadPlayers.filter(p => p.role === 'Bowler').length;
    const wkCount = squadPlayers.filter(p => p.role === 'Wicketkeeper').length;

    const urgentNeeds: string[] = [];
    const recommendations: string[] = [];

    if (wkCount === 0) urgentNeeds.push('Need at least 1 designated Wicketkeeper');
    if (bowlCount < 2) urgentNeeds.push(`Need ${2 - bowlCount} more strike Bowlers`);
    if (batsCount < 2) urgentNeeds.push(`Need ${2 - batsCount} more Batsmen`);

    if (squadPlayers.length >= 9) {
      recommendations.push(`Full squad roster complete! (${squadPlayers.length} players acquired).`);
    }

    const spentPercent = (team.totalSpent / team.startingBudget) * 100;
    let spendingStatus: 'Thrifty' | 'Balanced' | 'Aggressive' | 'Exhausted' = 'Balanced';

    if (team.remainingBudget <= 3000 && squadPlayers.length < 9) {
      spendingStatus = 'Exhausted';
      recommendations.push('Budget low. Focus on base-price steals to fill remaining quota.');
    } else if (spentPercent > 70) {
      spendingStatus = 'Aggressive';
      recommendations.push('Aggressive spending. Conserve purse for remaining role slots.');
    } else if (spentPercent < 30 && squadPlayers.length <= 3) {
      spendingStatus = 'Thrifty';
      recommendations.push('High cash reserves available. Target remaining marquee stars for open slots.');
    } else {
      recommendations.push('Balanced roster pace. Target open slots in upcoming lots.');
    }

    const slotsRemaining = Math.max(9 - squadPlayers.length, 1);
    const avgRemainingPerSlot = Math.round(team.remainingBudget / slotsRemaining);


    return {
      teamId: team.id,
      teamName: team.name,
      urgentNeeds,
      recommendations,
      spendingStatus,
      budgetSafetyMargin: avgRemainingPerSlot,
    };
  });

  return {
    marketInsights,
    teamStrategies,
  };
}
