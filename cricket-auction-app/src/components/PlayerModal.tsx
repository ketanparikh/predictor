import React, { useState, useEffect } from 'react';
import { Player, PlayerGrade, PlayerRole, BattingStyle, BowlingStyle } from '../types/auction';
import { useAuction } from '../context/AuctionContext';
import { calculatePlayerRating } from '../utils/aiEngine';
import { calculateRecommendedGrade } from '../utils/excelParser';
import { X, Sparkles, User, Save, AlertCircle, Crown, Star, Tag, Hash } from 'lucide-react';

interface PlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (playerData: Omit<Player, 'id' | 'status'> | Player) => void;
  playerToEdit?: Player | Omit<Player, 'id' | 'status'> | null;
  onOpenCricHeroes?: () => void;
}

export const PlayerModal: React.FC<PlayerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  playerToEdit,
  onOpenCricHeroes,
}) => {
  const { rules } = useAuction();
  const gradeBasePrices = rules.gradeBasePrices || { gradeAPlus: 7000, gradeA: 5000, gradeB: 3000, gradeC: 1000 };

  const [name, setName] = useState('');
  const [age, setAge] = useState(24);
  const [ageCategory, setAgeCategory] = useState<string>('Above 15');
  const [gender, setGender] = useState<string>('Male');
  const [experience, setExperience] = useState(4);
  const [role, setRole] = useState<PlayerRole>('Batsman');
  const [battingStyle, setBattingStyle] = useState<BattingStyle>('Right-hand bat');
  const [bowlingStyle, setBowlingStyle] = useState<BowlingStyle>('None');
  const [grade, setGrade] = useState<PlayerGrade>('B');
  const [basePrice, setBasePrice] = useState(gradeBasePrices.gradeB);
  const [photo, setPhoto] = useState('');
  const [previousPerformance, setPreviousPerformance] = useState('');
  const [notes, setNotes] = useState('');

  // Extended Tournament Fields
  const [auctionOrder, setAuctionOrder] = useState<number>(1);
  const [isCaptain, setIsCaptain] = useState<boolean>(false);
  const [isViceCaptain, setIsViceCaptain] = useState<boolean>(false);
  const [sponsorTag, setSponsorTag] = useState<string>('');
  const [isSponsored, setIsSponsored] = useState<boolean>(false);

  // Stats
  const [matches, setMatches] = useState(30);
  const [runs, setRuns] = useState(850);
  const [average, setAverage] = useState(35.5);
  const [strikeRate, setStrikeRate] = useState(140.0);
  const [highestScore, setHighestScore] = useState(85);
  const [fifties, setFifties] = useState(6);
  const [hundreds, setHundreds] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [bowlingAverage, setBowlingAverage] = useState(0);
  const [economyRate, setEconomyRate] = useState(0);
  const [bestBowling, setBestBowling] = useState('N/A');
  const [catches, setCatches] = useState(15);
  const [stumpings, setStumpings] = useState(0);

  const [aiSuggestion, setAiSuggestion] = useState<{ grade: PlayerGrade; score: number; reason?: string } | null>(null);

  useEffect(() => {
    if (playerToEdit) {
      setName(playerToEdit.name || '');
      setAge(playerToEdit.age || 24);
      setAgeCategory(playerToEdit.ageCategory || (playerToEdit.age && playerToEdit.age <= 15 ? '15 and Below' : 'Above 15'));
      setGender(playerToEdit.gender || 'Male');
      setExperience(playerToEdit.experience || 4);
      setRole((playerToEdit.role as string) === 'All-rounder' ? 'Batsman' : playerToEdit.role || 'Batsman');
      setBattingStyle(playerToEdit.battingStyle || 'Right-hand bat');
      setBowlingStyle(playerToEdit.bowlingStyle || 'None');
      setGrade(playerToEdit.grade || 'B');
      setBasePrice(playerToEdit.basePrice || 3000);
      setPhoto(playerToEdit.photo || '');
      setPreviousPerformance(playerToEdit.previousPerformance || '');
      setNotes(playerToEdit.notes || '');

      setAuctionOrder(playerToEdit.auctionOrder || 1);
      setIsCaptain(Boolean(playerToEdit.isCaptain));
      setIsViceCaptain(Boolean(playerToEdit.isViceCaptain));
      setSponsorTag(playerToEdit.sponsorTag || '');
      setIsSponsored(Boolean(playerToEdit.isSponsored || playerToEdit.sponsorTag));

      if (playerToEdit.stats) {
        setMatches(playerToEdit.stats.matches ?? 30);
        setRuns(playerToEdit.stats.runs ?? 850);
        setAverage(playerToEdit.stats.average ?? 35.5);
        setStrikeRate(playerToEdit.stats.strikeRate ?? 140.0);
        setHighestScore(playerToEdit.stats.highestScore ?? 85);
        setFifties(playerToEdit.stats.fifties ?? 6);
        setHundreds(playerToEdit.stats.hundreds ?? 0);
        setWickets(playerToEdit.stats.wickets ?? 0);
        setBowlingAverage(playerToEdit.stats.bowlingAverage ?? 0);
        setEconomyRate(playerToEdit.stats.economyRate ?? 0);
        setBestBowling(playerToEdit.stats.bestBowling ?? 'N/A');
        setCatches(playerToEdit.stats.catches ?? 15);
        setStumpings(playerToEdit.stats.stumpings ?? 0);
      }
    } else {
      // Defaults for new player
      setName('');
      setAge(24);
      setExperience(4);
      setRole('Batsman');
      setBattingStyle('Right-hand bat');
      setBowlingStyle('None');
      setGrade('B');
      setBasePrice(gradeBasePrices.gradeB || 3000);
      setPhoto('');
      setPreviousPerformance('');
      setNotes('');
      setAuctionOrder(1);
      setIsCaptain(false);
      setIsViceCaptain(false);
      setSponsorTag('');
      setIsSponsored(false);
      setMatches(30);
      setRuns(850);
      setAverage(35.5);
      setStrikeRate(140.0);
      setHighestScore(85);
      setFifties(6);
      setHundreds(0);
      setWickets(0);
      setBowlingAverage(0);
      setEconomyRate(0);
      setBestBowling('N/A');
      setCatches(15);
      setStumpings(0);
    }
  }, [playerToEdit, isOpen]);

  // AI & Stats Recommendation recalculator
  const runAiGrading = () => {
    const statsObj = {
      runs,
      average,
      strikeRate,
      fifties,
      hundreds,
      wickets,
      bowlingAverage,
      economyRate,
      catches,
      stumpings,
    };

    const rec = calculateRecommendedGrade(statsObj, role, isCaptain, isViceCaptain);
    const score = calculatePlayerRating({
      role,
      experience,
      stats: { matches, ...statsObj, highestScore, bestBowling },
    });

    let recPrice = gradeBasePrices.gradeC;
    if (rec.grade === 'A+') recPrice = gradeBasePrices.gradeAPlus || 7000;
    else if (rec.grade === 'A') recPrice = gradeBasePrices.gradeA || 5000;
    else if (rec.grade === 'B') recPrice = gradeBasePrices.gradeB || 3000;
    else recPrice = gradeBasePrices.gradeC || 1000;

    setAiSuggestion({ grade: rec.grade, score, reason: rec.reason });
    setGrade(rec.grade);
    setBasePrice(recPrice);
  };

  if (!isOpen) return null;

  const parseSafeNum = (val: any, fallback: number = 0): number => {
    if (val === '' || val === null || val === undefined) return fallback;
    const parsed = typeof val === 'number' ? val : parseFloat(String(val).trim());
    return isNaN(parsed) || !isFinite(parsed) ? fallback : parsed;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      age: parseSafeNum(age, 24),
      ageCategory,
      gender,
      experience: parseSafeNum(experience, 4),
      role,
      battingStyle,
      bowlingStyle,
      grade,
      basePrice: parseSafeNum(basePrice, 1000),
      photo: photo.trim() || undefined,
      previousPerformance: previousPerformance.trim() || undefined,
      notes: notes.trim() || undefined,
      auctionOrder: parseSafeNum(auctionOrder, 1),
      isCaptain: Boolean(isCaptain),
      isViceCaptain: Boolean(isViceCaptain),
      sponsorTag: sponsorTag.trim() || undefined,
      isSponsored: Boolean(isSponsored || sponsorTag.trim()),
      stats: {
        matches: Math.max(0, Math.round(parseSafeNum(matches, 0))),
        runs: Math.max(0, Math.round(parseSafeNum(runs, 0))),
        average: Math.max(0, parseSafeNum(average, 0)),
        strikeRate: Math.max(0, parseSafeNum(strikeRate, 0)),
        highestScore: Math.max(0, Math.round(parseSafeNum(highestScore, 0))),
        fifties: Math.max(0, Math.round(parseSafeNum(fifties, 0))),
        hundreds: Math.max(0, Math.round(parseSafeNum(hundreds, 0))),
        wickets: Math.max(0, Math.round(parseSafeNum(wickets, 0))),
        bowlingAverage: Math.max(0, parseSafeNum(bowlingAverage, 0)),
        economyRate: Math.max(0, parseSafeNum(economyRate, 0)),
        bestBowling: bestBowling.trim() || 'N/A',
        catches: Math.max(0, Math.round(parseSafeNum(catches, 0))),
        stumpings: Math.max(0, Math.round(parseSafeNum(stumpings, 0))),
      },
    };

    if (playerToEdit && 'id' in playerToEdit && playerToEdit.id) {
      onSave({ ...playerToEdit, ...payload });
    } else {
      onSave(payload);
    }
    onClose();
  };

  const isExistingEdit = playerToEdit && 'id' in playerToEdit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">
              {isExistingEdit ? 'Edit Player Profile' : 'Add New Tournament Player'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {onOpenCricHeroes && !isExistingEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCricHeroes();
                }}
                className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-fill from CricHeroes</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* AI Assistance Banner */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="text-xs text-slate-300">
                <span className="font-semibold text-amber-300">Grade Decider:</span> Auto-calculate Grade (A+, A, B, C) and Base Price based on player stats & leadership status.
              </div>
            </div>
            <button
              type="button"
              onClick={runAiGrading}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto-Grade Player
            </button>
          </div>

          {aiSuggestion && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-emerald-400" />
              <span>
                Recommended: <strong>Grade {aiSuggestion.grade}</strong> (Composite Rating: {aiSuggestion.score}/100) — {aiSuggestion.reason}
              </span>
            </div>
          )}

          {/* Tournament Tags & Roles */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
              Tournament Classification & Roles
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Auction Order */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                  <Hash className="w-3 h-3 text-sky-400" /> Auction Lot Sequence #
                </label>
                <input
                  type="number"
                  min="1"
                  value={auctionOrder}
                  onChange={e => setAuctionOrder(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Sponsor Tag */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-emerald-400" /> Sponsor Tag (max 1 per team)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Red Bull, MRF"
                  value={sponsorTag}
                  onChange={e => {
                    setSponsorTag(e.target.value);
                    if (e.target.value.trim()) setIsSponsored(true);
                  }}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-emerald-300 font-mono text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Checkboxes: Captain & Vice Captain */}
              <div className="flex items-center gap-4 pt-4">
                <label className="flex items-center gap-1.5 text-xs text-amber-300 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={isCaptain}
                    onChange={e => {
                      const checked = e.target.checked;
                      setIsCaptain(checked);
                      if (checked) {
                        setIsViceCaptain(false);
                        setGrade('A+');
                        setBasePrice(gradeBasePrices.gradeAPlus || 7000);
                      }
                    }}
                    className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
                  />
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Captain (Grade A+)</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-sky-300 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={isViceCaptain}
                    onChange={e => {
                      const checked = e.target.checked;
                      setIsViceCaptain(checked);
                      if (checked) {
                        setIsCaptain(false);
                        setGrade('A');
                        setBasePrice(gradeBasePrices.gradeA || 5000);
                      }
                    }}
                    className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
                  />
                  <Star className="w-3.5 h-3.5 text-sky-400" />
                  <span>Vice Captain (Grade A)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Core Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Virat Sen"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Photo URL (optional)</label>
              <input
                type="url"
                value={photo}
                onChange={e => setPhoto(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Age Group</label>
              <select
                value={ageCategory}
                onChange={e => {
                  const cat = e.target.value;
                  setAgeCategory(cat);
                  setAge(cat === '15 and Below' ? 14 : 20);
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-cyan-300 font-bold text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="Above 15">Above 15</option>
                <option value="15 and Below">15 and Below</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Gender</label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="Male">♂ Male</option>
                <option value="Female">♀ Female</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Experience (Years)</label>
              <input
                type="number"
                min="0"
                max="30"
                value={experience}
                onChange={e => setExperience(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Primary Role *</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as PlayerRole)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-amber-300 font-bold text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="Batsman">🏏 Batsman</option>
                <option value="Bowler">🎯 Bowler</option>
                <option value="Wicketkeeper">🧤 Wicketkeeper</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Player Grade</label>
              <select
                value={grade}
                onChange={e => {
                  const newGrade = e.target.value as PlayerGrade;
                  setGrade(newGrade);
                  if (newGrade !== 'A' && isViceCaptain) {
                    setIsViceCaptain(false); // Vice Captain has to be an A grade player
                  }
                  if (newGrade !== 'A+' && isCaptain) {
                    setIsCaptain(false);
                  }
                  const newPrice =
                    newGrade === 'A+'
                      ? gradeBasePrices.gradeAPlus || 7000
                      : newGrade === 'A'
                      ? gradeBasePrices.gradeA || 5000
                      : newGrade === 'B'
                      ? gradeBasePrices.gradeB || 3000
                      : gradeBasePrices.gradeC || 1000;
                  setBasePrice(newPrice);
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 font-bold"
              >
                <option value="A+">👑 Grade A+ (Marquee / Captain - {gradeBasePrices.gradeAPlus || 7000} pts)</option>
                <option value="A">⭐ Grade A (Elite - {gradeBasePrices.gradeA} pts)</option>
                <option value="B">⚡ Grade B (Core - {gradeBasePrices.gradeB} pts)</option>
                <option value="C">🌱 Grade C (Emerging - {gradeBasePrices.gradeC} pts)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Batting Style</label>
              <select
                value={battingStyle}
                onChange={e => setBattingStyle(e.target.value as BattingStyle)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="Right-hand bat">Right-hand bat</option>
                <option value="Left-hand bat">Left-hand bat</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Bowling Style</label>
              <select
                value={bowlingStyle}
                onChange={e => setBowlingStyle(e.target.value as BowlingStyle)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="None">None</option>
                <option value="Right-arm fast">Right-arm fast</option>
                <option value="Right-arm medium">Right-arm medium</option>
                <option value="Left-arm fast">Left-arm fast</option>
                <option value="Left-arm medium">Left-arm medium</option>
                <option value="Right-arm off-break">Right-arm off-break</option>
                <option value="Right-arm leg-break">Right-arm leg-break</option>
                <option value="Left-arm orthodox">Left-arm orthodox</option>
                <option value="Left-arm chinaman">Left-arm chinaman</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Base Price (points) *</label>
              <input
                type="number"
                min="100"
                step="100"
                required
                value={basePrice}
                onChange={e => setBasePrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-amber-400 font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Cricket Career Statistics Form */}
          <div className="pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-3">
              Career Statistics
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-slate-400">Matches</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={matches}
                  onChange={e => setMatches(parseSafeNum(e.target.value, 0))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>
              <div>
                <label className="text-slate-400">Total Runs</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={runs}
                  onChange={e => setRuns(parseSafeNum(e.target.value, 0))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-amber-300 font-bold"
                />
              </div>
              <div>
                <label className="text-slate-400">Batting Average</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={average}
                  onChange={e => setAverage(parseSafeNum(e.target.value, 0))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>
              <div>
                <label className="text-slate-400">Strike Rate</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={strikeRate}
                  onChange={e => setStrikeRate(parseSafeNum(e.target.value, 0))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-sky-400 font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400">Highest Score</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={highestScore}
                  onChange={e => setHighestScore(parseSafeNum(e.target.value, 0))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>
              <div>
                <label className="text-slate-400">50s / 100s</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="50s"
                    value={fifties}
                    onChange={e => setFifties(parseSafeNum(e.target.value, 0))}
                    className="w-1/2 mt-1 px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-white text-center"
                  />
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="100s"
                    value={hundreds}
                    onChange={e => setHundreds(parseSafeNum(e.target.value, 0))}
                    className="w-1/2 mt-1 px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-white text-center"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400">Wickets</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={wickets}
                  onChange={e => setWickets(parseSafeNum(e.target.value, 0))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-emerald-400 font-bold"
                />
              </div>
              <div>
                <label className="text-slate-400">Economy Rate</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={economyRate}
                  onChange={e => setEconomyRate(parseSafeNum(e.target.value, 0))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div>
                <label className="text-slate-400">Bowling Average</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={bowlingAverage}
                  onChange={e => setBowlingAverage(parseSafeNum(e.target.value, 0))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>
              <div>
                <label className="text-slate-400">Best Bowling</label>
                <input
                  type="text"
                  placeholder="e.g. 4/18"
                  value={bestBowling}
                  onChange={e => setBestBowling(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>
              <div>
                <label className="text-slate-400">Catches</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={catches}
                  onChange={e => setCatches(parseSafeNum(e.target.value, 0))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>
              <div>
                <label className="text-slate-400">Stumpings</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={stumpings}
                  onChange={e => setStumpings(parseSafeNum(e.target.value, 0))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>
            </div>
          </div>

          {/* Description & Performance */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Previous Performance & Achievements
              </label>
              <textarea
                rows={2}
                value={previousPerformance}
                onChange={e => setPreviousPerformance(e.target.value)}
                placeholder="Key highlights, previous club representations, awards..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Notes / Scout Evaluation</label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Tactical strengths, fitness, match-winner traits..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isExistingEdit ? 'Save Changes' : 'Register Player'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
