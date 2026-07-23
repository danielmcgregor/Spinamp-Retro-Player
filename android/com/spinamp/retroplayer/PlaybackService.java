package com.spinamp.retroplayer;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.view.KeyEvent;

public class PlaybackService extends Service {

    private static final String CHANNEL_ID = "spinamp_playback_channel";
    private static final int NOTIFICATION_ID = 1;

    public static final String ACTION_PLAY = "PLAY";
    public static final String ACTION_PAUSE = "PAUSE";
    public static final String ACTION_NEXT = "NEXT";
    public static final String ACTION_PREVIOUS = "PREVIOUS";
    public static final String ACTION_STOP = "STOP";
    public static final String ACTION_TOGGLE = "TOGGLE";

    private static PlaybackService instance;

    private MediaSession mediaSession;
    private PowerManager.WakeLock wakeLock;

    private String currentTitle = "Spinamp";
    private String currentArtist = "";
    private boolean currentIsPlaying = false;

    // Used to avoid rebuilding/re-posting the notification on every single 
    // updateFromJs() call — this fires ~4x/sec during playback (driven by 
    // currentTime ticking), but the notification only needs to change when 
    // the title, artist, or play/pause state actually changes. Rebuilding 
    // and re-posting a Notification involves real Binder IPC overhead to 
    // system_server; doing this unnecessarily often can cause periodic 
    // micro-stutters, especially if it coincides with a power state 
    // transition like the screen locking.
    private String lastNotifiedTitle = null;
    private String lastNotifiedArtist = null;
    private Boolean lastNotifiedIsPlaying = null;

    public static PlaybackService getInstance() {
        return instance;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        createNotificationChannelIfNeeded();
        setupMediaSession();
        acquireWakeLockRef();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Must call startForeground quickly after the service starts, or
        // Android will kill it. Show a minimal notification immediately;
        // it gets updated with real track info once JS reports state.
        startForeground(NOTIFICATION_ID, buildNotification());

        if (intent != null && intent.getAction() != null) {
            // Notification action buttons launch the service with an action
            // string (see buildAction() below) — forward these to the WebView
            // the same way hardware/MediaSession button presses are handled.
            forwardActionToWebView(intent.getAction());
        }

        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        releaseWakeLock();
        instance = null;
        super.onDestroy();
    }

    private void setupMediaSession() {
        mediaSession = new MediaSession(this, "SpinampSession");
        mediaSession.setCallback(new MediaSession.Callback() {
            @Override
            public void onPlay() {
                forwardActionToWebView(ACTION_PLAY);
            }

            @Override
            public void onPause() {
                forwardActionToWebView(ACTION_PAUSE);
            }

            @Override
            public void onSkipToNext() {
                forwardActionToWebView(ACTION_NEXT);
            }

            @Override
            public void onSkipToPrevious() {
                forwardActionToWebView(ACTION_PREVIOUS);
            }

            @Override
            public void onStop() {
                forwardActionToWebView(ACTION_STOP);
            }

            @Override
            public boolean onMediaButtonEvent(Intent mediaButtonIntent) {
                // This is the RELIABLE path for hardware media button presses
                // (wired/USB-C headset hook button, Bluetooth AVRCP, etc.) —
                // it fires regardless of whether any Activity currently has
                // window focus, which is essential since headset remotes are
                // typically used with the screen off / app backgrounded.
                KeyEvent event = mediaButtonIntent.getParcelableExtra(Intent.EXTRA_KEY_EVENT);
                if (event != null && event.getAction() == KeyEvent.ACTION_DOWN) {
                    int keyCode = event.getKeyCode();
                    switch (keyCode) {
                        case KeyEvent.KEYCODE_HEADSETHOOK:
                        case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
                            registerHeadsetHookClick();
                            return true;
                        case KeyEvent.KEYCODE_MEDIA_PLAY:
                            forwardActionToWebView(ACTION_PLAY);
                            return true;
                        case KeyEvent.KEYCODE_MEDIA_PAUSE:
                            forwardActionToWebView(ACTION_PAUSE);
                            return true;
                        case KeyEvent.KEYCODE_MEDIA_NEXT:
                            forwardActionToWebView(ACTION_NEXT);
                            return true;
                        case KeyEvent.KEYCODE_MEDIA_PREVIOUS:
                            forwardActionToWebView(ACTION_PREVIOUS);
                            return true;
                        case KeyEvent.KEYCODE_MEDIA_STOP:
                            forwardActionToWebView(ACTION_STOP);
                            return true;
                        default:
                            break;
                    }
                }
                return super.onMediaButtonEvent(mediaButtonIntent);
            }
        });
        mediaSession.setFlags(
            MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS
        );
        mediaSession.setActive(true);
        updatePlaybackState(false);
    }

