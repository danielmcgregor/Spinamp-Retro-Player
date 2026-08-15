import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Track, PlayerState, VisualizerMode } from '../types';
import { Visualizer } from './Visualizer';
import { MarqueeText } from './MarqueeText';
import { spinampAudio } from '../utils/audioContext';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Shuffle,
  Maximize2,
  Minimize2,
  Sparkles,
  Zap,
  Keyboard,
  Gauge,
  HelpCircle,
  X,
  FastForward,
  Rewind
} from 'lucide-react';

interface FullScreenVisualizerProps {
  mode: VisualizerMode;
  isPlaying: boolean;
  currentTrack: Track | null;
  currentTime: number;
  duration: number;
  playerState: PlayerState;
  onClose: () => void;
  onToggleVisualizerMode: () => void;
  onSelectVisualizerMode: (mode: VisualizerMode) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onShuffleToggle: () => void;
  onRepeatToggle: () => void;
  timeDisplayMode?: 'elapsed' | 'remaining';
  onToggleTimeDisplayMode?: () => void;
  playHistory: string[];
  tracks: Track[];
}

export const FullScreenVisualizer: React.FC<FullScreenVisualizerProps> = ({
  mode,
  isPlaying,
  currentTrack,
  currentTime,
  duration,
  playerState,
  playHistory,
  tracks,
  onClose,
  onToggleVisualizerMode,
  onSelectVisualizerMode,
  onPlay,
  onPause,
  onStop,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onShuffleToggle,
  onRepeatToggle,
  timeDisplayMode = 'elapsed',
  onToggleTimeDisplayMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 320, height: 240 });
  const [showUiOverlay, setShowUiOverlay] = useState(true);
  const [showTrackToast, setShowTrackToast] = useState(false);
  const [showKeyboardHud, setShowKeyboardHud] = useState(false);
  const [userSpeed, setUserSpeed] = useState<number>(() => spinampAudio.getUserPlaybackRate());
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resizeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-hide UI overlay after 4 seconds of inactivity to maximize immersive visualization
  const resetOverlayTimer = useCallback(() => {
    setShowUiOverlay(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (isPlaying) {
      timeoutRef.current = setTimeout(() => {
        setShowUiOverlay(false);
      }, 4000);
    }
  }, [isPlaying]);

  useEffect(() => {
    resetOverlayTimer();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stateRef = useRef({ currentTime, duration, isPlaying, volume: playerState.volume });
  useEffect(() => {
    stateRef.current = { currentTime, duration, isPlaying, volume: playerState.volume };
  });

  // Keyboard navigation shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      resetOverlayTimer();

      const { currentTime, duration, isPlaying, volume } = stateRef.current;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          if (isPlaying) onPause(); else onPlay();
          break;
        case 'ArrowLeft':
        case 'j':
        case 'J':
          e.preventDefault();
          onSeek(Math.max(0, currentTime - (e.shiftKey ? 15 : 5)));
          break;
        case 'ArrowRight':
        case 'l':
        case 'L':
          e.preventDefault();
          onSeek(Math.min(duration, currentTime + (e.shiftKey ? 15 : 5)));
          break;
        case 'ArrowUp':
          e.preventDefault();
          onVolumeChange(Math.min(1, volume + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          onVolumeChange(Math.max(0, volume - 0.05));
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          onToggleVisualizerMode();
          break;
        case 's':
        case 'S':
          e.preventDefault();
          onShuffleToggle();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          onRepeatToggle();
          break;
        case '?':
        case 'h':
        case 'H':
          e.preventDefault();
          setShowKeyboardHud(prev => !prev);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPause, onPlay, onSeek, onVolumeChange, onToggleVisualizerMode, onShuffleToggle, onRepeatToggle, onClose, resetOverlayTimer]); // mount-only: full UI still shows on entering fullscreen and 

  // Request full OS/Browser immersive fullscreen mode (hides Android top status bar & navigation buttons)
  useEffect(() => {
    const enterFullscreenMode = async () => {
      try {
        const docEl = document.documentElement as any;
        if (!document.fullscreenElement && !docEl.webkitFullscreenElement) {
          if (docEl.requestFullscreen) {
            await docEl.requestFullscreen();
          } else if (docEl.webkitRequestFullscreen) {
            await docEl.webkitRequestFullscreen();
          } else if (docEl.msRequestFullscreen) {
            await docEl.msRequestFullscreen();
          }
        }
      } catch (err) {
        console.warn('System fullscreen request failed:', err);
      }
    };

    // Call Android native bridge methods if available (e.g. inside native Android WebView container)
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (win.AndroidMediaBridge) {
        if (typeof win.AndroidMediaBridge.hideSystemUI === 'function') {
          try { win.AndroidMediaBridge.hideSystemUI(); } catch (e) {}
        }
        if (typeof win.AndroidMediaBridge.setFullscreen === 'function') {
          try { win.AndroidMediaBridge.setFullscreen(true); } catch (e) {}
        }
      }
      if (win.AndroidFileBridge) {
        if (typeof win.AndroidFileBridge.hideSystemUI === 'function') {
          try { win.AndroidFileBridge.hideSystemUI(); } catch (e) {}
        }
        if (typeof win.AndroidFileBridge.setFullscreen === 'function') {
          try { win.AndroidFileBridge.setFullscreen(true); } catch (e) {}
        }
      }
    }

    enterFullscreenMode();

    return () => {
      // Exit fullscreen mode on exit/unmount
      if (typeof document !== 'undefined') {
        const doc = document as any;
        if (doc.fullscreenElement || doc.webkitFullscreenElement) {
          if (doc.exitFullscreen) {
            doc.exitFullscreen().catch(() => {});
          } else if (doc.webkitExitFullscreen) {
            doc.webkitExitFullscreen().catch(() => {});
          }
        }
      }

      // Restore Android native bridge system UI
      if (typeof window !== 'undefined') {
        const win = window as any;
        if (win.AndroidMediaBridge) {
          if (typeof win.AndroidMediaBridge.showSystemUI === 'function') {
            try { win.AndroidMediaBridge.showSystemUI(); } catch (e) {}
          }
          if (typeof win.AndroidMediaBridge.setFullscreen === 'function') {
            try { win.AndroidMediaBridge.setFullscreen(false); } catch (e) {}
          }
        }
        if (win.AndroidFileBridge) {
          if (typeof win.AndroidFileBridge.showSystemUI === 'function') {
            try { win.AndroidFileBridge.showSystemUI(); } catch (e) {}
          }
          if (typeof win.AndroidFileBridge.setFullscreen === 'function') {
            try { win.AndroidFileBridge.setFullscreen(false); } catch (e) {}
          }
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!currentTrack) return;
    
    setShowTrackToast(true);
    if (trackToastTimeoutRef.current) {
      clearTimeout(trackToastTimeoutRef.current);
    }
    trackToastTimeoutRef.current = setTimeout(() => {
      setShowTrackToast(false);
    }, 2500);

    return () => {
      if (trackToastTimeoutRef.current) {
        clearTimeout(trackToastTimeoutRef.current);
      }
    };
  }, [currentTrack?.id]); // only fires when the song actually changes

  // Hook resize listener with debouncing
  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        });
      }
    };

    // Immediate call on mount so the visualizer has correct dimensions 
    // right away (no debounce needed for the very first measurement)
    handleResize();

    const observer = new ResizeObserver(() => {
      // Debounce subsequent resize events (e.g. during rotation animation): 
      // wait until resize events stop firing for 150ms before applying the 
      // new dimensions, so intermediate/transitional sizes during the 
      // rotation don't each trigger a separate canvas rebuild.
      if (resizeDebounceRef.current) {
        clearTimeout(resizeDebounceRef.current);
      }
      resizeDebounceRef.current = setTimeout(() => {
        handleResize();
        resizeDebounceRef.current = null;
      }, 150);
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      if (resizeDebounceRef.current) {
        clearTimeout(resizeDebounceRef.current);
      }
    };
  }, []);

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || !isFinite(secs) || secs < 0) secs = 0;
    if (timeDisplayMode === 'remaining' && duration > 0) {
      const remainingSecs = Math.max(0, duration - secs);
      const min = Math.floor(remainingSecs / 60);
      const sec = Math.floor(remainingSecs % 60);
      return `-${min}:${sec < 10 ? '0' : ''}${sec}`;
    }
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const percentProgress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const visModes: VisualizerMode[] = [
    'spectrum',
    'radial-spectrum',
    'waveform-river',
    'kaleidoscope',
    'album-wall',
    'oscilloscope',
    'fire',
    'rainbow',
    'matrix-rain',
    'starfield-warp',
    'aurora',
    'falling-stars',
    'vfd',
    'vu-meters',
    'moloko-plus',
    'spinning-cd',
    'turntable',
    'minidisk',
    'cassette',
    'guitar-hero',
    'artwork',
    'vegas-strip',
    'skytree',
    'lava-lamp',
    'synthwave-grid',
    'plasma-globe',
    'keygen',
    'demoscene',
    'random',
    'off'
  ];

  const isPortrait = dimensions.height > dimensions.width;
  const autoRotateLandscape = isPortrait && mode === 'vu-meters';

  const visWidth = autoRotateLandscape ? dimensions.height : dimensions.width;
  const visHeight = autoRotateLandscape ? dimensions.width : dimensions.height;

  const rotationStyle = autoRotateLandscape ? {
    width: `${dimensions.height}px`,
    height: `${dimensions.width}px`,
    transform: 'rotate(90deg)',
    transformOrigin: 'center center',
    position: 'absolute' as const,
    left: `${(dimensions.width - dimensions.height) / 2}px`,
    top: `${(dimensions.height - dimensions.width) / 2}px`,
  } : {
    width: '100%',
    height: '100%',
    position: 'absolute' as const,
    left: 0,
    top: 0,
  };

  return (
    <div 
      id="fullscreen-visualizer-container"
      className="flex-1 bg-black text-neutral-200 font-sans flex flex-col relative h-full w-full overflow-hidden select-none"
      onMouseMove={resetOverlayTimer}
      onClickCapture={resetOverlayTimer}
      onTouchStart={resetOverlayTimer}
    >
      {/* 1. IMMERSIVE CANVAS BACKPLANE */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 w-full h-full z-0 cursor-pointer overflow-hidden"
        title="Double-click canvas to skip mode"
        onClick={() => resetOverlayTimer()}
        onDoubleClick={onToggleVisualizerMode}
      >
        <div style={rotationStyle}>
          <Visualizer 
            mode={mode} 
            isPlaying={isPlaying} 
            width={visWidth} 
            height={visHeight} 
            currentTime={currentTime}
            duration={duration}
            currentTrack={currentTrack}
            playHistory={playHistory}
            tracks={tracks}
          />
        </div>
      </div>

      {/* 2. GLOW OVERLAY AMBIECE FOR VINTAGE CRT CHILL */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/60 z-10" />

      {/* Lightweight track-change toast — independent of the full UI overlay */}
      {!showUiOverlay && (
        <div
          className={`absolute top-6 left-1/2 -translate-x-1/2 z-20 transition-all duration-500 pointer-events-none
            ${showTrackToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
        >
          {currentTrack && (
            <div className="bg-black/70 backdrop-blur-sm border border-amber-500/30 rounded-lg px-4 py-2 flex flex-col items-center shadow-lg">
              <div className="text-white text-xs font-bold tracking-wide max-w-[220px] truncate">
                {currentTrack.title}
              </div>
              <div className="text-amber-500/80 text-[10px] font-mono truncate max-w-[220px]">
                {currentTrack.artist}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. DYNAMIC TRANSLUCENT UI FLOATING GLASSBOARDS */}
      
      {/* A. HEADER GLASSBAR */}
      <div 
        id="fullscreen-header-overlay"
        className={`absolute top-0 inset-x-0 p-3 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent transition-all duration-500 z-20 ${
          showUiOverlay ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 max-w-[70%]">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="h-8 px-3 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/50 flex items-center justify-center gap-1.5 text-xs text-amber-500 font-bold active:scale-95 transition cursor-pointer"
            title="Return to the standard Spinamp faceplate"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>CLOSE FULLSCREEN</span>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowKeyboardHud(true);
            }}
            className="h-8 px-2.5 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/50 flex items-center justify-center gap-1 text-[11px] text-zinc-300 font-bold active:scale-95 transition cursor-pointer"
            title="View Keyboard & Touch Gesture Commands (?)"
          >
            <Keyboard className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">KEYS</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-zinc-400 bg-black/50 px-2 py-1 rounded-md border border-neutral-800">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span className="uppercase font-mono font-bold tracking-widest">{mode} CHILLOUT</span>
          </div>
        </div>

        {/* Dynamic track banner */}
        <div className="text-right flex flex-col justify-end items-end w-40 overflow-hidden">
          {currentTrack ? (
            <div className="w-full overflow-hidden">
              <MarqueeText 
                text={currentTrack.title}
                className="text-white text-[10px] font-bold tracking-wide animate-pulse"
              />
              <div className="text-amber-500/80 text-[10px] font-mono truncate">{currentTrack.artist}</div>
            </div>
          ) : (
            <div className="text-stone-500 text-xs font-mono">No music active</div>
          )}
        </div>
      </div>

      {/* B. MIDDLE HUD PANEL MODE CONTROLLER (LEFT SIDE FLOATING) */}
      <div 
        id="fullscreen-sidebar-overlay"
        className={`absolute left-3 overflow-y-auto custom-scrollbar rounded-xl bg-neutral-950/85 border border-neutral-800/80 flex flex-col transition-all duration-500 shadow-2xl z-30 ${
          isPortrait 
            ? 'top-[68px] max-h-[30vh] w-[90px] p-1 gap-1' 
            : 'top-[62px] bottom-[150px] w-28 p-2 gap-1.5'
        } ${
          showUiOverlay ? 'translate-x-0 opacity-100' : '-translate-x-16 opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[7.5px] font-bold text-neutral-500 tracking-widest text-center border-b border-neutral-800 pb-1 mb-1 font-mono uppercase shrink-0 sticky top-1 bg-neutral-950/85 py-0.5 z-10">MODES</span>
        {visModes.map((m) => (
          <button
            key={m}
            onClick={() => onSelectVisualizerMode(m)}
            className={`rounded font-mono font-bold text-left tracking-wide transform transition active:scale-95 cursor-pointer shrink-0 ${
              isPortrait ? 'px-1.5 py-0.5 text-[8.5px]' : 'px-2.5 py-1 text-[9px]'
            } ${
              mode === m 
                ? 'bg-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.45)]' 
                : 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            {m === 'starfield-warp' ? 'WARP' : m === 'matrix-rain' ? 'MATRIX' : m === 'moloko-plus' ? 'MOLOKO PLUS' : m === 'spinning-cd' ? 'SPINNING CD' : m === 'minidisk' ? 'MINIDISC' : m.replace('-', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {/* C. FOOTER GLASSRACK PLAYER CONTROLS (BOTTOM FLOATING) */}
      <div 
        id="fullscreen-footer-overlay"
        className={`absolute bottom-3 inset-x-3 p-3 rounded-2xl bg-neutral-950/90 border border-neutral-800/80 flex flex-col gap-2.5 transition-all duration-500 shadow-2xl z-20 ${
          showUiOverlay ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* TIME & TIMELINE SCRUB DECK */}
        <div className="flex items-center gap-3">
          <span 
            className="text-[10px] font-mono font-bold text-amber-500 w-10 shrink-0 cursor-pointer hover:brightness-125 select-none"
            onClick={onToggleTimeDisplayMode}
            title={timeDisplayMode === 'remaining' ? 'Click to show Elapsed' : 'Click to show Remaining'}
          >
            {formatTime(currentTime)}
          </span>
          
          <div className="flex-1 relative h-2 bg-neutral-900 border border-neutral-800 rounded-full flex items-center overflow-visible">
            <input
              id="fullscreen-vis-seek-slider"
              aria-label="Seek"
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
              disabled={!currentTrack}
            />
            <div 
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.6)] progress-fill"
              style={{ width: `${percentProgress}%` }}
            />
            {currentTrack && (
              <div 
                className="absolute w-3 h-3 bg-white border-2 border-amber-500 rounded-full shadow pointer-events-none -ml-1.5 hover:scale-110 duration-100"
                style={{ left: `${percentProgress}%` }}
              />
            )}
          </div>

          <span className="text-[10px] font-mono font-bold text-neutral-500 w-8 text-right shrink-0">
            {currentTrack ? formatTime(duration) : '0:00'}
          </span>
        </div>

        {/* AUDIO ACTIONS & UTILITIES DOCK */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          
          {/* UTILITY MATRIX: Shuffle, Repeat & Playback Speed */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={onShuffleToggle}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition active:scale-90 cursor-pointer ${
                playerState.shuffle 
                  ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.2)]'
                  : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              title="Toggle Shuffle Mode"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRepeatToggle}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition active:scale-90 cursor-pointer ${
                playerState.repeat !== 'none'
                  ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.2)]'
                  : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              title={`Repeat Settings: ${playerState.repeat.toUpperCase()}`}
            >
              <div className="relative">
                <RotateCcw className="w-3.5 h-3.5" />
                {playerState.repeat === 'one' && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-[6.5px] text-black font-extrabold w-2.5 h-2.5 rounded-full flex items-center justify-center border border-black shadow">
                    1
                  </span>
                )}
              </div>
            </button>

            {/* PLAYBACK SPEED CONTROL PILLS */}
            <div className="flex items-center gap-1 bg-neutral-900/80 p-1 rounded-lg border border-neutral-800 text-[9px] font-mono ml-1">
              <Gauge className="w-3 h-3 text-amber-500 ml-0.5 shrink-0" />
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() => {
                    spinampAudio.setUserPlaybackRate(rate);
                    setUserSpeed(rate);
                  }}
                  className={`px-1.5 py-0.5 rounded transition font-bold cursor-pointer ${
                    userSpeed === rate
                      ? 'bg-amber-500 text-black shadow-[0_0_6px_rgba(245,158,11,0.4)]'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                  title={`Playback Speed: ${rate}x`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* MAIN PLAYER ACTIONS BAR */}
          <div className="flex items-center gap-3">
            <button 
              onClick={onPrev}
              className="w-9 h-9 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 flex items-center justify-center border border-neutral-800 hover:border-neutral-700 cursor-pointer shadow transition active:scale-90"
              title="Previous Track"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>
            {isPlaying ? (
              <button 
                onClick={onPause}
                className="w-10 h-10 rounded-xl bg-amber-500 text-black flex items-center justify-center cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.5)] transition active:scale-95"
                title="Pause Playback"
              >
                <Pause className="w-4.5 h-4.5 fill-black" />
              </button>
            ) : (
              <button 
                onClick={onPlay}
                className="w-10 h-10 rounded-xl bg-amber-500 text-black flex items-center justify-center cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.5)] transition active:scale-95"
                title="Play Track"
                disabled={!currentTrack}
              >
                <Play className="w-4.5 h-4.5 fill-black" />
              </button>
            )}
            <button 
              onClick={onStop}
              className="w-9 h-9 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 flex items-center justify-center border border-neutral-800 hover:border-neutral-700 cursor-pointer shadow transition active:scale-90"
              title="Stop Playback"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
            <button 
              onClick={onNext}
              className="w-9 h-9 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 flex items-center justify-center border border-neutral-800 hover:border-neutral-700 cursor-pointer shadow transition active:scale-90"
              title="Next Track"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
          </div>

          {/* SOUND SLIDER FADER DECK */}
          <div className="flex items-center gap-2 bg-neutral-900/60 p-1.5 px-3 rounded-xl border border-neutral-800 max-w-[160px] w-full">
            <button 
              onClick={onMuteToggle} 
              className="text-neutral-400 hover:text-white cursor-pointer active:scale-90 transition shrink-0" 
              title="Toggle Audio Output Mute"
            >
              {playerState.isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-amber-500" />}
            </button>
            <input
              id="fullscreen-vis-volume-slider"
              aria-label="Volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={playerState.isMuted ? 0 : playerState.volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-neutral-850 rounded-lg appearance-none cursor-pointer accent-amber-500"
              title={`Output volume: ${Math.floor(playerState.volume * 100)}%`}
            />
          </div>

        </div>
      </div>

      {/* KEYBOARD & GESTURE SHORTCUTS HUD MODAL */}
      {showKeyboardHud && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowKeyboardHud(false)}
        >
          <div 
            className="bg-neutral-950 border border-neutral-800 p-5 rounded-2xl max-w-md w-full text-left shadow-2xl space-y-4 text-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-sm tracking-wide">
                <Keyboard className="w-4 h-4" />
                <span>KEYBOARD & TOUCH COMMANDS</span>
              </div>
              <button 
                onClick={() => setShowKeyboardHud(false)} 
                className="text-neutral-400 hover:text-white transition cursor-pointer p-1 rounded-lg hover:bg-neutral-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="bg-neutral-900/80 p-2 rounded-xl border border-neutral-800 flex justify-between items-center">
                <span className="text-neutral-400">Play / Pause</span>
                <span className="bg-black text-amber-400 px-1.5 py-0.5 rounded border border-neutral-700 font-bold">Space</span>
              </div>
              <div className="bg-neutral-900/80 p-2 rounded-xl border border-neutral-800 flex justify-between items-center">
                <span className="text-neutral-400">Seek ±5s</span>
                <span className="bg-black text-amber-400 px-1.5 py-0.5 rounded border border-neutral-700 font-bold">← / →</span>
              </div>
              <div className="bg-neutral-900/80 p-2 rounded-xl border border-neutral-800 flex justify-between items-center">
                <span className="text-neutral-400">Seek ±15s</span>
                <span className="bg-black text-amber-400 px-1.5 py-0.5 rounded border border-neutral-700 font-bold">Shift+←/→</span>
              </div>
              <div className="bg-neutral-900/80 p-2 rounded-xl border border-neutral-800 flex justify-between items-center">
                <span className="text-neutral-400">Volume ±5%</span>
                <span className="bg-black text-amber-400 px-1.5 py-0.5 rounded border border-neutral-700 font-bold">↑ / ↓</span>
              </div>
              <div className="bg-neutral-900/80 p-2 rounded-xl border border-neutral-800 flex justify-between items-center">
                <span className="text-neutral-400">Cycle Modes</span>
                <span className="bg-black text-amber-400 px-1.5 py-0.5 rounded border border-neutral-700 font-bold">M</span>
              </div>
              <div className="bg-neutral-900/80 p-2 rounded-xl border border-neutral-800 flex justify-between items-center">
                <span className="text-neutral-400">Shuffle</span>
                <span className="bg-black text-amber-400 px-1.5 py-0.5 rounded border border-neutral-700 font-bold">S</span>
              </div>
              <div className="bg-neutral-900/80 p-2 rounded-xl border border-neutral-800 flex justify-between items-center">
                <span className="text-neutral-400">Repeat</span>
                <span className="bg-black text-amber-400 px-1.5 py-0.5 rounded border border-neutral-700 font-bold">R</span>
              </div>
              <div className="bg-neutral-900/80 p-2 rounded-xl border border-neutral-800 flex justify-between items-center">
                <span className="text-neutral-400">Exit Fullscreen</span>
                <span className="bg-black text-amber-400 px-1.5 py-0.5 rounded border border-neutral-700 font-bold">Esc</span>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-[11px] text-amber-300 font-sans leading-relaxed">

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
