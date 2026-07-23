import type { VisualizerMode } from '../../types';

export function drawRadialSpectrum(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  dataArray: Uint8Array,
  visTheme: string,
  visSensitivity: number,
  width: number,
  height: number,
  beatPulse: number = 0
): void {
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) * 0.42;
  // Make the inner radius react slightly to the beat
  const innerRadius = maxRadius * 0.25 * (1 + beatPulse * 0.1);

  const barCount = 96; // number of radial bars
  const angleStep = (Math.PI * 2) / barCount;
  
  const bufferLength = dataArray.length;

  ctx.save();
  ctx.translate(centerX, centerY);

  for (let i = 0; i < barCount; i++) {
    const percentIdx = i / barCount;
    // use a curve to sample lower frequencies more, similar to linear spectrum
    const dataIdx = Math.floor(Math.pow(percentIdx, 1.35) * (bufferLength * 0.65));
    const value = (dataArray[dataIdx] || 0) * visSensitivity;
    
    const normalizedValue = Math.min(255, value) / 255;
    const barLength = normalizedValue * (maxRadius - innerRadius);

    const angle = i * angleStep - Math.PI / 2; // start from top
    const x1 = Math.cos(angle) * innerRadius;
    const y1 = Math.sin(angle) * innerRadius;
    const x2 = Math.cos(angle) * (innerRadius + barLength);
    const y2 = Math.sin(angle) * (innerRadius + barLength);

    // Color theme logic based on existing styles
    // Fallbacks
    let baseColor = `hsl(${(i / barCount) * 360}, 80%, 60%)`;
    
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

    ctx.strokeStyle = baseColor;
    ctx.lineWidth = Math.max(1.5, (Math.PI * innerRadius * 2) / barCount * 0.6); 
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.restore();
}
