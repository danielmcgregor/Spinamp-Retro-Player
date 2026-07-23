import React, { useState, useCallback } from 'react';
import { Track, PlayerState, VisualizerMode, ScreenAppearance, FontPreset } from '../types';
import { Visualizer } from './Visualizer';
import { UnifiedTrackScreen } from './UnifiedTrackScreen';
import { MarqueeText } from './MarqueeText';
import { Playlist } from './Playlist';
import { Equalizer } from './Equalizer';
import { VisualizerControls } from './VisualizerControls';
import { AnimatePresence } from 'motion/react';
import { 
  Play, Pause, Square, SkipBack, SkipForward, FolderOpen, 
  Volume2, VolumeX, Shuffle, RotateCcw, Maximize2, Sliders
} from 'lucide-react';

interface ClassicSkinProps {
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
  visTheme: string;
  setVisTheme: (theme: string) => void;
  visSensitivity: number;
  setVisSensitivity: (sens: number) => void;
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
  timeDisplayMode?: 'elapsed' | 'remaining';
  onToggleTimeDisplayMode?: () => void;
  sleepTimeLeft?: number | null;
  onToggleSleepTimer?: () => void;
  trackBPM?: number | null;
  isBpmDetecting?: boolean;
  appearance?: ScreenAppearance;
  onChangeAppearance?: (app: ScreenAppearance) => void;
  fontPreset?: FontPreset;
  onChangeFontPreset?: (font: FontPreset) => void;
  loadingFilesMessage?: string;
  onReimportTrack?: (id: string) => void;
  onAddRippedTracks?: (newTracks: Track[]) => void;
  playHistory: string[];
}

