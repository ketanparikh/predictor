import React from 'react';
import { useAuction } from '../context/AuctionContext';
import { exportAuctionToExcel, exportAuctionToPDF } from '../utils/excelParser';
import { GradeBadge } from '../components/GradeBadge';
import { RoleBadge } from '../components/RoleBadge';
import {
  Trophy,
  Award,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Shield,
  Coins,
  Users,
  TrendingUp,
} from 'lucide-react';

export const AuctionCompletePage: React.FC = () => {
  const { tournament, teams, players, transactions } = useAuction();

  const totalPointsSpent = teams.reduce((acc, t) => acc + t.totalSpent, 0);
  const totalPlayersSold = players.filter(p => p.status === 'sold').length;
  const totalPlayersUnsold = players.filter(p => p.status === 'unsold').length;

  const topPurchases = [...transactions].sort((a, b) => b.soldPrice - a.soldPrice);
  const mostExpensivePlayer = topPurchases[0] || null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-900 border-2 border-amber-500/50 p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>OFFICIAL TOURNAMENT AUCTION COMPLETE</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {tournament.name} Final Results
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-mono">
              {tournament.season} • {teams.length} Franchise Squads Finalized • {totalPointsSpent.toLocaleString()} pts Total Spent
            </p>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0 no-print">
            <button
              onClick={() => exportAuctionToExcel(tournament, teams, players, transactions)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel (.xlsx)</span>
            </button>

            <button
              onClick={() => exportAuctionToPDF(tournament, teams, players, transactions)}
              className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-all shadow-lg shadow-sky-600/20 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>Export PDF Report</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Headline Marquee Figures */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Most Expensive Player */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 font-mono uppercase font-bold">MOST EXPENSIVE PLAYER</div>
            <div className="text-base font-extrabold text-white truncate mt-0.5">
              {mostExpensivePlayer ? mostExpensivePlayer.playerName : 'N/A'}
            </div>
            <div className="text-xs font-mono font-bold text-amber-400">
              {mostExpensivePlayer ? `${mostExpensivePlayer.soldPrice.toLocaleString()} pts (${mostExpensivePlayer.teamName})` : '-'}
            </div>
          </div>
        </div>

        {/* Total Spending */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-mono uppercase font-bold">TOTAL POINTS SPENT</div>
            <div className="text-base font-black text-emerald-400 mt-0.5 font-mono">
              {totalPointsSpent.toLocaleString()} pts
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Across {totalPlayersSold} acquired players
            </div>
          </div>
        </div>

        {/* Unsold Players Count */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-mono uppercase font-bold">UNSOLD / UNCLAIMED</div>
            <div className="text-base font-black text-rose-400 mt-0.5 font-mono">
              {totalPlayersUnsold} Players
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Eligible for post-auction drafting
            </div>
          </div>
        </div>
      </div>

      {/* Team Final Rankings Table */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
        <h2 className="text-base font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          <span>Official 10-Franchise Squad Standings</span>
        </h2>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Rank</th>
                <th className="p-3">Franchise Team</th>
                <th className="p-3">Squad Size</th>
                <th className="p-3">Points Spent</th>
                <th className="p-3">Purse Remaining</th>
                <th className="p-3">Avg Price / Player</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
              {[...teams]
                .sort((a, b) => b.squad.length - a.squad.length || b.totalSpent - a.totalSpent)
                .map((team, idx) => (
                  <tr key={team.id} className="hover:bg-slate-800/50">
                    <td className="p-3 font-bold text-slate-400">#{idx + 1}</td>
                    <td className="p-3 font-sans font-bold text-white flex items-center gap-2.5">
                      <span className="text-xl">{team.logo}</span>
                      <span>{team.name}</span>
                    </td>
                    <td className="p-3 font-bold text-white">{team.squad.length} players</td>
                    <td className="p-3 font-bold text-amber-400">{team.totalSpent.toLocaleString()} pts</td>
                    <td className="p-3 font-bold text-emerald-400">{team.remainingBudget.toLocaleString()} pts</td>
                    <td className="p-3 text-slate-300">
                      {team.squad.length > 0 ? Math.round(team.totalSpent / team.squad.length).toLocaleString() : 0} pts
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Purchases Leaderboard */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
        <h2 className="text-base font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <span>Top Marquee Auction Buys</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {topPurchases.slice(0, 6).map((tx, idx) => (
            <div key={tx.id} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className={`w-6 h-6 rounded-full text-xs font-mono font-black flex items-center justify-center ${
                  idx === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}>
                  #{idx + 1}
                </span>
                <GradeBadge grade={tx.playerGrade} size="sm" />
              </div>

              <div>
                <div className="font-bold text-white text-sm">{tx.playerName}</div>
                <div className="text-xs text-emerald-300 font-mono mt-0.5">{tx.teamName}</div>
              </div>

              <div className="text-right font-mono font-black text-amber-400 text-base">
                {tx.soldPrice.toLocaleString()} pts
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
