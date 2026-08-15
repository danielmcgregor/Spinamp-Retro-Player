import React from 'react';

export function drawMatrixRain(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  dataArray: Uint8Array,
  visTheme: string,
  visSensitivity: number,
  matrixRef: React.MutableRefObject<{ y: number; speed: number; char: string }[]>,
  width: number,
  height: number
): void {
  const numCols = Math.max(1, Math.floor(width / 5));

  // Initialize or adjust matrix columns if canvas width changes
  if (matrixRef.current.length !== numCols) {
    if (matrixRef.current.length < numCols) {
      while (matrixRef.current.length < numCols) {
        matrixRef.current.push({
          y: Math.random() * -height - 10,
          speed: 0.15 + Math.random() * 0.7,
          char: String.fromCharCode(33 + Math.floor(Math.random() * 90)),
        });
      }
    } else {
      matrixRef.current.length = numCols;
    }
  }

  const midSum = (dataArray[2] + dataArray[4] + dataArray[6]) / 3 || 0;
  const activeSpeed = Math.max(0.15, (midSum / 255) * 1.8) * visSensitivity;

  // Clear background trails
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.fillRect(0, 0, width, height);

  ctx.font = '7px monospace';
  ctx.textBaseline = 'top';

  for (let c = 0; c < numCols; c++) {
    const col = matrixRef.current[c];
    if (!col) continue;

    col.y += col.speed * activeSpeed * 2.2;

    if (col.y > height) {
      col.y = Math.random() * -12;
      col.speed = 0.15 + Math.random() * 0.75;
      // Katakana hex or printable ASCII
      col.char = String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96));
    }

    const x = c * 5 + 1;
    const y = Math.floor(col.y);

    // Glowing green variations based on vis theme
    const headColor = '#ffffff';
    let trailColor1 = 'rgba(34, 197, 94, 0.85)';
    let trailColor2 = 'rgba(22, 101, 52, 0.45)';

    if (visTheme === 'cyberpunk') {
      trailColor1 = 'rgba(236, 72, 153, 0.85)';
      trailColor2 = 'rgba(109, 40, 217, 0.45)';
    } else if (visTheme === 'amber') {
      trailColor1 = 'rgba(245, 158, 11, 0.85)';
      trailColor2 = 'rgba(120, 53, 4, 0.45)';
    } else if (visTheme === 'aqua') {
      trailColor1 = 'rgba(6, 182, 212, 0.85)';
      trailColor2 = 'rgba(30, 58, 138, 0.45)';
    } else if (visTheme === 'mono') {
      trailColor1 = 'rgba(220, 220, 220, 0.85)';
      trailColor2 = 'rgba(75, 75, 75, 0.45)';
    } else if (visTheme === 'crimson') {
      trailColor1 = 'rgba(225, 29, 72, 0.85)';
      trailColor2 = 'rgba(136, 19, 55, 0.45)';
    } else if (visTheme === 'custom') {
      let cAccent = '#ff9100';
      try { const r = window.getComputedStyle(document.body).getPropertyValue('--skin-accent'); if(r&&r.trim()) cAccent=r.trim(); } catch(e){}
      const c = cAccent.startsWith('#') ? cAccent.substring(1) : 'ff9100';
      const rgb = parseInt(c, 16) || 0;
      const rC = (rgb >> 16) & 255; const gC = (rgb >> 8) & 255; const bC = rgb & 255;
      trailColor1 = `rgba(${rC}, ${gC}, ${bC}, 0.85)`;
      trailColor2 = `rgba(${Math.max(0, rC-100)}, ${Math.max(0, gC-100)}, ${Math.max(0, bC-100)}, 0.45)`;
    }

    // Draw head
    ctx.fillStyle = headColor;
    ctx.fillText(col.char, x, y);

    // Draw trails
    ctx.fillStyle = trailColor1;
    ctx.fillText(String.fromCharCode(33 + Math.floor(Math.random() * 90)), x, Math.max(0, y - 6));
    ctx.fillStyle = trailColor2;
    ctx.fillText(String.fromCharCode(33 + Math.floor(Math.random() * 90)), x, Math.max(0, y - 12));
  }
}
