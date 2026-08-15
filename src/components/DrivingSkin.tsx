import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Track, PlayerState, VisualizerMode, ScreenAppearance, FontPreset, SkinType } from '../types';
import { Visualizer } from './Visualizer';
import { MarqueeText } from './MarqueeText';
import { Playlist } from './Playlist';
import { Equalizer } from './Equalizer';
import { spinampAudio } from '../utils/audioContext';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Rewind, 
  FastForward, 
  Volume2, 
  VolumeX, 
  Volume1, 
  Shuffle, 
  RotateCcw, 
  Maximize2, 
  Car, 
  Moon, 
  Sun, 
  ListMusic, 
  Sliders, 
  Sparkles, 
  ChevronDown, 
  X, 
  Music, 
  Gauge, 
  HelpCircle,
  Radio
} from 'lucide-react';

interface DrivingSkinProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: 'none' | 'all' | 'one';
  visualizerMode: VisualizerMode;
  playHistory: string[];
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
  onSelectTrack: (track: Track) => void;
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveTrack: (id: string) => void;
  onReorderTracks: (tracks: Track[]) => void;
  onToggleVisualizerMode: () => void;
  onSelectVisualizerMode: (mode: VisualizerMode) => void;
  onToggleFullscreenVisualizer: () => void;
  onClearPlaylist: () => void;
  visTheme: string;
  setVisTheme: (theme: string) => void;
  visSensitivity: number;
  setVisSensitivity: (sens: number) => void;
  timeDisplayMode?: 'elapsed' | 'remaining';
  onToggleTimeDisplayMode?: () => void;
  skin?: SkinType;
  onSkinChange?: (skin: SkinType) => void;
  skinColor?: string;
  onSkinColorChange?: (color: string) => void;
  sleepTimeLeft?: number | null;
  onToggleSleepTimer?: () => void;
  trackBPM?: number | null;
  isBpmDetecting?: boolean;
  appearance?: ScreenAppearance;
  onChangeAppearance?: (app: ScreenAppearance) => void;
  fontPreset?: FontPreset;
  onChangeFontPreset?: (font: FontPreset) => void;
  onOpenCustomSkinCreator?: () => void;
  onTriggerLlama?: () => void;
}

