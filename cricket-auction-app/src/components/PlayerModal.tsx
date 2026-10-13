import React, { useState, useEffect } from 'react';
import { Player, PlayerGrade, PlayerRole, BattingStyle, BowlingStyle } from '../types/auction';
import { useAuction } from '../context/AuctionContext';
import { calculatePlayerRating } from '../utils/aiEngine';
import { X, Sparkles, User, Save, AlertCircle } from 'lucide-react';

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
  const gradeBasePrices = rules.gradeBasePrices || { gradeA: 5000, gradeB: 3000, gradeC: 1000 };

  const [name, setName] = useState('');
  const [age, setAge] = useState(24);
  const [ageCategory, setAgeCategory] = useState<string>('Above 14');
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

  const [aiSuggestion, setAiSuggestion] = useState<{ grade: PlayerGrade; score: number } | null>(null);

  useEffect(() => {
    if (playerToEdit) {
      setName(playerToEdit.name || '');
      setAge(playerToEdit.age || 24);
      setAgeCategory(playerToEdit.ageCategory || (playerToEdit.age && playerToEdit.age <= 14 ? 'Below 14' : 'Above 14'));
      setGender(playerToEdit.gender || 'Male');
      setExperience(playerToEdit.experience || 4);
      setRole(playerToEdit.role || 'Batsman');
      setBattingStyle(playerToEdit.battingStyle || 'Right-hand bat');
      setBowlingStyle(playerToEdit.bowlingStyle || 'None');
      setGrade(playerToEdit.grade || 'B');
      setBasePrice(playerToEdit.basePrice || 3000);
      setPhoto(playerToEdit.photo || '');
      setPreviousPerformance(playerToEdit.previousPerformance || '');
      setNotes(playerToEdit.notes || '');

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
      setBasePrice(3000);
      setPhoto('');
      setPreviousPerformance('');
      setNotes('');
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

  // AI Recommendation recalculator
  const runAiGrading = () => {
    const dummyPlayer: Partial<Player> = {
      role,
      experience,
      stats: {
        matches,
        runs,
        average,
        strikeRate,
        highestScore,
        fifties,
        hundreds,
        wickets,
        bowlingAverage,
        economyRate,
        bestBowling,
        catches,
        stumpings,
      },
    };
    const score = calculatePlayerRating(dummyPlayer);
    let recGrade: PlayerGrade = 'C';
    let recPrice = gradeBasePrices.gradeC;

    if (score >= 75) {
      recGrade = 'A';
      recPrice = gradeBasePrices.gradeA;
    } else if (score >= 50) {
      recGrade = 'B';
      recPrice = gradeBasePrices.gradeB;
    } else {
      recGrade = 'C';
      recPrice = gradeBasePrices.gradeC;
    }

    setAiSuggestion({ grade: recGrade, score });
    setGrade(recGrade);
    setBasePrice(recPrice);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      age: Number(age),
      ageCategory,
      gender,
      experience: Number(experience),
      role,
      battingStyle,
      bowlingStyle,
      grade,
      basePrice: Number(basePrice),
      photo: photo.trim() || undefined,
      previousPerformance: previousPerformance.trim() || undefined,
      notes: notes.trim() || undefined,
      stats: {
        matches: Number(matches),
        runs: Number(runs),
        average: Number(average),
        strikeRate: Number(strikeRate),
        highestScore: Number(highestScore),
        fifties: Number(fifties),
        hundreds: Number(hundreds),
        wickets: Number(wickets),
        bowlingAverage: Number(bowlingAverage),
        economyRate: Number(economyRate),
        bestBowling: bestBowling.trim() || 'N/A',
        catches: Number(catches),
        stumpings: Number(stumpings),
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
                className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-fill from CricHeroes</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
                <span className="font-semibold text-amber-300">AI Assistant:</span> Auto-calculate Grade and Base Price based on player stats.
              </div>
            </div>
            <button
              type="button"
              onClick={runAiGrading}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow flex items-center gap-1.5 flex-shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto-Grade Player
            </button>
          </div>

          {aiSuggestion && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-emerald-400" />
              <span>
                AI Recommended: <strong>Grade {aiSuggestion.grade}</strong> (Composite Rating Score: {aiSuggestion.score}/100).
              </span>
            </div>
          )}

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
                  setAge(cat === 'Below 14' ? 13 : 20);
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-cyan-300 font-bold text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="Above 14">Above 14</option>
                <option value="Below 14">Below 14</option>
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
              <label className="block text-xs font-medium text-slate-400 mb-1">Playing Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as PlayerRole)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="Batsman">Batsman</option>
                <option value="Bowler">Bowler</option>
                <option value="All-rounder">All-rounder</option>
                <option value="Wicketkeeper">Wicketkeeper</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Player Grade</label>
              <select
                value={grade}
                onChange={e => {
                  const newGrade = e.target.value as PlayerGrade;
                  setGrade(newGrade);
                  setBasePrice(newGrade === 'A' ? gradeBasePrices.gradeA : newGrade === 'B' ? gradeBasePrices.gradeB : gradeBasePrices.gradeC);
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="A">Grade A (Elite - {gradeBasePrices.gradeA} pts)</option>
                <option value="B">Grade B (Strong - {gradeBasePrices.gradeB} pts)</option>
                <option value="C">Grade C (Developing - {gradeBasePrices.gradeC} pts)</option>
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
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
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
                  min="0"
                  value={matches}
                  onChange={e => setMatches(Number(e.target.value))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>
              <div>
                <label className="text-slate-400">Runs</label>
                <input
                  type="number"
                  min="0"
                  value={runs}
                  onChange={e => setRuns(Number(e.target.value))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>
              <div>
                <label className="text-slate-400">Batting Average</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={average}
                  onChange={e => setAverage(Number(e.target.value))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>
              <div>
                <label className="text-slate-400">Strike Rate</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={strikeRate}
                  onChange={e => setStrikeRate(Number(e.target.value))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>
              <div>
                <label className="text-slate-400">Highest Score</label>
                <input
                  type="number"
                  min="0"
                  value={highestScore}
                  onChange={e => setHighestScore(Number(e.target.value))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>
              <div>
                <label className="text-slate-400">50s / 100s</label>
                <div className="flex gap-1 mt-1">
                  <input
                    type="number"
                    min="0"
                    placeholder="50s"
                    value={fifties}
                    onChange={e => setFifties(Number(e.target.value))}
                    className="w-1/2 px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-white"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="100s"
                    value={hundreds}
                    onChange={e => setHundreds(Number(e.target.value))}
                    className="w-1/2 px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400">Wickets</label>
                <input
                  type="number"
                  min="0"
                  value={wickets}
                  onChange={e => setWickets(Number(e.target.value))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>
              <div>
                <label className="text-slate-400">Bowling Economy</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={economyRate}
                  onChange={e => setEconomyRate(Number(e.target.value))}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>
            </div>
          </div>

          {/* Notes & Prior Performance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Previous Performance</label>
              <textarea
                rows={2}
                value={previousPerformance}
                onChange={e => setPreviousPerformance(e.target.value)}
                placeholder="e.g. MVP in 2025 Regional Cup..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Scouting Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Powerplay hitter, accurate death bowling..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Save Player
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
