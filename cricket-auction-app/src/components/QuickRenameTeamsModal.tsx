import React, { useState, useEffect } from 'react';
import { Team } from '../types/auction';
import { X, Save, Shield, Edit3, Check } from 'lucide-react';

interface QuickRenameTeamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  onSaveAll: (updatedTeams: Team[]) => void;
}

export const QuickRenameTeamsModal: React.FC<QuickRenameTeamsModalProps> = ({
  isOpen,
  onClose,
  teams,
  onSaveAll,
}) => {
  const [editableTeams, setEditableTeams] = useState<Array<{ id: string; name: string; shortName: string; captain: string }>>([]);

  useEffect(() => {
    if (teams) {
      setEditableTeams(
        teams.map(t => ({
          id: t.id,
          name: t.name,
          shortName: t.shortName,
          captain: t.captain || '',
        }))
      );
    }
  }, [teams, isOpen]);

  if (!isOpen) return null;

  const handleNameChange = (id: string, newName: string) => {
    setEditableTeams(prev =>
      prev.map(t => (t.id === id ? { ...t, name: newName } : t))
    );
  };

  const handleCodeChange = (id: string, newCode: string) => {
    setEditableTeams(prev =>
      prev.map(t => (t.id === id ? { ...t, shortName: newCode.toUpperCase() } : t))
    );
  };

  const handleCaptainChange = (id: string, newCaptain: string) => {
    setEditableTeams(prev =>
      prev.map(t => (t.id === id ? { ...t, captain: newCaptain } : t))
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = teams.map(original => {
      const match = editableTeams.find(et => et.id === original.id);
      if (!match) return original;
      return {
        ...original,
        name: match.name.trim() || original.name,
        shortName: (match.shortName.trim() || original.shortName).toUpperCase(),
        captain: match.captain.trim() || original.captain,
      };
    });

    onSaveAll(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Quick Rename 10 Franchise Teams</h2>
              <p className="text-xs text-slate-400">
                Easily update tournament franchise names, short codes, and captains in one place.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Table Form */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4">
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">Franchise Name</th>
                  <th className="p-3 w-28">Short Code</th>
                  <th className="p-3">Captain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                {editableTeams.map((item, idx) => {
                  const original = teams.find(t => t.id === item.id);
                  return (
                    <tr key={item.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="p-3 text-center font-mono text-slate-500">
                        <span className="text-base">{original?.logo || '🏏'}</span>
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          required
                          value={item.name}
                          onChange={e => handleNameChange(item.id, e.target.value)}
                          placeholder="Team Name"
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-medium focus:outline-none focus:border-amber-500"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          required
                          maxLength={5}
                          value={item.shortName}
                          onChange={e => handleCodeChange(item.id, e.target.value)}
                          placeholder="CODE"
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-amber-300 font-mono font-bold uppercase focus:outline-none focus:border-amber-500 text-center"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={item.captain}
                          onChange={e => handleCaptainChange(item.id, e.target.value)}
                          placeholder="Captain Name (optional)"
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-amber-500"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono">
              All 10 teams will be updated across live auction, projector, and spectator screens.
            </span>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save All 10 Teams</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
