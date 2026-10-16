import React, { useState, useRef, useMemo } from 'react';
import { useAuction } from '../context/AuctionContext';
import {
  parseExcelOrCsv,
  generateSampleExcelTemplate,
  ParsedPlayerRow,
  analyzePlayerGradeWithAI,
  calculateRecommendedGrade,
  normalizePhotoUrl,
} from '../utils/excelParser';
import { parseCricHeroesHtml } from '../utils/cricheroesParser';
import { PlayerRole, PlayerGrade } from '../types/auction';
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  ArrowRight,
  Database,
  Sparkles,
  Brain,
  Filter,
  CheckSquare,
  Square,
  Users,
  Search,
  X,
  UserCheck,
  RotateCcw,
  Crown,
  Star,
  Tag,
  Hash,
  Zap,
} from 'lucide-react';

interface ExcelImportPageProps {
  onNavigateToPlayers: () => void;
}

const EXCEL_SESSION_KEY = 'cricket_auction_excel_session';

type GradeFilterType = 'all' | PlayerGrade | 'Captains' | 'ViceCaptains' | 'Sponsored';

interface SavedExcelSession {
  parsedRows: ParsedPlayerRow[];
  selectedIndices: number[];
  fileName: string;
  activePreset: PresetType;
  genderFilter: 'all' | 'Male' | 'Female';
  ageGroupFilter: 'all' | 'Above 15' | '15 and Below';
  roleFilter: 'all' | PlayerRole;
  gradeFilter: GradeFilterType;
}

