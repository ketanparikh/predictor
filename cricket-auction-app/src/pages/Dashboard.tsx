import React from 'react';
import { useAuction } from '../context/AuctionContext';
import { ActiveNavTab, Player } from '../types/auction';
import { GradeBadge } from '../components/GradeBadge';
import { RoleBadge } from '../components/RoleBadge';
import {
  Gavel,
  Users,
  Shield,
  Coins,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Trophy,
  History,
  FileSpreadsheet,
  Tv,
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (tab: ActiveNavTab) => void;
  onStartAuction: (player: Player) => void;
  onOpenProjector: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onStartAuction,
  onOpenProjector,
}) => {
  const { tournament, teams, players, transactions, currentPlayer, currentBid, currentBidder } = useAuction();

  const totalPlayers = players.length;
  const soldPlayers = players.filter(p => p.status === 'sold');
  const unsoldPlayers = players.filter(p => p.status === 'unsold');
  const upcomingPlayers = players.filter(p => p.status === 'upcoming');

  const totalStartingBudget = teams.reduce((acc, t) => acc + t.startingBudget, 0);
  const totalSpent = teams.reduce((acc, t) => acc + t.totalSpent, 0);
  const totalRemainingBudget = teams.reduce((acc, t) => acc + t.remainingBudget, 0);

  const topPurchases = [...transactions].sort((a, b) => b.soldPrice - a.soldPrice).slice(0, 5);
  const nextInLinePlayers = upcomingPlayers.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Hero Tournament Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wide">
              <Trophy className="w-3.5 h-3.5" />
              <span>OFFICIAL TOURNAMENT AUCTION HUB</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              {tournament.name}
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Manage live bidding across 10 franchise teams and 100 registered tournament players, monitor real-time point budgets ({totalStartingBudget.toLocaleString()} Total Purse), validate squad compliance, and analyze player statistics.
            </p>
          </div>


          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            {upcomingPlayers.length > 0 && (
              <button
                onClick={() => {
                  if (currentPlayer) {
                    onNavigate('live_auction');
                  } else if (upcomingPlayers.length > 0) {
                    onStartAuction(upcomingPlayers[0]);
                    onNavigate('live_auction');
                  }
                }}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2 transform active:scale-95"
              >
                <Gavel className="w-4 h-4" />
                <span>{currentPlayer ? 'Go To Live Auction Block' : 'Start Next Player Auction'}</span>
              </button>
            )}

            <button
              onClick={onOpenProjector}
              className="px-4 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-sm transition-colors flex items-center gap-2"
            >
              <Tv className="w-4 h-4 text-cyan-400" />
              <span>Launch Big Screen</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Points Spent */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono font-semibold uppercase">Total Points Spent</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-white">
              {totalSpent.toLocaleString()} <span className="text-xs text-slate-400 font-normal">pts</span>
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono flex items-center gap-1.5">
              <span>Remaining:</span>
              <span className="text-emerald-400 font-semibold">{totalRemainingBudget.toLocaleString()}</span>
            </div>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              style={{ width: `${totalStartingBudget > 0 ? (totalSpent / totalStartingBudget) * 100 : 0}%` }}
              className="bg-amber-500 h-full"
            />
          </div>
        </div>

        {/* Players Sold */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono font-semibold uppercase">Players Sold</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-emerald-400">
              {soldPlayers.length} <span className="text-xs text-slate-400 font-normal">/ {totalPlayers}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              {totalPlayers > 0 ? Math.round((soldPlayers.length / totalPlayers) * 100) : 0}% of tournament pool sold
            </div>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              style={{ width: `${totalPlayers > 0 ? (soldPlayers.length / totalPlayers) * 100 : 0}%` }}
              className="bg-emerald-500 h-full"
            />
          </div>
        </div>

        {/* Players Remaining */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono font-semibold uppercase">Auction Pool Remaining</span>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/30">
              <Gavel className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-sky-400">
              {upcomingPlayers.length} <span className="text-xs text-slate-400 font-normal">available</span>
            </div>
            <div className="text-xs text-rose-400 mt-1 font-mono">
              {unsoldPlayers.length} currently marked unsold
            </div>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              style={{ width: `${totalPlayers > 0 ? (upcomingPlayers.length / totalPlayers) * 100 : 0}%` }}
              className="bg-sky-500 h-full"
            />
          </div>
        </div>

        {/* Franchise Teams */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono font-semibold uppercase">Franchise Teams</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-purple-300">
              {teams.length} <span className="text-xs text-slate-400 font-normal">Active Teams</span>
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              Avg Squad: {teams.length > 0 ? (soldPlayers.length / teams.length).toFixed(1) : 0} players/team
            </div>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div style={{ width: '100%' }} className="bg-purple-500 h-full" />
          </div>
        </div>
      </div>

      {/* Live Auction Block Ticker (if active) */}
      {currentPlayer && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/50 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl shadow-amber-500/10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300 text-2xl font-bold flex-shrink-0">
              🏏
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] animate-pulse">
                  CURRENTLY ON AUCTION BLOCK
                </span>
                <GradeBadge grade={currentPlayer.grade} size="sm" />
                <RoleBadge role={currentPlayer.role} size="sm" />
              </div>
              <h3 className="text-xl font-extrabold text-white mt-1">{currentPlayer.name}</h3>
              <p className="text-xs text-slate-400 font-mono">
                {currentPlayer.age} yrs • {currentPlayer.experience} yrs exp • Base Price: {currentPlayer.basePrice.toLocaleString()} pts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs text-slate-400 font-mono">CURRENT HIGH BID</div>
              <div className="text-2xl font-black font-mono text-amber-400">
                {currentBid.toLocaleString()} pts
              </div>
              <div className="text-xs text-emerald-400 font-semibold font-mono">
                {currentBidder ? `Bidder: ${currentBidder.name}` : 'No bids yet'}
              </div>
            </div>

            <button
              onClick={() => onNavigate('live_auction')}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all shadow flex items-center gap-1.5"
            >
              <Gavel className="w-4 h-4" />
              Open Live Console
            </button>
          </div>
        </div>
      )}

      {/* Two Column Layout: Team Leaderboards & Upcoming Lots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Team Budget Leaderboard */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <h2 className="font-bold text-white text-base">Franchise Budget & Squad Leaderboard</h2>
              </div>
              <button
                onClick={() => onNavigate('teams')}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
              >
                View All Teams <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {teams.map(team => {
                const percentSpent = (team.totalSpent / team.startingBudget) * 100;
                return (
                  <div
                    key={team.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <span className="text-2xl">{team.logo}</span>
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>{team.name}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono text-slate-400">
                            {team.shortName}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          Squad: <span className="text-white font-semibold">{team.squad.length} players</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 max-w-xs mx-0 sm:mx-4">
                      <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                        <span>Spent: {team.totalSpent.toLocaleString()}</span>
                        <span>{Math.round(percentSpent)}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percentSpent}%`, backgroundColor: team.color || '#eab308' }}
                          className="h-full transition-all duration-300"
                        />
                      </div>
                    </div>

                    <div className="text-right font-mono min-w-[120px]">
                      <div className="text-xs text-slate-400">REMAINING</div>
                      <div className="font-bold text-sm text-emerald-400">
                        {team.remainingBudget.toLocaleString()} <span className="text-[10px] text-slate-500">pts</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Next Upcoming Players & Top Sales */}
        <div className="space-y-6">
          {/* Upcoming Lots Queue */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gavel className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-white text-sm">Next in Auction Block</h3>
              </div>
              <button
                onClick={() => onNavigate('players')}
                className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
              >
                All Players
              </button>
            </div>

            {nextInLinePlayers.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                All players have been auctioned! Check the Unsold tab or Final Results.
              </div>
            ) : (
              <div className="space-y-2.5">
                {nextInLinePlayers.map((player, idx) => (
                  <div
                    key={player.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-xs truncate">{player.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                          <span>{player.role}</span>
                          <span>•</span>
                          <span className="text-amber-400">{player.basePrice.toLocaleString()} pts</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onStartAuction(player);
                        onNavigate('live_auction');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1 flex-shrink-0"
                    >
                      <Gavel className="w-3 h-3" />
                      Bid
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Marquee Purchases Ticker */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Top Marquee Purchases</h3>
              </div>
              <button
                onClick={() => onNavigate('history')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                Log
              </button>
            </div>

            {topPurchases.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                No purchases completed yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {topPurchases.map((tx, idx) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-mono flex items-center justify-center font-bold ${
                        idx === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}>
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-xs truncate">{tx.playerName}</div>
                        <div className="text-[11px] text-emerald-400 font-mono truncate">{tx.teamName}</div>
                      </div>
                    </div>

                    <div className="text-right font-mono font-bold text-sm text-amber-300 flex-shrink-0">
                      {tx.soldPrice.toLocaleString()} pts
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Upload / Manage Shortcut */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-white">Import Squad Data</div>
                <div className="text-[11px] text-slate-400">Excel / CSV Spreadsheet</div>
              </div>
            </div>
            <button
              onClick={() => onNavigate('import_excel')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Open
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
