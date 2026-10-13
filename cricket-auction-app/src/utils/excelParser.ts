import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Player, PlayerGrade, PlayerRole, BattingStyle, BowlingStyle, Team, AuctionTransaction, TournamentInfo, GradeBasePrices } from '../types/auction';

export interface ParsedPlayerRow {
  name: string;
  age: number;
  ageCategory?: string; // e.g. "Below 14" | "Above 14"
  gender?: string; // e.g. "Male" | "Female"
  experience: number;
  role: PlayerRole;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
  grade: PlayerGrade;
  gradeReason?: string;
  basePrice: number;
  description: string;
  matches: number;
  runs: number;
  average: number;
  strikeRate: number;
  highestScore: number;
  fifties: number;
  hundreds: number;
  wickets: number;
  bowlingAverage: number;
  economyRate: number;
  bestBowling: string;
  catches: number;
  stumpings: number;
  previousPerformance: string;
  notes: string;
  errors: string[];
  warnings: string[];
  rawIndex: number;
}

/**
 * AI analysis to evaluate player grade based on description, experience, achievements, and leadership interest.
 */
export function analyzePlayerGradeWithAI(
  description: string,
  rawExp: number,
  captaincy: string = '',
  age: number = 20
): { grade: PlayerGrade; reason: string } {
  const text = (description || '').toLowerCase().trim();
  const cap = String(captaincy || '').toLowerCase().trim();

  // 1. Explicit non-experience or negative signals
  const explicitNegatives = [
    'no', 'none', 'nope', 'na', 'n/a', 'nil', '-', '--', 'nothing specific',
    'no achievements', 'have experience but no achievements', 'not played',
    'never played', 'only for fun', 'just for fun', 'very basic', 'very limited',
    'very less experience', 'amateur', 'beginner at the game', 'play occasionally'
  ];

  const isExplicitNegative = explicitNegatives.some(neg => {
    if (text === neg) return true;
    if (text.startsWith(neg + ' ') || text.endsWith(' ' + neg) || text.includes(' ' + neg + ' ')) return true;
    return false;
  }) || text.includes('forced me') || text.includes('joining as') || text.includes('just joining');

  if (!text || isExplicitNegative) {
    if (cap === 'yes') {
      return { grade: 'B', reason: 'Leadership / Captaincy candidate' };
    }
    return { grade: 'C', reason: 'Beginner / Recreational participant' };
  }

  // 2. Elite Tier A Keywords & Achievements
  const tierAPatterns: { match: string; reason: string }[] = [
    { match: 'national', reason: 'National tournament representation' },
    { match: 'state', reason: 'State level cricket experience' },
    { match: 'district', reason: 'District level leather cricket' },
    { match: 'zonal', reason: 'Zonal tournament representative' },
    { match: 'player of the tournament', reason: 'Tournament MVP / Player of Tournament' },
    { match: 'player of the series', reason: 'Player of the Series award winner' },
    { match: 'man of the match', reason: 'Man of the Match finalist' },
    { match: 'winner', reason: 'Tournament champion / winner' },
    { match: 'champions', reason: 'Championship winner' },
    { match: 'hatrick', reason: 'Hat-trick performance bowler' },
    { match: 'hat-trick', reason: 'Hat-trick performance bowler' },
    { match: 'deccan gymkhana', reason: 'Premier club playing XI (Deccan Gymkhana)' },
    { match: 'academy', reason: 'Formal cricket academy trainee' },
    { match: 'acadamy', reason: 'Formal cricket academy trainee' },
    { match: 'sports foundation', reason: 'Sports foundation training trainee' },
    { match: 'pyc', reason: 'PYC Club competitive player' },
    { match: 'leather ball', reason: 'Leather ball tournament specialist' },
    { match: 'leather cricket', reason: 'Leather ball cricket experienced' },
    { match: 'inter club', reason: 'Inter-club tournament competitor' },
    { match: 'inter-club', reason: 'Inter-club tournament competitor' },
    { match: 'interschool', reason: 'Inter-school tournament player' },
    { match: 'inter-school', reason: 'Inter-school tournament player' },
    { match: 'college team', reason: 'College cricket team squad' },
    { match: 'university', reason: 'University cricket player' },
    { match: 'opening bowler', reason: 'Opening bowler / competitive league' },
    { match: 'london', reason: 'International club captain / competitive league' },
  ];

  for (const item of tierAPatterns) {
    if (text.includes(item.match)) {
      return { grade: 'A', reason: item.reason };
    }
  }

  // 3. Experienced Tier B Keywords
  const tierBPatterns: { match: string; reason: string }[] = [
    { match: 'jcpl', reason: 'Prior JCPL league experience' },
    { match: 'corporate', reason: 'Corporate cricket league player' },
    { match: 'school team', reason: 'School cricket team representation' },
    { match: 'school', reason: 'School level competition player' },
    { match: 'club', reason: 'Club cricket participant' },
    { match: 'office', reason: 'Office / corporate tournament player' },
    { match: 'box cricket', reason: 'Box cricket tournament player' },
    { match: 'impact player', reason: 'Designated impact player' },
    { match: 'playing 11', reason: 'Regular playing XI member' },
    { match: 'medium fast', reason: 'Specialized pace / medium fast bowler' },
    { match: 'played lot', reason: 'Extensive playing history' },
    { match: 'long time', reason: 'Long-term cricket experience' },
    { match: 'competent', reason: 'Competent skill & match awareness' },
    { match: 'good', reason: 'Demonstrated good batting/bowling skill' },
    { match: 'decent', reason: 'Decent match experience' },
    { match: 'regular', reason: 'Regular match player' },
  ];

  for (const item of tierBPatterns) {
    if (text.includes(item.match)) {
      return { grade: 'B', reason: item.reason };
    }
  }

  // 4. Experience Years & Leadership fallback
  if (rawExp >= 3) {
    return { grade: 'B', reason: `${rawExp}+ years active experience` };
  }
  if (cap === 'yes') {
    return { grade: 'B', reason: 'Leadership / Captaincy interest' };
  }

  return { grade: 'C', reason: 'Casual / Local Player' };
}

