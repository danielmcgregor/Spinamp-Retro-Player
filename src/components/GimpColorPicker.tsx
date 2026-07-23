import React, { useState, useEffect, useRef } from 'react';
import { Pipette, RotateCcw, Plus, Trash2 } from 'lucide-react';

export interface GimpColorPickerProps {
  customSkin: {
    bg: string;
    bgAlt: string;
    panel: string;
    border: string;
    accent: string;
    text: string;
    name: string;
    texture?: string;
    glow?: string;
    bezel?: string;
  };
  onChangeSkinColor: (channel: 'bg' | 'panel' | 'accent' | 'border' | 'text', hex: string) => void;
  oldColors: {
    bg: string;
    panel: string;
    accent: string;
    border: string;
    text: string;
  } | null;
}

// Color representation conversions
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  if (clean.length < 6) return { r: 0, g: 0, b: 0 };
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return {
    r: isNaN(r) ? 0 : r,
    g: isNaN(g) ? 0 : g,
    b: isNaN(b) ? 0 : b,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const componentToHex = (c: number) => {
    const val = Math.min(255, Math.max(0, Math.round(c)));
    const hex = val.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  s = s / 100;
  v = v / 100;
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h / 60);
  const f = h / 60 - i;
  const p = v * (1 - s);
  const q = v * (1 - s * f);
  const t = v * (1 - s * (1 - f));
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

export function GimpColorPicker({ customSkin, onChangeSkinColor, oldColors }: GimpColorPickerProps) {
  // Available channels for skin customizing
  const channels = [
    { id: 'accent' as const, label: '3. LED Accent', desc: 'Stereo visualizer LED filaments and highlight glow' },
    { id: 'bg' as const, label: '1. Chassis BG', desc: 'Main brushed steel background surrounding panels' },
    { id: 'panel' as const, label: '2. Deck Screen', desc: 'LCD visual display dashboard inner mask faceplate' },
    { id: 'border' as const, label: '4. Bezel Chrome', desc: 'Hardware outlines, button bevel borders & rails' },
    { id: 'text' as const, label: '5. Text Glyph', desc: 'Digital characters, clock units & system tags color' },
  ];

  const [activeChannel, setActiveChannel] = useState<'bg' | 'panel' | 'accent' | 'border' | 'text'>('accent');

  // HSV & RGB & Hex states for the selected channel
  const [hue, setHue] = useState(180);
  const [saturation, setSaturation] = useState(50);
  const [val, setVal] = useState(50);

  const [red, setRed] = useState(128);
  const [green, setGreen] = useState(128);
  const [blue, setBlue] = useState(128);

  const [hexInput, setHexInput] = useState('#808080');

  // GIMP radio dimension selector (Determines what parameter is mapped to the vertical strip)
  // Options: 'H' | 'S' | 'V' | 'R' | 'G' | 'B'.
  // Default is 'H' (Hue) which is the most intuitive. But let them switch for authentic experience!
  const [gimpMode, setGimpMode] = useState<'H' | 'S' | 'V' | 'R' | 'G' | 'B'>('H');

  // Saved Swatches History Palettes (Persisted in LocalStorage)
  const [swatches, setSwatches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gimp_swatch_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      '#ff9100', '#00ffc4', '#00ffd5', '#ff007f', '#f59e0b', '#00ff44',
      '#ff1234', '#a17036', '#12131c', '#0d0d14', '#111317', '#ffffff'
    ];
  });

  // References to 2D Box and vertical strip
  const svBoxRef = useRef<HTMLDivElement>(null);
  const verticalStripRef = useRef<HTMLDivElement>(null);

  // Is dragging states
  const [isDraggingSv, setIsDraggingSv] = useState(false);
  const [isDraggingStrip, setIsDraggingStrip] = useState(false);

  // Synchronize component states when customSkin active channel's color changes
  const activeColorValue = customSkin[activeChannel] || '#808080';

  useEffect(() => {
    if (activeColorValue) {
      setHexInput(activeColorValue);
      const rgb = hexToRgb(activeColorValue);
      setRed(rgb.r);
      setGreen(rgb.g);
      setBlue(rgb.b);

      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      setHue(hsv.h);
      setSaturation(hsv.s);
      setVal(hsv.v);
    }
  }, [activeChannel, activeColorValue]);

  // Propagate changes to the customSkin context
  const updateChannelColor = (newHex: string) => {
    setHexInput(newHex);
    onChangeSkinColor(activeChannel, newHex);
  };

  // State update handlers for RGB changes
  const handleRgbChange = (r: number, g: number, b: number) => {
    const validR = Math.min(255, Math.max(0, r));
    const validG = Math.min(255, Math.max(0, g));
    const validB = Math.min(255, Math.max(0, b));

    setRed(validR);
    setGreen(validG);
    setBlue(validB);

    const hsv = rgbToHsv(validR, validG, validB);
    setHue(hsv.h);
    setSaturation(hsv.s);
    setVal(hsv.v);

    const newHex = rgbToHex(validR, validG, validB);
    updateChannelColor(newHex);
  };

  // State update handlers for HSV changes
  const handleHsvChange = (h: number, s: number, v: number) => {
    const validH = Math.min(360, Math.max(0, h));
    const validS = Math.min(100, Math.max(0, s));
    const validV = Math.min(100, Math.max(0, v));

    setHue(validH);
    setSaturation(validS);
    setVal(validV);

    const rgb = hsvToRgb(validH, validS, validV);
    setRed(rgb.r);
    setGreen(rgb.g);
    setBlue(rgb.b);

    const newHex = rgbToHex(rgb.r, rgb.g, rgb.b);
    updateChannelColor(newHex);
  };

  // Hex input key change
  const handleHexInputChange = (val: string) => {
    setHexInput(val);
    const clean = val.startsWith('#') ? val : '#' + val;
    if (/^#[0-9A-F]{6}$/i.test(clean)) {
      const rgb = hexToRgb(clean);
      setRed(rgb.r);
      setGreen(rgb.g);
      setBlue(rgb.b);

      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      setHue(hsv.h);
      setSaturation(hsv.s);
      setVal(hsv.v);

      onChangeSkinColor(activeChannel, clean);
    }
  };

  // Drag listeners
  const handleSvDrag = (clientX: number, clientY: number) => {
    if (!svBoxRef.current) return;
    const rect = svBoxRef.current.getBoundingClientRect();
    const x = Math.min(rect.width, Math.max(0, clientX - rect.left));
    const y = Math.min(rect.height, Math.max(0, clientY - rect.top));

    // Custom mappings based on GIMP visual mode
    if (gimpMode === 'H') {
      const s = Math.round((x / rect.width) * 100);
      const v = Math.round((1 - y / rect.height) * 100);
      handleHsvChange(hue, s, v);
    } else if (gimpMode === 'S') {
      const h = Math.round((x / rect.width) * 360);
      const v = Math.round((1 - y / rect.height) * 100);
      handleHsvChange(h, saturation, v);
    } else if (gimpMode === 'V') {
      const h = Math.round((x / rect.width) * 360);
      const s = Math.round((1 - y / rect.height) * 100);
      handleHsvChange(h, s, val);
    } else if (gimpMode === 'R') {
      const g = Math.round((x / rect.width) * 255);
      const b = Math.round((1 - y / rect.height) * 255);
      handleRgbChange(red, g, b);
    } else if (gimpMode === 'G') {
      const r = Math.round((x / rect.width) * 255);
      const b = Math.round((1 - y / rect.height) * 255);
      handleRgbChange(r, green, b);
    } else if (gimpMode === 'B') {
      const r = Math.round((x / rect.width) * 255);
      const g = Math.round((1 - y / rect.height) * 255);
      handleRgbChange(r, g, blue);
    }
  };

  const handleStripDrag = (clientY: number) => {
    if (!verticalStripRef.current) return;
    const rect = verticalStripRef.current.getBoundingClientRect();
    const y = Math.min(rect.height, Math.max(0, clientY - rect.top));
    const ratio = 1 - y / rect.height;

    if (gimpMode === 'H') {
      handleHsvChange(Math.round(ratio * 360), saturation, val);
    } else if (gimpMode === 'S') {
      handleHsvChange(hue, Math.round(ratio * 100), val);
    } else if (gimpMode === 'V') {
      handleHsvChange(hue, saturation, Math.round(ratio * 100));
    } else if (gimpMode === 'R') {
      handleRgbChange(Math.round(ratio * 255), green, blue);
    } else if (gimpMode === 'G') {
      handleRgbChange(red, Math.round(ratio * 255), blue);
    } else if (gimpMode === 'B') {
      handleRgbChange(red, green, Math.round(ratio * 255));
    }
  };

  // Window drag events coordinator
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSv) {
        handleSvDrag(e.clientX, e.clientY);
      } else if (isDraggingStrip) {
        handleStripDrag(e.clientY);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingSv(false);
      setIsDraggingStrip(false);
    };

    // Touch event helpers
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      if (isDraggingSv) {
        handleSvDrag(e.touches[0].clientX, e.touches[0].clientY);
      } else if (isDraggingStrip) {
        handleStripDrag(e.touches[0].clientY);
      }
    };

    if (isDraggingSv || isDraggingStrip) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingSv, isDraggingStrip, hue, saturation, val, red, green, blue, gimpMode]);

  // Color Swatch Swapping
  const addSwatch = () => {
    const cleanHex = hexInput.startsWith('#') ? hexInput : '#' + hexInput;
    if (swatches.includes(cleanHex)) return;
    const newSwatches = [cleanHex, ...swatches.slice(0, 15)];
    setSwatches(newSwatches);
    localStorage.setItem('gimp_swatch_history', JSON.stringify(newSwatches));
  };

  const removeSwatch = (hexToRemove: string) => {
    const newSwatches = swatches.filter(s => s !== hexToRemove);
    setSwatches(newSwatches);
    localStorage.setItem('gimp_swatch_history', JSON.stringify(newSwatches));
  };

  // Revert channel color back to the old color
  const revertToOldColor = () => {
    if (oldColors && oldColors[activeChannel]) {
      handleHexInputChange(oldColors[activeChannel]);
    }
  };

  // Get current draggable marker coordinates inside SV 2D Box
  const getMarkerCoords = () => {
    if (gimpMode === 'H') {
      return { x: `${saturation}%`, y: `${100 - val}%` };
    } else if (gimpMode === 'S') {
      return { x: `${(hue / 360) * 100}%`, y: `${100 - val}%` };
    } else if (gimpMode === 'V') {
      return { x: `${(hue / 360) * 100}%`, y: `${100 - saturation}%` };
    } else if (gimpMode === 'R') {
      return { x: `${(green / 255) * 100}%`, y: `${100 - (blue / 255) * 100}%` };
    } else if (gimpMode === 'G') {
      return { x: `${(red / 255) * 100}%`, y: `${100 - (blue / 255) * 100}%` };
    } else {
      return { x: `${(red / 255) * 100}%`, y: `${100 - (green / 255) * 100}%` };
    }
  };

  // Get current vertical coordinate ratio for strip slider handle
  const getStripRatio = () => {
    if (gimpMode === 'H') return hue / 360;
    if (gimpMode === 'S') return saturation / 100;
    if (gimpMode === 'V') return val / 100;
    if (gimpMode === 'R') return red / 255;
    if (gimpMode === 'G') return green / 255;
    return blue / 255;
  };

  const marker = getMarkerCoords();
  const stripPercent = `${(1 - getStripRatio()) * 100}%`;

  // Dynamic backgrounds for 2D Box and vertical strip depending on selection mode
  const getSvBoxStyle = () => {
    if (gimpMode === 'H') {
      return {
        backgroundColor: `hsl(${hue}, 100%, 50%)`,
        backgroundImage: `linear-gradient(to right, #fff, transparent), linear-gradient(to top, #000, transparent)`,
        backgroundBlendMode: 'multiply' as const
      };
    } else if (gimpMode === 'S') {
      // Saturation fixed, H on X, V on Y
      return {
        backgroundImage: `linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%), linear-gradient(to top, #000 0%, transparent 100%)`,
        backgroundBlendMode: 'multiply' as const
      };
    } else if (gimpMode === 'V') {
      // Value fixed, H on X, S on Y
      const vColor = hsvToRgb(hue, saturation, val);
      return {
        backgroundImage: `linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%), linear-gradient(to top, #fff 0%, transparent 100%)`
      };
    } else if (gimpMode === 'R') {
      // Red fixed, Green on X, Blue on Y
      return {
        backgroundImage: `linear-gradient(to right, rgb(${red}, 0, 0), rgb(${red}, 255, 0)), linear-gradient(to top, rgb(${red}, 0, 0), rgb(${red}, 0, 255))`,
        backgroundBlendMode: 'screen' as const
      };
    } else if (gimpMode === 'G') {
      // Green fixed, Red on X, Blue on Y
      return {
        backgroundImage: `linear-gradient(to right, rgb(0, ${green}, 0), rgb(255, ${green}, 0)), linear-gradient(to top, rgb(0, ${green}, 0), rgb(0, ${green}, 255))`,
        backgroundBlendMode: 'screen' as const
      };
    } else {
      // Blue fixed, Red on X, Green on Y
      return {
        backgroundImage: `linear-gradient(to right, rgb(0, 0, ${blue}), rgb(255, 0, ${blue})), linear-gradient(to top, rgb(0, 0, ${blue}), rgb(0, 255, ${blue}))`,
        backgroundBlendMode: 'screen' as const
      };
    }
  };

  const getStripBackground = () => {
    if (gimpMode === 'H') {
      return 'linear-gradient(to top, #f00 0%, #f0f 17%, #00f 33%, #0ff 50%, #0f0 67%, #ff0 83%, #f00 100%)';
    } else if (gimpMode === 'S') {
      return `linear-gradient(to top, rgb(128,128,128), hsl(${hue}, 100%, 50%))`;
    } else if (gimpMode === 'V') {
      return `linear-gradient(to top, #000, hsl(${hue}, ${saturation}%, 50%))`;
    } else if (gimpMode === 'R') {
      return `linear-gradient(to top, rgb(0, ${green}, ${blue}), rgb(255, ${green}, ${blue}))`;
    } else if (gimpMode === 'G') {
      return `linear-gradient(to top, rgb(${red}, 0, ${blue}), rgb(${red}, 255, ${blue}))`;
    } else {
      return `linear-gradient(to top, rgb(${red}, ${green}, 0), rgb(${red}, ${green}, 255))`;
    }
  };

  return (
    <div id="gimp-skin-configurator" className="space-y-3 font-mono text-[9px] text-zinc-300">
      
      {/* 1. CHANNEL SELECTION SHELF */}
      <div className="space-y-1">
        <span className="text-[7.5px] text-neutral-500 font-bold uppercase tracking-wider block text-left">1. Select Target Channel</span>
        <div className="grid grid-cols-5 gap-1 shadow-inner bg-neutral-950 p-1 rounded-lg border border-neutral-800">
          {channels.map((chan) => {
            const isSelected = activeChannel === chan.id;
            const chanColor = customSkin[chan.id] || '#808080';
            const num = chan.label.substring(0, 2);
            const title = chan.label.substring(3);
            return (
              <button
                key={chan.id}
                type="button"
                onClick={() => setActiveChannel(chan.id)}
                title={chan.desc}
                className={`relative flex flex-col items-center justify-between p-1 rounded-sm border transition h-[40px] cursor-pointer ${
                  isSelected ? 'border-[#ff7b00]/70 bg-[#ff7b00]/10 text-orange-400 font-bold' : 'border-neutral-800/80 bg-neutral-900/40 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                {/* Channel Color Status Indicator */}
                <div 
                  className="w-3.5 h-3.5 rounded-full border border-neutral-700 flex items-center justify-center shadow-md shrink-0"
                  style={{ backgroundColor: chanColor }}
                >
                  {isSelected && (
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  )}
                </div>
                <div className="text-[6.5px] uppercase truncate w-full text-center tracking-tight mt-1">
                  {title.split(' ')[0]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. THE GIMP COLOR PICKER WORKBENCH */}
      <div className="space-y-1">
        <span className="text-[7.5px] text-neutral-500 font-bold uppercase tracking-wider block text-left">2. COLOUR SELECTION SPECTRUM</span>
        <div className="bg-[#18191c] border border-neutral-800 rounded-lg p-2 flex flex-col gap-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
          
          {/* TOP AREA: 2D Box (left) + Strip (middle) + RGB/HSV stats (right) */}
          <div className="flex gap-2">
            
            {/* SV selection box */}
            <div 
              ref={svBoxRef}
              style={getSvBoxStyle()}
              onMouseDown={(e) => {
                setIsDraggingSv(true);
                handleSvDrag(e.clientX, e.clientY);
              }}
              onTouchStart={(e) => {
                if (e.touches.length > 0) {
                  setIsDraggingSv(true);
                  handleSvDrag(e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
              className="relative w-28 h-28 border border-neutral-900/90 rounded cursor-crosshair select-none overflow-hidden shrink-0"
            >
              {/* Circular Selection Reticle crosshair */}
              <div 
                className="absolute w-2.5 h-2.5 border-2 border-white rounded-full -ml-[5px] -mt-[5px] shadow-[0_0_2px_black] pointer-events-none origin-center"
                style={{ left: marker.x, top: marker.y }}
              />
            </div>

            {/* Vertical Multi-Mode strip */}
            <div 
              ref={verticalStripRef}
              style={{ backgroundImage: getStripBackground() }}
              onMouseDown={(e) => {
                setIsDraggingStrip(true);
                handleStripDrag(e.clientY);
              }}
              onTouchStart={(e) => {
                if (e.touches.length > 0) {
                  setIsDraggingStrip(true);
                  handleStripDrag(e.touches[0].clientY);
                }
              }}
              className="relative w-4 h-28 border border-neutral-900/90 rounded cursor-ns-resize select-none shrink-0"
            >
              {/* Horizontal sliding caret indicators */}
              <div 
                className="absolute left-[-2px] right-[-2px] h-[3px] bg-white border border-black shadow pointer-events-none"
                style={{ top: stripPercent }}
              />
            </div>

            {/* NUMERICAL SLIDERS TABBED GRID (HSV & RGB CO-ORDINATOR) */}
            <div className="flex-1 space-y-1 text-[8.5px] select-none">
              
              {/* HSV Rows */}
              <div className="space-y-0.5">
                {/* Hue row */}
                <div className="flex items-center gap-1.5 h-3.5">
                  <button 
                    type="button" 
                    onClick={() => setGimpMode('H')}
                    className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 cursor-pointer ${gimpMode === 'H' ? 'border-orange-500 bg-orange-500/25' : 'border-neutral-700 bg-black'}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full bg-orange-400 ${gimpMode === 'H' ? 'block' : 'hidden'}`} />
                  </button>
                  <label htmlFor="color-picker-hue-number" className="text-neutral-400 w-2.5 text-[8px] font-bold block">H</label>
                  <input 
                    id="color-picker-hue-slider"
                    aria-label="Hue Slider"
                    type="range" 
                    min="0" 
                    max="360" 
                    value={hue}
                    onChange={(e) => handleHsvChange(parseInt(e.target.value), saturation, val)}
                    className="flex-1 min-w-0 accent-orange-500 h-1 cursor-pointer bg-neutral-950 rounded"
                  />
                  <input 
                    id="color-picker-hue-number"
                    type="number" 
                    min="0" 
                    max="360"
                    value={hue}
                    onChange={(e) => handleHsvChange(parseInt(e.target.value) || 0, saturation, val)}
                    className="w-8 shrink-0 bg-neutral-950 border border-neutral-800 rounded px-0.5 text-right font-mono text-[8px] h-3.5 hover:border-neutral-700 focus:outline-none"
                  />
                </div>

                {/* S row */}
                <div className="flex items-center gap-1.5 h-3.5">
                  <button 
                    type="button" 
                    onClick={() => setGimpMode('S')}
                    className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 cursor-pointer ${gimpMode === 'S' ? 'border-orange-500 bg-orange-500/25' : 'border-neutral-700 bg-black'}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full bg-orange-400 ${gimpMode === 'S' ? 'block' : 'hidden'}`} />
                  </button>
                  <label htmlFor="color-picker-saturation-number" className="text-neutral-400 w-2.5 text-[8px] font-bold block">S</label>
                  <input 
                    id="color-picker-saturation-slider"
                    aria-label="Saturation Slider"
                    type="range" 
                    min="0" 
                    max="100" 
                    value={saturation}
                    onChange={(e) => handleHsvChange(hue, parseInt(e.target.value), val)}
                    className="flex-1 min-w-0 accent-orange-500 h-1 cursor-pointer bg-neutral-950 rounded"
                  />
                  <input 
                    id="color-picker-saturation-number"
                    type="number" 
                    min="0" 
                    max="100"
                    value={saturation}
                    onChange={(e) => handleHsvChange(hue, parseInt(e.target.value) || 0, val)}
                    className="w-8 shrink-0 bg-neutral-950 border border-neutral-800 rounded px-0.5 text-right font-mono text-[8px] h-3.5 hover:border-neutral-700 focus:outline-none"
                  />
                </div>

                {/* V row */}
                <div className="flex items-center gap-1.5 h-3.5">
                  <button 
                    type="button" 
                    onClick={() => setGimpMode('V')}
                    className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 cursor-pointer ${gimpMode === 'V' ? 'border-orange-500 bg-orange-500/25' : 'border-neutral-700 bg-black'}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full bg-orange-400 ${gimpMode === 'V' ? 'block' : 'hidden'}`} />
                  </button>
                  <label htmlFor="color-picker-value-number" className="text-neutral-400 w-2.5 text-[8px] font-bold block">V</label>
                  <input 
                    id="color-picker-value-slider"
                    aria-label="Value Slider"
                    type="range" 
                    min="0" 
                    max="100" 
                    value={val}
                    onChange={(e) => handleHsvChange(hue, saturation, parseInt(e.target.value))}
                    className="flex-1 min-w-0 accent-orange-500 h-1 cursor-pointer bg-neutral-950 rounded"
                  />
                  <input 
                    id="color-picker-value-number"
                    type="number" 
                    min="0" 
                    max="100"
                    value={val}
                    onChange={(e) => handleHsvChange(hue, saturation, parseInt(e.target.value) || 0)}
                    className="w-8 shrink-0 bg-neutral-950 border border-neutral-800 rounded px-0.5 text-right font-mono text-[8px] h-3.5 hover:border-neutral-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* Thin divisor line */}
              <div className="border-t border-neutral-800/80 my-1" />

              {/* RGB Rows */}
              <div className="space-y-0.5">
                {/* Red row */}
                <div className="flex items-center gap-1.5 h-3.5">
                  <button 
                    type="button" 
                    onClick={() => setGimpMode('R')}
                    className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 cursor-pointer ${gimpMode === 'R' ? 'border-orange-500 bg-orange-500/25' : 'border-neutral-700 bg-black'}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full bg-orange-400 ${gimpMode === 'R' ? 'block' : 'hidden'}`} />
                  </button>
                  <label htmlFor="color-picker-red-number" className="text-rose-500 w-2.5 text-[8px] font-bold block">R</label>
                  <input 
                    id="color-picker-red-slider"
                    aria-label="Red Slider"
                    type="range" 
                    min="0" 
                    max="255" 
                    value={red}
                    onChange={(e) => handleRgbChange(parseInt(e.target.value), green, blue)}
                    className="flex-1 min-w-0 accent-rose-500 h-1 cursor-pointer bg-neutral-950 rounded"
                  />
                  <input 
                    id="color-picker-red-number"
                    type="number" 
                    min="0" 
                    max="255"
                    value={red}
                    onChange={(e) => handleRgbChange(parseInt(e.target.value) || 0, green, blue)}
                    className="w-8 shrink-0 bg-neutral-950 border border-neutral-800 rounded px-0.5 text-right font-mono text-[8px] h-3.5 hover:border-neutral-700 focus:outline-none"
                  />
                </div>

                {/* Green row */}
                <div className="flex items-center gap-1.5 h-3.5">
                  <button 
                    type="button" 
                    onClick={() => setGimpMode('G')}
                    className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 cursor-pointer ${gimpMode === 'G' ? 'border-orange-500 bg-orange-500/25' : 'border-neutral-700 bg-black'}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full bg-orange-400 ${gimpMode === 'G' ? 'block' : 'hidden'}`} />
                  </button>
                  <label htmlFor="color-picker-green-number" className="text-emerald-500 w-2.5 text-[8px] font-bold block">G</label>
                  <input 
                    id="color-picker-green-slider"
                    aria-label="Green Slider"
                    type="range" 
                    min="0" 
                    max="255" 
                    value={green}
                    onChange={(e) => handleRgbChange(red, parseInt(e.target.value), blue)}
                    className="flex-1 min-w-0 accent-emerald-500 h-1 cursor-pointer bg-neutral-950 rounded"
                  />
                  <input 
                    id="color-picker-green-number"
                    type="number" 
                    min="0" 
                    max="255"
                    value={green}
                    onChange={(e) => handleRgbChange(red, parseInt(e.target.value) || 0, blue)}
                    className="w-8 shrink-0 bg-neutral-950 border border-neutral-800 rounded px-0.5 text-right font-mono text-[8px] h-3.5 hover:border-neutral-700 focus:outline-none"
                  />
                </div>

                {/* Blue row */}
                <div className="flex items-center gap-1.5 h-3.5">
                  <button 
                    type="button" 
                    onClick={() => setGimpMode('B')}
                    className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 cursor-pointer ${gimpMode === 'B' ? 'border-orange-500 bg-orange-500/25' : 'border-neutral-700 bg-black'}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full bg-orange-400 ${gimpMode === 'B' ? 'block' : 'hidden'}`} />
                  </button>
                  <label htmlFor="color-picker-blue-number" className="text-sky-500 w-2.5 text-[8px] font-bold block">B</label>
                  <input 
                    id="color-picker-blue-slider"
                    aria-label="Blue Slider"
                    type="range" 
                    min="0" 
                    max="255" 
                    value={blue}
                    onChange={(e) => handleRgbChange(red, green, parseInt(e.target.value))}
                    className="flex-1 min-w-0 accent-sky-500 h-1 cursor-pointer bg-neutral-950 rounded"
                  />
                  <input 
                    id="color-picker-blue-number"
                    type="number" 
                    min="0" 
                    max="255"
                    value={blue}
                    onChange={(e) => handleRgbChange(red, green, parseInt(e.target.value) || 0)}
                    className="w-8 shrink-0 bg-neutral-950 border border-neutral-800 rounded px-0.5 text-right font-mono text-[8px] h-3.5 hover:border-neutral-700 focus:outline-none"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* LOWER AREA: Comparatives swatchbox + Hex HTML notation */}
          <div className="grid grid-cols-12 gap-2 items-center border-t border-neutral-900 pt-2 font-mono">
            
            {/* Color Comparative Panel (Current vs Old) */}
            <div className="col-span-4 flex flex-col rounded border border-neutral-800 overflow-hidden h-[28px] shrink-0 text-[6.5px]">
              {/* CURRENT */}
              <div 
                className="flex-1 relative cursor-help"
                style={{ backgroundColor: activeColorValue }}
                title={`Current picked: ${activeColorValue}`}
              >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-white mix-blend-difference font-bold scale-75 opacity-40">
                  NEW
                </div>
              </div>
              {/* OLD */}
              <button 
                type="button"
                onClick={revertToOldColor}
                disabled={!oldColors}
                className="flex-1 relative bg-neutral-700 hover:opacity-90 active:scale-95 transition-all text-neutral-400 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed border-t border-neutral-900 overflow-hidden"
                style={{ backgroundColor: oldColors ? oldColors[activeChannel] : '#404040' }}
                title="Click to revert color to previous state"
              >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-white mix-blend-difference font-bold scale-75 opacity-40">
                  OLD
                </div>
              </button>
            </div>

            {/* HTML notation input */}
            <div className="col-span-8 flex items-center gap-1.5 justify-end">
              <label htmlFor="color-picker-hex-input" className="text-neutral-500 text-[8px] shrink-0 font-bold block">HTML notation:</label>
              <div className="relative flex items-center shrink-0">
                <input
                  id="color-picker-hex-input"
                  type="text"
                  maxLength={7}
                  value={hexInput}
                  onChange={(e) => handleHexInputChange(e.target.value)}
                  className="w-20 bg-black border border-neutral-800 rounded px-1.5 py-1 text-orange-400 font-mono text-[9px] uppercase tracking-wide focus:outline-none focus:border-orange-500"
                />
                <button 
                  type="button" 
                  onClick={revertToOldColor} 
                  title="Revert to original state color"
                  className="absolute right-1 text-zinc-500 hover:text-orange-400 cursor-pointer transition"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 3. RETRO PALETTE COLOR SHELF */}
      <div className="space-y-1 bg-neutral-950/40 border border-neutral-900/60 p-2 rounded-lg">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[7.5px] text-neutral-500 font-bold uppercase tracking-wider">3. COLOUR SHELF PALETTE</span>
          <button
            type="button"
            onClick={addSwatch}
            title="Add current color to swatch row"
            className="text-[7.5px] bg-[#ff7b00]/10 hover:bg-[#ff7b00]/25 text-orange-400 px-1.5 py-0.5 rounded flex items-center gap-0.5 cursor-pointer hover:border-orange-500/30 border border-transparent"
          >
            <Plus className="w-2 h-2" /> Add Current
          </button>
        </div>
        <div className="grid grid-cols-12 gap-1 bg-black/95 p-1.5 rounded-md border border-neutral-900/80 min-h-[32px] items-center">
          {swatches.map((swatch, idx) => {
            const isMatch = activeColorValue.toLowerCase() === swatch.toLowerCase();
            return (
              <div 
                key={idx} 
                className="relative group/swatch w-4 h-4 rounded border cursor-pointer hover:scale-110 active:scale-95 transition-all"
                style={{ 
                  backgroundColor: swatch,
                  borderColor: isMatch ? '#f97316' : '#27272a',
                  boxShadow: isMatch ? '0 0 4px rgba(249,115,22,0.6)' : 'none'
                }}
                onClick={() => handleHexInputChange(swatch)}
              >
                {/* Trash icon overlay on swatch hover */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSwatch(swatch);
                  }}
                  title="Remove swatch"
                  className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover/swatch:opacity-100 transition duration-150 rounded"
                >
                  <Trash2 className="w-2 h-2 text-red-500" />
                </button>
              </div>
            );
          })}
          {swatches.length === 0 && (
            <span className="col-span-12 text-center text-neutral-600 text-[8px] font-bold select-none h-4 flex items-center justify-center">
              PALETTE SHELF EMPTY
            </span>
          )}
        </div>
      </div>

    </div>
  );
}
