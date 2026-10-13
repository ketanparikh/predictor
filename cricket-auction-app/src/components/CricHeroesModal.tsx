import React, { useState } from 'react';
import { Player, PlayerGrade } from '../types/auction';
import {
  CricHeroesParsedResult,
  CRICHEROES_PRESETS,
  parseCricHeroesHtml,
  parseCricHeroesTextSnippet,
} from '../utils/cricheroesParser';
import { RoleBadge } from './RoleBadge';
import { GradeBadge } from './GradeBadge';
import {
  X,
  Sparkles,
  Link,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Award,
  ShieldCheck,
  UserPlus,
  Edit3,
  RotateCcw,
  History,
} from 'lucide-react';

interface CricHeroesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPlayer: (playerData: Omit<Player, 'id' | 'status'>) => void;
  onOpenEditForm?: (playerData: Omit<Player, 'id' | 'status'>) => void;
}

const CH_STORAGE_KEY = 'cricheroes_last_interaction';
const CH_HISTORY_KEY = 'cricheroes_saved_history';

interface SavedCHSession {
  activeTab: 'url' | 'text';
  urlInput: string;
  textInput: string;
  parsedResult: CricHeroesParsedResult | null;
  savedAt: string;
}

function getStoredCHSession(): SavedCHSession | null {
  try {
    const raw = localStorage.getItem(CH_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function getStoredCHHistory(): CricHeroesParsedResult[] {
  try {
    const raw = localStorage.getItem(CH_HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export const CricHeroesModal: React.FC<CricHeroesModalProps> = ({
  isOpen,
  onClose,
  onAddPlayer,
  onOpenEditForm,
}) => {
  const initialSession = React.useMemo(() => getStoredCHSession(), []);

  const [activeTab, setActiveTab] = useState<'url' | 'text'>(initialSession?.activeTab || 'url');
  const [urlInput, setUrlInput] = useState(initialSession?.urlInput || 'https://chshare.link/player/oSHh0e');
  const [textInput, setTextInput] = useState(initialSession?.textInput || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<CricHeroesParsedResult | null>(initialSession?.parsedResult || null);
  const [recentHistory, setRecentHistory] = useState<CricHeroesParsedResult[]>(getStoredCHHistory);

  // Save current interaction to localStorage whenever state changes
  const persistSession = (newResult: CricHeroesParsedResult | null, newUrl?: string, newText?: string, newTab?: 'url' | 'text') => {
    try {
      const sessionData: SavedCHSession = {
        activeTab: newTab ?? activeTab,
        urlInput: newUrl ?? urlInput,
        textInput: newText ?? textInput,
        parsedResult: newResult,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(CH_STORAGE_KEY, JSON.stringify(sessionData));

      if (newResult) {
        // Also update recent history (avoid duplicates by name)
        const updated = [newResult, ...recentHistory.filter(h => h.player.name !== newResult.player.name)].slice(0, 6);
        setRecentHistory(updated);
        localStorage.setItem(CH_HISTORY_KEY, JSON.stringify(updated));
      }
    } catch {}
  };

  const handleClearSession = () => {
    try {
      localStorage.removeItem(CH_STORAGE_KEY);
    } catch {}
    setParsedResult(null);
    setError(null);
  };

  if (!isOpen) return null;

  const handleFetchFromUrl = async (overrideUrl?: string) => {
    const target = (overrideUrl || urlInput).trim();
    if (!target) {
      setError('Please enter a CricHeroes profile URL, chshare.link, or player ID.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/fetch-cricheroes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlOrId: target }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch from CricHeroes. Please check the URL or ID.');
      }

      const parsed = parseCricHeroesHtml(data.html);
      setParsedResult(parsed);
      persistSession(parsed, target, undefined, 'url');
    } catch (err: any) {
      setError(err?.message || 'Error connecting to CricHeroes. You can also try pasting the stats in the "Paste Text" tab.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleParseText = () => {
    const trimmedText = textInput.trim();
    if (!trimmedText) {
      setError('Please paste player stats or a share message from CricHeroes.');
      return;
    }

    // Auto-detect if user pasted a chshare.link or cricheroes URL in the text box
    const linkMatch = trimmedText.match(/https?:\/\/[^\s"'<>]+/i);
    if (linkMatch && (linkMatch[0].includes('chshare.link') || linkMatch[0].includes('cricheroes.'))) {
      handleFetchFromUrl(linkMatch[0]);
      return;
    }

    try {
      setError(null);
      const parsed = parseCricHeroesTextSnippet(trimmedText);
      setParsedResult(parsed);
      persistSession(parsed, undefined, trimmedText, 'text');
    } catch (err: any) {
      setError(err?.message || 'Could not parse text snippet.');
    }
  };

  const handleSelectPreset = (preset: CricHeroesParsedResult) => {
    setError(null);
    setParsedResult(preset);
    persistSession(preset);
  };

  const handleAddDirectly = () => {
    if (!parsedResult) return;
    onAddPlayer(parsedResult.player);
    onClose();
  };

  const handleEditFirst = () => {
    if (!parsedResult) return;
    if (onOpenEditForm) {
      onOpenEditForm(parsedResult.player);
    } else {
      onAddPlayer(parsedResult.player);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-red-500/30 rounded-3xl shadow-2xl overflow-hidden my-8 animate-fade-in">
        {/* Modal Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-red-950/80 via-slate-900 to-amber-950/40 border-b border-red-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20 text-white font-black text-sm tracking-wider">
                CH
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white tracking-tight">
                    Fetch Stats from CricHeroes
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-bold tracking-wide uppercase">
                    Auto-AI Grader
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Import official career statistics directly from the CricHeroes app or profile URL.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => {
                setActiveTab('url');
                setError(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'url'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Link className="w-3.5 h-3.5" />
              <span>CricHeroes URL or ID</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('text');
                setError(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'text'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Paste Share Text / Snippet</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Preset Quick-Buttons */}
          <div className="p-3 rounded-2xl bg-slate-850/60 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Quick Test Samples
              </span>
              <span className="text-[10px] text-slate-500">1-click preview</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CRICHEROES_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-2 rounded-xl border text-left transition-all group ${
                    parsedResult?.player.name === preset.player.name
                      ? 'bg-red-950/40 border-red-500/50 text-white shadow-sm'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <p className="text-xs font-bold truncate group-hover:text-amber-400 transition-colors">
                    {preset.player.name.split(' (')[0]}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {preset.player.role} • Gr. {preset.suggestedGrade}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Tab 1: URL / ID Input */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-300">
                CricHeroes App Share Link (chshare.link), Profile URL, or Player ID
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="e.g. https://chshare.link/player/oSHh0e or 4161625"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-red-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                  />
                </div>
                <button
                  onClick={() => handleFetchFromUrl()}
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 whitespace-nowrap cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Fetching...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Fetch Stats</span>
                    </>
                  )}
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500">
                <span>
                  Supports <span className="text-red-400 font-mono">chshare.link/player/...</span>, <span className="text-slate-400 font-mono">cricheroes.com/player-profile/...</span>, or Player IDs.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setUrlInput('https://chshare.link/player/oSHh0e');
                    handleFetchFromUrl('https://chshare.link/player/oSHh0e');
                  }}
                  className="text-amber-400 hover:text-amber-300 underline font-bold transition-colors cursor-pointer"
                >
                  Load Gurmeet Kalsi (chshare.link)
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Text Snippet Input */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-300">
                Paste WhatsApp / App Share Message
              </label>
              <textarea
                rows={4}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Example:&#10;Player: Rohit Sharma&#10;Matches: 45, Runs: 1250, Wickets: 22, Avg: 38.5, SR: 142.1"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-red-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleParseText}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs transition-all shadow-lg shadow-red-600/20 flex items-center gap-1.5 active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Parse Text</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{error}</p>
                <p className="text-[11px] text-rose-400/80 mt-1">
                  Try clicking one of the preset samples above or pasting stats manually.
                </p>
              </div>
            </div>
          )}

          {/* Saved from previous interaction banner */}
          {parsedResult && (
            <div className="flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <span className="flex items-center gap-1.5 font-semibold text-[11px]">
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                Preserved from previous interaction: <span className="text-white font-bold">{parsedResult.player.name}</span>
              </span>
              <button
                type="button"
                onClick={handleClearSession}
                className="text-[11px] text-slate-400 hover:text-rose-400 font-bold underline transition-colors cursor-pointer"
              >
                Clear / New Fetch
              </button>
            </div>
          )}

          {/* Recent Fetched History */}
          {recentHistory.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              <span className="text-slate-500 flex items-center gap-1 font-bold whitespace-nowrap text-[10px] uppercase tracking-wider">
                <History className="w-3 h-3 text-slate-400" />
                History:
              </span>
              {recentHistory.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setParsedResult(item);
                    persistSession(item);
                  }}
                  className={`px-2 py-0.5 rounded-lg border text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
                    parsedResult?.player.name === item.player.name
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                      : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {item.player.name.split(' (')[0]} ({item.suggestedGrade})
                </button>
              ))}
            </div>
          )}

          {/* Parsed Player Card Preview */}
          {parsedResult && (
            <div className="rounded-2xl border border-slate-700/80 bg-slate-950/90 overflow-hidden shadow-xl animate-fade-in">
              {/* Card Top Banner */}
              <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-850 border-b border-slate-800 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {parsedResult.player.photo ? (
                    <img
                      src={parsedResult.player.photo}
                      alt={parsedResult.player.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500/40 shadow-md"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-amber-600 text-white font-black text-xl flex items-center justify-center border-2 border-amber-500/40 shadow-md">
                      {parsedResult.player.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-white">
                        {parsedResult.player.name}
                      </h3>
                      <span title="CricHeroes Verified">
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <RoleBadge role={parsedResult.player.role} />
                      <span className="text-[11px] text-amber-300 font-medium">
                        Primary Skill: {parsedResult.player.role}
                      </span>
                      {parsedResult.player.bowlingStyle !== 'None' && (
                        <span className="text-[11px] text-slate-400">
                          • {parsedResult.player.bowlingStyle}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Grade & Rating */}
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <GradeBadge grade={parsedResult.suggestedGrade} />
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 font-mono text-xs font-bold border border-amber-500/40">
                      {parsedResult.aiRating}/100 AI
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Rec. Base: <span className="text-emerald-400 font-mono font-bold">{parsedResult.recommendedPrice.toLocaleString()} pts</span>
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="p-4 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center bg-slate-900/40 border-b border-slate-800">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Matches</span>
                  <p className="text-sm font-mono font-black text-white">{parsedResult.player.stats.matches}</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Runs</span>
                  <p className="text-sm font-mono font-black text-amber-400">{parsedResult.player.stats.runs}</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Bat Avg</span>
                  <p className="text-sm font-mono font-black text-white">{parsedResult.player.stats.average.toFixed(1)}</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Strike Rate</span>
                  <p className="text-sm font-mono font-black text-white">{parsedResult.player.stats.strikeRate.toFixed(1)}</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Wickets</span>
                  <p className="text-sm font-mono font-black text-cyan-400">{parsedResult.player.stats.wickets}</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Economy</span>
                  <p className="text-sm font-mono font-black text-white">
                    {parsedResult.player.stats.economyRate > 0 ? parsedResult.player.stats.economyRate.toFixed(1) : 'N/A'}
                  </p>
                </div>
              </div>

              {/* AI Valuation Insights */}
              <div className="p-4 space-y-2 bg-gradient-to-br from-amber-500/5 to-transparent">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <Award className="w-4 h-4" />
                  <span>AI Valuation & Scouting Report</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {parsedResult.insights.summary}
                </p>
                {parsedResult.insights.strengths.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {parsedResult.insights.strengths.slice(0, 3).map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-medium"
                      >
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-900/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            {parsedResult && onOpenEditForm && (
              <button
                onClick={handleEditFirst}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Customize First</span>
              </button>
            )}

            <button
              onClick={handleAddDirectly}
              disabled={!parsedResult}
              className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>Add to Auction Pool</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
