import React from 'react';

export interface KeygenState {
  stars: { x: number; y: number; z: number }[];
  copperPhase: number;
  scrollX: number;
  channelPeaks: number[];
  channelHold: number[];
}

export function drawKeygen(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  dataArray: Uint8Array,
  visTheme: string,
  visSensitivity: number,
  keygenRef: React.MutableRefObject<KeygenState>,
  width: number,
  height: number,
  beatPulse: number
): void {
  // 1. Initialize State if needed
  if (!keygenRef.current || keygenRef.current.stars.length === 0) {
    const starCount = 80;
    const stars = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: (Math.random() - 0.5) * width * 2,
        y: (Math.random() - 0.5) * height * 2,
        z: Math.random() * width,
      });
    }
    keygenRef.current = {
      stars,
      copperPhase: 0,
      scrollX: 0,
      channelPeaks: [0, 0, 0, 0],
      channelHold: [0, 0, 0, 0],
    };
  }

  const state = keygenRef.current;

  // Audio frequency calculations
  const bufferLength = dataArray.length;
  const bassSum = (dataArray[1] + dataArray[2] + dataArray[3] + dataArray[4]) / 4 || 0;
  const midSum = (dataArray[10] + dataArray[15] + dataArray[20]) / 3 || 0;
  const highSum = (dataArray[30] + dataArray[40] + dataArray[50]) / 3 || 0;

  const bassNormalized = (bassSum / 255) * visSensitivity;
  const midNormalized = (midSum / 255) * visSensitivity;
  const highNormalized = (highSum / 255) * visSensitivity;

  // Color Palette Theme Mapping
  let mainColor = '#00ffcc'; // Cyan
  let accentColor = '#ff00aa'; // Magenta
  let barColor = '#00ff66'; // Green
  let textColor = '#ffffff';

  if (visTheme === 'cyberpunk') {
    mainColor = '#ff007f';
    accentColor = '#00f0ff';
    barColor = '#ffe600';
  } else if (visTheme === 'amber') {
    mainColor = '#f59e0b';
    accentColor = '#d97706';
    barColor = '#fbbf24';
  } else if (visTheme === 'crimson') {
    mainColor = '#ef4444';
    accentColor = '#f97316';
    barColor = '#f43f5e';
  } else if (visTheme === 'aqua') {
    mainColor = '#06b6d4';
    accentColor = '#3b82f6';
    barColor = '#0ea5e9';
  } else if (visTheme === 'mono') {
    mainColor = '#e5e5e5';
    accentColor = '#a3a3a3';
    barColor = '#d4d4d4';
  } else if (visTheme === 'custom') {
    let customAccent = '#ff9100';
    try {
      const raw = window.getComputedStyle(document.body).getPropertyValue('--skin-accent');
      if (raw && raw.trim()) customAccent = raw.trim();
    } catch(e) {}
    mainColor = customAccent;
    accentColor = customAccent;
    barColor = customAccent;
  }

  // Clear Screen with dark chiptune background
  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, width, height);

  // 2. Draw Starfield (Warp Speed on Bass)
  const starSpeed = 1.5 + bassNormalized * 6;
  ctx.fillStyle = mainColor;
  for (let i = 0; i < state.stars.length; i++) {
    const star = state.stars[i]!;
    star.z -= starSpeed;
    if (star.z <= 0) {
      star.z = width;
      star.x = (Math.random() - 0.5) * width * 2;
      star.y = (Math.random() - 0.5) * height * 2;
    }

    const k = 120 / star.z;
    const px = star.x * k + width / 2;
    const py = star.y * k + height / 2;

    if (px >= 0 && px < width && py >= 0 && py < height) {
      const size = Math.max(1, (1 - star.z / width) * 2.5);
      const alpha = Math.min(1, (1 - star.z / width) * 1.2);
      ctx.globalAlpha = alpha;
      ctx.fillRect(px, py, size, size);
    }
  }
  ctx.globalAlpha = 1.0;

  // 3. Amiga Copper Raster Bars in Background
  state.copperPhase += 0.03 + bassNormalized * 0.05;
  const numCopperBars = 5;
  const barHeight = Math.max(4, Math.floor(height * 0.03));
  
  for (let i = 0; i < numCopperBars; i++) {
    const yPos = (height / 2) + Math.sin(state.copperPhase + i * 0.7) * (height * 0.35);
    const gradient = ctx.createLinearGradient(0, yPos - barHeight, 0, yPos + barHeight);
    
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    if (i % 2 === 0) {
      gradient.addColorStop(0.5, accentColor);
    } else {
      gradient.addColorStop(0.5, mainColor);
    }
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, yPos - barHeight, width, barHeight * 2);
  }

  // 4. Chunky Bouncing "KEYGEN" Logo Header
  ctx.save();
  const logoText = "K E Y G E N";
  const logoY = Math.max(18, height * 0.22) + Math.sin(state.copperPhase * 2) * (6 + bassNormalized * 10);
  
  ctx.font = '900 18px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillText(logoText, width / 2 + 2, logoY + 2);

  // Glowing Text
  ctx.fillStyle = mainColor;
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 8 + beatPulse * 12;
  ctx.fillText(logoText, width / 2, logoY);
  ctx.shadowBlur = 0;

  // Subtitle
  ctx.font = '700 8px monospace';
  ctx.fillStyle = barColor;
  ctx.fillText("— CHIPTUNE TRACKER CRACKTRO v2.0 —", width / 2, logoY + 14);
  ctx.restore();

  // 5. 4-Channel Amiga Paula Tracker Soundchip Meters
  const channelCount = 4;
  const channelWidth = Math.min(60, Math.floor((width - 40) / channelCount));
  const totalChannelsWidth = channelCount * channelWidth + (channelCount - 1) * 8;
  const startX = (width - totalChannelsWidth) / 2;
  const channelY = Math.max(logoY + 28, height * 0.45);
  const channelHeight = Math.max(30, height * 0.3);

  // Divide frequency spectrum into 4 chiptune channels (Bass, Low-Mid, High-Mid, Treble)
  const bandStep = Math.floor(bufferLength * 0.4 / channelCount);

  for (let c = 0; c < channelCount; c++) {
    let sum = 0;
    const startIdx = c * bandStep;
    for (let j = 0; j < bandStep; j++) {
      sum += dataArray[startIdx + j] || 0;
    }
    const val = (sum / bandStep / 255) * visSensitivity;
    const h = val * channelHeight;

    // Peak holding
    if (h >= state.channelPeaks[c]!) {
      state.channelPeaks[c] = h;
      state.channelHold[c] = 8;
    } else {
      if (state.channelHold[c]! > 0) {
        state.channelHold[c]!--;
      } else {
        state.channelPeaks[c] = Math.max(0, state.channelPeaks[c]! - 1.2);
      }
    }

    const cx = startX + c * (channelWidth + 8);

    // Channel Box Container
    ctx.fillStyle = 'rgba(10, 15, 25, 0.75)';
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 1;
    ctx.fillRect(cx, channelY, channelWidth, channelHeight);
    ctx.strokeRect(cx, channelY, channelWidth, channelHeight);

    // Channel Label
    ctx.font = '9px monospace';
    ctx.fillStyle = mainColor;
    ctx.textAlign = 'center';
    ctx.fillText(`CH${c + 1}`, cx + channelWidth / 2, channelY - 6);

    // VU Meter Fill
    const fillH = Math.min(channelHeight - 2, Math.max(0, h));
    ctx.fillStyle = c % 2 === 0 ? mainColor : accentColor;
    ctx.fillRect(cx + 2, channelY + channelHeight - fillH - 1, channelWidth - 4, fillH);

    // Chiptune Square Wave Overlay inside channel
    ctx.beginPath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    const waveY = channelY + channelHeight / 2;
    const cycle = 4 + c * 2;
    for (let wx = 0; wx < channelWidth - 4; wx++) {
      const sq = (Math.sin((wx / cycle) + state.copperPhase * 3) > 0 ? 1 : -1) * (val * 8);
      if (wx === 0) ctx.moveTo(cx + 2 + wx, waveY + sq);
      else ctx.lineTo(cx + 2 + wx, waveY + sq);
    }
    ctx.stroke();

    // Peak Indicator Dot
    const peakY = channelY + channelHeight - state.channelPeaks[c]! - 2;
    if (peakY >= channelY && peakY <= channelY + channelHeight) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + 2, peakY, channelWidth - 4, 1.5);
    }
  }

  // 6. Classic 8-Bit Marquee Scroller at Bottom
  state.scrollX += 1.2 + midNormalized * 1.5;
  const scrollText = "<<< SPINAMP v2.0 CHIPTUNE KEYGEN • AUDIO-REACTIVE TRACKER DEMO • GREETS TO: RAZOR 1911 • FAIRLIGHT • SKIDROW • FUTURE CREW • PROTRACKER • REASON • FL STUDIO • AMIGA 500 • SHOUTOUT TO ALL DEMOSCENERS WORLDWIDE! >>>   ";
  
  const scrollY = height - 12;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, height - 20, width, 20);
  ctx.strokeStyle = mainColor;
  ctx.beginPath();
  ctx.moveTo(0, height - 20);
  ctx.lineTo(width, height - 20);
  ctx.stroke();

  ctx.font = '700 10px monospace';
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';
  
  const textWidth = ctx.measureText(scrollText).width;
  if (state.scrollX > textWidth) {
    state.scrollX = 0;
  }

  ctx.fillText(scrollText, width - state.scrollX, scrollY);
  ctx.fillText(scrollText, width - state.scrollX + textWidth, scrollY);
}
