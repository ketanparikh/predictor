import { Player, PlayerGrade } from '../types/auction';

/**
 * Normalizes any grade string/value into an exact canonical PlayerGrade: 'A+' | 'A' | 'B' | 'C'
 * Handles casing, whitespace, and descriptive words like "Grade A", "A Plus", "Elite", etc.
 */
export function normalizeGrade(grade: unknown): PlayerGrade {
  if (!grade) return 'C';
  const clean = String(grade).trim().toUpperCase();

  // A+ variations
  if (
    clean === 'A+' ||
    clean === 'A-PLUS' ||
    clean === 'A PLUS' ||
    clean === 'APLUS' ||
    clean === 'GRADE A+' ||
    clean === 'GRADE A PLUS' ||
    clean === 'GRADE APLUS' ||
    clean.includes('A+')
  ) {
    return 'A+';
  }

  // Exact A variations (ensure A+ is not caught)
  if (clean === 'A' || clean === 'GRADE A' || clean === 'ELITE') {
    return 'A';
  }

  // Exact B variations
  if (clean === 'B' || clean === 'GRADE B' || clean === 'CORE' || clean === 'REGULAR') {
    return 'B';
  }

  // Exact C variations
  if (clean === 'C' || clean === 'GRADE C' || clean === 'EMERGING' || clean === 'DEVELOPING') {
    return 'C';
  }

  // Fallbacks based on first character
  if (clean.startsWith('A')) return 'A';
  if (clean.startsWith('B')) return 'B';
  return 'C';
}

/**
 * Performs strict, exact grade matching between a player's grade and an active filter.
 * When filter is 'all', matches everything.
 * Otherwise, strictly ensures normalized grades are identical.
 */
export function isGradeMatch(playerGrade: unknown, filterGrade: string): boolean {
  if (!filterGrade || filterGrade === 'all') return true;
  return normalizeGrade(playerGrade) === normalizeGrade(filterGrade);
}

/**
 * Generates canonical search key for player names to prevent duplicates
 */
export function canonicalPlayerNameKey(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Safely deduplicates a list of player records.
 * Identifies duplicate player records using unique ID and validated canonical name key.
 * Retains one canonical record for each actual player and merges richer metadata.
 */
export function deduplicatePlayers(players: Player[]): Player[] {
  if (!Array.isArray(players) || players.length <= 1) return players || [];

  const seenIds = new Set<string>();
  const seenNameKeys = new Map<string, Player>();
  const canonicalPlayers: Player[] = [];

  for (const player of players) {
    if (!player) continue;

    const playerId = String(player.id || '').trim();
    const nameKey = canonicalPlayerNameKey(player.name);

    // If ID already seen, skip duplicate
    if (playerId && seenIds.has(playerId)) {
      continue;
    }

    // If name already seen, merge fields into existing record without duplicating
    if (nameKey && seenNameKeys.has(nameKey)) {
      const existing = seenNameKeys.get(nameKey)!;
      // Preserve photo if existing is missing
      if (!existing.photo && player.photo) existing.photo = player.photo;
      // Preserve team / sold status if existing is upcoming but this record has team info
      if (existing.status !== 'sold' && player.status === 'sold' && player.teamId) {
        existing.status = 'sold';
        existing.teamId = player.teamId;
        existing.soldPrice = player.soldPrice;
      }
      // Preserve leadership flags
      if (player.isCaptain) existing.isCaptain = true;
      if (player.isViceCaptain) existing.isViceCaptain = true;
      if (player.captainOfTeamId) existing.captainOfTeamId = player.captainOfTeamId;
      if (player.viceCaptainOfTeamId) existing.viceCaptainOfTeamId = player.viceCaptainOfTeamId;
      if (!existing.sponsorTag && player.sponsorTag) existing.sponsorTag = player.sponsorTag;
      if (player.isSponsored) existing.isSponsored = true;
      continue;
    }

    // Register new unique player
    if (playerId) seenIds.add(playerId);
    if (nameKey) seenNameKeys.set(nameKey, player);

    // Ensure player's grade is normalized
    canonicalPlayers.push({
      ...player,
      grade: normalizeGrade(player.grade),
    });
  }

  return canonicalPlayers;
}
