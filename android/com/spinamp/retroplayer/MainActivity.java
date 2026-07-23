package com.spinamp.retroplayer;

import android.Manifest;
import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import android.view.KeyEvent;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.Window;
import android.view.WindowManager;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private static final int FILE_CHOOSER_REQUEST = 1;
    private static final int BRIDGE_PICK_FILES_REQUEST = 2;
    private static final int BRIDGE_PICK_FOLDER_REQUEST = 3;

    private static final String VIRTUAL_ORIGIN = "https://spinamp.internal/audiofile/";

    private final Map<String, Uri> pickedFileMap = new HashMap<>();
    private int pickedFileCounter = 0;

    private static final String[] AUDIO_EXTENSIONS = {
        ".mp3", ".wav", ".m4a", ".flac", ".ogg", ".aac", ".opus", ".webm", ".mp4", ".mka"
    };

    private static MainActivity instance;

    public static MainActivity getInstance() {
        return instance;
    }

    // Called by PlaybackService when a hardware media button, notification 
    // action, or Bluetooth AVRCP command is received, so it can be forwarded 
    // into the WebView's JS playback logic.
    public void dispatchMediaAction(final String action) {
        runOnUiThread(new Runnable() {
            public void run() {
                if (webView == null) return;
                String jsCall = "window.onNativeMediaAction && window.onNativeMediaAction("
                    + JSONObject.quote(action) + ");";
                webView.evaluateJavascript(jsCall, null);
            }
        });
    }

    // Hardware volume buttons are intercepted here (and consumed, returning 
    // true) instead of being handled by the system's default volume 
    // adjustment. Android's real STREAM_MUSIC volume only has a small, 
    // fixed number of discrete steps (commonly ~15) — setStreamVolume() only 
    // accepts integers, so no matter how finely we compute a target 
    // percentage, it always snaps to one of those ~15 levels. To get 
    // genuinely finer volume control, we skip the system stream entirely 
    // for these key presses and instead nudge the app's own Web Audio 
    // GainNode-based volume (which supports arbitrary precision) by a small 
    // fixed step. This also means the native system volume popup no longer 
    // appears for volume button presses — the in-app volume slider is the 
    // sole visual feedback going forward.
    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN) {
            if (event.getKeyCode() == KeyEvent.KEYCODE_VOLUME_UP) {
                dispatchVolumeStep(1);
                return true;
            } else if (event.getKeyCode() == KeyEvent.KEYCODE_VOLUME_DOWN) {
                dispatchVolumeStep(-1);
                return true;
            }
        }
        return super.dispatchKeyEvent(event);
    }

    private void dispatchVolumeStep(final int direction) {
        runOnUiThread(new Runnable() {
            public void run() {
                if (webView == null) return;
                String jsCall = "window.onNativeVolumeStep && window.onNativeVolumeStep(" + direction + ");";
                webView.evaluateJavascript(jsCall, null);
            }
        });
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;

        requestNotificationPermissionIfNeeded();

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        // Allows inspecting this WebView's console/DOM/network via 
        // chrome://inspect on a connected computer (USB debugging). Safe to 
        // leave enabled — it only has any effect when the device itself has 
        // USB debugging turned on and is connected to a computer.
        WebView.setWebContentsDebuggingEnabled(true);

        webView = new WebView(this);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setMediaPlaybackRequiresUserGesture(false);

        webView.addJavascriptInterface(new FileBridge(), "AndroidFileBridge");
        webView.addJavascriptInterface(new MediaBridge(), "AndroidMediaBridge");
        webView.addJavascriptInterface(new VolumeBridge(), "AndroidVolumeBridge");
        registerVolumeChangeReceiver();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith(VIRTUAL_ORIGIN)) {
                    return serveVirtualAudioFile(url);
                }
                return super.shouldInterceptRequest(view, request);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams params) {

                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("audio/*");
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);

                startActivityForResult(
                    Intent.createChooser(intent, "Musikdateien auswählen"),
                    FILE_CHOOSER_REQUEST
                );
                return true;
            }
        });

        webView.loadUrl("file:///android_asset/index.html");
        setContentView(webView);
    }

    // On Android 13+ (API 33), a visible notification — including a foreground 
    // service's notification, which is what the lock screen media controls 
    // are derived from — requires this runtime permission to actually be 
    // granted by the user. Declaring it in the manifest alone is not enough.
    private static final int NOTIFICATION_PERMISSION_REQUEST_CODE = 100;

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(
                    new String[]{ Manifest.permission.POST_NOTIFICATIONS },
                    NOTIFICATION_PERMISSION_REQUEST_CODE
                );
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        // No special handling needed beyond the request itself.
    }

    private class MediaBridge {
        @JavascriptInterface
        public void updatePlaybackState(final boolean isPlaying, final String title, final String artist,
                                         final long positionMs, final long durationMs) {
            Intent serviceIntent = new Intent(MainActivity.this, PlaybackService.class);
            if (Build.VERSION.SDK_INT >= 26) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }

            runOnUiThread(new Runnable() {
                public void run() {
                    PlaybackService service = PlaybackService.getInstance();
                    if (service != null) {
                        service.updateFromJs(isPlaying, title, artist, positionMs, durationMs);
                    }
                }
            });
        }

        @JavascriptInterface
        public void stopPlaybackService() {
            runOnUiThread(new Runnable() {
                public void run() {
                    stopService(new Intent(MainActivity.this, PlaybackService.class));
                }
            });
        }
    }

    private class VolumeBridge {
        // Called by JS to read the current system media volume once (e.g. 
        // on app startup, to initialize the in-app slider position).
        // Returns a value 0-100.
        @JavascriptInterface
        public int getCurrentVolume() {
            AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (am == null) return 100;
            int current = am.getStreamVolume(AudioManager.STREAM_MUSIC);
            int max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
            if (max <= 0) return 100;
            return Math.round((current / (float) max) * 100f);
        }

        // Called by JS when the user drags the in-app volume slider — sets 
        // the REAL system media volume to match, so hardware volume buttons 
        // and the in-app slider stay in sync in both directions.
        @JavascriptInterface
        public void setVolume(final int percent) {
            runOnUiThread(new Runnable() {
                public void run() {
                    AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                    if (am == null) return;
                    int max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                    int clamped = Math.max(0, Math.min(100, percent));
                    int target = Math.round((clamped / 100f) * max);
                    try {
                        am.setStreamVolume(AudioManager.STREAM_MUSIC, target, 0);
                    } catch (Exception e) {
                        // Some devices restrict this without additional permissions; ignore
                    }
                }
            });
        }
    }

    private BroadcastReceiver volumeChangeReceiver;

    private void registerVolumeChangeReceiver() {
        volumeChangeReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(android.content.Context context, Intent intent) {
                int streamType = intent.getIntExtra("android.media.EXTRA_VOLUME_STREAM_TYPE", -1);
                if (streamType != AudioManager.STREAM_MUSIC) return;

                AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                if (am == null || webView == null) return;
                int current = am.getStreamVolume(AudioManager.STREAM_MUSIC);
                int max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                if (max <= 0) return;
                final int percent = Math.round((current / (float) max) * 100f);

                runOnUiThread(new Runnable() {
                    public void run() {
                        String jsCall = "window.onNativeVolumeChanged && window.onNativeVolumeChanged(" + percent + ");";
                        webView.evaluateJavascript(jsCall, null);
                    }
                });
            }
        };
        // "android.media.VOLUME_CHANGED_ACTION" is a system broadcast Android 
        // sends whenever any stream's volume changes — including from the 
        // hardware volume buttons. We deliberately do NOT intercept the 
        // volume key events themselves (via dispatchKeyEvent) — that would 
        // require manually reimplementing volume adjustment and risks 
        // breaking the normal system volume UI/behavior. Listening for this 
        // broadcast instead lets Android handle volume keys completely 
        // normally, and we just observe + relay the result to JS.
        registerReceiver(volumeChangeReceiver, new IntentFilter("android.media.VOLUME_CHANGED_ACTION"));
    }

    private class FileBridge {
        @JavascriptInterface
        public void pickFiles() {
            runOnUiThread(new Runnable() {
                public void run() {
                    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*");
                    String[] mimeTypes = {
                        "audio/*", "application/ogg", "application/x-flac", "application/octet-stream"
                    };
                    intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    try {
                        startActivityForResult(intent, BRIDGE_PICK_FILES_REQUEST);
                    } catch (Exception e) {
                        notifyJsCancelled();
                    }
                }
            });
        }

        @JavascriptInterface
        public void pickFolder() {
            runOnUiThread(new Runnable() {
                public void run() {
                    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
                    try {
                        startActivityForResult(intent, BRIDGE_PICK_FOLDER_REQUEST);
                    } catch (Exception e) {
                        notifyJsCancelled();
                    }
                }
            });
        }

        @JavascriptInterface
        public void reopenFiles(final String urisJson) {
            new Thread(new Runnable() {
                public void run() {
                    List<String> uris = new ArrayList<>();
                    try {
                        JSONArray arr = new JSONArray(urisJson);
                        for (int i = 0; i < arr.length(); i++) {
                            uris.add(arr.getString(i));
                        }
                    } catch (Exception e) {
                        // ignore malformed input
                    }

                    JSONArray successArr = new JSONArray();
                    JSONArray failedArr = new JSONArray();

                    for (String uriStr : uris) {
                        try {
                            Uri uri = Uri.parse(uriStr);
                            if (canOpenUri(uri)) {
                                String id = "r" + (pickedFileCounter++);
                                pickedFileMap.put(id, uri);
                                String name = queryDisplayName(uri);
                                JSONObject obj = new JSONObject();
                                obj.put("originalUri", uriStr);
                                obj.put("url", VIRTUAL_ORIGIN + id);
                                obj.put("name", name != null ? name : "audio_file");
                                successArr.put(obj);
                            } else {
                                failedArr.put(uriStr);
                            }
                        } catch (Exception e) {
                            failedArr.put(uriStr);
                        }
                    }

                    final String successJson = successArr.toString();
                    final String failedJson = failedArr.toString();
                    runOnUiThread(new Runnable() {
                        public void run() {
                            String jsCall = "window.onAndroidFilesReopened && window.onAndroidFilesReopened("
                                + JSONObject.quote(successJson) + ", " + JSONObject.quote(failedJson) + ");";
                            webView.evaluateJavascript(jsCall, null);
                        }
                    });
                }
            }).start();
        }
    }

    private boolean canOpenUri(Uri uri) {
        try {
            InputStream stream = getContentResolver().openInputStream(uri);
            if (stream != null) {
                stream.close();
                return true;
            }
        } catch (Exception e) {
            // fall through
        }
        return false;
    }

    private String queryDisplayName(Uri uri) {
        Cursor cursor = null;
        try {
            cursor = getContentResolver().query(uri, new String[]{ OpenableColumns.DISPLAY_NAME }, null, null, null);
            if (cursor != null && cursor.moveToFirst()) {
                int idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (idx >= 0) return cursor.getString(idx);
            }
        } catch (Exception e) {
            // fall through
        } finally {
            if (cursor != null) cursor.close();
        }
        return null;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST) {
            handleLegacyFileChooserResult(resultCode, data);
        } else if (requestCode == BRIDGE_PICK_FILES_REQUEST) {
            handleBridgePickFilesResult(resultCode, data);
        } else if (requestCode == BRIDGE_PICK_FOLDER_REQUEST) {
            handleBridgePickFolderResult(resultCode, data);
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    private void handleLegacyFileChooserResult(int resultCode, Intent data) {
        if (filePathCallback == null) return;

        Uri[] results = null;
        if (resultCode == Activity.RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                results = new Uri[count];
                for (int i = 0; i < count; i++) {
                    results[i] = data.getClipData().getItemAt(i).getUri();
                }
            } else if (data.getDataString() != null) {
                results = new Uri[]{ Uri.parse(data.getDataString()) };
            }
        }

        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }

    private void handleBridgePickFilesResult(int resultCode, Intent data) {
        if (resultCode != Activity.RESULT_OK || data == null) {
            notifyJsCancelled();
            return;
        }

        final List<Uri> uris = new ArrayList<>();
        if (data.getClipData() != null) {
            ClipData clip = data.getClipData();
            for (int i = 0; i < clip.getItemCount(); i++) {
                uris.add(clip.getItemAt(i).getUri());
            }
        } else if (data.getData() != null) {
            uris.add(data.getData());
        }

        if (uris.isEmpty()) {
            notifyJsCancelled();
            return;
        }

        new Thread(new Runnable() {
            public void run() {
                final List<PickedFileInfo> results = new ArrayList<>();
                for (Uri uri : uris) {
                    try {
                        getContentResolver().takePersistableUriPermission(
                            uri, Intent.FLAG_GRANT_READ_URI_PERMISSION
                        );
                    } catch (Exception e) {
                        // Provider doesn't support persistable permissions; continue anyway
                    }

                    PickedFileInfo info = queryFileInfo(uri);
                    if (info != null) results.add(info);
                }

                runOnUiThread(new Runnable() {
                    public void run() {
                        notifyJsFilesPicked(results);
                    }
                });
            }
        }).start();
    }

    private void handleBridgePickFolderResult(int resultCode, Intent data) {
        if (resultCode != Activity.RESULT_OK || data == null || data.getData() == null) {
            notifyJsCancelled();
            return;
        }

        final Uri treeUri = data.getData();

        try {
            getContentResolver().takePersistableUriPermission(
                treeUri, Intent.FLAG_GRANT_READ_URI_PERMISSION
            );
        } catch (Exception e) {
            // Provider doesn't support persistable permissions; continue anyway
        }

        new Thread(new Runnable() {
            public void run() {
                final List<PickedFileInfo> results = new ArrayList<>();
                try {
                    String rootDocId = DocumentsContract.getTreeDocumentId(treeUri);
                    walkDocumentTree(treeUri, rootDocId, results);
                } catch (Exception e) {
                    // Swallow and return whatever was collected before the error
                }

                runOnUiThread(new Runnable() {
                    public void run() {
                        if (results.isEmpty()) {
                            notifyJsCancelled();
                        } else {
                            notifyJsFilesPicked(results);
                        }
                    }
                });
            }
        }).start();
    }

    private void walkDocumentTree(Uri treeUri, String parentDocumentId, List<PickedFileInfo> results) {
        Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, parentDocumentId);
        ContentResolver resolver = getContentResolver();

        Cursor cursor = null;
        try {
            cursor = resolver.query(childrenUri, new String[]{
                DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                DocumentsContract.Document.COLUMN_MIME_TYPE,
                DocumentsContract.Document.COLUMN_SIZE
            }, null, null, null);

            if (cursor == null) return;

            while (cursor.moveToNext()) {
                String docId = cursor.getString(0);
                String name = cursor.getString(1);
                String mime = cursor.getString(2);
                long size = cursor.isNull(3) ? 0 : cursor.getLong(3);

                if (DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) {
                    walkDocumentTree(treeUri, docId, results);
                } else if (isAudioFileName(name)) {
                    Uri docUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, docId);
                    String id = "f" + (pickedFileCounter++);
                    pickedFileMap.put(id, docUri);
                    results.add(new PickedFileInfo(id, name, size, guessMimeType(name), docUri.toString()));
                }
            }
        } catch (Exception e) {
            // Skip unreadable subfolder, continue with what was found
        } finally {
            if (cursor != null) cursor.close();
        }
    }

    private boolean isAudioFileName(String name) {
        if (name == null) return false;
        String lower = name.toLowerCase();
        for (String ext : AUDIO_EXTENSIONS) {
            if (lower.endsWith(ext)) return true;
        }
        return false;
    }

    private String guessMimeType(String name) {
        String lower = name.toLowerCase();
        if (lower.endsWith(".mp3")) return "audio/mpeg";
        if (lower.endsWith(".wav")) return "audio/wav";
        if (lower.endsWith(".m4a")) return "audio/mp4";
        if (lower.endsWith(".flac")) return "audio/flac";
        if (lower.endsWith(".ogg")) return "audio/ogg";
        if (lower.endsWith(".aac")) return "audio/aac";
        if (lower.endsWith(".opus")) return "audio/opus";
        if (lower.endsWith(".webm")) return "audio/webm";
        if (lower.endsWith(".mp4")) return "audio/mp4";
        if (lower.endsWith(".mka")) return "audio/x-matroska";
        return "application/octet-stream";
    }

    private PickedFileInfo queryFileInfo(Uri uri) {
        String name = null;
        long size = 0;

        Cursor cursor = null;
        try {
            cursor = getContentResolver().query(uri, new String[]{
                OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE
            }, null, null, null);
            if (cursor != null && cursor.moveToFirst()) {
                int nameIdx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                int sizeIdx = cursor.getColumnIndex(OpenableColumns.SIZE);
                if (nameIdx >= 0) name = cursor.getString(nameIdx);
                if (sizeIdx >= 0 && !cursor.isNull(sizeIdx)) size = cursor.getLong(sizeIdx);
            }
        } catch (Exception e) {
            // fall through with defaults
        } finally {
            if (cursor != null) cursor.close();
        }

        if (name == null) {
            String path = uri.getPath();
            name = (path != null) ? path.substring(path.lastIndexOf('/') + 1) : "audio_file";
        }

        String id = "u" + (pickedFileCounter++);
        pickedFileMap.put(id, uri);
        return new PickedFileInfo(id, name, size, guessMimeType(name), uri.toString());
    }

    private WebResourceResponse serveVirtualAudioFile(String url) {
        String id = url.substring(VIRTUAL_ORIGIN.length());
        Uri contentUri = pickedFileMap.get(id);
        if (contentUri == null) {
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, null);
        }
        try {
            InputStream stream = getContentResolver().openInputStream(contentUri);
            String mime = getContentResolver().getType(contentUri);
            if (mime == null) mime = "application/octet-stream";

            Map<String, String> headers = new HashMap<>();
            headers.put("Access-Control-Allow-Origin", "*");

            return new WebResourceResponse(mime, null, 200, "OK", headers, stream);
        } catch (Exception e) {
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, null);
        }
    }

    private void notifyJsFilesPicked(List<PickedFileInfo> files) {
        JSONArray arr = new JSONArray();
        for (PickedFileInfo info : files) {
            JSONObject obj = new JSONObject();
            try {
                obj.put("name", info.name);
                obj.put("url", VIRTUAL_ORIGIN + info.id);
                obj.put("size", info.size);
                obj.put("mimeType", info.mimeType);
                obj.put("originalUri", info.originalUri);
                arr.put(obj);
            } catch (Exception e) {
                // Skip malformed entry
            }
        }
        final String json = arr.toString();
        runOnUiThread(new Runnable() {
            public void run() {
                String jsCall = "window.onAndroidFilesPicked && window.onAndroidFilesPicked("
                    + JSONObject.quote(json) + ");";
                webView.evaluateJavascript(jsCall, null);
            }
        });
    }

    private void notifyJsCancelled() {
        runOnUiThread(new Runnable() {
            public void run() {
                String jsCall = "window.onAndroidFilesPickCancelled && window.onAndroidFilesPickCancelled();";
                webView.evaluateJavascript(jsCall, null);
            }
        });
    }

    private static class PickedFileInfo {
        final String id;
        final String name;
        final long size;
        final String mimeType;
        final String originalUri;

        PickedFileInfo(String id, String name, long size, String mimeType, String originalUri) {
            this.id = id;
            this.name = name;
            this.size = size;
            this.mimeType = mimeType;
            this.originalUri = originalUri;
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        // Reliably tell JS the app is backgrounded (app-switch, home button, 
        // etc.) — document.hidden/visibilitychange in a WebView is not always 
        // consistently fired for Activity-level backgrounding the way it is 
        // for a real browser tab, which could leave things like the 
        // Visualizer's canvas animation loop running unnecessarily while the 
        // user is in another app, competing for CPU/GPU and causing stutter 
        // in that other app. This does NOT pause JS timers globally (unlike 
        // WebView.onPause()/pauseTimers(), which would also break the audio 
        // position tracking and MediaSession updates needed for legitimate 
        // background playback) — it's purely an informational signal.
        notifyAppVisibilityChanged(false);
    }

    @Override
    protected void onResume() {
        super.onResume();
        notifyAppVisibilityChanged(true);
    }

    private void notifyAppVisibilityChanged(final boolean isForeground) {
        if (webView == null) return;
        runOnUiThread(new Runnable() {
            public void run() {
                String jsCall = "window.onNativeAppVisibilityChanged && window.onNativeAppVisibilityChanged("
                    + (isForeground ? "true" : "false") + ");";
                webView.evaluateJavascript(jsCall, null);
            }
        });
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (instance == this) {
            instance = null;
        }
        if (volumeChangeReceiver != null) {
            try {
                unregisterReceiver(volumeChangeReceiver);
            } catch (Exception e) {
                // Already unregistered or never registered; ignore
            }
        }
        super.onDestroy();
    }
}
