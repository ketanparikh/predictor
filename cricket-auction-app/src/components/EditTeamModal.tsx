import React, { useState, useEffect } from 'react';
import { Team } from '../types/auction';
import { X, Save, Shield, Palette, Sparkles, User, Briefcase, Tag } from 'lucide-react';

interface EditTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
  onSave: (updatedTeam: Team) => void;
}

const LOGO_PRESETS = [
  '⚡', '🦁', '👑', '⚔️', '🐅', '🛡️', '🦅', '🔱', '🌪️', '🔥',
  '🏏', '🏆', '💥', '🦈', '🐺', '🚀', '🌟', '🎯', '💎', '🐉'
];

const COLOR_PRESETS = [
  { name: 'Sky Blue', color: '#0284c7' },
  { name: 'Gold Yellow', color: '#eab308' },
  { name: 'Crimson Red', color: '#dc2626' },
  { name: 'Royal Purple', color: '#9333ea' },
  { name: 'Royal Blue', color: '#2563eb' },
  { name: 'Hot Pink', color: '#ec4899' },
  { name: 'Flame Orange', color: '#ea580c' },
  { name: 'Teal Navy', color: '#0f766e' },
  { name: 'Electric Cyan', color: '#06b6d4' },
  { name: 'Ruby Wine', color: '#e11d48' },
  { name: 'Emerald Green', color: '#059669' },
  { name: 'Amber Bronze', color: '#d97706' },
];

export const EditTeamModal: React.FC<EditTeamModalProps> = ({
  isOpen,
  onClose,
  team,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [captain, setCaptain] = useState('');
  const [owner, setOwner] = useState('');
  const [logo, setLogo] = useState('⚡');
  const [color, setColor] = useState('#0284c7');

  useEffect(() => {
    if (team) {
      setName(team.name);
      setShortName(team.shortName);
      setCaptain(team.captain || '');
      setOwner(team.owner || '');
      setLogo(team.logo || '⚡');
      setColor(team.color || '#0284c7');
    }
  }, [team]);

  if (!isOpen || !team) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Team name cannot be empty.');
      return;
    }

    onSave({
      ...team,
      name: name.trim(),
      shortName: (shortName.trim() || name.slice(0, 3)).toUpperCase(),
      captain: captain.trim() || undefined,
      owner: owner.trim() || undefined,
      logo,
      color,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with team color accent */}
        <div
          style={{ borderTopColor: color, borderTopWidth: '4px' }}
          className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 rounded-xl bg-slate-900 border border-slate-800 shadow-inner">
              {logo}
            </span>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                Edit Franchise Details
              </div>
              <h2 className="text-lg font-black text-white">{name || 'Edit Team'}</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Team Name & Short Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Team Name *</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Mumbai Strikers"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>Short Code *</span>
              </label>
              <input
                type="text"
                required
                maxLength={5}
                value={shortName}
                onChange={e => setShortName(e.target.value.toUpperCase())}
                placeholder="e.g. MS"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold uppercase focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Captain & Owner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Team Captain</span>
              </label>
              <input
                type="text"
                value={captain}
                onChange={e => setCaptain(e.target.value)}
                placeholder="e.g. Rohit Verma"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                <span>Franchise Owner / Manager</span>
              </label>
              <input
                type="text"
                value={owner}
                onChange={e => setOwner(e.target.value)}
                placeholder="e.g. Reliance Sports Ltd"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Logo Emoji Selector */}
          <div className="space-y-2">
            <label className="text-slate-300 font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span>Franchise Logo Emoji</span>
              </span>
              <span className="text-[11px] font-mono text-amber-400">Current: {logo}</span>
            </label>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 grid grid-cols-10 gap-2 text-center">
              {LOGO_PRESETS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setLogo(emoji)}
                  className={`text-xl p-1.5 rounded-lg transition-all ${
                    logo === emoji
                      ? 'bg-amber-500/20 border-2 border-amber-400 scale-110 shadow-lg'
                      : 'hover:bg-slate-800 opacity-80 hover:opacity-100'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Color Presets */}
          <div className="space-y-2">
            <label className="text-slate-300 font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-purple-400" />
                <span>Theme Brand Color</span>
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-6 h-6 rounded border-none cursor-pointer bg-transparent"
                />
                <span className="font-mono text-[11px] text-slate-400">{color}</span>
              </div>
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
              {COLOR_PRESETS.map(preset => (
                <button
                  key={preset.color}
                  type="button"
                  onClick={() => setColor(preset.color)}
                  title={preset.name}
                  style={{ backgroundColor: preset.color }}
                  className={`h-7 rounded-lg transition-all ${
                    color.toLowerCase() === preset.color.toLowerCase()
                      ? 'ring-2 ring-white scale-105 shadow-lg'
                      : 'opacity-75 hover:opacity-100 hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
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
              <span>Save Team Details</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
