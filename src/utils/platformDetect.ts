export const isAndroidWebView = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Android/i.test(ua) && /wv|WebView/i.test(ua);
};

export const isAndroid = (): boolean => /Android/i.test(navigator?.userAgent ?? '');

export const isIOS = (): boolean => /iPhone|iPad|iPod/i.test(navigator?.userAgent ?? '');

export const isMobile = (): boolean => isAndroid() || isIOS();

/**
 * Checks if a native Android Media Bridge has been injected.
 * 
 * NOTE: The "AndroidMediaBridge" is an interface meant to be injected by a native Android WebView wrapper
 * app that implements a true native Foreground Service and MediaSessionCompat. 
 * 
 * If this returns false, it means the app is running in a standard browser or a basic WebView
 * without native background audio capabilities. In such cases, the OS will aggressively pause
 * audio playback when the screen turns off. This is expected behavior for web audio until
 * the native wrapper implements the Foreground Service.
 */
export function isAndroidMediaBridgeAvailable(): boolean {
  return typeof window !== 'undefined' && 
         typeof (window as any).AndroidMediaBridge !== 'undefined' &&
         typeof (window as any).AndroidMediaBridge.updatePlaybackState === 'function';
}

let nativeAppInForeground = true;
let visibilityMismatchTimer: ReturnType<typeof setTimeout> | null = null;

function checkVisibilityMismatch() {
  if (typeof document === 'undefined') return;
  
  const docIsVisible = !document.hidden;
  
  if (docIsVisible && !nativeAppInForeground) {
    if (!visibilityMismatchTimer) {
      visibilityMismatchTimer = setTimeout(() => {
        if (!document.hidden && !nativeAppInForeground) {
          console.warn('[Spinamp] nativeAppInForeground and document.hidden have been contradictory for 5 seconds. Self-healing nativeAppInForeground to true to prevent deadlock.');
          nativeAppInForeground = true;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('spinamp-visibility-changed', { detail: true }));
          }
        }
        visibilityMismatchTimer = null;
      }, 5000);
    }
  } else {
    if (visibilityMismatchTimer) {
      clearTimeout(visibilityMismatchTimer);
      visibilityMismatchTimer = null;
    }
  }
}

if (typeof window !== 'undefined') {
  (window as any).onNativeAppVisibilityChanged = (isForeground: boolean) => {
    nativeAppInForeground = isForeground;
    checkVisibilityMismatch();
    window.dispatchEvent(new CustomEvent('spinamp-visibility-changed', { detail: isForeground }));
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', checkVisibilityMismatch);
  }
  window.addEventListener('focus', checkVisibilityMismatch);
}

export function isAppInForeground(): boolean {
  if (typeof document !== 'undefined' && !document.hidden && !nativeAppInForeground) {
    checkVisibilityMismatch();
  }
  return nativeAppInForeground && (typeof document === 'undefined' || !document.hidden);
}