export const DrivingSkin: React.FC<DrivingSkinProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  shuffle,
  repeat,
  visualizerMode,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onShuffleToggle,
  onRepeatToggle,
  onSelectTrack,
  onAddFiles,
  onRemoveTrack,
  onReorderTracks,
  onToggleVisualizerMode,
  onSelectVisualizerMode,
  onToggleFullscreenVisualizer,
  onClearPlaylist,
  visTheme,
  setVisTheme,
  visSensitivity,
  setVisSensitivity,
  timeDisplayMode = 'elapsed',
  onToggleTimeDisplayMode,
  onSkinChange,
  skinColor = 'vespa-gold',
  onSkinColorChange,
  trackBPM,
  onTriggerLlama
}) => {
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'playlist' | 'equalizer' | 'modes'>('none');
  const [isDayMode, setIsDayMode] = useState<boolean>(false);

  const percentProgress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const displayTime = timeDisplayMode === 'remaining' && duration > 0
    ? `-${formatTime(duration - currentTime)}`
    : formatTime(currentTime);



  // Request full OS/Browser immersive fullscreen mode (hides Android top status bar & navigation buttons)
  useEffect(() => {
    const requestImmersive = async () => {
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn('Fullscreen request failed:', err);
      }
    };
    
    requestImmersive();
    
    return () => {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(console.warn);
      }
    };
  }, []);

  return (
    <div 
      id="driving-mode-wrapper"
      className={`w-full flex-1 min-h-[480px] flex flex-col justify-between overflow-hidden select-none font-sans relative transition-colors duration-300 ${
        isDayMode ? 'bg-zinc-200 text-zinc-950' : 'bg-neutral-950 text-white'
      }`}
    >
      {/* ========================================================= */}
      {/* TOP PORTION (~68% HEIGHT): VISUALIZER & MEDIA INFO DECK */}
      {/* ========================================================= */}
      <div 
        id="driving-top-deck"
        className="relative flex-1 min-h-0 w-full bg-black flex flex-col justify-between overflow-hidden border-b-2 border-amber-500/50 shadow-2xl cursor-pointer"
        onDoubleClick={(e) => {
          e.stopPropagation();
          onToggleVisualizerMode();
        }}
        title="Double-tap to cycle visualizer"
      >
        {/* Background Live Audio Visualizer Canvas */}
        <div className="absolute inset-0 z-0">
          <Visualizer 
            mode={visualizerMode} 
            isPlaying={isPlaying} 
            visTheme={visTheme} 
            visSensitivity={visSensitivity} 
            currentTrack={currentTrack}
            currentTime={currentTime}
            duration={duration}
          />
        </div>

        {/* Dark / High-Contrast Gradient Backdrop for Text Readability */}
        <div className={`absolute inset-0 pointer-events-none z-10 ${
          isDayMode 
            ? 'bg-gradient-to-b from-white/90 via-white/40 to-white/95' 
            : 'bg-gradient-to-b from-black/85 via-black/40 to-black/90'
        }`} />

        {/* TOP DASHBOARD NAVIGATION BAR (High-visibility driving HUD) */}
        <div className="relative z-20 p-2 sm:p-3 flex items-center justify-between gap-2 shrink-0">
          
          {/* Left: Driving Mode Badge & Day/Night Toggle */}
          <div className="flex items-center gap-2">
            <div className="bg-amber-500 text-black px-3 py-1.5 rounded-xl font-extrabold text-xs sm:text-sm tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.5)] uppercase">
              <Car className="w-4 h-4 text-black stroke-[2.5]" />
              <span>DRIVING MODE</span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDayMode(!isDayMode);
              }}
              className={`h-9 px-3 rounded-xl border flex items-center gap-1.5 font-bold text-xs transition cursor-pointer active:scale-95 ${
                isDayMode 
                  ? 'bg-amber-100 border-amber-300 text-amber-950 shadow-sm' 
                  : 'bg-neutral-900/90 border-neutral-700 text-amber-400 hover:bg-neutral-800'
              }`}
              title="Toggle Day / Night Driving High-Contrast Theme"
            >
              {isDayMode ? <Sun className="w-4 h-4 text-amber-600 fill-amber-600" /> : <Moon className="w-4 h-4 text-amber-400 fill-amber-400" />}
              <span className="hidden sm:inline font-mono uppercase text-[10px]">{isDayMode ? 'DAY' : 'NIGHT'}</span>
            </button>
          </div>

          {/* Right: Skin Selector & FULLSCREEN VISUALIZER EXPAND BUTTON */}
          <div className="flex items-center gap-2">
            {/* Skin Selector Button */}
            <div className="flex bg-neutral-900/90 border border-neutral-700 p-0.5 rounded-xl gap-0.5 text-xs font-bold h-9 items-center pointer-events-auto">
              <button
                onClick={(e) => { e.stopPropagation(); onSkinChange?.('bento'); }}
                className="px-2.5 h-full flex items-center justify-center rounded-lg text-neutral-300 hover:text-white transition cursor-pointer"
                title="Switch to Bento 🍱 Layout"
              >
                🍱 Bento
              </button>
              <button
                className="px-2.5 h-full flex items-center justify-center rounded-lg bg-amber-500 text-black font-extrabold shadow-sm cursor-default pointer-events-none"
                title="Currently in Driving 🚗 Mode"
              >
                🚗 Driving
              </button>
            </div>

            {/* FULL SCREEN VISUALIZER BUTTON */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFullscreenVisualizer();
              }}
              className="h-9 px-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.6)] cursor-pointer active:scale-95 transition pointer-events-auto"
              title="Switch Visualizer to Full Screen"
            >
              <Maximize2 className="w-4 h-4 stroke-[3]" />
              <span className="hidden md:inline">FULL SCREEN</span>
            </button>
          </div>
        </div>

        {/* MIDDLE TRACK METADATA DISPLAY (Large, high-contrast Automobile Typography) */}
        <div className="relative z-20 px-4 sm:px-8 py-2 flex flex-col md:flex-row items-center gap-4 my-auto">
          {/* Album Cover / Vinyl Disc */}
          <div className="relative shrink-0 group">
            {currentTrack?.coverUrl ? (
              <img 
                src={currentTrack.coverUrl} 
                alt={currentTrack.title} 
                className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl object-cover border-2 border-amber-500/80 shadow-[0_0_25px_rgba(245,158,11,0.4)]"
              />
            ) : (
              <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl bg-neutral-900 border-2 border-amber-500/80 flex items-center justify-center text-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.4)]">
                <Music className="w-10 h-10 sm:w-14 sm:h-14 animate-pulse" />
              </div>
            )}
            
            {/* Playing Badge */}
            {isPlaying && (
              <div className="absolute -top-2 -right-2 bg-emerald-500 text-black p-1.5 rounded-full border-2 border-black shadow-lg animate-bounce">
                <Sparkles className="w-4 h-4 fill-black" />
              </div>
            )}
          </div>

          {/* Title & Artist Text Block */}
          <div className="flex-1 min-w-0 text-center md:text-left space-y-1">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs font-mono font-bold text-amber-500 uppercase tracking-widest">
              <span>{currentTrack?.genre || 'CHILL / SYNTH'}</span>
              {trackBPM && <span className="bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 text-amber-400">⚡ {trackBPM} BPM</span>}
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleVisualizerMode(); }}
                className="bg-neutral-800/80 hover:bg-neutral-700 text-zinc-300 hover:text-amber-400 px-2 py-0.5 rounded border border-neutral-700 text-[10px] cursor-pointer flex items-center gap-1"
                title="Switch Visualizer Mode"
              >
                <Radio className="w-3 h-3 text-amber-400" />
                <span>VIS: {visualizerMode.toUpperCase()}</span>
              </button>
            </div>

            <div className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight text-amber-400 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] truncate">
              {currentTrack ? (
                <MarqueeText text={currentTrack.title} className="font-black" />
              ) : (
                'NO TRACK SELECTED'
              )}
            </div>

            <div className="text-base sm:text-lg md:text-xl font-bold text-zinc-200 truncate">
              {currentTrack?.artist || 'Select or Load Audio Files'}
            </div>
            
            {currentTrack?.album && (
              <div className="text-xs sm:text-sm font-semibold text-zinc-400 truncate">
                {currentTrack.album}
              </div>
            )}
          </div>

          {/* Time Readout Box */}
          <div className="shrink-0 bg-neutral-900/90 border border-amber-500/40 p-3 rounded-2xl flex flex-col items-center justify-center shadow-lg min-w-[120px]">
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleTimeDisplayMode?.(); }}
              className="text-2xl sm:text-3xl font-mono font-black text-amber-400 cursor-pointer hover:text-amber-300 transition"
              title="Click to toggle Elapsed / Remaining time"
            >
              {displayTime}
            </button>
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mt-0.5">
              / {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* BOTTOM PROGRESS SCRUBBER (Thick, touch-friendly driving seek bar) */}
        <div className="relative z-20 px-4 sm:px-8 pb-3 w-full shrink-0">
          <div className="relative h-3 bg-neutral-900 border border-neutral-700 rounded-full overflow-hidden flex items-center cursor-pointer shadow-inner">
            <input 
              id="driving-mode-seek-slider"
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              aria-label="Seek track position"
            />
            <div 
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 shadow-[0_0_12px_rgba(245,158,11,0.8)]"
              style={{ width: `${percentProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BOTTOM PORTION (~32% HEIGHT): LARGE ESSENTIAL CONTROLS DECK */}
      {/* ========================================================= */}
      <div 
        id="driving-bottom-deck"
        className={`h-[32%] min-h-[150px] max-h-[220px] border-t-2 border-amber-500/40 p-2 sm:p-3 flex flex-col justify-around gap-2 relative z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.9)] ${
          isDayMode ? 'bg-zinc-100 border-zinc-300' : 'bg-neutral-900'
        }`}
      >
        {/* ROW 1: HUGE TRANSPORT BUTTONS (Extra-large touch areas for safe driving) */}
        <div className="grid grid-cols-5 gap-2 sm:gap-3 items-center w-full max-w-5xl mx-auto">
          {/* Rewind 10s */}
          <button
            onClick={() => onSeek(Math.max(0, currentTime - 10))}
            className="h-14 sm:h-16 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-amber-400 border border-neutral-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer shadow-md transition font-mono font-bold"
            title="Rewind 10 Seconds"
          >
            <Rewind className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 fill-amber-400" />
            <span className="text-[10px] font-extrabold uppercase mt-0.5">-10s</span>
          </button>

          {/* Previous Track */}
          <button
            onClick={onPrev}
            className="h-14 sm:h-16 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-white border border-neutral-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer shadow-md transition font-extrabold"
            title="Previous Track"
          >
            <SkipBack className="w-6 h-6 sm:w-7 sm:h-7 fill-white" />
            <span className="text-[10px] uppercase mt-0.5 tracking-wider hidden sm:inline">PREV</span>
          </button>

          {/* HUGE MAIN PLAY / PAUSE BUTTON */}
          <button
            onClick={isPlaying ? onPause : onPlay}
            className={`h-16 sm:h-20 ${
              isPlaying 
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_30px_rgba(245,158,11,0.7)]' 
                : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_30px_rgba(16,185,129,0.7)]'
            } active:scale-95 border-2 border-white/40 rounded-3xl flex items-center justify-center gap-3 cursor-pointer transition font-black text-lg sm:text-xl uppercase tracking-wider`}
            title={isPlaying ? 'Pause Playback' : 'Start Playback'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-8 h-8 sm:w-10 sm:h-10 fill-black text-black" />
                <span className="hidden xs:inline">PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-black text-black ml-1" />
                <span className="hidden xs:inline">PLAY</span>
              </>
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={onNext}
            className="h-14 sm:h-16 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-white border border-neutral-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer shadow-md transition font-extrabold"
            title="Next Track"
          >
            <SkipForward className="w-6 h-6 sm:w-7 sm:h-7 fill-white" />
            <span className="text-[10px] uppercase mt-0.5 tracking-wider hidden sm:inline">NEXT</span>
          </button>

          {/* Fast Forward 10s */}
          <button
            onClick={() => onSeek(Math.min(duration, currentTime + 10))}
            className="h-14 sm:h-16 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-amber-400 border border-neutral-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer shadow-md transition font-mono font-bold"
            title="Fast Forward 10 Seconds"
          >
            <FastForward className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 fill-amber-400" />
            <span className="text-[10px] font-extrabold uppercase mt-0.5">+10s</span>
          </button>
        </div>

        {/* ROW 2: VOLUME, SHUFFLE, REPEAT & QUEUE DRAWER TRIGGERS */}
        <div className="flex items-center justify-between gap-2 max-w-5xl mx-auto w-full">
          {/* VOLUME CONTROL BAR */}
          <div className="flex items-center gap-1.5 bg-neutral-950/80 border border-neutral-800 p-1.5 rounded-2xl">
            <button
              onClick={onMuteToggle}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isMuted ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-neutral-800 text-amber-400 border-neutral-700'
              }`}
              title="Toggle Mute"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* VOL - */}
            <button
              onClick={() => onVolumeChange(Math.max(0, volume - 0.1))}
              className="h-10 px-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl text-amber-400 font-black text-sm active:scale-90 transition cursor-pointer"
              title="Decrease Volume"
            >
              VOL -
            </button>

            {/* Volume Readout / Mini Slider */}
            <div className="hidden sm:flex items-center gap-2 px-2">
              <input
                id="driving-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-20 md:w-28 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                aria-label="Volume slider"
              />
              <span className="text-xs font-mono font-bold text-amber-400 min-w-[36px]">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>

            {/* VOL + */}
            <button
              onClick={() => onVolumeChange(Math.min(1, volume + 0.1))}
              className="h-10 px-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl text-amber-400 font-black text-sm active:scale-90 transition cursor-pointer"
              title="Increase Volume"
            >
              VOL +
            </button>
          </div>

          {/* UTILITY SHUFFLE & REPEAT BUTTONS */}
          <div className="flex items-center gap-2">
            <button
              onClick={onShuffleToggle}
              className={`h-11 px-3 sm:px-4 rounded-xl border font-bold text-xs flex items-center gap-2 transition cursor-pointer active:scale-95 ${
                shuffle
                  ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'bg-neutral-800 text-zinc-300 border-neutral-700 hover:bg-neutral-700'
              }`}
              title="Toggle Shuffle"
            >
              <Shuffle className="w-4 h-4" />
              <span className="hidden md:inline">SHUFFLE</span>
            </button>

            <button
              onClick={onRepeatToggle}
              className={`h-11 px-3 sm:px-4 rounded-xl border font-bold text-xs flex items-center gap-2 transition cursor-pointer active:scale-95 ${
                repeat !== 'none'
                  ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'bg-neutral-800 text-zinc-300 border-neutral-700 hover:bg-neutral-700'
              }`}
              title={`Repeat mode: ${repeat}`}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden md:inline">{repeat === 'one' ? 'REPEAT 1' : 'REPEAT ALL'}</span>
            </button>

            {/* OPEN PLAYLIST QUEUE DRAWER BUTTON */}
            <button
              onClick={() => setActiveDrawer(activeDrawer === 'playlist' ? 'none' : 'playlist')}
              className={`h-11 px-3 sm:px-4 rounded-xl border font-black text-xs uppercase flex items-center gap-2 transition cursor-pointer active:scale-95 ${
                activeDrawer === 'playlist'
                  ? 'bg-amber-500 text-black border-white shadow-lg'
                  : 'bg-neutral-800 text-amber-400 border-neutral-700 hover:bg-neutral-700'
              }`}
              title="Open Playlist Queue Drawer"
            >
              <ListMusic className="w-4 h-4" />
              <span>QUEUE ({tracks.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* DRIVER TOUCH-FRIENDLY PLAYLIST OVERLAY DRAWER */}
      {/* ========================================================= */}
      {activeDrawer === 'playlist' && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col justify-end animate-fade-in"
          onClick={() => setActiveDrawer('none')}
        >
          <div 
            className="bg-neutral-950 border-t-2 border-amber-500/80 rounded-t-3xl max-h-[80vh] h-[550px] w-full max-w-4xl mx-auto flex flex-col p-4 shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-amber-500 font-extrabold text-base">
                <ListMusic className="w-5 h-5" />
                <span>DRIVING QUEUE & PLAYLIST</span>
              </div>
              <button 
                onClick={() => setActiveDrawer('none')}
                className="p-2 bg-neutral-900 hover:bg-neutral-800 rounded-xl text-neutral-300 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              <Playlist
                tracks={tracks}
                currentTrack={currentTrack}
                onSelectTrack={(t) => {
                  onSelectTrack(t);
                  setActiveDrawer('none');
                }}
                onAddFiles={onAddFiles}
                onRemoveTrack={onRemoveTrack}
                onReorderTracks={onReorderTracks}
                onClearPlaylist={onClearPlaylist}
                skin="bento"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
