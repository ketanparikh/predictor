import React from 'react';
import { useAuction } from '../context/AuctionContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { BarChart3, TrendingUp, Shield, Users, PieChart as PieIcon, Award } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { teams, players, transactions } = useAuction();

  // 1. Team Budget Spent vs Remaining Bar Chart Data
  const teamBudgetData = teams.map(t => ({
    name: t.shortName,
    fullName: t.name,
    spent: t.totalSpent,
    remaining: t.remainingBudget,
    squad: t.squad.length,
  }));

  // 2. Role Distribution Data
  const roleCounts: Record<string, number> = {
    Batsman: 0,
    Bowler: 0,
    Wicketkeeper: 0,
  };
  players.filter(p => p.status === 'sold').forEach(p => {
    roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
  });

  const rolePieData = Object.entries(roleCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const ROLE_COLORS = ['#f43f5e', '#6366f1', '#f59e0b'];

  // 3. Grade Spending Data
  const gradeSpending: Record<string, { total: number; count: number }> = {
    'A+': { total: 0, count: 0 },
    A: { total: 0, count: 0 },
    B: { total: 0, count: 0 },
    C: { total: 0, count: 0 },
  };
  players.filter(p => p.status === 'sold').forEach(p => {
    if (gradeSpending[p.grade]) {
      gradeSpending[p.grade].total += p.soldPrice || 0;
      gradeSpending[p.grade].count += 1;
    }
  });

  const gradeChartData = Object.entries(gradeSpending).map(([grade, data]) => ({
    grade: `Grade ${grade}`,
    totalSpent: data.total,
    avgPrice: data.count > 0 ? Math.round(data.total / data.count) : 0,
    count: data.count,
  }));

  // Summary figures
  const totalSold = players.filter(p => p.status === 'sold').length;
  const totalSpent = teams.reduce((acc, t) => acc + t.totalSpent, 0);
  const avgPlayerPrice = totalSold > 0 ? Math.round(totalSpent / totalSold) : 0;
  const topPurchase = transactions.length > 0
    ? [...transactions].sort((a, b) => b.soldPrice - a.soldPrice)[0]
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <BarChart3 className="w-6 h-6 text-amber-400" />
          <span>Tournament Analytics & Market Dynamics</span>
        </h1>
        <p className="text-xs text-slate-400">
          Visual financial breakdowns, role demand ratios, and franchise spending curves.
        </p>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400 font-mono">TOTAL TRANSACTIONS</div>
          <div className="text-2xl font-black font-mono text-white mt-1">{totalSold}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Players acquired across 10 teams</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400 font-mono">AVERAGE PLAYER PRICE</div>
          <div className="text-2xl font-black font-mono text-amber-400 mt-1">
            {avgPlayerPrice.toLocaleString()} <span className="text-xs text-slate-400 font-normal">pts</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Across all completed lots</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400 font-mono">TOTAL POINTS TRANSACTED</div>
          <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
            {totalSpent.toLocaleString()} <span className="text-xs text-slate-400 font-normal">pts</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Purse utilization across league</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400 font-mono">HIGHEST BID OF TOURNAMENT</div>
          <div className="text-2xl font-black font-mono text-sky-400 mt-1">
            {topPurchase ? `${topPurchase.soldPrice.toLocaleString()} pts` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400 truncate mt-0.5">
            {topPurchase ? `${topPurchase.playerName} (${topPurchase.teamName})` : 'Awaiting bids'}
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Team Spending vs Remaining Budget */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <h2 className="font-bold text-white text-sm">Franchise Purse Allocation (10 Teams)</h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Spent vs Remaining</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamBudgetData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="spent" name="Points Spent" fill="#eab308" radius={[4, 4, 0, 0]} />
                <Bar dataKey="remaining" name="Points Remaining" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Sold Player Role Distribution */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-sky-400" />
              <h2 className="font-bold text-white text-sm">Role Composition of Sold Players</h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Bat / Bowl / AR / WK</span>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            {totalSold === 0 ? (
              <div className="text-xs text-slate-500 font-mono">No players sold yet to render pie breakdown.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rolePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {rolePieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={ROLE_COLORS[index % ROLE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Grade Spending & Inflation Breakdown */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <h2 className="font-bold text-white text-sm">Player Grade Valuation & Spend Analysis</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {gradeChartData.map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{item.grade}</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400">
                  {item.count} Sold
                </span>
              </div>
              <div className="text-xl font-bold font-mono text-amber-400">
                {item.totalSpent.toLocaleString()} <span className="text-xs text-slate-400 font-normal">pts total</span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Avg Price: <span className="text-emerald-400 font-semibold">{item.avgPrice.toLocaleString()} pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
