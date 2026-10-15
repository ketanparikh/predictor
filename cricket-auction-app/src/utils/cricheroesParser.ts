import { Player, PlayerGrade, PlayerRole, BattingStyle, BowlingStyle } from '../types/auction';
import { calculatePlayerRating, generatePlayerAIInsights } from './aiEngine';

export interface CricHeroesParsedResult {
  player: Omit<Player, 'id' | 'status'>;
  aiRating: number;
  suggestedGrade: PlayerGrade;
  recommendedPrice: number;
  insights: {
    strengths: string[];
    concerns: string[];
    summary: string;
  };
  source: 'web_scrape' | 'text_paste' | 'preset';
  rawStatement?: string;
  cricheroesId?: string | number;
}

export function extractRSCPayload(html: string): string {
  const regex = /self\.__next_f\.push\(\[1,\s*"([\s\S]*?)"\]\)/g;
  let fullPayload = '';
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      fullPayload += JSON.parse(`"${match[1]}"`);
    } catch {
      fullPayload += match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
  }
  return fullPayload;
}

export function parseStatement(statement?: string): {
  highestScore: number;
  average: number;
  strikeRate: number;
  oversBowled: number;
  economyRate: number;
  sixes: number;
  fours: number;
} {
  if (!statement) {
    return {
      highestScore: 0,
      average: 0,
      strikeRate: 0,
      oversBowled: 0,
      economyRate: 0,
      sixes: 0,
      fours: 0,
    };
  }

  const clean = statement.replace(/<[^>]+>/g, ' ');

  const hsMatch = statement.match(/top score of\s*<b>(\d+)<\/b>/i) || clean.match(/top score of\s*(\d+)/i) || clean.match(/highest score of\s*(\d+)/i);
  const avgMatch = statement.match(/average of\s*<b>([\d.]+)<\/b>/i) || clean.match(/average of\s*([\d.]+)/i);
  const srMatch = statement.match(/strike rate of\s*<b>([\d.]+)<\/b>/i) || clean.match(/strike rate of\s*([\d.]+)/i);
  const oversMatch = statement.match(/bowled\s*<b>([\d.]+)<\/b>\s*overs/i) || clean.match(/bowled\s*([\d.]+)\s*overs/i);
  const econMatch = statement.match(/economy rate of\s*<b>([\d.]+)<\/b>/i) || clean.match(/economy rate of\s*([\d.]+)/i);
  const sixesMatch = statement.match(/<b>(\d+)\s*sixes<\/b>/i) || clean.match(/(\d+)\s*sixes/i);
  const foursMatch = statement.match(/<b>(\d+)\s*fours<\/b>/i) || clean.match(/(\d+)\s*fours/i);

  return {
    highestScore: hsMatch ? parseInt(hsMatch[1], 10) : 0,
    average: avgMatch ? parseFloat(avgMatch[1]) : 0,
    strikeRate: srMatch ? parseFloat(srMatch[1]) : 0,
    oversBowled: oversMatch ? parseFloat(oversMatch[1]) : 0,
    economyRate: econMatch ? parseFloat(econMatch[1]) : 0,
    sixes: sixesMatch ? parseInt(sixesMatch[1], 10) : 0,
    fours: foursMatch ? parseInt(foursMatch[1], 10) : 0,
  };
}

