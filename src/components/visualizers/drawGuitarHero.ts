import React from 'react';

export interface GuitarHeroRefs {
  guitarHeroNotesRef: React.MutableRefObject<{ lane: number; z: number; hit: boolean; color: string }[]>;
  guitarHeroComboRef: React.MutableRefObject<number>;
  guitarHeroMultiplierRef: React.MutableRefObject<number>;
  guitarHeroLastSpawnTimeRef: React.MutableRefObject<number[]>;
  guitarHeroParticlesRef: React.MutableRefObject<{ x: number; y: number; vx: number; vy: number; color: string; size: number; alpha: number; life: number; maxLife: number }[]>;
  guitarHeroTargetPulseRef: React.MutableRefObject<number[]>;
  guitarHeroRockMeterRef: React.MutableRefObject<number>;
}

export function drawGuitarHero(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  dataArray: Uint8Array,
  visTheme: string,
  visSensitivity: number,
  isPlaying: boolean,
  refs: GuitarHeroRefs,
  width: number,
  height: number
): void {
  const bufferLength = dataArray.length;

  const {
    guitarHeroNotesRef,
    guitarHeroComboRef,
    guitarHeroMultiplierRef,
    guitarHeroLastSpawnTimeRef,
    guitarHeroParticlesRef,
    guitarHeroTargetPulseRef,
    guitarHeroRockMeterRef
  } = refs;

  const cx = width / 2;
  const cy = height / 2;

  const roundedRectHelper = (xt: number, yt: number, wt: number, ht: number, rt: number) => {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(xt, yt, wt, ht, rt);
    } else {
      ctx.moveTo(xt + rt, yt);
      ctx.lineTo(xt + wt - rt, yt);
      ctx.quadraticCurveTo(xt + wt, yt, xt + wt, yt + rt);
      ctx.lineTo(xt + wt, yt + ht - rt);
      ctx.quadraticCurveTo(xt + wt, yt + ht, xt + wt - rt, yt + ht);
      ctx.lineTo(xt + rt, yt + ht);
      ctx.quadraticCurveTo(xt, yt + ht, xt, yt + ht - rt);
      ctx.lineTo(xt, yt + rt);
      ctx.quadraticCurveTo(xt, yt, xt + rt, yt);
      ctx.closePath();
    }
  };

  // 1. Perspective parameters
  const horizonY = height * 0.18;
  const bottomY = height * 0.90;
  const topW = Math.min(width, height) * 0.22;
  const bottomW = Math.min(width, height) * 1.05;

  const projectPoint = (laneNorm: number, z: number) => {
    const pZ = z * z; // non-linear speed-up feeling
    const curW = topW + (bottomW - topW) * pZ;
    const px = cx + laneNorm * (curW / 2);
    const py = horizonY + (bottomY - horizonY) * pZ;
    const scale = 0.25 + 0.75 * pZ;
    return { x: px, y: py, scale };
  };

  // 2. 5-Lane Guitar Hero color definitions & frequency ranges
  const bands = [
    { start: 0, end: Math.max(1, Math.floor(bufferLength * 0.02)), thresh: 135, color: '#10b981', glow: '#34d399' }, // Green (Bass)
    { start: Math.floor(bufferLength * 0.02) + 1, end: Math.floor(bufferLength * 0.06), thresh: 120, color: '#ef4444', glow: '#f87171' }, // Red (Low-Mids)
    { start: Math.floor(bufferLength * 0.06) + 1, end: Math.floor(bufferLength * 0.14), thresh: 110, color: '#fbbf24', glow: '#fde047' }, // Yellow (Mids)
    { start: Math.floor(bufferLength * 0.14) + 1, end: Math.floor(bufferLength * 0.24), thresh: 105, color: '#3b82f6', glow: '#60a5fa' }, // Blue (High-Mids)
    { start: Math.floor(bufferLength * 0.24) + 1, end: Math.floor(bufferLength * 0.45), thresh: 100, color: '#f97316', glow: '#fb923c' }  // Orange (High Treble)
  ];

  // Compute overall average energy for glow background pulses
  let totalVol = 0;
  const volUpperLimit = Math.floor(bufferLength * 0.4);
  for (let i = 0; i < volUpperLimit; i++) {
    totalVol += dataArray[i] || 0;
  }
  const avgVol = volUpperLimit > 0 ? (totalVol / volUpperLimit) : 0;
  const beatIntensity = Math.min(1.0, avgVol / 125) * visSensitivity;

  // 3. Fretboard highway construction
  ctx.save();
  ctx.fillStyle = '#0a0a0d';
  ctx.beginPath();
  const topLeft = projectPoint(-1.05, 0);
  const topRight = projectPoint(1.05, 0);
  const bottomLeft = projectPoint(-1.05, 1);
  const bottomRight = projectPoint(1.05, 1);
  ctx.moveTo(topLeft.x, topLeft.y);
  ctx.lineTo(topRight.x, topRight.y);
  ctx.lineTo(bottomRight.x, bottomRight.y);
  ctx.lineTo(bottomLeft.x, bottomLeft.y);
  ctx.closePath();
  ctx.fill();

  // Outer guardrails with ambient neon wireglow
  let themeRGB = '16,185,129';
  if (visTheme === 'cyberpunk') themeRGB = '236,72,153';
  else if (visTheme === 'amber') themeRGB = '245,158,11';
  else if (visTheme === 'aqua') themeRGB = '6,182,212';
  else if (visTheme === 'crimson') themeRGB = '225,29,72';
  else if (visTheme === 'mono') themeRGB = '255,255,255';
  else if (visTheme === 'custom') {
    let customAccent = '#ff9100';
    try {
      const raw = window.getComputedStyle(document.body).getPropertyValue('--skin-accent');
      if (raw && raw.trim()) customAccent = raw.trim();
    } catch(e){}
    const c = customAccent.startsWith('#') ? customAccent.substring(1) : 'ff9100';
    const rgb = parseInt(c, 16);
    themeRGB = `${(rgb >> 16) & 0xff},${(rgb >> 8) & 0xff},${rgb & 0xff}`;
  }
  
  ctx.strokeStyle = `rgba(${themeRGB},0.5)`;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(topLeft.x, topLeft.y);
  ctx.lineTo(bottomLeft.x, bottomLeft.y);
  ctx.moveTo(topRight.x, topRight.y);
  ctx.lineTo(bottomRight.x, bottomRight.y);
  ctx.stroke();

  // Draw horizontal scrolling fret guidelines (making the highway feel super-fast)
  const fretLinesCount = 7;
  const scrollSpeed = 0.005;
  const scrollPhase = isPlaying ? (Date.now() * scrollSpeed) % (1 / fretLinesCount) : 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= fretLinesCount; i++) {
    const lineZ = (i / fretLinesCount) + scrollPhase;
    if (lineZ > 1) continue;
    ctx.beginPath();
    const leftEnd = projectPoint(-1, lineZ);
    const rightEnd = projectPoint(1, lineZ);
    ctx.moveTo(leftEnd.x, leftEnd.y);
    ctx.lineTo(rightEnd.x, rightEnd.y);
    ctx.stroke();
  }

  // Draw vertical lane dividers convergent lines
  ctx.strokeStyle = 'rgba(255,255,255,0.062)';
  ctx.lineWidth = 1;
  for (let j = 0; j <= 5; j++) {
    const laneNorm = -1 + (j * 2) / 5;
    ctx.beginPath();
    const pStart = projectPoint(laneNorm, 0);
    const pEnd = projectPoint(laneNorm, 1);
    ctx.moveTo(pStart.x, pStart.y);
    ctx.lineTo(pEnd.x, pEnd.y);
    ctx.stroke();
  }

  // 4. Strum collision crossline
  const targetZ = 0.84;
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  const targetLeft = projectPoint(-1, targetZ);
  const targetRight = projectPoint(1, targetZ);
  ctx.moveTo(targetLeft.x, targetLeft.y);
  ctx.lineTo(targetRight.x, targetRight.y);
  ctx.stroke();

  // 5. Spawn & Physics updates for Notes
  const nowMs = Date.now();
  const noteSpeed = isPlaying ? 0.019 : 0; 

  // Dampen strum target pulses steadily over time
  for (let i = 0; i < 5; i++) {
    guitarHeroTargetPulseRef.current[i] = Math.max(0, guitarHeroTargetPulseRef.current[i] - 0.1);
  }

  if (isPlaying) {
    bands.forEach((band, i) => {
      let sum = 0;
      for (let k = band.start; k <= band.end; k++) {
        sum += dataArray[k] || 0;
      }
      const avg = sum / (band.end - band.start + 1);

      // Cooldown timer and threshold to make notes clean and spaced
      const timeSinceLastSpawn = nowMs - guitarHeroLastSpawnTimeRef.current[i]!;
      if (avg > band.thresh * (1 / (visSensitivity || 1.0)) && timeSinceLastSpawn > 185) {
        guitarHeroNotesRef.current.push({
          lane: i,
          z: 0.0,
          hit: false,
          color: band.color
        });
        guitarHeroLastSpawnTimeRef.current[i] = nowMs;
        guitarHeroTargetPulseRef.current[i] = 1.0;
      }
    });
  }

  const notes = guitarHeroNotesRef.current;
  const activeNotes: typeof notes = [];

  notes.forEach((note) => {
    if (isPlaying) {
      note.z += noteSpeed;
    }

    // AUTO-STRUM COLLISION DETECTION when note reaches perfect target range
    if (!note.hit && note.z >= targetZ - 0.04 && note.z <= targetZ + 0.04) {
      note.hit = true;
      guitarHeroTargetPulseRef.current[note.lane] = 1.3; 

      const laneCenterNorm = -1 + (note.lane + 0.5) * (2 / 5);
      const pCoords = projectPoint(laneCenterNorm, targetZ);

      // Scoring increment
      guitarHeroComboRef.current += 1;
      const combo = guitarHeroComboRef.current;
      
      if (combo >= 40) {
        guitarHeroMultiplierRef.current = 4;
      } else if (combo >= 20) {
        guitarHeroMultiplierRef.current = 3;
      } else if (combo >= 10) {
        guitarHeroMultiplierRef.current = 2;
      } else {
        guitarHeroMultiplierRef.current = 1;
      }

      // Swing rock gauge upwards (max 100)
      guitarHeroRockMeterRef.current = Math.min(100, guitarHeroRockMeterRef.current + 3.2);

      // Spawn sparkling 3D note impact explosion particles!
      for (let sip = 0; sip < 10; sip++) {
        guitarHeroParticlesRef.current.push({
          x: pCoords.x,
          y: pCoords.y,
          vx: (Math.random() - 0.5) * 4.5,
          vy: -Math.random() * 4.5 - 1.2,
          color: note.color,
          size: Math.random() * 3 + 1.2,
          alpha: 1.0,
          life: 0,
          maxLife: Math.random() * 16 + 14
        });
      }
    }

    const cleanOffLimit = 1.1;
    if (note.z < cleanOffLimit) {
      activeNotes.push(note);
    } else if (!note.hit) {
      // Note flew off completely missed! Reset combos
      guitarHeroComboRef.current = 0;
      guitarHeroMultiplierRef.current = 1;
      guitarHeroRockMeterRef.current = Math.max(0, guitarHeroRockMeterRef.current - 5.5);
    }
  });

  guitarHeroNotesRef.current = activeNotes;

  // 6. Draw the 5 responsive Target fret buttons
  bands.forEach((band, i) => {
    const laneCenterNorm = -1 + (i + 0.5) * (2 / 5);
    const pos = projectPoint(laneCenterNorm, targetZ);
    const pulse = guitarHeroTargetPulseRef.current[i] || 0;
    const size = 10.5 * pos.scale * (1 + pulse * 0.18);

    // Strum ring glow shadow backplate
    ctx.shadowBlur = 8 * (1 + pulse);
    ctx.shadowColor = band.color;

    // Translucent ring fill
    ctx.strokeStyle = band.color;
    ctx.lineWidth = 2.4 + pulse * 1.8;
    ctx.fillStyle = pulse > 0 ? `rgba(${pulse * 100}, ${pulse * 100}, ${pulse * 100}, 0.22)` : 'rgba(0,0,0,0.5)';
    
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Slashed indicator ticks on the ring
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = band.color;
    ctx.lineWidth = 1.2;
    for (let aIdx = 0; aIdx < 4; aIdx++) {
      const theta = (aIdx * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(pos.x + Math.cos(theta) * (size * 0.5), pos.y + Math.sin(theta) * (size * 0.5));
      ctx.lineTo(pos.x + Math.cos(theta) * size, pos.y + Math.sin(theta) * size);
      ctx.stroke();
    }
  });

  // 7. Render high-fidelity 3D gems rushing down the highway
  guitarHeroNotesRef.current.forEach((note) => {
    if (note.hit && note.z > targetZ) return;

    const laneCenterNorm = -1 + (note.lane + 0.5) * (2 / 5);
    const pos = projectPoint(laneCenterNorm, note.z);
    const noteW = 12.5 * pos.scale;
    const noteH = 5.5 * pos.scale;

    ctx.save();
    ctx.shadowBlur = 12 * pos.scale;
    ctx.shadowColor = note.color;

    // Main body
    ctx.fillStyle = note.color;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, noteW, noteH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Floating highlight core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y - 1.2 * pos.scale, noteW * 0.54, noteH * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner dark pattern
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, noteW * 0.8, noteH * 0.8, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  });

  // 8. Particle Spark Simulation update & render runs
  guitarHeroParticlesRef.current.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08; 
    p.life += 1;
    p.alpha = 1.0 - (p.life / p.maxLife);

    if (p.life < p.maxLife) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 6;
      ctx.shadowColor = p.color;
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  });
  guitarHeroParticlesRef.current = guitarHeroParticlesRef.current.filter((p) => p.life < p.maxLife);

  ctx.restore(); // restore first road state

  // 9. Floating Retro-fretboard Dashboard (Combo count, Multiplier ring and Rock-meter)
  const isLarge = width > 285;
  if (isLarge) {
    // A. COMBO / STREAK CONSOLE (Left Floating Panel)
    const panelX = 22;
    const panelY = height * 0.53;
    const mult = guitarHeroMultiplierRef.current;
    const comboCount = guitarHeroComboRef.current;

    ctx.save();
    ctx.fillStyle = 'rgba(8, 8, 12, 0.78)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    
    roundedRectHelper(panelX - 16, panelY - 26, 32, 52, 4);
    ctx.fill();
    ctx.stroke();

    // Category text
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 5px "JetBrains Mono", monospace';
    ctx.fillText('COMBO', panelX, panelY - 14);

    // Huge score value
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Space Grotesk", sans-serif';
    ctx.fillText(comboCount.toString(), panelX, panelY + 2);

    // Mult design badge
    const multiBadgeColor = mult === 4 ? '#ec4899' : mult === 3 ? '#3b82f6' : mult === 2 ? '#fbbf24' : '#10b981';
    ctx.fillStyle = multiBadgeColor;
    roundedRectHelper(panelX - 11, panelY + 9, 22, 11, 2);
    ctx.fill();

    ctx.fillStyle = '#0a0a0c';
    ctx.font = '900 7px "Space Grotesk", sans-serif';
    ctx.fillText(`${mult}X`, panelX, panelY + 17.5);

    // Bonus flash glow on rich streak activation combo
    if (comboCount >= 10 && (Math.floor(Date.now() / 200) % 2 === 0)) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
    ctx.restore();


    // B. SKID-FREE GAUGE ROCK METER (Right Floating Panel)
    const rMeterX = width - 22;
    const rMeterY = height * 0.53;
    const rockScale = guitarHeroRockMeterRef.current;

    ctx.save();
    ctx.fillStyle = 'rgba(8, 8, 12, 0.78)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(rMeterX, rMeterY, 17.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner fan zones
    const startAngle = Math.PI * 0.85;
    const endAngle = Math.PI * 2.15;
    const angleSpan = endAngle - startAngle;

    const drawMeterArc = (as: number, ae: number, aCol: string) => {
      ctx.strokeStyle = aCol;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(rMeterX, rMeterY, 13.5, as, ae);
      ctx.stroke();
    };

    drawMeterArc(startAngle, startAngle + angleSpan * 0.33, '#ef4444');
    drawMeterArc(startAngle + angleSpan * 0.33, startAngle + angleSpan * 0.66, '#fbbf24');
    drawMeterArc(startAngle + angleSpan * 0.66, endAngle, '#10b981');

    // Needle calculations
    const pct = rockScale / 100;
    const targetAngle = startAngle + angleSpan * pct;

    // Metal indicator needle
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.shadowBlur = 3;
    ctx.shadowColor = '#000000';
    ctx.beginPath();
    ctx.moveTo(rMeterX, rMeterY);
    ctx.lineTo(rMeterX + Math.cos(targetAngle) * 12.5, rMeterY + Math.sin(targetAngle) * 12.5);
    ctx.stroke();

    // Small metallic pointer core cap
    ctx.fillStyle = '#f1f5f9';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(rMeterX, rMeterY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 4px "JetBrains Mono", monospace';
    ctx.fillText('ROCK', rMeterX, rMeterY + 11);

    ctx.restore();
  }

  // Top horizon beat flare glow emissions
  const flarePulse = beatIntensity * 25;
  ctx.save();
  const horizonGlow = ctx.createRadialGradient(cx, horizonY - 12, 0, cx, horizonY - 12, 40 + flarePulse);
  horizonGlow.addColorStop(0, `rgba(${themeRGB},0.22)`);
  horizonGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = horizonGlow;
  ctx.beginPath();
  ctx.arc(cx, horizonY - 12, 40 + flarePulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
