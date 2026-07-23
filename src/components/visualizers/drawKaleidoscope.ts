import React from 'react';
import type { VisualizerMode } from '../../types';

export function drawKaleidoscope(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  dataArray: Uint8Array,
  visTheme: string,
  visSensitivity: number,
  timeRef: React.MutableRefObject<number>,
  width: number,
  height: number
): void {
  const centerX = width / 2;
  const centerY = height / 2;
  const segments = 8; // number of mirrored segments — 8 gives a classic kaleidoscope look
  const segmentAngle = (Math.PI * 2) / segments;

  timeRef.current += 0.01; // slow rotation drift over time for organic movement

  ctx.save();
  ctx.translate(centerX, centerY);

  // Draw the base pattern once per segment, each rotated + alternately 
  // mirrored (flipping every other segment creates the classic kaleidoscope 
  // symmetry rather than just a simple pinwheel repeat)
  for (let seg = 0; seg < segments; seg++) {
    ctx.save();
    ctx.rotate(segmentAngle * seg + timeRef.current);
    if (seg % 2 === 1) {
      ctx.scale(1, -1); // mirror alternate segments
    }

    // Draw audio-reactive shapes within this wedge
    const barsInWedge = 12;
    for (let i = 0; i < barsInWedge; i++) {
      const dataIndex = Math.floor((i / barsInWedge) * (dataArray.length * 0.6));
      const value = (dataArray[dataIndex] || 0) / 255 * visSensitivity;
      
      const normalizedValue = Math.min(1.0, value);
      
      const angle = (i / barsInWedge) * segmentAngle;
      const radius = 20 + value * Math.min(width, height) * 0.35;

      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      // Color theme logic based on existing styles
      let baseColor = `hsl(${((i / barsInWedge) * 60 + (timeRef.current * 20)) % 360}, 75%, 55%)`;
      
      if (visTheme === 'cyberpunk') {
        if (normalizedValue > 0.8) baseColor = '#10b981'; // emerald neon peak
        else if (normalizedValue > 0.45) baseColor = '#ec4899'; // bubblegum pink
        else baseColor = '#8b5cf6'; // glowing purple
      } else if (visTheme === 'amber') {
        if (normalizedValue > 0.85) baseColor = '#ffffff';
        else baseColor = `rgba(245, 158, 11, ${0.45 + normalizedValue * 0.55})`;
      } else if (visTheme === 'aqua') {
        if (normalizedValue > 0.82) baseColor = '#ffffff';
        else if (normalizedValue > 0.45) baseColor = '#06b6d4';
        else baseColor = '#0284c7';
      } else if (visTheme === 'crimson') {
        if (normalizedValue > 0.82) baseColor = '#ffffff';
        else if (normalizedValue > 0.45) baseColor = '#ff1e43';
        else baseColor = '#66000a';
      } else if (visTheme === 'mono') {
        baseColor = `rgba(240, 240, 240, ${0.35 + normalizedValue * 0.65})`;
      } else if (visTheme === 'custom') {
        let customAccent = '#ff9100';
        try {
          const raw = window.getComputedStyle(document.body).getPropertyValue('--skin-accent');
          if (raw && raw.trim()) {
            customAccent = raw.trim();
          }
        } catch (e) {}
        if (normalizedValue > 0.85) baseColor = '#ffffff';
        else if (normalizedValue > 0.45) baseColor = customAccent;
        else baseColor = `${customAccent}66`;
      } else {
        // default/neon
        if (normalizedValue > 0.8) baseColor = '#ff3333';
        else if (normalizedValue > 0.5) baseColor = '#ffcc11';
        else baseColor = '#00ff44';
      }

      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.arc(x, y, 3 + value * 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  ctx.restore();
}
