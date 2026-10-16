import React, { useState, useMemo } from 'react';
import { useAuction } from '../context/AuctionContext';
import { Team, Player } from '../types/auction';
import {
  Crown,
  Shield,
  UserCheck,
  UserX,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Settings,
  Sparkles,
  Users,
  X,
  ArrowRight,
} from 'lucide-react';

export const CaptainManagementPage: React.FC = () => {
  const {
    teams,
    players,
    rules,
    updateRules,
    allocateCaptainToTeam,
    removeCaptainFromTeam,
  } = useAuction();

  const [selectedTeamForAssignment, setSelectedTeamForAssignment] = useState<Team | null>(null);
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [costMode, setCostMode] = useState<'zero' | 'custom'>(() => rules.captainCostMode === 'custom' ? 'custom' : 'zero');
  const [captainCost, setCaptainCost] = useState<number>(() => rules.captainCustomCost ?? 0);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Find assigned captain player objects for each team
  const teamCaptainMap = useMemo(() => {
    const map = new Map<string, Player | undefined>();
    teams.forEach((team) => {
      // 1. Direct match by captainPlayerId
      let captain = team.captainPlayerId ? players.find(p => p.id === team.captainPlayerId) : undefined;
      // 2. Match by player.captainOfTeamId
      if (!captain) {
        captain = players.find(p => p.captainOfTeamId === team.id);
      }
      // 3. Match by player in team squad or teamId with isCaptain
      if (!captain) {
        captain = players.find(p => (p.teamId === team.id || team.squad.includes(p.id)) && (p.isCaptain || p.isPreAssignedCaptain));
      }
      // 4. Match by player name === team.captain
      if (!captain && team.captain) {
        captain = players.find(p => p.name.trim().toLowerCase() === team.captain!.trim().toLowerCase());
      }
      map.set(team.id, captain);
    });
    return map;
  }, [teams, players]);

  // Set of player IDs already assigned as captain to ANY team
  const assignedCaptainIds = useMemo(() => {
    const ids = new Set<string>();
    teamCaptainMap.forEach((cap) => {
      if (cap) ids.add(cap.id);
    });
    return ids;
  }, [teamCaptainMap]);

  // Count stats
  const totalTeams = teams.length;
  const assignedCaptainsCount = Array.from(teamCaptainMap.values()).filter(Boolean).length;
  const unassignedTeamsCount = totalTeams - assignedCaptainsCount;

  // Filter available players for captain selection modal - allow all players to be viewed and searched
  const eligiblePlayers = useMemo(() => {
    return players.filter((player) => {
      const matchesSearch =
        player.name.toLowerCase().includes(playerSearchQuery.toLowerCase()) ||
        (player.category ? player.category.toLowerCase().includes(playerSearchQuery.toLowerCase()) : false) ||
        (player.role ? player.role.toLowerCase().includes(playerSearchQuery.toLowerCase()) : false);

      const matchesGrade = gradeFilter === 'all' || player.grade === gradeFilter;

      return matchesSearch && matchesGrade;
    });
  }, [players, playerSearchQuery, gradeFilter]);

  // Open assignment modal
  const handleOpenAssign = (team: Team) => {
    setSelectedTeamForAssignment(team);
    setPlayerSearchQuery('');
    setGradeFilter('all');
    // Pre-fill cost based on active mode
    if (costMode === 'zero') {
      setCaptainCost(0);
    } else {
      setCaptainCost(rules.captainCustomCost ?? 0);
    }
  };

  // Perform captain assignment
  const handleConfirmAssignment = (player: Player) => {
    if (!selectedTeamForAssignment) return;

    const res = allocateCaptainToTeam(selectedTeamForAssignment.id, player.id, captainCost);
    if (res.success) {
      showToast(res.message, 'success');
      setSelectedTeamForAssignment(null);
    } else {
      showToast(res.message, 'error');
    }
  };

  // Remove captain
  const handleRemoveCaptain = (team: Team) => {
    if (window.confirm(`Are you sure you want to remove the captain for ${team.name}?`)) {
      const res = removeCaptainFromTeam(team.id);
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    }
  };

  // Toggle captain cost mode
  const handleToggleCostMode = (newMode: 'zero' | 'custom') => {
    setCostMode(newMode);
    updateRules({
      ...rules,
      captainCostMode: newMode,
    });
    showToast(`Captain Cost Mode set to: ${newMode === 'zero' ? 'Zero Cost (₹0)' : 'Custom Cost'}`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-semibold border ${
            toastMessage.type === 'success'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400/30'
              : 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-rose-400/30'
          } animate-bounce`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-white" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-white" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Crown className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-2xl font-black text-white tracking-wide">Captain Management</h1>
                <p className="text-xs text-slate-400">
                  Pre-assign official team captains across all 12 teams before or during the auction
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Teams</span>
              <span className="text-xl font-black text-white">{totalTeams}</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Assigned</span>
              <span className="text-xl font-black text-amber-400">{assignedCaptainsCount} / {totalTeams}</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Unassigned</span>
              <span className={`text-xl font-black ${unassignedTeamsCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {unassignedTeamsCount}
              </span>
            </div>
          </div>
        </div>

        {/* Cost Mode Toggle Banner */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">Captain Purse Deduction:</span>
            <div className="flex items-center p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
              <button
                onClick={() => handleToggleCostMode('zero')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  costMode === 'zero'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Zero Cost (₹0 Free Pre-Allocation)
              </button>
              <button
                onClick={() => handleToggleCostMode('custom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  costMode === 'custom'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Custom Price / Deduct From Budget
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-400 italic">
            {costMode === 'zero'
              ? 'Captains are added to team squad without reducing remaining budget.'
              : 'Captains are assigned at custom amount and deducted from team purse.'}
          </div>
        </div>
      </div>

      {/* Teams Grid (All 12 Teams) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {teams.map((team) => {
          const captain = teamCaptainMap.get(team.id);
          const hasCaptain = Boolean(captain || team.captain);

          return (
            <div
              key={team.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg flex flex-col transition-all group"
            >
              {/* Team Top Accent Strip */}
              <div
                className="h-2 w-full"
                style={{ backgroundColor: team.color || '#f59e0b' }}
              />

              {/* Team Card Content */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  {/* Team Identity */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {team.logo && (team.logo.startsWith('http') || team.logo.startsWith('/') || team.logo.startsWith('data:')) ? (
                        <img
                          src={team.logo}
                          alt={team.name}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-700 bg-slate-950 p-1"
                        />
                      ) : (
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white text-xl shadow border border-slate-700 bg-slate-950"
                        >
                          {team.logo || team.shortName || team.name.substring(0, 3).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-base text-white group-hover:text-amber-400 transition-colors">
                          {team.name}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          Purse: ₹{team.remainingBudget.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-950 border border-slate-800 text-slate-300">
                      {team.squad.length} / {rules.squadRules.maxSquadSize}
                    </span>
                  </div>

                  {/* Captain Status Card */}
                  <div
                    className={`rounded-xl p-4 border transition-all ${
                      hasCaptain
                        ? 'bg-slate-950/90 border-amber-500/30 shadow-inner'
                        : 'bg-slate-950/40 border-dashed border-slate-800'
                    }`}
                  >
                    {captain ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={
                                captain.photo ||
                                'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=120&q=80'
                              }
                              alt={captain.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shadow-md"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=120&q=80';
                              }}
                            />
                            <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-0.5 rounded-full shadow">
                              <Crown className="w-3 h-3" />
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-white">{captain.name}</h4>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                {captain.grade || 'A'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">
                              {captain.category} • {captain.specialism || captain.role}
                            </p>
                            <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                              Cost: ₹{(captain.soldPrice ?? 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {/* Remove Captain Button */}
                        <button
                          onClick={() => handleRemoveCaptain(team)}
                          title="Remove Captain"
                          className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    ) : team.captain ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg">
                            👑
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-white">{team.captain}</h4>
                            <p className="text-[11px] text-amber-400 font-semibold">Designated Team Captain</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveCaptain(team)}
                          title="Remove Captain"
                          className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="py-2 text-center">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400/80" />
                          No captain assigned yet
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    Owner: <strong className="text-slate-300">{team.owner || 'Franchise'}</strong>
                  </span>

                  <button
                    onClick={() => handleOpenAssign(team)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      hasCaptain
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md hover:shadow-amber-500/20'
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5" />
                    {hasCaptain ? 'Change Captain' : 'Assign Captain'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Captain Selection Modal */}
      {selectedTeamForAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Crown className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-lg text-white">
                    Select Captain for {selectedTeamForAssignment.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Choose from available players. Vice captains and captains are recommended to be Grade A/A+.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTeamForAssignment(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Optional Custom Cost Input */}
            {costMode === 'custom' && (
              <div className="my-4 p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Assign Price for Captain (₹):
                </span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={captainCost}
                  onChange={(e) => setCaptainCost(Number(e.target.value) || 0)}
                  className="w-36 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono text-white text-right focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {/* Search and Filters */}
            <div className="mt-4 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search player name or role..."
                  value={playerSearchQuery}
                  onChange={(e) => setPlayerSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Grades</option>
                <option value="A+">Grade A+</option>
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
                <option value="C">Grade C</option>
              </select>
            </div>

            {/* Players List */}
            <div className="mt-4 flex-1 overflow-y-auto divide-y divide-slate-800/60 pr-1 max-h-96">
              {eligiblePlayers.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No eligible players found.
                </div>
              ) : (
                eligiblePlayers.map((player) => {
                  const isCurrentCap =
                    teamCaptainMap.get(selectedTeamForAssignment.id)?.id === player.id;
                  const otherCaptainTeam = teams.find(
                    (t) =>
                      t.id !== selectedTeamForAssignment.id &&
                      (t.captainPlayerId === player.id ||
                        player.captainOfTeamId === t.id ||
                        (t.captain && player.name.trim().toLowerCase() === t.captain.trim().toLowerCase()))
                  );
                  const otherSquadTeam =
                    !otherCaptainTeam && player.teamId && player.teamId !== selectedTeamForAssignment.id
                      ? teams.find((t) => t.id === player.teamId)
                      : null;

                  return (
                    <div
                      key={player.id}
                      className="py-3 px-2 flex items-center justify-between hover:bg-slate-800/50 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            player.photo ||
                            'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=120&q=80'
                          }
                          alt={player.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-700"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=120&q=80';
                          }}
                        />
                        <div>
                          <div className="flex items-center gap-2 font-bold text-sm text-white flex-wrap">
                            <span>{player.name}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              Grade {player.grade || 'A'}
                            </span>
                            {player.isViceCaptain && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-500 text-white">
                                VC
                              </span>
                            )}
                            {otherCaptainTeam && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                👑 Captain of {otherCaptainTeam.name}
                              </span>
                            )}
                            {otherSquadTeam && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                In {otherSquadTeam.name} Squad
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">
                            {player.category} • {player.specialism || player.role} • Base ₹{player.basePrice.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>

                      <div>
                        {isCurrentCap ? (
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            Current Captain
                          </span>
                        ) : otherCaptainTeam ? (
                          <button
                            onClick={() => {
                              if (window.confirm(`Reassign ${player.name} from ${otherCaptainTeam.name} to ${selectedTeamForAssignment.name}?`)) {
                                handleConfirmAssignment(player);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 transition-colors shadow flex items-center gap-1"
                          >
                            <span>Reassign</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : otherSquadTeam ? (
                          <button
                            onClick={() => {
                              if (window.confirm(`Transfer ${player.name} from ${otherSquadTeam.name} squad and assign as Captain to ${selectedTeamForAssignment.name}?`)) {
                                handleConfirmAssignment(player);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-white border border-blue-500/40 transition-colors shadow flex items-center gap-1"
                          >
                            <span>Transfer & Assign</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConfirmAssignment(player)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow flex items-center gap-1"
                          >
                            <span>Assign</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedTeamForAssignment(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