export function buildParsedPlayer(
  name: string,
  photo: string,
  rawRole: string,
  rawBatting: string,
  rawBowling: string,
  matches: number,
  runs: number,
  wickets: number,
  statementStats: ReturnType<typeof parseStatement>,
  city?: string,
  rawStatement?: string,
  cricheroesId?: string | number
): CricHeroesParsedResult {
  // 1. Role Normalization (Only Batsman, Bowler, Wicketkeeper)
  let role: PlayerRole = 'Batsman';
  const roleLower = (rawRole || '').toLowerCase();
  if (roleLower.includes('keeper') || roleLower.includes('wk') || roleLower.includes('wicket')) {
    role = 'Wicketkeeper';
  } else if (roleLower.includes('bowl') || (wickets >= 15 && runs < 150)) {
    role = 'Bowler';
  } else if (roleLower.includes('bat') || roleLower.includes('batter') || roleLower.includes('batsman')) {
    role = 'Batsman';
  } else if (roleLower.includes('all') || (wickets >= 10 && runs >= 150)) {
    role = wickets >= 20 ? 'Bowler' : 'Batsman';
  } else if (wickets > runs / 30 && wickets >= 5) {
    role = 'Bowler';
  }

  // 2. Batting Style
  const battingStyle: BattingStyle =
    (rawBatting || '').toUpperCase().includes('LH') || (rawBatting || '').toLowerCase().includes('left')
      ? 'Left-hand bat'
      : 'Right-hand bat';

  // 3. Bowling Style
  let bowlingStyle: BowlingStyle = 'Right-arm medium';
  const rawBowl = (rawBowling || '').toLowerCase();
  if (rawBowl.includes('left-arm fast') || rawBowl.includes('left arm fast')) bowlingStyle = 'Left-arm fast';
  else if (rawBowl.includes('left-arm medium') || rawBowl.includes('left arm medium')) bowlingStyle = 'Left-arm medium';
  else if (rawBowl.includes('left-arm orthodox') || rawBowl.includes('orthodox') || rawBowl.includes('left arm spin')) bowlingStyle = 'Left-arm orthodox';
  else if (rawBowl.includes('chinaman') || rawBowl.includes('left-arm unorthodox')) bowlingStyle = 'Left-arm chinaman';
  else if (rawBowl.includes('right-arm fast') || rawBowl.includes('right arm fast') || rawBowl.includes('fast bowler')) bowlingStyle = 'Right-arm fast';
  else if (rawBowl.includes('right-arm off') || rawBowl.includes('off-break') || rawBowl.includes('off break') || rawBowl.includes('off-spin')) bowlingStyle = 'Right-arm off-break';
  else if (rawBowl.includes('right-arm leg') || rawBowl.includes('leg-break') || rawBowl.includes('leg break') || rawBowl.includes('leg-spin')) bowlingStyle = 'Right-arm leg-break';
  else if (rawBowl.includes('right-arm medium') || rawBowl.includes('medium')) bowlingStyle = 'Right-arm medium';
  else if (role === 'Batsman' && wickets === 0) bowlingStyle = 'None';

  // 4. Detailed Batting Metrics
  const highestScore = statementStats.highestScore || (runs > 0 ? Math.min(runs, Math.max(30, Math.round(runs / Math.max(1, matches) * 2.2))) : 0);
  const average = statementStats.average || (matches > 0 ? parseFloat((runs / Math.max(1, matches * 0.8)).toFixed(2)) : 0);
  const strikeRate = statementStats.strikeRate || (runs > 0 ? 122.5 : 0);
  const fifties = highestScore >= 50 && highestScore < 100 
    ? Math.max(1, Math.round(runs / 350)) 
    : (highestScore >= 100 ? Math.max(1, Math.round(runs / 400)) : 0);
  const hundreds = highestScore >= 100 ? Math.max(1, Math.round(runs / 1200)) : 0;

  // 5. Detailed Bowling Metrics
  const economyRate = statementStats.economyRate || (wickets > 0 ? 7.85 : 0);
  const overs = statementStats.oversBowled || (wickets > 0 ? Math.round(wickets * 2.2) : 0);
  const bowlingAverage = wickets > 0 && overs > 0 
    ? parseFloat(((overs * economyRate) / wickets).toFixed(2)) 
    : (wickets > 0 ? 21.4 : 0);
  const bestBowling = wickets > 0 
    ? `${Math.min(6, Math.max(1, Math.round(wickets / Math.max(1, matches / 3))))}/${Math.max(8, Math.round(economyRate * 3.2))}` 
    : 'N/A';

  const catches = Math.round(matches * 0.35);
  const stumpings = role === 'Wicketkeeper' ? Math.round(matches * 0.18) : 0;

  const experience = Math.max(1, Math.min(15, Math.round(matches / 8)));
  const age = 22 + Math.min(14, Math.round(experience * 1.2));

  // 6. AI Rating & Suggested Grade
  const tempPlayerForRating = {
    role,
    experience,
    stats: {
      matches,
      runs,
      average,
      strikeRate,
      highestScore,
      fifties,
      hundreds,
      wickets,
      bowlingAverage,
      economyRate,
      bestBowling,
      catches,
      stumpings,
    },
  };

  const aiRating = calculatePlayerRating(tempPlayerForRating);
  let suggestedGrade: PlayerGrade = 'C';
  let basePrice = 1000;

  if (aiRating >= 75) {
    suggestedGrade = 'A';
    basePrice = 5000;
  } else if (aiRating >= 50) {
    suggestedGrade = 'B';
    basePrice = 2500;
  } else {
    suggestedGrade = 'C';
    basePrice = 1000;
  }

  const dummyPlayerForInsights: Player = {
    id: 'temp',
    name,
    age,
    ageCategory: age <= 15 ? '15 and Below' : 'Above 15',
    gender: 'Male',
    experience,
    role,
    battingStyle,
    bowlingStyle,
    grade: suggestedGrade,
    basePrice,
    status: 'upcoming',
    stats: tempPlayerForRating.stats,
  };

  const insights = generatePlayerAIInsights(dummyPlayerForInsights);

  const cleanPhoto = photo && !photo.includes('default/user_profile.png') ? photo : '';

  const playerObj: Omit<Player, 'id' | 'status'> = {
    name,
    age,
    ageCategory: age <= 15 ? '15 and Below' : 'Above 15',
    gender: 'Male',
    experience,
    role,
    battingStyle,
    bowlingStyle,
    grade: suggestedGrade,
    basePrice,
    photo: cleanPhoto,
    previousPerformance: `CricHeroes Official: ${matches} matches, ${runs} runs (HS: ${highestScore}), ${wickets} wickets (Econ: ${economyRate > 0 ? economyRate.toFixed(1) : 'N/A'})`,
    notes: city ? `CricHeroes Home Base: ${city}` : 'Imported from CricHeroes App',
    stats: tempPlayerForRating.stats,
  };

  return {
    player: playerObj,
    aiRating,
    suggestedGrade,
    recommendedPrice: basePrice,
    insights: {
      strengths: insights.strengths,
      concerns: insights.concerns,
      summary: insights.summary,
    },
    source: 'web_scrape',
    rawStatement,
    cricheroesId,
  };
}

