package com.zac.tvwebplayer;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.widget.FrameLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.datasource.DefaultDataSource;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.ui.PlayerView;

import java.util.HashMap;
import java.util.Map;

public class PlayerActivity extends Activity {
    public static final String EXTRA_MEDIA_URL = "media_url";
    public static final String EXTRA_PAGE_URL = "page_url";
    public static final String EXTRA_USER_AGENT = "user_agent";

    private ExoPlayer player;
    private ExoPlayer previewPlayer;
    private DefaultDataSource.Factory dataSourceFactory;
    private PlayerView playerView;
    private PlayerView seekPreviewPlayerView;
    private FrameLayout playerRoot;
    private FrameLayout seekPreviewCard;
    private TextView seekPreviewLabel;
    private final Handler uiHandler = new Handler(Looper.getMainLooper());
    private final Runnable hideSeekPreview = () -> {
        if (seekPreviewCard != null) seekPreviewCard.setVisibility(View.GONE);
    };
    private String mediaUrl;
    private long resumePosition;
    private boolean returningToBrowser;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemUi();

        mediaUrl = getIntent().getStringExtra(EXTRA_MEDIA_URL);
        if (mediaUrl == null || mediaUrl.trim().isEmpty()) {
            Toast.makeText(this, "No video URL was provided.", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        playerRoot = new FrameLayout(this);

        playerView = new PlayerView(this);
        playerView.setUseController(true);
        playerView.setControllerAutoShow(false);
        playerView.setControllerHideOnTouch(false);
        playerView.setControllerShowTimeoutMs(3500);
        playerRoot.addView(
                playerView,
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT));

        seekPreviewCard = new FrameLayout(this);
        seekPreviewCard.setVisibility(View.GONE);

        GradientDrawable seekBackground = new GradientDrawable();
        seekBackground.setColor(Color.rgb(4, 12, 24));
        seekBackground.setStroke(dp(2), Color.rgb(49, 184, 255));
        seekBackground.setCornerRadius(dp(10));
        seekPreviewCard.setBackground(seekBackground);
        seekPreviewCard.setPadding(dp(3), dp(3), dp(3), dp(3));

        seekPreviewPlayerView = new PlayerView(this);
        seekPreviewPlayerView.setUseController(false);
        seekPreviewPlayerView.setControllerAutoShow(false);
        seekPreviewPlayerView.setKeepContentOnPlayerReset(true);
        seekPreviewPlayerView.setBackgroundColor(Color.BLACK);
        seekPreviewCard.addView(
                seekPreviewPlayerView,
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT));

        seekPreviewLabel = new TextView(this);
        seekPreviewLabel.setTextColor(Color.WHITE);
        seekPreviewLabel.setTextSize(13f);
        seekPreviewLabel.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        seekPreviewLabel.setGravity(Gravity.CENTER);
        seekPreviewLabel.setPadding(dp(8), dp(4), dp(8), dp(4));
        seekPreviewLabel.setBackgroundColor(Color.argb(205, 4, 12, 24));

