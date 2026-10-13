import React, { useEffect, useState } from 'react';
import { useAuction } from '../context/AuctionContext';
import { GradeBadge } from '../components/GradeBadge';
import { RoleBadge } from '../components/RoleBadge';
import { Trophy, Maximize, Minimize, ArrowLeft, Clock, Shield } from 'lucide-react';

interface ProjectorViewProps {
  onClose: () => void;
}

export const ProjectorView: React.FC<ProjectorViewProps> = ({ onClose }) => {
  const {
    tournament,
    currentPlayer,
    currentBid,
    currentBidder,
    teams,
    timerSeconds,
    isTimerRunning,
  } = useAuction();

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-8 font-sans select-none">
      {/* Top TV Header Bar */}
      <header className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 text-2xl font-black shadow-lg shadow-amber-500/30">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {tournament.name}
            </h1>
            <div className="text-xs sm:text-sm text-amber-400 font-mono font-semibold">
              LIVE PLAYER AUCTION • {tournament.season}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Timer Pill */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 border border-slate-800 font-mono">
            <Clock className={`w-5 h-5 ${timerSeconds <= 3 && isTimerRunning ? 'text-rose-400 animate-spin' : 'text-amber-400'}`} />
            <span className="text-slate-400 text-xs uppercase font-bold">TIMER:</span>
            <span className={`text-xl font-black ${timerSeconds <= 3 && isTimerRunning ? 'text-rose-400 animate-ping' : 'text-amber-400'}`}>
              {timerSeconds}s
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Admin Console</span>
          </button>
        </div>
      </header>

      {/* Main Projector Screen Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch my-auto">
        {/* Left 7 Cols: Big Player Profile & Current Bid Hero Card */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6 bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {currentPlayer ? (
            <>
              {/* Player Top Meta */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <GradeBadge grade={currentPlayer.grade} size="lg" />
                    <RoleBadge role={currentPlayer.role} size="lg" />
                  </div>
                  <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 font-mono text-xs font-bold text-slate-300">
                    LOT #{currentPlayer.auctionOrder || 1}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-4xl sm:text-5xl font-extrabold text-slate-300 shadow-2xl overflow-hidden flex-shrink-0">
                    {currentPlayer.photo ? (
                      <img src={currentPlayer.photo} alt={currentPlayer.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{currentPlayer.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                      {currentPlayer.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2.5 text-base sm:text-lg text-slate-400 font-mono mt-1">
                      <span className={`px-2.5 py-1 rounded-xl text-sm font-bold ${
                        (currentPlayer.ageCategory || '').includes('Below') || currentPlayer.age <= 14
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      }`}>
                        {currentPlayer.ageCategory || (currentPlayer.age <= 14 ? 'Below 14' : 'Above 14')}
                      </span>
                      {currentPlayer.gender && (
                        <span className={`px-2.5 py-1 rounded-xl text-sm font-bold ${
                          currentPlayer.gender.toLowerCase().startsWith('f')
                            ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        }`}>
                          {currentPlayer.gender.toLowerCase().startsWith('f') ? '♀ Female' : '♂ Male'}
                        </span>
                      )}
                      <span>•</span>
                      <span className="text-amber-400 font-bold">Primary Skill: {currentPlayer.role}</span>
                    </div>
                    {(currentPlayer.description || currentPlayer.previousPerformance || currentPlayer.notes) && (
                      <div className="mt-2 p-3 rounded-2xl bg-slate-950/80 border border-amber-500/30 text-sm text-slate-200 leading-relaxed font-sans italic">
                        <span className="text-xs text-amber-400 font-mono font-bold uppercase block mb-0.5 not-italic">Player Details / Description:</span>
                        "{currentPlayer.description || currentPlayer.previousPerformance || currentPlayer.notes}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Key Statistics Pill Bar */}
                <div className="grid grid-cols-4 gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-center font-mono">
                  <div>
                    <div className="text-xs text-slate-400 uppercase">Matches</div>
                    <div className="text-lg sm:text-xl font-black text-white mt-0.5">{currentPlayer.stats?.matches ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 uppercase">Runs</div>
                    <div className="text-lg sm:text-xl font-black text-amber-400 mt-0.5">{currentPlayer.stats?.runs ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 uppercase">Avg / SR</div>
                    <div className="text-lg sm:text-xl font-black text-sky-400 mt-0.5">
                      {(currentPlayer.stats?.average ?? 0).toFixed(1)} / {Math.round(currentPlayer.stats?.strikeRate ?? 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 uppercase">Wickets</div>
                    <div className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5">{currentPlayer.stats?.wickets ?? 0}</div>
                  </div>
                </div>
              </div>


              {/* Giant Live Bid Board in Projector Mode */}
              <div className="p-6 rounded-2xl bg-slate-950 border-2 border-amber-500/60 text-center space-y-3 shadow-[0_0_40px_rgba(245,158,11,0.2)]">
                <div className="text-xs sm:text-sm font-mono uppercase tracking-widest text-slate-400 font-bold">
                  CURRENT AUCTION BID
                </div>
                <div className="text-5xl sm:text-7xl font-black font-mono text-amber-400 tracking-tight animate-bid-pop">
                  {currentBid.toLocaleString()}
                  <span className="text-xl sm:text-2xl font-normal text-slate-400 ml-3">pts</span>
                </div>

                {/* Highest Bidder Banner */}
                <div className="pt-1">
                  {currentBidder ? (
                    <div
                      style={{ borderColor: currentBidder.color }}
                      className="inline-flex items-center gap-4 px-6 py-3 rounded-2xl bg-slate-900 border-2 shadow-2xl"
                    >
                      <span className="text-3xl sm:text-4xl">{currentBidder.logo}</span>
                      <div className="text-left">
                        <div className="text-xs text-slate-400 font-mono font-bold uppercase">LEADING BIDDER</div>
                        <div className="text-xl sm:text-2xl font-black text-white">{currentBidder.name}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm font-mono text-slate-400">
                      Opening at Base Price: {currentPlayer.basePrice.toLocaleString()} pts
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 my-auto p-12">
              <div className="w-24 h-24 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-5xl">
                🏏
              </div>
              <h2 className="text-3xl font-black text-white">Auction Lot in Standby</h2>
              <p className="text-base text-slate-400 max-w-md font-mono">
                The auctioneer is preparing the next player lot. Live bids will display here automatically.
              </p>
            </div>
          )}
        </div>

        {/* Right 5 Cols: Live Franchise Points Leaderboard */}
        <div className="lg:col-span-5 bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white uppercase font-mono">Team Budget Standings</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">10 Teams</span>
          </div>

          {/* 10 Team Rows */}
          <div className="space-y-2 flex-1 overflow-y-auto pr-1">
            {[...teams]
              .sort((a, b) => b.remainingBudget - a.remainingBudget)
              .map((team, idx) => {
                const isLeadingThisRound = currentBidder?.id === team.id;
                return (
                  <div
                    key={team.id}
                    style={{
                      borderLeftColor: team.color || '#3b82f6',
                      borderLeftWidth: '5px',
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 font-mono transition-all ${
                      isLeadingThisRound
                        ? 'border-amber-500 bg-amber-500/20 ring-2 ring-amber-400 shadow-lg'
                        : 'border-slate-800 bg-slate-950/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-5 text-center font-bold text-slate-500 text-xs">
                        #{idx + 1}
                      </span>
                      <span className="text-2xl">{team.logo}</span>
                      <div className="truncate min-w-0">
                        <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                          <span>{team.name}</span>
                          {isLeadingThisRound && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[10px] font-black">
                              BIDDER
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Squad: <span className="text-white font-semibold">{team.squad.length} players</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-bold text-base text-emerald-400 flex-shrink-0">
                      {team.remainingBudget.toLocaleString()} <span className="text-xs text-slate-500">pts</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </main>

      {/* Projector Footer Strip */}
      <footer className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 font-mono">
        <div>Tournament Venue Display Engine • Live Multi-Screen Sync Active</div>
        <div className="text-amber-400">PCL Official Auction System</div>
      </footer>
    </div>
  );
};
