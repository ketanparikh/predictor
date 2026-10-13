import React, { useState, useMemo } from 'react';
import { useAuction } from '../context/AuctionContext';
import { AuctionTransaction } from '../types/auction';
import { GradeBadge } from '../components/GradeBadge';
import { RoleBadge } from '../components/RoleBadge';
import { BidHistoryModal } from '../components/BidHistoryModal';
import {
  History,
  RotateCcw,
  Search,
  Filter,
  Eye,
  ShieldAlert,
  Trophy,
  CheckCircle2,
} from 'lucide-react';

export const AuctionHistoryPage: React.FC = () => {
  const { transactions, undoTransaction, teams } = useAuction();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('all');

  const [selectedTx, setSelectedTx] = useState<AuctionTransaction | null>(null);
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);

  const activeTransactions = transactions.filter(t => !t.undone);

  const filteredTransactions = useMemo(() => {
    return activeTransactions.filter(tx => {
      const matchesSearch = tx.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.teamName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTeam = selectedTeamFilter === 'all' || tx.teamId === selectedTeamFilter;
      const matchesGrade = selectedGradeFilter === 'all' || tx.playerGrade === selectedGradeFilter;

      return matchesSearch && matchesTeam && matchesGrade;
    });
  }, [activeTransactions, searchTerm, selectedTeamFilter, selectedGradeFilter]);

  const totalPointsSpentInHistory = activeTransactions.reduce((acc, t) => acc + t.soldPrice, 0);

  const handleUndo = (tx: AuctionTransaction) => {
    if (window.confirm(`Undo auction sale for ${tx.playerName}? This will refund ${tx.soldPrice.toLocaleString()} points to ${tx.teamName} and return the player to the upcoming pool.`)) {
      undoTransaction(tx.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <History className="w-6 h-6 text-amber-400" />
            <span>Auction Audit & Transaction Log</span>
          </h1>
          <p className="text-xs text-slate-400">
            {activeTransactions.length} Completed Acquisitions • {totalPointsSpentInHistory.toLocaleString()} Total Points Transacted
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by player or team name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Team Filter */}
        <div>
          <select
            value={selectedTeamFilter}
            onChange={e => setSelectedTeamFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Winning Teams</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Grade Filter */}
        <div>
          <select
            value={selectedGradeFilter}
            onChange={e => setSelectedGradeFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Grades</option>
            <option value="A">Grade A</option>
            <option value="B">Grade B</option>
            <option value="C">Grade C</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      {filteredTransactions.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-3">
          <History className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No transactions recorded</h3>
          <p className="text-xs text-slate-400">Sold player records will appear here as live bidding rounds complete.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">#</th>
                <th className="p-3.5">Player Name</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Grade</th>
                <th className="p-3.5">Winning Franchise</th>
                <th className="p-3.5">Base Price</th>
                <th className="p-3.5">Final Sold Price</th>
                <th className="p-3.5">Bids Placed</th>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 font-mono">
              {filteredTransactions.map((tx, idx) => (
                <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-3.5 text-slate-500 font-bold">#{idx + 1}</td>
                  <td className="p-3.5 font-bold text-white text-sm font-sans">{tx.playerName}</td>
                  <td className="p-3.5"><RoleBadge role={tx.playerRole} size="sm" /></td>
                  <td className="p-3.5"><GradeBadge grade={tx.playerGrade} size="sm" /></td>
                  <td className="p-3.5 text-emerald-300 font-semibold font-sans">{tx.teamName}</td>
                  <td className="p-3.5 text-slate-400">{tx.basePrice.toLocaleString()} pts</td>
                  <td className="p-3.5 font-black text-amber-400 text-sm">
                    {tx.soldPrice.toLocaleString()} pts
                  </td>
                  <td className="p-3.5 text-slate-300">{tx.bidHistory.length} bids</td>
                  <td className="p-3.5 text-slate-500 text-[11px]">
                    {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedTx(tx);
                          setIsBidModalOpen(true);
                        }}
                        title="View Full Bidding History"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleUndo(tx)}
                        title="Undo Transaction (Refund purse and release player)"
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bid History Sequence Modal */}
      <BidHistoryModal
        isOpen={isBidModalOpen}
        onClose={() => {
          setIsBidModalOpen(false);
          setSelectedTx(null);
        }}
        transaction={selectedTx}
      />
    </div>
  );
};
