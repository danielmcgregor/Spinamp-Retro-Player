import React, { useRef, useEffect, useState, useMemo } from 'react';
import { VisualizerMode, Track } from '../types';
import { spinampAudio } from '../utils/audioContext';
import { isAppInForeground } from '../utils/platformDetect';
import { drawMatrixRain } from './visualizers/drawMatrixRain';
import { drawFire } from './visualizers/drawFire';
import { drawAurora } from './visualizers/drawAurora';
import { drawGuitarHero } from './visualizers/drawGuitarHero';
import { drawVegasStrip } from './visualizers/drawVegasStrip';
import { drawRadialSpectrum } from './visualizers/drawRadialSpectrum';
import { drawWaveformRiver } from './visualizers/drawWaveformRiver';
import { drawKaleidoscope } from './visualizers/drawKaleidoscope';
import { drawAlbumWall } from './visualizers/drawAlbumWall';
import { pruneImageCache, MAX_CACHED_IMAGES } from './visualizers/imageCacheUtils';

interface VisualizerProps {
  mode: VisualizerMode;
  isPlaying: boolean;
  width?: number;
  height?: number;
  currentTime?: number;
  duration?: number;
  currentTrack?: Track | null;
  visTheme?: string;
  setVisTheme?: (theme: string) => void;
  visSensitivity?: number;
  setVisSensitivity?: (sens: number) => void;
  trackBPM?: number | null;
  playHistory?: string[];
  tracks?: Track[];
}

function visualizerPropsAreEqual(
  prev: VisualizerProps, 
  next: VisualizerProps
): boolean {
  return (
    prev.mode === next.mode &&
    prev.isPlaying === next.isPlaying &&
    prev.currentTrack?.id === next.currentTrack?.id &&
    prev.visTheme === next.visTheme &&
    prev.visSensitivity === next.visSensitivity &&
    prev.width === next.width &&
    prev.height === next.height &&
    prev.trackBPM === next.trackBPM &&
    prev.playHistory === next.playHistory &&
    prev.tracks === next.tracks
  );
}