    // --- Headset hook button multi-click detection ---
    // Convention: 1 click = play/pause toggle, 2 clicks = next track,
    // 3 clicks = previous track. A single physical button on wired/USB-C
    // headsets (e.g. JBL Tune 310C) sends the same HEADSETHOOK code for every
    // press, so click counting happens here rather than relying on distinct
    // key codes.
    private static final long HEADSET_HOOK_MULTI_CLICK_TIMEOUT_MS = 400;
    private int headsetHookClickCount = 0;
    private final Handler headsetHookHandler = new Handler(Looper.getMainLooper());
    private final Runnable headsetHookClickRunnable = new Runnable() {
        public void run() {
            if (headsetHookClickCount == 1) {
                forwardActionToWebView(ACTION_TOGGLE);
            } else if (headsetHookClickCount == 2) {
                forwardActionToWebView(ACTION_NEXT);
            } else if (headsetHookClickCount >= 3) {
                forwardActionToWebView(ACTION_PREVIOUS);
            }
            headsetHookClickCount = 0;
        }
    };

    private void registerHeadsetHookClick() {
        headsetHookClickCount++;
        headsetHookHandler.removeCallbacks(headsetHookClickRunnable);
        headsetHookHandler.postDelayed(headsetHookClickRunnable, HEADSET_HOOK_MULTI_CLICK_TIMEOUT_MS);
    }

    // --- Audio focus handling: intentionally NOT implemented here ---
    // The WebView already requests its own audio focus internally for the
    // HTML5 <audio> element. A separate native AudioManager.requestAudioFocus()
    // call in this Service was tried but caused a conflict — it could trigger
    // the WebView's own audio playback to pause itself (interpreting the
    // second in-process focus request as if some other app had taken over),
    // causing playback to stop abruptly right after starting. Removed.

    private void forwardActionToWebView(String action) {
        MainActivity activity = MainActivity.getInstance();
        if (activity != null) {
            activity.dispatchMediaAction(action);
        }
    }

    // Called by MainActivity's JS bridge whenever playback state changes
    public void updateFromJs(boolean isPlaying, String title, String artist, long positionMs, long durationMs) {
        this.currentIsPlaying = isPlaying;
        this.currentTitle = (title == null || title.isEmpty()) ? "Spinamp" : title;
        this.currentArtist = artist == null ? "" : artist;

        updatePlaybackState(isPlaying);
        updateMediaMetadata(this.currentTitle, this.currentArtist, positionMs, durationMs);

        boolean displayRelevantChange =
            !this.currentTitle.equals(lastNotifiedTitle) ||
            !this.currentArtist.equals(lastNotifiedArtist) ||
            lastNotifiedIsPlaying == null ||
            lastNotifiedIsPlaying != isPlaying;

        if (displayRelevantChange) {
            lastNotifiedTitle = this.currentTitle;
            lastNotifiedArtist = this.currentArtist;
            lastNotifiedIsPlaying = isPlaying;

            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(NOTIFICATION_ID, buildNotification());
            }
        }

