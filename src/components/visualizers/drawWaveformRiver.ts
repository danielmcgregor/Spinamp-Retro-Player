import React from 'react';

export function drawWaveformRiver(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  dataArray: Uint8Array,
  visTheme: string,
  visSensitivity: number,
  historyRef: React.MutableRefObject<number[]>,
  width: number,
  height: number
): void {
  // Compute current overall amplitude (RMS-like average of the frequency 
  // data) as a single value representing "how loud is this frame"
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i];
  }
  const len = dataArray.length || 1;
  const currentAmplitude = (sum / len / 255) * visSensitivity;

  // Push the new sample, cap history length to avoid unbounded growth
  historyRef.current.push(currentAmplitude);
  const maxSamples = Math.floor(width / 2); // one sample per 2px of width
  if (historyRef.current.length > maxSamples) {
    historyRef.current.shift();
  }

  const centerY = height / 2;
  const sampleWidth = width / maxSamples;

  ctx.clearRect(0, 0, width, height);
  
  // Draw as a filled mirrored waveform (classic look: symmetric above/below center)
  ctx.beginPath();
  historyRef.current.forEach((amp, i) => {
    const x = i * sampleWidth;
    const barHeight = amp * height * 0.45;
    ctx.moveTo(x, centerY - barHeight);
    ctx.lineTo(x, centerY + barHeight);
  });
  
  // Apply theme color
  let baseColor = '#ff3333';
  if (visTheme === 'cyberpunk') {
    baseColor = '#10b981';
  } else if (visTheme === 'amber') {
    baseColor = '#f59e0b';
  } else if (visTheme === 'aqua') {
    baseColor = '#06b6d4';
  } else if (visTheme === 'crimson') {
    baseColor = '#ff1e43';
  } else if (visTheme === 'mono') {
    baseColor = 'rgba(240, 240, 240, 0.8)';
  } else if (visTheme === 'custom') {
    baseColor = '#ff9100';
    try {
      const raw = window.getComputedStyle(document.body).getPropertyValue('--skin-accent');
      if (raw && raw.trim()) {
        baseColor = raw.trim();
      }
    } catch (e) {}
  } else {
    // default/neon
    baseColor = '#00ff44';
  }

  ctx.strokeStyle = baseColor;
  ctx.lineWidth = sampleWidth * 0.8;
  ctx.lineCap = 'round';
  ctx.stroke();
}
