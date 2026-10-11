package com.zac.webportalcast;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Opt-in, non-privileged APK updater for the permanently signed GitHub release.
 *
 * Update checks run on app launch and when selected with the remote. Download
 * requires user input, verifies GitHub's SHA-256 digest AND Android package /
 * signing identity, then opens the system installer. No silent installations.
 */
public final class AppUpdater {
    private static final String RELEASE_API =
            "https://api.github.com/repos/zanibethel/raisehub/releases/tags/webportal-cast";
    private static final String APK_URL =
            "https://github.com/zanibethel/raisehub/releases/download/webportal-cast/WebPortalCast.apk";
    private static final String APK_MIME = "application/vnd.android.package-archive";
    private static final long MAX_APK_BYTES = 120L * 1024L * 1024L;
    private static final int TIMEOUT_MS = 15000;
    private final Activity activity;
    private final Listener listener;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private volatile boolean closed;
    private boolean downloading;
    private Release available;
    private File pendingInstall;
    private boolean requestedPermission;

    public interface Listener {
        void onChecking();
        void onUpToDate(String version);
        void onAvailable(String version);
        void onProgress(int percent);
        void onDownloadVerified();
        void onMessage(String message);
    }

    private static final class Release {
        final int code;
        final String name;
        final long bytes;
        final String sha256;

        Release(int code, String name, long bytes, String sha256) {
            this.code = code;
            this.name = name;
            this.bytes = bytes;
            this.sha256 = sha256;
        }
    }

    public AppUpdater(Activity activity, Listener listener) {
        this.activity = activity;
        this.listener = listener;
    }

    private void ui(Runnable action) {
        activity.runOnUiThread(() -> {
            if (!closed && !activity.isFinishing()) action.run();
        });
    }

    public void check(boolean explicit) {
        if (closed || downloading) return;
        if (explicit) ui(listener::onChecking);
        io.execute(() -> {
            try {
                Release release = loadRelease();
                int installed = installedCode();
                ui(() -> {
                    if (release.code > installed) {
                        available = release;
                        listener.onAvailable(release.name);
                    } else {
                        available = null;
                        if (explicit) listener.onUpToDate(installedVersion());
                    }
                });
            } catch (Exception error) {
                if (explicit) ui(() -> listener.onMessage(
                        "Update check failed. Check the internet connection and try again."));
            }
        });
    }