export const Visualizer = React.memo<VisualizerProps>(({ 
  mode, 
  isPlaying, 
  width: customWidth, 
  height: customHeight,
  currentTime,
  duration,
  currentTrack,
  visTheme: propVisTheme,
  setVisTheme: propSetVisTheme,
  visSensitivity: propVisSensitivity,
  setVisSensitivity: propSetVisSensitivity,
  trackBPM,
  playHistory,
  tracks
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const albumWallStateRef = useRef<{ imageCache: Map<string, HTMLImageElement> }>({ 
    imageCache: new Map() 
  });

  const recentCoverUrls = useMemo(() => {
    if (!playHistory || !tracks) return [];
    const urls: string[] = [];
    const seen = new Set<string>();
    for (let i = playHistory.length - 1; i >= 0; i--) {
      const trackId = playHistory[i];
      if (seen.has(trackId)) continue;
      seen.add(trackId);
      const track = tracks.find(t => t.id === trackId);
      if (track?.coverUrl) urls.push(track.coverUrl);
      if (urls.length >= 16) break; // cap grid size
    }
    return urls;
  }, [playHistory, tracks]);

  const animationRef = useRef<number | null>(null);
  const currentTimeRef = useRef<number>(0);
  const currentTrackRef = useRef<Track | null>(null);
  const recentCoverUrlsRef = useRef<string[]>([]);
  const durationRef = useRef<number>(0);
  const trackBPMRef = useRef<number | null>(null);
  const isVisibleRef = useRef<boolean>(true);
  const lastIdleDrawTimeRef = useRef<number>(0);
  const beatPhaseRef = useRef<number>(0);
  const beatPulseRef = useRef<number>(0);
  
  // Keep track of falling peaks for spectrum analyzer
  const peaksRef = useRef<number[]>([]);
  const peakHoldCountRef = useRef<number[]>([]);
  const waveformHistoryRef = useRef<number[]>([]);
  const kaleidoscopeTimeRef = useRef<number>(0);

  // Persistent visual state refs for the new modes
  const starsRef = useRef<{ x: number; y: number; z: number }[]>([]);
  const matrixRef = useRef<{ y: number; speed: number; char: string }[]>([]);
  const embersRef = useRef<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; life: number; maxLife: number }[]>([]);
  const fallingStarsRef = useRef<{ x: number; y: number; vx: number; vy: number; length: number; speed: number; alpha: number; size: number; color: string }[]>([]);
  const auroraParticlesRef = useRef<{ x: number; y: number; speed: number; size: number; alpha: number; angle: number }[]>([]);
  const vuNeedlesRef = useRef<{ leftVal: number; leftVel: number; rightVal: number; rightVel: number } | null>(null);
  const molokoBufferRef = useRef<HTMLCanvasElement | null>(null);
  const molokoParticlesRef = useRef<{ x: number; y: number; vx: number; vy: number; radius: number; hue: number; alpha: number; life: number; maxLife: number }[]>([]);

  // Guitar Hero simulation refs
  const guitarHeroNotesRef = useRef<{ lane: number; z: number; hit: boolean; color: string }[]>([]);
  const guitarHeroComboRef = useRef<number>(0);
  const guitarHeroMultiplierRef = useRef<number>(1);
  const guitarHeroLastSpawnTimeRef = useRef<number[]>([0, 0, 0, 0, 0]);
  const guitarHeroParticlesRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string; size: number; alpha: number; life: number; maxLife: number }[]>([]);
  const guitarHeroTargetPulseRef = useRef<number[]>([0, 0, 0, 0, 0]);
  const guitarHeroRockMeterRef = useRef<number>(50); // 0 (red) to 100 (green)

  // Vegas Strip simulation refs
  const vegasCoinsRef = useRef<{ x: number; y: number; vx: number; vy: number; size: number; rotation: number; rotSpeed: number; color: string; life: number }[]>([]);
  const vegasReelSymbolsRef = useRef<string[][]>([
    ['🍒', '7️⃣', '💎', '🔔', '🍋', '🍇', '⭐'],
    ['7️⃣', '💎', '🔔', '🍋', '🍇', '⭐', '🍒'],
    ['💎', '🔔', '🍋', '🍇', '⭐', '🍒', '7️⃣']
  ]);
  const vegasReelOffsetsRef = useRef<number[]>([0, 0, 0]);
  const vegasReelTargetOffsetsRef = useRef<number[]>([0, 0, 0]);
  const vegasReelSpinningRef = useRef<boolean[]>([false, false, false]);
  const vegasReelSpeedRef = useRef<number[]>([0, 0, 0]);
  const vegasLastBassTriggerTimeRef = useRef<number>(0);
  const vegasJackpotFlashRef = useRef<number>(0);
  const vegasJackpotTextRef = useRef<string>('');

  // Skytree simulation refs
  const skytreeSakuraRef = useRef<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; angle: number; speed: number; rotSpeed: number }[]>([]);

  // New visualizer modes refs
  const lavaLampBlobsRef = useRef<any[]>([]);
  const lavaLampParticlesRef = useRef<any[]>([]);
  const synthwaveGridYRef = useRef<number>(0);


  // Physical media simulation refs for smooth, interruptible, physically-correct speed
  const lastFrameTimeRef = useRef<number>(0);
  const cdAngleRef = useRef<number>(0);
  const turntableAngleRef = useRef<number>(0);
  const minidiscAngleRef = useRef<number>(0);
  const cassetteLeftAngleRef = useRef<number>(0);
  const cassetteRightAngleRef = useRef<number>(0);
  const lastTrackTimeRef = useRef<number>(0);
  const lastTrackIdRef = useRef<string | number | null>(null);

  // States for random visualizer cycling and morph/crossfade animations
  const currentRandomModeRef = useRef<VisualizerMode>('spectrum');
  const nextRandomModeRef = useRef<VisualizerMode>('oscilloscope');
  const randomTimerRef = useRef<number>(0);
  const rollingEnergyRef = useRef<number>(0.3);
  const recentlyShownModesRef = useRef<VisualizerMode[]>([]);
  const lastTimeRef = useRef<number>(0);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Local settings state with optional prop delegation
  const [localVisTheme, setLocalVisTheme] = useState<string>(() => localStorage.getItem('spinamp_vis_theme') || 'neon');
  const [localVisSensitivity, setLocalVisSensitivity] = useState<number>(() => parseFloat(localStorage.getItem('spinamp_vis_sensitivity') || '1.2'));
  const [showSettings, setShowSettings] = useState(false);

  const visTheme = propVisTheme !== undefined ? propVisTheme : localVisTheme;
  const visSensitivity = propVisSensitivity !== undefined ? propVisSensitivity : localVisSensitivity;

  // Sync state helper functions
  const handleSetTheme = (theme: string) => {
    localStorage.setItem('spinamp_vis_theme', theme);
    if (propSetVisTheme) {
      propSetVisTheme(theme);
    } else {
      setLocalVisTheme(theme);
    }
  };

  const handleSetSens = (val: number) => {
    localStorage.setItem('spinamp_vis_sensitivity', val.toString());
    if (propSetVisSensitivity) {
      propSetVisSensitivity(val);
    } else {
      setLocalVisSensitivity(val);
    }
  };

  // Reset arrays of assets if height or width changes to prevent boundary overflow
  useEffect(() => {
    starsRef.current = [];
    matrixRef.current = [];
    embersRef.current = [];
    waveformHistoryRef.current = [];
    kaleidoscopeTimeRef.current = 0;
    fallingStarsRef.current = [];
    auroraParticlesRef.current = [];
    vuNeedlesRef.current = null;
    molokoBufferRef.current = null;
    molokoParticlesRef.current = [];
    vegasCoinsRef.current = [];
    vegasReelOffsetsRef.current = [0, 0, 0];
    vegasReelTargetOffsetsRef.current = [0, 0, 0];
    vegasReelSpinningRef.current = [false, false, false];
    vegasReelSpeedRef.current = [0, 0, 0];
    vegasJackpotFlashRef.current = 0;
    vegasJackpotTextRef.current = '';
    skytreeSakuraRef.current = [];
    lavaLampBlobsRef.current = [];
    lavaLampParticlesRef.current = [];
    synthwaveGridYRef.current = 0;
  }, [customWidth, customHeight, window.devicePixelRatio]);

  useEffect(() => {
    currentTimeRef.current = currentTime !== undefined ? currentTime : 0;
  }, [currentTime]);

  useEffect(() => {
    durationRef.current = duration !== undefined ? duration : 0;
  }, [duration]);

  useEffect(() => {
    trackBPMRef.current = trackBPM !== undefined ? trackBPM : null;
  }, [trackBPM]);

  useEffect(() => {
    currentTrackRef.current = currentTrack || null;
  }, [currentTrack]);

  useEffect(() => {
    recentCoverUrlsRef.current = recentCoverUrls;
  }, [recentCoverUrls]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    
    // Scale canvas resolution by DPR
    const logicalWidth = canvas.offsetWidth || canvas.width;
    const logicalHeight = canvas.offsetHeight || canvas.height;
    
    if (canvas.width !== Math.round(logicalWidth * dpr) || 
        canvas.height !== Math.round(logicalHeight * dpr)) {
      canvas.width = Math.round(logicalWidth * dpr);
      canvas.height = Math.round(logicalHeight * dpr);
    }
    
    const width = logicalWidth;
    const height = logicalHeight;
    
    // Scale all drawing operations by DPR
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear background initially
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    lastFrameTimeRef.current = 0;

    if (mode === 'off') {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    // Get live analyzer node
    const analyser = spinampAudio.getAnalyser();
    if (analyser && !(analyser as any).__isVolumeProxied) {
      (analyser as any).__isVolumeProxied = true;
      
      const origGetByteFrequencyData = analyser.getByteFrequencyData;
      analyser.getByteFrequencyData = function(this: AnalyserNode, array: Uint8Array) {
        origGetByteFrequencyData.call(this, array);
        const volumeSettings = spinampAudio.getVolumeSettings();
        const effectiveVol = volumeSettings ? volumeSettings.effectiveVolume : 1.0;
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.round(array[i] * effectiveVol);
        }
      };

      const origGetByteTimeDomainData = analyser.getByteTimeDomainData;
      analyser.getByteTimeDomainData = function(this: AnalyserNode, array: Uint8Array) {
        origGetByteTimeDomainData.call(this, array);
        const volumeSettings = spinampAudio.getVolumeSettings();
        const effectiveVol = volumeSettings ? volumeSettings.effectiveVolume : 1.0;
        for (let i = 0; i < array.length; i++) {
          const val = array[i] - 128;
          array[i] = Math.max(0, Math.min(255, Math.round(128 + val * effectiveVol)));
        }
      };
    }
    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    // Initialize peaks
    if (peaksRef.current.length !== bufferLength) {
      peaksRef.current = new Array(bufferLength).fill(0);
      peakHoldCountRef.current = new Array(bufferLength).fill(0);
    }

    // Initialize starfield stars lazily inside effect
    if (starsRef.current.length === 0) {
      for (let i = 0; i < 110; i++) {
        starsRef.current.push({
          x: (Math.random() - 0.5) * 6.0,
          y: (Math.random() - 0.5) * 6.0,
          z: Math.random() * 1.5,
        });
      }
    }

    // Initialize matrix columns lazily
    const numCols = Math.floor(width / 5);
    if (matrixRef.current.length === 0) {
      for (let c = 0; c < numCols; c++) {
        matrixRef.current.push({
          y: Math.random() * -height - 10,
          speed: 0.15 + Math.random() * 0.7,
          char: String.fromCharCode(33 + Math.floor(Math.random() * 90)),
        });
      }
    }

    const render = () => {
      if (!ctx) return;
      if (!isAppInForeground()) {
        animationRef.current = null; // Stop the loop
        return; // Don't request next frame
      }

      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Re-apply DPR every frame

      const now = performance.now();
      const isIdleMode = ['spinning-cd', 'cassette', 'turntable', 'lava-lamp', 
                          'minidisk', 'plasma-globe'].includes(mode);

      if (!isPlaying) {
        if (!isIdleMode) {
          animationRef.current = requestAnimationFrame(render);
          return; // Skip drawing, but keep the loop alive for state changes
        } else {
          const elapsed = now - lastIdleDrawTimeRef.current;
          if (elapsed < 66.6) {
            animationRef.current = requestAnimationFrame(render);
            return; // Skip drawing this frame to save CPU
          }
          lastIdleDrawTimeRef.current = now;
        }
      }

      const currentTimeVal = currentTimeRef.current;
      const durationVal = durationRef.current;

      const bpm = trackBPMRef.current && trackBPMRef.current > 0 ? trackBPMRef.current : null;
      if (bpm) {
        const secondsPerBeat = 60 / bpm;
        const elapsedInBeat = currentTimeVal % secondsPerBeat;
        beatPhaseRef.current = elapsedInBeat / secondsPerBeat; // 0 to 1
        beatPulseRef.current = Math.exp(-beatPhaseRef.current * 8);
      } else {
        beatPhaseRef.current = 0;
        beatPulseRef.current = 0;
      }

      // Calculate delta time
      if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = now;
      }
      const delta = Math.min(0.1, (now - lastFrameTimeRef.current) / 1000); // Capped at 100ms to ignore background tabs resume leaps
      lastFrameTimeRef.current = now;

      // Calculate rolling energy for smarter mode selection
      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
        let frameSum = 0;
        for (let i = 0; i < dataArray.length; i++) frameSum += dataArray[i];
        const frameEnergy = frameSum / dataArray.length / 255;
        rollingEnergyRef.current = rollingEnergyRef.current * 0.95 + frameEnergy * 0.05;
      }

      // Track Change Detection to avoid huge spooling jumps when loading a new track
      const trackId = currentTrackRef.current ? currentTrackRef.current.id : null;
      if (trackId !== lastTrackIdRef.current) {
        lastTrackTimeRef.current = currentTimeVal;
        lastTrackIdRef.current = trackId;
      }

      // Update simulation angles if model is playing
      if (isPlaying) {
        const songProg = durationVal > 0 ? (currentTimeVal / durationVal) : 0.42;
        const playbackRate = spinampAudio && typeof spinampAudio.getPlaybackRate === 'function' ? spinampAudio.getPlaybackRate() : 1.0;

        // 1. CD Rotation Angle (CLV - Constant Linear Velocity)
        // Ranges from 500 RPM (inner tracks) to 200 RPM (outer tracks)
        const cdRpm = 500 - songProg * 300;
        const cdRadPerSec = (cdRpm / 60) * 2 * Math.PI;
        cdAngleRef.current = (cdAngleRef.current + cdRadPerSec * delta * playbackRate) % (Math.PI * 2);

        // 2. Turntable Rotation Angle (Constant Angular Velocity)
        // 33⅓ RPM exactly
        const ttRpm = 33.3333;
        const ttRadPerSec = (ttRpm / 60) * 2 * Math.PI;
        turntableAngleRef.current = (turntableAngleRef.current + ttRadPerSec * delta * playbackRate) % (Math.PI * 2);

        // 3. MiniDisc Rotation Angle (CLV)
        // Ranges from 900 RPM (inner tracks) to 400 RPM (outer tracks)
        const mdRpm = 900 - songProg * 500;
        const mdRadPerSec = (mdRpm / 60) * 2 * Math.PI;
        minidiscAngleRef.current = (minidiscAngleRef.current + mdRadPerSec * delta * playbackRate) % (Math.PI * 2);

        // 4. Compact Cassette Tape sprockets and dynamic pack rotation
        // Feed (left) pack and take-up (right) pack. Hub radius = 11mm, Full wound radius = 25mm.
        const rLeft = Math.sqrt(11 * 11 + (1 - songProg) * (25 * 25 - 11 * 11));
        const rRight = Math.sqrt(11 * 11 + songProg * (25 * 25 - 11 * 11));
        // Linear tape speed: 4.76 cm/s = 47.6 mm/s.
        // Scale line speed by a factor of 0.8 for smooth realistic motion in canvas space.
        const scaleVel = 47.6 * 0.8;
        const omegaLeft = scaleVel / rLeft;
        const omegaRight = scaleVel / rRight;
        cassetteLeftAngleRef.current = (cassetteLeftAngleRef.current + omegaLeft * delta * playbackRate) % (Math.PI * 2);
        cassetteRightAngleRef.current = (cassetteRightAngleRef.current + omegaRight * delta * playbackRate) % (Math.PI * 2);
      }

      // 5. Tape scrubbing/spooling interaction effect when dragging the progression bar
      const currentTrackTime = currentTimeVal;
      if (lastTrackTimeRef.current !== 0 && currentTrackTime !== lastTrackTimeRef.current) {
        const deltaProgress = currentTrackTime - lastTrackTimeRef.current;
        const playbackRate = spinampAudio && typeof spinampAudio.getPlaybackRate === 'function' ? spinampAudio.getPlaybackRate() : 1.0;
        const expectedProgress = isPlaying ? delta * playbackRate : 0;
        const diff = deltaProgress - expectedProgress;

        // If progress is changing manually (sudden jump / user scrubbing / dragging)
        if (Math.abs(diff) > 1.0 || (!isPlaying && Math.abs(deltaProgress) > 0.01)) {
          const songProg = durationVal > 0 ? (currentTrackTime / durationVal) : 0.42;
          const rLeft = Math.sqrt(11 * 11 + (1 - songProg) * (25 * 25 - 11 * 11));
          const rRight = Math.sqrt(11 * 11 + songProg * (25 * 25 - 11 * 11));

          // Animate the tape reels turning super fast during scrubbing, matching the scroll direction!
          // Scale velocity by 12.0 for a dramatic visible spooling spinner effect
          const scaleVelScrub = 47.6 * 12.0;
          const omegaLeftScrub = scaleVelScrub / rLeft;
          const omegaRightScrub = scaleVelScrub / rRight;

          cassetteLeftAngleRef.current = (cassetteLeftAngleRef.current + omegaLeftScrub * deltaProgress) % (Math.PI * 2);
          cassetteRightAngleRef.current = (cassetteRightAngleRef.current + omegaRightScrub * deltaProgress) % (Math.PI * 2);
        }
      }
      lastTrackTimeRef.current = currentTrackTime;

      // Background Grid
      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(0, 0, width, height);

      // Grid line helper (classic CRT scanlines look)
      ctx.strokeStyle = 'rgba(0, 40, 0, 0.12)';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 6) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let i = 0; i < height; i += 4) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
      }

      // Check theme color mapping
      const getThemeColor = (ratio: number) => {
        switch (visTheme) {
          case 'custom': {
            let customAccent = '#ff9100';
            try {
              const raw = window.getComputedStyle(document.body).getPropertyValue('--skin-accent');
              if (raw && raw.trim()) {
                customAccent = raw.trim();
              }
            } catch (e) {}
            if (ratio > 0.85) return '#ffffff'; // white-hot peaks
            if (ratio > 0.45) return customAccent; // user custom color
            return `${customAccent}66`; // transparent custom color for base
          }
          case 'crimson':
            if (ratio > 0.82) return '#ffffff'; // white-hot peaks
            if (ratio > 0.45) return '#ff1e43'; // intense scarlet ruby
            return '#66000a'; // deep ruby base shadow
          case 'cyberpunk':
            if (ratio > 0.8) return '#10b981'; // emerald neon
            if (ratio > 0.45) return '#ec4899'; // bubblegum pink
            return '#8b5cf6'; // glowing purple
          case 'amber':
            if (ratio > 0.85) return '#ffffff';
            return `rgba(245, 158, 11, ${0.45 + ratio * 0.55})`; // warm amber phosphor
          case 'aqua':
            if (ratio > 0.82) return '#ffffff';
            if (ratio > 0.45) return '#06b6d4'; // teal cyan
            return '#0284c7'; // dark blue water
          case 'mono':
            return `rgba(240, 240, 240, ${0.35 + ratio * 0.65})`; // vintage CRT paperwhite
          case 'neon':
          default:
            if (ratio > 0.8) return '#ff3333'; // Deep Red
            if (ratio > 0.5) return '#ffcc11'; // Neon Yellow
            return '#00ff44'; // Glowing Green
        }
      };

      const drawSpecificMode = (targetMode: VisualizerMode) => {
        if (!analyser) return;

        if (targetMode === 'spectrum') {
          analyser.getByteFrequencyData(dataArray);

          const numBars = 32;
          const barWidth = Math.floor(width / numBars) - 1;
          const maxDataValue = 255;

          for (let i = 0; i < numBars; i++) {
            const percentIdx = i / numBars;
            const dataIdx = Math.floor(Math.pow(percentIdx, 1.35) * (bufferLength * 0.65));
            const value = (dataArray[dataIdx] || 0) * visSensitivity;

            const barHeight = Math.floor((Math.min(255, value) / maxDataValue) * (height - 3));

            // Peak handling
            if (barHeight >= peaksRef.current[i]) {
              peaksRef.current[i] = barHeight;
              peakHoldCountRef.current[i] = 12; // hold peak for 12 frames
            } else {
              if (peakHoldCountRef.current[i] > 0) {
                peakHoldCountRef.current[i]--;
              } else {
                peaksRef.current[i] = Math.max(0, peaksRef.current[i] - 0.7); // slow fall rate
              }
            }

            const x = i * (barWidth + 1) + 2;
            const segmentSize = 2;
            const gap = 1;

            // Draw spectrum bars based on segmented layout
            for (let y = height - 2; y > height - barHeight; y -= (segmentSize + gap)) {
              const distanceFromBottom = height - y;
              const ratio = distanceFromBottom / height;
              ctx.fillStyle = getThemeColor(ratio);
              ctx.fillRect(x, y - segmentSize, barWidth, segmentSize);
            }

            // Draw floating peak indicator dot
            const peakY = height - Math.floor(peaksRef.current[i]) - 1;
            if (peakY < height - 1 && peakY >= 0) {
              ctx.fillStyle = visTheme === 'custom' ? '#ffffff' : visTheme === 'cyberpunk' ? '#10b981' : visTheme === 'crimson' ? '#ffffff' : visTheme === 'amber' ? '#ffedd5' : '#ff4444';
              ctx.fillRect(x, peakY, barWidth, 1.5);
            }
          }
        } else if (targetMode === 'radial-spectrum') {
          analyser.getByteFrequencyData(dataArray);
          drawRadialSpectrum(ctx, canvas, dataArray, visTheme, visSensitivity, width, height, beatPulseRef.current);
        } else if (targetMode === 'rainbow') {
          analyser.getByteFrequencyData(dataArray);

          const numBars = 32;
          const barWidth = Math.floor(width / numBars) - 1;
          const maxDataValue = 255;
          const hueShift = (Date.now() * 0.05) % 360;

          for (let i = 0; i < numBars; i++) {
            const percentIdx = i / numBars;
            const dataIdx = Math.floor(Math.pow(percentIdx, 1.3) * (bufferLength * 0.7));
            const value = (dataArray[dataIdx] || 0) * visSensitivity;

            const barHeight = Math.floor((Math.min(255, value) / maxDataValue) * (height - 3));

            if (barHeight >= peaksRef.current[i]) {
              peaksRef.current[i] = barHeight;
              peakHoldCountRef.current[i] = 12;
            } else {
              if (peakHoldCountRef.current[i] > 0) {
                peakHoldCountRef.current[i]--;
              } else {
                peaksRef.current[i] = Math.max(0, peaksRef.current[i] - 0.7);
              }
            }

            const x = i * (barWidth + 1) + 2;
            const segmentSize = 2;
            const gap = 1;
            const barHue = (percentIdx * 250 + hueShift) % 360;

            for (let y = height - 2; y > height - barHeight; y -= (segmentSize + gap)) {
              ctx.fillStyle = `hsl(${barHue}, 90%, 55%)`;
              ctx.fillRect(x, y - segmentSize, barWidth, segmentSize);
            }

            const peakY = height - Math.floor(peaksRef.current[i]) - 1;
            if (peakY < height - 1 && peakY >= 0) {
              ctx.fillStyle = `hsl(${(barHue + 120) % 360}, 95%, 70%)`;
              ctx.fillRect(x, peakY, barWidth, 1.2);
            }
          }
        } else if (targetMode === 'waveform-river') {
          analyser.getByteFrequencyData(dataArray);
          drawWaveformRiver(ctx, canvas, dataArray, visTheme, visSensitivity, waveformHistoryRef, width, height);
        } else if (targetMode === 'kaleidoscope') {
          analyser.getByteFrequencyData(dataArray);
          drawKaleidoscope(ctx, canvas, dataArray, visTheme, visSensitivity, kaleidoscopeTimeRef, width, height);
        } else if (targetMode === 'album-wall') {
          analyser.getByteFrequencyData(dataArray);
          drawAlbumWall(ctx, canvas, dataArray, visSensitivity, recentCoverUrlsRef.current, albumWallStateRef, width, height);
        } else if (targetMode === 'oscilloscope') {
          analyser.getByteTimeDomainData(dataArray);

          let customAccent = '#00ff44';
          try {
            const raw = window.getComputedStyle(document.body).getPropertyValue('--skin-accent');
            if (raw && raw.trim()) {
              customAccent = raw.trim();
            }
          } catch (e) {}

          ctx.beginPath();
          ctx.strokeStyle = 
            visTheme === 'custom' ? customAccent :
            visTheme === 'crimson' ? '#ff1e43' :
            visTheme === 'cyberpunk' ? '#ec4899' :
            visTheme === 'amber' ? '#f59e0b' :
            visTheme === 'aqua' ? '#06b6d4' :
            visTheme === 'mono' ? '#ffffff' :
            '#00ff44'; // Neon Green
          ctx.lineWidth = 1.8;

          const sliceWidth = width / bufferLength;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0; // center at 1.0
            const y = (v * height) / 2;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }

            x += sliceWidth;
          }

          ctx.lineTo(width, height / 2);
          ctx.stroke();
        } else if (targetMode === 'matrix-rain') {
          analyser.getByteFrequencyData(dataArray);
          drawMatrixRain(ctx, canvas, dataArray, visTheme, visSensitivity, matrixRef, width, height);
        } else if (targetMode === 'starfield-warp') {
          analyser.getByteFrequencyData(dataArray);
          const bassVal = dataArray[1] || 0;
          // Warp speed scales dynamically with bass frequency and sensitivity
          const warpSpeed = Math.max(0.012, (bassVal / 255) * 0.125) * visSensitivity;

          // Clear background with deep space dark tone
          ctx.fillStyle = '#010103';
          ctx.fillRect(0, 0, width, height);

          // Dynamic pulsing ambient nebula center glow based on max dimension
          const maxDim = Math.max(width, height);
          const glowRad = Math.max(45, Math.floor(maxDim * 0.28 + (bassVal / 255) * maxDim * 0.48));
          const glowGrad = ctx.createRadialGradient(width / 2, height / 2, 2, width / 2, height / 2, glowRad);
          
          let starsGlowStr = 'rgba(14, 165, 233, 0.45)'; // sky-500
          let starsGlowMid = 'rgba(56, 189, 248, 0.15)'; // sky-300
          let starglowRefColor = 'rgb(186, 230, 253)'; // sky-200
          if (visTheme === 'cyberpunk') {
            starsGlowStr = 'rgba(219, 39, 119, 0.45)';
            starsGlowMid = 'rgba(244, 114, 182, 0.15)';
            starglowRefColor = 'rgb(255, 200, 240)';
          } else if (visTheme === 'amber') {
            starsGlowStr = 'rgba(245, 158, 11, 0.42)';
            starsGlowMid = 'rgba(251, 191, 36, 0.15)';
            starglowRefColor = 'rgb(254, 243, 199)';
          } else if (visTheme === 'aqua') {
            starsGlowStr = 'rgba(6, 182, 212, 0.45)';
            starsGlowMid = 'rgba(45, 212, 191, 0.15)';
            starglowRefColor = 'rgb(204, 251, 241)';
          } else if (visTheme === 'mono') {
            starsGlowStr = 'rgba(161, 161, 170, 0.25)';
            starsGlowMid = 'rgba(212, 212, 216, 0.08)';
            starglowRefColor = 'rgb(250, 250, 250)';
          }

          glowGrad.addColorStop(0, starsGlowStr);
          glowGrad.addColorStop(0.4, starsGlowMid);
          glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = glowGrad;
          ctx.fillRect(0, 0, width, height);

          // Stars travel matching warpSpeed
          for (let i = 0; i < starsRef.current.length; i++) {
            const star = starsRef.current[i];
            if (!star) continue;

            // Save previous depth for drawing smooth high-speed trails
            const prevZ = star.z + warpSpeed * 1.5;

            // Travel forward (smaller Z means closer)
            star.z -= warpSpeed;

            // Reset star when it flies "behind" the camera view
            if (star.z <= 0) {
              star.z = 1.5;
              star.x = (Math.random() - 0.5) * 6.0;
              star.y = (Math.random() - 0.5) * 6.0;
              continue;
            }

            // Project current 3D position to 2D screen coordinates
            const px = Math.floor((star.x / star.z) * (width / 2) + width / 2);
            const py = Math.floor((star.y / star.z) * (height / 2) + height / 2);

            // Project previous position for tail connection
            const prevPx = Math.floor((star.x / prevZ) * (width / 2) + width / 2);
            const prevPy = Math.floor((star.y / prevZ) * (height / 2) + height / 2);

            // Only render stars/trails that has at least one end inside boundaries
            const currInside = px >= 0 && px < width && py >= 0 && py < height;
            const prevInside = prevPx >= 0 && prevPx < width && prevPy >= 0 && prevPy < height;

            if (currInside || prevInside) {
              const alpha = Math.min(1.0, 1 - (star.z / 1.5));
              
              // Draw high-speed light trails instead of tiny single-frame boxes
              ctx.strokeStyle = starglowRefColor;
              ctx.lineWidth = star.z < 0.4 ? 1.5 : 1;
              ctx.globalAlpha = alpha;
              ctx.beginPath();
              ctx.moveTo(prevPx, prevPy);
              ctx.lineTo(px, py);
              ctx.stroke();
              ctx.globalAlpha = 1.0;
            }
          }
        } else if (targetMode === 'fire') {
          analyser.getByteFrequencyData(dataArray);
          drawFire(ctx, canvas, dataArray, visTheme, visSensitivity, embersRef, width, height, beatPulseRef.current);
        } else if (targetMode === 'aurora') {
          analyser.getByteFrequencyData(dataArray);
          drawAurora(ctx, canvas, dataArray, visTheme, visSensitivity, auroraParticlesRef, width, height);
        } else if (targetMode === 'falling-stars') {
          analyser.getByteFrequencyData(dataArray);
          const bassSum = (dataArray[1] + dataArray[2] + dataArray[3]) / 3 || 0;
          const tIdx = Math.floor(bufferLength * 0.38);
          const trebleSum = ((dataArray[tIdx - 1] || 0) + (dataArray[tIdx] || 0) + (dataArray[tIdx + 1] || 0)) / 3;
          const bassNormalized = Math.min(1.0, (bassSum / 195) * visSensitivity);
          const trebleNormalized = Math.min(1.0, (trebleSum / 115) * visSensitivity);

          ctx.fillStyle = '#020206';
          ctx.fillRect(0, 0, width, height);

          ctx.fillStyle = '#ffffff';
          for (let i = 0; i < 35; i++) {
            const starX = (Math.sin(i * 917.43) * 0.5 + 0.5) * width;
            const starY = (Math.cos(i * 412.12) * 0.5 + 0.5) * (height * 0.85);
            const sparkle = Math.sin(Date.now() * 0.005 + i * 3.1) * 0.4 + 0.6;
            const size = (0.5 + trebleNormalized * 1.5) * sparkle;
            ctx.globalAlpha = 0.2 + sparkle * 0.6;
            ctx.fillRect(starX, starY, size, size);
          }
          ctx.globalAlpha = 1.0;

          // Spawns beautifully at any volume, scaling dynamically up for higher bass volumes
          const spawnChance = 0.06 + Math.min(0.20, bassNormalized * 0.25);
          const maxStars = 8 + Math.floor(bassNormalized * 6);

          if (fallingStarsRef.current.length < maxStars && Math.random() < spawnChance) {
            let starColor = '#60a5fa';
            if (visTheme === 'cyberpunk') {
              starColor = '#f472b6';
            } else if (visTheme === 'amber') {
              starColor = '#fbbf24';
            } else if (visTheme === 'aqua') {
              starColor = '#2dd4bf';
            } else if (visTheme === 'mono') {
              starColor = '#fafafa';
            }

            fallingStarsRef.current.push({
              x: Math.random() * width * 1.2 - width * 0.2,
              y: -10,
              vx: (1.8 + Math.random() * 2.8),
              vy: (1.5 + Math.random() * 2.2),
              length: 12 + Math.random() * 15,
              speed: 1.0 + Math.random() * 0.6,
              alpha: 1.0,
              size: Math.random() * 1.2 + 0.9,
              color: starColor
            });
          }

          for (let i = fallingStarsRef.current.length - 1; i >= 0; i--) {
            const m = fallingStarsRef.current[i]!;
            m.x += m.vx * m.speed * (1.0 + bassNormalized * 1.0);
            m.y += m.vy * m.speed * (1.0 + bassNormalized * 1.0);
            m.alpha -= 0.022;

            if (m.alpha <= 0 || m.y > height + 20 || m.x > width + 20) {
              fallingStarsRef.current.splice(i, 1);
              continue;
            }

            ctx.beginPath();
            ctx.lineWidth = m.size;
            ctx.globalAlpha = m.alpha;
            
            const startX = m.x - m.vx * m.length * 0.7;
            const startY = m.y - m.vy * m.length * 0.7;
            
            const lineGrad = ctx.createLinearGradient(startX, startY, m.x, m.y);
            lineGrad.addColorStop(0, 'rgba(0,0,0,0)');
            lineGrad.addColorStop(0.65, m.color);
            lineGrad.addColorStop(1, '#ffffff');

            ctx.strokeStyle = lineGrad;
            ctx.moveTo(startX, startY);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.size + 0.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 1.0;
          }
        } else if (targetMode === 'vfd') {
          analyser.getByteFrequencyData(dataArray);

          // 1. RETRO VFD CAR DECK METALLIC GLASS FRAMEWORK
          // Solid-state pitch-vacuum phosphor back-glow base
          const vfdBgRect = ctx.createLinearGradient(0, 0, 0, height);
          vfdBgRect.addColorStop(0, '#010609');
          vfdBgRect.addColorStop(0.5, '#000406');
          vfdBgRect.addColorStop(1, '#01080b');
          ctx.fillStyle = vfdBgRect;
          ctx.fillRect(0, 0, width, height);

          // Subtle CRT glass phosphorescent bleed gradient at the container core
          const ambientGlow = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, Math.max(width, height) * 0.65);
          let glowColor = 'rgba(0, 245, 230, 0.04)';
          let activeGridColor = 'rgba(0, 245, 230, 0.025)';
          if (visTheme === 'cyberpunk') {
            glowColor = 'rgba(236, 72, 153, 0.04)';
            activeGridColor = 'rgba(236, 72, 153, 0.02)';
          } else if (visTheme === 'amber') {
            glowColor = 'rgba(217, 119, 6, 0.04)';
            activeGridColor = 'rgba(217, 119, 6, 0.02)';
          } else if (visTheme === 'aqua') {
            glowColor = 'rgba(6, 182, 212, 0.04)';
            activeGridColor = 'rgba(6, 182, 212, 0.025)';
          } else if (visTheme === 'mono') {
            glowColor = 'rgba(255, 255, 255, 0.025)';
            activeGridColor = 'rgba(255, 255, 255, 0.015)';
          }
          ambientGlow.addColorStop(0, glowColor);
          ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = ambientGlow;
          ctx.fillRect(0, 0, width, height);

          // Horizontal wire cathode strands (simulating vacuum filaments passing over face elements)
          ctx.strokeStyle = activeGridColor;
          ctx.lineWidth = 0.5;
          for (let gy = 4; gy < height; gy += 6) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(width, gy);
            ctx.stroke();
          }
          // Vertical mesh grid lines (creates high-end VFD texture overlay)
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.005)';
          for (let gx = 8; gx < width; gx += 12) {
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, height);
            ctx.stroke();
          }

          // Dynamic scale modifier supporting custom canvas constraints
          const vfdScale = Math.max(1.0, Math.min(width / 260, height / 80));

          // VFD display custom phosphor mapping logic (lit elements)
          const getVfdSegmentColor = (segRatio: number, isHigh: boolean) => {
            if (isHigh) {
              if (visTheme === 'cyberpunk') return '#ff007f';
              if (visTheme === 'amber') return '#f97316';
              if (visTheme === 'aqua') return '#06b6d4';
              if (visTheme === 'mono') return '#ffffff';
              return '#ff1e56'; // Accent vibrant alert red
            }
            if (visTheme === 'cyberpunk') {
              if (segRatio > 0.7) return '#d946ef';
              return '#8b5cf6';
            } else if (visTheme === 'amber') {
              if (segRatio > 0.7) return '#f59e0b';
              return '#d97706';
            } else if (visTheme === 'aqua') {
              if (segRatio > 0.7) return '#22d3ee';
              return '#0891b2';
            } else if (visTheme === 'mono') {
              return '#c8c8cb';
            } else {
              // Standard Alpine-style VFD dashboard colors
              if (segRatio > 0.78) return '#ff1e56'; // Alert Red
              if (segRatio > 0.58) return '#ffcc11'; // Warm Yellow
              return '#00f5bd'; // Classic Cyan Phosphor Base
            }
          };

          // Authentic dimmed unlit "ghost" segment outlines inside the vacuum glass tube
          const getVfdGhostColor = () => {
            if (visTheme === 'cyberpunk') return 'rgba(236, 72, 153, 0.06)';
            if (visTheme === 'amber') return 'rgba(217, 119, 6, 0.06)';
            if (visTheme === 'aqua') return 'rgba(6, 182, 212, 0.07)';
            if (visTheme === 'mono') return 'rgba(255, 255, 255, 0.05)';
            return 'rgba(0, 245, 189, 0.05)';
          };

          // Divide horizontal viewport into three cohesive sections:
          const leftPanelWidth = Math.floor(width * 0.23);
          const rightPanelWidth = Math.floor(width * 0.23);
          const centerPanelWidth = width - leftPanelWidth - rightPanelWidth;


          // ---------------- 1. LEFT PANEL HUD SECTION (METRIC GAUGE BLOCKS) ----------------
          ctx.font = `${Math.max(5.5, 6 * vfdScale)}px "JetBrains Mono", Courier, monospace`;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'left';

          // A. Pilot indicators: Stereo active status [ST]
          const isStereoActive = isPlaying && (dataArray[2] > 20 || dataArray[8] > 20);
          ctx.fillStyle = isStereoActive ? '#ff1e56' : 'rgba(255, 30, 86, 0.1)';
          ctx.fillText('ST', 6 * vfdScale, 8 * vfdScale);
          ctx.strokeStyle = isStereoActive ? '#ff1e56' : 'rgba(255, 30, 86, 0.16)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(4 * vfdScale, 5 * vfdScale, 10 * vfdScale, 6 * vfdScale);

          // B. System processing: [LOUD] equalizer booster
          const isLoudActive = isPlaying && (dataArray[1] > 95);
          ctx.fillStyle = isLoudActive ? '#00f5bd' : getVfdGhostColor();
          ctx.fillText('LOUD', 17 * vfdScale, 8 * vfdScale);
          ctx.strokeRect(15 * vfdScale, 5 * vfdScale, 18 * vfdScale, 6 * vfdScale);

          // C. Custom digital signal status: [DSP] circuit
          const isDspActive = isPlaying;
          ctx.fillStyle = isDspActive ? '#00f5bd' : getVfdGhostColor();
          ctx.fillText('DSP', 36 * vfdScale, 8 * vfdScale);
          ctx.strokeRect(34 * vfdScale, 5 * vfdScale, 14 * vfdScale, 6 * vfdScale);

          // D. Direct L & R Channel db Volt level ladders
          const leftSigSum = ((dataArray[0] || 0) + (dataArray[2] || 0) + (dataArray[4] || 0)) / 3;
          const rightSigSum = ((dataArray[1] || 0) + (dataArray[3] || 0) + (dataArray[5] || 0)) / 3;
          const leftVolRatio = Math.min(1.0, (leftSigSum / 215) * visSensitivity);
          const rightVolRatio = Math.min(1.0, (rightSigSum / 215) * visSensitivity);

          const signalMeterY = 17 * vfdScale;
          const signalMeterHeight = 5 * vfdScale;
          const signalMeterMaxSegs = 10;
          const sigSegWidth = Math.floor((leftPanelWidth - 18 * vfdScale) / signalMeterMaxSegs) - 1.2;

          ctx.font = `${Math.max(5, 5 * vfdScale)}px "JetBrains Mono", Courier, monospace`;
          ctx.fillStyle = '#00f5bd';
          ctx.fillText('L', 4 * vfdScale, signalMeterY + 2.5 * vfdScale);
          ctx.fillText('R', 4 * vfdScale, signalMeterY + signalMeterHeight + 4.5 * vfdScale);

          const drawVfdLadder = (ratioVal: number, drawY: number) => {
            const litCount = Math.floor(ratioVal * signalMeterMaxSegs);
            for (let s = 0; s < signalMeterMaxSegs; s++) {
              const segX = 11 * vfdScale + s * (sigSegWidth + 1.2);
              const isLit = s < litCount;
              const ratio = s / signalMeterMaxSegs;
              ctx.fillStyle = isLit ? getVfdSegmentColor(ratio, ratio > 0.82) : getVfdGhostColor();
              ctx.fillRect(segX, drawY, sigSegWidth, 3 * vfdScale);
              if (isLit) {
                // glowing heat wire core
                ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                ctx.fillRect(segX + Math.floor(sigSegWidth / 2), drawY + 0.5, 1, 2 * vfdScale - 1);
              }
            }
          };

          drawVfdLadder(leftVolRatio, signalMeterY);
          drawVfdLadder(rightVolRatio, signalMeterY + signalMeterHeight + 2 * vfdScale);

          // E. Dynamic decibel legends
          ctx.font = `${Math.max(4.5, 4.5 * vfdScale)}px "JetBrains Mono", Courier, monospace`;
          ctx.fillStyle = '#115560';
          ctx.fillText('-18  -12  -6  0  +3', 11 * vfdScale, signalMeterY + signalMeterHeight * 2 + 5 * vfdScale);


          // ---------------- 2. CENTER PANEL SECTION (20-BAND EQUALIZER ARCHITECTURE) ----------------
          const cX = leftPanelWidth + 4 * vfdScale;
          const cW = centerPanelWidth - 8 * vfdScale;
          const cH = height - 12 * vfdScale;
          const numVfdBars = 20; // 20 sleek responsive bar slots
          const barGap = 1.8 * vfdScale;
          const vfdBarWidth = Math.floor((cW - (numVfdBars - 1) * barGap) / numVfdBars);
          const maxSegments = 14; // Multi-tiered vacuum compartments

          for (let i = 0; i < numVfdBars; i++) {
            const percentIdx = i / numVfdBars;
            const dataIdx = Math.floor(Math.pow(percentIdx, 1.4) * (bufferLength * 0.65));
            const value = (dataArray[dataIdx] || 0) * visSensitivity;
            const litSegments = Math.min(maxSegments, Math.floor((value / 255) * maxSegments));

            const x = cX + i * (vfdBarWidth + barGap);

            // Calculate peak values
            if (litSegments >= peaksRef.current[i]) {
              peaksRef.current[i] = litSegments;
              peakHoldCountRef.current[i] = 18; // longer hold for gorgeous floating dynamics!
            } else {
              if (peakHoldCountRef.current[i] > 0) {
                peakHoldCountRef.current[i]--;
              } else {
                peaksRef.current[i] = Math.max(0, peaksRef.current[i] - 0.28);
              }
            }

            const segHeight = Math.floor((cH - 6 * vfdScale) / maxSegments) - 0.8;
            const segStep = segHeight + 0.8;

            // Draw all segments, lit and phantom (ghosts)
            for (let seg = 0; seg < maxSegments; seg++) {
              const segY = height - 6 * vfdScale - (seg * segStep);
              const isLit = seg < litSegments;
              const ratio = seg / maxSegments;

              ctx.fillStyle = isLit ? getVfdSegmentColor(ratio, ratio > 0.85) : getVfdGhostColor();
              ctx.fillRect(x, segY, vfdBarWidth, segHeight);

              // Inside glowing cathode bar highlight
              if (isLit) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                ctx.fillRect(x + 0.5, segY + Math.floor(segHeight / 2), vfdBarWidth - 1, 0.5);
              }
            }

            // Draw floating red peak hold nodes
            const peakSeg = Math.floor(peaksRef.current[i]);
            if (peakSeg > 0 && peakSeg < maxSegments) {
              const peakY = height - 6 * vfdScale - (peakSeg * segStep);
              ctx.fillStyle = getVfdSegmentColor(peakSeg / maxSegments, true);
              ctx.fillRect(x, peakY, vfdBarWidth, 1.2 * vfdScale);
              
              // Soft underlying halogen shine
              ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
              ctx.fillRect(x, peakY + 0.5, vfdBarWidth, 0.5);
            }
          }

          // Render spectrum frequency coordinates
          ctx.font = `${Math.max(4.5, 4.5 * vfdScale)}px "JetBrains Mono", Courier, monospace`;
          ctx.fillStyle = '#115560';
          ctx.textAlign = 'center';
          const freqLabels = ['40', '100', '250', '630', '1K', '4K', '11K', '16K'];
          for (let f = 0; f < freqLabels.length; f++) {
            const percent = f / (freqLabels.length - 1);
            const labelX = cX + percent * (cW - vfdBarWidth) + vfdBarWidth / 2;
            ctx.fillText(freqLabels[f]!, labelX, height - 3 * vfdScale);
          }


          // ---------------- 3. RIGHT PANEL HUD SECTION (TUNER & TRACK DESCRIPS) ----------------
          const rX = width - rightPanelWidth + 4 * vfdScale;

          // A. Interactive spinning feedback vector circle (Tuner Dial)
          const dialRadius = Math.min(leftPanelWidth / 4.2, height * 0.28);
          const dialCenterX = rX + rightPanelWidth - dialRadius - 8 * vfdScale;
          const dialCenterY = 16 * vfdScale;

          // Silent background ring loop
          ctx.strokeStyle = getVfdGhostColor();
          ctx.lineWidth = 2.5 * vfdScale;
          ctx.beginPath();
          ctx.arc(dialCenterX, dialCenterY, dialRadius, 0, Math.PI * 2);
          ctx.stroke();

          // Active revolving stator segment
          const rotationRate = isPlaying ? (Date.now() * 0.0035) % (Math.PI * 2) : 0;
          ctx.strokeStyle = '#00f5bd';
          ctx.lineWidth = 2.8 * vfdScale;
          ctx.beginPath();
          ctx.arc(dialCenterX, dialCenterY, dialRadius, rotationRate, rotationRate + 1.2);
          ctx.stroke();

          // Outer orbiting ticker arcs
          ctx.strokeStyle = '#ffcc11';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(dialCenterX, dialCenterY, dialRadius + 3.5 * vfdScale, rotationRate * 1.5, rotationRate * 1.5 + 0.4);
          ctx.stroke();

          // Central control pin
          ctx.fillStyle = '#ff1e56';
          ctx.beginPath();
          ctx.arc(dialCenterX, dialCenterY, 2 * vfdScale, 0, Math.PI * 2);
          ctx.fill();

          // B. System status indicator ticker
          ctx.textAlign = 'left';
          ctx.fillStyle = isPlaying ? '#ffcc11' : getVfdGhostColor();
          ctx.font = `${Math.max(6, 6 * vfdScale)}px "JetBrains Mono", Courier, monospace`;
          ctx.fillText('•PLAYING', rX + 2 * vfdScale, 10 * vfdScale);

          // C. Digital segmented track counter
          ctx.fillStyle = '#00f5bd';
          ctx.font = `${Math.max(9, 9 * vfdScale)}px "JetBrains Mono", Courier, monospace`;
          const currentTrackIndex = currentTrackRef.current ? (parseInt(currentTrackRef.current.id) || 1) : 1;
          const trackLabel = `TR-${currentTrackIndex.toString().padStart(2, '0')}`;
          ctx.fillText(trackLabel, rX + 2 * vfdScale, 21 * vfdScale);

          // D. Digital sound field mode tag
          ctx.fillStyle = '#ffcc11';
          ctx.font = `${Math.max(5.5, 5.5 * vfdScale)}px "JetBrains Mono", Courier, monospace`;
          ctx.fillText('STEREO WIDE', rX + 2 * vfdScale, 29 * vfdScale);
        } else if (targetMode === 'vu-meters') {
          analyser.getByteFrequencyData(dataArray);

          // 1. CHASSIS FACEPLATE DESIGN: Vintage brushed titanium/aluminum hi-fi console
          const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
          bgGrad.addColorStop(0, '#1c1d24');
          bgGrad.addColorStop(0.45, '#13141a');
          bgGrad.addColorStop(0.55, '#0e0f14');
          bgGrad.addColorStop(1, '#08080c');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, width, height);

          // Fine high-end metal brushed grain lines (horizontal aluminum brushing)
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
          ctx.lineWidth = 1;
          for (let y = 0; y < height; y += 3) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
          }

          // Subtle warm glow spill behind the front-panel assembly
          const panelsGlow = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, Math.max(width, height));
          panelsGlow.addColorStop(0, 'rgba(251, 191, 36, 0.02)');
          panelsGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = panelsGlow;
          ctx.fillRect(0, 0, width, height);

          // Responsive layout analysis (Portrait vs Landscape)
          const isPortrait = height > width * 0.95;
          let meterWidth = 0;
          let meterHeight = 0;
          let leftCenter = { x: 0, y: 0 };
          let rightCenter = { x: 0, y: 0 };
          let vuScale = 1.0;

          if (isPortrait) {
            // Stacked dual meter displays
            const calculatedW = Math.floor(width * 0.84);
            meterWidth = Math.max(120, calculatedW);
            meterHeight = Math.floor(meterWidth * 0.54);
            vuScale = Math.max(0.65, meterWidth / 260);

            leftCenter = { 
              x: Math.floor(width * 0.5), 
              y: Math.floor(height * 0.28)
            };
            rightCenter = { 
              x: Math.floor(width * 0.5), 
              y: Math.floor(height * 0.72)
            };
          } else {
            // Side-by-side classic rack dual displays
            const calculatedW = Math.floor(width * 0.43);
            meterWidth = Math.max(120, calculatedW);
            meterHeight = Math.min(Math.floor(height * 0.65), Math.floor(meterWidth * 0.56));
            vuScale = Math.max(0.65, meterWidth / 265);

            leftCenter = { 
              x: Math.floor(width * 0.26), 
              y: Math.floor(height * 0.52)
            };
            rightCenter = { 
              x: Math.floor(width * 0.74), 
              y: Math.floor(height * 0.52)
            };
          }

          // Render luxury outer wood panel trim sidebar grips (only on wider landscape screens)
          if (!isPortrait && width > 480) {
            const woodWidth = Math.floor(Math.max(12, width * 0.016));
            
            // Left wood panel
            const leftWood = ctx.createLinearGradient(0, 0, woodWidth, 0);
            leftWood.addColorStop(0, '#2d1406');
            leftWood.addColorStop(0.35, '#451a03');
            leftWood.addColorStop(0.7, '#3b1402');
            leftWood.addColorStop(1, '#1c0c04');
            ctx.fillStyle = leftWood;
            ctx.fillRect(0, 0, woodWidth, height);

            // Left inner brass gold trim divider
            ctx.fillStyle = '#b45309';
            ctx.fillRect(woodWidth, 0, 1.5, height);

            // Right wood panel
            const rightWood = ctx.createLinearGradient(width - woodWidth, 0, width, 0);
            rightWood.addColorStop(0, '#1c0c04');
            rightWood.addColorStop(0.3, '#3b1402');
            rightWood.addColorStop(0.65, '#451a03');
            rightWood.addColorStop(1, '#2d1406');
            ctx.fillStyle = rightWood;
            ctx.fillRect(width - woodWidth, 0, woodWidth, height);

            // Right inner brass gold trim divider
            ctx.fillStyle = '#b45309';
            ctx.fillRect(width - woodWidth - 1.5, 0, 1.5, height);
          }

          // 2. CORNER MOUNTING RACK SCREWS (High-detail 3D hex bolt look)
          const drawCornerScrew = (sx: number, sy: number) => {
            const screwRadius = 6 * vuScale;
            
            // Screw pocket outer shadow
            ctx.fillStyle = '#030305';
            ctx.beginPath();
            ctx.arc(sx, sy, screwRadius + 1, 0, Math.PI * 2);
            ctx.fill();

            // Screw head metallic gradient
            const screwGrad = ctx.createLinearGradient(sx - screwRadius, sy - screwRadius, sx + screwRadius, sy + screwRadius);
            screwGrad.addColorStop(0, '#a1a1aa');
            screwGrad.addColorStop(0.4, '#d4d4d8');
            screwGrad.addColorStop(0.7, '#52525b');
            screwGrad.addColorStop(1, '#27272a');
            ctx.fillStyle = screwGrad;
            ctx.beginPath();
            ctx.arc(sx, sy, screwRadius, 0, Math.PI * 2);
            ctx.fill();

            // Inner engraving outline
            ctx.strokeStyle = '#18181b';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.arc(sx, sy, screwRadius - 1.5, 0, Math.PI * 2);
            ctx.stroke();

            // Center screwdriver thread slot (classic slot style, rotated 45deg for organic style)
            ctx.strokeStyle = '#111315';
            ctx.lineWidth = 1.6 * vuScale;
            ctx.beginPath();
            const angle = Math.PI * 0.25;
            ctx.moveTo(sx - Math.cos(angle) * (screwRadius - 2), sy - Math.sin(angle) * (screwRadius - 2));
            ctx.lineTo(sx + Math.cos(angle) * (screwRadius - 2), sy + Math.sin(angle) * (screwRadius - 2));
            ctx.stroke();
          };

          // Render corner screws on the four corners of the visualizer (inset slightly)
          const paddingCorner = 18 * vuScale;
          drawCornerScrew(paddingCorner + (isPortrait ? 0 : 20), paddingCorner);
          drawCornerScrew(width - paddingCorner - (isPortrait ? 0 : 20), paddingCorner);
          drawCornerScrew(paddingCorner + (isPortrait ? 0 : 20), height - paddingCorner);
          drawCornerScrew(width - paddingCorner - (isPortrait ? 0 : 20), height - paddingCorner);

          // 3. RETRO DECAL LOGOS BRANDING (Luxury high-fidelity screen printed look)
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Main laboratory label
          ctx.font = `bold ${Math.max(6.5, 7.5 * vuScale)}px "Space Grotesk", sans-serif`;
          ctx.letterSpacing = '1.8px';
          ctx.fillStyle = '#a1a1aa';
          ctx.globalAlpha = 0.55;
          ctx.fillText('SERENE ULTRA-PRECISION LABORATORY MONITOR', width / 2, Math.max(12, 14 * vuScale));

          // Sub-systems / Model Number text printed below
          ctx.font = `500 ${Math.max(5.5, 6.5 * vuScale)}px "JetBrains Mono", sans-serif`;
          ctx.letterSpacing = '1.0px';
          ctx.fillStyle = '#71717a';
          ctx.globalAlpha = 0.4;
          ctx.fillText('DUAL LEVEL DB ANALYZER  •  MODEL VU-77', width / 2, height - Math.max(11, 14 * vuScale));
          ctx.globalAlpha = 1.0;
          ctx.letterSpacing = '0px'; // reset

          // 4. ACTIVE MAIN POWER FLICKERING GLASS TUBE LED (Realistic glass lamp housing)
          const powerX = width / 2;
          const powerY = isPortrait ? height / 2 : Math.max(40, 38 * vuScale);
          const powerStatusOn = isPlaying;

          // Power lamp bevel ring
          ctx.fillStyle = '#0d0d12';
          ctx.beginPath();
          ctx.arc(powerX, powerY, 5 * vuScale, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#52525b';
          ctx.lineWidth = 1 * vuScale;
          ctx.beginPath();
          ctx.arc(powerX, powerY, 5.5 * vuScale, 0, Math.PI * 2);
          ctx.stroke();

          // Active light emission glow
          let pColor = '#3f3f46';
          let pGlow = 'rgba(63, 63, 70, 0)';
          if (powerStatusOn) {
            pColor = visTheme === 'cyberpunk' ? '#06b6d4' :
                     visTheme === 'amber' ? '#f59e0b' :
                     visTheme === 'aqua' ? '#10b981' :
                     visTheme === 'mono' ? '#ffffff' :
                     '#ef4444'; // warm retro gold-red
            
            pGlow = visTheme === 'cyberpunk' ? 'rgba(6, 182, 212, 0.65)' :
                    visTheme === 'amber' ? 'rgba(245, 158, 11, 0.65)' :
                    visTheme === 'aqua' ? 'rgba(16, 185, 129, 0.65)' :
                    visTheme === 'mono' ? 'rgba(255, 255, 255, 0.55)' :
                    'rgba(239, 68, 68, 0.65)';
          }

          if (powerStatusOn) {
            const radGrad = ctx.createRadialGradient(powerX, powerY, 0.5, powerX, powerY, 8 * vuScale);
            radGrad.addColorStop(0, '#ffffff');
            radGrad.addColorStop(0.25, pColor);
            radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = radGrad;
            ctx.shadowColor = pColor;
            ctx.shadowBlur = 12 * vuScale;
            ctx.beginPath();
            ctx.arc(powerX, powerY, 3.8 * vuScale, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // reset
          } else {
            ctx.fillStyle = '#27272a';
            ctx.beginPath();
            ctx.arc(powerX, powerY, 3.2 * vuScale, 0, Math.PI * 2);
            ctx.fill();
          }

          // Power font
          ctx.font = `bold ${Math.max(5.0, 5.5 * vuScale)}px "JetBrains Mono", sans-serif`;
          ctx.fillStyle = powerStatusOn ? pColor : '#52525b';
          ctx.fillText('POWER', powerX, powerY + 11 * vuScale);


          // 5. INPUT TUNED FREQUENCY BINS FOR LEFT & RIGHT CHANNELS
          let leftSum = 0;
          const leftBins = 22;
          for (let i = 1; i <= leftBins; i++) {
            leftSum += dataArray[i] || 0;
          }
          const leftFreqAvg = leftSum / leftBins;

          let rightSum = 0;
          const rightBins = 46;
          for (let i = 14; i < 14 + rightBins; i++) {
            rightSum += dataArray[i] || 0;
          }
          const rightFreqAvg = rightSum / rightBins;

          // Standard calibration modifiers based on overall sensitivity
          const leftTarget = Math.min(1.12, (leftFreqAvg / 178) * visSensitivity);
          const rightTarget = Math.min(1.12, (rightFreqAvg / 91) * visSensitivity);

          if (!vuNeedlesRef.current) {
            vuNeedlesRef.current = { leftVal: 0.0, leftVel: 0.0, rightVal: 0.0, rightVel: 0.0 };
          }

          // Organic springs with subtle bounce stopper constraints
          const stiffness = 0.20;
          const damping = 0.54;

          const leftForce = (leftTarget - vuNeedlesRef.current.leftVal) * stiffness;
          vuNeedlesRef.current.leftVel = (vuNeedlesRef.current.leftVel + leftForce) * damping;
          vuNeedlesRef.current.leftVal += vuNeedlesRef.current.leftVel;

          const rightForce = (rightTarget - vuNeedlesRef.current.rightVal) * stiffness;
          vuNeedlesRef.current.rightVel = (vuNeedlesRef.current.rightVel + rightForce) * damping;
          vuNeedlesRef.current.rightVal += vuNeedlesRef.current.rightVel;

          // Hard mechanical needle bouncing off left (-20dB extreme) and right (+3dB extreme) stopping pins!
          if (vuNeedlesRef.current.leftVal < 0.0) {
            vuNeedlesRef.current.leftVal = 0.0;
            vuNeedlesRef.current.leftVel = Math.abs(vuNeedlesRef.current.leftVel) * 0.25; // bounce forward
          } else if (vuNeedlesRef.current.leftVal > 1.13) {
            vuNeedlesRef.current.leftVal = 1.13;
            vuNeedlesRef.current.leftVel = -Math.abs(vuNeedlesRef.current.leftVel) * 0.35; // bounce backward
          }

          if (vuNeedlesRef.current.rightVal < 0.0) {
            vuNeedlesRef.current.rightVal = 0.0;
            vuNeedlesRef.current.rightVel = Math.abs(vuNeedlesRef.current.rightVel) * 0.25;
          } else if (vuNeedlesRef.current.rightVal > 1.13) {
            vuNeedlesRef.current.rightVal = 1.13;
            vuNeedlesRef.current.rightVel = -Math.abs(vuNeedlesRef.current.rightVel) * 0.35;
          }


          // 6. DELUXE SKEUOMORPHIC METER DIAL RENDERER
          const drawMeterDial = (center: { x: number; y: number }, value: number, label: string) => {
            const rx = center.x - Math.floor(meterWidth / 2);
            const ry = center.y - Math.floor(meterHeight * 0.55);
            const mw = meterWidth;
            const mh = meterHeight;

            // Recessed background pocket shadow (under bezel window)
            ctx.fillStyle = '#020204';
            ctx.fillRect(rx - 2, ry - 2, mw + 4, mh + 4);

            // Backlit Dial Plate design inside the compartment window
            let dialPlateBg;
            let tickColor = '#2d2e34';
            let alarmColor = '#dc2626';
            let pointerColor = '#dc2626';
            let peakLampColor = '#ef4444';

            // Bulb ambient lighting color variables
            let bulbLColor = 'rgba(254, 215, 170, 0.42)'; // upper left bulb glow
            let bulbRColor = 'rgba(254, 215, 170, 0.18)'; // upper right

            // Adjust lighting profiles to fit individual cosmetic themes perfectly!
            if (visTheme === 'cyberpunk') {
              dialPlateBg = ctx.createLinearGradient(rx, ry, rx, ry + mh);
              dialPlateBg.addColorStop(0, '#10051e');
              dialPlateBg.addColorStop(0.5, '#1e0129');
              dialPlateBg.addColorStop(1, '#0e0014');
              tickColor = '#f472b6';
              alarmColor = '#38bdf8';
              pointerColor = '#06b6d4';
              peakLampColor = '#06b6d4';
              bulbLColor = 'rgba(244, 114, 182, 0.6)';
              bulbRColor = 'rgba(6, 182, 212, 0.35)';
            } else if (visTheme === 'amber') {
              dialPlateBg = ctx.createLinearGradient(rx, ry, rx, ry + mh);
              dialPlateBg.addColorStop(0, '#351202');
              dialPlateBg.addColorStop(0.5, '#240800');
              dialPlateBg.addColorStop(1, '#110300');
              tickColor = '#fb923c';
              alarmColor = '#fb7185';
              pointerColor = '#f97316';
              peakLampColor = '#fb923c';
              bulbLColor = 'rgba(251, 146, 60, 0.65)';
              bulbRColor = 'rgba(244, 63, 94, 0.38)';
            } else if (visTheme === 'aqua') {
              // Classic high-end McIntosh glass blue illumination
              dialPlateBg = ctx.createLinearGradient(rx, ry, rx, ry + mh);
              dialPlateBg.addColorStop(0, '#023851');
              dialPlateBg.addColorStop(0.4, '#001a2c');
              dialPlateBg.addColorStop(1, '#00070e');
              tickColor = '#e0f2fe';
              alarmColor = '#f43f5e';
              pointerColor = '#f97316';
              peakLampColor = '#f43f5e';
              bulbLColor = 'rgba(14, 165, 233, 0.7)';
              bulbRColor = 'rgba(38, 198, 218, 0.42)';
            } else if (visTheme === 'crimson') {
              // Red Fury 4 menacing pure-red glowing dial faceplate
              dialPlateBg = ctx.createLinearGradient(rx, ry, rx, ry + mh);
              dialPlateBg.addColorStop(0, '#120102');
              dialPlateBg.addColorStop(0.5, '#1f0003');
              dialPlateBg.addColorStop(1, '#050001');
              tickColor = '#ffffff'; // White high speed ticks
              alarmColor = '#ff1e43'; // Scarlet alarm bounds
              pointerColor = '#ff1e43'; // Bright red active indicator
              peakLampColor = '#ff1e43';
              bulbLColor = 'rgba(255, 30, 67, 0.7)';
              bulbRColor = 'rgba(255, 30, 67, 0.35)';
            } else if (visTheme === 'mono') {
              // Luxury brushed aluminum instrument dial
              dialPlateBg = ctx.createLinearGradient(rx, ry, rx, ry + mh);
              dialPlateBg.addColorStop(0, '#27272a');
              dialPlateBg.addColorStop(0.55, '#18181b');
              dialPlateBg.addColorStop(1, '#09090b');
              tickColor = '#fafafa';
              alarmColor = '#71717a';
              pointerColor = '#fafafa';
              peakLampColor = '#ffffff';
              bulbLColor = 'white';
              bulbRColor = 'white';
            } else {
              // Warm incandescent golden backlight paper plate
              dialPlateBg = ctx.createLinearGradient(rx, ry, rx, ry + mh);
              dialPlateBg.addColorStop(0, '#fffaee');
              dialPlateBg.addColorStop(0.55, '#fef0bc');
              dialPlateBg.addColorStop(0.9, '#fae190');
              dialPlateBg.addColorStop(1, '#d5b967');
              tickColor = '#1f1e24';
              alarmColor = '#c2185b';
              pointerColor = '#e11d48';
              peakLampColor = '#ef4444';
              bulbLColor = 'rgba(253, 186, 116, 0.52)';
              bulbRColor = 'rgba(254, 215, 170, 0.28)';
            }

            // Fill actual dial background
            ctx.fillStyle = dialPlateBg;
            ctx.fillRect(rx, ry, mw, mh);

            // Draw incandescent glowing bulb source textures in top left + top right inside corners of cavity card!
            const bulbRadius = 14 * vuScale;
            // Left bulb halo
            const leftGrad = ctx.createRadialGradient(rx, ry, 0, rx, ry, bulbRadius * 2.2);
            leftGrad.addColorStop(0, bulbLColor);
            leftGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = leftGrad;
            ctx.beginPath();
            ctx.arc(rx, ry, bulbRadius * 2.2, 0, Math.PI * 2);
            ctx.fill();

            // Right bulb halo (subtly dimmer to avoid perfect flatness)
            const rightGrad = ctx.createRadialGradient(rx + mw, ry, 0, rx + mw, ry, bulbRadius * 2.0);
            rightGrad.addColorStop(0, bulbRColor);
            rightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = rightGrad;
            ctx.beginPath();
            ctx.arc(rx + mw, ry, bulbRadius * 2.0, 0, Math.PI * 2);
            ctx.fill();

            // Setup trigonometry coordinates for precise logarithmic dial face
            const radius = Math.floor(mh * 1.34);
            const cx = center.x;
            const cy = center.y + Math.floor(mh * 0.44);

            const startAng = Math.PI * 1.20;
            const endAng = Math.PI * 1.80;

            // Draw calibrated DB arcs
            ctx.strokeStyle = tickColor;
            ctx.lineWidth = 1 * vuScale;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, startAng, endAng);
            ctx.stroke();

            // Draw standard level percent (%) inner arc
            ctx.strokeStyle = tickColor;
            ctx.globalAlpha = 0.55;
            ctx.lineWidth = 0.5 * vuScale;
            ctx.beginPath();
            ctx.arc(cx, cy, radius - 8 * vuScale, startAng, endAng);
            ctx.stroke();
            ctx.globalAlpha = 1.0;

            // Render high overload bold colored block zone beyond 0dB (Starts around ratio 0.72)
            ctx.strokeStyle = alarmColor;
            ctx.lineWidth = 2.8 * vuScale;
            ctx.beginPath();
            const warningStartAngle = startAng + (endAng - startAng) * 0.72;
            ctx.arc(cx, cy, radius - 0.5 * vuScale, warningStartAngle, endAng);
            ctx.stroke();

            // Red overload secondary percentage strip
            ctx.strokeStyle = alarmColor;
            ctx.globalAlpha = 0.4;
            ctx.lineWidth = 1.2 * vuScale;
            ctx.beginPath();
            ctx.arc(cx, cy, radius - 8 * vuScale, warningStartAngle, endAng);
            ctx.stroke();
            ctx.globalAlpha = 1.0;

            // 7. CALIBRATED LOGARITHMIC SYSTEM TICK MARKS (Total 41 marks)
            const totalSteps = 40;
            for (let t = 0; t <= totalSteps; t++) {
              const r = t / totalSteps;
              const angle = startAng + (endAng - startAng) * r;
              const isOver = r > 0.72;

              let majorHz = t % 5 === 0;
              let midHz = t % 5 !== 0 && t % 2 === 0;
              
              let tickLen = 3.5 * vuScale;
              if (majorHz) tickLen = 8.0 * vuScale;
              else if (midHz) tickLen = 5.0 * vuScale;

              ctx.strokeStyle = isOver ? alarmColor : tickColor;
              ctx.lineWidth = majorHz ? 1.6 * vuScale : (midHz ? 1.0 * vuScale : 0.6 * vuScale);

              const xo = cx + Math.cos(angle) * (radius);
              const yo = cy + Math.sin(angle) * (radius);
              const xi = cx + Math.cos(angle) * (radius - tickLen);
              const yi = cy + Math.sin(angle) * (radius - tickLen);

              ctx.beginPath();
              ctx.moveTo(xi, yi);
              ctx.lineTo(xo, yo);
              ctx.stroke();

              // Print calibrated DB text labels
              if (majorHz) {
                const labelAng = angle;
                const lx = cx + Math.cos(labelAng) * (radius - 14.5 * vuScale);
                const ly = cy + Math.sin(labelAng) * (radius - 14.5 * vuScale);

                let labelDb = '-20';
                if (t === 0) labelDb = '-20';
                else if (t === 5) labelDb = '-10';
                else if (t === 10) labelDb = '-7';
                else if (t === 15) labelDb = '-5';
                else if (t === 20) labelDb = '-3';
                else if (t === 25) labelDb = '-1';
                else if (t === 29) labelDb = '0';
                else if (t === 33) labelDb = '+1';
                else if (t === 37) labelDb = '+2';
                else if (t === 40) labelDb = '+3';

                ctx.font = `bold ${Math.max(5.2, 5.8 * vuScale)}px "JetBrains Mono", sans-serif`;
                if (visTheme === 'mono') {
                  ctx.font = `500 ${Math.max(5.2, 5.8 * vuScale)}px "Space Grotesk", sans-serif`;
                }
                ctx.fillStyle = isOver ? alarmColor : tickColor;
                ctx.fillText(labelDb, lx, ly);
              }

              // Double-Scale Under-labels: Signal %, printed below the secondary line
              if (t % 10 === 0) {
                const labelAng = angle;
                const lx = cx + Math.cos(labelAng) * (radius - 23.5 * vuScale);
                const ly = cy + Math.sin(labelAng) * (radius - 23.5 * vuScale);

                let levelPercentage = '0%';
                if (t === 0) levelPercentage = '0';
                else if (t === 10) levelPercentage = '20';
                else if (t === 20) levelPercentage = '50';
                else if (t === 30) levelPercentage = '100';
                else if (t === 40) levelPercentage = '150';

                ctx.font = `${Math.max(4.2, 4.8 * vuScale)}px sans-serif`;
                ctx.fillStyle = isOver ? alarmColor : tickColor;
                ctx.globalAlpha = 0.55;
                ctx.fillText(levelPercentage, lx, ly);
                ctx.globalAlpha = 1.0;
              }
            }

            // Print system identifier badges directly on Dial Plate
            ctx.fillStyle = tickColor;
            ctx.globalAlpha = 0.45;
            ctx.font = `bold ${Math.max(8.0, 9.5 * vuScale)}px "Space Grotesk", sans-serif`;
            ctx.fillText(label, cx, cy - radius * 0.44);

            // Print secondary "decibels" label text
            ctx.font = `italic ${Math.max(5.0, 5.5 * vuScale)}px sans-serif`;
            ctx.fillText('DECIBELS', cx, cy - radius * 0.35);

            // Print low % label text
            ctx.font = `italic 500 ${Math.max(4.2, 4.5 * vuScale)}px "JetBrains Mono", sans-serif`;
            ctx.fillText('SIGNAL P.R.', cx, cy - radius * 0.20);
            ctx.globalAlpha = 1.0;

            // 8. MECHANICAL METRIC NEEDLE STOPPING POCKET PEGS
            const pegRadius = 1.5 * vuScale;
            // Left Peg
            const lPegAngle = startAng - 0.038;
            const pxL = cx + Math.cos(lPegAngle) * (radius - 4 * vuScale);
            const pyL = cy + Math.sin(lPegAngle) * (radius - 4 * vuScale);
            ctx.fillStyle = '#0a0a0f';
            ctx.beginPath();
            ctx.arc(pxL, pyL, pegRadius, 0, Math.PI * 2);
            ctx.fill();
            // Peg metallic bevel pin tip
            ctx.fillStyle = '#71717a';
            ctx.beginPath();
            ctx.arc(pxL - 0.3 * vuScale, pyL - 0.3 * vuScale, pegRadius * 0.6, 0, Math.PI * 2);
            ctx.fill();

            // Right Peg
            const rPegAngle = endAng + 0.038;
            const pxR = cx + Math.cos(rPegAngle) * (radius - 4 * vuScale);
            const pyR = cy + Math.sin(rPegAngle) * (radius - 4 * vuScale);
            ctx.fillStyle = '#0a0a0f';
            ctx.beginPath();
            ctx.arc(pxR, pyR, pegRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#71717a';
            ctx.beginPath();
            ctx.arc(pxR - 0.3 * vuScale, pyR - 0.3 * vuScale, pegRadius * 0.6, 0, Math.PI * 2);
            ctx.fill();


            // 9. HIGH-FIDELITY ACTIVE NEEDLE & CASTING SHADOW
            const pointerAngle = startAng + (endAng - startAng) * value;
            const pointerLen = radius - 1 * vuScale;

            const pointerX = cx + Math.cos(pointerAngle) * pointerLen;
            const pointerY = cy + Math.sin(pointerAngle) * pointerLen;

            // Organic needle shadow projection on dial face (offset below and right)
            const sOffsetRad = 0.016;
            const sLengthSub = 2.0 * vuScale;
            const sxOffset = cx + Math.cos(pointerAngle + sOffsetRad) * (pointerLen - sLengthSub);
            const syOffset = cy + Math.sin(pointerAngle + sOffsetRad) * (pointerLen - sLengthSub) + 5 * vuScale;

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
            ctx.lineWidth = 1.6 * vuScale;
            ctx.beginPath();
            ctx.moveTo(cx, cy + 3 * vuScale);
            ctx.lineTo(sxOffset, syOffset);
            ctx.stroke();

            // Elegant d'Arsonval Counterweight Tail Assembly balance below the pivot point (opposite needle direction)
            const tailAngle = pointerAngle + Math.PI;
            const tailLen = 14 * vuScale;
            const txVal = cx + Math.cos(tailAngle) * tailLen;
            const tyVal = cy + Math.sin(tailAngle) * tailLen;

            ctx.strokeStyle = '#18181b';
            ctx.lineWidth = 3 * vuScale;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(txVal, tyVal);
            ctx.stroke();

            // Tail weight plate
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(txVal, tyVal, 4 * vuScale, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#52525b';
            ctx.lineWidth = 0.8 * vuScale;
            ctx.stroke();

            // Main forward pointing solid filament needle indicator
            ctx.strokeStyle = pointerColor;
            ctx.lineWidth = 1.1 * vuScale;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(pointerX, pointerY);
            ctx.stroke();

            // Highlight glint alongside needle body
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = 0.4 * vuScale;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(pointerAngle) * (pointerLen * 0.65), cy + Math.sin(pointerAngle) * (pointerLen * 0.65));
            ctx.stroke();


            // 10. POLISHED METAL PIVOT CAP ASSEMBLY
            // Copper coil inner magnetic core simulation (glowing circles under cap)
            const copperRing = 9 * vuScale;
            ctx.fillStyle = '#18181b';
            ctx.beginPath();
            ctx.arc(cx, cy, copperRing, 0, Math.PI * 2);
            ctx.fill();

            // Render 3 tiny circular golden copper wires wrapping the core
            ctx.strokeStyle = '#b45309';
            ctx.lineWidth = 0.5 * vuScale;
            ctx.beginPath();
            ctx.arc(cx, cy, copperRing - 1.5 * vuScale, 0, Math.PI * 2);
            ctx.arc(cx, cy, copperRing - 3.2 * vuScale, 0, Math.PI * 2);
            ctx.stroke();

            // Concentric shiny metallic hub plate cap
            const capRadius = 6.8 * vuScale;
            const metallicHub = ctx.createLinearGradient(cx - capRadius, cy - capRadius, cx + capRadius, cy + capRadius);
            metallicHub.addColorStop(0, '#e4e4e7');
            metallicHub.addColorStop(0.35, '#71717a');
            metallicHub.addColorStop(0.65, '#27272a');
            metallicHub.addColorStop(1, '#09090b');
            ctx.fillStyle = metallicHub;
            ctx.beginPath();
            ctx.arc(cx, cy, capRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#3f3f46';
            ctx.lineWidth = 0.6 * vuScale;
            ctx.stroke();

            // Polished central steel pivot lock pin
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx - 0.7 * vuScale, cy - 0.8 * vuScale, 1.2 * vuScale, 0, Math.PI * 2);
            ctx.fill();


            // 11. CHAMFERED BEZEL WINDOW (Framing of front faceplate sheet cut-out)
            ctx.strokeStyle = '#18181b';
            ctx.lineWidth = 2 * vuScale;
            ctx.strokeRect(rx, ry, mw, mh);

            // Shaded inner cutout depth shadows (simulate sheet-metal opening depth)
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.lineWidth = 1.5 * vuScale;
            ctx.strokeRect(rx + 1, ry + 1, mw - 2, mh - 2);

            // Polished metallic gold or silver border highlight ring
            ctx.strokeStyle = visTheme === 'cyberpunk' ? '#f472b6' :
                              visTheme === 'amber' ? '#b45309' :
                              visTheme === 'aqua' ? '#0284c7' :
                              visTheme === 'mono' ? '#ffffff' :
                              '#b45309'; // warm gold bezel trim
            ctx.lineWidth = 0.8 * vuScale;
            ctx.strokeRect(rx - 0.5, ry - 0.5, mw + 1, mh + 1);


            // 13. DYNAMIC RED PEAK LEVEL INDICATOR WARNING LAMPS (Placed above dial windows)
            const peakLampX = rx + Math.floor(mw * 0.86);
            const peakLampY = ry - 14 * vuScale;
            const inRedZone = value > 0.72; // overload activates above 0dB

            // Bezel box around lamp
            ctx.fillStyle = '#0a0a0f';
            ctx.beginPath();
            ctx.arc(peakLampX, peakLampY, 4.2 * vuScale, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#52525b';
            ctx.lineWidth = 0.8 * vuScale;
            ctx.beginPath();
            ctx.arc(peakLampX, peakLampY, 4.8 * vuScale, 0, Math.PI * 2);
            ctx.stroke();

            // Pulse neon lamp
            if (inRedZone && isPlaying) {
              const pulseBlur = 8 * vuScale;
              ctx.shadowColor = peakLampColor;
              ctx.shadowBlur = pulseBlur;

              const peakGlow = ctx.createRadialGradient(peakLampX, peakLampY, 0.2, peakLampX, peakLampY, 4 * vuScale);
              peakGlow.addColorStop(0, '#ffffff');
              peakGlow.addColorStop(0.4, peakLampColor);
              peakGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
              ctx.fillStyle = peakGlow;
              ctx.beginPath();
              ctx.arc(peakLampX, peakLampY, 3.2 * vuScale, 0, Math.PI * 2);
              ctx.fill();

              ctx.shadowBlur = 0; // reset
            } else {
              // Dim static color
              ctx.fillStyle = '#27272a';
              ctx.beginPath();
              ctx.arc(peakLampX, peakLampY, 2.8 * vuScale, 0, Math.PI * 2);
              ctx.fill();
            }

            // PEAK text printed below
            ctx.font = `bold ${Math.max(4.0, 4.5 * vuScale)}px "JetBrains Mono", sans-serif`;
            ctx.fillStyle = (inRedZone && isPlaying) ? peakLampColor : '#52525b';
            ctx.fillText('PEAK', peakLampX, peakLampY + 8 * vuScale);
          };

          // Render both beautiful channels with counterweight bouncing values
          drawMeterDial(leftCenter, vuNeedlesRef.current.leftVal, 'VU L');
          drawMeterDial(rightCenter, vuNeedlesRef.current.rightVal, 'VU R');
        } else if (targetMode === 'moloko-plus') {
          analyser.getByteFrequencyData(dataArray);

          let bassSum = 0;
          for (let i = 1; i <= 6; i++) {
            bassSum += dataArray[i] || 0;
          }
          const bassNormalized = Math.min(1.0, (bassSum / (6 * 190)) * visSensitivity);

          let trebleSum = 0;
          const startTreb = Math.floor(bufferLength * 0.25);
          const endTreb = Math.floor(bufferLength * 0.55);
          for (let i = startTreb; i < endTreb; i++) {
            trebleSum += dataArray[i] || 0;
          }
          const trebleNormalized = Math.min(1.0, (trebleSum / ((endTreb - startTreb) * 92)) * visSensitivity);

          const isBeat = bassNormalized > 0.72;

          if (!molokoBufferRef.current) {
            molokoBufferRef.current = document.createElement('canvas');
            molokoBufferRef.current.width = width;
            molokoBufferRef.current.height = height;
            const oCtx = molokoBufferRef.current.getContext('2d');
            if (oCtx) {
              oCtx.fillStyle = '#0a0a0c';
              oCtx.fillRect(0, 0, width, height);
            }
          }

          const oCanvas = molokoBufferRef.current;
          const oCtx = oCanvas.getContext('2d');

          if (oCtx) {
            const time = Date.now() * 0.001;

            const tempFeedbackCanvas = document.createElement('canvas');
            tempFeedbackCanvas.width = width;
            tempFeedbackCanvas.height = height;
            const tempCtx = tempFeedbackCanvas.getContext('2d');
            if (tempCtx) {
              tempCtx.drawImage(oCanvas, 0, 0);

              oCtx.save();
              oCtx.fillStyle = '#0a0a0c';
              oCtx.fillRect(0, 0, width, height);

              oCtx.translate(width / 2, height / 2);
              const rotateAngle = (0.015 * Math.sin(time * 0.4)) + (isBeat ? 0.045 * Math.sin(time * 2) : 0);
              oCtx.rotate(rotateAngle);

              const scaleAmount = 0.965 + (bassNormalized * 0.045);
              oCtx.scale(scaleAmount, scaleAmount);

              oCtx.globalAlpha = 0.93 - (bassNormalized * 0.03);
              oCtx.drawImage(tempFeedbackCanvas, -width / 2, -height / 2);
              oCtx.restore();
            }

            const centerX = width / 2;
            const centerY = height / 2;
            const baseHue = (time * 45) % 360;

            const getMolokoColor = (offset: number, alpha = 1) => {
              const currentHue = (baseHue + offset) % 360;
              if (visTheme === 'cyberpunk') {
                return `hsla(${(currentHue + 280) % 360}, 95%, 65%, ${alpha})`;
              } else if (visTheme === 'amber') {
                return `hsla(${(currentHue * 0.15 + 24) % 360}, 100%, 55%, ${alpha})`;
              } else if (visTheme === 'aqua') {
                return `hsla(${(currentHue * 0.2 + 180) % 360}, 90%, 60%, ${alpha})`;
              } else if (visTheme === 'mono') {
                const lum = 40 + Math.sin(time + offset * 0.01) * 35;
                return `rgba(${lum + 120}, ${lum + 120}, ${lum + 120}, ${alpha})`;
              } else {
                return `hsla(${currentHue}, 95%, 60%, ${alpha})`;
              }
            };

            const numSegments = 12;
            const maxSpikeRadius = Math.min(width, height) * 0.58;
            const pulseScale = Math.min(3.5, Math.min(width, height) / 64);
            const innerSpikeRadius = Math.min(width, height) * 0.12 + (bassNormalized * 12 * pulseScale);

            oCtx.save();
            oCtx.translate(centerX, centerY);
            oCtx.rotate(time * 0.25);
            
            oCtx.beginPath();
            oCtx.lineWidth = 1.3 * pulseScale;
            oCtx.strokeStyle = getMolokoColor(0, 0.55);

            for (let i = 0; i < numSegments * 2; i++) {
              const theta = (i / (numSegments * 2)) * Math.PI * 2;
              const dataIdx = Math.floor((i / (numSegments * 2)) * (bufferLength * 0.35));
              const intensity = (dataArray[dataIdx] || 0) / 255;
              const r = innerSpikeRadius + (intensity * (maxSpikeRadius - innerSpikeRadius) * (0.6 + trebleNormalized * 0.4));

              const x = Math.cos(theta) * r;
              const y = Math.sin(theta) * r;

              if (i === 0) {
                oCtx.moveTo(x, y);
              } else {
                oCtx.lineTo(x, y);
              }
            }
            oCtx.closePath();
            oCtx.stroke();
            oCtx.restore();

            const numCirclePoints = 64;
            const flowRadius = Math.min(width, height) * 0.22 + (bassNormalized * 16 * pulseScale);

            oCtx.beginPath();
            oCtx.lineWidth = 2.0 * pulseScale;
            oCtx.strokeStyle = getMolokoColor(120, 0.75);

            for (let i = 0; i < numCirclePoints; i++) {
              const ratio = i / numCirclePoints;
              const radAngle = ratio * Math.PI * 2 - (time * 0.12);
              const dataIdx = Math.floor(Math.abs(Math.sin(ratio * Math.PI)) * (bufferLength * 0.4));
              const freqVal = (dataArray[dataIdx] || 0) / 255;
              
              const offset = freqVal * 18 * pulseScale * (1.0 + trebleNormalized);
              const r = flowRadius + offset * Math.cos(i * 0.35 + time * 4);

              const px = centerX + Math.cos(radAngle) * r;
              const py = centerY + Math.sin(radAngle) * r;

              if (i === 0) {
                oCtx.moveTo(px, py);
              } else {
                oCtx.lineTo(px, py);
              }
            }
            oCtx.closePath();
            oCtx.stroke();

            analyser.getByteTimeDomainData(dataArray);
            oCtx.beginPath();
            oCtx.lineWidth = 1.6;
            oCtx.strokeStyle = getMolokoColor(240, 0.85);

            for (let i = 0; i < bufferLength; i += 2) {
              const v = dataArray[i] / 128.0;
              const percentage = i / bufferLength;
              const x = percentage * width;
              
              const waveOffset = (v - 1.0) * height * 0.28 * (1.0 + bassNormalized * 0.8);
              const y = centerY + waveOffset + Math.sin(percentage * Math.PI * 2.5 + time * 5) * 1.5;

              if (i === 0) {
                oCtx.moveTo(x, y);
              } else {
                oCtx.lineTo(x, y);
              }
            }
            oCtx.stroke();

            const particles = molokoParticlesRef.current;
            if (isBeat && Math.random() < 0.35 && particles.length < 50) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 1.0 + Math.random() * 3.0 + (bassNormalized * 2.5);
              const life = 30 + Math.random() * 40;
              particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 2.2 + 0.8,
                hue: (baseHue + 40 + Math.random() * 60) % 360,
                alpha: 1.0,
                life,
                maxLife: life
              });
            }

            for (let i = particles.length - 1; i >= 0; i--) {
              const p = particles[i]!;
              p.x += p.vx + Math.sin(time * 8 + i) * 0.2;
              p.y += p.vy + Math.cos(time * 8 + i) * 0.2;
              p.life--;
              p.alpha = Math.max(0, p.life / p.maxLife);

              if (p.life <= 0 || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
                particles.splice(i, 1);
                continue;
              }

              oCtx.save();
              oCtx.globalAlpha = p.alpha;
              
              let pColor = `hsla(${p.hue}, 95%, 70%, ${p.alpha})`;
              if (visTheme === 'cyberpunk') {
                pColor = `hsla(${(p.hue + 200) % 360}, 95%, 65%, ${p.alpha})`;
              } else if (visTheme === 'amber') {
                pColor = `hsla(${(p.hue * 0.1 + 30) % 360}, 100%, 60%, ${p.alpha})`;
              } else if (visTheme === 'aqua') {
                pColor = `hsla(${(p.hue * 0.1 + 190) % 360}, 95%, 65%, ${p.alpha})`;
              } else if (visTheme === 'mono') {
                pColor = `rgba(235, 235, 240, ${p.alpha})`;
              }

              oCtx.fillStyle = pColor;
              oCtx.beginPath();
              oCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
              oCtx.fill();
              oCtx.restore();
            }
          }

          ctx.drawImage(oCanvas, 0, 0);
        } else if (targetMode === 'spinning-cd') {
          analyser.getByteFrequencyData(dataArray);
          let bassSum = 0;
          for (let i = 0; i < 6; i++) bassSum += dataArray[i] || 0;
          const bass = Math.min(1.0, (bassSum / (6 * 195)) * visSensitivity);

          let trebleSum = 0;
          const startTreb = Math.floor(bufferLength * 0.25);
          const endTreb = Math.floor(bufferLength * 0.55);
          for (let i = startTreb; i < endTreb; i++) {
            trebleSum += dataArray[i] || 0;
          }
          const treble = Math.min(1.0, (trebleSum / ((endTreb - startTreb) * 92)) * visSensitivity);

          const cx = width / 2;
          const cy = height / 2;
          const radius = Math.min(width, height) * 0.38 + (bass * 5);

          // Standard CLV rotation angle calculated continuously in render()
          const rotAngle = cdAngleRef.current;

          // 1. Ambient back panel glow with high-end dual radial gradient
          const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.6, cx, cy, radius * 1.6);
          const tColors: Record<string, string> = {
            crimson: 'rgba(255, 30, 67, ',
            cyberpunk: 'rgba(236, 72, 153, ',
            amber: 'rgba(245, 158, 11, ',
            aqua: 'rgba(34, 211, 238, ',
            mono: 'rgba(255, 255, 255, ',
            neon: 'rgba(52, 211, 153, '
          };
          const baseColor = tColors[visTheme] || 'rgba(16, 185, 129, ';
          glowGrad.addColorStop(0, `${baseColor}0.22)`);
          glowGrad.addColorStop(0.5, `${baseColor}0.08)`);
          glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 1.6, 0, Math.PI * 2);
          ctx.fill();

          // 2. Photorealistic CD Beveled Rim
          ctx.beginPath();
          ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
          ctx.fillStyle = '#0f1013';
          ctx.fill();
          
          // Shiny polycarbonate edge highlight
          const rimGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
          rimGrad.addColorStop(0, '#555861');
          rimGrad.addColorStop(0.5, '#17181c');
          rimGrad.addColorStop(1, '#a1a5b3');
          ctx.strokeStyle = rimGrad;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // 3. Brushed Metallic Silver CD Substrate
          const cdGrad = ctx.createRadialGradient(cx, cy, radius * 0.18, cx, cy, radius);
          cdGrad.addColorStop(0, '#ffffff');
          cdGrad.addColorStop(0.2, '#bbbecc');
          cdGrad.addColorStop(0.4, '#e1e3ed');
          cdGrad.addColorStop(0.7, '#676a75');
          cdGrad.addColorStop(0.9, '#dddfeb');
          cdGrad.addColorStop(1, '#1e2025');
          ctx.fillStyle = cdGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();

          // 4. Iridescent Holographic Wedge Flares
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          const numFlares = 8;
          for (let f = 0; f < numFlares; f++) {
            const flareAngle = rotAngle + (f * Math.PI * 2 / numFlares);
            const wedgeGrad = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
            const h1 = (f * (360 / numFlares) + rotAngle * 57) % 360;
            const h2 = (h1 + 135) % 360;
            wedgeGrad.addColorStop(0, 'rgba(0,0,0,0)');
            wedgeGrad.addColorStop(0.4, `hsla(${h1}, 100%, 70%, ${0.28 + treble * 0.25})`);
            wedgeGrad.addColorStop(0.8, `hsla(${h2}, 100%, 60%, ${0.22 + bass * 0.3})`);
            wedgeGrad.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.fillStyle = wedgeGrad;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, radius, flareAngle - 0.35, flareAngle + 0.35);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();

          // 5. High-density Polycarbonate Grooves
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 0.5;
          for (let r = 0.32; r < 0.95; r += 0.05) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius * r, 0, Math.PI * 2);
            ctx.stroke();
          }

          // CD text labels printed on disc (retro tech specifications curved with the CD)
          const cdScale = Math.max(1.0, radius / 33);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(rotAngle * 0.25);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
          ctx.font = `bold ${3.5 * cdScale}px monospace`;

          const drawTextOnArc = (text: string, r: number, centerAngle: number, inwardFacing: boolean) => {
            const characters = text.split('');
            const charWidths = characters.map(c => ctx.measureText(c).width);
            const totalWidth = charWidths.reduce((a, b) => a + b, 0);
            const totalAngle = totalWidth / r;

            let currentAngle = inwardFacing
              ? centerAngle + totalAngle / 2
              : centerAngle - totalAngle / 2;

            for (let i = 0; i < characters.length; i++) {
              const char = characters[i];
              const charW = charWidths[i];
              const charAngleOffset = charW / r;

              const angle = inwardFacing
                ? currentAngle - charAngleOffset / 2
                : currentAngle + charAngleOffset / 2;

              ctx.save();
              
              const xPos = Math.cos(angle) * r;
              const yPos = Math.sin(angle) * r;
              ctx.translate(xPos, yPos);

              if (inwardFacing) {
                ctx.rotate(angle - Math.PI / 2);
              } else {
                ctx.rotate(angle + Math.PI / 2);
              }

              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(char, 0, 0);
              ctx.restore();

              currentAngle = inwardFacing
                ? currentAngle - charAngleOffset
                : currentAngle + charAngleOffset;
            }
          };

          drawTextOnArc('COMPACT DISC DIGITAL AUDIO', radius * 0.65, -Math.PI / 2, false);
          drawTextOnArc('SPINAMP RECORDABLE 74M', radius * 0.65, Math.PI / 2, true);
          ctx.restore();

          // 6. Plastic hub with frosted ring and center spindle
          const innerRingRad = radius * 0.28;
          const plasticGrad = ctx.createRadialGradient(cx, cy, innerRingRad * 0.7, cx, cy, innerRingRad);
          plasticGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
          plasticGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
          plasticGrad.addColorStop(0.9, 'rgba(255, 255, 255, 0.25)');
          plasticGrad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
          ctx.fillStyle = plasticGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, innerRingRad, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#4b5563';
          ctx.lineWidth = 0.8 * cdScale;
          ctx.stroke();

          // Metallic center hub spindle
          const spindleRad = radius * 0.11;
          ctx.beginPath();
          ctx.arc(cx, cy, spindleRad, 0, Math.PI * 2);
          ctx.fillStyle = '#060709';
          ctx.fill();
          ctx.strokeStyle = '#d1d5db';
          ctx.lineWidth = 1.2 * cdScale;
          ctx.stroke();

          // 7. Mechanical laser pickup sled
          const songProg = durationRef.current > 0 ? (currentTimeRef.current / durationRef.current) : 0.42;
          const laserX = cx - radius * (0.32 + songProg * 0.48);
          ctx.strokeStyle = 'rgba(156, 163, 175, 0.35)';
          ctx.lineWidth = 1.5 * cdScale;
          ctx.beginPath();
          ctx.moveTo(cx - radius * 0.9, cy + 3 * cdScale);
          ctx.lineTo(cx - radius * 0.22, cy + 3 * cdScale);
          ctx.stroke();

          ctx.fillStyle = '#212226';
          ctx.fillRect(laserX - 4 * cdScale, cy - 1 * cdScale, 8 * cdScale, 8 * cdScale);
          ctx.beginPath();
          ctx.arc(laserX, cy + 3 * cdScale, 1.5 * cdScale, 0, Math.PI * 2);
          ctx.fillStyle = isPlaying ? `rgba(239, 68, 68, ${0.5 + Math.sin(Date.now() * 0.05) * 0.4})` : '#4b5563';
          ctx.fill();

          // 8. Visualizer Peripheral Spikes
          ctx.save();
          ctx.translate(cx, cy);
          for (let i = 0; i < 72; i++) {
            const idx = Math.floor((i / 72) * (bufferLength * 0.45));
            const freqVal = (dataArray[idx] || 0) / 255;
            const spikeLen = freqVal * 18 * cdScale * visSensitivity;
            const angle = (i / 72) * Math.PI * 2 - (rotAngle * 0.15);

            let sColor = `hsla(${(i * 5 + rotAngle * 50) % 360}, 95%, 65%, 0.65)`;
            if (visTheme === 'amber') sColor = `rgba(245, 158, 11, ${0.35 + freqVal * 0.65})`;
            else if (visTheme === 'aqua') sColor = `hsla(${(i * 2 + 180) % 360}, 92%, 65%, 0.6)`;
            else if (visTheme === 'mono') sColor = `rgba(255, 255, 255, ${0.25 + freqVal * 0.65})`;

            ctx.strokeStyle = sColor;
            ctx.lineWidth = 1.5 * cdScale;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * (radius + 2.5 * cdScale), Math.sin(angle) * (radius + 2.5 * cdScale));
            ctx.lineTo(Math.cos(angle) * (radius + 2.5 * cdScale + spikeLen), Math.sin(angle) * (radius + 2.5 * cdScale + spikeLen));
            ctx.stroke();
          }
          ctx.restore();

        } else if (targetMode === 'turntable') {
          analyser.getByteFrequencyData(dataArray);
          let bassSum = 0;
          for (let i = 0; i < 6; i++) bassSum += dataArray[i] || 0;
          const bass = Math.min(1.0, bassSum / (6 * 200)) * visSensitivity;

          const cx = width / 2;
          const cy = height / 2;

          // Continuous angle simulating physical 33⅓ RPM exactly
          const rotAngle = turntableAngleRef.current;

          // 1. Sleek Obsidian Matte & Brushed Titanium Chassis Deck
          const rectW = Math.min(width, height) * 1.15;
          const rectH = Math.min(width, height) * 0.90;
          const rx = cx - rectW / 2;
          const ry = cy - rectH / 2;
          
          // Fully proportional scaling factors without a 1.0 minimum floor
          const ttScale = rectW / 140;
          const lineScale = Math.max(0.5, ttScale);

          // Mathematically perfect centers, completely contained within chassis plate
          const platterX = rx + rectW * 0.375;
          const platterY = ry + rectH * 0.52;
          const platterRad = rectH * 0.42; // Fully responsive to deck height with 8% top/bottom safety margin

          // Back shadow
          const shadowOffset = Math.max(2, 5 * ttScale);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
          ctx.fillRect(rx + shadowOffset, ry + shadowOffset, rectW, rectH);

          // Matte Slate Chassis top plate
          ctx.fillStyle = '#16171b';
          ctx.fillRect(rx, ry, rectW, rectH);
          ctx.strokeStyle = '#272930';
          ctx.lineWidth = 1.5 * lineScale;
          ctx.strokeRect(rx, ry, rectW, rectH);

          // Brushed silver accent bezels
          const bezelOffset = Math.max(1, 3 * ttScale);
          ctx.strokeStyle = '#3a3c45';
          ctx.lineWidth = 0.8 * lineScale;
          ctx.strokeRect(rx + bezelOffset, ry + bezelOffset, rectW - bezelOffset * 2, rectH - bezelOffset * 2);

          // 2. High-precision Beveled Aluminium Platter
          ctx.beginPath();
          ctx.arc(platterX, platterY, platterRad, 0, Math.PI * 2);
          const platGrad = ctx.createRadialGradient(platterX, platterY, platterRad * 0.92, platterX, platterY, platterRad);
          platGrad.addColorStop(0, '#09090b');
          platGrad.addColorStop(0.35, '#2e3037');
          platGrad.addColorStop(0.72, '#18191d');
          platGrad.addColorStop(0.92, '#f3f4f6'); // bright silver edge rim
          platGrad.addColorStop(0.96, '#a1a5b4'); // grooves shadow
          platGrad.addColorStop(1, '#0c0d0e');
          ctx.fillStyle = platGrad;
          ctx.fill();

          // Authentic spinning strobe dot indicator bands representing real speed
          ctx.save();
          ctx.translate(platterX, platterY);
          ctx.rotate(rotAngle);
          ctx.fillStyle = '#cbd5e1';
          const outerDots = Math.max(20, Math.floor(45 * ttScale));
          for (let s = 0; s < outerDots; s++) {
            const dAng = (s / outerDots) * Math.PI * 2;
            const dotRad = Math.max(0.4, 1.1 * ttScale);
            ctx.beginPath();
            ctx.arc(Math.cos(dAng) * (platterRad - 3.2 * ttScale), Math.sin(dAng) * (platterRad - 3.2 * ttScale), dotRad, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          const innerDots = Math.max(15, Math.floor(36 * ttScale));
          for (let s = 0; s < innerDots; s++) {
            const dAng = (s / innerDots) * Math.PI * 2 - rotAngle * 0.35;
            const dotRad = Math.max(0.3, 0.9 * ttScale);
            ctx.beginPath();
            ctx.arc(Math.cos(dAng) * (platterRad - 6.5 * ttScale), Math.sin(dAng) * (platterRad - 6.5 * ttScale), dotRad, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          // 3. 12" Premium Heavyweight Vinyl LP Record
          const vinylRad = platterRad * 0.95;
          ctx.beginPath();
          ctx.arc(platterX, platterY, vinylRad, 0, Math.PI * 2);
          ctx.fillStyle = '#060608';
          ctx.fill();
          ctx.strokeStyle = '#1d1e23';
          ctx.lineWidth = 0.8 * lineScale;
          ctx.stroke();

          // High-fidelity dynamic groove rings & track separators
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.055)';
          ctx.lineWidth = 0.4 * lineScale;
          for (let gr = 0.38; gr < 0.96; gr += 0.045) {
            ctx.beginPath();
            ctx.arc(platterX, platterY, vinylRad * gr, 0, Math.PI * 2);
            ctx.stroke();
          }
          // Wide track gaps
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.0 * lineScale;
          for (let gap of [0.55, 0.73, 0.88]) {
            ctx.beginPath();
            ctx.arc(platterX, platterY, vinylRad * gap, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Dynamic radial reflection glare overlay on vinyl disc
          const glareGrad = ctx.createLinearGradient(platterX - vinylRad, platterY - vinylRad, platterX + vinylRad, platterY + vinylRad);
          glareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.045)');
          glareGrad.addColorStop(0.48, 'rgba(0,0,0,0)');
          glareGrad.addColorStop(0.52, 'rgba(0,0,0,0)');
          glareGrad.addColorStop(1, 'rgba(255, 255, 255, 0.045)');
          ctx.fillStyle = glareGrad;
          ctx.save();
          ctx.beginPath();
          ctx.arc(platterX, platterY, vinylRad, 0, Math.PI * 2);
          ctx.clip();
          ctx.fill();
          ctx.restore();

          // LP Album Custom Retro Sticker Label: The official Spinamp stylized lightning ball sticker
          const labelRad = vinylRad * 0.35;
          ctx.save();
          ctx.translate(platterX, platterY);
          ctx.rotate(rotAngle);
          ctx.beginPath();
          ctx.arc(0, 0, labelRad, 0, Math.PI * 2);
          
          // Premium Spinamp-themed dark obsidian and golden radial gradient
          const stickerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, labelRad);
          stickerGrad.addColorStop(0, '#1c1917');      // Deep obsidian charcoal core
          stickerGrad.addColorStop(0.40, '#2d1a04');   // Warm dark gold/chocolate
          stickerGrad.addColorStop(0.75, '#120b02');   // Deep burnt amber
          stickerGrad.addColorStop(1, '#0c0701');      // Pitch black edge
          ctx.fillStyle = stickerGrad;
          ctx.fill();

          // 1. Concentric gold/amber containment rings (Spinamp electricity field style)
          ctx.save();
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)'; // Amber-500 low opacity outer ring
          ctx.lineWidth = 0.6 * lineScale;
          ctx.beginPath();
          ctx.arc(0, 0, labelRad * 0.88, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)'; // Amber-400 dashed energy ring
          ctx.setLineDash([2.5 * lineScale, 1.8 * lineScale]);
          ctx.lineWidth = 0.5 * lineScale;
          ctx.beginPath();
          ctx.arc(0, 0, labelRad * 0.72, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // 2. High-precision central lightning bolt core (Spinamp signature)
          ctx.save();
          const boltPoints = [
            { x: 52, y: 18 },
            { x: 34, y: 52 },
            { x: 54, y: 52 },
            { x: 44, y: 82 },
            { x: 68, y: 44 },
            { x: 46, y: 44 }
          ];
          const bScale = labelRad * 0.0078; // perfectly proportioned to sit at center

          // Soft ambient flame/glow behind the bolt
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 6 * lineScale;

          // Background dark-orange backing for high-contrast neon feel
          ctx.fillStyle = '#b45309';
          ctx.beginPath();
          boltPoints.forEach((pt, i) => {
            const bx = (pt.x - 50) * (bScale * 1.08);
            const by = (pt.y - 50) * (bScale * 1.08);
            if (i === 0) ctx.moveTo(bx, by);
            else ctx.lineTo(bx, by);
          });
          ctx.closePath();
          ctx.fill();

          // Sharp vibrant golden-amber front bolt surface
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          boltPoints.forEach((pt, i) => {
            const bx = (pt.x - 50) * bScale;
            const by = (pt.y - 50) * bScale;
            if (i === 0) ctx.moveTo(bx, by);
            else ctx.lineTo(bx, by);
          });
          ctx.closePath();
          ctx.fill();

          // High frequency pure white core spark
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, labelRad * 0.075, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // 3. Curved typography / Elegant retro text branding wrapping around lightning
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(4.0, labelRad * 0.17)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('SPINAMP', 0, -labelRad * 0.45);

          ctx.font = `bold ${Math.max(2.8, labelRad * 0.11)}px monospace`;
          ctx.fillStyle = '#fbbf24';
          ctx.fillText('HI-FI RETRO', 0, labelRad * 0.52);

          ctx.font = `${Math.max(2.4, labelRad * 0.09)}px monospace`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fillText('STEREOPHONIC LP', 0, labelRad * 0.65);
          ctx.restore();

          // Gold stabilizing metal spindle clamp
          ctx.beginPath();
          ctx.arc(platterX, platterY, labelRad * 0.16, 0, Math.PI * 2);
          const goldGrad = ctx.createRadialGradient(platterX, platterY, 0, platterX, platterY, labelRad * 0.16);
          goldGrad.addColorStop(0, '#fef08a');
          goldGrad.addColorStop(0.4, '#ca8a04');
          goldGrad.addColorStop(1, '#713f12');
          ctx.fillStyle = goldGrad;
          ctx.fill();
          ctx.strokeStyle = '#ca8a04';
          ctx.lineWidth = 0.5 * lineScale;
          ctx.stroke();

          // 4. Mechanized Pivoted S-Shape Tone-arm
          const armBaseX = rx + rectW * 0.88;
          const armBaseY = platterY - rectH * 0.28; // Adjusted relative to platterY to keep geometries flawless

          // Metal anti-skate mounting plate
          ctx.fillStyle = '#222329';
          ctx.beginPath();
          ctx.arc(armBaseX, armBaseY, 13 * ttScale, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#555761';
          ctx.lineWidth = 1.0 * lineScale;
          ctx.stroke();

          // Brass adjust dials
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.arc(armBaseX + 6 * ttScale, armBaseY - 6 * ttScale, 2.5 * ttScale, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#0f1013';
          ctx.beginPath();
          ctx.arc(armBaseX, armBaseY, 8 * ttScale, 0, Math.PI * 2);
          ctx.fill();

          // Tone-arm pivot tracking calculation using realistic rigid-body trigonometry
          const trackProg = durationRef.current > 0 ? (currentTimeRef.current / durationRef.current) : 0.35;
          const rOut = vinylRad * 0.90;
          const rIn = vinylRad * 0.36;
          const currentRadius = rOut - trackProg * (rOut - rIn);

          // Distance from pivot to platter spindle center
          const dArmSpindle = Math.hypot(armBaseX - platterX, armBaseY - platterY);

          // Rigid physical length of the metallic tonearm (strictly constant)
          const armLength = dArmSpindle * 1.045;

          // Angle of spindle relative to pivot
          const phiArmSpindle = Math.atan2(platterY - armBaseY, platterX - armBaseX);

          // Angle inside the triangle between the arm and the spindle-pivot line via Cosine Rule
          const cosBeta = (dArmSpindle * dArmSpindle + armLength * armLength - currentRadius * currentRadius) / (2 * dArmSpindle * armLength);
          const betaAngle = Math.acos(Math.max(-1, Math.min(1, cosBeta)));

          // Real, non-stretching pivoted tone-arm angle
          const armAngle = phiArmSpindle + betaAngle;
          
          // Realistic minor high-frequency rigid-body vibration
          const armWobble = isPlaying ? (Math.sin(Date.now() * 0.1) * (bass * 0.003)) : 0;
          const finalArmAngle = armAngle + armWobble;

          // Contact stylus needle point (calculated from rigid length + rigid angle, no stretchy jelly coordinates)
          const stylusX = armBaseX + Math.cos(finalArmAngle) * armLength;
          const stylusY = armBaseY + Math.sin(finalArmAngle) * armLength;

          // Heavy adjustable chrome counterweight at extreme back of tone-arm
          const counterAngle = finalArmAngle + Math.PI;
          const cweightX = armBaseX + Math.cos(counterAngle) * 9.5 * ttScale;
          const cweightY = armBaseY + Math.sin(counterAngle) * 9.5 * ttScale;
          ctx.fillStyle = '#cbd5e1';
          ctx.lineWidth = 1.2 * lineScale;
          ctx.beginPath();
          ctx.arc(cweightX, cweightY, 4.2 * ttScale, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#1e293b';
          ctx.stroke();

          // Polished high-gloss S-shaped metallic tone-arm shaft
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 1.8 * lineScale;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(armBaseX, armBaseY);

          // Dynamic S-curve control points tracking as a rigid coordinate frame with finalArmAngle
          const cp1Angle = finalArmAngle + 0.14;
          const cp1Dist = armLength * 0.25;
          const cp1X = armBaseX + Math.cos(cp1Angle) * cp1Dist;
          const cp1Y = armBaseY + Math.sin(cp1Angle) * cp1Dist;

          const cp2Angle = finalArmAngle - 0.14;
          const cp2Dist = armLength * 0.68;
          const cp2X = armBaseX + Math.cos(cp2Angle) * cp2Dist;
          const cp2Y = armBaseY + Math.sin(cp2Angle) * cp2Dist;

          ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, stylusX, stylusY);
          ctx.stroke();

          // Stylus head-shell cartridge (Ortofon Concorde styled body)
          ctx.save();
          const headAngle = Math.atan2(stylusY - cp2Y, stylusX - cp2X) + 0.16;
          ctx.translate(stylusX, stylusY);
          ctx.rotate(headAngle);

          // Matte carbon-black block cartridge nose
          ctx.fillStyle = '#1e1b4b';
          ctx.fillRect(-6.5 * ttScale, -2 * ttScale, 8.5 * ttScale, 4.2 * ttScale);

          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 0.6 * lineScale;
          ctx.beginPath();
          ctx.moveTo(-1 * ttScale, -2 * ttScale);
          ctx.lineTo(-2 * ttScale, -4.5 * ttScale);
          ctx.stroke();

          // Stylus running needle micro blue jewel glow indicator
          ctx.beginPath();
          ctx.arc(-0.8 * ttScale, 0.8 * ttScale, 1.2 * ttScale, 0, Math.PI * 2);
          ctx.fillStyle = isPlaying ? `rgba(96, 165, 250, ${0.45 + Math.sin(Date.now() * 0.05) * 0.35})` : '#64748b';
          ctx.fill();
          ctx.restore();

          // 5. Stylus Pinpoint Red Strobe/Target Target Light Bloom
          const targetLightX = platterX - platterRad * 0.83;
          const targetLightY = platterY + platterRad * 0.58;
          
          // Pop-up cylindrical aluminum light housing
          ctx.fillStyle = '#a1a5b4';
          ctx.fillRect(targetLightX - 4 * ttScale, targetLightY - 4 * ttScale, 8 * ttScale, 8 * ttScale);
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.arc(targetLightX, targetLightY - 4 * ttScale, 3 * ttScale, 0, Math.PI * 2);
          ctx.fill();

          // Pinpoint Red/Orange Strobe LED bloom casting dynamic light towards platter
          if (isPlaying) {
            const strobeRadius = Math.max(15, 45 * ttScale);
            const strobeGlow = ctx.createRadialGradient(targetLightX, targetLightY - 4 * ttScale, 1 * ttScale, targetLightX, targetLightY - 4 * ttScale, strobeRadius);
            strobeGlow.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
            strobeGlow.addColorStop(0.2, 'rgba(239, 68, 68, 0.25)');
            strobeGlow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = strobeGlow;
            ctx.beginPath();
            ctx.arc(targetLightX, targetLightY - 4 * ttScale, strobeRadius, 0, Math.PI * 2);
            ctx.fill();
          }

          // 6. Pitch Slider (+/- 8% Speed controller)
          const slX = rx + rectW * 0.88;
          const slY = ry + rectH * 0.58;
          const slLen = rectH * 0.30;
          ctx.fillStyle = '#0a0b0d';
          ctx.fillRect(slX - 3 * ttScale, slY, 6 * ttScale, slLen);
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(slX - 0.6 * ttScale, slY, 1.2 * ttScale, slLen);

          const knobY = slY + slLen * 0.4 + (Math.sin(Date.now() * 0.001) * slLen * 0.1);
          ctx.fillStyle = '#202124';
          ctx.fillRect(slX - 6 * ttScale, knobY - 3 * ttScale, 12 * ttScale, 6 * ttScale);
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(slX - 6 * ttScale, knobY - 0.8 * ttScale, 12 * ttScale, 1.6 * ttScale);

          // Technical text prints on chassis board
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'; // high contrast white-silver ink
          ctx.font = `bold ${Math.max(5.5, 4.5 * ttScale)}px sans-serif`;
          ctx.textAlign = 'left';
          ctx.fillText('DIRECT DRIVE TURNTABLE', rx + 14 * ttScale, ry + 12 * Math.min(2.0, ttScale));
          ctx.font = `${Math.max(3.8, 2.5 * ttScale)}px monospace`;
          ctx.fillText('QUARTZ SYNTAX SL-1200SPIN vA1', rx + 14 * ttScale, ry + 19 * Math.min(2.0, ttScale));

        } else if (targetMode === 'minidisk') {
          analyser.getByteFrequencyData(dataArray);
          let bassSum = 0;
          for (let i = 0; i < 6; i++) bassSum += dataArray[i] || 0;
          const bass = Math.min(1.0, (bassSum / (6 * 195)) * visSensitivity);

          let trebleSum = 0;
          const startTreb = Math.floor(bufferLength * 0.25);
          const endTreb = Math.floor(bufferLength * 0.55);
          for (let i = startTreb; i < endTreb; i++) {
            trebleSum += dataArray[i] || 0;
          }
          const treble = Math.min(1.0, (trebleSum / ((endTreb - startTreb) * 92)) * visSensitivity);

          const cx = width / 2;
          const cy = height / 2;

          // Continuous physically-modelled rotation angle (varying RPM depending on song position)
          const rotAngle = minidiscAngleRef.current;

          // Target Sony-spec 72:68 aspect ratio
          const mdW = Math.min(width, height) * 0.88;
          const mdH = mdW * (68 / 72);
          const mdx = cx - mdW / 2;
          const mdy = cy - mdH / 2;

          // Drop shadow for the cartridge
          ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
          ctx.fillRect(mdx + 6, mdy + 6, mdW, mdH);

          // 1. Sleek Polycarbonate Translucent Outer Shell Frame
          const shellGrad = ctx.createLinearGradient(mdx, mdy, mdx + mdW, mdy + mdH);
          if (visTheme === 'amber') {
            shellGrad.addColorStop(0, 'rgba(84, 32, 4, 0.92)');
            shellGrad.addColorStop(0.5, 'rgba(43, 14, 0, 0.88)');
            shellGrad.addColorStop(1, 'rgba(120, 53, 4, 0.95)');
          } else if (visTheme === 'cyberpunk') {
            shellGrad.addColorStop(0, 'rgba(124, 58, 237, 0.88)');
            shellGrad.addColorStop(0.5, 'rgba(76, 29, 149, 0.84)');
            shellGrad.addColorStop(1, 'rgba(196, 181, 253, 0.9)');
          } else if (visTheme === 'aqua') {
            shellGrad.addColorStop(0, 'rgba(8, 77, 102, 0.92)');
            shellGrad.addColorStop(0.5, 'rgba(4, 38, 51, 0.88)');
            shellGrad.addColorStop(1, 'rgba(21, 128, 153, 0.95)');
          } else if (visTheme === 'mono') {
            shellGrad.addColorStop(0, 'rgba(39, 39, 42, 0.92)');
            shellGrad.addColorStop(0.5, 'rgba(18, 18, 18, 0.88)');
            shellGrad.addColorStop(1, 'rgba(63, 63, 70, 0.95)');
          } else {
            shellGrad.addColorStop(0, 'rgba(6, 78, 59, 0.92)');
            shellGrad.addColorStop(0.5, 'rgba(2, 44, 34, 0.88)');
            shellGrad.addColorStop(1, 'rgba(16, 185, 129, 0.95)');
          }

          ctx.fillStyle = shellGrad;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(mdx, mdy, mdW, mdH, 10);
          } else {
            ctx.rect(mdx, mdy, mdW, mdH);
          }
          ctx.fill();

          // Beveled acrylic lens highlights on the cartridge casing
          ctx.strokeStyle = visTheme === 'amber' ? 'rgba(245, 158, 11, 0.45)' : visTheme === 'cyberpunk' ? 'rgba(192, 132, 252, 0.45)' : 'rgba(34, 211, 238, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // 2. Proportional Right-Side Rotating Disc Drive Chamber
          // Center aligned at 60% horizontally and 50% vertically, with radius 33% (64mm disc inside 72mm shell)
          const discCx = mdx + mdW * 0.60;
          const discCy = mdy + mdH * 0.50;
          const discRad = mdW * 0.33;

          // Disc chamber ring groove
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(discCx, discCy, discRad + 1.8, 0, Math.PI * 2);
          ctx.stroke();

          // 3. Under-Disc Laser Lens Viewport Window & Slide Slots
          // Real-time slot covered by the shutter (horizontal slots extending from hub to outer radius)
          const slotX = discCx - mdW * 0.02;
          const slotY = discCy - mdH * 0.052;
          const slotW = discRad * 1.05;
          const slotH = mdH * 0.104;

          ctx.fillStyle = '#06070c';
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(slotX, slotY, slotW, slotH, 2.5);
          } else {
            ctx.rect(slotX, slotY, slotW, slotH);
          }
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 0.8;
          ctx.stroke();

          // Copper slide guides inside slot
          ctx.strokeStyle = '#c2410c';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(slotX, slotY + 2);
          ctx.lineTo(slotX + slotW, slotY + 2);
          ctx.moveTo(slotX, slotY + slotH - 2);
          ctx.lineTo(slotX + slotW, slotY + slotH - 2);
          ctx.stroke();

          // 4. Real-time Optical Laser Pick-Up Assembly (rushing inside slot under disc)
          const songProg = durationRef.current > 0 ? (currentTimeRef.current / durationRef.current) : 0.42;
          const laserProgressX = slotX + mdW * 0.03 + songProg * (slotW - mdW * 0.09);
          const laserY = discCy;

          // Metallic laser carriage
          ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
          ctx.fillRect(laserProgressX - 4, laserY - 3, 8, 6);
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(laserProgressX - 4, laserY - 3, 8, 6);

          // Glowing laser lens (pulses dynamically when active)
          ctx.beginPath();
          ctx.arc(laserProgressX, laserY, 1.4, 0, Math.PI * 2);
          ctx.fillStyle = isPlaying ? `rgba(239, 68, 68, ${0.45 + Math.sin(Date.now() * 0.06) * 0.45})` : '#4b5563';
          ctx.fill();

          // 5. Spinning Optical Magneto-Disc (Gold/Platinum Prismatic Coating)
          ctx.save();
          ctx.beginPath();
          ctx.arc(discCx, discCy, discRad, 0, Math.PI * 2);
          ctx.clip(); // Ensure spinning flares stay contained in boundary
          
          const discOuterGrad = ctx.createRadialGradient(discCx, discCy, discRad * 0.18, discCx, discCy, discRad);
          if (visTheme === 'mono' || visTheme === 'cyberpunk') {
            // Platinum / Silver CD substrate
            discOuterGrad.addColorStop(0, '#fafafa');
            discOuterGrad.addColorStop(0.22, '#cbd5e1');
            discOuterGrad.addColorStop(0.5, '#e2e8f0');
            discOuterGrad.addColorStop(0.8, '#475569');
            discOuterGrad.addColorStop(1, '#1e293b');
          } else {
            // Gold substrate
            discOuterGrad.addColorStop(0, '#fef08a');
            discOuterGrad.addColorStop(0.28, '#ca8a04');
            discOuterGrad.addColorStop(0.58, '#fde047');
            discOuterGrad.addColorStop(0.82, '#854d0e');
            discOuterGrad.addColorStop(1, '#451a03');
          }
          ctx.fillStyle = discOuterGrad;
          ctx.fill();

          // Prismatic flare reflections rotating inside cartridge
          ctx.globalCompositeOperation = 'screen';
          ctx.translate(discCx, discCy);
          ctx.rotate(rotAngle);
          for (let k = 0; k < 6; k++) {
            const hAngle = k * (Math.PI / 3);
            const wedge = ctx.createRadialGradient(0, 0, discRad * 0.2, 0, 0, discRad);
            const hue1 = (k * 60 + rotAngle * 52) % 360;
            const hue2 = (hue1 + 140) % 360;
            wedge.addColorStop(0, 'rgba(0,0,0,0)');
            wedge.addColorStop(0.45, `hsla(${hue1}, 95%, 68%, ${0.28 + treble * 0.22})`);
            wedge.addColorStop(0.82, `hsla(${hue2}, 95%, 58%, ${0.18 + bass * 0.20})`);
            wedge.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.fillStyle = wedge;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, discRad, hAngle - 0.24, hAngle + 0.24);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();

          // High-precision magneto-optical micro grooves
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 0.5;
          for (let dg = 0.08; dg < 0.95; dg += 0.06) {
            ctx.beginPath();
            ctx.arc(discCx, discCy, discRad * dg, 0, Math.PI * 2);
            ctx.stroke();
          }

          // 6. Spindle Aluminium Hub Clamping Cap
          ctx.beginPath();
          ctx.arc(discCx, discCy, discRad * 0.24, 0, Math.PI * 2);
          const spindleGrad = ctx.createRadialGradient(discCx, discCy, discRad * 0.06, discCx, discCy, discRad * 0.24);
          spindleGrad.addColorStop(0, '#f1f5f9');
          spindleGrad.addColorStop(0.42, '#94a3b8');
          spindleGrad.addColorStop(0.72, '#334155');
          spindleGrad.addColorStop(1, '#0f172a');
          ctx.fillStyle = spindleGrad;
          ctx.fill();
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 0.8;
          ctx.stroke();

          // Triangular mechanical driving detents
          ctx.save();
          ctx.translate(discCx, discCy);
          ctx.rotate(rotAngle * 1.55);
          ctx.fillStyle = '#090a0f';
          for (let n = 0; n < 3; n++) {
            const angleVal = (n / 3) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(Math.cos(angleVal) * (discRad * 0.12), Math.sin(angleVal) * (discRad * 0.12), 1.6, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          // 7. Sliding Metal Protector Shutter Sleeve (Slide open when active)
          const shutW = mdW * 0.30;
          const shutH = mdH * 0.84;
          // Shutter lies from center of disc to right side, slides right during play
          const slideShift = isPlaying ? (mdW * 0.12 + bass * 4) : 0;
          const shutX = mdx + Math.min(mdW * 0.64, mdW * 0.52 + slideShift);
          const shutY = mdy + mdH * 0.08;

          // Aluminium brushed texture on the shutter plate
          const shutGrad = ctx.createLinearGradient(shutX, shutY, shutX + shutW, shutY);
          shutGrad.addColorStop(0, '#64748b');
          shutGrad.addColorStop(0.25, '#94a3b8');
          shutGrad.addColorStop(0.5, '#cbd5e1');
          shutGrad.addColorStop(0.75, '#475569');
          shutGrad.addColorStop(1, '#1e293b');
          ctx.fillStyle = shutGrad;
          ctx.fillRect(shutX, shutY, shutW, shutH);

          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 0.6;
          ctx.strokeRect(shutX, shutY, shutW, shutH);

          // Horizontal grooved grip bands on the aluminium shutter slider
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
          ctx.lineWidth = 0.85;
          for (let hg = 4; hg < shutH - 5; hg += 5) {
            ctx.beginPath();
            ctx.moveTo(shutX + 2, shutY + hg);
            ctx.lineTo(shutX + 6, shutY + hg);
            ctx.stroke();
          }

          // Mechanical release guide arrow engraved into shell
          ctx.fillStyle = visTheme === 'amber' ? 'rgba(245, 158, 11, 0.65)' : 'rgba(34, 211, 238, 0.65)';
          ctx.beginPath();
          ctx.moveTo(shutX - 3, shutY + shutH / 2);
          ctx.lineTo(shutX - 7, shutY + shutH / 2 - 3);
          ctx.lineTo(shutX - 7, shutY + shutH / 2 + 3);
          ctx.closePath();
          ctx.fill();

          // Shutter high-precision branding typography
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 6.5px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Mini', shutX + shutW / 2 + 1, shutY + shutH * 0.22);
          ctx.fillText('Disc', shutX + shutW / 2 + 1, shutY + shutH * 0.32);
          ctx.font = 'bold 3.5px monospace';
          ctx.fillText('RECORDABLE', shutX + shutW / 2 + 1, shutY + shutH * 0.44);

          // 8. Dark Gloss Segment-LCD Display Screen (Fitted perfectly in LEFT Casing)
          const lcdW = mdW * 0.38;
          const lcdH = mdH * 0.24;
          const lcdX = mdx + mdW * 0.07;
          const lcdY = mdy + mdH * 0.14;

          ctx.fillStyle = '#06070a';
          ctx.fillRect(lcdX, lcdY, lcdW, lcdH);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
          ctx.lineWidth = 1;
          ctx.strokeRect(lcdX, lcdY, lcdW, lcdH);

          // Segment screen glass overlay gloss
          const lcdGlass = ctx.createLinearGradient(lcdX, lcdY, lcdX + lcdW, lcdY + lcdH);
          lcdGlass.addColorStop(0, 'rgba(255,255,255,0.065)');
          lcdGlass.addColorStop(0.48, 'rgba(0,0,0,0)');
          lcdGlass.addColorStop(0.52, 'rgba(0,0,0,0)');
          lcdGlass.addColorStop(1, 'rgba(255,255,255,0.012)');
          ctx.fillStyle = lcdGlass;
          ctx.fillRect(lcdX, lcdY, lcdW, lcdH);

          // Active LCD readout responding to track
          ctx.fillStyle = visTheme === 'amber' ? 'rgba(245, 158, 11, 0.95)' : visTheme === 'cyberpunk' ? 'rgba(236, 72, 153, 0.95)' : 'rgba(34, 211, 238, 0.95)';
          ctx.font = 'bold 5px monospace';
          ctx.textAlign = 'left';
          ctx.fillText('SPINAMP MD74', lcdX + 5, lcdY + 9);
          // Standard track details
          const curS = Math.floor(currentTimeRef.current);
          const mTemp = Math.floor(curS / 60);
          const sTemp = curS % 60;
          const timeString = `${mTemp}:${sTemp < 10 ? '0' : ''}${sTemp}`;
          ctx.font = '4.5px monospace';
          ctx.fillText(`ATRAC TR-01  [${timeString}]`, lcdX + 5, lcdY + 16);

          // Miniature active levels spectrum analysis bar charts inside LCD display
          const miniBarCount = 12;
          const miniBarW = (lcdW - 10) / miniBarCount;
          for (let mb = 0; mb < miniBarCount; mb++) {
            const mIdx = Math.floor((mb / miniBarCount) * (bufferLength * 0.35));
            const mVal = (dataArray[mIdx] || 0) / 255;
            const mHeight = mVal * (lcdH - 20);
            ctx.fillRect(lcdX + 5 + (mb * (miniBarW + 0.6)), lcdY + lcdH - 3 - mHeight, miniBarW, mHeight);
          }

          // Retro physical adhesive title label overlay (etched detailing)
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.lineWidth = 1;
          ctx.strokeRect(mdx + mdW * 0.07, mdy + mdH * 0.76, mdW * 0.38, mdH * 0.12);
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.font = '900 5.5px sans-serif';
          ctx.fillText('MD CHASSIS SYSTEM   ◀', mdx + mdW * 0.09, mdy + mdH * 0.83);

        } else if (targetMode === 'cassette') {
          analyser.getByteFrequencyData(dataArray);
          let bassSum = 0;
          let trebleSum = 0;
          for (let i = 0; i < 6; i++) bassSum += dataArray[i] || 0;
          const startTreb = Math.floor(bufferLength * 0.25);
          const endTreb = Math.floor(bufferLength * 0.55);
          for (let i = startTreb; i < endTreb; i++) {
            trebleSum += dataArray[i] || 0;
          }
          const bass = Math.min(1.0, (bassSum / (6 * 195)) * visSensitivity);
          const treble = Math.min(1.0, (trebleSum / ((endTreb - startTreb) * 92)) * visSensitivity);

          const cx = width / 2;
          const cy = height / 2;

          const casW = Math.min(width, height) * 0.98;
          const casH = casW * 0.62;
          const casX = cx - casW / 2;
          const casY = cy - casH / 2;

          // Physical differential sprockets angle speeds
          const lSprocketAngle = cassetteLeftAngleRef.current;
          const rSprocketAngle = cassetteRightAngleRef.current;

          // 1. Double Drop Shadow for realistic depth
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.fillRect(casX + 4, casY + 4, casW, casH);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
          ctx.fillRect(casX + 8, casY + 8, casW, casH);

          // 2. Translucent Sony walkman-style smoked graphite polycarbonate resin chassis
          const casGrad = ctx.createLinearGradient(casX, casY, casX + casW, casY + casH);
          if (visTheme === 'cyberpunk') {
            casGrad.addColorStop(0, '#1a102f');
            casGrad.addColorStop(0.5, '#0b0514');
            casGrad.addColorStop(1, '#2c1236');
          } else if (visTheme === 'amber') {
            casGrad.addColorStop(0, '#2d1c10');
            casGrad.addColorStop(0.5, '#170c04');
            casGrad.addColorStop(1, '#3a2108');
          } else if (visTheme === 'aqua') {
            casGrad.addColorStop(0, '#0a232d');
            casGrad.addColorStop(0.5, '#030f14');
            casGrad.addColorStop(1, '#113444');
          } else {
            casGrad.addColorStop(0, '#1d1e22');
            casGrad.addColorStop(0.5, '#0d0d0f');
            casGrad.addColorStop(1, '#26282e');
          }
          ctx.fillStyle = casGrad;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(casX, casY, casW, casH, 12);
          } else {
            ctx.rect(casX, casY, casW, casH);
          }
          ctx.fill();

          // Beveled acrylic rim reflection highlight
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.8;
          ctx.stroke();

          // Outer beveled inset line
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(casX + 3, casY + 3, casW - 6, casH - 6);

          // 3. Dynamic cassette model inspired by BASF-style "Base" screen presets
          let cassetteTitle = 'BASE CHROME II 90';
          let tapeTypeStr = 'POSITION [CHROME]   IEC II / TYPE II';
          let brandLabel = 'BASE';
          let accentColor = '#3b82f6';
          let stripeColor = '#dc2626';

          if (visTheme === 'cyberpunk') {
            cassetteTitle = 'BASE MASTER PRO';
            tapeTypeStr = 'BIAS [CHROME-UX]  IEC II / TYPE II - NR';
            brandLabel = 'BASE';
            accentColor = '#ec4899';
            stripeColor = '#8b5cf6';
          } else if (visTheme === 'amber') {
            cassetteTitle = 'BASE LH-M I 90';
            tapeTypeStr = 'POSITION [NORMAL]   IEC I / TYPE I';
            brandLabel = 'BASE';
            accentColor = '#f59e0b';
            stripeColor = '#ef4444';
          } else if (visTheme === 'aqua') {
            cassetteTitle = 'BASE CR-S II SUPER';
            tapeTypeStr = 'COBALT CERAMIC  IEC II / TYPE II - NR';
            brandLabel = 'BASE';
            accentColor = '#22d3ee';
            stripeColor = '#3b82f6';
          } else {
            cassetteTitle = 'BASE METAL IV 90';
            tapeTypeStr = 'METAL ALLOY / TYPE IV  [70μs EQ]';
            brandLabel = 'BASE';
            accentColor = '#a1a1aa';
            stripeColor = '#3f3f46';
          }

          // 4. Matte finish Walkman tape label card
          const labW = casW * 0.84;
          const labH = casH * 0.44;
          const labX = casX + (casW - labW) / 2;
          const labY = casY + casH * 0.10;

          // Vintage label card background
          ctx.fillStyle = '#eaebeb';
          ctx.fillRect(labX, labY, labW, labH);
          ctx.strokeStyle = '#71717a';
          ctx.lineWidth = 0.6;
          ctx.strokeRect(labX, labY, labW, labH);

          // Detailed retro stripes
          ctx.fillStyle = stripeColor;
          ctx.fillRect(labX, labY + 3, labW, 3.5);
          ctx.fillStyle = accentColor;
          ctx.fillRect(labX, labY + 6.5, labW, 7.5);

          // Silver matte trim at bottom under window
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(labX, labY + labH - 4.5, labW, 4.5);

          const leftReelX = labX + labW * 0.28;
          const rightReelX = labX + labW * 0.72;
          const reelY = labY + labH * 0.54;
          const reelHoleRad = casW * 0.102;

          // 5. High-fidelity glass window viewport showing interior mechanics
          const winW = labW * 0.52;
          const winH = labH * 0.62;
          const winX = labX + (labW - winW) / 2;
          const winY = labY + labH * 0.35;

          ctx.fillStyle = '#040507'; // dark interior bay cavity
          ctx.fillRect(winX, winY, winW, winH);
          ctx.strokeStyle = '#27272a';
          ctx.lineWidth = 1.35;
          ctx.strokeRect(winX, winY, winW, winH);

          // Window inner frame shadow
          ctx.strokeStyle = 'rgba(0,0,0,0.6)';
          ctx.lineWidth = 1.6;
          ctx.strokeRect(winX + 0.8, winY + 0.8, winW - 1.6, winH - 1.6);

          // 6. Dynamic cassette tape ribbon winding logic (Direct Sony Screensaver mimic)
          const songProg = durationRef.current > 0 ? (currentTimeRef.current / durationRef.current) : 0.46;
          const minWinding = reelHoleRad * 1.12;
          const maxWinding = reelHoleRad * 1.94;

          const leftTapeRad = Math.sqrt(minWinding * minWinding + (1 - songProg) * (maxWinding * maxWinding - minWinding * minWinding));
          const rightTapeRad = Math.sqrt(minWinding * minWinding + songProg * (maxWinding * maxWinding - minWinding * minWinding));

          // Physical guide rollers & copper pressure pad mechanism inside cassette shell
          // Felt and spring behind center window tape opening
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx - 18, casY + casH * 0.88);
          ctx.lineTo(cx + 18, casY + casH * 0.88);
          ctx.stroke();

          // Left/Right transparent acrylic guide rollers at bottom
          const rollerRad = 6.2;
          const lRollerX = casX + casW * 0.145;
          const rRollerX = casX + casW * 0.855;
          const rollersY = casY + casH * 0.81;

          const drawCapstanRoller = (cxt: number, cyt: number, isRightRoller: boolean) => {
            // Rotating roller guide wheel based on tape dynamics
            const rollAngle = isRightRoller ? rSprocketAngle * 1.3 : lSprocketAngle * 1.3;
            
            ctx.beginPath();
            ctx.arc(cxt, cyt, rollerRad, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fill();
            ctx.strokeStyle = '#4b5563';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Dual concentric rings
            ctx.beginPath();
            ctx.arc(cxt, cyt, rollerRad * 0.65, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.stroke();

            // Rotating micro pins to see it spin
            ctx.save();
            ctx.translate(cxt, cyt);
            ctx.rotate(rollAngle);
            ctx.fillStyle = '#94a3b8';
            for (let pin = 0; pin < 3; pin++) {
              ctx.rotate((Math.PI * 2) / 3);
              ctx.beginPath();
              ctx.arc(rollerRad * 0.4, 0, 0.8, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();

            // Metal pin axle
            ctx.beginPath();
            ctx.arc(cxt, cyt, 1.8, 0, Math.PI * 2);
            ctx.fillStyle = '#94a3b8';
            ctx.fill();
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          };
          drawCapstanRoller(lRollerX, rollersY, false);
          drawCapstanRoller(rRollerX, rollersY, true);

          // Left Tape Roll (textured chrome-dioxide/metal dark brown)
          ctx.save();
          ctx.beginPath();
          ctx.arc(leftReelX, reelY, leftTapeRad, 0, Math.PI * 2);
          
          const tapeColor1 = visTheme === 'amber' ? '#261715' : '#1b1211';
          const tapeColor2 = visTheme === 'amber' ? '#130a09' : '#0c0706';
          
          const leftTapeGrad = ctx.createRadialGradient(leftReelX, reelY, reelHoleRad * 1.05, leftReelX, reelY, leftTapeRad);
          leftTapeGrad.addColorStop(0, tapeColor1);
          leftTapeGrad.addColorStop(0.75, tapeColor2);
          leftTapeGrad.addColorStop(1, '#050303');
          ctx.fillStyle = leftTapeGrad;
          ctx.fill();

          // Ribbon winding spirals (subtle overlay lines)
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
          ctx.lineWidth = 0.4;
          for (let lp = 0.42; lp < 0.98; lp += 0.07) {
            ctx.beginPath();
            ctx.arc(leftReelX, reelY, leftTapeRad * lp, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();

          // Right Tape Roll
          ctx.save();
          ctx.beginPath();
          ctx.arc(rightReelX, reelY, rightTapeRad, 0, Math.PI * 2);
          const rightTapeGrad = ctx.createRadialGradient(rightReelX, reelY, reelHoleRad * 1.05, rightReelX, reelY, rightTapeRad);
          rightTapeGrad.addColorStop(0, tapeColor1);
          rightTapeGrad.addColorStop(0.75, tapeColor2);
          rightTapeGrad.addColorStop(1, '#050303');
          ctx.fillStyle = rightTapeGrad;
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
          ctx.lineWidth = 0.4;
          for (let rp = 0.42; rp < 0.98; rp += 0.07) {
            ctx.beginPath();
            ctx.arc(rightReelX, reelY, rightTapeRad * rp, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();

          // Transparent pink/clear leader tape segment (highly detailed)
          ctx.save();
          ctx.lineWidth = 1.3;
          if (songProg < 0.08) {
            ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)'; // red/pink transparent lead
            ctx.beginPath();
            ctx.arc(leftReelX, reelY, leftTapeRad + 0.6, -0.5, 0.6);
            ctx.stroke();
          } else if (songProg > 0.92) {
            ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
            ctx.beginPath();
            ctx.arc(rightReelX, reelY, rightTapeRad + 0.6, Math.PI - 0.6, Math.PI + 0.5);
            ctx.stroke();
          }
          ctx.restore();

          // Tension ribbon path (Wobbles with bass frequency)
          ctx.strokeStyle = '#18100e';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(lRollerX, rollersY);
          const midTapeY = (casY + casH * 0.84) + (isPlaying ? Math.sin(Date.now() * 0.14) * (bass * 2.2) : 0);
          ctx.bezierCurveTo(cx - 35, midTapeY, cx + 35, midTapeY, rRollerX, rollersY);
          ctx.stroke();

          // 7. High-contrast sprocket hub wheels (3-winged or 6-winged Walkman style)
          const drawRealisticSprocketGear = (rx2: number, rY2: number, rotSprocketAngle: number) => {
            // White ivory-plastic outer tooth lock ring
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.arc(rx2, rY2, reelHoleRad * 0.95, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // Core gear socket (transparent/dark)
            ctx.fillStyle = '#06070a';
            ctx.beginPath();
            ctx.arc(rx2, rY2, reelHoleRad * 0.76, 0, Math.PI * 2);
            ctx.fill();

            // Dynamic micro locking tabs (Crimson/Red)
            ctx.save();
            ctx.translate(rx2, rY2);
            ctx.rotate(rotSprocketAngle);
            ctx.fillStyle = stripeColor;
            for (let tooth = 0; tooth < 6; tooth++) {
              ctx.rotate(Math.PI / 3);
              ctx.fillRect(-1.6, -reelHoleRad * 0.82, 3.2, reelHoleRad * 0.28);
            }
            
            // Central silver metal axle tip
            ctx.fillStyle = '#cbd5e1';
            ctx.beginPath();
            ctx.arc(0, 0, reelHoleRad * 0.38, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // Star axle slot
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          };

          drawRealisticSprocketGear(leftReelX, reelY, lSprocketAngle);
          drawRealisticSprocketGear(rightReelX, reelY, rSprocketAngle);

          // Center Window transparent gradient reflections (specular light beam)
          const reflectionGrad = ctx.createLinearGradient(winX, winY, winX + winW, winY + winH);
          reflectionGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
          reflectionGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.12)');
          reflectionGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
          reflectionGrad.addColorStop(0.75, 'rgba(255, 255, 255, 0.03)');
          reflectionGrad.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
          ctx.fillStyle = reflectionGrad;
          ctx.fillRect(winX, winY, winW, winH);

          // Screen printed scale tick marks (tape gauge gauge lines)
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          // Vertically oriented central meter lines
          ctx.moveTo(cx, winY + 3);
          ctx.lineTo(cx, winY + winH - 3);
          
          // Left and right scale lines
          for (let tickOffset of [-35, -20, 20, 35]) {
            ctx.moveTo(cx + tickOffset, winY + winH * 0.35);
            ctx.lineTo(cx + tickOffset, winY + winH * 0.65);
          }
          ctx.stroke();

          // Tiny tick numbers printed on the window glass (retro style)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
          ctx.font = 'bold 3.8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('100', cx - 35, winY + winH * 0.3);
          ctx.fillText('50', cx - 20, winY + winH * 0.3);
          ctx.fillText('50', cx + 20, winY + winH * 0.3);
          ctx.fillText('100', cx + 35, winY + winH * 0.3);

          // 8. Retro Walkman typography & dynamic text fields
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 7px "Courier New", monospace, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(cassetteTitle, labX + 16, labY + 18);

          // IEC Formulation details
          ctx.fillStyle = '#475569';
          ctx.font = 'bold 4.5px sans-serif';
          ctx.fillText(tapeTypeStr, labX + 16, labY + 25);
          
          // Draw BASF-inspired "Base" logo with interlocking squares
          const logoX = labX + labW - 35;
          const logoY = labY + 13;
          const sqSize = 8;
          const cutSize = 3.6;
          const gapSize = 0.8;

          ctx.fillStyle = stripeColor;
          ctx.beginPath();
          ctx.moveTo(logoX, logoY); // Top-left of large square
          ctx.lineTo(logoX + sqSize, logoY); // Top-right
          ctx.lineTo(logoX + sqSize, logoY + sqSize - cutSize); // Upper cutout start
          ctx.lineTo(logoX + sqSize - cutSize, logoY + sqSize - cutSize); // Inner cutout top-left
          ctx.lineTo(logoX + sqSize - cutSize, logoY + sqSize); // Inner cutout bottom-left
          ctx.lineTo(logoX, logoY + sqSize); // Bottom-left of large square
          ctx.closePath();
          ctx.fill();

          // Small interlocking square in the cutout
          ctx.fillRect(
            logoX + sqSize - cutSize + gapSize,
            logoY + sqSize - cutSize + gapSize,
            cutSize - gapSize,
            cutSize - gapSize
          );

          // Wordmark "BASE" spelled next to the BASF squares
          ctx.font = '900 9px "JetBrains Mono", sans-serif';
          ctx.fillStyle = stripeColor;
          ctx.fillText(brandLabel, logoX + sqSize + 4, logoY + 7.5);

          // Handwriting track name or dynamic title mimics the NW-ZX507 player metadata
          ctx.save();
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.font = 'bold 6.5px "Courier New", Courier, monospace';
          ctx.fillText('SPINAMP STUDIO REEL', labX + 16, labY + labH - 8);
          ctx.restore();

          // Side dynamic design indicators
          ctx.fillStyle = stripeColor;
          ctx.fillRect(labX + 6, labY + 12, 5, 2);
          ctx.fillStyle = '#06070a';
          ctx.font = '900 7px sans-serif';
          ctx.fillText('A', labX + 6, labY + 24);

          // 9. Bottom trapezoidal head block overlay
          const botY = casY + casH * 0.86;
          ctx.fillStyle = '#141519';
          ctx.beginPath();
          ctx.moveTo(cx - casW * 0.26, botY);
          ctx.lineTo(cx + casW * 0.26, botY);
          ctx.lineTo(cx + casW * 0.18, casY + casH);
          ctx.lineTo(cx - casW * 0.18, casY + casH);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = '#272930';
          ctx.lineWidth = 1.25;
          ctx.stroke();

          // Capstan alignment driver holes
          ctx.fillStyle = '#040507';
          ctx.beginPath();
          ctx.arc(cx - casW * 0.165, casY + casH * 0.915, 2.5, 0, Math.PI * 2);
          ctx.arc(cx + casW * 0.165, casY + casH * 0.915, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Securing case screws details (Five detailed screws)
          const drawScrew = (sX: number, sY: number) => {
            ctx.beginPath();
            ctx.arc(sX, sY, 1.9, 0, Math.PI * 2);
            ctx.fillStyle = '#64748b';
            ctx.fill();
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 0.6;
            ctx.stroke();

            // Screw Slot line rotated slightly
            ctx.save();
            ctx.translate(sX, sY);
            ctx.rotate(0.65);
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 0.55;
            ctx.beginPath();
            ctx.moveTo(-1.3, 0);
            ctx.lineTo(1.3, 0);
            ctx.stroke();
            ctx.restore();
          };
          drawScrew(casX + 7, casY + 7);
          drawScrew(casX + casW - 7, casY + 7);
          drawScrew(casX + 7, casY + casH - 7);
          drawScrew(casX + casW - 7, casY + casH - 7);
          drawScrew(cx, casY + 11);

          // LED active spectrum analysis dynamic visualizer levels under cassette tape reels
          const ledBars = 16;
          const ledBarW = (casW * 0.36) / ledBars;
          const ledX = cx - (casW * 0.36) / 2;
          const ledY = casY + casH * 0.85;
          for (let lidx = 0; lidx < ledBars; lidx++) {
            const fIdx = Math.floor((lidx / ledBars) * (bufferLength * 0.5));
            const fNorm = (dataArray[fIdx] || 0) / 255;
            const barVal = fNorm * 8.5 * visSensitivity;

            ctx.fillStyle = visTheme === 'cyberpunk' ? 'rgba(236,72,153, 0.72)' : visTheme === 'amber' ? 'rgba(245, 158, 11, 0.8)' : 'rgba(34, 211, 238, 0.8)';
            ctx.fillRect(ledX + lidx * (ledBarW + 1.25), ledY - barVal, ledBarW, barVal);
          }
        } else if (targetMode === 'guitar-hero') {
          analyser.getByteFrequencyData(dataArray);
          drawGuitarHero(ctx, canvas, dataArray, visTheme, visSensitivity, isPlaying, {
            guitarHeroNotesRef,
            guitarHeroComboRef,
            guitarHeroMultiplierRef,
            guitarHeroLastSpawnTimeRef,
            guitarHeroParticlesRef,
            guitarHeroTargetPulseRef,
            guitarHeroRockMeterRef
          }, width, height);
        } else if (targetMode === 'artwork') {
          // Display the album cover artwork
          const cx = width / 2;
          const cy = height / 2;
          
          const track: Track | { title: string; artist: string; album: string; coverUrl?: string } = currentTrackRef.current || { title: 'Unknown Track', artist: 'Unknown Artist', album: 'Unknown Album' };

          // Try get an image from the imageCache
          let hasImage = false;
          let imgObj: HTMLImageElement | null = null;
          
          if (track.coverUrl) {
            let cached = imageCacheRef.current.get(track.coverUrl);
            if (!cached) {
              cached = new Image();
              cached.crossOrigin = 'anonymous';
              cached.src = track.coverUrl;
              imageCacheRef.current.set(track.coverUrl, cached);
              pruneImageCache(imageCacheRef.current, MAX_CACHED_IMAGES);
            }
            if (cached.complete && cached.naturalWidth > 0) {
              hasImage = true;
              imgObj = cached;
            }
          }

          analyser.getByteFrequencyData(dataArray);
          let rawEnergy = 0;
          for (let i = 0; i < 16; i++) {
            rawEnergy += dataArray[i] || 0;
          }
          const energy = Math.min(1.0, rawEnergy / (16 * 200));
          const scale = 1.0 + energy * 0.08 * visSensitivity;

          if (hasImage && imgObj) {
            ctx.save();
            ctx.globalAlpha = 0.25;
            if ('filter' in ctx) {
              ctx.filter = 'blur(20px)';
            }
            ctx.drawImage(imgObj, cx - width * 0.7, cy - height * 0.7, width * 1.4, height * 1.4);
            if ('filter' in ctx) {
              ctx.filter = 'none';
            }
            ctx.restore();

            ctx.save();
            const numPoints = 80;
            const innerRadius = Math.min(width, height) * 0.22 * scale;
            const outerRadius = innerRadius + 20 * energy * visSensitivity;
            
            ctx.strokeStyle = visTheme === 'cyberpunk' ? '#ec4899' : visTheme === 'amber' ? 'rgba(245, 158, 11, 0.6)' : visTheme === 'mono' ? 'rgba(255,255,255,0.4)' : '#00ff44';
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 8;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.beginPath();
            
            for (let i = 0; i <= numPoints; i++) {
              const angle = (i / numPoints) * Math.PI * 2 + (isPlaying ? Date.now() * 0.0005 : 0);
              const dataValue = dataArray[Math.floor((i / numPoints) * (bufferLength * 0.5))] || 0;
              const r = innerRadius + (dataValue / 255) * 12 * visSensitivity;
              const px = cx + Math.cos(angle) * r;
              const py = cy + Math.sin(angle) * r;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();

            const imgSize = Math.min(width, height) * 0.42 * scale;
            ctx.save();
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(0,0,0,0.85)';
            
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#1e1e24';
            
            const rX = cx - imgSize / 2;
            const rY = cy - imgSize / 2;
            const radius = 8;
            ctx.beginPath();
            ctx.moveTo(rX + radius, rY);
            ctx.lineTo(rX + imgSize - radius, rY);
            ctx.quadraticCurveTo(rX + imgSize, rY, rX + imgSize, rY + radius);
            ctx.lineTo(rX + imgSize, rY + imgSize - radius);
            ctx.quadraticCurveTo(rX + imgSize, rY + imgSize, rX + imgSize - radius, rY + imgSize);
            ctx.lineTo(rX + radius, rY + imgSize);
            ctx.quadraticCurveTo(rX, rY + imgSize, rX, rY + imgSize - radius);
            ctx.lineTo(rX, rY + radius);
            ctx.quadraticCurveTo(rX, rY, rX + radius, rY);
            ctx.closePath();
            ctx.save();
            ctx.clip();
            ctx.drawImage(imgObj, rX, rY, imgSize, imgSize);
            ctx.restore();
            ctx.stroke();
            ctx.restore();
          } else {
            ctx.save();
            
            let hash = 0;
            const titleStr = track.title || 'Synth Groove';
            for (let i = 0; i < titleStr.length; i++) {
              hash = titleStr.charCodeAt(i) + ((hash << 5) - hash);
            }
            const baseHue = Math.abs(hash % 360);
            
            const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, Math.max(width, height) * 0.6);
            grad.addColorStop(0, `hsla(${baseHue}, 80%, 20%, 0.35)`);
            grad.addColorStop(1, `hsla(${(baseHue + 120) % 360}, 90%, 2%, 0.95)`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);
            
            ctx.save();
            const ringCount = 60;
            ctx.strokeStyle = `hsla(${baseHue}, 90%, 60%, 0.65)`;
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            for (let k = 0; k < ringCount; k++) {
              const currentAngle = (k / ringCount) * Math.PI * 2 + (isPlaying ? Date.now() * 0.0003 : 0);
              const dataPoint = dataArray[Math.floor((k / ringCount) * (bufferLength * 0.4))] || 0;
              const dynRad = Math.min(width, height) * 0.28 + (dataPoint / 255) * 15 * visSensitivity;
              const rx = cx + Math.cos(currentAngle) * dynRad;
              const ry = cy + Math.sin(currentAngle) * dynRad;
              if (k === 0) ctx.moveTo(rx, ry);
              else ctx.lineTo(rx, ry);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();

            const vinylSize = Math.min(width, height) * 0.44 * scale;
            ctx.save();
            ctx.fillStyle = '#0f0f12';
            ctx.beginPath();
            ctx.arc(cx, cy, vinylSize, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 0.5;
            for (let rG = vinylSize - 8; rG > 15; rG -= 6) {
              ctx.beginPath();
              ctx.arc(cx, cy, rG, 0, Math.PI * 2);
              ctx.stroke();
            }
            
            const rotSpeed = isPlaying ? (Date.now() * 0.0007) % (Math.PI * 2) : 0;
            ctx.fillStyle = 'rgba(255,255,255,0.035)';
            
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, vinylSize, rotSpeed, rotSpeed + 0.3);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, vinylSize, rotSpeed + Math.PI, rotSpeed + Math.PI + 0.3);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, vinylSize, rotSpeed + Math.PI * 0.5, rotSpeed + Math.PI * 0.5 + 0.15);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, vinylSize, rotSpeed + Math.PI * 1.5, rotSpeed + Math.PI * 1.5 + 0.15);
            ctx.closePath();
            ctx.fill();

            const labelSize = vinylSize * 0.42;
            const stickerGrad = ctx.createLinearGradient(cx - labelSize, cy - labelSize, cx + labelSize, cy + labelSize);
            stickerGrad.addColorStop(0, `hsla(${baseHue}, 80%, 55%, 0.9)`);
            stickerGrad.addColorStop(0.5, `hsla(${(baseHue + 40) % 360}, 85%, 60%, 0.9)`);
            stickerGrad.addColorStop(1, `hsla(${(baseHue + 180) % 360}, 90%, 45%, 0.9)`);
            ctx.fillStyle = stickerGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, labelSize, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy, labelSize * 0.85, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#08080a';
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.0;
            ctx.stroke();

            ctx.restore();
            ctx.restore();
          }

          const isFullS = width > 280;
          const padding = isFullS ? 14 : 6;
          ctx.save();
          
          if (height > 55) {
            const cardH = isFullS ? 30 : 16;
            const cardY = height - cardH - padding;
            const cardW = width - padding * 2;
            const cardX = padding;
            const cardRadius = 6;
            
            ctx.fillStyle = 'rgba(10, 10, 14, 0.72)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;
            
            ctx.beginPath();
            ctx.moveTo(cardX + cardRadius, cardY);
            ctx.lineTo(cardX + cardW - cardRadius, cardY);
            ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + cardRadius);
            ctx.lineTo(cardX + cardW, cardY + cardH - cardRadius);
            ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - cardRadius, cardY + cardH);
            ctx.lineTo(cardX + cardRadius, cardY + cardH);
            ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - cardRadius);
            ctx.lineTo(cardX, cardY + cardRadius);
            ctx.quadraticCurveTo(cardX, cardY, cardX + cardRadius, cardY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            
            if (isFullS) {
              ctx.font = 'bold 9px "Inter", sans-serif';
              ctx.fillText(track.title.toUpperCase(), cx, cardY + 11);
              ctx.font = '500 7px "Space Grotesk", sans-serif';
              ctx.fillStyle = visTheme === 'cyberpunk' ? '#f472b6' : visTheme === 'amber' ? '#f59e0b' : visTheme === 'mono' ? '#cccccc' : '#34d399';
              ctx.fillText(`${track.artist.toUpperCase()}  •  ${(track.album || 'SPINAMP').toUpperCase()}`, cx, cardY + 22);
            } else {
              ctx.font = 'bold 5.5px "Inter", sans-serif';
              ctx.fillText(track.title, cx, cardY + 6.5);
              ctx.font = '500 4px "Space Grotesk", sans-serif';
              ctx.fillStyle = visTheme === 'cyberpunk' ? '#f472b6' : visTheme === 'amber' ? '#f59e0b' : visTheme === 'mono' ? '#999999' : '#10b981';
              ctx.fillText(`${track.artist}`, cx, cardY + 12.5);
            }
          }
          ctx.restore();
        } else if (targetMode === 'vegas-strip') {
          analyser.getByteFrequencyData(dataArray);
          drawVegasStrip(ctx, canvas, dataArray, visTheme, visSensitivity, isPlaying, {
            vegasLastBassTriggerTimeRef,
            vegasReelSpinningRef,
            vegasReelSpeedRef,
            vegasJackpotFlashRef,
            vegasJackpotTextRef,
            vegasReelOffsetsRef,
            vegasReelSymbolsRef,
            vegasCoinsRef,
            vegasReelTargetOffsetsRef
          }, width, height, beatPulseRef.current);
        } else if (targetMode === 'skytree') {
          // --- TOKYO SKYTREE NEON PEAK TOWER ---
          analyser.getByteFrequencyData(dataArray);

          // Audio analysis
          let bassSum = 0;
          for (let i = 0; i < 6; i++) bassSum += dataArray[i] || 0;
          const bass = (bassSum / 6) / 255; // 0.0 to 1.0

          let midSum = 0;
          for (let i = 6; i < 20; i++) midSum += dataArray[i] || 0;
          const mid = (midSum / 14) / 255;

          let trebleSum = 0;
          for (let i = 20; i < 40; i++) trebleSum += dataArray[i] || 0;
          const treble = (trebleSum / 20) / 255;

          const volume = (bass + mid + treble) / 3;
          const reactiveSensitivity = visSensitivity;

          // Horizon line
          const horizonY = height * 0.85;
          const cx = width / 2;

          // 1. Draw Tokyo Midnight Sky Gradient
          const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
          skyGrad.addColorStop(0, '#04040c');
          skyGrad.addColorStop(0.5, '#0c071a');
          skyGrad.addColorStop(1, '#1c0f24');
          ctx.fillStyle = skyGrad;
          ctx.fillRect(0, 0, width, height);

          // Draw a soft glowing red/pink Tokyo Neon Horizon glow
          const horizonGlow = ctx.createRadialGradient(cx, horizonY, 10, cx, horizonY, width * 0.7);
          horizonGlow.addColorStop(0, 'rgba(236, 72, 153, 0.15)'); // pink
          horizonGlow.addColorStop(0.5, 'rgba(124, 58, 237, 0.05)'); // purple
          horizonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = horizonGlow;
          ctx.fillRect(0, 0, width, height);

          // 2. Beautiful background Mount Fuji Silhouette
          ctx.save();
          ctx.fillStyle = '#0a0914';
          ctx.strokeStyle = 'rgba(236, 72, 153, 0.2)';
          ctx.lineWidth = 1;
          ctx.shadowBlur = 4;
          ctx.shadowColor = 'rgba(236, 72, 153, 0.3)';
          
          const fujiBaseW = width * 0.45;
          const fujiH = height * 0.25;
          const fujiX = cx - width * 0.22; // Offset slightly to left/back
          
          ctx.beginPath();
          ctx.moveTo(fujiX - fujiBaseW / 2, horizonY);
          // Curved sweep up to the crater top of Mount Fuji
          ctx.quadraticCurveTo(fujiX - fujiBaseW * 0.15, horizonY - fujiH * 0.7, fujiX - 12, horizonY - fujiH);
          ctx.lineTo(fujiX + 12, horizonY - fujiH);
          ctx.quadraticCurveTo(fujiX + fujiBaseW * 0.15, horizonY - fujiH * 0.7, fujiX + fujiBaseW / 2, horizonY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Snow-cap on Mount Fuji
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.beginPath();
          ctx.moveTo(fujiX - 18, horizonY - fujiH * 0.75);
          ctx.lineTo(fujiX - 12, horizonY - fujiH);
          ctx.lineTo(fujiX + 12, horizonY - fujiH);
          ctx.lineTo(fujiX + 18, horizonY - fujiH * 0.75);
          ctx.quadraticCurveTo(fujiX, horizonY - fujiH * 0.65, fujiX - 18, horizonY - fujiH * 0.75);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          // 3. Audio Reactive Tokyo Neon Skyscrapers / Buildings
          ctx.save();
          const numSkyscrapers = 14;
          const bW = Math.max(12, width / (numSkyscrapers + 4));
          
          for (let i = 0; i < numSkyscrapers; i++) {
            // Distribute frequency bands to skyscrapers
            const bIndex = Math.floor((i / numSkyscrapers) * 64);
            const freqVal = dataArray[bIndex] || 0;
            const reactHeight = (freqVal / 255) * (height * 0.32) * reactiveSensitivity;
            
            // Static default heights so neon skyline stays structural
            const defaultHeight = (Math.sin(i * 1.7) * 0.5 + 0.5) * (height * 0.12) + (height * 0.08);
            const totalH = Math.max(15, defaultHeight + reactHeight);

            // Compute x position
            const bx = (i / numSkyscrapers) * (width - bW * 2) + bW * 0.5;

            // Don't draw right over Mount Fuji's direct peak center or Skytree's core platform
            if (Math.abs(bx - cx) < 20) continue; 

            // Building theme gradient
            const bGrad = ctx.createLinearGradient(bx, horizonY, bx, horizonY - totalH);
            if (i % 3 === 0) {
              bGrad.addColorStop(0, '#090514');
              bGrad.addColorStop(1, '#06b6d4'); // Cyan Cyberpunk
              ctx.shadowColor = '#06b6d4';
            } else if (i % 3 === 2) {
              bGrad.addColorStop(0, '#090514');
              bGrad.addColorStop(1, '#c084fc'); // Mauve Purple
              ctx.shadowColor = '#c084fc';
            } else {
              bGrad.addColorStop(0, '#090514');
              bGrad.addColorStop(1, '#ec4899'); // Neon Pink
              ctx.shadowColor = '#ec4899';
            }

            ctx.save();
            ctx.fillStyle = bGrad;
            // Draw skyscraper outline with subtle glowing peak
            ctx.shadowBlur = Math.min(6, volume * 10);
            ctx.fillRect(bx, horizonY - totalH, bW - 2, totalH);

            // Draw micro window grids
            ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
            const cols = Math.floor((bW - 4) / 3);
            const rows = Math.floor((totalH - 8) / 4);
            // Limit rows/cols for performance
            const safeCols = Math.min(4, cols);
            const safeRows = Math.min(10, rows);

            for (let r = 0; r < safeRows; r++) {
              for (let c = 0; c < safeCols; c++) {
                // Randomly turn windows on or off for realism
                const winActive = (Math.sin(i * 3 + r * 5 + c * 2) + Math.cos(r - c)) > 0.15;
                if (winActive && Math.random() > 0.05) {
                  ctx.fillStyle = (i % 2 === 0) ? 'rgba(254, 240, 138, 0.65)' : 'rgba(14, 165, 233, 0.5)';
                  ctx.fillRect(bx + 2 + c * 3, horizonY - totalH + 4 + r * 4, 1.5, 2);
                }
              }
            }

            // Blinking skyscraper red hazard warning lights on high rooftops
            if (Math.floor(now / 400) % 2 === 0) {
              ctx.fillStyle = '#ef4444';
              ctx.shadowColor = '#ef4444';
              ctx.shadowBlur = 5;
              ctx.beginPath();
              ctx.arc(bx + (bW - 2) / 2, horizonY - totalH, 1.2, 0, Math.PI * 2);
              ctx.fill();
            }

            ctx.restore();
          }
          ctx.restore();

          // 4. TOKYO SKYTREE TOWER STRUCTURE (Elegant Centerpiece)
          ctx.save();
          const towerBaseW = Math.max(14, width * 0.06);
          const baseHeight = horizonY;
          const towerTopY = height * 0.15 + (1.0 - treble * 0.4) * 18; // tip reacts slightly to treble peaks!
          const skytreeH = baseHeight - towerTopY;

          // Draw the lattice tower base structure
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#06b6d4';
          ctx.strokeStyle = '#06b6d4'; // teal cyan core skeletal truss
          ctx.lineWidth = 1.2;

          // Draw vertical support pillars curving elegantly inwards as they rise
          ctx.beginPath();
          // Outer left pillar
          ctx.moveTo(cx - towerBaseW, baseHeight);
          ctx.quadraticCurveTo(cx - towerBaseW * 0.35, baseHeight - skytreeH * 0.4, cx - 1.5, towerTopY);
          // Outer right pillar
          ctx.moveTo(cx + towerBaseW, baseHeight);
          ctx.quadraticCurveTo(cx + towerBaseW * 0.35, baseHeight - skytreeH * 0.4, cx + 1.5, towerTopY);
          ctx.stroke();

          // Central truss spine neon core (glowing pink)
          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ec4899';
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx, baseHeight);
          ctx.lineTo(cx, towerTopY + 8);
          ctx.stroke();
          ctx.restore();

          // Horizontal truss ring layers
          const numRings = 9;
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.65)';
          ctx.lineWidth = 0.8;
          for (let k = 1; k < numRings; k++) {
            const ratio = k / numRings;
            const ry = baseHeight - skytreeH * ratio;
            // Width of tower at this height ratio using the curve approximation
            const curW = towerBaseW * Math.pow(1.0 - ratio, 1.5);
            
            // Draw horizontal cross brace ring
            ctx.beginPath();
            ctx.moveTo(cx - curW, ry);
            ctx.lineTo(cx + curW, ry);
            ctx.stroke();

            // Diagonal truss beams
            if (k > 1) {
              const prevRatio = (k - 1) / numRings;
              const prevY = baseHeight - skytreeH * prevRatio;
              const prevW = towerBaseW * Math.pow(1.0 - prevRatio, 1.5);

              ctx.beginPath();
              ctx.moveTo(cx - prevW, prevY);
              ctx.lineTo(cx + curW, ry);
              ctx.moveTo(cx + prevW, prevY);
              ctx.lineTo(cx - curW, ry);
              ctx.stroke();
            }
          }

          // Draw Primary Tembo Observation Deck at 350m (approx 35% up)
          ctx.save();
          const d1Ratio = 0.38;
          const d1Y = baseHeight - skytreeH * d1Ratio;
          const d1W = towerBaseW * Math.pow(1.0 - d1Ratio, 1.2) * 1.5;
          const d1H = 5;

          // Deck gradient
          const deckGrad = ctx.createLinearGradient(cx - d1W, d1Y, cx + d1W, d1Y);
          deckGrad.addColorStop(0, '#030712');
          deckGrad.addColorStop(0.3, '#3b82f6'); // neon blue glass reflection
          deckGrad.addColorStop(0.5, '#ffffff'); // high sheen
          deckGrad.addColorStop(0.7, '#3b82f6');
          deckGrad.addColorStop(1, '#030712');

          ctx.fillStyle = deckGrad;
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 1;
          ctx.shadowColor = '#22d3ee';
          ctx.shadowBlur = 6;
          
          // Draw capsule shape of Tembo Deck
          ctx.beginPath();
          ctx.ellipse(cx, d1Y, d1W, d1H, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Micro observation windows inside deck
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(cx - d1W * 0.7, d1Y - 1, d1W * 1.4, 1.5);
          ctx.restore();

          // Draw Secondary Tembo Galleria Observation Deck at 450m (approx 65% up)
          ctx.save();
          const d2Ratio = 0.65;
          const d2Y = baseHeight - skytreeH * d2Ratio;
          const d2W = towerBaseW * Math.pow(1.0 - d2Ratio, 1.2) * 1.6;
          const d2H = 4;

          const deckGrad2 = ctx.createLinearGradient(cx - d2W, d2Y, cx + d2W, d2Y);
          deckGrad2.addColorStop(0, '#030712');
          deckGrad2.addColorStop(0.5, '#ec4899'); // neon purple/pink glass reflection
          deckGrad2.addColorStop(1, '#030712');

          ctx.fillStyle = deckGrad2;
          ctx.strokeStyle = '#f472b6';
          ctx.shadowColor = '#f472b6';
          ctx.shadowBlur = 5;
          ctx.lineWidth = 0.8;

          ctx.beginPath();
          ctx.ellipse(cx, d2Y, d2W, d2H, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          // Spire Tip antenna
          ctx.save();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.moveTo(cx, towerTopY);
          ctx.lineTo(cx, towerTopY - 14);
          ctx.stroke();
          ctx.restore();

          // 5. Epic Laser Searchlight Beams shooting from Spire Tip
          ctx.save();
          const beamTopX = cx;
          const beamTopY = towerTopY - 14;

          // Searchlight swept angles
          const pulseSpeed = now * 0.0016;
          const baseSweepAngle = Math.sin(pulseSpeed) * 0.5; // Left/Right sweep
          const reactiveSpread = mid * 0.35 + 0.1; // widen beam split on mid peaks!

          // We can draw two dual-rotating laser beam beams
          const drawLaserBeam = (angle: number, color: string, glow: string) => {
            ctx.save();
            ctx.shadowBlur = 12 + treble * 10;
            ctx.shadowColor = glow;
            
            const beamLength = height * 0.6;
            const targetX = beamTopX + Math.sin(angle) * beamLength;
            const targetY = beamTopY - Math.cos(angle) * beamLength;

            const beamGrad = ctx.createLinearGradient(beamTopX, beamTopY, targetX, targetY);
            beamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            beamGrad.addColorStop(0.2, color);
            beamGrad.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.strokeStyle = beamGrad;
            ctx.lineWidth = 2 + mid * 7; // Thicker on heavy mids/snares!
            ctx.beginPath();
            ctx.moveTo(beamTopX, beamTopY);
            ctx.lineTo(targetX, targetY);
            ctx.stroke();
            ctx.restore();
          };

          // Draw Cyan Laser
          drawLaserBeam(baseSweepAngle - reactiveSpread, 'rgba(34, 211, 238, 0.7)', '#22d3ee');
          // Draw Pink Laser
          drawLaserBeam(baseSweepAngle + reactiveSpread, 'rgba(244, 114, 182, 0.7)', '#f472b6');
          ctx.restore();

          // 6. Draw Falling/Floating Sakura Cherry Blossom Petals
          ctx.save();
          const petals = skytreeSakuraRef.current;

          // Spawn new sakura petal
          if (petals.length < 35 && Math.random() < 0.12) {
            petals.push({
              x: Math.random() * width,
              y: -10,
              vx: (Math.random() * 0.8 + 0.3) * (1.0 + mid * 1.5), // blows faster on mid energy
              vy: Math.random() * 0.6 + 0.5,
              size: Math.random() * 2.5 + 2,
              alpha: Math.random() * 0.5 + 0.4,
              angle: Math.random() * Math.PI,
              speed: 0.01 + Math.random() * 0.02,
              rotSpeed: (Math.random() - 0.5) * 0.05
            });
          }

          // Draw and drift petals
          for (let s = petals.length - 1; s >= 0; s--) {
            const p = petals[s]!;
            
            // Drift motion physics
            p.x += p.vx + Math.sin(now * 0.001 + p.angle) * 0.15;
            p.y += p.vy;
            p.angle += p.rotSpeed;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = `rgba(244, 180, 215, ${p.alpha})`; // Pink blossom
            ctx.shadowBlur = 3;
            ctx.shadowColor = '#f472b6';

            // Draw cute heart or double curved teardrop cherry petal
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(-p.size * 1.2, -p.size * 1.5, -p.size * 2, p.size * 0.5, 0, p.size * 1.5);
            ctx.bezierCurveTo(p.size * 2, p.size * 0.5, p.size * 1.2, -p.size * 1.5, 0, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Recycler
            if (p.y > height + 10 || p.x > width + 10 || p.x < -10) {
              petals.splice(s, 1);
            }
          }
          ctx.restore();

          // 7. Ground horizon aesthetic cyberpunk grid outline
          ctx.save();
          ctx.fillStyle = '#050308';
          ctx.fillRect(0, horizonY, width, height - horizonY);

          ctx.strokeStyle = 'rgba(217, 70, 239, 0.4)'; // glowing grid horizon line
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 5;
          ctx.shadowColor = '#ec4899';
          ctx.beginPath();
          ctx.moveTo(0, horizonY);
          ctx.lineTo(width, horizonY);
          ctx.stroke();
          ctx.restore();
        } else if (targetMode === 'lava-lamp') {
          // --- COZY FLUID-DYNAMIC AMBIENT LAVA LAMP ---
          analyser.getByteFrequencyData(dataArray);

          // Audio analysis
          let bassSum = 0;
          for (let i = 0; i < 8; i++) bassSum += dataArray[i] || 0;
          const bass = (bassSum / 8) / 255;

          let trebleSum = 0;
          for (let i = 30; i < 70; i++) trebleSum += dataArray[i] || 0;
          const treble = (trebleSum / 40) / 255;

          const reactiveSensitivity = visSensitivity;
          const bassAmp = Math.pow(bass * reactiveSensitivity, 1.3);

          const time = performance.now();

          // 1. Cozy Retro Soft Sunset Gradient Background
          const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
          bgGrad.addColorStop(0, '#100508');
          bgGrad.addColorStop(0.5, '#20081d');
          bgGrad.addColorStop(1, '#40112a');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, width, height);

          // Golden-orange ambient backlighting inside the lamp cavity
          const lampX = width / 2;
          const lampW = Math.min(width * 0.45, 220);
          const lampH = height * 0.82;
          const lampY = (height - lampH) / 2;

          const innerGlow = ctx.createRadialGradient(lampX, lampY + lampH * 0.6, 10, lampX, lampY + lampH * 0.6, lampW * 1.5);
          innerGlow.addColorStop(0, 'rgba(244, 63, 94, 0.28)');
          innerGlow.addColorStop(0.5, 'rgba(234, 88, 12, 0.12)');
          innerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = innerGlow;
          ctx.fillRect(0, 0, width, height);

          // 2. Initialize Blobs with Thermodynamic State if empty
          if (!lavaLampBlobsRef.current || lavaLampBlobsRef.current.length === 0 || !('angle' in lavaLampBlobsRef.current[0])) {
            const initialBlobs: any[] = [];
            // We want 12 highly dynamic blobs swirling inside the vortex
            for (let b = 0; b < 12; b++) {
              const yVal = lampY + 30 + Math.random() * (lampH - 60);
              const angleVal = Math.random() * Math.PI * 2;
              const temperatureVal = 0.2 + Math.random() * 0.7; // random state
              const phaseVal = Math.random() > 0.5 ? 'rising' : 'falling';
              
              // Rising ones orbit closer on updraft; falling ones descend on outer sheath.
              const targetFactor = phaseVal === 'rising' ? (0.15 + Math.random() * 0.25) : (0.55 + Math.random() * 0.35);

              initialBlobs.push({
                y: yVal,
                vy: phaseVal === 'rising' ? -0.4 : 0.4,
                angle: angleVal,
                orbitRadiusFactor: targetFactor,
                targetOrbitRadiusFactor: targetFactor,
                color: b % 2 === 0 ? 'rgb(244, 63, 94)' : 'rgb(249, 115, 22)',
                temperature: temperatureVal,
                phase: phaseVal,
                radius: 12 + Math.random() * 16,
                baseRadius: 12 + Math.random() * 16,
                isStatic: false
              });
            }
            lavaLampBlobsRef.current = initialBlobs;
          }

          // 2.5 Initialize convective micro-particles if empty
          if (!lavaLampParticlesRef.current || lavaLampParticlesRef.current.length === 0 || !('angle' in lavaLampParticlesRef.current[0])) {
            const initialParticles = [];
            // 70 fine micro particles to give a highly detailed, swirling debris field look! 
            for (let i = 0; i < 70; i++) {
              initialParticles.push({
                y: lampY + Math.random() * lampH,
                angle: Math.random() * Math.PI * 2,
                orbitRadiusFactor: 0.1 + Math.random() * 0.9,
                speedY: -0.2 - Math.random() * 0.5, // upward or downward
                radius: 0.8 + Math.random() * 1.8,
                alpha: 0.25 + Math.random() * 0.45,
                color: Math.random() > 0.5 ? 'rgba(251, 146, 60, ' : 'rgba(244, 63, 94, '
              });
            }
            lavaLampParticlesRef.current = initialParticles;
          }

          // 3. Update Particles
          const particles = lavaLampParticlesRef.current;
          particles.forEach(p => {
            // Spin speed is conserve-angular-momentum: faster near the center
            const angularVelocity = (0.015 + 0.026 / (0.12 + p.orbitRadiusFactor)) * (1.1 + bassAmp * 1.6);
            p.angle += angularVelocity;

            // Simple micro turbulence
            p.orbitRadiusFactor += (Math.random() - 0.5) * 0.008 * (1.0 + treble * 0.8);
            p.orbitRadiusFactor = Math.max(0.04, Math.min(0.96, p.orbitRadiusFactor));

            // Strong vertical updrafts / downdrafts in vortex
            // Inner core is rising, outer sheath is sinking
            let targetSpeedY = 0;
            if (p.orbitRadiusFactor < 0.42) {
              // Updraft
              targetSpeedY = -0.5 - (0.42 - p.orbitRadiusFactor) * 1.5 - bassAmp * 1.8;
            } else {
              // Downdraft
              targetSpeedY = 0.35 + (p.orbitRadiusFactor - 0.42) * 1.1 + treble * 0.9;
            }
            p.speedY = p.speedY * 0.95 + targetSpeedY * 0.05;
            p.y += p.speedY;

            // Boundary wrap-around
            if (p.y < lampY + 12) {
              p.y = lampY + lampH - 15 - Math.random() * 20;
              p.orbitRadiusFactor = 0.6 + Math.random() * 0.35; // start wrapping outer down
            } else if (p.y > lampY + lampH - 12) {
              p.y = lampY + 15 + Math.random() * 20;
              p.orbitRadiusFactor = 0.06 + Math.random() * 0.3; // start warping inner up
            }
          });

          // 4. Update Blobs
          const blobs = lavaLampBlobsRef.current;
          blobs.forEach(blob => {
            const distFromBottom = (lampY + lampH) - blob.y;
            const distFromTop = blob.y - lampY;

            // Thermodynamic transitions and phase updates
            if (blob.phase === 'bottom_pool') {
              blob.temperature = Math.min(1.0, blob.temperature + 0.006 * (1.0 + bassAmp));
              blob.vy = 0.1;
              blob.targetOrbitRadiusFactor = 0.15; // move into tight central column to shoot up

              if (blob.temperature > 0.78) {
                blob.phase = 'rising';
              }
            } else if (blob.phase === 'top_pool') {
              blob.temperature = Math.max(0.0, blob.temperature - 0.005);
              blob.vy = -0.1;
              blob.targetOrbitRadiusFactor = 0.85; // expand into outer sheath to sink

              if (blob.temperature < 0.28) {
                blob.phase = 'falling';
              }
            } else if (blob.phase === 'rising') {
              // Strong convection upward push
              blob.vy = -0.45 - (blob.temperature - 0.5) * 0.4 - bassAmp * 1.1;
              blob.temperature = Math.max(0.0, blob.temperature - 0.001);
              blob.targetOrbitRadiusFactor = 0.12 + Math.random() * 0.18; // spiral tightly in

              if (blob.y < lampY + blob.radius * 1.4) {
                blob.phase = 'top_pool';
              }
            } else if (blob.phase === 'falling') {
              // Cold wax descends on the outside
              blob.vy = 0.45 + (0.5 - blob.temperature) * 0.3 + treble * 0.8;
              blob.temperature = Math.min(1.0, blob.temperature + 0.0004);
              blob.targetOrbitRadiusFactor = 0.65 + Math.random() * 0.28; // spiral widely on sheath

              if (blob.y > lampY + lampH - blob.radius * 1.4) {
                blob.phase = 'bottom_pool';
              }
            }

            // Smoothly interpolate current radius factor towards target
            blob.orbitRadiusFactor += (blob.targetOrbitRadiusFactor - blob.orbitRadiusFactor) * 0.035;

            // Apply spin (faster spin near narrow center)
            const dAngle = (0.012 + 0.024 / (0.1 + blob.orbitRadiusFactor)) * (1.2 + bassAmp * 1.8);
            blob.angle += dAngle;

            // Apply vertical position displacement
            blob.y += blob.vy;

            // Maintain boundaries
            blob.y = Math.max(lampY + 12, Math.min(lampY + lampH - 12, blob.y));

            // Dynamic sizing based on temperature and sound waves
            const thermalFactor = 0.84 + blob.temperature * 0.28;
            blob.radius = blob.baseRadius * thermalFactor * (1.0 + bassAmp * 0.18);
          });

          // Mutual quicksilver orbital interaction (micro pull/push forces)
          for (let i = 0; i < blobs.length; i++) {
            for (let j = i + 1; j < blobs.length; j++) {
              const b1 = blobs[i];
              const b2 = blobs[j];
              const dy = b2.y - b1.y;
              if (Math.abs(dy) < 60) {
                // Approximate 3D positions
                const t1 = Math.max(0, Math.min(1.0, (b1.y - lampY) / lampH));
                const funnelR1 = (lampW / 2) * (1.0 - Math.pow(t1 - 0.5, 2) * 0.28) * 0.86;
                const dist1 = funnelR1 * b1.orbitRadiusFactor;
                const x1 = lampX + dist1 * Math.cos(b1.angle);
                const z1 = dist1 * Math.sin(b1.angle);

                const t2 = Math.max(0, Math.min(1.0, (b2.y - lampY) / lampH));
                const funnelR2 = (lampW / 2) * (1.0 - Math.pow(t2 - 0.5, 2) * 0.28) * 0.86;
                const dist2 = funnelR2 * b2.orbitRadiusFactor;
                const x2 = lampX + dist2 * Math.cos(b2.angle);
                const z2 = dist2 * Math.sin(b2.angle);

                const dx = x2 - x1;
                const dz = z2 - z1;
                const dist3D = Math.hypot(dx, dy, dz);
                const sumR = b1.radius + b2.radius;

                if (dist3D < sumR * 1.45 && dist3D > 1) {
                  const pull = (sumR * 1.45 - dist3D) / (sumR * 1.45);
                  // Orbital shift: mutual attraction drags their orbital angles slightly closer or forces separation
                  const angDiff = b2.angle - b1.angle;
                  const pullForce = 0.015 * Math.pow(pull, 2);
                  b1.angle += Math.sign(angDiff) * pullForce;
                  b2.angle -= Math.sign(angDiff) * pullForce;
                  
                  // Mutual Y push/pull
                  const yForce = (b2.y > b1.y ? 1 : -1) * 0.08 * pull;
                  b1.y += yForce;
                  b2.y -= yForce;
                }
              }
            }
          }

          // Draw Metallic heating filament plinth coil at bottom before 3D rendering elements
          ctx.save();
          ctx.strokeStyle = `rgba(251, 146, 60, ${0.42 + bassAmp * 0.48})`; 
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 12 + bassAmp * 16;
          ctx.lineWidth = 3;
          ctx.beginPath();
          const coilY = lampY + lampH - 18;
          ctx.moveTo(lampX - lampW * 0.42, coilY);
          for (let cxVal = lampX - lampW * 0.42; cxVal <= lampX + lampW * 0.42; cxVal += 6) {
            ctx.lineTo(cxVal, coilY + Math.sin(cxVal * 0.26 + time * 0.003) * 5);
          }
          ctx.stroke();
          ctx.restore();

          // Build combined sorted 3D rendering list: blobs, particles, metaball bridges!
          const renderQueue: any[] = [];

          // Adding Particles
          particles.forEach(p => {
            const t = Math.max(0, Math.min(1.0, (p.y - lampY) / lampH));
            const mt = 1.0 - t;
            // Bezier left-right boundary for precise glass width matching original shape
            const leftL = (mt * mt * mt * (lampX - lampW / 2 + 5)) +
                          (3 * mt * mt * t * (lampX - lampW * 0.35)) +
                          (3 * mt * t * t * (lampX - lampW * 0.32)) +
                          (t * t * t * (lampX - lampW / 2));
            const rightR = (mt * mt * mt * (lampX + lampW / 2 - 5)) +
                           (3 * mt * mt * t * (lampX + lampW * 0.35)) +
                           (3 * mt * t * t * (lampX + lampW * 0.32)) +
                           (t * t * t * (lampX + lampW / 2));
            const curHalfW = (rightR - leftL) / 2;
            const funnelR = curHalfW * 0.88;

            const dist = funnelR * p.orbitRadiusFactor;
            const px = lampX + dist * Math.cos(p.angle);
            const pz = dist * Math.sin(p.angle);

            renderQueue.push({
              type: 'particle',
              x: px,
              y: p.y,
              z: pz,
              radius: p.radius,
              alpha: p.alpha,
              color: p.color,
              funnelR: funnelR
            });
          });

          // Adding Blobs
          blobs.forEach(blob => {
            const t = Math.max(0, Math.min(1.0, (blob.y - lampY) / lampH));
            const mt = 1.0 - t;
            const leftL = (mt * mt * mt * (lampX - lampW / 2 + 5)) +
                          (3 * mt * mt * t * (lampX - lampW * 0.35)) +
                          (3 * mt * t * t * (lampX - lampW * 0.32)) +
                          (t * t * t * (lampX - lampW / 2));
            const rightR = (mt * mt * mt * (lampX + lampW / 2 - 5)) +
                           (3 * mt * mt * t * (lampX + lampW * 0.35)) +
                           (3 * mt * t * t * (lampX + lampW * 0.32)) +
                           (t * t * t * (lampX + lampW / 2));
            const curHalfW = (rightR - leftL) / 2;
            const funnelR = curHalfW * 0.88;

            const dist = funnelR * blob.orbitRadiusFactor;
            blob.x = lampX + dist * Math.cos(blob.angle);
            blob.z = dist * Math.sin(blob.angle);

            renderQueue.push({
              type: 'blob',
              ref: blob,
              x: blob.x,
              y: blob.y,
              z: blob.z,
              radius: blob.radius,
              color: blob.color,
              funnelR: funnelR
            });
          });

          // Adding Metaball Bridges (quicksilver connections calculated in 3D)
          for (let i = 0; i < blobs.length; i++) {
            for (let j = i + 1; j < blobs.length; j++) {
              const b1 = blobs[i];
              const b2 = blobs[j];
              const dx = b2.x - b1.x;
              const dy = b2.y - b1.y;
              const dz = b2.z - b1.z;
              const dist3D = Math.hypot(dx, dy, dz);
              const maxMergeDist = (b1.radius + b2.radius) * 1.35;

              if (dist3D < maxMergeDist && dist3D > 6) {
                renderQueue.push({
                  type: 'bridge',
                  b1: b1,
                  b2: b2,
                  x: (b1.x + b2.x) / 2,
                  y: (b1.y + b2.y) / 2,
                  z: (b1.z + b2.z) / 2,
                  dist3D: dist3D,
                  maxMergeDist: maxMergeDist
                });
              }
            }
          }

          // Sort entire queue by Z (painter's algorithm)
          renderQueue.sort((a, b) => a.z - b.z);

          // Draw render items in depth order!
          // We split drawing at z = 0, injecting a swirling central neon tornado spine!
          let spineRendered = false;

          renderQueue.forEach(item => {
            // Render central tornado spine once we cross z = 0
            if (!spineRendered && item.z > 0) {
              spineRendered = true;
              
              // Draw swirling neon electrical vortex spine matching deep volumetric storm
              ctx.save();
              const vortexGrad = ctx.createLinearGradient(lampX, lampY, lampX, lampY + lampH);
              vortexGrad.addColorStop(0, 'rgba(239, 68, 68, 0.05)');
              vortexGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.18)');
              vortexGrad.addColorStop(1, 'rgba(239, 68, 68, 0.05)');
              ctx.strokeStyle = vortexGrad;
              ctx.shadowColor = 'rgba(244, 63, 94, 0.7)';
              ctx.shadowBlur = 6 + bassAmp * 14;

              for (let s = 0; s < 2; s++) {
                ctx.lineWidth = s === 0 ? 1.5 : 2.5;
                ctx.beginPath();
                const phaseShift = s * Math.PI + time * 0.005;
                for (let vyVal = lampY + 12; vyVal <= lampY + lampH - 12; vyVal += 8) {
                  const t = (vyVal - lampY) / lampH;
                  const mt = 1.0 - t;
                  const leftL = (mt * mt * mt * (lampX - lampW / 2 + 5)) +
                                (3 * mt * mt * t * (lampX - lampW * 0.35)) +
                                (3 * mt * t * t * (lampX - lampW * 0.32)) +
                                (t * t * t * (lampX - lampW / 2));
                  const rightR = (mt * mt * mt * (lampX + lampW / 2 - 5)) +
                                 (3 * mt * mt * t * (lampX + lampW * 0.35)) +
                                 (3 * mt * t * t * (lampX + lampW * 0.32)) +
                                 (t * t * t * (lampX + lampW / 2));
                  const spineR = (rightR - leftL) * 0.44 * (0.12 + 0.18 * Math.pow(1.0 - t, 1.2));
                  const devOffset = Math.sin(vyVal * 0.02 - phaseShift) * spineR * (1.1 + bassAmp * 0.6);
                  const vxVal = lampX + devOffset;
                  if (vyVal === lampY + 12) ctx.moveTo(vxVal, vyVal);
                  else ctx.lineTo(vxVal, vyVal);
                }
                ctx.stroke();
              }
              ctx.restore();
            }

            // Draw current item based on type
            if (item.type === 'particle') {
              // 3D scale and transparency
              const scale = 0.76 + 0.24 * (item.z / item.funnelR);
              const drawRad = Math.max(0.4, item.radius * scale);
              const alphaFactor = 0.45 + 0.45 * (item.z + item.funnelR) / (2 * item.funnelR);

              ctx.save();
              ctx.fillStyle = item.color + (item.alpha * alphaFactor * (0.8 + 0.2 * Math.sin(time * 0.005 + item.y))) + ')';
              ctx.beginPath();
              ctx.arc(item.x, item.y, drawRad, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            } else if (item.type === 'blob') {
              // Liquid viscoelastic stretching
              const blobRef = item.ref;
              const speed = Math.hypot(blobRef.vx || 0, blobRef.vy || 0);
              const moveAngle = Math.atan2(blobRef.vy || 0.1, blobRef.vx || 0.01) + Math.PI / 2; // stretch tangential/vertical

              const scale = 0.8 + 0.2 * (item.z / item.funnelR);
              const rxOriginal = item.radius * scale;
              const ryOriginal = item.radius * scale;

              // Stretch logic
              const stretch = 1.0 + Math.min(speed * 1.5, 0.42);
              const rx = rxOriginal * stretch;
              const ry = ryOriginal / Math.sqrt(stretch);

              ctx.save();
              ctx.translate(item.x, item.y);
              ctx.rotate(moveAngle);

              const blobGrad = ctx.createRadialGradient(
                -rx * 0.22,
                -ry * 0.22,
                Math.min(rx, ry) * 0.05,
                0,
                0,
                Math.max(rx, ry)
              );

              if (item.color === 'rgb(244, 63, 94)') {
                blobGrad.addColorStop(0, '#ffe4e6');   // Specular high white reflection
                blobGrad.addColorStop(0.24, '#fb7185'); // Soft rose center
                blobGrad.addColorStop(0.82, '#e11d48'); // Warm red core
                blobGrad.addColorStop(1, '#880824');    // Viscous dark shadow background
              } else {
                blobGrad.addColorStop(0, '#ffedd5');   // Golden sheen reflection
                blobGrad.addColorStop(0.24, '#fb923c'); // Orange center
                blobGrad.addColorStop(0.82, '#ea580c'); // Deep orange core
                blobGrad.addColorStop(1, '#822409');    // Rich dark terracotta border
              }

              ctx.shadowColor = item.color;
              ctx.shadowBlur = (8 + bassAmp * 12) * scale;
              ctx.fillStyle = blobGrad;
              ctx.beginPath();
              ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            } else if (item.type === 'bridge') {
              // Metaball bridge drawing
              const b1 = item.b1;
              const b2 = item.b2;
              const dx = b2.x - b1.x;
              const dy = b2.y - b1.y;

              const rRatio = item.dist3D / item.maxMergeDist;
              const strength = Math.pow(1.0 - rRatio, 1.8);
              const bridgeWidth = (b1.radius + b2.radius) * 0.44 * strength;

              if (bridgeWidth > 0.4) {
                const angle = Math.atan2(dy, dx);
                const spread = (Math.PI / 2) * (1.0 - rRatio * 0.42);

                const p1a_x = b1.x + b1.radius * Math.cos(angle + spread);
                const p1a_y = b1.y + b1.radius * Math.sin(angle + spread);
                const p1b_x = b1.x + b1.radius * Math.cos(angle - spread);
                const p1b_y = b1.y + b1.radius * Math.sin(angle - spread);

                const angleOpp = angle + Math.PI;
                const p2a_x = b2.x + b2.radius * Math.cos(angleOpp - spread);
                const p2a_y = b2.y + b2.radius * Math.sin(angleOpp - spread);
                const p2b_x = b2.x + b2.radius * Math.cos(angleOpp + spread);
                const p2b_y = b2.y + b2.radius * Math.sin(angleOpp + spread);

                const midX = (b1.x + b2.x) / 2;
                const midY = (b1.y + b2.y) / 2;

                const mid_edge_a_x = midX + bridgeWidth * Math.cos(angle + Math.PI / 2);
                const mid_edge_a_y = midY + bridgeWidth * Math.sin(angle + Math.PI / 2);
                const mid_edge_b_x = midX + bridgeWidth * Math.cos(angle - Math.PI / 2);
                const mid_edge_b_y = midY + bridgeWidth * Math.sin(angle - Math.PI / 2);

                ctx.save();
                const bridgeGrad = ctx.createLinearGradient(b1.x, b1.y, b2.x, b2.y);
                bridgeGrad.addColorStop(0, b1.color);
                bridgeGrad.addColorStop(1, b2.color);
                ctx.fillStyle = bridgeGrad;

                ctx.beginPath();
                ctx.moveTo(p1a_x, p1a_y);
                ctx.quadraticCurveTo(mid_edge_a_x, mid_edge_a_y, p2a_x, p2a_y);
                ctx.lineTo(p2b_x, p2b_y);
                ctx.quadraticCurveTo(mid_edge_b_x, mid_edge_b_y, p1b_x, p1b_y);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
              }
            }
          });

          // 6. Draw the Sleek Curvilinear Glass Lamp Dome Frame
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.lineWidth = 1.6;
          
          ctx.beginPath();
          ctx.moveTo(lampX - lampW / 2 + 5, lampY);
          ctx.bezierCurveTo(
            lampX - lampW * 0.35, lampY + lampH * 0.3,
            lampX - lampW * 0.32, lampY + lampH * 0.65,
            lampX - lampW / 2, lampY + lampH
          );
          ctx.lineTo(lampX + lampW / 2, lampY + lampH);
          ctx.bezierCurveTo(
            lampX + lampW * 0.32, lampY + lampH * 0.65,
            lampX + lampW * 0.35, lampY + lampH * 0.3,
            lampX + lampW / 2 - 5, lampY
          );
          ctx.closePath();
          ctx.stroke();

          const glassGGrad = ctx.createLinearGradient(lampX - lampW / 2, 0, lampX + lampW / 2, 0);
          glassGGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
          glassGGrad.addColorStop(0.1, 'rgba(255, 255, 255, 0.02)');
          glassGGrad.addColorStop(0.9, 'rgba(255, 255, 255, 0.02)');
          glassGGrad.addColorStop(1, 'rgba(255, 255, 255, 0.12)');
          ctx.fillStyle = glassGGrad;
          ctx.fill();

          // 6.5 Draw Curvilinear Dual Glass Specular Highlights (Cylindrical shine)
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(lampX - lampW / 2 + 10, lampY + 12);
          ctx.bezierCurveTo(
            lampX - lampW * 0.35 + 4, lampY + lampH * 0.3,
            lampX - lampW * 0.32 + 4, lampY + lampH * 0.65,
            lampX - lampW / 2 + 8, lampY + lampH - 8
          );
          ctx.stroke();
          
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(lampX + lampW / 2 - 12, lampY + 12);
          ctx.bezierCurveTo(
            lampX + lampW * 0.35 - 5, lampY + lampH * 0.3,
            lampX + lampW * 0.32 - 5, lampY + lampH * 0.65,
            lampX + lampW / 2 - 10, lampY + lampH - 8
          );
          ctx.stroke();
          ctx.restore();

          // 7. Handcrafted Solid Copper Base Plinth & Top Cap
          ctx.save();
          const baseHeight = 22;
          const capHeight = 16;

          const copperBaseGrad = ctx.createLinearGradient(lampX - lampW / 2, lampY + lampH, lampX + lampW / 2, lampY + lampH + baseHeight);
          copperBaseGrad.addColorStop(0, '#542612');
          copperBaseGrad.addColorStop(0.18, '#bc6c25');
          copperBaseGrad.addColorStop(0.48, '#e0a96d');
          copperBaseGrad.addColorStop(0.78, '#bc6c25');
          copperBaseGrad.addColorStop(1, '#542612');

          ctx.fillStyle = copperBaseGrad;
          ctx.beginPath();
          ctx.moveTo(lampX - lampW / 2 - 4, lampY + lampH);
          ctx.lineTo(lampX + lampW / 2 + 4, lampY + lampH);
          ctx.lineTo(lampX + lampW / 2 + 10, lampY + lampH + baseHeight);
          ctx.lineTo(lampX - lampW / 2 - 10, lampY + lampH + baseHeight);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(lampX - lampW / 2 - 4, lampY + lampH - 1.5, lampW + 8, 2);

          const copperCapGrad = ctx.createLinearGradient(lampX - lampW / 2, lampY - capHeight, lampX + lampW / 2, lampY);
          copperCapGrad.addColorStop(0, '#542612');
          copperCapGrad.addColorStop(0.3, '#bc6c25');
          copperCapGrad.addColorStop(0.5, '#e0a96d');
          copperCapGrad.addColorStop(0.7, '#bc6c25');
          copperCapGrad.addColorStop(1, '#542612');

          ctx.fillStyle = copperCapGrad;
          ctx.beginPath();
          ctx.moveTo(lampX - lampW / 2 + 6, lampY - capHeight);
          ctx.lineTo(lampX + lampW / 2 - 6, lampY - capHeight);
          ctx.lineTo(lampX + lampW / 2 - 4, lampY);
          ctx.lineTo(lampX - lampW / 2 + 4, lampY);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else if (targetMode === 'synthwave-grid') {
          // --- SYNTHWAVE OUTRUN 3D GRID RIDGE & SUN ---
          analyser.getByteFrequencyData(dataArray);

          let bassSum = 0;
          for (let i = 0; i < 6; i++) bassSum += dataArray[i] || 0;
          const bass = (bassSum / 6) / 255;

          const time = performance.now();
          const reactiveSensitivity = visSensitivity;
          const volumeFactor = bass * reactiveSensitivity;

          const horizonY = height * 0.44;
          const cx = width / 2;

          // 1. Deep Midnight Blue & Neon Purple Sky Gradient
          const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
          skyGrad.addColorStop(0, '#020005');
          skyGrad.addColorStop(0.5, '#12021c');
          skyGrad.addColorStop(1, '#2c043c');
          ctx.fillStyle = skyGrad;
          ctx.fillRect(0, 0, width, height);

          // 2. Draw Giant Retro Pulsing Sun
          ctx.save();
          const sunR = Math.min(width, height) * 0.22 * (1 + volumeFactor * 0.12);
          const sunX = cx;
          const sunY = horizonY - 10;

          const sunGrad = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
          sunGrad.addColorStop(0, '#ffde17');
          sunGrad.addColorStop(0.6, '#ec008c');
          sunGrad.addColorStop(1, '#7a003c');

          ctx.fillStyle = sunGrad;
          ctx.beginPath();
          ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#12021c';
          const slitSpacing = 11;
          const speedFactor = time * 0.015;
          for (let sy = sunY - sunR; sy < sunY + sunR; sy += slitSpacing) {
            const progress = (sy - (sunY - sunR)) / (sunR * 2);
            const slitH = Math.max(1, 4 * progress);
            const scrollOffset = (speedFactor % slitSpacing);
            const activeY = sy + scrollOffset;
            if (activeY > sunY - sunR && activeY < sunY + sunR) {
              ctx.fillRect(sunX - sunR - 10, activeY, (sunR + 10) * 2, slitH);
            }
          }
          ctx.restore();

          // 3. Render 3D Wireframe Grid with Peaks responsive to audio spectrum
          ctx.save();
          ctx.strokeStyle = '#06b6d4';
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 4;
          ctx.lineWidth = 1.0;

          const colsCount = 14;
          for (let c = -colsCount / 2; c <= colsCount / 2; c++) {
            ctx.beginPath();
            ctx.moveTo(cx, horizonY);
            const bottomX = cx + (c * (width * 0.12));
            ctx.lineTo(bottomX, height);
            ctx.stroke();
          }

          if (!synthwaveGridYRef.current) synthwaveGridYRef.current = 0;
          const drivingSpeed = isPlaying ? (1.2 + volumeFactor * 2.8) : 0.8;
          synthwaveGridYRef.current = (synthwaveGridYRef.current + drivingSpeed) % 80;

          const hOffset = synthwaveGridYRef.current;
          const rowsCount = 10;
          for (let r = 0; r < rowsCount; r++) {
            const rawY = r * (height - horizonY) / rowsCount + (hOffset / 80) * ((height - horizonY) / rowsCount);
            const targetY = horizonY + Math.pow((rawY - horizonY) / (height - horizonY), 1.6) * (height - horizonY);

            if (targetY > horizonY) {
              const depthRatio = (targetY - horizonY) / (height - horizonY);
              ctx.strokeStyle = `rgba(6, 182, 212, ${0.1 + depthRatio * 0.72})`;
              ctx.lineWidth = 0.5 + depthRatio * 1.5;

              ctx.beginPath();
              ctx.moveTo(0, targetY);
              ctx.lineTo(width, targetY);
              ctx.stroke();
            }
          }
          ctx.restore();

          // 4. Synthwave Outline Side Neon Mountain Ridges
          ctx.save();
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 6;

          ctx.strokeStyle = '#ec4899';
          ctx.shadowColor = 'rgba(236, 72, 153, 0.5)';
          ctx.fillStyle = 'rgba(18, 2, 28, 0.9)';
          ctx.beginPath();
          ctx.moveTo(0, height);
          ctx.lineTo(0, horizonY);
          
          const mountainPoints = 16;
          for (let p = 0; p <= mountainPoints; p++) {
            const rx = (p / mountainPoints) * (width * 0.35);
            const binIdx = Math.floor(p / mountainPoints * 12);
            const amplitude = dataArray[binIdx] || 0;
            const waveY = (amplitude / 255) * 58 * reactiveSensitivity;
            const staticJagged = Math.sin(p * 1.2) * 14 + Math.cos(p * 2.8) * 8;
            const my = horizonY - 12 - staticJagged - waveY;
            ctx.lineTo(rx, my);
          }
          ctx.lineTo(width * 0.35, horizonY);
          ctx.lineTo(0, horizonY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = '#f43f5e';
          ctx.shadowColor = 'rgba(244, 63, 94, 0.5)';
          ctx.beginPath();
          ctx.moveTo(width, height);
          ctx.lineTo(width, horizonY);
          for (let p = 0; p <= mountainPoints; p++) {
            const rx = width - (p / mountainPoints) * (width * 0.35);
            const binIdx = Math.floor(15 + p / mountainPoints * 30);
            const amplitude = dataArray[binIdx] || 0;
            const waveY = (amplitude / 255) * 45 * reactiveSensitivity;
            const staticJagged = Math.sin(p * 1.4) * 12 + Math.cos(p * 2.6) * 6;
            const my = horizonY - 10 - staticJagged - waveY;
            ctx.lineTo(rx, my);
          }
          ctx.lineTo(width * 0.65, horizonY);
          ctx.lineTo(width, horizonY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          // 5. Draw futuristic neon road heading towards vanishing point
          ctx.save();
          ctx.strokeStyle = '#ff007f';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#ff007f';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(cx - 35, horizonY);
          ctx.lineTo(cx - 160, height);
          ctx.moveTo(cx + 35, horizonY);
          ctx.lineTo(cx + 160, height);
          ctx.stroke();
          ctx.restore();
        } else if (targetMode === 'plasma-globe') {
          // --- HIGH VOLTAGE TESLA GLASS PLASMA GLOBE ---
          analyser.getByteFrequencyData(dataArray);

          let energySum = 0;
          for (let i = 0; i < bufferLength; i++) energySum += dataArray[i] || 0;
          const energy = (energySum / (bufferLength || 1)) / 255;

          let trebleSum = 0;
          for (let i = 40; i < 90; i++) trebleSum += dataArray[i] || 0;
          const treble = (trebleSum / 50) / 255;

          const reactiveSensitivity = visSensitivity;
          const activeVoltage = energy * reactiveSensitivity;

          const time = performance.now();

          // 1. Dark Laboratory Background Atmosphere
          const wallGrad = ctx.createRadialGradient(width/2, height/2, 10, width/2, height/2, width * 0.7);
          wallGrad.addColorStop(0, '#04020a');
          wallGrad.addColorStop(0.5, '#070514');
          wallGrad.addColorStop(1, '#020105');
          ctx.fillStyle = wallGrad;
          ctx.fillRect(0, 0, width, height);

          const cx = width / 2;
          const cy = height * 0.46;
          const glowRadiusBoost = 1 + beatPulseRef.current * 0.15; // sphere glows up to 15% larger at beat peak
          const sphereR = (Math.min(width, height) * 0.35 + 10) * glowRadiusBoost;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.beginPath();
          ctx.ellipse(cx, cy + sphereR + 15, sphereR * 0.8, 12, 0, 0, Math.PI * 2);
          ctx.fill();

          // 2. Heavy Steel Electrode Base Mount supporting the glass globe
          ctx.save();
          const baseH = height * 0.28;
          const baseSideW = sphereR * 0.32;

          const steelGrad = ctx.createLinearGradient(cx - baseSideW, cy + sphereR, cx + baseSideW, cy + sphereR + baseH);
          steelGrad.addColorStop(0, '#0d0d0f');
          steelGrad.addColorStop(0.2, '#292b30');
          steelGrad.addColorStop(0.5, '#4a4d55');
          steelGrad.addColorStop(0.8, '#292b30');
          steelGrad.addColorStop(1, '#0d0d0f');

          ctx.fillStyle = steelGrad;
          ctx.strokeStyle = '#1d1f23';
          ctx.lineWidth = 1.4;

          ctx.beginPath();
          ctx.moveTo(cx - baseSideW, cy + sphereR - 5);
          ctx.lineTo(cx + baseSideW, cy + sphereR - 5);
          ctx.lineTo(cx + baseSideW * 1.35, height);
          ctx.lineTo(cx - baseSideW * 1.35, height);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ec4899';
          ctx.shadowColor = '#ec4899';
          ctx.shadowBlur = isPlaying ? 8 : 2;
          ctx.beginPath();
          const ledBlink = !isPlaying || (Math.floor(time / 280) % 2 === 0);
          ctx.arc(cx, cy + sphereR + baseH * 0.4, 3.5, 0, Math.PI * 2);
          if (ledBlink) ctx.fill();
          ctx.restore();

          // 3. Central Glowing Carbon/Graphite Electrode Core
          ctx.save();
          const coreX = cx;
          const coreY = cy;
          const coreR = sphereR * 0.2;

          const neckGrad = ctx.createLinearGradient(cx - 8, cy, cx + 8, cy + sphereR);
          neckGrad.addColorStop(0, '#1c1308');
          neckGrad.addColorStop(0.5, '#7c5f35');
          neckGrad.addColorStop(1, '#1c1308');
          ctx.fillStyle = neckGrad;
          ctx.fillRect(cx - 7, cy, 14, sphereR);

          const graphiteGrad = ctx.createRadialGradient(coreX - 3, coreY - 3, 1, coreX, coreY, coreR);
          graphiteGrad.addColorStop(0, '#4b5563');
          graphiteGrad.addColorStop(0.6, '#1f2937');
          graphiteGrad.addColorStop(1, '#111827');
          ctx.fillStyle = graphiteGrad;
          ctx.beginPath();
          ctx.arc(coreX, coreY, coreR, 0, Math.PI * 2);
          ctx.fill();

          const coreHGrad = ctx.createRadialGradient(coreX, coreY, 2, coreX, coreY, coreR * 1.25);
          coreHGrad.addColorStop(0, 'rgba(217, 70, 239, 0.85)');
          coreHGrad.addColorStop(0.5, 'rgba(124, 58, 237, 0.45)');
          coreHGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = coreHGrad;
          ctx.beginPath();
          ctx.arc(coreX, coreY, coreR * 1.25, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // 4. Electrical Lightning Discharge Arcs
          ctx.save();
          const sparkCount = isPlaying ? (4 + Math.floor(activeVoltage * 8)) : 3;
          ctx.lineCap = 'round';

          for (let s = 0; s < sparkCount; s++) {
            const angleSpeed = isPlaying ? 0.0003 : 0.00007;
            const seedAngle = (s * (Math.PI * 2) / sparkCount) + (time * angleSpeed) + Math.sin(time * 0.001 + s) * 0.14;
            
            const startX = coreX + Math.cos(seedAngle) * coreR * 0.95;
            const startY = coreY + Math.sin(seedAngle) * coreR * 0.95;

            const strikeR = sphereR * 0.98;
            const endX = cx + Math.cos(seedAngle) * strikeR;
            const endY = cy + Math.sin(seedAngle) * strikeR;

            const points: {x: number; y: number}[] = [];
            points.push({ x: startX, y: startY });

            const dist = Math.hypot(endX - startX, endY - startY);
            const steps = 14;
            const dX = (endX - startX) / steps;
            const dY = (endY - startY) / steps;

            for (let st = 1; st < steps; st++) {
              const lx = startX + dX * st;
              const ly = startY + dY * st;

              const jitterStrength = 4.5 + (isPlaying ? treble * 12 : 2.5);
              const jitterAngle = seedAngle + Math.PI / 2;
              const displacement = (Math.sin(time * 0.02 + st * 1.6 + s * 10) * jitterStrength) + (Math.random() - 0.5) * jitterStrength;

              const px = lx + Math.cos(jitterAngle) * displacement;
              const py = ly + Math.sin(jitterAngle) * displacement;
              points.push({ x: px, y: py });
            }
            points.push({ x: endX, y: endY });

            ctx.shadowBlur = 12;
            ctx.shadowColor = '#d946ef';

            ctx.strokeStyle = 'rgba(139, 92, 246, 0.22)';
            ctx.lineWidth = 4.2;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let pi = 1; pi < points.length; pi++) {
              ctx.lineTo(points[pi].x, points[pi].y);
            }
            ctx.stroke();

            ctx.strokeStyle = '#d946ef';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let pi = 1; pi < points.length; pi++) {
              ctx.lineTo(points[pi].x, points[pi].y);
            }
            ctx.stroke();

            ctx.strokeStyle = '#fae8ff';
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let pi = 1; pi < points.length; pi++) {
              ctx.lineTo(points[pi].x, points[pi].y);
            }
            ctx.stroke();

            ctx.fillStyle = '#67e8f9';
            ctx.shadowColor = '#67e8f9';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(endX, endY, 3 + Math.random() * 3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          // 5. Ambient Purple Filament Gaseous Whispers
          ctx.save();
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.16)';
          ctx.lineWidth = 0.85;
          const ambientTendrils = isPlaying ? 5 : 3;
          for (let a = 0; a < ambientTendrils; a++) {
            const staticA = (a * (Math.PI * 2) / ambientTendrils) + (time * 0.0001);
            ctx.beginPath();
            ctx.moveTo(coreX, coreY);
            for (let h = 1; h <= 10; h++) {
              const rRatio = (h / 10) * sphereR;
              const jitter = Math.sin(time * 0.009 + h * 0.8 + a) * 5;
              const hA = staticA + (h * 0.04);
              const hx = cx + Math.cos(hA) * rRatio + Math.cos(hA + Math.PI/2) * jitter;
              const hy = cy + Math.sin(hA) * rRatio + Math.sin(hA + Math.PI/2) * jitter;
              ctx.lineTo(hx, hy);
            }
            ctx.stroke();
          }
          ctx.restore();

          // 6. Realistic Optical Glass Sphere Shielding & Refractions
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(cx, cy, sphereR, 0, Math.PI * 2);
          ctx.stroke();

          const plasmaGas = ctx.createRadialGradient(cx, cy, sphereR * 0.1, cx, cy, sphereR * 1.05);
          plasmaGas.addColorStop(0, 'rgba(124, 58, 237, 0.08)');
          plasmaGas.addColorStop(0.7, 'rgba(217, 70, 239, 0.04)');
          plasmaGas.addColorStop(0.95, 'rgba(6, 182, 212, 0.09)');
          plasmaGas.addColorStop(1, 'rgba(255, 255, 255, 0.16)');
          ctx.fillStyle = plasmaGas;
          ctx.beginPath();
          ctx.arc(cx, cy, sphereR, 0, Math.PI * 2);
          ctx.fill();

          const glassGlowX = cx - sphereR * 0.44;
          const glassGlowY = cy - sphereR * 0.44;
          const ringGrad = ctx.createRadialGradient(glassGlowX, glassGlowY, 2, glassGlowX, glassGlowY, sphereR * 0.42);
          ringGrad.addColorStop(0, 'rgba(255, 255, 255, 0.32)');
          ringGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.12)');
          ringGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = ringGrad;
          ctx.beginPath();
          ctx.arc(glassGlowX, glassGlowY, sphereR * 0.42, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, sphereR - 5, Math.PI * 0.1, Math.PI * 0.4);
          ctx.stroke();
          ctx.restore();
        }
      };

      if (analyser) {
        if (mode === 'random') {
          const now = performance.now();
          if (lastTimeRef.current === 0) {
            lastTimeRef.current = now;
          }
          const delta = now - lastTimeRef.current;
          lastTimeRef.current = now;

          randomTimerRef.current += delta;

          const stayDuration = 6000; // stay on a mode for 6 seconds
          const morphDuration = 2000; // morph for 2 seconds
          const totalDuration = stayDuration + morphDuration;

          const CALM_MODES: VisualizerMode[] = [
            'aurora', 'lava-lamp', 'starfield-warp', 'plasma-globe', 'moloko-plus', 
            'artwork', 'skytree', 'album-wall'
          ];
          const ENERGETIC_MODES: VisualizerMode[] = [
            'fire', 'matrix-rain', 'vegas-strip', 'guitar-hero', 'synthwave-grid', 
            'kaleidoscope', 'radial-spectrum'
          ];
          const NEUTRAL_MODES: VisualizerMode[] = [
            'spectrum', 'oscilloscope', 'vfd', 'vu-meters', 'spinning-cd', 
            'turntable', 'minidisk', 'cassette', 'rainbow', 'falling-stars', 
            'waveform-river'
          ];

          if (!currentRandomModeRef.current || currentRandomModeRef.current === 'random') {
            currentRandomModeRef.current = 'spectrum';
          }
          if (!nextRandomModeRef.current || nextRandomModeRef.current === 'random') {
            nextRandomModeRef.current = 'oscilloscope';
          }

          if (randomTimerRef.current >= totalDuration) {
            randomTimerRef.current = 0;
            currentRandomModeRef.current = nextRandomModeRef.current;
            
            recentlyShownModesRef.current.push(currentRandomModeRef.current);
            const RECENT_HISTORY_SIZE = 5;
            if (recentlyShownModesRef.current.length > RECENT_HISTORY_SIZE) {
              recentlyShownModesRef.current.shift();
            }

            const energy = rollingEnergyRef.current;
            
            let categoryPool: VisualizerMode[];
            const roll = Math.random();
            if (energy < 0.25) {
              categoryPool = roll < 0.7 ? CALM_MODES : NEUTRAL_MODES;
            } else if (energy > 0.55) {
              categoryPool = roll < 0.7 ? ENERGETIC_MODES : NEUTRAL_MODES;
            } else {
              categoryPool = roll < 0.5 ? NEUTRAL_MODES : (roll < 0.75 ? CALM_MODES : ENERGETIC_MODES);
            }

            const eligible = categoryPool.filter(
              m => m !== currentRandomModeRef.current && !recentlyShownModesRef.current.includes(m)
            );
            
            const finalPool = eligible.length > 0 ? eligible : categoryPool.filter(m => m !== currentRandomModeRef.current);
            
            nextRandomModeRef.current = finalPool[Math.floor(Math.random() * finalPool.length)] || 'spectrum';
          }

          if (randomTimerRef.current < stayDuration) {
            drawSpecificMode(currentRandomModeRef.current);
          } else {
            const progress = (randomTimerRef.current - stayDuration) / morphDuration;
            drawSpecificMode(currentRandomModeRef.current);

            ctx.save();
            ctx.globalAlpha = Math.min(1.0, Math.max(0.0, progress));
            drawSpecificMode(nextRandomModeRef.current);
            ctx.restore();
          }
        } else {
          drawSpecificMode(mode);
        }
      } else {
        // Draw static retro-wave line when not playing
        let customAccent = '#00ff44';
        try {
          const raw = window.getComputedStyle(document.body).getPropertyValue('--skin-accent');
          if (raw && raw.trim()) {
            customAccent = raw.trim();
          }
        } catch (e) {}

        ctx.beginPath();
        ctx.strokeStyle = 
          visTheme === 'custom' ? `${customAccent}88` : 
          visTheme === 'crimson' ? '#5a0505' :
          visTheme === 'cyberpunk' ? '#6d28d9' :
          visTheme === 'amber' ? '#78350f' :
          visTheme === 'aqua' ? '#0f172a' :
          visTheme === 'mono' ? '#4b4b4b' :
          '#005511'; // dim classic green
        ctx.lineWidth = 1;
        ctx.moveTo(0, height / 2);

        const activeFluc = isPlaying ? 5 : 0.4;
        for (let i = 0; i < width; i++) {
          const y = height / 2 + Math.sin(i * 0.15 + Date.now() * 0.01) * activeFluc;
          ctx.lineTo(i, y);
        }
        ctx.stroke();
      }

    animationRef.current = requestAnimationFrame(render);
    };

    const observer = new ResizeObserver(() => {
      // Cancel the stale frame (sized for the old dimensions)...
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      lastFrameTimeRef.current = 0;
      
      // ...then restart the loop on the next frame, once the canvas has 
      // settled at its new size. A short delay avoids restarting mid-resize 
      // while the browser is still reporting intermediate/transitional 
      // dimensions during the rotation animation.
      setTimeout(() => {
        if (animationRef.current === null) {
          animationRef.current = requestAnimationFrame(render);
        }
      }, 50);
    });
    observer.observe(canvas);

    const handleVisibilityChange = () => {
      isVisibleRef.current = isAppInForeground();
      if (isAppInForeground() && animationRef.current === null) {
        // Resume animation loop when app comes back to foreground
        animationRef.current = requestAnimationFrame(render);
      } else if (!isAppInForeground() && animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('spinamp-visibility-changed', handleVisibilityChange);

    render();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('spinamp-visibility-changed', handleVisibilityChange);
      observer.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mode, isPlaying, visTheme, visSensitivity, customWidth, customHeight]);

  return (
    <div className="relative w-full h-full group select-none">
      <canvas
        id="spinamp_vis_canvas"
        ref={canvasRef}
        width={customWidth || 152}
        height={customHeight || 64}
        style={{ imageRendering: 'pixelated' }}
        className="w-full h-full bg-black border border-neutral-900 rounded shadow-inner"
      />

      {/* Tiny absolutely-positioned Settings cog trigger overlay */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowSettings(!showSettings);
        }}
        className="absolute top-1 right-1 w-5 h-5 bg-black/85 hover:bg-neutral-900 border border-neutral-700/60 rounded flex items-center justify-center text-[10px] text-neutral-400 hover:text-white transition shadow opacity-0 group-hover:opacity-100 z-50 cursor-pointer select-none"
        title="Visualizer parameters tweak drawer!"
      >
        ⚙️
      </button>

      {/* Retro Mini Settings popover panel directly inside visualizer wrapper */}
      {showSettings && (
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="absolute inset-0 bg-neutral-950/95 border border-neutral-800 rounded p-1 flex flex-col justify-between font-sans text-[7.5px] text-neutral-300 z-50 pointer-events-auto leading-none select-none"
        >
          {/* Top row settings config */}
          <div className="flex justify-between items-center bg-neutral-900 py-0.5 px-1 rounded border border-neutral-800 select-none">
            <span className="font-bold text-amber-500 uppercase tracking-widest text-[7px]">VIS CONTROLS</span>
            <button 
              onClick={() => setShowSettings(false)}
              className="text-neutral-500 hover:text-white font-black hover:bg-neutral-800 rounded px-1 text-[7px]"
            >
              [X]
            </button>
          </div>

          {/* Slider line input fields */}
          <div className="grid grid-cols-[28px_1fr] items-center gap-1.5 px-0.5">
            <span className="text-zinc-500 font-bold text-[7px] uppercase tracking-wide">Boost:</span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => handleSetSens(Math.max(0.6, visSensitivity - 0.2))} 
                className="px-0.5 py-0.2 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700 rounded text-amber-500 active:scale-95 text-[6.5px]"
              >
                -
              </button>
              <span className="font-mono text-zinc-300 min-w-16 text-[7px] text-center">{visSensitivity.toFixed(1)}x</span>
              <button 
                onClick={() => handleSetSens(Math.min(2.4, visSensitivity + 0.2))} 
                className="px-0.5 py-0.2 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700 rounded text-amber-500 active:scale-95 text-[6.5px]"
              >
                +
              </button>
            </div>
          </div>

          {/* Theme selection swatches */}
          <div className="grid grid-cols-[28px_1fr] items-center gap-1.5 px-0.5">
            <span className="text-zinc-500 font-bold text-[7px] uppercase tracking-wide">Color:</span>
            <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded border border-neutral-900">
              {(['neon', 'amber', 'cyberpunk', 'crimson', 'aqua', 'mono', 'custom'] as const).map((t) => {
                const colors = {
                  neon: 'bg-[#00ff44]',
                  amber: 'bg-[#f59e0b]',
                  cyberpunk: 'bg-[#ec4899]',
                  crimson: 'bg-[#ff1e43]',
                  aqua: 'bg-[#06b6d4]',
                  mono: 'bg-[#efefef]',
                  custom: 'bg-gradient-to-tr from-orange-500 via-pink-500 to-amber-300',
                };
                return (
                  <button
                    key={t}
                    onClick={() => handleSetTheme(t)}
                    className={`w-2.5 h-2.5 rounded-full ${colors[t]} border ${
                      visTheme === t ? 'border-white scale-120 shadow-[0_0_2.5px_rgba(255,255,255,0.7)]' : 'border-neutral-900 scale-90 opacity-60 hover:opacity-100 hover:scale-110'
                    } transition cursor-pointer`}
                    title={`Theme: ${t}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}, visualizerPropsAreEqual);
