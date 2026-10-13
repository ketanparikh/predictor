import React, { useState, useMemo } from 'react';
import { useAuction } from '../context/AuctionContext';
import { Player, PlayerRole, PlayerGrade, ActiveNavTab } from '../types/auction';
import { PlayerCard } from '../components/PlayerCard';
import { PlayerModal } from '../components/PlayerModal';
import { PlayerComparisonModal } from '../components/PlayerComparisonModal';
import { DeleteAllPlayersModal } from '../components/DeleteAllPlayersModal';
import { CricHeroesModal } from '../components/CricHeroesModal';
import {
  Users,
  Search,
  Plus,
  Scale,
  Trash2,
  FileSpreadsheet,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

interface PlayersPageProps {
  onStartAuction: (player: Player) => void;
  onNavigate?: (tab: ActiveNavTab) => void;
}


export const PlayersPage: React.FC<PlayersPageProps> = ({
  onStartAuction,
  onNavigate,
}) => {
  const {
    players,
    teams,
    addPlayer,
    editPlayer,
    deletePlayer,
    deleteAllPlayers,
    restoreDeletedPlayers,
    toggleWishlist,
    resetToDemoData,
  } = useAuction();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('default');

  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [playerToEdit, setPlayerToEdit] = useState<Player | null>(null);

  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isCricHeroesModalOpen, setIsCricHeroesModalOpen] = useState(false);

  const [comparePlayerIds, setComparePlayerIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  const [activeWishlistTeamId, setActiveWishlistTeamId] = useState<string>(
    teams[0]?.id || ''
  );

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Filtered & Sorted Players
  const filteredPlayers = useMemo(() => {
    return players
      .filter(p => {
        const matchesSearch =
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.role.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || p.role === roleFilter;
        const matchesGrade = gradeFilter === 'all' || p.grade === gradeFilter;
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

        return matchesSearch && matchesRole && matchesGrade && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'price_desc') return (b.soldPrice || b.basePrice) - (a.soldPrice || a.basePrice);
        if (sortBy === 'price_asc') return (a.soldPrice || a.basePrice) - (b.soldPrice || b.basePrice);
        if (sortBy === 'runs_desc') return b.stats.runs - a.stats.runs;
        if (sortBy === 'wickets_desc') return b.stats.wickets - a.stats.wickets;
        if (sortBy === 'avg_desc') return b.stats.average - a.stats.average;
        if (sortBy === 'sr_desc') return b.stats.strikeRate - a.stats.strikeRate;
        if (sortBy === 'grade') {
          const gradeOrder: Record<PlayerGrade, number> = { A: 1, B: 2, C: 3 };
          return gradeOrder[a.grade] - gradeOrder[b.grade];
        }
        return (a.auctionOrder || 0) - (b.auctionOrder || 0);
      });
  }, [players, searchTerm, roleFilter, gradeFilter, statusFilter, sortBy]);

  const handleToggleCompare = (player: Player) => {
    setComparePlayerIds(prev => {
      if (prev.includes(player.id)) {
        return prev.filter(id => id !== player.id);
      }
      if (prev.length >= 4) {
        alert('You can compare a maximum of 4 players at a time.');
        return prev;
      }
      return [...prev, player.id];
    });
  };

  const handleSavePlayer = (playerData: Omit<Player, 'id' | 'status'> | Player) => {
    if ('id' in playerData) {
      editPlayer(playerData as Player);
      showNotification(`Updated player details for ${(playerData as Player).name}!`);
    } else {
      const added = addPlayer(playerData);
      showNotification(`Added new player: ${added.name}!`);
    }
    setPlayerToEdit(null);
  };

  const [deletedCache, setDeletedCache] = useState<Player[]>([]);

  const handleDeletePlayer = (player: Player) => {
    if (window.confirm(`Are you sure you want to delete ${player.name} from the tournament database?`)) {
      setDeletedCache([player]);
      deletePlayer(player.id);
      showNotification(`Removed ${player.name}. Click Undo to restore.`);
    }
  };

  const handleConfirmDeleteAll = () => {
    setDeletedCache([...players]);
    deleteAllPlayers();
    showNotification(`All ${players.length} players removed. Click Undo to restore.`);
  };

  const handleUndoDelete = () => {
    if (deletedCache.length > 0) {
      restoreDeletedPlayers(deletedCache);
      const count = deletedCache.length;
      setDeletedCache([]);
      showNotification(`Restored ${count} player${count > 1 ? 's' : ''} to the database!`);
    }
  };

  const comparedPlayers = players.filter(p => comparePlayerIds.includes(p.id));

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-2xl backdrop-blur-md animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
          {deletedCache.length > 0 && (
            <button
              onClick={handleUndoDelete}
              className="ml-2 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 shadow cursor-pointer transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Undo</span>
            </button>
          )}
        </div>
      )}

      {/* Undo Banner for Deleted Players */}
      {deletedCache.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold flex flex-wrap items-center justify-between gap-3 shadow-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {deletedCache.length === 1
                ? `Removed player: ${deletedCache[0].name}.`
                : `Removed ${deletedCache.length} players.`} You can undo this action to restore them.
            </span>
          </div>
          <button
            onClick={handleUndoDelete}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo Delete</span>
          </button>
        </div>
      )}

      {/* Page Header with Bulk Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Users className="w-6 h-6 text-amber-400" />
              <span>Tournament Players Database</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold">
              {players.length} Players
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Register new players, adjust valuations, filter by role/grade, or upload player spreadsheets.
          </p>
        </div>

        {/* Action Button Strip */}
        <div className="flex flex-wrap items-center gap-2.5">
          {comparePlayerIds.length >= 2 && (
            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all shadow flex items-center gap-1.5"
            >
              <Scale className="w-4 h-4" />
              <span>Compare ({comparePlayerIds.length})</span>
            </button>
          )}

          {onNavigate && (
            <button
              onClick={() => onNavigate('import_excel')}
              className="px-3.5 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Import Excel</span>
            </button>
          )}

          {players.length > 0 && (
            <button
              onClick={() => setIsDeleteAllModalOpen(true)}
              title="Delete all players from the tournament at once"
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Delete All Players</span>
            </button>
          )}

          {/* CricHeroes Fetch Button */}
          <button
            onClick={() => setIsCricHeroesModalOpen(true)}
            title="Fetch player profile and statistics directly from CricHeroes"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs transition-all shadow-lg shadow-red-600/25 flex items-center gap-1.5 active:scale-95 border border-red-400/30"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Fetch CricHeroes</span>
          </button>

          {/* Primary "+ Add Player" Button */}
          <button
            onClick={() => {
              setPlayerToEdit(null);
              setIsPlayerModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Player</span>
          </button>
        </div>
      </div>

      {/* Search, Filters & Sorting Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Search */}
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by player name or skill..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Role Filter */}
        <div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500 font-medium"
          >
            <option value="all">All Roles</option>
            <option value="Batsman">🏏 Batsman</option>
            <option value="Bowler">🎯 Bowler</option>
            <option value="All-rounder">⚡ All-rounder</option>
            <option value="Wicketkeeper">🧤 Wicketkeeper</option>
          </select>
        </div>

        {/* Grade Filter */}
        <div>
          <select
            value={gradeFilter}
            onChange={e => setGradeFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500 font-medium"
          >
            <option value="all">All Grades (A, B, C)</option>
            <option value="A">💎 Grade A (Elite)</option>
            <option value="B">⭐ Grade B (Regular)</option>
            <option value="C">🌱 Grade C (Emerging)</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="upcoming">⏳ Upcoming Pool</option>
            <option value="sold">✅ Sold</option>
            <option value="unsold">❌ Unsold</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500 font-medium"
          >
            <option value="default">Sort: Auction Order</option>
            <option value="grade">Sort: Grade (A → C)</option>
            <option value="price_desc">Sort: Price (High → Low)</option>
            <option value="price_asc">Sort: Price (Low → High)</option>
            <option value="runs_desc">Sort: Highest Runs</option>
            <option value="wickets_desc">Sort: Highest Wickets</option>
            <option value="avg_desc">Sort: Batting Average</option>
            <option value="sr_desc">Sort: Strike Rate</option>
          </select>
        </div>
      </div>

      {/* Wishlist Selector Helper Bar */}
      {players.length > 0 && (
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Team Shortlist Target:</span>
            <select
              value={activeWishlistTeamId}
              onChange={e => setActiveWishlistTeamId(e.target.value)}
              className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-amber-300 font-bold"
            >
              {teams.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} (Wishlist: {t.wishlist?.length || 0})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span>Showing {filteredPlayers.length} of {players.length} players</span>
            {comparePlayerIds.length > 0 && (
              <span className="text-cyan-400 font-bold">
                {comparePlayerIds.length}/4 for comparison
              </span>
            )}
          </div>
        </div>
      )}

      {/* Player Cards Grid or Empty State */}
      {players.length === 0 ? (
        /* Empty State: No players in database */
        <div className="p-12 sm:p-16 rounded-3xl bg-slate-900/60 border-2 border-dashed border-slate-800 text-center space-y-5 max-w-2xl mx-auto shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-black text-white">Player Database is Empty</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              You have cleared all players. You can now add your tournament players individually or upload a complete spreadsheet.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setPlayerToEdit(null);
                setIsPlayerModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add First Player</span>
            </button>

            {onNavigate && (
              <button
                onClick={() => onNavigate('import_excel')}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs transition-colors flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Upload Excel / CSV</span>
              </button>
            )}

            <button
              onClick={() => {
                resetToDemoData();
                showNotification('Loaded 100 tournament players!');
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 font-mono text-xs transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Load 100 Sample Players</span>
            </button>
          </div>
        </div>
      ) : filteredPlayers.length === 0 ? (
        /* Filter Empty State */
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-3">
          <SlidersHorizontal className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No players match these filters</h3>
          <p className="text-xs text-slate-400">Try clearing or adjusting search queries and role/grade filters.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setRoleFilter('all');
              setGradeFilter('all');
              setStatusFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* Player Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPlayers.map(player => {
            const activeTeam = teams.find(t => t.id === activeWishlistTeamId);
            const isWishlisted = activeTeam?.wishlist?.includes(player.id) || false;

            return (
              <PlayerCard
                key={player.id}
                player={player}
                teams={teams}
                onStartAuction={p => onStartAuction(p)}
                onEdit={p => {
                  setPlayerToEdit(p);
                  setIsPlayerModalOpen(true);
                }}
                onDelete={handleDeletePlayer}
                onToggleCompare={handleToggleCompare}
                isComparing={comparePlayerIds.includes(player.id)}
                activeWishlistTeamId={activeWishlistTeamId}
                isWishlisted={isWishlisted}
                onToggleWishlist={toggleWishlist}
              />
            );
          })}
        </div>
      )}

      {/* Add / Edit Player Modal */}
      <PlayerModal
        isOpen={isPlayerModalOpen}
        onClose={() => {
          setIsPlayerModalOpen(false);
          setPlayerToEdit(null);
        }}
        onSave={handleSavePlayer}
        playerToEdit={playerToEdit}
        onOpenCricHeroes={() => setIsCricHeroesModalOpen(true)}
      />

      {/* CricHeroes Import Modal */}
      <CricHeroesModal
        isOpen={isCricHeroesModalOpen}
        onClose={() => setIsCricHeroesModalOpen(false)}
        onAddPlayer={(playerData) => {
          const added = addPlayer(playerData);
          showNotification(`Imported ${added.name} from CricHeroes!`);
        }}
        onOpenEditForm={(playerData) => {
          setPlayerToEdit(playerData as any);
          setIsPlayerModalOpen(true);
        }}
      />

      {/* Delete All Players Confirmation Modal */}
      <DeleteAllPlayersModal
        isOpen={isDeleteAllModalOpen}
        onClose={() => setIsDeleteAllModalOpen(false)}
        playerCount={players.length}
        onConfirmDelete={handleConfirmDeleteAll}
      />

      {/* Player Comparison Modal */}
      <PlayerComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        players={comparedPlayers}
        onRemovePlayer={id => setComparePlayerIds(prev => prev.filter(x => x !== id))}
      />
    </div>
  );
};
