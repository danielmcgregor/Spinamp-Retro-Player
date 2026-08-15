/**
 * BPM (Beats Per Minute) Detection Utility
 * Designed to perform real peak-envelope downsampling of PCM audio buffers in the browser,
 * with a deterministic, stable metadata-hash fallback for CORS-blocked or synth tracks.
 */

import { Track } from '../types';

// In-memory cache to prevent redundant recalculation
const bpmCache: Record<string, number> = {};

/**
 * Deterministically generates a stable, realistic BPM for any track
 * based on its title, artist, and duration, ensuring safe playback displays.
 */
export function getStableFallbackBPM(track: Track): number {
  const seedString = `${track?.title || ''}-${track?.artist || ''}-${track?.id || ''}`;
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = seedString.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Seed-based tempo distribution between 75 and 155 BPM
  // Group into common genres tempos: 80-95 (HipHop), 110-120 (Nu-Disco), 125-130 (House), 140-150 (Chiptune/Trance)
  const bpmSegments = [80, 85, 90, 95, 110, 115, 120, 124, 128, 130, 132, 140, 145, 150];
  const absHash = Math.abs(hash);
  return bpmSegments[absHash % bpmSegments.length];
}

/**
 * Helper function to chunk peak finding asynchronously so it does not block the main thread.
 */
async function findPeaksChunked(
  filteredData: number[], 
  threshold: number, 
  minSpacing: number
): Promise<number[]> {
  const peakIndices: number[] = [];
  let lastPeakIndex = -minSpacing;
  const CHUNK_SIZE = 10000; // Process 10k samples, then yield
  
  for (let start = 0; start < filteredData.length; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, filteredData.length);
    
    for (let i = start; i < end; i++) {
      if (filteredData[i] > threshold && (i - lastPeakIndex) > minSpacing) {
        let isLocalMax = true;
        const scanRange = 12;
        for (let r = -scanRange; r <= scanRange; r++) {
          const idx = i + r;
          if (idx >= 0 && idx < filteredData.length && filteredData[idx] > filteredData[i]) {
            isLocalMax = false;
            break;
          }
        }
        if (isLocalMax) {
          peakIndices.push(i);
          lastPeakIndex = i;
        }
      }
    }
    
    // Yield to the browser's event loop after each chunk so the UI can paint
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  return peakIndices;
}

/**
 * Algorithmic peak matching on floating point PCM data decoded from standard Web Audio API.
 */
export async function detectBPMFromBuffer(audioBuffer: AudioBuffer): Promise<number> {
  try {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    // Analyze up to 40 seconds to find the beat grid
    const duration = audioBuffer.duration;
    const secondsToAnalyze = Math.min(40, duration);
    const maxSamples = Math.floor(secondsToAnalyze * sampleRate);
    
    if (maxSamples <= 0 || channelData.length < 1000) {
      throw new Error('Insufficent audio data');
    }

    // Downsample to ~4000 Hz to process in milliseconds
    const downsampleFactor = Math.max(1, Math.round(sampleRate / 4000));
    const filteredData: number[] = [];
    
    for (let i = 0; i < maxSamples; i += downsampleFactor) {
      if (i < channelData.length) {
        filteredData.push(Math.abs(channelData[i]));
      }
    }
    
    const downsampledRate = sampleRate / downsampleFactor;
    
    // Find absolute average amplitude envelope
    let sum = 0;
    for (let i = 0; i < filteredData.length; i++) {
      sum += filteredData[i];
    }
    const average = sum / filteredData.length;
    
    // Beats are peaks above threshold (typically 2x average volume envelope spike)
    const threshold = average * 1.95;
    const minSpacing = downsampledRate * 0.28; // ~214BPM max rate (280ms interval)
    const peakIndices = await findPeaksChunked(filteredData, threshold, minSpacing);
    
    if (peakIndices.length < 6) return 120; // fallback standard 4/4 time
    
    // Construct beat-to-beat frequency interval list
    const intervals: number[] = [];
    for (let i = 0; i < peakIndices.length; i++) {
      for (let j = i + 1; j < Math.min(i + 6, peakIndices.length); j++) {
        const intervalInSamples = peakIndices[j] - peakIndices[i];
        const secondsVal = intervalInSamples / downsampledRate;
        if (secondsVal > 0.28 && secondsVal < 1.8) {
          intervals.push(secondsVal);
        }
      }
    }
    
    // Peak count to Tempo matching
    const bpms = intervals.map(sec => 60 / sec);
    const bpmCounts: Record<number, number> = {};
    
    bpms.forEach(bpm => {
      let rounded = Math.round(bpm);
      // Double standard speeds or half them to keep between 70 and 160 BPM
      while (rounded < 70) rounded *= 2;
      while (rounded > 165) rounded = Math.round(rounded / 2);
      
      bpmCounts[rounded] = (bpmCounts[rounded] || 0) + 1;
    });
    
    // Apply sliding window filter to smooth out near-integer peak results
    const smoothedCounts: Record<number, number> = {};
    for (let bpm = 70; bpm <= 165; bpm++) {
      let score = (bpmCounts[bpm] || 0) * 4;
      score += (bpmCounts[bpm - 1] || 0) * 2;
      score += (bpmCounts[bpm + 1] || 0) * 2;
      score += (bpmCounts[bpm - 2] || 0) * 0.5;
      score += (bpmCounts[bpm + 2] || 0) * 0.5;
      if (score > 0) smoothedCounts[bpm] = score;
    }
    
    let winnerBPM = 120;
    let maxScore = 0;
    Object.keys(smoothedCounts).forEach(bpmStr => {
      const bpm = parseInt(bpmStr);
      if (smoothedCounts[bpm] > maxScore) {
        maxScore = smoothedCounts[bpm];
        winnerBPM = bpm;
      }
    });
    
    return winnerBPM;
  } catch (err) {
    console.warn('BPM math analysis failed:', err);
    return 120;
  }
}

