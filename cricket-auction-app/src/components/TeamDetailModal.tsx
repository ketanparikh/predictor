import React, { useState } from 'react';
import { Team, Player } from '../types/auction';
import { GradeBadge } from './GradeBadge';
import { RoleBadge } from './RoleBadge';
import { X, Shield, Users, DollarSign, Trash2, Edit2, Check, RefreshCw, UserMinus } from 'lucide-react';

interface TeamDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
  allPlayers: Player[];
  onUpdateTeam: (team: Team) => void;
  onResetBudget: (teamId: string) => void;
  onRemovePlayerFromSquad: (teamId: string, playerId: string) => void;
}

export const TeamDetailModal: React.FC<TeamDetailModalProps> = ({
  isOpen,
  onClose,
  team,
  allPlayers,
  onUpdateTeam,
  onResetBudget,
  onRemovePlayerFromSquad,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [owner, setOwner] = useState('');
  const [captain, setCaptain] = useState('');
  const [color, setColor] = useState('');

  if (!isOpen || !team) return null;

  const squadPlayers = allPlayers.filter(p => team.squad.includes(p.id));
  const batsmen = squadPlayers.filter(p => p.role === 'Batsman');
  const bowlers = squadPlayers.filter(p => p.role === 'Bowler');
  const wicketkeepers = squadPlayers.filter(p => p.role === 'Wicketkeeper');
  const sponsoredPlayer = squadPlayers.find(p => p.isSponsored || (p.sponsorTag && p.sponsorTag.trim()));

  const gradeAPlusCount = squadPlayers.filter(p => p.grade === 'A+').length;
  const gradeACount = squadPlayers.filter(p => p.grade === 'A').length;
  const gradeBCount = squadPlayers.filter(p => p.grade === 'B').length;
  const gradeCCount = squadPlayers.filter(p => p.grade === 'C').length;

  const highestPurchase = squadPlayers.length > 0
    ? Math.max(...squadPlayers.map(p => p.soldPrice || 0))
    : 0;
  const lowestPurchase = squadPlayers.length > 0
    ? Math.min(...squadPlayers.map(p => p.soldPrice || 0))
    : 0;
  const avgPurchase = squadPlayers.length > 0
    ? Math.round(team.totalSpent / squadPlayers.length)
    : 0;

  const startEdit = () => {
    setName(team.name);
    setShortName(team.shortName);
    setOwner(team.owner || '');
    setCaptain(team.captain || '');
    setColor(team.color || '#3b82f6');
    setIsEditing(true);
  };

  const saveEdit = () => {
    onUpdateTeam({
      ...team,
      name: name.trim() || team.name,
      shortName: shortName.trim() || team.shortName,
      owner: owner.trim() || undefined,
      captain: captain.trim() || undefined,
      color: color || team.color,
    });
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div
          style={{ borderTopColor: team.color }}
          className="px-6 py-4 border-b border-t-4 border-slate-800 bg-slate-950/70 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">{team.logo}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{team.name}</h2>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-xs font-mono font-bold text-slate-300">
                  {team.shortName}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Owner: {team.owner || 'Franchise Board'} • Captain: {team.captain || 'TBD'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={startEdit}
                className="p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs flex items-center gap-1"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Team</span>
              </button>
            ) : (
              <button
                onClick={saveEdit}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Edit Form */}
          {isEditing && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-slate-400">Team Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Short Code</label>
                <input
                  type="text"
                  value={shortName}
                  onChange={e => setShortName(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Owner / Manager</label>
                <input
                  type="text"
                  value={owner}
                  onChange={e => setOwner(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Team Color</label>
                <div className="flex gap-2 items-center mt-1">
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="w-8 h-8 rounded border-none bg-transparent cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-300">{color}</span>
                </div>
              </div>
            </div>
          )}

          {/* Budget & Squad Financial Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-xs text-slate-400 font-mono">REMAINING BUDGET</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {team.remainingBudget.toLocaleString()} <span className="text-xs text-slate-400 font-normal">pts</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  style={{ width: `${(team.remainingBudget / team.startingBudget) * 100}%` }}
                  className="bg-emerald-500 h-full"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-xs text-slate-400 font-mono">TOTAL SPENT</div>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                {team.totalSpent.toLocaleString()} <span className="text-xs text-slate-400 font-normal">pts</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                {Math.round((team.totalSpent / team.startingBudget) * 100)}% of starting purse
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-xs text-slate-400 font-mono">SQUAD SIZE (MAX 9)</div>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {squadPlayers.length} <span className="text-xs text-slate-400 font-normal">/ 9 players</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                A:{gradeACount} • B:{gradeBCount} • C:{gradeCCount}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-xs text-slate-400 font-mono">AVG PRICE / PLAYER</div>
              <div className="text-xl font-bold font-mono text-sky-400 mt-1">
                {avgPurchase.toLocaleString()} <span className="text-xs text-slate-400 font-normal">pts</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                Max: {highestPurchase.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Squad Balance & Roles */}
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-mono text-slate-400">
              <Users className="w-4 h-4 text-amber-400" />
              <span>SQUAD COMPOSITION:</span>
            </div>
            <div className="flex items-center gap-3 font-mono font-bold">
              <span className="text-rose-300">
                🏏 Batsmen: {batsmen.length}
              </span>
              <span className="text-indigo-300">
                🎯 Bowlers: {bowlers.length}
              </span>
              <span className="text-amber-300">
                🧤 WKs: {wicketkeepers.length}
              </span>
              <span className={sponsoredPlayer ? 'text-emerald-400' : 'text-slate-500'}>
                🏷️ Sponsor: {sponsoredPlayer ? (sponsoredPlayer.sponsorTag || 'Sponsored') : 'None (Max 1)'}
              </span>
            </div>
          </div>

          {/* Squad Roster Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-sm">Squad Roster ({squadPlayers.length} Players)</h3>
              <button
                onClick={() => {
                  if (window.confirm(`Reset entire squad and budget for ${team.name}?`)) {
                    onResetBudget(team.id);
                  }
                }}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-mono"
              >
                <RefreshCw className="w-3 h-3" /> Reset Team Budget & Squad
              </button>
            </div>

            {squadPlayers.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 text-center text-slate-500 text-xs">
                No players purchased yet for this team.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">Player</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Grade</th>
                      <th className="p-3">Sold Price</th>
                      <th className="p-3">Runs / Wkts</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                    {squadPlayers.map(p => (
                      <tr key={p.id} className="hover:bg-slate-800/50">
                        <td className="p-3 font-semibold text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 overflow-hidden">
                            {p.photo ? (
                              <img src={p.photo} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              p.name.slice(0, 1)
                            )}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{p.name}</span>
                              {p.isCaptain && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">👑 Captain</span>}
                              {p.isViceCaptain && <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono font-bold">⭐ VC</span>}
                              {(p.isSponsored || p.sponsorTag) && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                                  🏷️ {p.sponsorTag || 'Sponsored'}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3"><RoleBadge role={p.role} size="sm" /></td>
                        <td className="p-3"><GradeBadge grade={p.grade} size="sm" /></td>
                        <td className="p-3 font-mono font-bold text-amber-400">
                          {p.soldPrice?.toLocaleString()} pts
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {p.stats.runs} R / {p.stats.wickets} W
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              if (window.confirm(`Release ${p.name} from ${team.name}? Refund: ${p.soldPrice?.toLocaleString()} pts.`)) {
                                onRemovePlayerFromSquad(team.id, p.id);
                              }
                            }}
                            title="Release player & refund budget"
                            className="p-1.5 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
