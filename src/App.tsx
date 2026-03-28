/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, Cpu, Zap, Shield, Trophy, Coins, Music, Volume2, MessageSquare, Twitter, Send, Menu, List, ChevronLeft } from "lucide-react";

// --- Sound Manager ---
class SoundManager {
  private ctx: AudioContext | null = null;
  private musicOsc: OscillatorNode | null = null;
  private musicGain: GainNode | null = null;
  private isMuted: boolean = false;
  private musicInterval: any = null;

  private init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(muted ? 0 : 0.08, this.ctx?.currentTime || 0, 0.1);
    }
  }

  playCoin() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playCrash() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  startMusic() {
    this.init();
    if (!this.ctx || this.musicOsc) return;

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.isMuted ? 0 : 0.12, this.ctx.currentTime);
    this.musicGain.connect(this.ctx.destination);

    const playNote = (freq: number, time: number, type: OscillatorType = "square", vol = 0.04) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);
      g.gain.setValueAtTime(vol, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.2);
    };

    const bassSeq = [55, 55, 82, 55, 73, 55, 82, 55];
    const leadSeq = [220, 0, 330, 0, 293, 0, 330, 440];
    
    let nextNoteTime = this.ctx.currentTime + 0.1;
    
    const schedule = () => {
      if (!this.ctx) return;
      for (let i = 0; i < 8; i++) {
        const time = nextNoteTime + i * 0.2;
        if (bassSeq[i] > 0) playNote(bassSeq[i], time, "sawtooth", 0.05);
        if (leadSeq[i] > 0) playNote(leadSeq[i], time, "square", 0.02);
      }
      nextNoteTime += 1.6;
    };

    schedule();
    this.musicOsc = {} as any; 
    this.musicInterval = setInterval(() => {
      if (this.ctx && this.ctx.state === 'running') {
        if (nextNoteTime < this.ctx.currentTime + 0.5) {
          schedule();
        }
      }
    }, 100);
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.musicOsc = null;
  }
}

const soundManager = new SoundManager();

// --- Constants ---
const LANE_WIDTH = 100;
const PLAYER_SIZE = 60;
const OBSTACLE_WIDTH = 40;
const OBSTACLE_HEIGHT = 80;
const TOKEN_SIZE = 40;
const INITIAL_SPEED = 6;
const SPEED_INCREMENT = 0.0005;
const LANES = [-LANE_WIDTH, 0, LANE_WIDTH];

type Entity = {
  id: number;
  lane: number;
  y: number;
  type: "obstacle" | "token";
};

const VLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className}>
    <path
      d="M25 35 L50 75 L75 35"
      fill="none"
      stroke="white"
      strokeWidth="14"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const JTBot = ({ className }: { className?: string }) => (
  <div className={`relative flex flex-col items-center ${className}`}>
    {/* Head */}
    <div className="w-12 h-10 bg-yellow-500 rounded-t-2xl rounded-b-lg border-2 border-red-500 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.5)]">
      <div className="flex gap-2">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_5px_white]"></div>
        <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_5px_white]"></div>
      </div>
    </div>
    {/* Neck */}
    <div className="w-4 h-2 bg-red-600"></div>
    {/* Body */}
    <div className="w-16 h-14 bg-red-600 rounded-xl border-2 border-yellow-400 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-transparent"></div>
      <Cpu className="w-8 h-8 text-yellow-200/50" />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-yellow-400 rounded-full shadow-[0_0_8px_yellow]"></div>
    </div>
    {/* Hoverboard */}
    <div className="absolute -bottom-4 w-20 h-4 bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 rounded-full blur-[1px] shadow-[0_5px_15px_rgba(239,68,68,0.6)] border-b-2 border-red-800">
      <div className="absolute inset-0 flex justify-around items-center px-4">
        <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
        <div className="w-2 h-2 bg-white rounded-full animate-ping delay-75"></div>
      </div>
    </div>
  </div>
);

