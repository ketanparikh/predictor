import React, { useState, useMemo } from 'react';
import { Player, PlayerGrade } from '../types/auction';
import { GradeBadge } from './GradeBadge';
import { RoleBadge } from './RoleBadge';
import {
  X,
  Search,
  CheckSquare,
  Square,
  AlertTriangle,
  Sparkles,
  Check,
  Users,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { normalizeGrade, isGradeMatch } from '../utils/gradeUtils';

interface BulkEditGradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  onApplyBulkEdit: (
    playerIds: string[],
    targetGrade: PlayerGrade
  ) => { success: boolean; modifiedCount: number; message: string; bulkBatchId: string };
}

export const BulkEditGradeModal: React.FC<BulkEditGradeModalProps> = ({
  isOpen,
  onClose,
  players,
  onApplyBulkEdit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetGrade, setTargetGrade] = useState<PlayerGrade>('A');
  const [isConfirming, setIsConfirming] = useState(false);

  // Filter visible players based on search and current grade filter
  const visiblePlayers = useMemo(() => {
    return players.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGrade =
        filterGrade === 'all' || isGradeMatch(p.grade, filterGrade);
      return matchesSearch && matchesGrade;
    });
  }, [players, searchTerm, filterGrade]);

  if (!isOpen) return null;

  const handleTogglePlayer = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAllVisible = () => {
    const next = new Set(selectedIds);
    visiblePlayers.forEach((p) => next.add(p.id));
    setSelectedIds(next);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleConfirmSubmit = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    onApplyBulkEdit(ids, targetGrade);
    setIsConfirming(false);
    setSelectedIds(new Set());
    onClose();
  };

  const targetGradeOptions: {
    grade: PlayerGrade;
    label: string;
    desc: string;
    color: string;
    dot: string;
  }[] = [
    {
      grade: 'A+',
      label: 'Grade A+',
      desc: 'Marquee Tier',
      color: 'from-amber-500/20 via-fuchsia-500/20 to-purple-500/20 border-purple-400 text-amber-200',
      dot: 'bg-amber-400',
    },
    {
      grade: 'A',
      label: 'Grade A',
      desc: 'Elite Tier',
      color: 'from-amber-500/20 to-yellow-500/20 border-amber-400 text-amber-300',
      dot: 'bg-amber-400',
    },
    {
      grade: 'B',
      label: 'Grade B',
      desc: 'Core Tier',
      color: 'from-sky-500/20 to-blue-600/20 border-sky-400 text-sky-300',
      dot: 'bg-sky-400',
    },
    {
      grade: 'C',
      label: 'Grade C',
      desc: 'Emerging Tier',
      color: 'from-emerald-500/20 to-teal-600/20 border-emerald-400 text-emerald-300',
      dot: 'bg-emerald-400',
    },
  ];

  // Count players among selected whose grade will actually change
  const playersToChange = players.filter(
    (p) => selectedIds.has(p.id) && normalizeGrade(p.grade) !== normalizeGrade(targetGrade)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Bulk Edit Player Grades
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-mono font-bold">
                  {selectedIds.size} Selected
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Select multiple players, choose a target grade, and commit changes atomically
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Grade Selector Strip */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Target Grade to Apply:
            </span>
            <span className="text-xs font-mono text-slate-400">
              Standardized Base Price: <strong className="text-emerald-400 font-bold">₹1,000 pts</strong>
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {targetGradeOptions.map((opt) => {
              const isSelected = targetGrade === opt.grade;
              return (
                <button
                  key={opt.grade}
                  type="button"
                  onClick={() => setTargetGrade(opt.grade)}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? `bg-gradient-to-br ${opt.color} ring-2 ring-purple-400 shadow-lg scale-[1.02]`
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-black text-sm text-white">
                      <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                      {opt.label}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search, Filter & Quick Action Strip */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search player by name or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Grade filter pills */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {['all', 'A+', 'A', 'B', 'C'].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setFilterGrade(g)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterGrade === g
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {g === 'all' ? 'All Grades' : `Grade ${g}`}
              </button>
            ))}
          </div>

          {/* Selection Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllVisible}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
              <span>Select Visible ({visiblePlayers.length})</span>
            </button>
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold text-xs flex items-center gap-1 transition-colors border border-slate-700"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Clear Selection</span>
              </button>
            )}
          </div>
        </div>

        {/* Player Selection List Table */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-2 sm:p-4">
          {visiblePlayers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No players found matching your search or grade filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {visiblePlayers.map((player) => {
                const isSelected = selectedIds.has(player.id);
                const isAlreadyTarget =
                  normalizeGrade(player.grade) === normalizeGrade(targetGrade);
                return (
                  <div
                    key={player.id}
                    onClick={() => handleTogglePlayer(player.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-950/30 border-purple-500/70 shadow-sm ring-1 ring-purple-500/30'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-colors flex-shrink-0 ${
                          isSelected
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-slate-900 border-slate-700 text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </div>

                      <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-xs overflow-hidden flex-shrink-0">
                        {player.photo ? (
                          <img
                            src={player.photo}
                            alt={player.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          player.name.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-white truncate">
                            {player.name}
                          </h4>
                          {player.auctionOrder && (
                            <span className="text-[9px] font-mono text-slate-400">
                              #{player.auctionOrder}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <RoleBadge role={player.role} size="sm" />
                          {player.isCaptain && (
                            <span className="text-[9px] font-bold text-amber-400">
                              👑 Captain
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 pl-2">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-500 font-mono">Current</span>
                        <GradeBadge grade={player.grade} size="sm" />
                      </div>
                      {isSelected && !isAlreadyTarget && (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-purple-400 font-mono">
                          <ArrowRight className="w-3 h-3 text-purple-400" />
                          <span>{targetGrade}</span>
                        </div>
                      )}
                      {isSelected && isAlreadyTarget && (
                        <span className="text-[10px] text-slate-500 italic">
                          (Already {targetGrade})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with Apply Button & Confirmation Dialog */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Users className="w-4 h-4 text-purple-400" />
            <span>
              <strong>{selectedIds.size}</strong> players selected •{' '}
              <strong className="text-amber-400">{playersToChange.length}</strong> will change to Grade{' '}
              <strong className="text-white">{targetGrade}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={() => setIsConfirming(true)}
              className={`px-5 py-2 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg transition-all ${
                selectedIds.size === 0
                  ? 'bg-slate-800 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30 hover:scale-[1.02]'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Apply Changes ({selectedIds.size})</span>
            </button>
          </div>
        </div>

        {/* Confirmation Modal Overlay */}
        {isConfirming && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-slate-900 border border-purple-500/50 rounded-2xl p-6 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto border border-purple-500/40">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  Confirm Bulk Grade Update
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  You are about to update{' '}
                  <strong className="text-amber-400 font-black">{selectedIds.size} player(s)</strong> to{' '}
                  <strong className="text-purple-400 font-black">Grade {targetGrade}</strong>.
                </p>
                <p className="text-[11px] text-slate-400 mt-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  This change will permanently persist across the application, update the auction queue, database, and log each record under a unique bulk batch ID.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirming(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Yes, Update All {selectedIds.size} Players</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
