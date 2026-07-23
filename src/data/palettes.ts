export interface Palette {
  name: string;
  bg: string;
  border: string;
  accent: string;
  text: string;
  panel: string;
  texture: 'none' | 'brushed' | 'carbon' | 'scanlines' | 'hexagrid';
  glow: 'off' | 'subtle' | 'vibrant';
  bezel: 'retro' | 'bento' | 'modern';
}

export const PALETTE_BANK: Palette[] = [
  { name: 'Classic Slate 🍱', bg: '#23262f', border: '#42495b', accent: '#ff9100', text: '#f1f5f9', panel: '#090a0f', texture: 'brushed', glow: 'subtle', bezel: 'bento' },
  { name: 'Cyberpunk Neon ⚡', bg: '#090214', border: '#ff007f', accent: '#00ffd5', text: '#ffffff', panel: '#000000', texture: 'hexagrid', glow: 'vibrant', bezel: 'retro' },
  { name: 'Amber Glow 📟', bg: '#100902', border: '#f59e0b', accent: '#f5a00b', text: '#fbbf24', panel: '#060401', texture: 'scanlines', glow: 'vibrant', bezel: 'retro' },
  { name: 'Glacier Blue ❄️', bg: '#041018', border: '#38bdf8', accent: '#37bcf8', text: '#f0f9ff', panel: '#01060c', texture: 'brushed', glow: 'subtle', bezel: 'bento' },
  { name: 'Fallout Term ☣️', bg: '#041104', border: '#00ff44', accent: '#00ff44', text: '#00ff44', panel: '#020702', texture: 'scanlines', glow: 'vibrant', bezel: 'retro' },
  { name: 'Red Fury 4 🩸', bg: '#1c0205', border: '#ff0000', accent: '#ff1234', text: '#ffffff', panel: '#000000', texture: 'carbon', glow: 'vibrant', bezel: 'retro' },
  { name: 'Walnut Hi-Fi 🪵', bg: '#3f200c', border: '#a17036', accent: '#f97316', text: '#fdf4e4', panel: '#130902', texture: 'brushed', glow: 'subtle', bezel: 'modern' },
  { name: 'Stealth Matte 🌑', bg: '#111317', border: '#333333', accent: '#ffffff', text: '#cccccc', panel: '#030405', texture: 'carbon', glow: 'subtle', bezel: 'modern' },
  { name: 'Sunset Dunes 🌅', bg: '#2a0c0c', border: '#ff5e62', accent: '#ff9966', text: '#fff3f3', panel: '#110303', texture: 'brushed', glow: 'vibrant', bezel: 'bento' },
  { name: 'Toxic Waste ☣️', bg: '#0b160b', border: '#84cc16', accent: '#a3e635', text: '#ecfccb', panel: '#040904', texture: 'hexagrid', glow: 'vibrant', bezel: 'retro' },
  { name: 'Laser Horizon 👾', bg: '#190a2a', border: '#ff007f', accent: '#00ffff', text: '#fdf2f8', panel: '#0b0413', texture: 'scanlines', glow: 'vibrant', bezel: 'retro' },
  { name: 'Bubblegum Pop 🌸', bg: '#ffe4e6', border: '#fda4af', accent: '#f43f5e', text: '#4c0519', panel: '#fff1f2', texture: 'none', glow: 'subtle', bezel: 'modern' },
  { name: 'Deep Nebula 🌌', bg: '#060814', border: '#7c3aed', accent: '#d946ef', text: '#ffffff', panel: '#02030a', texture: 'carbon', glow: 'vibrant', bezel: 'retro' },
  { name: 'Retro Cream 🍨', bg: '#fdf6e3', border: '#b58900', accent: '#cb4b16', text: '#586e75', panel: '#eee8d5', texture: 'brushed', glow: 'subtle', bezel: 'bento' },
  { name: 'Electric Ocean 🌊', bg: '#041d24', border: '#0284c7', accent: '#06b6d4', text: '#ecfeff', panel: '#010b0f', texture: 'hexagrid', glow: 'subtle', bezel: 'modern' }
];
