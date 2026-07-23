export interface AndroidPickedFile {
  name: string;
  url: string;       // fetchable virtual URL served by the native WebViewAssetLoader
  size: number;
  mimeType: string;
  originalUri?: string;   // present on Android builds with the reopen bridge
}

/**
 * Returns true if running inside the Spinamp Android APK with the native 
 * file bridge available (added in APK builds from [current date] onward).
 * Older APK builds or web/desktop contexts will not have this bridge.
 */
export function isAndroidFileBridgeAvailable(): boolean {
  return typeof window !== 'undefined' && 
         typeof (window as any).AndroidFileBridge !== 'undefined' &&
         typeof (window as any).AndroidFileBridge.pickFiles === 'function';
}

/**
 * Converts a native-provided virtual URL + filename into a real File object
 * by fetching the bytes from the WebView's asset loader bridge.
 */
async function pickedFileToFile(picked: AndroidPickedFile): Promise<File> {
  const response = await fetch(picked.url);
  const blob = await response.blob();
  const file = new File([blob], picked.name, { 
    type: picked.mimeType || blob.type || 'application/octet-stream' 
  });
  if (picked.originalUri) {
    (file as any).androidUri = picked.originalUri;
  }
  return file;
}

/**
 * Triggers the native multi-file picker (fixes MIME-filtering issues where 
 * FLAC/OGG/OPUS files with incorrect MIME tags were invisible in the old picker).
 * Resolves with an empty array if the user cancels.
 */
export function pickFilesViaAndroidBridge(): Promise<File[]> {
  return new Promise((resolve, reject) => {
    if (!isAndroidFileBridgeAvailable()) {
      reject(new Error('Android file bridge not available'));
      return;
    }

    const cleanup = () => {
      delete (window as any).onAndroidFilesPicked;
      delete (window as any).onAndroidFilesPickCancelled;
    };

    (window as any).onAndroidFilesPicked = async (filesJson: string) => {
      cleanup();
      try {
        const picked: AndroidPickedFile[] = JSON.parse(filesJson);
        const files = await Promise.all(picked.map(pickedFileToFile));
        resolve(files);
      } catch (err) {
        reject(err);
      }
    };

    (window as any).onAndroidFilesPickCancelled = () => {
      cleanup();
      resolve([]);
    };

    (window as any).AndroidFileBridge.pickFiles();
  });
}

/**
 * Triggers the native recursive folder picker. Finds all audio files in the 
 * selected folder AND its subfolders (e.g. Artist/Album/track.mp3 structures).
 * Resolves with an empty array if the user cancels.
 */
export function pickFolderViaAndroidBridge(): Promise<File[]> {
  return new Promise((resolve, reject) => {
    if (!isAndroidFileBridgeAvailable()) {
      reject(new Error('Android file bridge not available'));
      return;
    }

    const cleanup = () => {
      delete (window as any).onAndroidFilesPicked;
      delete (window as any).onAndroidFilesPickCancelled;
    };

    (window as any).onAndroidFilesPicked = async (filesJson: string) => {
      cleanup();
      try {
        const picked: AndroidPickedFile[] = JSON.parse(filesJson);
        const files = await Promise.all(picked.map(pickedFileToFile));
        resolve(files);
      } catch (err) {
        reject(err);
      }
    };

    (window as any).onAndroidFilesPickCancelled = () => {
      cleanup();
      resolve([]);
    };

    (window as any).AndroidFileBridge.pickFolder();
  });
}

export interface ReopenedFile {
  originalUri: string;
  file: File;
}

export interface ReopenResult {
  reopened: ReopenedFile[];
  failedUris: string[];
}

/**
 * Attempts to re-open previously picked files after an app restart, using 
 * persisted URI permissions. URIs that are no longer accessible (file 
 * deleted, permission revoked, SD card removed, etc.) are returned in 
 * failedUris so the caller can fall back to manual re-import for those.
 */
export function reopenFilesViaAndroidBridge(uris: string[]): Promise<ReopenResult> {
  return new Promise((resolve) => {
    if (!isAndroidFileBridgeAvailable() || uris.length === 0) {
      resolve({ reopened: [], failedUris: uris });
      return;
    }

    const cleanup = () => {
      delete (window as any).onAndroidFilesReopened;
    };

    (window as any).onAndroidFilesReopened = async (successJson: string, failedJson: string) => {
      cleanup();
      try {
        const successList: { originalUri: string; url: string; name: string }[] = 
          JSON.parse(successJson);
        const failedUris: string[] = JSON.parse(failedJson);

        const reopened: ReopenedFile[] = await Promise.all(
          successList.map(async (item) => {
            const response = await fetch(item.url);
            const blob = await response.blob();
            const file = new File([blob], item.name, { type: blob.type || 'application/octet-stream' });
            (file as any).androidUri = item.originalUri;
            return { originalUri: item.originalUri, file };
          })
        );

        resolve({ reopened, failedUris });
      } catch (err) {
        console.warn('Failed to process reopened files:', err);
        resolve({ reopened: [], failedUris: uris });
      }
    };

    (window as any).AndroidFileBridge.reopenFiles(JSON.stringify(uris));

    // Safety timeout in case the native callback never fires for some reason
    setTimeout(() => {
      if ((window as any).onAndroidFilesReopened) {
        cleanup();
        resolve({ reopened: [], failedUris: uris });
      }
    }, 8000);
  });
}

