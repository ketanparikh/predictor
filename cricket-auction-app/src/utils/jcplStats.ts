import jcplIndex from '../data/jcplPlayerIndex.json';
import type { ParsedPlayerRow } from './excelParser';
import { calculateRecommendedGrade } from './excelParser';
import type { GradeBasePrices, PlayerStats } from '../types/auction';

export interface JcplSeasonStat {
  seasonId: string;
  seasonLabel: string;
  category: string;
  tournament: string;
  team: string;
  matches: number;
  runs: number;
  average: number;
  strikeRate: number;
  highestScore: string;
  fifties: number;
  hundreds: number;
  wickets: number;
  bowlingAverage: number;
  economyRate: number;
  bestBowling: string;
  catches: number;
  stumpings: number;
}

export interface JcplIndexedPlayer {
  playerId: number;
  names: string[];
  seasons: JcplSeasonStat[];
  career: {
    matches: number;
    runs: number;
    wickets: number;
    fifties: number;
    hundreds: number;
    catches: number;
    stumpings: number;
    highestScore: string;
    bestBowling: string;
    average: number;
    strikeRate: number;
    bowlingAverage: number;
    economyRate: number;
  };
}

const PLAYERS = (jcplIndex as { players: JcplIndexedPlayer[] }).players;

const NAME_ALIASES: Record<string, string> = {
  'akshay': 'akshay pore',
  'aaryan mandar joshi': 'aaryan joshi',
  'hrishikesh baradkar': 'hrishi jade jcpl',
  'medha vivek pawar': 'adv medha pawar jade',
  'pankaj': 'pankaj guglani',
  'pushkar ballal': 'pushkar b',
  'krushhna deokar': 'krushhna jade',
  'pallavi jadhao': 'dr pallavi jadhao',
  'tejwardhan rathod': 'tejwardhan',
  'prasad wagh': 'prasad sir',
  'paras bheda': 'paras',
  'swarnim chavan': 'swarnim s chavan',
  'mukund dongre': 'd mukund',
  'swapnil pusalkar': 'swapnil',
  'swara wagh': 'swara',
  'sharvin batwal': 'sharvin',
  'vicky sharma': 'vicky jade',
  'ajit bhalwankar': 'ajit',
  'tanmay shahane': 'tanmay',
  'pradnya mahesh kulkarni': 'pradnya kulkarni',
  'ganesh raghuram': 'ganesh',
  'avi': 'avinash gupta',
};

