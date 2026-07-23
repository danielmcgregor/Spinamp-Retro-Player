import React from 'react';

export function drawAurora(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  dataArray: Uint8Array,
  visTheme: string,
  visSensitivity: number,
  auroraParticlesRef: React.MutableRefObject<{ x: number; y: number; speed: number; size: number; alpha: number; angle: number }[]>,
  width: number,
  height: number
): void {
  const bufferLength = dataArray.length;

  // Calculate average energy in three main bands (Bass, Mid, Treble) with smoothing
  let bassSum = 0, midSum = 0, trebleSum = 0;
  const bandWidth = Math.floor(bufferLength / 3);
  for (let i = 0; i < bandWidth; i++) {
    bassSum += dataArray[i] || 0;
    midSum += dataArray[i + bandWidth] || 0;
    trebleSum += dataArray[i + bandWidth * 2] || 0;
  }
  const bassEnergy = (bassSum / bandWidth / 255) * visSensitivity;
  const midEnergy = (midSum / bandWidth / 255) * visSensitivity;
  const trebleEnergy = (trebleSum / bandWidth / 255) * visSensitivity;

  // Clear backdrop with deep velvet night sky
  ctx.fillStyle = '#010103';
  ctx.fillRect(0, 0, width, height);

  const time = Date.now() * 0.001;

  // Subtle glowing atmospheric backdrop that pulses with the bass!
  const ambientGlow = ctx.createRadialGradient(
    width * 0.5, height * 0.4, 5,
    width * 0.5, height * 0.4, width * 0.75
  );
  
  let glowR = 8, glowG = 24, glowB = 16;
  if (visTheme === 'cyberpunk') {
    glowR = 32; glowG = 8; glowB = 32;
  } else if (visTheme === 'amber') {
    glowR = 32; glowG = 16; glowB = 4;
  } else if (visTheme === 'aqua') {
    glowR = 4; glowG = 24; glowB = 24;
  } else if (visTheme === 'mono') {
    glowR = 16; glowG = 16; glowB = 16;
  }
  const maxGlowAlpha = 0.05 + bassEnergy * 0.08;
  ambientGlow.addColorStop(0, `rgba(${glowR}, ${glowG}, ${glowB}, ${maxGlowAlpha})`);
  ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = ambientGlow;
  ctx.fillRect(0, 0, width, height);

  // 1. Render gentle stellar dust / airglow particles
  if (auroraParticlesRef.current.length === 0) {
    for (let p = 0; p < 25; p++) {
      auroraParticlesRef.current.push({
        x: Math.random() * width,
        y: Math.random() * (height * 0.8),
        speed: 0.12 + Math.random() * 0.28,
        size: 0.8 + Math.random() * 1.8,
        alpha: 0.08 + Math.random() * 0.45,
        angle: Math.random() * Math.PI * 2
      });
    }
  }

  ctx.fillStyle = '#ffffff';
  for (let p = 0; p < auroraParticlesRef.current.length; p++) {
    const part = auroraParticlesRef.current[p]!;
    const shimmer = Math.sin(time * 1.2 + p) * 0.3 + 0.7;
    ctx.globalAlpha = part.alpha * shimmer * (0.35 + midEnergy * 0.65);
    ctx.beginPath();
    ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
    ctx.fill();

    // Drifts slowly from right to left
    part.x -= part.speed * (1.0 + bassEnergy * 0.6);
    part.y += Math.sin(part.angle + time * 0.15) * 0.06;

    if (part.x < -10) {
      part.x = width + 10;
      part.y = Math.random() * (height * 0.8);
    }
  }
  ctx.globalAlpha = 1.0;

  // 2. Render 3 layered fluid, magnetic curtains of aurora
  const numCurtains = 3;

  for (let c = 0; c < numCurtains; c++) {
    const pathPoints: { x: number; y: number; height: number }[] = [];
    const step = width / 24;
    const yCenter = height * 0.32 + c * (height * 0.06);
    const energyFactor = c === 0 ? bassEnergy : (c === 1 ? midEnergy : trebleEnergy);

    for (let x = -step; x <= width + step; x += step) {
      const speed = 0.45 + energyFactor * 0.7;
      const f1 = 0.005 + c * 0.0025;
      const f2 = 0.011 + c * 0.004;
      const f3 = 0.024 + c * 0.006;

      const w1 = Math.sin(x * f1 + time * (speed * 0.65) + c * 1.8) * (14 + energyFactor * 22);
      const w2 = Math.cos(x * f2 - time * (speed * 1.1) + c * 0.9) * (8 + energyFactor * 12);
      const w3 = Math.sin(x * f3 + time * (speed * 1.9) + c * 2.4) * (4 + energyFactor * 6);
      const dynamicY = yCenter + w1 + w2 + w3;

      const hFreq = 0.004 + c * 0.0015;
      const hOsc = Math.sin(x * hFreq - time * 0.18) * 12;
      const baseH = height * 0.42 + energyFactor * height * 0.35;
      const curtainHeight = Math.max(16, baseH + hOsc);

      pathPoints.push({ x, y: dynamicY, height: curtainHeight });
    }

    // Draw individual curved wave slice strands to build up the pleated "curtain folds"
    for (let xPos = 0; xPos < width; xPos += 2) {
      let before = pathPoints[0]!, after = pathPoints[pathPoints.length - 1]!;
      for (let j = 0; j < pathPoints.length - 1; j++) {
        if (xPos >= pathPoints[j]!.x && xPos <= pathPoints[j+1]!.x) {
          before = pathPoints[j]!;
          after = pathPoints[j+1]!;
          break;
        }
      }
      const ratio = (xPos - before.x) / (after.x - before.x || 1);
      const currentY = before.y + (after.y - before.y) * ratio;
      const currentH = before.height + (after.height - before.height) * ratio;

      // Ripple shimmer
      const shimmer = Math.cos(xPos * 0.14 - time * (1.8 + energyFactor * 2.5)) * 0.25 + 0.75;
      const alphaValue = Math.min(0.68, (0.16 + energyFactor * 0.36) * shimmer * (c === 0 ? 0.65 : c === 1 ? 0.85 : 0.55));

      // Gentle magnetic shear / diagonal drift wind bend
      const shear = Math.sin(time * 0.22 + xPos * 0.005 + c) * 16 * (currentH / height);
      const endX = xPos + shear;
      const endY = currentY - currentH;

      const grad = ctx.createLinearGradient(xPos, currentY + currentH * 0.25, endX, endY);
      
      if (visTheme === 'cyberpunk') {
        grad.addColorStop(0, `rgba(168, 85, 247, ${alphaValue * 0.05})`);
        grad.addColorStop(0.3, `rgba(236, 72, 153, ${alphaValue * 0.85})`);
        grad.addColorStop(0.7, `rgba(59, 130, 246, ${alphaValue * 0.6})`);
        grad.addColorStop(0.95, `rgba(34, 211, 238, ${alphaValue * 0.2})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
      } else if (visTheme === 'amber') {
        grad.addColorStop(0, `rgba(120, 53, 4, ${alphaValue * 0.05})`);
        grad.addColorStop(0.35, `rgba(245, 158, 11, ${alphaValue * 0.95})`);
        grad.addColorStop(0.75, `rgba(253, 224, 71, ${alphaValue * 0.7})`);
        grad.addColorStop(0.95, `rgba(255, 255, 255, ${alphaValue * 0.25})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
      } else if (visTheme === 'aqua') {
        grad.addColorStop(0, `rgba(8, 51, 68, ${alphaValue * 0.05})`);
        grad.addColorStop(0.3, `rgba(6, 182, 212, ${alphaValue * 0.95})`);
        grad.addColorStop(0.65, `rgba(16, 185, 129, ${alphaValue * 0.8})`);
        grad.addColorStop(0.95, `rgba(129, 140, 248, ${alphaValue * 0.4})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
      } else if (visTheme === 'mono') {
        grad.addColorStop(0, `rgba(39, 39, 42, ${alphaValue * 0.02})`);
        grad.addColorStop(0.35, `rgba(161, 161, 170, ${alphaValue * 0.9})`);
        grad.addColorStop(0.75, `rgba(244, 244, 245, ${alphaValue * 0.7})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
      } else {
        if (c === 0) {
          grad.addColorStop(0, `rgba(2, 48, 32, ${alphaValue * 0.05})`);
          grad.addColorStop(0.35, `rgba(4, 120, 87, ${alphaValue * 0.85})`);
          grad.addColorStop(0.72, `rgba(16, 185, 129, ${alphaValue * 0.6})`);
          grad.addColorStop(0.95, `rgba(6, 182, 212, ${alphaValue * 0.4})`);
        } else if (c === 1) {
          grad.addColorStop(0, `rgba(4, 47, 46, ${alphaValue * 0.05})`);
          grad.addColorStop(0.35, `rgba(13, 148, 136, ${alphaValue * 0.95})`);
          grad.addColorStop(0.7, `rgba(6, 182, 212, ${alphaValue * 0.75})`);
          grad.addColorStop(0.92, `rgba(139, 92, 246, ${alphaValue * 0.55})`);
        } else {
          grad.addColorStop(0, `rgba(30, 4, 60, ${alphaValue * 0.02})`);
          grad.addColorStop(0.3, `rgba(139, 92, 246, ${alphaValue * 0.85})`);
          grad.addColorStop(0.65, `rgba(219, 39, 119, ${alphaValue * 0.65})`);
          grad.addColorStop(0.92, `rgba(6, 182, 212, ${alphaValue * 0.5})`);
        }
        grad.addColorStop(1, 'rgba(0,0,0,0)');
      }

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(xPos, currentY + currentH * 0.25);
      // Bends the drape in a elegant curve mimicking the celestial wind!
      ctx.quadraticCurveTo(xPos + shear * 0.4, currentY - currentH * 0.35, endX, endY);
      ctx.stroke();
    }
  }
}
