import React from 'react';
import { useAuction } from '../context/AuctionContext';
import { ActiveNavTab } from '../types/auction';
import { Tv, QrCode, Volume2, VolumeX, Menu, Award, Trophy, Radio } from 'lucide-react';

interface NavbarProps {
  currentTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  onOpenProjector: () => void;
  onOpenQRCode: () => void;
  onToggleMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSelectTab,
  onOpenProjector,
  onOpenQRCode,
  onToggleMobileMenu,
}) => {

  const { tournament, currentPlayer, rules, updateRules, players, teams } = useAuction();

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 lg:px-6 py-3 flex items-center justify-between">
      {/* Left: Branding & Mobile Menu */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-orange-500/20">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-white text-base tracking-tight truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                {tournament.name}
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
                {tournament.season}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 truncate max-w-[250px] hidden md:block">
              {tournament.organizer} • {teams.length} Teams Auction Studio
            </div>
          </div>
        </div>
      </div>

      {/* Center: Live Auction Block Status Indicator */}
      <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
        {currentPlayer ? (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
            </span>
            <span className="text-slate-400 font-mono">ON BLOCK:</span>
            <span className="font-bold text-orange-300">{currentPlayer.name}</span>
            <span className="text-slate-500">({currentPlayer.role})</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400">
            <Radio className="w-3.5 h-3.5 text-slate-500" />
            <span>Auction Standby • Select a player to begin</span>
          </div>
        )}
      </div>

      {/* Right: Quick Action Controls */}
      <div className="flex items-center gap-2">
        {/* Player Pool Counter Pill */}
        <button
          onClick={() => onSelectTab('players')}
          title="View Tournament Players Database"
          className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-mono font-bold"
        >
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span>{players.length} Players</span>
        </button>


        {/* Projector Mode Launch */}
        <button
          onClick={onOpenProjector}
          title="Launch Projector / TV Big Screen Mode"
          className="px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
        >
          <Tv className="w-4 h-4" />
          <span className="hidden xs:inline">Projector View</span>
        </button>
      </div>
    </header>
  );
};
