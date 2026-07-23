export const isAndroidWebView = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Android/i.test(ua) && /wv|WebView/i.test(ua);
};

export const isAndroid = (): boolean => /Android/i.test(navigator?.userAgent ?? '');

export function isAndroidMediaBridgeAvailable(): boolean {
  return typeof window !== 'undefined' && 
         typeof (window as any).AndroidMediaBridge !== 'undefined' &&
         typeof (window as any).AndroidMediaBridge.updatePlaybackState === 'function';
}

let nativeAppInForeground = true;

if (typeof window !== 'undefined') {
  (window as any).onNativeAppVisibilityChanged = (isForeground: boolean) => {
    nativeAppInForeground = isForeground;
    window.dispatchEvent(new CustomEvent('spinamp-visibility-changed', { detail: isForeground }));
  };
}

export function isAppInForeground(): boolean {
  return nativeAppInForeground && (typeof document === 'undefined' || !document.hidden);
}
