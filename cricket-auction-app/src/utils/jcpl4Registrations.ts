import bundled from '../data/jcpl4Registrations.json';
import type { GradeBasePrices, Player, PlayerGrade } from '../types/auction';
import type { ParsedPlayerRow } from './excelParser';
import { calculateRecommendedGrade } from './excelParser';
import { enrichRowsWithJcplStats } from './jcplStats';

function normalizePhoto(url: string): string {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
    const matchId = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchId?.[1]) return `https://drive.google.com/thumbnail?id=${matchId[1]}&sz=w400`;
  }
  return trimmed;
}

export interface Jcpl4Registration {
  name: string;
  category: string;
  skill: string;
  tower: string;
  flat: string;
  contact: string;
  achievements: string;
  photo: string;
  cricheroesUrl: string;
  sponsorInterest: string;
  timestamp: string;
  playerId?: number | null;
  matches?: number;
  runs?: number;
  wickets?: number;
  average?: number | null;
  strikeRate?: number | null;
  highestScore?: string | number;
  fifties?: number;
  hundreds?: number;
  bowlingAverage?: number | null;
  economyRate?: number | null;
  bestBowling?: string;
  catches?: number;
  stumpings?: number;
  jcplSeasons?: string[];
}

function mapCategory(category: string): { gender: string; age: number; ageCategory: string } {
  const text = category.toLowerCase();
  if (text.includes('girl')) return { gender: 'Female', age: 12, ageCategory: '15 and Below' };
  if (text.includes('boy')) return { gender: 'Male', age: 13, ageCategory: '15 and Below' };
  if (text.includes('women')) return { gender: 'Female', age: 22, ageCategory: 'Above 15' };
  return { gender: 'Male', age: 28, ageCategory: 'Above 15' };
}

export function isMensRegistrationCategory(category: string): boolean {
  const text = String(category || '').toLowerCase();
  if (text.includes('women') || text.includes('girl') || text.includes('boy')) return false;
  return text.includes('men');
}

export function isMensRegistrationRow(row: Pick<ParsedPlayerRow, 'registrationCategory' | 'gender' | 'ageCategory' | 'age'> & { notes?: string }): boolean {
  if (isMensRegistrationCategory(row.registrationCategory || '')) return true;
  if (isMensRegistrationCategory(row.notes || '')) return true;
  const gender = row.gender || 'Male';
  const ageCategory = row.ageCategory || (row.age <= 15 ? '15 and Below' : 'Above 15');
  return gender === 'Male' && ageCategory === 'Above 15' && !/\b(women|girl|boys?)\b/i.test(`${row.registrationCategory || ''} ${row.notes || ''}`);
}

function mapRole(skill: string): ParsedPlayerRow['role'] {
  const text = skill.toLowerCase();
  if (text.includes('keep') || text.includes('wk')) return 'Wicketkeeper';
  if (text.includes('bowl')) return 'Bowler';
  return 'Batsman';
}

