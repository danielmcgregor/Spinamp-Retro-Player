import React from 'react';

export function drawFire(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  dataArray: Uint8Array,
  visTheme: string,
  visSensitivity: number,
  embersRef: React.MutableRefObject<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; life: number; maxLife: number }[]>,
  width: number,
  height: number,
  beatPulse: number = 0
): void {
  const bufferLength = dataArray.length;

  // Get overall bass energy for spark spawning density and coal bed throbbing
  const bassSum = ((dataArray[0] || 0) + (dataArray[1] || 0) + (dataArray[2] || 0) + (dataArray[3] || 0)) / 4;
  const bassNormalized = Math.min(1.0, bassSum / 255);

  // 1. Particle Sparks (Embers) Update and Render
  const baseSpawnCount = 40 + Math.floor(bassNormalized * 30);
  const beatBoost = 1 + beatPulse * 1.5; // up to 2.5x spawn rate at beat peak
  const maxEmbers = Math.floor(baseSpawnCount * beatBoost);
  
  const emberScale = Math.max(1.0, height / 64);
  if (embersRef.current.length < maxEmbers && Math.random() < 0.45) {
    const size = (Math.random() * 1.5 + 0.8) * Math.min(2.5, emberScale);
    const maxLife = 50 + Math.random() * 70;
    embersRef.current.push({
      x: Math.random() * width,
      y: height - 2,
      vx: (Math.random() - 0.5) * 1.4,
      vy: -(Math.random() * 1.2 + 0.6) * Math.min(2.5, emberScale) * (1.0 + bassNormalized * 1.0),
      size,
      alpha: 1.0,
      life: maxLife,
      maxLife
    });
  }

  // Update & draw embers
  for (let i = embersRef.current.length - 1; i >= 0; i--) {
    const p = embersRef.current[i];
    if (!p) continue;
    p.y += p.vy;
    p.x += p.vx + Math.sin(Date.now() * 0.01 + i) * 0.18; // organic drift
    p.life--;
    p.alpha = Math.max(0, p.life / p.maxLife);

    if (p.life <= 0 || p.y < 0 || p.x < 0 || p.x > width) {
      embersRef.current.splice(i, 1);
      continue;
    }

    ctx.beginPath();
    let sparkColor = `rgba(255, 160, 40, ${p.alpha})`;
    if (visTheme === 'cyberpunk') {
      sparkColor = `rgba(244, 114, 182, ${p.alpha})`;
    } else if (visTheme === 'amber') {
      sparkColor = `rgba(245, 158, 11, ${p.alpha})`;
    } else if (visTheme === 'aqua') {
      sparkColor = `rgba(6, 182, 212, ${p.alpha})`;
    } else if (visTheme === 'mono') {
      sparkColor = `rgba(220, 220, 225, ${p.alpha})`;
    }

    ctx.fillStyle = sparkColor;
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Draw Pulsing Coal / Ember-Bed Glow at the Bottom
  const hearthGlowHeight = Math.max(8, Math.floor(height * 0.18 + bassNormalized * 15));
  const glowGrad = ctx.createLinearGradient(0, height, 0, height - hearthGlowHeight);
  
  let glowColorBase = 'rgba(194, 12, 0, 0.4)';
  let glowColorTop = 'rgba(255, 85, 0, 0)';
  if (visTheme === 'cyberpunk') {
    glowColorBase = 'rgba(109, 40, 217, 0.35)';
  } else if (visTheme === 'amber') {
    glowColorBase = 'rgba(120, 53, 15, 0.4)';
  } else if (visTheme === 'aqua') {
    glowColorBase = 'rgba(30, 58, 138, 0.4)';
  } else if (visTheme === 'mono') {
    glowColorBase = 'rgba(39, 39, 42, 0.3)';
  }

  glowGrad.addColorStop(0, glowColorBase);
  glowGrad.addColorStop(1, glowColorTop);
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, height - hearthGlowHeight, width, hearthGlowHeight);

  // 3. LAYER 1: Deep / Broad Back Flames (Slower waves, lower heights, voluminous)
  const numBackFlames = 8;
  const backWidth = width / numBackFlames;
  for (let i = 0; i < numBackFlames; i++) {
    const binIdx = Math.floor((i / numBackFlames) * (bufferLength * 0.3));
    const binVal = dataArray[binIdx] || 0;
    const colIntens = Math.min(1.6, (binVal / 140) * visSensitivity);
    const sway = Math.sin(Date.now() * 0.003 + i * 2.3) * (2.0 + colIntens * 3.5);
    const size = Math.max(6, Math.floor(colIntens * height * 0.52 + Math.sin(Date.now() * 0.008 + i) * 6));
    const x = i * backWidth;
    
    const grad = ctx.createLinearGradient(x + backWidth / 2, height, x + backWidth / 2 + sway, height - size);
    if (visTheme === 'cyberpunk') {
      grad.addColorStop(0, 'rgba(76, 29, 149, 0.5)');
      grad.addColorStop(0.6, 'rgba(139, 92, 246, 0.15)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
    } else if (visTheme === 'amber') {
      grad.addColorStop(0, 'rgba(120, 53, 15, 0.5)');
      grad.addColorStop(0.6, 'rgba(180, 83, 9, 0.15)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
    } else if (visTheme === 'aqua') {
      grad.addColorStop(0, 'rgba(30, 58, 138, 0.5)');
      grad.addColorStop(0.6, 'rgba(3, 105, 124, 0.15)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
    } else if (visTheme === 'mono') {
      grad.addColorStop(0, 'rgba(39, 39, 42, 0.45)');
      grad.addColorStop(0.6, 'rgba(82, 82, 91, 0.12)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      grad.addColorStop(0, 'rgba(140, 6, 0, 0.6)');
      grad.addColorStop(0.5, 'rgba(215, 45, 0, 0.3)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x - 3, height);
    const ctrlX = x + backWidth / 2 + sway;
    const ctrlY = height - size;
    ctx.quadraticCurveTo(ctrlX, ctrlY, x + backWidth + 3, height);
    ctx.fill();
  }

  // 4. LAYER 2: Middle / High-Definition Flame Tongues (Responsive, fireplace centering)
  const numMidFlames = 13;
  const midWidth = width / numMidFlames;
  for (let i = 0; i < numMidFlames; i++) {
    const binIdx = Math.floor((i / numMidFlames) * (bufferLength * 0.45));
    const binVal = dataArray[binIdx] || 0;
    const colIntens = Math.min(2.0, (binVal / 110) * visSensitivity);
    
    const flickerSeed = Math.sin(Date.now() * (0.012 + colIntens * 0.02) + i * 4.1) * (3 + colIntens * 12);
    // Centered weighting boost to mirror a beautiful logs bonfire arrangement
    const centerFactor = 1.0 - Math.abs(i - (numMidFlames - 1) / 2) / (numMidFlames / 2) * 0.28;
    const size = Math.max(8, Math.floor(colIntens * height * 0.78 * centerFactor + flickerSeed + 4));
    const x = i * midWidth;

    const sway = Math.sin(Date.now() * 0.005 + i * 1.3) * (2.5 + colIntens * 5.0);
    const grad = ctx.createLinearGradient(x + midWidth / 2, height, x + midWidth / 2 + sway, height - size);

    if (visTheme === 'cyberpunk') {
      grad.addColorStop(0, '#6d28d9'); // purple base
      grad.addColorStop(0.35, '#ec4899'); // magenta
      grad.addColorStop(0.8, '#f472b6'); // hot pink
      grad.addColorStop(1, 'rgba(255,255,255,0)');
    } else if (visTheme === 'amber') {
      grad.addColorStop(0, '#78350f'); // deep amber
      grad.addColorStop(0.4, '#d97706'); // warm orange
      grad.addColorStop(0.85, '#fef08a'); // soft yellow
      grad.addColorStop(1, 'rgba(255,255,255,0)');
    } else if (visTheme === 'aqua') {
      grad.addColorStop(0, '#1e3a8a'); // dark blue
      grad.addColorStop(0.4, '#06b6d4'); // turquoise
      grad.addColorStop(0.8, '#a5f3fc'); // ice teal
      grad.addColorStop(1, 'rgba(255,255,255,0)');
    } else if (visTheme === 'mono') {
      grad.addColorStop(0, '#18181b'); // deep zinc base
      grad.addColorStop(0.4, '#71717a'); // zinc gray
      grad.addColorStop(0.85, '#fafafa'); // core white
      grad.addColorStop(1, 'rgba(255,255,255,0)');
    } else {
      grad.addColorStop(0, '#c20c00'); // lava red base
      grad.addColorStop(0.35, '#ff5500'); // burning orange
      grad.addColorStop(0.75, '#ffcc00'); // bright candle yellow
      grad.addColorStop(0.95, '#fffaee'); // superheated core tip
      grad.addColorStop(1, 'rgba(255,255,255,0)');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x, height);
    const ctrlX = x + midWidth / 2 + sway;
    const ctrlY = height - size;
    ctx.quadraticCurveTo(ctrlX, ctrlY, x + midWidth, height);
    ctx.fill();
  }

  // 5. LAYER 3: Core Heat Tongues (Narrow, extra bright, high frequency flutters)
  const numCoreFlames = 9;
  const coreWidth = width / numCoreFlames;
  for (let i = 0; i < numCoreFlames; i++) {
    const binIdx = Math.floor((i / numCoreFlames) * (bufferLength * 0.25) + 2);
    const binVal = dataArray[binIdx] || 0;
    const colIntens = Math.min(1.8, (binVal / 125) * visSensitivity);
    
    const flickerSeed = Math.sin(Date.now() * 0.024 + i * 5.3) * (2 + colIntens * 8);
    const size = Math.max(4, Math.floor(colIntens * height * 0.45 + flickerSeed + 2));
    const x = i * coreWidth + (coreWidth * 0.15); // make them narrower
    const actualWidth = coreWidth * 0.7;

    const sway = Math.sin(Date.now() * 0.007 + i * 2.1) * (1.5 + colIntens * 3.5);
    const grad = ctx.createLinearGradient(x + actualWidth / 2, height, x + actualWidth / 2 + sway, height - size);

    if (visTheme === 'cyberpunk') {
      grad.addColorStop(0, 'rgba(236, 72, 153, 0.8)');
      grad.addColorStop(0.6, '#fbcfe8'); // pink hot white
      grad.addColorStop(1, 'rgba(255,255,255,0)');
    } else if (visTheme === 'amber') {
      grad.addColorStop(0, 'rgba(217, 119, 6, 0.8)');
      grad.addColorStop(0.6, '#fef9c3'); // bright warm yellow
      grad.addColorStop(1, 'rgba(255,255,255,0)');
    } else if (visTheme === 'aqua') {
      grad.addColorStop(0, 'rgba(6, 182, 212, 0.8)');
      grad.addColorStop(0.6, '#ecfeff'); // ice hot white
      grad.addColorStop(1, 'rgba(255,255,255,0)');
    } else if (visTheme === 'mono') {
      grad.addColorStop(0, 'rgba(113, 113, 122, 0.8)');
      grad.addColorStop(0.6, '#ffffff'); // pure white
      grad.addColorStop(1, 'rgba(255,255,255,0)');
    } else {
      // Classic hot fireplace elements
      grad.addColorStop(0, 'rgba(255, 68, 0, 0.85)');
      grad.addColorStop(0.5, '#ffea88'); // scorching yellow
      grad.addColorStop(0.85, '#ffffff'); // ultra hot white core
      grad.addColorStop(1, 'rgba(255,255,255,0)');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x, height);
    const ctrlX = x + actualWidth / 2 + sway;
    const ctrlY = height - size;
    ctx.quadraticCurveTo(ctrlX, ctrlY, x + actualWidth, height);
    ctx.fill();
  }
}
