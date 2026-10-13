import React from 'react';
import { AuctionTransaction } from '../types/auction';
import { GradeBadge } from './GradeBadge';
import { RoleBadge } from './RoleBadge';
import { X, History, Trophy, Clock } from 'lucide-react';

interface BidHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: AuctionTransaction | null;
}

export const BidHistoryModal: React.FC<BidHistoryModalProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  if (!isOpen || !transaction) return null;

  const bids = [...transaction.bidHistory].reverse(); // Earliest to latest or chronological

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white">Full Bidding Log</h2>
              <p className="text-xs text-slate-400">{transaction.playerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Summary Pill */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GradeBadge grade={transaction.playerGrade} size="sm" />
            <RoleBadge role={transaction.playerRole} size="sm" />
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-mono">FINAL WINNING BID</div>
            <div className="text-sm font-bold font-mono text-emerald-400">
              {transaction.soldPrice.toLocaleString()} pts ({transaction.teamName})
            </div>
          </div>
        </div>

        {/* Bidding Sequence Timeline */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
          {bids.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-center text-xs text-slate-400">
              Direct base price acquisition: {transaction.soldPrice.toLocaleString()} pts by {transaction.teamName}.
            </div>
          ) : (
            bids.map((bid, idx) => {
              const isWinningBid = idx === bids.length - 1;
              return (
                <div
                  key={bid.id || idx}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    isWinningBid
                      ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                      : 'border-slate-800 bg-slate-950/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-[11px] font-mono font-bold flex items-center justify-center text-slate-400">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <span>{bid.teamName}</span>
                        {isWinningBid && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 text-[10px] font-extrabold flex items-center gap-0.5">
                            <Trophy className="w-2.5 h-2.5" /> SOLD
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{new Date(bid.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className={`font-bold text-sm ${isWinningBid ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {bid.amount.toLocaleString()} pts
                    </div>
                    {idx > 0 && (
                      <div className="text-[10px] text-slate-400">
                        +{ (bid.amount - bids[idx - 1].amount).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
