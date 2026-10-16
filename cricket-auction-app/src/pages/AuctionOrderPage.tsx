import React, { useState, useMemo } from 'react';
import { useAuction } from '../context/AuctionContext';
import { AuctionOrderingMode, Player } from '../types/auction';
import {
  ListOrdered,
  ArrowUpDown,
  MoveUp,
  MoveDown,
  ChevronsUp,
  ChevronsDown,
  Play,
  CheckCircle2,
  Clock,
  Sparkles,
  Shield,
  Layers,
  Search,
  Filter,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

interface AuctionOrderPageProps {
  onStartAuction?: (player: Player) => void;
}

export const AuctionOrderPage: React.FC<AuctionOrderPageProps> = ({ onStartAuction }) => {
  const {
    players,
    currentPlayer,
    auctionOrderMode,
    setAuctionOrderMode,
    customAuctionOrderIds,
    setCustomAuctionOrder,
    getOrderedUpcomingPlayers,
    startAuctionForPlayer,
  } = useAuction();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'sold' | 'unsold'>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Get current active ordering list for all players
  const orderedPlayers = useMemo(() => {
    const gradeWeight: Record<string, number> = {
      'A+': 1,
      'A': 2,
      'B': 3,
      'C': 4,
    };

    let baseList = [...players];

    if (auctionOrderMode === 'grade') {
      baseList.sort((a, b) => {
        const wA = gradeWeight[a.grade || 'B'] ?? 99;
        const wB = gradeWeight[b.grade || 'B'] ?? 99;
        if (wA !== wB) return wA - wB;
        const lotA = a.lotNumber || a.auctionOrder || 0;
        const lotB = b.lotNumber || b.auctionOrder || 0;
        return lotA - lotB;
      });
    } else if (auctionOrderMode === 'custom' && customAuctionOrderIds.length > 0) {
      const orderMap = new Map(customAuctionOrderIds.map((id, idx) => [id, idx]));
      baseList.sort((a, b) => {
        const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 99999;
        const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 99999;
        if (idxA !== idxB) return idxA - idxB;
        const lotA = a.lotNumber || a.auctionOrder || 0;
        const lotB = b.lotNumber || b.auctionOrder || 0;
        return lotA - lotB;
      });
    } else {
      // Default: lot number order
      baseList.sort((a, b) => (a.lotNumber || a.auctionOrder || 0) - (b.lotNumber || b.auctionOrder || 0));
    }

    return baseList;
  }, [players, auctionOrderMode, customAuctionOrderIds]);

  // Filtered display list
  const filteredList = useMemo(() => {
    return orderedPlayers.filter((p) => {
      const pCat = (p.category || p.ageCategory || '').toLowerCase();
      const pSpec = (p.specialism || p.role || '').toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pCat.includes(searchQuery.toLowerCase()) ||
        pSpec.includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'upcoming'
          ? p.status === 'upcoming'
          : statusFilter === 'sold'
          ? p.status === 'sold'
          : p.status === 'unsold';

      const matchesGrade = gradeFilter === 'all' || p.grade === gradeFilter;

      return matchesSearch && matchesStatus && matchesGrade;
    });
  }, [orderedPlayers, searchQuery, statusFilter, gradeFilter]);

  // Upcoming count
  const upcomingCount = useMemo(() => players.filter((p) => p.status === 'upcoming').length, [players]);
  const soldCount = useMemo(() => players.filter((p) => p.status === 'sold').length, [players]);
  const unsoldCount = useMemo(() => players.filter((p) => p.status === 'unsold').length, [players]);

  // Custom ordering actions
  const movePlayer = (playerId: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    const currentIds = orderedPlayers.map((p) => p.id);
    const index = currentIds.indexOf(playerId);
    if (index === -1) return;

    const newIds = [...currentIds];
    if (direction === 'up' && index > 0) {
      [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
    } else if (direction === 'down' && index < newIds.length - 1) {
      [newIds[index + 1], newIds[index]] = [newIds[index], newIds[index + 1]];
    } else if (direction === 'top' && index > 0) {
      const [item] = newIds.splice(index, 1);
      newIds.unshift(item);
    } else if (direction === 'bottom' && index < newIds.length - 1) {
      const [item] = newIds.splice(index, 1);
      newIds.push(item);
    }

    setCustomAuctionOrder(newIds);
    if (auctionOrderMode !== 'custom') {
      setAuctionOrderMode('custom');
      showToast('Switched to Custom Order mode and reordered player');
    }
  };

  const handleResetToLotOrder = () => {
    const naturalIds = [...players].sort((a, b) => (a.lotNumber || a.auctionOrder || 0) - (b.lotNumber || b.auctionOrder || 0)).map((p) => p.id);
    setCustomAuctionOrder(naturalIds);
    setAuctionOrderMode('default');
    showToast('Auction order reset to Default Lot sequence');
  };

  const handleSortByGradeNow = () => {
    setAuctionOrderMode('grade');
    showToast('Auction order set to Grade-Based (A+ ➔ A ➔ B ➔ C)');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-semibold border border-orange-400/30 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-orange-950/40 border border-orange-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
                <ListOrdered className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-2xl font-black text-white tracking-wide">Auction Order Queue</h1>
                <p className="text-xs text-slate-400">
                  Configure live queue ordering, view upcoming candidates, or manually reorder lot sequence
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Upcoming</span>
              <span className="text-lg font-black text-amber-400">{upcomingCount}</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Sold</span>
              <span className="text-lg font-black text-emerald-400">{soldCount}</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Unsold</span>
              <span className="text-lg font-black text-rose-400">{unsoldCount}</span>
            </div>
          </div>
        </div>

        {/* Ordering Mode Selector Tabs */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
            <button
              onClick={() => {
                setAuctionOrderMode('default');
                showToast('Switched to Default Lot Order');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                auctionOrderMode === 'default'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Default (Lot #)
            </button>

            <button
              onClick={handleSortByGradeNow}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                auctionOrderMode === 'grade'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Grade-Based (A+ ➔ A ➔ B ➔ C)
            </button>

            <button
              onClick={() => {
                setAuctionOrderMode('custom');
                showToast('Switched to Custom Manual Order');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                auctionOrderMode === 'custom'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Custom / Manual
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {auctionOrderMode === 'custom' && (
              <button
                onClick={handleResetToLotOrder}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors font-medium text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Custom Order
              </button>
            )}
            <span className="text-slate-400 italic">
              Active Mode:{' '}
              <strong className="text-orange-400 uppercase tracking-wide">
                {auctionOrderMode === 'grade' ? 'Grade-Based' : auctionOrderMode === 'custom' ? 'Custom' : 'Default Lot'}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Currently In-Auction Player Alert (if active) */}
      {currentPlayer && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
            </span>
            <div className="flex items-center gap-3">
              <img
                src={currentPlayer.photo || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=120&q=80'}
                alt={currentPlayer.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shadow-md"
              />
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400">
                  Currently Under Hammer (Lot #{currentPlayer.lotNumber || currentPlayer.auctionOrder || 1})
                </span>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {currentPlayer.name}
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Grade {currentPlayer.grade || 'A'}
                  </span>
                </h3>
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Base ₹{currentPlayer.basePrice.toLocaleString('en-IN')}
          </span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by player name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            {(['all', 'upcoming', 'sold', 'unsold'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                  statusFilter === status
                    ? 'bg-slate-800 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Grade Filter */}
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Grades</option>
            <option value="A+">Grade A+</option>
            <option value="A">Grade A</option>
            <option value="B">Grade B</option>
            <option value="C">Grade C</option>
          </select>
        </div>
      </div>

      {/* Players Order Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-bold text-center w-16">Seq #</th>
                <th className="py-3 px-4 font-bold w-16 text-center">Lot #</th>
                <th className="py-3 px-4 font-bold">Player</th>
                <th className="py-3 px-4 font-bold text-center">Grade</th>
                <th className="py-3 px-4 font-bold">Category</th>
                <th className="py-3 px-4 font-bold text-right">Base Price</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
                {auctionOrderMode === 'custom' && (
                  <th className="py-3 px-4 font-bold text-center w-36">Reorder</th>
                )}
                <th className="py-3 px-4 font-bold text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={auctionOrderMode === 'custom' ? 9 : 8} className="py-12 text-center text-slate-500">
                    No players found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredList.map((player, index) => {
                  const isCurrent = currentPlayer?.id === player.id;
                  const isUpcoming = player.status === 'upcoming';
                  const gradeBadgeColor =
                    player.grade === 'A+'
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                      : player.grade === 'A'
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                      : player.grade === 'B'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-slate-700/30 text-slate-300 border-slate-600/40';

                  return (
                    <tr
                      key={player.id}
                      className={`transition-colors ${
                        isCurrent
                          ? 'bg-amber-500/10 font-medium'
                          : index % 2 === 0
                          ? 'bg-slate-900/50 hover:bg-slate-800/40'
                          : 'bg-slate-900/20 hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Queue Sequence Position */}
                      <td className="py-3 px-4 text-center font-mono text-xs text-slate-400">
                        {index + 1}
                      </td>

                      {/* Original Lot # */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-300 text-xs">
                        #{player.lotNumber || player.auctionOrder || (index + 1)}
                      </td>

                      {/* Player Profile */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              player.photo ||
                              'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=120&q=80'
                            }
                            alt={player.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-700 flex-shrink-0"
                          />
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              {player.name}
                              {player.isCaptain && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500 text-slate-950">
                                  C
                                </span>
                              )}
                              {player.isViceCaptain && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-500 text-white">
                                  VC
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">
                              {player.specialism || player.role || 'All-Rounder'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Grade */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-xs font-black border ${gradeBadgeColor}`}
                        >
                          {player.grade || 'A'}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-slate-300 text-xs">
                        {player.category || player.ageCategory || 'Regular'}
                      </td>

                      {/* Base Price */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-200 text-xs">
                        ₹{player.basePrice.toLocaleString('en-IN')}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            Live
                          </span>
                        ) : player.status === 'sold' ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Sold (₹{player.soldPrice?.toLocaleString('en-IN')})
                          </span>
                        ) : player.status === 'unsold' ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Unsold
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            Upcoming
                          </span>
                        )}
                      </td>

                      {/* Manual Reordering Controls (Only visible in Custom Mode) */}
                      {auctionOrderMode === 'custom' && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => movePlayer(player.id, 'top')}
                              title="Move to Top"
                              disabled={index === 0}
                              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ChevronsUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => movePlayer(player.id, 'up')}
                              title="Move Up"
                              disabled={index === 0}
                              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <MoveUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => movePlayer(player.id, 'down')}
                              title="Move Down"
                              disabled={index === filteredList.length - 1}
                              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <MoveDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => movePlayer(player.id, 'bottom')}
                              title="Move to Bottom"
                              disabled={index === filteredList.length - 1}
                              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ChevronsDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}

                      {/* Auction Action */}
                      <td className="py-3 px-4 text-center">
                        {isCurrent ? (
                          <span className="text-xs text-amber-400 font-bold">In Auction</span>
                        ) : isUpcoming ? (
                          <button
                            onClick={() => {
                              if (onStartAuction) {
                                onStartAuction(player);
                              } else {
                                startAuctionForPlayer(player.id);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white transition-all shadow hover:shadow-orange-500/20"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            Auction
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (onStartAuction) {
                                onStartAuction(player);
                              } else {
                                startAuctionForPlayer(player.id);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          >
                            Re-Auction
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
