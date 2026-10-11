package com.zac.webportalcast;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.ui.PlayerView;

/**
 * A standalone DLNA/UPnP AV MediaRenderer shell for Fire TV.
 * Google Cast, AirPlay and Quest mirroring are not implemented in v0.1.
 */
public final class MainActivity extends Activity {
    private static final int NAVY = Color.rgb(7, 20, 35);
    private static final int CYAN = Color.rgb(56, 219, 244);
    private static final int MUTED = Color.rgb(175, 193, 208);

    private final Handler main = new Handler(Looper.getMainLooper());
    private final StringBuilder recent = new StringBuilder();
    private FrameLayout root;
    private LinearLayout dashboard;
    private PlayerView videoView;
    private TextView statusLabel;
    private TextView logLabel;
    private EditText manualUrl;
    private ExoPlayer player;
    private AppUpdater appUpdater;
    private TextView updateLabel;
    private Button updateButton;
    private DlnaReceiver receiver;
    private String queuedUri;
    private boolean watchingVideo;
    private volatile long cachedPositionMs;
    private volatile long cachedDurationMs;
    private volatile boolean cachedPlaying;

    private final Runnable cachePlaybackPosition = new Runnable() {
        @Override public void run() {
            if (player != null) {
                cachedPositionMs = Math.max(0L, player.getCurrentPosition());
                cachedDurationMs = Math.max(0L, player.getDuration());
                cachedPlaying = player.isPlaying();
            }
            main.postDelayed(this, 750);
        }
    };

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        player = new ExoPlayer.Builder(this).build();
        player.addListener(new Player.Listener() {
            @Override public void onPlayerError(PlaybackException error) {
                runOnUiThread(() -> {
                    showDashboard();
                    log("Playback error: " + error.getErrorCodeName());
                });
            }
            @Override public void onPlaybackStateChanged(int playbackState) {
                if (playbackState == Player.STATE_ENDED) {
                    runOnUiThread(() -> {
                        showDashboard();
                        log("Playback finished");
                    });
                }
            }
        });

        videoView = new PlayerView(this);
        videoView.setPlayer(player);
        videoView.setUseController(true);
        videoView.setKeepScreenOn(true);
        root = new FrameLayout(this);
        root.setBackgroundColor(NAVY);
        setContentView(root);
        makeDashboard();
        showDashboard();
        cachePlaybackPosition.run();

        appUpdater = new AppUpdater(this, new AppUpdater.Listener() {
            @Override public void onChecking() {
                updateLabel.setText("Checking for a newer version...");
                updateButton.setText("Checking...");
                updateButton.setEnabled(false);
            }

            @Override public void onUpToDate(String version) {
                updateLabel.setText("Installed version " + version + " — up to date");
                updateButton.setText("Check for updates");
                updateButton.setEnabled(true);
                updateButton.setOnClickListener(v -> appUpdater.check(true));
            }

            @Override public void onAvailable(String version) {
                updateLabel.setText("Version " + version + " is available");
                updateButton.setText("Download & install " + version);
                updateButton.setEnabled(true);
                updateButton.setOnClickListener(v -> appUpdater.download());
                log("New signed app version available: " + version);
            }

            @Override public void onProgress(int percent) {
                updateLabel.setText("Downloading update: " + percent + "%");
                updateButton.setEnabled(false);
                updateButton.setText("Downloading...");
            }

            @Override public void onDownloadVerified() {
                updateLabel.setText("Download verified — opening system installer");
                updateButton.setText("Install update");
                updateButton.setEnabled(true);
                updateButton.setOnClickListener(v -> appUpdater.resumePendingInstall());
            }

            @Override public void onMessage(String message) {
                updateLabel.setText(message);
                updateButton.setText("Check for updates");
                updateButton.setEnabled(true);
                updateButton.setOnClickListener(v -> appUpdater.check(true));
                log(message);
            }
        });
        appUpdater.check(false);