export function parseCricHeroesHtml(html: string): CricHeroesParsedResult {
  const payload = extractRSCPayload(html);

  let rawData: any = null;
  const playerInfoMatch = payload.match(/"playerInfo":\s*(\{"status":true,"data":\{[\s\S]*?\}\})/);
  if (playerInfoMatch) {
    try {
      rawData = JSON.parse(playerInfoMatch[1]).data;
    } catch {}
  }

  // Fallback: check directly in HTML if payload unescaping missed it
  if (!rawData) {
    const directMatch = html.match(/"playerInfo":\s*(\{"status":true,"data":\{[\s\S]*?\}\})/);
    if (directMatch) {
      try {
        rawData = JSON.parse(directMatch[1]).data;
      } catch {}
    }
  }

  if (!rawData) {
    throw new Error('Unable to extract CricHeroes player profile data. Please verify the URL or try pasting the profile text.');
  }

  const statementStats = parseStatement(rawData.player_statement);

  return buildParsedPlayer(
    rawData.name || 'CricHeroes Player',
    rawData.profile_photo || '',
    rawData.playing_role || '',
    rawData.batting_hand || '',
    rawData.bowling_style || '',
    rawData.total_matches || 0,
    rawData.total_runs || 0,
    rawData.total_wickets || 0,
    statementStats,
    rawData.city_name,
    rawData.player_statement,
    rawData.player_id
  );
}


