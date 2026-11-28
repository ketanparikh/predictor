import React from 'react';
import { Player, Team } from '../types/auction';
import { GradeBadge } from './GradeBadge';
import { RoleBadge } from './RoleBadge';
import { Gavel, Edit2, Trash2, ShieldCheck, User, Crown, Star, Tag, CheckCircle2 } from 'lucide-react';
import { normalizeGrade } from '../utils/gradeUtils';

interface PlayerCardProps {
  player: Player;
  teams: Team[];
  currentPlayerId?: string | null;
  onStartAuction?: (player: Player) => void;
  onDirectSell?: (player: Player) => void;
  onEdit?: (player: Player) => void;
  onEditGrade?: (player: Player) => void;
  onDelete?: (player: Player) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  teams,
  currentPlayerId,
  onStartAuction,
  onDirectSell,
  onEdit,
  onEditGrade,
  onDelete,
}) => {
  const soldTeam = player.teamId ? teams.find(t => t.id === player.teamId) : null;
  const isLiveNow = (player.status === 'in_auction') && (!currentPlayerId || player.id === currentPlayerId);
  const isOtherPlayerLive = Boolean(currentPlayerId && currentPlayerId !== player.id);

  return (
    <div className={`relative flex flex-col justify-between rounded-xl border transition-all duration-200 overflow-hidden ${
      isLiveNow
        ? 'border-amber-500/80 bg-slate-900/90 shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-1 ring-amber-400'
        : player.isCaptain
        ? 'border-amber-500/50 bg-slate-900/85 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30'
        : player.isViceCaptain
        ? 'border-blue-500/50 bg-slate-900/85 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/30'
        : player.status === 'sold'
        ? 'border-emerald-500/40 bg-slate-900/60 opacity-95'
        : player.status === 'unsold'
        ? 'border-rose-500/40 bg-slate-900/50'
        : 'border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900/90 hover:shadow-lg'
    }`}>
      {/* Top Header Strip */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {onEditGrade ? (
              <button
                type="button"
                onClick={() => onEditGrade(player)}
                title={`Click to edit grade (Current: Grade ${player.grade})`}
                className="cursor-pointer hover:scale-105 active:scale-95 transition-transform"
              >
                <GradeBadge grade={player.grade} size="sm" />
              </button>
            ) : (
              <GradeBadge grade={player.grade} size="sm" />
            )}
            <RoleBadge role={player.role} size="sm" />
            {player.isCaptain && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-0.5 border border-amber-500/30">
                <Crown className="w-2.5 h-2.5 text-amber-400" /> Captain
              </span>
            )}
            {player.isViceCaptain && (
              <span className="px-2 py-0.5 rounded bg-blue-500/25 text-blue-300 text-[10px] font-mono font-bold flex items-center gap-1 border border-blue-500/40 shadow-sm">
                <Star className="w-3 h-3 text-blue-400 fill-current" /> Vice-Captain
              </span>
            )}
            {(player.sponsorTag || player.isSponsored) && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-0.5 border border-emerald-500/30">
                <Tag className="w-2.5 h-2.5 text-emerald-400" /> {player.sponsorTag || 'Sponsored'}
              </span>
            )}
            {player.auctionOrder && (
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono font-bold">
                #{player.auctionOrder}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {onEditGrade && (
              <button
                onClick={() => onEditGrade(player)}
                title="Edit Player Grade"
                className="px-2 py-1 rounded-lg border border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 hover:border-amber-400 text-[11px] font-black flex items-center gap-1 transition-all shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Grade</span>
              </button>
            )}

            {onEdit && (
              <button
                onClick={() => onEdit(player)}
                title="Edit Player Details"
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}

            {onDelete && (
              <button
                onClick={() => onDelete(player)}
                title="Delete Player"
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Player Profile Header */}
        <div className="flex items-center gap-3">
          <div className="w-13 h-13 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-lg shadow-inner overflow-hidden flex-shrink-0">
            {player.photo ? (
              <img src={player.photo} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center">
                <User className="w-6 h-6 text-slate-400" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-white text-base truncate tracking-tight flex items-center gap-1.5">
              <span>{player.name}</span>
              {player.isCaptain && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5 shadow-sm">
                  <Crown className="w-2.5 h-2.5 fill-current text-amber-400" /> C
                </span>
              )}
              {player.isViceCaptain && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-0.5 shadow-sm">
                  <Star className="w-2.5 h-2.5 fill-current text-blue-400" /> VC
                </span>
              )}
            </h3>
            <div className="text-xs text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5 font-mono">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                (player.ageCategory || '').includes('Below') || player.age <= 15
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
              }`}>
                {player.ageCategory || (player.age <= 15 ? '15 and Below' : 'Above 15')}
              </span>
              {player.gender && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  player.gender.toLowerCase().startsWith('f')
                    ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                }`}>
                  {player.gender.toLowerCase().startsWith('f') ? '♀ Female' : '♂ Male'}
                </span>
              )}
              <span>•</span>
              <span className="font-semibold text-amber-300 font-sans">{player.role}</span>
            </div>
          </div>
        </div>

        {/* Career Stats Grid */}
        <div className="mt-3.5 grid grid-cols-4 gap-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-center font-mono text-xs">
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Mat</div>
            <div className="font-semibold text-slate-200 mt-0.5">{player.stats.matches}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Runs</div>
            <div className="font-semibold text-amber-300 mt-0.5">{player.stats.runs}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Avg / SR</div>
            <div className="font-semibold text-sky-300 mt-0.5">
              {player.stats.average > 0 ? player.stats.average.toFixed(1) : '-'}/{player.stats.strikeRate > 0 ? Math.round(player.stats.strikeRate) : '-'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Wkts</div>
            <div className="font-semibold text-emerald-300 mt-0.5">{player.stats.wickets}</div>
          </div>
        </div>
        {player.jcplSeasons && player.jcplSeasons.length > 0 && (
          <div className="mt-2 text-[10px] font-bold uppercase tracking-wide text-sky-300/90">
            JCPL {player.jcplSeasons.join(' · ')}
          </div>
        )}
      </div>

      {/* Card Footer: Status & Price */}
      <div className="p-3 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] text-slate-400 font-mono">
            {player.status === 'sold' ? 'SOLD PRICE' : 'BASE PRICE'}
          </div>
          <div className="text-sm font-bold font-mono text-white flex items-center gap-1">
            <span className={player.status === 'sold' ? 'text-emerald-400' : 'text-amber-400'}>
              {player.status === 'sold' && player.soldPrice
                ? player.soldPrice.toLocaleString()
                : player.basePrice.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-normal">pts</span>
          </div>
        </div>

        {/* Status / Actions */}
        <div>
          {player.status === 'sold' && soldTeam ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="truncate max-w-[110px]">{soldTeam.name}</span>
            </div>
          ) : player.status === 'unsold' ? (
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
                UNSOLD
              </span>
              {onStartAuction && (
                <button
                  onClick={() => onStartAuction(player)}
                  className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors flex items-center gap-1 shadow cursor-pointer"
                  title="Put player back on auction block"
                >
                  <Gavel className="w-3 h-3" />
                  Re-Bid
                </button>
              )}
              {onDirectSell && (
                <button
                  onClick={() => onDirectSell(player)}
                  className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow cursor-pointer"
                  title="Directly sell to a team without bidding"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Direct
                </button>
              )}
            </div>
          ) : isLiveNow ? (
            <span className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 text-xs font-bold animate-pulse flex items-center gap-1 shadow-md shadow-amber-500/20">
              <Gavel className="w-3.5 h-3.5" />
              LIVE NOW
            </span>
          ) : (
            <div className="flex items-center gap-1.5">
              {onStartAuction && (
                <button
                  onClick={() => onStartAuction(player)}
                  disabled={isOtherPlayerLive}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    isOtherPlayerLive
                      ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
                      : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 cursor-pointer'
                  }`}
                  title={
                    isOtherPlayerLive
                      ? 'Another player is currently active in live auction'
                      : 'Start live auction for this player'
                  }
                >
                  <Gavel className="w-3.5 h-3.5" />
                  Auction
                </button>
              )}
              {onDirectSell && (
                <button
                  onClick={() => onDirectSell(player)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all flex items-center gap-1 shadow-md shadow-emerald-600/20 cursor-pointer"
                  title="Directly sell to a franchise"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Direct
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
