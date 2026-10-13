import React, { useState } from 'react';
import { useAuction } from '../context/AuctionContext';
import { Team } from '../types/auction';
import { TeamDetailModal } from '../components/TeamDetailModal';
import { EditTeamModal } from '../components/EditTeamModal';
import { QuickRenameTeamsModal } from '../components/QuickRenameTeamsModal';
import {
  Shield,
  Eye,
  Edit2,
  Edit3,
  User,
  Coins,
  Users,
  CheckCircle2,
} from 'lucide-react';

export const TeamsPage: React.FC = () => {
  const {
    teams,
    players,
    updateTeam,
    updateAllTeams,
    resetTeamBudget,
    removePlayerFromSquad,
  } = useAuction();

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [isQuickRenameOpen, setIsQuickRenameOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleOpenDetail = (team: Team) => {
    setSelectedTeam(team);
    setIsDetailModalOpen(true);
  };

  const handleOpenEdit = (team: Team) => {
    setTeamToEdit(team);
    setIsEditModalOpen(true);
  };

  const handleSaveTeam = (updated: Team) => {
    updateTeam(updated);
    showNotification(`Successfully updated ${updated.name}!`);
  };

  const handleSaveAllTeams = (updatedList: Team[]) => {
    updateAllTeams(updatedList);
    showNotification('All 10 franchise team names updated successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-2xl backdrop-blur-md animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Page Header with Quick Rename Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-amber-400" />
            <span>Tournament Franchise Hub (10 Teams)</span>
          </h1>
          <p className="text-xs text-slate-400">
            Customize team names, codes, colors, monitor purse utilization, and inspect squad rosters.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsQuickRenameOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all shadow flex items-center gap-2 group"
          >
            <Edit3 className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span>Rename All 10 Teams</span>
          </button>
        </div>
      </div>

      {/* 10 Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {teams.map(team => {
          const squadPlayers = players.filter(p => team.squad.includes(p.id));
          const percentSpent = (team.totalSpent / team.startingBudget) * 100;
          const batsmenCount = squadPlayers.filter(p => p.role === 'Batsman').length;
          const bowlersCount = squadPlayers.filter(p => p.role === 'Bowler').length;
          const allRoundersCount = squadPlayers.filter(p => p.role === 'All-rounder').length;
          const wkCount = squadPlayers.filter(p => p.role === 'Wicketkeeper').length;

          return (
            <div
              key={team.id}
              style={{ borderTopColor: team.color || '#3b82f6' }}
              className="rounded-2xl bg-slate-900/90 border border-slate-800 border-t-4 p-5 flex flex-col justify-between hover:border-slate-700 transition-all hover:shadow-xl space-y-4 relative group"
            >
              {/* Header: Logo, Name & Code */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      onClick={() => handleOpenEdit(team)}
                      title="Click to change team logo or details"
                      className="text-3xl p-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:scale-105 transition-transform"
                    >
                      {team.logo}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-white text-base leading-tight">{team.name}</h3>
                        <button
                          onClick={() => handleOpenEdit(team)}
                          title="Edit team name"
                          className="opacity-60 hover:opacity-100 p-1 text-slate-400 hover:text-amber-400 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                        <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 text-[10px]">
                          {team.shortName}
                        </span>
                        <span>•</span>
                        <span className="truncate max-w-[140px]">{team.captain || 'Captain TBD'}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                      squadPlayers.length >= 9
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {squadPlayers.length} / 9 Players
                  </span>
                </div>

                {/* Budget Progress Meter */}
                <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-400">Remaining Purse:</span>
                    <span className="font-bold text-emerald-400">{team.remainingBudget.toLocaleString()} pts</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${percentSpent}%`, backgroundColor: team.color || '#eab308' }}
                      className="h-full transition-all duration-300"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>Spent: {team.totalSpent.toLocaleString()} pts</span>
                    <span>{Math.round(percentSpent)}%</span>
                  </div>
                </div>

                {/* Role Balance Counters (Cap 3 Batsmen/WK, 3 Bowlers, 3 All-rounders) */}
                <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-xs font-mono">
                  <div
                    className={`p-2 rounded-lg border ${
                      batsmenCount + wkCount >= 3
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                        : 'bg-slate-950 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400">BAT/WK</div>
                    <div className="font-bold text-sm mt-0.5">
                      {batsmenCount + wkCount} / 3
                      {batsmenCount + wkCount >= 3 && <span className="text-[9px] block text-rose-400 font-sans font-bold">FULL</span>}
                    </div>
                  </div>

                  <div
                    className={`p-2 rounded-lg border ${
                      bowlersCount >= 3
                        ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                        : 'bg-slate-950 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400">BOWL</div>
                    <div className="font-bold text-sm mt-0.5">
                      {bowlersCount} / 3
                      {bowlersCount >= 3 && <span className="text-[9px] block text-indigo-400 font-sans font-bold">FULL</span>}
                    </div>
                  </div>

                  <div
                    className={`p-2 rounded-lg border ${
                      allRoundersCount >= 3
                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                        : 'bg-slate-950 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400">ALL-ROUND</div>
                    <div className="font-bold text-sm mt-0.5">
                      {allRoundersCount} / 3
                      {allRoundersCount >= 3 && <span className="text-[9px] block text-purple-400 font-sans font-bold">FULL</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer: Edit Team & Inspect Squad Buttons */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenEdit(team)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-700/60"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Edit Team</span>
                </button>

                <button
                  onClick={() => handleOpenDetail(team)}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Squad</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Single Team Modal */}
      <EditTeamModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setTeamToEdit(null);
        }}
        team={teamToEdit}
        onSave={handleSaveTeam}
      />

      {/* Quick Rename All 10 Teams Modal */}
      <QuickRenameTeamsModal
        isOpen={isQuickRenameOpen}
        onClose={() => setIsQuickRenameOpen(false)}
        teams={teams}
        onSaveAll={handleSaveAllTeams}
      />

      {/* Team Details & Squad Roster Modal */}
      <TeamDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTeam(null);
        }}
        team={selectedTeam}
        allPlayers={players}
        onUpdateTeam={updateTeam}
        onResetBudget={resetTeamBudget}
        onRemovePlayerFromSquad={removePlayerFromSquad}
      />
    </div>
  );
};
