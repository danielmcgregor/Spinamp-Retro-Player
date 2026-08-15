export function isAndroidVolumeBridgeAvailable(): boolean {
  return typeof window !== 'undefined' && 
         typeof (window as any).AndroidVolumeBridge !== 'undefined' &&
         typeof (window as any).AndroidVolumeBridge.getCurrentVolume === 'function';
}

/**
 * Reads the current Android system media volume (0-100). Returns null if 
 * the native bridge isn't available (e.g. running in a browser).
 */
export function getNativeSystemVolume(): number | null {
  if (!isAndroidVolumeBridgeAvailable()) return null;
  try {
    return (window as any).AndroidVolumeBridge.getCurrentVolume();
  } catch (err) {
    console.warn('Failed to read native system volume:', err);
    return null;
  }
}

/**
 * Sets the Android system media volume (0-100). No-op if the native bridge 
 * isn't available.
 */
export function setNativeSystemVolume(percent: number): void {
  if (!isAndroidVolumeBridgeAvailable()) return;
  try {
    (window as any).AndroidVolumeBridge.setVolume(Math.round(Math.max(0, Math.min(100, percent))));
  } catch (err) {
    console.warn('Failed to set native system volume:', err);
  }
}

/**
 * Registers a listener for native volume changes (fired when hardware 
 * volume buttons, another app, or a Bluetooth device changes the system 
 * volume). Returns an unsubscribe function.
 */
export function subscribeNativeVolumeChanges(callback: (percent: number) => void): () => void {
  if (!isAndroidVolumeBridgeAvailable()) return () => {};
  
  const existingHandler = (window as any).onNativeVolumeChanged;
  const wrapper = (percent: number) => {
    if (existingHandler) existingHandler(percent);
    callback(percent);
  };
  (window as any).onNativeVolumeChanged = wrapper;
  
  return () => {
    if ((window as any).onNativeVolumeChanged === wrapper) {
      (window as any).onNativeVolumeChanged = existingHandler || undefined;
      if (!existingHandler) delete (window as any).onNativeVolumeChanged;
    }
  };
}
