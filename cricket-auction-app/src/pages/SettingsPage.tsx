import React, { useState } from 'react';
import { useAuction } from '../context/AuctionContext';
import { exportStateAsJSON, loadStoredState } from '../utils/storage';
import { GradeBasePrices, PlayerGrade } from '../types/auction';
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
  History,
  RefreshCcw,
  X,
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
    restartAuction,
    clearAuctionHistory,
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
  const [maxSquadSize, setMaxSquadSize] = useState(rules.squadRules.maxSquadSize || 9);
  const [maxGradeAPlus, setMaxGradeAPlus] = useState(rules.squadRules.maxGradeAPlus || 1);
  const [maxGradeA, setMaxGradeA] = useState(rules.squadRules.maxGradeA ?? 2);
  const [maxGradeB, setMaxGradeB] = useState(rules.squadRules.maxGradeB ?? 3);
  const [maxGradeC, setMaxGradeC] = useState(rules.squadRules.maxGradeC ?? 2);
  const [maxGradeASpending, setMaxGradeASpending] = useState(rules.squadRules.maxGradeASpending ?? 30000);
  const [maxGradeBSpending, setMaxGradeBSpending] = useState(rules.squadRules.maxGradeBSpending ?? 18000);
  const [maxCapVcSpending, setMaxCapVcSpending] = useState(rules.squadRules.maxCaptainViceCaptainSpending ?? 50000);

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

  const [syncToUpcomingPlayers, setSyncToUpcomingPlayers] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Restart Auction & Clear History Modal States
  const [isRestartModalOpen, setIsRestartModalOpen] = useState(false);
  const [isClearHistoryModalOpen, setIsClearHistoryModalOpen] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const handleConfirmRestart = async () => {
    setIsProcessingAction(true);
    try {
      const res = await restartAuction('Administrator');
      setIsRestartModalOpen(false);
      if (res.success) {
        setActionSuccessMsg('AUCTION SUCCESSFULLY RESTARTED');
        setTimeout(() => setActionSuccessMsg(null), 5000);
      }
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleConfirmClearHistory = async () => {
    setIsProcessingAction(true);
    try {
      const res = await clearAuctionHistory('Administrator');
      setIsClearHistoryModalOpen(false);
      if (res.success) {
        setActionSuccessMsg('AUCTION HISTORY SUCCESSFULLY CLEARED');
        setTimeout(() => setActionSuccessMsg(null), 5000);
      }
    } finally {
      setIsProcessingAction(false);
    }
  };

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
      squadRules: {
        ...rules.squadRules,
        minSquadSize: Number(minSquadSize),
        maxSquadSize: Number(maxSquadSize),
        maxGradeAPlus: Number(maxGradeAPlus),
        maxGradeA: Number(maxGradeA),
        maxGradeB: Number(maxGradeB),
        maxGradeC: Number(maxGradeC),
        maxGradeASpending: Number(maxGradeASpending),
        maxGradeBSpending: Number(maxGradeBSpending),
        maxCaptainViceCaptainSpending: Number(maxCapVcSpending),
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
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
              Squad Rules & Grade Restrictions
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Teams have a squad of 9 players. Grade limits apply strictly to auction-purchased players (Captains and Vice-Captains are excluded from these counts).
            </p>
          </div>

          {/* Squad Bounds & Leadership Combined Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs font-mono">
            <div>
              <label className="text-slate-400 font-sans font-bold">Min Squad Size</label>
              <input
                type="number"
                min="1"
                max="25"
                value={minSquadSize}
                onChange={e => setMinSquadSize(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold"
              />
              <span className="text-[10px] text-slate-500 font-sans">Official team squad target (9 players)</span>
            </div>

            <div>
              <label className="text-slate-400 font-sans font-bold">Max Squad Size</label>
              <input
                type="number"
                min="1"
                max="25"
                value={maxSquadSize}
                onChange={e => setMaxSquadSize(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold"
              />
              <span className="text-[10px] text-slate-500 font-sans">Hard maximum squad capacity (9 players)</span>
            </div>

            <div>
              <label className="text-indigo-400 font-sans font-bold">Captain + VC Max Budget</label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={maxCapVcSpending}
                onChange={e => setMaxCapVcSpending(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-indigo-500/30 rounded-lg text-indigo-300 font-bold"
              />
              <span className="text-[10px] text-slate-500 font-sans">Combined expenditure cap (50,000 pts)</span>
            </div>
          </div>

          {/* Grade-Wise Restrictions (Grade A, Grade B, Grade C) */}
          <div className="pt-3 border-t border-slate-800/80">
            <h3 className="text-xs font-bold text-slate-300 font-sans mb-3">Grade-Wise Player & Spending Restrictions:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs font-mono">
              {/* Grade A Restrictions */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 text-xs">Grade A Restrictions</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">Max 2</span>
                </div>
                <div>
                  <label className="text-slate-400 font-sans text-[11px] block">Max Grade A Players</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={maxGradeA}
                    onChange={e => setMaxGradeA(Number(e.target.value))}
                    className="w-full mt-0.5 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-amber-300 font-bold"
                  />
                  <span className="text-[10px] text-slate-500 font-sans">Max 2 auction players per franchise</span>
                </div>
                <div>
                  <label className="text-slate-400 font-sans text-[11px] block">Max Grade A Budget (pts)</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={maxGradeASpending}
                    onChange={e => setMaxGradeASpending(Number(e.target.value))}
                    className="w-full mt-0.5 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-amber-300 font-bold"
                  />
                  <span className="text-[10px] text-slate-500 font-sans">Limit for both A players combined (30,000 pts)</span>
                </div>
              </div>

              {/* Grade B Restrictions */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-blue-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-400 text-xs">Grade B Restrictions</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300">Max 3</span>
                </div>
                <div>
                  <label className="text-slate-400 font-sans text-[11px] block">Max Grade B Players</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={maxGradeB}
                    onChange={e => setMaxGradeB(Number(e.target.value))}
                    className="w-full mt-0.5 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-blue-300 font-bold"
                  />
                  <span className="text-[10px] text-slate-500 font-sans">Max 3 auction players per franchise</span>
                </div>
                <div>
                  <label className="text-slate-400 font-sans text-[11px] block">Max Grade B Budget (pts)</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={maxGradeBSpending}
                    onChange={e => setMaxGradeBSpending(Number(e.target.value))}
                    className="w-full mt-0.5 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-blue-300 font-bold"
                  />
                  <span className="text-[10px] text-slate-500 font-sans">Limit for all 3 B players combined (18,000 pts)</span>
                </div>
              </div>

              {/* Grade C Restrictions */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 text-xs">Grade C Restrictions</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">Max 2</span>
                </div>
                <div>
                  <label className="text-slate-400 font-sans text-[11px] block">Max Grade C Players</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={maxGradeC}
                    onChange={e => setMaxGradeC(Number(e.target.value))}
                    className="w-full mt-0.5 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-emerald-300 font-bold"
                  />
                  <span className="text-[10px] text-slate-500 font-sans">Max 2 auction players per franchise</span>
                </div>
                <div>
                  <label className="text-slate-400 font-sans text-[11px] block">Budget Limit Rule</label>
                  <div className="mt-0.5 px-3 py-2 bg-slate-900/80 border border-slate-700/60 rounded-lg text-slate-300 text-[11px] font-sans">
                    Purse reserve rule (reserves min base price for remaining slots)
                  </div>
                  <span className="text-[10px] text-slate-500 font-sans">Standard franchise purse rules apply</span>
                </div>
              </div>
            </div>
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

      {/* Section 4: Auction Lifecycle & Administrator Controls */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <RefreshCcw className="w-4 h-4 text-orange-400" />
              <span>Auction Lifecycle & Administrative Operations</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Independent administrator tools to restart auction bidding or clear transaction history safely while preserving permanent player edits, team rosters, and Captain/Vice-Captain allotments.
            </p>
          </div>
        </div>

        {/* Global Action Success Banner */}
        {actionSuccessMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm font-black flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* 1. RESTART AUCTION CARD */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-orange-500/30 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wide">
                <span className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400">
                  <RotateCcw className="w-4 h-4" />
                </span>
                <span>Restart Auction</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                Returns all auction players back to the available pool and restores starting purse budgets.
              </p>
              <div className="mt-2 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                ✅ <strong>PRESERVED:</strong> Captain & Vice-Captain allotments, team branding, and manually edited player grades remain untouched.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsRestartModalOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RESTART AUCTION</span>
            </button>
          </div>

          {/* 2. CLEAR AUCTION HISTORY CARD */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-500/30 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wide">
                <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                  <History className="w-4 h-4" />
                </span>
                <span>Clear Auction History</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                Permanently removes historical auction transaction records and sales logs from the history view.
              </p>
              <div className="mt-2 text-[10px] text-purple-300 font-semibold bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                ℹ️ <strong>SEPARATE ACTION:</strong> Does not restart auction or remove player ownership or change current team budgets.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsClearHistoryModalOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <History className="w-4 h-4" />
              <span>CLEAR AUCTION HISTORY</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 5: Data Management, Backups & Factory Reset */}
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

      {/* CONFIRMATION MODAL: RESTART AUCTION */}
      {isRestartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-orange-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-orange-400">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="font-black text-lg text-white">RESTART AUCTION?</h3>
              </div>
              <button
                onClick={() => setIsRestartModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This action will remove all auction sales and restore all auction players to the available pool. Captain and Vice-Captain allotments, team names, player grades, statistics, base prices, and saved edits will remain unchanged.
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="text-emerald-400 font-bold">What will be preserved:</div>
              <div>• Captain & Vice-Captain allotments and assigned squads</div>
              <div>• All edited player grades, statistics, and base prices</div>
              <div>• Franchise names, logos, colors, and owners</div>
              <div>• Administrator audit logs and edit history</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => setIsRestartModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleConfirmRestart}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 shadow-lg shadow-orange-500/25 transition-all flex items-center gap-2"
              >
                {isProcessingAction ? (
                  <span>RESTARTING...</span>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>CONFIRM RESTART</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: CLEAR AUCTION HISTORY */}
      {isClearHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-purple-400">
                <History className="w-6 h-6" />
                <h3 className="font-black text-lg text-white">CLEAR AUCTION HISTORY?</h3>
              </div>
              <button
                onClick={() => setIsClearHistoryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This action will permanently delete previous auction sales and bidding history. It will not change player data, edited grades, team configurations, Captain/Vice-Captain allotments, or player edit logs.
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="text-purple-300 font-bold">Important distinction:</div>
              <div>• Current player ownership and sold statuses remain unchanged</div>
              <div>• Franchise budgets and current squads are NOT reset</div>
              <div>• Only historical log tables and completed bid records are cleared</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => setIsClearHistoryModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleConfirmClearHistory}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/25 transition-all flex items-center gap-2"
              >
                {isProcessingAction ? (
                  <span>CLEARING...</span>
                ) : (
                  <>
                    <History className="w-4 h-4" />
                    <span>CONFIRM CLEAR HISTORY</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
