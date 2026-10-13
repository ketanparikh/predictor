import React from 'react';
import { useAuction } from '../context/AuctionContext';
import { Player } from '../types/auction';
import { PlayerCard } from '../components/PlayerCard';
import { UserX, Gavel, RotateCcw, AlertCircle, Users } from 'lucide-react';

interface UnsoldPlayersPageProps {
  onStartAuction: (player: Player) => void;
}

export const UnsoldPlayersPage: React.FC<UnsoldPlayersPageProps> = ({ onStartAuction }) => {
  const { players, teams, reAuctionPlayer, toggleWishlist } = useAuction();

  const unsoldPlayers = players.filter(p => p.status === 'unsold');

  const handleReAuctionAll = () => {
    if (unsoldPlayers.length === 0) return;
    if (window.confirm(`Queue all ${unsoldPlayers.length} unsold players back to the active upcoming auction pool?`)) {
      unsoldPlayers.forEach(p => reAuctionPlayer(p.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <UserX className="w-6 h-6 text-rose-400" />
            <span>Unsold Player Pool & Re-Auction Queue</span>
          </h1>
          <p className="text-xs text-slate-400">
            {unsoldPlayers.length} Players Passed Without Bids • Allow tournament administrators to re-introduce unsold players in secondary rounds.
          </p>
        </div>

        {unsoldPlayers.length > 0 && (
          <button
            onClick={handleReAuctionAll}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition-all shadow flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Re-Auction All Unsold Players</span>
          </button>
        )}
      </div>

      {/* Helper Banner */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <div className="font-semibold text-white">Re-Auction Mechanics</div>
          <p className="text-slate-400">
            Players marked as "Unsold" during live bidding remain preserved in this pool. In IPL-style tournaments, teams with leftover purse often revisit this pool at discounted base prices or in accelerated lightning rounds.
          </p>
        </div>
      </div>

      {/* Grid of Unsold Players */}
      {unsoldPlayers.length === 0 ? (
        <div className="p-16 rounded-3xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white">No Unsold Players</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            All auctioned players so far have been successfully acquired by participating franchise teams.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {unsoldPlayers.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              teams={teams}
              onStartAuction={p => onStartAuction(p)}
              onToggleWishlist={toggleWishlist}
            />
          ))}
        </div>
      )}
    </div>
  );
};