export const ClassicSkin = React.memo<ClassicSkinProps>(({
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
  onReorderTracks,
  onToggleVisualizerMode,
  onSelectVisualizerMode,
  onToggleFullscreenVisualizer,
  onClearPlaylist,
  timeDisplayMode = 'elapsed',
  onToggleTimeDisplayMode,
  sleepTimeLeft = null,
  onToggleSleepTimer,
  trackBPM = null,
  isBpmDetecting = false,
  appearance,
  onChangeAppearance,
  fontPreset,
  onChangeFontPreset,
  loadingFilesMessage,
  onReimportTrack,
  onAddRippedTracks,
  playHistory,
}) => {

  const [showEq, setShowEq] = useState(true);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [showVisControls, setShowVisControls] = useState(false);

  const handleDownloadManual = useCallback(async () => {
    try {
      const { generateManualPdf } = await import('../utils/generateManualPdf');
      generateManualPdf(tracks.length, 'Classic Steel');
    } catch (err) {
      console.error('Failed to load PDF generator:', err);
    }
  }, [tracks.length]);

  // Formatting helpers
  const formatTime = (secs: number) => {
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

  const percentProgress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (isLandscape) {
    return (
      <div id="spinamp-classic-skin-canvas-landscape" className="flex-1 bg-[#1a1c1e] text-zinc-300 font-mono text-[11px] p-3 gap-4 select-none h-full overflow-hidden flex flex-row">
        {/* LEFT COLUMN: Main Player and Equalizer Panel (stacked) */}
        <div className="w-[320px] shrink-0 flex flex-col gap-3 overflow-y-auto h-full pr-1 px-0.5 custom-scrollbar border-r border-[#2c2e35]/30 pr-3.5">
          {/* WINDOW 1: MAIN SPINAMP DECK PLAYER */}
          <div 
            id="classic-main-player-panel-landscape" 
            className="bg-[#24252a] border-2 border-neutral-700 shadow-xl rounded-md p-2.5 flex flex-col gap-1.5 ring-1 ring-black/80 shrink-0"
            style={{
              boxShadow: 'inset 1px 1px 0px #4d4f58, 2px 2px 4px rgba(0,0,0,0.5)',
              backgroundImage: 'linear-gradient(135deg, #2b2c34 0%, #17181c 100%)'
            }}
          >
            {/* Title bar strip with mini-collapser dots */}
            <div className="flex justify-between items-center bg-gradient-to-r from-blue-900 to-indigo-950 text-white font-bold tracking-wider px-2 py-0.5 border border-black/80 rounded" id="classic-title-strip">
              <span className="text-[12.5px] uppercase tracking-widest text-[#00ff44] font-black">SPINAMP RETRO PLAYER</span>
              <div className="flex gap-1.5 h-3">
                {/* fold equalizer window toggle */}
                <button 
                  onClick={() => setShowEq(!showEq)} 
                  className={`w-3.5 h-3.5 flex items-center justify-center rounded-sm text-[7px] border font-bold cursor-pointer transition ${
                    showEq ? 'bg-amber-500 border-amber-300 text-black' : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}
                  title="Toggle EQ Screen fold"
                  aria-label="Toggle Equalizer"
                  aria-pressed={showEq}
                >
                  EQ
                </button>
                {/* fold vis controls window toggle */}
                <button 
                  onClick={() => setShowVisControls(!showVisControls)} 
                  className={`w-5 h-3.5 flex items-center justify-center rounded-sm text-[6.5px] border font-black cursor-pointer transition ${
                    showVisControls 
                      ? 'bg-blue-500 border-blue-300 text-white shadow-[0_0_4px_#3b82f6]' 
                      : 'bg-[#1b1e42] border-blue-500/70 text-blue-300 hover:border-blue-400 hover:text-white hover:bg-blue-900 animate-pulse'
                  }`}
                  title="Toggle Visualizer Controls menu drawer (highly recommended!)"
                  id="classic-header-vis-btn-landscape"
                  aria-label="Toggle Visualizer Controls"
                  aria-pressed={showVisControls}
                >
                  VIS
                </button>
                {/* fold playlist window toggle */}
                <button 
                  onClick={() => {
                    setShowPlaylist(!showPlaylist);
                  }} 
                  className={`w-3.5 h-3.5 flex items-center justify-center rounded-sm text-[7px] border font-bold cursor-pointer transition ${
                    showPlaylist ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}
                  title="Toggle Playlist fold"
                  aria-label="Toggle Playlist"
                  aria-pressed={showPlaylist}
                >
                  PL
                </button>
                {/* Save Manual PDF button */}
                <button 
                  onClick={handleDownloadManual} 
                  className="w-[28px] h-3.5 flex items-center justify-center rounded-sm text-[6.5px] border font-black bg-rose-700 hover:bg-rose-600 border-rose-500 text-white cursor-pointer transition"
                  title="Download Retro Operating Manual PDF"
                  aria-label="Download Retro Operating Manual PDF"
                >
                  MAN
                </button>
              </div>
            </div>

            {/* Display Box */}
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
              skin="classic"
              appearance={appearance}
              onChangeAppearance={onChangeAppearance}
              fontPreset={fontPreset}
              onChangeFontPreset={onChangeFontPreset}
            />

            {/* Real Live Visualizer panel with Fullscreen button */}
            <div 
              onClick={onToggleVisualizerMode}
              className="h-[92px] bg-[#050505] rounded-md p-0.5 border border-neutral-800 cursor-pointer shadow-inner relative group"
              title="Click to alternate styles. Hover for Fullscreen!"
              id="classic-visualizer-deck-landscape"
            >
              <Visualizer mode={visualizerMode} isPlaying={isPlaying} currentTime={currentTime} duration={duration} currentTrack={currentTrack} visTheme={visTheme} setVisTheme={setVisTheme} visSensitivity={visSensitivity} setVisSensitivity={setVisSensitivity} trackBPM={trackBPM} playHistory={playHistory} tracks={tracks} />

              {/* Overlay Action Buttons */}
              <div className="absolute top-0.5 left-1 flex gap-1 z-20" onClick={(e) => e.stopPropagation()}>
                {/* Fullscreen activation button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFullscreenVisualizer();
                  }}
                  className="h-5 px-1.5 bg-black/90 hover:bg-[#00ff44] hover:text-black border border-[#00ff44]/40 rounded flex items-center justify-center gap-0.5 text-[7px] text-[#00ff44] font-bold opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition duration-150 cursor-pointer"
                  title="Open fullscreen view"
                  aria-label="Open fullscreen visualizer"
                >
                  <Maximize2 className="w-1.5 h-1.5 animate-pulse" />
                  <span>FULLSCREEN</span>
                </button>

                {/* Sleep button next to Fullscreen */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSleepTimer?.();
                  }}
                  className={`h-5 px-1.5 text-[7px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer transition duration-150 ${
                    sleepTimeLeft !== null 
                      ? 'bg-amber-500 text-black border border-amber-400 font-bold animate-pulse shadow-[0_0_5px_rgba(245,158,11,0.5)]' 
                      : 'bg-black/90 hover:bg-[#00ff44] hover:text-black border border-[#00ff44]/40 text-[#00ff44] sm:opacity-0 sm:group-hover:opacity-100'
                  }`}
                  title="Sleep Timer: Click to cycle options (15m, 30m, 45m, 60m, off)"
                  aria-label={sleepTimeLeft !== null ? `Sleep Timer active, ${Math.floor(sleepTimeLeft / 60)} minutes remaining` : "Sleep Timer"}
                  aria-pressed={sleepTimeLeft !== null}
                >
                  <span>⏱️ {sleepTimeLeft !== null ? `${Math.floor(sleepTimeLeft / 60)}:${(sleepTimeLeft % 60) < 10 ? '0' : ''}${sleepTimeLeft % 60}` : 'SLEEP'}</span>
                </button>
              </div>

              {/* Vis Controls quick trigger drawer button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowVisControls(!showVisControls);
                }}
                className={`absolute top-0.5 right-1 h-5 px-1.5 border rounded flex items-center justify-center gap-1 text-[7px] font-bold opacity-100 transition duration-150 z-20 cursor-pointer ${
                  showVisControls
                    ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_5px_#3b82f6]'
                    : 'bg-black/90 border-[#3b82f6]/40 hover:border-blue-400 hover:text-[#00ff44] text-blue-400'
                }`}
                title="Toggle visualizer presets, themes & speed controls sliding deck!"
                id="classic-deck-vis-quick-trigger-landscape"
                aria-label="Toggle Visualizer Controls drawer"
                aria-pressed={showVisControls}
              >
                <Sliders className="w-2 h-2" />
                <span>VIS CONTROLS</span>
              </button>

              <span className="absolute bottom-0.5 right-1.5 text-[6.5px] text-[#00ff44]/40 uppercase tracking-widest font-mono select-none pointer-events-none">
                {visualizerMode}
              </span>
            </div>

            {/* Track Timeline progress seeker slider */}
            <div className="bg-[#1c1c20] p-1 border border-zinc-800 rounded flex flex-col gap-1" id="classic-seek-controller">
              <div className="relative h-1.5 bg-black border border-neutral-850 rounded flex items-center overflow-visible">
                <input
                  id="classic-seek-slider"
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => onSeek(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={!currentTrack}
                  aria-label="Playback position"
                  aria-valuemin={0}
                  aria-valuemax={duration || 100}
                  aria-valuenow={currentTime}
                />
                <div 
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)] rounded"
                  style={{ width: `${percentProgress}%` }}
                />
                {currentTrack && (
                  <div 
                    className="absolute w-2.5 h-2.5 bg-gradient-to-b from-neutral-300 to-neutral-500 border border-neutral-800 shadow rounded-sm -ml-0.5 pointer-events-none"
                    style={{ left: `${percentProgress}%` }}
                  />
                )}
              </div>
            </div>

            {/* Sound controls and toggles */}
            <div className="grid grid-cols-[85px_1fr] gap-2 items-center bg-[#151518] p-1 border border-zinc-800 rounded" id="classic-sound-controllers">
              <div className="flex items-center gap-1">
                <button 
                  onClick={onMuteToggle} 
                  className="text-zinc-500 hover:text-[#00ff44]" 
                  title="Toggle Mute"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                  aria-pressed={isMuted}
                >
                  {isMuted ? <VolumeX className="w-3 h-3 text-rose-500" /> : <Volume2 className="w-3 h-3 text-[#00ff44]" />}
                </button>
                <div className="relative h-2.5 flex-1 flex items-center">
                  <input
                    id="classic-volume-slider"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-0.5 bg-black rounded appearance-none cursor-pointer accent-[#00ff44]"
                    aria-label="Volume"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round((isMuted ? 0 : volume) * 100)}
                  />
                </div>
              </div>

              <div className="flex gap-1.5 justify-end">
                <button
                  onClick={onShuffleToggle}
                  className={`px-1 py-0.5 rounded text-[7.5px] font-bold border transition ${
                    shuffle 
                      ? 'bg-amber-600 border-amber-400 text-white' 
                      : 'bg-neutral-800 border-neutral-700 text-zinc-500'
                  }`}
                  title="Shuffle"
                  aria-label="Toggle Shuffle"
                  aria-pressed={shuffle}
                >
                  SHUF
                </button>
                <button
                  onClick={onRepeatToggle}
                  className={`px-1 py-0.5 rounded text-[7.5px] font-bold border transition ${
                    repeat !== 'none'
                      ? 'bg-emerald-700 border-emerald-400 text-white' 
                      : 'bg-neutral-800 border-neutral-700 text-zinc-500'
                  }`}
                  title="Repeat Mode"
                  aria-label={`Repeat mode: ${repeat}`}
                  aria-pressed={repeat !== 'none'}
                >
                  REP: {repeat === 'none' ? 'OFF' : repeat.toUpperCase()}
                </button>
              </div>
            </div>

            {/* Controller Deck buttons */}
            <div className="grid grid-cols-5 gap-1 pt-1 border-t border-neutral-900" id="classic-controls-deck">
              <button 
                onClick={onPrev} 
                className="h-7 rounded bg-[#202124] border border-neutral-750 active:bg-neutral-900 hover:border-zinc-400 text-zinc-300 flex items-center justify-center cursor-pointer shadow"
                title="Previous track"
                aria-label="Previous track"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              {isPlaying ? (
                <button 
                  onClick={onPause} 
                  className="h-7 rounded bg-rose-950 border border-rose-600 hover:border-rose-450 text-white flex items-center justify-center cursor-pointer shadow"
                  title="Pause music"
                  aria-label="Pause"
                >
                  <Pause className="w-3 h-3 fill-current" />
                </button>
              ) : (
                <button 
                  onClick={onPlay} 
                  className="h-7 rounded bg-emerald-950 border border-emerald-600 hover:border-emerald-400 text-white flex items-center justify-center cursor-pointer shadow" 
                  disabled={!currentTrack}
                  title="Play loaded track"
                  aria-label="Play"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>
              )}
              <button 
                onClick={onStop} 
                className="h-7 rounded bg-[#202124] border border-neutral-750 active:bg-neutral-900 hover:border-zinc-400 text-zinc-300 flex items-center justify-center cursor-pointer shadow"
                title="Stop music"
                aria-label="Stop"
              >
                <Square className="w-2.5 h-2.5 fill-current" />
              </button>
              <button 
                onClick={onNext} 
                className="h-7 rounded bg-[#202124] border border-neutral-750 active:bg-neutral-900 hover:border-zinc-400 text-zinc-300 flex items-center justify-center cursor-pointer shadow"
                title="Next track"
                aria-label="Next track"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowVisControls(!showVisControls)}
                className={`h-7 rounded border font-extrabold text-[8.5px] tracking-wider cursor-pointer shadow transition duration-150 flex items-center justify-center ${
                  showVisControls 
                    ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_8px_rgba(59,130,246,0.85)]' 
                    : 'bg-[#1b1e42] border-[#3b82f6]/40 text-[#4f46e5] hover:border-blue-400 hover:text-white hover:bg-blue-900/50'
                }`}
                title="Toggle Visualizer Controls sliding deck! Preset patterns, theme switchers, sensitivity knobs."
                id="classic-controls-deck-vis-toggle-landscape"
                aria-label="Toggle Visualizer Controls drawer"
                aria-pressed={showVisControls}
              >
                VIS
              </button>
            </div>
          </div>

          {/* WINDOW 2: STACKED EQUALIZER PANEL */}
          {showEq && (
            <div id="docked-classic-eq" className="animate-fade-in shrink-0">
              <Equalizer skin="classic" />
            </div>
          )}

          {/* WINDOW 2.5: STACKED VISUALIZER CONTROLS PANEL */}
          <AnimatePresence initial={false}>
            {showVisControls && (
              <VisualizerControls
                visualizerMode={visualizerMode}
                onSelectVisualizerMode={onSelectVisualizerMode}
                visTheme={visTheme}
                setVisTheme={setVisTheme}
                visSensitivity={visSensitivity}
                setVisSensitivity={setVisSensitivity}
                onToggleFullscreenVisualizer={onToggleFullscreenVisualizer}
              />
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: Playlist / Queue details */}
        {showPlaylist && (
          <div id="docked-classic-playlist-landscape" className="flex-1 min-h-0 h-full animate-fade-in overflow-hidden">
            <Playlist
              skin="classic"
              tracks={tracks}
              currentTrack={currentTrack}
              onSelectTrack={onSelectTrack}
              onAddFiles={onAddFiles}
              onRemoveTrack={onRemoveTrack}
              onClearPlaylist={onClearPlaylist}
              onReorderTracks={onReorderTracks}
              loadingFilesMessage={loadingFilesMessage}
              onReimportTrack={onReimportTrack}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div id="spinamp-classic-skin-canvas" className="flex-1 bg-[#1a1c1e] text-zinc-300 font-mono text-[11px] flex flex-col p-3 gap-3 overflow-y-auto select-none h-full justify-start">
      
      {/* WINDOW 1: MAIN SPINAMP DECK PLAYER */}
      <div 
        id="classic-main-player-panel" 
        className="bg-[#24252a] border-2 border-neutral-700 shadow-xl rounded-md p-2.5 flex flex-col gap-2 ring-1 ring-black/80"
        style={{
          boxShadow: 'inset 1px 1px 0px #4d4f58, 2px 2px 4px rgba(0,0,0,0.5)',
          backgroundImage: 'linear-gradient(135deg, #2b2c34 0%, #17181c 100%)'
        }}
      >
        {/* Title bar strip with mini-collapser dots */}
        <div className="flex justify-between items-center bg-gradient-to-r from-blue-900 to-indigo-950 text-white font-bold tracking-wider px-2 py-0.5 border border-black/80 rounded" id="classic-title-strip">
          <span className="text-[12.5px] uppercase tracking-widest text-[#00ff44] font-black">SPINAMP RETRO PLAYER</span>
          <div className="flex gap-1.5 h-3">
            {/* fold equalizer window toggle */}
            <button 
              onClick={() => setShowEq(!showEq)} 
              className={`w-3.5 h-3.5 flex items-center justify-center rounded-sm text-[7px] border font-bold cursor-pointer transition ${
                showEq ? 'bg-amber-500 border-amber-300 text-black' : 'bg-neutral-800 border-neutral-700 text-neutral-400'
              }`}
              title="Toggle EQ Screen fold"
              aria-label="Toggle Equalizer"
              aria-pressed={showEq}
            >
              EQ
            </button>
            {/* fold vis controls window toggle */}
            <button 
              onClick={() => setShowVisControls(!showVisControls)} 
              className={`w-5 h-3.5 flex items-center justify-center rounded-sm text-[6.5px] border font-black cursor-pointer transition ${
                showVisControls 
                  ? 'bg-blue-500 border-blue-300 text-white shadow-[0_0_4px_#3b82f6]' 
                  : 'bg-[#1b1e42] border-blue-500/70 text-blue-300 hover:border-blue-400 hover:text-white hover:bg-blue-900 animate-pulse'
              }`}
              title="Toggle Visualizer Controls menu drawer (highly recommended!)"
              id="classic-header-vis-btn-portrait"
              aria-label="Toggle Visualizer Controls"
              aria-pressed={showVisControls}
            >
              VIS
            </button>
            {/* fold playlist window toggle */}
            <button 
              onClick={() => {
                setShowPlaylist(!showPlaylist);
              }} 
              className={`w-3.5 h-3.5 flex items-center justify-center rounded-sm text-[7px] border font-bold cursor-pointer transition ${
                showPlaylist ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400'
              }`}
              title="Toggle Playlist fold"
              aria-label="Toggle Playlist"
              aria-pressed={showPlaylist}
            >
              PL
            </button>
            {/* Save Manual PDF button */}
            <button 
              onClick={handleDownloadManual} 
              className="w-[28px] h-3.5 flex items-center justify-center rounded-sm text-[6.5px] border font-black bg-rose-700 hover:bg-rose-600 border-rose-500 text-white cursor-pointer transition"
              title="Download Retro Operating Manual PDF"
              aria-label="Download Retro Operating Manual PDF"
            >
              MAN
            </button>
          </div>
        </div>

        {/* Display Box */}
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
          skin="classic"
          appearance={appearance}
          onChangeAppearance={onChangeAppearance}
          fontPreset={fontPreset}
          onChangeFontPreset={onChangeFontPreset}
        />

        {/* Real Live Visualizer panel with Fullscreen button */}
        <div 
          onClick={onToggleVisualizerMode}
          className="h-[102px] bg-[#050505] rounded-md p-0.5 border border-neutral-800 cursor-pointer shadow-inner relative group"
          title="Click to alternate styles. Hover for Fullscreen!"
          id="classic-visualizer-deck"
        >
          <Visualizer mode={visualizerMode} isPlaying={isPlaying} currentTime={currentTime} duration={duration} currentTrack={currentTrack} visTheme={visTheme} setVisTheme={setVisTheme} visSensitivity={visSensitivity} setVisSensitivity={setVisSensitivity} trackBPM={trackBPM} playHistory={playHistory} tracks={tracks} />

          {/* Overlay Action Buttons */}
          <div className="absolute top-0.5 left-1.5 flex gap-1 z-20" onClick={(e) => e.stopPropagation()}>
            {/* Fullscreen activation button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFullscreenVisualizer();
              }}
              className="h-5 px-1.5 bg-black/90 hover:bg-[#00ff44] hover:text-black border border-[#00ff44]/40 rounded flex items-center justify-center gap-0.5 text-[7px] text-[#00ff44] font-bold opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition duration-150 cursor-pointer"
              title="Open fullscreen view"
              aria-label="Open fullscreen visualizer"
            >
              <Maximize2 className="w-1.5 h-1.5 animate-pulse" />
              <span>FULLSCREEN</span>
            </button>

            {/* Sleep button next to Fullscreen */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSleepTimer?.();
              }}
              className={`h-5 px-1.5 text-[7px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer transition duration-150 ${
                sleepTimeLeft !== null 
                  ? 'bg-amber-500 text-black border border-amber-400 font-bold animate-pulse shadow-[0_0_5px_rgba(245,158,11,0.5)]' 
                  : 'bg-black/90 hover:bg-[#00ff44] hover:text-black border border-[#00ff44]/40 text-[#00ff44] sm:opacity-0 sm:group-hover:opacity-100'
              }`}
              title="Sleep Timer: Click to cycle options (15m, 30m, 45m, 60m, off)"
              aria-label={sleepTimeLeft !== null ? `Sleep Timer active, ${Math.floor(sleepTimeLeft / 60)} minutes remaining` : "Sleep Timer"}
              aria-pressed={sleepTimeLeft !== null}
            >
              <span>⏱️ {sleepTimeLeft !== null ? `${Math.floor(sleepTimeLeft / 60)}:${(sleepTimeLeft % 60) < 10 ? '0' : ''}${sleepTimeLeft % 60}` : 'SLEEP'}</span>
            </button>
          </div>

          {/* Vis Controls quick trigger drawer button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowVisControls(!showVisControls);
            }}
            className={`absolute top-0.5 right-1 h-5 px-1.5 border rounded flex items-center justify-center gap-1 text-[7px] font-bold opacity-100 transition duration-150 z-20 cursor-pointer ${
              showVisControls
                ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_5px_#3b82f6]'
                : 'bg-black/90 border-[#3b82f6]/40 hover:border-blue-400 hover:text-[#00ff44] text-blue-400'
            }`}
            title="Toggle visualizer presets, themes & speed controls sliding deck!"
            id="classic-deck-vis-quick-trigger-portrait"
            aria-label="Toggle Visualizer Controls drawer"
            aria-pressed={showVisControls}
          >
            <Sliders className="w-2 h-2" />
            <span>VIS CONTROLS</span>
          </button>

          <span className="absolute bottom-1 right-2 text-[7px] text-[#00ff44]/40 uppercase tracking-widest font-mono select-none pointer-events-none">
            {visualizerMode}
          </span>
        </div>

        {/* Track Timeline progress seeker slider */}
        <div className="bg-[#1c1c20] p-1.5 border border-zinc-800 rounded flex flex-col gap-1" id="classic-seek-controller">
          <div className="relative h-2 bg-black border border-neutral-850 rounded flex items-center overflow-visible">
            <input
              id="classic-fullscreen-seek-slider"
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={!currentTrack}
              aria-label="Playback position"
              aria-valuemin={0}
              aria-valuemax={duration || 100}
              aria-valuenow={currentTime}
            />
            {/* progress fill */}
            <div 
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)] rounded"
              style={{ width: `${percentProgress}%` }}
            />
            {/* custom scrubber handle */}
            {currentTrack && (
              <div 
                className="absolute w-3.5 h-3 bg-gradient-to-b from-neutral-300 to-neutral-500 border border-neutral-800 shadow rounded-sm -ml-1 pointer-events-none"
                style={{ left: `${percentProgress}%` }}
              />
            )}
          </div>
          <div className="flex justify-between items-center text-[7.5px] text-zinc-500 leading-none">
            <span>START</span>
            <span>SHUFFLE: {shuffle ? 'ON' : 'OFF'}</span>
            <span>{currentTrack ? formatTime(duration) : '0:00'}</span>
          </div>
        </div>

        {/* Sound controls and toggles (volume row slider) */}
        <div className="grid grid-cols-[100px_1fr] gap-3 items-center bg-[#151518] p-1.5 border border-zinc-800 rounded mb-1" id="classic-sound-controllers">
          {/* Volume slider */}
          <div className="flex items-center gap-1">
            <button 
              onClick={onMuteToggle} 
              className="text-zinc-500 hover:text-[#00ff44]" 
              title="Toggle Mute" 
              id="btn-classic-mute"
              aria-label={isMuted ? "Unmute" : "Mute"}
              aria-pressed={isMuted}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5 text-[#00ff44]" />}
            </button>
            <div className="relative h-3 flex-1 flex items-center">
              <input
                id="classic-fullscreen-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-black rounded appearance-none cursor-pointer accent-[#00ff44]"
                aria-label="Volume"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((isMuted ? 0 : volume) * 100)}
              />
            </div>
          </div>

          {/* Repeat and Shuffle Toggles */}
          <div className="flex gap-1.5 justify-end">
            <button
              onClick={onShuffleToggle}
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition ${
                shuffle 
                  ? 'bg-amber-600 border-amber-400 text-white' 
                  : 'bg-neutral-800 border-neutral-700 text-zinc-500'
              }`}
              title="Shuffle"
              id="btn-classic-shuf"
              aria-label="Toggle Shuffle"
              aria-pressed={shuffle}
            >
              SHUF
            </button>
            <button
              onClick={onRepeatToggle}
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition ${
                repeat !== 'none'
                  ? 'bg-emerald-700 border-emerald-400 text-white' 
                  : 'bg-neutral-800 border-neutral-700 text-zinc-500'
              }`}
              title="Repeat Mode"
              id="btn-classic-rep"
              aria-label={`Repeat mode: ${repeat}`}
              aria-pressed={repeat !== 'none'}
            >
              REP: {repeat === 'none' ? 'OFF' : repeat.toUpperCase()}
            </button>
          </div>
        </div>

        {/* Physical Controller Deck */}
        <div className="grid grid-cols-5 gap-1 pt-1 border-t border-neutral-800" id="classic-controls-deck">
          <button 
            onClick={onPrev}
            className="h-8 rounded bg-gradient-to-b from-[#3a3c42] to-[#1c1d22] border border-neutral-700/85 active:from-[#1c1d22] active:to-[#0d0e11] hover:border-zinc-400 text-zinc-300 flex items-center justify-center cursor-pointer shadow"
            title="Previous track"
            id="btn-classic-prev"
            aria-label="Previous track"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {isPlaying ? (
            <button 
              onClick={onPause}
              className="h-8 rounded bg-gradient-to-b from-rose-700 to-rose-950 border border-rose-500 active:from-rose-950 hover:border-rose-400 text-white flex items-center justify-center cursor-pointer shadow-[0_0_3px_red]"
              title="Pause music"
              id="btn-classic-pause"
              aria-label="Pause"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button 
              onClick={onPlay}
              className="h-8 rounded bg-gradient-to-b from-emerald-600 to-emerald-900 border border-emerald-400 active:from-emerald-900 hover:border-emerald-300 text-white flex items-center justify-center cursor-pointer shadow-[0_0_3px_#00ff44]"
              title="Play loaded track"
              disabled={!currentTrack}
              id="btn-classic-play"
              aria-label="Play"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          )}

          <button 
            onClick={onStop}
            className="h-8 rounded bg-gradient-to-b from-[#3a3c42] to-[#1c1d22] border border-neutral-700/85 active:from-[#1c1d22] active:to-[#0d0e11] hover:border-zinc-400 text-zinc-300 flex items-center justify-center cursor-pointer shadow"
            title="Stop music"
            id="btn-classic-stop"
            aria-label="Stop"
          >
            <Square className="w-3 h-3 fill-current" />
          </button>

          <button 
            onClick={onNext}
            className="h-8 rounded bg-gradient-to-b from-[#3a3c42] to-[#1c1d22] border border-neutral-700/85 active:from-[#1c1d22] active:to-[#0d0e11] hover:border-zinc-400 text-zinc-300 flex items-center justify-center cursor-pointer shadow"
            title="Next track"
            id="btn-classic-next"
            aria-label="Next track"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowVisControls(!showVisControls)}
            className={`h-8 rounded border font-extrabold text-[9px] tracking-widest cursor-pointer shadow transition-all duration-200 flex items-center justify-center ${
              showVisControls 
                ? 'bg-gradient-to-b from-blue-500 to-blue-700 border-blue-300 text-white shadow-[0_0_8px_rgba(59,130,246,0.85)] font-black scale-102' 
                : 'bg-gradient-to-b from-[#1b1e42] to-[#11132a] border-[#3b82f6]/40 text-blue-400 hover:border-blue-400 hover:text-white'
            }`}
            title="Toggle Visualizer Controls sliding deck! Preset patterns, theme switchers, sensitivity knobs."
            id="classic-controls-deck-vis-toggle-portrait"
            aria-label="Toggle Visualizer Controls drawer"
            aria-pressed={showVisControls}
          >
            VIS
          </button>
        </div>

      </div>

      {/* WINDOW 2: STACKED EQUALIZER PANEL */}
      {showEq && (
        <div id="docked-classic-eq" className="animate-fade-in shrink-0">
          <Equalizer skin="classic" />
        </div>
      )}

      {/* WINDOW 2.5: STACKED VISUALIZER CONTROLS PANEL */}
      <AnimatePresence initial={false}>
        {showVisControls && (
          <VisualizerControls
            visualizerMode={visualizerMode}
            onSelectVisualizerMode={onSelectVisualizerMode}
            visTheme={visTheme}
            setVisTheme={setVisTheme}
            visSensitivity={visSensitivity}
            setVisSensitivity={setVisSensitivity}
            onToggleFullscreenVisualizer={onToggleFullscreenVisualizer}
          />
        )}
      </AnimatePresence>

      {/* WINDOW 3: STACKED PLAYLIST PANEL */}
      {showPlaylist && (
        <div id="docked-classic-playlist" className="flex-1 min-h-0 animate-fade-in">
          <Playlist
            skin="classic"
            tracks={tracks}
            currentTrack={currentTrack}
            onSelectTrack={onSelectTrack}
            onAddFiles={onAddFiles}
            onRemoveTrack={onRemoveTrack}
            onClearPlaylist={onClearPlaylist}
            onReorderTracks={onReorderTracks}
            loadingFilesMessage={loadingFilesMessage}
            onReimportTrack={onReimportTrack}
          />
        </div>
      )}

    </div>
  );
});