function getStoredExcelSession(): SavedExcelSession | null {
  try {
    const raw = sessionStorage.getItem(EXCEL_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

type PresetType =
  | 'all'
  | 'males_above_15'
  | 'females'
  | '15_and_below'
  | 'males_15_and_below'
  | 'females_above_15'
  | 'females_15_and_below'
  | 'custom';

export const ExcelImportPage: React.FC<ExcelImportPageProps> = ({ onNavigateToPlayers }) => {
  const { importPlayers, rules } = useAuction();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialExcelSession = React.useMemo(() => getStoredExcelSession(), []);

  const [parsedRows, setParsedRows] = useState<ParsedPlayerRow[]>(initialExcelSession?.parsedRows || []);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(initialExcelSession?.selectedIndices || [])
  );
  const [fileName, setFileName] = useState<string>(initialExcelSession?.fileName || '');
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  // Stats Fetching state
  const [isFetchingStats, setIsFetchingStats] = useState(false);
  const [fetchProgress, setFetchProgress] = useState(0);

  // Filter states
  const [activePreset, setActivePreset] = useState<PresetType>(initialExcelSession?.activePreset || 'all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'Male' | 'Female'>(initialExcelSession?.genderFilter || 'all');
  const [ageGroupFilter, setAgeGroupFilter] = useState<'all' | 'Above 15' | '15 and Below'>(initialExcelSession?.ageGroupFilter || 'all');
  const [roleFilter, setRoleFilter] = useState<'all' | PlayerRole>(initialExcelSession?.roleFilter || 'all');
  const [gradeFilter, setGradeFilter] = useState<GradeFilterType>(initialExcelSession?.gradeFilter || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Persist Excel session on changes
  React.useEffect(() => {
    try {
      if (parsedRows.length > 0) {
        const toSave: SavedExcelSession = {
          parsedRows,
          selectedIndices: Array.from(selectedIndices),
          fileName,
          activePreset,
          genderFilter,
          ageGroupFilter,
          roleFilter,
          gradeFilter,
        };
        sessionStorage.setItem(EXCEL_SESSION_KEY, JSON.stringify(toSave));
      } else {
        sessionStorage.removeItem(EXCEL_SESSION_KEY);
      }
    } catch {}
  }, [parsedRows, selectedIndices, fileName, activePreset, genderFilter, ageGroupFilter, roleFilter, gradeFilter]);

  const gradeBasePrices = rules.gradeBasePrices || { gradeAPlus: 7000, gradeA: 5000, gradeB: 3000, gradeC: 1000 };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const buffer = evt.target?.result as ArrayBuffer;
      if (buffer) {
        try {
          const rows = parseExcelOrCsv(buffer, gradeBasePrices);
          setParsedRows(rows);
          // Select all parsed rows by default initially
          setSelectedIndices(new Set(rows.map(r => r.rawIndex)));
          setActivePreset('all');
          setGenderFilter('all');
          setAgeGroupFilter('all');
          setRoleFilter('all');
          setGradeFilter('all');
          setSearchQuery('');
        } catch (err) {
          alert('Failed to parse file. Please ensure it is a valid Excel (.xlsx, .xls) or .csv file.');
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpdateRowField = <K extends keyof ParsedPlayerRow>(rawIndex: number, field: K, value: ParsedPlayerRow[K]) => {
    setParsedRows(prev => {
      return prev.map(row => {
        if (row.rawIndex !== rawIndex) return row;
        const updated = { ...row, [field]: value };
        if (field === 'name') {
          updated.errors = String(value).trim() ? [] : ['Player Name is required.'];
        }
        return updated;
      });
    });
  };

  const handleEditPhotoPrompt = (rawIndex: number, currentPhoto?: string) => {
    const input = window.prompt(
      'Enter photo link for player (Google Drive links, web URLs, cloud paths):\nLeave empty to remove photo.',
      currentPhoto || ''
    );
    if (input !== null) {
      const normalized = normalizePhotoUrl(input.trim());
      handleUpdateRowField(rawIndex, 'photo', normalized || undefined);
    }
  };

  const handleDeleteRow = (rawIndex: number) => {
    setParsedRows(prev => prev.filter(r => r.rawIndex !== rawIndex));
    setSelectedIndices(prev => {
      const next = new Set(prev);
      next.delete(rawIndex);
      return next;
    });
  };

  const handleClearExcelSheet = () => {
    try {
      sessionStorage.removeItem(EXCEL_SESSION_KEY);
    } catch {}
    setParsedRows([]);
    setSelectedIndices(new Set());
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Segregation Preset Handler
  const applyPreset = (preset: PresetType) => {
    setActivePreset(preset);
    let newGender: 'all' | 'Male' | 'Female' = 'all';
    let newAge: 'all' | 'Above 15' | '15 and Below' = 'all';

    if (preset === 'all') {
      newGender = 'all';
      newAge = 'all';
      setSelectedIndices(new Set(parsedRows.map(r => r.rawIndex)));
    } else if (preset === 'males_above_15') {
      newGender = 'Male';
      newAge = 'Above 15';
      const matches = parsedRows.filter(r =>
        (r.gender || 'Male') === 'Male' &&
        (r.ageCategory || (r.age <= 15 ? '15 and Below' : 'Above 15')) === 'Above 15'
      );
      setSelectedIndices(new Set(matches.map(r => r.rawIndex)));
    } else if (preset === 'females') {
      newGender = 'Female';
      newAge = 'all';
      const matches = parsedRows.filter(r => r.gender === 'Female');
      setSelectedIndices(new Set(matches.map(r => r.rawIndex)));
    } else if (preset === '15_and_below') {
      newGender = 'all';
      newAge = '15 and Below';
      const matches = parsedRows.filter(r =>
        (r.ageCategory || (r.age <= 15 ? '15 and Below' : 'Above 15')) === '15 and Below'
      );
      setSelectedIndices(new Set(matches.map(r => r.rawIndex)));
    } else if (preset === 'males_15_and_below') {
      newGender = 'Male';
      newAge = '15 and Below';
      const matches = parsedRows.filter(r =>
        (r.gender || 'Male') === 'Male' &&
        (r.ageCategory || (r.age <= 15 ? '15 and Below' : 'Above 15')) === '15 and Below'
      );
      setSelectedIndices(new Set(matches.map(r => r.rawIndex)));
    } else if (preset === 'females_above_15') {
      newGender = 'Female';
      newAge = 'Above 15';
      const matches = parsedRows.filter(r =>
        r.gender === 'Female' &&
        (r.ageCategory || (r.age <= 15 ? '15 and Below' : 'Above 15')) === 'Above 15'
      );
      setSelectedIndices(new Set(matches.map(r => r.rawIndex)));
    } else if (preset === 'females_15_and_below') {
      newGender = 'Female';
      newAge = '15 and Below';
      const matches = parsedRows.filter(r =>
        r.gender === 'Female' &&
        (r.ageCategory || (r.age <= 15 ? '15 and Below' : 'Above 15')) === '15 and Below'
      );
      setSelectedIndices(new Set(matches.map(r => r.rawIndex)));
    }

    setGenderFilter(newGender);
    setAgeGroupFilter(newAge);
  };

  // Pre-calculated stats for segregation presets
  const counts = useMemo(() => {
    let males = 0;
    let females = 0;
    let above15 = 0;
    let below15 = 0;
    let malesAbove15 = 0;
    let malesBelow15 = 0;
    let femalesAbove15 = 0;
    let femalesBelow15 = 0;

    parsedRows.forEach(r => {
      const g = r.gender || 'Male';
      const a = r.ageCategory || (r.age <= 15 ? '15 and Below' : 'Above 15');

      if (g === 'Male') males++;
      if (g === 'Female') females++;
      if (a === 'Above 15') above15++;
      if (a === '15 and Below') below15++;

      if (g === 'Male' && a === 'Above 15') malesAbove15++;
      if (g === 'Male' && a === '15 and Below') malesBelow15++;
      if (g === 'Female' && a === 'Above 15') femalesAbove15++;
      if (g === 'Female' && a === '15 and Below') femalesBelow15++;
    });

    return {
      all: parsedRows.length,
      males,
      females,
      above15,
      below15,
      malesAbove15,
      malesBelow15,
      femalesAbove15,
      femalesBelow15,
    };
  }, [parsedRows]);

  // Filtered rows for the table view
  const filteredRows = useMemo(() => {
    return parsedRows.filter(row => {
      const effectiveGender = row.gender || 'Male';
      const effectiveAge = row.ageCategory || (row.age <= 15 ? '15 and Below' : 'Above 15');

      if (genderFilter !== 'all' && effectiveGender !== genderFilter) return false;
      if (ageGroupFilter !== 'all' && effectiveAge !== ageGroupFilter) return false;
      if (roleFilter !== 'all' && row.role !== roleFilter) return false;

      if (gradeFilter !== 'all') {
        if (gradeFilter === 'Captains') {
          if (!row.isCaptain) return false;
        } else if (gradeFilter === 'ViceCaptains') {
          if (!row.isViceCaptain) return false;
        } else if (gradeFilter === 'Sponsored') {
          if (!row.isSponsored && !row.sponsorTag?.trim()) return false;
        } else if (row.grade !== gradeFilter) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = row.name.toLowerCase().includes(q);
        const descMatch = (row.description || '').toLowerCase().includes(q);
        const sponsorMatch = (row.sponsorTag || '').toLowerCase().includes(q);
        if (!nameMatch && !descMatch && !sponsorMatch) return false;
      }

      return true;
    });
  }, [parsedRows, genderFilter, ageGroupFilter, roleFilter, gradeFilter, searchQuery]);

  // Selected rows to be imported
  const selectedRowsToImport = useMemo(() => {
    return parsedRows.filter(r => selectedIndices.has(r.rawIndex));
  }, [parsedRows, selectedIndices]);

  const totalErrorsInSelected = useMemo(() => {
    return selectedRowsToImport.reduce((acc, r) => acc + r.errors.length, 0);
  }, [selectedRowsToImport]);

  // Selection toggle helpers
  const toggleSelectRow = (rawIndex: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(rawIndex)) {
        next.delete(rawIndex);
      } else {
        next.add(rawIndex);
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      filteredRows.forEach(r => next.add(r.rawIndex));
      return next;
    });
  };

  const deselectAllVisible = () => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      filteredRows.forEach(r => next.delete(r.rawIndex));
      return next;
    });
  };

  const allVisibleSelected = filteredRows.length > 0 && filteredRows.every(r => selectedIndices.has(r.rawIndex));
  const someVisibleSelected = filteredRows.some(r => selectedIndices.has(r.rawIndex));

  const toggleMasterCheckbox = () => {
    if (allVisibleSelected) {
      deselectAllVisible();
    } else {
      selectAllVisible();
    }
  };

  const handleCommitImport = () => {
    if (selectedRowsToImport.length === 0) {
      alert('Please select at least one player to import.');
      return;
    }

    if (totalErrorsInSelected > 0) {
      alert(`Please fix the ${totalErrorsInSelected} validation error(s) in your selected players before importing.`);
      return;
    }

    importPlayers(selectedRowsToImport, replaceExisting);
    setImportSuccessMessage(
      `Successfully imported ${selectedRowsToImport.length} player${
        selectedRowsToImport.length === 1 ? '' : 's'
      } into the tournament database!`
    );
    setParsedRows([]);
    setSelectedIndices(new Set());
    setFileName('');
  };

  // Automatic Grade calculation based on cricket statistics
  const handleAutoGradeFromStats = () => {
    setParsedRows(prev =>
      prev.map(r => {
        const stats = {
          runs: r.runs,
          average: r.average,
          strikeRate: r.strikeRate,
          fifties: r.fifties,
          hundreds: r.hundreds,
          wickets: r.wickets,
          bowlingAverage: r.bowlingAverage,
          economyRate: r.economyRate,
          catches: r.catches,
          stumpings: r.stumpings,
        };
        const rec = calculateRecommendedGrade(stats, r.role, r.isCaptain, r.isViceCaptain);
        let newBp = gradeBasePrices.gradeC;
        if (rec.grade === 'A+') newBp = gradeBasePrices.gradeAPlus || 7000;
        else if (rec.grade === 'A') newBp = gradeBasePrices.gradeA || 5000;
        else if (rec.grade === 'B') newBp = gradeBasePrices.gradeB || 3000;
        else newBp = gradeBasePrices.gradeC || 1000;

        return {
          ...r,
          grade: rec.grade,
          gradeReason: rec.reason,
          basePrice: newBp,
        };
      })
    );
  };

  // Real CricHeroes stats fetch based on account / profile link (Requirement 1)
  const handleBulkStatsFetch = async () => {
    if (parsedRows.length === 0) return;

    // Check which rows have a CricHeroes profile link
    const rowsWithLinks = parsedRows.filter(
      r => r.cricheroesProfileUrl && r.cricheroesProfileUrl.trim().length > 0
    );

    if (rowsWithLinks.length === 0) {
      alert(
        'No CricHeroes account links found in the imported roster.\n\nPlease ensure your Excel file includes a "CricHeroes Profile" column with valid profile links (e.g. https://chshare.link/... or cricheroes.in/...) before fetching stats.'
      );
      return;
    }

    setIsFetchingStats(true);
    setFetchProgress(10);

    let successCount = 0;
    let failCount = 0;

    const updatedRows = [...parsedRows];

    for (let i = 0; i < updatedRows.length; i++) {
      const r = updatedRows[i];
      const link = r.cricheroesProfileUrl?.trim();

      if (link && (link.includes('chshare.link') || link.includes('cricheroes.') || link.includes('cricheroes/'))) {
        try {
          const resp = await fetch('/api/fetch-cricheroes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urlOrId: link }),
          });

          const data = await resp.json();
          if (resp.ok && data.success && data.html) {
            const parsed = parseCricHeroesHtml(data.html);
            const pStats = parsed.player.stats;

            const rec = calculateRecommendedGrade(pStats, r.role, r.isCaptain, r.isViceCaptain);
            let newBp = gradeBasePrices.gradeC;
            if (rec.grade === 'A+') newBp = gradeBasePrices.gradeAPlus || 7000;
            else if (rec.grade === 'A') newBp = gradeBasePrices.gradeA || 5000;
            else if (rec.grade === 'B') newBp = gradeBasePrices.gradeB || 3000;
            else newBp = gradeBasePrices.gradeC || 1000;

            updatedRows[i] = {
              ...r,
              matches: pStats.matches || r.matches,
              runs: pStats.runs || r.runs,
              average: pStats.average || r.average,
              strikeRate: pStats.strikeRate || r.strikeRate,
              highestScore: pStats.highestScore || r.highestScore,
              fifties: pStats.fifties || r.fifties,
              hundreds: pStats.hundreds || r.hundreds,
              wickets: pStats.wickets || r.wickets,
              bowlingAverage: pStats.bowlingAverage || r.bowlingAverage,
              economyRate: pStats.economyRate || r.economyRate,
              bestBowling: pStats.bestBowling || r.bestBowling,
              catches: pStats.catches || r.catches,
              stumpings: pStats.stumpings || r.stumpings,
              photo: r.photo || (parsed.player.photo ? normalizePhotoUrl(parsed.player.photo) : undefined),
              grade: rec.grade,
              gradeReason: `CricHeroes Official: ${rec.reason}`,
              basePrice: newBp,
            };
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }

      setFetchProgress(Math.round(((i + 1) / updatedRows.length) * 100));
    }

    setParsedRows(updatedRows);
    setIsFetchingStats(false);
    setFetchProgress(0);

    alert(
      `CricHeroes Bulk Fetch Finished!\n• Successfully fetched stats for: ${successCount} player(s)\n• Failed or invalid profile links: ${failCount} player(s)`
    );
  };

  const handleRunAiAnalysis = () => {
    setParsedRows(prev =>
      prev.map(r => {
        const aiResult = analyzePlayerGradeWithAI(r.description, r.experience, r.isCaptain ? 'yes' : '', r.age);
        const defaultPrice =
          aiResult.grade === 'A+'
            ? gradeBasePrices.gradeAPlus || 7000
            : aiResult.grade === 'A'
            ? gradeBasePrices.gradeA || 5000
            : aiResult.grade === 'B'
            ? gradeBasePrices.gradeB || 3000
            : gradeBasePrices.gradeC || 1000;
        const newBasePrice = r.basePrice || defaultPrice;
        return {
          ...r,
          grade: aiResult.grade,
          gradeReason: aiResult.reason,
          basePrice: newBasePrice,
        };
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            <span>Import & Segregate Players from Excel</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload tournament spreadsheets (.xlsx, .csv). Includes automatic grade calculation, CricHeroes bulk stats fetching, player photos, auction sequence orders, and captain/sponsor tags.
          </p>
        </div>

        <button
          onClick={generateSampleExcelTemplate}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all shadow flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-4 h-4 text-slate-400" />
          <span>Download Sample Template</span>
        </button>
      </div>

      {/* Success Notification */}
      {importSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{importSuccessMessage}</span>
          </div>
          <button
            onClick={onNavigateToPlayers}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 shadow-md hover:scale-105 transition-all cursor-pointer"
          >
            <span>View Players Database</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Upload Zone */}
      <div className="p-8 rounded-3xl bg-slate-900/80 border-2 border-dashed border-slate-700 hover:border-amber-500/80 transition-all text-center space-y-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".xlsx, .xls, .csv"
          className="hidden"
        />

        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
          <Upload className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-base font-bold text-white">
            {fileName ? `Loaded Spreadsheet: ${fileName}` : 'Choose an Excel (.xlsx, .xls) or CSV file'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
            Upload any player registration sheet with stats, photos, captains, or sponsors.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center gap-2 hover:scale-105 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>{fileName ? 'Choose Another File' : 'Browse Files'}</span>
          </button>
          {parsedRows.length > 0 && (
            <button
              onClick={handleClearExcelSheet}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Clear Sheet</span>
            </button>
          )}
        </div>
      </div>

      {/* Segregation & Filter Hub */}
      {parsedRows.length > 0 && (
        <div className="space-y-4">
          {/* Quick Segregation Presets */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Quick Tournament Segregation Presets
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Click a preset to instantly filter and select players for that tournament category:
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
              {/* Preset 1: Males Above 15 */}
              <button
                onClick={() => applyPreset('males_above_15')}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  activePreset === 'males_above_15'
                    ? 'bg-sky-500/20 border-sky-500 text-white shadow-lg shadow-sky-500/10 ring-1 ring-sky-500'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-base">🏏</span>
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-xs font-black font-mono border border-sky-500/30">
                    {counts.malesAbove15}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-black text-sky-400 leading-tight">Men (Above 15)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Senior Male</div>
                </div>
              </button>

              {/* Preset 2: All Females */}
              <button
                onClick={() => applyPreset('females')}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  activePreset === 'females'
                    ? 'bg-pink-500/20 border-pink-500 text-white shadow-lg shadow-pink-500/10 ring-1 ring-pink-500'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-base">👩</span>
                  <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-xs font-black font-mono border border-pink-500/30">
                    {counts.females}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-black text-pink-400 leading-tight">All Females</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Women's League</div>
                </div>
              </button>

              {/* Preset 3: 15 & Below Juniors */}
              <button
                onClick={() => applyPreset('15_and_below')}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  activePreset === '15_and_below'
                    ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-base">🧒</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black font-mono border border-emerald-500/30">
                    {counts.below15}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-black text-emerald-400 leading-tight">15 & Below (Juniors)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Junior Players</div>
                </div>
              </button>

              {/* Preset 4: Boys 15 & Below */}
              <button
                onClick={() => applyPreset('males_15_and_below')}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  activePreset === 'males_15_and_below'
                    ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-base">👦</span>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-black font-mono border border-cyan-500/30">
                    {counts.malesBelow15}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-black text-cyan-400 leading-tight">Junior Boys</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Boys 15 & Below</div>
                </div>
              </button>

              {/* Preset 5: Women Above 15 */}
              <button
                onClick={() => applyPreset('females_above_15')}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  activePreset === 'females_above_15'
                    ? 'bg-purple-500/20 border-purple-500 text-white shadow-lg shadow-purple-500/10 ring-1 ring-purple-500'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-base">🌸</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-black font-mono border border-purple-500/30">
                    {counts.femalesAbove15}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-black text-purple-400 leading-tight">Women (Above 15)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Senior Women</div>
                </div>
              </button>

              {/* Preset 6: Girls 15 & Below */}
              <button
                onClick={() => applyPreset('females_15_and_below')}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  activePreset === 'females_15_and_below'
                    ? 'bg-rose-500/20 border-rose-500 text-white shadow-lg shadow-rose-500/10 ring-1 ring-rose-500'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-base">👧</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-black font-mono border border-rose-500/30">
                    {counts.femalesBelow15}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-black text-rose-400 leading-tight">Junior Girls</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Girls 15 & Below</div>
                </div>
              </button>

              {/* Preset 7: All Players */}
              <button
                onClick={() => applyPreset('all')}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  activePreset === 'all'
                    ? 'bg-amber-500/20 border-amber-500 text-white shadow-lg shadow-amber-500/10 ring-1 ring-amber-500'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-base">✨</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black font-mono border border-amber-500/30">
                    {counts.all}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-black text-amber-400 leading-tight">All Players</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Entire Sheet</div>
                </div>
              </button>
            </div>
          </div>

          {/* Granular Filter & Search Bar with Grade Filter */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search name, description, sponsor..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Grade Filter (Requirement 14) */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[11px] font-medium">Grade:</span>
                <select
                  value={gradeFilter}
                  onChange={e => setGradeFilter(e.target.value as GradeFilterType)}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Grades</option>
                  <option value="A+">👑 Grade A+ (Captains / Marquee)</option>
                  <option value="A">⭐ Grade A (Elite)</option>
                  <option value="B">⚡ Grade B (Core Squad)</option>
                  <option value="C">🌱 Grade C (Developing)</option>
                  <option value="Captains">👑 Captains Only</option>
                  <option value="ViceCaptains">⭐ Vice Captains Only</option>
                  <option value="Sponsored">🏷️ Sponsored Players Only</option>
                </select>
              </div>

              {/* Gender Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[11px] font-medium">Gender:</span>
                <select
                  value={genderFilter}
                  onChange={e => {
                    setGenderFilter(e.target.value as any);
                    setActivePreset('custom');
                  }}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-bold focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Genders ({counts.all})</option>
                  <option value="Male">♂ Male Only ({counts.males})</option>
                  <option value="Female">♀ Female Only ({counts.females})</option>
                </select>
              </div>

              {/* Age Group Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[11px] font-medium">Age Group:</span>
                <select
                  value={ageGroupFilter}
                  onChange={e => {
                    setAgeGroupFilter(e.target.value as any);
                    setActivePreset('custom');
                  }}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-bold focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Age Groups ({counts.all})</option>
                  <option value="Above 15">Above 15 ({counts.above15})</option>
                  <option value="15 and Below">15 and Below ({counts.below15})</option>
                </select>
              </div>

              {/* Skill Role Filter (strictly 3 roles) */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[11px] font-medium">Role:</span>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-bold focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Roles</option>
                  <option value="Batsman">🏏 Batsmen</option>
                  <option value="Bowler">🎯 Bowlers</option>
                  <option value="Wicketkeeper">🧤 Wicketkeepers</option>
                </select>
              </div>

              {/* Reset Filters */}
              {(genderFilter !== 'all' || ageGroupFilter !== 'all' || roleFilter !== 'all' || gradeFilter !== 'all' || searchQuery) && (
                <button
                  onClick={() => {
                    setGenderFilter('all');
                    setAgeGroupFilter('all');
                    setRoleFilter('all');
                    setGradeFilter('all');
                    setSearchQuery('');
                    setActivePreset('all');
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                  title="Reset all filters to show all players"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            {/* Smart Actions: Auto-Grade from Stats & Bulk CricHeroes Fetch */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoGradeFromStats}
                title="Automatically calculate Grade (A+, A, B, C) and Base Prices from player stats, captains, and vice captains"
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-Grade from Stats</span>
              </button>

              <button
                onClick={handleBulkStatsFetch}
                disabled={isFetchingStats}
                title="Fetch bulk tournament statistics from CricHeroes for all rows"
                className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-red-400" />
                <span>{isFetchingStats ? `Fetching (${fetchProgress}%)` : 'Fetch CricHeroes Stats'}</span>
              </button>
            </div>
          </div>

          {/* Action Bar & Stats Summary */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            {/* Left: Summary and Selection Badges */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-white text-sm">
                Showing {filteredRows.length} of {parsedRows.length} Players
              </span>

              {/* Selected for Import Badge */}
              <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{selectedRowsToImport.length} Selected for Import</span>
                </span>

                {selectedRowsToImport.length < parsedRows.length && (
                  <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
                    {parsedRows.length - selectedRowsToImport.length} Excluded
                  </span>
                )}
              </div>

              {/* Selection Helper Buttons */}
              <div className="flex items-center gap-1.5 pl-1 border-l border-slate-800">
                <button
                  onClick={selectAllVisible}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-all cursor-pointer"
                  title="Select all currently visible filtered rows"
                >
                  Select All Visible ({filteredRows.length})
                </button>
                <button
                  onClick={deselectAllVisible}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-bold transition-all cursor-pointer"
                  title="Deselect all currently visible filtered rows"
                >
                  Deselect Visible
                </button>
              </div>

              {/* Error Flags */}
              {totalErrorsInSelected > 0 ? (
                <span className="px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {totalErrorsInSelected} Errors in selection
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Selection Valid
                </span>
              )}
            </div>

            {/* Right: Replace checkbox and Commit Button */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={e => setReplaceExisting(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500"
                />
                <span>Replace existing players</span>
              </label>

              <button
                onClick={handleCommitImport}
                disabled={selectedRowsToImport.length === 0 || totalErrorsInSelected > 0}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg flex items-center gap-2 ${
                  selectedRowsToImport.length > 0 && totalErrorsInSelected === 0
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 active:scale-95 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>
                  {selectedRowsToImport.length === 0
                    ? 'Select Players to Import'
                    : `Import ${selectedRowsToImport.length} Selected Players`}
                </span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 shadow-xl max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800 select-none">
                <tr>
                  {/* Master Checkbox */}
                  <th className="p-3 w-10 text-center">
                    <button
                      onClick={toggleMasterCheckbox}
                      className="p-1 hover:text-white transition-colors"
                      title={allVisibleSelected ? 'Deselect all visible' : 'Select all visible'}
                    >
                      {allVisibleSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : someVisibleSelected ? (
                        <Square className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                  </th>
                  <th className="p-3">Lot #</th>
                  <th className="p-3">Photo</th>
                  <th className="p-3">Player Name *</th>
                  <th className="p-3">Primary Skill *</th>
                  <th className="p-3">Leadership / Sponsor</th>
                  <th className="p-3">Age Group</th>
                  <th className="p-3">Gender</th>
                  <th className="p-3">Grade</th>
                  <th className="p-3">Base Price (pts)</th>
                  <th className="p-3">Runs</th>
                  <th className="p-3">Avg</th>
                  <th className="p-3">SR</th>
                  <th className="p-3">Wkts</th>
                  <th className="p-3">Econ</th>
                  <th className="p-3 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/70 font-mono">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="p-12 text-center text-slate-400 font-sans">
                      <Users className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
                      <p className="font-bold text-sm text-slate-300">No players match the current filters</p>
                      <p className="text-xs text-slate-500 mt-1">Try selecting another preset or resetting your filters above.</p>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => {
                    const isSelected = selectedIndices.has(row.rawIndex);
                    return (
                      <tr
                        key={row.rawIndex}
                        className={`transition-colors ${
                          row.errors.length > 0
                            ? 'bg-rose-950/25'
                            : isSelected
                            ? 'hover:bg-slate-800/60 bg-slate-900/90'
                            : 'opacity-40 hover:opacity-75 bg-slate-950/40'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-3 text-center">
                          <button
                            onClick={() => toggleSelectRow(row.rawIndex)}
                            className="p-1 text-slate-400 hover:text-white transition-colors"
                            title={isSelected ? 'Exclude from import' : 'Include in import'}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600" />
                            )}
                          </button>
                        </td>

                        {/* Auction Order (Lot #) */}
                        <td className="p-3">
                          <input
                            type="number"
                            min="1"
                            value={row.auctionOrder || idx + 1}
                            onChange={e => handleUpdateRowField(row.rawIndex, 'auctionOrder', Number(e.target.value))}
                            className="w-12 px-1.5 py-1 bg-slate-950 border border-slate-800 rounded text-center text-slate-300 font-bold"
                          />
                        </td>

                        {/* Photo Thumbnail with Interactive Preview & Quick Edit */}
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => handleEditPhotoPrompt(row.rawIndex, row.photo)}
                            title="Click to view, update, replace, or remove photo"
                            className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 hover:border-amber-400 flex items-center justify-center overflow-hidden shrink-0 transition-colors group relative cursor-pointer shadow-sm"
                          >
                            {row.photo ? (
                              <img
                                src={row.photo}
                                alt={row.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <span className="text-[10px] text-slate-500 font-bold group-hover:text-amber-400">
                                {row.name ? row.name.charAt(0) : '?'}
                              </span>
                            )}
                          </button>
                        </td>

                        {/* Name */}
                        <td className="p-3 font-sans">
                          <input
                            type="text"
                            value={row.name}
                            onChange={e => handleUpdateRowField(row.rawIndex, 'name', e.target.value)}
                            className={`px-2 py-1 bg-slate-950 border rounded text-xs text-white focus:outline-none focus:border-amber-500 ${
                              !row.name.trim() ? 'border-rose-500 bg-rose-950/40' : 'border-slate-800'
                            }`}
                          />
                        </td>

                        {/* Primary Skill (3 Roles Only) */}
                        <td className="p-3">
                          <select
                            value={row.role}
                            onChange={e => handleUpdateRowField(row.rawIndex, 'role', e.target.value as PlayerRole)}
                            className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500"
                          >
                            <option value="Batsman">🏏 Batsman</option>
                            <option value="Bowler">🎯 Bowler</option>
                            <option value="Wicketkeeper">🧤 Wicketkeeper</option>
                          </select>
                        </td>

                        {/* Leadership & Sponsor Tags */}
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            {/* Captain Toggle */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = !row.isCaptain;
                                handleUpdateRowField(row.rawIndex, 'isCaptain', nextVal);
                                if (nextVal) {
                                  handleUpdateRowField(row.rawIndex, 'isViceCaptain', false);
                                  handleUpdateRowField(row.rawIndex, 'grade', 'A+');
                                  handleUpdateRowField(row.rawIndex, 'basePrice', gradeBasePrices.gradeAPlus || 7000);
                                }
                              }}
                              className={`p-1 rounded text-[10px] font-bold flex items-center gap-0.5 border ${
                                row.isCaptain
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                                  : 'bg-slate-950 text-slate-600 border-slate-800 hover:text-slate-400'
                              }`}
                              title="Toggle Captain (Grade A+)"
                            >
                              <Crown className="w-3 h-3" />
                              <span>C</span>
                            </button>

                            {/* Vice Captain Toggle */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = !row.isViceCaptain;
                                handleUpdateRowField(row.rawIndex, 'isViceCaptain', nextVal);
                                if (nextVal) {
                                  handleUpdateRowField(row.rawIndex, 'isCaptain', false);
                                  handleUpdateRowField(row.rawIndex, 'grade', 'A');
                                  handleUpdateRowField(row.rawIndex, 'basePrice', gradeBasePrices.gradeA || 5000);
                                }
                              }}
                              className={`p-1 rounded text-[10px] font-bold flex items-center gap-0.5 border ${
                                row.isViceCaptain
                                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                                  : 'bg-slate-950 text-slate-600 border-slate-800 hover:text-slate-400'
                              }`}
                              title="Toggle Vice Captain (Grade A)"
                            >
                              <Star className="w-3 h-3" />
                              <span>VC</span>
                            </button>

                            {/* Sponsor Tag */}
                            <input
                              type="text"
                              value={row.sponsorTag || ''}
                              placeholder="Sponsor..."
                              onChange={e => {
                                const tag = e.target.value;
                                handleUpdateRowField(row.rawIndex, 'sponsorTag', tag);
                                handleUpdateRowField(row.rawIndex, 'isSponsored', Boolean(tag.trim()));
                              }}
                              className="w-20 px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-[10px] text-emerald-300"
                            />
                          </div>
                        </td>

                        {/* Age Group */}
                        <td className="p-3">
                          <select
                            value={row.ageCategory || (row.age <= 15 ? '15 and Below' : 'Above 15')}
                            onChange={e => {
                              const cat = e.target.value;
                              handleUpdateRowField(row.rawIndex, 'ageCategory', cat);
                              handleUpdateRowField(row.rawIndex, 'age', cat === '15 and Below' ? 14 : 20);
                            }}
                            className={`px-2 py-1 bg-slate-950 border rounded text-xs font-bold ${
                              (row.ageCategory || '').includes('Below') || row.age <= 15
                                ? 'border-cyan-500/50 text-cyan-300'
                                : 'border-slate-800 text-slate-300'
                            }`}
                          >
                            <option value="Above 15">Above 15</option>
                            <option value="15 and Below">15 and Below</option>
                          </select>
                        </td>

                        {/* Gender */}
                        <td className="p-3">
                          <select
                            value={row.gender || 'Male'}
                            onChange={e => handleUpdateRowField(row.rawIndex, 'gender', e.target.value)}
                            className={`px-2 py-1 bg-slate-950 border rounded text-xs font-bold ${
                              row.gender === 'Female'
                                ? 'border-pink-500/50 text-pink-300'
                                : 'border-slate-800 text-sky-300'
                            }`}
                          >
                            <option value="Male">♂ Male</option>
                            <option value="Female">♀ Female</option>
                          </select>
                        </td>

                        {/* Grade (Includes A+) */}
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            <select
                              value={row.grade}
                              onChange={e => {
                                const newGrade = e.target.value as PlayerGrade;
                                handleUpdateRowField(row.rawIndex, 'grade', newGrade);
                                handleUpdateRowField(row.rawIndex, 'gradeReason', 'Manually adjusted');
                                // Vice Captain MUST be Grade A
                                if (newGrade !== 'A' && row.isViceCaptain) {
                                  handleUpdateRowField(row.rawIndex, 'isViceCaptain', false);
                                }
                                // Captain MUST be Grade A+
                                if (newGrade !== 'A+' && row.isCaptain) {
                                  handleUpdateRowField(row.rawIndex, 'isCaptain', false);
                                }
                                const newBp =
                                  newGrade === 'A+'
                                    ? gradeBasePrices.gradeAPlus || 7000
                                    : newGrade === 'A'
                                    ? gradeBasePrices.gradeA || 5000
                                    : newGrade === 'B'
                                    ? gradeBasePrices.gradeB || 3000
                                    : gradeBasePrices.gradeC || 1000;
                                handleUpdateRowField(row.rawIndex, 'basePrice', newBp);
                              }}
                              className={`px-2 py-1 bg-slate-950 border rounded text-xs font-bold ${
                                row.grade === 'A+'
                                  ? 'border-yellow-400 text-yellow-300'
                                  : row.grade === 'A'
                                  ? 'border-amber-500/60 text-amber-300'
                                  : row.grade === 'B'
                                  ? 'border-blue-500/60 text-blue-300'
                                  : 'border-slate-700 text-slate-300'
                              }`}
                            >
                              <option value="A+">👑 Grade A+</option>
                              <option value="A">⭐ Grade A</option>
                              <option value="B">⚡ Grade B</option>
                              <option value="C">🌱 Grade C</option>
                            </select>
                            {row.gradeReason && (
                              <span
                                className="text-[9px] text-slate-400 truncate max-w-[130px] inline-block font-sans"
                                title={row.gradeReason}
                              >
                                {row.gradeReason}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Base Price */}
                        <td className="p-3">
                          <input
                            type="number"
                            value={row.basePrice}
                            onChange={e => handleUpdateRowField(row.rawIndex, 'basePrice', Number(e.target.value))}
                            className="w-20 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-amber-400 font-bold"
                          />
                        </td>

                        {/* Runs */}
                        <td className="p-3">
                          <input
                            type="number"
                            value={row.runs}
                            onChange={e => handleUpdateRowField(row.rawIndex, 'runs', Number(e.target.value))}
                            className="w-16 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                          />
                        </td>

                        {/* Average */}
                        <td className="p-3">
                          <input
                            type="number"
                            step="0.1"
                            value={row.average}
                            onChange={e => handleUpdateRowField(row.rawIndex, 'average', Number(e.target.value))}
                            className="w-16 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                          />
                        </td>

                        {/* SR */}
                        <td className="p-3">
                          <input
                            type="number"
                            step="0.1"
                            value={row.strikeRate}
                            onChange={e => handleUpdateRowField(row.rawIndex, 'strikeRate', Number(e.target.value))}
                            className="w-16 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-sky-400 font-bold"
                          />
                        </td>

                        {/* Wickets */}
                        <td className="p-3">
                          <input
                            type="number"
                            value={row.wickets}
                            onChange={e => handleUpdateRowField(row.rawIndex, 'wickets', Number(e.target.value))}
                            className="w-14 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-emerald-400 font-bold"
                          />
                        </td>

                        {/* Economy */}
                        <td className="p-3">
                          <input
                            type="number"
                            step="0.01"
                            value={row.economyRate}
                            onChange={e => handleUpdateRowField(row.rawIndex, 'economyRate', Number(e.target.value))}
                            className="w-16 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                          />
                        </td>

                        {/* Delete row */}
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteRow(row.rawIndex)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Remove this player from list"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
