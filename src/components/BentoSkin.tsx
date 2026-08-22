import React, { useState, useCallback } from 'react';
import spinampLogo from '../assets/logo.png';
import { Track, PlayerState, VisualizerMode, ScreenAppearance, FontPreset, SkinType } from '../types';
import { Visualizer } from './Visualizer';
import { UnifiedTrackScreen } from './UnifiedTrackScreen';
import { MarqueeText } from './MarqueeText';
import { Playlist } from './Playlist';
import { Equalizer } from './Equalizer';
import { MediaLibrary } from './MediaLibrary';
import { 
  Play, Pause, Square, SkipBack, SkipForward, FolderOpen, 
  Volume2, VolumeX, Shuffle, RotateCcw, Library, Sliders, Maximize2, 
  ListMusic, BookOpen
} from 'lucide-react';

interface SeekBarProps {
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  hasTrack: boolean;
  className?: string;
  isLandscape?: boolean;
}

const SeekBar: React.FC<SeekBarProps> = React.memo(({
  currentTime,
  duration,
  onSeek,
  hasTrack,
  className = '',
  isLandscape = false
}) => {
  const percentProgress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || !isFinite(secs) || secs < 0) return '0:00';
    const min = Math.floor(secs / 60);
    const sec = Math.floor(secs % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      <div className={`relative ${isLandscape ? 'h-1.5' : 'h-2'} bg-[#090a0b] border border-neutral-900 rounded-full flex items-center overflow-visible`}>
        <input
          id="bento-seek-slider"
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          disabled={!hasTrack}
          aria-label="Playback position"
          aria-valuemin={0}
          aria-valuemax={duration || 100}
          aria-valuenow={currentTime}
        />
        <div 
          className="h-full bg-gradient-to-r from-amber-600 to-amber-500 rounded-full shadow-[0_0_6px_rgba(245,158,11,0.5)] transition-all"
          style={{ width: `${percentProgress}%` }}
        />
        {hasTrack && (
          <div 
            className={`absolute ${isLandscape ? 'w-2.5 h-2.5' : 'w-3 h-3'} bg-white border border-neutral-800 rounded-full shadow pointer-events-none -ml-1`}
            style={{ left: `${percentProgress}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-[9px] text-neutral-400 font-mono select-none">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
});

import { spinampAudio } from '../utils/audioContext';

interface BentoSkinProps {
  isLandscape?: boolean;
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
  onRateTrack: (id: string, rating: number) => void;
  onReorderTracks: (tracks: Track[]) => void;
  onTriggerLlama: () => void;
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
  skinColor?: string;
  onSkinColorChange?: (color: string) => void;
  sleepTimeLeft?: number | null;
  onToggleSleepTimer?: () => void;
  trackBPM?: number | null;
  isBpmDetecting?: boolean;
  onResetToDefaults?: () => void;
  appearance?: ScreenAppearance;
  onChangeAppearance?: (app: ScreenAppearance) => void;
  fontPreset?: FontPreset;
  onChangeFontPreset?: (font: FontPreset) => void;
  onOpenCustomSkinCreator?: () => void;
  skin?: SkinType;
  onSkinChange?: (skin: SkinType) => void;
  loadingFilesMessage?: string;
  onSetLoadingMessage?: (msg: string | null) => void;
  onReimportTrack?: (id: string) => void;
  onAddRippedTracks?: (newTracks: Track[]) => void;
}

export const BentoSkin = React.memo(({
  isLandscape = false,
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
  visTheme,
  setVisTheme,
  visSensitivity,
  setVisSensitivity,
  playHistory,
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
  onSelectTrack,
  onAddFiles,
  onRemoveTrack,
  onRateTrack,
  onReorderTracks,
  onTriggerLlama,
  onToggleVisualizerMode,
  onSelectVisualizerMode,
  onToggleFullscreenVisualizer,
  onClearPlaylist,
  timeDisplayMode = 'elapsed',
  onToggleTimeDisplayMode,
  skinColor = 'classic-steel',
  onSkinColorChange,
  sleepTimeLeft = null,
  onToggleSleepTimer,
  trackBPM = null,
  isBpmDetecting = false,
  onResetToDefaults,
  appearance,
  onChangeAppearance,
  fontPreset,
  onChangeFontPreset,
  onOpenCustomSkinCreator,
  skin = 'bento',
  onSkinChange,
  loadingFilesMessage,
  onSetLoadingMessage,
  onReimportTrack,
  onAddRippedTracks,
}: BentoSkinProps) => {
  const [bentoTab, setBentoTab] = useState<'playlist' | 'equalizer' | 'library' | 'manual'>('playlist');
  const [isSkinDropdownOpen, setIsSkinDropdownOpen] = useState(false);

  const audioStats = React.useMemo(() => {
    let kbps = 192;
    let khz = 44.1;

    // Kbps heuristic
    if (currentTrack?.file && duration > 0 && Number.isFinite(duration)) {
      const bits = currentTrack.file.size * 8;
      const kbits = bits / 1000;
      kbps = Math.min(Math.max(Math.round(kbits / duration), 64), 1411);
    } else if (currentTrack?.url) {
      kbps = 128; // standard stream fallback
    }

    // kHz heuristic
    try {
      const ctx = spinampAudio.getAnalyser()?.context;
      if (ctx) {
        khz = ctx.sampleRate / 1000;
      }
    } catch(e) {}

    return {
      kbps: `${kbps}KBPS`,
      khz: khz === Math.round(khz) ? `${khz}.0KHZ` : `${khz}KHZ`,
      combined: `${kbps}K • ${khz === Math.round(khz) ? khz + '.0' : khz}K`
    };
  }, [currentTrack, duration]);

  const getActiveSkinNameAndColor = () => {
    if (appearance === 'custom') {
      return { name: 'Custom Retro 🎛️', color: '#f97316' };
    }
    if (skinColor === 'vespa-gold' && appearance === 'default') {
      return { name: 'Orange Default 🍊', color: '#fb923c' };
    }
    if (skinColor === 'classic-steel') {
      return { name: 'Bento Classic 🍱', color: '#ff9100' };
    }
    if (skinColor === 'midnight-violet') {
      return { name: 'Midnight Violet 🌌', color: '#c084fc' };
    }
    if (skinColor === 'cobalt-blue') {
      return { name: 'Cobalt Blue 🌊', color: '#06b6d4' };
    }
    if (skinColor === 'toxic-spill') {
      return { name: 'Toxic Matrix ☣️', color: '#10b981' };
    }
    if (skinColor === 'crimson-ruby') {
      return { name: 'Red Fury 4 🩸', color: '#ff0000' };
    }
    if (skinColor === 'walnut-hifi') {
      return { name: 'Walnut Hi-Fi 🪵', color: '#ecc15c' };
    }
    if (skinColor === 'neon-synth') {
      return { name: 'Neon Synthwave ⚡', color: '#ff007f' };
    }
    if (skinColor === 'hazard-industrial') {
      return { name: 'Hazard Caution 🚧', color: '#eab308' };
    }
    return { name: 'Orange Default 🍊', color: '#fb923c' };
  };
  const activeSkin = getActiveSkinNameAndColor();

  const handleDownloadManual = useCallback(async () => {
    try {
      const { generateManualPdf } = await import('../utils/generateManualPdf');
      generateManualPdf(tracks.length, activeSkin.name);
    } catch (err) {
      console.error('Failed to load PDF generator:', err);
    }
  }, [tracks.length, activeSkin.name]);

  // Formatting helpers
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || !isFinite(secs) || secs < 0) secs = 0;
    if (timeDisplayMode === 'remaining' && duration > 0) {
      const remainingSecs = Math.max(0, duration - secs);
      const min = Math.floor(remainingSecs / 60);
      const sec = Math.floor(remainingSecs % 60);
      return `-${min}:${sec < 10 ? '0' : ''}${sec}`;
    }
    const min = Math.floor(secs / 60);
    const sec = Math.floor(secs % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  if (isLandscape) {
    return (
      <div id="spinamp-bento-skin-main-landscape" className="flex-1 bg-[#1a1b1e] border-t border-[#121314] text-neutral-300 font-sans p-3.5 select-none h-full overflow-hidden flex flex-row gap-4">
        {/* LEFT COLUMN: Main Controls & LED Display */}
        <div className="flex-[4] flex flex-col gap-2.5 overflow-y-auto max-h-full pr-1.5 shrink-0 select-none custom-scrollbar border-r border-neutral-800/60 pr-4">
          {/* 1. TOP HEADER BRAND PANEL */}
          <div id="bento-logo-strip-landscape" className="flex justify-between items-center bg-[#131416] border border-[#2b2d31] p-2 px-3 rounded-md shadow-inner shrink-0 leading-none">
            <div className="flex items-center gap-2">
              {/* Spinamp App Logo */}
              <img
                src={spinampLogo}
                alt="Spinamp Logo"
                className="w-[28px] h-[28px] rounded-lg object-cover border border-neutral-700 shadow-sm shrink-0"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = '/spinamp_logo.jpg';
                }}
              />
              <span className="text-[11.5px] font-extrabold text-amber-500 uppercase tracking-widest leading-none">SPINAMP RETRO PLAYER</span>
              
              {/* SKIN BUTTON CHIP */}
              <div className="relative group/skin ml-1">
                <button
                  id="bento-skin-picker-trigger-landscape"
                  onClick={() => setIsSkinDropdownOpen(!isSkinDropdownOpen)}
                  className="h-7 px-2 text-[9px] bg-[#1a1b1e] hover:bg-neutral-800 border border-neutral-700 hover:border-amber-500/80 text-amber-400 font-bold rounded-md cursor-pointer transition-all uppercase flex items-center gap-1.5 shrink-0 whitespace-nowrap text-left shadow-sm"
                  title="Click to switch skin colors"
                  aria-label="Switch skin colors"
                  aria-haspopup="listbox"
                  aria-expanded={isSkinDropdownOpen}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" style={{ backgroundColor: activeSkin.color }} />
                  <span>{activeSkin.name}</span>
                  <span className="text-[6.5px] opacity-70">▼</span>
                </button>
                
                {/* Floating Skin Selection List */}
                <div id="skin-menu-dropdown-landscape" className={`absolute left-0 top-full mt-1 ${isSkinDropdownOpen ? 'block' : 'hidden md:group-hover/skin:block'} bg-[#16171a] border border-neutral-700/80 rounded-md shadow-2xl py-1 w-48 z-[100] animate-fade-in`}>
                  <div className="px-2.5 py-1 text-[7.5px] text-neutral-500 font-bold uppercase tracking-wider border-b border-neutral-800 mb-1">Select Soundskin</div>
                  {[
                    { id: 'orange-default', name: 'Orange Default 🍊', color: '#fb923c' },
                    { id: 'classic-steel', name: 'Bento Classic 🍱', color: '#ff9100' },
                    { id: 'midnight-violet', name: 'Midnight Violet 🌌', color: '#c084fc' },
                    { id: 'cobalt-blue', name: 'Cobalt Blue 🌊', color: '#00f2fe' },
                    { id: 'toxic-spill', name: 'Toxic Matrix ☣️', color: '#10b981' },
                    { id: 'crimson-ruby', name: 'Red Fury 4 🩸', color: '#ff052b' },
                    { id: 'walnut-hifi', name: 'Walnut Hi-Fi 🪵', color: '#ecc15c' },
                    { id: 'neon-synth', name: 'Neon Synthwave ⚡', color: '#ff007f' },
                    { id: 'hazard-industrial', name: 'Hazard Caution 🚧', color: '#eab308' },
                    { id: 'create-custom', name: 'Create Custom Skin 🧪', color: '#f97316' }
                  ].map((s) => {
                    const isSelected = s.id === 'create-custom' ? (appearance === 'custom') :
                                       s.id === 'orange-default' ? (skinColor === 'vespa-gold' && appearance === 'default') :
                                       (skinColor === s.id && appearance !== 'custom');
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          if (s.id === 'create-custom') {
                            onOpenCustomSkinCreator?.();
                          } else if (s.id === 'orange-default') {
                            onSkinColorChange?.('vespa-gold');
                            onChangeAppearance?.('default');
                          } else {
                            onSkinColorChange?.(s.id);
                          }
                          setIsSkinDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 text-[9.5px] hover:bg-neutral-800 flex items-center justify-between cursor-pointer font-bold ${
                          isSelected ? 'text-amber-500 font-bold bg-neutral-800/20' : 'text-neutral-300'
                        }`}
                      >
                        <span>{s.name}</span>
                        {s.id !== 'create-custom' && (
                          <span className="w-2.5 h-2.5 rounded-full border border-black/40 shadow-sm shrink-0 ml-2" style={{ backgroundColor: s.color }} />
                        )}
                        {isSelected && s.id === 'create-custom' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}

                  {onResetToDefaults && (
                    <div className="border-t border-neutral-800 mt-1 pt-1">
                      <button
                        onClick={() => {
                          onResetToDefaults();
                          setIsSkinDropdownOpen(false);
                        }}
                        className="w-full text-left px-2 py-1 text-[8.5px] hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 cursor-pointer font-bold uppercase flex items-center gap-1 transition-colors"
                        title="Reset player to default settings"
                      >
                        <span>⚠️ Restore Defaults</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex bg-[#101113] border border-neutral-700/80 p-0.5 rounded-md text-[9px] font-bold h-7 items-center">
                <button
                  onClick={() => onSkinChange?.('bento')}
                  className={`px-2 h-full flex items-center justify-center rounded transition cursor-pointer ${
                    skin === 'bento' ? 'bg-amber-500 text-black font-extrabold shadow-xs' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Switch to Bento 🍱 Layout"
                >
                  🍱 Bento
                </button>
                <button
                  onClick={() => onSkinChange?.('driving')}
                  className={`px-2 h-full flex items-center justify-center rounded transition cursor-pointer ${
                    skin === 'driving' ? 'bg-amber-500 text-black font-extrabold shadow-xs' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Switch to Driving 🚗 Mode"
                >
                  🚗 Driving
                </button>
              </div>
              <div className="text-[9px] text-amber-500 font-bold uppercase tracking-wider text-right hidden lg:block">Llama Whipper</div>
            </div>
          </div>

          {/* 2. CORE DIGITAL LED SCREEN / AUDIO INDICATOR DECK */}
          <div id="bento-led-screen-landscape" className="bg-[#101113] border border-[#232428] p-2.5 rounded-lg flex flex-col gap-2 shadow-inner shrink-0">
            <UnifiedTrackScreen
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              trackBPM={trackBPM}
              isBpmDetecting={isBpmDetecting}
              sleepTimeLeft={sleepTimeLeft}
              onToggleSleepTimer={() => onToggleSleepTimer?.()}
              timeDisplayMode={timeDisplayMode}
              onToggleTimeDisplayMode={() => onToggleTimeDisplayMode?.()}
              formatTime={formatTime}
              skin="bento"
              appearance={appearance}
              onChangeAppearance={onChangeAppearance}
              fontPreset={fontPreset}
              onChangeFontPreset={onChangeFontPreset}
            />

            {/* Dynamic visualizer window with Fullscreen button */}
            <div 
              onClick={onToggleVisualizerMode}
              className="h-[88px] bg-[#0c0d0f] border border-[#1e2024] p-0.5 rounded-md cursor-pointer relative group shadow-inner"
              title="Click to alternate styles!"
              id="visualizer-boundary-trigger-landscape"
            >
              {visualizerMode === 'off' && currentTrack?.coverUrl ? (
                <div 
                  className="w-full h-full relative overflow-hidden rounded bg-cover bg-center flex flex-col justify-end p-2"
                  style={{ backgroundImage: `url(${currentTrack.coverUrl})` }}
                >
                  {/* Subtle blur overlay */}
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
                  {/* Subtle vignette overlay */}
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.8) 100%)' }} />
                  {/* Retro styled track info */}
                  <div className="relative z-10 flex flex-col pointer-events-none text-left">
                    <span className="text-[10px] font-black tracking-wide text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.95)] truncate">
                      {currentTrack.title}
                    </span>
                    <span className="text-[8px] font-semibold text-amber-400 drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.95)] truncate">
                      {currentTrack.artist} {currentTrack.album ? `• ${currentTrack.album}` : ''}
                    </span>
                  </div>
                </div>
              ) : (
                <Visualizer mode={visualizerMode} isPlaying={isPlaying} currentTime={currentTime} duration={duration} currentTrack={currentTrack} visTheme={visTheme} setVisTheme={setVisTheme} visSensitivity={visSensitivity} setVisSensitivity={setVisSensitivity} trackBPM={trackBPM} playHistory={playHistory} tracks={tracks} />
              )}

              <span className="absolute bottom-0.5 right-1.5 text-[6.5px] text-neutral-600 font-mono select-none uppercase tracking-wider group-hover:text-amber-500 pointer-events-none">
                MODE: {visualizerMode}
              </span>
            </div>

            {/* Stats indicators line */}
            <div id="track-telemetry-strip-landscape" className="flex justify-between items-center text-[8px] font-mono text-neutral-500 select-none border-t border-[#1a1b1e] pt-1.5">
              <div className="flex items-center gap-1">
                <span>{audioStats.combined}</span>
              </div>

              {/* Fullscreen & Sleep Row */}
              <div className="flex items-center gap-1.5">
                {/* Fullscreen activation button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFullscreenVisualizer();
                  }}
                  className="h-7 px-2.5 bg-[#25272b] hover:bg-[#2c2f33] border border-[#2f3136] rounded-md flex items-center justify-center gap-1.5 text-[10px] font-semibold active:scale-95 transition duration-150 cursor-pointer shadow-sm text-neutral-300"
                  title="Open fullscreen view"
                  aria-label="Open fullscreen visualizer"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>FULLSCREEN</span>
                </button>

                {/* Sleep button next to Fullscreen */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSleepTimer?.();
                  }}
                  className={`h-7 px-2.5 rounded-md border flex items-center justify-center gap-1.5 text-[10px] font-semibold active:scale-95 transition duration-150 cursor-pointer shadow-sm ${
                    sleepTimeLeft !== null 
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 font-bold animate-pulse' 
                      : 'bg-[#25272b] border-[#2f3136] text-neutral-300 hover:bg-[#2c2f33]'
                  }`}
                  title="Sleep Timer: Click to cycle options (15m, 30m, 45m, 60m, off)"
                  aria-label={sleepTimeLeft !== null ? `Sleep Timer active, ${Math.floor(sleepTimeLeft / 60)} minutes remaining` : "Sleep Timer"}
                  aria-pressed={sleepTimeLeft !== null}
                >
                  <span>⏱️ {sleepTimeLeft !== null ? `${Math.floor(sleepTimeLeft / 60)}:${(sleepTimeLeft % 60) < 10 ? '0' : ''}${sleepTimeLeft % 60}` : 'SLEEP'}</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={shuffle ? 'text-amber-500 font-bold' : 'text-neutral-600'}>SHUF</span>
                <span className={repeat !== 'none' ? 'text-amber-500 font-bold' : 'text-neutral-600'}>REP</span>
              </div>
            </div>
          </div>

          {/* 3. TRACK TIMELINE PROGRESS SCRUBBER */}
          <div id="bento-progress-scrubber-landscape" className="bg-[#141517] border border-[#232428] p-1.5 rounded-lg flex flex-col gap-1 shrink-0">
            <SeekBar currentTime={currentTime} duration={duration} onSeek={onSeek} hasTrack={!!currentTrack} isLandscape={true} />
          </div>

          {/* 4. MAIN SOUND DECK (VOLUME & PLAYER ACTION COMBINED) */}
          <div id="bento-sound-deck-landscape" className="grid grid-cols-[1fr_95px] gap-2 items-center bg-[#1c1d21] border border-[#2b2d31] p-1.5 rounded-lg shrink-0">
            <div className="flex justify-between items-center" id="main-playback-buttons-landscape">
              <button 
                onClick={onPrev}
                className="w-7 h-7 rounded-md bg-[#25272b] hover:bg-[#2e3135] active:bg-[#1a1c1e] text-neutral-200 flex items-center justify-center border border-[#2f3136] cursor-pointer shadow-sm active:scale-95 transition-all"
                title="Previous track"
                aria-label="Previous track"
              >
                <SkipBack className="w-3.5 h-3.5 fill-current" />
              </button>
              {isPlaying ? (
                <button 
                  onClick={onPause}
                  className="w-7.5 h-7.5 rounded-md bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-900 flex items-center justify-center border border-amber-600 cursor-pointer shadow active:scale-95 transition-all"
                  title="Pause music"
                  aria-label="Pause"
                >
                  <Pause className="w-3.5 h-3.5 fill-neutral-900" />
                </button>
              ) : (
                <button 
                  onClick={onPlay}
                  className="w-7.5 h-7.5 rounded-md bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-900 flex items-center justify-center border border-amber-600 cursor-pointer shadow active:scale-95 transition-all"
                  title="Play loaded track"
                  disabled={!currentTrack}
                  aria-label="Play"
                >
                  <Play className="w-3.5 h-3.5 fill-neutral-900" />
                </button>
              )}
              <button 
                onClick={onStop}
                className="w-7 h-7 rounded-md bg-[#25272b] hover:bg-[#2e3135] active:bg-[#1a1c1e] text-neutral-200 flex items-center justify-center border border-[#2f3136] cursor-pointer shadow-sm active:scale-95 transition-all"
                title="Stop music"
                aria-label="Stop"
              >
                <Square className="w-3" />
              </button>
              <button 
                onClick={onNext}
                className="w-7 h-7 rounded-md bg-[#25272b] hover:bg-[#2e3135] active:bg-[#1a1c1e] text-neutral-200 flex items-center justify-center border border-[#2f3136] cursor-pointer shadow-sm active:scale-95 transition-all"
                title="Next track"
                aria-label="Next track"
              >
                <SkipForward className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-[#131416] border border-[#2a2c31] px-1 py-1 rounded-md" id="volume-fader-deck-landscape">
              <button 
                onClick={onMuteToggle} 
                className="text-neutral-400 hover:text-white cursor-pointer" 
                title="Toggle Mute"
                aria-label={isMuted ? "Unmute" : "Mute"}
                aria-pressed={isMuted}
              >
                {isMuted ? <VolumeX className="w-3 text-rose-500" /> : <Volume2 className="w-3 text-amber-500" />}
              </button>
              <input
                id="bento-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                title={`Volume: ${Math.floor(volume * 100)}%`}
                aria-label="Volume Level"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.floor((isMuted ? 0 : volume) * 100)}
              />
            </div>
          </div>

          {/* 5. USER PLAYBACK REPEAT/SHUFFLE MATRIX BUTTONS */}
          <div id="shuffle-repeat-actions-landscape" className="flex justify-between gap-1.5 shrink-0">
            <button
              onClick={onShuffleToggle}
              className={`flex-1 py-1 rounded-md border flex items-center justify-center gap-1 text-[10px] font-semibold cursor-pointer transition ${
                shuffle 
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 shadow-sm' 
                  : 'bg-[#25272b] border-[#2f3136] text-neutral-400 hover:bg-[#2c2f33]'
              }`}
              title="Toggle Shuffle"
              aria-label="Toggle Shuffle"
              aria-pressed={shuffle}
            >
              <Shuffle className="w-3 h-3" /> SHUF
            </button>
            <button
              onClick={onRepeatToggle}
              className={`flex-1 py-1 rounded-md border flex items-center justify-center gap-1 text-[10px] font-semibold cursor-pointer transition ${
                repeat !== 'none'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 shadow-sm' 
                  : 'bg-[#25272b] border-[#2f3136] text-neutral-500 hover:bg-[#2c2f33]'
              }`}
              title="Repeat Mode"
              aria-label={`Repeat mode: ${repeat}`}
              aria-pressed={repeat !== 'none'}
            >
              <RotateCcw className="w-3 h-3" /> REP: {repeat.toUpperCase()}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Tab selector workspace */}
        <div className="flex-[6] flex flex-col gap-2.5 overflow-hidden h-full">
          {/* 6. MODULAR Bento WORKSPACE SELECTOR TABS */}
          <div id="bento-workspace-tabs-landscape" className="flex border-b border-neutral-800 shrink-0" style={{ marginBottom: '-4px' }} role="tablist" aria-label="Bento Workspace Tabs">
            <button
              onClick={() => setBentoTab('playlist')}
              className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wider border-b-2 flex items-center justify-center gap-1.5 transition select-none cursor-pointer ${
                bentoTab === 'playlist'
                  ? 'border-amber-500 text-amber-500 bg-[#202125]/30'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
              role="tab"
              aria-selected={bentoTab === 'playlist'}
              aria-label="Queue playlist tab"
            >
              <ListMusic className="w-3 h-3" /> queue
            </button>
            <button
              onClick={() => setBentoTab('equalizer')}
              className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wider border-b-2 flex items-center justify-center gap-1.5 transition select-none cursor-pointer ${
                bentoTab === 'equalizer'
                  ? 'border-amber-500 text-amber-500 bg-[#202125]/30'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
              role="tab"
              aria-selected={bentoTab === 'equalizer'}
              aria-label="Equalizer tab"
            >
              <Sliders className="w-3 h-3" /> Equalizer
            </button>
            <button
              onClick={() => setBentoTab('library')}
              className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wider border-b-2 flex items-center justify-center gap-1.5 transition select-none cursor-pointer ${
                bentoTab === 'library'
                  ? 'border-amber-500 text-amber-500 bg-[#202125]/30'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
              role="tab"
              aria-selected={bentoTab === 'library'}
              aria-label="Library tab"
            >
              <Library className="w-3" /> Library
            </button>
            <button
              onClick={() => setBentoTab('manual')}
              className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wider border-b-2 flex items-center justify-center gap-1.5 transition select-none cursor-pointer ${
                bentoTab === 'manual'
                  ? 'border-amber-500 text-amber-500 bg-[#202125]/30'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
              role="tab"
              aria-selected={bentoTab === 'manual'}
              aria-label="Manual tab"
            >
              <BookOpen className="w-3" /> Manual
            </button>
          </div>

          {/* 7. LOWER BED WORKSPACE ELEMENT CONTAINER */}
          <div id="bento-workspace-container-landscape" className="flex-1 overflow-hidden min-h-0 h-full">
            {bentoTab === 'playlist' && (
              <Playlist
                skin="bento"
                tracks={tracks}
                currentTrack={currentTrack}
                onSelectTrack={onSelectTrack}
                onAddFiles={onAddFiles}
                onRemoveTrack={onRemoveTrack}
                onClearPlaylist={onClearPlaylist}
                onReorderTracks={onReorderTracks}
                loadingFilesMessage={loadingFilesMessage}
                onSetLoadingMessage={onSetLoadingMessage}
                onReimportTrack={onReimportTrack}
              />
            )}
            {bentoTab === 'equalizer' && (
              <Equalizer skin="bento" />
            )}
            {bentoTab === 'library' && (
              <MediaLibrary
                tracks={tracks}
                onSelectTrack={onSelectTrack}
                onRateTrack={onRateTrack}
                playHistory={playHistory}
                onTriggerLlama={onTriggerLlama}
                isPlaying={isPlaying}
                onAddFiles={onAddFiles}
                loadingFilesMessage={loadingFilesMessage}
                onSetLoadingMessage={onSetLoadingMessage}
              />
            )}
            {bentoTab === 'manual' && (
              <div className="flex flex-col h-full overflow-y-auto px-4 py-3.5 bg-[#131416]/50 rounded-md border border-[#2b2d31]/40 text-neutral-300 gap-3.5 custom-scrollbar text-xs">
                <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                  <div>
                    <h3 className="font-extrabold text-amber-500 uppercase tracking-widest text-[11px]">SA-3000 Retro Operation Manual</h3>
                    <p className="text-[9px] text-neutral-500 font-mono">SOLID STATE AUDIO MATRIX SYSTEM</p>
                  </div>
                  <button
                    onClick={handleDownloadManual}
                    className="cursor-pointer bg-amber-500/15 hover:bg-amber-500 px-3 py-1.5 rounded text-[10px] text-amber-400 hover:text-white border border-amber-500/40 hover:border-amber-500 transition-all font-bold uppercase flex items-center gap-1.5 shadow-[0_0_8px_rgba(245,158,11,0.15)] hover:shadow-[0_0_12px_rgba(245,158,11,0.3)] shadow-inner"
                  >
                    <span>📥 Save Manual PDF</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3">
                  <div className="bg-[#1a1b1e]/60 p-3 rounded-md border border-[#2b2d31]/30">
                    <h4 className="font-bold text-amber-500 mb-1.5 uppercase tracking-wide text-[10px]">📟 1.0 General Operation</h4>
                    <ul className="list-disc pl-3.5 space-y-1 text-neutral-400 text-[10px] leading-relaxed">
                      <li>Power on/off using the main tactile splash toggle</li>
                      <li>Double click tracks in the library / playlist queue to buffer play</li>
                      <li>Use the 10-band Graphic EQ to craft stereophonic tone outputs</li>
                      <li>Toggle Visualizer modes via VFD display area clicks</li>
                    </ul>
                  </div>

                  <div className="bg-[#1a1b1e]/60 p-3 rounded-md border border-[#2b2d31]/30">
                    <h4 className="font-bold text-amber-500 mb-1.5 uppercase tracking-wide text-[10px]">💿 2.0 Turntable Hardware</h4>
                    <ul className="list-disc pl-3.5 space-y-1 text-neutral-400 text-[10px] leading-relaxed">
                      <li>Select [Turntable] mode to view fully simulated direct-drive record deck</li>
                      <li>Strobe and laser target light tracking are calibrated to platter radius</li>
                      <li>Signature Spinamp central amber/obsidian bolt sticker details</li>
                      <li>Tonearm sweeps elegantly corresponding to play timeline coordinates</li>
                    </ul>
                  </div>

                  <div className="bg-[#1a1b1e]/60 p-3 rounded-md border border-[#2b2d31]/30">
                    <h4 className="font-bold text-amber-500 mb-1.5 uppercase tracking-wide text-[10px]">⚡ 3.0 Special Hardware Features</h4>
                    <ul className="list-disc pl-3.5 space-y-1 text-neutral-400 text-[10px] leading-relaxed">
                      <li><strong>BPM Detection:</strong> DSP auto-extracts music speed automatically</li>
                      <li><strong>Llama Voice:</strong> Speech synthesizer announces status changes</li>
                      <li><strong>Sleep Timer:</strong> Auto-zero and fadeout countdown clock</li>
                      <li><strong>Factory Clean:</strong> Purges cached settings back to default installation</li>
                    </ul>
                  </div>

                  <div className="bg-[#1a1b1e]/60 p-3 rounded-md border border-[#2b2d31]/30 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-amber-500 mb-1.5 uppercase tracking-wide text-[10px]">📊 System Status Logs</h4>
                      <div className="font-mono text-[9px] text-neutral-505 space-y-1 bg-[#101114] p-2 rounded border border-neutral-800">
                        <div>[STATE] ACTIVE SKIN: {activeSkin.name.toUpperCase()}</div>
                        <div>[STATE] LOADED BUFFER COUNT: {tracks.length} SCHEMS</div>
                        <div>[HW] TOTAL ANALYZER CHANNELS: 1024 FFT</div>
                        <div>[SYS] VOLTMETER THD RATIO: 0.00045%</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center font-mono text-[8px] text-neutral-600 border-t border-neutral-800/50 pt-2 pb-1">
                  SPINAMP AUDIO LABS • SA-3000R RECEIVER • PRINT EDITION AVAILABLE ONLINE
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="spinamp-bento-skin-main" className="flex-1 bg-[#1a1b1e] border-t border-[#121314] text-neutral-300 font-sans flex flex-col p-4 select-none h-full justify-between gap-3 overflow-y-auto">
      
      {/* 1. TOP HEADER BRAND PANEL */}
      <div id="bento-logo-strip" className="flex justify-between items-center bg-[#131416] border border-[#2b2d31] p-2 px-3 rounded-md shadow-inner shrink-0">
        <div className="flex items-center gap-2">
          {/* Spinamp App Logo */}
          <img
            src={spinampLogo}
            alt="Spinamp Logo"
            className="w-[32px] h-[32px] rounded-lg object-cover border border-neutral-700 shadow-sm shrink-0"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = '/spinamp_logo.jpg';
            }}
          />
          <span className="text-[12px] font-extrabold text-amber-500 uppercase tracking-widest leading-none hidden md:inline">SPINAMP RETRO PLAYER</span>
          
          {/* SKIN BUTTON CHIP */}
          <div className="relative group/skin ml-1">
            <button
              id="bento-skin-picker-trigger-portrait"
              onClick={() => setIsSkinDropdownOpen(!isSkinDropdownOpen)}
              className="h-7 px-2 text-[9px] bg-[#1a1b1e] hover:bg-neutral-800 border border-neutral-700 hover:border-amber-500/80 text-amber-400 font-bold rounded-md cursor-pointer transition-all uppercase flex items-center gap-1.5 shrink-0 whitespace-nowrap shadow-sm"
              title="Click to switch skin colors"
              aria-label="Switch skin colors"
              aria-haspopup="listbox"
              aria-expanded={isSkinDropdownOpen}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" style={{ backgroundColor: activeSkin.color }} />
              <span>{activeSkin.name}</span>
              <span className="text-[6.5px] opacity-70">▼</span>
            </button>
            
            {/* Floating Skin Selection List */}
            <div id="skin-menu-dropdown-portrait" className={`absolute left-0 top-full mt-1 ${isSkinDropdownOpen ? 'block' : 'hidden md:group-hover/skin:block'} bg-[#16171a] border border-neutral-700/80 rounded-md shadow-2xl py-1 w-48 z-[100] animate-fade-in animate-[fade-in_150ms_ease-out]`}>
              <div className="px-2.5 py-1 text-[7.5px] text-neutral-500 font-bold uppercase tracking-wider border-b border-neutral-800 mb-1">Select Soundskin</div>
              {[
                { id: 'orange-default', name: 'Orange Default 🍊', color: '#fb923c' },
                { id: 'classic-steel', name: 'Bento Classic 🍱', color: '#ff9100' },
                { id: 'midnight-violet', name: 'Midnight Violet 🌌', color: '#c084fc' },
                { id: 'cobalt-blue', name: 'Cobalt Blue 🌊', color: '#00f2fe' },
                { id: 'toxic-spill', name: 'Toxic Matrix ☣️', color: '#10b981' },
                { id: 'crimson-ruby', name: 'Red Fury 4 🩸', color: '#ff052b' },
                { id: 'walnut-hifi', name: 'Walnut Hi-Fi 🪵', color: '#ecc15c' },
                { id: 'neon-synth', name: 'Neon Synthwave ⚡', color: '#ff007f' },
                { id: 'hazard-industrial', name: 'Hazard Caution 🚧', color: '#eab308' },
                { id: 'create-custom', name: 'Create Custom Skin 🧪', color: '#f97316' }
              ].map((s) => {
                const isSelected = s.id === 'create-custom' ? (appearance === 'custom') :
                                   s.id === 'orange-default' ? (skinColor === 'vespa-gold' && appearance === 'default') :
                                   (skinColor === s.id && appearance !== 'custom');
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (s.id === 'create-custom') {
                        onOpenCustomSkinCreator?.();
                      } else if (s.id === 'orange-default') {
                        onSkinColorChange?.('vespa-gold');
                        onChangeAppearance?.('default');
                      } else {
                        onSkinColorChange?.(s.id);
                      }
                      setIsSkinDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-[9.5px] hover:bg-neutral-800 flex items-center justify-between cursor-pointer font-bold ${
                      isSelected ? 'text-amber-500 font-bold bg-neutral-800/20' : 'text-neutral-300'
                    }`}
                  >
                    <span>{s.name}</span>
                    {s.id !== 'create-custom' && (
                      <span className="w-2.5 h-2.5 rounded-full border border-black/40 shadow-sm shrink-0 ml-2" style={{ backgroundColor: s.color }} />
                    )}
                    {isSelected && s.id === 'create-custom' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}

              {onResetToDefaults && (
                <div className="border-t border-neutral-800 mt-1 pt-1">
                  <button
                    onClick={() => {
                      onResetToDefaults();
                      setIsSkinDropdownOpen(false);
                    }}
                    className="w-full text-left px-2 py-1 text-[8.5px] hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 cursor-pointer font-bold uppercase flex items-center gap-1 transition-colors"
                    title="Reset player to default settings"
                  >
                    <span>⚠️ Restore Defaults</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Skin Layout Mode Switcher */}
          <div className="flex bg-[#101113] border border-neutral-700/80 p-0.5 rounded-md text-[9px] font-bold h-7 items-center">
            <button
              onClick={() => onSkinChange?.('bento')}
              className={`px-2 h-full flex items-center justify-center rounded transition cursor-pointer ${
                skin === 'bento' ? 'bg-amber-500 text-black font-extrabold shadow-xs' : 'text-neutral-400 hover:text-white'
              }`}
              title="Switch to Bento 🍱 Layout"
            >
              🍱 Bento
            </button>
            <button
              onClick={() => onSkinChange?.('driving')}
              className={`px-2 h-full flex items-center justify-center rounded transition cursor-pointer ${
                skin === 'driving' ? 'bg-amber-500 text-black font-extrabold shadow-xs' : 'text-neutral-400 hover:text-white'
              }`}
              title="Switch to Driving 🚗 Mode"
            >
              🚗 Driving
            </button>
          </div>
          <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider text-right hidden lg:block">Llama Whipper Edition</div>
        </div>
      </div>

      {/* 2. CORE DIGITAL LED SCREEN / AUDIO INDICATOR DECK */}
      <div id="bento-led-screen" className="bg-[#101113] border border-[#232428] p-3 rounded-lg flex flex-col gap-2.5 shadow-inner shrink-0">
        <UnifiedTrackScreen
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          trackBPM={trackBPM}
          isBpmDetecting={isBpmDetecting}
          sleepTimeLeft={sleepTimeLeft}
          onToggleSleepTimer={() => onToggleSleepTimer?.()}
          timeDisplayMode={timeDisplayMode}
          onToggleTimeDisplayMode={() => onToggleTimeDisplayMode?.()}
          formatTime={formatTime}
          skin="bento"
          appearance={appearance}
          onChangeAppearance={onChangeAppearance}
          fontPreset={fontPreset}
          onChangeFontPreset={onChangeFontPreset}
        />

        {/* Dynamic visualizer window with Fullscreen button */}
        <div 
          onClick={onToggleVisualizerMode}
          className="h-[102px] bg-[#0c0d0f] border border-[#1e2024] p-0.5 rounded-md cursor-pointer relative group shadow-inner"
          title="Click to alternate styles!"
          id="visualizer-boundary-trigger"
        >
          {visualizerMode === 'off' && currentTrack?.coverUrl ? (
            <div 
              className="w-full h-full relative overflow-hidden rounded bg-cover bg-center flex flex-col justify-end p-2.5"
              style={{ backgroundImage: `url(${currentTrack.coverUrl})` }}
            >
              {/* Subtle blur overlay */}
              <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
              {/* Subtle vignette overlay */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.8) 100%)' }} />
              {/* Retro styled track info */}
              <div className="relative z-10 flex flex-col pointer-events-none text-left">
                <span className="text-[11px] font-black tracking-wide text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.95)] truncate">
                  {currentTrack.title}
                </span>
                <span className="text-[9px] font-semibold text-amber-400 drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.95)] truncate">
                  {currentTrack.artist} {currentTrack.album ? `• ${currentTrack.album}` : ''}
                </span>
              </div>
            </div>
          ) : (
            <Visualizer mode={visualizerMode} isPlaying={isPlaying} currentTime={currentTime} duration={duration} currentTrack={currentTrack} visTheme={visTheme} setVisTheme={setVisTheme} visSensitivity={visSensitivity} setVisSensitivity={setVisSensitivity} trackBPM={trackBPM} playHistory={playHistory} tracks={tracks} />
          )}

          {/* Overlay text */}
          <span className="absolute bottom-1 right-2 text-[7px] text-neutral-600 font-mono select-none uppercase tracking-wider group-hover:text-amber-500 pointer-events-none">
            MODE: {visualizerMode}
          </span>
        </div>

        {/* Stats indicators line (bits, KHz, channels, flags) */}
        <div id="track-telemetry-strip" className="flex justify-between items-center text-[8.5px] font-mono text-neutral-500 select-none border-t border-[#1a1b1e] pt-2">
          <div className="flex items-center gap-1.5">
            <span>{audioStats.kbps}</span>
            <span>•</span>
            <span>{audioStats.khz}</span>
          </div>

          {/* Fullscreen & Sleep Row */}
          <div className="flex items-center gap-1.5">
            {/* Fullscreen activation button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFullscreenVisualizer();
              }}
              className="h-7 px-2.5 bg-[#25272b] hover:bg-[#2c2f33] border border-[#2f3136] rounded-md flex items-center justify-center gap-1.5 text-[10px] font-semibold active:scale-95 transition duration-150 cursor-pointer shadow-sm text-neutral-300"
              title="Open fullscreen view"
              aria-label="Open fullscreen visualizer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>FULLSCREEN</span>
            </button>

            {/* Sleep button next to Fullscreen */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSleepTimer?.();
              }}
              className={`h-7 px-2.5 rounded-md border flex items-center justify-center gap-1.5 text-[10px] font-semibold active:scale-95 transition duration-150 cursor-pointer shadow-sm ${
                sleepTimeLeft !== null 
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 font-bold animate-pulse' 
                  : 'bg-[#25272b] border-[#2f3136] text-neutral-300 hover:bg-[#2c2f33]'
              }`}
              title="Sleep Timer: Click to cycle options (15m, 30m, 45m, 60m, off)"
              aria-label={sleepTimeLeft !== null ? `Sleep Timer active, ${Math.floor(sleepTimeLeft / 60)} minutes remaining` : "Sleep Timer"}
              aria-pressed={sleepTimeLeft !== null}
            >
              <span>⏱️ {sleepTimeLeft !== null ? `${Math.floor(sleepTimeLeft / 60)}:${(sleepTimeLeft % 60) < 10 ? '0' : ''}${sleepTimeLeft % 60}` : 'SLEEP'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className={shuffle ? 'text-amber-500 font-bold' : 'text-neutral-600'}>SHUF</span>
            <span className={repeat !== 'none' ? 'text-amber-500 font-bold' : 'text-neutral-600'}>REP</span>
          </div>
        </div>
      </div>

      {/* 3. TRACK TIMELINE PROGRESS SCRUBBER */}
      <div id="bento-progress-scrubber" className="bg-[#141517] border border-[#232428] p-2 rounded-lg flex flex-col gap-1 shrink-0">
        <SeekBar currentTime={currentTime} duration={duration} onSeek={onSeek} hasTrack={!!currentTrack} isLandscape={false} />
      </div>

      {/* 4. MAIN SOUND DECK (BUTTONS & VOLUME CONTROLLER) */}
      <div id="bento-sound-deck" className="grid grid-cols-[1fr_120px] gap-4 items-center bg-[#1c1d21] border border-[#2b2d31] p-2.5 rounded-lg shrink-0">
        
        {/* Playback action items */}
        <div className="flex justify-between items-center" id="main-playback-buttons">
          <button 
            onClick={onPrev}
            className="w-8 h-8 rounded-md bg-[#25272b] hover:bg-[#2e3135] active:bg-[#1a1c1e] text-neutral-200 flex items-center justify-center border border-[#2f3136] cursor-pointer shadow-sm active:scale-95 transition-all"
            title="Previous track"
            id="btn-bento-prev"
            aria-label="Previous track"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          {isPlaying ? (
            <button 
              onClick={onPause}
              className="w-9 h-9 rounded-md bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-900 flex items-center justify-center border border-amber-600 cursor-pointer shadow active:scale-95 transition-all"
              title="Pause music"
              id="btn-bento-pause"
              aria-label="Pause"
            >
              <Pause className="w-4 h-4 fill-neutral-900" />
            </button>
          ) : (
            <button 
              onClick={onPlay}
              className="w-9 h-9 rounded-md bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-900 flex items-center justify-center border border-amber-600 cursor-pointer shadow active:scale-95 transition-all"
              title="Play loaded track"
              disabled={!currentTrack}
              id="btn-bento-play"
              aria-label="Play"
            >
              <Play className="w-4 h-4 fill-neutral-900" />
            </button>
          )}

          <button 
            onClick={onStop}
            className="w-8 h-8 rounded-md bg-[#25272b] hover:bg-[#2e3135] active:bg-[#1a1c1e] text-neutral-200 flex items-center justify-center border border-[#2f3136] cursor-pointer shadow-sm active:scale-95 transition-all"
            title="Stop music"
            id="btn-bento-stop"
            aria-label="Stop"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          <button 
            onClick={onNext}
            className="w-8 h-8 rounded-md bg-[#25272b] hover:bg-[#2e3135] active:bg-[#1a1c1e] text-neutral-200 flex items-center justify-center border border-[#2f3136] cursor-pointer shadow-sm active:scale-95 transition-all"
            title="Next track"
            id="btn-bento-next"
            aria-label="Next track"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>
        </div>

        {/* Volume & Toggle deck */}
        <div className="flex items-center gap-2 bg-[#131416] border border-[#2a2c31] px-2 py-1.5 rounded-md" id="volume-fader-deck">
          <button 
            onClick={onMuteToggle}
            className="text-neutral-400 hover:text-white cursor-pointer"
            title="Toggle Mute"
            id="btn-bento-mute"
            aria-label={isMuted ? "Unmute" : "Mute"}
            aria-pressed={isMuted}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-amber-500" />}
          </button>
          <input
            id="bento-fullscreen-volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            title={`Volume: ${Math.floor(volume * 100)}%`}
            aria-label="Volume Level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.floor((isMuted ? 0 : volume) * 100)}
          />
        </div>
      </div>

      {/* 5. USER PLAYBACK REPEAT/SHUFFLE MATRIX BUTTONS */}
      <div id="shuffle-repeat-actions" className="flex justify-between gap-2 shrink-0">
        <button
          onClick={onShuffleToggle}
          className={`flex-1 py-1.5 rounded-md border flex items-center justify-center gap-1.5 text-[10.5px] font-semibold cursor-pointer transition ${
            shuffle 
              ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-sm' 
              : 'bg-[#25272b] border-[#2f3136] text-neutral-400 hover:bg-[#2c2f33]'
          }`}
          title="Toggle Shuffle"
          id="btn-bento-shuf"
          aria-label="Toggle Shuffle"
          aria-pressed={shuffle}
        >
          <Shuffle className="w-3.5 h-3.5" /> SHUF
        </button>

        <button
          onClick={onRepeatToggle}
          className={`flex-1 py-1.5 rounded-md border flex items-center justify-center gap-1.5 text-[10.5px] font-semibold cursor-pointer transition ${
            repeat !== 'none'
              ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-sm' 
              : 'bg-[#25272b] border-[#2f3136] text-neutral-400 hover:bg-[#2c2f33]'
          }`}
          title="Repeat Mode"
          id="btn-bento-rep"
          aria-label={`Repeat mode: ${repeat}`}
          aria-pressed={repeat !== 'none'}
        >
          <RotateCcw className="w-3.5 h-3.5" /> REPEAT: {repeat.toUpperCase()}
        </button>
      </div>

      {/* 6. MODULAR Bento WORKSPACE SELECTOR TABS */}
      <div id="bento-workspace-tabs" className="flex border-b border-neutral-800 shrink-0" style={{ marginBottom: '-4px' }} role="tablist" aria-label="Bento Workspace Tabs">
        <button
          onClick={() => setBentoTab('playlist')}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center justify-center gap-1.5 transition select-none cursor-pointer ${
            bentoTab === 'playlist'
              ? 'border-amber-500 text-amber-500 bg-[#202125/40]'
              : 'border-transparent text-neutral-500 hover:text-neutral-300'
          }`}
          id="bento-tab-playlist"
          role="tab"
          aria-selected={bentoTab === 'playlist'}
          aria-label="Queue playlist tab"
        >
          <ListMusic className="w-3.5 h-3.5" /> queue
        </button>
        <button
          onClick={() => setBentoTab('equalizer')}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center justify-center gap-1.5 transition select-none cursor-pointer ${
            bentoTab === 'equalizer'
              ? 'border-amber-500 text-amber-500 bg-[#202125/40]'
              : 'border-transparent text-neutral-500 hover:text-neutral-300'
          }`}
          id="bento-tab-equalizer"
          role="tab"
          aria-selected={bentoTab === 'equalizer'}
          aria-label="Equalizer tab"
        >
          <Sliders className="w-3.5 h-3.5" /> Equalizer
        </button>
        <button
          onClick={() => setBentoTab('library')}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center justify-center gap-1.5 transition select-none cursor-pointer ${
            bentoTab === 'library'
              ? 'border-amber-500 text-amber-500 bg-[#202125/40]'
              : 'border-transparent text-neutral-500 hover:text-neutral-300'
          }`}
          id="bento-tab-library"
          role="tab"
          aria-selected={bentoTab === 'library'}
          aria-label="Library tab"
        >
          <Library className="w-3.5 h-3.5" /> Library
        </button>
        <button
          onClick={() => setBentoTab('manual')}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center justify-center gap-1.5 transition select-none cursor-pointer ${
            bentoTab === 'manual'
              ? 'border-amber-500 text-amber-500 bg-[#202125/40]'
              : 'border-transparent text-neutral-500 hover:text-neutral-300'
          }`}
          id="bento-tab-manual"
          role="tab"
          aria-selected={bentoTab === 'manual'}
          aria-label="Manual tab"
        >
          <BookOpen className="w-3.5 h-3.5" /> Manual
        </button>
      </div>

      {/* 7. LOWER BED WORKSPACE ELEMENT CONTAINER */}
      <div id="bento-workspace-container" className="flex-1 overflow-hidden min-h-0">
        {bentoTab === 'playlist' && (
          <Playlist
            skin="bento"
            tracks={tracks}
            currentTrack={currentTrack}
            onSelectTrack={onSelectTrack}
            onAddFiles={onAddFiles}
            onRemoveTrack={onRemoveTrack}
            onClearPlaylist={onClearPlaylist}
            onReorderTracks={onReorderTracks}
            loadingFilesMessage={loadingFilesMessage}
                onSetLoadingMessage={onSetLoadingMessage}
            onReimportTrack={onReimportTrack}
          />
        )}
        {bentoTab === 'equalizer' && (
          <Equalizer skin="bento" />
        )}
        {bentoTab === 'library' && (
          <MediaLibrary
            tracks={tracks}
            onSelectTrack={onSelectTrack}
            onRateTrack={onRateTrack}
            playHistory={playHistory}
            onTriggerLlama={onTriggerLlama}
            isPlaying={isPlaying}
            onAddFiles={onAddFiles}
            loadingFilesMessage={loadingFilesMessage}
                onSetLoadingMessage={onSetLoadingMessage}
          />
        )}
        {bentoTab === 'manual' && (
          <div className="flex flex-col h-full overflow-y-auto px-4 py-3.5 bg-[#131416]/50 rounded-md border border-[#2b2d31]/40 text-neutral-300 gap-3.5 custom-scrollbar text-xs">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <div>
                <h3 className="font-extrabold text-amber-500 uppercase tracking-widest text-[11px]">SA-3000 Retro Operation Manual</h3>
                <p className="text-[9px] text-neutral-500 font-mono">SOLID STATE AUDIO MATRIX SYSTEM</p>
              </div>
              <button
                onClick={handleDownloadManual}
                className="cursor-pointer bg-amber-500/15 hover:bg-amber-500 px-3 py-1.5 rounded text-[10px] text-amber-400 hover:text-white border border-amber-500/40 hover:border-amber-500 transition-all font-bold uppercase flex items-center gap-1.5 shadow-[0_0_8px_rgba(245,158,11,0.15)] hover:shadow-[0_0_12px_rgba(245,158,11,0.3)] shadow-inner"
              >
                <span>📥 Save Manual PDF</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 pb-3">
              <div className="bg-[#1a1b1e]/60 p-3 rounded-md border border-[#2b2d31]/30">
                <h4 className="font-bold text-amber-500 mb-1.5 uppercase tracking-wide text-[10px]">📟 1.0 General Operation</h4>
                <ul className="list-disc pl-3.5 space-y-1 text-neutral-400 text-[10px] leading-relaxed">
                  <li>Power on/off using the main tactile splash toggle</li>
                  <li>Double click tracks in the library / playlist queue to buffer play</li>
                  <li>Use the 10-band Graphic EQ to craft stereophonic tone outputs</li>
                  <li>Toggle Visualizer modes via VFD display area clicks</li>
                </ul>
              </div>

              <div className="bg-[#1a1b1e]/60 p-3 rounded-md border border-[#2b2d31]/30">
                <h4 className="font-bold text-amber-500 mb-1.5 uppercase tracking-wide text-[10px]">💿 2.0 Turntable Hardware</h4>
                <ul className="list-disc pl-3.5 space-y-1 text-neutral-400 text-[10px] leading-relaxed">
                  <li>Select [Turntable] mode to view fully simulated direct-drive record deck</li>
                  <li>Strobe and laser target light tracking are calibrated to platter radius</li>
                  <li>Signature Spinamp central amber/obsidian bolt sticker details</li>
                  <li>Tonearm sweeps elegantly corresponding to play timeline coordinates</li>
                </ul>
              </div>

              <div className="bg-[#1a1b1e]/60 p-3 rounded-md border border-[#2b2d31]/30">
                <h4 className="font-bold text-amber-500 mb-1.5 uppercase tracking-wide text-[10px]">⚡ 3.0 Special Hardware Features</h4>
                <ul className="list-disc pl-3.5 space-y-1 text-neutral-400 text-[10px] leading-relaxed">
                  <li><strong>BPM Detection:</strong> DSP auto-extracts music speed automatically</li>
                  <li><strong>Llama Voice:</strong> Speech synthesizer announces status changes</li>
                  <li><strong>Sleep Timer:</strong> Auto-zero and fadeout countdown clock</li>
                  <li><strong>Factory Clean:</strong> Purges cached settings back to default installation</li>
                </ul>
              </div>

              <div className="bg-[#1a1b1e]/60 p-3 rounded-md border border-[#2b2d31]/30 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-amber-500 mb-1.5 uppercase tracking-wide text-[10px]">📊 System Status Logs</h4>
                  <div className="font-mono text-[9px] text-neutral-505 space-y-1 bg-[#101114] p-2 rounded border border-neutral-800">
                    <div>[STATE] ACTIVE SKIN: {activeSkin.name.toUpperCase()}</div>
                    <div>[STATE] LOADED BUFFER COUNT: {tracks.length} SCHEMS</div>
                    <div>[HW] TOTAL ANALYZER CHANNELS: 1024 FFT</div>
                    <div>[SYS] VOLTMETER THD RATIO: 0.00045%</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center font-mono text-[8px] text-neutral-600 border-t border-neutral-800/50 pt-2 pb-1">
              SPINAMP AUDIO LABS • SA-3000R RECEIVER • PRINT EDITION AVAILABLE ONLINE
            </div>
          </div>
        )}
      </div>

    </div>
  );
});
