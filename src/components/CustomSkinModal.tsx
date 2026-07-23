import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { GimpColorPicker } from './GimpColorPicker';
import { PALETTE_BANK } from '../data/palettes';

interface CustomSkinType {
  name: string;
  bg: string;
  bgAlt?: string;
  panel: string;
  border: string;
  accent: string;
  text: string;
  texture?: string;
  glow?: string;
  bezel?: string;
}

interface CustomSkinModalProps {
  isOpen: boolean;
  customSkin: CustomSkinType;
  oldColors: { bg: string; panel: string; accent: string; border: string; text: string } | null;
  onClose: () => void;
  onApply: () => void;
  onSkinChange: (newSkin: CustomSkinType) => void;
  onRandomSkin: () => void;
}

export const CustomSkinModal: React.FC<CustomSkinModalProps> = ({
  isOpen,
  customSkin,
  oldColors,
  onClose,
  onApply,
  onSkinChange,
  onRandomSkin,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-[#07080b] z-[100] flex flex-col transition-all animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full h-full flex flex-col bg-[#0b0c10] text-neutral-200 font-sans relative overflow-hidden cursor-default border-t-2 border-[#ff7b00]/80 shadow-[inset_0_1px_0_rgba(255,123,0,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Retro scanline background layer */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[size:100%_4px,_6px_100%] z-0" />

        {/* Corner Decorative Chassis Screws */}
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-zinc-800 border-t border-zinc-600 shadow-[inset_0_1px_1px_rgba(0,0,0,0.8)] flex items-center justify-center z-20">
          <div className="w-1.5 h-[1px] bg-zinc-500 transform rotate-45" />
        </div>
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-zinc-800 border-t border-zinc-600 shadow-[inset_0_1px_1px_rgba(0,0,0,0.8)] flex items-center justify-center z-20">
          <div className="w-1.5 h-[1px] bg-zinc-500 transform -rotate-45" />
        </div>
        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-zinc-800 border-t border-zinc-600 shadow-[inset_0_1px_1px_rgba(0,0,0,0.8)] flex items-center justify-center z-20">
          <div className="w-1.5 h-[1px] bg-zinc-500 transform -rotate-45" />
        </div>
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-zinc-800 border-t border-zinc-600 shadow-[inset_0_1px_1px_rgba(0,0,0,0.8)] flex items-center justify-center z-20">
          <div className="w-1.5 h-[1px] bg-zinc-500 transform rotate-45" />
        </div>

        {/* Header with analog styling */}
        <div className="flex justify-between items-center border-b border-neutral-800/80 pb-3 mb-2 px-6 pt-4 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_#f97316]" />
            <span className="text-[11px] font-mono uppercase tracking-widest font-extrabold text-[#f97316]">Skin Configurator V1.5 [Fullscreen Customizer]</span>
          </div>
          <button 
            onClick={onClose}
            className="text-neutral-500 hover:text-orange-400 p-1 hover:bg-neutral-900 rounded-md transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customizer form wrapping the split screen layout */}
        <form onSubmit={(e) => {
          e.preventDefault();
          onApply();
        }} className="flex-1 flex flex-col min-h-0 min-w-0 z-10 px-6 pb-6">

          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto md:overflow-hidden min-h-0 py-2">
            
            {/* Left Column: Preview & presets. Highly polished! */}
            <div className="md:col-span-5 flex flex-col space-y-4 md:overflow-y-auto pr-0 md:pr-2 custom-scrollbar">
              
              {/* LIVE PREVIEW BOX */}
              <div className="bg-neutral-950/40 border border-neutral-900/60 p-3 rounded-xl shrink-0">
                <span className="text-[8.5px] text-neutral-400 font-mono uppercase tracking-wider block mb-2 font-bold text-left">Analog Screen Live Preview</span>
                <div 
                  className="p-3 border transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-36"
                  style={{ 
                    backgroundColor: customSkin.bg, 
                    borderColor: customSkin.border,
                    borderWidth: '2px',
                    borderRadius: customSkin.bezel === 'retro' ? '0px' : customSkin.bezel === 'modern' ? '12px' : '6px',
                    boxShadow: customSkin.glow === 'vibrant' ? `0 0 14px ${customSkin.accent}66, inset 0 1px 0 rgba(255,255,255,0.15)` : customSkin.glow === 'subtle' ? `0 0 5px ${customSkin.accent}22` : `none`,
                    backgroundImage: customSkin.texture === 'brushed' ? 'radial-gradient(circle at 50% 15%, rgba(255,255,255,0.1), transparent 60%), linear-gradient(to bottom, rgba(255,255,255,0.02), rgba(0,0,0,0.15))' :
                                     customSkin.texture === 'carbon' ? 'linear-gradient(45deg, rgba(0,0,0,0.25) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.25) 75%), linear-gradient(45deg, rgba(0,0,0,0.25) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.25) 75%) shadow-sm' :
                                     customSkin.texture === 'scanlines' ? 'linear-gradient(rgba(0,0,0,0.15) 50%, rgba(255,255,255,0.02) 50%)' :
                                     customSkin.texture === 'hexagrid' ? `radial-gradient(${customSkin.accent}12 1px, transparent 1px)` : 'none',
                    backgroundSize: customSkin.texture === 'carbon' ? '4px 4px' : customSkin.texture === 'scanlines' ? '100% 3px' : customSkin.texture === 'hexagrid' ? '6px 6px' : 'auto',
                    backgroundPosition: customSkin.texture === 'carbon' ? '0 0, 2px 2px' : 'auto'
                  }}
                >
                  {/* Simulated grid gloss */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.01] to-white/[0.03] pointer-events-none" />

                  {/* Simulated Inner Panel Screen */}
                  <div 
                    className="rounded p-2 border flex-1 flex flex-col justify-between"
                    style={{
                      backgroundColor: customSkin.panel,
                      borderColor: customSkin.border,
                      borderWidth: '1px',
                      boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.8)'
                    }}
                  >
                    {/* Track info block */}
                    <div className="flex justify-between items-start gap-1 z-10 font-sans">
                      <div className="flex-1 min-w-0">
                        <span className="text-[7.5px] uppercase tracking-wider font-mono block opacity-50 select-none text-left" style={{ color: customSkin.text }}>PREVIEW STATE</span>
                        <span className="text-[11px] font-bold tracking-tight block truncate text-left shrink-0 leading-none mt-1 font-sans" style={{ color: customSkin.text }}>
                          {customSkin.name || 'My Custom Skin'}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold leading-none select-none block-inline" style={{ color: customSkin.accent, textShadow: customSkin.glow === 'vibrant' ? `0 0 4px ${customSkin.accent}` : 'none' }}>
                          03:42
                        </span>
                      </div>
                    </div>

                    {/* Simulated visualizer bars */}
                    <div className="flex items-end gap-[1px] h-8 mt-2.5 z-10 w-full active-preview-vis">
                      {[45, 85, 60, 95, 30, 75, 50, 65, 80, 40, 90, 70, 45, 85, 60, 95, 30].map((h, idx) => (
                        <div 
                          key={idx} 
                          className="flex-1 rounded-[0.5px]" 
                          style={{ 
                            height: `${h}%`, 
                            backgroundColor: customSkin.accent,
                            opacity: 0.2 + (idx % 3) * 0.3,
                            boxShadow: customSkin.glow === 'vibrant' ? `0 0 3px ${customSkin.accent}` : 'none'
                          }} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Skin Title Header Box */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="custom-skin-name-input" className="text-[8.5px] text-neutral-400 font-mono uppercase tracking-wider block text-left font-bold">Chassis Labels / Identity</label>
                <input
                  id="custom-skin-name-input"
                  type="text"
                  required
                  value={customSkin.name}
                  onChange={(e) => onSkinChange({ ...customSkin, name: e.target.value })}
                  placeholder="Enter custom skin title"
                  className="w-full bg-black/95 border border-neutral-800 hover:border-neutral-700 rounded-lg px-2.5 py-1.5 text-center font-bold text-xs text-orange-400 focus:outline-none focus:border-orange-500/60 shadow-inner"
                />
              </div>

              {/* Starter Presets Container */}
              <div className="space-y-2 bg-neutral-950/40 border border-neutral-900/60 p-3 rounded-lg flex-1 min-h-[180px] flex flex-col justify-between">
                <div>
                  <span className="text-[8.5px] text-neutral-400 font-mono uppercase tracking-wider block text-left mb-1.5 font-bold">COLOUR DECK PRESETS</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PALETTE_BANK.slice(0, 8).map((preset) => {
                      const isSelectedPreset = customSkin.bg === preset.bg && customSkin.accent === preset.accent;
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => onSkinChange({
                            name: preset.name.split(' ')[0] + ' Custom',
                            bg: preset.bg,
                            bgAlt: preset.bg,
                            panel: preset.panel,
                            border: preset.border,
                            accent: preset.accent,
                            text: preset.text,
                            texture: preset.texture,
                            glow: preset.glow,
                            bezel: preset.bezel
                          })}
                          className={`text-[8.5px] p-1 bg-neutral-900/90 border rounded text-left transition hover:border-orange-500/50 hover:text-white cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap block ${
                            isSelectedPreset ? 'border-orange-500/70 text-orange-400 font-bold bg-[#14151a]' : 'border-neutral-800 text-neutral-400'
                          }`}
                        >
                          {preset.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onRandomSkin}
                    className="w-full flex items-center justify-center gap-1.5 h-8 bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/40 hover:border-orange-500/80 text-orange-400 hover:text-orange-300 font-mono text-[9px] font-bold uppercase rounded transition duration-250 cursor-pointer shadow-[0_0_8px_rgba(249,115,22,0.05)]"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                    Generate Random Skin 🧪
                  </button>
                </div>
              </div>

              {/* Surface, Bezel and Glow Options Row */}
              <div className="bg-[#18191c]/45 p-3 border border-neutral-900/60 rounded-lg space-y-2 shrink-0">
                <span className="text-[8.5px] text-neutral-400 font-mono uppercase tracking-wider block text-left font-bold">Hardware Finish Parameters</span>
                
                <div className="grid grid-cols-2 gap-2 text-[8.5px] font-mono">
                  {/* Chassis Texture */}
                  <div className="flex flex-col gap-1">
                    <span className="text-neutral-400 text-[8px] tracking-tight uppercase font-mono block text-left font-bold">SURFACE FINISH</span>
                    <select
                      value={customSkin.texture || 'none'}
                      onChange={(e) => onSkinChange({ ...customSkin, texture: e.target.value })}
                      className="w-full bg-black border border-neutral-800 rounded px-1.5 py-1 text-[8.5px] text-orange-400 font-mono focus:outline-none cursor-pointer"
                    >
                      <option value="none">Solid Matte</option>
                      <option value="brushed">Brushed Luster</option>
                      <option value="carbon">Carbon Fiber</option>
                      <option value="scanlines">Scanlines</option>
                      <option value="hexagrid">Hexa-Grid</option>
                    </select>
                  </div>

                  {/* Bezels */}
                  <div className="flex flex-col gap-1">
                    <span className="text-neutral-400 text-[8px] tracking-tight uppercase font-mono block text-left font-bold">CHASSIS EDGE</span>
                    <select
                      value={customSkin.bezel || 'bento'}
                      onChange={(e) => onSkinChange({ ...customSkin, bezel: e.target.value })}
                      className="w-full bg-black border border-neutral-800 rounded px-1.5 py-1 text-[8.5px] text-orange-400 font-mono focus:outline-none cursor-pointer"
                    >
                      <option value="retro">Retro Sharp (0px)</option>
                      <option value="bento">Bento Rounded (6px)</option>
                      <option value="modern">Sleek Capsule (16px)</option>
                    </select>
                  </div>
                </div>

                {/* Glow Intensity */}
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-neutral-400 text-[8px] tracking-tight uppercase font-mono block text-left font-bold">LED MODULE GLOW</span>
                  <div className="grid grid-cols-3 gap-1">
                    {['off', 'subtle', 'vibrant'].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => onSkinChange({ ...customSkin, glow: lvl })}
                        className={`text-[8px] uppercase py-1 px-1 border rounded transition cursor-pointer font-bold ${
                          (customSkin.glow || 'subtle') === lvl
                            ? 'border-orange-500 bg-orange-500/15 text-orange-400'
                            : 'border-neutral-800 hover:border-neutral-700 text-neutral-500 bg-neutral-905'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: GIMP Color Picker Workbench */}
            <div className="md:col-span-7 flex flex-col md:overflow-y-auto pl-0 md:pl-2 custom-scrollbar">
              <div className="bg-neutral-950/20 border border-neutral-900/60 p-4 rounded-xl flex-1 flex flex-col justify-between">
                <GimpColorPicker 
                  customSkin={customSkin as any}
                  onChangeSkinColor={(channel, hex) => {
                    onSkinChange({
                      ...customSkin,
                      [channel]: hex,
                      bgAlt: channel === 'bg' ? hex : customSkin.bgAlt,
                      panel: channel === 'panel' ? hex : customSkin.panel
                    });
                  }}
                  oldColors={oldColors}
                />

                {/* Action Buttons */}
                <div className="border-t border-neutral-800/80 pt-4 mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 h-10 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-lg font-mono text-[10px] font-bold text-neutral-400 tracking-wider transition uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-10 bg-[#ff7b00] hover:bg-orange-500 text-black font-black text-[10px] uppercase rounded-lg tracking-widest transition cursor-pointer shadow-[0_0_12px_rgba(249,115,22,0.3)] hover:shadow-[0_0_20px_rgba(249,115,22,0.5)]"
                  >
                    Apply Skin
                  </button>
                </div>

              </div>
            </div>

          </div>

        </form>
      </div>
    </div>
  );
};
