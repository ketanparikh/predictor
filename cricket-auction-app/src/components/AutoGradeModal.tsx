import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Zap,
  Info,
  ArrowRight,
  SlidersHorizontal,
  Search
} from 'lucide-react';
import { Player, PlayerGrade } from '../types/auction';
import { useAuction } from '../context/AuctionContext';
import {
  autoGradeCohort,
  computeCohortStats,
  AutoGradeResult,
  CohortGradingSummary
} from '../utils/autoGrader';

interface AutoGradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

const GRADE_COLORS: Record<PlayerGrade, { bg: string; text: string; border: string; glow: string }> = {
  'A+': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/40', glow: 'shadow-amber-500/20' },
  'A': { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/40', glow: 'shadow-purple-500/20' },
  'B': { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/40', glow: 'shadow-blue-500/20' },
  'C': { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/40', glow: 'shadow-slate-500/10' },
};

export const AutoGradeModal: React.FC<AutoGradeModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { players, bulkUpdatePlayers, rules } = useAuction();

  // Settings
  const [fillMissingStats, setFillMissingStats] = useState<boolean>(true);
  const [updateBasePrices, setUpdateBasePrices] = useState<boolean>(true);
  const [preserveCaptains, setPreserveCaptains] = useState<boolean>(true);

  // Table filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'changed' | 'synthesized' | 'A+' | 'A' | 'B' | 'C'>('all');

  const gradePrices = useMemo(() => {
    return rules.gradeBasePrices || { gradeAPlus: 7000, gradeA: 5000, gradeB: 3000, gradeC: 1000 };
  }, [rules.gradeBasePrices]);

  // Compute cohort statistics
  const cohortStats = useMemo(() => {
    return computeCohortStats(players);
  }, [players]);

  // Compute cohort auto grade summary
  const cohortSummary: CohortGradingSummary | null = useMemo(() => {
    if (!players || players.length === 0) return null;
    return autoGradeCohort(players, gradePrices, {
      fillMissingStats,
      updateBasePrices,
      preserveCaptains
    });
  }, [players, gradePrices, fillMissingStats, updateBasePrices, preserveCaptains]);

  const results: AutoGradeResult[] = cohortSummary ? cohortSummary.results : [];

  // Filtered preview rows
  const filteredRows = useMemo(() => {
    return results.filter(item => {
      const p = item.player;
      // Search filter
      const matchesSearch = !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.role.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Type filter
      if (filterType === 'changed') {
        return item.oldGrade !== item.newGrade || item.oldBasePrice !== item.newBasePrice;
      }
      if (filterType === 'synthesized') {
        return item.statsFilled;
      }
      if (filterType === 'A+' || filterType === 'A' || filterType === 'B' || filterType === 'C') {
        return item.newGrade === filterType;
      }
      return true;
    });
  }, [results, searchQuery, filterType]);

  if (!isOpen) return null;

  const totalPlayers = cohortStats.totalPlayers;
  const benchmarkedCount = totalPlayers - cohortStats.playersWithStatsCount;
  const changedCount = cohortSummary ? cohortSummary.changedCount : 0;
  const gradeCounts = cohortSummary ? cohortSummary.gradeCounts : { 'A+': 0, 'A': 0, 'B': 0, 'C': 0 };

  const handleApply = () => {
    if (!cohortSummary) return;
    bulkUpdatePlayers(
      cohortSummary.gradedPlayers,
      `Auto-graded ${cohortSummary.gradedPlayers.length} participants using cohort benchmarking`
    );

    if (onSuccess) {
      onSuccess(
        `Successfully auto-graded ${cohortSummary.gradedPlayers.length} players (${cohortSummary.changedCount} grade updates applied)!`
      );
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Accent Top Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-purple-500 to-indigo-500" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-center justify-between gap-4 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-amber-500/30 flex items-center justify-center shadow-inner">
              <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Auto Grade Players
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono text-[11px] font-bold">
                  Cohort AI Grader
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluates every participant relative to peer tournament stats without arbitrary minimum cutoffs.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/70 hover:bg-slate-700/80 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Cohort Tournament Intelligence Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-lg space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Participant Pool Intelligence
                </span>
                <span className="text-[11px] text-slate-400">
                  ({totalPlayers} total players analyzed)
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-300">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  {cohortStats.playersWithStatsCount} with match stats
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Zap className="w-3 h-3" />
                  {benchmarkedCount} benchmarked
                </span>
              </div>
            </div>

            {/* Benchmark Medians Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                <div className="text-[10px] uppercase font-bold text-slate-400">Avg Matches</div>
                <div className="text-sm sm:text-base font-black text-white mt-0.5 font-mono">
                  {cohortStats.avgMatches.toFixed(1)}
                </div>
                <div className="text-[9px] text-slate-400">Max: {cohortStats.maxMatches}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                <div className="text-[10px] uppercase font-bold text-slate-400">Median Runs</div>
                <div className="text-sm sm:text-base font-black text-amber-400 mt-0.5 font-mono">
                  {cohortStats.medianRuns}
                </div>
                <div className="text-[9px] text-slate-400">Max: {cohortStats.maxRuns}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                <div className="text-[10px] uppercase font-bold text-slate-400">Median Wickets</div>
                <div className="text-sm sm:text-base font-black text-rose-400 mt-0.5 font-mono">
                  {cohortStats.medianWickets}
                </div>
                <div className="text-[9px] text-slate-400">Max: {cohortStats.maxWickets}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                <div className="text-[10px] uppercase font-bold text-slate-400">Avg Bat SR</div>
                <div className="text-sm sm:text-base font-black text-cyan-400 mt-0.5 font-mono">
                  {cohortStats.avgSr.toFixed(1)}
                </div>
                <div className="text-[9px] text-slate-400">Avg: {cohortStats.avgAvg.toFixed(1)}</div>
              </div>

              <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                <div className="text-[10px] uppercase font-bold text-slate-400">Avg Bowl Econ</div>
                <div className="text-sm sm:text-base font-black text-emerald-400 mt-0.5 font-mono">
                  {cohortStats.avgEcon > 0 ? cohortStats.avgEcon.toFixed(2) : '7.50'}
                </div>
                <div className="text-[9px] text-slate-400">rpo</div>
              </div>
            </div>
          </div>

          {/* Grader Configuration Options */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Grading Configuration & Tournament Options</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {/* Option 1: Benchmark Missing Stats */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={fillMissingStats}
                  onChange={e => setFillMissingStats(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-amber-500 focus:ring-amber-500/20 bg-slate-950 border-slate-700 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Synthesize Baseline Stats</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px]">Recommended</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Populate realistic stats for players with 0 or missing stats based on tournament participant averages.
                  </p>
                </div>
              </label>

              {/* Option 2: Update Base Prices */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={updateBasePrices}
                  onChange={e => setUpdateBasePrices(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-purple-500 focus:ring-purple-500/20 bg-slate-950 border-slate-700 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Sync Grade Base Prices</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Update player base prices automatically (A+: 7,000, A: 5,000, B: 3,000, C: 1,000) according to tournament rules.
                  </p>
                </div>
              </label>

              {/* Option 3: Preserve Captains */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={preserveCaptains}
                  onChange={e => setPreserveCaptains(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500/20 bg-slate-950 border-slate-700 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Preserve Team Captains</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Keep designated team captains as Grade A+ marquee tier leaders.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Grade Distribution Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['A+', 'A', 'B', 'C'] as PlayerGrade[]).map(grade => {
              const count = gradeCounts[grade] || 0;
              const pct = totalPlayers > 0 ? Math.round((count / totalPlayers) * 100) : 0;
              const style = GRADE_COLORS[grade];

              return (
                <div
                  key={grade}
                  onClick={() => setFilterType(filterType === grade ? 'all' : grade)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    filterType === grade
                      ? `${style.bg} ${style.border} ring-2 ring-amber-400/50 shadow-lg`
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-lg font-black text-xs ${style.bg} ${style.text} border ${style.border}`}>
                      Grade {grade}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {pct}%
                    </span>
                  </div>
                  <div className="mt-2 text-xl font-black text-white font-mono flex items-baseline gap-1.5">
                    <span>{count}</span>
                    <span className="text-xs text-slate-400 font-normal">players</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Preview List Header & Filter Controls */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Grading Preview ({filteredRows.length} of {totalPlayers} players)
                </h3>
                {changedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-semibold border border-amber-500/30">
                    {changedCount} will change grade
                  </span>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative w-48 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search preview..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Filter Mode Buttons */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      filterType === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterType('changed')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      filterType === 'changed' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Changed ({changedCount})
                  </button>
                  {fillMissingStats && (
                    <button
                      onClick={() => setFilterType('synthesized')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        filterType === 'synthesized' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Benchmarked ({cohortSummary ? cohortSummary.statsFilledCount : 0})
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Players Table / List */}
            <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/70 max-h-[380px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900/90 sticky top-0 z-10 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3 sm:px-4">Player & Role</th>
                    <th className="py-2.5 px-3 sm:px-4">Tournament Stats</th>
                    <th className="py-2.5 px-3 sm:px-4 text-center">Score</th>
                    <th className="py-2.5 px-3 sm:px-4 text-center">Current &rarr; Auto-Grade</th>
                    <th className="py-2.5 px-3 sm:px-4">Grading Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                        No players match the current search or filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map(item => {
                      const p = item.player;
                      const curStyle = GRADE_COLORS[item.oldGrade];
                      const recStyle = GRADE_COLORS[item.newGrade];
                      const isChanged = item.oldGrade !== item.newGrade || item.oldBasePrice !== item.newBasePrice;

                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-slate-900/60 transition-colors ${
                            isChanged ? 'bg-amber-500/5' : ''
                          }`}
                        >
                          {/* Player info */}
                          <td className="py-2.5 px-3 sm:px-4">
                            <div className="flex items-center gap-2.5">
                              {p.photo ? (
                                <img
                                  src={p.photo}
                                  alt={p.name}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">
                                  {p.name.slice(0, 1)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-white text-xs truncate flex items-center gap-1.5">
                                  <span>{p.name}</span>
                                  {p.isCaptain && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold text-[9px]">
                                      C
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">
                                  {p.role}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Stats */}
                          <td className="py-2.5 px-3 sm:px-4">
                            <div className="space-y-0.5">
                              <div className="text-[11px] text-slate-300 font-mono">
                                <span className="font-bold text-white">{p.stats.matches}</span> M &bull;{' '}
                                <span className="text-amber-400 font-bold">{p.stats.runs}</span> R &bull;{' '}
                                <span className="text-rose-400 font-bold">{p.stats.wickets}</span> W
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                <span>SR: {p.stats.strikeRate.toFixed(1)}</span>
                                {p.stats.wickets > 0 && <span>&bull; Econ: {p.stats.economyRate ? p.stats.economyRate.toFixed(2) : '0.00'}</span>}
                                {item.statsFilled && (
                                  <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[9px] font-bold">
                                    Benchmarked
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Composite Score */}
                          <td className="py-2.5 px-3 sm:px-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="font-mono font-bold text-xs text-white">
                                {item.score}
                              </span>
                              <div className="w-10 h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400"
                                  style={{ width: `${Math.min(100, item.score)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Grade Change */}
                          <td className="py-2.5 px-3 sm:px-4 text-center">
                            <div className="inline-flex items-center gap-1.5 justify-center">
                              <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs ${curStyle.bg} ${curStyle.text} border ${curStyle.border}`}>
                                {item.oldGrade}
                              </span>
                              <ArrowRight className={`w-3.5 h-3.5 ${isChanged ? 'text-amber-400 font-bold' : 'text-slate-600'}`} />
                              <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs ${recStyle.bg} ${recStyle.text} border ${recStyle.border} ${isChanged ? 'ring-1 ring-amber-400' : ''}`}>
                                {item.newGrade}
                              </span>
                            </div>
                            {updateBasePrices && item.newBasePrice && (
                              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                {item.newBasePrice.toLocaleString()} pts
                              </div>
                            )}
                          </td>

                          {/* Reasoning */}
                          <td className="py-2.5 px-3 sm:px-4">
                            <div className="text-[11px] text-slate-300 max-w-xs leading-snug">
                              {item.reason}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Grades will be updated across all player cards, auction ordering, and valuations.
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleApply}
              disabled={results.length === 0}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-black text-xs transition-all shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Apply Auto-Grades ({results.length} Players)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
