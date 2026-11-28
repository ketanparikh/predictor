import React, { useState, useMemo, useEffect } from 'react';
import { useAuction } from '../context/AuctionContext';
import { Player, Team, PlayerGrade } from '../types/auction';
import { GradeBadge } from './GradeBadge';
import { RoleBadge } from './RoleBadge';
import { X, Search, UserPlus, AlertTriangle, CheckCircle2, Shield, DollarSign } from 'lucide-react';
import { normalizeGrade } from '../utils/gradeUtils';

interface DirectPlayerAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedTeamId?: string;
  onSuccess?: (msg: string) => void;
}

export const DirectPlayerAddModal: React.FC<DirectPlayerAddModalProps> = ({
  isOpen,
  onClose,
  preselectedTeamId,
  onSuccess,
}) => {
  const { teams, players, rules, directAddPlayerToTeam, calculateMaxAllowableBid } = useAuction();

  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [purchasePrice, setPurchasePrice] = useState<number>(1000);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('ALL');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize selected team
  useEffect(() => {
    if (isOpen) {
      if (preselectedTeamId && teams.some(t => t.id === preselectedTeamId)) {
        setSelectedTeamId(preselectedTeamId);
      } else if (teams.length > 0 && !selectedTeamId) {
        setSelectedTeamId(teams[0].id);
      }
      setPurchasePrice(1000);
      setErrorMsg(null);
    }
  }, [isOpen, preselectedTeamId, teams]);

  const selectedTeam: Team | undefined = useMemo(() => {
    return teams.find(t => t.id === selectedTeamId);
  }, [teams, selectedTeamId]);

  // Unsold and upcoming players available for addition
  const availablePlayers: Player[] = useMemo(() => {
    return players.filter(p => {
      // Must not already be sold or in any squad
      if (p.status === 'sold') return false;
      const isAlreadyInAnySquad = teams.some(t => t.squad && t.squad.includes(p.id));
      if (isAlreadyInAnySquad) return false;
      return true;
    });
  }, [players, teams]);

  // Filtered available players by search and grade
  const filteredPlayers = useMemo(() => {
    return availablePlayers.filter(p => {
      // Grade filter
      if (selectedGradeFilter !== 'ALL') {
        const norm = normalizeGrade(p.grade);
        if (norm !== selectedGradeFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesRole = p.role.toLowerCase().includes(q);
        const matchesGrade = (p.grade || '').toLowerCase().includes(q);
        if (!matchesName && !matchesRole && !matchesGrade) return false;
      }

      return true;
    });
  }, [availablePlayers, selectedGradeFilter, searchQuery]);

  const selectedPlayer: Player | undefined = useMemo(() => {
    return players.find(p => p.id === selectedPlayerId);
  }, [players, selectedPlayerId]);

  // Max bid calculation and reserve
  const maxAllowance = useMemo(() => {
    if (!selectedTeam || !selectedPlayer) return null;
    return calculateMaxAllowableBid(selectedTeam, selectedPlayer);
  }, [selectedTeam, selectedPlayer, calculateMaxAllowableBid]);

  if (!isOpen) return null;

  const maxSquadSize = rules?.squadRules?.maxSquadSize ?? 9;
  const currentSquadCount = selectedTeam ? selectedTeam.squad.length : 0;
  const isSquadFull = currentSquadCount >= maxSquadSize;
  const openSlotsBefore = Math.max(0, maxSquadSize - currentSquadCount);
  const openSlotsAfter = Math.max(0, openSlotsBefore - 1);
  const mandatoryReserve = openSlotsAfter * 1000;
  const maxAffordable = selectedTeam ? Math.max(0, selectedTeam.remainingBudget - mandatoryReserve) : 0;
  const projectedPurseLeft = selectedTeam ? selectedTeam.remainingBudget - purchasePrice : 0;

  const handleConfirm = () => {
    if (!selectedTeam) {
      setErrorMsg('Please select a purchasing franchise.');
      return;
    }
    if (!selectedPlayer) {
      setErrorMsg('Please select an available player to add.');
      return;
    }
    if (isSquadFull) {
      setErrorMsg(`Squad is full! ${selectedTeam.name} already has the maximum ${maxSquadSize} players.`);
      return;
    }
    if (purchasePrice < 1000) {
      setErrorMsg('Agreed purchase price must be at least ₹1,000 points.');
      return;
    }
    if (purchasePrice > selectedTeam.remainingBudget) {
      setErrorMsg(`Insufficient purse! ${selectedTeam.name} has only ₹${selectedTeam.remainingBudget.toLocaleString('en-IN')} points remaining.`);
      return;
    }
    if (purchasePrice > maxAffordable) {
      setErrorMsg(`Smart Reserve requirement! ${selectedTeam.name} must reserve at least ₹${mandatoryReserve.toLocaleString('en-IN')} points for the remaining ${openSlotsAfter} squad slots (min ₹1,000/player). Max allowable price is ₹${maxAffordable.toLocaleString('en-IN')}.`);
      return;
    }

    const res = directAddPlayerToTeam(selectedTeam.id, selectedPlayer.id, purchasePrice);
    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    if (onSuccess) {
      onSuccess(res.message);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">Direct Player Add</h3>
              <p className="text-xs text-slate-400">
                Directly allocate an available player to any franchise squad with purse deduction
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* 1. Franchise Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              1. Select Purchasing Franchise
            </label>
            <select
              value={selectedTeamId}
              onChange={e => {
                setSelectedTeamId(e.target.value);
                setErrorMsg(null);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 font-medium"
            >
              {teams.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} • Purse: ₹{t.remainingBudget.toLocaleString('en-IN')} pts • Squad: {t.squad.length}/{maxSquadSize}
                </option>
              ))}
            </select>
          </div>

          {/* Franchise Insights Strip */}
          {selectedTeam && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs font-mono">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Remaining Purse</span>
                <span className="text-emerald-400 font-bold text-sm">₹{selectedTeam.remainingBudget.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Squad Count</span>
                <span className={isSquadFull ? "text-rose-400 font-bold text-sm" : "text-white font-bold text-sm"}>
                  {currentSquadCount} / {maxSquadSize}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Available Slots</span>
                <span className="text-white font-bold text-sm">{openSlotsBefore} left</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Max Buy Price</span>
                <span className="text-amber-400 font-bold text-sm">₹{maxAffordable.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          {/* 2. Player Selection & Search */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                2. Select Available Player ({filteredPlayers.length} available)
              </label>
              {/* Grade Filter Chips */}
              <div className="flex items-center gap-1">
                {['ALL', 'A+', 'A', 'B', 'C'].map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedGradeFilter(g)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all ${
                      selectedGradeFilter === g
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search players by name or role..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Player Selection List (Scrollable) */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-800 rounded-2xl p-2 bg-slate-950/50">
              {filteredPlayers.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 font-mono">
                  No matching unsold players found
                </div>
              ) : (
                filteredPlayers.map(p => {
                  const isSelected = p.id === selectedPlayerId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPlayerId(p.id);
                        setErrorMsg(null);
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-500/15 border border-emerald-500/50 shadow-sm'
                          : 'bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-xs font-bold text-slate-300">
                          {p.photo && p.photo.startsWith('http') ? (
                            <img src={p.photo} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            p.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">{p.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <GradeBadge grade={p.grade} size="sm" />
                            <RoleBadge role={p.role} size="sm" />
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-mono">Base Price</span>
                        <span className="text-xs font-bold text-amber-400 font-mono">₹1,000 pts</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. Agreed Purchase Price Input & Live Purse Preview */}
          {selectedPlayer && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  3. Agreed Purchase Price (Minimum ₹1,000 pts)
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Standardized Base: ₹1,000 pts</span>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono">₹</span>
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={e => {
                    setPurchasePrice(Number(e.target.value));
                    setErrorMsg(null);
                  }}
                  min={1000}
                  step={500}
                  className="w-full pl-8 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              {/* Quick increment buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[1000, 2000, 3000, 5000, 10000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPurchasePrice(amt)}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                      purchasePrice === amt
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    ₹{amt.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>

              {/* Live Balance Calculations */}
              <div className="pt-3 border-t border-slate-800/80 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Current Purse:</span>
                  <span className="text-white font-bold">₹{(selectedTeam?.remainingBudget ?? 0).toLocaleString('en-IN')} pts</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Price to Deduct:</span>
                  <span className="text-rose-400 font-bold">- ₹{purchasePrice.toLocaleString('en-IN')} pts</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-800/60 pt-1.5">
                  <span className="text-slate-300 font-bold">Projected Purse Remaining:</span>
                  <span className={`font-bold ${projectedPurseLeft < mandatoryReserve ? 'text-rose-400' : 'text-emerald-400'}`}>
                    ₹{projectedPurseLeft.toLocaleString('en-IN')} pts
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>Mandatory Squad Reserve ({openSlotsAfter} remaining slots × ₹1,000):</span>
                  <span className="text-sky-400 font-bold">₹{mandatoryReserve.toLocaleString('en-IN')} pts</span>
                </div>
              </div>
            </div>
          )}

          {/* Validation Warnings */}
          {isSquadFull && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>Squad Limit Reached! {selectedTeam?.name} already has {maxSquadSize} players and cannot acquire more.</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedTeam || !selectedPlayer || isSquadFull || purchasePrice < 1000 || purchasePrice > maxAffordable}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm & Add to Squad</span>
          </button>
        </div>
      </div>
    </div>
  );
};