    private Release loadRelease() throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(RELEASE_API).openConnection();
        connection.setConnectTimeout(TIMEOUT_MS);
        connection.setReadTimeout(TIMEOUT_MS);
        connection.setRequestProperty("User-Agent", "WebPortalCast-FireTV-Updater");
        connection.setRequestProperty("Accept", "application/vnd.github+json");
        connection.setUseCaches(false);
        try {
            if (connection.getResponseCode() != 200) throw new IOException("Release API not available");
            byte[] payload = readCapped(connection.getInputStream(), 512 * 1024);
            JSONObject json = new JSONObject(new String(payload, StandardCharsets.UTF_8));
            if (json.optBoolean("draft") || json.optBoolean("prerelease")
                    || !"webportal-cast".equals(json.optString("tag_name"))) {
                throw new IOException("Invalid release state");
            }

            String description = json.getString("body");
            int code = Integer.parseInt(metadata(description, "Version-Code", "[0-9]{1,9}"));
            String version = metadata(description, "Version-Name", "[0-9A-Za-z._-]{1,40}");
            String expected = metadata(description, "SHA256", "[0-9a-fA-F]{64}")
                    .toLowerCase(Locale.US);
            if (code <= 0) throw new IOException("Invalid version code");
            JSONArray assets = json.getJSONArray("assets");
            for (int i = 0; i < assets.length(); i++) {
                JSONObject asset = assets.getJSONObject(i);
                if (!"WebPortalCast.apk".equals(asset.optString("name"))) continue;
                if (!APK_URL.equals(asset.optString("browser_download_url"))) continue;
                long size = asset.getLong("size");
                if (size <= 0 || size > MAX_APK_BYTES) throw new IOException("Bad release size");
                // Compare both published digests: protect against partial release rollouts.
                String digest = asset.optString("digest");
                if (!("sha256:" + expected).equalsIgnoreCase(digest))
                    throw new IOException("Release digests disagree");
                return new Release(code, version, size, expected);
            }
            throw new IOException("Signed APK release is missing");
        } finally {
            connection.disconnect();
        }
    }

    private static String metadata(String description, String label, String allowed) throws IOException {
        Pattern p = Pattern.compile("(?m)^" + Pattern.quote(label) + ":\\s*(" + allowed + ")\\s*$");
        Matcher m = p.matcher(description);
        if (!m.find()) throw new IOException("Missing update metadata: " + label);
        return m.group(1);
    }

    private static byte[] readCapped(InputStream input, int cap) throws IOException {
        try (InputStream in = input; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] b = new byte[8192];
            int n;
            while ((n = in.read(b)) != -1) {
                if (out.size() + n > cap) throw new IOException("Response too large");
                out.write(b, 0, n);
            }
            return out.toByteArray();
        }
    }

    public void download() {
        if (closed || downloading || available == null) return;
        final Release release = available;
        downloading = true;
        ui(() -> listener.onProgress(0));
        io.execute(() -> {
            File part = null;
            try {
                File dir = new File(activity.getCacheDir(), "cast-updates");
                if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("No update storage");
                part = new File(dir, "WebPortalCast.part");
                File apk = new File(dir, "WebPortalCast-v" + release.code + ".apk");
                if (apk.exists() && !apk.delete()) throw new IOException("Cannot replace old update");

                long transferred = 0;
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                HttpURLConnection connection = downloadConnection();
                try (InputStream input = connection.getInputStream();
                     FileOutputStream output = new FileOutputStream(part)) {
                    byte[] buffer = new byte[16384];
                    int count, lastProgress = -1;
                    while ((count = input.read(buffer)) != -1) {
                        transferred += count;
                        if (transferred > MAX_APK_BYTES || transferred > release.bytes)
                            throw new IOException("Release download exceeds expected size");
                        digest.update(buffer, 0, count);
                        output.write(buffer, 0, count);
                        int progress = (int) (100 * transferred / release.bytes);
                        if (progress != lastProgress) {
                            lastProgress = progress;
                            final int percentage = progress;
                            ui(() -> listener.onProgress(percentage));
                        }
                    }
                    output.getFD().sync();
                } finally {
                    connection.disconnect();
                }
                if (transferred != release.bytes) throw new IOException("Incomplete APK");
                String actual = bytesToHex(digest.digest());
                if (!release.sha256.equals(actual))
                    throw new IOException("Checksum mismatch — no update installed");
                if (!part.renameTo(apk)) throw new IOException("Could not save update");
                verifyApkIdentity(apk, release);
                final File ready = apk;
                ui(() -> {
                    listener.onDownloadVerified();
                    requestInstall(ready);
                });
            } catch (Exception error) {
                if (part != null) part.delete();
                ui(() -> listener.onMessage("Update not installed: " + readableError(error)));
            } finally {
                downloading = false;
            }
        });
    }

    private static String readableError(Exception error) {
        String message = error.getMessage();
        if (message != null && (message.contains("Checksum") || message.contains("signature")
                || message.contains("package") || message.contains("version"))) {
            return message;
        }
        return "download or verification failed. Try again.";
    }

    private HttpURLConnection downloadConnection() throws IOException {
        URL url = new URL(APK_URL);
        for (int redirect = 0; redirect < 8; redirect++) {
            if (!"https".equalsIgnoreCase(url.getProtocol())) throw new IOException("Insecure redirect");
            String host = url.getHost().toLowerCase(Locale.US);
            if (!("github.com".equals(host) || "objects.githubusercontent.com".equals(host)
                    || "release-assets.githubusercontent.com".equals(host)
                    || host.endsWith(".githubusercontent.com"))) {
                throw new IOException("Unexpected update host");
            }
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(TIMEOUT_MS);
            connection.setReadTimeout(30000);
            connection.setInstanceFollowRedirects(false);
            connection.setUseCaches(false);
            connection.setRequestProperty("User-Agent", "WebPortalCast-FireTV-Updater");
            int status = connection.getResponseCode();
            if (status == 200) return connection;
            if (status == 301 || status == 302 || status == 303 || status == 307 || status == 308) {
                String to = connection.getHeaderField("Location");
                if (to == null || to.isEmpty()) {
                    connection.disconnect();
                    throw new IOException("Empty download redirect");
                }
                URL next = new URL(url, to);
                connection.disconnect();
                url = next;
                continue;
            }
            connection.disconnect();
            throw new IOException("APK download unavailable: HTTP " + status);
        }
        throw new IOException("Too many download redirects");
    }

    private void verifyApkIdentity(File file, Release release) throws Exception {
        PackageManager manager = activity.getPackageManager();
        int flags = Build.VERSION.SDK_INT >= 28
                ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES;
        PackageInfo newApk = manager.getPackageArchiveInfo(file.getAbsolutePath(), flags);
        PackageInfo installed = manager.getPackageInfo(activity.getPackageName(), flags);
        if (newApk == null || !activity.getPackageName().equals(newApk.packageName))
            throw new IOException("Update package name does not match this app");
        if (packageCode(newApk) != release.code || release.code <= packageCode(installed))
            throw new IOException("Update version is not newer than the installed app");
        Signature[] proposed = signatures(newApk);
        Signature[] current = signatures(installed);
        if (proposed == null || current == null || proposed.length == 0
                || current.length == 0 || proposed.length != current.length)
            throw new IOException("Update signature is missing or differs");
        for (Signature a : proposed) {
            boolean same = false;
            for (Signature b : current) {
                if (Arrays.equals(a.toByteArray(), b.toByteArray())) same = true;
            }
            if (!same) throw new IOException("Update signature differs; reinstall a matching release");
        }
    }

    private static Signature[] signatures(PackageInfo info) {
        if (Build.VERSION.SDK_INT >= 28) {
            return info.signingInfo == null ? null : info.signingInfo.getApkContentsSigners();
        }
        return info.signatures;
    }

    private static int packageCode(PackageInfo info) {
        if (Build.VERSION.SDK_INT >= 28) return (int) info.getLongVersionCode();
        return info.versionCode;
    }

    private int installedCode() throws PackageManager.NameNotFoundException {
        return packageCode(activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0));
    }

    public String installedVersion() {
        try {
            return activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0).versionName;
        } catch (Exception unavailable) { return "unknown"; }
    }

    private static String bytesToHex(byte[] input) {
        StringBuilder s = new StringBuilder(input.length * 2);
        for (byte b : input) s.append(String.format(Locale.US, "%02x", b & 0xff));
        return s.toString();
    }

    private void requestInstall(File apk) {
        pendingInstall = apk;
        if (Build.VERSION.SDK_INT >= 26 && !activity.getPackageManager().canRequestPackageInstalls()) {
            if (!requestedPermission) {
                requestedPermission = true;
                listener.onMessage("Allow WebPortal Cast to install updates in Android settings, then return.");
                try {
                    Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + activity.getPackageName()));
                    activity.startActivity(settings);
                } catch (Exception error) {
                    listener.onMessage("Open Fire TV Settings > Install unknown apps > WebPortal Cast, and allow it.");
                }
            } else {
                listener.onMessage("Permission is still disabled. Enable installing unknown apps, then return.");
            }
            return;
        }
        try {
            Uri fileUri = FileProvider.getUriForFile(activity,
                    activity.getPackageName() + ".updates", apk);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(fileUri, APK_MIME);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            // Some Fire OS installer implementations need the URI on the clip as well.
            intent.setClipData(android.content.ClipData.newRawUri("Cast update", fileUri));
            activity.startActivity(intent);
            pendingInstall = null;
            requestedPermission = false;
            listener.onMessage("Confirm Install in the Fire TV system installer.");
        } catch (Exception error) {
            listener.onMessage("System installer unavailable; the APK is saved but was not installed.");
        }
    }

    public void resumePendingInstall() {
        if (pendingInstall != null) requestInstall(pendingInstall);
    }

    public void close() {
        closed = true;
        io.shutdownNow();
    }
}
