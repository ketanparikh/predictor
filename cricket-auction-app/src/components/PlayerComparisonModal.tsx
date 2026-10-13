import React from 'react';
import { Player } from '../types/auction';
import { GradeBadge } from './GradeBadge';
import { RoleBadge } from './RoleBadge';
import { calculatePlayerRating } from '../utils/aiEngine';
import { X, Scale, Sparkles } from 'lucide-react';

interface PlayerComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  onRemovePlayer: (playerId: string) => void;
}

export const PlayerComparisonModal: React.FC<PlayerComparisonModalProps> = ({
  isOpen,
  onClose,
  players,
  onRemovePlayer,
}) => {
  if (!isOpen || players.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Player Head-to-Head Comparison</h2>
              <p className="text-xs text-slate-400">Comparing {players.length} tournament candidates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Table */}
        <div className="p-6 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="p-3 text-xs font-mono uppercase text-slate-400 w-44 bg-slate-950/40">
                  Metric
                </th>
                {players.map(p => (
                  <th key={p.id} className="p-3 text-center min-w-[200px]">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center justify-between w-full">
                        <GradeBadge grade={p.grade} size="sm" />
                        <button
                          onClick={() => onRemovePlayer(p.id)}
                          title="Remove from comparison"
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold overflow-hidden shadow">
                        {p.photo ? (
                          <img src={p.photo} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{p.name.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>

                      <div className="font-bold text-white text-sm">{p.name}</div>
                      <RoleBadge role={p.role} size="sm" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
              {/* Composite AI Rating */}
              <tr className="bg-amber-500/5">
                <td className="p-3 font-semibold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> AI Composite Rating
                </td>
                {players.map(p => {
                  const rating = calculatePlayerRating(p);
                  return (
                    <td key={p.id} className="p-3 text-center font-bold text-amber-400 text-sm">
                      {rating} / 100
                    </td>
                  );
                })}
              </tr>

              <tr>
                <td className="p-3 text-slate-400 font-medium">Base Price</td>
                {players.map(p => (
                  <td key={p.id} className="p-3 text-center font-bold text-white">
                    {p.basePrice.toLocaleString()} pts
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 text-slate-400 font-medium">Age & Experience</td>
                {players.map(p => (
                  <td key={p.id} className="p-3 text-center text-slate-200">
                    {p.age} yrs ({p.experience} yrs exp)
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 text-slate-400 font-medium">Primary Skill</td>
                {players.map(p => (
                  <td key={p.id} className="p-3 text-center text-amber-300 font-bold">
                    {p.role}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 text-slate-400 font-medium">Bowling Style</td>
                {players.map(p => (
                  <td key={p.id} className="p-3 text-center text-slate-300">
                    {p.bowlingStyle}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 text-slate-400 font-medium">Matches Played</td>
                {players.map(p => (
                  <td key={p.id} className="p-3 text-center font-semibold text-slate-200">
                    {p.stats.matches}
                  </td>
                ))}
              </tr>

              <tr className="bg-slate-950/30">
                <td className="p-3 text-amber-400 font-medium">Runs Scored</td>
                {players.map(p => (
                  <td key={p.id} className="p-3 text-center font-bold text-amber-300">
                    {p.stats.runs}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 text-slate-400 font-medium">Batting Average</td>
                {players.map(p => (
                  <td key={p.id} className="p-3 text-center font-semibold text-white">
                    {p.stats.average > 0 ? p.stats.average.toFixed(1) : '-'}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 text-slate-400 font-medium">Strike Rate</td>
                {players.map(p => (
                  <td key={p.id} className="p-3 text-center font-bold text-sky-400">
                    {p.stats.strikeRate > 0 ? p.stats.strikeRate.toFixed(1) : '-'}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 text-slate-400 font-medium">50s / 100s / HS</td>
                {players.map(p => (
                  <td key={p.id} className="p-3 text-center text-slate-300">
                    {p.stats.fifties} / {p.stats.hundreds} (HS: {p.stats.highestScore})
                  </td>
                ))}
              </tr>

              <tr className="bg-slate-950/30">
                <td className="p-3 text-emerald-400 font-medium">Wickets Taken</td>
                {players.map(p => (
                  <td key={p.id} className="p-3 text-center font-bold text-emerald-300">
                    {p.stats.wickets}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 text-slate-400 font-medium">Bowling Economy</td>
                {players.map(p => (
                  <td key={p.id} className="p-3 text-center text-slate-200">
                    {p.stats.economyRate > 0 ? `${p.stats.economyRate.toFixed(2)} RPO` : 'N/A'}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 text-slate-400 font-medium">Best Bowling</td>
                {players.map(p => (
                  <td key={p.id} className="p-3 text-center text-slate-300">
                    {p.stats.bestBowling || 'N/A'}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 text-slate-400 font-medium">Catches</td>
                {players.map(p => (
                  <td key={p.id} className="p-3 text-center text-slate-200">
                    {p.stats.catches}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 text-slate-400 font-medium">Scouting Summary</td>
                {players.map(p => (
                  <td key={p.id} className="p-3 text-center text-[11px] text-slate-400 font-sans italic">
                    {p.notes || p.previousPerformance || 'No additional scouting notes.'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