function extractUrl(text: string): string {
  const match = String(text || '').match(/https?:\/\/[^\s"'<>]+/i);
  return match ? match[0].replace(/[.,);]+$/, '') : '';
}

export function isJcpl4RegistrationSheet(rows: Record<string, unknown>[]): boolean {
  if (!rows.length) return false;
  const keys = Object.keys(rows[0]).join(' ').toLowerCase();
  return keys.includes('primary cricket skill') && keys.includes('tower') && keys.includes('category');
}

function findKey(row: Record<string, unknown>, test: (key: string) => boolean): unknown {
  const key = Object.keys(row).find((k) => test(k.toLowerCase()));
  return key ? row[key] : '';
}

export function parseJcpl4RegistrationRows(
  rawRows: Record<string, unknown>[],
  prices: GradeBasePrices,
): ParsedPlayerRow[] {
  const latestByKey = new Map<string, Record<string, unknown>>();
  for (const row of rawRows) {
    const name = String(findKey(row, (k) => k === 'name') || '').trim();
    if (!name) continue;
    const tower = String(findKey(row, (k) => k === 'tower') || '').trim();
    const flat = String(findKey(row, (k) => k.includes('flat')) || '').trim();
    latestByKey.set(`${name.toLowerCase()}|${tower}|${flat}`, row);
  }

  const rows: ParsedPlayerRow[] = [...latestByKey.values()].map((row, index) => {
    const name = String(findKey(row, (k) => k === 'name') || '').trim();
    const category = String(findKey(row, (k) => k === 'category') || '');
    const skill = String(findKey(row, (k) => k.includes('primary') && k.includes('skill')) || '');
    const tower = String(findKey(row, (k) => k === 'tower') || '').trim();
    const flat = String(findKey(row, (k) => k.includes('flat')) || '').trim();
    const achievements = String(findKey(row, (k) => k.includes('achievement') || k.includes('crickhero')) || '').trim();
    const photoRaw = String(findKey(row, (k) => k.includes('photo')) || '').trim();
    const sponsor = String(findKey(row, (k) => k.includes('sponsor')) || '').trim();
    const { gender, age, ageCategory } = mapCategory(category);
    const role = mapRole(skill);
    const cricheroesUrl = extractUrl(achievements);
    const photo = normalizePhoto(photoRaw) || undefined;
    const isSponsored = !!sponsor && !/^(no|none|false)$/i.test(sponsor) && !sponsor.toLowerCase().includes('maybe');
    const notes = [
      category,
      tower || flat ? `Flat ${tower}${flat}` : '',
      achievements,
    ].filter(Boolean).join(' · ');

    return {
      name,
      age,
      ageCategory,
      gender,
      experience: 1,
      role,
      battingStyle: 'Right-hand bat',
      bowlingStyle: role === 'Bowler' ? 'Right-arm medium' : 'None',
      grade: 'C',
      gradeReason: 'JCPL 4 registration',
      basePrice: prices.gradeC || 1000,
      description: achievements,
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
      previousPerformance: achievements,
      notes,
      registrationCategory: category,
      isSponsored,
      sponsorTag: isSponsored ? sponsor : undefined,
      photo,
      cricheroesProfileUrl: cricheroesUrl || undefined,
      errors: [],
      warnings: [],
      rawIndex: index,
    };
  });

  return enrichRowsWithJcplStats(rows, prices).rows;
}

function registrationKey(name: string, place = ''): string {
  return `${String(name || '').toLowerCase().trim()}|${String(place || '').toLowerCase().replace(/\s+/g, '')}`;
}

function gradeBasePrice(grade: PlayerGrade, prices: GradeBasePrices): number {
  if (grade === 'A+') return prices.gradeAPlus || 7000;
  if (grade === 'A') return prices.gradeA || 5000;
  if (grade === 'B') return prices.gradeB || 3000;
  return prices.gradeC || 1000;
}

function applyBundledCareerStats(
  rows: ParsedPlayerRow[],
  records: Jcpl4Registration[],
  prices: GradeBasePrices,
): ParsedPlayerRow[] {
  const byKey = new Map<string, Jcpl4Registration>();
  const byName = new Map<string, Jcpl4Registration>();
  for (const record of records) {
    byKey.set(registrationKey(record.name, `${record.tower || ''}${record.flat || ''}`), record);
    byName.set(String(record.name || '').toLowerCase().trim(), record);
  }
  return rows.map((row) => {
    const flatNote = String(row.notes || '').match(/flat\s+([a-z0-9 ]+)/i)?.[1] || '';
    const record =
      byKey.get(registrationKey(row.name, flatNote)) ||
      byName.get(String(row.name || '').toLowerCase().trim());
    const matches = Number(record?.matches || 0);
    const runs = Number(record?.runs || 0);
    const wickets = Number(record?.wickets || 0);
    if (!record || matches + runs + wickets <= 0) return row;
    const next: ParsedPlayerRow = {
      ...row,
      matches,
      runs,
      wickets,
      average: Number(record.average || 0),
      strikeRate: Number(record.strikeRate || 0),
      highestScore: Number(String(record.highestScore ?? '').replace(/[^0-9.]/g, '')) || 0,
      fifties: Number(record.fifties || 0),
      hundreds: Number(record.hundreds || 0),
      bowlingAverage: Number(record.bowlingAverage || 0),
      economyRate: Number(record.economyRate || 0),
      bestBowling: String(record.bestBowling || row.bestBowling || ''),
      catches: Number(record.catches || 0),
      stumpings: Number(record.stumpings || 0),
      jcplPlayerId: record.playerId || row.jcplPlayerId,
      jcplSeasons: record.jcplSeasons || row.jcplSeasons,
      cricheroesProfileUrl:
        row.cricheroesProfileUrl ||
        record.cricheroesUrl ||
        (record.playerId
          ? `https://cricheroes.com/player-profile/${record.playerId}/player/stats`
          : undefined),
    };
    const rec = calculateRecommendedGrade(next, next.role, next.isCaptain, next.isViceCaptain);
    return {
      ...next,
      grade: rec.grade,
      gradeReason: rec.reason,
      basePrice: gradeBasePrice(rec.grade, prices),
    };
  });
}

export function loadBundledJcpl4Registrations(prices: GradeBasePrices): ParsedPlayerRow[] {
  const records = (bundled as { players: Jcpl4Registration[] }).players || [];
  const asRows = records.map((player) => ({
    Name: player.name,
    Category: player.category,
    'Primary Cricket Skill': player.skill,
    Tower: player.tower,
    'Flat Number': player.flat,
    'JCPL/Cricket Achievements': player.achievements,
    "Player's latest photo": player.photo,
    'Interested in Sponsorship': player.sponsorInterest,
    Timestamp: player.timestamp,
  }));
  return applyBundledCareerStats(parseJcpl4RegistrationRows(asRows, prices), records, prices);
}

export function parsedRowToPlayer(row: ParsedPlayerRow, index: number, idPrefix = 'jcpl4'): Player {
  return {
    id: `${idPrefix}-${index}`,
    name: row.name,
    age: row.age,
    ageCategory: row.ageCategory || (row.age <= 15 ? '15 and Below' : 'Above 15'),
    gender: row.gender || 'Male',
    category: row.registrationCategory || row.notes?.split(' · ')[0] || undefined,
    experience: row.experience,
    role: row.role,
    battingStyle: row.battingStyle,
    bowlingStyle: row.bowlingStyle,
    grade: row.grade,
    basePrice: row.basePrice,
    description: row.description || row.previousPerformance || row.notes,
    status: 'upcoming',
    auctionOrder: row.auctionOrder !== undefined ? row.auctionOrder : index + 1,
    isCaptain: row.isCaptain,
    isViceCaptain: Boolean(row.isViceCaptain && row.grade === 'A'),
    sponsorTag: row.sponsorTag,
    isSponsored: row.isSponsored || !!(row.sponsorTag && row.sponsorTag.trim()),
    photo: row.photo,
    previousPerformance: row.previousPerformance || row.description,
    notes: row.notes || row.description,
    cricheroesProfileUrl: row.cricheroesProfileUrl,
    jcplPlayerId: row.jcplPlayerId,
    jcplSeasons: row.jcplSeasons,
    stats: {
      matches: row.matches,
      runs: row.runs,
      average: row.average,
      strikeRate: row.strikeRate,
      highestScore: row.highestScore,
      fifties: row.fifties,
      hundreds: row.hundreds,
      wickets: row.wickets,
      bowlingAverage: row.bowlingAverage,
      economyRate: row.economyRate,
      bestBowling: row.bestBowling,
      catches: row.catches,
      stumpings: row.stumpings,
    },
  };
}

export function isMensAuctionPlayer(player: Pick<Player, 'category' | 'gender' | 'ageCategory' | 'age' | 'notes'>): boolean {
  return isMensRegistrationRow({
    registrationCategory: player.category,
    gender: player.gender,
    ageCategory: player.ageCategory,
    age: player.age,
    notes: player.notes,
  });
}

export function isDemoPlayer(player: Pick<Player, 'id' | 'name' | 'previousPerformance'>): boolean {
  if (/^ply-\d+$/.test(player.id)) return true;
  const name = String(player.name || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (name === 'ishant qureshi') return true;
  return String(player.previousPerformance || '').includes('2025 zonal tournament');
}

export function shouldReplaceWithMensRoster(players: Player[]): boolean {
  if (!players.length) return true;
  if (players.some(isDemoPlayer)) return true;
  const hasLiveJcplLot = players.some((p) =>
    !isDemoPlayer(p) && (p.status === 'sold' || p.status === 'in_auction'),
  );
  if (hasLiveJcplLot) return false;
  if (players.some((p) => !isMensAuctionPlayer(p))) return true;
  return false;
}

export function bundledJcpl4AsPlayers(
  prices: GradeBasePrices,
  category: 'mens' | 'all' = 'mens',
): Player[] {
  const rows = loadBundledJcpl4Registrations(prices).filter((row) =>
    category === 'all' ? true : isMensRegistrationRow(row),
  );
  return rows.map((row, index) => parsedRowToPlayer(row, index));
}

function playerNameKey(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function careerStatTotal(player: Pick<Player, 'stats'>): number {
  const stats = player.stats;
  if (!stats) return 0;
  return Number(stats.matches || 0) + Number(stats.runs || 0) + Number(stats.wickets || 0);
}

/** Recalculate A+/A/B/C from current JCPL stats. Captains stay A+. */
export function regradeAuctionPlayers(players: Player[], prices: GradeBasePrices): Player[] {
  return players.map((player) => {
    const rec = calculateRecommendedGrade(
      player.stats,
      player.role,
      player.isCaptain || player.isPreAssignedCaptain,
      player.isViceCaptain,
    );
    const basePrice = gradeBasePrice(rec.grade, prices);
    if (player.grade === rec.grade && player.basePrice === basePrice) return player;
    return {
      ...player,
      grade: rec.grade,
      basePrice,
    };
  });
}

/** Keep live auction status, but refresh JCPL Season 1–3 numbers from the bundled stats file. */
export function mergeBundledCareerStats(
  players: Player[],
  prices: GradeBasePrices,
  category: 'mens' | 'all' = 'mens',
): Player[] {
  if (!players.length) return players;
  const freshByName = new Map(
    bundledJcpl4AsPlayers(prices, category).map((player) => [playerNameKey(player.name), player]),
  );
  return players.map((player) => {
    const fresh = freshByName.get(playerNameKey(player.name));
    if (!fresh || careerStatTotal(fresh) <= 0) return player;
    const sameStats =
      player.stats?.matches === fresh.stats.matches &&
      player.stats?.runs === fresh.stats.runs &&
      player.stats?.wickets === fresh.stats.wickets;
    if (sameStats && player.jcplPlayerId === fresh.jcplPlayerId) return player;
    return {
      ...player,
      stats: fresh.stats,
      jcplPlayerId: fresh.jcplPlayerId || player.jcplPlayerId,
      cricheroesProfileUrl: fresh.cricheroesProfileUrl || player.cricheroesProfileUrl,
      jcplSeasons: fresh.jcplSeasons || player.jcplSeasons,
    };
  });
}
