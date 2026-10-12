package com.zac.webportalcast;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.StateListDrawable;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.inputmethod.EditorInfo;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

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
    private static final int FOCUS_YELLOW = Color.rgb(255, 216, 77);
    private static final String PREFS_SCREEN = "cast_tv_screen_fit";

    private final Handler main = new Handler(Looper.getMainLooper());
    private final StringBuilder recent = new StringBuilder();
    private FrameLayout root;
    private FrameLayout uiStage;
    private ScrollView dashboardScroll;
    private ScrollView reportScroll;
    private LinearLayout dashboard;
    private ScreenFitState screenFit;
    private FrameLayout fitOverlay;
    private TextView fitStatus;
    private boolean fitMoveMode;
    private String manualMediaUrl = "";
    private TextView mediaUrlPreview;
    private PlayerView videoView;
    private TextView statusLabel;
    private TextView logLabel;
    private ExoPlayer player;
    private AppUpdater appUpdater;
    private TextView updateLabel;
    private Button updateButton;
    private DlnaReceiver receiver;
    private CastDiagnostics diagnostics;
    private LinearLayout reportView;
    private TextView reportStatus;
    private TextView reportEvents;
    private TextView reportAddress;
    private ImageView reportQr;
    private Button reportStartButton;
    private Button reportStopButton;
    private boolean showingReport;
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
                    if (diagnostics != null)
                        diagnostics.record("ERROR", "Media decoder: " + error.getErrorCodeName());
                });
            }
            @Override public void onPlaybackStateChanged(int playbackState) {
                if (playbackState == Player.STATE_ENDED) {
                    runOnUiThread(() -> {
                        showDashboard();
                        log("Playback finished");
                    if (diagnostics != null) diagnostics.record("MEDIA", "Media playback finished");
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
        root.setClipChildren(false);
        uiStage = new FrameLayout(this);
        screenFit = loadScreenFit();
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
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
        diagnostics = new CastDiagnostics(this, () -> refreshReport());
        receiver.setDiagnostics(diagnostics);
        receiver.start();
        statusLabel.setText(receiver.isRunning()
                ? "DLNA receiver active — waiting for a sender"
                : "Receiver unavailable — see diagnostics");
        log("Local receiver address: " + receiver.getLocation());
    }

    private void makeDashboard() {
        dashboardScroll = new ScrollView(this);
        dashboardScroll.setFillViewport(true);
        dashboardScroll.setSmoothScrollingEnabled(true);
        dashboardScroll.setFocusable(false);
        dashboard = new LinearLayout(this);
        dashboard.setOrientation(LinearLayout.VERTICAL);
        dashboard.setPadding(dp(38), dp(26), dp(38), dp(22));
        dashboard.setBackgroundColor(NAVY);

        // Icon-only launcher artwork with safe margins; use the same scaled artwork
        // inside the app rather than embedding small, hard-to-read banner text.
        LinearLayout brandedHeader = new LinearLayout(this);
        brandedHeader.setOrientation(LinearLayout.HORIZONTAL);
        brandedHeader.setGravity(Gravity.CENTER_VERTICAL);
        ImageView mark = new ImageView(this);
        mark.setImageResource(R.drawable.app_icon);
        mark.setScaleType(ImageView.ScaleType.FIT_CENTER);
        brandedHeader.addView(mark, new LinearLayout.LayoutParams(dp(92), dp(92)));
        LinearLayout brandText = new LinearLayout(this);
        brandText.setOrientation(LinearLayout.VERTICAL);
        brandText.setPadding(dp(14), 0, 0, 0);
        brandText.addView(label("WEBPORTAL  CAST", 30, CYAN, true));
        brandText.addView(label("Your Fire TV's local media receiver — free, no session timer", 18, Color.WHITE, false));
        brandedHeader.addView(brandText, new LinearLayout.LayoutParams(0, -2, 1f));
        dashboard.addView(brandedHeader);
        addSpace(dashboard, 8);
        Button adjustFit = action("Screen Fit — resize / reposition TV view");
        adjustFit.setOnClickListener(v -> showScreenFit());
        dashboard.addView(adjustFit, new LinearLayout.LayoutParams(-1, dp(58)));
        dashboard.addView(label(
                "If any edge is cut off, select Screen Fit. Fire TV MENU also opens it.",
                15, MUTED, false));
        addSpace(dashboard, 12);

        statusLabel = label("Starting receiver...", 22, CYAN, true);
        dashboard.addView(statusLabel);
        addSpace(dashboard, 12);
        dashboard.addView(label(
                "Supported now: DLNA / UPnP local video and audio streaming. "
                + "Not yet supported: Quest built-in casting, Chromecast, AirPlay or Miracast.",
                17, MUTED, false));
        addSpace(dashboard, 16);

        dashboard.addView(label("QUEST CONNECTION REPORT", 18, CYAN, true));
        Button connectionReport = action("Open Cast Diagnostics");
        connectionReport.setOnClickListener(v -> showReport());
        dashboard.addView(connectionReport, new LinearLayout.LayoutParams(dp(350), dp(58)));
        dashboard.addView(label(
                "Find nearby Cast receivers, test Quest discovery and export a timestamped "
                + "connection report to your phone. Does not capture game audio/video.", 16, MUTED, false));
        addSpace(dashboard, 14);

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

        Button editUrl = action("Enter media URL");
        editUrl.setOnClickListener(v -> showMediaEntryDialog());
        controls.addView(editUrl, new LinearLayout.LayoutParams(0, dp(60), 1f));
        Button play = action("Play URL");
        play.setOnClickListener(v -> playUrl(manualMediaUrl.trim()));
        LinearLayout.LayoutParams playSize = new LinearLayout.LayoutParams(dp(170), dp(60));
        playSize.leftMargin = dp(12);
        controls.addView(play, playSize);
        dashboard.addView(controls);
        mediaUrlPreview = label("No URL entered. Choose Enter media URL to open a centered text dialog.", 16, MUTED, false);
        dashboard.addView(mediaUrlPreview);
        dashboard.addView(label(
                "Text entry uses your Fire TV system keyboard. Press Back to dismiss it. "
                + "Screen Fit adjusts this app, not the system keyboard.",
                14, MUTED, false));
        addSpace(dashboard, 14);

        dashboard.addView(label("RECEIVER ACTIVITY", 18, CYAN, true));
        logLabel = label("Receiver starting...", 16, MUTED, false);
        ScrollView scroll = new ScrollView(this);
        scroll.addView(logLabel);
        dashboard.addView(scroll,
                new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(140)));
        addSpace(dashboard, 8);
        dashboard.addView(label(
                "Use the TV remote's Back button to exit playback. "
                + "For discovery, keep this screen open and use the same home Wi-Fi.",
                15, MUTED, false));
        dashboardScroll.addView(dashboard, new ScrollView.LayoutParams(-1, -2));
    }

    private void showReport() {
        if (reportView == null) createReportView();
        showingReport = true;
        showFittedPage(reportScroll);
        refreshReport();
    }

    private void createReportView() {
        reportScroll = new ScrollView(this);
        reportScroll.setFillViewport(true);
        reportScroll.setSmoothScrollingEnabled(true);
        reportScroll.setFocusable(false);
        reportView = new LinearLayout(this);
        reportView.setOrientation(LinearLayout.VERTICAL);
        reportView.setBackgroundColor(NAVY);
        reportView.setPadding(dp(38), dp(15), dp(38), dp(18));
        reportView.addView(label("CAST DIAGNOSTICS / QUEST TEST", 25, CYAN, true));
        Button fitInReports = action("Screen Fit");
        fitInReports.setOnClickListener(v -> showScreenFit());
        reportView.addView(fitInReports, new LinearLayout.LayoutParams(dp(210), dp(56)));
        reportView.addView(label(
                "1. Start new test.  2. On Quest, select WebPortal Cast TEST in Chromecast.  "
                + "3. After Quest reports an error, stop the test and scan the QR code. "
                + "First verify the new Fire TV TLS key/signing test and local handshake. "
                + "If local TLS fails, send the report without retrying Quest. "
                + "This is diagnostics only, not a gameplay mirror.",
                16, Color.WHITE, false));

        LinearLayout buttons = new LinearLayout(this);
        buttons.setOrientation(LinearLayout.HORIZONTAL);
        reportStartButton = action("Start new test");
        reportStartButton.setOnClickListener(v -> {
            if (diagnostics != null) diagnostics.start();
            refreshReport();
        });
        buttons.addView(reportStartButton, new LinearLayout.LayoutParams(dp(225), dp(54)));
        reportStopButton = action("Stop test");
        reportStopButton.setOnClickListener(v -> {
            if (diagnostics != null) diagnostics.stopProbe();
            refreshReport();
        });
        LinearLayout.LayoutParams stopSize = new LinearLayout.LayoutParams(dp(160), dp(54));
        stopSize.leftMargin = dp(9);
        buttons.addView(reportStopButton, stopSize);
        Button back = action("Return home");
        back.setOnClickListener(v -> showDashboard());
        LinearLayout.LayoutParams backSize = new LinearLayout.LayoutParams(dp(175), dp(54));
        backSize.leftMargin = dp(9);
        buttons.addView(back, backSize);
        reportView.addView(buttons);

        reportStatus = label("Select Start new test", 16, CYAN, true);
        reportView.addView(reportStatus);

        LinearLayout details = new LinearLayout(this);
        details.setOrientation(LinearLayout.HORIZONTAL);
        details.setGravity(Gravity.CENTER_VERTICAL);
        reportQr = new ImageView(this);
        reportQr.setBackgroundColor(Color.WHITE);
        reportQr.setPadding(dp(4), dp(4), dp(4), dp(4));
        details.addView(reportQr, new LinearLayout.LayoutParams(dp(160), dp(160)));
        reportAddress = label("Private report link is generated when a test starts.", 17, MUTED, false);
        reportAddress.setPadding(dp(16), 0, 0, 0);
        details.addView(reportAddress, new LinearLayout.LayoutParams(0, dp(160), 1f));
        reportView.addView(details);

        reportView.addView(label("SESSION TIMELINE", 17, CYAN, true));
        ScrollView logScroll = new ScrollView(this);
        reportEvents = label("", 14, Color.WHITE, false);
        reportEvents.setTextIsSelectable(true);
        logScroll.addView(reportEvents);
        reportView.addView(logScroll, new LinearLayout.LayoutParams(-1, dp(200)));
        reportView.addView(label(
                "This test checks the dedicated server-mode TLS socket locally and reports "
                + "separate client/server failures. The TLS identity is self-signed, "
                + "not a certified Chromecast certificate. "
                + "A failed device-authentication check is expected. "
                + "Only TLS results and Cast message namespaces are logged, not payloads, passwords, IP addresses or game footage. "
                + "Reports remain on your local network while the app stays open.",
                14, MUTED, false));
        reportScroll.addView(reportView, new ScrollView.LayoutParams(-1, -2));
    }

    private void refreshReport() {
        if (reportView == null || diagnostics == null) return;
        reportStartButton.setEnabled(!diagnostics.isRunning());
        reportStopButton.setEnabled(diagnostics.isRunning());
        reportStatus.setText(diagnostics.summary());
        if (diagnostics.hasSession()) {
            String url = diagnostics.getReportUrl(receiver == null ? "" : receiver.getLocation());
            reportAddress.setText("PHONE REPORT LINK (local Wi-Fi):\n" + url
                    + "\n\nScan the code to open and copy the full report. "
                    + "Nearby service names may identify devices.");
            if (!url.isEmpty()) {
                try {
                    BitMatrix matrix = new QRCodeWriter().encode(url, BarcodeFormat.QR_CODE, 220, 220);
                    Bitmap bitmap = Bitmap.createBitmap(matrix.getWidth(), matrix.getHeight(), Bitmap.Config.ARGB_8888);
                    for (int y = 0; y < matrix.getHeight(); y++) {
                        for (int x = 0; x < matrix.getWidth(); x++) {
                            bitmap.setPixel(x, y, matrix.get(x, y) ? Color.BLACK : Color.WHITE);
                        }
                    }
                    reportQr.setImageBitmap(bitmap);
                } catch (Exception error) {
                    reportQr.setImageDrawable(null);
                    reportAddress.append("\nQR unavailable. Type the link into your phone browser.");
                }
            }
            String text = diagnostics.renderReport();
            int section = text.indexOf("EVENT TIMELINE");
            reportEvents.setText(section >= 0 ? text.substring(section) : text);
        } else {
            reportAddress.setText("Private report link will appear here after Start.");
            reportQr.setImageDrawable(null);
            reportEvents.setText("No test started.");
        }
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

    private GradientDrawable buttonShape(int fill, int stroke, int strokeWidthDp) {
        GradientDrawable result = new GradientDrawable();
        result.setColor(fill);
        result.setCornerRadius(dp(12));
        result.setStroke(dp(strokeWidthDp), stroke);
        return result;
    }

    private Button action(String caption) {
        Button result = new Button(this);
        result.setText(caption);
        result.setAllCaps(false);
        result.setTextSize(18);
        result.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        result.setSingleLine(false);
        result.setGravity(Gravity.CENTER);
        result.setPadding(dp(14), dp(7), dp(14), dp(7));
        result.setFocusable(true);
        result.setFocusableInTouchMode(true);
        result.setMinHeight(dp(52));

        // A bright, high-contrast focus outline that remains visible on navy
        // screens, rather than the device theme's subtle gray highlight.
        StateListDrawable backgrounds = new StateListDrawable();
        backgrounds.addState(new int[]{-android.R.attr.state_enabled},
                buttonShape(Color.rgb(30, 43, 55), Color.rgb(75, 90, 104), 1));
        backgrounds.addState(new int[]{android.R.attr.state_pressed},
                buttonShape(Color.rgb(255, 184, 44), Color.WHITE, 3));
        backgrounds.addState(new int[]{android.R.attr.state_focused},
                buttonShape(FOCUS_YELLOW, Color.WHITE, 4));
        backgrounds.addState(new int[]{},
                buttonShape(Color.rgb(20, 52, 70), CYAN, 2));
        result.setBackground(backgrounds);
        result.setTextColor(new ColorStateList(
                new int[][] {
                    new int[]{-android.R.attr.state_enabled},
                    new int[]{android.R.attr.state_focused},
                    new int[]{android.R.attr.state_pressed},
                    new int[]{}
                },
                new int[] {Color.rgb(145, 154, 164), NAVY, NAVY, Color.WHITE}));
        result.setOnFocusChangeListener((view, focused) -> {
            // No large zoom which could crop buttons near TV edges.
            view.animate().scaleX(focused ? 1.02f : 1f)
                    .scaleY(focused ? 1.02f : 1f).setDuration(110).start();
        });
        return result;
    }

    private void addSpace(LinearLayout target, int dpHeight) {
        target.addView(new View(this), new LinearLayout.LayoutParams(1, dp(dpHeight)));
    }

    private int dp(int pixels) {
        return (int) (pixels * getResources().getDisplayMetrics().density + .5f);
    }

    private ScreenFitState loadScreenFit() {
        SharedPreferences prefs = getSharedPreferences(PREFS_SCREEN, Context.MODE_PRIVATE);
        return new ScreenFitState(prefs.getInt("scale", 100),
                prefs.getInt("offsetX", 0), prefs.getInt("offsetY", 0));
    }

    private void persistScreenFit() {
        getSharedPreferences(PREFS_SCREEN, Context.MODE_PRIVATE).edit()
                .putInt("scale", screenFit.scalePercent)
                .putInt("offsetX", screenFit.offsetXDp)
                .putInt("offsetY", screenFit.offsetYDp)
                .apply();
    }

    private void applyScreenFit() {
        if (uiStage == null || screenFit == null) return;
        uiStage.post(() -> {
            if (uiStage == null || screenFit == null) return;
            uiStage.setPivotX(uiStage.getWidth() / 2f);
            uiStage.setPivotY(uiStage.getHeight() / 2f);
            uiStage.setScaleX(screenFit.scalePercent / 100f);
            uiStage.setScaleY(screenFit.scalePercent / 100f);
            uiStage.setTranslationX(dp(screenFit.offsetXDp));
            uiStage.setTranslationY(dp(screenFit.offsetYDp));
        });
    }

    private void adjustScreenFit(int scaleDelta, int dx, int dy) {
        if (screenFit == null) return;
        screenFit.zoom(scaleDelta);
        screenFit.move(dx, dy);
        persistScreenFit();
        applyScreenFit();
        refreshScreenFitStatus();
    }

    private void refreshScreenFitStatus() {
        if (fitStatus == null || screenFit == null) return;
        String status = "App view: " + screenFit.scalePercent + "%"
                + " | Horizontal: " + screenFit.offsetXDp + "dp"
                + " | Vertical: " + screenFit.offsetYDp + "dp";
        if (fitMoveMode) status += "\nMOVE MODE: use remote arrows; press OK or Back when done.";
        else status += "\nUse Smaller / Larger, or enter Move Mode to reposition.";
        fitStatus.setText(status);
    }

    private void showScreenFit() {
        if (watchingVideo || root == null || fitOverlay != null) return;
        fitMoveMode = false;
        fitOverlay = new FrameLayout(this);
        fitOverlay.setBackgroundColor(Color.argb(244, 5, 14, 28));
        fitOverlay.setFocusable(true);
        fitOverlay.setFocusableInTouchMode(true);

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setVerticalScrollBarEnabled(false);
        FrameLayout.LayoutParams scrollParams = new FrameLayout.LayoutParams(-1, -1);
        scrollParams.setMargins(dp(45), dp(24), dp(45), dp(24));
        fitOverlay.addView(scroll, scrollParams);
        LinearLayout panel = new LinearLayout(this);
        panel.setGravity(Gravity.CENTER_HORIZONTAL);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(20), dp(15), dp(20), dp(15));
        panel.setBackground(buttonShape(Color.rgb(8, 30, 46), CYAN, 2));
        scroll.addView(panel, new ScrollView.LayoutParams(-1, -2));

        TextView heading = label("SCREEN FIT  /  FIRE TV", 25, FOCUS_YELLOW, true);
        heading.setGravity(Gravity.CENTER);
        panel.addView(heading);
        panel.addView(label("If the TV crops the app, make it smaller first. "
                        + "Adjustments are saved and apply to Home and Cast Diagnostics.",
                17, Color.WHITE, false));
        fitStatus = label("", 19, CYAN, true);
        fitStatus.setGravity(Gravity.CENTER);
        panel.addView(fitStatus);

        LinearLayout zoom = new LinearLayout(this);
        zoom.setOrientation(LinearLayout.HORIZONTAL);
        Button smaller = action("−  Smaller");
        smaller.setOnClickListener(v -> adjustScreenFit(-ScreenFitState.SCALE_STEP, 0, 0));
        zoom.addView(smaller, new LinearLayout.LayoutParams(0, dp(62), 1f));
        Button larger = action("+  Larger");
        larger.setOnClickListener(v -> adjustScreenFit(ScreenFitState.SCALE_STEP, 0, 0));
        LinearLayout.LayoutParams largerParams = new LinearLayout.LayoutParams(0, dp(62), 1f);
        largerParams.leftMargin = dp(12);
        zoom.addView(larger, largerParams);
        panel.addView(zoom, new LinearLayout.LayoutParams(-1, dp(62)));

        addSpace(panel, 10);
        Button move = action("Move with remote arrows  (press OK)");
        move.setOnClickListener(v -> {
            fitMoveMode = true;
            refreshScreenFitStatus();
        });
        panel.addView(move, new LinearLayout.LayoutParams(-1, dp(62)));

        addSpace(panel, 10);
        LinearLayout bottom = new LinearLayout(this);
        bottom.setOrientation(LinearLayout.HORIZONTAL);
        Button center = action("Center position");
        center.setOnClickListener(v -> adjustScreenFit(0, -screenFit.offsetXDp, -screenFit.offsetYDp));
        bottom.addView(center, new LinearLayout.LayoutParams(0, dp(62), 1f));
        Button reset = action("Reset 100%");
        reset.setOnClickListener(v -> {
            screenFit.reset();
            persistScreenFit();
            applyScreenFit();
            refreshScreenFitStatus();
        });
        LinearLayout.LayoutParams resetParams = new LinearLayout.LayoutParams(0, dp(62), 1f);
        resetParams.leftMargin = dp(12);
        bottom.addView(reset, resetParams);
        panel.addView(bottom, new LinearLayout.LayoutParams(-1, dp(62)));

        addSpace(panel, 10);
        Button done = action("Save & return");
        done.setOnClickListener(v -> hideScreenFit());
        panel.addView(done, new LinearLayout.LayoutParams(-1, dp(62)));
        panel.addView(label("Tip: Press MENU on the Fire TV remote to reopen Screen Fit. "
                + "Back closes this panel. This cannot resize Fire TV system keyboards.",
                15, MUTED, false));

        root.addView(fitOverlay, new FrameLayout.LayoutParams(-1, -1));
        refreshScreenFitStatus();
        move.requestFocus();
    }

    private void hideScreenFit() {
        fitMoveMode = false;
        if (fitOverlay != null && root != null) root.removeView(fitOverlay);
        fitOverlay = null;
        fitStatus = null;
    }

    private void showMediaEntryDialog() {
        EditText edit = new EditText(this);
        edit.setSingleLine(true);
        edit.setTextColor(Color.WHITE);
        edit.setHintTextColor(MUTED);
        edit.setTextSize(20);
        edit.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        edit.setImeOptions(EditorInfo.IME_ACTION_DONE);
        edit.setHint("https://example.com/video.mp4");
        edit.setText(manualMediaUrl);
        edit.setSelectAllOnFocus(true);
        int gap = dp(18);
        LinearLayout container = new LinearLayout(this);
        container.setPadding(gap, dp(8), gap, dp(8));
        container.addView(edit, new LinearLayout.LayoutParams(-1, dp(64)));

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle("Enter a direct media URL")
                .setMessage("This is a centered text-entry window. "
                        + "The Fire TV may open its own on-screen keyboard.")
                .setView(container)
                .setPositiveButton("Save URL", (d, which) -> {
                    manualMediaUrl = edit.getText().toString().trim();
                    if (mediaUrlPreview != null) mediaUrlPreview.setText(
                            manualMediaUrl.isEmpty() ? "No URL entered." : "Saved URL: " + manualMediaUrl);
                })
                .setNegativeButton("Cancel", (d, which) -> {})
                .create();
        dialog.setOnShowListener(ignored -> {
            if (dialog.getWindow() != null) {
                dialog.getWindow().setBackgroundDrawable(
                        buttonShape(Color.rgb(8, 30, 46), CYAN, 2));
                dialog.getWindow().setSoftInputMode(
                        WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
                        | WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE);
            }
            edit.requestFocus();
        });
        dialog.show();
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
        showingReport = false;
        if (root != null && dashboardScroll != null) showFittedPage(dashboardScroll);
    }

    private void showFittedPage(View page) {
        hideScreenFit();
        uiStage.removeAllViews();
        if (page.getParent() instanceof ViewGroup) ((ViewGroup) page.getParent()).removeView(page);
        uiStage.addView(page, new FrameLayout.LayoutParams(-1, -1));
        root.removeAllViews();
        root.addView(uiStage, new FrameLayout.LayoutParams(-1, -1));
        applyScreenFit();
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
            hideScreenFit();
            root.removeAllViews();
            root.addView(videoView, new FrameLayout.LayoutParams(-1, -1));
            watchingVideo = true;
            log("Playing remote stream");
            if (diagnostics != null) diagnostics.record("MEDIA", "Remote media playback began");
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
        if (diagnostics != null) diagnostics.record("MEDIA", "Playback stopped");
    }

    @Override public void onBackPressed() {
        if (watchingVideo) stopPlayback("Returned to receiver home");
        else if (fitOverlay != null) {
            if (fitMoveMode) {
                fitMoveMode = false;
                refreshScreenFitStatus();
            } else hideScreenFit();
        }
        else if (showingReport) showDashboard();
        else super.onBackPressed();
    }

    @Override public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (!watchingVideo && keyCode == KeyEvent.KEYCODE_MENU && event.getRepeatCount() == 0) {
            if (fitOverlay != null) hideScreenFit();
            else showScreenFit();
            return true;
        }
        if (fitOverlay != null && fitMoveMode) {
            switch (keyCode) {
                case KeyEvent.KEYCODE_DPAD_LEFT: adjustScreenFit(0, -ScreenFitState.MOVE_STEP_DP, 0); return true;
                case KeyEvent.KEYCODE_DPAD_RIGHT: adjustScreenFit(0, ScreenFitState.MOVE_STEP_DP, 0); return true;
                case KeyEvent.KEYCODE_DPAD_UP: adjustScreenFit(0, 0, -ScreenFitState.MOVE_STEP_DP); return true;
                case KeyEvent.KEYCODE_DPAD_DOWN: adjustScreenFit(0, 0, ScreenFitState.MOVE_STEP_DP); return true;
                case KeyEvent.KEYCODE_DPAD_CENTER:
                case KeyEvent.KEYCODE_ENTER:
                    fitMoveMode = false;
                    refreshScreenFitStatus();
                    return true;
                default: break;
            }
        }
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

    @Override protected void onStop() {
        if (diagnostics != null) diagnostics.stopProbe();
        super.onStop();
    }

    @Override protected void onDestroy() {
        if (diagnostics != null) diagnostics.close();
        if (appUpdater != null) appUpdater.close();
        main.removeCallbacks(cachePlaybackPosition);
        if (receiver != null) receiver.stop();
        if (videoView != null) videoView.setPlayer(null);
        if (player != null) player.release();
        super.onDestroy();
    }
}