export function parseExcelOrCsv(fileData: ArrayBuffer | string, customGradePrices?: GradeBasePrices): ParsedPlayerRow[] {
  const workbook = XLSX.read(fileData, { type: typeof fileData === 'string' ? 'string' : 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const defaultGradePrices: GradeBasePrices = {
    gradeA: customGradePrices?.gradeA ?? 5000,
    gradeB: customGradePrices?.gradeB ?? 3000,
    gradeC: customGradePrices?.gradeC ?? 1000,
  };

  return rawRows.map((row, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const rowKeys = Object.keys(row);

    // Helper to find value from fuzzy column keys with exact & substring matching
    const findVal = (possibleKeys: string[]): unknown => {
      const lowerRowKeys = rowKeys.reduce((acc, k) => {
        acc[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = row[k];
        return acc;
      }, {} as Record<string, unknown>);

      // 1. Exact cleaned match
      for (const pk of possibleKeys) {
        const cleanKey = pk.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanKey in lowerRowKeys && lowerRowKeys[cleanKey] !== undefined && lowerRowKeys[cleanKey] !== '') {
          return lowerRowKeys[cleanKey];
        }
      }

      // 2. Substring matching (e.g. 'Primary Cricket Skill' vs 'skill')
      for (const pk of possibleKeys) {
        const cleanPk = pk.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanPk.length < 3) continue;
        for (const rk of rowKeys) {
          const cleanRk = rk.toLowerCase().replace(/[^a-z0-9]/g, '');
          if ((cleanRk.includes(cleanPk) || cleanPk.includes(cleanRk)) && row[rk] !== undefined && row[rk] !== '') {
            return row[rk];
          }
        }
      }

      return undefined;
    };

    const rawName = String(findVal(['name', 'player name', 'fullname', 'player', 'player full name']) || '').trim();
    if (!rawName) {
      errors.push('Player Name is required.');
    }

    // Age & Age Category parsing (handles "Between 10 to 14", "Greater Than 14", "Above 14", "Below 14", or raw numbers)
    const ageVal = findVal(['age', 'player age', 'age group', 'age category']);
    let rawAge = 22;
    let ageCategory = 'Above 14';

    if (typeof ageVal === 'number' && !isNaN(ageVal) && ageVal > 0) {
      rawAge = Math.round(ageVal);
      ageCategory = rawAge <= 14 ? 'Below 14' : 'Above 14';
    } else if (typeof ageVal === 'string' && ageVal.trim() !== '') {
      const lowerAge = ageVal.toLowerCase();
      if ((lowerAge.includes('10') && lowerAge.includes('14')) || lowerAge.includes('below') || lowerAge.includes('less') || lowerAge.includes('under') || lowerAge.includes('<')) {
        rawAge = 13;
        ageCategory = 'Below 14';
      } else if (lowerAge.includes('greater') || lowerAge.includes('>') || lowerAge.includes('above') || lowerAge.includes('15') || lowerAge.includes('14')) {
        const num = parseFloat(lowerAge.replace(/[^\d.]/g, ''));
        rawAge = !isNaN(num) && num > 14 ? num : 20;
        ageCategory = 'Above 14';
      } else {
        const num = parseFloat(ageVal.replace(/[^\d.]/g, ''));
        if (!isNaN(num) && num > 0) {
          rawAge = Math.round(num);
          ageCategory = rawAge <= 14 ? 'Below 14' : 'Above 14';
        }
      }
    }

    // Gender parsing (e.g. 'Male', 'Female', 'M', 'F')
    const rawGenderVal = String(findVal(['gender', 'sex', 'player gender', 'm/f']) || '').trim();
    let gender: string = 'Male';
    if (rawGenderVal.toLowerCase().startsWith('f') || rawGenderVal.toLowerCase().includes('female') || rawGenderVal.toLowerCase().includes('woman') || rawGenderVal.toLowerCase().includes('girl')) {
      gender = 'Female';
    } else if (rawGenderVal.toLowerCase().startsWith('m') || rawGenderVal.toLowerCase().includes('male') || rawGenderVal.toLowerCase().includes('man') || rawGenderVal.toLowerCase().includes('boy')) {
      gender = 'Male';
    } else if (rawGenderVal) {
      gender = rawGenderVal;
    }

    // Determine Primary Skill / Role
    let rawRoleStr = String(findVal([
      'primary cricket skill',
      'cricket skill',
      'primary skill',
      'primaryskill',
      'primary skill (role)',
      'primary',
      'skill',
      'skills',
      'role',
      'roles',
      'playing role',
      'player role',
      'specialization',
      'speciality',
      'category',
      'player category',
      'player type',
      'type',
      'position'
    ]) || '').trim().toLowerCase();

    // Fallback: If not found in column headers, scan all cell values in row for role keywords
    if (!rawRoleStr) {
      for (const val of Object.values(row)) {
        const strVal = String(val || '').trim().toLowerCase();
        if (
          strVal === 'batsman' || strVal === 'batsmen' || strVal === 'batter' ||
          strVal === 'bowler' || strVal === 'bowlers' ||
          strVal === 'all-rounder' || strVal === 'all rounder' || strVal === 'allrounder' ||
          strVal === 'wicketkeeper' || strVal === 'wicket keeper' || strVal === 'keeper-batsman' ||
          strVal === 'keeper' || strVal === 'wk'
        ) {
          rawRoleStr = strVal;
          break;
        }
      }
    }

    let role: PlayerRole = 'Batsman';
    if (rawRoleStr.includes('keep') || rawRoleStr.includes('wk') || rawRoleStr.includes('wicket')) {
      role = 'Wicketkeeper';
    } else if (rawRoleStr.includes('bowl')) {
      role = 'Bowler';
    } else if (rawRoleStr.includes('all') || rawRoleStr.includes('round')) {
      role = 'All-rounder';
    } else if (rawRoleStr.includes('bat')) {
      role = 'Batsman';
    } else {
      warnings.push(`Defaulted primary skill to Batsman (original: "${rawRoleStr}")`);
    }

    // Fetch Description from Excel (e.g. 'Any Cricket Experience/Achievements', 'Description', 'Bio', etc.)
    const rawDesc = String(findVal([
      'any cricket experience/achievements',
      'cricket experience/achievements',
      'experience/achievements',
      'experience / achievements',
      'any cricket experience',
      'cricket experience',
      'achievements',
      'description',
      'player description',
      'desc',
      'bio',
      'about',
      'details',
      'player info',
      'profile',
      'experience',
      'exp',
      'notes',
      'comments',
      'remarks'
    ]) || '').trim();

    const building = String(findVal(['building']) || '').trim();
    const flat = String(findVal(['flat number', 'flat', 'flat no']) || '').trim();
    const captaincy = String(findVal(['interested in captaincy', 'captaincy']) || '').trim();

    let extraNotes = '';
    if (building || flat) extraNotes += `Flat: ${building}${flat ? '-' + flat : ''}`;
    if (captaincy.toLowerCase() === 'yes') extraNotes += extraNotes ? ' | Captaincy Candidate' : 'Captaincy Candidate';

    const description = rawDesc;
    const notes = extraNotes ? (rawDesc ? `${extraNotes} • ${rawDesc}` : extraNotes) : rawDesc;

    // Experience in years (numeric fallback for calculations)
    const expNum = parseFloat(rawDesc.replace(/[^\d.]/g, ''));
    const rawExp = !isNaN(expNum) && expNum > 0 && expNum <= 30 ? Math.round(expNum) : Math.max(1, Math.min(15, Math.round(rawAge / 4)));

    // Determine Grade via AI Analysis of description & experience, or explicit column if specified
    const rawGradeVal = findVal(['grade', 'player grade', 'tier', 'category']);
    let grade: PlayerGrade = 'C';
    let gradeReason: string = '';

    if (rawGradeVal !== undefined && String(rawGradeVal).trim()) {
      const rawGradeStr = String(rawGradeVal).trim().toUpperCase();
      if (rawGradeStr.startsWith('A')) {
        grade = 'A';
        gradeReason = 'Specified in Excel spreadsheet';
      } else if (rawGradeStr.startsWith('B')) {
        grade = 'B';
        gradeReason = 'Specified in Excel spreadsheet';
      } else if (rawGradeStr.startsWith('C')) {
        grade = 'C';
        gradeReason = 'Specified in Excel spreadsheet';
      } else {
        const aiEvaluation = analyzePlayerGradeWithAI(description, rawExp, captaincy, rawAge);
        grade = aiEvaluation.grade;
        gradeReason = aiEvaluation.reason;
      }
    } else {
      // Run AI evaluation on description and experience
      const aiEvaluation = analyzePlayerGradeWithAI(description, rawExp, captaincy, rawAge);
      grade = aiEvaluation.grade;
      gradeReason = aiEvaluation.reason;
    }

    // Determine Batting Style
    const rawBatStr = String(findVal(['batting style', 'batting', 'bats']) || '').toLowerCase();
    const battingStyle: BattingStyle = rawBatStr.includes('left') ? 'Left-hand bat' : 'Right-hand bat';

    // Determine Bowling Style
    const rawBowlStr = String(findVal(['bowling style', 'bowling', 'bowls']) || '').trim();
    let bowlingStyle: BowlingStyle = 'Right-arm medium';
    if (!rawBowlStr || rawBowlStr.toLowerCase() === 'none') {
      bowlingStyle = role === 'Batsman' || role === 'Wicketkeeper' ? 'None' : 'Right-arm medium';
    } else if (rawBowlStr.toLowerCase().includes('spin') || rawBowlStr.toLowerCase().includes('break') || rawBowlStr.toLowerCase().includes('orthodox')) {
      bowlingStyle = rawBowlStr.toLowerCase().includes('left') ? 'Left-arm orthodox' : 'Right-arm leg-break';
    } else if (rawBowlStr.toLowerCase().includes('fast')) {
      bowlingStyle = rawBowlStr.toLowerCase().includes('left') ? 'Left-arm fast' : 'Right-arm fast';
    } else {
      bowlingStyle = 'Right-arm medium';
    }

    // Numerical Stats (uses configured Grade Base Prices if not specified in excel)
    const fallbackBasePrice = grade === 'A' ? defaultGradePrices.gradeA : grade === 'B' ? defaultGradePrices.gradeB : defaultGradePrices.gradeC;
    const basePrice = Number(findVal(['base price', 'baseprice', 'price', 'base'])) || fallbackBasePrice;
    if (basePrice <= 0) {
      errors.push('Base price must be greater than 0.');
    }

    const matches = Number(findVal(['matches', 'matches played', 'mat', 'match'])) || 0;
    const runs = Number(findVal(['runs', 'total runs', 'run'])) || 0;
    const average = Number(findVal(['average', 'batting average', 'avg', 'bat avg'])) || 0;
    const strikeRate = Number(findVal(['strike rate', 'strikerate', 'sr'])) || (runs > 0 ? 125 : 0);
    const highestScore = Number(findVal(['highest score', 'high score', 'hs', 'high'])) || 0;
    const fifties = Number(findVal(['fifties', '50s', 'half centuries'])) || 0;
    const hundreds = Number(findVal(['hundreds', '100s', 'centuries'])) || 0;

    const wickets = Number(findVal(['wickets', 'wkts', 'wkt'])) || 0;
    const bowlingAverage = Number(findVal(['bowling average', 'bowl avg', 'bowl average'])) || 0;
    const economyRate = Number(findVal(['economy', 'economy rate', 'econ', 'er'])) || 0;
    const bestBowling = String(findVal(['best bowling', 'best', 'bb']) || (wickets > 0 ? '3/25' : 'N/A'));
    const catches = Number(findVal(['catches', 'ct'])) || 0;
    const stumpings = Number(findVal(['stumpings', 'st'])) || 0;

    const previousPerformance = String(findVal(['previous performance', 'performance', 'history', 'past performance']) || '');
    const userNotes = String(findVal(['notes', 'comments', 'additional notes']) || '');
    const finalNotes = notes || userNotes || description;

    return {
      name: rawName || `Player #${index + 1}`,
      age: rawAge,
      ageCategory,
      gender,
      experience: rawExp,
      role,
      battingStyle,
      bowlingStyle,
      grade,
      gradeReason,
      basePrice,
      description,
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
      previousPerformance: previousPerformance || description,
      notes: finalNotes,
      errors,
      warnings,
      rawIndex: index,
    };
  });
}

export function generateSampleExcelTemplate(): void {
  const sampleData = [
    {
      'Player Name': 'Aarav Patel',
      'Primary Skill': 'Batsman',
      'Description': 'Captain in regional cup, aggressive powerplay opener',
      'Age': 26,
      'Grade': 'A',
      'Base Price': 5000,
      'Matches': 75,
      'Runs': 2850,
      'Average': 42.5,
      'Strike Rate': 148.2,
      'Highest Score': 108,
      'Fifties': 18,
      'Hundreds': 3,
      'Wickets': 5,
      'Bowling Average': 35.0,
      'Economy': 8.2,
      'Best Bowling': '2/18',
      'Catches': 32,
      'Stumpings': 0,
      'Notes': 'Flat: B-102',
    },
    {
      'Player Name': 'Jasdeep Singh',
      'Primary Skill': 'Bowler',
      'Description': 'Leading wicket taker in district trials, express pace',
      'Age': 24,
      'Grade': 'B',
      'Base Price': 3000,
      'Matches': 48,
      'Runs': 110,
      'Average': 9.0,
      'Strike Rate': 90.0,
      'Highest Score': 21,
      'Fifties': 0,
      'Hundreds': 0,
      'Wickets': 68,
      'Bowling Average': 22.4,
      'Economy': 7.1,
      'Best Bowling': '4/16',
      'Catches': 14,
      'Stumpings': 0,
      'Notes': 'Flat: E-22',
    },
    {
      'Player Name': 'Kunal Verma',
      'Primary Skill': 'All-rounder',
      'Description': 'Tournament MVP, middle overs spin & reliable middle-order bat',
      'Age': 28,
      'Grade': 'A',
      'Base Price': 6000,
      'Matches': 82,
      'Runs': 1950,
      'Average': 33.6,
      'Strike Rate': 144.0,
      'Highest Score': 79,
      'Fifties': 11,
      'Hundreds': 0,
      'Wickets': 85,
      'Bowling Average': 23.8,
      'Economy': 6.9,
      'Best Bowling': '4/20',
      'Catches': 40,
      'Stumpings': 0,
      'Notes': 'Flat: G-202',
    },
    {
      'Player Name': 'Rohan Deshmukh',
      'Primary Skill': 'Wicketkeeper',
      'Description': 'Sharp reflexes behind stumps, quick glovework and finisher',
      'Age': 23,
      'Grade': 'C',
      'Base Price': 1500,
      'Matches': 30,
      'Runs': 640,
      'Average': 28.5,
      'Strike Rate': 136.0,
      'Highest Score': 64,
      'Fifties': 3,
      'Hundreds': 0,
      'Wickets': 0,
      'Bowling Average': 0,
      'Economy': 0,
      'Best Bowling': 'N/A',
      'Catches': 24,
      'Stumpings': 9,
      'Notes': 'Flat: F-74',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Players');
  XLSX.writeFile(wb, 'Cricket_Tournament_Players_Template.xlsx');
}

export function exportAuctionToExcel(
  tournament: TournamentInfo,
  teams: Team[],
  players: Player[],
  transactions: AuctionTransaction[]
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Final Squads by Team
  const squadRows: Record<string, unknown>[] = [];
  teams.forEach(team => {
    const squadPlayers = players.filter(p => team.squad.includes(p.id));
    squadPlayers.forEach((p, idx) => {
      squadRows.push({
        'Team': team.name,
        'No.': idx + 1,
        'Player Name': p.name,
        'Role': p.role,
        'Grade': p.grade,
        'Base Price (pts)': p.basePrice,
        'Sold Price (pts)': p.soldPrice || 0,
        'Runs': p.stats.runs,
        'Bat Avg': p.stats.average,
        'Strike Rate': p.stats.strikeRate,
        'Wickets': p.stats.wickets,
        'Economy': p.stats.economyRate,
      });
    });
  });
  const wsSquads = XLSX.utils.json_to_sheet(squadRows);
  XLSX.utils.book_append_sheet(wb, wsSquads, 'Team Squads');

  // Sheet 2: Team Financial Summary
  const teamRows = teams.map(t => ({
    'Team Name': t.name,
    'Captain': t.captain || 'TBD',
    'Owner': t.owner || 'TBD',
    'Starting Budget': t.startingBudget,
    'Total Spent': t.totalSpent,
    'Remaining Budget': t.remainingBudget,
    'Squad Size': t.squad.length,
    'Avg Price/Player': t.squad.length > 0 ? Math.round(t.totalSpent / t.squad.length) : 0,
  }));
  const wsTeams = XLSX.utils.json_to_sheet(teamRows);
  XLSX.utils.book_append_sheet(wb, wsTeams, 'Team Finances');

  // Sheet 3: Unsold Players
  const unsoldPlayers = players.filter(p => p.status === 'unsold');
  const unsoldRows = unsoldPlayers.map(p => ({
    'Player Name': p.name,
    'Role': p.role,
    'Grade': p.grade,
    'Base Price': p.basePrice,
    'Age': p.age,
    'Experience (yrs)': p.experience,
    'Runs': p.stats.runs,
    'Wickets': p.stats.wickets,
  }));
  const wsUnsold = XLSX.utils.json_to_sheet(unsoldRows);
  XLSX.utils.book_append_sheet(wb, wsUnsold, 'Unsold Players');

  // Sheet 4: Transaction Log
  const txRows = transactions.map((tx, idx) => ({
    'Tx #': idx + 1,
    'Player Name': tx.playerName,
    'Role': tx.playerRole,
    'Grade': tx.playerGrade,
    'Winning Team': tx.teamName,
    'Base Price': tx.basePrice,
    'Final Sold Price': tx.soldPrice,
    'Total Bids': tx.bidHistory.length,
    'Timestamp': new Date(tx.timestamp).toLocaleString(),
  }));
  const wsTx = XLSX.utils.json_to_sheet(txRows);
  XLSX.utils.book_append_sheet(wb, wsTx, 'Auction Log');

  XLSX.writeFile(wb, `${tournament.name.replace(/[^a-zA-Z0-9]/g, '_')}_Final_Auction_Report.xlsx`);
}

export function exportAuctionToPDF(
  tournament: TournamentInfo,
  teams: Team[],
  players: Player[],
  transactions: AuctionTransaction[]
): void {
  const doc = new jsPDF();

  // Title & Header
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(tournament.name, 14, 18);
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text(`Official Auction Report — ${tournament.season} | Generated: ${new Date().toLocaleDateString()}`, 14, 25);

  // Summary Metrics Table
  const totalSpent = teams.reduce((acc, t) => acc + t.totalSpent, 0);
  const totalSold = players.filter(p => p.status === 'sold').length;
  const totalUnsold = players.filter(p => p.status === 'unsold').length;

  autoTable(doc, {
    startY: 32,
    head: [['Metric', 'Value', 'Metric', 'Value']],
    body: [
      ['Total Teams', `${teams.length}`, 'Total Points Spent', `${totalSpent.toLocaleString()} pts`],
      ['Total Players Sold', `${totalSold}`, 'Total Unsold Players', `${totalUnsold}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
  });

  // Teams Budget Table
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('Team Budgets & Squad Breakdown', 14, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12);

  const teamData = teams.map(t => [
    t.name,
    `${t.squad.length} players`,
    `${t.totalSpent.toLocaleString()} pts`,
    `${t.remainingBudget.toLocaleString()} pts`,
  ]);

  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16,
    head: [['Team Name', 'Squad Size', 'Points Spent', 'Remaining Budget']],
    body: teamData,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
  });

  // Top Purchases Table
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('Top Marquee Purchases', 14, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12);

  const topPurchases = [...transactions]
    .sort((a, b) => b.soldPrice - a.soldPrice)
    .slice(0, 10)
    .map((tx, idx) => [
      `#${idx + 1}`,
      tx.playerName,
      tx.playerRole,
      tx.playerGrade,
      tx.teamName,
      `${tx.soldPrice.toLocaleString()} pts`,
    ]);

  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16,
    head: [['Rank', 'Player Name', 'Role', 'Grade', 'Acquired By', 'Final Price']],
    body: topPurchases,
    theme: 'striped',
    headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255] },
  });

  doc.save(`${tournament.name.replace(/[^a-zA-Z0-9]/g, '_')}_Auction_Summary.pdf`);
}
