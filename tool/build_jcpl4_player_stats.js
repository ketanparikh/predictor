#!/usr/bin/env node
/**
 * Build JCPL 4 stats from the Excel registrations, keeping Excel names
 * and attaching matched career/tournament stats from prior seasons.
 *
 * Usage: node tool/build_jcpl4_player_stats.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const XLSX = require(path.join(ROOT, 'cricket-auction-app/node_modules/xlsx'));

const FILE_S4 = path.join(ROOT, 'assets/JCPL 4 Registeration (Responses).xlsx');
const FILE_S3_STATS = path.join(ROOT, 'assets/config/jcpl3_player_stats.json');
const FILE_INDEX = path.join(ROOT, 'cricket-auction-app/src/data/jcplPlayerIndex.json');
const OUT_STATS = path.join(ROOT, 'assets/config/jcpl4_player_stats.json');
const OUT_REGS = path.join(ROOT, 'assets/config/jcpl_s4_registrations.json');
const OUT_MAP = path.join(ROOT, 'assets/config/jcpl_s4_name_map.json');
const AUCTION_REGS = path.join(ROOT, 'cricket-auction-app/src/data/jcpl4Registrations.json');

const NAME_ALIASES = {
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

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\((c|wk|vc)\)/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(name) {
  return normalizeName(name).split(' ').filter(Boolean);
}

function extractCricHeroesId(urlOrId) {
  if (!urlOrId) return null;
  const raw = String(urlOrId).trim();
  if (/^\d+$/.test(raw)) return Number(raw);
  const match = raw.match(/player-profile\/(\d+)/i) || raw.match(/cricketer\/(\d+)/i);
  return match ? Number(match[1]) : null;
}

function extractUrl(text) {
  const match = String(text || '').match(/https?:\/\/[^\s"'<>]+/i);
  return match ? match[0].replace(/[.,);]+$/, '') : '';
}

function col(row, test) {
  const key = Object.keys(row).find((k) => test(k.toLowerCase()));
  return key ? String(row[key] ?? '').trim() : '';
}

function mapCategory(category) {
  const text = category.toLowerCase();
  if (text.includes('girl')) return { id: 'girls', label: 'Girls', gender: 'Female', age: '10-13' };
  if (text.includes('boy')) return { id: 'boys', label: 'Boys', gender: 'Male', age: '10-15' };
  if (text.includes('women')) return { id: 'womens', label: 'Womens', gender: 'Female', age: '13+' };
  return { id: 'mens', label: 'Mens', gender: 'Male', age: '15+' };
}

function emptyBatting() {
  return {
    innings: null,
    notOut: null,
    runs: 0,
    highScore: '',
    avg: null,
    sr: null,
    thirties: 0,
    fifties: 0,
    hundreds: 0,
    fours: 0,
    sixes: 0,
    ducks: 0,
    won: 0,
    loss: 0,
  };
}

function emptyBowling() {
  return {
    innings: null,
    overs: '',
    maidens: 0,
    wickets: 0,
    runs: 0,
    best: '',
    threeWickets: 0,
    fiveWickets: 0,
    economy: null,
    sr: null,
    avg: null,
    wides: 0,
    noBalls: 0,
    dots: 0,
    fours: 0,
    sixes: 0,
  };
}

function emptyFielding() {
  return {
    catches: 0,
    caughtBehind: 0,
    runOuts: 0,
    stumpings: 0,
    assistedRunOuts: 0,
  };
}

function findInList(name, url, items, namesOf) {
  const id = extractCricHeroesId(url);
  if (id) {
    const byId = items.find((item) => Number(item.playerId) === id);
    if (byId) return byId;
  }

  const searchName = NAME_ALIASES[normalizeName(name)] || name;
  const norm = normalizeName(searchName);
  if (!norm) return null;

  const exact = items.filter((item) =>
    namesOf(item).some((n) => normalizeName(n) === norm),
  );
  if (exact.length >= 1) return exact[0];

  const nameTokens = tokens(searchName);
  if (nameTokens.length === 0) return null;
  const last = nameTokens[nameTokens.length - 1];
  const first = nameTokens[0];
  const lastMatches = items.filter((item) =>
    namesOf(item).some((n) => {
      const t = tokens(n);
      return t[t.length - 1] === last && (t[0] === first || t[0]?.[0] === first[0]);
    }),
  );
  if (lastMatches.length === 1) return lastMatches[0];
  return null;
}

function careerToPlayerShape(career) {
  return {
    matches: career.matches || 0,
    batting: {
      ...emptyBatting(),
      runs: career.runs || 0,
      highScore: career.highestScore || '',
      avg: career.average || null,
      sr: career.strikeRate || null,
      fifties: career.fifties || 0,
      hundreds: career.hundreds || 0,
    },
    bowling: {
      ...emptyBowling(),
      wickets: career.wickets || 0,
      best: career.bestBowling || '',
      economy: career.economyRate || null,
      avg: career.bowlingAverage || null,
    },
    fielding: {
      ...emptyFielding(),
      catches: career.catches || 0,
      stumpings: career.stumpings || 0,
    },
  };
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function main() {
  if (!fs.existsSync(FILE_S4)) {
    throw new Error(`Missing Excel: ${FILE_S4}`);
  }
  const wb = XLSX.readFile(FILE_S4);
  const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    defval: '',
    raw: false,
  });

  const latest = new Map();
  for (const row of rawRows) {
    const name = col(row, (k) => k === 'name');
    if (!name) continue;
    const tower = col(row, (k) => k === 'tower');
    const flat = col(row, (k) => k.includes('flat'));
    latest.set(`${normalizeName(name)}|${normalizeName(tower)}|${normalizeName(flat)}`, row);
  }

  const s3Stats = JSON.parse(fs.readFileSync(FILE_S3_STATS, 'utf8')).players || [];
  const indexPlayers = JSON.parse(fs.readFileSync(FILE_INDEX, 'utf8')).players || [];

  const registrations = [];
  const players = [];
  const byPlayerId = {};
  const byOldName = {};
  const counts = { Mens: 0, Womens: 0, Boys: 0, Girls: 0, matched: 0 };

  for (const row of latest.values()) {
    const name = col(row, (k) => k === 'name');
    const categoryRaw = col(row, (k) => k === 'category');
    const skill = col(row, (k) => k.includes('primary') && k.includes('skill'));
    const tower = col(row, (k) => k === 'tower');
    const flat = col(row, (k) => k.includes('flat'));
    const contact = col(row, (k) => k.includes('phone') || k.includes('contact') || k.includes('whatsapp'));
    const achievements = col(row, (k) => k.includes('achievement') || k.includes('crickhero'));
    const photo = col(row, (k) => k.includes('photo'));
    const sponsor = col(row, (k) => k.includes('sponsor'));
    const timestamp = col(row, (k) => k === 'timestamp');
    const cricheroesUrl = extractUrl(achievements);
    const mapped = mapCategory(categoryRaw);

    const s3Hit = findInList(name, cricheroesUrl, s3Stats, (p) => [p.name, p.cricheroesName]);
    const indexHit = findInList(name, cricheroesUrl, indexPlayers, (p) => p.names || []);
    const statsShape = s3Hit
      ? {
          matches: s3Hit.matches ?? 0,
          batting: { ...emptyBatting(), ...(s3Hit.batting || {}) },
          bowling: { ...emptyBowling(), ...(s3Hit.bowling || {}) },
          fielding: { ...emptyFielding(), ...(s3Hit.fielding || {}) },
        }
      : indexHit
        ? careerToPlayerShape(indexHit.career || {})
        : {
            matches: 0,
            batting: emptyBatting(),
            bowling: emptyBowling(),
            fielding: emptyFielding(),
          };

    const playerId = s3Hit?.playerId || indexHit?.playerId || null;
    const cricheroesName = s3Hit?.cricheroesName || s3Hit?.name || (indexHit?.names || [])[0] || '';
    const matched = !!(s3Hit || indexHit);
    if (matched) counts.matched += 1;
    counts[mapped.label] += 1;

    if (playerId) byPlayerId[String(playerId)] = name;
    if (cricheroesName) byOldName[normalizeName(cricheroesName)] = name;
    for (const oldName of indexHit?.names || []) {
      byOldName[normalizeName(oldName)] = name;
    }
    if (s3Hit?.name) byOldName[normalizeName(s3Hit.name)] = name;

    registrations.push({
      name,
      category: categoryRaw,
      skill,
      tower,
      flat,
      contact,
      achievements,
      photo,
      cricheroesUrl,
      sponsorInterest: sponsor,
      timestamp,
    });

    players.push({
      category: mapped.label,
      name,
      age: mapped.age,
      gender: mapped.gender,
      skill: skill || mapped.label,
      matchStatus: matched ? 'Matched' : 'Unmatched',
      playerId,
      cricheroesName,
      city: tower || flat ? `Jade ${tower}${flat}`.trim() : 'Pune',
      playingRole: skill,
      battingHand: s3Hit?.battingHand || '',
      bowlingStyle: s3Hit?.bowlingStyle || '',
      profileUrl: s3Hit?.profileUrl || (playerId
        ? `https://cricheroes.com/player-profile/${playerId}/player/stats`
        : cricheroesUrl),
      matches: statsShape.matches,
      batting: statsShape.batting,
      bowling: statsShape.bowling,
      fielding: statsShape.fielding,
    });
  }

  players.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  registrations.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  const generatedAt = new Date().toISOString();
  const statsPayload = {
    source: 'JCPL 4 Registeration (Responses).xlsx + matched JCPL career stats',
    generatedAt,
    playerCount: players.length,
    matchedCount: counts.matched,
    players,
  };
  const regsPayload = {
    source: 'JCPL 4 Registeration (Responses).xlsx',
    generatedAt,
    playerCount: registrations.length,
    players: registrations,
  };
  const mapPayload = { generatedAt, byPlayerId, byOldName };

  writeJson(OUT_STATS, statsPayload);
  writeJson(OUT_REGS, regsPayload);
  writeJson(OUT_MAP, mapPayload);
  writeJson(AUCTION_REGS, regsPayload);

  const byCat = { mens: [], womens: [], boys: [], girls: [] };
  for (const player of players) {
    const key = player.category === 'Womens'
      ? 'womens'
      : player.category === 'Boys'
        ? 'boys'
        : player.category === 'Girls'
          ? 'girls'
          : 'mens';
    byCat[key].push({
      playerId: player.playerId,
      name: player.name,
      team: player.city,
      matches: player.matches,
      batting: player.batting,
      bowling: player.bowling,
      fielding: player.fielding,
    });
  }

  const labels = {
    mens: 'JCPL 4 Men',
    womens: 'JCPL 4 Women',
    boys: 'JCPL 4 Boys',
    girls: 'JCPL 4 Girls',
  };
  for (const [key, list] of Object.entries(byCat)) {
    writeJson(path.join(ROOT, `assets/config/jcpl_s4_${key}.json`), {
      tournamentId: 4,
      name: labels[key],
      city: 'Pune',
      fromDate: '2026-10-11',
      toDate: '',
      ground: 'Jade City',
      overall: {
        Players: String(list.length),
        Source: 'JCPL 4 registrations',
      },
      teams: [],
      matches: [],
      players: list,
      awards: [],
      mvp: [],
    });
  }

  console.log(`JCPL 4 stats: ${players.length} players, ${counts.matched} matched`);
  console.log(`  Mens ${counts.Mens} · Womens ${counts.Womens} · Boys ${counts.Boys} · Girls ${counts.Girls}`);
}

main();
