package com.zac.tvwebplayer;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JsResult;
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
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.Toast;

import java.util.Locale;

public class MainActivity extends Activity {
    private static final String PREFS = "tv_web_player";
    private static final String PREF_HOME = "home_url";
    private static final String PREF_MOBILE = "mobile_mode";

    private FrameLayout root;
    private WebView webView;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private String defaultUserAgent;
    private String currentPageUrl;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemUi();

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        setContentView(root);

        setupWebView();

        String home = prefs().getString(PREF_HOME, "");
        if (home == null || home.trim().isEmpty()) {
            showWebsiteSetup(true);
        } else {
            loadUrl(normalizeUrl(home));
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
            public void onPageFinished(WebView view, String url) {
                currentPageUrl = url;
                super.onPageFinished(view, url);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customView != null) {
                    callback.onCustomViewHidden();
                    return;
                }
                customView = view;
                customViewCallback = callback;
                webView.setVisibility(View.GONE);
                root.addView(customView, new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT));
                hideSystemUi();
                customView.requestFocus();
            }

            @Override
            public void onHideCustomView() {
                exitCustomView();
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

        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        webView.requestFocus();
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

    private void showWebsiteSetup(boolean firstRun) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);

        int pad = dp(24);
        box.setPadding(pad, pad / 2, pad, 0);

        EditText input = new EditText(this);
        input.setSingleLine(true);
        input.setHint("example.com");
        input.setText(prefs().getString(PREF_HOME, ""));
        input.setSelectAllOnFocus(true);
        box.addView(input, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));

        CheckBox mobile = new CheckBox(this);
        mobile.setText("Mobile compatibility mode");
        mobile.setChecked(prefs().getBoolean(PREF_MOBILE, true));
        box.addView(mobile);

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle(firstRun ? "Choose website" : "Website settings")
                .setMessage("Enter the website this Fire TV app should open. Press the remote Menu button later to change it.")
                .setView(box)
                .setPositiveButton("Save & Open", null)
                .setNegativeButton(firstRun ? "Exit" : "Cancel", (d, which) -> {
                    if (firstRun) finish();
                })
                .create();

        dialog.setOnShowListener(d ->
                dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
                    String value = normalizeUrl(input.getText().toString());
                    Uri uri = Uri.parse(value);

                    if (value.isEmpty() || uri.getHost() == null) {
                        input.setError("Enter a valid website, such as example.com");
                        return;
                    }

                    prefs().edit()
                            .putString(PREF_HOME, value)
                            .putBoolean(PREF_MOBILE, mobile.isChecked())
                            .apply();

                    applyUserAgent();
                    dialog.dismiss();
                    loadUrl(value);
                }));

        dialog.setOnDismissListener(d -> {
            hideSystemUi();
            if (webView != null) webView.requestFocus();
        });

        dialog.show();
        input.requestFocus();
    }

    private void showMenu() {
        String[] actions = {
                "Home",
                "Reload",
                "Play page video in native player",
                "Change website",
                "Clear website cookies/cache",
                "Exit"
        };

        ListView list = new ListView(this);
        list.setAdapter(new ArrayAdapter<>(
                this,
                android.R.layout.simple_list_item_1,
                actions));

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle("TV Web Player")
                .setView(list)
                .setNegativeButton("Close", null)
                .create();

        list.setOnItemClickListener((parent, view, position, id) -> {
            dialog.dismiss();

            switch (position) {
                case 0:
                    loadUrl(prefs().getString(PREF_HOME, ""));
                    break;
                case 1:
                    webView.reload();
                    break;
                case 2:
                    playCurrentPageVideo();
                    break;
                case 3:
                    showWebsiteSetup(false);
                    break;
                case 4:
                    CookieManager.getInstance().removeAllCookies(null);
                    CookieManager.getInstance().flush();
                    webView.clearCache(true);
                    webView.clearHistory();
                    Toast.makeText(this, "Website data cleared.", Toast.LENGTH_SHORT).show();
                    break;
                case 5:
                    finish();
                    break;
                default:
                    break;
            }
        });

        dialog.setOnDismissListener(d -> webView.requestFocus());
        dialog.show();
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

    private void exitCustomView() {
        if (customView == null) return;

        root.removeView(customView);
        customView = null;
        webView.setVisibility(View.VISIBLE);
        webView.requestFocus();

        if (customViewCallback != null) {
            customViewCallback.onCustomViewHidden();
            customViewCallback = null;
        }

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

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_MENU) {
            showMenu();
            return true;
        }

        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (customView != null) {
                exitCustomView();
                return true;
            }

            if (webView.canGoBack()) {
                webView.goBack();
                return true;
            }
        }

        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
        hideSystemUi();
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
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
