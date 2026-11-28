import bundled from '../data/jcpl4Registrations.json';
import type { GradeBasePrices, Player, PlayerGrade } from '../types/auction';
import { normalizeGrade } from './gradeUtils';
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
    basePrice: 1000,
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

export const OFFICIAL_JCPL4_REPORT_PLAYERS: { name: string; grade: PlayerGrade }[] = [
  // GRADE A+ – 12 PLAYERS
  { name: 'Akshay', grade: 'A+' },
  { name: 'Amit Gupta', grade: 'A+' },
  { name: 'Amol pawar', grade: 'A+' },
  { name: 'Avinash Gupta', grade: 'A+' },
  { name: 'Chetan Sharma', grade: 'A+' },
  { name: 'Dhruv Jhalani', grade: 'A+' },
  { name: 'Gaurav Kad', grade: 'A+' },
  { name: 'Gurmeet Singh kalsi', grade: 'A+' },
  { name: 'Paras Bheda', grade: 'A+' },
  { name: 'Prasad Wagh', grade: 'A+' },
  { name: 'Rehet kalsi', grade: 'A+' },
  { name: 'Tanmay Shahane', grade: 'A+' },

  // GRADE A – 34 PLAYERS
  { name: 'Aayush Asawa', grade: 'A' },
  { name: 'Abhishek Mathur', grade: 'A' },
  { name: 'Aditya Joshi', grade: 'A' },
  { name: 'Ajit bhalwankar', grade: 'A' },
  { name: 'Anthony Michael', grade: 'A' },
  { name: 'Anu Poduval', grade: 'A' },
  { name: 'Ashish Singh', grade: 'A' },
  { name: 'Bhushan Patkar', grade: 'A' },
  { name: 'Dipal Panchal', grade: 'A' },
  { name: 'Divit khanna', grade: 'A' },
  { name: 'Gajanan Jadhao', grade: 'A' },
  { name: 'Ganesh Raghuram', grade: 'A' },
  { name: 'Hrishikesh Baradkar', grade: 'A' },
  { name: 'Ketan Parikh', grade: 'A' },
  { name: 'Kiran Jagtap', grade: 'A' },
  { name: 'Mahesh A Kulkarni', grade: 'A' },
  { name: 'Mandar Dehadrai', grade: 'A' },
  { name: 'Neeraj Varma', grade: 'A' },
  { name: 'Nikhil Owalekar', grade: 'A' },
  { name: 'Pankaj', grade: 'A' },
  { name: 'Prithviraj MohitePatil', grade: 'A' },
  { name: 'Rahul Agrawal', grade: 'A' },
  { name: 'Rajeev Chempath', grade: 'A' },
  { name: 'Sachin Chavan', grade: 'A' },
  { name: 'Sachin Jain', grade: 'A' },
  { name: 'Saket Newaskar', grade: 'A' },
  { name: 'SULTAAN', grade: 'A' },
  { name: 'Sunny Jaisinghani', grade: 'A' },
  { name: 'Suraj Desai', grade: 'A' },
  { name: 'Swapnil Pusalkar', grade: 'A' },
  { name: 'Ved Prakash Nirbhya', grade: 'A' },
  { name: 'Vedant Rathi', grade: 'A' },
  { name: 'Vicky sharma', grade: 'A' },
  { name: 'Vivek Vichare', grade: 'A' },

  // GRADE B – 34 PLAYERS
  { name: 'AKSHAY KUMAR SHARMA', grade: 'B' },
  { name: 'Akshay Wardhane', grade: 'B' },
  { name: 'Amul Shah', grade: 'B' },
  { name: 'Ankit Goyal', grade: 'B' },
  { name: 'Anshuman', grade: 'B' },
  { name: 'Ashish Ahuja', grade: 'B' },
  { name: 'Ashish Jain', grade: 'B' },
  { name: 'Ayush Jain', grade: 'B' },
  { name: 'Dinesh Mandava', grade: 'B' },
  { name: 'Harpreet Singh', grade: 'B' },
  { name: 'Kabir Vaidya', grade: 'B' },
  { name: 'Kunal Kukreja', grade: 'B' },
  { name: 'Lakshya Jhalani', grade: 'B' },
  { name: 'Mukund Dongre', grade: 'B' },
  { name: 'Naveen Goyal', grade: 'B' },
  { name: 'Nishant Patil', grade: 'B' },
  { name: 'Nitin Verma', grade: 'B' },
  { name: 'Pravin Muley', grade: 'B' },
  { name: 'Pushkar Ballal', grade: 'B' },
  { name: 'Rahull raj singh', grade: 'B' },
  { name: 'Rajat Dua', grade: 'B' },
  { name: 'Ridhaan Vijay', grade: 'B' },
  { name: 'Robin Vijay', grade: 'B' },
  { name: 'Rohit Barve', grade: 'B' },
  { name: 'Rohit Yadav', grade: 'B' },
  { name: 'Sachin rajgire', grade: 'B' },
  { name: 'Sagar Patole', grade: 'B' },
  { name: 'Sanil nadkarni', grade: 'B' },
  { name: 'Siddharth Pednekar', grade: 'B' },
  { name: 'Siddhesh Deshmukh', grade: 'B' },
  { name: 'Sourabh Gupta', grade: 'B' },
  { name: 'Varun Kulkarni', grade: 'B' },
  { name: 'Vikas Goyal', grade: 'B' },
  { name: 'Vikas Jadhav', grade: 'B' },

  // GRADE C – 25 PLAYERS
  { name: 'Ankur Priyadarshan', grade: 'C' },
  { name: 'Anshul Goel', grade: 'C' },
  { name: 'Arpit Purohit', grade: 'C' },
  { name: 'Ashish Das', grade: 'C' },
  { name: 'Bhavya Agrawal', grade: 'C' },
  { name: 'Chandraprakash (CP) Jain', grade: 'C' },
  { name: 'Dev', grade: 'C' },
  { name: 'Gourav Singhal', grade: 'C' },
  { name: 'Harish Rane', grade: 'C' },
  { name: 'Harshal Patolia', grade: 'C' },
  { name: 'Kalpesh Potghante', grade: 'C' },
  { name: 'Manish Singh', grade: 'C' },
  { name: 'Manojkumar Gunjal', grade: 'C' },
  { name: 'Mayur Zope', grade: 'C' },
  { name: 'Rahul khanna', grade: 'C' },
  { name: 'Ravindra Waghmare', grade: 'C' },
  { name: 'Sandeep Kad', grade: 'C' },
  { name: 'Sharan Wadhwa', grade: 'C' },
  { name: 'Shreeyansh Nalbilwar', grade: 'C' },
  { name: 'Shubham V Pawar', grade: 'C' },
  { name: 'Shyamsunder Mandava', grade: 'C' },
  { name: 'SUJAL NARAYAN MUDLIAR', grade: 'C' },
  { name: 'Ujjwal Bhattacharyya', grade: 'C' },
  { name: 'Vikas Gaikwad', grade: 'C' },
  { name: 'Vivek Pawar', grade: 'C' },
];