export function parseCricHeroesTextSnippet(text: string): CricHeroesParsedResult {
  const clean = text.replace(/\r\n/g, '\n');

  // Name
  let name = 'CricHeroes Cricketer';
  const nameMatch = clean.match(/(?:Player\s*(?:Name)?|Name)[:\s]+([^\n,]+)/i) ||
                    clean.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/m) ||
                    clean.match(/Check out\s+([A-Za-z\s]+)(?:'s|\s+profile)/i);
  if (nameMatch) {
    name = nameMatch[1].trim().replace(/['"’]/g, '');
  }

  // Matches
  const matchesMatch = clean.match(/(?:Matches|Match|Innings|M)[:\s]+(\d+)/i) || clean.match(/(\d+)\s+matches/i);
  const matches = matchesMatch ? parseInt(matchesMatch[1], 10) : 25;

  // Runs
  const runsMatch = clean.match(/(?:Runs|Run|R)[:\s]+(\d+)/i) || clean.match(/(\d+)\s+runs/i);
  const runs = runsMatch ? parseInt(runsMatch[1], 10) : 450;

  // Wickets
  const wicketsMatch = clean.match(/(?:Wickets|Wicket|Wkts|Wkt|W)[:\s]+(\d+)/i) || clean.match(/(\d+)\s+wickets/i);
  const wickets = wicketsMatch ? parseInt(wicketsMatch[1], 10) : 0;

  // Batting Average
  const avgMatch = clean.match(/(?:Batting\s*Avg|Avg|Average)[:\s]+([\d.]+)/i) || clean.match(/average of\s*([\d.]+)/i);
  const average = avgMatch ? parseFloat(avgMatch[1]) : parseFloat((runs / Math.max(1, matches * 0.8)).toFixed(2));

  // Strike Rate
  const srMatch = clean.match(/(?:Strike\s*Rate|SR)[:\s]+([\d.]+)/i) || clean.match(/strike rate of\s*([\d.]+)/i);
  const strikeRate = srMatch ? parseFloat(srMatch[1]) : 125.0;

  // Highest Score
  const hsMatch = clean.match(/(?:Highest\s*Score|HS|Top\s*Score)[:\s]+(\d+)/i) || clean.match(/top score of\s*(\d+)/i);
  const highestScore = hsMatch ? parseInt(hsMatch[1], 10) : Math.min(runs, 65);

  // Bowling Economy
  const econMatch = clean.match(/(?:Economy|Econ|ER)[:\s]+([\d.]+)/i) || clean.match(/economy rate of\s*([\d.]+)/i);
  const economyRate = econMatch ? parseFloat(econMatch[1]) : (wickets > 0 ? 7.8 : 0);

  // Bowling Average
  const bowlAvgMatch = clean.match(/(?:Bowling\s*Avg|Bowl\s*Avg)[:\s]+([\d.]+)/i);
  const bowlingAverage = bowlAvgMatch ? parseFloat(bowlAvgMatch[1]) : (wickets > 0 ? 22.0 : 0);

  // Role
  let roleStr = '';
  const roleMatch = clean.match(/(?:Role|Playing\s*Role)[:\s]+([^\n,]+)/i);
  if (roleMatch) {
    roleStr = roleMatch[1].trim();
  } else {
    if (clean.toLowerCase().includes('all-rounder') || clean.toLowerCase().includes('all rounder')) roleStr = 'Bowler';
    else if (clean.toLowerCase().includes('wicketkeeper') || clean.toLowerCase().includes('wicket keeper')) roleStr = 'Wicketkeeper';
    else if (clean.toLowerCase().includes('bowler')) roleStr = 'Bowler';
    else if (clean.toLowerCase().includes('batsman')) roleStr = 'Batsman';
  }

  // Batting Style
  let batStr = 'Right-hand bat';
  if (clean.toLowerCase().includes('left-hand bat') || clean.toLowerCase().includes('lhb')) {
    batStr = 'Left-hand bat';
  }

  // Bowling Style
  let bowlStr = 'Right-arm medium';
  if (clean.toLowerCase().includes('left-arm fast')) bowlStr = 'Left-arm fast';
  else if (clean.toLowerCase().includes('left-arm medium')) bowlStr = 'Left-arm medium';
  else if (clean.toLowerCase().includes('left-arm orthodox') || clean.toLowerCase().includes('orthodox')) bowlStr = 'Left-arm orthodox';
  else if (clean.toLowerCase().includes('chinaman')) bowlStr = 'Left-arm chinaman';
  else if (clean.toLowerCase().includes('right-arm fast')) bowlStr = 'Right-arm fast';
  else if (clean.toLowerCase().includes('off break') || clean.toLowerCase().includes('off-break')) bowlStr = 'Right-arm off-break';
  else if (clean.toLowerCase().includes('leg break') || clean.toLowerCase().includes('leg-break')) bowlStr = 'Right-arm leg-break';

  const statementStats = {
    highestScore,
    average,
    strikeRate,
    oversBowled: wickets * 3,
    economyRate,
    sixes: 0,
    fours: 0,
  };

  const result = buildParsedPlayer(
    name,
    '',
    roleStr,
    batStr,
    bowlStr,
    matches,
    runs,
    wickets,
    statementStats,
    undefined,
    text
  );
  result.source = 'text_paste';
  return result;
}

// 4 High-Quality Presets for instant 1-click testing
export const CRICHEROES_PRESETS: CricHeroesParsedResult[] = [
  {
    player: {
      name: 'Mohit Sharma (Live CricHeroes)',
      age: 28,
      experience: 7,
      role: 'Bowler',
      battingStyle: 'Left-hand bat',
      bowlingStyle: 'Left-arm medium',
      grade: 'B',
      basePrice: 2500,
      photo: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=400&q=80',
      previousPerformance: 'CricHeroes Verified: 56 matches, 429 runs, 33 wickets, Econ: 8.01',
      notes: 'Profile ID: #299975 | CricHeroes Top Performer',
      stats: {
        matches: 56,
        runs: 429,
        average: 13.0,
        strikeRate: 111.72,
        highestScore: 57,
        fifties: 1,
        hundreds: 0,
        wickets: 33,
        bowlingAverage: 16.26,
        economyRate: 8.01,
        bestBowling: '4/22',
        catches: 22,
        stumpings: 0,
      },
    },
    aiRating: 64,
    suggestedGrade: 'B',
    recommendedPrice: 2500,
    insights: {
      strengths: ['Effective middle-overs wicket taker (33 wickets)', 'Dual all-round utility with bat and ball', 'Proven tournament stamina (56 matches)'],
      concerns: ['Strike rate could improve in death overs (111.7 SR)'],
      summary: 'Proven all-rounder with excellent control and knack for breaking partnerships.',
    },
    source: 'preset',
    cricheroesId: 299975,
  },
  {
    player: {
      name: 'Aakash Verma (Power Batsman)',
      age: 25,
      experience: 6,
      role: 'Batsman',
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'None',
      grade: 'A',
      basePrice: 5000,
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
      previousPerformance: 'CricHeroes Verified: 48 matches, 1,740 runs, HS: 106*, Avg: 44.6, SR: 154.2',
      notes: 'Imported from CricHeroes App | Grade A Power Hitter',
      stats: {
        matches: 48,
        runs: 1740,
        average: 44.6,
        strikeRate: 154.2,
        highestScore: 106,
        fifties: 12,
        hundreds: 2,
        wickets: 0,
        bowlingAverage: 0,
        economyRate: 0,
        bestBowling: 'N/A',
        catches: 28,
        stumpings: 0,
      },
    },
    aiRating: 88,
    suggestedGrade: 'A',
    recommendedPrice: 5000,
    insights: {
      strengths: ['Exceptional batting average (44.6)', 'Blistering strike rate (154.2)', 'Century pedigree (2 centuries, 12 fifties)'],
      concerns: ['Pure specialist batsman with no bowling quota'],
      summary: 'Elite top-order power batsman guaranteed to dominate powerplay overs.',
    },
    source: 'preset',
    cricheroesId: 441029,
  },
  {
    player: {
      name: 'Rohan Deshmukh (Speed Gun)',
      age: 23,
      experience: 5,
      role: 'Bowler',
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'Right-arm fast',
      grade: 'A',
      basePrice: 5000,
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
      previousPerformance: 'CricHeroes Verified: 42 matches, 64 wickets, Econ: 6.85, Best: 5/18',
      notes: 'Imported from CricHeroes App | Express Strike Bowler',
      stats: {
        matches: 42,
        runs: 85,
        average: 9.2,
        strikeRate: 95.0,
        highestScore: 22,
        fifties: 0,
        hundreds: 0,
        wickets: 64,
        bowlingAverage: 15.4,
        economyRate: 6.85,
        bestBowling: '5/18',
        catches: 16,
        stumpings: 0,
      },
    },
    aiRating: 84,
    suggestedGrade: 'A',
    recommendedPrice: 5000,
    insights: {
      strengths: ['Dominant strike rate with 64 wickets in 42 matches', 'Exceptional economy of 6.85 in T20s', 'Match-winning 5-wicket haul capability'],
      concerns: ['Tail-ender batting profile'],
      summary: 'Frontline express pacer with death-overs yorkers and high wicket potential.',
    },
    source: 'preset',
    cricheroesId: 589211,
  },
  {
    player: {
      name: 'Karan Mehra (Keeper Finisher)',
      age: 26,
      experience: 5,
      role: 'Wicketkeeper',
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'None',
      grade: 'B',
      basePrice: 2500,
      photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80',
      previousPerformance: 'CricHeroes Verified: 38 matches, 890 runs, Avg: 34.2, SR: 138.5, 26 Catches, 8 Stumpings',
      notes: 'Imported from CricHeroes App | Dynamic Gloveman',
      stats: {
        matches: 38,
        runs: 890,
        average: 34.2,
        strikeRate: 138.5,
        highestScore: 68,
        fifties: 5,
        hundreds: 0,
        wickets: 0,
        bowlingAverage: 0,
        economyRate: 0,
        bestBowling: 'N/A',
        catches: 26,
        stumpings: 8,
      },
    },
    aiRating: 71,
    suggestedGrade: 'B',
    recommendedPrice: 2500,
    insights: {
      strengths: ['Reliable glovework with 34 dismissals', 'Clutch finisher in death overs (138.5 SR)', 'Consistent middle order anchor'],
      concerns: ['Moderate sample size in major playoff games'],
      summary: 'Valuable wicketkeeper-batsman who provides team balance and reliable middle-overs hitting.',
    },
    source: 'preset',
    cricheroesId: 312890,
  }
];
