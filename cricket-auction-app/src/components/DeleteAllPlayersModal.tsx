import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteAllPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerCount: number;
  onConfirmDelete: () => void;
}

export const DeleteAllPlayersModal: React.FC<DeleteAllPlayersModalProps> = ({
  isOpen,
  onClose,
  playerCount,
  onConfirmDelete,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-rose-900/60 shadow-[0_0_50px_rgba(225,29,72,0.2)] overflow-hidden">
        {/* Red accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500" />

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex-shrink-0">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Delete All Players?</h2>
              <p className="text-xs text-slate-400 mt-1">
                You are about to permanently delete all <strong className="text-rose-300 font-mono font-bold">{playerCount} players</strong> from the auction database.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-1.5">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <span>What will happen:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
              <li>All registered players will be wiped completely.</li>
              <li>Team rosters will be emptied and team budgets restored to full 50,000 points.</li>
              <li>Any ongoing auction lot will be reset to standby.</li>
              <li>You can immediately upload a custom Excel sheet or add new players.</li>
            </ul>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel, Keep Players
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirmDelete();
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs transition-all shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Yes, Delete All Players</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
