export const MAX_CACHED_IMAGES = 24;

export function pruneImageCache(cache: Map<string, HTMLImageElement>, maxSize: number = MAX_CACHED_IMAGES): void {
  if (cache.size <= maxSize) return;
  // Map preserves insertion order — the oldest entries are the first ones 
  // iterated, so removing from the front evicts the least-recently-added images
  const excess = cache.size - maxSize;
  const keysToRemove = Array.from(cache.keys()).slice(0, excess);
  for (const key of keysToRemove) {
    cache.delete(key);
  }
}
