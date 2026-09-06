package com.spinamp.retroplayer;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

public class MediaPlaybackService extends Service {
    private static final String CHANNEL_ID = "spinamp_media_channel";
    private static final int NOTIFICATION_ID = 1001;

    public static final String ACTION_START = "ACTION_START";
    public static final String ACTION_STOP = "ACTION_STOP";
    public static final String ACTION_UPDATE = "ACTION_UPDATE";

    private String currentTitle = "Spinamp Retro Player";
    private String currentArtist = "Playing audio in background";
    private boolean currentIsPlaying = true;
    private boolean isForeground = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_STOP.equals(action)) {
                try {
                    stopForeground(true);
                } catch (Exception ignored) {}
                isForeground = false;
                stopSelf();
                return START_NOT_STICKY;
            } else if (ACTION_UPDATE.equals(action)) {
                String title = intent.getStringExtra("title");
                String artist = intent.getStringExtra("artist");
                if (title != null && !title.trim().isEmpty()) {
                    currentTitle = title;
                }
                if (artist != null && !artist.trim().isEmpty()) {
                    currentArtist = artist;
                }
                currentIsPlaying = intent.getBooleanExtra("isPlaying", true);
            }
        }

        Notification notification = createNotification(currentTitle, currentArtist, currentIsPlaying);
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        if (!isForeground) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
                } else {
                    startForeground(NOTIFICATION_ID, notification);
                }
                isForeground = true;
            } catch (Exception e) {
                // Background start restrictions on Android 12+ (ForegroundServiceStartNotAllowedException)
                // Fall back to posting notification via NotificationManager to avoid process crash
                if (manager != null) {
                    try {
                        manager.notify(NOTIFICATION_ID, notification);
                    } catch (Exception ignored) {}
                }
            }
        } else {
            // Already running in foreground: safely update notification without invoking startForeground again
            if (manager != null) {
                try {
                    manager.notify(NOTIFICATION_ID, notification);
                } catch (Exception ignored) {}
            }
        }

        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Spinamp Background Audio",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps audio playback active when screen is turned off");
            channel.setSound(null, null);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification(String title, String artist, boolean isPlaying) {
        Intent intent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(artist)
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setOngoing(isPlaying)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .build();
    }
}
