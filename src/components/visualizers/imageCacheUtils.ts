export const MAX_CACHED_IMAGES = 24;
export const DEFAULT_MAX_COVER_DIMENSION = 512;

export function pruneImageCache<T = HTMLCanvasElement | HTMLImageElement>(
  cache: Map<string, T>,
  maxSize: number = MAX_CACHED_IMAGES
): void {
  if (cache.size <= maxSize) return;
  // Map preserves insertion order — the oldest entries are the first ones 
  // iterated, so removing from the front evicts the least-recently-added images
  const excess = cache.size - maxSize;
  const keysToRemove = Array.from(cache.keys()).slice(0, excess);
  for (const key of keysToRemove) {
    cache.delete(key);
  }
}

/**
 * Scales down an HTMLImageElement to an offscreen canvas with a max dimension (default 512px).
 * This drastically reduces the GPU/RAM memory footprint of high-resolution cover art.
 */
export function downscaleImageToCanvas(
  img: HTMLImageElement,
  maxDimension: number = DEFAULT_MAX_COVER_DIMENSION
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  let w = img.naturalWidth || maxDimension;
  let h = img.naturalHeight || maxDimension;

  if (w > maxDimension || h > maxDimension) {
    if (w >= h) {
      h = Math.round((h * maxDimension) / w);
      w = maxDimension;
    } else {
      w = Math.round((w * maxDimension) / h);
      h = maxDimension;
    }
  }

  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
  }

  return canvas;
}

/**
 * Retrieves a downscaled HTMLCanvasElement for the given cover URL, or initializes loading
 * and downscales it upon completion. Replaces the full-res HTMLImageElement in cache with the
 * downscaled HTMLCanvasElement once ready.
 */
export function getOrLoadResizedImage(
  url: string,
  cache: Map<string, HTMLCanvasElement | HTMLImageElement>,
  maxDimension: number = DEFAULT_MAX_COVER_DIMENSION
): HTMLCanvasElement | null {
  let cached = cache.get(url);

  if (!cached) {
    const img = new Image();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      if (img.naturalWidth > 0) {
        const resized = downscaleImageToCanvas(img, maxDimension);
        cache.set(url, resized);
      }
    };
    img.src = url;
    cache.set(url, img);
    pruneImageCache(cache, MAX_CACHED_IMAGES);
    cached = img;
  }

  if (cached instanceof HTMLCanvasElement) {
    return cached;
  }

  if (cached instanceof HTMLImageElement && cached.complete && cached.naturalWidth > 0) {
    const resized = downscaleImageToCanvas(cached, maxDimension);
    cache.set(url, resized);
    return resized;
  }

  return null;
}

