import React, { useState, useEffect } from 'react';
import { Player, PlayerGrade } from '../types/auction';
import { GradeBadge } from './GradeBadge';
import { RoleBadge } from './RoleBadge';
import { X, Check, Save, Sparkles } from 'lucide-react';
import { normalizeGrade } from '../utils/gradeUtils';

interface EditPlayerGradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  onSaveGrade: (player: Player, newGrade: PlayerGrade) => void;
}

export const EditPlayerGradeModal: React.FC<EditPlayerGradeModalProps> = ({
  isOpen,
  onClose,
  player,
  onSaveGrade,
}) => {
  const [selectedGrade, setSelectedGrade] = useState<PlayerGrade>('B');

  useEffect(() => {
    if (player) {
      setSelectedGrade(normalizeGrade(player.grade) || 'B');
    }
  }, [player]);

  if (!isOpen || !player) return null;

  const currentGrade = normalizeGrade(player.grade) || 'C';

  const grades: {
    grade: PlayerGrade;
    label: string;
    desc: string;
    color: string;
    dot: string;
    badgeBg: string;
  }[] = [
    {
      grade: 'A+',
      label: 'Grade A+',
      desc: 'Marquee Tier',
      color: 'from-amber-500/20 via-fuchsia-500/20 to-purple-500/20 border-purple-400/60 text-amber-200',
      dot: 'bg-amber-400',
      badgeBg: 'bg-purple-900/40 text-amber-300 border-purple-500/50',
    },
    {
      grade: 'A',
      label: 'Grade A',
      desc: 'Elite Tier',
      color: 'from-amber-500/20 to-yellow-500/20 border-amber-400/60 text-amber-300',
      dot: 'bg-amber-400',
      badgeBg: 'bg-amber-950/40 text-amber-300 border-amber-500/50',
    },
    {
      grade: 'B',
      label: 'Grade B',
      desc: 'Core Tier',
      color: 'from-sky-500/20 to-blue-600/20 border-sky-400/60 text-sky-300',
      dot: 'bg-sky-400',
      badgeBg: 'bg-blue-950/40 text-sky-300 border-blue-500/50',
    },
    {
      grade: 'C',
      label: 'Grade C',
      desc: 'Emerging Tier',
      color: 'from-emerald-500/20 to-teal-600/20 border-emerald-400/60 text-emerald-300',
      dot: 'bg-emerald-400',
      badgeBg: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/50',
    },
  ];

  const handleSave = () => {
    onSaveGrade(player, selectedGrade);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Edit Player Grade</h2>
              <p className="text-xs text-slate-400">Modify tournament grade classification</p>
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

        {/* Player Snapshot */}
        <div className="my-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-base overflow-hidden flex-shrink-0">
            {player.photo ? (
              <img src={player.photo} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              player.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white truncate">{player.name}</h3>
              {player.auctionOrder && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  #{player.auctionOrder}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <RoleBadge role={player.role} size="sm" />
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <span>Current:</span>
                <GradeBadge grade={player.grade} size="sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Grade Selection Grid */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300 block">
            Select New Grade Classification:
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {grades.map((item) => {
              const isSelected = selectedGrade === item.grade;
              return (
                <button
                  key={item.grade}
                  type="button"
                  onClick={() => setSelectedGrade(item.grade)}
                  className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? `bg-gradient-to-br ${item.color} ring-2 ring-amber-400 shadow-lg scale-[1.02]`
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-black text-sm text-white">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.dot}`} />
                      {item.label}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    <span>{item.desc}</span>
                    <div className="font-mono text-xs text-amber-400 font-bold mt-0.5">
                      ₹1,000 pts base
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary Details */}
        <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-400 space-y-1.5 font-mono">
          <div className="flex justify-between items-center">
            <span>Previous Grade:</span>
            <span className="font-bold text-slate-300">Grade {currentGrade}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Updated Grade:</span>
            <span className={`font-black ${selectedGrade !== currentGrade ? 'text-amber-400 underline font-bold' : 'text-slate-300'}`}>
              Grade {selectedGrade}
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-slate-800/70 pt-1.5">
            <span>Base Price:</span>
            <span className="font-bold text-emerald-400">₹1,000 pts</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-5 mt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Grade</span>
          </button>
        </div>
      </div>
    </div>
  );
};
