import React from 'react';
import { VisualizerMode } from '../types';
import { motion } from 'motion/react';
import { Maximize2, Sliders, Palette, LayoutGrid } from 'lucide-react';
import { safeSetItem } from '../utils/safeStorage';

interface VisualizerControlsProps {
  visualizerMode: VisualizerMode;
  onSelectVisualizerMode: (mode: VisualizerMode) => void;
  visTheme: string;
  setVisTheme: (theme: string) => void;
  visSensitivity: number;
  setVisSensitivity: (sens: number) => void;
  onToggleFullscreenVisualizer?: () => void;
}

const VISUALIZER_BTN_MAP: { mode: VisualizerMode; label: string; fullName: string }[] = [
  { mode: 'spectrum', label: 'SPEC', fullName: 'Classic spectrum analyzer' },
  { mode: 'radial-spectrum', label: 'R-SP', fullName: 'Radial circular spectrum analyzer' },
  { mode: 'waveform-river', label: 'WAVE', fullName: 'Scrolling waveform history river' },
  { mode: 'kaleidoscope', label: 'KALE', fullName: 'Symmetric audio-reactive kaleidoscope' },
  { mode: 'album-wall', label: 'WALL', fullName: 'Mosaic wall of recent album covers' },
  { mode: 'oscilloscope', label: 'OSCI', fullName: 'Time domain oscilloscope' },
  { mode: 'fire', label: 'FIRE', fullName: 'Flame heat amplitude wave' },
  { mode: 'rainbow', label: 'RBOW', fullName: 'Spectral rainbow ribbon' },
  { mode: 'matrix-rain', label: 'MTRX', fullName: 'Digital Matrix rainfall' },
  { mode: 'starfield-warp', label: 'WARP', fullName: 'Starfield relativistic warp' },
  { mode: 'aurora', label: 'AURO', fullName: 'Magnetic solar aurora' },
  { mode: 'falling-stars', label: 'STAR', fullName: 'Galactic falling meteor showers' },
  { mode: 'vfd', label: 'VFD', fullName: 'Retro vacuum fluorescent display' },
  { mode: 'vu-meters', label: 'VUMT', fullName: 'Dual physical analog VU dial needles' },
  { mode: 'moloko-plus', label: 'MOLO', fullName: 'Ambient liquid particle flow' },
  { mode: 'spinning-cd', label: 'CD', fullName: 'Dynamic CD media spin' },
  { mode: 'turntable', label: 'TTAB', fullName: 'Interactive vinyl deck spinning' },
  { mode: 'minidisk', label: 'MDIS', fullName: 'Skeuomorphic minidisc system' },
  { mode: 'cassette', label: 'CASS', fullName: 'Linear cassette tape reels' },
  { mode: 'guitar-hero', label: 'HERO', fullName: 'Guitar Hero fretboard falling notes' },
  { mode: 'artwork', label: 'ARTW', fullName: 'Responsive album cover graphics' },
  { mode: 'vegas-strip', label: 'VEGA', fullName: 'Vegas Strip neon lights & slots' },
  { mode: 'skytree', label: 'TREE', fullName: 'Tokyo Skytree high-rise audio peaks' },
  { mode: 'lava-lamp', label: 'LAVA', fullName: 'Cozy fluid-dynamic Lava Lamp blobs' },
  { mode: 'synthwave-grid', label: 'GRID', fullName: 'Tron 3D neon outrun wireframe horizon' },
  { mode: 'plasma-globe', label: 'TESL', fullName: 'Gaseous electric high-voltage Tesla Plasma globe' },
  { mode: 'keygen', label: 'KGEN', fullName: 'Chiptune cracktro keygen & NFO scroller' },
  { mode: 'demoscene', label: 'DEMO', fullName: 'Amiga 3D vector twister & copper raster bars' },
  { mode: 'random', label: 'RAND', fullName: 'Multi-mode crossfade lifecycle' },
  { mode: 'off', label: 'OFF', fullName: 'Disable active visual analytics' },
];

