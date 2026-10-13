import React, { useState, useRef, useMemo } from 'react';
import { useAuction } from '../context/AuctionContext';
import { parseExcelOrCsv, generateSampleExcelTemplate, ParsedPlayerRow, analyzePlayerGradeWithAI } from '../utils/excelParser';
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
} from 'lucide-react';

interface ExcelImportPageProps {
  onNavigateToPlayers: () => void;
}

const EXCEL_SESSION_KEY = 'cricket_auction_excel_session';

interface SavedExcelSession {
  parsedRows: ParsedPlayerRow[];
  selectedIndices: number[];
  fileName: string;
  activePreset: PresetType;
  genderFilter: 'all' | 'Male' | 'Female';
  ageGroupFilter: 'all' | 'Above 14' | 'Below 14';
  roleFilter: 'all' | PlayerRole;
  gradeFilter: 'all' | PlayerGrade;
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
  | 'males_above_14'
  | 'females'
  | 'below_14'
  | 'males_below_14'
  | 'females_above_14'
  | 'females_below_14'
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

  // Filter states
  const [activePreset, setActivePreset] = useState<PresetType>(initialExcelSession?.activePreset || 'all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'Male' | 'Female'>(initialExcelSession?.genderFilter || 'all');
  const [ageGroupFilter, setAgeGroupFilter] = useState<'all' | 'Above 14' | 'Below 14'>(initialExcelSession?.ageGroupFilter || 'all');
  const [roleFilter, setRoleFilter] = useState<'all' | PlayerRole>(initialExcelSession?.roleFilter || 'all');
  const [gradeFilter, setGradeFilter] = useState<'all' | PlayerGrade>(initialExcelSession?.gradeFilter || 'all');
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

  const gradeBasePrices = rules.gradeBasePrices || { gradeA: 5000, gradeB: 3000, gradeC: 1000 };

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
    let newAge: 'all' | 'Above 14' | 'Below 14' = 'all';

    if (preset === 'all') {
      newGender = 'all';
      newAge = 'all';
      setSelectedIndices(new Set(parsedRows.map(r => r.rawIndex)));
    } else if (preset === 'males_above_14') {
      newGender = 'Male';
      newAge = 'Above 14';
      const matches = parsedRows.filter(r =>
        (r.gender || 'Male') === 'Male' &&
        (r.ageCategory || (r.age <= 14 ? 'Below 14' : 'Above 14')) === 'Above 14'
      );
      setSelectedIndices(new Set(matches.map(r => r.rawIndex)));
    } else if (preset === 'females') {
      newGender = 'Female';
      newAge = 'all';
      const matches = parsedRows.filter(r => r.gender === 'Female');
      setSelectedIndices(new Set(matches.map(r => r.rawIndex)));
    } else if (preset === 'below_14') {
      newGender = 'all';
      newAge = 'Below 14';
      const matches = parsedRows.filter(r =>
        (r.ageCategory || (r.age <= 14 ? 'Below 14' : 'Above 14')) === 'Below 14'
      );
      setSelectedIndices(new Set(matches.map(r => r.rawIndex)));
    } else if (preset === 'males_below_14') {
      newGender = 'Male';
      newAge = 'Below 14';
      const matches = parsedRows.filter(r =>
        (r.gender || 'Male') === 'Male' &&
        (r.ageCategory || (r.age <= 14 ? 'Below 14' : 'Above 14')) === 'Below 14'
      );
      setSelectedIndices(new Set(matches.map(r => r.rawIndex)));
    } else if (preset === 'females_above_14') {
      newGender = 'Female';
      newAge = 'Above 14';
      const matches = parsedRows.filter(r =>
        r.gender === 'Female' &&
        (r.ageCategory || (r.age <= 14 ? 'Below 14' : 'Above 14')) === 'Above 14'
      );
      setSelectedIndices(new Set(matches.map(r => r.rawIndex)));
    } else if (preset === 'females_below_14') {
      newGender = 'Female';
      newAge = 'Below 14';
      const matches = parsedRows.filter(r =>
        r.gender === 'Female' &&
        (r.ageCategory || (r.age <= 14 ? 'Below 14' : 'Above 14')) === 'Below 14'
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
    let above14 = 0;
    let below14 = 0;
    let malesAbove14 = 0;
    let malesBelow14 = 0;
    let femalesAbove14 = 0;
    let femalesBelow14 = 0;

    parsedRows.forEach(r => {
      const g = r.gender || 'Male';
      const a = r.ageCategory || (r.age <= 14 ? 'Below 14' : 'Above 14');

      if (g === 'Male') males++;
      if (g === 'Female') females++;
      if (a === 'Above 14') above14++;
      if (a === 'Below 14') below14++;

      if (g === 'Male' && a === 'Above 14') malesAbove14++;
      if (g === 'Male' && a === 'Below 14') malesBelow14++;
      if (g === 'Female' && a === 'Above 14') femalesAbove14++;
      if (g === 'Female' && a === 'Below 14') femalesBelow14++;
    });

    return {
      all: parsedRows.length,
      males,
      females,
      above14,
      below14,
      malesAbove14,
      malesBelow14,
      femalesAbove14,
      femalesBelow14,
    };
  }, [parsedRows]);

  // Filtered rows for the table view
  const filteredRows = useMemo(() => {
    return parsedRows.filter(row => {
      const effectiveGender = row.gender || 'Male';
      const effectiveAge = row.ageCategory || (row.age <= 14 ? 'Below 14' : 'Above 14');

      if (genderFilter !== 'all' && effectiveGender !== genderFilter) return false;
      if (ageGroupFilter !== 'all' && effectiveAge !== ageGroupFilter) return false;
      if (roleFilter !== 'all' && row.role !== roleFilter) return false;
      if (gradeFilter !== 'all' && row.grade !== gradeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = row.name.toLowerCase().includes(q);
        const descMatch = (row.description || '').toLowerCase().includes(q);
        if (!nameMatch && !descMatch) return false;
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

  const totalWarningsInSelected = useMemo(() => {
    return selectedRowsToImport.reduce((acc, r) => acc + r.warnings.length, 0);
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

  const handleRunAiAnalysis = () => {
    setParsedRows(prev =>
      prev.map(r => {
        const aiResult = analyzePlayerGradeWithAI(r.description, r.experience, '', r.age);
        const defaultPrice =
          aiResult.grade === 'A'
            ? gradeBasePrices.gradeA
            : aiResult.grade === 'B'
            ? gradeBasePrices.gradeB
            : gradeBasePrices.gradeC;
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

  const gradeCountA = parsedRows.filter(r => r.grade === 'A').length;
  const gradeCountB = parsedRows.filter(r => r.grade === 'B').length;
  const gradeCountC = parsedRows.filter(r => r.grade === 'C').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            <span>Import & Segregate Players from Excel</span>
          </h1>
          <p className="text-xs text-slate-400">
            Upload tournament spreadsheets (.xlsx, .csv). Easily segregate by Men (Above 14), Women, or Juniors (Below 14) and import only the selected players into your auction!
          </p>
        </div>

        <button
          onClick={generateSampleExcelTemplate}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all shadow flex items-center gap-2 self-start sm:self-auto"
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
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 shadow-md hover:scale-105 transition-all"
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
            Upload any player registration sheet. You will be able to filter and select exactly which group (e.g. Males Above 14, Females, or Below 14) to add to the auction.
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
              {/* Preset 1: Males Above 14 */}
              <button
                onClick={() => applyPreset('males_above_14')}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  activePreset === 'males_above_14'
                    ? 'bg-sky-500/20 border-sky-500 text-white shadow-lg shadow-sky-500/10 ring-1 ring-sky-500'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-base">🏏</span>
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-xs font-black font-mono border border-sky-500/30">
                    {counts.malesAbove14}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-black text-sky-400 leading-tight">Men (Above 14)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Senior Male Category</div>
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
                  <div className="text-[10px] text-slate-400 mt-0.5">Women's Tournament</div>
                </div>
              </button>

              {/* Preset 3: Below 14 Juniors */}
              <button
                onClick={() => applyPreset('below_14')}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  activePreset === 'below_14'
                    ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-base">🧒</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black font-mono border border-emerald-500/30">
                    {counts.below14}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-black text-emerald-400 leading-tight">Below 14 (Juniors)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Under-14 Tournament</div>
                </div>
              </button>

              {/* Preset 4: Boys Below 14 */}
              <button
                onClick={() => applyPreset('males_below_14')}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  activePreset === 'males_below_14'
                    ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-base">👦</span>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-black font-mono border border-cyan-500/30">
                    {counts.malesBelow14}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-black text-cyan-400 leading-tight">Junior Boys</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Male Under-14</div>
                </div>
              </button>

              {/* Preset 5: Women Above 14 */}
              <button
                onClick={() => applyPreset('females_above_14')}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  activePreset === 'females_above_14'
                    ? 'bg-purple-500/20 border-purple-500 text-white shadow-lg shadow-purple-500/10 ring-1 ring-purple-500'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-base">🌸</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-black font-mono border border-purple-500/30">
                    {counts.femalesAbove14}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-black text-purple-400 leading-tight">Women (Above 14)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Senior Women</div>
                </div>
              </button>

              {/* Preset 6: Girls Below 14 */}
              <button
                onClick={() => applyPreset('females_below_14')}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  activePreset === 'females_below_14'
                    ? 'bg-rose-500/20 border-rose-500 text-white shadow-lg shadow-rose-500/10 ring-1 ring-rose-500'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-base">👧</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-black font-mono border border-rose-500/30">
                    {counts.femalesBelow14}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-black text-rose-400 leading-tight">Junior Girls</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Female Under-14</div>
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
                  <div className="text-[10px] text-slate-400 mt-0.5">Entire Spreadsheet</div>
                </div>
              </button>
            </div>
          </div>

          {/* Granular Filter & Search Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search name or description..."
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
                  <option value="Above 14">Above 14 ({counts.above14})</option>
                  <option value="Below 14">Below 14 ({counts.below14})</option>
                </select>
              </div>

              {/* Skill Role Filter */}
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
                  <option value="All-rounder">⚡ All-rounders</option>
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
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1 transition-all"
                  title="Reset all filters to show all players"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            {/* AI Re-Analyze Action */}
            <button
              onClick={handleRunAiAnalysis}
              title="Re-evaluate all player grades based on current descriptions using AI analysis"
              className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow"
            >
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Re-Analyze Grades</span>
            </button>
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
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-all"
                  title="Select all currently visible filtered rows"
                >
                  Select All Visible ({filteredRows.length})
                </button>
                <button
                  onClick={deselectAllVisible}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-bold transition-all"
                  title="Deselect all currently visible filtered rows"
                >
                  Deselect Visible
                </button>
              </div>

              {/* Error / Warning Flags for Selected Players */}
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
                  <th className="p-3">#</th>
                  <th className="p-3">Player Name *</th>
                  <th className="p-3">Primary Skill *</th>
                  <th className="p-3">Description (from Excel)</th>
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
                    <td colSpan={15} className="p-12 text-center text-slate-400 font-sans">
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

                        {/* Order Number */}
                        <td className="p-3 text-slate-500 font-bold">{idx + 1}</td>

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

                        {/* Primary Skill */}
                        <td className="p-3">
                          <select
                            value={row.role}
                            onChange={e => handleUpdateRowField(row.rawIndex, 'role', e.target.value as PlayerRole)}
                            className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500"
                          >
                            <option value="Batsman">🏏 Batsman</option>
                            <option value="Bowler">🎯 Bowler</option>
                            <option value="All-rounder">⚡ All-rounder</option>
                            <option value="Wicketkeeper">🧤 Wicketkeeper</option>
                          </select>
                        </td>

                        {/* Description from Excel */}
                        <td className="p-3 font-sans min-w-[220px]">
                          <input
                            type="text"
                            value={row.description}
                            onChange={e => handleUpdateRowField(row.rawIndex, 'description', e.target.value)}
                            placeholder="Player description / experience..."
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                            title={row.description}
                          />
                        </td>

                        {/* Age Group (Above 14 / Below 14) */}
                        <td className="p-3">
                          <select
                            value={row.ageCategory || (row.age <= 14 ? 'Below 14' : 'Above 14')}
                            onChange={e => {
                              const cat = e.target.value;
                              handleUpdateRowField(row.rawIndex, 'ageCategory', cat);
                              handleUpdateRowField(row.rawIndex, 'age', cat === 'Below 14' ? 13 : 20);
                            }}
                            className={`px-2 py-1 bg-slate-950 border rounded text-xs font-bold ${
                              (row.ageCategory || '').includes('Below') || row.age <= 14
                                ? 'border-cyan-500/50 text-cyan-300'
                                : 'border-slate-800 text-slate-300'
                            }`}
                          >
                            <option value="Above 14">Above 14</option>
                            <option value="Below 14">Below 14</option>
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

                        {/* Grade & AI Analysis Reason */}
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            <select
                              value={row.grade}
                              onChange={e => {
                                const newGrade = e.target.value as PlayerGrade;
                                handleUpdateRowField(row.rawIndex, 'grade', newGrade);
                                handleUpdateRowField(row.rawIndex, 'gradeReason', 'Manually adjusted');
                                const newBp =
                                  newGrade === 'A'
                                    ? gradeBasePrices.gradeA
                                    : newGrade === 'B'
                                    ? gradeBasePrices.gradeB
                                    : gradeBasePrices.gradeC;
                                handleUpdateRowField(row.rawIndex, 'basePrice', newBp);
                              }}
                              className={`px-2 py-1 bg-slate-950 border rounded text-xs font-bold ${
                                row.grade === 'A'
                                  ? 'border-amber-500/60 text-amber-300'
                                  : row.grade === 'B'
                                  ? 'border-blue-500/60 text-blue-300'
                                  : 'border-slate-700 text-slate-300'
                              }`}
                            >
                              <option value="A">⭐ Grade A</option>
                              <option value="B">⚡ Grade B</option>
                              <option value="C">🌱 Grade C</option>
                            </select>
                            {row.gradeReason && (
                              <span
                                className="text-[9px] text-slate-400 truncate max-w-[130px] inline-block font-sans"
                                title={row.gradeReason}
                              >
                                🤖 {row.gradeReason}
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
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
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
