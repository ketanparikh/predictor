#!/usr/bin/env node
/**
 * Build JCPL 4 stats from the Excel registrations, keeping Excel names
 * and attaching JCPL Season 1–3 tournament stats only (no outside career).
 *
 * Usage: node tool/build_jcpl4_player_stats.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const XLSX = require(path.join(ROOT, 'cricket-auction-app/node_modules/xlsx'));

const FILE_S4_CANDIDATES = [
  path.join(ROOT, 'assets/JCPL 4 Registeration.xlsx'),
  path.join(ROOT, 'assets/JCPL 4 Registeration (Responses).xlsx'),
];
const FILE_S4 = FILE_S4_CANDIDATES.find((file) => fs.existsSync(file));
const FILE_S3_STATS = path.join(ROOT, 'assets/config/jcpl3_player_stats.json');
const FILE_INDEX = path.join(ROOT, 'cricket-auction-app/src/data/jcplPlayerIndex.json');
const OUT_STATS = path.join(ROOT, 'assets/config/jcpl4_player_stats.json');
const OUT_REGS = path.join(ROOT, 'assets/config/jcpl_s4_registrations.json');
const OUT_MAP = path.join(ROOT, 'assets/config/jcpl_s4_name_map.json');
const AUCTION_REGS = path.join(ROOT, 'cricket-auction-app/src/data/jcpl4Registrations.json');

const NAME_ALIASES = {
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
      return t[t.length - 1] === last && (t[0] === first || (first.length <= 2 && t[0]?.[0] === first[0]));
    }),
  );
  if (lastMatches.length === 1) return lastMatches[0];
  return null;
}

function parseOversToBalls(overs) {
  const match = String(overs || '').trim().match(/^(\d+)(?:\.(\d+))?/);
  if (!match) return 0;
  return Number(match[1]) * 6 + Number(match[2] || 0);
}

function ballsToOvers(balls) {
  if (!balls) return '';
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function highScoreValue(score) {
  const value = Number(String(score || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(value) ? value : 0;
}

function betterHighScore(current, next) {
  const currentValue = highScoreValue(current);
  const nextValue = highScoreValue(next);
  if (nextValue > currentValue) return next || '';
  if (currentValue > nextValue) return current || '';
  if (String(next || '').includes('*') && !String(current || '').includes('*')) return next || '';
  return current || next || '';
}

function betterBestBowling(current, next) {
  const parse = (text) => {
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

function emptyAcc() {
  return {
    matches: 0,
    batting: {
      innings: 0, notOut: 0, runs: 0, balls: 0, highScore: '',
      thirties: 0, fifties: 0, hundreds: 0, fours: 0, sixes: 0, ducks: 0, won: 0, loss: 0,
    },
    bowling: {
      innings: 0, balls: 0, maidens: 0, wickets: 0, runs: 0, best: '',
      threeWickets: 0, fiveWickets: 0, dots: 0, wides: 0, noBalls: 0, fours: 0, sixes: 0,
    },
    fielding: { catches: 0, caughtBehind: 0, runOuts: 0, stumpings: 0, assistedRunOuts: 0 },
    seasons: [],
  };
}

function addSeasonPlayer(acc, player, seasonLabel) {
  const batting = player.batting || {};
  const bowling = player.bowling || {};
  const fielding = player.fielding || {};
  acc.matches += Number(player.matches || 0);
  acc.batting.innings += Number(batting.innings || 0);
  acc.batting.notOut += Number(batting.notOut || 0);
  acc.batting.runs += Number(batting.runs || 0);
  acc.batting.balls += Number(batting.balls || 0);
  acc.batting.highScore = betterHighScore(acc.batting.highScore, batting.highScore);
  acc.batting.thirties += Number(batting.thirties || 0);
  acc.batting.fifties += Number(batting.fifties || 0);
  acc.batting.hundreds += Number(batting.hundreds || 0);
  acc.batting.fours += Number(batting.fours || 0);
  acc.batting.sixes += Number(batting.sixes || 0);
  acc.batting.ducks += Number(batting.ducks || 0);
  acc.batting.won += Number(batting.won || 0);
  acc.batting.loss += Number(batting.loss || 0);
  acc.bowling.innings += Number(bowling.innings || 0);
  acc.bowling.balls += parseOversToBalls(bowling.overs);
  acc.bowling.maidens += Number(bowling.maidens || 0);
  acc.bowling.wickets += Number(bowling.wickets || 0);
  acc.bowling.runs += Number(bowling.runs || 0);
  acc.bowling.best = betterBestBowling(acc.bowling.best, bowling.best);
  acc.bowling.threeWickets += Number(bowling.threeWickets || 0);
  acc.bowling.fiveWickets += Number(bowling.fiveWickets || 0);
  acc.bowling.dots += Number(bowling.dots || 0);
  acc.bowling.wides += Number(bowling.wides || 0);
  acc.bowling.noBalls += Number(bowling.noBalls || 0);
  acc.bowling.fours += Number(bowling.fours || 0);
  acc.bowling.sixes += Number(bowling.sixes || 0);
  acc.fielding.catches += Number(fielding.catches || 0);
  acc.fielding.caughtBehind += Number(fielding.caughtBehind || 0);
  acc.fielding.runOuts += Number(fielding.runOuts || 0);
  acc.fielding.stumpings += Number(fielding.stumpings || 0);
  acc.fielding.assistedRunOuts += Number(fielding.assistedRunOuts || 0);
  if (seasonLabel) acc.seasons.push(seasonLabel);
}

function finalizeAcc(acc) {
  const battingOuts = acc.batting.innings - acc.batting.notOut;
  return {
    matches: acc.matches,
    batting: {
      ...emptyBatting(),
      innings: acc.batting.innings || null,
      notOut: acc.batting.notOut || null,
      runs: acc.batting.runs,
      highScore: acc.batting.highScore || '',
      avg: battingOuts > 0 ? round2(acc.batting.runs / battingOuts) : null,
      sr: acc.batting.balls > 0 ? round2((acc.batting.runs / acc.batting.balls) * 100) : null,
      thirties: acc.batting.thirties,
      fifties: acc.batting.fifties,
      hundreds: acc.batting.hundreds,
      fours: acc.batting.fours,
      sixes: acc.batting.sixes,
      ducks: acc.batting.ducks,
      won: acc.batting.won,
      loss: acc.batting.loss,
    },
    bowling: {
      ...emptyBowling(),
      innings: acc.bowling.innings || null,
      overs: ballsToOvers(acc.bowling.balls),
      maidens: acc.bowling.maidens,
      wickets: acc.bowling.wickets,
      runs: acc.bowling.runs,
      best: acc.bowling.best || '',
      threeWickets: acc.bowling.threeWickets,
      fiveWickets: acc.bowling.fiveWickets,
      economy: acc.bowling.balls > 0 ? round2(acc.bowling.runs / (acc.bowling.balls / 6)) : null,
      sr: acc.bowling.wickets > 0 ? round2(acc.bowling.balls / acc.bowling.wickets) : null,
      avg: acc.bowling.wickets > 0 ? round2(acc.bowling.runs / acc.bowling.wickets) : null,
      wides: acc.bowling.wides,
      noBalls: acc.bowling.noBalls,
      dots: acc.bowling.dots,
      fours: acc.bowling.fours,
      sixes: acc.bowling.sixes,
    },
    fielding: {
      ...emptyFielding(),
      catches: acc.fielding.catches,
      caughtBehind: acc.fielding.caughtBehind,
      runOuts: acc.fielding.runOuts,
      stumpings: acc.fielding.stumpings,
      assistedRunOuts: acc.fielding.assistedRunOuts,
    },
  };
}

function indexSeasonsToShape(seasons) {
  const acc = emptyAcc();
  for (const season of seasons || []) {
    addSeasonPlayer(acc, {
      matches: season.matches,
      batting: {
        runs: season.runs,
        highScore: season.highestScore,
        fifties: season.fifties,
        hundreds: season.hundreds,
      },
      bowling: {
        wickets: season.wickets,
        best: season.bestBowling,
      },
      fielding: {
        catches: season.catches,
        stumpings: season.stumpings,
      },
    }, `${season.seasonLabel} ${season.category}`);
  }
  const shape = finalizeAcc(acc);
  const withAvg = seasons.find((season) => Number(season.average) > 0);
  const withSr = seasons.find((season) => Number(season.strikeRate) > 0);
  const withBowlAvg = seasons.find((season) => Number(season.bowlingAverage) > 0);
  const withEcon = seasons.find((season) => Number(season.economyRate) > 0);
  if (shape.batting.avg == null && withAvg) shape.batting.avg = withAvg.average;
  if (shape.batting.sr == null && withSr) shape.batting.sr = withSr.strikeRate;
  if (shape.bowling.avg == null && withBowlAvg) shape.bowling.avg = withBowlAvg.bowlingAverage;
  if (shape.bowling.economy == null && withEcon) shape.bowling.economy = withEcon.economyRate;
  return { shape, seasons: acc.seasons };
}

function loadJcplSeasonPlayers() {
  const files = [
    ['s1', 'mens', 'assets/config/jcpl_s1_mens.json'],
    ['s1', 'womens', 'assets/config/jcpl_s1_womens.json'],
    ['s1', 'boys', 'assets/config/jcpl_s1_boys.json'],
    ['s2', 'mens', 'assets/config/jcpl_s2_mens.json'],
    ['s2', 'womens', 'assets/config/jcpl_s2_womens.json'],
    ['s2', 'boys', 'assets/config/jcpl_s2_boys.json'],
    ['s3', 'mens', 'assets/config/jcpl_s3_mens.json'],
    ['s3', 'womens', 'assets/config/jcpl_s3_womens.json'],
    ['s3', 'boys', 'assets/config/jcpl_s3_boys.json'],
    ['s3', 'girls', 'assets/config/jcpl_s3_girls.json'],
  ];
  const byId = new Map();
  for (const [seasonId, category, relative] of files) {
    const filePath = path.join(ROOT, relative);
    if (!fs.existsSync(filePath)) continue;
    const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const label = `${payload.name || `Season ${seasonId}`} ${category}`;
    for (const player of payload.players || []) {
      const id = Number(player.playerId);
      if (!id) continue;
      const list = byId.get(id) || [];
      list.push({ ...player, _seasonLabel: label });
      byId.set(id, list);
    }
  }
  return byId;
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function main() {
  if (!FILE_S4 || !fs.existsSync(FILE_S4)) {
    throw new Error('Missing Excel: JCPL 4 Registeration.xlsx');
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
  const seasonPlayersById = loadJcplSeasonPlayers();

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
    const playerId = s3Hit?.playerId || indexHit?.playerId || extractCricHeroesId(cricheroesUrl);
    const seasonRows = playerId ? (seasonPlayersById.get(Number(playerId)) || []) : [];
    let statsShape;
    let jcplSeasons = [];
    if (seasonRows.length) {
      const acc = emptyAcc();
      for (const row of seasonRows) addSeasonPlayer(acc, row, row._seasonLabel);
      if (acc.batting.fifties === 0 && acc.batting.hundreds === 0 && indexHit?.seasons) {
        acc.batting.fifties = indexHit.seasons.reduce((sum, season) => sum + Number(season.fifties || 0), 0);
        acc.batting.hundreds = indexHit.seasons.reduce((sum, season) => sum + Number(season.hundreds || 0), 0);
      }
      statsShape = finalizeAcc(acc);
      jcplSeasons = acc.seasons;
    } else if (indexHit?.seasons?.length) {
      const fromIndex = indexSeasonsToShape(indexHit.seasons);
      statsShape = fromIndex.shape;
      jcplSeasons = fromIndex.seasons;
    } else {
      statsShape = {
        matches: 0,
        batting: emptyBatting(),
        bowling: emptyBowling(),
        fielding: emptyFielding(),
      };
    }

    const cricheroesName = s3Hit?.cricheroesName || s3Hit?.name || (indexHit?.names || [])[0] || '';
    const matched = seasonRows.length > 0 || !!(indexHit?.seasons || []).length;
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
      playerId,
      matches: statsShape.matches || 0,
      runs: statsShape.batting.runs || 0,
      wickets: statsShape.bowling.wickets || 0,
      average: statsShape.batting.avg ?? null,
      strikeRate: statsShape.batting.sr ?? null,
      highestScore: statsShape.batting.highScore || '',
      fifties: statsShape.batting.fifties || 0,
      hundreds: statsShape.batting.hundreds || 0,
      bowlingAverage: statsShape.bowling.avg ?? null,
      economyRate: statsShape.bowling.economy ?? null,
      bestBowling: statsShape.bowling.best || '',
      catches: statsShape.fielding.catches || 0,
      stumpings: statsShape.fielding.stumpings || 0,
      jcplSeasons,
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
    source: `${path.basename(FILE_S4)} + JCPL Season 1–3 tournament stats only`,
    generatedAt,
    playerCount: players.length,
    matchedCount: counts.matched,
    players,
  };
  const regsPayload = {
    source: path.basename(FILE_S4),
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
        Source: 'JCPL 4 registrations with Season 1–3 JCPL stats only',
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
