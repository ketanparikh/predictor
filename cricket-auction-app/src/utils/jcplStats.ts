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
      return t[t.length - 1] === last && (t[0] === first || t[0]?.[0] === first[0]);
    }),
  );
  if (lastMatches.length === 1) return lastMatches[0];

  return null;
}

export function careerToAuctionStats(player: JcplIndexedPlayer): PlayerStats {
  const c = player.career;
  return {
    matches: c.matches,
    runs: c.runs,
    average: c.average,
    strikeRate: c.strikeRate,
    highestScore: Number(String(c.highestScore).replace(/[^0-9.]/g, '')) || 0,
    fifties: c.fifties,
    hundreds: c.hundreds,
    wickets: c.wickets,
    bowlingAverage: c.bowlingAverage,
    economyRate: c.economyRate,
    bestBowling: c.bestBowling || '',
    catches: c.catches,
    stumpings: c.stumpings,
  };
}

export function jcplSummary(player: JcplIndexedPlayer): string {
  const labels = player.seasons.map((s) => `${s.seasonLabel} ${s.category}`).join(', ');
  const c = player.career;
  return `JCPL ${labels}: ${c.matches} matches, ${c.runs} runs, ${c.wickets} wickets`;
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
