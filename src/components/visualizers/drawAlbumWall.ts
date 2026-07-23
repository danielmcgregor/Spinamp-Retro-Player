import React from 'react';
import { pruneImageCache } from './imageCacheUtils';

export interface AlbumWallState {
  imageCache: Map<string, HTMLImageElement>;
}

export function drawAlbumWall(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  dataArray: Uint8Array,
  visSensitivity: number,
  recentCoverUrls: string[], // pre-computed list of coverUrls, most recent first
  stateRef: React.MutableRefObject<AlbumWallState>,
  width: number,
  height: number
): void {
  if (recentCoverUrls.length === 0) {
    // Fallback: nothing to show yet (no play history with cover art)
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#555';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Play tracks with cover art to fill the wall...', width / 2, height / 2);
    return;
  }

  const cols = Math.ceil(Math.sqrt(recentCoverUrls.length));
  const rows = Math.ceil(recentCoverUrls.length / cols);
  const cellW = width / cols;
  const cellH = height / rows;

  // Overall audio energy for a subtle global pulse
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
  const energy = (sum / dataArray.length / 255) * visSensitivity;

  ctx.clearRect(0, 0, width, height);

  recentCoverUrls.forEach((url, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * cellW;
    const y = row * cellH;

    let img = stateRef.current.imageCache.get(url);
    if (!img) {
      img = new Image();
      img.src = url;
      stateRef.current.imageCache.set(url, img);
      pruneImageCache(stateRef.current.imageCache);
    }

    if (img.complete && img.naturalWidth > 0) {
      // Subtle per-cell pulse based on position + overall energy
      const cellPhaseOffset = (col + row) * 0.3;
      const scale = 1 + Math.sin(performance.now() / 300 + cellPhaseOffset) * 0.02 * (0.5 + energy);
      const scaledW = cellW * scale;
      const scaledH = cellH * scale;
      const offsetX = (cellW - scaledW) / 2;
      const offsetY = (cellH - scaledH) / 2;

      ctx.drawImage(img, x + offsetX, y + offsetY, scaledW, scaledH);
    } else {
      // Still loading
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(x, y, cellW, cellH);
    }
  });
}
