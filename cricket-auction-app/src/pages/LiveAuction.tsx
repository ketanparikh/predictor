import React, { useState, useEffect, useRef } from 'react';
import { useAuction } from '../context/AuctionContext';
import { GradeBadge } from '../components/GradeBadge';
import { RoleBadge } from '../components/RoleBadge';
import { Player } from '../types/auction';
import {
  Gavel,
  CheckCircle2,
  XCircle,
  RotateCcw,
  SkipForward,
  Play,
  Pause,
  Clock,
  AlertTriangle,
  User,
  Shield,
  Coins,
  Tv,
  Search,
  Crown,
  Star,
  Tag,
  FlaskConical,
  Zap,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

interface LiveAuctionProps {
  onOpenProjector: () => void;
}

export const LiveAuction: React.FC<LiveAuctionProps> = ({ onOpenProjector }) => {
  const {
    teams,
    players,
    currentPlayer,
    currentBid,
    currentBidder,
    bidHistory,
    timerSeconds,
    isTimerRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    placeBid,
    undoLastBid,
    markPlayerSold,
    directSellPlayer,
    markPlayerUnsold,
    skipOrNextPlayer,
    startAuctionForPlayer,
    undoLastResult,
    lastActionResult,
    rules,
    calculateMaxAllowableBid,
    isMockAuction,
    toggleMockAuction,
    resetMockAuction,
  } = useAuction();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Custom Bid and Direct Sell State
  const [customBidAmount, setCustomBidAmount] = useState<string>('');
  const [directSellTeamId, setDirectSellTeamId] = useState<string>('');
  const [directSellAmount, setDirectSellAmount] = useState<string>('');

  // Alerts
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const upcomingPlayers = players.filter(p => p.status === 'upcoming');

  // Keep direct sell amount in sync with current bid or player base price
  useEffect(() => {
    if (currentPlayer) {
      setDirectSellAmount(String(currentBid > 0 ? currentBid : currentPlayer.basePrice));
    } else {
      setDirectSellAmount('');
      setDirectSellTeamId('');
    }
  }, [currentPlayer, currentBid]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = searchQuery.trim()
    ? players
        .filter(p =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.grade.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.sponsorTag && p.sponsorTag.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .slice(0, 8)
    : [];

  const handleTeamBid = (teamId: string, increment?: number) => {
    setErrorMessage(null);
    const res = placeBid(teamId, increment);
    if (!res.success && res.message) {
      setErrorMessage(res.message);
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const handleCustomBid = (teamId: string) => {
    const amount = Number(customBidAmount);
    if (!amount || isNaN(amount)) {
      setErrorMessage('Please enter a valid bid amount.');
      return;
    }
    setErrorMessage(null);
    const res = placeBid(teamId, amount, true);
    if (!res.success && res.message) {
      setErrorMessage(res.message);
      setTimeout(() => setErrorMessage(null), 4000);
    } else {
      setCustomBidAmount('');
    }
  };

  const handleSold = () => {
    const res = markPlayerSold();
    if (!res.success && res.message) {
      setErrorMessage(res.message);
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const handleDirectSell = () => {
    if (!directSellTeamId) {
      setErrorMessage('Please select a franchise team to sell to.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }
    const amount = Number(directSellAmount);
    if (!amount || amount <= 0 || isNaN(amount)) {
      setErrorMessage('Please enter a valid sold price in points.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }
    setErrorMessage(null);
    const res = directSellPlayer(directSellTeamId, amount);
    if (!res.success) {
      setErrorMessage(res.message || 'Direct sell failed.');
      setTimeout(() => setErrorMessage(null), 4500);
    } else {
      setSuccessMessage(res.message || 'Player successfully sold!');
      setTimeout(() => setSuccessMessage(null), 4000);
      setDirectSellTeamId('');
    }
  };

  // Timer alert stages
  let timerBanner = null;
  if (timerSeconds <= 3 && timerSeconds > 0 && isTimerRunning) {
    timerBanner = (
      <div className="text-sm font-black tracking-widest text-amber-300 animate-bounce">
        {timerSeconds === 3 ? 'GOING ONCE...' : timerSeconds === 2 ? 'GOING TWICE...' : 'FINAL CALL!'}
      </div>
    );
  } else if (timerSeconds === 0) {
    timerBanner = <div className="text-sm font-black tracking-widest text-rose-400 animate-pulse">TIME EXPIRED!</div>;
  }

  const isPlayerSponsored = currentPlayer ? (currentPlayer.isSponsored || Boolean(currentPlayer.sponsorTag?.trim())) : false;

  return (
    <div className="space-y-4">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Gavel className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Live Cricket Auction Studio</h2>
              {isMockAuction && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/50 text-purple-300 text-[10px] font-bold tracking-wider uppercase animate-pulse">
                  🧪 Mock Mode
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {upcomingPlayers.length} players available in auction pool
            </p>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mock Auction Mode Toggle */}
          <button
            onClick={() => toggleMockAuction()}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              isMockAuction
                ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 shadow-lg shadow-purple-900/30'
                : 'bg-slate-900 hover:bg-slate-800 text-purple-300 border-purple-800/40'
            }`}
            title="Toggle safe mock auction simulation"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>{isMockAuction ? 'Mock Mode ON' : 'Test Mock Auction'}</span>
          </button>

          {isMockAuction && (
            <button
              onClick={resetMockAuction}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
              title="Reset mock auction data and restore tournament state"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Reset Mock</span>
            </button>
          )}

          {lastActionResult && (
            <button
              onClick={() => {
                const res = undoLastResult();
                if (res.success) {
                  setSuccessMessage(res.message);
                  setTimeout(() => setSuccessMessage(null), 3500);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer"
              title={`Undo last action: ${lastActionResult.player.name}`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo Last Action</span>
            </button>
          )}

          {upcomingPlayers.length > 0 && (
            <button
              onClick={skipOrNextPlayer}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Next Player Lot</span>
            </button>
          )}

          <button
            onClick={onOpenProjector}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow flex items-center gap-1.5"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Spectator View</span>
          </button>
        </div>
      </div>

      {/* Mock Mode Notification Banner */}
      {isMockAuction && (
        <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-600/40 text-purple-200 text-xs flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-purple-400 flex-shrink-0 animate-bounce" />
            <span>
              <strong>Simulation Mode Active:</strong> Bids and sales are strictly isolated to this test session. Official tournament databases remain untouched.
            </span>
          </div>
          <button
            onClick={() => toggleMockAuction(false)}
            className="px-2.5 py-1 rounded bg-purple-700 hover:bg-purple-600 text-white font-bold text-[11px] shrink-0"
          >
            Exit Mock Mode
          </button>
        </div>
      )}

      {/* Success alert */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2 animate-bid-pop shadow-lg">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search Bar for Adding Any Player to Auction */}
      <div ref={searchRef} className="relative z-30">
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2 shadow-md">
          <Search className="w-4 h-4 text-amber-400 ml-1 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search any player by name, role, grade, or sponsor to immediately put on the block..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setIsSearchOpen(false);
              }}
              className="text-xs text-slate-400 hover:text-white px-2"
            >
              Clear
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
            <div className="p-2 text-[11px] font-mono font-bold text-slate-400 border-b border-slate-800 uppercase tracking-wider">
              Matching Players ({searchResults.length})
            </div>
            {searchResults.map(p => (
              <div
                key={p.id}
                className="p-2.5 hover:bg-slate-800/80 border-b border-slate-800/60 last:border-0 flex items-center justify-between gap-3 text-xs transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                    {p.name.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-white flex items-center gap-2 truncate">
                      <span className="truncate">{p.name}</span>
                      {p.isCaptain && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono flex items-center gap-0.5">
                          <Crown className="w-2.5 h-2.5 text-amber-400" /> Captain
                        </span>
                      )}
                      {p.isViceCaptain && (
                        <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 text-[10px] font-mono flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 text-sky-400" /> Vice Captain
                        </span>
                      )}
                      {p.sponsorTag && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono flex items-center gap-0.5">
                          <Tag className="w-2.5 h-2.5 text-emerald-400" /> {p.sponsorTag}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                      <span className="text-slate-300">{p.role}</span>
                      <span>•</span>
                      <span>Grade: <strong className="text-white">{p.grade}</strong></span>
                      <span>•</span>
                      <span>Base: <strong className="text-amber-400">{p.basePrice.toLocaleString()} pts</strong></span>
                      <span>•</span>
                      <span className={p.status === 'sold' ? 'text-emerald-400' : p.status === 'unsold' ? 'text-rose-400' : 'text-sky-400'}>
                        {p.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    startAuctionForPlayer(p.id);
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 shadow transition-all cursor-pointer"
                >
                  <Gavel className="w-3.5 h-3.5" />
                  <span>Auction Now</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Single-Screen Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Player Hero Profile & Stats (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {currentPlayer ? (
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
              {/* Card Header with Badges */}
              <div className="p-5 pb-4 bg-gradient-to-b from-slate-900 to-slate-950/60 border-b border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <GradeBadge grade={currentPlayer.grade} size="md" />
                    <RoleBadge role={currentPlayer.role} size="md" />
                    {currentPlayer.isCaptain && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        <Crown className="w-3.5 h-3.5 text-amber-400" /> Captain
                      </span>
                    )}
                    {currentPlayer.isViceCaptain && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                        <Star className="w-3.5 h-3.5 text-sky-400" /> Vice Captain
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-slate-400 font-semibold">
                    LOT #{currentPlayer.auctionOrder || 1}
                  </span>
                </div>

                {/* Player Photo & Basic Bio */}
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border-2 border-slate-700 flex items-center justify-center text-slate-300 font-extrabold text-2xl shadow-inner overflow-hidden flex-shrink-0">
                    {currentPlayer.photo ? (
                      <img src={currentPlayer.photo} alt={currentPlayer.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-slate-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl font-black text-white tracking-tight leading-tight">
                      {currentPlayer.name}
                    </h1>
                    <div className="text-xs text-slate-400 mt-1 font-mono flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        (currentPlayer.ageCategory || '').includes('Below') || currentPlayer.age <= 15
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      }`}>
                        {currentPlayer.ageCategory || (currentPlayer.age <= 15 ? '15 and Below' : 'Above 15')}
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
                      <span className="text-amber-300 font-bold">{currentPlayer.role}</span>
                    </div>

                    {/* Sponsor Tag display */}
                    {(currentPlayer.sponsorTag || currentPlayer.isSponsored) && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                        <Tag className="w-3 h-3 text-emerald-400" />
                        <span>Sponsor: {currentPlayer.sponsorTag || 'Sponsored'}</span>
                      </div>
                    )}

                    {(currentPlayer.description || currentPlayer.previousPerformance || currentPlayer.notes) && (
                      <p className="text-xs text-slate-200 mt-1.5 line-clamp-2 leading-relaxed bg-slate-950/80 p-2 rounded-lg border border-amber-500/20 font-sans italic">
                        "{currentPlayer.description || currentPlayer.previousPerformance || currentPlayer.notes}"
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Career Statistics Grid */}
              <div className="p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Career Match Statistics
                </h3>
                <div className="grid grid-cols-4 gap-2 text-center font-mono">
                  <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase">Matches</div>
                    <div className="font-bold text-sm text-slate-200 mt-0.5">{currentPlayer.stats.matches}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase">Runs</div>
                    <div className="font-bold text-sm text-amber-300 mt-0.5">{currentPlayer.stats.runs}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase">Bat Avg</div>
                    <div className="font-bold text-sm text-white mt-0.5">
                      {currentPlayer.stats.average > 0 ? currentPlayer.stats.average.toFixed(1) : '-'}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase">Strike Rate</div>
                    <div className="font-bold text-sm text-sky-400 mt-0.5">
                      {currentPlayer.stats.strikeRate > 0 ? currentPlayer.stats.strikeRate.toFixed(1) : '-'}
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase">50s / 100s</div>
                    <div className="font-bold text-sm text-slate-300 mt-0.5">
                      {currentPlayer.stats.fifties}/{currentPlayer.stats.hundreds}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase">High Score</div>
                    <div className="font-bold text-sm text-amber-400 mt-0.5">{currentPlayer.stats.highestScore}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase">Wickets</div>
                    <div className="font-bold text-sm text-emerald-400 mt-0.5">{currentPlayer.stats.wickets}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase">Economy</div>
                    <div className="font-bold text-sm text-emerald-300 mt-0.5">
                      {currentPlayer.stats.economyRate > 0 ? currentPlayer.stats.economyRate.toFixed(2) : '-'}
                    </div>
                  </div>
                </div>

                {/* Base Price Strip */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                  <span className="text-xs text-amber-300 font-mono font-semibold">RESERVE BASE PRICE</span>
                  <span className="text-base font-black font-mono text-amber-400">
                    {currentPlayer.basePrice.toLocaleString()} pts
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-900/80 border border-dashed border-slate-800 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 mx-auto flex items-center justify-center text-slate-500">
                <Gavel className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">No Player on Block</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Use the search bar above or click Next Lot to begin bidding.
                </p>
              </div>

              {upcomingPlayers.length > 0 && (
                <button
                  onClick={() => startAuctionForPlayer(upcomingPlayers[0].id)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow cursor-pointer"
                >
                  Start Lot: {upcomingPlayers[0].name}
                </button>
              )}
            </div>
          )}
        </div>

        {/* CENTER COLUMN: Bidding Board, Direct Sell Panel & 10 Team Pads (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Main Glowing Bid Board */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border-2 border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.15)] text-center space-y-4">
            {/* Timer Strip */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-mono">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-slate-400">TIMER:</span>
                <span className={`font-black text-sm ${timerSeconds <= 3 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                  {timerSeconds}s
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {isTimerRunning ? (
                  <button
                    onClick={pauseTimer}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Pause Timer"
                  >
                    <Pause className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={startTimer}
                    className="p-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                    title="Start Timer"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={resetTimer}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {timerBanner && <div>{timerBanner}</div>}

            {/* Giant Live Bid Display */}
            <div>
              <div className="text-xs font-mono tracking-widest uppercase text-slate-400 font-bold">
                CURRENT HIGHEST BID
              </div>
              <div className="text-4xl sm:text-5xl lg:text-6xl font-black font-mono text-amber-400 tracking-tight my-2 animate-bid-pop drop-shadow-[0_4px_10px_rgba(245,158,11,0.3)]">
                {currentBid.toLocaleString()}
                <span className="text-sm sm:text-base font-medium text-slate-400 ml-2">pts</span>
              </div>

              {/* Leading Bidder Display */}
              <div className="mt-2 min-h-[44px] flex items-center justify-center">
                {currentBidder ? (
                  <div
                    style={{ borderColor: currentBidder.color }}
                    className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-950 border-2 shadow-lg"
                  >
                    <span className="text-2xl">{currentBidder.logo}</span>
                    <div className="text-left">
                      <div className="text-[10px] text-slate-400 font-mono uppercase font-bold">LEADING BIDDER</div>
                      <div className="text-sm font-extrabold text-white tracking-wide">{currentBidder.name}</div>
                    </div>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-400">
                    <span>Awaiting opening bid at base price ({currentPlayer?.basePrice.toLocaleString() || 0} pts)</span>
                  </div>
                )}
              </div>
            </div>

            {/* SOLD & UNSOLD Decision Gavels */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleSold}
                disabled={!currentPlayer || !currentBidder}
                className={`py-3.5 px-4 rounded-xl font-black text-sm tracking-wider uppercase transition-all shadow-xl flex items-center justify-center gap-2 ${
                  currentPlayer && currentBidder
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/25 active:scale-95 glow-cyan cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>SOLD</span>
              </button>

              <button
                onClick={markPlayerUnsold}
                disabled={!currentPlayer}
                className={`py-3.5 px-4 rounded-xl font-black text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 ${
                  currentPlayer
                    ? 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 active:scale-95 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <XCircle className="w-5 h-5" />
                <span>UNSOLD</span>
              </button>
            </div>

            {/* Undo & Custom Incremental Bid Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
              <button
                onClick={undoLastBid}
                disabled={bidHistory.length === 0}
                className={`px-3 py-1.5 rounded-lg border font-mono flex items-center gap-1.5 transition-colors ${
                  bidHistory.length > 0
                    ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer'
                    : 'border-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo Bid</span>
              </button>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Custom pts"
                  value={customBidAmount}
                  onChange={e => setCustomBidAmount(e.target.value)}
                  className="w-28 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
                <span className="text-[11px] text-slate-500 font-mono">Click team below to place</span>
              </div>
            </div>
          </div>

          {/* SINGLE SCREEN DIRECT SELL PANEL */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-amber-950/30 border border-amber-500/40 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider font-mono">
                  Direct Sell Panel (One-Screen Instant Sale)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Bypass rounds & assign directly
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Sold Amount Input */}
              <div className="sm:col-span-5">
                <label className="block text-[10px] font-mono font-semibold text-slate-400 mb-1 uppercase">
                  Final Sold Amount (pts)
                </label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="number"
                    value={directSellAmount}
                    onChange={e => setDirectSellAmount(e.target.value)}
                    placeholder="Enter sold points..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Franchise Quick Select Dropdown */}
              <div className="sm:col-span-4">
                <label className="block text-[10px] font-mono font-semibold text-slate-400 mb-1 uppercase">
                  Winning Franchise
                </label>
                <select
                  value={directSellTeamId}
                  onChange={e => setDirectSellTeamId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="">-- Choose Team --</option>
                  {teams.map(t => {
                    const maxAllowance = calculateMaxAllowableBid(t, currentPlayer);
                    const squadFull = t.squad.length >= rules.squadRules.maxSquadSize;
                    return (
                      <option key={t.id} value={t.id} disabled={squadFull}>
                        {t.name} ({t.remainingBudget.toLocaleString()} pts left - Max: {maxAllowance.maxBid.toLocaleString()})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Direct Sell Button */}
              <div className="sm:col-span-3 pt-4 sm:pt-0">
                <button
                  onClick={handleDirectSell}
                  disabled={!currentPlayer || !directSellTeamId}
                  className={`w-full py-2 px-3 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md ${
                    currentPlayer && directSellTeamId
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 active:scale-95 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sell Now</span>
                </button>
              </div>
            </div>
          </div>

          {/* 10 FRANCHISE BIDDING PADS (Interactive Grid with Overspending & Sponsor Guard) */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>{teams.length} Franchise Bidding Pads</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                +{rules.minBidIncrement} pts auto-increment
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {teams.map(team => {
                const nextRequiredBid = currentBidder === null ? (currentPlayer?.basePrice || 0) : currentBid + rules.minBidIncrement;
                const isCurrentLeader = currentBidder?.id === team.id;
                const squadPlayers = players.filter(p => team.squad.includes(p.id));
                const isSquadFull = team.squad.length >= rules.squadRules.maxSquadSize;

                // Spending optimization & overspending check
                const { maxBid } = calculateMaxAllowableBid(team, currentPlayer);
                const canAfford = maxBid >= nextRequiredBid;

                // Sponsor Tag cap check: max 1 sponsor per team
                const teamHasSponsor = squadPlayers.some(p => p.isSponsored || Boolean(p.sponsorTag?.trim()));
                const sponsorBlocked = isPlayerSponsored && teamHasSponsor;

                const isDisabled = !currentPlayer || !canAfford || isCurrentLeader || isSquadFull || sponsorBlocked;

                return (
                  <button
                    key={team.id}
                    onClick={() => {
                      if (customBidAmount) {
                        handleCustomBid(team.id);
                      } else {
                        handleTeamBid(team.id);
                      }
                    }}
                    disabled={isDisabled}
                    style={{
                      borderLeftColor: team.color || '#3b82f6',
                      borderLeftWidth: '4px',
                    }}
                    className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                      isCurrentLeader
                        ? 'border-amber-500 bg-amber-500/15 ring-1 ring-amber-400'
                        : isSquadFull || sponsorBlocked || !canAfford
                        ? 'border-slate-800/80 bg-slate-950/40 opacity-40 cursor-not-allowed'
                        : 'border-slate-800 bg-slate-950/70 hover:border-slate-600 hover:bg-slate-800/80 active:scale-[0.98] cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl flex-shrink-0">{team.logo}</span>
                        <div className="min-w-0">
                          <div className="font-bold text-white text-xs truncate">{team.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                            <span className={isSquadFull ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                              Squad: {team.squad.length}/{rules.squadRules.maxSquadSize}
                            </span>
                            <span>•</span>
                            <span className="text-slate-400">
                              Max Bid: <strong className="text-amber-300">{maxBid.toLocaleString()}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-mono flex-shrink-0">
                        <div className="text-[10px] text-slate-500 uppercase">Purse</div>
                        <div className={`font-bold text-xs ${canAfford ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {team.remainingBudget.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {isCurrentLeader ? (
                      <span className="absolute top-1 right-2 text-[9px] font-black font-mono text-amber-400 tracking-wider">
                        ★ LEADING
                      </span>
                    ) : sponsorBlocked ? (
                      <span className="absolute top-1 right-2 text-[9px] font-black font-mono text-rose-400 tracking-wider">
                        ⛔ SPONSOR LIMIT (1/1)
                      </span>
                    ) : !canAfford ? (
                      <span className="absolute top-1 right-2 text-[9px] font-black font-mono text-rose-400 tracking-wider">
                        ⚠️ BUDGET CAP
                      </span>
                    ) : isSquadFull ? (
                      <span className="absolute top-1 right-2 text-[9px] font-black font-mono text-amber-400 tracking-wider">
                        ⛔ SQUAD FULL
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Lot Bidding Feed & Purse Rankings (3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Live Bid History Feed */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider mb-3 flex items-center justify-between">
              <span>Lot Bidding Feed</span>
              <span className="text-[10px] text-slate-500 font-normal">({bidHistory.length} bids)</span>
            </h3>

            {bidHistory.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-500 font-mono">
                No bids in this round yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {bidHistory.map((bid, idx) => (
                  <div
                    key={bid.id || idx}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono ${
                      idx === 0
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-300 font-bold animate-bid-pop'
                        : 'border-slate-800/80 bg-slate-950/60 text-slate-400'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <div className="font-semibold text-white truncate">{bid.teamName}</div>
                      <div className="text-[10px] text-slate-500">{new Date(bid.timestamp).toLocaleTimeString()}</div>
                    </div>
                    <div className="text-right font-bold text-amber-400 flex-shrink-0">
                      {bid.amount.toLocaleString()} pts
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Remaining Budget Leaderboard */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
            <h3 className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider mb-2 flex items-center justify-between">
              <span>Team Purse Rankings</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1 text-xs">
              {[...teams]
                .sort((a, b) => b.remainingBudget - a.remainingBudget)
                .map((t, idx) => {
                  const maxAllowance = calculateMaxAllowableBid(t, currentPlayer);
                  return (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-4 text-center font-mono font-bold text-slate-500 text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="text-base">{t.logo}</span>
                        <div className="truncate min-w-0">
                          <div className="font-semibold text-white truncate text-xs">{t.shortName}</div>
                          <div className="text-[10px] text-slate-400">
                            {t.squad.length}/{rules.squadRules.maxSquadSize} players
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-mono flex-shrink-0">
                        <div className="font-bold text-emerald-400">{t.remainingBudget.toLocaleString()}</div>
                        <div className="text-[9px] text-slate-500">Max: {maxAllowance.maxBid.toLocaleString()}</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
