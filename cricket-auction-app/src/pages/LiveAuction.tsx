import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuction } from '../context/AuctionContext';
import { GradeBadge } from '../components/GradeBadge';
import { RoleBadge } from '../components/RoleBadge';
import { Player, Team, PlayerGrade } from '../types/auction';
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
  Edit2,
  Check,
  Save,
} from 'lucide-react';

interface LiveAuctionProps {
  onOpenProjector: () => void;
}

const getGradeVisuals = (grade: string) => {
  switch (grade) {
    case 'A+':
      return {
        badgeBg: 'bg-gradient-to-r from-amber-500/25 via-fuchsia-500/25 to-purple-500/25 text-amber-200 border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.35)]',
        cardBorder: 'border-purple-500/50 shadow-[0_0_35px_rgba(168,85,247,0.2)]',
        avatarBorder: 'border-amber-400 ring-2 ring-amber-400/40',
        glowBg: 'bg-purple-500/10',
        dotColor: 'bg-amber-400',
        label: 'Grade A+ (Marquee / Captain)',
      };
    case 'A':
      return {
        badgeBg: 'bg-gradient-to-r from-amber-500/25 to-yellow-500/25 text-amber-300 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)]',
        cardBorder: 'border-amber-500/50 shadow-[0_0_35px_rgba(245,158,11,0.2)]',
        avatarBorder: 'border-amber-400 ring-2 ring-amber-400/50',
        glowBg: 'bg-amber-500/10',
        dotColor: 'bg-amber-400',
        label: 'Grade A (Elite)',
      };
    case 'B':
      return {
        badgeBg: 'bg-gradient-to-r from-sky-500/25 to-blue-600/25 text-sky-300 border-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.35)]',
        cardBorder: 'border-sky-500/50 shadow-[0_0_35px_rgba(14,165,233,0.2)]',
        avatarBorder: 'border-sky-400 ring-2 ring-sky-400/50',
        glowBg: 'bg-sky-500/10',
        dotColor: 'bg-sky-400',
        label: 'Grade B (Core)',
      };
    case 'C':
    default:
      return {
        badgeBg: 'bg-gradient-to-r from-emerald-500/25 to-teal-600/25 text-emerald-300 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.35)]',
        cardBorder: 'border-emerald-500/50 shadow-[0_0_35px_rgba(16,185,129,0.2)]',
        avatarBorder: 'border-emerald-400 ring-2 ring-emerald-400/50',
        glowBg: 'bg-emerald-500/10',
        dotColor: 'bg-emerald-400',
        label: 'Grade C (Emerging)',
      };
  }
};

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
    getTeamGradeMetrics,
    editPlayer,
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

  const isSelectedTeamGradeCapReached = useMemo(() => {
    if (!activeSelectedTeam || !currentPlayer) return false;
    const tm = getTeamGradeMetrics ? getTeamGradeMetrics(activeSelectedTeam) : null;
    if (!tm) return false;
    if ((currentPlayer.grade === 'A' || currentPlayer.grade === 'A+') && tm.aCount >= 2) return true;
    if (currentPlayer.grade === 'B' && tm.bCount >= 3) return true;
    if (currentPlayer.grade === 'C' && tm.cCount >= 2) return true;
    return false;
  }, [activeSelectedTeam, currentPlayer, getTeamGradeMetrics]);

  // Alerts
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Quick Grade Editor State for Podium
  const [isEditGradeModalOpen, setIsEditGradeModalOpen] = useState(false);
  const [selectedQuickGrade, setSelectedQuickGrade] = useState<PlayerGrade>(() => currentPlayer?.grade || 'B');

  useEffect(() => {
    if (currentPlayer) {
      setSelectedQuickGrade(currentPlayer.grade);
    }
  }, [currentPlayer]);

  const gradeVisuals = useMemo(() => {
    return getGradeVisuals(currentPlayer?.grade || 'C');
  }, [currentPlayer?.grade]);

  const handleSaveQuickGrade = () => {
    if (!currentPlayer || !selectedQuickGrade) return;
    const gradePrices = rules.gradeBasePrices || { gradeAPlus: 7000, gradeA: 5000, gradeB: 3000, gradeC: 1000 };
    const newPrice =
      selectedQuickGrade === 'A+'
        ? gradePrices.gradeAPlus || 7000
        : selectedQuickGrade === 'A'
        ? gradePrices.gradeA || 5000
        : selectedQuickGrade === 'B'
        ? gradePrices.gradeB || 3000
        : gradePrices.gradeC || 1000;

    editPlayer({
      ...currentPlayer,
      grade: selectedQuickGrade,
      basePrice: newPrice,
    });
    setIsEditGradeModalOpen(false);
    setSuccessMessage(`Grade updated to Grade ${selectedQuickGrade} for ${currentPlayer.name}!`);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

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

  const handleDirectSell = () => {
    if (!selectedBidderTeamId) {
      setErrorMessage('Please select a franchise first.');
      return;
    }
    const amount = Number(customBidAmount) || (currentPlayer ? currentPlayer.basePrice : 0);
    if (!amount || amount <= 0) {
      setErrorMessage('Please specify a valid sale amount in points.');
      return;
    }
    setErrorMessage(null);
    const res = directSellPlayer(selectedBidderTeamId, amount);
    if (!res.success && res.message) {
      setErrorMessage(res.message);
      setTimeout(() => setErrorMessage(null), 4500);
    } else {
      setSuccessMessage(`${currentPlayer?.name} directly sold to franchise!`);
      setTimeout(() => setSuccessMessage(null), 3500);
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
                      <GradeBadge grade={p.grade} size="sm" />
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
          <div className={`p-6 rounded-3xl bg-slate-900 border-2 transition-all duration-300 ${currentPlayer ? gradeVisuals.cardBorder : 'border-orange-500/40 shadow-[0_0_35px_rgba(249,115,22,0.15)]'} relative overflow-hidden`}>
            <div className={`absolute -top-16 -right-16 w-56 h-56 ${currentPlayer ? gradeVisuals.glowBg : 'bg-orange-500/10'} rounded-full blur-3xl pointer-events-none transition-colors duration-500`} />

            {currentPlayer ? (
              <div className="space-y-6">
                {/* Player Profile Header */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-5 border-b border-slate-800">
                  <div className="relative flex-shrink-0">
                    <img
                      src={currentPlayer.photo || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=150&q=80'}
                      alt={currentPlayer.name}
                      className={`w-24 h-24 rounded-2xl object-cover border-2 shadow-xl transition-all duration-300 ${gradeVisuals.avatarBorder}`}
                    />
                    <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-lg bg-orange-500 text-slate-950 font-mono text-xs font-black shadow">
                      #{currentPlayer.lotNumber}
                    </span>
                  </div>

                  <div className="flex-1 text-center sm:text-left min-w-0">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                      {/* Colour-Coded Grade Badge */}
                      <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 shadow-md ${gradeVisuals.badgeBg}`}>
                        <span className={`w-2 h-2 rounded-full ${gradeVisuals.dotColor} animate-pulse`} />
                        <span>GRADE {currentPlayer.grade}</span>
                      </span>

                      {/* Quick Grade Edit Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedQuickGrade(currentPlayer.grade);
                          setIsEditGradeModalOpen(true);
                        }}
                        title="Change player grade"
                        className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow hover:border-amber-500/50"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Edit Grade</span>
                      </button>

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

                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex flex-wrap items-center gap-2">
                      <span>{currentPlayer.name}</span>
                      {currentPlayer.isViceCaptain && (
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center gap-1 shadow-lg shadow-blue-500/30 border border-blue-400/40">
                          <Star className="w-3.5 h-3.5 fill-current" /> Vice Captain
                        </span>
                      )}
                      {currentPlayer.isCaptain && (
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 flex items-center gap-1 shadow-lg shadow-amber-500/30 border border-amber-300">
                          <Crown className="w-3.5 h-3.5 fill-current" /> Captain
                        </span>
                      )}
                    </h1>

                    <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                      <span>Category: <strong className="text-slate-200">{currentPlayer.category}</strong></span>
                      <span>•</span>
                      <span>Style: <strong className="text-slate-200">{currentPlayer.specialism || currentPlayer.role}</strong></span>
                    </div>

                    {/* Stats Highlights Mini Pills */}
                    <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-mono">
                      <span className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                        Matches: <strong className="text-white">{currentPlayer.stats?.matches ?? 0}</strong>
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                        Runs: <strong className="text-amber-400">{currentPlayer.stats?.runs ?? 0}</strong>
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                        Wkts: <strong className="text-emerald-400">{currentPlayer.stats?.wickets ?? 0}</strong>
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                        Avg: <strong className="text-cyan-400">{currentPlayer.stats?.average ?? 0}</strong>
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                        SR: <strong className="text-purple-400">{currentPlayer.stats?.strikeRate ?? 0}</strong>
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
                          const tm = getTeamGradeMetrics ? getTeamGradeMetrics(t) : null;
                          let gradeCapReached = false;
                          if (currentPlayer && tm) {
                            if (currentPlayer.grade === 'A' && tm.aCount >= 2) gradeCapReached = true;
                            if (currentPlayer.grade === 'B' && tm.bCount >= 3) gradeCapReached = true;
                            if (currentPlayer.grade === 'C' && tm.cCount >= 2) gradeCapReached = true;
                          }
                          return (
                            <option key={t.id} value={t.id}>
                              {gradeCapReached ? '🚫 [GRADE CAP REACHED] ' : ''}{t.name} {isLeader ? '★ (Leader)' : ''} — Purse: ₹{t.remainingBudget.toLocaleString('en-IN')} | Max Bid: ₹{maxAllowance.maxBid.toLocaleString('en-IN')}
                            </option>
                          );
                        })}
                      </select>

                      {/* Prominent Grade Cap Warning Banner */}
                      {isSelectedTeamGradeCapReached && activeSelectedTeam && currentPlayer && (
                        <div className="mt-2 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/50 text-rose-300 text-xs font-bold flex items-center gap-2 animate-pulse">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                          <span>
                            GRADE LIMIT REACHED: {activeSelectedTeam.name} already has {currentPlayer.grade === 'B' ? '3 Grade B' : '2 Grade ' + currentPlayer.grade} players. Bidding and direct sales are locked.
                          </span>
                        </div>
                      )}

                      {/* Prominent Purse & Max Allowable Bid Indicator Strip */}
                      {activeSelectedTeam && (
                        (() => {
                          const sm = getTeamGradeMetrics ? getTeamGradeMetrics(activeSelectedTeam) : null;
                          return (
                            <div className="mt-2 p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs font-mono space-y-1.5">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400">Purse:</span>
                                  <strong className="text-emerald-400 font-bold">
                                    ₹{activeSelectedTeam.remainingBudget.toLocaleString('en-IN')}
                                  </strong>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400">Max Bid for Lot:</span>
                                  <strong className={(activeSelectedMaxAllowance?.maxBid ?? 0) === 0 ? "text-rose-400 font-black" : "text-amber-400 font-black text-sm"}>
                                    ₹{(activeSelectedMaxAllowance?.maxBid ?? 0).toLocaleString('en-IN')}
                                  </strong>
                                </div>
                                {sm && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400">C+VC Spent:</span>
                                    <strong className="text-indigo-300 font-bold">
                                      ₹{sm.combinedCapCost.toLocaleString('en-IN')} / 50k
                                    </strong>
                                  </div>
                                )}
                              </div>

                              {sm && (
                                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                                  <div className={`p-1.5 rounded ${sm.aRemainingSlots === 0 ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30' : 'bg-slate-900 text-slate-300 border border-slate-800'}`}>
                                    <span className="font-bold">Grade A (Max 2):</span> {sm.aCount}/2 ({sm.aRemainingSlots} left)
                                    <div className="text-amber-400 font-semibold">₹{sm.aRemainingBudget.toLocaleString('en-IN')}/30k rem</div>
                                  </div>
                                  <div className={`p-1.5 rounded ${sm.bRemainingSlots === 0 ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30' : 'bg-slate-900 text-slate-300 border border-slate-800'}`}>
                                    <span className="font-bold">Grade B (Max 3):</span> {sm.bCount}/3 ({sm.bRemainingSlots} left)
                                    <div className="text-blue-400 font-semibold">₹{sm.bRemainingBudget.toLocaleString('en-IN')}/18k rem</div>
                                  </div>
                                  <div className={`p-1.5 rounded ${sm.cRemainingSlots === 0 ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30' : 'bg-slate-900 text-slate-300 border border-slate-800'}`}>
                                    <span className="font-bold">Grade C (Max 2):</span> {sm.cCount}/2 ({sm.cRemainingSlots} left)
                                    <div className="text-emerald-400 font-semibold">Max 2 players</div>
                                  </div>
                                </div>
                              )}

                              {activeSelectedMaxAllowance?.reason && (
                                <div className="text-[10px] text-amber-300/90 font-sans italic pt-0.5">
                                  ⚠️ {activeSelectedMaxAllowance.reason}
                                </div>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>

                    {/* Quick Increments Buttons */}
                    <div className="flex items-center gap-1.5 self-end">
                      {[rules.minBidIncrement || 500, 1000, 2000, 5000].map(inc => (
                        <button
                          key={inc}
                          disabled={isSelectedTeamGradeCapReached || (activeSelectedMaxAllowance?.maxBid ?? 0) === 0}
                          onClick={() => {
                            setSelectedIncrement(inc);
                            handleCentralBid(inc);
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                            isSelectedTeamGradeCapReached || (activeSelectedMaxAllowance?.maxBid ?? 0) === 0
                              ? 'bg-slate-900/60 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
                              : selectedIncrement === inc
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
                        disabled={isSelectedTeamGradeCapReached || (activeSelectedMaxAllowance?.maxBid ?? 0) === 0}
                        className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                          isSelectedTeamGradeCapReached || (activeSelectedMaxAllowance?.maxBid ?? 0) === 0
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                            : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 shadow-lg shadow-orange-500/20 active:scale-95 cursor-pointer'
                        }`}
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

                    {/* Custom Bid & Direct Sell Input */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        placeholder="Points ₹..."
                        value={customBidAmount}
                        onChange={e => setCustomBidAmount(e.target.value)}
                        className="w-28 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-orange-500 text-right"
                      />
                      <button
                        onClick={handleCustomBid}
                        disabled={isSelectedTeamGradeCapReached || (activeSelectedMaxAllowance?.maxBid ?? 0) === 0}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                          isSelectedTeamGradeCapReached || (activeSelectedMaxAllowance?.maxBid ?? 0) === 0
                            ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer'
                        }`}
                      >
                        Bid
                      </button>
                      <button
                        onClick={handleDirectSell}
                        disabled={isSelectedTeamGradeCapReached || (activeSelectedMaxAllowance?.maxBid ?? 0) === 0}
                        title={isSelectedTeamGradeCapReached ? "Grade limit reached for this team" : "Direct sell player to selected team with centralized validation"}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors shadow ${
                          isSelectedTeamGradeCapReached || (activeSelectedMaxAllowance?.maxBid ?? 0) === 0
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                        }`}
                      >
                        Direct Sell
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
                    <th className="py-2.5 px-2 text-center">Grades (A/B/C)</th>
                    <th className="py-2.5 px-3 text-center">Squad</th>
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

                        {/* Grade Limits Breakdown */}
                        <td className="py-2.5 px-2 text-center text-[10px] font-mono">
                          {(() => {
                            const tm = getTeamGradeMetrics ? getTeamGradeMetrics(team) : null;
                            if (!tm) return null;
                            return (
                              <div className="flex items-center justify-center gap-1">
                                <span className={tm.aRemainingSlots === 0 ? "text-rose-400 font-bold" : "text-amber-400"}>A:{tm.aCount}/2</span>
                                <span className="text-slate-600">•</span>
                                <span className={tm.bRemainingSlots === 0 ? "text-rose-400 font-bold" : "text-blue-400"}>B:{tm.bCount}/3</span>
                                <span className="text-slate-600">•</span>
                                <span className={tm.cRemainingSlots === 0 ? "text-rose-400 font-bold" : "text-emerald-400"}>C:{tm.cCount}/2</span>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Squad Count */}
                        <td className="py-2.5 px-3 text-center text-slate-300">
                          {team.squad.length}/{rules.squadRules.maxSquadSize}
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

      {/* QUICK GRADE EDITOR MODAL */}
      {isEditGradeModalOpen && currentPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border-2 border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Edit Player Grade</h3>
                  <p className="text-xs text-slate-400">{currentPlayer.name} • Lot #{currentPlayer.lotNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditGradeModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300 font-medium">Select new grade for this player:</p>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    grade: 'A+' as PlayerGrade,
                    label: 'Grade A+',
                    desc: 'Marquee / Top Tier',
                    color: 'from-amber-500/20 via-fuchsia-500/20 to-purple-500/20 border-purple-400/60 text-amber-200',
                    dot: 'bg-amber-400',
                    basePrice: rules.gradeBasePrices?.gradeAPlus || 7000,
                  },
                  {
                    grade: 'A' as PlayerGrade,
                    label: 'Grade A',
                    desc: 'Elite (Max 2/Team)',
                    color: 'from-amber-500/20 to-yellow-500/20 border-amber-400/60 text-amber-300',
                    dot: 'bg-amber-400',
                    basePrice: rules.gradeBasePrices?.gradeA || 5000,
                  },
                  {
                    grade: 'B' as PlayerGrade,
                    label: 'Grade B',
                    desc: 'Core (Max 3/Team)',
                    color: 'from-sky-500/20 to-blue-600/20 border-sky-400/60 text-sky-300',
                    dot: 'bg-sky-400',
                    basePrice: rules.gradeBasePrices?.gradeB || 3000,
                  },
                  {
                    grade: 'C' as PlayerGrade,
                    label: 'Grade C',
                    desc: 'Emerging (Max 2/Team)',
                    color: 'from-emerald-500/20 to-teal-600/20 border-emerald-400/60 text-emerald-300',
                    dot: 'bg-emerald-400',
                    basePrice: rules.gradeBasePrices?.gradeC || 1000,
                  },
                ].map((item) => {
                  const isSelected = selectedQuickGrade === item.grade;
                  return (
                    <button
                      key={item.grade}
                      type="button"
                      onClick={() => setSelectedQuickGrade(item.grade)}
                      className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? `bg-gradient-to-br ${item.color} ring-2 ring-white/30 shadow-lg scale-[1.02]`
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-black text-sm text-white">
                          <span className={`w-2.5 h-2.5 rounded-full ${item.dot}`} />
                          {item.label}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <div className="mt-2 text-[11px] text-slate-400">
                        <span>{item.desc}</span>
                        <div className="font-mono text-xs text-amber-400 font-bold mt-0.5">
                          ₹{item.basePrice.toLocaleString('en-IN')} base
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Current Grade:</span>
                <span className="font-bold text-white font-mono">Grade {currentPlayer.grade}</span>
              </div>
              <div className="flex justify-between">
                <span>New Grade:</span>
                <span className="font-bold text-amber-400 font-mono">Grade {selectedQuickGrade}</span>
              </div>
              <div className="flex justify-between">
                <span>New Base Price:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  ₹{(
                    selectedQuickGrade === 'A+'
                      ? rules.gradeBasePrices?.gradeAPlus || 7000
                      : selectedQuickGrade === 'A'
                      ? rules.gradeBasePrices?.gradeA || 5000
                      : selectedQuickGrade === 'B'
                      ? rules.gradeBasePrices?.gradeB || 3000
                      : rules.gradeBasePrices?.gradeC || 1000
                  ).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditGradeModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuickGrade}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Save Grade</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