        receiver = new DlnaReceiver(getApplicationContext(), new DlnaReceiver.Listener() {
            @Override public void onQueued(String url) {
                runOnUiThread(() -> {
                    queuedUri = url;
                    log("A controller queued a media URL");
                    statusLabel.setText("DLNA connected — awaiting Play");
                });
            }
            @Override public void onPlay() {
                runOnUiThread(() -> {
                    if (queuedUri != null) playUrl(queuedUri);
                    else log("Play ignored — no media has been queued");
                });
            }
            @Override public void onPause() {
                runOnUiThread(() -> { player.pause(); log("Paused by sender"); });
            }
            @Override public void onStop() {
                runOnUiThread(() -> stopPlayback("Stopped by sender"));
            }
            @Override public void onSeek(long positionMs) {
                runOnUiThread(() -> {
                    if (player.getMediaItemCount() > 0) player.seekTo(positionMs);
                });
            }
            @Override public long positionMs() { return cachedPositionMs; }
            @Override public long durationMs() { return cachedDurationMs; }
            @Override public boolean isPlaying() { return cachedPlaying; }
            @Override public void onLog(String message) {
                runOnUiThread(() -> log(message));
            }
        });
        receiver.start();
        statusLabel.setText(receiver.isRunning()
                ? "DLNA receiver active — waiting for a sender"
                : "Receiver unavailable — see diagnostics");
        log("Local receiver address: " + receiver.getLocation());
    }

    private void makeDashboard() {
        dashboard = new LinearLayout(this);
        dashboard.setOrientation(LinearLayout.VERTICAL);
        dashboard.setPadding(dp(38), dp(26), dp(38), dp(22));
        dashboard.setBackgroundColor(NAVY);

        TextView title = label("WEBPORTAL  /  CAST", 30, CYAN, true);
        dashboard.addView(title);
        dashboard.addView(label("Your Fire TV's local media receiver — free, no session timer", 18, Color.WHITE, false));
        addSpace(dashboard, 16);

        statusLabel = label("Starting receiver...", 22, CYAN, true);
        dashboard.addView(statusLabel);
        addSpace(dashboard, 12);
        dashboard.addView(label(
                "Supported now: DLNA / UPnP local video and audio streaming. "
                + "Not yet supported: Quest built-in casting, Chromecast, AirPlay or Miracast.",
                17, MUTED, false));
        addSpace(dashboard, 16);

        dashboard.addView(label("APP UPDATES", 18, CYAN, true));
        LinearLayout updateControls = new LinearLayout(this);
        updateControls.setOrientation(LinearLayout.HORIZONTAL);
        updateControls.setGravity(Gravity.CENTER_VERTICAL);
        updateLabel = label("Version " + BuildConfig.VERSION_NAME + " — checking for updates...", 17, MUTED, false);
        updateControls.addView(updateLabel, new LinearLayout.LayoutParams(0, dp(58), 1f));
        updateButton = action("Check for updates");
        updateButton.setOnClickListener(v -> {
            if (appUpdater != null) appUpdater.check(true);
        });
        LinearLayout.LayoutParams updateButtonSize = new LinearLayout.LayoutParams(dp(270), dp(60));
        updateButtonSize.leftMargin = dp(14);
        updateControls.addView(updateButton, updateButtonSize);
        dashboard.addView(updateControls);
        dashboard.addView(label(
                "Updates download in-app. Android will ask you to approve installation once. "
                + "No Downloader link is needed for later releases.", 15, MUTED, false));
        addSpace(dashboard, 16);

        dashboard.addView(label("TEST A DIRECT MEDIA LINK", 18, CYAN, true));
        LinearLayout controls = new LinearLayout(this);
        controls.setOrientation(LinearLayout.HORIZONTAL);

        manualUrl = new EditText(this);
        manualUrl.setSingleLine(true);
        manualUrl.setTextColor(Color.WHITE);
        manualUrl.setHintTextColor(MUTED);
        manualUrl.setTextSize(17);
        manualUrl.setHint("https://example.com/video.mp4");
        manualUrl.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        controls.addView(manualUrl, new LinearLayout.LayoutParams(0, dp(58), 1f));

        Button play = action("Play URL");
        play.setOnClickListener(v -> playUrl(manualUrl.getText().toString().trim()));
        LinearLayout.LayoutParams playSize = new LinearLayout.LayoutParams(dp(140), dp(58));
        playSize.leftMargin = dp(12);
        controls.addView(play, playSize);
        dashboard.addView(controls);
        addSpace(dashboard, 14);

        dashboard.addView(label("RECEIVER ACTIVITY", 18, CYAN, true));
        logLabel = label("Receiver starting...", 16, MUTED, false);
        ScrollView scroll = new ScrollView(this);
        scroll.addView(logLabel);
        dashboard.addView(scroll,
                new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        addSpace(dashboard, 8);
        dashboard.addView(label(
                "Use the TV remote's Back button to exit playback. "
                + "For discovery, keep this screen open and use the same home Wi-Fi.",
                15, MUTED, false));
    }

    private TextView label(String value, int sp, int color, boolean bold) {
        TextView result = new TextView(this);
        result.setText(value);
        result.setTextSize(sp);
        result.setTextColor(color);
        result.setGravity(Gravity.START);
        result.setPadding(0, dp(2), 0, dp(6));
        if (bold) result.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return result;
    }

    private Button action(String caption) {
        Button result = new Button(this);
        result.setText(caption);
        result.setAllCaps(false);
        result.setTextSize(17);
        result.setFocusable(true);
        return result;
    }

    private void addSpace(LinearLayout target, int dpHeight) {
        target.addView(new View(this), new LinearLayout.LayoutParams(1, dp(dpHeight)));
    }

    private int dp(int pixels) {
        return (int) (pixels * getResources().getDisplayMetrics().density + .5f);
    }

    private void log(String message) {
        String time = new java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.US)
                .format(new java.util.Date());
        recent.append(time).append("  ").append(message).append('\n');
        if (recent.length() > 5000) recent.delete(0, recent.length() - 3400);
        if (logLabel != null) logLabel.setText(recent.toString());
    }

    private void showDashboard() {
        watchingVideo = false;
        if (root != null && dashboard != null) {
            root.removeAllViews();
            root.addView(dashboard, new FrameLayout.LayoutParams(-1, -1));
        }
    }

    private void playUrl(String url) {
        if (!DlnaReceiver.validMediaUrl(url)) {
            showDashboard();
            log("Only http:// and https:// media URLs are allowed.");
            return;
        }
        try {
            queuedUri = url;
            player.setMediaItem(MediaItem.fromUri(url));
            player.prepare();
            player.play();
            root.removeAllViews();
            root.addView(videoView, new FrameLayout.LayoutParams(-1, -1));
            watchingVideo = true;
            log("Playing remote stream");
        } catch (RuntimeException error) {
            showDashboard();
            log("Unable to start playback: " + error.getClass().getSimpleName());
        }
    }

    private void stopPlayback(String reason) {
        player.stop();
        cachedPlaying = false;
        cachedPositionMs = 0;
        showDashboard();
        statusLabel.setText("DLNA receiver active — waiting for a sender");
        log(reason);
    }

    @Override public void onBackPressed() {
        if (watchingVideo) stopPlayback("Returned to receiver home");
        else super.onBackPressed();
    }

    @Override public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (watchingVideo) {
            if (keyCode == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE
                    || keyCode == KeyEvent.KEYCODE_MEDIA_PLAY
                    || keyCode == KeyEvent.KEYCODE_MEDIA_PAUSE) {
                if (keyCode == KeyEvent.KEYCODE_MEDIA_PLAY) player.play();
                else if (keyCode == KeyEvent.KEYCODE_MEDIA_PAUSE) player.pause();
                else if (player.isPlaying()) player.pause();
                else player.play();
                return true;
            }
            if (keyCode == KeyEvent.KEYCODE_MEDIA_REWIND) {
                player.seekTo(Math.max(0, player.getCurrentPosition() - 10000));
                return true;
            }
            if (keyCode == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD) {
                player.seekTo(player.getCurrentPosition() + 10000);
                return true;
            }
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override protected void onResume() {
        super.onResume();
        if (appUpdater != null) appUpdater.resumePendingInstall();
    }

    @Override protected void onDestroy() {
        if (appUpdater != null) appUpdater.close();
        main.removeCallbacks(cachePlaybackPosition);
        if (receiver != null) receiver.stop();
        if (videoView != null) videoView.setPlayer(null);
        if (player != null) player.release();
        super.onDestroy();
    }
}
