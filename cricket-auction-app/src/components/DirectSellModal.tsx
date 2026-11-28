import React, { useState, useEffect, useMemo } from 'react';
import { Player, Team } from '../types/auction';
import { useAuction } from '../context/AuctionContext';
import { GradeBadge } from './GradeBadge';
import { RoleBadge } from './RoleBadge';
import { X, CheckCircle2, Award } from 'lucide-react';
import { normalizeGrade } from '../utils/gradeUtils';

interface DirectSellModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  onSuccess?: (msg: string) => void;
}

export const DirectSellModal: React.FC<DirectSellModalProps> = ({
  isOpen,
  onClose,
  player,
  onSuccess,
}) => {
  const { teams, directSellPlayer, calculateMaxAllowableBid, getTeamGradeMetrics } = useAuction();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [salePrice, setSalePrice] = useState<number>(1000);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (player) {
      setSalePrice(player.basePrice || 1000);
      if (teams.length > 0 && !selectedTeamId) {
        setSelectedTeamId(teams[0].id);
      }
    }
    setErrorMsg(null);
  }, [player, teams]);

  const selectedTeam = useMemo(() => {
    return teams.find(t => t.id === selectedTeamId) || teams[0] || null;
  }, [teams, selectedTeamId]);

  const maxAllowance = useMemo(() => {
    if (!selectedTeam || !player) return null;
    return calculateMaxAllowableBid(selectedTeam, player);
  }, [selectedTeam, player, calculateMaxAllowableBid]);

  const gradeMetrics = useMemo(() => {
    if (!selectedTeam || !getTeamGradeMetrics) return null;
    return getTeamGradeMetrics(selectedTeam);
  }, [selectedTeam, getTeamGradeMetrics]);

  if (!isOpen || !player) return null;

  const pGrade = normalizeGrade(player.grade);

  const handleConfirm = () => {
    if (!selectedTeam) {
      setErrorMsg('Please select a franchise.');
      return;
    }
    if (salePrice <= 0 || isNaN(salePrice)) {
      setErrorMsg('Please enter a valid price in points.');
      return;
    }

    const res = directSellPlayer(selectedTeam.id, salePrice, player);
    if (!res.success) {
      setErrorMsg(res.message || 'Direct sell failed.');
      return;
    }

    if (onSuccess) {
      onSuccess(`Successfully sold ${player.name} to ${selectedTeam.name} for ₹${salePrice.toLocaleString('en-IN')}!`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Direct Sell Player</h3>
              <p className="text-xs text-slate-400">Allocate player directly to a franchise</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Player Summary Card */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-slate-300 font-bold">
                {player.photo ? (
                  <img src={player.photo} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                  player.name.charAt(0)
                )}
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">{player.name}</h4>
                <div className="flex items-center gap-1.5 mt-1">
                  <GradeBadge grade={player.grade} size="sm" />
                  <RoleBadge role={player.role} size="sm" />
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Base Price</span>
              <span className="text-sm font-bold text-amber-400 font-mono">₹{player.basePrice.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Franchise Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Select Purchasing Franchise
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
                  {t.name} (Purse: ₹{t.remainingBudget.toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>

          {/* Franchise Status Insight */}
          {selectedTeam && (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Remaining Team Purse:</span>
                <span className="font-mono font-bold text-emerald-400">
                  ₹{selectedTeam.remainingBudget.toLocaleString('en-IN')} pts
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current Squad Count:</span>
                <span className="font-mono font-bold text-slate-300">
                  {selectedTeam.squad.length} / 9 Players
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">Available Squad Slots:</span>
                <span className="font-mono font-bold text-slate-300">
                  {Math.max(0, 9 - selectedTeam.squad.length)} slots left
                </span>
              </div>
              {maxAllowance && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Mandatory Squad Reserve:</span>
                  <span className="font-mono font-bold text-sky-400">
                    ₹{maxAllowance.minReserveRequired.toLocaleString('en-IN')} pts
                  </span>
                </div>
              )}
              {maxAllowance && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Max Spendable on this player:</span>
                  <span className={maxAllowance.maxBid === 0 ? "text-rose-400 font-mono font-bold" : "text-amber-400 font-mono font-bold"}>
                    ₹{maxAllowance.maxBid.toLocaleString('en-IN')} pts
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Price Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Direct Sale Price (Points)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono">₹</span>
              <input
                type="number"
                value={salePrice}
                onChange={e => {
                  setSalePrice(Number(e.target.value));
                  setErrorMsg(null);
                }}
                min={player.basePrice || 1000}
                step={500}
                className="w-full pl-8 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              {[player.basePrice, player.basePrice + 1000, player.basePrice + 2000, player.basePrice + 5000].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSalePrice(p)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono transition-colors"
                >
                  ₹{p.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              ⚠️ {errorMsg}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-800 bg-slate-950/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={(maxAllowance?.maxBid ?? 0) === 0 || salePrice > (maxAllowance?.maxBid ?? 0)}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirm Direct Sell
          </button>
        </div>
      </div>
    </div>
  );
};
