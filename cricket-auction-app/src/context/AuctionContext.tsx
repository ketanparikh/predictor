import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Team, Player, AuctionTransaction, AuctionRules, TournamentInfo, BidRecord, GradeBasePrices } from '../types/auction';
import { initialTeams, initialPlayers, initialAuctionRules, initialTournamentInfo } from '../data/demoData';
import { loadStoredState, saveStoredState, clearAuctionStorage, AppStoredState } from '../utils/storage';
import { pushAuctionStateToFirestore, subscribeAuctionStateFromFirestore } from '../utils/firebaseSync';
import { soundFx } from '../utils/audio';
import { triggerSoldConfetti } from '../utils/confetti';
import { ParsedPlayerRow } from '../utils/excelParser';

export interface LastAuctionResult {
  type: 'sold' | 'unsold';
  player: Player;
  teamId: string | null;
  teamName?: string;
  soldPrice: number | null;
  transactionId?: string;
  bidHistory: BidRecord[];
  currentBid: number;
  currentBidderId: string | null;
}

interface AuctionContextType {
  teams: Team[];
  players: Player[];
  transactions: AuctionTransaction[];
  rules: AuctionRules;
  tournament: TournamentInfo;
  currentPlayer: Player | null;
  currentBid: number;
  currentBidder: Team | null;
  bidHistory: BidRecord[];
  
  // Timer state
  timerSeconds: number;
  isTimerRunning: boolean;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  setCustomTimerDuration: (seconds: number) => void;

  // Auction Actions
  startAuctionForPlayer: (playerId: string) => void;
  placeBid: (teamId: string, incrementOrAmount?: number, isAbsoluteAmount?: boolean) => { success: boolean; message?: string };
  undoLastBid: () => void;
  markPlayerSold: () => { success: boolean; message?: string };
  directSellPlayer: (teamId: string, amount: number) => { success: boolean; message?: string };
  markPlayerUnsold: () => void;
  skipOrNextPlayer: () => void;
  reAuctionPlayer: (playerId: string) => void;
  undoTransaction: (transactionId: string) => void;
  lastActionResult: LastAuctionResult | null;
  undoLastResult: () => { success: boolean; message: string };

  // Spending Optimization
  calculateMaxAllowableBid: (team: Team, player?: Player | null) => { maxBid: number; minReserveRequired: number; remainingSlotsNeeded: number; reason?: string };

  // Mock Auction
  isMockAuction: boolean;
  toggleMockAuction: (enable?: boolean) => void;
  resetMockAuction: () => void;

  // Player Database Management
  addPlayer: (playerData: Omit<Player, 'id' | 'status'>) => Player;
  editPlayer: (player: Player) => void;
  deletePlayer: (playerId: string) => void;
  deleteAllPlayers: () => void;
  restoreDeletedPlayers: (playersToRestore: Player[]) => void;
  importPlayers: (parsedRows: ParsedPlayerRow[], replaceExisting?: boolean) => void;

  // Team Management
  updateTeam: (team: Team) => void;
  updateTeamName: (teamId: string, name: string, shortName?: string) => void;
  updateAllTeams: (teamsList: Team[]) => void;
  resetTeamBudget: (teamId: string) => void;
  removePlayerFromSquad: (teamId: string, playerId: string) => void;
  toggleWishlist: (teamId: string, playerId: string) => void;

  // Configuration & Utilities
  updateRules: (rules: AuctionRules) => void;
  syncGradeBasePricesToPlayers: (gradePrices?: GradeBasePrices) => void;
  updateTournament: (info: TournamentInfo) => void;
  resetToDemoData: () => void;
  clearAllData: () => void;
  importBackupJSON: (jsonString: string) => boolean;
}

const AuctionContext = createContext<AuctionContextType | undefined>(undefined);

const BROADCAST_CHANNEL_NAME = 'cricket_auction_sync_channel';

export function calculateMaxBidForTeam(
  team: Team,
  rules: AuctionRules,
  _player?: Player | null
): { maxBid: number; minReserveRequired: number; remainingSlotsNeeded: number; reason?: string } {
  const minSquadSize = rules.squadRules.minSquadSize || 9;
  const currentSquadSize = team.squad.length;
  // If team already has or needs at most 1 player to reach minSquadSize
  if (currentSquadSize >= minSquadSize - 1) {
    return {
      maxBid: Math.max(0, team.remainingBudget),
      minReserveRequired: 0,
      remainingSlotsNeeded: 0,
    };
  }

  // After acquiring this player, how many more slots must still be filled to reach minSquadSize?
  const slotsRemainingAfterThis = Math.max(0, minSquadSize - (currentSquadSize + 1));
  const baseC = rules.gradeBasePrices?.gradeC ?? 1000;
  const minBasePrice = Math.min(
    rules.gradeBasePrices?.gradeAPlus ?? 7000,
    rules.gradeBasePrices?.gradeA ?? 5000,
    rules.gradeBasePrices?.gradeB ?? 3000,
    baseC
  );

  const minReserveRequired = slotsRemainingAfterThis * minBasePrice;
  const maxBid = Math.max(0, team.remainingBudget - minReserveRequired);

  return {
    maxBid,
    minReserveRequired,
    remainingSlotsNeeded: slotsRemainingAfterThis,
    reason: slotsRemainingAfterThis > 0 
      ? `Must reserve ${minReserveRequired.toLocaleString()} pts for ${slotsRemainingAfterThis} remaining squad slot(s) (min base price ${minBasePrice.toLocaleString()} pts).` 
      : undefined
  };
}

