export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  url?: string;
  file?: File;
  playCount: number;
  rating: number; // 0 to 5
  genre?: string;
  coverUrl?: string;
  androidUri?: string; // persisted content:// URI for automatic re-linking after app restart (Android builds only)
}

export type SkinType = 'bento' | 'classic';

export type ScreenAppearance = 'default' | 'lcd' | 'oled' | 'e-ink' | 'cyberpunk' | 'custom';
export type FontPreset = 'sans' | 'mono' | 'serif' | 'display';

export type VisualizerMode = 'spectrum' | 'radial-spectrum' | 'waveform-river' | 'kaleidoscope' | 'album-wall' | 'oscilloscope' | 'fire' | 'rainbow' | 'matrix-rain' | 'starfield-warp' | 'aurora' | 'falling-stars' | 'vfd' | 'vu-meters' | 'moloko-plus' | 'spinning-cd' | 'turntable' | 'minidisk' | 'cassette' | 'guitar-hero' | 'artwork' | 'vegas-strip' | 'skytree' | 'lava-lamp' | 'synthwave-grid' | 'plasma-globe' | 'random' | 'off';

export interface EqPreset {
  name: string;
  preamp: number; // -12 to 12 dB
  bands: number[]; // 10 bands -12 to 12 dB
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0 to 1
  isMuted: boolean;
  shuffle: boolean;
  repeat: 'none' | 'all' | 'one';
}
