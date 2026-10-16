import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuction } from '../context/AuctionContext';
import { GradeBadge } from '../components/GradeBadge';
import { RoleBadge } from '../components/RoleBadge';
import { Player, Team } from '../types/auction';
import {
  Gavel,
  CheckCircle2,
  XCircle,
  RotateCcw,
  SkipForward,
  Play,
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
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  X,
  Award,
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
    getGradeCategoryMaxBid,
    nextUpcomingQueuePlayer,
  } = useAuction();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Centralized Bidding State
  const [selectedBidderTeamId, setSelectedBidderTeamId] = useState<string>(() => teams[0]?.id || '');
  const [selectedIncrement, setSelectedIncrement] = useState<number>(() => rules.minBidIncrement || 500);
  const [customBidAmount, setCustomBidAmount] = useState<string>('');

  const activeSelectedTeam = useMemo(() => {
    return teams.find(t => t.id === selectedBidderTeamId) || teams[0] || null;
  }, [teams, selectedBidderTeamId]);

  const activeSelectedMaxAllowance = useMemo(() => {
    if (!activeSelectedTeam) return null;
    return calculateMaxAllowableBid(activeSelectedTeam, currentPlayer);
  }, [activeSelectedTeam, currentPlayer, calculateMaxAllowableBid]);

  // Alerts
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const upcomingPlayers = useMemo(() => players.filter(p => p.status === 'upcoming'), [players]);

  // Ensure default selected bidder is valid
  useEffect(() => {
    if (!selectedBidderTeamId && teams.length > 0) {
      setSelectedBidderTeamId(teams[0].id);
    }
  }, [teams, selectedBidderTeamId]);

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

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return players
      .filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.role && p.role.toLowerCase().includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query)) ||
        (p.ageCategory && p.ageCategory.toLowerCase().includes(query)) ||
        (p.grade && p.grade.toLowerCase().includes(query)) ||
        (p.sponsorTag && p.sponsorTag.toLowerCase().includes(query))
      )
      .slice(0, 8);
  }, [players, searchQuery]);

  // Grade & Category Bidding Cap for current player
  const categoryCap = useMemo(() => {
    return currentPlayer ? getGradeCategoryMaxBid(currentPlayer) : null;
  }, [currentPlayer, getGradeCategoryMaxBid]);

  // Next Minimum Valid Bid
  const nextMinimumBid = useMemo(() => {
    if (!currentPlayer) return 0;
    if (currentBid === 0) return currentPlayer.basePrice;
    return currentBid + (rules.minBidIncrement || 500);
  }, [currentPlayer, currentBid, rules.minBidIncrement]);

  // Centralized Bid Action
  const handleCentralBid = (increment?: number) => {
    if (!selectedBidderTeamId) {
      setErrorMessage('Please select a bidding team first.');
      return;
    }
    setErrorMessage(null);
    const inc = increment !== undefined ? increment : selectedIncrement;
    const res = placeBid(selectedBidderTeamId, inc);
    if (!res.success && res.message) {
      setErrorMessage(res.message);
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const handleCustomBid = () => {
    if (!selectedBidderTeamId) {
      setErrorMessage('Please select a bidding team.');
      return;
    }
    const amount = Number(customBidAmount);
    if (!amount || isNaN(amount)) {
      setErrorMessage('Please enter a valid bid amount in points.');
      return;
    }
    setErrorMessage(null);
    const res = placeBid(selectedBidderTeamId, amount, true);
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
    } else {
      setSuccessMessage('Player successfully marked SOLD!');
      setTimeout(() => setSuccessMessage(null), 3500);
    }
  };

  // Sorted teams for Purse Rankings Table
  const sortedPurseTeams = useMemo(() => {
    return [...teams].sort((a, b) => b.remainingBudget - a.remainingBudget);
  }, [teams]);

  return (
    <div className="space-y-4">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-orange-950/40 border border-orange-500/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Gavel className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white tracking-wide">JCPL 4 Live Auction Studio</h2>
              {isMockAuction && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/50 text-purple-300 text-[10px] font-bold tracking-wider uppercase animate-pulse">
                  🧪 Mock Mode
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {upcomingPlayers.length} candidates in pool • {teams.length} Registered Franchises
            </p>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mock Auction Mode Toggle */}
          <button
            onClick={() => toggleMockAuction()}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              isMockAuction
                ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 shadow-lg shadow-purple-900/30'
                : 'bg-slate-900 hover:bg-slate-800 text-purple-300 border-purple-800/40'
            }`}
            title="Toggle safe mock auction simulation"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>{isMockAuction ? 'Mock Mode ON' : 'Test Mock'}</span>
          </button>

          {isMockAuction && (
            <button
              onClick={resetMockAuction}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Reset</span>
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
              className="px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 text-xs font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer"
              title={`Undo last action: ${lastActionResult.player.name}`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo Sale</span>
            </button>
          )}

          {upcomingPlayers.length > 0 && (
            <button
              onClick={skipOrNextPlayer}
              className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <SkipForward className="w-3.5 h-3.5 text-orange-400" />
              <span>Next Player Lot</span>
            </button>
          )}

          <button
            onClick={onOpenProjector}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 text-xs font-black transition-all shadow flex items-center gap-1.5"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Projector View</span>
          </button>
        </div>
      </div>

      {/* Success alert */}
      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2 animate-bid-pop shadow-lg">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search Bar for Quick Jump to Any Player */}
      <div ref={searchRef} className="relative z-30">
        <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-2 shadow-md">
          <Search className="w-4 h-4 text-orange-400 ml-1.5 flex-shrink-0" />
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
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
            <div className="p-2.5 text-[11px] font-mono font-bold text-slate-400 border-b border-slate-800 uppercase tracking-wider">
              Matching Candidates ({searchResults.length})
            </div>
            {searchResults.map(p => (
              <div
                key={p.id}
                className="p-3 hover:bg-slate-800/80 border-b border-slate-800/60 last:border-0 flex items-center justify-between gap-3 text-xs transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={p.photo || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=120&q=80'}
                    alt={p.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-700"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-white flex items-center gap-2 truncate">
                      <span className="truncate">{p.name}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-orange-500/20 text-orange-300 border border-orange-500/30">
                        {p.grade}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {p.category} • Base ₹{p.basePrice.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    startAuctionForPlayer(p.id);
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow transition-all cursor-pointer"
                >
                  <Gavel className="w-3.5 h-3.5" />
                  <span>Auction Now</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MAIN LAYOUT: 7 Cols Left (Central Live Auction + Enhanced Direct Sell) + 5 Cols Right (Team Purse Rankings) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT / CENTER: Central Live Auction Stage & Direct Sell Panel (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Central Stage Card */}
          <div className="p-6 rounded-3xl bg-slate-900 border-2 border-orange-500/40 shadow-[0_0_35px_rgba(249,115,22,0.15)] relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-56 h-56 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

            {currentPlayer ? (
              <div className="space-y-6">
                {/* Player Profile Header */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-5 border-b border-slate-800">
                  <div className="relative flex-shrink-0">
                    <img
                      src={currentPlayer.photo || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=150&q=80'}
                      alt={currentPlayer.name}
                      className="w-24 h-24 rounded-2xl object-cover border-2 border-orange-500 shadow-xl"
                    />
                    <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-lg bg-orange-500 text-slate-950 font-mono text-xs font-black shadow">
                      #{currentPlayer.lotNumber}
                    </span>
                  </div>

                  <div className="flex-1 text-center sm:text-left min-w-0">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-orange-500/20 text-orange-300 border border-orange-500/40">
                        Grade {currentPlayer.grade}
                      </span>
                      <RoleBadge role={currentPlayer.role} size="sm" />
                      {currentPlayer.isCaptain && (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-amber-500 text-slate-950 flex items-center gap-1 shadow">
                          <Crown className="w-3 h-3" /> Captain
                        </span>
                      )}
                      {currentPlayer.isViceCaptain && (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-blue-500 text-white flex items-center gap-1 shadow">
                          <Star className="w-3 h-3" /> VC
                        </span>
                      )}
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {currentPlayer.name}
                    </h1>

                    <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                      <span>Category: <strong className="text-slate-200">{currentPlayer.category}</strong></span>
                      <span>•</span>
                      <span>Style: <strong className="text-slate-200">{currentPlayer.specialism || currentPlayer.role}</strong></span>
                    </div>

                    {/* Stats Highlights Mini Pills */}
                    <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-mono">
                      <span className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                        Matches: <strong className="text-white">{currentPlayer.stats.matches}</strong>
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                        Runs: <strong className="text-amber-400">{currentPlayer.stats.runs}</strong>
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                        Wkts: <strong className="text-emerald-400">{currentPlayer.stats.wickets}</strong>
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                        Avg: <strong className="text-cyan-400">{currentPlayer.stats.average}</strong>
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                        SR: <strong className="text-purple-400">{currentPlayer.stats.strikeRate}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* GIANT LIVE BID DISPLAY */}
                <div className="text-center py-2">
                  <span className="text-xs uppercase font-mono tracking-widest text-orange-400 font-bold block mb-1">
                    CURRENT HIGHEST BID
                  </span>
                  <div className="text-5xl sm:text-6xl font-black font-mono text-white tracking-tight drop-shadow-lg">
                    ₹{currentBid.toLocaleString('en-IN')}
                  </div>

                  {/* Leading Bidder Card */}
                  <div className="mt-3 flex items-center justify-center">
                    {currentBidder ? (
                      <div
                        className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-slate-950 border-2 shadow-2xl"
                        style={{ borderColor: currentBidder.color || '#f97316' }}
                      >
                        {currentBidder.logo ? (
                          <img src={currentBidder.logo} alt={currentBidder.name} className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-slate-950 text-xs shadow"
                            style={{ backgroundColor: currentBidder.color || '#f97316' }}
                          >
                            {currentBidder.shortName}
                          </div>
                        )}
                        <div className="text-left">
                          <span className="text-[10px] text-orange-400 font-mono uppercase font-black tracking-wider block">
                            ★ LEADING FRANCHISE
                          </span>
                          <span className="text-sm font-extrabold text-white">
                            {currentBidder.name}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400">
                        <span>Awaiting opening bid at Base Price (₹{currentPlayer.basePrice.toLocaleString('en-IN')})</span>
                      </div>
                    )}
                  </div>

                  {/* Financial Metas: Base Price, Next Minimum Valid Bid & Category Max Cap */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-around gap-3 text-xs font-mono">
                    <div className="text-center">
                      <span className="text-slate-500 uppercase text-[10px] block">Base Price</span>
                      <strong className="text-slate-200 text-sm">₹{currentPlayer.basePrice.toLocaleString('en-IN')}</strong>
                    </div>

                    <div className="text-center">
                      <span className="text-slate-500 uppercase text-[10px] block">Next Valid Bid</span>
                      <strong className="text-orange-400 text-sm">₹{nextMinimumBid.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>

                {/* CENTRALIZED BIDDING ACTION PANEL */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* Bidding Franchise Selector */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <label className="block text-[10px] font-mono uppercase font-bold text-slate-400">
                          Select Bidding Franchise ({teams.length} Teams)
                        </label>
                        {activeSelectedTeam && activeSelectedMaxAllowance && (
                          <div className="flex items-center gap-2 text-[11px] font-mono">
                            <span className="text-slate-400">
                              Purse: <strong className="text-emerald-400 font-bold">₹{activeSelectedTeam.remainingBudget.toLocaleString('en-IN')}</strong>
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-400">
                              Max Bid: <strong className="text-amber-400 font-black">₹{activeSelectedMaxAllowance.maxBid.toLocaleString('en-IN')}</strong>
                            </span>
                          </div>
                        )}
                      </div>

                      <select
                        value={selectedBidderTeamId}
                        onChange={e => setSelectedBidderTeamId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs focus:outline-none focus:border-orange-500"
                      >
                        {teams.map(t => {
                          const maxAllowance = calculateMaxAllowableBid(t, currentPlayer);
                          const isLeader = currentBidder?.id === t.id;
                          return (
                            <option key={t.id} value={t.id}>
                              {t.name} {isLeader ? '★ (Leader)' : ''} — Purse: ₹{t.remainingBudget.toLocaleString('en-IN')} | Max Bid: ₹{maxAllowance.maxBid.toLocaleString('en-IN')}
                            </option>
                          );
                        })}
                      </select>

                      {/* Prominent Purse & Max Allowable Bid Indicator Strip */}
                      {activeSelectedTeam && activeSelectedMaxAllowance && (
                        <div className="mt-2 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">Remaining Purse:</span>
                            <strong className="text-emerald-400 font-bold">
                              ₹{activeSelectedTeam.remainingBudget.toLocaleString('en-IN')}
                            </strong>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">Max Bid for Player:</span>
                            <strong className="text-amber-400 font-black text-sm">
                              ₹{activeSelectedMaxAllowance.maxBid.toLocaleString('en-IN')}
                            </strong>
                          </div>
                          {activeSelectedMaxAllowance.remainingSlotsNeeded > 0 && (
                            <div className="text-[10px] text-slate-400">
                              (Must reserve ₹{activeSelectedMaxAllowance.minReserveRequired.toLocaleString('en-IN')} for {activeSelectedMaxAllowance.remainingSlotsNeeded} slot{activeSelectedMaxAllowance.remainingSlotsNeeded > 1 ? 's' : ''})
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Increments Buttons */}
                    <div className="flex items-center gap-1.5 self-end">
                      {[rules.minBidIncrement || 500, 1000, 2000, 5000].map(inc => (
                        <button
                          key={inc}
                          onClick={() => {
                            setSelectedIncrement(inc);
                            handleCentralBid(inc);
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                            selectedIncrement === inc
                              ? 'bg-orange-500 text-slate-950 font-black shadow-lg shadow-orange-500/20'
                              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700'
                          }`}
                        >
                          +₹{inc.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Primary Bidding Triggers Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCentralBid()}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center gap-2"
                      >
                        <Gavel className="w-4 h-4" />
                        Place Next Bid (+₹{selectedIncrement.toLocaleString('en-IN')})
                      </button>

                      <button
                        onClick={undoLastBid}
                        disabled={bidHistory.length === 0}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                        title="Undo Last Bid"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Undo
                      </button>
                    </div>

                    {/* Custom Bid Input */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        placeholder="Custom ₹..."
                        value={customBidAmount}
                        onChange={e => setCustomBidAmount(e.target.value)}
                        className="w-32 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-orange-500 text-right"
                      />
                      <button
                        onClick={handleCustomBid}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors"
                      >
                        Bid
                      </button>
                    </div>
                  </div>
                </div>

                {/* SOLD & UNSOLD Decision Gavels */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleSold}
                    disabled={!currentBidder}
                    className={`py-3.5 px-4 rounded-2xl font-black text-sm tracking-wider uppercase transition-all shadow-xl flex items-center justify-center gap-2 ${
                      currentBidder
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/25 active:scale-95 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>SOLD TO {currentBidder ? currentBidder.name.toUpperCase() : 'LEADER'}</span>
                  </button>

                  <button
                    onClick={markPlayerUnsold}
                    className="py-3.5 px-4 rounded-2xl font-black text-sm tracking-wider uppercase transition-all bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <XCircle className="w-5 h-5" />
                    <span>MARK UNSOLD</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 mx-auto flex items-center justify-center text-orange-400">
                  <Gavel className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">No Player on Auction Block</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Search any player above or click Start Next Lot to present the next candidate in the queue.
                  </p>
                </div>
                {upcomingPlayers.length > 0 && (
                  <button
                    onClick={() => startAuctionForPlayer(upcomingPlayers[0].id)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-orange-500/20"
                  >
                    Start Lot #{upcomingPlayers[0].lotNumber || upcomingPlayers[0].auctionOrder || 1}: {upcomingPlayers[0].name}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ENLARGED TEAM PURSE RANKINGS (5 cols - Requirement 7) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-base text-white tracking-wide">
                  Team Purse Rankings ({teams.length} Teams)
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Live Budget Standings
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Real-time purse leaderboard across all franchises, updating live after every bid.
            </p>

            {/* Full 12-Team Standings Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800 font-bold">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">Rank</th>
                    <th className="py-2.5 px-3">Franchise</th>
                    <th className="py-2.5 px-3 text-center">Squad</th>
                    <th className="py-2.5 px-3 text-right">Spent</th>
                    <th className="py-2.5 px-3 text-right">Purse Left</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {sortedPurseTeams.map((team, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === sortedPurseTeams.length - 1;
                    const isLeadingBidder = currentBidder?.id === team.id;

                    return (
                      <tr
                        key={team.id}
                        className={`transition-colors ${
                          isLeadingBidder
                            ? 'bg-orange-500/10 font-bold'
                            : isFirst
                            ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                            : idx % 2 === 0
                            ? 'bg-slate-950/40 hover:bg-slate-800/40'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Rank Badge */}
                        <td className="py-2.5 px-3 text-center">
                          {isFirst ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
                              1
                            </span>
                          ) : (
                            <span className="text-slate-500 font-bold">
                              {idx + 1}
                            </span>
                          )}
                        </td>

                        {/* Team Info */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: team.color || '#f97316' }}
                            />
                            <span className="font-sans font-bold text-white text-xs truncate max-w-[130px]">
                              {team.name}
                            </span>
                            {isLeadingBidder && (
                              <span className="px-1 py-0.2 rounded text-[9px] font-black bg-orange-500 text-slate-950">
                                BID
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Squad Count */}
                        <td className="py-2.5 px-3 text-center text-slate-300">
                          {team.squad.length}/{rules.squadRules.maxSquadSize}
                        </td>

                        {/* Spent */}
                        <td className="py-2.5 px-3 text-right text-slate-400 text-xs">
                          ₹{team.totalSpent.toLocaleString('en-IN')}
                        </td>

                        {/* Remaining Purse */}
                        <td className="py-2.5 px-3 text-right font-bold text-xs">
                          <span
                            className={
                              isFirst
                                ? 'text-amber-400 font-black'
                                : isLast && team.remainingBudget < 5000
                                ? 'text-rose-400 font-black'
                                : 'text-emerald-400'
                            }
                          >
                            ₹{team.remainingBudget.toLocaleString('en-IN')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