export const VisualizerControls: React.FC<VisualizerControlsProps> = ({
  visualizerMode,
  onSelectVisualizerMode,
  visTheme,
  setVisTheme,
  visSensitivity,
  setVisSensitivity,
  onToggleFullscreenVisualizer,
}) => {
  const currentItem = VISUALIZER_BTN_MAP.find((item) => item.mode === visualizerMode);
  const modeFullName = currentItem ? currentItem.fullName : 'Custom Visualizer';

  const handleCycleTheme = () => {
    const themes: ('neon' | 'amber' | 'cyberpunk' | 'aqua' | 'mono')[] = ['neon', 'amber', 'cyberpunk', 'aqua', 'mono'];
    const idx = themes.indexOf(visTheme as any);
    const nextTheme = themes[(idx + 1) % themes.length]!;
    setVisTheme(nextTheme);
    safeSetItem('spinamp_vis_theme', nextTheme);
  };

  const handleNextMode = () => {
    const idx = VISUALIZER_BTN_MAP.findIndex((item) => item.mode === visualizerMode);
    const nextIdx = (idx + 1) % VISUALIZER_BTN_MAP.length;
    onSelectVisualizerMode(VISUALIZER_BTN_MAP[nextIdx]!.mode);
  };

  const handlePrevMode = () => {
    const idx = VISUALIZER_BTN_MAP.findIndex((item) => item.mode === visualizerMode);
    const prevIdx = idx - 1 < 0 ? VISUALIZER_BTN_MAP.length - 1 : idx - 1;
    onSelectVisualizerMode(VISUALIZER_BTN_MAP[prevIdx]!.mode);
  };

  const colors = {
    neon: 'bg-[#00ff44] shadow-[#00ff44]/30',
    amber: 'bg-[#f59e0b] shadow-[#f59e0b]/30',
    cyberpunk: 'bg-[#ec4899] shadow-[#ec4899]/30',
    aqua: 'bg-[#06b6d4] shadow-[#06b6d4]/30',
    mono: 'bg-[#e4e4e7] shadow-[#e4e4e7]/20',
  };

  const activeGlows = {
    neon: 'text-[#00ff44] drop-shadow-[0_0_4px_rgba(0,255,100,0.4)]',
    amber: 'text-[#f59e0b] drop-shadow-[0_0_4px_rgba(245,158,11,0.4)]',
    cyberpunk: 'text-[#ec4899] drop-shadow-[0_0_4px_rgba(236,72,153,0.4)]',
    aqua: 'text-[#06b6d4] drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]',
    mono: 'text-[#ffffff] drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]',
  }[visTheme] || 'text-[#00ff44]';

  return (
    <motion.div
      id="classic-vis-controls-dock"
      className="bg-[#1c1c20] border border-neutral-700/60 p-2.5 rounded font-mono text-[10px] text-zinc-300 w-full select-none shadow-md overflow-hidden shrink-0 space-y-2.5 relative"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 25 }}
    >
      {/* 1. Deck Header Strip */}
      <div className="flex justify-between items-center bg-[#282830] px-2 py-1 border border-neutral-700 rounded select-none">
        <div className="flex items-center gap-1">
          <LayoutGrid className="w-3 h-3 text-emerald-400" />
          <span className="text-zinc-100 font-bold tracking-widest text-[9px] uppercase text-[#3b82f6]">VIS CONTROLS DECK</span>
        </div>
        <div className="flex items-center gap-1.5 h-4">
          <button
            onClick={handleCycleTheme}
            className="px-1.5 py-0.2 rounded text-[7.5px] border border-neutral-700 hover:border-zinc-500 bg-neutral-800 text-zinc-300 active:scale-95 transition cursor-pointer flex items-center gap-0.5"
            title="Cycle theme palette"
            aria-label="Cycle theme palette"
          >
            <Palette className="w-2.5 h-2.5 text-amber-500" />
            <span>PALETTE</span>
          </button>
          
          {onToggleFullscreenVisualizer && (
            <button
              onClick={onToggleFullscreenVisualizer}
              className="p-0.5 rounded border border-neutral-700 hover:border-zinc-400 bg-neutral-800 text-zinc-400 hover:text-white transition cursor-pointer"
              title="Fullscreen visualizer overlay"
              aria-label="Fullscreen visualizer overlay"
            >
              <Maximize2 className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Hardware Display Screen & Main knobs Grid */}
      <div className="grid grid-cols-[auto_1fr] gap-3">
        {/* Left Side: Sensitivity Fader column */}
        <div className="flex flex-col items-center bg-black/45 border border-neutral-800 p-1.5 rounded w-11 shrink-0">
          <span className="text-[7.5px] text-zinc-500 font-bold select-none mb-1 text-center">BOOST</span>
          <div className="relative h-20 w-3 flex justify-center flex-1 my-1">
            {/* track strip */}
            <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-neutral-800 rounded -translate-x-1/2" />
            <input
              id="visualizer-sensitivity-slider"
              type="range"
              min="0.6"
              max="2.4"
              step="0.1"
              value={visSensitivity}
              {...({ orient: 'vertical' } as any)}
              onChange={(e) => setVisSensitivity(parseFloat(e.target.value))}
              className="w-full h-full opacity-0 cursor-ns-resize absolute inset-0 z-10"
              style={{ WebkitAppearance: 'slider-vertical' } as any}
              aria-label="Visualizer sensitivity boost"
              aria-valuemin={0.6}
              aria-valuemax={2.4}
              aria-valuenow={visSensitivity}
            />
            {/* Knob thumb container */}
            <div
              className="absolute w-3 h-2 bg-gradient-to-r from-blue-500 to-indigo-700 border border-blue-400 rounded-sm shadow pointer-events-none"
              style={{ bottom: `${((visSensitivity - 0.6) / 1.8) * 88}%` }}
            />
          </div>
          <span className="text-[7.5px] font-bold text-blue-400 leading-none tracking-wide text-center mt-1">
            {visSensitivity.toFixed(1)}x
          </span>
        </div>

        {/* Right Side: Glowing LED Status panel + Controls */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {/* LED digital terminal display */}
          <div className="bg-black border border-neutral-800/85 rounded p-1.5 flex flex-col justify-between h-[42px] relative overflow-hidden select-none">
            <div className="flex justify-between items-center text-[7.5px] text-neutral-600 font-bold leading-none uppercase select-none tracking-widest border-b border-neutral-900 pb-0.5">
              <span>VIS METRICS</span>
              <div className="flex gap-1 items-center">
                <span className="text-[6.5px]">STATUS:</span>
                <span className={`${visualizerMode !== 'off' ? 'text-emerald-500 animate-ping' : 'text-zinc-700'} w-1 h-1 rounded-full bg-current`} />
              </div>
            </div>
            
            <div className="flex items-center justify-between gap-1 leading-none pt-1">
              <button 
                onClick={handlePrevMode}
                className="w-4 h-4 rounded-sm border border-neutral-800 hover:border-neutral-600 bg-neutral-900 hover:bg-neutral-850 text-neutral-500 hover:text-neutral-300 flex items-center justify-center font-bold text-[8px] cursor-pointer"
                title="Previous vis mode"
                aria-label="Previous visualizer mode"
              >
                &lt;
              </button>
              
              <div className="flex-1 min-w-0 text-center flex flex-col justify-center">
                <span className={`text-[10px] font-bold font-mono tracking-wide truncate ${activeGlows} uppercase`}>
                  Mode: {currentItem ? currentItem.label : 'CUSTOM'}
                </span>
                <span className="text-[6px] text-zinc-500 truncate mt-0.5 lowercase tracking-wider leading-none">
                  {modeFullName}
                </span>
              </div>

              <button 
                onClick={handleNextMode}
                className="w-4 h-4 rounded-sm border border-neutral-800 hover:border-neutral-600 bg-neutral-900 hover:bg-neutral-850 text-neutral-500 hover:text-neutral-300 flex items-center justify-center font-bold text-[8px] cursor-pointer"
                title="Next vis mode"
                aria-label="Next visualizer mode"
              >
                &gt;
              </button>
            </div>
          </div>

          {/* Solid color preset swatch selectors */}
          <div className="bg-black/30 border border-neutral-850 p-1 rounded-md flex items-center justify-between gap-2">
            <span className="text-[7.5px] text-zinc-500 uppercase font-black tracking-widest pl-1 leading-none select-none">SWATCH:</span>
            <div className="flex items-center gap-1.5 pr-1">
              {(['neon', 'amber', 'cyberpunk', 'aqua', 'mono'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setVisTheme(t);
                    safeSetItem('spinamp_vis_theme', t);
                  }}
                  className={`w-3 h-3 rounded-full ${colors[t]} border ${
                    visTheme === t ? 'border-white scale-110 shadow-[0_0_4px_rgba(255,255,255,0.7)]' : 'border-neutral-950 scale-90 opacity-60 hover:opacity-100'
                  } transition duration-150 cursor-pointer`}
                  title={`Color theme: ${t}`}
                  aria-label={`Color theme: ${t}`}
                  aria-pressed={visTheme === t}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Fully functional Tactile Grid of Modes */}
      <div className="bg-black/40 border border-neutral-800 p-1 rounded flex flex-col gap-1 select-none">
        <div className="text-[6.5px] text-zinc-600 font-bold select-none tracking-widest uppercase pl-0.5">
          Tee-Rack Direct Matrix Presets
        </div>
        
        <div className="grid grid-cols-6 gap-1">
          {VISUALIZER_BTN_MAP.map((item) => {
            const isActive = visualizerMode === item.mode;
            
            // Generate visual styles based on activity and selected theme
            let activeStyles = 'bg-neutral-850 border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700';
            if (isActive) {
              if (visTheme === 'cyberpunk') {
                activeStyles = 'bg-pink-950 border-pink-500 text-pink-400 font-bold shadow-[0_0_5px_rgba(236,72,153,0.35)]';
              } else if (visTheme === 'amber') {
                activeStyles = 'bg-amber-950 border-amber-500 text-amber-500 font-bold shadow-[0_0_5px_rgba(245,158,11,0.35)]';
              } else if (visTheme === 'aqua') {
                activeStyles = 'bg-cyan-950 border-cyan-500 text-cyan-400 font-bold shadow-[0_0_5px_rgba(6,182,212,0.35)]';
              } else if (visTheme === 'mono') {
                activeStyles = 'bg-zinc-800 border-zinc-400 text-white font-bold shadow-[0_0_4px_rgba(255,255,255,0.25)]';
              } else {
                activeStyles = 'bg-emerald-950 border-emerald-500 text-emerald-400 font-bold shadow-[0_0_5px_rgba(16,185,129,0.35)]';
              }
            }

            return (
              <button
                key={item.mode}
                onClick={() => onSelectVisualizerMode(item.mode)}
                className={`h-4 text-[7px] border rounded-sm tracking-wide cursor-pointer flex items-center justify-center transition-all ${activeStyles}`}
                title={item.fullName}
                aria-label={item.fullName}
                aria-pressed={isActive}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
