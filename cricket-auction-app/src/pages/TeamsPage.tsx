import React, { useState } from 'react';
import { useAuction } from '../context/AuctionContext';
import { Team } from '../types/auction';
import { TeamDetailModal } from '../components/TeamDetailModal';
import { EditTeamModal } from '../components/EditTeamModal';
import { QuickRenameTeamsModal } from '../components/QuickRenameTeamsModal';
import { AddTeamModal } from '../components/AddTeamModal';
import {
  Shield,
  Eye,
  Edit2,
  Edit3,
  User,
  Coins,
  Users,
  CheckCircle2,
  Plus,
  Trash2,
} from 'lucide-react';

export const TeamsPage: React.FC = () => {
  const {
    teams,
    players,
    addTeam,
    removeTeam,
    updateTeam,
    updateAllTeams,
    resetTeamBudget,
    removePlayerFromSquad,
  } = useAuction();

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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

      {/* Page Header with Add Team and Quick Rename Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-amber-400" />
            <span>Tournament Franchise Hub ({teams.length} Teams)</span>
          </h1>
          <p className="text-xs text-slate-400">
            Add or remove franchise teams (minimum 12 for tournament), customize codes and colors, monitor purses, and inspect squad rosters.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Team</span>
          </button>

          <button
            onClick={() => setIsQuickRenameOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all shadow flex items-center gap-2 group cursor-pointer"
          >
            <Edit3 className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span>Rename Teams</span>
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
          const wkCount = squadPlayers.filter(p => p.role === 'Wicketkeeper').length;
          const sponsoredPlayer = squadPlayers.find(p => p.isSponsored || (p.sponsorTag && p.sponsorTag.trim()));

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
                      <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 text-[10px]">
                          {team.shortName}
                        </span>
                        <span>•</span>
                        <span className="text-amber-300 font-semibold flex items-center gap-1">
                          👑 {team.captain || 'Captain TBD'}
                        </span>
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

                {/* Role Balance Counters & Sponsor Tag */}
                <div className="mt-3 grid grid-cols-4 gap-1.5 text-center text-xs font-mono">
                  <div className="p-2 rounded-lg border bg-slate-950 border-slate-800/80 text-rose-300">
                    <div className="text-[10px] text-slate-400">BAT</div>
                    <div className="font-bold text-sm mt-0.5">{batsmenCount}</div>
                  </div>

                  <div className="p-2 rounded-lg border bg-slate-950 border-slate-800/80 text-indigo-300">
                    <div className="text-[10px] text-slate-400">BOWL</div>
                    <div className="font-bold text-sm mt-0.5">{bowlersCount}</div>
                  </div>

                  <div className="p-2 rounded-lg border bg-slate-950 border-slate-800/80 text-amber-300">
                    <div className="text-[10px] text-slate-400">WK</div>
                    <div className="font-bold text-sm mt-0.5">{wkCount}</div>
                  </div>

                  <div className={`p-2 rounded-lg border ${sponsoredPlayer ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-950 border-slate-800/80 text-slate-500'}`}>
                    <div className="text-[10px]">SPONSOR</div>
                    <div className="font-bold text-sm mt-0.5">{sponsoredPlayer ? '1/1' : '0/1'}</div>
                  </div>
                </div>
              </div>

              {/* Card Footer: Edit Team, Delete Team & Inspect Squad Buttons */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(team)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-700/60 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => {
                      if (teams.length <= 12) {
                        alert('Tournament Rule: A minimum of 12 teams is required for the tournament.');
                        return;
                      }
                      if (window.confirm(`Are you sure you want to remove franchise "${team.name}"? Squad members will return to the auction player pool.`)) {
                        const res = removeTeam(team.id);
                        showNotification(res.message);
                      }
                    }}
                    title={teams.length <= 12 ? 'Minimum 12 teams required for tournament' : `Remove ${team.name}`}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      teams.length <= 12
                        ? 'border-slate-800 text-slate-700 cursor-not-allowed'
                        : 'border-slate-800 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => handleOpenDetail(team)}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Squad</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Team Modal */}
      <AddTeamModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(name) => showNotification(`Added ${name} successfully!`)}
      />

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
