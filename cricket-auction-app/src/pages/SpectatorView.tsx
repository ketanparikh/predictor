import React, { useState } from 'react';
import { useAuction } from '../context/AuctionContext';
import { GradeBadge } from '../components/GradeBadge';
import { RoleBadge } from '../components/RoleBadge';
import { Trophy, Clock, Shield, Users, History, Eye, ArrowLeft, Radio } from 'lucide-react';

interface SpectatorViewProps {}

export const SpectatorView: React.FC<SpectatorViewProps> = () => {
  const {
    tournament,
    currentPlayer,
    currentBid,
    currentBidder,
    teams,
    players,
    transactions,
    timerSeconds,
  } = useAuction();

  const [activeTab, setActiveTab] = useState<'live' | 'squads' | 'feed'>('live');

  const soldPlayers = players.filter(p => p.status === 'sold');
  const recentSales = [...transactions].slice(0, 8);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm sm:text-base leading-tight">
              {tournament.name}
            </h1>
            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>LIVE SPECTATOR FEED • {tournament.season}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>LIVE SYNC</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 font-mono">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>Read-Only</span>
          </div>
        </div>
      </header>


      {/* Spectator Sub-navigation Tabs */}
      <div className="bg-slate-900/50 border-b border-slate-800 px-4 py-2 flex items-center gap-2">
        <button
          onClick={() => setActiveTab('live')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'live'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Live Bidding Lot</span>
        </button>

        <button
          onClick={() => setActiveTab('squads')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'squads'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>10 Team Rosters</span>
        </button>

        <button
          onClick={() => setActiveTab('feed')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'feed'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Sold Feed ({soldPlayers.length})</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <main className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-6">
        {activeTab === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Live Player Lot & Giant Bid */}
            <div className="lg:col-span-7 space-y-5">
              {currentPlayer ? (
                <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GradeBadge grade={currentPlayer.grade} size="md" />
                      <RoleBadge role={currentPlayer.role} size="md" />
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      ON BLOCK NOW
                    </span>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl font-extrabold text-slate-300 shadow overflow-hidden flex-shrink-0">
                      {currentPlayer.photo ? (
                        <img src={currentPlayer.photo} alt={currentPlayer.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{currentPlayer.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider mb-1">
                        PLAYER LOT #{currentPlayer.id}
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                        {currentPlayer.name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 mt-2 font-mono text-xs text-slate-400">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          (currentPlayer.ageCategory || '').includes('Below') || currentPlayer.age <= 14
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        }`}>
                          {currentPlayer.ageCategory || (currentPlayer.age <= 14 ? 'Below 14' : 'Above 14')}
                        </span>
                        {currentPlayer.gender && (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            currentPlayer.gender.toLowerCase().startsWith('f')
                              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                              : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                          }`}>
                            {currentPlayer.gender.toLowerCase().startsWith('f') ? '♀ Female' : '♂ Male'}
                          </span>
                        )}
                        <span>•</span>
                        <span>Primary Skill: <span className="text-amber-400 font-bold">{currentPlayer.role}</span></span>
                      </div>
                      {(currentPlayer.description || currentPlayer.previousPerformance || currentPlayer.notes) && (
                        <p className="text-xs text-slate-300 mt-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 leading-snug font-sans italic">
                          "{currentPlayer.description || currentPlayer.previousPerformance || currentPlayer.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Career Stats */}
                  <div className="grid grid-cols-4 gap-2 text-center font-mono bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Matches</div>
                      <div className="font-bold text-white mt-0.5">{currentPlayer.stats?.matches ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Runs</div>
                      <div className="font-bold text-amber-300 mt-0.5">{currentPlayer.stats?.runs ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Avg / SR</div>
                      <div className="font-bold text-sky-400 mt-0.5">
                        {(currentPlayer.stats?.average ?? 0).toFixed(1)} / {Math.round(currentPlayer.stats?.strikeRate ?? 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Wickets</div>
                      <div className="font-bold text-emerald-400 mt-0.5">{currentPlayer.stats?.wickets ?? 0}</div>
                    </div>
                  </div>


                  {/* Live Bid Banner */}
                  <div className="p-5 rounded-2xl bg-slate-950 border-2 border-amber-500/50 text-center space-y-2">
                    <div className="text-xs font-mono font-bold text-slate-400 uppercase">CURRENT HIGHEST BID</div>
                    <div className="text-5xl font-black font-mono text-amber-400 animate-bid-pop">
                      {currentBid.toLocaleString()} <span className="text-lg text-slate-400 font-normal">pts</span>
                    </div>

                    <div className="pt-2">
                      {currentBidder ? (
                        <div
                          style={{ borderColor: currentBidder.color }}
                          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-900 border"
                        >
                          <span className="text-2xl">{currentBidder.logo}</span>
                          <span className="font-bold text-white text-sm">{currentBidder.name}</span>
                        </div>
                      ) : (
                        <div className="text-xs font-mono text-slate-400">Opening Bid: {currentPlayer.basePrice.toLocaleString()} pts</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-xl">
                  <div className="text-5xl">🏏</div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white">Auction Lot in Standby</h2>
                    <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1">
                      Waiting for the auctioneer to place the next player on the bidding block...
                    </p>
                  </div>
                  {recentSales.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-800/80 max-w-md mx-auto text-left">
                      <div className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider mb-2">
                        Most Recent Acquisition
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white text-sm">{recentSales[0].playerName}</div>
                          <div className="text-xs text-emerald-400 font-mono">Sold to {recentSales[0].teamName}</div>
                        </div>
                        <div className="font-mono font-black text-amber-400 text-base">
                          {recentSales[0].soldPrice.toLocaleString()} pts
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Team Budget Standings */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">
                  Franchise Remaining Budgets
                </h3>
                <div className="space-y-2">
                  {[...teams]
                    .sort((a, b) => b.remainingBudget - a.remainingBudget)
                    .map(team => (
                      <div
                        key={team.id}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span>{team.logo}</span>
                          <span className="font-bold text-white truncate">{team.name}</span>
                        </div>
                        <div className="font-bold text-emerald-400 flex-shrink-0">
                          {team.remainingBudget.toLocaleString()} pts
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'squads' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map(team => {
              const squadPlayers = players.filter(p => team.squad.includes(p.id));
              return (
                <div key={team.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{team.logo}</span>
                      <div>
                        <h3 className="font-bold text-white text-sm">{team.name}</h3>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {squadPlayers.length} players acquired
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <div className="text-slate-400">Purse Left</div>
                      <div className="font-bold text-emerald-400">{team.remainingBudget.toLocaleString()} pts</div>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {squadPlayers.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-500">No players acquired yet.</div>
                    ) : (
                      squadPlayers.map(p => (
                        <div key={p.id} className="p-2 rounded-lg bg-slate-950 border border-slate-800/60 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-semibold text-white truncate">{p.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">({p.role})</span>
                          </div>
                          <span className="font-mono text-amber-400 font-bold flex-shrink-0">
                            {p.soldPrice?.toLocaleString()} pts
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'feed' && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase font-mono">Live Transaction Feed</h2>
            <div className="space-y-2">
              {recentSales.map((tx, idx) => (
                <div key={tx.id || idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <GradeBadge grade={tx.playerGrade} size="sm" />
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{tx.playerName}</div>
                      <div className="text-[11px] text-emerald-400 font-mono">Sold to {tx.teamName}</div>
                    </div>
                  </div>
                  <div className="text-right font-mono font-bold text-amber-400 text-sm flex-shrink-0">
                    {tx.soldPrice.toLocaleString()} pts
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