export const AuctionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [transactions, setTransactions] = useState<AuctionTransaction[]>([]);
  const [rules, setRules] = useState<AuctionRules>(initialAuctionRules);
  const [tournament, setTournament] = useState<TournamentInfo>(initialTournamentInfo);
  
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [currentBidderId, setCurrentBidderId] = useState<string | null>(null);
  const [bidHistory, setBidHistory] = useState<BidRecord[]>([]);
  const [lastActionResult, setLastActionResult] = useState<LastAuctionResult | null>(null);

  // Mock Auction Mode state
  const [isMockAuction, setIsMockAuction] = useState<boolean>(false);
  const [mockSnapshot, setMockSnapshot] = useState<{
    teams: Team[];
    players: Player[];
    transactions: AuctionTransaction[];
    currentPlayerId: string | null;
    currentBid: number;
    currentBidderId: string | null;
    bidHistory: BidRecord[];
  } | null>(null);

  // Timer
  const [timerSeconds, setTimerSeconds] = useState<number>(15);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Broadcast channel for multi-screen sync
  const [channel, setChannel] = useState<BroadcastChannel | null>(null);

  // Load initial state
  useEffect(() => {
    const isSpectator = typeof window !== 'undefined' &&
      window.location.hash.toLowerCase() !== '#admin';
    
    if (isSpectator) {
      try {
        const cached = sessionStorage.getItem('cricket_auction_spectator_fast_cache');
        if (cached) {
          const parsed = JSON.parse(cached) as AppStoredState;
          if (parsed && parsed.players && parsed.teams) {
            setTeams(parsed.teams);
            setPlayers(parsed.players);
            setTransactions(parsed.transactions || []);
            setRules(parsed.rules || initialAuctionRules);
            setTournament(parsed.tournament || initialTournamentInfo);
            setCurrentPlayerId(parsed.currentPlayerId ?? null);
            setCurrentBid(parsed.currentBid ?? 0);
            setCurrentBidderId(parsed.currentBidderId ?? null);
            setBidHistory(parsed.bidHistory as unknown as BidRecord[] || []);
            setIsLoaded(true);
          }
        }
      } catch {}
    }

    const stored = loadStoredState();
    if (!isSpectator) {
      setTeams(stored.teams);
      setPlayers(stored.players);
      setTransactions(stored.transactions);
      setRules(stored.rules);
      setTournament(stored.tournament);
      setCurrentPlayerId(stored.currentPlayerId);
      setCurrentBid(stored.currentBid);
      setCurrentBidderId(stored.currentBidderId);
      setBidHistory(stored.bidHistory as unknown as BidRecord[]);
    }
    setTimerSeconds(stored.rules.timerDuration || 15);
    soundFx.setEnabled(stored.rules.soundEnabled);
    setIsLoaded(true);

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      setChannel(bc);

      bc.onmessage = (event) => {
        if (event.data?.type === 'SYNC_STATE') {
          // Read-only spectator/projector screens update from broadcast
          const isReadOnly = typeof window === 'undefined' ||
            window.location.hash.toLowerCase() !== '#admin';
          if (isReadOnly) {
            const payload = event.data.payload as AppStoredState;
            if (payload) {
              setTeams(payload.teams);
              setPlayers(payload.players);
              setTransactions(payload.transactions);
              setRules(payload.rules);
              setTournament(payload.tournament);
              setCurrentPlayerId(payload.currentPlayerId);
              setCurrentBid(payload.currentBid);
              setCurrentBidderId(payload.currentBidderId);
              setBidHistory(payload.bidHistory as unknown as BidRecord[]);
            }
          }
        }
      };

      return () => {
        bc.close();
      };
    }
  }, []);

  // Broadcast state helper (Same browser tabs)
  const broadcastState = useCallback((stateToBroadcast: AppStoredState) => {
    if (channel) {
      channel.postMessage({ type: 'SYNC_STATE', payload: stateToBroadcast });
    }
  }, [channel]);

  // Dedup ref to prevent spamming duplicate state pushes
  const lastPushedJsonRef = useRef<string>('');

  // Push state to server (Cross-device Wi-Fi sync for mobile spectator phones & projector screens)
  const pushStateToServer = useCallback((stateToPush: AppStoredState) => {
    try {
      const json = JSON.stringify(stateToPush);
      if (lastPushedJsonRef.current === json) return;
      lastPushedJsonRef.current = json;

      fetch('/api/auction-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
      }).catch(() => {});
      void pushAuctionStateToFirestore(stateToPush);
    } catch {}
  }, []);

  // Persist state changes (Admin mode only pushes to server to prevent spectators from overwriting)
  useEffect(() => {
    if (!isLoaded) return;
    const isReadOnly = typeof window === 'undefined' ||
      window.location.hash.toLowerCase() !== '#admin';
    if (isReadOnly) return; // Read-only views never overwrite server state

    const stateObj: AppStoredState = {
      teams,
      players,
      transactions,
      rules,
      tournament,
      currentPlayerId,
      currentBid,
      currentBidderId,
      bidHistory,
    };
    saveStoredState(stateObj);
    broadcastState(stateObj);
    pushStateToServer(stateObj);
  }, [teams, players, transactions, rules, tournament, currentPlayerId, currentBid, currentBidderId, bidHistory, isLoaded, broadcastState, pushStateToServer]);

  // Network Real-Time Sync Listener (Live Spectator & Projector cross-device sync)
  useEffect(() => {
    const checkIsSpectatorOrProjector = () => {
      if (typeof window === 'undefined') return false;
      return window.location.hash.toLowerCase() !== '#admin';
    };

    const applyIncomingState = (payload: AppStoredState) => {
      if (!payload || !payload.teams || !payload.players) return;
      try {
        if (typeof window !== 'undefined' && checkIsSpectatorOrProjector()) {
          sessionStorage.setItem('cricket_auction_spectator_fast_cache', JSON.stringify(payload));
        }
      } catch {}
      setTeams(payload.teams);
      setPlayers(payload.players);
      setTransactions(payload.transactions || []);
      setRules(payload.rules || initialAuctionRules);
      setTournament(payload.tournament || initialTournamentInfo);
      setCurrentPlayerId(payload.currentPlayerId ?? null);
      setCurrentBid(payload.currentBid ?? 0);
      setCurrentBidderId(payload.currentBidderId ?? null);
      setBidHistory(payload.bidHistory as unknown as BidRecord[] || []);
    };

    const fetchLatestServerState = () => {
      // Only spectators and projectors sync from server; admin is the authoritative source
      if (!checkIsSpectatorOrProjector()) return;

      fetch('/api/auction-state')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && checkIsSpectatorOrProjector()) {
            applyIncomingState(data);
          }
        })
        .catch(() => {});
    };

    // 1. Initial fetch from server (only for spectator or projector)
    if (checkIsSpectatorOrProjector()) {
      fetchLatestServerState();
    }

    const unsubFirestore = subscribeAuctionStateFromFirestore((data) => {
      if (checkIsSpectatorOrProjector()) {
        applyIncomingState(data);
      }
    });

    // 2. React immediately to hash changes (e.g. entering #spectator or #projector)
    const handleHashChange = () => {
      if (checkIsSpectatorOrProjector()) {
        fetchLatestServerState();
      }
    };
    window.addEventListener('hashchange', handleHashChange);

    // 3. Server-Sent Events (SSE) for instant cross-device broadcast (< 15ms latency)
    let es: EventSource | null = null;
    const connectSSE = () => {
      try {
        es = new EventSource('/api/auction-stream');
        es.onmessage = (evt) => {
          try {
            if (evt.data && evt.data.trim().startsWith('{')) {
              const data = JSON.parse(evt.data) as AppStoredState;
              if (data && checkIsSpectatorOrProjector()) {
                applyIncomingState(data);
              }
            }
          } catch {}
        };
        es.onerror = () => {
          // Cloudflare tunnel reconnection handled gracefully by polling fallback
        };
      } catch {}
    };
    connectSSE();

    // 4. Fallback heartbeat polling for spectator & projector every 1.5 seconds
    const interval = setInterval(() => {
      if (checkIsSpectatorOrProjector()) {
        fetchLatestServerState();
      }
    }, 1500);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      if (es) es.close();
      clearInterval(interval);
      unsubFirestore();
    };
  }, []);


  // Sync sound settings
  useEffect(() => {
    soundFx.setEnabled(rules.soundEnabled);
  }, [rules.soundEnabled]);

  const currentPlayer = players.find(p => p.id === currentPlayerId) || null;
  const currentBidder = teams.find(t => t.id === currentBidderId) || null;

  const toggleMockAuction = useCallback((enable?: boolean) => {
    setIsMockAuction(prev => {
      const nextVal = enable !== undefined ? enable : !prev;
      if (nextVal) {
        setMockSnapshot({
          teams: JSON.parse(JSON.stringify(teams)),
          players: JSON.parse(JSON.stringify(players)),
          transactions: JSON.parse(JSON.stringify(transactions)),
          currentPlayerId,
          currentBid,
          currentBidderId,
          bidHistory: JSON.parse(JSON.stringify(bidHistory)),
        });
      } else {
        if (mockSnapshot) {
          setTeams(mockSnapshot.teams);
          setPlayers(mockSnapshot.players);
          setTransactions(mockSnapshot.transactions);
          setCurrentPlayerId(mockSnapshot.currentPlayerId);
          setCurrentBid(mockSnapshot.currentBid);
          setCurrentBidderId(mockSnapshot.currentBidderId);
          setBidHistory(mockSnapshot.bidHistory);
          setMockSnapshot(null);
        }
      }
      return nextVal;
    });
  }, [teams, players, transactions, currentPlayerId, currentBid, currentBidderId, bidHistory, mockSnapshot]);

  const resetMockAuction = useCallback(() => {
    if (mockSnapshot) {
      setTeams(JSON.parse(JSON.stringify(mockSnapshot.teams)));
      setPlayers(JSON.parse(JSON.stringify(mockSnapshot.players)));
      setTransactions(JSON.parse(JSON.stringify(mockSnapshot.transactions)));
      setCurrentPlayerId(mockSnapshot.currentPlayerId);
      setCurrentBid(mockSnapshot.currentBid);
      setCurrentBidderId(mockSnapshot.currentBidderId);
      setBidHistory(JSON.parse(JSON.stringify(mockSnapshot.bidHistory)));
    }
  }, [mockSnapshot]);

  const calculateMaxAllowableBid = useCallback((team: Team, player?: Player | null) => {
    return calculateMaxBidForTeam(team, rules, player || currentPlayer);
  }, [rules, currentPlayer]);

  // Timer ticker
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          const next = prev - 1;
          if (next === 3) soundFx.playCountdown(1);
          if (next === 2) soundFx.playCountdown(2);
          if (next === 1) soundFx.playCountdown(3);
          if (next <= 0) {
            setIsTimerRunning(false);
            if (rules.autoSellOnTimer && currentBidderId && currentPlayerId) {
              markPlayerSold();
            }
          }
          return Math.max(next, 0);
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds, rules.autoSellOnTimer, currentBidderId, currentPlayerId]);

  const startTimer = useCallback(() => {
    setIsTimerRunning(true);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsTimerRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setIsTimerRunning(false);
    setTimerSeconds(rules.timerDuration);
  }, [rules.timerDuration]);

  const setCustomTimerDuration = useCallback((seconds: number) => {
    setTimerSeconds(seconds);
  }, []);

  // START AUCTION FOR A PLAYER
  const startAuctionForPlayer = useCallback((playerId: string) => {
    const ply = players.find(p => p.id === playerId);
    if (!ply) return;

    // Reset current auction round
    setCurrentPlayerId(playerId);
    setCurrentBid(ply.basePrice);
    setCurrentBidderId(null);
    setBidHistory([]);
    setIsTimerRunning(false);
    setTimerSeconds(rules.timerDuration);

    // Update player status to in_auction
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, status: 'in_auction' } : p));
  }, [players, rules.timerDuration]);

  // PLACE BID
  const placeBid = useCallback((
    teamId: string,
    incrementOrAmount?: number,
    isAbsoluteAmount: boolean = false
  ): { success: boolean; message?: string } => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return { success: false, message: 'Team not found.' };
    if (!currentPlayer) return { success: false, message: 'No player is currently on the auction block.' };

    let newBidAmount = 0;
    if (isAbsoluteAmount && incrementOrAmount) {
      newBidAmount = incrementOrAmount;
    } else {
      const increment = incrementOrAmount !== undefined ? incrementOrAmount : rules.minBidIncrement;
      newBidAmount = (currentBidderId === null) ? currentPlayer.basePrice : currentBid + increment;
    }

    // Rules validation
    if (newBidAmount <= 0) {
      return { success: false, message: 'Bid amount must be positive.' };
    }

    if (currentBidderId !== null && newBidAmount <= currentBid) {
      return { success: false, message: `New bid (${newBidAmount.toLocaleString()}) must exceed current bid (${currentBid.toLocaleString()}).` };
    }

    // Team Budget validation (Points cannot overflow)
    if (newBidAmount > team.remainingBudget) {
      return { 
        success: false, 
        message: `Insufficient budget! ${team.name} has only ${team.remainingBudget.toLocaleString()} points remaining.` 
      };
    }

    // Dynamic spending optimization check (Max allowable bid)
    const { maxBid, reason } = calculateMaxBidForTeam(team, rules, currentPlayer);
    if (newBidAmount > maxBid) {
      return {
        success: false,
        message: `Overspending Alert! ${team.name} can bid at most ${maxBid.toLocaleString()} pts. ${reason || 'Must reserve purse for remaining squad slots.'}`
      };
    }

    // Max Squad limit validation
    if (team.squad.length >= rules.squadRules.maxSquadSize) {
      return { 
        success: false, 
        message: `Squad full! ${team.name} already has maximum ${rules.squadRules.maxSquadSize} players.` 
      };
    }

    const squadPlayers = players.filter(p => team.squad.includes(p.id));

    // Sponsor limit check: Max 1 sponsor per team
    const isCurrentPlayerSponsored = !!(currentPlayer.isSponsored || (currentPlayer.sponsorTag && currentPlayer.sponsorTag.trim()));
    if (isCurrentPlayerSponsored) {
      const existingSponsored = squadPlayers.find(p => p.isSponsored || (p.sponsorTag && p.sponsorTag.trim()));
      if (existingSponsored) {
        return {
          success: false,
          message: `Sponsor limit reached! ${team.name} already has a sponsored player (${existingSponsored.name}${existingSponsored.sponsorTag ? ` - ${existingSponsored.sponsorTag}` : ''}). Each team can have at most 1 sponsored player.`
        };
      }
    }

    // Grade Limits Validation
    if (currentPlayer.grade === 'A+' && rules.squadRules.maxGradeAPlus !== undefined) {
      const gradeAPlusCount = squadPlayers.filter(p => p.grade === 'A+').length;
      if (gradeAPlusCount >= rules.squadRules.maxGradeAPlus) {
        return { success: false, message: `${team.name} already has maximum allowed Grade A+ players (${rules.squadRules.maxGradeAPlus}).` };
      }
    } else if (currentPlayer.grade === 'A' && rules.squadRules.maxGradeA !== undefined) {
      const gradeACount = squadPlayers.filter(p => p.grade === 'A').length;
      if (gradeACount >= rules.squadRules.maxGradeA) {
        return { success: false, message: `${team.name} already has maximum allowed Grade A players (${rules.squadRules.maxGradeA}).` };
      }
    } else if (currentPlayer.grade === 'B' && rules.squadRules.maxGradeB !== undefined) {
      const gradeBCount = squadPlayers.filter(p => p.grade === 'B').length;
      if (gradeBCount >= rules.squadRules.maxGradeB) {
        return { success: false, message: `${team.name} already has maximum allowed Grade B players (${rules.squadRules.maxGradeB}).` };
      }
    }

    // Record bid
    const newRecord: BidRecord = {
      id: `bid-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      auctionId: `auc-${currentPlayer.id}`,
      playerId: currentPlayer.id,
      teamId: team.id,
      teamName: team.name,
      amount: newBidAmount,
      timestamp: new Date().toISOString(),
    };

    setCurrentBid(newBidAmount);
    setCurrentBidderId(team.id);
    setBidHistory(prev => [newRecord, ...prev]);

    // Reset timer on new bid
    setTimerSeconds(rules.timerDuration);
    soundFx.playBid();

    return { success: true };
  }, [teams, currentPlayer, currentBidderId, currentBid, rules, players]);

  // UNDO LAST BID
  const undoLastBid = useCallback(() => {
    if (bidHistory.length === 0) return;

    if (bidHistory.length === 1) {
      // Revert to initial state for current player
      setBidHistory([]);
      setCurrentBidderId(null);
      setCurrentBid(currentPlayer ? currentPlayer.basePrice : 0);
    } else {
      const remainingHistory = bidHistory.slice(1);
      const previousBid = remainingHistory[0];
      setBidHistory(remainingHistory);
      setCurrentBid(previousBid.amount);
      setCurrentBidderId(previousBid.teamId);
    }
  }, [bidHistory, currentPlayer]);

  // MARK PLAYER SOLD
  const markPlayerSold = useCallback((): { success: boolean; message?: string } => {
    if (!currentPlayer) return { success: false, message: 'No active player in auction.' };
    if (!currentBidderId) return { success: false, message: 'No team has placed a bid for this player yet. Use Unsold if no bids.' };

    const winningTeam = teams.find(t => t.id === currentBidderId);
    if (!winningTeam) return { success: false, message: 'Winning team could not be resolved.' };

    const finalPrice = currentBid;

    // 1. Update Team Budget & Squad (Overflow guarded)
    setTeams(prev => prev.map(t => {
      if (t.id === winningTeam.id) {
        return {
          ...t,
          remainingBudget: Math.max(0, t.remainingBudget - finalPrice),
          totalSpent: t.totalSpent + finalPrice,
          squad: [...t.squad, currentPlayer.id],
        };
      }
      return t;
    }));

    // 2. Update Player Status
    setPlayers(prev => prev.map(p => {
      if (p.id === currentPlayer.id) {
        return {
          ...p,
          status: 'sold',
          teamId: winningTeam.id,
          soldPrice: finalPrice,
        };
      }
      return p;
    }));

    const txId = `tx-${Date.now()}`;
    const tx: AuctionTransaction = {
      id: txId,
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      playerRole: currentPlayer.role,
      playerGrade: currentPlayer.grade,
      teamId: winningTeam.id,
      teamName: winningTeam.name,
      basePrice: currentPlayer.basePrice,
      soldPrice: finalPrice,
      timestamp: new Date().toISOString(),
      bidHistory: [...bidHistory],
    };
    setTransactions(prev => [tx, ...prev]);

    // Track for 1-click Undo
    setLastActionResult({
      type: 'sold',
      player: currentPlayer,
      teamId: winningTeam.id,
      teamName: winningTeam.name,
      soldPrice: finalPrice,
      transactionId: txId,
      bidHistory: [...bidHistory],
      currentBid,
      currentBidderId,
    });

    // 4. Effects
    soundFx.playGavel();
    soundFx.playFanfare();
    if (rules.animationsEnabled) {
      triggerSoldConfetti();
    }

    // 5. Clear auction state for next player
    setIsTimerRunning(false);
    setCurrentPlayerId(null);
    setCurrentBid(0);
    setCurrentBidderId(null);
    setBidHistory([]);

    return { success: true };
  }, [currentPlayer, currentBidderId, teams, currentBid, bidHistory, rules.animationsEnabled]);

  // DIRECT SELL PLAYER (Single-screen quick assignment)
  const directSellPlayer = useCallback((teamId: string, amount: number): { success: boolean; message?: string } => {
    if (!currentPlayer) return { success: false, message: 'No active player in auction.' };
    const team = teams.find(t => t.id === teamId);
    if (!team) return { success: false, message: 'Selected franchise not found.' };

    if (amount <= 0) {
      return { success: false, message: 'Sale amount must be greater than 0.' };
    }

    if (team.squad.length >= rules.squadRules.maxSquadSize) {
      return { success: false, message: `Squad full! ${team.name} already has maximum ${rules.squadRules.maxSquadSize} players.` };
    }

    if (amount > team.remainingBudget) {
      return { success: false, message: `Insufficient budget! ${team.name} has only ${team.remainingBudget.toLocaleString()} points remaining.` };
    }

    const { maxBid, reason } = calculateMaxBidForTeam(team, rules, currentPlayer);
    if (amount > maxBid) {
      return {
        success: false,
        message: `Overspending Alert! ${team.name} can spend at most ${maxBid.toLocaleString()} pts. ${reason || 'Must reserve purse for remaining squad slots.'}`
      };
    }

    const squadPlayers = players.filter(p => team.squad.includes(p.id));
    const isCurrentPlayerSponsored = !!(currentPlayer.isSponsored || (currentPlayer.sponsorTag && currentPlayer.sponsorTag.trim()));
    if (isCurrentPlayerSponsored) {
      const existingSponsored = squadPlayers.find(p => p.isSponsored || (p.sponsorTag && p.sponsorTag.trim()));
      if (existingSponsored) {
        return {
          success: false,
          message: `Sponsor limit reached! ${team.name} already has a sponsored player (${existingSponsored.name}${existingSponsored.sponsorTag ? ` - ${existingSponsored.sponsorTag}` : ''}). Each team can have at most 1 sponsored player.`
        };
      }
    }

    const finalPrice = amount;

    setTeams(prev => prev.map(t => {
      if (t.id === team.id) {
        return {
          ...t,
          remainingBudget: Math.max(0, t.remainingBudget - finalPrice),
          totalSpent: t.totalSpent + finalPrice,
          squad: [...t.squad, currentPlayer.id],
        };
      }
      return t;
    }));

    setPlayers(prev => prev.map(p => {
      if (p.id === currentPlayer.id) {
        return {
          ...p,
          status: 'sold',
          teamId: team.id,
          soldPrice: finalPrice,
        };
      }
      return p;
    }));

    const txId = `tx-${Date.now()}`;
    const tx: AuctionTransaction = {
      id: txId,
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      playerRole: currentPlayer.role,
      playerGrade: currentPlayer.grade,
      teamId: team.id,
      teamName: team.name,
      basePrice: currentPlayer.basePrice,
      soldPrice: finalPrice,
      timestamp: new Date().toISOString(),
      bidHistory: [...bidHistory],
    };
    setTransactions(prev => [tx, ...prev]);

    setLastActionResult({
      type: 'sold',
      player: currentPlayer,
      teamId: team.id,
      teamName: team.name,
      soldPrice: finalPrice,
      transactionId: txId,
      bidHistory: [...bidHistory],
      currentBid: finalPrice,
      currentBidderId: team.id,
    });

    soundFx.playGavel();
    soundFx.playFanfare();
    if (rules.animationsEnabled) {
      triggerSoldConfetti();
    }

    setIsTimerRunning(false);
    setCurrentPlayerId(null);
    setCurrentBid(0);
    setCurrentBidderId(null);
    setBidHistory([]);

    return { success: true };
  }, [currentPlayer, teams, players, rules, bidHistory]);

  // MARK PLAYER UNSOLD
  const markPlayerUnsold = useCallback(() => {
    if (!currentPlayer) return;

    // Track for 1-click Undo
    setLastActionResult({
      type: 'unsold',
      player: currentPlayer,
      teamId: null,
      soldPrice: null,
      bidHistory: [...bidHistory],
      currentBid,
      currentBidderId,
    });

    setPlayers(prev => prev.map(p => {
      if (p.id === currentPlayer.id) {
        return {
          ...p,
          status: 'unsold',
          teamId: null,
          soldPrice: null,
        };
      }
      return p;
    }));

    soundFx.playUnsold();

    setIsTimerRunning(false);
    setCurrentPlayerId(null);
    setCurrentBid(0);
    setCurrentBidderId(null);
    setBidHistory([]);
  }, [currentPlayer, currentBid, currentBidderId, bidHistory]);

  // UNDO LAST AUCTION RESULT (SOLD OR UNSOLD)
  const undoLastResult = useCallback((): { success: boolean; message: string } => {
    if (!lastActionResult) {
      return { success: false, message: 'No recent auction result to undo.' };
    }

    const { type, player, teamId, soldPrice, transactionId, bidHistory: savedHistory, currentBid: savedBid, currentBidderId: savedBidder } = lastActionResult;

    if (type === 'sold' && teamId && soldPrice) {
      // 1. Refund team budget & remove from squad
      setTeams(prev => prev.map(t => {
        if (t.id === teamId) {
          return {
            ...t,
            remainingBudget: t.remainingBudget + soldPrice,
            totalSpent: Math.max(0, t.totalSpent - soldPrice),
            squad: t.squad.filter(id => id !== player.id),
          };
        }
        return t;
      }));

      // 2. Remove recorded transaction
      if (transactionId) {
        setTransactions(prev => prev.filter(t => t.id !== transactionId));
      }
    }

    // 3. Revert player status to 'in_auction'
    setPlayers(prev => prev.map(p => {
      if (p.id === player.id) {
        return {
          ...p,
          status: 'in_auction',
          teamId: null,
          soldPrice: null,
        };
      }
      return p;
    }));

    // 4. Restore auction cockpit state
    setCurrentPlayerId(player.id);
    setCurrentBid(savedBid);
    setCurrentBidderId(savedBidder);
    setBidHistory(savedHistory);
    setIsTimerRunning(false);
    setTimerSeconds(rules.timerDuration);

    const playerName = player.name;
    setLastActionResult(null);

    return {
      success: true,
      message: `Reverted ${type === 'sold' ? 'sale' : 'unsold decision'} for ${playerName}. Player restored to active lot!`,
    };
  }, [lastActionResult, rules.timerDuration]);

  // SKIP / NEXT UPCOMING PLAYER
  const skipOrNextPlayer = useCallback(() => {
    const nextUpcoming = players.find(p => p.status === 'upcoming');
    if (nextUpcoming) {
      startAuctionForPlayer(nextUpcoming.id);
    }
  }, [players, startAuctionForPlayer]);

  // RE-AUCTION AN UNSOLD PLAYER
  const reAuctionPlayer = useCallback((playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          status: 'upcoming',
        };
      }
      return p;
    }));

    startAuctionForPlayer(playerId);
  }, [players, startAuctionForPlayer]);

  // UNDO TRANSACTION
  const undoTransaction = useCallback((transactionId: string) => {
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx || tx.undone) return;

    // 1. Restore team budget & remove from squad
    setTeams(prev => prev.map(t => {
      if (t.id === tx.teamId) {
        return {
          ...t,
          remainingBudget: t.remainingBudget + tx.soldPrice,
          totalSpent: Math.max(0, t.totalSpent - tx.soldPrice),
          squad: t.squad.filter(id => id !== tx.playerId),
        };
      }
      return t;
    }));

    // 2. Return player to upcoming pool
    setPlayers(prev => prev.map(p => {
      if (p.id === tx.playerId) {
        return {
          ...p,
          status: 'upcoming',
          teamId: null,
          soldPrice: null,
        };
      }
      return p;
    }));

    // 3. Mark transaction as undone
    setTransactions(prev => prev.map(t => t.id === transactionId ? { ...t, undone: true } : t));
  }, [transactions]);

  // ADD PLAYER
  const addPlayer = useCallback((playerData: Omit<Player, 'id' | 'status'>): Player => {
    const newId = `ply-${Date.now()}`;
    const newPlayer: Player = {
      ...playerData,
      id: newId,
      status: 'upcoming',
      auctionOrder: players.length + 1,
    };

    setPlayers(prev => {
      const updated = [...prev, newPlayer];
      saveStoredState({ players: updated });
      return updated;
    });
    return newPlayer;
  }, [players.length]);

  // EDIT PLAYER
  const editPlayer = useCallback((updatedPlayer: Player) => {
    setPlayers(prev => {
      const updated = prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p);
      saveStoredState({ players: updated });
      return updated;
    });
  }, []);

  // DELETE PLAYER
  const deletePlayer = useCallback((playerId: string) => {
    setPlayers(prev => {
      const updated = prev.filter(p => p.id !== playerId);
      saveStoredState({ players: updated });
      return updated;
    });
    // Remove from team squads if present
    setTeams(prev => {
      const updated = prev.map(t => ({
        ...t,
        squad: t.squad.filter(id => id !== playerId),
        wishlist: (t.wishlist || []).filter(id => id !== playerId),
      }));
      saveStoredState({ teams: updated });
      return updated;
    });
  }, []);

  // DELETE ALL PLAYERS AT ONCE
  const deleteAllPlayers = useCallback(() => {
    setPlayers([]);
    saveStoredState({ players: [] });
    // Reset active auction if a player is in progress
    setCurrentPlayerId(null);
    setCurrentBid(0);
    setCurrentBidderId(null);
    setBidHistory([]);
    setIsTimerRunning(false);
    // Reset team rosters and restore full budgets
    setTeams(prev => {
      const updated = prev.map(t => ({
        ...t,
        squad: [],
        wishlist: [],
        totalSpent: 0,
        remainingBudget: t.startingBudget,
      }));
      saveStoredState({ teams: updated });
      return updated;
    });
    // Clear transactions
    setTransactions([]);
    saveStoredState({ transactions: [] });
  }, []);

  // RESTORE DELETED PLAYERS (UNDO DELETE)
  const restoreDeletedPlayers = useCallback((playersToRestore: Player[]) => {
    if (!playersToRestore || playersToRestore.length === 0) return;
    setPlayers(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const toAdd = playersToRestore.filter(p => !existingIds.has(p.id));
      const updated = [...prev, ...toAdd];
      saveStoredState({ players: updated });
      return updated;
    });
  }, []);

  // IMPORT PLAYERS FROM EXCEL
  const importPlayers = useCallback((parsedRows: ParsedPlayerRow[], replaceExisting: boolean = false) => {
    const newPlayers: Player[] = parsedRows.map((r, idx) => ({
      id: `ply-${Date.now()}-${idx}`,
      name: r.name,
      age: r.age,
      ageCategory: r.ageCategory || (r.age <= 14 ? 'Below 14' : 'Above 14'),
      gender: r.gender || 'Male',
      experience: r.experience,
      role: r.role,
      battingStyle: r.battingStyle,
      bowlingStyle: r.bowlingStyle,
      grade: r.grade,
      basePrice: r.basePrice,
      description: r.description || r.previousPerformance || r.notes,
      status: 'upcoming',
      auctionOrder: r.auctionOrder !== undefined ? r.auctionOrder : ((replaceExisting ? 0 : players.length) + idx + 1),
      isCaptain: r.isCaptain,
      isViceCaptain: r.isViceCaptain,
      sponsorTag: r.sponsorTag,
      isSponsored: r.isSponsored || !!(r.sponsorTag && r.sponsorTag.trim()),
      photo: r.photo,
      previousPerformance: r.previousPerformance || r.description,
      notes: r.notes || r.description,
      stats: {
        matches: r.matches,
        runs: r.runs,
        average: r.average,
        strikeRate: r.strikeRate,
        highestScore: r.highestScore,
        fifties: r.fifties,
        hundreds: r.hundreds,
        wickets: r.wickets,
        bowlingAverage: r.bowlingAverage,
        economyRate: r.economyRate,
        bestBowling: r.bestBowling,
        catches: r.catches,
        stumpings: r.stumpings,
      },
    }));

    if (replaceExisting) {
      setPlayers(newPlayers);
      saveStoredState({ players: newPlayers });
    } else {
      setPlayers(prev => {
        const updated = [...prev, ...newPlayers];
        saveStoredState({ players: updated });
        return updated;
      });
    }
  }, [players.length]);

  // UPDATE TEAM
  const updateTeam = useCallback((updatedTeam: Team) => {
    setTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t));
  }, []);

  // UPDATE TEAM NAME & SHORT CODE
  const updateTeamName = useCallback((teamId: string, name: string, shortName?: string) => {
    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        return {
          ...t,
          name: name.trim() || t.name,
          shortName: shortName?.trim().toUpperCase() || t.shortName,
        };
      }
      return t;
    }));
  }, []);

  // UPDATE ALL TEAMS AT ONCE
  const updateAllTeams = useCallback((updatedTeams: Team[]) => {
    setTeams(updatedTeams);
  }, []);


  // RESET TEAM BUDGET
  const resetTeamBudget = useCallback((teamId: string) => {
    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        return {
          ...t,
          remainingBudget: t.startingBudget,
          totalSpent: 0,
          squad: [],
        };
      }
      return t;
    }));

    // Reset status of players belonging to this team
    setPlayers(prev => prev.map(p => {
      if (p.teamId === teamId) {
        return {
          ...p,
          status: 'upcoming',
          teamId: null,
          soldPrice: null,
        };
      }
      return p;
    }));
  }, []);

  // REMOVE PLAYER FROM SQUAD
  const removePlayerFromSquad = useCallback((teamId: string, playerId: string) => {
    const player = players.find(p => p.id === playerId);
    const refundPrice = player?.soldPrice || 0;

    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        return {
          ...t,
          remainingBudget: t.remainingBudget + refundPrice,
          totalSpent: Math.max(0, t.totalSpent - refundPrice),
          squad: t.squad.filter(id => id !== playerId),
        };
      }
      return t;
    }));

    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          status: 'upcoming',
          teamId: null,
          soldPrice: null,
        };
      }
      return p;
    }));
  }, [players]);

  // TOGGLE WISHLIST
  const toggleWishlist = useCallback((teamId: string, playerId: string) => {
    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        const currentWishlist = t.wishlist || [];
        const isPresent = currentWishlist.includes(playerId);
        return {
          ...t,
          wishlist: isPresent ? currentWishlist.filter(id => id !== playerId) : [...currentWishlist, playerId],
        };
      }
      return t;
    }));
  }, []);

  // UPDATE RULES
  const updateRules = useCallback((newRules: AuctionRules) => {
    setRules(newRules);
  }, []);

  // SYNC GRADE BASE PRICES TO ALL UPCOMING PLAYERS
  const syncGradeBasePricesToPlayers = useCallback((gradePrices?: GradeBasePrices) => {
    const prices = gradePrices || rules.gradeBasePrices || { gradeAPlus: 7000, gradeA: 5000, gradeB: 3000, gradeC: 1000 };
    setPlayers(prev => prev.map(p => {
      if (p.status === 'upcoming') {
        const newPrice = p.grade === 'A+' 
          ? prices.gradeAPlus 
          : p.grade === 'A' 
          ? prices.gradeA 
          : p.grade === 'B' 
          ? prices.gradeB 
          : prices.gradeC;
        return { ...p, basePrice: newPrice };
      }
      return p;
    }));
  }, [rules.gradeBasePrices]);

  // UPDATE TOURNAMENT INFO
  const updateTournament = useCallback((info: TournamentInfo) => {
    setTournament(info);
  }, []);

  // RESET TO DEMO DATA
  const resetToDemoData = useCallback(() => {
    clearAuctionStorage();
    setTeams(initialTeams);
    setPlayers(initialPlayers);
    setTransactions([]);
    setRules(initialAuctionRules);
    setTournament(initialTournamentInfo);
    setCurrentPlayerId(null);
    setCurrentBid(0);
    setCurrentBidderId(null);
    setBidHistory([]);
    setTimerSeconds(initialAuctionRules.timerDuration);
  }, []);

  // CLEAR ALL DATA
  const clearAllData = useCallback(() => {
    clearAuctionStorage();
    const emptyTeams = initialTeams.map(t => ({
      ...t,
      startingBudget: 50000,
      remainingBudget: 50000,
      totalSpent: 0,
      squad: [],
      wishlist: [],
    }));
    setTeams(emptyTeams);
    setPlayers([]);
    setTransactions([]);
    setCurrentPlayerId(null);
    setCurrentBid(0);
    setCurrentBidderId(null);
    setBidHistory([]);
  }, []);

  // IMPORT BACKUP JSON
  const importBackupJSON = useCallback((jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString) as AppStoredState;
      if (parsed.teams && parsed.players) {
        setTeams(parsed.teams);
        setPlayers(parsed.players);
        setTransactions(parsed.transactions || []);
        setRules(parsed.rules || initialAuctionRules);
        setTournament(parsed.tournament || initialTournamentInfo);
        setCurrentPlayerId(parsed.currentPlayerId || null);
        setCurrentBid(parsed.currentBid || 0);
        setCurrentBidderId(parsed.currentBidderId || null);
        setBidHistory(parsed.bidHistory as unknown as BidRecord[] || []);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return (
    <AuctionContext.Provider
      value={{
        teams,
        players,
        transactions,
        rules,
        tournament,
        currentPlayer,
        currentBid,
        currentBidder,
        bidHistory,
        timerSeconds,
        isTimerRunning,
        startTimer,
        pauseTimer,
        resetTimer,
        setCustomTimerDuration,
        startAuctionForPlayer,
        placeBid,
        undoLastBid,
        markPlayerSold,
        directSellPlayer,
        markPlayerUnsold,
        skipOrNextPlayer,
        reAuctionPlayer,
        undoTransaction,
        lastActionResult,
        undoLastResult,
        calculateMaxAllowableBid,
        isMockAuction,
        toggleMockAuction,
        resetMockAuction,
        addPlayer,
        editPlayer,
        deletePlayer,
        deleteAllPlayers,
        restoreDeletedPlayers,
        importPlayers,
        updateTeam,
        updateTeamName,
        updateAllTeams,
        resetTeamBudget,
        removePlayerFromSquad,

        toggleWishlist,
        updateRules,
        syncGradeBasePricesToPlayers,
        updateTournament,
        resetToDemoData,
        clearAllData,
        importBackupJSON,
      }}
    >
      {children}
    </AuctionContext.Provider>
  );
};

export const useAuction = (): AuctionContextType => {
  const context = useContext(AuctionContext);
  if (!context) {
    throw new Error('useAuction must be used within an AuctionProvider');
  }
  return context;
};
