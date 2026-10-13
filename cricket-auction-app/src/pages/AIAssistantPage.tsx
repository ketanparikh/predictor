import React from 'react';
import { useAuction } from '../context/AuctionContext';
import { generateTournamentAIAdvice } from '../utils/aiEngine';
import { GradeBadge } from '../components/GradeBadge';
import { RoleBadge } from '../components/RoleBadge';
import { Bot, Sparkles, TrendingUp, AlertTriangle, ShieldCheck, ShieldAlert, Zap, Target } from 'lucide-react';

export const AIAssistantPage: React.FC = () => {
  const { teams, players } = useAuction();

  const { marketInsights, teamStrategies } = generateTournamentAIAdvice(teams, players);
  const remainingPlayers = players.filter(p => p.status === 'upcoming' || p.status === 'unsold');

  // Top remaining marquee targets
  const topTargets = [...remainingPlayers]
    .sort((a, b) => b.basePrice - a.basePrice)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Bot className="w-6 h-6 text-amber-400" />
            <span>AI Auction Strategy & Market Intelligence Assistant</span>
          </h1>
          <p className="text-xs text-slate-400">
            Real-time algorithmic advisory on franchise roster deficits, bidding runway, and marquee value steals.
          </p>
        </div>
      </div>

      {/* Market Dynamic Scarcity Insights */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 space-y-3 shadow-xl">
        <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
          <Sparkles className="w-4 h-4" />
          <span>Real-Time Market Dynamic Signals</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {marketInsights.map((insight, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 text-xs text-slate-200 flex items-start gap-2.5"
            >
              <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>{insight}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Team Strategy Audit & High Value Targets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Franchise Squad Deficit & Strategy Audits */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-sky-400" />
              <span>10 Franchise Roster Needs & Spending Diagnostics</span>
            </h2>
            <span className="text-xs font-mono text-slate-500">Auto-Evaluated</span>
          </div>

          <div className="space-y-3">
            {teamStrategies.map(strat => {
              const teamObj = teams.find(t => t.id === strat.teamId);
              return (
                <div
                  key={strat.teamId}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{teamObj?.logo}</span>
                      <div>
                        <h3 className="font-bold text-white text-sm">{strat.teamName}</h3>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Safety Margin: ~{strat.budgetSafetyMargin.toLocaleString()} pts / remaining slot
                        </div>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                      strat.spendingStatus === 'Thrifty'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                        : strat.spendingStatus === 'Aggressive'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                        : strat.spendingStatus === 'Exhausted'
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                        : 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                    }`}>
                      {strat.spendingStatus} Spending
                    </span>
                  </div>

                  {/* Urgent Needs Tags */}
                  {strat.urgentNeeds.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] uppercase font-mono text-rose-400 font-bold">URGENT NEEDS:</span>
                      {strat.urgentNeeds.map((need, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-mono">
                          ⚠ {need}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-emerald-400 flex items-center gap-1.5 font-mono pt-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Roster requirements currently well balanced.</span>
                    </div>
                  )}

                  {/* Tactical Recommendation */}
                  {strat.recommendations.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 space-y-1">
                      {strat.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-amber-400 font-bold">💡</span>
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 4 Cols: Top Remaining Marquee Targets */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              <span>High-Value Targets</span>
            </h2>
            <span className="text-xs font-mono text-amber-400">{remainingPlayers.length} in Pool</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            {topTargets.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-6">No remaining players in pool.</div>
            ) : (
              topTargets.map((player, idx) => (
                <div
                  key={player.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GradeBadge grade={player.grade} size="sm" />
                      <RoleBadge role={player.role} size="sm" />
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {player.basePrice.toLocaleString()} pts
                    </span>
                  </div>

                  <div className="font-bold text-white text-xs">{player.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {player.stats.runs > 0 && `${player.stats.runs} Runs `}
                    {player.stats.wickets > 0 && `• ${player.stats.wickets} Wickets `}
                    {player.stats.average > 0 && `• ${player.stats.average.toFixed(1)} Avg`}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
