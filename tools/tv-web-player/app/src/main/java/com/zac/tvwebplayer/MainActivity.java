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

    private final class WebPortalBridge {
        @JavascriptInterface
        public void setPlayerMode(boolean active) {
            runOnUiThread(() -> setWebPlayerMode(active));
        }
    }

    private void setWebPlayerMode(boolean active) {
        if (webPlayerMode == active) return;

        webPlayerMode = active;
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
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                currentPageUrl = url;
                super.onPageFinished(view, url);
                installFullscreenIntentGuard();
                installPlayerModeMonitor();
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

        List<String> saved = getSavedSites();
        if (!saved.isEmpty()) {
            List<String> choices = new ArrayList<>();
            choices.add("Saved websites...");
            choices.addAll(saved);

            Spinner savedSites = new Spinner(this);
            ArrayAdapter<String> savedAdapter = new ArrayAdapter<>(
                    this,
                    android.R.layout.simple_spinner_item,
                    choices);
            savedAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            savedSites.setAdapter(savedAdapter);
            savedSites.setPrompt("Saved websites");
            savedSites.setFocusable(true);

            savedSites.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener() {
                @Override
                public void onItemSelected(
                        android.widget.AdapterView<?> parent,
                        View view,
                        int position,
                        long id) {
                    if (position > 0) {
                        input.setText(choices.get(position));
                        input.setSelection(input.getText().length());
                    }
                }

                @Override
                public void onNothingSelected(android.widget.AdapterView<?> parent) {
                }
            });

            box.addView(savedSites, new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT));
        }

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
                    rememberSite(value);

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
                "Play page video in native player",
                "Change website",
                "Clear website cookies/cache",
                "Update WebPortal",
                "Exit"
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
                    openUpdateDownload();
                    break;
                case 6:
                    finish();
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
        webView.postDelayed(() -> installTvNavigation(), 120);
    }

    private void exitCustomView() {
        if (customView == null) return;

        webView.evaluateJavascript(
                "(function(){if(window.__webPortalTV&&window.__webPortalTV.destroy){window.__webPortalTV.destroy();}})()",
                null);

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
                + "if(window.__webPortalPlayerMonitorVersion===1){"
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
                + "function detect(){if(document.fullscreenElement)return true;"
                + "var videos=document.querySelectorAll('video');"
                + "for(var i=0;i<videos.length;i++){if(isPlayerVideo(videos[i]))return true;}"
                + "return false;}"
                + "function report(){var active=detect();if(active===last)return;last=active;"
                + "try{WebPortalBridge.setPlayerMode(active);}catch(e){}}"
                + "window.__webPortalReportPlayerMode=report;"
                + "window.__webPortalPlayerMonitorVersion=1;"
                + "['play','pause','ended','loadedmetadata','loadeddata','fullscreenchange'].forEach(function(name){"
                + "document.addEventListener(name,function(){setTimeout(report,40);},true);});"
                + "window.addEventListener('resize',function(){setTimeout(report,40);});"
                + "var observer=new MutationObserver(function(){clearTimeout(window.__webPortalPlayerMonitorTimer);"
                + "window.__webPortalPlayerMonitorTimer=setTimeout(report,100);});"
                + "observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class','controls']});"
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
        String js =
                "(function(){"
                + "if(window.__webPortalTV&&window.__webPortalTV.version===6){window.__webPortalTV.refresh();return;}"
                + "var STYLE_ID='webportal-tv-focus-style';"
                + "var FOCUS_CLASS='webportal-tv-focused';"
                + "var SELECTOR='a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=menuitem],[role=tab],[onclick],[tabindex]';"
                + "var controlsMode=false;"
                + "function allRoots(root,out){out.push(root);var nodes=root.querySelectorAll?root.querySelectorAll('*'):[];for(var i=0;i<nodes.length;i++){if(nodes[i].shadowRoot)allRoots(nodes[i].shadowRoot,out);}return out;}"
                + "function visible(el){if(!el||!el.getBoundingClientRect)return false;var st=getComputedStyle(el),r=el.getBoundingClientRect();return !el.disabled&&el.getAttribute('aria-disabled')!=='true'&&el.getAttribute('aria-hidden')!=='true'&&st.display!=='none'&&st.visibility!=='hidden'&&st.pointerEvents!=='none'&&parseFloat(st.opacity||'1')>0&&r.width>=2&&r.height>=2;}"
                + "function candidates(){"
                + "var base=document.fullscreenElement||document;"
                + "var roots=allRoots(base,[]),seen=new Set(),out=[];"
                + "for(var r=0;r<roots.length;r++){"
                + "var items=roots[r].querySelectorAll?roots[r].querySelectorAll(SELECTOR):[];"
                + "for(var i=0;i<items.length;i++){var el=items[i];if(seen.has(el)||!visible(el))continue;seen.add(el);"
                + "var originalTab=el.getAttribute('tabindex');if(originalTab===null||parseInt(originalTab||'0',10)<0){el.setAttribute('data-webportal-tab-original',originalTab===null?'__missing__':originalTab);el.setAttribute('tabindex','0');}"
                + "out.push(el);}"
                + "var pointer=roots[r].querySelectorAll?roots[r].querySelectorAll('svg,[class*=icon i],[class*=button i],[class*=control i]'):[];"
                + "for(var p=0;p<pointer.length;p++){var icon=pointer[p],host=icon.closest?icon.closest('button,a,[role=button],[role=link],[onclick],[tabindex]'):null;if(host&&!seen.has(host)&&visible(host)){seen.add(host);var hostTab=host.getAttribute('tabindex');if(hostTab===null||parseInt(hostTab||'0',10)<0){host.setAttribute('data-webportal-tab-original',hostTab===null?'__missing__':hostTab);host.setAttribute('tabindex','0');}out.push(host);}}"
                + "}return out;}"
                + "function marked(){var roots=allRoots(document,[]);for(var i=0;i<roots.length;i++){var m=roots[i].querySelector?roots[i].querySelector('.'+FOCUS_CLASS):null;if(m)return m;}return null;}"
                + "function editable(el){if(!el)return false;var tag=(el.tagName||'').toLowerCase();if(tag==='textarea'||el.isContentEditable)return true;if(tag!=='input')return false;var type=(el.getAttribute('type')||'text').toLowerCase();return !/^(button|submit|reset|checkbox|radio|range|file|color|hidden|image)$/.test(type);}"
                + "function clearMark(){var roots=allRoots(document,[]);for(var r=0;r<roots.length;r++){var old=roots[r].querySelectorAll?roots[r].querySelectorAll('.'+FOCUS_CLASS):[];for(var i=0;i<old.length;i++)old[i].classList.remove(FOCUS_CLASS);}var a=document.activeElement;if(a&&a.blur)try{a.blur();}catch(e){}}"
                + "function mark(el){clearMark();if(!el)return;el.classList.add(FOCUS_CLASS);if(!editable(el)){try{el.focus({preventScroll:true});}catch(e){try{el.focus();}catch(e2){}}}try{el.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});}catch(e3){try{el.scrollIntoView(false);}catch(e4){}}}"
                + "function refresh(){"
                + "if(!document.getElementById(STYLE_ID)){var s=document.createElement('style');s.id=STYLE_ID;s.textContent='.'+FOCUS_CLASS+'{outline:4px solid #6EE7F9 !important;outline-offset:3px !important;box-shadow:0 0 0 2px rgba(11,18,32,.85),0 0 14px rgba(110,231,249,.85) !important;}';(document.head||document.documentElement).appendChild(s);}"
                + "candidates();}"
                + "function wakeControls(){"
                + "var targets=[document.fullscreenElement,document.querySelector('video'),document.body,document.documentElement];"
                + "for(var i=0;i<targets.length;i++){var t=targets[i];if(!t)continue;try{t.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:Math.floor(innerWidth/2),clientY:Math.max(1,innerHeight-40)}));}catch(e){}try{t.dispatchEvent(new Event('mouseover',{bubbles:true}));}catch(e2){}}"
                + "}"
                + "function hideControls(){controlsMode=false;clearMark();var t=document.fullscreenElement||document.querySelector('video')||document.body;try{t.dispatchEvent(new Event('mouseleave',{bubbles:true}));}catch(e){}try{t.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:1,clientY:1}));}catch(e2){}return true;}"
                + "function pickInitial(){var list=candidates();if(!list.length)return false;var best=null,bestScore=Infinity,cx=innerWidth/2,cy=innerHeight-80;for(var i=0;i<list.length;i++){var r=list[i].getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,score=Math.hypot(x-cx,y-cy);if(score<bestScore){bestScore=score;best=list[i];}}if(best){mark(best);return true;}return false;}"
                + "function showControls(){controlsMode=true;wakeControls();setTimeout(function(){refresh();pickInitial();wakeControls();},80);return true;}"
                + "function onScreen(el){var r=el.getBoundingClientRect();return r.bottom>4&&r.top<innerHeight-4&&r.right>4&&r.left<innerWidth-4;}"
                + "function scrollPage(cur,dir){if(dir!=='up'&&dir!=='down')return true;clearMark();var amount=Math.max(240,Math.round(innerHeight*.62))*(dir==='down'?1:-1);var node=cur&&cur.parentElement?cur.parentElement:null;while(node&&node!==document.body&&node!==document.documentElement){try{var st=getComputedStyle(node);if(/auto|scroll/.test(st.overflowY||'')&&node.scrollHeight>node.clientHeight+12){node.scrollBy({top:amount,left:0,behavior:'smooth'});setTimeout(refresh,140);return true;}}catch(e){}node=node.parentElement;}try{window.scrollBy({top:amount,left:0,behavior:'smooth'});}catch(e2){window.scrollBy(0,amount);}setTimeout(refresh,140);return true;}"
                + "function move(dir){"
                + "wakeControls();var list=candidates();var cur=marked()||document.activeElement;"
                + "if(!list.length)return scrollPage(cur,dir);"
                + "var cx=innerWidth/2,cy=innerHeight/2;"
                + "if(cur&&cur!==document.body&&cur!==document.documentElement&&list.indexOf(cur)>=0){var cr=cur.getBoundingClientRect();cx=cr.left+cr.width/2;cy=cr.top+cr.height/2;}"
                + "var best=null,bestScore=Infinity;"
                + "for(var i=0;i<list.length;i++){var el=list[i];if(el===cur||!onScreen(el))continue;var r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,dx=x-cx,dy=y-cy,primary=0,secondary=0;"
                + "if(dir==='left'){if(dx>=-2)continue;primary=-dx;secondary=Math.abs(dy);}else if(dir==='right'){if(dx<=2)continue;primary=dx;secondary=Math.abs(dy);}else if(dir==='up'){if(dy>=-2)continue;primary=-dy;secondary=Math.abs(dx);}else{if(dy<=2)continue;primary=dy;secondary=Math.abs(dx);}"
                + "var score=primary+(secondary*.45)+(secondary/Math.max(primary,1))*35;if(score<bestScore){bestScore=score;best=el;}}"
                + "if(best){mark(best);return true;}return scrollPage(cur,dir);}"
                + "function video(){return document.querySelector('video');}"
                + "function togglePlay(){var v=video();if(!v)return false;try{if(v.paused)v.play();else v.pause();return true;}catch(e){return false;}}"
                + "function seek(seconds){var v=video();if(!v||!isFinite(v.duration))return false;try{v.currentTime=Math.max(0,Math.min(v.duration||Number.MAX_SAFE_INTEGER,v.currentTime+seconds));return true;}catch(e){return false;}}"
                + "function looksFullscreen(el){if(!el)return false;var r=el.getBoundingClientRect();var text=((el.getAttribute('aria-label')||'')+' '+(el.getAttribute('title')||'')+' '+(el.getAttribute('data-tooltip')||'')+' '+(el.id||'')+' '+(el.className&&typeof el.className==='string'?el.className:'')+' '+(el.textContent||'')).toLowerCase();if(/full.?screen|enter.?full|expand|maximi[sz]e/.test(text))return true;return r.width>1&&r.width<140&&r.height>1&&r.height<140&&(r.left+r.width/2)>innerWidth*.78&&(r.top+r.height/2)>innerHeight*.68;}"
                + "function activate(){var el=marked();if(!el)return togglePlay()?'activated':'none';if(editable(el)){try{el.focus({preventScroll:false});el.click();return 'editable';}catch(e){try{el.focus();return 'editable';}catch(e2){return 'none';}}}try{window.__webPortalAllowFullscreenUntil=looksFullscreen(el)?Date.now()+2000:0;el.click();wakeControls();return 'activated';}catch(e){window.__webPortalAllowFullscreenUntil=0;return 'none';}}"
                + "function playerKey(key){"
                + "if(key==='up'||key==='down'){if(!controlsMode)return showControls();return move(key);}"
                + "if(key==='left'){if(!controlsMode)return seek(-10);return move('left');}"
                + "if(key==='right'){if(!controlsMode)return seek(10);return move('right');}"
                + "if(key==='center'){if(!controlsMode)return togglePlay();return activate()!=='none';}"
                + "return false;}"
                + "refresh();"
                + "var observer=new MutationObserver(function(){clearTimeout(window.__webPortalTVTimer);window.__webPortalTVTimer=setTimeout(refresh,120);});"
                + "observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class','role','tabindex','disabled','aria-hidden','aria-disabled']});"
                + "function destroy(){try{observer.disconnect();}catch(e){}clearTimeout(window.__webPortalTVTimer);clearMark();var roots=allRoots(document,[]);for(var r=0;r<roots.length;r++){var changed=roots[r].querySelectorAll?roots[r].querySelectorAll('[data-webportal-tab-original]'):[];for(var i=0;i<changed.length;i++){var el=changed[i],original=el.getAttribute('data-webportal-tab-original');if(original==='__missing__')el.removeAttribute('tabindex');else el.setAttribute('tabindex',original);el.removeAttribute('data-webportal-tab-original');}}var style=document.getElementById(STYLE_ID);if(style&&style.parentNode)style.parentNode.removeChild(style);delete window.__webPortalTV;}"
                + "window.__webPortalTV={version:6,refresh:refresh,move:move,activate:activate,playerKey:playerKey,showControls:showControls,hideControls:hideControls,controlsMode:function(){return controlsMode;},destroy:destroy};"
                + "})();";
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

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_MENU) {
            showMenu();
            return true;
        }

        if (keyCode == KeyEvent.KEYCODE_BACK) {
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
                            if (!"true".equals(value) && webView.canGoBack()) {
                                runOnUiThread(webView::goBack);
                            }
                        });
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
