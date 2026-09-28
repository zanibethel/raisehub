package com.zac.tvwebplayer;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
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
    private PlayerView playerView;
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

        playerView = new PlayerView(this);
        playerView.setUseController(true);
        playerView.setControllerAutoShow(false);
        playerView.setControllerHideOnTouch(false);
        playerView.setControllerShowTimeoutMs(3500);
        setContentView(playerView);
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

        DefaultDataSource.Factory dataSource =
                new DefaultDataSource.Factory(this, http);

        player = new ExoPlayer.Builder(this)
                .setMediaSourceFactory(new DefaultMediaSourceFactory(dataSource))
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
        if (player != null) {
            resumePosition = player.getCurrentPosition();
            player.release();
            player = null;
            playerView.setPlayer(null);
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
        playerView.showController();
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
        releasePlayer();
        super.onStop();
    }

    @Override
    protected void onResume() {
        super.onResume();
        hideSystemUi();
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
