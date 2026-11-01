import React, { useState, useEffect } from 'react';
import { useAuction } from '../context/AuctionContext';
import { GradeBadge } from '../components/GradeBadge';
import { RoleBadge } from '../components/RoleBadge';
import {
  Trophy,
  Clock,
  Shield,
  Users,
  History,
  Eye,
  Radio,
  Maximize2,
  Minimize2,
  Sparkles,
  Crown,
  Star,
  Tag,
  TrendingUp,
  CheckCircle2,
  Zap,
  Flame,
  Award,
} from 'lucide-react';

export const SpectatorView: React.FC = () => {
  const {
    tournament,
    currentPlayer,
    currentBid,
    currentBidder,
    teams,
    players,
    transactions,
    bidHistory,
    timerSeconds,
  } = useAuction();

  const [activeTab, setActiveTab] = useState<'live' | 'squads' | 'feed' | 'leaderboard'>('live');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');

  const soldPlayers = players.filter(p => p.status === 'sold');
  const recentSales = [...transactions].slice(0, 15);

  // Auto-switch to 'live' tab when a player is placed on the block
  useEffect(() => {
    if (currentPlayer) {
      setActiveTab('live');
    }
  }, [currentPlayer?.id]);

  // Fullscreen handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const totalPurseAllTeams = teams.reduce((acc, t) => acc + t.startingBudget, 0);
  const totalSpentAllTeams = teams.reduce((acc, t) => acc + t.totalSpent, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Live Broadcast Bar & Live Status Ticker */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 text-xs font-black px-4 py-1.5 flex items-center justify-between shadow-md overflow-hidden">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping"></span>
          <span className="tracking-widest uppercase font-mono text-[11px]">OFFICIAL LIVE MATCH CENTRE</span>
        </div>

        <div className="truncate mx-4 text-center font-mono text-[11px] hidden sm:block">
          {currentPlayer ? (
            <span>
              🔴 ON THE BLOCK: <span className="underline">{currentPlayer.name}</span> ({currentPlayer.role}) • HIGH BID: {currentBid.toLocaleString()} pts {currentBidder ? `by ${currentBidder.name}` : ''}
            </span>
          ) : (
            <span>
              STANDBY FOR NEXT LOT • {soldPlayers.length}/{players.length} PLAYERS SOLD • {teams.length} FRANCHISE TEAMS COMPETING
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px] flex-shrink-0">
          <Flame className="w-3.5 h-3.5 fill-slate-950" />
          <span>SEASON 2026</span>
        </div>
      </div>

      {/* Main Broadcast Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 flex-shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-white text-base sm:text-lg leading-tight truncate tracking-tight">
              {tournament.name}
            </h1>
            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>LIVE FEED</span>
              </span>
              <span>•</span>
              <span className="truncate">{teams.length} Franchises</span>
              <span>•</span>
              <span className="truncate">{tournament.venue || 'Auction Arena'}</span>
            </div>
          </div>
        </div>

        {/* View-Only Badge & Fullscreen Action */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs shadow-sm">
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>REAL-TIME SYNC</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 font-mono text-xs">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold">Spectator View</span>
          </div>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shadow"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Broadcast Navigation Sub-bar */}
      <div className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'live'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25 scale-105'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Live Bidding Lot</span>
            {currentPlayer && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('squads')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'squads'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25 scale-105'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{teams.length} Team Rosters</span>
          </button>

          <button
            onClick={() => setActiveTab('feed')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'feed'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25 scale-105'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Sold Feed ({soldPlayers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25 scale-105'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Purse Standings</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-slate-400">
          <div>
            Pool Sold: <span className="text-amber-400 font-bold">{soldPlayers.length}</span> / {players.length}
          </div>
          <div>•</div>
          <div>
            Total Spent: <span className="text-emerald-400 font-bold">{totalSpentAllTeams.toLocaleString()}</span> pts
          </div>
        </div>
      </div>

      {/* Main Broadcast Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* TAB 1: LIVE BIDDING LOT */}
        {activeTab === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Columns: Active Player Lot Spotlight */}
            <div className="lg:col-span-7 space-y-5">
              {currentPlayer ? (
                <div className="p-6 sm:p-7 rounded-3xl bg-slate-900 border-2 border-slate-800/80 shadow-[0_10px_40px_rgba(0,0,0,0.5)] space-y-6 relative overflow-hidden">
                  {/* Background Stadium Glow Accent */}
                  <div
                    style={{
                      background: `radial-gradient(circle at top right, ${
                        currentPlayer.grade === 'A+'
                          ? 'rgba(234, 179, 8, 0.15)'
                          : currentPlayer.grade === 'A'
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'rgba(16, 185, 129, 0.1)'
                      }, transparent 70%)`,
                    }}
                    className="absolute inset-0 pointer-events-none"
                  />

                  {/* Player Lot Top Bar */}
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex flex-wrap items-center gap-2">
                      <GradeBadge grade={currentPlayer.grade} size="md" />
                      <RoleBadge role={currentPlayer.role} size="md" />
                      {currentPlayer.isCaptain && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/40 flex items-center gap-1 shadow-sm">
                          👑 Captain
                        </span>
                      )}
                      {currentPlayer.isViceCaptain && (
                        <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold text-xs border border-sky-500/40 flex items-center gap-1 shadow-sm">
                          ⭐ Vice Captain
                        </span>
                      )}
                      {currentPlayer.sponsorTag && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/40 flex items-center gap-1 shadow-sm">
                          🏷️ {currentPlayer.sponsorTag}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 font-mono font-black text-amber-400 text-xs tracking-wider animate-pulse">
                        🔴 LOT #{currentPlayer.auctionOrder || 1}
                      </span>
                    </div>
                  </div>

                  {/* Player Bio Hero */}
                  <div className="flex items-start gap-4 sm:gap-6 relative z-10">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-3xl sm:text-4xl font-black text-slate-300 shadow-2xl overflow-hidden flex-shrink-0">
                      {currentPlayer.photo ? (
                        <img
                          src={currentPlayer.photo}
                          alt={currentPlayer.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{currentPlayer.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                        PLAYER ON THE BLOCK
                      </div>
                      <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                        {currentPlayer.name}
                      </h2>

                      <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                          (currentPlayer.ageCategory || '').includes('Below') || currentPlayer.age <= 15
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        }`}>
                          {currentPlayer.ageCategory || (currentPlayer.age <= 15 ? '15 and Below' : 'Above 15')}
                        </span>

                        {currentPlayer.gender && (
                          <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                            currentPlayer.gender.toLowerCase().startsWith('f')
                              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                              : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                          }`}>
                            {currentPlayer.gender.toLowerCase().startsWith('f') ? '♀ Female' : '♂ Male'}
                          </span>
                        )}

                        <span className="text-slate-400">
                          Exp: <strong className="text-white">{currentPlayer.experience} yrs</strong>
                        </span>
                      </div>

                      {(currentPlayer.description || currentPlayer.previousPerformance || currentPlayer.notes) && (
                        <div className="mt-2.5 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 italic font-sans leading-relaxed">
                          "{currentPlayer.description || currentPlayer.previousPerformance || currentPlayer.notes}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Career Stats Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 text-center font-mono bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs relative z-10">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Matches</div>
                      <div className="font-black text-white text-sm mt-0.5">{currentPlayer.stats?.matches ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Runs</div>
                      <div className="font-black text-amber-400 text-sm mt-0.5">{currentPlayer.stats?.runs ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Avg / SR</div>
                      <div className="font-bold text-slate-300 text-xs mt-0.5">
                        {(currentPlayer.stats?.average ?? 0).toFixed(1)} / {Math.round(currentPlayer.stats?.strikeRate ?? 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">High Score</div>
                      <div className="font-black text-amber-300 text-sm mt-0.5">{currentPlayer.stats?.highestScore ?? '-'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Wickets</div>
                      <div className="font-black text-emerald-400 text-sm mt-0.5">{currentPlayer.stats?.wickets ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Economy</div>
                      <div className="font-bold text-emerald-300 text-xs mt-0.5">
                        {(currentPlayer.stats?.economyRate ?? 0) > 0 ? (currentPlayer.stats?.economyRate ?? 0).toFixed(2) : '-'}
                      </div>
                    </div>
                  </div>

                  {/* Base Reserve Price Strip */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between font-mono text-xs relative z-10">
                    <span className="text-amber-300 font-bold uppercase tracking-wider">OFFICIAL BASE PRICE</span>
                    <span className="text-base font-black text-amber-400">{currentPlayer.basePrice.toLocaleString()} pts</span>
                  </div>
                </div>
              ) : (
                <div className="p-10 sm:p-14 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-4 shadow-2xl">
                  <div className="w-20 h-20 rounded-3xl bg-slate-800/80 mx-auto flex items-center justify-center text-4xl shadow-inner">
                    🏏
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white">Live Stage on Standby</h2>
                    <p className="text-sm text-slate-400 font-mono mt-1 max-w-md mx-auto">
                      {players.length
                        ? `${players.length} JCPL 4 players are loaded. Waiting for the next lot.`
                        : 'Awaiting the auctioneer to announce the next player lot on the bidding block...'}
                    </p>
                  </div>
                  {players.length > 0 && (
                    <div className="max-w-md mx-auto text-left space-y-2">
                      {players.filter((p) => p.status === 'upcoming').slice(0, 6).map((player) => (
                        <div key={player.id} className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                          <span className="text-sm text-white font-semibold">{player.name}</span>
                          <span className="text-[11px] font-mono text-slate-400">{player.role}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {recentSales.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-slate-800 max-w-md mx-auto text-left">
                      <div className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Most Recent Acquisition</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white text-base">{recentSales[0].playerName}</div>
                          <div className="text-xs text-emerald-400 font-mono">Acquired by {recentSales[0].teamName}</div>
                        </div>
                        <div className="font-mono font-black text-amber-400 text-lg">
                          {recentSales[0].soldPrice.toLocaleString()} pts
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right 5 Columns: Giant Live Bidding Board & History */}
            <div className="lg:col-span-5 space-y-5">
              {/* Giant Live Bid Spotlight Card */}
              <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-500/60 shadow-[0_0_40px_rgba(245,158,11,0.2)] text-center space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="text-slate-400">ROUND TIMER:</span>
                    <span className={`font-black text-sm ${timerSeconds <= 3 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                      {timerSeconds}s
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>LIVE</span>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-mono tracking-widest uppercase text-slate-400 font-bold">
                    CURRENT HIGH BID
                  </div>
                  <div className="text-5xl sm:text-6xl font-black font-mono text-amber-400 tracking-tight my-2 drop-shadow-[0_4px_15px_rgba(245,158,11,0.4)] animate-bid-pop">
                    {currentBid.toLocaleString()}
                    <span className="text-base font-medium text-slate-400 ml-2">pts</span>
                  </div>
                </div>

                {/* Leading Franchise Showcase */}
                <div className="min-h-[70px] flex items-center justify-center">
                  {currentBidder ? (
                    <div
                      style={{
                        borderColor: currentBidder.color || '#eab308',
                        background: `linear-gradient(135deg, ${currentBidder.color}15, rgba(2, 6, 23, 0.9))`,
                      }}
                      className="px-5 py-3 rounded-2xl border-2 shadow-xl flex items-center gap-3 w-full max-w-sm justify-center"
                    >
                      <span className="text-3xl">{currentBidder.logo}</span>
                      <div className="text-left">
                        <div className="text-[10px] text-amber-400 font-mono font-bold uppercase tracking-wider">
                          LEADING FRANCHISE BIDDER
                        </div>
                        <div className="text-base font-black text-white">{currentBidder.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Remaining Purse: {(currentBidder.remainingBudget - currentBid).toLocaleString()} pts
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-400">
                      {currentPlayer ? `Awaiting opening bid at ${currentPlayer.basePrice.toLocaleString()} pts` : 'No active bids'}
                    </div>
                  )}
                </div>

                {/* Lot Bidding Timeline */}
                <div className="pt-3 border-t border-slate-800 text-left">
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="text-slate-400 uppercase font-bold">Bidding Feed ({bidHistory.length})</span>
                    <span className="text-[10px] text-slate-500">Live Stream</span>
                  </div>

                  {bidHistory.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 text-center text-xs text-slate-500 font-mono">
                      No bids submitted in this round yet.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {bidHistory.map((bid, idx) => (
                        <div
                          key={bid.id || idx}
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono ${
                            idx === 0
                              ? 'border-amber-500/60 bg-amber-500/15 text-white font-bold'
                              : 'border-slate-800/80 bg-slate-950/60 text-slate-400'
                          }`}
                        >
                          <div className="truncate mr-2">
                            <span className="font-bold text-white">{bid.teamName}</span>
                            <span className="text-[10px] text-slate-500 ml-2">
                              {new Date(bid.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <span className="font-black text-amber-400 flex-shrink-0">
                            {bid.amount.toLocaleString()} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TEAM ROSTERS (DYNAMIC ALL 12+ TEAMS) */}
        {activeTab === 'squads' && (
          <div className="space-y-5">
            {/* Team Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2 pb-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSelectedTeamFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedTeamFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                All Franchises ({teams.length})
              </button>
              {teams.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTeamFilter(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedTeamFilter === t.id
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <span>{t.logo}</span>
                  <span>{t.shortName}</span>
                </button>
              ))}
            </div>

            {/* Teams Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {teams
                .filter(t => selectedTeamFilter === 'all' || t.id === selectedTeamFilter)
                .map(team => {
                  const squadPlayers = players.filter(p => team.squad.includes(p.id));
                  const percentSpent = (team.totalSpent / team.startingBudget) * 100;
                  const batsmen = squadPlayers.filter(p => p.role === 'Batsman').length;
                  const bowlers = squadPlayers.filter(p => p.role === 'Bowler').length;
                  const wk = squadPlayers.filter(p => p.role === 'Wicketkeeper').length;

                  return (
                    <div
                      key={team.id}
                      style={{ borderTopColor: team.color || '#eab308' }}
                      className="rounded-3xl bg-slate-900/90 border border-slate-800 border-t-4 p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-xl space-y-4"
                    >
                      {/* Franchise Card Header */}
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl p-2 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
                              {team.logo}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-black text-white text-base leading-tight">{team.name}</h3>
                                <span className="text-amber-400 font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20">
                                  {team.shortName}
                                </span>
                              </div>
                              <div className="text-xs text-amber-300 font-medium flex items-center gap-1 mt-0.5">
                                <Crown className="w-3.5 h-3.5 text-amber-400" />
                                <span>Captain: {team.captain || 'Designated Captain'}</span>
                              </div>
                            </div>
                          </div>

                          <span className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-slate-300">
                            {squadPlayers.length} Players
                          </span>
                        </div>

                        {/* Purse Bar */}
                        <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5 font-mono text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Remaining Purse:</span>
                            <span className="font-bold text-emerald-400 text-sm">{team.remainingBudget.toLocaleString()} pts</span>
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${percentSpent}%`, backgroundColor: team.color || '#eab308' }}
                              className="h-full transition-all duration-300"
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>Spent: {team.totalSpent.toLocaleString()} pts</span>
                            <span>{Math.round(percentSpent)}%</span>
                          </div>
                        </div>

                        {/* Role Distribution Pills */}
                        <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                          <div className="p-1.5 rounded-xl bg-slate-950 border border-slate-800">
                            <span className="text-[10px] text-slate-500 uppercase block">Batsmen</span>
                            <span className="font-bold text-rose-400">{batsmen}</span>
                          </div>
                          <div className="p-1.5 rounded-xl bg-slate-950 border border-slate-800">
                            <span className="text-[10px] text-slate-500 uppercase block">Bowlers</span>
                            <span className="font-bold text-indigo-400">{bowlers}</span>
                          </div>
                          <div className="p-1.5 rounded-xl bg-slate-950 border border-slate-800">
                            <span className="text-[10px] text-slate-500 uppercase block">WK</span>
                            <span className="font-bold text-amber-400">{wk}</span>
                          </div>
                        </div>

                        {/* Acquired Players List */}
                        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                          {squadPlayers.length === 0 ? (
                            <div className="text-center py-6 text-xs text-slate-500 font-mono border border-dashed border-slate-800 rounded-xl">
                              No players acquired yet.
                            </div>
                          ) : (
                            squadPlayers.map(p => (
                              <div
                                key={p.id}
                                className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2 truncate mr-2">
                                  <GradeBadge grade={p.grade} size="sm" />
                                  <span className="font-semibold text-white truncate">{p.name}</span>
                                  {p.isCaptain && <span className="text-[10px]">👑</span>}
                                  {p.isViceCaptain && <span className="text-[10px]">⭐</span>}
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
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB 3: SOLD FEED */}
        {activeTab === 'feed' && (
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-black text-white uppercase font-mono tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Official Tournament Sold Stream ({soldPlayers.length})</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time log of winning bids and franchise player acquisitions
                </p>
              </div>
            </div>

            {recentSales.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs">
                No players have been sold yet. The stream will update automatically as lots conclude.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentSales.map((tx, idx) => (
                  <div
                    key={tx.id || idx}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center justify-between text-xs gap-3"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 font-mono font-bold flex items-center justify-center text-xs flex-shrink-0">
                        #{idx + 1}
                      </span>
                      <GradeBadge grade={tx.playerGrade} size="sm" />
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm truncate">{tx.playerName}</div>
                        <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
                          Sold to <strong className="text-white">{tx.teamName}</strong> • {new Date(tx.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono font-black text-amber-400 text-base flex-shrink-0">
                      {tx.soldPrice.toLocaleString()} pts
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PURSE STANDINGS LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-base font-black text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>Franchise Purse & Squad Standings ({teams.length} Teams)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ranked by remaining auction purse points and roster fulfillment
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {[...teams]
                .sort((a, b) => b.remainingBudget - a.remainingBudget)
                .map((t, rank) => {
                  const percent = Math.round((t.totalSpent / t.startingBudget) * 100);
                  return (
                    <div
                      key={t.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 text-center font-mono font-bold text-amber-400 text-sm">
                          #{rank + 1}
                        </span>
                        <span className="text-3xl">{t.logo}</span>
                        <div className="min-w-0">
                          <div className="font-bold text-white text-sm truncate">{t.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Squad: <span className="text-white font-semibold">{t.squad.length} players</span> • Captain: {t.captain || 'TBD'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-mono flex-shrink-0">
                        <div className="text-emerald-400 font-black text-base">{t.remainingBudget.toLocaleString()} pts</div>
                        <div className="text-[10px] text-slate-500">Spent: {t.totalSpent.toLocaleString()} ({percent}%)</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </main>

      {/* Broadcast Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/80 px-4 py-3 text-center text-xs font-mono text-slate-500">
        <div>Official Tournament Auction Broadcast Feed • Live Sync Active ({teams.length} Teams)</div>
      </footer>
    </div>
  );
};