export function normalizePlayerName(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/\((c|wk|vc)\)/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractCricHeroesId(urlOrId?: string): number | null {
  if (!urlOrId) return null;
  const raw = String(urlOrId).trim();
  if (/^\d+$/.test(raw)) return Number(raw);
  const match = raw.match(/player-profile\/(\d+)/i) || raw.match(/cricketer\/(\d+)/i);
  return match ? Number(match[1]) : null;
}

function tokens(name: string): string[] {
  return normalizePlayerName(name).split(' ').filter(Boolean);
}

export function findJcplPlayer(name: string, cricheroesUrl?: string): JcplIndexedPlayer | null {
  const id = extractCricHeroesId(cricheroesUrl);
  if (id) {
    const byId = PLAYERS.find((p) => p.playerId === id);
    if (byId) return byId;
  }

  const searchName = NAME_ALIASES[normalizePlayerName(name)] || name;
  const norm = normalizePlayerName(searchName);
  if (!norm) return null;

  const exact = PLAYERS.filter((p) => p.names.some((n) => normalizePlayerName(n) === norm));
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return exact[0];

  const nameTokens = tokens(searchName);
  if (nameTokens.length === 0) return null;
  const last = nameTokens[nameTokens.length - 1];
  const first = nameTokens[0];

  const lastMatches = PLAYERS.filter((p) =>
    p.names.some((n) => {
      const t = tokens(n);
      return t[t.length - 1] === last && (t[0] === first || (first.length <= 2 && t[0]?.[0] === first[0]));
    }),
  );
  if (lastMatches.length === 1) return lastMatches[0];

  return null;
}

function betterHighScore(current: string, next: string): string {
  const value = (score: string) => Number(String(score || '').replace(/[^0-9.]/g, '')) || 0;
  if (value(next) > value(current)) return next || '';
  if (value(current) > value(next)) return current || '';
  if (String(next).includes('*') && !String(current).includes('*')) return next || '';
  return current || next || '';
}

function betterBestBowling(current: string, next: string): string {
  const parse = (text: string) => {
    const match = String(text || '').match(/(\d+)\s*\/\s*(\d+)/);
    return match ? { wickets: Number(match[1]), runs: Number(match[2]) } : null;
  };
  const currentBest = parse(current);
  const nextBest = parse(next);
  if (!nextBest) return current || '';
  if (!currentBest) return next || '';
  if (nextBest.wickets > currentBest.wickets) return next;
  if (nextBest.wickets === currentBest.wickets && nextBest.runs < currentBest.runs) return next;
  return current;
}

/** Aggregate JCPL season rows only. Never use all-tournament CricHeroes career. */
export function careerToAuctionStats(player: JcplIndexedPlayer): PlayerStats {
  const seasons = player.seasons || [];
  if (!seasons.length) {
    return {
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
  }

  let matches = 0;
  let runs = 0;
  let wickets = 0;
  let fifties = 0;
  let hundreds = 0;
  let catches = 0;
  let stumpings = 0;
  let highestScore = '';
  let bestBowling = '';
  let runWeight = 0;
  let srWeight = 0;
  let bowlWicketWeight = 0;
  let bowlAvgWeight = 0;
  let econWeight = 0;
  let econSum = 0;

  for (const season of seasons) {
    matches += season.matches || 0;
    runs += season.runs || 0;
    wickets += season.wickets || 0;
    fifties += season.fifties || 0;
    hundreds += season.hundreds || 0;
    catches += season.catches || 0;
    stumpings += season.stumpings || 0;
    highestScore = betterHighScore(highestScore, season.highestScore);
    bestBowling = betterBestBowling(bestBowling, season.bestBowling);
    if ((season.runs || 0) > 0 && (season.strikeRate || 0) > 0) {
      runWeight += season.runs;
      srWeight += season.strikeRate * season.runs;
    }
    if ((season.wickets || 0) > 0 && (season.bowlingAverage || 0) > 0) {
      bowlWicketWeight += season.wickets;
      bowlAvgWeight += season.bowlingAverage * season.wickets;
    }
    if ((season.matches || 0) > 0 && (season.economyRate || 0) > 0) {
      econWeight += season.matches;
      econSum += season.economyRate * season.matches;
    }
  }

  const dismissedApprox = seasons.reduce((sum, season) => {
    if (!season.runs || !season.average) return sum;
    return sum + Math.max(1, Math.round(season.runs / season.average));
  }, 0);

  return {
    matches,
    runs,
    average: dismissedApprox > 0 ? Math.round((runs / dismissedApprox) * 100) / 100 : 0,
    strikeRate: runWeight > 0 ? Math.round((srWeight / runWeight) * 100) / 100 : 0,
    highestScore: Number(String(highestScore).replace(/[^0-9.]/g, '')) || 0,
    fifties,
    hundreds,
    wickets,
    bowlingAverage: bowlWicketWeight > 0 ? Math.round((bowlAvgWeight / bowlWicketWeight) * 100) / 100 : 0,
    economyRate: econWeight > 0 ? Math.round((econSum / econWeight) * 100) / 100 : 0,
    bestBowling,
    catches,
    stumpings,
  };
}

export function jcplSummary(player: JcplIndexedPlayer): string {
  const labels = player.seasons.map((s) => `${s.seasonLabel} ${s.category}`).join(', ');
  const stats = careerToAuctionStats(player);
  return `JCPL ${labels}: ${stats.matches} matches, ${stats.runs} runs, ${stats.wickets} wickets`;
}

export function enrichRowsWithJcplStats(
  rows: ParsedPlayerRow[],
  gradeBasePrices: GradeBasePrices,
): { rows: ParsedPlayerRow[]; matched: number } {
  let matched = 0;
  const next = rows.map((row) => {
    const hit = findJcplPlayer(row.name, row.cricheroesProfileUrl);
    if (!hit) return row;
    matched += 1;
    const stats = careerToAuctionStats(hit);
    const rec = calculateRecommendedGrade(stats, row.role, row.isCaptain, row.isViceCaptain);
    let basePrice = gradeBasePrices.gradeC || 1000;
    if (rec.grade === 'A+') basePrice = gradeBasePrices.gradeAPlus || 7000;
    else if (rec.grade === 'A') basePrice = gradeBasePrices.gradeA || 5000;
    else if (rec.grade === 'B') basePrice = gradeBasePrices.gradeB || 3000;
    const hasExcelStats = (row.runs || 0) + (row.wickets || 0) + (row.matches || 0) > 0;
    return {
      ...row,
      matches: hasExcelStats ? row.matches : stats.matches,
      runs: hasExcelStats ? row.runs : stats.runs,
      average: hasExcelStats ? row.average : stats.average,
      strikeRate: hasExcelStats ? row.strikeRate : stats.strikeRate,
      highestScore: hasExcelStats ? row.highestScore : stats.highestScore,
      fifties: hasExcelStats ? row.fifties : stats.fifties,
      hundreds: hasExcelStats ? row.hundreds : stats.hundreds,
      wickets: hasExcelStats ? row.wickets : stats.wickets,
      bowlingAverage: hasExcelStats ? row.bowlingAverage : stats.bowlingAverage,
      economyRate: hasExcelStats ? row.economyRate : stats.economyRate,
      bestBowling: hasExcelStats && row.bestBowling ? row.bestBowling : stats.bestBowling,
      catches: hasExcelStats ? row.catches : stats.catches,
      stumpings: hasExcelStats ? row.stumpings : (stats.stumpings ?? 0),
      previousPerformance: row.previousPerformance || jcplSummary(hit),
      notes: row.notes || jcplSummary(hit),
      cricheroesProfileUrl:
        row.cricheroesProfileUrl || `https://cricheroes.com/player-profile/${hit.playerId}/player/matches`,
      jcplPlayerId: hit.playerId,
      jcplSeasons: hit.seasons.map((s) => `${s.seasonLabel} ${s.category}`),
      jcplMatched: true,
      grade: hasExcelStats ? row.grade : rec.grade,
      gradeReason: hasExcelStats ? row.gradeReason : `JCPL tournament: ${rec.reason}`,
      basePrice: hasExcelStats && row.basePrice ? row.basePrice : basePrice,
    };
  });
  return { rows: next, matched };
}

export function getJcplIndex() {
  return PLAYERS;
}