        FrameLayout.LayoutParams labelParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT);
        labelParams.gravity = Gravity.BOTTOM;
        seekPreviewCard.addView(seekPreviewLabel, labelParams);

        FrameLayout.LayoutParams seekParams = new FrameLayout.LayoutParams(
                dp(230),
                dp(136));
        seekParams.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
        seekParams.setMargins(0, 0, 0, dp(72));
        playerRoot.addView(seekPreviewCard, seekParams);

        setContentView(playerRoot);
    }

    private void initializePlayer() {
        if (player != null) return;

        String pageUrl = getIntent().getStringExtra(EXTRA_PAGE_URL);
        String userAgent = getIntent().getStringExtra(EXTRA_USER_AGENT);

        if (userAgent == null || userAgent.isEmpty()) {
            userAgent = WebSettings.getDefaultUserAgent(this);
        }

        Map<String, String> headers = new HashMap<>();

        String cookie = CookieManager.getInstance().getCookie(mediaUrl);
        if ((cookie == null || cookie.isEmpty()) && pageUrl != null) {
            cookie = CookieManager.getInstance().getCookie(pageUrl);
        }

        if (cookie != null && !cookie.isEmpty()) {
            headers.put("Cookie", cookie);
        }

        if (pageUrl != null && !pageUrl.isEmpty()) {
            headers.put("Referer", pageUrl);
        }

        DefaultHttpDataSource.Factory http = new DefaultHttpDataSource.Factory()
                .setUserAgent(userAgent)
                .setAllowCrossProtocolRedirects(true)
                .setDefaultRequestProperties(headers);

        dataSourceFactory = new DefaultDataSource.Factory(this, http);

        player = new ExoPlayer.Builder(this)
                .setMediaSourceFactory(new DefaultMediaSourceFactory(dataSourceFactory))
                .build();

        playerView.setPlayer(player);
        player.setMediaItem(MediaItem.fromUri(mediaUrl));
        player.prepare();

        if (resumePosition > 0) {
            player.seekTo(resumePosition);
        }

        player.play();
        playerView.showController();
    }

    private void releasePlayer() {
        if (previewPlayer != null) {
            previewPlayer.release();
            previewPlayer = null;
        }
        if (seekPreviewPlayerView != null) {
            seekPreviewPlayerView.setPlayer(null);
        }

        if (player != null) {
            resumePosition = player.getCurrentPosition();
            player.release();
            player = null;
            playerView.setPlayer(null);
        }
        dataSourceFactory = null;
    }

    private void ensurePreviewPlayer() {
        if (previewPlayer != null || dataSourceFactory == null) return;

        previewPlayer = new ExoPlayer.Builder(this)
                .setMediaSourceFactory(new DefaultMediaSourceFactory(dataSourceFactory))
                .build();
        previewPlayer.setVolume(0f);
        previewPlayer.setPlayWhenReady(false);
        previewPlayer.setMediaItem(MediaItem.fromUri(mediaUrl));
        previewPlayer.prepare();

        if (seekPreviewPlayerView != null) {
            seekPreviewPlayerView.setPlayer(previewPlayer);
        }
    }

    private void togglePlayPause() {
        if (player == null) return;

        if (player.isPlaying()) {
            player.pause();
        } else {
            player.play();
        }
    }

    private void seekBy(long milliseconds) {
        if (player == null) return;

        long duration = player.getDuration();
        long target = Math.max(
                0,
                player.getCurrentPosition() + milliseconds);

        if (duration != C.TIME_UNSET) {
            target = Math.min(duration, target);
        }

        player.seekTo(target);
        showSeekPreview(milliseconds, target, duration);
    }

    private void showSeekPreview(long delta, long target, long duration) {
        if (seekPreviewCard == null || seekPreviewLabel == null) return;

        ensurePreviewPlayer();
        if (previewPlayer != null) {
            previewPlayer.seekTo(target);
            previewPlayer.pause();
        }

        String action = delta < 0 ? "Rewind" : "Forward";
        String durationText =
                duration == C.TIME_UNSET || duration <= 0
                        ? ""
                        : " / " + formatTime(duration);

        seekPreviewLabel.setText(
                action
                        + " "
                        + Math.max(1, Math.abs(delta) / 1000)
                        + "s   "
                        + formatTime(target)
                        + durationText);
        seekPreviewCard.setVisibility(View.VISIBLE);
        seekPreviewCard.bringToFront();

        uiHandler.removeCallbacks(hideSeekPreview);
        uiHandler.postDelayed(hideSeekPreview, 1200);
    }

    private String formatTime(long milliseconds) {
        long totalSeconds = Math.max(0, milliseconds) / 1000;
        long hours = totalSeconds / 3600;
        long minutes = (totalSeconds % 3600) / 60;
        long seconds = totalSeconds % 60;

        if (hours > 0) {
            return String.format(
                    java.util.Locale.US,
                    "%d:%02d:%02d",
                    hours,
                    minutes,
                    seconds);
        }

        return String.format(
                java.util.Locale.US,
                "%d:%02d",
                minutes,
                seconds);
    }

    private boolean hidePlayerMenuIfVisible() {
        if (playerView == null) return false;
        if (!playerView.isControllerFullyVisible()) return false;

        playerView.hideController();
        return true;
    }

    private boolean isMediaPlaybackKey(int keyCode) {
        return keyCode == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE
                || keyCode == KeyEvent.KEYCODE_MEDIA_PLAY
                || keyCode == KeyEvent.KEYCODE_MEDIA_PAUSE;
    }

    private void handleMediaPlaybackKey(int keyCode) {
        if (player == null) return;

        switch (keyCode) {
            case KeyEvent.KEYCODE_MEDIA_PLAY:
                player.play();
                break;
            case KeyEvent.KEYCODE_MEDIA_PAUSE:
                player.pause();
                break;
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
                togglePlayPause();
                break;
            default:
                break;
        }
    }

    private void returnToBrowser() {
        if (returningToBrowser) return;
        returningToBrowser = true;

        Intent browserIntent = new Intent(this, MainActivity.class);
        browserIntent.addFlags(
                Intent.FLAG_ACTIVITY_CLEAR_TOP
                        | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(browserIntent);
        finish();
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_SPACE:
                togglePlayPause();
                return true;

            case KeyEvent.KEYCODE_DPAD_LEFT:
            case KeyEvent.KEYCODE_MEDIA_REWIND:
                seekBy(-10000);
                return true;

            case KeyEvent.KEYCODE_DPAD_RIGHT:
            case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD:
                seekBy(10000);
                return true;

            case KeyEvent.KEYCODE_DPAD_UP:
            case KeyEvent.KEYCODE_DPAD_DOWN:
                playerView.showController();
                return true;

            case KeyEvent.KEYCODE_BACK:
                if (!hidePlayerMenuIfVisible()) {
                    returnToBrowser();
                }
                return true;

            default:
                return super.onKeyDown(keyCode, event);
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int keyCode = event.getKeyCode();

        if (isMediaPlaybackKey(keyCode)) {
            if (event.getAction() == KeyEvent.ACTION_DOWN) {
                if (event.getRepeatCount() == 0) {
                    handleMediaPlaybackKey(keyCode);
                }
                return true;
            }
            if (event.getAction() == KeyEvent.ACTION_UP) {
                return true;
            }
        }

        return super.dispatchKeyEvent(event);
    }

    @Override
    public void onBackPressed() {
        if (!hidePlayerMenuIfVisible()) {
            returnToBrowser();
        }
    }

    @Override
    protected void onStart() {
        super.onStart();
        initializePlayer();
    }

    @Override
    protected void onStop() {
        uiHandler.removeCallbacks(hideSeekPreview);
        if (seekPreviewCard != null) seekPreviewCard.setVisibility(View.GONE);
        releasePlayer();
        super.onStop();
    }

    @Override
    protected void onResume() {
        super.onResume();
        hideSystemUi();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void hideSystemUi() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }
}
