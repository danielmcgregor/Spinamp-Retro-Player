import React, { useState, useEffect, useRef } from 'react';
import { Track, ScreenAppearance, FontPreset } from '../types';
import { MarqueeText } from './MarqueeText';
import { Music } from 'lucide-react';

interface UnifiedTrackScreenProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  trackBPM: number | null;
  isBpmDetecting: boolean;
  sleepTimeLeft: number | null;
  onToggleSleepTimer: () => void;
  timeDisplayMode: 'elapsed' | 'remaining';
  onToggleTimeDisplayMode: () => void;
  formatTime: (time: number) => string;
  skin?: 'classic' | 'bento';
  appearance?: ScreenAppearance;
  onChangeAppearance?: (app: ScreenAppearance) => void;
  fontPreset?: FontPreset;
  onChangeFontPreset?: (font: FontPreset) => void;
}

export const UnifiedTrackScreen: React.FC<UnifiedTrackScreenProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  trackBPM,
  isBpmDetecting,
  sleepTimeLeft,
  onToggleSleepTimer,
  timeDisplayMode,
  onToggleTimeDisplayMode,
  formatTime,
  skin = 'classic',
  appearance: appearanceProp,
  onChangeAppearance,
  fontPreset: fontPresetProp,
  onChangeFontPreset
}) => {
  // Load persisted layouts or default (backup local state)
  const [localAppearance, setLocalAppearance] = useState<ScreenAppearance>(() => {
    return (localStorage.getItem('spinamp_screen_appearance') as ScreenAppearance) || 'default';
  });
  const [localFontPreset, setLocalFontPreset] = useState<FontPreset>(() => {
    return (localStorage.getItem('spinamp_screen_font') as FontPreset) || 'mono';
  });

  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [currentTrack?.coverUrl]);

  const kbps = React.useMemo(() => {
    if (currentTrack?.file && duration > 0 && Number.isFinite(duration)) {
      const bits = currentTrack.file.size * 8;
      const kbits = bits / 1000;
      return Math.min(Math.max(Math.round(kbits / duration), 64), 1411);
    } else if (currentTrack?.url) {
      return 128;
    }
    return 192;
  }, [currentTrack, duration]);

  const appearance = appearanceProp !== undefined ? appearanceProp : localAppearance;
  const fontPreset = fontPresetProp !== undefined ? fontPresetProp : localFontPreset;

  const setAppearanceAndSync = (app: ScreenAppearance) => {
    if (onChangeAppearance) {
      onChangeAppearance(app);
    } else {
      setLocalAppearance(app);
      localStorage.setItem('spinamp_screen_appearance', app);
    }
  };

  const setFontPresetAndSync = (font: FontPreset) => {
    if (onChangeFontPreset) {
      onChangeFontPreset(font);
    } else {
      setLocalFontPreset(font);
      localStorage.setItem('spinamp_screen_font', font);
    }
  };

  // Sync to local storage for local state backup
  useEffect(() => {
    if (appearanceProp === undefined) {
      localStorage.setItem('spinamp_screen_appearance', localAppearance);
    }
  }, [localAppearance, appearanceProp]);

  useEffect(() => {
    if (fontPresetProp === undefined) {
      localStorage.setItem('spinamp_screen_font', localFontPreset);
    }
  }, [localFontPreset, fontPresetProp]);

  // Helper file location resolver
  const getFileLocation = () => {
    if (!currentTrack) {
      return 'SYSTEM:\\UNLOADED_DEVICE';
    }
    if (currentTrack.file) {
      const escapedRelative = currentTrack.file.webkitRelativePath 
        ? currentTrack.file.webkitRelativePath.replace(/\//g, '\\') 
        : '';
      return escapedRelative 
        ? `C:\\Music\\${escapedRelative}` 
        : `C:\\Music\\Local Uploads\\${currentTrack.file.name}`;
    }
    const safeTitle = currentTrack.title
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '_');
    return `C:\\Program Files\\Spinamp\\Demo\\${safeTitle}.mp3`;
  };

  // Styling maps
  const getContainerClasses = () => {
    switch (appearance) {
      case 'custom':
        return 'bg-[var(--skin-panel)] border border-[var(--skin-border)] text-[var(--skin-text)] p-2 flex flex-col gap-1.5 rounded-md transition-all duration-300 select-none';
      case 'lcd':
        return 'bg-[#849a6a] border-2 border-[#556940] text-[#1a2311] p-2 flex flex-col gap-1.5 shadow-[inset_0_3px_8px_rgba(0,0,0,0.4)] rounded-md transition-all duration-300 select-none';
      case 'oled':
        return 'bg-black border border-zinc-900 text-[var(--skin-accent,#00ffcc)] p-2 flex flex-col gap-1.5 rounded-md transition-all duration-300 select-none shadow-[0_0_8px_var(--skin-accent-shadow,rgba(0,255,204,0.1))]';
      case 'e-ink':
        return 'bg-[#e5e2da] border-2 border-[#b0ad9e] text-[#1c1c1a] p-2 flex flex-col gap-1.5 shadow-sm rounded-md transition-all duration-300 select-none';
      case 'cyberpunk':
        return 'bg-[#0f0414] border-2 border-[#ff0055] text-[#ff00a0] p-2 flex flex-col gap-1.5 shadow-[0_0_12px_rgba(255,0,85,0.4)] rounded-md transition-all duration-300 select-none relative overflow-hidden';
      case 'default':
      default:
        // Match player theme but combined elegantly
        return 'bg-black/90 text-zinc-100 border border-neutral-800 p-2 flex flex-col gap-1.5 rounded shadow-inner transition-all duration-300 select-none';
    }
  };

  const getFontClass = () => {
    switch (fontPreset) {
      case 'sans':
        return 'font-sans';
      case 'serif':
        return 'font-serif';
      case 'display':
        return 'font-sans uppercase tracking-[0.1em] font-black italic';
      case 'mono':
      default:
        return 'font-mono';
    }
  };

  const getAccentTextClass = () => {
    switch (appearance) {
      case 'custom':
        return 'text-[var(--skin-accent)] font-bold';
      case 'lcd':
        return 'text-[#1a2311]/70';
      case 'oled':
        return 'text-[var(--skin-accent,#00ffcc)] font-black drop-shadow-[0_0_2px_var(--skin-accent-shadow,rgba(0,255,204,0.4))]';
      case 'e-ink':
        return 'text-[#1c1c1a] font-bold';
      case 'cyberpunk':
        return 'text-[#00ff66] font-bold drop-shadow-[0_0_4px_rgba(0,255,102,0.5)]';
      case 'default':
      default:
        return 'text-emerald-400';
    }
  };

  const getMutedTextClass = () => {
    switch (appearance) {
      case 'custom':
        return 'text-[var(--skin-text)] opacity-60';
      case 'lcd':
        return 'text-[#1a2311]/60';
      case 'oled':
        return 'text-zinc-500';
      case 'e-ink':
        return 'text-neutral-500';
      case 'cyberpunk':
        return 'text-amber-400/80';
      case 'default':
      default:
        return 'text-zinc-500';
    }
  };

  const getClockContainerClass = () => {
    switch (appearance) {
      case 'custom':
        return 'bg-[var(--skin-bg)] text-[var(--skin-accent)] border border-[var(--skin-border)] rounded px-1.5 py-1 flex flex-col justify-center text-right shadow-inner';
      case 'lcd':
        return 'bg-[#708457] text-[#1a2311] border border-[#556940]/40 rounded px-1.5 py-1 flex flex-col justify-center text-right shadow-inner';
      case 'oled':
        return 'bg-black border border-zinc-900 text-white rounded px-1.5 py-1 flex flex-col justify-center text-right shadow-inner';
      case 'e-ink':
        return 'bg-[#d8d4ca] text-[#1c1c1a] border border-[#b0ad9e] rounded px-1.5 py-1 flex flex-col justify-center text-right shadow-sm';
      case 'cyberpunk':
        return 'bg-[#21022d] text-[#00ff66] border border-[#ff00a0]/30 rounded px-1.5 py-1 flex flex-col justify-center text-right shadow-[inset_0_1px_5px_rgba(0,0,0,0.8)]';
      case 'default':
      default:
        return 'bg-[#020d03] text-[#00ff44] border border-black rounded px-1.5 py-1 flex flex-col justify-center text-right shadow-inner';
    }
  };

  const getSleepBadgeClass = (active: boolean) => {
    if (active) {
      switch (appearance) {
        case 'custom':
          return 'bg-[var(--skin-accent)]/15 border-[var(--skin-accent)]/40 text-[var(--skin-accent)] animate-pulse';
        case 'lcd':
          return 'bg-[#1a2311]/15 border-[#1a2311]/40 text-[#1a2311] animate-pulse';
        case 'oled':
          return 'bg-white/10 border-white/40 text-[var(--skin-accent,#00ffcc)] animate-pulse';
        case 'e-ink':
          return 'bg-neutral-800 text-white border border-neutral-900 animate-pulse';
        case 'cyberpunk':
          return 'bg-[#ff0055]/30 border-[#ff0055] text-[#ff0055] animate-pulse shadow-[0_0_4px_rgba(255,0,85,0.4)]';
        case 'default':
        default:
          return 'bg-[#00ff44]/15 border-[#00ff44]/40 text-[#00ff44] hover:bg-[#00ff44] hover:text-black animate-pulse shadow-[0_0_5px_rgba(0,255,68,0.3)]';
      }
    } else {
      switch (appearance) {
        case 'custom':
          return 'bg-transparent border-[var(--skin-accent)]/20 text-[var(--skin-accent)]/60 hover:text-[var(--skin-accent)] hover:border-[var(--skin-accent)]/40';
        case 'lcd':
          return 'bg-transparent border-[#1a2311]/20 text-[#1a2311]/50 hover:text-[#1a2311] hover:border-[#1a2311]/40';
        case 'oled':
          return 'bg-transparent border-zinc-800 text-zinc-600 hover:text-zinc-300 hover:border-zinc-700';
        case 'e-ink':
          return 'bg-[#e5e2da]/40 border-neutral-400 text-neutral-500 hover:text-black hover:border-black';
        case 'cyberpunk':
          return 'bg-transparent border-neutral-800 text-neutral-600 hover:text-[#ff00a0] hover:border-neutral-700';
        case 'default':
        default:
          return 'bg-black border-neutral-800 text-neutral-600 hover:text-neutral-300 hover:border-neutral-700';
      }
    }
  };

  const getBpmBadgeStyle = () => {
    switch (appearance) {
      case 'custom':
        return 'text-[var(--skin-accent)] bg-[var(--skin-accent)]/5 px-1 py-[1px] rounded border border-[var(--skin-accent)]/15';
      case 'lcd':
        return 'text-[#1a2311]/80 bg-[#1a2311]/5 px-1 py-[1px] rounded border border-[#1a2311]/10';
      case 'oled':
        return 'text-[var(--skin-accent,#00ffcc)] bg-neutral-900 px-1 py-[1px] rounded border border-neutral-800';
      case 'e-ink':
        return 'text-[#1c1c1a]/90 bg-[#d8d4ca] px-1 py-[1px] rounded border border-[#b0ad9e]';
      case 'cyberpunk':
        return 'text-[#00ff66] bg-[#21022d] px-1 py-[1px] rounded border border-[#00ff66]/20';
      case 'default':
      default:
        return 'text-amber-500/90 bg-amber-500/5 px-1 py-[1px] rounded border border-amber-500/10';
    }
  };

  const getPlayStopDotsClass = () => {
    switch (appearance) {
      case 'custom':
        return 'text-[var(--skin-accent)]/60 font-bold';
      case 'lcd':
        return 'text-[#1a2311]/60 font-bold';
      case 'oled':
        return 'text-zinc-500 font-bold';
      case 'e-ink':
        return 'text-neutral-500 font-bold';
      case 'cyberpunk':
        return 'text-[#ff00a0]/60 font-bold';
      case 'default':
      default:
        return 'text-zinc-500 font-bold';
    }
  };

  const getPlayHighlight = () => {
    switch (appearance) {
      case 'lcd':
        return isPlaying ? 'text-[#1a2311] font-black' : 'text-[#1a2311]/30';
      case 'oled':
        return isPlaying ? 'text-[var(--skin-accent,#00ffcc)] font-black drop-shadow-[0_0_2px_var(--skin-accent-shadow,rgba(0,255,204,0.4))]' : 'text-zinc-800';
      case 'e-ink':
        return isPlaying ? 'text-[#1c1c1a] font-extraboldunderline underline' : 'text-neutral-400';
      case 'cyberpunk':
        return isPlaying ? 'text-[#00ff66] font-black drop-shadow-[0_0_3px_rgba(0,255,102,0.4)]' : 'text-purple-950';
      case 'default':
      default:
        return isPlaying ? 'text-[#00ff44] font-bold' : 'text-neutral-700';
    }
  };

  const getStopHighlight = () => {
    switch (appearance) {
      case 'lcd':
        return isPlaying ? 'text-[#1a2311]/30' : 'text-[#1a2311] font-black';
      case 'oled':
        return isPlaying ? 'text-zinc-800' : 'text-[#ff3b3b] font-black drop-shadow-[0_0_2px_rgba(255,59,59,0.4)]';
      case 'e-ink':
        return isPlaying ? 'text-neutral-400' : 'text-[#1c1c1a] font-extrabold underline underline';
      case 'cyberpunk':
        return isPlaying ? 'text-purple-950' : 'text-[#ff0055] font-black drop-shadow-[0_0_3px_rgba(255,0,85,0.4)]';
      case 'default':
      default:
        return isPlaying ? 'text-neutral-700' : 'text-rose-500 font-bold';
    }
  };

  return (
    <div 
      className={getContainerClasses()} 
      id="unified-player-screen"
      title={`Unified Audio Display Console (Active Preset: ${appearance.toUpperCase()} Screen, ${fontPreset.toUpperCase()} Font)`}
    >
      <div 
        className={`w-full flex flex-col justify-between overflow-hidden p-1 transition ${getFontClass()}`}
        id="unified-track-screen-content"
      >
        {/* FIRST ROW - Track details on left, and Clock time on right next to it */}
        <div className="flex justify-between items-start gap-4 w-full">
          {/* Track metadata info section */}
          <div 
            className="flex-1 overflow-hidden select-none border border-transparent p-1.5 rounded"
            id="unified-track-interact-zone"
          >
            {currentTrack ? (
              <div className="flex items-center gap-2.5 w-full overflow-hidden">
                {/* Cover Art thumbnail */}
                <div className="w-10 h-10 shrink-0 rounded overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center relative shadow-sm">
                  {currentTrack.coverUrl && !imageError ? (
                    <img
                      src={currentTrack.coverUrl}
                      alt="Cover Art"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full opacity-60">
                      <Music className="w-5 h-5" style={{ color: appearance === 'lcd' ? '#1a2311' : undefined }} />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 overflow-hidden">
                  <MarqueeText 
                    text={currentTrack.title}
                    className={`${getAccentTextClass()} font-bold text-lg md:text-xl leading-snug`}
                  />
                  <div className={`text-[10px] leading-tight truncate flex items-center gap-1.5 mt-0.5 ${getMutedTextClass()}`}>
                    <span className="truncate max-w-[65%]">{currentTrack.artist} • {currentTrack.album || 'No Album'}</span>
                    <span>|</span>
                    <span className={`flex items-center gap-1 shrink-0 font-bold text-[8px] ${getBpmBadgeStyle()}`}>
                      <span 
                        className={`w-1 h-1 rounded-full bg-amber-400 shrink-0 ${isPlaying && trackBPM ? 'bpm-beat-indicator-active' : 'opacity-40'}`} 
                        style={isPlaying && trackBPM ? { animationDuration: `${60 / trackBPM}s`, backgroundColor: appearance === 'lcd' ? '#1a2311' : undefined } : undefined} 
                      />
                      <span>{isBpmDetecting ? 'DET...' : `${trackBPM || '--'} BPM`}</span>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                <div className={`${getAccentTextClass()} text-xs font-bold font-mono tracking-widest`}>*** CLOSED ***</div>
                <div className={`${getMutedTextClass()} text-[9px]`}>&lt;No audio file currently active&gt;</div>
              </div>
            )}
          </div>

          {/* Clock readout section - next to the track metadata details */}
          <div 
            className={`flex flex-col justify-center items-end px-2.5 py-1.5 rounded cursor-pointer hover:brightness-125 transition select-none ${getClockContainerClass()}`}
            id="unified-clock-panel"
            onClick={onToggleTimeDisplayMode}
            title={timeDisplayMode === 'remaining' ? 'Click clock to reveal Elapsed' : 'Click clock to reveal Remaining'}
            role="button"
            aria-label={timeDisplayMode === 'remaining' ? "Show elapsed time" : "Show remaining time"}
          >
            <span className="text-xl md:text-2xl tracking-wider leading-none font-bold">
              {formatTime(currentTime)}
            </span>
            <span className={`text-[7px] tracking-wider mt-0.5 uppercase opacity-75 font-semibold ${appearance === 'e-ink' ? 'text-[#1c1c1a]' : ''}`}>
              {timeDisplayMode === 'remaining' ? 'REM / SEC' : (currentTrack ? `Total: ${formatTime(duration)}` : '0:00')}
            </span>
          </div>
        </div>

        {/* SECOND ROW - File Path detail info */}
        <div className="mt-1 flex flex-col gap-0.5 px-1.5">
          <div className={`text-[6px] tracking-wider uppercase font-extrabold ${getMutedTextClass()}`}>
            FILE PATH LOCATION :
          </div>
          <div 
            className={`text-[8px] truncate font-mono select-all bg-black/20 px-1 py-0.5 rounded leading-none ${getMutedTextClass()}`}
            title={getFileLocation()}
          >
            {getFileLocation()}
          </div>
        </div>

        {/* THIRD ROW - Status bar indicators */}
        <div className={`flex items-center gap-1.5 text-[7px] mt-1.5 px-1.5 select-none font-mono ${getPlayStopDotsClass()}`}>
          <span className={getPlayHighlight()}>▶ PLAY</span>
          <span className={getStopHighlight()}>■ STOP</span>
          <span>•</span>
          <span className="opacity-80">{kbps}kbps</span>
          <span className="mx-1 opacity-30">|</span>
          <span className="text-[6px] tracking-widest font-black uppercase underline decoration-[#1a2311]/20">
            UI: {appearance} / {fontPreset}
          </span>
         </div>
      </div>
    </div>
  );
};
