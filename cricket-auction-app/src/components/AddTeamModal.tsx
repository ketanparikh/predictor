import React, { useState } from 'react';
import { useAuction } from '../context/AuctionContext';
import { X, Plus, Shield, Palette, Sparkles, User, Briefcase, Coins, Crown } from 'lucide-react';

interface AddTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (teamName: string) => void;
}

const LOGO_PRESETS = [
  '⚡', '🦁', '👑', '⚔️', '🐅', '🛡️', '🦅', '🔱', '🌪️', '🔥',
  '🏏', '🏆', '🎯', '🚀', '🐺', '💎', '🌟', '⚓', '💥', '🐉'
];

const COLOR_PRESETS = [
  { name: 'Sky Blue', color: '#0284c7', secondary: '#0369a1' },
  { name: 'Gold Yellow', color: '#eab308', secondary: '#ca8a04' },
  { name: 'Crimson Red', color: '#dc2626', secondary: '#991b1b' },
  { name: 'Royal Purple', color: '#9333ea', secondary: '#6b21a8' },
  { name: 'Royal Blue', color: '#2563eb', secondary: '#1d4ed8' },
  { name: 'Hot Pink', color: '#ec4899', secondary: '#be185d' },
  { name: 'Flame Orange', color: '#ea580c', secondary: '#c2410c' },
  { name: 'Teal Navy', color: '#0f766e', secondary: '#115e59' },
  { name: 'Electric Cyan', color: '#06b6d4', secondary: '#0891b2' },
  { name: 'Ruby Wine', color: '#e11d48', secondary: '#be123c' },
  { name: 'Emerald Green', color: '#059669', secondary: '#047857' },
  { name: 'Indigo Night', color: '#6366f1', secondary: '#4f46e5' },
];

export const AddTeamModal: React.FC<AddTeamModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addTeam, rules, teams } = useAuction();

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [captain, setCaptain] = useState('');
  const [owner, setOwner] = useState('');
  const [logo, setLogo] = useState('🏏');
  const [color, setColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#1d4ed8');
  const [startingBudget, setStartingBudget] = useState<number>(rules.startingBudget || 100000);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Franchise team name is required.');
      return;
    }

    const trimmedShort = (shortName.trim() || name.slice(0, 3)).toUpperCase();
    if (teams.some(t => t.name.toLowerCase() === name.trim().toLowerCase())) {
      setError(`A team named "${name.trim()}" already exists.`);
      return;
    }

    if (teams.some(t => t.shortName.toUpperCase() === trimmedShort)) {
      setError(`A team with short code "${trimmedShort}" already exists. Please choose a different short code.`);
      return;
    }

    const created = addTeam({
      name: name.trim(),
      shortName: trimmedShort,
      captain: captain.trim() || undefined,
      owner: owner.trim() || undefined,
      logo,
      color,
      secondaryColor,
      startingBudget: Number(startingBudget) > 0 ? Number(startingBudget) : (rules.startingBudget || 100000),
    });

    if (onSuccess) onSuccess(created.name);
    // Reset form
    setName('');
    setShortName('');
    setCaptain('');
    setOwner('');
    setLogo('🏏');
    setColor('#2563eb');
    setStartingBudget(rules.startingBudget || 100000);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Accent Bar & Header */}
        <div
          style={{ borderTopColor: color, borderTopWidth: '4px' }}
          className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 rounded-xl bg-slate-900 border border-slate-800 shadow-inner">
              {logo}
            </span>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Add New Franchise Team</span>
              </div>
              <h2 className="text-lg font-black text-white">{name.trim() || 'New Franchise'}</h2>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 font-bold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Team Name */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Team Name *</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  if (!shortName || shortName === name.slice(0, 3).toUpperCase()) {
                    setShortName(e.target.value.slice(0, 3).toUpperCase());
                  }
                  setError(null);
                }}
                placeholder="e.g. Pune Warriors Prime"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Short Code */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono font-bold text-slate-300 uppercase">
                Short Code (2-4 char)
              </label>
              <input
                type="text"
                maxLength={5}
                value={shortName}
                onChange={e => setShortName(e.target.value.toUpperCase())}
                placeholder="e.g. PWP"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-amber-400 font-mono font-bold uppercase focus:outline-none focus:border-amber-500 text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Captain Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Captain Name</span>
              </label>
              <input
                type="text"
                value={captain}
                onChange={e => setCaptain(e.target.value)}
                placeholder="e.g. Ajinkya Rao"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Franchise Owner */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>Franchise Owner</span>
              </label>
              <input
                type="text"
                value={owner}
                onChange={e => setOwner(e.target.value)}
                placeholder="e.g. Sahara Sports Venture"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Starting Purse */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              <span>Starting Budget (Points Purse)</span>
            </label>
            <input
              type="number"
              min={1000}
              step={500}
              value={startingBudget}
              onChange={e => setStartingBudget(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-mono font-bold focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Logo / Emoji Picker */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Team Icon / Logo Emoji</span>
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950 border border-slate-800 rounded-xl max-h-24 overflow-y-auto">
              {LOGO_PRESETS.map(icon => (
                <button
                  type="button"
                  key={icon}
                  onClick={() => setLogo(icon)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-transform ${
                    logo === icon
                      ? 'bg-amber-500 text-slate-950 scale-110 shadow-lg'
                      : 'hover:bg-slate-800'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color Presets */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>Primary Franchise Color</span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {COLOR_PRESETS.map(preset => (
                <button
                  type="button"
                  key={preset.color}
                  onClick={() => {
                    setColor(preset.color);
                    setSecondaryColor(preset.secondary);
                  }}
                  className={`p-1.5 rounded-xl border flex items-center gap-1.5 transition-all text-[10px] ${
                    color === preset.color
                      ? 'border-white bg-slate-800 text-white font-bold ring-1 ring-white'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: preset.color }}
                  />
                  <span className="truncate">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Franchise Team</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
