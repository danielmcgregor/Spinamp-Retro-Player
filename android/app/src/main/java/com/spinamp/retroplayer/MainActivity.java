package com.spinamp.retroplayer;

import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private boolean isServiceStarted = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep screen awake while app is active and prevent OS deep sleep audio pause
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Configure WebView for uninterrupted background audio playback
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebSettings settings = this.bridge.getWebView().getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);

            // Inject native AndroidMediaBridge JS interface into WebView
            this.bridge.getWebView().addJavascriptInterface(new AndroidMediaBridge(), "AndroidMediaBridge");
        }

        // Acquire persistent Android Audio Focus and start foreground service
        requestNativeAudioFocus();
        startPlaybackService();
    }

    @Override
    public void onResume() {
        super.onResume();
        requestNativeAudioFocus();
        startPlaybackService();
    }

    public synchronized void startPlaybackService() {
        if (isServiceStarted) return;
        try {
            Intent intent = new Intent(this, MediaPlaybackService.class);
            intent.setAction(MediaPlaybackService.ACTION_START);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent);
            } else {
                startService(intent);
            }
            isServiceStarted = true;
        } catch (Exception e) {
            // Foreground service start blocked by background limits
        }
    }

    public synchronized void stopPlaybackService() {
        try {
            Intent intent = new Intent(this, MediaPlaybackService.class);
            intent.setAction(MediaPlaybackService.ACTION_STOP);
            startService(intent);
        } catch (Exception e) {
            // Gracefully handle stop service error
        }
        isServiceStarted = false;
    }

    public void updateServiceNotification(String title, String artist, boolean isPlaying) {
        try {
            Intent intent = new Intent(this, MediaPlaybackService.class);
            intent.setAction(MediaPlaybackService.ACTION_UPDATE);
            intent.putExtra("title", title);
            intent.putExtra("artist", artist);
            intent.putExtra("isPlaying", isPlaying);
            startService(intent);
        } catch (Exception e) {
            // Gracefully handle service update
        }
    }

    private void requestNativeAudioFocus() {
        try {
            audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (audioManager == null) return;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                AudioAttributes playbackAttributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build();

                audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                        .setAudioAttributes(playbackAttributes)
                        .setAcceptsDelayedFocusGain(true)
                        .setOnAudioFocusChangeListener(focusChange -> {})
                        .build();

                audioManager.requestAudioFocus(audioFocusRequest);
            } else {
                audioManager.requestAudioFocus(
                        focusChange -> {},
                        AudioManager.STREAM_MUSIC,
                        AudioManager.AUDIOFOCUS_GAIN
                );
            }
        } catch (Exception e) {
            // Gracefully handle focus request fallback
        }
    }

    public class AndroidMediaBridge {
        @JavascriptInterface
        public void startPlaybackService() {
            MainActivity.this.startPlaybackService();
        }

        @JavascriptInterface
        public void stopPlaybackService() {
            MainActivity.this.stopPlaybackService();
        }

        @JavascriptInterface
        public void updatePlaybackState(boolean isPlaying, String title, String artist, long positionMs, long durationMs) {
            if (isPlaying && !isServiceStarted) {
                MainActivity.this.startPlaybackService();
            }
            MainActivity.this.updateServiceNotification(
                title != null && !title.trim().isEmpty() ? title : "Spinamp Retro Player",
                artist != null && !artist.trim().isEmpty() ? artist : "Playing audio in background",
                isPlaying
            );
        }
    }
}