export default function App() {
  const [gameState, setGameState] = useState<"start" | "playing" | "gameover" | "leaderboard">("start");
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [playerLane, setPlayerLane] = useState(1); // 0: left, 1: center, 2: right
  const [entities, setEntities] = useState<Entity[]>([]);
  const [highScores, setHighScores] = useState<{score: number, date: string, name: string}[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem("jt_bot_playername") || "Runner");
  const playerNameRef = useRef(playerName);

  useEffect(() => {
    playerNameRef.current = playerName;
  }, [playerName]);
  
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const coinsRef = useRef(0);
  const entitiesRef = useRef<Entity[]>([]);
  const speedRef = useRef(INITIAL_SPEED);
  const playerLaneRef = useRef(1);
  const touchStartX = useRef<number | null>(null);

  // Load High Scores
  useEffect(() => {
    const saved = localStorage.getItem("jt_bot_highscores");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrate old scores that might be missing the name property
        const migrated = parsed.map((hs: any) => ({
          ...hs,
          name: hs.name || "Runner"
        }));
        setHighScores(migrated);
      } catch (e) {
        console.error("Failed to parse high scores", e);
      }
    }
  }, []);

  const gameOverRef = useRef<() => void>(() => {});

  // Stable saveHighScore using functional update
  const saveHighScore = useCallback((newScore: number) => {
    if (newScore <= 0) return;
    const newEntry = { 
      score: newScore, 
      date: new Date().toLocaleDateString(),
      name: playerNameRef.current || "Runner"
    };
    setHighScores(prev => {
      const updated = [...prev, newEntry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      localStorage.setItem("jt_bot_highscores", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const stopGame = useCallback(() => {
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    soundManager.stopMusic();
  }, []);

  const gameOver = useCallback(() => {
    setGameState("gameover");
    soundManager.playCrash();
    soundManager.stopMusic();
    saveHighScore(Math.floor(scoreRef.current));
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  }, [saveHighScore]);

  // Update the ref whenever gameOver changes
  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  useEffect(() => {
    playerLaneRef.current = playerLane;
  }, [playerLane]);

  const gameLoop = useCallback((time: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = time;
      gameLoopRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    const deltaTime = Math.min(time - lastTimeRef.current, 100); 
    lastTimeRef.current = time;

    // Update Speed
    speedRef.current += SPEED_INCREMENT * deltaTime;

    // Update Score
    scoreRef.current += (deltaTime / 100) * (speedRef.current / 5);
    setScore(Math.floor(scoreRef.current));

    // Spawn Entities
    spawnTimerRef.current += deltaTime;
    if (spawnTimerRef.current > 1200 / (speedRef.current / 5)) {
      spawnTimerRef.current = 0;
      const lane = Math.floor(Math.random() * 3);
      const isToken = Math.random() > 0.4;
      const newEntity: Entity = {
        id: Date.now() + Math.random(),
        lane,
        y: -100,
        type: isToken ? "token" : "obstacle",
      };
      entitiesRef.current.push(newEntity);
    }

    // Move Entities & Collision Detection
    const updatedEntities = entitiesRef.current
      .map(e => ({ ...e, y: e.y + speedRef.current }))
      .filter(e => e.y < 850);

    for (const entity of updatedEntities) {
      const playerY = 550;
      const playerX = LANES[playerLaneRef.current];
      const entityX = LANES[entity.lane];

      const dx = Math.abs(playerX - entityX);
      const dy = Math.abs(playerY - entity.y);

      if (entity.type === "obstacle") {
        if (dx < 35 && dy < 55) {
          gameOverRef.current();
          return;
        }
      } else if (entity.type === "token") {
        if (dx < 45 && dy < 45) {
          coinsRef.current += 1;
          setCoins(coinsRef.current);
          soundManager.playCoin();
          entity.y = 1000; // Mark for removal
        }
      }
    }

    entitiesRef.current = updatedEntities.filter(e => e.y < 900);
    setEntities([...entitiesRef.current]);

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, []); 

  const startGame = useCallback(() => {
    try {
      // 1. Force stop any existing loop
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }

      // 2. Reset all mutable references immediately
      scoreRef.current = 0;
      coinsRef.current = 0;
      entitiesRef.current = [];
      speedRef.current = INITIAL_SPEED;
      playerLaneRef.current = 1;
      lastTimeRef.current = 0;
      spawnTimerRef.current = 0;

      // 3. Reset React state
      setScore(0);
      setCoins(0);
      setEntities([]);
      setPlayerLane(1);
      setIsMenuOpen(false);
      setGameState("playing");

      // 4. Audio initialization
      try {
        soundManager.startMusic();
      } catch (audioErr) {
        console.warn("Audio failed to start:", audioErr);
      }

      // 5. Start the loop
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } catch (err) {
      console.error("Failed to start game:", err);
      // Fallback: try to at least show the start screen
      setGameState("start");
    }
  }, [gameLoop]);

  // Handle Pause/Resume when menu opens/closes
  useEffect(() => {
    if (gameState === "playing") {
      if (isMenuOpen) {
        if (gameLoopRef.current) {
          cancelAnimationFrame(gameLoopRef.current);
          gameLoopRef.current = null;
        }
        soundManager.stopMusic();
      } else {
        // Resume only if not already running
        if (!gameLoopRef.current) {
          lastTimeRef.current = 0;
          gameLoopRef.current = requestAnimationFrame(gameLoop);
          soundManager.startMusic();
        }
      }
    }
  }, [isMenuOpen, gameState, gameLoop]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "a") {
      setPlayerLane(prev => Math.max(0, prev - 1));
    } else if (e.key === "ArrowRight" || e.key === "d") {
      setPlayerLane(prev => Math.min(2, prev + 1));
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      soundManager.stopMusic();
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (gameState !== "playing") return;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || gameState !== "playing") return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX.current;
    const threshold = 30; // Minimum pixels for a swipe

    if (Math.abs(diff) > threshold) {
      // It's a swipe
      if (diff > 0) {
        setPlayerLane(prev => Math.min(2, prev + 1));
      } else {
        setPlayerLane(prev => Math.max(0, prev - 1));
      }
    } else {
      // It's a tap - move to the specific lane tapped
      const rect = e.currentTarget.getBoundingClientRect();
      const x = touchEndX - rect.left;
      const width = rect.width;
      
      if (x < width / 3) {
        setPlayerLane(0); // Left
      } else if (x < (width * 2) / 3) {
        setPlayerLane(1); // Middle
      } else {
        setPlayerLane(2); // Right
      }
    }
    
    touchStartX.current = null;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (gameState !== "playing") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    if (x < width / 3) {
      setPlayerLane(0);
    } else if (x < (width * 2) / 3) {
      setPlayerLane(1);
    } else {
      setPlayerLane(2);
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    soundManager.setMuted(newMuted);
  };

  return (
    <div 
      className="min-h-screen bg-black text-white flex flex-col items-center pt-4 font-sans select-none"
      onClick={() => {
        // Resume audio context on first click
        if (soundManager) (soundManager as any).init();
      }}
    >
      {/* Header */}
      <div className="relative w-full max-w-[340px] flex flex-col items-center mb-4">
        {gameState !== "playing" && gameState !== "start" && (
          <button 
            onClick={() => setGameState("start")}
            className="absolute left-2 top-2 p-3 text-purple-400 hover:text-white transition-colors z-50 active:scale-90 flex items-center gap-1"
            aria-label="Back"
          >
            <ChevronLeft className="w-7 h-7" />
            <span className="text-[10px] font-mono uppercase tracking-widest hidden sm:block">Back</span>
          </button>
        )}
        
        {gameState === "playing" && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(true);
            }}
            className="absolute left-2 top-2 p-3 text-purple-400 hover:text-white transition-colors z-50 active:scale-90"
            aria-label="Menu"
          >
            <Menu className="w-7 h-7" />
          </button>
        )}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-yellow-500 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)] mb-2 border-2 border-white/20">
          <Bot className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-2xl font-black tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-300">
          JT BOT RUNNER
        </h1>
        <div className="flex items-center gap-4">
          <p className="text-purple-400/60 text-[10px] font-mono tracking-widest uppercase">System: Operational</p>
          <a 
            href="https://analytics.vgdh.io/ariachain12.vercel.app" 
            target="_blank" 
            rel="noreferrer"
            className="text-[10px] font-mono tracking-widest uppercase text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2"
          >
            Analytics
          </a>
        </div>
      </div>

      {/* Game Area */}
      <div 
        className="relative w-[340px] h-[550px] bg-[#050505] rounded-xl overflow-hidden shadow-2xl border border-purple-900/30 touch-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        {/* Lane Dividers */}
        <div className="absolute inset-0 flex justify-center pointer-events-none">
          <div className="w-[113px] border-l border-dashed border-white/10"></div>
          <div className="w-[113px] border-l border-r border-dashed border-white/10"></div>
          <div className="w-[113px] border-r border-dashed border-white/10"></div>
        </div>

        {/* Entities */}
        {entities.map(entity => (
          <div
            key={entity.id}
            className="absolute"
            style={{
              left: `calc(50% + ${LANES[entity.lane]}px)`,
              transform: `translate(-50%, ${entity.y}px)`,
            }}
          >
            {entity.type === "obstacle" ? (
              <div className="w-12 h-24 bg-red-600 rounded-lg shadow-lg border-2 border-red-400/30"></div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-fuchsia-500 flex items-center justify-center shadow-md border border-white/20">
                <VLogo className="w-6 h-6" />
              </div>
            )}
          </div>
        ))}

        {/* Player */}
        <motion.div
          animate={{ 
            x: LANES[playerLane],
            y: [0, -8, 0]
          }}
          transition={{ 
            x: { type: "spring", stiffness: 400, damping: 28 },
            y: { repeat: Infinity, duration: 0.5, ease: "easeInOut" }
          }}
          className="absolute bottom-16 left-1/2 -ml-[40px] z-10 flex flex-col items-center"
        >
          <JTBot className="scale-110" />
          {/* Shadow */}
          <div className="w-16 h-2 bg-black/40 rounded-full blur-md mt-8"></div>
        </motion.div>

        {/* Overlays */}
        <AnimatePresence mode="wait">
          {gameState === "start" && (
            <motion.div
              key="start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-30 p-8 text-center"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-600 to-yellow-500 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)] mb-4 animate-pulse border-2 border-white/20">
                <Bot className="w-14 h-14 text-white" />
              </div>
              <h2 className="text-3xl font-black text-white mb-1 tracking-tighter uppercase italic">JT BOT</h2>
              
              <div className="w-full max-w-[240px] mb-6">
                <label className="block text-[10px] font-mono text-purple-400 uppercase tracking-widest mb-2 text-left">Player Name</label>
                    <input 
                      type="text" 
                      value={playerName}
                      onChange={(e) => {
                        const val = e.target.value.slice(0, 12);
                        setPlayerName(val);
                        playerNameRef.current = val; // Update ref immediately
                        localStorage.setItem("jt_bot_playername", val);
                      }}
                      placeholder="Enter Name"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-purple-500/50 transition-all text-center uppercase"
                    />
              </div>

              <div className="flex flex-col gap-4 w-full">
                <button
                  onClick={startGame}
                  className="px-12 py-4 bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 text-white font-black rounded-xl transition-all shadow-[0_0_20px_rgba(147,51,234,0.5)] text-xl active:scale-95 uppercase tracking-widest"
                >
                  Launch
                </button>

                <button
                  onClick={() => setGameState("leaderboard")}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-mono tracking-widest uppercase transition-all"
                >
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  Leaderboard
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-purple-900/30 w-full flex flex-col gap-3 text-[10px] font-mono tracking-widest uppercase text-gray-500">
                <p className="text-purple-400 font-bold text-center mb-1">Contact us</p>
                <a 
                  href="https://t.me/Getverse" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/5 hover:bg-white/10 hover:border-purple-500/50 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <Send className="w-3 h-3 group-hover:text-purple-400" />
                    <span>Telegram</span>
                  </div>
                  <span className="text-white group-hover:text-purple-400">@Getverse</span>
                </a>
                <a 
                  href="https://x.com/VerseEcosystem" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/5 hover:bg-white/10 hover:border-purple-500/50 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <Twitter className="w-3 h-3 group-hover:text-purple-400" />
                    <span>X</span>
                  </div>
                  <span className="text-white group-hover:text-purple-400">@VerseEcosystem</span>
                </a>
                <a 
                  href="https://x.com/Ariachain" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-2 text-center text-purple-500/50 text-[8px] hover:text-purple-400 transition-colors"
                >
                  Built by @Ariachain
                </a>
              </div>

              <div className="mt-6 flex flex-col gap-2 text-gray-500 text-[8px] uppercase tracking-widest">
                <p>Swipe or Tap Lanes to Move</p>
                <p>Arrow Keys on Desktop</p>
              </div>
            </motion.div>
          )}

          {gameState === "gameover" && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-20 p-6"
            >
              <h2 className="text-3xl font-bold text-white mb-2 uppercase italic tracking-tighter">Game Over</h2>
              <div className="text-center mb-8">
                <p className="text-gray-400 text-[10px] font-mono uppercase tracking-widest mb-1">{playerName}</p>
                <p className="text-3xl text-purple-400 font-black tracking-tighter">SCORE: {score}</p>
              </div>
              
                <div className="flex flex-col gap-3 w-full relative z-50">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      startGame();
                    }}
                    className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors shadow-lg uppercase tracking-widest cursor-pointer border-2 border-white/10"
                  >
                    Restart Run
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setGameState("start");
                    }}
                    className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors border border-white/10 uppercase tracking-widest cursor-pointer"
                  >
                    Main Menu
                  </motion.button>
                </div>
            </motion.div>
          )}

          {gameState === "leaderboard" && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-30 p-8"
            >
              <button 
                onClick={() => setGameState("start")}
                className="absolute left-4 top-4 p-2 text-purple-400 hover:text-white transition-colors flex items-center gap-1 active:scale-95"
              >
                <ChevronLeft className="w-6 h-6" />
                <span className="text-xs font-mono uppercase tracking-widest">Back</span>
              </button>

              <Trophy className="w-12 h-12 text-yellow-500 mb-4" />
              <h2 className="text-2xl font-black text-white mb-6 tracking-tighter uppercase italic">Top Scores</h2>
              
              <div className="w-full flex flex-col gap-2 mb-8">
                {highScores.length > 0 ? highScores.map((hs, i) => (
                  <div key={i} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10 font-mono text-sm hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-purple-500 font-black text-lg">#{i + 1}</span>
                      <div className="flex flex-col">
                        <span className="text-white font-black uppercase tracking-tighter text-base leading-none">{hs.name}</span>
                        <span className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">{hs.date}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-2xl font-black text-purple-400 tracking-tighter">{hs.score}</span>
                      <span className="text-[8px] text-gray-600 uppercase tracking-[0.2em]">Points</span>
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-500 text-sm italic">No scores yet. Start running!</p>
                )}
              </div>

              <button
                onClick={() => setGameState("start")}
                className="px-12 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors border border-white/10 uppercase tracking-widest w-full"
              >
                Back to Menu
              </button>
            </motion.div>
          )}

          {/* Menu Overlay */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute inset-0 bg-black/95 backdrop-blur-xl z-[100] p-8 flex flex-col"
              >
                <div className="flex justify-between items-center mb-10">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsMenuOpen(false)}
                      className="p-2 text-purple-400 hover:text-white transition-colors active:scale-90"
                    >
                      <ChevronLeft className="w-7 h-7" />
                    </button>
                    <h2 className="text-2xl font-black italic tracking-tighter text-purple-400">GAME MENU</h2>
                  </div>
                  <button 
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 text-gray-500 hover:text-white"
                  >
                    <Zap className="w-6 h-6 rotate-90" />
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (gameState === "gameover") {
                        startGame();
                      } else if (gameState === "playing") {
                        // The useEffect will handle resumption, but we can be explicit
                        if (!gameLoopRef.current) {
                          lastTimeRef.current = 0;
                          gameLoopRef.current = requestAnimationFrame(gameLoop);
                          soundManager.startMusic();
                        }
                      }
                    }}
                    className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-purple-600/20 hover:border-purple-500/50 transition-all text-left"
                  >
                    <Zap className="w-6 h-6 text-purple-400" />
                    <div>
                      <p className="font-black uppercase tracking-widest text-sm">Resume / Continue</p>
                      <p className="text-[10px] text-gray-500 font-mono">Return to the run</p>
                    </div>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setIsMenuOpen(false);
                      startGame();
                    }}
                    className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-purple-600/20 hover:border-purple-500/50 transition-all text-left"
                  >
                    <Bot className="w-6 h-6 text-yellow-500" />
                    <div>
                      <p className="font-black uppercase tracking-widest text-sm">New Game</p>
                      <p className="text-[10px] text-gray-500 font-mono">Start from scratch</p>
                    </div>
                  </motion.button>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setGameState("leaderboard");
                    }}
                    className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-purple-600/20 hover:border-purple-500/50 transition-all text-left"
                  >
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    <div>
                      <p className="font-black uppercase tracking-widest text-sm">Leaderboard</p>
                      <p className="text-[10px] text-gray-500 font-mono">View top runners</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      window.open("https://analytics.vgdh.io/ariachain12.vercel.app", "_blank");
                    }}
                    className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-blue-600/20 hover:border-blue-500/50 transition-all text-left"
                  >
                    <List className="w-6 h-6 text-blue-400" />
                    <div>
                      <p className="font-black uppercase tracking-widest text-sm text-blue-400">View Analytics</p>
                      <p className="text-[10px] text-gray-500 font-mono">Check performance stats</p>
                    </div>
                  </button>

                  <button
                    onClick={toggleMute}
                    className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-purple-600/20 hover:border-purple-500/50 transition-all text-left"
                  >
                    {isMuted ? <Volume2 className="w-6 h-6 text-gray-500" /> : <Volume2 className="w-6 h-6 text-purple-400" />}
                    <div>
                      <p className="font-black uppercase tracking-widest text-sm">Music: {isMuted ? "OFF" : "ON"}</p>
                      <p className="text-[10px] text-gray-500 font-mono">Toggle game audio</p>
                    </div>
                  </button>

                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <label className="block text-[10px] font-mono text-purple-400 uppercase tracking-widest mb-2">Change Name</label>
                    <input 
                      type="text" 
                      value={playerName}
                      onChange={(e) => {
                        const val = e.target.value.slice(0, 12);
                        setPlayerName(val);
                        playerNameRef.current = val; // Update ref immediately
                        localStorage.setItem("jt_bot_playername", val);
                      }}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-purple-500/50 transition-all uppercase"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      stopGame();
                      setGameState("start");
                    }}
                    className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-red-600/20 hover:border-red-500/50 transition-all text-left"
                  >
                    <Menu className="w-6 h-6 text-red-500" />
                    <div>
                      <p className="font-black uppercase tracking-widest text-sm text-red-400">Exit to Title</p>
                      <p className="text-[10px] text-gray-500 font-mono">End current session</p>
                    </div>
                  </button>
                </div>

                <div className="mt-auto pt-8 flex flex-col gap-2">
                  <p className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.2em] text-center">Connect with us</p>
                  <div className="flex justify-center gap-6">
                    <a href="https://t.me/Getverse" target="_blank" rel="noreferrer" className="text-purple-400 hover:text-white transition-colors"><Send className="w-5 h-5" /></a>
                    <a href="https://x.com/VerseEcosystem" target="_blank" rel="noreferrer" className="text-purple-400 hover:text-white transition-colors"><Twitter className="w-5 h-5" /></a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </AnimatePresence>
      </div>

      {/* Footer Stats */}
      <div className="w-[340px] flex justify-between items-center mt-6 px-4">
        <div className="text-xl font-bold">
          Score: <span className="text-purple-400">{score}</span>
        </div>
        <div className="text-xl font-bold">
          Coins: <span className="text-purple-400">{coins}</span>
        </div>
      </div>

      {/* Restart Button */}
      <div className="flex gap-4 mt-6 relative z-50">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            startGame();
          }}
          className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors shadow-lg text-lg flex items-center gap-2 active:scale-95"
        >
          <Zap className="w-5 h-5" />
          Restart
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            stopGame();
            setGameState("start");
          }}
          className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-lg transition-colors border border-white/10 text-lg flex items-center gap-2 active:scale-95"
        >
          <Menu className="w-5 h-5" />
          Menu
        </motion.button>
      </div>
    </div>
  );
}



