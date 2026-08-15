import React from 'react';

export interface DemosceneState {
  angleX: number;
  angleY: number;
  angleZ: number;
  twisterPhase: number;
  stars: { x: number; y: number; z: number }[];
}

export function drawDemoscene(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  dataArray: Uint8Array,
  visTheme: string,
  visSensitivity: number,
  demosceneRef: React.MutableRefObject<DemosceneState>,
  width: number,
  height: number,
  beatPulse: number
): void {
  // 1. Initialize State
  if (!demosceneRef.current || demosceneRef.current.stars.length === 0) {
    const starCount = 100;
    const stars = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: (Math.random() - 0.5) * width * 2,
        y: (Math.random() - 0.5) * height * 2,
        z: Math.random() * width,
      });
    }
    demosceneRef.current = {
      angleX: 0,
      angleY: 0,
      angleZ: 0,
      twisterPhase: 0,
      stars,
    };
  }

  const state = demosceneRef.current;

  // Audio frequency energy calculation
  const bassSum = (dataArray[1] + dataArray[2] + dataArray[3] + dataArray[4]) / 4 || 0;
  const midSum = (dataArray[12] + dataArray[16] + dataArray[20]) / 3 || 0;
  const highSum = (dataArray[32] + dataArray[40] + dataArray[48]) / 3 || 0;

  const bassNormalized = (bassSum / 255) * visSensitivity;
  const midNormalized = (midSum / 255) * visSensitivity;
  const highNormalized = (highSum / 255) * visSensitivity;

  // Color theme selection
  let primaryColor = '#00ffaa'; // Neon Green/Mint
  let secondaryColor = '#ff0055'; // Neon Pink
  let tertiaryColor = '#00aaff'; // Cyan

  if (visTheme === 'cyberpunk') {
    primaryColor = '#ff00aa';
    secondaryColor = '#00f0ff';
    tertiaryColor = '#ffff00';
  } else if (visTheme === 'amber') {
    primaryColor = '#f59e0b';
    secondaryColor = '#ef4444';
    tertiaryColor = '#fcd34d';
  } else if (visTheme === 'crimson') {
    primaryColor = '#f43f5e';
    secondaryColor = '#fb923c';
    tertiaryColor = '#fda4af';
  } else if (visTheme === 'aqua') {
    primaryColor = '#06b6d4';
    secondaryColor = '#3b82f6';
    tertiaryColor = '#818cf8';
  } else if (visTheme === 'mono') {
    primaryColor = '#ffffff';
    secondaryColor = '#888888';
    tertiaryColor = '#cccccc';
  } else if (visTheme === 'custom') {
    let customAccent = '#ff9100';
    try {
      const raw = window.getComputedStyle(document.body).getPropertyValue('--skin-accent');
      if (raw && raw.trim()) customAccent = raw.trim();
    } catch(e) {}
    primaryColor = customAccent;
    secondaryColor = customAccent;
    tertiaryColor = '#ffffff';
  }

  // Clear canvas
  ctx.fillStyle = '#06070a';
  ctx.fillRect(0, 0, width, height);

  // 2. 3D Starfield Warp
  const warpSpeed = 1.2 + bassNormalized * 5.0;
  ctx.fillStyle = primaryColor;
  for (let i = 0; i < state.stars.length; i++) {
    const star = state.stars[i]!;
    star.z -= warpSpeed;
    if (star.z <= 0) {
      star.z = width;
      star.x = (Math.random() - 0.5) * width * 2;
      star.y = (Math.random() - 0.5) * height * 2;
    }

    const k = 100 / star.z;
    const px = star.x * k + width / 2;
    const py = star.y * k + height / 2;

    if (px >= 0 && px < width && py >= 0 && py < height) {
      const size = Math.max(1, (1 - star.z / width) * 2.8);
      ctx.globalAlpha = Math.min(1, (1 - star.z / width) * 1.5);
      ctx.fillRect(px, py, size, size);
    }
  }
  ctx.globalAlpha = 1.0;

  // 3. Dual Amiga Raster Waving Copper Bars
  state.twisterPhase += 0.02 + midNormalized * 0.03;
  const numBars = 6;
  for (let i = 0; i < numBars; i++) {
    const yPos = (height / 2) + Math.sin(state.twisterPhase + i * 0.5) * (height * 0.38);
    const bHeight = 6 + Math.sin(state.twisterPhase * 2 + i) * 3;

    const grad = ctx.createLinearGradient(0, yPos - bHeight, 0, yPos + bHeight);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, i % 2 === 0 ? secondaryColor : tertiaryColor);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, yPos - bHeight, width, bHeight * 2);
  }

  // 4. 3D Rotating Vector Twister / Hypercube
  state.angleX += 0.015 + bassNormalized * 0.02;
  state.angleY += 0.02 + midNormalized * 0.025;
  state.angleZ += 0.01 + highNormalized * 0.015;

  const centerX = width / 2;
  const centerY = height / 2;
  const scale = Math.min(width, height) * 0.22 * (1 + bassNormalized * 0.2 + beatPulse * 0.15);

  // Define 3D Cube Vertices
  const rawVertices = [
    [-1, -1, -1],
    [ 1, -1, -1],
    [ 1,  1, -1],
    [-1,  1, -1],
    [-1, -1,  1],
    [ 1, -1,  1],
    [ 1,  1,  1],
    [-1,  1,  1],
  ];

  // Rotate & Project Vertices with Audio Audio Deformation
  const projected: { x: number; y: number; z: number }[] = [];
  const cosX = Math.cos(state.angleX), sinX = Math.sin(state.angleX);
  const cosY = Math.cos(state.angleY), sinY = Math.sin(state.angleY);
  const cosZ = Math.cos(state.angleZ), sinZ = Math.sin(state.angleZ);

  for (let i = 0; i < rawVertices.length; i++) {
    const [vx, vy, vz] = rawVertices[i]!;
    
    // Add audio FFT pulse distortion per vertex
    const fftSample = (dataArray[i * 4] || 0) / 255 * visSensitivity * 0.4;
    const x0 = vx * (1 + fftSample);
    const y0 = vy * (1 + fftSample);
    const z0 = vz * (1 + fftSample);

    // 3D Rotations
    // X axis
    const y1 = y0 * cosX - z0 * sinX;
    const z1 = y0 * sinX + z0 * cosX;
    // Y axis
    const x2 = x0 * cosY + z1 * sinY;
    const z2 = -x0 * sinY + z1 * cosY;
    // Z axis
    const x3 = x2 * cosZ - y1 * sinZ;
    const y3 = x2 * sinZ + y1 * cosZ;

    // Perspective Projection
    const fov = 3.5;
    const distance = 4;
    const pz = z2 + distance;
    const projX = centerX + (x3 / pz) * scale * fov;
    const projY = centerY + (y3 / pz) * scale * fov;

    projected.push({ x: projX, y: projY, z: pz });
  }

  // Edges connecting cube vertices
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0], // Back face
    [4, 5], [5, 6], [6, 7], [7, 4], // Front face
    [0, 4], [1, 5], [2, 6], [3, 7]  // Connecting edges
  ];

  // Draw 3D Edges with Glowing Vector Style
  ctx.save();
  ctx.lineWidth = 2 + beatPulse * 2;
  ctx.strokeStyle = primaryColor;
  ctx.shadowColor = primaryColor;
  ctx.shadowBlur = 10 + beatPulse * 15;

  for (let i = 0; i < edges.length; i++) {
    const [startIdx, endIdx] = edges[i]!;
    const p1 = projected[startIdx]!;
    const p2 = projected[endIdx]!;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  // Draw Vertices as Glowing Spheres
  for (let i = 0; i < projected.length; i++) {
    const p = projected[i]!;
    ctx.fillStyle = secondaryColor;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5 + beatPulse * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 5. Classic Demoscene 3D Twister Column overlay at sides
  const twisterXLeft = width * 0.12;
  const twisterXRight = width * 0.88;
  const twisterSegments = 24;
  const segHeight = height / twisterSegments;

  ctx.lineWidth = 1.5;
  for (let side = 0; side < 2; side++) {
    const tx = side === 0 ? twisterXLeft : twisterXRight;
    ctx.beginPath();
    for (let i = 0; i <= twisterSegments; i++) {
      const sy = i * segHeight;
      const tAngle = state.twisterPhase * 3 + (i * 0.25);
      const w = Math.sin(tAngle) * (15 + bassNormalized * 15);
      
      ctx.strokeStyle = side === 0 ? primaryColor : secondaryColor;
      if (i === 0) ctx.moveTo(tx + w, sy);
      else ctx.lineTo(tx + w, sy);
    }
    ctx.stroke();
  }

  // 6. Demoscene HUD Banner
  ctx.font = '700 9px monospace';
  ctx.fillStyle = primaryColor;
  ctx.textAlign = 'center';
  ctx.fillText("AMIGA 3D VECTOR DEMO • 60 FPS • PAULA SOUND", width / 2, height - 10);
}
