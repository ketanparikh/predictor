import bundled from '../data/jcpl4Registrations.json';
import type { GradeBasePrices, Player } from '../types/auction';
import type { ParsedPlayerRow } from './excelParser';
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
}

function mapCategory(category: string): { gender: string; age: number; ageCategory: string } {
  const text = category.toLowerCase();
  if (text.includes('girl')) return { gender: 'Female', age: 12, ageCategory: '15 and Below' };
  if (text.includes('boy')) return { gender: 'Male', age: 13, ageCategory: '15 and Below' };
  if (text.includes('women')) return { gender: 'Female', age: 22, ageCategory: 'Above 15' };
  return { gender: 'Male', age: 28, ageCategory: 'Above 15' };
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
  return parseJcpl4RegistrationRows(asRows, prices);
}

export function parsedRowToPlayer(row: ParsedPlayerRow, index: number, idPrefix = 'jcpl4'): Player {
  return {
    id: `${idPrefix}-${index}`,
    name: row.name,
    age: row.age,
    ageCategory: row.ageCategory || (row.age <= 15 ? '15 and Below' : 'Above 15'),
    gender: row.gender || 'Male',
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

export function bundledJcpl4AsPlayers(prices: GradeBasePrices): Player[] {
  return loadBundledJcpl4Registrations(prices).map((row, index) =>
    parsedRowToPlayer(row, index),
  );
}
