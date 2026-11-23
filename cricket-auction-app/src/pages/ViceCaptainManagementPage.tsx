import React, { useState, useMemo } from 'react';
import { useAuction } from '../context/AuctionContext';
import { Team, Player } from '../types/auction';
import {
  Star,
  Crown,
  Shield,
  UserCheck,
  UserX,
  Search,
  CheckCircle2,
  AlertTriangle,
  Users,
  X,
  ArrowRight,
  TrendingUp,
  Save,
  Coins,
} from 'lucide-react';

export const ViceCaptainManagementPage: React.FC = () => {
  const {
    teams,
    players,
    rules,
    updateRules,
    allocateViceCaptainToTeam,
    removeViceCaptainFromTeam,
    applyViceCaptainCostToAllAllotted,
    getTeamGradeMetrics,
  } = useAuction();

  const [selectedTeamForAssignment, setSelectedTeamForAssignment] = useState<Team | null>(null);
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [costMode, setCostMode] = useState<'zero' | 'custom'>(() => rules.captainCostMode === 'custom' ? 'custom' : 'zero');
  const [vcCost, setVcCost] = useState<number>(0);
  const [teamCostInputs, setTeamCostInputs] = useState<Record<string, number>>({});
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Find assigned vice-captain player objects for each team
  const teamViceCaptainMap = useMemo(() => {
    const map = new Map<string, Player | undefined>();
    teams.forEach((team) => {
      let vc = team.viceCaptainPlayerId ? players.find(p => p.id === team.viceCaptainPlayerId) : undefined;
      if (!vc) {
        vc = players.find(p => p.viceCaptainOfTeamId === team.id);
      }
      if (!vc) {
        vc = players.find(p => (p.teamId === team.id || team.squad.includes(p.id)) && (p.isViceCaptain || p.isPreAssignedViceCaptain));
      }
      if (!vc && team.viceCaptain) {
        vc = players.find(p => p.name.trim().toLowerCase() === team.viceCaptain!.trim().toLowerCase());
      }
      map.set(team.id, vc);
    });
    return map;
  }, [teams, players]);

  // Find assigned captain player objects for each team
  const teamCaptainMap = useMemo(() => {
    const map = new Map<string, Player | undefined>();
    teams.forEach((team) => {
      let cap = team.captainPlayerId ? players.find(p => p.id === team.captainPlayerId) : undefined;
      if (!cap) {
        cap = players.find(p => p.captainOfTeamId === team.id);
      }
      if (!cap) {
        cap = players.find(p => (p.teamId === team.id || team.squad.includes(p.id)) && (p.isCaptain || p.isPreAssignedCaptain));
      }
      if (!cap && team.captain) {
        cap = players.find(p => p.name.trim().toLowerCase() === team.captain!.trim().toLowerCase());
      }
      map.set(team.id, cap);
    });
    return map;
  }, [teams, players]);

  // Set of player IDs already assigned as Vice-Captain to ANY team
  const assignedVcIds = useMemo(() => {
    const ids = new Set<string>();
    teamViceCaptainMap.forEach((vc) => {
      if (vc) ids.add(vc.id);
    });
    return ids;
  }, [teamViceCaptainMap]);

  // Set of player IDs already assigned as Captain to ANY team
  const assignedCaptainIds = useMemo(() => {
    const ids = new Set<string>();
    teamCaptainMap.forEach((cap) => {
      if (cap) ids.add(cap.id);
    });
    return ids;
  }, [teamCaptainMap]);

  // Count stats
  const totalTeams = teams.length;
  const assignedVcsCount = Array.from(teamViceCaptainMap.values()).filter(Boolean).length;
  const unassignedTeamsCount = totalTeams - assignedVcsCount;

  // Filter available players for vice-captain selection modal
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
    if (costMode === 'zero') {
      setVcCost(0);
    } else {
      setVcCost(rules.captainCustomCost ?? 0);
    }
  };

  // Perform vice-captain assignment
  const handleConfirmAssignment = (player: Player) => {
    if (!selectedTeamForAssignment) return;

    // Check if player is already Captain of any team
    if (assignedCaptainIds.has(player.id)) {
      showToast(`${player.name} is already assigned as Captain of a franchise and cannot be Vice-Captain.`, 'error');
      return;
    }

    const res = allocateViceCaptainToTeam(selectedTeamForAssignment.id, player.id, vcCost);
    if (res.success) {
      showToast(res.message, 'success');
      setSelectedTeamForAssignment(null);
    } else {
      showToast(res.message, 'error');
    }
  };

  // Remove vice-captain
  const handleRemoveViceCaptain = (team: Team) => {
    if (window.confirm(`Are you sure you want to remove the vice-captain for ${team.name}?`)) {
      const res = removeViceCaptainFromTeam(team.id);
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    }
  };

  // Toggle cost mode
  const handleToggleCostMode = (newMode: 'zero' | 'custom') => {
    setCostMode(newMode);
    if (newMode === 'zero') {
      applyViceCaptainCostToAllAllotted(0);
      updateRules({
        ...rules,
        captainCostMode: 'zero',
        captainCustomCost: 0,
      });
      showToast('Set to Zero Cost: all vice-captain deductions refunded back to team purses!', 'success');
    } else {
      const defaultCost = vcCost > 0 ? vcCost : 10000;
      setVcCost(defaultCost);
      updateRules({
        ...rules,
        captainCostMode: 'custom',
        captainCustomCost: defaultCost,
      });
      showToast('Custom Cost Mode active. Set price and click "Apply to All" or deduct per franchise below.', 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 border border-blue-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                <Star className="w-6 h-6 fill-current" />
              </span>
              <div>
                <h1 className="text-2xl font-black text-white tracking-wide">Vice-Captain Allocation</h1>
                <p className="text-xs text-slate-400">
                  Pre-assign official team vice-captains across all 12 teams (Combined Captain + VC budget cap: ₹50,000)
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
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Assigned VC</span>
              <span className="text-xl font-black text-blue-400">{assignedVcsCount} / {totalTeams}</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Unassigned</span>
              <span className={`text-xl font-black ${unassignedTeamsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {unassignedTeamsCount}
              </span>
            </div>
          </div>
        </div>

        {/* Cost Mode Toggle Banner */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="font-semibold text-white">Vice-Captain Price Policy:</span>
            <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => handleToggleCostMode('zero')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  costMode === 'zero'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Zero Cost (₹0)
              </button>
              <button
                type="button"
                onClick={() => handleToggleCostMode('custom')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  costMode === 'custom'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Custom Price
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>Combined Captain + VC Spending Cap: <strong className="text-white font-mono">₹50,000 pts</strong></span>
          </div>
        </div>

        {/* Custom Price Global Deduct Tool */}
        {costMode === 'custom' && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-blue-500/30 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-blue-300">Set Vice-Captain Price (Deduct from Purse):</span>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl">
                <span className="text-xs font-mono text-blue-400 font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  max={50000}
                  step="500"
                  value={vcCost}
                  onChange={(e) => setVcCost(Number(e.target.value) || 0)}
                  className="w-28 bg-transparent text-sm font-mono text-white text-right font-bold focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={() => {
                const res = applyViceCaptainCostToAllAllotted(vcCost);
                showToast(res.message, res.success ? 'success' : 'error');
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
            >
              <Coins className="w-4 h-4" />
              <span>Apply & Deduct ₹{vcCost.toLocaleString('en-IN')} For All Allotted Vice-Captains</span>
            </button>
          </div>
        )}
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {teams.map((team) => {
          const vc = teamViceCaptainMap.get(team.id);
          const hasVc = !!vc;
          const cap = teamCaptainMap.get(team.id);
          const metrics = getTeamGradeMetrics(team);

          return (
            <div
              key={team.id}
              style={{ borderTopColor: team.color || '#3b82f6' }}
              className="bg-slate-900 border border-slate-800 border-t-4 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all space-y-4"
            >
              <div>
                {/* Team Top Strip */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 rounded-xl bg-slate-950 border border-slate-800">
                      {team.logo}
                    </span>
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight flex items-center gap-1.5">
                        {team.name}
                      </h3>
                      <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                        <span className="text-blue-400 font-bold bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 text-[10px]">
                          {team.shortName}
                        </span>
                        <span>•</span>
                        <span>Purse: ₹{team.remainingBudget.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-950 border border-slate-800 text-slate-300">
                    {team.squad.length} / {rules.squadRules.maxSquadSize}
                  </span>
                </div>

                {/* Combined Captain + VC Budget Progress Card */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 mb-3 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="font-semibold text-slate-300 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                      Leadership Budget (C + VC)
                    </span>
                    <span className="font-mono font-bold text-white">
                      ₹{metrics.combinedCapCost.toLocaleString('en-IN')} / ₹50,000
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        metrics.combinedCapCost > 45000
                          ? 'bg-rose-500'
                          : metrics.combinedCapCost > 30000
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                      }`}
                      style={{ width: `${Math.min(100, (metrics.combinedCapCost / 50000) * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Captain: ₹{metrics.captainCost.toLocaleString('en-IN')}</span>
                    <span>VC: ₹{metrics.viceCaptainCost.toLocaleString('en-IN')}</span>
                    <span className="text-emerald-400 font-bold">Rem: ₹{metrics.remainingCapBudget.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Captain Info (Contextual reference) */}
                <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 mb-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-slate-400 text-[11px]">Captain:</span>
                    <span className="font-semibold text-slate-200 truncate">
                      {cap ? cap.name : (team.captain || 'None assigned')}
                    </span>
                  </div>
                  {cap && (
                    <span className="font-mono text-amber-400 text-[11px] font-bold">
                      ₹{(cap.soldPrice || 0).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                {/* Vice-Captain Status Card */}
                <div
                  className={`rounded-xl p-4 border transition-all ${
                    hasVc
                      ? 'bg-slate-950/90 border-blue-500/30 shadow-inner'
                      : 'bg-slate-950/40 border-dashed border-slate-800'
                  }`}
                >
                  {vc ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={
                              vc.photo ||
                              'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=120&q=80'
                            }
                            alt={vc.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-blue-400 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=120&q=80';
                            }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-white text-sm truncate">{vc.name}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-blue-500 text-white">
                                ⭐ VC
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Grade <strong className="text-white">{vc.grade}</strong> • {vc.role}
                            </p>
                            <div className="text-[11px] font-mono text-blue-400 font-bold mt-1">
                              Cost: ₹{(vc.soldPrice || 0).toLocaleString('en-IN')} pts
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveViceCaptain(team)}
                          title="Remove Vice-Captain"
                          className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Inline Custom Vice-Captain Cost Deduct Controller */}
                      {costMode === 'custom' && (
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400 font-mono">VC Cost:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-blue-400 font-mono font-bold">₹</span>
                            <input
                              type="number"
                              min="0"
                              max={50000}
                              step="500"
                              value={teamCostInputs[team.id] ?? (vc.soldPrice ?? 0)}
                              onChange={(e) => setTeamCostInputs(prev => ({ ...prev, [team.id]: Number(e.target.value) || 0 }))}
                              className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white text-right focus:outline-none focus:border-blue-500 font-bold"
                            />
                            <button
                              onClick={() => {
                                const costToApply = teamCostInputs[team.id] ?? (vc.soldPrice ?? 0);
                                const res = allocateViceCaptainToTeam(team.id, vc.id, costToApply);
                                showToast(res.message, res.success ? 'success' : 'error');
                              }}
                              title="Deduct custom vice-captain price from team purse"
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black text-[11px] shadow transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                            >
                              <Save className="w-3 h-3" />
                              <span>Deduct</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-2 text-center">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 text-blue-400/80" />
                        No vice-captain assigned yet
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    hasVc
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md hover:shadow-blue-500/20'
                  }`}
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {hasVc ? 'Change VC' : 'Assign VC'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vice-Captain Selection Modal */}
      {selectedTeamForAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Star className="w-5 h-5 fill-current" />
                </span>
                <div>
                  <h3 className="font-bold text-lg text-white">
                    Select Vice-Captain for {selectedTeamForAssignment.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Combined Captain + VC budget cap is ₹50,000 points.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTeamForAssignment(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Leadership Budget Status Banner in Modal */}
            {(() => {
              const metrics = getTeamGradeMetrics(selectedTeamForAssignment);
              const maxAllowedVcCost = Math.max(0, 50000 - metrics.captainCost);

              return (
                <div className="my-3 p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Current Captain Cost:</span>
                    <span className="font-mono font-bold text-amber-400">₹{metrics.captainCost.toLocaleString('en-IN')} pts</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Max Allowed VC Price (₹50,000 cap):</span>
                    <span className="font-mono font-bold text-emerald-400">₹{maxAllowedVcCost.toLocaleString('en-IN')} pts</span>
                  </div>

                  {costMode === 'custom' && (
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">
                        Assign Price for Vice-Captain (₹):
                      </span>
                      <input
                        type="number"
                        min="0"
                        max={maxAllowedVcCost}
                        step="500"
                        value={vcCost}
                        onChange={(e) => setVcCost(Number(e.target.value) || 0)}
                        className="w-36 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono text-white text-right focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Search and Filters */}
            <div className="mt-2 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search player name or role..."
                  value={playerSearchQuery}
                  onChange={(e) => setPlayerSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500"
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
                  const isCurrentVc =
                    teamViceCaptainMap.get(selectedTeamForAssignment.id)?.id === player.id;

                  // Check if player is Captain anywhere
                  const isCaptainAnywhere = assignedCaptainIds.has(player.id);
                  const capTeam = isCaptainAnywhere
                    ? teams.find(t => t.captainPlayerId === player.id || player.captainOfTeamId === t.id)
                    : null;

                  // Check if player is VC of another team
                  const otherVcTeam = teams.find(
                    (t) =>
                      t.id !== selectedTeamForAssignment.id &&
                      (t.viceCaptainPlayerId === player.id || player.viceCaptainOfTeamId === t.id)
                  );

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
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-blue-400/20 text-blue-300 border border-blue-400/30">
                              Grade {player.grade || 'A'}
                            </span>
                            {isCaptainAnywhere && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                👑 Captain of {capTeam?.name || 'Franchise'} (Locked)
                              </span>
                            )}
                            {otherVcTeam && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                ⭐ VC of {otherVcTeam.name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {player.role} • {player.specialism || player.battingStyle || 'Cricket Player'}
                          </p>
                        </div>
                      </div>

                      <div>
                        {isCurrentVc ? (
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1.5 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Current VC
                            </span>
                            <button
                              onClick={() => handleConfirmAssignment(player)}
                              title="Update vice-captain price and deduct from team purse"
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow flex items-center gap-1 cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Save & Deduct (₹{vcCost.toLocaleString('en-IN')})</span>
                            </button>
                          </div>
                        ) : isCaptainAnywhere ? (
                          <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-500 text-xs font-medium">
                            Captain (Cannot Assign)
                          </span>
                        ) : (
                          <button
                            onClick={() => handleConfirmAssignment(player)}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow hover:shadow-blue-500/20 transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                          >
                            <span>Assign as VC</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
