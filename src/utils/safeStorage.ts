export function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch (e) {
    console.warn(`Failed to read key "${key}" from localStorage:`, e);
  }
  return null;
}

export function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch (e: any) {
    console.warn(`Failed to write key "${key}" to localStorage:`, e);
    
    // Detect quota exceeded error
    let isQuotaExceeded = false;
    if (e) {
      if (e.code === 22 || e.code === 1014) {
        isQuotaExceeded = true;
      } else if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        isQuotaExceeded = true;
      }
    }

    if (isQuotaExceeded && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('spinamp_storage_quota_exceeded', {
          detail: { key }
        })
      );
    }
  }
}

export function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch (e) {
    console.warn(`Failed to remove key "${key}" from localStorage:`, e);
  }
}
