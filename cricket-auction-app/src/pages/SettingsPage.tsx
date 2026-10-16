import React, { useState } from 'react';
import { useAuction } from '../context/AuctionContext';
import { exportStateAsJSON, loadStoredState } from '../utils/storage';
import { GradeBasePrices, GradeCategoryMaxBid, PlayerGrade } from '../types/auction';
import {
  Settings,
  Shield,
  Clock,
  Volume2,
  VolumeX,
  RotateCcw,
  Trash2,
  Download,
  Upload,
  Save,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Tag,
  Crown,
  Layers,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    rules,
    updateRules,
    tournament,
    updateTournament,
    resetToDemoData,
    clearAllData,
    importBackupJSON,
    syncGradeBasePricesToPlayers,
  } = useAuction();

  // Tournament info state
  const [name, setName] = useState(tournament.name);
  const [season, setSeason] = useState(tournament.season);
  const [organizer, setOrganizer] = useState(tournament.organizer);
  const [venue, setVenue] = useState(tournament.venue || '');

  // Rules state
  const [startingBudget, setStartingBudget] = useState(rules.startingBudget);
  const [minBidIncrement, setMinBidIncrement] = useState(rules.minBidIncrement);
  const [timerDuration, setTimerDuration] = useState(rules.timerDuration);
  const [autoSellOnTimer, setAutoSellOnTimer] = useState(rules.autoSellOnTimer);
  const [soundEnabled, setSoundEnabled] = useState(rules.soundEnabled);
  const [animationsEnabled, setAnimationsEnabled] = useState(rules.animationsEnabled);

  // Squad Rules state
  const [minSquadSize, setMinSquadSize] = useState(rules.squadRules.minSquadSize || 9);
  const [maxSquadSize, setMaxSquadSize] = useState(rules.squadRules.maxSquadSize || 15);
  const [maxGradeAPlus, setMaxGradeAPlus] = useState(rules.squadRules.maxGradeAPlus || 1);
  const [maxGradeA, setMaxGradeA] = useState(rules.squadRules.maxGradeA || 5);
  const [maxGradeB, setMaxGradeB] = useState(rules.squadRules.maxGradeB || 8);
  const [maxGradeC, setMaxGradeC] = useState(rules.squadRules.maxGradeC || 15);

  // Dedicated Grade Base Prices state
  const [gradeAPlusBasePrice, setGradeAPlusBasePrice] = useState(
    rules.gradeBasePrices?.gradeAPlus ?? 7000
  );
  const [gradeABasePrice, setGradeABasePrice] = useState(
    rules.gradeBasePrices?.gradeA === 5100 ? 5000 : (rules.gradeBasePrices?.gradeA ?? 5000)
  );
  const [gradeBBasePrice, setGradeBBasePrice] = useState(
    rules.gradeBasePrices?.gradeB === 3100 ? 3000 : (rules.gradeBasePrices?.gradeB ?? 3000)
  );
  const [gradeCBasePrice, setGradeCBasePrice] = useState(
    rules.gradeBasePrices?.gradeC === 1100 ? 1000 : (rules.gradeBasePrices?.gradeC ?? 1000)
  );

  // Grade-Based Maximum Bidding Limits by Player Category (Requirement Part 2.9)
  const defaultCategoryBids: GradeCategoryMaxBid[] = [
    { grade: 'A+', category: 'Mens', maxBid: 25000 },
    { grade: 'A', category: 'Mens', maxBid: 18000 },
    { grade: 'B', category: 'Mens', maxBid: 10000 },
    { grade: 'C', category: 'Mens', maxBid: 5000 },
    { grade: 'A+', category: 'Boys', maxBid: 15000 },
    { grade: 'A', category: 'Boys', maxBid: 10000 },
    { grade: 'B', category: 'Boys', maxBid: 6000 },
    { grade: 'C', category: 'Boys', maxBid: 3000 },
    { grade: 'A+', category: 'Womens', maxBid: 15000 },
    { grade: 'A', category: 'Womens', maxBid: 10000 },
    { grade: 'B', category: 'Womens', maxBid: 6000 },
    { grade: 'C', category: 'Womens', maxBid: 3000 },
    { grade: 'A+', category: 'Girls', maxBid: 12000 },
    { grade: 'A', category: 'Girls', maxBid: 8000 },
    { grade: 'B', category: 'Girls', maxBid: 5000 },
    { grade: 'C', category: 'Girls', maxBid: 2500 },
  ];

  const [categoryMaxBids, setCategoryMaxBids] = useState<GradeCategoryMaxBid[]>(() => {
    return rules.gradeCategoryMaxBids && rules.gradeCategoryMaxBids.length > 0
      ? rules.gradeCategoryMaxBids
      : defaultCategoryBids;
  });

  const updateMaxBidCell = (grade: PlayerGrade, category: string, value: number) => {
    setCategoryMaxBids(prev => {
      const idx = prev.findIndex(item => item.grade === grade && item.category.toLowerCase() === category.toLowerCase());
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { grade, category, maxBid: value };
        return copy;
      }
      return [...prev, { grade, category, maxBid: value }];
    });
  };

  const getCellMaxBid = (grade: PlayerGrade, category: string): number => {
    const item = categoryMaxBids.find(i => i.grade === grade && i.category.toLowerCase() === category.toLowerCase());
    return item ? item.maxBid : 0;
  };

  const [syncToUpcomingPlayers, setSyncToUpcomingPlayers] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();

    updateTournament({
      name: name.trim(),
      season: season.trim(),
      organizer: organizer.trim(),
      venue: venue.trim() || undefined,
    });

    const newGradePrices: GradeBasePrices = {
      gradeAPlus: Number(gradeAPlusBasePrice),
      gradeA: Number(gradeABasePrice),
      gradeB: Number(gradeBBasePrice),
      gradeC: Number(gradeCBasePrice),
    };

    updateRules({
      ...rules,
      startingBudget: Number(startingBudget),
      minBidIncrement: Number(minBidIncrement),
      timerDuration: Number(timerDuration),
      autoSellOnTimer,
      soundEnabled,
      animationsEnabled,
      gradeBasePrices: newGradePrices,
      gradeCategoryMaxBids: categoryMaxBids,
      squadRules: {
        ...rules.squadRules,
        minSquadSize: Number(minSquadSize),
        maxSquadSize: Number(maxSquadSize),
        maxGradeAPlus: Number(maxGradeAPlus),
        maxGradeA: Number(maxGradeA),
        maxGradeB: Number(maxGradeB),
        maxGradeC: Number(maxGradeC),
      },
    });

    if (syncToUpcomingPlayers) {
      syncGradeBasePricesToPlayers(newGradePrices);
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleManualSyncPrices = () => {
    const newGradePrices: GradeBasePrices = {
      gradeAPlus: Number(gradeAPlusBasePrice),
      gradeA: Number(gradeABasePrice),
      gradeB: Number(gradeBBasePrice),
      gradeC: Number(gradeCBasePrice),
    };
    syncGradeBasePricesToPlayers(newGradePrices);
    setSyncSuccessMsg(`Successfully updated all upcoming players to Grade A+: ${gradeAPlusBasePrice}, Grade A: ${gradeABasePrice}, Grade B: ${gradeBBasePrice}, Grade C: ${gradeCBasePrice} pts!`);
    setTimeout(() => setSyncSuccessMsg(null), 3500);
  };

  const handleResetToDefaultPrices = () => {
    setGradeAPlusBasePrice(7000);
    setGradeABasePrice(5000);
    setGradeBBasePrice(3000);
    setGradeCBasePrice(1000);
    syncGradeBasePricesToPlayers({ gradeAPlus: 7000, gradeA: 5000, gradeB: 3000, gradeC: 1000 });
    setSyncSuccessMsg('Reset and synced all base prices to Grade A+: 7000, Grade A: 5000, Grade B: 3000, Grade C: 1000 pts!');
    setTimeout(() => setSyncSuccessMsg(null), 3500);
  };

  const handleBackupExport = () => {
    const currentState = loadStoredState();
    exportStateAsJSON(currentState);
  };

  const handleBackupImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const success = importBackupJSON(content);
        if (success) {
          alert('Tournament state successfully restored from JSON backup file!');
        } else {
          alert('Invalid backup file format.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-amber-400" />
            <span>Tournament & Auction Rules Settings</span>
          </h1>
          <p className="text-xs text-slate-400">
            Configure starting point budgets, bid increments, timer limits, squad quotas, sound, and system data backups.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Tournament rules & configurations updated successfully!</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Tournament Branding */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
            <span>Tournament Identity</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-400">Tournament Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-semibold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-400">Season / Year</label>
              <input
                type="text"
                value={season}
                onChange={e => setSeason(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-400">Organizer / Host Committee</label>
              <input
                type="text"
                value={organizer}
                onChange={e => setOrganizer(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-400">Venue / Stadium</label>
              <input
                type="text"
                value={venue}
                onChange={e => setVenue(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Auction Mechanics & Points Rules */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
            Auction Mechanics & Point Budgets
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-slate-400">Starting Purse Per Team (pts)</label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={startingBudget}
                onChange={e => setStartingBudget(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-amber-400 font-bold font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-400">Default Bid Increment (pts)</label>
              <input
                type="number"
                min="100"
                step="100"
                value={minBidIncrement}
                onChange={e => setMinBidIncrement(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-400">Auction Timer Duration (seconds)</label>
              <input
                type="number"
                min="5"
                max="60"
                value={timerDuration}
                onChange={e => setTimerDuration(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-6 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={e => setSoundEnabled(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-amber-500"
              />
              <span className="text-slate-200">Synthesized Web Audio Sound Effects (Gavel, Beeps, Fanfare)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={animationsEnabled}
                onChange={e => setAnimationsEnabled(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-amber-500"
              />
              <span className="text-slate-200">Celebration Confetti on Sold</span>
            </label>
          </div>
        </div>

        {/* Section 3: Dedicated Grade Base Prices */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>Dedicated Grade Base Prices (Points)</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-mono bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
              Auto-applied on Excel import & AI player grading
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Set the default starting auction base prices for each player grade. These prices will automatically apply when AI categorizes players or when importing Excel rosters without specified base prices.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            {/* Grade A+ */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-purple-500/40">
              <div className="flex items-center justify-between mb-2 font-sans">
                <span className="font-bold text-purple-300 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  Grade A+ (Captains / Marquee)
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">Tier A+</span>
              </div>
              <label className="text-slate-400 font-sans block text-[11px] mb-1">Base Price (points)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={gradeAPlusBasePrice}
                  onChange={e => setGradeAPlusBasePrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-purple-500/40 rounded-lg text-purple-300 font-bold text-sm focus:outline-none focus:border-purple-400"
                />
              </div>
              <span className="text-[10px] text-slate-500 font-sans mt-1 block">Default: 7000 points</span>
            </div>

            {/* Grade A */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-amber-500/30">
              <div className="flex items-center justify-between mb-2 font-sans">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  Grade A (Stars / VC)
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">Tier A</span>
              </div>
              <label className="text-slate-400 font-sans block text-[11px] mb-1">Base Price (points)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={gradeABasePrice}
                  onChange={e => setGradeABasePrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-amber-500/40 rounded-lg text-amber-400 font-bold text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
              <span className="text-[10px] text-slate-500 font-sans mt-1 block">Default: 5000 points</span>
            </div>

            {/* Grade B */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-blue-500/30">
              <div className="flex items-center justify-between mb-2 font-sans">
                <span className="font-bold text-blue-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-400" />
                  Grade B (Experienced)
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">Tier B</span>
              </div>
              <label className="text-slate-400 font-sans block text-[11px] mb-1">Base Price (points)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={gradeBBasePrice}
                  onChange={e => setGradeBBasePrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-blue-500/40 rounded-lg text-blue-400 font-bold text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              <span className="text-[10px] text-slate-500 font-sans mt-1 block">Default: 3000 points</span>
            </div>

            {/* Grade C */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-emerald-500/30">
              <div className="flex items-center justify-between mb-2 font-sans">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-400" />
                  Grade C (Regular)
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">Tier C</span>
              </div>
              <label className="text-slate-400 font-sans block text-[11px] mb-1">Base Price (points)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={gradeCBasePrice}
                  onChange={e => setGradeCBasePrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-emerald-500/40 rounded-lg text-emerald-400 font-bold text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>
              <span className="text-[10px] text-slate-500 font-sans mt-1 block">Default: 1000 points</span>
            </div>
          </div>

          {/* Quick Actions & Sync Controls */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800/80">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
              <input
                type="checkbox"
                checked={syncToUpcomingPlayers}
                onChange={e => setSyncToUpcomingPlayers(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-amber-500"
              />
              <span className="text-slate-300">Automatically sync base prices to all upcoming players when saving</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetToDefaultPrices}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Reset to Standard (7000 / 5000 / 3000 / 1000)
              </button>
              <button
                type="button"
                onClick={handleManualSyncPrices}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow cursor-pointer"
              >
                Sync to Upcoming Players Now
              </button>
            </div>
          </div>

          {syncSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{syncSuccessMsg}</span>
            </div>
          )}
        </div>

        {/* Section 4: Squad Quotas & Grade Restrictions */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
            Squad Rules & Grade Limits
          </h2>
          <p className="text-xs text-slate-400">
            Teams have flexible squad composition (unrestricted distribution of Batsmen, Bowlers, and Wicketkeepers). Configure squad size bounds and marquee grade caps below.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs font-mono">
            <div>
              <label className="text-slate-400 font-sans">Min Squad Size</label>
              <input
                type="number"
                min="1"
                max="25"
                value={minSquadSize}
                onChange={e => setMinSquadSize(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold"
              />
            </div>

            <div>
              <label className="text-slate-400 font-sans">Max Squad Size</label>
              <input
                type="number"
                min="1"
                max="25"
                value={maxSquadSize}
                onChange={e => setMaxSquadSize(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold"
              />
            </div>

            <div>
              <label className="text-slate-400 font-sans">Max Grade A+ (Captains)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={maxGradeAPlus}
                onChange={e => setMaxGradeAPlus(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-purple-300 font-bold"
              />
            </div>

            <div>
              <label className="text-slate-400 font-sans">Max Grade A</label>
              <input
                type="number"
                min="1"
                max="10"
                value={maxGradeA}
                onChange={e => setMaxGradeA(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-amber-300 font-bold"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Grade-Based Maximum Bidding Limits by Player Category (Requirement Part 2.9) */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-400" />
              <span>Grade-Based Maximum Bidding Limits by Player Category</span>
            </h2>
            <span className="text-[11px] text-orange-400 font-mono bg-orange-500/10 border border-orange-500/30 px-2.5 py-1 rounded-md">
              Enforced during Live Auction & Direct Sells
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Configure the maximum allowable bid cap for each combination of player grade and category. If a franchise tries to bid higher than this limit, the system will automatically block the bid and notify the auctioneer.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-bold font-sans">Category</th>
                  <th className="py-2.5 px-3 font-bold text-center text-purple-300">Grade A+ (Max Cap ₹)</th>
                  <th className="py-2.5 px-3 font-bold text-center text-orange-300">Grade A (Max Cap ₹)</th>
                  <th className="py-2.5 px-3 font-bold text-center text-blue-300">Grade B (Max Cap ₹)</th>
                  <th className="py-2.5 px-3 font-bold text-center text-emerald-300">Grade C (Max Cap ₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {['Mens', 'Boys', 'Womens', 'Girls'].map((category) => (
                  <tr key={category} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-white text-xs">
                      {category}
                    </td>

                    {(['A+', 'A', 'B', 'C'] as PlayerGrade[]).map((grade) => (
                      <td key={grade} className="py-2 px-2 text-center">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={getCellMaxBid(grade, category)}
                          onChange={(e) => updateMaxBidCell(grade, category, Number(e.target.value) || 0)}
                          className="w-28 px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono text-white text-right focus:outline-none focus:border-orange-500"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Save Changes Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration Settings</span>
          </button>
        </div>
      </form>

      {/* Section 4: Data Management, Backups & Factory Reset */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
          State Persistence & Backups
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* JSON Export / Import */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-white">Full State Backup (.JSON)</div>
            <p className="text-[11px] text-slate-400">
              Download complete snapshot of teams, players, live bids, and transaction logs.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleBackupExport}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON Backup</span>
              </button>

              <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Restore JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleBackupImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Reset To Demo / Clear */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-rose-400">Database Reset Options</div>
            <p className="text-[11px] text-slate-400">
              Reload 10 pre-configured demo franchises & 40 players or clear the database.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Reset everything to official 10-team demo dataset?')) {
                    resetToDemoData();
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Demo Data</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('WARNING: Clear all players and transaction history?')) {
                    clearAllData();
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
