import React from 'react';
import { ActiveNavTab } from '../types/auction';
import { useAuction } from '../context/AuctionContext';
import {
  LayoutDashboard,
  Gavel,
  Users,
  Shield,
  History,
  UserX,
  BarChart3,
  Bot,
  FileSpreadsheet,
  Settings,
  Trophy,
  X,
} from 'lucide-react';

interface SidebarProps {
  currentTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { players, teams, transactions } = useAuction();

  const totalPlayers = players.length;
  const soldPlayers = players.filter(p => p.status === 'sold').length;
  const unsoldPlayers = players.filter(p => p.status === 'unsold').length;
  const upcomingPlayers = players.filter(p => p.status === 'upcoming').length;

  const navItems: Array<{
    id: ActiveNavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'live_auction',
      label: 'Live Auction',
      icon: Gavel,
      badge: upcomingPlayers > 0 ? `${upcomingPlayers} Left` : 'Done',
      badgeColor: upcomingPlayers > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-400',
    },
    {
      id: 'players',
      label: 'Players Database',
      icon: Users,
      badge: totalPlayers,
      badgeColor: 'bg-slate-800 text-slate-300',
    },
    {
      id: 'teams',
      label: 'Teams (10)',
      icon: Shield,
      badge: teams.length,
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    },
    {
      id: 'history',
      label: 'Auction History',
      icon: History,
      badge: transactions.filter(t => !t.undone).length,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    },
    {
      id: 'unsold',
      label: 'Unsold Pool',
      icon: UserX,
      badge: unsoldPlayers > 0 ? unsoldPlayers : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'ai_assistant', label: 'AI Strategy Assistant', icon: Bot },
    { id: 'import_excel', label: 'Import Excel / CSV', icon: FileSpreadsheet },
    { id: 'settings', label: 'Admin Settings', icon: Settings },
    { id: 'complete', label: 'Final Result & Report', icon: Trophy },
  ];

  const handleSelect = (tab: ActiveNavTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-950/95 lg:bg-slate-950/80 backdrop-blur-xl border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header (Mobile close) */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-white text-sm">Navigation</span>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Overview Pill on Top */}
        <div className="p-4 pt-5 pb-3">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs">
            <div className="flex justify-between items-center text-slate-400 mb-1.5 font-mono">
              <span>AUCTION PROGRESS</span>
              <span className="font-bold text-amber-400">
                {totalPlayers > 0 ? Math.round((soldPlayers / totalPlayers) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${totalPlayers > 0 ? (soldPlayers / totalPlayers) * 100 : 0}%` }}
                className="bg-emerald-500 h-full transition-all duration-500"
              />
              <div
                style={{ width: `${totalPlayers > 0 ? (unsoldPlayers / totalPlayers) * 100 : 0}%` }}
                className="bg-rose-500 h-full transition-all duration-500"
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 font-mono">
              <span className="text-emerald-400">● {soldPlayers} Sold</span>
              <span className="text-rose-400">● {unsoldPlayers} Unsold</span>
              <span className="text-slate-400">● {upcomingPlayers} Pool</span>
            </div>
          </div>
        </div>

        {/* Navigation Items List */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/15 to-yellow-500/10 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/70 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                      item.badgeColor || 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/50">
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>IPL Auction Engine v2.0</span>
            <span className="text-emerald-400 flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