export const OFFICIAL_JCPL4_REPORT_MAP = new Map<string, PlayerGrade>(
  OFFICIAL_JCPL4_REPORT_PLAYERS.map((p) => [playerNameKey(p.name), p.grade])
);

export function getOfficialJcpl4Grade(name: string): PlayerGrade | undefined {
  return OFFICIAL_JCPL4_REPORT_MAP.get(playerNameKey(name));
}

export function bundledJcpl4AsPlayers(
  prices: GradeBasePrices,
  category: 'mens' | 'all' = 'mens',
): Player[] {
  const loadedRows = loadBundledJcpl4Registrations(prices);
  
  // Create lookup of loaded rows by normalized player name
  const rowsByName = new Map<string, ParsedPlayerRow>();
  for (const row of loadedRows) {
    const key = playerNameKey(row.name);
    if (!rowsByName.has(key)) {
      rowsByName.set(key, row);
    }
  }

  // Strictly produce the 105 official players from the official report
  const officialPlayers: Player[] = OFFICIAL_JCPL4_REPORT_PLAYERS.map((official, index) => {
    const key = playerNameKey(official.name);
    const existingRow = rowsByName.get(key);

    if (existingRow) {
      const p = parsedRowToPlayer({
        ...existingRow,
        grade: official.grade,
        basePrice: 1000,
      }, index);
      return {
        ...p,
        name: official.name,
        grade: official.grade,
        basePrice: 1000,
      };
    }

    // Missing from registration forms (5 players): build canonical entry
    return {
      id: `jcpl4-${100 + index}`,
      name: official.name,
      age: 28,
      ageCategory: 'Above 15',
      gender: 'Male',
      category: 'Men (Age : 15+ years)',
      experience: 1,
      role: 'Batsman',
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'Right-arm medium',
      grade: official.grade,
      basePrice: 1000,
      description: `Official JCPL 4 Player (${official.grade} Grade)`,
      status: 'upcoming',
      auctionOrder: index + 1,
      isCaptain: false,
      isViceCaptain: false,
      isSponsored: false,
      notes: `JCPL 4 Official Player · Grade ${official.grade}`,
      stats: {
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
      },
    };
  });

  return officialPlayers;
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

/** Recalculate A+/A/B/C from current JCPL stats only if player has no grade or forced. Captains stay A+. */
export function regradeAuctionPlayers(players: Player[], prices: GradeBasePrices, force: boolean = false): Player[] {
  return players.map((player) => {
    // Standardize all players' base price to 1,000 points
    const standardBasePrice = 1000;
    const officialGrade = getOfficialJcpl4Grade(player.name);
    // If not forced and player already has an assigned grade, preserve their grade!
    if (!force && player.grade) {
      return {
        ...player,
        grade: normalizeGrade(player.grade),
        basePrice: standardBasePrice,
      };
    }
    const rec = calculateRecommendedGrade(
      player.stats,
      player.role,
      player.isCaptain || player.isPreAssignedCaptain,
      player.isViceCaptain,
    );
    return {
      ...player,
      grade: officialGrade || rec.grade,
      basePrice: standardBasePrice,
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