        if (isPlaying) {
            acquireWakeLock();
        } else {
            releaseWakeLock();
        }
    }

    private void updatePlaybackState(boolean isPlaying) {
        if (mediaSession == null) return;
        long actions = PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE
            | PlaybackState.ACTION_PLAY_PAUSE | PlaybackState.ACTION_SKIP_TO_NEXT
            | PlaybackState.ACTION_SKIP_TO_PREVIOUS | PlaybackState.ACTION_STOP;

        PlaybackState state = new PlaybackState.Builder()
            .setActions(actions)
            .setState(
                isPlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED,
                PlaybackState.PLAYBACK_POSITION_UNKNOWN,
                1.0f
            )
            .build();
        mediaSession.setPlaybackState(state);
    }

    private void updateMediaMetadata(String title, String artist, long positionMs, long durationMs) {
        if (mediaSession == null) return;
        android.media.MediaMetadata metadata = new android.media.MediaMetadata.Builder()
            .putString(android.media.MediaMetadata.METADATA_KEY_TITLE, title)
            .putString(android.media.MediaMetadata.METADATA_KEY_ARTIST, artist)
            .putLong(android.media.MediaMetadata.METADATA_KEY_DURATION, durationMs)
            .build();
        mediaSession.setMetadata(metadata);
    }

    private Notification buildNotification() {
        Intent contentIntent = new Intent(this, MainActivity.class);
        PendingIntent contentPendingIntent = PendingIntent.getActivity(
            this, 0, contentIntent,
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                : PendingIntent.FLAG_UPDATE_CURRENT
        );

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        builder.setContentTitle(currentTitle)
            .setContentText(currentArtist)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(contentPendingIntent)
            .setOngoing(currentIsPlaying)
            .addAction(buildAction(android.R.drawable.ic_media_previous, "Previous", ACTION_PREVIOUS))
            .addAction(
                currentIsPlaying
                    ? buildAction(android.R.drawable.ic_media_pause, "Pause", ACTION_PAUSE)
                    : buildAction(android.R.drawable.ic_media_play, "Play", ACTION_PLAY)
            )
            .addAction(buildAction(android.R.drawable.ic_media_next, "Next", ACTION_NEXT));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && mediaSession != null) {
            builder.setStyle(new Notification.MediaStyle()
                .setMediaSession(mediaSession.getSessionToken())
                .setShowActionsInCompactView(0, 1, 2));
        }

        return builder.build();
    }

    private Notification.Action buildAction(int icon, String title, String action) {
        Intent intent = new Intent(this, PlaybackService.class);
        intent.setAction(action);
        PendingIntent pendingIntent = PendingIntent.getService(
            this, action.hashCode(), intent,
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                : PendingIntent.FLAG_UPDATE_CURRENT
        );
        return new Notification.Action.Builder(icon, title, pendingIntent).build();
    }

    private void createNotificationChannelIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && nm.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Playback", NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("Spinamp playback controls");
                channel.setShowBadge(false);
                nm.createNotificationChannel(channel);
            }
        }
    }

    private void acquireWakeLockRef() {
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Spinamp::PlaybackWakeLock");
            wakeLock.setReferenceCounted(false);
        }
    }

    private void acquireWakeLock() {
        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire(10 * 60 * 60 * 1000L /* 10 hours safety timeout */);
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Always shut down completely when the user swipes the app away 
        // from the recents/overview screen, regardless of whether music is 
        // currently playing.
        //
        // A graceful JS-side stop (forwardActionToWebView + stopSelf) was 
        // tried first but proved unreliable: MainActivity may already be 
        // gone by the time this fires, or the WebView/process may simply 
        // keep running independently of the Service's own lifecycle, 
        // letting audio continue. To guarantee an actual stop, force-kill 
        // the entire app process shortly after attempting the graceful 
        // path — this unconditionally halts everything, audio included, 
        // regardless of WebView/Activity teardown timing.
        forwardActionToWebView(ACTION_STOP);
        stopSelf();

        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(new Runnable() {
            public void run() {
                android.os.Process.killProcess(android.os.Process.myPid());
            }
        }, 300);

        super.onTaskRemoved(rootIntent);
    }
}
