import React from 'react';

export interface VegasStripRefs {
  vegasCoinsRef: React.MutableRefObject<{ x: number; y: number; vx: number; vy: number; size: number; rotation: number; rotSpeed: number; color: string; life: number }[]>;
  vegasReelSymbolsRef: React.MutableRefObject<string[][]>;
  vegasReelOffsetsRef: React.MutableRefObject<number[]>;
  vegasReelTargetOffsetsRef: React.MutableRefObject<number[]>;
  vegasReelSpinningRef: React.MutableRefObject<boolean[]>;
  vegasReelSpeedRef: React.MutableRefObject<number[]>;
  vegasLastBassTriggerTimeRef: React.MutableRefObject<number>;
  vegasJackpotFlashRef: React.MutableRefObject<number>;
  vegasJackpotTextRef: React.MutableRefObject<string>;
}

export function drawVegasStrip(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  dataArray: Uint8Array,
  visTheme: string,
  visSensitivity: number,
  isPlaying: boolean,
  refs: VegasStripRefs,
  width: number,
  height: number,
  beatPulse: number = 0
): void {

  const {
    vegasCoinsRef,
    vegasReelSymbolsRef,
    vegasReelOffsetsRef,
    vegasReelTargetOffsetsRef,
    vegasReelSpinningRef,
    vegasReelSpeedRef,
    vegasLastBassTriggerTimeRef,
    vegasJackpotFlashRef,
    vegasJackpotTextRef
  } = refs;

  // Calculate energy bands
  let bassValue = 0;
  for (let i = 0; i < 8; i++) {
    bassValue += dataArray[i] || 0;
  }
  bassValue = bassValue / 8;

  let midValue = 0;
  for (let i = 8; i < 20; i++) {
    midValue += dataArray[i] || 0;
  }
  midValue = midValue / 12;

  let trebleValue = 0;
  for (let i = 20; i < 32; i++) {
    trebleValue += dataArray[i] || 0;
  }
  trebleValue = trebleValue / 12;

  const beatIntensity = Math.min(1.0, bassValue / 255) * visSensitivity;
  const beatDetected = bassValue > 170 * (1.75 - visSensitivity);
  const now = Date.now();

  // Draw the night sky backdrop with dark purple-blue gradients
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
  skyGrad.addColorStop(0, '#060412');
  skyGrad.addColorStop(0.5, '#0e0b24');
  skyGrad.addColorStop(1, '#050308');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // Draw starry twinkling sky
  ctx.save();
  const starSeed = Math.floor(now / 200);
  for (let s = 1; s <= 30; s++) {
    const sx = (Math.sin(s * 932) * 0.5 + 0.5) * width;
    const sy = (Math.sin(s * 534) * 0.5 + 0.5) * (height * 0.5);
    const twinkle = Math.sin(starSeed + s) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(255, 255, 220, ${twinkle * 0.7})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 0.8 + 0.4 * twinkle, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Handle Reel spin states
  if (beatDetected && (now - vegasLastBassTriggerTimeRef.current > 1200) && isPlaying) {
    vegasLastBassTriggerTimeRef.current = now;
    vegasReelSpinningRef.current = [true, true, true];
    vegasReelSpeedRef.current = [12 + Math.random() * 8, 16 + Math.random() * 8, 20 + Math.random() * 8];
    
    if (Math.random() < 0.35) {
      vegasJackpotFlashRef.current = 50; // frames
      const rewards = ['JACKPOT!', 'BIG WIN!', 'SUPER SPIN!', 'LUCKY 777!', 'WILD SPINAMP!'];
      vegasJackpotTextRef.current = rewards[Math.floor(Math.random() * rewards.length)]!;
    }
  }

  // Apply physics / updates to Reels
  for (let r = 0; r < 3; r++) {
    if (vegasReelSpinningRef.current[r]) {
      vegasReelOffsetsRef.current[r] += vegasReelSpeedRef.current[r]!;
      vegasReelSpeedRef.current[r] *= 0.93; // friction
      if (vegasReelSpeedRef.current[r]! < 0.2) {
        vegasReelSpinningRef.current[r] = false;
        vegasReelSpeedRef.current[r] = 0;
        // Snap to 40px symbol height intervals
        vegasReelOffsetsRef.current[r] = Math.round(vegasReelOffsetsRef.current[r]! / 40) * 40;
      }
    } else {
      // Drift slowly when not playing
      if (!isPlaying) {
        vegasReelOffsetsRef.current[r] += 0.25;
      } else {
        // idle motion
        vegasReelOffsetsRef.current[r] += (1.0 + r * 0.5);
      }
    }
  }

  const cx = width / 2;

  // 1. Draw glowing background Las Vegas styled wireframe mountains & monuments
  ctx.save();
  const horizonY = height * 0.72;

  // A. LAS VEGAS SWEEPING SKY SEARCHLIGHTS (Luxor-style and side sweepers)
  ctx.save();
  const searchlightCount = 3;
  const sweepColors = ['rgba(168, 85, 247, 0.45)', 'rgba(6, 182, 212, 0.45)', 'rgba(236, 72, 153, 0.45)'];
  const sweepGlowColors = ['#a855f7', '#06b6d4', '#ec4899'];
  
  for (let s = 0; s < searchlightCount; s++) {
    // Distinct frequency reactivity for searchlight beams
    const freqVal = dataArray[s * 15 + 20] || 0;
    const beamInten = (freqVal / 255) * visSensitivity;
    
    // Swing back and forth based on s & timer
    const swingPhase = now * 0.0012 + s * (Math.PI / 2.3);
    const angle = Math.sin(swingPhase) * 1.0; // Math swing angle in radians
    
    // X origin on searchlight bases
    const sX = cx + (s - 1) * (width * 0.24);
    const sY = horizonY - 10;
    
    // End points way up in sky
    const targetDist = height * 0.9;
    const endX = sX + Math.sin(angle) * targetDist;
    const endY = sY - Math.cos(angle) * targetDist;

    const beamGrad = ctx.createLinearGradient(sX, sY, endX, endY);
    beamGrad.addColorStop(0, `rgba(255, 255, 255, ${0.8 + 0.2 * beamInten})`);
    beamGrad.addColorStop(0.2, sweepColors[s]!);
    beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.shadowBlur = 12 + beamInten * 15;
    ctx.shadowColor = sweepGlowColors[s]!;
    ctx.fillStyle = beamGrad;

    // Draw a wider triangular spotlight beam
    const beamW = 10 + beamInten * 18;
    ctx.beginPath();
    ctx.moveTo(sX - 1, sY);
    ctx.lineTo(endX - beamW, endY);
    ctx.lineTo(endX + beamW, endY);
    ctx.lineTo(sX + 1, sY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // B. HIGH ROLLER FERRIS WHEEL (Background Left)
  ctx.save();
  const hrX = cx - width * 0.35;
  const hrY = horizonY - 48;
  const hrR = Math.min(width, height) * 0.15; // Ferris wheel rad

  // Base Support structure
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(hrX, hrY);
  ctx.lineTo(hrX - 16, horizonY);
  ctx.moveTo(hrX, hrY);
  ctx.lineTo(hrX + 16, horizonY);
  ctx.stroke();

  // Pulse neon rim of Ferris Wheel to mid ranges
  const rimGlow = 1.5 + (midValue / 255) * 12 * visSensitivity;
  ctx.strokeStyle = visTheme === 'cyberpunk' ? '#ec4899' : visTheme === 'amber' ? '#f59e0b' : visTheme === 'aqua' ? '#06b6d4' : '#10b981';
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = rimGlow;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(hrX, hrY, hrR, 0, Math.PI * 2);
  ctx.stroke();

  // Spokes
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
  ctx.lineWidth = 0.8;
  const spokesCount = 12;
  const spinAngle = now * 0.0003;
  for (let sp = 0; sp < spokesCount; sp++) {
    const theta = spinAngle + (sp * Math.PI * 2) / spokesCount;
    ctx.beginPath();
    ctx.moveTo(hrX, hrY);
    ctx.lineTo(hrX + Math.cos(theta) * hrR, hrY + Math.sin(theta) * hrR);
    ctx.stroke();
  }
  ctx.restore();

  // C. PARIS EIFFEL TOWER & STRIP HORIZON LINE
  ctx.save();
  const tX = cx + width * 0.32;
  const tY = horizonY;
  const tW = Math.min(width, height) * 0.14;
  const tH = Math.min(width, height) * 0.44;

  ctx.strokeStyle = 'rgba(226, 232, 240, 0.15)';
  ctx.fillStyle = '#090d16';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(tX - tW / 2, tY);
  ctx.lineTo(tX - tW * 0.15, tY - tH * 0.82);
  ctx.lineTo(tX - 1.5, tY - tH);
  ctx.lineTo(tX + 1.5, tY - tH);
  ctx.lineTo(tX + tW * 0.15, tY - tH * 0.82);
  ctx.lineTo(tX + tW / 2, tY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Slashed cross lattices
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let ly = tY - 10; ly >= tY - tH + 15; ly -= 15) {
    const ratio = (tY - ly) / tH;
    const curW = tW * (1.0 - ratio * 0.82);
    ctx.moveTo(tX - curW / 2, ly);
    ctx.lineTo(tX + curW / 2, ly);
    ctx.moveTo(tX - curW / 2, ly);
    ctx.lineTo(tX + curW / 2, ly - 15);
    ctx.moveTo(tX + curW / 2, ly);
    ctx.lineTo(tX - curW / 2, ly - 15);
  }
  ctx.stroke();

  // Glowing laser beacon on eiffel tower tip reacting to treble
  const towerTipGlow = 1 + (trebleValue / 255) * 16 * visSensitivity;
  ctx.strokeStyle = visTheme === 'cyberpunk' ? '#f472b6' : visTheme === 'amber' ? '#fbbf24' : visTheme === 'aqua' ? '#38bdf8' : '#34d399';
  ctx.lineWidth = 2.0;
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = towerTipGlow;
  ctx.beginPath();
  ctx.arc(tX, tY - tH, 2.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // D. THE VENETIAN ARCH & WIRE GIRDERS
  ctx.save();
  ctx.fillStyle = '#0d0d18';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(cx - 150, horizonY - 14, 40, 14);
  ctx.rect(cx - 100, horizonY - 24, 25, 24);
  ctx.rect(cx + 80, horizonY - 18, 30, 18);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // E. Solid dark ground horizon line
  ctx.fillStyle = '#050308';
  ctx.fillRect(0, horizonY, width, height - horizonY);

  ctx.strokeStyle = '#221c38';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(width, horizonY);
  ctx.stroke();
  ctx.restore();

  // 2. Draw Las Vegas style responsive EQ Neon Spectrum analyzer (on the floor)
  ctx.save();
  const eqW = width * 0.72;
  const eqX = cx - eqW / 2;
  const eqY = horizonY + 1;
  const numBars = 16;
  const barGap = 4;
  const barW = (eqW - (numBars - 1) * barGap) / numBars;

  for (let i = 0; i < numBars; i++) {
    const fIdx = Math.floor((i / numBars) * (dataArray.length * 0.4));
    const fVal = dataArray[fIdx] || 0;
    const fNorm = fVal / 255;
    const barVal = fNorm * 8.5 * visSensitivity;

    ctx.fillStyle = visTheme === 'cyberpunk' ? 'rgba(236,72,153, 0.72)' : visTheme === 'amber' ? 'rgba(245, 158, 11, 0.8)' : 'rgba(34, 211, 238, 0.8)';
    ctx.fillRect(eqX + i * (barW + barGap), eqY - barVal, barW, barVal);
  }

  // 3. Central Vegas Slot Machine Frame (Glows, pulses on beat!)
  const slotW = 100;
  const slotH = 50;
  const slotX = cx - slotW / 2;
  const slotY = horizonY + 8;

  ctx.save();
  ctx.fillStyle = '#1e1b4b'; // Slot casing deep indigo
  ctx.shadowColor = visTheme === 'cyberpunk' ? '#ec4899' : visTheme === 'amber' ? '#fbbf24' : visTheme === 'aqua' ? '#06b6d4' : '#10b981';
  ctx.shadowBlur = 4 + beatIntensity * 12;
  ctx.strokeStyle = '#4f46e5';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.rect(slotX, slotY, slotW, slotH);
  ctx.fill();
  ctx.stroke();

  // Inner slot housing trim
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.rect(slotX, slotY, slotW, slotH);
  ctx.fill();
  ctx.stroke();

  // Retro neon lighting strip around the reel borders
  ctx.strokeStyle = isPlaying ? (now % 300 < 150 ? '#00ffcc' : '#ff00ff') : '#475569';
  ctx.lineWidth = 1;
  ctx.shadowBlur = 4;
  ctx.shadowColor = ctx.strokeStyle;
  ctx.beginPath();
  ctx.rect(slotX + 3, slotY + 3, slotW - 6, slotH - 6);
  ctx.stroke();
  ctx.restore();

  // Draw the 3 Slot reels
  const reelW = 26;
  const reelH = 36;
  const reelY = slotY + 7;
  const startReelX = slotX + 8;

  ctx.save();
  for (let r = 0; r < 3; r++) {
    const rx = startReelX + r * 29;

    // Clip slot reels boundary so symbols scroll inside beautifully
    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, reelY, reelW, reelH);
    ctx.clip();

    // Background reel paper grad
    const reelPaper = ctx.createLinearGradient(rx, reelY, rx, reelY + reelH);
    reelPaper.addColorStop(0, '#0f1015');
    reelPaper.addColorStop(0.2, '#1e212b');
    reelPaper.addColorStop(0.5, '#ffffff'); // paper sheen
    reelPaper.addColorStop(0.8, '#1e212b');
    reelPaper.addColorStop(1, '#0f1015');
    ctx.fillStyle = reelPaper;
    ctx.fillRect(rx, reelY, reelW, reelH);

    // Draw symbols
    const symbols = vegasReelSymbolsRef.current[r]!;
    const totalSymbols = symbols.length;
    const symH = 40; // spacing
    const scrollOffset = vegasReelOffsetsRef.current[r]! % (totalSymbols * symH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '22px sans-serif';

    // Render three symbols around the visual target viewport
    for (let i = -1; i <= 2; i++) {
      const symIndex = (Math.floor(scrollOffset / symH) + i + totalSymbols * 10) % totalSymbols;
      const symbolStr = symbols[symIndex]!;
      const sy = reelY + reelH / 2 + (i * symH) - (scrollOffset % symH);
      
      // Draw shadowed symbol
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 3;
      ctx.fillText(symbolStr, rx + reelW / 2, sy);
    }
    ctx.restore();

    // Draw metal divider lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(rx, reelY, reelW, reelH);
    ctx.stroke();
  }
  ctx.restore();

  // Draw coin tray drop box below slot machine
  ctx.save();
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, slotY + slotH, 20, 4, 0, 0, Math.PI);
  ctx.stroke();
  ctx.fill();
  ctx.restore();

  // Draw Vegas Marquee classic Arch Sign behind / above slots
  ctx.save();
  const signY = slotY - 35;
  const signW = 120;
  const signH = 22;
  const signX = cx - signW / 2;

  // Draw diamond shaped neon frame
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#ef4444';
  ctx.fillStyle = 'rgba(5, 2, 10, 0.9)';
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(signX, signY, signW, signH);
  ctx.fill();
  ctx.stroke();

  const flashBoost = beatPulse * 0.4; // adds up to 40% extra brightness at beat peak
  
  // Blinking dot neon lights on frame border
  const bulbTick = Math.floor(now / 150) % 2;
  ctx.shadowBlur = 4 + flashBoost * 20;
  for (let bx = signX + 4; bx <= signX + signW - 4; bx += 10) {
    const cycleIndex = Math.floor((bx - signX) / 10);
    const bulbState = (cycleIndex + bulbTick) % 2 === 0;
    
    // Boost brightness with flashBoost
    const brightR = Math.min(255, 254 + flashBoost * 255);
    const brightG = Math.min(255, 240 + flashBoost * 255);
    const brightB = Math.min(255, 138 + flashBoost * 255);
    const dimR = Math.min(255, 180 + flashBoost * 255);
    const dimG = Math.min(255, 83 + flashBoost * 255);
    const dimB = Math.min(255, 9 + flashBoost * 255);

    ctx.fillStyle = bulbState ? `rgb(${brightR}, ${brightG}, ${brightB})` : `rgb(${dimR}, ${dimG}, ${dimB})`; // bright gold vs dim amber
    ctx.shadowColor = '#fef08a';
    // top border
    ctx.beginPath();
    ctx.arc(bx, signY, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // bottom border
    ctx.beginPath();
    ctx.arc(bx, signY + signH, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // text glowing in sign
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 9px "Space Grotesk", sans-serif';
  ctx.shadowColor = '#ec4899';
  ctx.shadowBlur = 6;
  ctx.fillText('LAS VEGAS SPINAMP', cx, signY + 7);
  
  ctx.fillStyle = '#38bdf8';
  ctx.font = '700 5px monospace';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 4;
  ctx.fillText('WINNER PAYOUTS ON BEATS', cx, signY + 16);
  ctx.restore();

  // 5. Spawn and update Coins
  if (isPlaying && vegasCoinsRef.current.length < 50) {
    // General music-reactive coin spawns on bass-heavy beats!
    if (beatDetected && Math.random() < 0.45) {
      for (let i = 0; i < 2; i++) {
        vegasCoinsRef.current.push({
          x: cx + (Math.random() - 0.5) * 40,
          y: slotY + slotH,
          vx: (Math.random() - 0.5) * 5,
          vy: -3 - Math.random() * 4,
          size: 3 + Math.random() * 4,
          rotation: Math.random() * Math.PI,
          rotSpeed: (Math.random() - 0.5) * 0.2,
          color: Math.random() > 0.4 ? 'gold' : (Math.random() > 0.5 ? '#ef4444' : '#3b82f6'),
          life: 100
        });
      }
    }
  }

  // Update/draw coin cascade
  ctx.save();
  const coins = vegasCoinsRef.current;
  for (let i = coins.length - 1; i >= 0; i--) {
    const p = coins[i]!;
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.22; // gravity physics
    p.rotation += p.rotSpeed;
    p.life--;

    // draw gold coin or chip
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    if (p.color === 'gold') {
      ctx.fillStyle = '#fbbf24'; // bright gold
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#b45309';
      ctx.font = `bold ${p.size * 0.8}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0.4);
    } else {
      ctx.fillStyle = p.color; // red/blue casino chip
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = p.size * 0.15;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // markings
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.setLineDash([1, 1]);
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    // Bouncing collision against floor
    if (p.y > height - p.size) {
      p.y = height - p.size;
      p.vy = -p.vy * 0.55; // bounce bounce elasticity
      p.vx *= 0.8;
    }

    if (p.life <= 0 || p.x < -10 || p.x > width + 10) {
      coins.splice(i, 1);
    }
  }
  ctx.restore();

  // 6. Draw Big Jackpot Overlay Banner when flashing!
  if (vegasJackpotFlashRef.current > 0) {
    vegasJackpotFlashRef.current--;
    
    // Neon billboard sign flashing in center
    ctx.save();
    ctx.translate(cx, slotY + 20);

    // Pulse scale
    const jackScale = 1.0 + Math.sin(now * 0.02) * 0.08;
    ctx.scale(jackScale, jackScale);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = now % 200 < 100 ? '#f59e0b' : '#ec4899';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = ctx.strokeStyle;
    
    ctx.beginPath();
    ctx.rect(-65, -16, 130, 32);
    ctx.fill();
    ctx.stroke();

    // Blinking marquee dots
    const mTick = Math.floor(now / 100) % 2;
    for (let mx = -60; mx <= 60; mx += 8) {
      ctx.fillStyle = (Math.floor(mx) + mTick) % 2 === 0 ? '#fbbf24' : '#ef4444';
      ctx.beginPath();
      ctx.arc(mx, -12, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(mx, 12, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px "Space Grotesk", sans-serif';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 8;
    ctx.fillText(vegasJackpotTextRef.current, 0, 0);

    ctx.restore();
  }
}
