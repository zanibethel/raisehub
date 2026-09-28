package com.zac.tvwebplayer;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JsResult;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ArrayAdapter;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final String PREFS = "tv_web_player";
    private static final String PREF_HOME = "home_url";
    private static final String PREF_MOBILE = "mobile_mode";
    private static final String PREF_SAVED_SITES = "saved_sites";
    private static final String PREF_SITE_MOBILE_PREFIX = "site_mobile_";
    private static final String PREF_PENDING_UPDATE_DOWNLOAD = "pending_update_download_id";
    private static final String PREF_UPDATE_PERMISSION_PENDING = "update_permission_pending";
    private static final String WEBPORTAL_APK_URL =
            "https://github.com/zanibethel/raisehub/releases/download/webportal/WebPortal.apk";
    private static final String WEBPORTAL_VERSION_URL =
            "https://raisehub.app/webportal-version.json";
    private static final int MAX_SAVED_SITES = 12;

    private FrameLayout root;
    private WebView webView;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private String defaultUserAgent;
    private String currentPageUrl;
    private long pendingUpdateDownloadId = -1L;
    private boolean updateReceiverRegistered;
    private volatile boolean webPlayerMode;
    private WebPortalAdBanner adBanner;
    private int adBannerInsetPx;
    private View cursorView;
    private boolean cursorMode;
    private boolean cursorHover;
    private float cursorX;
    private float cursorY;

    private final class WebPortalBridge {
        @JavascriptInterface
        public void setPlayerMode(boolean active) {
            runOnUiThread(() -> setWebPlayerMode(active));
        }
    }

    private void setWebPlayerMode(boolean active) {
        if (active && cursorMode) {
            setCursorMode(false);
        }
        if (webPlayerMode == active) {
            setAdBannerVisible(!active && customView == null);
            return;
        }

        webPlayerMode = active;
        setAdBannerVisible(!active && customView == null);

        if (active) {
            installTvNavigation();
        } else if (customView == null) {
            destroyTvNavigation();
        }
    }

    private final BroadcastReceiver updateDownloadReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (!DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(intent.getAction())) return;

            long downloadId = intent.getLongExtra(
                    DownloadManager.EXTRA_DOWNLOAD_ID,
                    -1L);
            if (downloadId != pendingUpdateDownloadId) return;

            installDownloadedUpdate(downloadId);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemUi();

        pendingUpdateDownloadId =
                prefs().getLong(PREF_PENDING_UPDATE_DOWNLOAD, -1L);
        registerUpdateReceiver();

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        setContentView(root);

        setupWebView();

        String home = prefs().getString(PREF_HOME, "");
        if (home == null || home.trim().isEmpty()) {
            showWebsiteSetup(true);
        } else {
            String normalizedHome = normalizeUrl(home);
            rememberSite(normalizedHome);
            loadUrl(normalizedHome);
        }
    }

    private SharedPreferences prefs() {
        return getSharedPreferences(PREFS, MODE_PRIVATE);
    }

    private void setupWebView() {
        webView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        webView.addJavascriptInterface(new WebPortalBridge(), "WebPortalBridge");

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);

        defaultUserAgent = settings.getUserAgentString();
        applyUserAgent();

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        if (android.os.Build.VERSION.SDK_INT >= 21) {
            cookies.setAcceptThirdPartyCookies(webView, true);
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleNavigation(request.getUrl().toString());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleNavigation(url);
            }

            @Override
            public void onPageStarted(
                    WebView view,
                    String url,
                    android.graphics.Bitmap favicon) {
                webPlayerMode = false;
                destroyTvNavigation();
                destroyPageCardNavigation();
                setAdBannerVisible(true);
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                currentPageUrl = url;
                super.onPageFinished(view, url);
                installPopupGuard();
                installFullscreenIntentGuard();
                installPlayerModeMonitor();
                if (!cursorMode) {
                    installPageCardNavigation();
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customView != null) {
                    callback.onCustomViewHidden();
                    return;
                }

                webView.evaluateJavascript(
                        "(function(){var until=window.__webPortalAllowFullscreenUntil||0;"
                                + "var allowed=Date.now()<=until;"
                                + "window.__webPortalAllowFullscreenUntil=0;"
                                + "return allowed;})()",
                        value -> {
                            if ("true".equals(value)) {
                                showCustomView(view, callback);
                            } else {
                                callback.onCustomViewHidden();
                                webView.setVisibility(View.VISIBLE);
                                webView.requestFocus();
                            }
                        });
            }

            @Override
            public void onHideCustomView() {
                exitCustomView();
            }

            @Override
            public boolean onCreateWindow(
                    WebView view,
                    boolean isDialog,
                    boolean isUserGesture,
                    android.os.Message resultMsg) {
                // WebPortal is intentionally single-tab. Reject popup/popunder windows.
                return false;
            }

            @Override
            public void onCloseWindow(WebView window) {
                // Secondary windows are never created.
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(request::deny);
            }

            @Override
            public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                        .setMessage(message)
                        .setPositiveButton("OK", (dialog, which) -> result.confirm())
                        .setOnCancelListener(dialog -> result.cancel())
                        .show();
                return true;
            }
        });

        adBannerInsetPx = 0;

        FrameLayout.LayoutParams webParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT);
        root.addView(webView, webParams);

        adBanner = new WebPortalAdBanner(
                this,
                this::openBannerDestination);
        FrameLayout.LayoutParams bannerParams = new FrameLayout.LayoutParams(
                dp(210),
                dp(74));
        bannerParams.gravity = Gravity.BOTTOM | Gravity.END;
        bannerParams.setMargins(0, 0, dp(10), dp(10));
        root.addView(adBanner, bannerParams);

        setupCursorOverlay();
        webView.requestFocus();
    }

    private void setupCursorOverlay() {
        cursorView = new View(this) {
            private final android.graphics.Paint ring =
                    new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);

            {
                setLayerType(View.LAYER_TYPE_SOFTWARE, null);
                ring.setStyle(android.graphics.Paint.Style.STROKE);
                ring.setStrokeCap(android.graphics.Paint.Cap.ROUND);
            }

            @Override
            protected void onDraw(android.graphics.Canvas canvas) {
                super.onDraw(canvas);
                float cx = getWidth() / 2f;
                float cy = getHeight() / 2f;
                float radius = Math.min(getWidth(), getHeight()) * 0.31f;

                ring.setStrokeWidth(dp(cursorHover ? 2 : 1));
                ring.setColor(
                        cursorHover
                                ? Color.rgb(110, 231, 249)
                                : Color.rgb(49, 184, 255));
                ring.setShadowLayer(
                        dp(cursorHover ? 9 : 4),
                        0,
                        0,
                        cursorHover
                                ? Color.rgb(110, 231, 249)
                                : Color.rgb(49, 184, 255));

                // Ring only: the center stays transparent so the target beneath
                // the cursor remains visible.
                canvas.drawCircle(cx, cy, radius, ring);
            }
        };
        cursorView.setVisibility(View.GONE);
        cursorView.setFocusable(false);
        cursorView.setClickable(false);

        int size = dp(26);
        FrameLayout.LayoutParams params =
                new FrameLayout.LayoutParams(size, size);
        params.gravity = Gravity.TOP | Gravity.START;
        root.addView(cursorView, params);
    }

    private void setCursorMode(boolean enabled) {
        if (cursorView == null || webView == null) return;

        if (enabled && (customView != null || webPlayerMode)) {
            Toast.makeText(
                    this,
                    "Cursor mode is available on normal web pages.",
                    Toast.LENGTH_SHORT).show();
            return;
        }

        cursorMode = enabled;
        if (!enabled) {
            cursorView.setVisibility(View.GONE);
            installPageCardNavigation();
            webView.requestFocus();
            Toast.makeText(this, "Cursor mode off.", Toast.LENGTH_SHORT).show();
            return;
        }

        if (cursorX <= 0f || cursorY <= 0f) {
            cursorX = root.getWidth() > 0 ? root.getWidth() * 0.5f : dp(320);
            cursorY = root.getHeight() > 0 ? root.getHeight() * 0.5f : dp(180);
        }

        destroyPageCardNavigation();
        webView.evaluateJavascript(
                "(function(){try{if(document.activeElement)document.activeElement.blur();}catch(e){}})()",
                null);
        positionCursor();
        cursorView.setVisibility(View.VISIBLE);
        cursorView.bringToFront();
        updateCursorHoverState();
        Toast.makeText(
                this,
                "Cursor mode on · D-pad moves · Select clicks · Back exits",
                Toast.LENGTH_LONG).show();
    }

    private void positionCursor() {
        if (cursorView == null || root == null) return;
        int size = cursorView.getLayoutParams() == null
                ? dp(32)
                : cursorView.getLayoutParams().width;
        float half = size / 2f;
        float maxX = Math.max(half, root.getWidth() - half);
        float maxY = Math.max(half, root.getHeight() - half);
        cursorX = Math.max(half, Math.min(maxX, cursorX));
        cursorY = Math.max(half, Math.min(maxY, cursorY));
        cursorView.setX(cursorX - half);
        cursorView.setY(cursorY - half);
    }

    private void updateCursorHoverState() {
        if (!cursorMode || cursorView == null || webView == null || root == null
                || webView.getWidth() <= 0 || webView.getHeight() <= 0) {
            return;
        }

        int[] webLocation = new int[2];
        int[] rootLocation = new int[2];
        webView.getLocationOnScreen(webLocation);
        root.getLocationOnScreen(rootLocation);

        float localX = cursorX - (webLocation[0] - rootLocation[0]);
        float localY = cursorY - (webLocation[1] - rootLocation[1]);

        if (localX < 0 || localY < 0
                || localX > webView.getWidth()
                || localY > webView.getHeight()) {
            cursorHover = false;
            cursorView.invalidate();
            return;
        }

        String js = "(function(){"
                + "var x=(" + localX + "/Math.max(" + webView.getWidth() + ",1))*innerWidth;"
                + "var y=(" + localY + "/Math.max(" + webView.getHeight() + ",1))*innerHeight;"
                + "var n=document.elementFromPoint(x,y);"
                + "while(n&&n!==document.body&&n!==document.documentElement){"
                + "if(n.matches&&n.matches('a[href],button,input,select,textarea,summary,"
                + "[role=button],[role=link],[role=menuitem],[role=tab],[onclick],[tabindex]')"
                + "&&n.getAttribute('tabindex')!=='-1')return true;"
                + "try{if(getComputedStyle(n).cursor==='pointer')return true;}catch(e){}"
                + "n=n.parentElement;}"
                + "return false;})()";

        webView.evaluateJavascript(js, value -> {
            boolean nextHover = "true".equals(value);
            if (cursorHover != nextHover) {
                cursorHover = nextHover;
                cursorView.invalidate();
            }
        });
    }

    private void pulseCursorClick() {
        if (cursorView == null) return;

        cursorView.animate().cancel();
        cursorView.setScaleX(1f);
        cursorView.setScaleY(1f);
        cursorView.animate()
                .scaleX(0.72f)
                .scaleY(0.72f)
                .setDuration(65)
                .withEndAction(() ->
                        cursorView.animate()
                                .scaleX(1.12f)
                                .scaleY(1.12f)
                                .setDuration(80)
                                .withEndAction(() ->
                                        cursorView.animate()
                                                .scaleX(1f)
                                                .scaleY(1f)
                                                .setDuration(70)
                                                .start())
                                .start())
                .start();
    }

    private void scrollAtCursor(int direction) {
        if (webView == null || webView.getWidth() <= 0 || webView.getHeight() <= 0) return;

        int[] webLocation = new int[2];
        int[] rootLocation = new int[2];
        webView.getLocationOnScreen(webLocation);
        root.getLocationOnScreen(rootLocation);

        float localX = cursorX - (webLocation[0] - rootLocation[0]);
        float localY = cursorY - (webLocation[1] - rootLocation[1]);
        int width = webView.getWidth();
        int height = webView.getHeight();
        int amount = Math.max(dp(180), Math.round(height * 0.45f)) * direction;

        String js = "(function(){"
                + "var vw=" + width + ",vh=" + height + ";"
                + "var x=(" + localX + "/Math.max(vw,1))*innerWidth;"
                + "var y=(" + localY + "/Math.max(vh,1))*innerHeight;"
                + "var n=document.elementFromPoint(x,y);"
                + "while(n&&n!==document.body&&n!==document.documentElement){"
                + "var s=getComputedStyle(n);"
                + "if((s.overflowY==='auto'||s.overflowY==='scroll')"
                + "&&n.scrollHeight>n.clientHeight+4){"
                + "n.scrollBy({top:" + amount + ",left:0,behavior:'smooth'});return true;}"
                + "n=n.parentElement;}"
                + "window.scrollBy({top:" + amount + ",left:0,behavior:'smooth'});"
                + "return true;})()";
        webView.evaluateJavascript(js, null);
        webView.postDelayed(this::updateCursorHoverState, 140);
    }

    private void moveCursor(int keyCode, int repeatCount) {
        if (!cursorMode || cursorView == null || root == null) return;

        float step = dp(repeatCount >= 6 ? 48 : repeatCount >= 2 ? 36 : 28);
        float edge = dp(26);

        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_LEFT:
                cursorX -= step;
                break;
            case KeyEvent.KEYCODE_DPAD_RIGHT:
                cursorX += step;
                break;
            case KeyEvent.KEYCODE_DPAD_UP:
                if (cursorY <= edge + step) {
                    cursorY = edge;
                    scrollAtCursor(-1);
                } else {
                    cursorY -= step;
                }
                break;
            case KeyEvent.KEYCODE_DPAD_DOWN:
                if (root.getHeight() > 0 && cursorY >= root.getHeight() - edge - step) {
                    cursorY = root.getHeight() - edge;
                    scrollAtCursor(1);
                } else {
                    cursorY += step;
                }
                break;
            default:
                return;
        }

        positionCursor();
        updateCursorHoverState();
    }

    private void clickCursor() {
        if (!cursorMode || webView == null || root == null) return;

        int[] webLocation = new int[2];
        int[] rootLocation = new int[2];
        webView.getLocationOnScreen(webLocation);
        root.getLocationOnScreen(rootLocation);

        float x = cursorX - (webLocation[0] - rootLocation[0]);
        float y = cursorY - (webLocation[1] - rootLocation[1]);
        if (x < 0 || y < 0 || x > webView.getWidth() || y > webView.getHeight()) return;

        pulseCursorClick();

        long now = android.os.SystemClock.uptimeMillis();
        android.view.MotionEvent down = android.view.MotionEvent.obtain(
                now,
                now,
                android.view.MotionEvent.ACTION_DOWN,
                x,
                y,
                0);
        android.view.MotionEvent up = android.view.MotionEvent.obtain(
                now,
                now + 45,
                android.view.MotionEvent.ACTION_UP,
                x,
                y,
                0);
        try {
            webView.dispatchTouchEvent(down);
            webView.dispatchTouchEvent(up);
            webView.postDelayed(this::updateCursorHoverState, 120);
        } finally {
            down.recycle();
            up.recycle();
        }
    }

    private void openBannerDestination(String url) {
        if (url == null || url.trim().isEmpty()) return;
        loadUrl(url);
    }

    private void setAdBannerVisible(boolean visible) {
        if (adBanner == null || webView == null) return;

        adBanner.setVisibility(visible ? View.VISIBLE : View.GONE);

        ViewGroup.LayoutParams rawParams = webView.getLayoutParams();
        if (rawParams instanceof FrameLayout.LayoutParams) {
            FrameLayout.LayoutParams params =
                    (FrameLayout.LayoutParams) rawParams;
            int desiredBottomMargin =
                    visible ? adBannerInsetPx : 0;
            if (params.bottomMargin != desiredBottomMargin) {
                params.bottomMargin = desiredBottomMargin;
                webView.setLayoutParams(params);
            }
        }
    }

    private void applyUserAgent() {
        boolean mobile = prefs().getBoolean(PREF_MOBILE, true);
        String userAgent = defaultUserAgent;
        if (mobile && userAgent != null &&
                !userAgent.toLowerCase(Locale.US).contains(" mobile")) {
            userAgent = userAgent + " Mobile";
        }
        webView.getSettings().setUserAgentString(userAgent);
    }

    private boolean handleNavigation(String url) {
        if (url == null) return false;

        if (isDirectMediaUrl(url)) {
            openNativePlayer(url);
            return true;
        }

        Uri uri = Uri.parse(url);
        String scheme = uri.getScheme();
        if (scheme == null || scheme.equals("http") || scheme.equals("https")) {
            return false;
        }

        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception ignored) {
            Toast.makeText(this, "No app can open this link.", Toast.LENGTH_SHORT).show();
        }
        return true;
    }

    private boolean isDirectMediaUrl(String url) {
        String clean = url.toLowerCase(Locale.US).split("\\?")[0].split("#")[0];
        return clean.endsWith(".mp4")
                || clean.endsWith(".m4v")
                || clean.endsWith(".webm")
                || clean.endsWith(".mkv")
                || clean.endsWith(".m3u8")
                || clean.endsWith(".mpd")
                || clean.endsWith(".mp3")
                || clean.endsWith(".aac")
                || clean.endsWith(".m4a");
    }

    private String normalizeUrl(String input) {
        String value = input == null ? "" : input.trim();
        if (value.isEmpty()) return value;

        if (!value.matches("^[a-zA-Z][a-zA-Z0-9+.-]*://.*")) {
            value = "https://" + value;
        }
        return value;
    }

    private void loadUrl(String url) {
        if (url == null || url.isEmpty()) return;
        currentPageUrl = url;
        webView.loadUrl(url);
        webView.requestFocus();
    }

    private List<String> getSavedSites() {
        String stored = prefs().getString(PREF_SAVED_SITES, "");
        List<String> sites = new ArrayList<>();
        if (stored == null || stored.isEmpty()) return sites;

        String[] values = stored.split("\n");
        for (String value : values) {
            String site = value.trim();
            if (!site.isEmpty() && !sites.contains(site)) {
                sites.add(site);
            }
        }
        return sites;
    }

    private void rememberSite(String url) {
        String normalized = normalizeUrl(url);
        if (normalized.isEmpty()) return;

        List<String> sites = getSavedSites();
        sites.remove(normalized);
        sites.add(0, normalized);

        if (sites.size() > MAX_SAVED_SITES) {
            sites = new ArrayList<>(sites.subList(0, MAX_SAVED_SITES));
        }

        prefs().edit()
                .putString(PREF_SAVED_SITES, String.join("\n", sites))
                .apply();
    }

    private void removeSavedSite(String url) {
        String normalized = normalizeUrl(url);
        if (normalized.isEmpty()) return;

        List<String> sites = getSavedSites();
        if (!sites.remove(normalized)) return;

        SharedPreferences.Editor editor = prefs().edit()
                .putString(PREF_SAVED_SITES, String.join("\n", sites))
                .remove(PREF_SITE_MOBILE_PREFIX + normalized);

        String currentHome = normalizeUrl(prefs().getString(PREF_HOME, ""));
        if (normalized.equals(currentHome)) {
            editor.remove(PREF_HOME);
        }

        editor.apply();
    }

    private android.graphics.drawable.GradientDrawable roundedBackground(
            int fillColor,
            int strokeColor,
            int strokeWidthDp,
            int radiusDp) {
        android.graphics.drawable.GradientDrawable background =
                new android.graphics.drawable.GradientDrawable();
        background.setColor(fillColor);
        background.setCornerRadius(dp(radiusDp));
        if (strokeWidthDp > 0) {
            background.setStroke(dp(strokeWidthDp), strokeColor);
        }
        return background;
    }

    private android.graphics.drawable.StateListDrawable focusBackground(
            int normalFill,
            int focusedFill,
            int normalStroke,
            int focusedStroke,
            int radiusDp) {
        android.graphics.drawable.StateListDrawable states =
                new android.graphics.drawable.StateListDrawable();

        android.graphics.drawable.GradientDrawable focused =
                roundedBackground(focusedFill, focusedStroke, 2, radiusDp);
        android.graphics.drawable.GradientDrawable normal =
                roundedBackground(normalFill, normalStroke, 1, radiusDp);

        states.addState(new int[] { android.R.attr.state_pressed }, focused);
        states.addState(new int[] { android.R.attr.state_focused }, focused);
        states.addState(new int[] { android.R.attr.state_selected }, focused);
        states.addState(new int[] { android.R.attr.state_activated }, focused);
        states.addState(android.util.StateSet.WILD_CARD, normal);
        return states;
    }

    private boolean mobileModeForSite(String url) {
        String normalized = normalizeUrl(url);
        boolean fallback = prefs().getBoolean(PREF_MOBILE, true);
        if (normalized.isEmpty()) return fallback;
        return prefs().getBoolean(PREF_SITE_MOBILE_PREFIX + normalized, fallback);
    }

    private void rememberMobileModeForSite(String url, boolean enabled) {
        String normalized = normalizeUrl(url);
        if (normalized.isEmpty()) return;
        prefs().edit()
                .putBoolean(PREF_SITE_MOBILE_PREFIX + normalized, enabled)
                .apply();
    }

    private void styleSetupSpinnerText(TextView view, boolean dropdown) {
        view.setTextColor(Color.WHITE);
        view.setTextSize(dropdown ? 18 : 20);
        view.setGravity(Gravity.CENTER_VERTICAL | Gravity.START);
        view.setSingleLine(true);
        view.setEllipsize(android.text.TextUtils.TruncateAt.END);
        view.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
        view.setTextDirection(View.TEXT_DIRECTION_LTR);
        view.setPadding(dp(16), 0, dp(16), 0);
        view.setMinHeight(dp(56));
        if (dropdown) {
            view.setBackground(focusBackground(
                    Color.parseColor("#10233D"),
                    Color.parseColor("#174D78"),
                    Color.parseColor("#294A70"),
                    Color.parseColor("#42C2FF"),
                    10));
        }
    }

    private void showWebsiteSetup(boolean firstRun) {
        final int white = Color.WHITE;
        final int muted = Color.parseColor("#D9E6F5");
        final int electricBlue = Color.parseColor("#31B8FF");
        FrameLayout screen = new FrameLayout(this);
        android.graphics.drawable.GradientDrawable screenBackground =
                new android.graphics.drawable.GradientDrawable(
                        android.graphics.drawable.GradientDrawable.Orientation.TL_BR,
                        new int[] {
                                Color.parseColor("#020814"),
                                Color.parseColor("#063A7C"),
                                Color.parseColor("#071427")
                        });
        screen.setBackground(screenBackground);

        View blueArt = new View(this) {
            private final android.graphics.Paint paint =
                    new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
            private final android.graphics.Path path = new android.graphics.Path();

            @Override
            protected void onDraw(android.graphics.Canvas canvas) {
                super.onDraw(canvas);
                float width = getWidth();
                float height = getHeight();

                paint.setStyle(android.graphics.Paint.Style.STROKE);
                paint.setStrokeCap(android.graphics.Paint.Cap.ROUND);
                paint.setStrokeWidth(Math.max(dp(24), width * 0.035f));
                paint.setColor(Color.argb(52, 48, 153, 255));

                android.graphics.RectF sweep = new android.graphics.RectF(
                        -width * 0.20f,
                        height * 0.20f,
                        width * 1.12f,
                        height * 1.18f);
                canvas.drawArc(sweep, 160f, 198f, false, paint);

                paint.setStrokeWidth(Math.max(dp(18), width * 0.026f));
                paint.setColor(Color.argb(42, 70, 167, 255));
                path.reset();
                path.moveTo(width * 0.72f, height * 0.17f);
                path.lineTo(width * 0.88f, height * 0.31f);
                path.lineTo(width * 0.78f, height * 0.43f);
                canvas.drawPath(path, paint);

                paint.setStrokeWidth(dp(2));
                paint.setColor(Color.argb(115, 68, 190, 255));
                canvas.drawLine(
                        width * 0.26f,
                        height * 0.285f,
                        width * 0.73f,
                        height * 0.285f,
                        paint);
            }
        };
        screen.addView(blueArt, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

        ImageView brandWatermark = new ImageView(this);
        brandWatermark.setImageResource(R.drawable.app_icon_neon);
        brandWatermark.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        brandWatermark.setAlpha(0.11f);
        FrameLayout.LayoutParams watermarkParams =
                new FrameLayout.LayoutParams(dp(220), dp(220));
        watermarkParams.gravity = Gravity.END | Gravity.CENTER_VERTICAL;
        watermarkParams.setMargins(0, 0, dp(36), 0);
        screen.addView(brandWatermark, watermarkParams);

        int displayWidth = getResources().getDisplayMetrics().widthPixels;
        int displayHeight = getResources().getDisplayMetrics().heightPixels;
        int safeHorizontal = Math.max(dp(32), Math.round(displayWidth * 0.045f));
        int panelWidth = Math.min(
                displayWidth - (safeHorizontal * 2),
                Math.round(displayWidth * 0.68f));

        LinearLayout stack = new LinearLayout(this);
        stack.setOrientation(LinearLayout.VERTICAL);
        stack.setGravity(Gravity.CENTER_HORIZONTAL);
        int outerPad = Math.max(dp(18), Math.round(displayHeight * 0.025f));
        stack.setPadding(safeHorizontal, outerPad, safeHorizontal, outerPad);

        TextView title = new TextView(this);
        title.setText(firstRun ? "Choose website" : "Website settings");
        title.setTextColor(white);
        title.setTextSize(30);
        title.setGravity(Gravity.CENTER);
        title.setShadowLayer(dp(10), 0, 0, Color.argb(150, 44, 181, 255));
        stack.addView(title, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView subtitle = new TextView(this);
        subtitle.setText(
                "Enter the website this Fire TV app should open. "
                        + "Press the remote Menu button later to change it.");
        subtitle.setTextColor(muted);
        subtitle.setTextSize(16);
        subtitle.setGravity(Gravity.CENTER);
        subtitle.setMaxLines(2);
        subtitle.setEllipsize(android.text.TextUtils.TruncateAt.END);
        LinearLayout.LayoutParams subtitleParams = new LinearLayout.LayoutParams(
                panelWidth,
                ViewGroup.LayoutParams.WRAP_CONTENT);
        subtitleParams.setMargins(0, dp(8), 0, dp(16));
        stack.addView(subtitle, subtitleParams);

        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(24), dp(20), dp(24), dp(20));
        panel.setBackground(roundedBackground(
                Color.argb(222, 6, 22, 43),
                Color.parseColor("#365D89"),
                1,
                18));
        panel.setElevation(dp(12));

        List<String> saved = getSavedSites();
        String currentHome = normalizeUrl(prefs().getString(PREF_HOME, ""));

        Spinner savedSites = null;
        List<String> choices = new ArrayList<>();
        int newSiteIndex = -1;

        android.widget.Button removeSaved = new android.widget.Button(this);
        removeSaved.setText("Remove");
        removeSaved.setAllCaps(false);
        removeSaved.setTextSize(15);
        removeSaved.setTextColor(Color.parseColor("#FFD9E2"));
        removeSaved.setMinHeight(dp(54));
        removeSaved.setStateListAnimator(null);
        removeSaved.setBackground(focusBackground(
                Color.parseColor("#35151D"),
                Color.parseColor("#5B2031"),
                Color.parseColor("#7A3045"),
                Color.parseColor("#FF6B8A"),
                10));

        EditText manualInput = new EditText(this);
        manualInput.setSingleLine(true);
        manualInput.setHint("example.com");
        manualInput.setHintTextColor(Color.parseColor("#86A1BE"));
        manualInput.setTextColor(white);
        manualInput.setTextSize(18);
        manualInput.setPadding(dp(18), 0, dp(18), 0);
        manualInput.setMinHeight(dp(54));
        manualInput.setSelectAllOnFocus(true);
        manualInput.setBackground(focusBackground(
                Color.parseColor("#0C1B31"),
                Color.parseColor("#102A48"),
                Color.parseColor("#2F6DA6"),
                electricBlue,
                10));

        CheckBox mobile = new CheckBox(this);
        mobile.setText("Mobile compatibility mode");
        mobile.setTextColor(white);
        mobile.setTextSize(17);
        mobile.setPadding(0, dp(8), 0, dp(8));
        mobile.setChecked(mobileModeForSite(currentHome));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            mobile.setButtonTintList(new android.content.res.ColorStateList(
                    new int[][] {
                            new int[] { android.R.attr.state_checked },
                            new int[] { -android.R.attr.state_checked }
                    },
                    new int[] {
                            electricBlue,
                            Color.parseColor("#91A8C0")
                    }));
        }

        if (!saved.isEmpty()) {
            choices.addAll(saved);
            choices.add("Enter a new website…");
            newSiteIndex = choices.size() - 1;

            savedSites = new Spinner(this);
            savedSites.setFocusable(true);
            savedSites.setClickable(true);
            savedSites.setPrompt("Saved websites");
            savedSites.setMinimumHeight(dp(54));
            savedSites.setBackground(focusBackground(
                    Color.parseColor("#0C1B31"),
                    Color.parseColor("#102A48"),
                    Color.parseColor("#2F6DA6"),
                    electricBlue,
                    10));

            final List<String> spinnerChoices = choices;
            ArrayAdapter<String> savedAdapter = new ArrayAdapter<String>(
                    this,
                    android.R.layout.simple_spinner_item,
                    spinnerChoices) {
                @Override
                public View getView(int position, View convertView, ViewGroup parent) {
                    TextView view = (TextView) super.getView(position, convertView, parent);
                    styleSetupSpinnerText(view, false);
                    String value = spinnerChoices.get(position);
                    view.setText(value + "   ▾");
                    return view;
                }

                @Override
                public View getDropDownView(int position, View convertView, ViewGroup parent) {
                    TextView view =
                            (TextView) super.getDropDownView(position, convertView, parent);
                    styleSetupSpinnerText(view, true);
                    view.setText(spinnerChoices.get(position));
                    return view;
                }
            };
            savedAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            savedSites.setAdapter(savedAdapter);

            int initialIndex = saved.indexOf(currentHome);
            if (initialIndex < 0) initialIndex = 0;
            savedSites.setSelection(initialIndex, false);
            mobile.setChecked(mobileModeForSite(saved.get(initialIndex)));

            final int finalNewSiteIndex = newSiteIndex;
            final Spinner finalSavedSites = savedSites;
            savedSites.setOnItemSelectedListener(
                    new android.widget.AdapterView.OnItemSelectedListener() {
                        @Override
                        public void onItemSelected(
                                android.widget.AdapterView<?> parent,
                                View view,
                                int position,
                                long id) {
                            boolean enteringNew = position == finalNewSiteIndex;
                            removeSaved.setEnabled(!enteringNew);
                            removeSaved.setAlpha(enteringNew ? 0.45f : 1f);

                            if (enteringNew) {
                                manualInput.setVisibility(View.VISIBLE);
                                manualInput.setText("");
                                manualInput.requestFocus();
                            } else {
                                manualInput.setVisibility(View.GONE);
                                String selected = spinnerChoices.get(position);
                                mobile.setChecked(mobileModeForSite(selected));
                                finalSavedSites.requestFocus();
                            }
                        }

                        @Override
                        public void onNothingSelected(
                                android.widget.AdapterView<?> parent) {
                        }
                    });

            LinearLayout savedRow = new LinearLayout(this);
            savedRow.setOrientation(LinearLayout.HORIZONTAL);
            savedRow.setGravity(Gravity.CENTER_VERTICAL);

            LinearLayout.LayoutParams savedSpinnerParams = new LinearLayout.LayoutParams(
                    0,
                    dp(56),
                    1f);
            savedSpinnerParams.setMargins(0, 0, dp(10), 0);
            savedRow.addView(savedSites, savedSpinnerParams);
            savedRow.addView(removeSaved, new LinearLayout.LayoutParams(
                    dp(132),
                    dp(56)));

            panel.addView(savedRow, new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    dp(56)));
            removeSaved.setEnabled(true);
            removeSaved.setAlpha(1f);
            manualInput.setVisibility(View.GONE);
        } else {
            manualInput.setText(currentHome);
            manualInput.setVisibility(View.VISIBLE);
        }

        LinearLayout.LayoutParams inputParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(56));
        if (!saved.isEmpty()) {
            inputParams.setMargins(0, dp(10), 0, 0);
        }
        panel.addView(manualInput, inputParams);

        LinearLayout.LayoutParams mobileParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT);
        mobileParams.setMargins(0, dp(10), 0, dp(8));
        panel.addView(mobile, mobileParams);

        LinearLayout buttons = new LinearLayout(this);
        buttons.setOrientation(LinearLayout.HORIZONTAL);
        buttons.setGravity(Gravity.CENTER);

        android.widget.Button primary = new android.widget.Button(this);
        primary.setText("Save & Open");
        primary.setAllCaps(false);
        primary.setTextSize(17);
        primary.setTextColor(Color.parseColor("#02101E"));
        primary.setMinHeight(dp(54));
        primary.setStateListAnimator(null);
        primary.setBackground(focusBackground(
                Color.parseColor("#27A8ED"),
                Color.parseColor("#57C9FF"),
                Color.parseColor("#8AD9FF"),
                Color.WHITE,
                10));

        android.widget.Button secondary = new android.widget.Button(this);
        secondary.setText(firstRun ? "Exit" : "Cancel");
        secondary.setAllCaps(false);
        secondary.setTextSize(17);
        secondary.setTextColor(white);
        secondary.setMinHeight(dp(54));
        secondary.setStateListAnimator(null);
        secondary.setBackground(focusBackground(
                Color.parseColor("#28384F"),
                Color.parseColor("#385A78"),
                Color.parseColor("#586D87"),
                electricBlue,
                10));

        LinearLayout.LayoutParams primaryParams = new LinearLayout.LayoutParams(
                0,
                dp(56),
                1f);
        primaryParams.setMargins(0, 0, dp(8), 0);
        buttons.addView(primary, primaryParams);

        LinearLayout.LayoutParams secondaryParams = new LinearLayout.LayoutParams(
                0,
                dp(56),
                1f);
        secondaryParams.setMargins(dp(8), 0, 0, 0);
        buttons.addView(secondary, secondaryParams);

        LinearLayout.LayoutParams buttonsParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT);
        buttonsParams.setMargins(0, dp(8), 0, 0);
        panel.addView(buttons, buttonsParams);

        LinearLayout.LayoutParams panelParams = new LinearLayout.LayoutParams(
                panelWidth,
                ViewGroup.LayoutParams.WRAP_CONTENT);
        stack.addView(panel, panelParams);

        FrameLayout.LayoutParams stackParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT);
        stackParams.gravity = Gravity.CENTER;
        screen.addView(stack, stackParams);

        android.app.Dialog dialog = new android.app.Dialog(
                this,
                android.R.style.Theme_Black_NoTitleBar_Fullscreen);
        dialog.setContentView(screen);
        dialog.setCancelable(!firstRun);
        dialog.setCanceledOnTouchOutside(false);

        final Spinner finalSavedSites = savedSites;
        final int finalNewSiteIndex = newSiteIndex;

        removeSaved.setOnClickListener(v -> {
            if (finalSavedSites == null) return;

            int position = finalSavedSites.getSelectedItemPosition();
            if (position < 0
                    || position == finalNewSiteIndex
                    || position >= choices.size()) {
                return;
            }

            String selected = choices.get(position);
            new AlertDialog.Builder(this)
                    .setTitle("Remove saved website?")
                    .setMessage(selected
                            + "\n\nThis removes it from WebPortal's saved-site list.")
                    .setNegativeButton("Keep", null)
                    .setPositiveButton("Remove", (confirmDialog, which) -> {
                        removeSavedSite(selected);
                        Toast.makeText(
                                this,
                                "Removed from saved websites.",
                                Toast.LENGTH_SHORT).show();
                        dialog.dismiss();
                        root.post(() -> showWebsiteSetup(false));
                    })
                    .show();
        });

        primary.setOnClickListener(v -> {
            String rawValue;
            if (finalSavedSites != null
                    && finalSavedSites.getSelectedItemPosition() != finalNewSiteIndex) {
                rawValue = choices.get(finalSavedSites.getSelectedItemPosition());
            } else {
                rawValue = manualInput.getText().toString();
            }

            String value = normalizeUrl(rawValue);
            Uri uri = Uri.parse(value);

            if (value.isEmpty() || uri.getHost() == null) {
                manualInput.setVisibility(View.VISIBLE);
                manualInput.setError("Enter a valid website, such as example.com");
                manualInput.requestFocus();
                return;
            }

            prefs().edit()
                    .putString(PREF_HOME, value)
                    .putBoolean(PREF_MOBILE, mobile.isChecked())
                    .apply();
            rememberMobileModeForSite(value, mobile.isChecked());
            rememberSite(value);

            applyUserAgent();
            dialog.dismiss();
            loadUrl(value);
        });

        secondary.setOnClickListener(v -> {
            dialog.dismiss();
            if (firstRun) finish();
        });

        dialog.setOnDismissListener(d -> {
            hideSystemUi();
            if (webView != null) webView.requestFocus();
        });

        dialog.setOnShowListener(d -> {
            Window window = dialog.getWindow();
            if (window != null) {
                window.setBackgroundDrawable(
                        new android.graphics.drawable.ColorDrawable(Color.TRANSPARENT));
                window.setDimAmount(0f);
                window.setLayout(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT);
                window.getDecorView().setSystemUiVisibility(
                        View.SYSTEM_UI_FLAG_FULLSCREEN
                                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
            }

            if (finalSavedSites != null) {
                finalSavedSites.requestFocus();
            } else {
                manualInput.requestFocus();
            }
        });

        dialog.show();
        Window window = dialog.getWindow();
        if (window != null) {
            window.setBackgroundDrawable(
                    new android.graphics.drawable.ColorDrawable(Color.TRANSPARENT));
            window.setDimAmount(0f);
            window.setLayout(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT);
        }
    }

    private String installedVersionName() {
        try {
            android.content.pm.PackageInfo info =
                    getPackageManager().getPackageInfo(getPackageName(), 0);
            return info.versionName == null ? "unknown" : info.versionName;
        } catch (Exception ignored) {
            return "unknown";
        }
    }

    private long installedVersionCode() {
        try {
            android.content.pm.PackageInfo info =
                    getPackageManager().getPackageInfo(getPackageName(), 0);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                return info.getLongVersionCode();
            }
            return info.versionCode;
        } catch (Exception ignored) {
            return -1L;
        }
    }

    private void showMenu() {
        String[] actions = {
                "Home",
                "Reload",
                cursorMode ? "Cursor mode: On" : "Cursor mode: Off",
                "Play page video in native player",
                "Change website",
                "Clear website cookies/cache",
                "Update WebPortal"
        };

        TextView versionStatus = new TextView(this);
        int statusPad = dp(16);
        versionStatus.setPadding(statusPad, dp(6), statusPad, dp(12));
        versionStatus.setTextSize(14f);
        versionStatus.setText(
                "Installed: WebPortal " + installedVersionName()
                        + " · Checking for updates…");

        ListView list = new ListView(this);
        list.addHeaderView(versionStatus, null, false);
        list.setAdapter(new ArrayAdapter<>(
                this,
                android.R.layout.simple_list_item_1,
                actions));

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle("WebPortal")
                .setView(list)
                .setNegativeButton("Close", null)
                .create();

        list.setOnItemClickListener((parent, view, position, id) -> {
            int actionPosition = position - list.getHeaderViewsCount();
            if (actionPosition < 0) return;

            dialog.dismiss();

            switch (actionPosition) {
                case 0:
                    loadUrl(prefs().getString(PREF_HOME, ""));
                    break;
                case 1:
                    webView.reload();
                    break;
                case 2:
                    setCursorMode(!cursorMode);
                    break;
                case 3:
                    playCurrentPageVideo();
                    break;
                case 4:
                    showWebsiteSetup(false);
                    break;
                case 5:
                    CookieManager.getInstance().removeAllCookies(null);
                    CookieManager.getInstance().flush();
                    webView.clearCache(true);
                    webView.clearHistory();
                    Toast.makeText(this, "Website data cleared.", Toast.LENGTH_SHORT).show();
                    break;
                case 6:
                    openUpdateDownload();
                    break;
                default:
                    break;
            }
        });

        dialog.setOnDismissListener(d -> webView.requestFocus());
        dialog.show();
        checkForUpdates(versionStatus);
    }

    private void checkForUpdates(TextView versionStatus) {
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(WEBPORTAL_VERSION_URL);
                connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(5000);
                connection.setReadTimeout(5000);
                connection.setRequestProperty("Accept", "application/json");
                connection.setUseCaches(false);

                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(connection.getInputStream()))) {
                    StringBuilder body = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        body.append(line);
                    }

                    JSONObject payload = new JSONObject(body.toString());
                    long latestCode = payload.optLong(
                            "versionCode",
                            installedVersionCode());
                    String latestName = payload.optString(
                            "versionName",
                            installedVersionName());

                    String status;
                    if (latestCode > installedVersionCode()) {
                        status = "Installed: WebPortal " + installedVersionName()
                                + " · Update available: " + latestName;
                    } else {
                        status = "Installed: WebPortal " + installedVersionName()
                                + " · Up to date";
                    }

                    runOnUiThread(() -> versionStatus.setText(status));
                }
            } catch (Exception error) {
                runOnUiThread(() ->
                        versionStatus.setText(
                                "Installed: WebPortal " + installedVersionName()
                                        + " · Update status unavailable"));
            } finally {
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    private void openUpdateDownload() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !getPackageManager().canRequestPackageInstalls()) {
            prefs().edit()
                    .putBoolean(PREF_UPDATE_PERMISSION_PENDING, true)
                    .apply();

            Toast.makeText(
                    this,
                    "Enable Allow from this source for WebPortal, then return here.",
                    Toast.LENGTH_LONG).show();

            try {
                Intent settingsIntent = new Intent(
                        Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:" + getPackageName()));
                startActivity(settingsIntent);
            } catch (Exception error) {
                prefs().edit()
                        .putBoolean(PREF_UPDATE_PERMISSION_PENDING, false)
                        .apply();
                Toast.makeText(
                        this,
                        "Could not open the install permission screen.",
                        Toast.LENGTH_LONG).show();
            }
            return;
        }

        beginUpdateDownload();
    }

    private void registerUpdateReceiver() {
        if (updateReceiverRegistered) return;

        IntentFilter filter = new IntentFilter(
                DownloadManager.ACTION_DOWNLOAD_COMPLETE);

        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(
                    updateDownloadReceiver,
                    filter,
                    Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(updateDownloadReceiver, filter);
        }
        updateReceiverRegistered = true;
    }

    private int getDownloadStatus(long downloadId) {
        if (downloadId <= 0) return -1;

        DownloadManager manager =
                (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
        if (manager == null) return -1;

        DownloadManager.Query query = new DownloadManager.Query()
                .setFilterById(downloadId);

        try (Cursor cursor = manager.query(query)) {
            if (cursor != null && cursor.moveToFirst()) {
                int statusColumn = cursor.getColumnIndex(
                        DownloadManager.COLUMN_STATUS);
                if (statusColumn >= 0) return cursor.getInt(statusColumn);
            }
        } catch (Exception ignored) {
        }

        return -1;
    }

    private void beginUpdateDownload() {
        if (pendingUpdateDownloadId > 0) {
            int status = getDownloadStatus(pendingUpdateDownloadId);

            if (status == DownloadManager.STATUS_SUCCESSFUL) {
                installDownloadedUpdate(pendingUpdateDownloadId);
                return;
            }

            if (status == DownloadManager.STATUS_PENDING
                    || status == DownloadManager.STATUS_RUNNING
                    || status == DownloadManager.STATUS_PAUSED) {
                Toast.makeText(
                        this,
                        "WebPortal update is already downloading.",
                        Toast.LENGTH_SHORT).show();
                return;
            }

            pendingUpdateDownloadId = -1L;
            prefs().edit().remove(PREF_PENDING_UPDATE_DOWNLOAD).apply();
        }

        DownloadManager manager =
                (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
        if (manager == null) {
            Toast.makeText(
                    this,
                    "Fire TV download service is unavailable.",
                    Toast.LENGTH_LONG).show();
            return;
        }

        try {
            String fileName =
                    "WebPortal-update-" + System.currentTimeMillis() + ".apk";

            DownloadManager.Request request =
                    new DownloadManager.Request(Uri.parse(WEBPORTAL_APK_URL))
                            .setTitle("WebPortal update")
                            .setDescription("Downloading the latest signed WebPortal release")
                            .setMimeType("application/vnd.android.package-archive")
                            .setNotificationVisibility(
                                    DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                            .setAllowedOverMetered(true)
                            .setAllowedOverRoaming(true)
                            .setDestinationInExternalFilesDir(
                                    this,
                                    Environment.DIRECTORY_DOWNLOADS,
                                    fileName);

            pendingUpdateDownloadId = manager.enqueue(request);
            prefs().edit()
                    .putLong(
                            PREF_PENDING_UPDATE_DOWNLOAD,
                            pendingUpdateDownloadId)
                    .apply();

            Toast.makeText(
                    this,
                    "Downloading WebPortal update…",
                    Toast.LENGTH_LONG).show();
        } catch (Exception error) {
            Toast.makeText(
                    this,
                    "Could not start the WebPortal update download.",
                    Toast.LENGTH_LONG).show();
        }
    }

    private void installDownloadedUpdate(long downloadId) {
        if (downloadId <= 0) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !getPackageManager().canRequestPackageInstalls()) {
            prefs().edit()
                    .putBoolean(PREF_UPDATE_PERMISSION_PENDING, true)
                    .apply();
            openUpdateDownload();
            return;
        }

        DownloadManager manager =
                (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
        if (manager == null) return;

        int status = getDownloadStatus(downloadId);
        if (status != DownloadManager.STATUS_SUCCESSFUL) {
            if (status == DownloadManager.STATUS_FAILED) {
                pendingUpdateDownloadId = -1L;
                prefs().edit().remove(PREF_PENDING_UPDATE_DOWNLOAD).apply();
                Toast.makeText(
                        this,
                        "WebPortal update download failed. Try again.",
                        Toast.LENGTH_LONG).show();
            }
            return;
        }

        Uri apkUri = manager.getUriForDownloadedFile(downloadId);
        if (apkUri == null) {
            Toast.makeText(
                    this,
                    "The downloaded update could not be opened.",
                    Toast.LENGTH_LONG).show();
            return;
        }

        try {
            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(
                    apkUri,
                    "application/vnd.android.package-archive");
            installIntent.addFlags(
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                            | Intent.FLAG_ACTIVITY_NEW_TASK);

            pendingUpdateDownloadId = -1L;
            prefs().edit()
                    .remove(PREF_PENDING_UPDATE_DOWNLOAD)
                    .remove(PREF_UPDATE_PERMISSION_PENDING)
                    .apply();

            startActivity(installIntent);
        } catch (Exception error) {
            Toast.makeText(
                    this,
                    "Could not open the Fire TV installer.",
                    Toast.LENGTH_LONG).show();
        }
    }

    private void playCurrentPageVideo() {
        String js = "(function(){var v=document.querySelector('video');"
                + "if(!v)return '';"
                + "var s=v.currentSrc||v.src||'';"
                + "if(!s){var x=v.querySelector('source');if(x)s=x.src||'';}"
                + "return s;})()";

        webView.evaluateJavascript(js, value -> {
            String url = decodeJsString(value);

            if (url == null || url.isEmpty() || "null".equals(url)) {
                Toast.makeText(
                        this,
                        "No direct video source found on this page.",
                        Toast.LENGTH_LONG).show();
                return;
            }

            if (url.startsWith("blob:") || url.startsWith("data:")) {
                Toast.makeText(
                        this,
                        "This video is browser-managed. Use the website player/fullscreen mode.",
                        Toast.LENGTH_LONG).show();
                return;
            }

            openNativePlayer(url);
        });
    }

    private String decodeJsString(String raw) {
        if (raw == null || raw.equals("null")) return null;

        String value = raw;
        if (value.startsWith("\"") && value.endsWith("\"") && value.length() >= 2) {
            value = value.substring(1, value.length() - 1);
        }

        return value
                .replace("\\u003C", "<")
                .replace("\\u003E", ">")
                .replace("\\u0026", "&")
                .replace("\\/", "/")
                .replace("\\\"", "\"")
                .replace("\\\\", "\\");
    }

    private void openNativePlayer(String mediaUrl) {
        Intent intent = new Intent(this, PlayerActivity.class);
        intent.putExtra(PlayerActivity.EXTRA_MEDIA_URL, mediaUrl);
        intent.putExtra(
                PlayerActivity.EXTRA_PAGE_URL,
                currentPageUrl == null ? webView.getUrl() : currentPageUrl);
        intent.putExtra(
                PlayerActivity.EXTRA_USER_AGENT,
                webView.getSettings().getUserAgentString());
        startActivity(intent);
    }

    private void showCustomView(View view, WebChromeClient.CustomViewCallback callback) {
        if (cursorMode) {
            setCursorMode(false);
        }
        if (customView != null) {
            callback.onCustomViewHidden();
            return;
        }

        customView = view;
        customViewCallback = callback;
        setAdBannerVisible(false);
        webView.setVisibility(View.GONE);
        root.addView(customView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        hideSystemUi();
        customView.requestFocus();
        webView.postDelayed(() -> installTvNavigation(), 120);
    }

    private void exitCustomView() {
        if (customView == null) return;

        webView.evaluateJavascript(
                "(function(){var v=document.querySelector('video');"
                        + "if(v&&!v.paused)try{v.pause();}catch(e){}"
                        + "if(window.__webPortalTV&&window.__webPortalTV.destroy){window.__webPortalTV.destroy();}})()",
                null);

        root.removeView(customView);
        customView = null;
        webPlayerMode = false;
        setAdBannerVisible(true);
        webView.setVisibility(View.VISIBLE);
        webView.requestFocus();

        if (customViewCallback != null) {
            customViewCallback.onCustomViewHidden();
            customViewCallback = null;
        }

        hideSystemUi();
    }


    private void installPageCardNavigation() {
        String js = """
(function(){
  if(window.__webPortalPageCards&&window.__webPortalPageCards.version===2){
    window.__webPortalPageCards.refresh();
    return;
  }

  var STYLE_ID='webportal-page-card-style';
  var FOCUS_CLASS='webportal-page-card-focused';
  var CARD_ATTR='data-webportal-page-card';
  var TAB_ATTR='data-webportal-page-tab-original';

  function visible(el){
    if(!el||!el.getBoundingClientRect)return false;
    var s=getComputedStyle(el),r=el.getBoundingClientRect();
    return s.display!=='none'
      &&s.visibility!=='hidden'
      &&s.pointerEvents!=='none'
      &&parseFloat(s.opacity||'1')>0
      &&r.width>=2&&r.height>=2
      &&r.bottom>0&&r.right>0
      &&r.top<innerHeight&&r.left<innerWidth;
  }

  function editable(el){
    if(!el)return false;
    var tag=(el.tagName||'').toLowerCase();
    if(tag==='textarea'||tag==='select'||el.isContentEditable)return true;
    if(tag!=='input')return false;
    var type=(el.getAttribute('type')||'text').toLowerCase();
    return !/^(button|submit|reset|checkbox|radio|range|file|color|hidden|image)$/.test(type);
  }

  function ensureFocusable(el){
    if(!el)return;
    if(!el.hasAttribute(TAB_ATTR)){
      var original=el.getAttribute('tabindex');
      el.setAttribute(TAB_ATTR,original===null?'__missing__':original);
    }
    el.setAttribute('tabindex','0');
  }

  function disableNestedFocus(card){
    if(!card||!card.querySelectorAll)return;
    var nested=card.querySelectorAll('a[href],button,[role=button],[role=link],[tabindex]');
    for(var i=0;i<nested.length;i++){
      var el=nested[i];
      if(el===card||editable(el))continue;
      if(!el.hasAttribute(TAB_ATTR)){
        var original=el.getAttribute('tabindex');
        el.setAttribute(TAB_ATTR,original===null?'__missing__':original);
      }
      el.setAttribute('tabindex','-1');
    }
  }

  function cardLike(el){
    if(!visible(el)||el===document.body||el===document.documentElement)return false;
    if(el.querySelector&&el.querySelector('input,textarea,select,[contenteditable=true]'))return false;
    if(el.querySelector&&el.querySelector('video'))return false;

    var r=el.getBoundingClientRect();
    if(r.width<110||r.height<78)return false;
    if(r.width>innerWidth*.78||r.height>innerHeight*.78)return false;

    var images=el.querySelectorAll?el.querySelectorAll('img,picture,svg,canvas'):[];
    if(images.length>7)return false;

    // Many streaming home pages paint poster art with CSS background-image
    // instead of an <img>. Treat those tiles as visual cards too.
    var hasVisual=images.length>0;
    if(!hasVisual){
      var ownBackground=(getComputedStyle(el).backgroundImage||'').toLowerCase();
      hasVisual=ownBackground&&ownBackground!=='none';
    }
    if(!hasVisual&&el.querySelectorAll){
      var descendants=el.querySelectorAll('*');
      var limit=Math.min(descendants.length,40);
      for(var vi=0;vi<limit;vi++){
        var bg=(getComputedStyle(descendants[vi]).backgroundImage||'').toLowerCase();
        if(bg&&bg!=='none'){hasVisual=true;break;}
      }
    }

    var text=(el.textContent||'').replace(/\s+/g,' ').trim();
    var hint=((el.className&&typeof el.className==='string'?el.className:'')+' '
      +(el.getAttribute('role')||'')+' '
      +(el.getAttribute('data-testid')||'')+' '
      +(el.getAttribute('data-type')||'')).toLowerCase();
    var named=/card|tile|poster|movie|show|media|content|result|item/.test(hint);
    var pointer=getComputedStyle(el).cursor==='pointer';
    var selfAction=el.matches&&el.matches('a[href],button,[role=button],[role=link],[onclick]');
    var actions=el.querySelectorAll?el.querySelectorAll('a[href],button,[role=button],[role=link],[onclick]').length:0;

    // Require either visual poster art or a strongly card-like/clickable element.
    // This avoids promoting generic layout containers while catching CSS-backed
    // home-page tiles whose poster is not a real image element.
    return (hasVisual&&(named||pointer||selfAction||actions>0))
      ||(selfAction&&text.length>=2&&r.width>=150&&r.height>=90)
      ||(named&&actions>0&&text.length>=2);
  }

  function collectCards(){
    var raw=[],seen=new Set();

    function add(el){
      if(!el||seen.has(el)||!cardLike(el))return;
      seen.add(el);
      raw.push(el);
    }

    var named=document.querySelectorAll(
      '[class*="card" i],[class*="tile" i],[class*="poster" i],[class*="movie" i],'
      +'[class*="show" i],[class*="media" i],[data-testid*="card" i],article,li'
    );
    for(var i=0;i<named.length;i++)add(named[i]);

    var seeds=document.querySelectorAll('img,a[href],button,[role=button]');
    for(var s=0;s<seeds.length;s++){
      var node=seeds[s],depth=0;
      while(node&&node!==document.body&&depth<5){
        if(cardLike(node)){add(node);break;}
        node=node.parentElement;
        depth++;
      }
    }

    raw.sort(function(a,b){
      var ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
      return (br.width*br.height)-(ar.width*ar.height);
    });

    var cards=[];
    for(var r=0;r<raw.length;r++){
      var candidate=raw[r],duplicate=false;
      for(var c=0;c<cards.length;c++){
        if(cards[c].contains(candidate)){
          duplicate=true;
          break;
        }
      }
      if(!duplicate)cards.push(candidate);
    }

    cards.sort(function(a,b){
      var ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
      if(Math.abs(ar.top-br.top)>24)return ar.top-br.top;
      return ar.left-br.left;
    });

    return cards;
  }

  function prepareCard(card){
    card.setAttribute(CARD_ATTR,'1');
    ensureFocusable(card);
    disableNestedFocus(card);
  }

  function cards(){
    var found=collectCards();
    for(var i=0;i<found.length;i++)prepareCard(found[i]);
    return found;
  }

  function cardFor(el,list){
    if(!el)return null;
    for(var i=0;i<list.length;i++){
      if(list[i]===el||list[i].contains(el))return list[i];
    }
    return null;
  }

  function mark(card){
    if(!card)return;
    var old=document.querySelectorAll('.'+FOCUS_CLASS);
    for(var i=0;i<old.length;i++)old[i].classList.remove(FOCUS_CLASS);
    card.classList.add(FOCUS_CLASS);
    try{card.focus({preventScroll:true});}catch(e){try{card.focus();}catch(e2){}}
    try{card.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});}
    catch(e3){try{card.scrollIntoView(false);}catch(e4){}}
  }

  function spatialMove(current,dir,list){
    var cr=current.getBoundingClientRect();
    var cx=cr.left+cr.width/2,cy=cr.top+cr.height/2;
    var best=null,bestScore=Infinity;

    for(var i=0;i<list.length;i++){
      var el=list[i];
      if(el===current||!visible(el))continue;
      var r=el.getBoundingClientRect();
      var x=r.left+r.width/2,y=r.top+r.height/2;
      var dx=x-cx,dy=y-cy,primary=0,secondary=0;

      if(dir==='left'){
        if(dx>=-4)continue;
        primary=-dx;secondary=Math.abs(dy);
      }else if(dir==='right'){
        if(dx<=4)continue;
        primary=dx;secondary=Math.abs(dy);
      }else if(dir==='up'){
        if(dy>=-4)continue;
        primary=-dy;secondary=Math.abs(dx);
      }else{
        if(dy<=4)continue;
        primary=dy;secondary=Math.abs(dx);
      }

      var score=primary+(secondary*.42)+(secondary/Math.max(primary,1))*32;
      if(score<bestScore){bestScore=score;best=el;}
    }

    if(best){
      mark(best);
      return true;
    }

    var amount=Math.max(220,Math.round(innerHeight*.55))*(dir==='down'?1:-1);
    if(dir==='up'||dir==='down'){
      window.scrollBy({top:amount,left:0,behavior:'smooth'});
      setTimeout(function(){
        refresh();
        var refreshed=cards(),target=null,bestDistance=Infinity;
        for(var j=0;j<refreshed.length;j++){
          var rr=refreshed[j].getBoundingClientRect();
          if(rr.bottom<=0||rr.top>=innerHeight)continue;
          var d=Math.abs((rr.top+rr.height/2)-innerHeight*.5);
          if(d<bestDistance){bestDistance=d;target=refreshed[j];}
        }
        if(target)mark(target);
      },180);
      return true;
    }

    return true;
  }

  function primaryTarget(card){
    if(!card)return null;
    if(card.matches&&card.matches('a[href],button,[role=button],[onclick]'))return card;

    var all=card.querySelectorAll
      ?card.querySelectorAll('a[href],button,[role=button],[onclick]')
      :[];
    var cardRect=card.getBoundingClientRect(),cardArea=Math.max(1,cardRect.width*cardRect.height);
    var best=null,bestScore=-Infinity;

    for(var i=0;i<all.length;i++){
      var el=all[i];
      if(!visible(el))continue;
      var r=el.getBoundingClientRect(),area=(r.width*r.height)/cardArea;
      var small=r.width<90&&r.height<90;
      var text=(el.textContent||'').replace(/\s+/g,' ').trim();
      var score=(area*1000)+(el.matches('a[href]')?120:0)+Math.min(text.length,60);
      if(small)score-=500;
      if(score>bestScore){bestScore=score;best=el;}
    }

    if(best)return best;

    var x=cardRect.left+cardRect.width*.5;
    var y=cardRect.top+cardRect.height*.5;
    var center=document.elementFromPoint(x,y);
    if(center&&center.closest){
      var clickable=center.closest('a[href],button,[role=button],[onclick]');
      if(clickable&&card.contains(clickable))return clickable;
    }

    return null;
  }

  function activate(card){
    var target=primaryTarget(card);
    try{
      if(target){
        target.click();
        return true;
      }
      card.click();
      return true;
    }catch(e){
      return false;
    }
  }

  function refresh(){
    if(!document.getElementById(STYLE_ID)){
      var style=document.createElement('style');
      style.id=STYLE_ID;
      style.textContent='.'+FOCUS_CLASS+','
        +'['+CARD_ATTR+']:focus,['+CARD_ATTR+']:focus-within'
        +'{outline:4px solid #6EE7F9 !important;outline-offset:3px !important;'
        +'box-shadow:0 0 0 2px rgba(11,18,32,.85),0 0 18px rgba(110,231,249,.92) !important;'
        +'border-radius:6px !important;}';
      (document.head||document.documentElement).appendChild(style);
    }
    cards();
  }

  function onFocus(event){
    if(window.__webPortalTV)return;
    var target=event.target;
    if(editable(target))return;

    var list=cards();
    var card=cardFor(target,list);
    if(card&&target!==card){
      setTimeout(function(){mark(card);},0);
    }
  }

  function onKey(event){
    if(window.__webPortalTV)return;
    var active=document.activeElement;
    if(editable(active))return;

    var list=cards();
    var card=cardFor(active,list);
    if(!card)return;

    var key=event.key;
    if(key==='ArrowLeft'||key==='ArrowRight'||key==='ArrowUp'||key==='ArrowDown'){
      event.preventDefault();
      event.stopPropagation();
      var dir=key.replace('Arrow','').toLowerCase();
      spatialMove(card,dir,list);
      return;
    }

    if(key==='Enter'||key==='NumpadEnter'||event.keyCode===13){
      event.preventDefault();
      event.stopPropagation();
      activate(card);
    }
  }

  document.addEventListener('focusin',onFocus,true);
  document.addEventListener('keydown',onKey,true);

  var observer=new MutationObserver(function(){
    clearTimeout(window.__webPortalPageCardTimer);
    window.__webPortalPageCardTimer=setTimeout(refresh,120);
  });
  observer.observe(document.documentElement,{
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:['style','class','role','tabindex','aria-hidden']
  });

  function destroy(){
    try{observer.disconnect();}catch(e){}
    clearTimeout(window.__webPortalPageCardTimer);
    document.removeEventListener('focusin',onFocus,true);
    document.removeEventListener('keydown',onKey,true);

    var changed=document.querySelectorAll('['+TAB_ATTR+']');
    for(var i=0;i<changed.length;i++){
      var el=changed[i],original=el.getAttribute(TAB_ATTR);
      if(original==='__missing__')el.removeAttribute('tabindex');
      else el.setAttribute('tabindex',original);
      el.removeAttribute(TAB_ATTR);
    }

    var prepared=document.querySelectorAll('['+CARD_ATTR+']');
    for(var p=0;p<prepared.length;p++){
      prepared[p].classList.remove(FOCUS_CLASS);
      prepared[p].removeAttribute(CARD_ATTR);
    }

    var style=document.getElementById(STYLE_ID);
    if(style&&style.parentNode)style.parentNode.removeChild(style);
    delete window.__webPortalPageCards;
  }

  window.__webPortalPageCards={
    version:2,
    refresh:refresh,
    destroy:destroy
  };

  refresh();
})();
""";
        webView.evaluateJavascript(js, null);
    }

    private void destroyPageCardNavigation() {
        if (webView == null) return;
        webView.evaluateJavascript(
                "(function(){if(window.__webPortalPageCards&&window.__webPortalPageCards.destroy){window.__webPortalPageCards.destroy();}})()",
                null);
    }

    private void installPopupGuard() {
        String js = """
(function(){
  if(window.__webPortalPopupGuardVersion===1)return;
  window.__webPortalPopupGuardVersion=1;

  function blockWindowOpen(){
    try{
      Object.defineProperty(window,'open',{
        configurable:true,
        writable:false,
        value:function(){return null;}
      });
    }catch(e){
      try{window.open=function(){return null;};}catch(e2){}
    }
  }

  function sanitize(root){
    if(!root||!root.querySelectorAll)return;
    var targets=root.querySelectorAll('a[target],form[target],area[target]');
    for(var i=0;i<targets.length;i++){
      var target=(targets[i].getAttribute('target')||'').toLowerCase();
      if(target==='_blank'||target==='_new'||target==='new'){
        targets[i].removeAttribute('target');
        targets[i].setAttribute('data-webportal-popup-guard','same-tab');
      }
    }
  }

  blockWindowOpen();
  sanitize(document);

  document.addEventListener('click',function(event){
    var node=event.target;
    var target=node&&node.closest?node.closest('a[target],area[target]'):null;
    if(!target)return;
    var value=(target.getAttribute('target')||'').toLowerCase();
    if(value==='_blank'||value==='_new'||value==='new'){
      target.removeAttribute('target');
    }
  },true);

  var observer=new MutationObserver(function(records){
    for(var i=0;i<records.length;i++){
      var record=records[i];
      for(var j=0;j<record.addedNodes.length;j++){
        var node=record.addedNodes[j];
        if(node&&node.nodeType===1){
          sanitize(node);
          if(node.matches&&node.matches('a[target],form[target],area[target]')){
            var value=(node.getAttribute('target')||'').toLowerCase();
            if(value==='_blank'||value==='_new'||value==='new'){
              node.removeAttribute('target');
            }
          }
        }
      }
    }
    blockWindowOpen();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
""";
        webView.evaluateJavascript(js, null);
    }

    private void installFullscreenIntentGuard() {
        String js =
                "(function(){"
                + "if(window.__webPortalFullscreenGuardInstalled)return;"
                + "function looksFullscreen(el){if(!el||!el.getBoundingClientRect)return false;"
                + "var r=el.getBoundingClientRect();"
                + "var text=((el.getAttribute('aria-label')||'')+' '+(el.getAttribute('title')||'')+' '+(el.getAttribute('data-tooltip')||'')+' '+(el.id||'')+' '+(el.className&&typeof el.className==='string'?el.className:'')+' '+(el.textContent||'')).toLowerCase();"
                + "if(/full.?screen|enter.?full|expand|maximi[sz]e/.test(text))return true;"
                + "return r.width>1&&r.width<140&&r.height>1&&r.height<140&&(r.left+r.width/2)>innerWidth*.78&&(r.top+r.height/2)>innerHeight*.68;}"
                + "document.addEventListener('click',function(event){"
                + "var el=event.target&&event.target.closest?event.target.closest('button,a,[role=button],[onclick],[tabindex]'):event.target;"
                + "window.__webPortalAllowFullscreenUntil=looksFullscreen(el)?Date.now()+2000:0;"
                + "},true);"
                + "window.__webPortalFullscreenGuardInstalled=true;"
                + "})();";
        webView.evaluateJavascript(js, null);
    }

    private void installPlayerModeMonitor() {
        String js =
                "(function(){"
                + "if(window.__webPortalPlayerMonitorVersion===2){"
                + "if(window.__webPortalReportPlayerMode)window.__webPortalReportPlayerMode();return;}"
                + "var last=null;"
                + "function visibleVideo(v){if(!v||!v.getBoundingClientRect)return false;"
                + "var r=v.getBoundingClientRect(),s=getComputedStyle(v);"
                + "return s.display!=='none'&&s.visibility!=='hidden'&&parseFloat(s.opacity||'1')>0"
                + "&&r.width>10&&r.height>10&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth;}"
                + "function isPlayerVideo(v){if(!visibleVideo(v))return false;"
                + "var r=v.getBoundingClientRect();"
                + "var large=r.width>=innerWidth*.5&&r.height>=innerHeight*.28;"
                + "var playing=!v.paused&&!v.ended;"
                + "var started=(v.currentTime||0)>.15;"
                + "return large&&(playing||started||v.controls);}"
                + "function activeVideo(){var videos=document.querySelectorAll('video');"
                + "for(var i=0;i<videos.length;i++){if(isPlayerVideo(videos[i]))return videos[i];}"
                + "return null;}"
                + "function autoOpen(v){if(!v||document.fullscreenElement)return;"
                + "var source=v.currentSrc||v.src||'__webportal_video__';"
                + "if(v.__webPortalAutoOpenedSource===source)return;"
                + "v.__webPortalAutoOpenedSource=source;"
                + "var target=v,p=v.parentElement;"
                + "if(p&&p.getBoundingClientRect){var vr=v.getBoundingClientRect(),pr=p.getBoundingClientRect();"
                + "if(pr.width<=vr.width*1.3&&pr.height<=vr.height*1.7&&pr.width>=vr.width*.9)target=p;}"
                + "window.__webPortalAllowFullscreenUntil=Date.now()+2500;"
                + "try{var request=target.requestFullscreen||target.webkitRequestFullscreen;"
                + "if(request){var result=request.call(target);if(result&&result.catch)result.catch(function(){});}"
                + "else if(v.webkitEnterFullscreen){v.webkitEnterFullscreen();}}catch(e){}}"
                + "function report(){var v=activeVideo();var active=!!document.fullscreenElement||!!v;"
                + "if(v&&!document.fullscreenElement)autoOpen(v);"
                + "if(active===last)return;last=active;"
                + "try{WebPortalBridge.setPlayerMode(active);}catch(e){}}"
                + "window.__webPortalReportPlayerMode=report;"
                + "window.__webPortalPlayerMonitorVersion=2;"
                + "document.addEventListener('play',function(event){var v=event.target;"
                + "if(v&&String(v.tagName).toLowerCase()==='video'&&isPlayerVideo(v))autoOpen(v);"
                + "setTimeout(report,20);},true);"
                + "['pause','ended','loadedmetadata','loadeddata','fullscreenchange'].forEach(function(name){"
                + "document.addEventListener(name,function(){setTimeout(report,40);},true);});"
                + "window.addEventListener('resize',function(){setTimeout(report,40);});"
                + "var observer=new MutationObserver(function(){clearTimeout(window.__webPortalPlayerMonitorTimer);"
                + "window.__webPortalPlayerMonitorTimer=setTimeout(report,100);});"
                + "observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class','controls','src']});"
                + "window.__webPortalPlayerMonitorInterval=setInterval(report,500);"
                + "report();"
                + "})();";
        webView.evaluateJavascript(js, null);
    }

    private void destroyTvNavigation() {
        if (webView == null) return;
        webView.evaluateJavascript(
                "(function(){if(window.__webPortalTV&&window.__webPortalTV.destroy){window.__webPortalTV.destroy();}})()",
                null);
    }

    private void installTvNavigation() {
        String js = """
(function(){
  if(window.__webPortalTV&&window.__webPortalTV.version===7){
    window.__webPortalTV.refresh();
    return;
  }

  var STYLE_ID='webportal-tv-focus-style';
  var FOCUS_CLASS='webportal-tv-focused';
  var CARD_ATTR='data-webportal-card';
  var TAB_ATTR='data-webportal-tab-original';
  var SELECTOR='a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=menuitem],[role=tab],[onclick],[tabindex]';
  var controlsMode=false;

  function allRoots(root,out){
    out.push(root);
    var nodes=root.querySelectorAll?root.querySelectorAll('*'):[];
    for(var i=0;i<nodes.length;i++){
      if(nodes[i].shadowRoot)allRoots(nodes[i].shadowRoot,out);
    }
    return out;
  }

  function visible(el){
    if(!el||!el.getBoundingClientRect)return false;
    var st=getComputedStyle(el),r=el.getBoundingClientRect();
    return !el.disabled
      &&el.getAttribute('aria-disabled')!=='true'
      &&el.getAttribute('aria-hidden')!=='true'
      &&st.display!=='none'
      &&st.visibility!=='hidden'
      &&st.pointerEvents!=='none'
      &&parseFloat(st.opacity||'1')>0
      &&r.width>=2&&r.height>=2;
  }

  function ensureFocusable(el){
    if(!el)return;
    var original=el.getAttribute('tabindex');
    if(original===null||parseInt(original||'0',10)<0){
      if(!el.hasAttribute(TAB_ATTR)){
        el.setAttribute(TAB_ATTR,original===null?'__missing__':original);
      }
      el.setAttribute('tabindex','0');
    }
  }

  function baseRoot(){
    return document.fullscreenElement||document;
  }

  function rowLike(el){
    if(!visible(el)||el===document.body||el===document.documentElement)return false;
    var r=el.getBoundingClientRect();
    if(r.width<Math.min(420,innerWidth*.42))return false;
    if(r.height<58||r.height>Math.min(330,innerHeight*.40))return false;
    if(el.querySelector&&el.querySelector('video'))return false;

    var text=(el.textContent||'').replace(/\s+/g,' ').trim();
    if(text.length<4)return false;

    var hint=((el.className&&typeof el.className==='string'?el.className:'')+' '
      +(el.getAttribute('role')||'')+' '
      +(el.getAttribute('data-testid')||'')+' '
      +(el.getAttribute('data-type')||'')).toLowerCase();
    var named=/episode|card|item|row|entry|result|media/.test(hint);
    var pointer=getComputedStyle(el).cursor==='pointer';
    var actions=el.querySelectorAll?el.querySelectorAll('button,a,[role=button],[tabindex],svg').length:0;
    return named||pointer||(actions>0&&text.length>=8);
  }

  function dedupeRows(rows){
    rows.sort(function(a,b){
      var ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
      if(Math.abs(ar.top-br.top)>8)return ar.top-br.top;
      return br.width-ar.width;
    });

    var out=[];
    for(var i=0;i<rows.length;i++){
      var r=rows[i].getBoundingClientRect(),duplicate=false;
      for(var j=0;j<out.length;j++){
        var e=out[j].getBoundingClientRect();
        var sameBand=Math.abs((r.top+r.height/2)-(e.top+e.height/2))<Math.min(r.height,e.height)*.42;
        if(sameBand){duplicate=true;break;}
      }
      if(!duplicate)out.push(rows[i]);
    }
    return out;
  }

  function episodeCards(){
    var base=baseRoot(),raw=[],seen=new Set();

    function add(el){
      if(!el||seen.has(el)||!rowLike(el))return;
      seen.add(el);
      el.setAttribute(CARD_ATTR,'1');
      ensureFocusable(el);
      raw.push(el);
    }

    var controls=base.querySelectorAll?base.querySelectorAll('button,a,[role=button],[tabindex]'):[];
    for(var i=0;i<controls.length;i++){
      var p=controls[i].parentElement,depth=0;
      while(p&&p!==base&&p!==document.body&&depth<6){
        if(rowLike(p)){add(p);break;}
        p=p.parentElement;
        depth++;
      }
    }

    var named=base.querySelectorAll
      ?base.querySelectorAll('[class*="episode" i],[class*="card" i],[class*="item" i],[class*="row" i],li,article')
      :[];
    for(var n=0;n<named.length;n++)add(named[n]);

    return dedupeRows(raw);
  }

  function standardCandidates(base){
    var roots=allRoots(base,[]),seen=new Set(),out=[];
    for(var r=0;r<roots.length;r++){
      var items=roots[r].querySelectorAll?roots[r].querySelectorAll(SELECTOR):[];
      for(var i=0;i<items.length;i++){
        var el=items[i];
        if(seen.has(el)||!visible(el))continue;
        seen.add(el);
        ensureFocusable(el);
        out.push(el);
      }
      var pointer=roots[r].querySelectorAll
        ?roots[r].querySelectorAll('svg,[class*=icon i],[class*=button i],[class*=control i]')
        :[];
      for(var p=0;p<pointer.length;p++){
        var icon=pointer[p];
        var host=icon.closest?icon.closest('button,a,[role=button],[role=link],[onclick],[tabindex]'):null;
        if(host&&!seen.has(host)&&visible(host)){
          seen.add(host);
          ensureFocusable(host);
          out.push(host);
        }
      }
    }
    return out;
  }

  function candidates(){
    return standardCandidates(baseRoot());
  }

  function marked(){
    var roots=allRoots(document,[]);
    for(var i=0;i<roots.length;i++){
      var m=roots[i].querySelector?roots[i].querySelector('.'+FOCUS_CLASS):null;
      if(m)return m;
    }
    return null;
  }

  function editable(el){
    if(!el)return false;
    var tag=(el.tagName||'').toLowerCase();
    if(tag==='textarea'||el.isContentEditable)return true;
    if(tag!=='input')return false;
    var type=(el.getAttribute('type')||'text').toLowerCase();
    return !/^(button|submit|reset|checkbox|radio|range|file|color|hidden|image)$/.test(type);
  }

  function clearMark(){
    var roots=allRoots(document,[]);
    for(var r=0;r<roots.length;r++){
      var old=roots[r].querySelectorAll?roots[r].querySelectorAll('.'+FOCUS_CLASS):[];
      for(var i=0;i<old.length;i++)old[i].classList.remove(FOCUS_CLASS);
    }
    var a=document.activeElement;
    if(a&&a.blur)try{a.blur();}catch(e){}
  }

  function mark(el){
    clearMark();
    if(!el)return;
    el.classList.add(FOCUS_CLASS);
    try{el.focus({preventScroll:true});}catch(e){try{el.focus();}catch(e2){}}
    try{el.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});}
    catch(e3){try{el.scrollIntoView(false);}catch(e4){}}
  }

  function cardFor(el,cards){
    if(!el)return null;
    for(var i=0;i<cards.length;i++){
      if(cards[i]===el||cards[i].contains(el))return cards[i];
    }
    return null;
  }

  function visibleCard(cards){
    var best=null,bestDistance=Infinity;
    for(var i=0;i<cards.length;i++){
      var r=cards[i].getBoundingClientRect();
      if(r.bottom<=0||r.top>=innerHeight)continue;
      var d=Math.abs((r.top+r.height/2)-innerHeight*.48);
      if(d<bestDistance){bestDistance=d;best=cards[i];}
    }
    return best||cards[0]||null;
  }

  function scrollableAncestor(el){
    var node=el&&el.parentElement;
    while(node&&node!==document.body&&node!==document.documentElement){
      try{
        var st=getComputedStyle(node);
        if(/auto|scroll/.test(st.overflowY||'')&&node.scrollHeight>node.clientHeight+12)return node;
      }catch(e){}
      node=node.parentElement;
    }
    return null;
  }

  function closeControl(cards){
    if(!cards.length)return null;
    var container=cards[0].parentElement;
    var depth=0;
    while(container&&container!==document.body&&depth<5){
      var controls=container.querySelectorAll?container.querySelectorAll('button,[role=button],a,[tabindex]'):[];
      for(var i=0;i<controls.length;i++){
        var text=(controls[i].textContent||'').trim().toLowerCase();
        if(visible(controls[i])&&/^(close|cancel|back)$/.test(text))return controls[i];
      }
      container=container.parentElement;
      depth++;
    }
    return null;
  }

  function scrollCards(card,dir){
    var scroller=scrollableAncestor(card);
    var amount=Math.max(card.getBoundingClientRect().height*1.25,innerHeight*.42)*(dir==='down'?1:-1);
    var canScroll=true;

    if(scroller){
      if(dir==='down'&&scroller.scrollTop+scroller.clientHeight>=scroller.scrollHeight-8)canScroll=false;
      if(dir==='up'&&scroller.scrollTop<=8)canScroll=false;
      if(canScroll)scroller.scrollBy({top:amount,left:0,behavior:'smooth'});
    }else{
      if(dir==='down'&&window.scrollY+innerHeight>=document.documentElement.scrollHeight-8)canScroll=false;
      if(dir==='up'&&window.scrollY<=8)canScroll=false;
      if(canScroll)window.scrollBy({top:amount,left:0,behavior:'smooth'});
    }

    if(!canScroll){
      var close=closeControl(episodeCards());
      if(close&&dir==='down'){mark(close);return true;}
      return true;
    }

    setTimeout(function(){
      refresh();
      var cards=episodeCards();
      var target=visibleCard(cards);
      if(target)mark(target);
    },180);
    return true;
  }

  function moveCardVertical(card,dir,cards){
    var cr=card.getBoundingClientRect();
    var cy=cr.top+cr.height/2;
    var best=null,bestDistance=Infinity;
    for(var i=0;i<cards.length;i++){
      var candidate=cards[i];
      if(candidate===card)continue;
      var r=candidate.getBoundingClientRect();
      var y=r.top+r.height/2;
      var delta=y-cy;
      if(dir==='down'&&delta<=4)continue;
      if(dir==='up'&&delta>=-4)continue;
      var distance=Math.abs(delta);
      if(distance<bestDistance){bestDistance=distance;best=candidate;}
    }
    if(best){mark(best);return true;}
    return scrollCards(card,dir);
  }

  function iconControls(card){
    var r=card.getBoundingClientRect(),all=standardCandidates(card),out=[];
    for(var i=0;i<all.length;i++){
      var c=all[i],cr=c.getBoundingClientRect();
      if(c===card)continue;
      var small=cr.width<=140&&cr.height<=140;
      var onRight=(cr.left+cr.width/2)>r.left+r.width*.52;
      if(small&&onRight)out.push(c);
    }
    out.sort(function(a,b){
      return a.getBoundingClientRect().left-b.getBoundingClientRect().left;
    });
    return out;
  }

  function moveWithinCard(card,current,dir){
    var icons=iconControls(card);
    if(!icons.length)return true;

    if(current===card||!card.contains(current)){
      if(dir==='right')mark(icons[0]);
      return true;
    }

    var index=icons.indexOf(current);
    if(index<0){
      if(dir==='right')mark(icons[0]);
      else mark(card);
      return true;
    }

    if(dir==='right'){
      if(index<icons.length-1)mark(icons[index+1]);
      return true;
    }

    if(index>0)mark(icons[index-1]);
    else mark(card);
    return true;
  }

  function activateCard(card){
    var r=card.getBoundingClientRect();
    var x=Math.max(r.left+12,Math.min(r.right-12,r.left+r.width*.34));
    var y=Math.max(r.top+12,Math.min(r.bottom-12,r.top+r.height*.5));
    var target=document.elementFromPoint(x,y)||card;
    try{
      if(target&&target.click)target.click();
      else card.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y}));
      return true;
    }catch(e){
      try{card.click();return true;}catch(e2){return false;}
    }
  }

  function overlayKey(key){
    var cards=episodeCards();
    if(cards.length<2)return false;

    var cur=marked()||document.activeElement;
    var card=cardFor(cur,cards);

    if(!card){
      var initial=visibleCard(cards);
      if(initial){
        mark(initial);
        if(key==='center')activateCard(initial);
      }
      return true;
    }

    if(key==='up'||key==='down')return moveCardVertical(card,key,cards);
    if(key==='left'||key==='right')return moveWithinCard(card,cur,key);
    if(key==='center'){
      if(cur!==card&&card.contains(cur))return activate();
      return activateCard(card);
    }
    return true;
  }

  function refresh(){
    if(!document.getElementById(STYLE_ID)){
      var s=document.createElement('style');
      s.id=STYLE_ID;
      s.textContent='.'+FOCUS_CLASS+'{outline:4px solid #6EE7F9 !important;outline-offset:3px !important;box-shadow:0 0 0 2px rgba(11,18,32,.85),0 0 14px rgba(110,231,249,.85) !important;}';
      (document.head||document.documentElement).appendChild(s);
    }

    candidates();
    var cards=episodeCards();
    if(cards.length>=2){
      var cur=marked()||document.activeElement;
      if(!cardFor(cur,cards)&&cur!==closeControl(cards)){
        var initial=visibleCard(cards);
        if(initial)mark(initial);
      }
    }
  }

  function wakeControls(){
    var targets=[document.fullscreenElement,document.querySelector('video'),document.body,document.documentElement];
    for(var i=0;i<targets.length;i++){
      var t=targets[i];
      if(!t)continue;
      try{t.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:Math.floor(innerWidth/2),clientY:Math.max(1,innerHeight-40)}));}catch(e){}
      try{t.dispatchEvent(new Event('mouseover',{bubbles:true}));}catch(e2){}
    }
  }

  function hideControls(){
    controlsMode=false;
    clearMark();
    var t=document.fullscreenElement||document.querySelector('video')||document.body;
    try{t.dispatchEvent(new Event('mouseleave',{bubbles:true}));}catch(e){}
    try{t.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:1,clientY:1}));}catch(e2){}
    return true;
  }

  function pickInitial(){
    var cards=episodeCards();
    if(cards.length>=2){
      var episode=visibleCard(cards);
      if(episode){mark(episode);return true;}
    }

    var list=candidates();
    if(!list.length)return false;
    var best=null,bestScore=Infinity,cx=innerWidth/2,cy=innerHeight-80;
    for(var i=0;i<list.length;i++){
      var r=list[i].getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
      var score=Math.hypot(x-cx,y-cy);
      if(score<bestScore){bestScore=score;best=list[i];}
    }
    if(best){mark(best);return true;}
    return false;
  }

  function showControls(){
    controlsMode=true;
    wakeControls();
    setTimeout(function(){refresh();pickInitial();wakeControls();},80);
    return true;
  }

  function onScreen(el){
    var r=el.getBoundingClientRect();
    return r.bottom>4&&r.top<innerHeight-4&&r.right>4&&r.left<innerWidth-4;
  }

  function scrollPage(cur,dir){
    if(dir!=='up'&&dir!=='down')return true;
    clearMark();
    var amount=Math.max(240,Math.round(innerHeight*.62))*(dir==='down'?1:-1);
    var node=scrollableAncestor(cur);
    if(node)node.scrollBy({top:amount,left:0,behavior:'smooth'});
    else window.scrollBy({top:amount,left:0,behavior:'smooth'});
    setTimeout(refresh,140);
    return true;
  }

  function move(dir){
    if(episodeCards().length>=2)return overlayKey(dir);

    wakeControls();
    var list=candidates(),cur=marked()||document.activeElement;
    if(!list.length)return scrollPage(cur,dir);

    var cx=innerWidth/2,cy=innerHeight/2;
    if(cur&&cur!==document.body&&cur!==document.documentElement&&list.indexOf(cur)>=0){
      var cr=cur.getBoundingClientRect();
      cx=cr.left+cr.width/2;
      cy=cr.top+cr.height/2;
    }

    var best=null,bestScore=Infinity;
    for(var i=0;i<list.length;i++){
      var el=list[i];
      if(el===cur||!onScreen(el))continue;
      var r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
      var dx=x-cx,dy=y-cy,primary=0,secondary=0;

      if(dir==='left'){if(dx>=-2)continue;primary=-dx;secondary=Math.abs(dy);}
      else if(dir==='right'){if(dx<=2)continue;primary=dx;secondary=Math.abs(dy);}
      else if(dir==='up'){if(dy>=-2)continue;primary=-dy;secondary=Math.abs(dx);}
      else{if(dy<=2)continue;primary=dy;secondary=Math.abs(dx);}

      var score=primary+(secondary*.45)+(secondary/Math.max(primary,1))*35;
      if(score<bestScore){bestScore=score;best=el;}
    }

    if(best){mark(best);return true;}
    return scrollPage(cur,dir);
  }

  function video(){
    return document.querySelector('video');
  }

  function togglePlay(){
    var v=video();
    if(!v)return false;
    try{if(v.paused)v.play();else v.pause();return true;}catch(e){return false;}
  }

  function seek(seconds){
    var v=video();
    if(!v||!isFinite(v.duration))return false;
    try{
      v.currentTime=Math.max(0,Math.min(v.duration||Number.MAX_SAFE_INTEGER,v.currentTime+seconds));
      return true;
    }catch(e){return false;}
  }

  function looksFullscreen(el){
    if(!el)return false;
    var r=el.getBoundingClientRect();
    var text=((el.getAttribute('aria-label')||'')+' '
      +(el.getAttribute('title')||'')+' '
      +(el.getAttribute('data-tooltip')||'')+' '
      +(el.id||'')+' '
      +(el.className&&typeof el.className==='string'?el.className:'')+' '
      +(el.textContent||'')).toLowerCase();
    if(/full.?screen|enter.?full|expand|maximi[sz]e/.test(text))return true;
    return r.width>1&&r.width<140&&r.height>1&&r.height<140
      &&(r.left+r.width/2)>innerWidth*.78
      &&(r.top+r.height/2)>innerHeight*.68;
  }

  function activate(){
    var cards=episodeCards();
    if(cards.length>=2)return overlayKey('center');

    var el=marked();
    if(!el)return togglePlay()?'activated':'none';
    if(editable(el)){
      try{el.focus({preventScroll:false});el.click();return 'editable';}
      catch(e){try{el.focus();return 'editable';}catch(e2){return 'none';}}
    }

    try{
      window.__webPortalAllowFullscreenUntil=looksFullscreen(el)?Date.now()+2000:0;
      el.click();
      wakeControls();
      return 'activated';
    }catch(e){
      window.__webPortalAllowFullscreenUntil=0;
      return 'none';
    }
  }

  function playerKey(key){
    if(episodeCards().length>=2)return overlayKey(key);
    if(key==='up'||key==='down'){
      if(!controlsMode)return showControls();
      return move(key);
    }
    if(key==='left'){
      if(!controlsMode)return seek(-10);
      return move('left');
    }
    if(key==='right'){
      if(!controlsMode)return seek(10);
      return move('right');
    }
    if(key==='center'){
      if(!controlsMode)return togglePlay();
      return activate()!=='none';
    }
    return false;
  }

  refresh();
  var observer=new MutationObserver(function(){
    clearTimeout(window.__webPortalTVTimer);
    window.__webPortalTVTimer=setTimeout(refresh,100);
  });
  observer.observe(document.documentElement,{
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:['style','class','role','tabindex','disabled','aria-hidden','aria-disabled']
  });

  function destroy(){
    try{observer.disconnect();}catch(e){}
    clearTimeout(window.__webPortalTVTimer);
    clearMark();

    var roots=allRoots(document,[]);
    for(var r=0;r<roots.length;r++){
      var cards=roots[r].querySelectorAll?roots[r].querySelectorAll('['+CARD_ATTR+']'):[];
      for(var c=0;c<cards.length;c++)cards[c].removeAttribute(CARD_ATTR);

      var changed=roots[r].querySelectorAll?roots[r].querySelectorAll('['+TAB_ATTR+']'):[];
      for(var i=0;i<changed.length;i++){
        var el=changed[i],original=el.getAttribute(TAB_ATTR);
        if(original==='__missing__')el.removeAttribute('tabindex');
        else el.setAttribute('tabindex',original);
        el.removeAttribute(TAB_ATTR);
      }
    }

    var style=document.getElementById(STYLE_ID);
    if(style&&style.parentNode)style.parentNode.removeChild(style);
    delete window.__webPortalTV;
  }

  window.__webPortalTV={
    version:7,
    refresh:refresh,
    move:move,
    activate:activate,
    playerKey:playerKey,
    showControls:showControls,
    hideControls:hideControls,
    controlsMode:function(){return controlsMode;},
    destroy:destroy
  };
})();
""";
        webView.evaluateJavascript(js, null);
    }

    private boolean handleTvNavigationKey(int keyCode) {
        if (webView == null) return false;

        String key;
        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_LEFT:
                key = "left";
                break;
            case KeyEvent.KEYCODE_DPAD_RIGHT:
                key = "right";
                break;
            case KeyEvent.KEYCODE_DPAD_UP:
                key = "up";
                break;
            case KeyEvent.KEYCODE_DPAD_DOWN:
                key = "down";
                break;
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
                key = "center";
                break;
            default:
                return false;
        }

        if (customView == null && !webPlayerMode) return false;

        if (webPlayerMode && customView == null) {
            installTvNavigation();
        }

        webView.evaluateJavascript(
                "window.__webPortalTV&&window.__webPortalTV.playerKey('" + key + "');",
                null);
        return true;
    }

    private boolean clearFullscreenPlayerControls() {
        if (customView == null || webView == null) return false;
        webView.evaluateJavascript(
                "(function(){if(window.__webPortalTV&&window.__webPortalTV.controlsMode&&window.__webPortalTV.controlsMode()){window.__webPortalTV.hideControls();return true;}return false;})()",
                value -> {
                    // The key event is consumed synchronously; this callback only updates visual state.
                });
        return true;
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

    private boolean isDpadNavigationKey(int keyCode) {
        return keyCode == KeyEvent.KEYCODE_DPAD_LEFT
                || keyCode == KeyEvent.KEYCODE_DPAD_RIGHT
                || keyCode == KeyEvent.KEYCODE_DPAD_UP
                || keyCode == KeyEvent.KEYCODE_DPAD_DOWN
                || keyCode == KeyEvent.KEYCODE_DPAD_CENTER
                || keyCode == KeyEvent.KEYCODE_ENTER;
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int keyCode = event.getKeyCode();

        if (cursorMode && customView == null && !webPlayerMode
                && isDpadNavigationKey(keyCode)) {
            if (event.getAction() == KeyEvent.ACTION_DOWN) {
                if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER
                        || keyCode == KeyEvent.KEYCODE_ENTER) {
                    if (event.getRepeatCount() == 0) {
                        clickCursor();
                    }
                } else {
                    moveCursor(keyCode, event.getRepeatCount());
                }
                return true;
            }
            if (event.getAction() == KeyEvent.ACTION_UP) {
                return true;
            }
        }

        boolean playerHasNavigationFocus =
                webView != null && (customView != null || webPlayerMode);

        if (playerHasNavigationFocus && isDpadNavigationKey(keyCode)) {
            if (event.getAction() == KeyEvent.ACTION_DOWN) {
                if ((keyCode == KeyEvent.KEYCODE_DPAD_CENTER
                        || keyCode == KeyEvent.KEYCODE_ENTER)
                        && event.getRepeatCount() > 0) {
                    return true;
                }
                return handleTvNavigationKey(keyCode);
            }
            if (event.getAction() == KeyEvent.ACTION_UP) {
                return true;
            }
        }

        return super.dispatchKeyEvent(event);
    }

    private String getSavedHomeUrl() {
        return normalizeUrl(prefs().getString(PREF_HOME, ""));
    }

    private String normalizedHost(Uri uri) {
        String host = uri == null ? null : uri.getHost();
        if (host == null) return "";
        host = host.toLowerCase(Locale.US);
        return host.startsWith("www.") ? host.substring(4) : host;
    }

    private String normalizedPath(Uri uri) {
        if (uri == null) return "/";
        String path = uri.getPath();
        if (path == null || path.trim().isEmpty()) return "/";
        while (path.length() > 1 && path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        return path;
    }

    private boolean isAtSavedHome() {
        String home = getSavedHomeUrl();
        String current = currentPageUrl;

        if ((current == null || current.trim().isEmpty()) && webView != null) {
            current = webView.getUrl();
        }

        if (home == null || home.trim().isEmpty()
                || current == null || current.trim().isEmpty()) {
            return false;
        }

        try {
            Uri homeUri = Uri.parse(home);
            Uri currentUri = Uri.parse(current);

            return normalizedHost(homeUri).equals(normalizedHost(currentUri))
                    && normalizedPath(homeUri).equals(normalizedPath(currentUri));
        } catch (Exception ignored) {
            return home.equalsIgnoreCase(current);
        }
    }

    private void navigateBackOrHome() {
        if (webView == null) return;

        if (isAtSavedHome()) {
            webView.requestFocus();
            return;
        }

        if (webView.canGoBack()) {
            webView.goBack();
            return;
        }

        String home = getSavedHomeUrl();
        if (home != null && !home.trim().isEmpty()) {
            loadUrl(home);
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_MENU) {
            showMenu();
            return true;
        }

        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (cursorMode) {
                setCursorMode(false);
                return true;
            }

            if (customView != null) {
                webView.evaluateJavascript(
                        "(function(){if(window.__webPortalTV&&window.__webPortalTV.controlsMode&&window.__webPortalTV.controlsMode()){window.__webPortalTV.hideControls();return 'hidden';}return 'exit';})()",
                        value -> {
                            if ("\"exit\"".equals(value)) {
                                runOnUiThread(this::exitCustomView);
                            }
                        });
                return true;
            }

            if (webPlayerMode) {
                webView.evaluateJavascript(
                        "(function(){if(window.__webPortalTV&&window.__webPortalTV.controlsMode&&window.__webPortalTV.controlsMode()){window.__webPortalTV.hideControls();return true;}return false;})()",
                        value -> {
                            if (!"true".equals(value)) {
                                runOnUiThread(this::navigateBackOrHome);
                            }
                        });
                return true;
            }

            navigateBackOrHome();
            return true;
        }

        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
        hideSystemUi();

        boolean waitingForInstallPermission =
                prefs().getBoolean(PREF_UPDATE_PERMISSION_PENDING, false);

        if (waitingForInstallPermission
                && (Build.VERSION.SDK_INT < Build.VERSION_CODES.O
                || getPackageManager().canRequestPackageInstalls())) {
            prefs().edit()
                    .putBoolean(PREF_UPDATE_PERMISSION_PENDING, false)
                    .apply();
            beginUpdateDownload();
            return;
        }

        if (pendingUpdateDownloadId > 0
                && getDownloadStatus(pendingUpdateDownloadId)
                == DownloadManager.STATUS_SUCCESSFUL) {
            installDownloadedUpdate(pendingUpdateDownloadId);
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (updateReceiverRegistered) {
            try {
                unregisterReceiver(updateDownloadReceiver);
            } catch (Exception ignored) {
            }
            updateReceiverRegistered = false;
        }

        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
        }
        super.onDestroy();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