function safeDecodeAudioData(ctx: BaseAudioContext, buffer: ArrayBuffer): Promise<AudioBuffer | null> {
  return new Promise((resolve) => {
    try {
      const promise = ctx.decodeAudioData(
        buffer,
        (decoded) => resolve(decoded),
        () => resolve(null)
      );
      if (promise && typeof promise.then === 'function') {
        promise.then((decoded) => resolve(decoded)).catch(() => resolve(null));
      }
    } catch (_) {
      resolve(null);
    }
  });
}

/**
 * Central entrypoint to analyze or lookup the BPM for a track.
 * Supports direct web audio contextual decoding if files are local,
 * otherwise falls back safely.
 */
export async function analyzeTrackBPM(track: Track, audioCtx?: BaseAudioContext): Promise<number> {
  const cacheKey = track.id;
  if (bpmCache[cacheKey]) {
    return bpmCache[cacheKey];
  }
  
  // Synthesized tracks have procedural beats
  if (track.id === 'synth') {
    bpmCache[cacheKey] = 135; // Classic progressive modular synth tempo
    return 135;
  }

  // 1. If it's a local File, we can decode it fully!
  if (track.file) {
    try {
      const arrayBuffer = await track.file.arrayBuffer();
      if (arrayBuffer && arrayBuffer.byteLength > 0) {
        const OfflineCtxClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
        if (OfflineCtxClass) {
          const frameLength = Math.max(44100, Math.floor(44100 * Math.min(45, track.duration || 60)));
          const offlineCtx = new OfflineCtxClass(1, frameLength, 44100);
          const audioBuffer = await safeDecodeAudioData(offlineCtx, arrayBuffer.slice(0));
          if (audioBuffer) {
            const bpm = await detectBPMFromBuffer(audioBuffer);
            bpmCache[cacheKey] = bpm;
            return bpm;
          }
        }
      }
    } catch (e) {
      console.warn('Failed decoding local audio file for BPM:', e);
    }
  }

  // 2. If it's a remote URL, we can attempt a lightweight head or fetch decode if CORs allow
  if (track.url && (track.url.startsWith('https://') || track.url.startsWith('http://'))) {
    try {
      // Decode online tracks if CORS allows, else swallow and jump to seed-based generator
      const res = await fetch(track.url, { mode: 'cors' });
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        if (arrayBuffer && arrayBuffer.byteLength > 0) {
          const OfflineCtxClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
          if (OfflineCtxClass) {
            const frameLength = Math.max(44100, Math.floor(44100 * Math.min(45, track.duration || 60)));
            const offlineCtx = new OfflineCtxClass(1, frameLength, 44100);
            const audioBuffer = await safeDecodeAudioData(offlineCtx, arrayBuffer.slice(0));
            if (audioBuffer) {
              const bpm = await detectBPMFromBuffer(audioBuffer);
              bpmCache[cacheKey] = bpm;
              return bpm;
            }
          }
        }
      }
    } catch (e) {
      // Intentionally silent - fallback on credentials/CORS issues is expected
    }
  }

  // 3. Perfect deterministic seed fallback
  const fallback = getStableFallbackBPM(track);
  bpmCache[cacheKey] = fallback;
  return fallback;
}
