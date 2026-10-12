package com.zac.webportalcast;

import android.app.Activity;
import android.content.Context;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import java.security.SecureRandom;
import java.text.SimpleDateFormat;
import java.util.ArrayDeque;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;

/**
 * Local-only, user-started Quest/Cast connection diagnostics.
 *
 * During a test: (1) register an explicitly experimental _googlecast._tcp
 * service backed by an untrusted self-signed TLS probe, (2) inspect bounded
 * Cast V2 message namespace metadata when TLS succeeds, (3) scan for nearby
 * DNS-SD names and capture the existing SSDP/HTTP/SOAP events.
 * The probe is NOT a certified Google Cast receiver or mirroring service.
 *
 * Export is available only when the user starts a session, via an
 * unguessable session URL on the receiver's LAN-only HTTP listener.
 * It records no packet bodies, sender IP addresses, media URLs, credentials
 * or audio/video. Nothing is uploaded to a cloud service.
 */
public final class CastDiagnostics {
    public interface Listener {
        void onChanged();
    }

    private static final int MAX_EVENTS = 160;
    private static final String CAST_SERVICE = "_googlecast._tcp.";
    private final Activity activity;
    private final Listener listener;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final SecureRandom random = new SecureRandom();
    private final ArrayDeque<String> events = new ArrayDeque<>();
    private final Map<String, Integer> counts = new LinkedHashMap<>();
    private NsdManager nsd;
    private NsdManager.RegistrationListener registration;
    private NsdManager.DiscoveryListener discovery;
    private WifiManager.MulticastLock wifiLock;
    private CastProtocolProbe protocolProbe;
    private String key;
    private long startedAt;
    private long stoppedAt;
    private volatile boolean running;
    private boolean registered;
    private boolean discovered;
    private int tcpContacts;
    private final Runnable notifyListener;
    private boolean notificationPending;

    public CastDiagnostics(Activity activity, Listener listener) {
        this.activity = activity;
        this.listener = listener;
        this.notifyListener = () -> {
            synchronized (CastDiagnostics.this) { notificationPending = false; }
            this.listener.onChanged();
        };
        nsd = (NsdManager) activity.getSystemService(Context.NSD_SERVICE);
    }

    private static String utc(long timestamp) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(new Date(timestamp));
    }

    private void changed() {
        synchronized (this) {
            if (notificationPending) return;
            notificationPending = true;
        }
        handler.postDelayed(notifyListener, 250);
    }

    public synchronized boolean hasSession() { return key != null; }
    public synchronized boolean isRunning() { return running; }

    public void start() {
        stopProbe();
        synchronized (this) {
            byte[] secret = new byte[12];
            random.nextBytes(secret);
            StringBuilder value = new StringBuilder();
            for (byte item : secret) {
                value.append(Character.forDigit((item >>> 4) & 15, 16));
                value.append(Character.forDigit(item & 15, 16));
            }
            key = value.toString();
            events.clear();
            counts.clear();
            startedAt = System.currentTimeMillis();
            stoppedAt = 0;
            tcpContacts = 0;
            registered = false;
            discovered = false;
            running = true;
        }
        record("SESSION", "Quest connection test started");
        record("NETWORK", "DLNA active; experimental TLS/Cast V2 probe is metadata-only");
        if (nsd == null) {
            record("ERROR", "Android network service discovery unavailable");
            return;
        }
        try {
            WifiManager wifi = (WifiManager) activity.getApplicationContext()
                    .getSystemService(Context.WIFI_SERVICE);
            if (wifi != null) {
                wifiLock = wifi.createMulticastLock("WebPortalCastDiagnostics");
                wifiLock.setReferenceCounted(false);
                wifiLock.acquire();
            } else {
                record("WARN", "Wi-Fi manager unavailable; Ethernet may still work");
            }
        } catch (RuntimeException e) {
            record("WARN", "Multicast lock failed; Wi-Fi discovery may be limited");
        }

        final CastProtocolProbe[] probeHolder = new CastProtocolProbe[1];
        CastProtocolProbe probe = new CastProtocolProbe(activity, new CastProtocolProbe.Listener() {
            @Override public void onReady(int port) {
                if (running && protocolProbe == probeHolder[0]) registerTestReceiver(port);
            }

            @Override public void onContact() {
                if (!running) return;
                synchronized (CastDiagnostics.this) { tcpContacts++; }
                record("CAST_TCP", "Incoming Cast test-port connection");
            }

            @Override public void onEvent(String category, String detail) {
                if (running) record(category, detail);
            }
        });
        protocolProbe = probe;
        probeHolder[0] = probe;
        probe.start();
        discoverNearbyReceivers();
    }

    private void registerTestReceiver(int port) {
        try {
            NsdServiceInfo service = new NsdServiceInfo();
            service.setServiceName("WebPortal Cast TEST");
            service.setServiceType(CAST_SERVICE);
            service.setPort(port);
            service.setAttribute("id", randomHexId());
            service.setAttribute("fn", "WebPortal Cast TEST");
            service.setAttribute("md", "WebPortal Experimental");
            service.setAttribute("ve", "05");
            service.setAttribute("ca", "4101");
            service.setAttribute("st", "0");
            registration = new NsdManager.RegistrationListener() {
                @Override public void onServiceRegistered(NsdServiceInfo info) {
                    synchronized (CastDiagnostics.this) { registered = true; }
                    record("CAST_ADVERTISE", "Test service registered (not an authenticated receiver)");
                }
                @Override public void onRegistrationFailed(NsdServiceInfo info, int error) {
                    record("ERROR", "Cast test advertisement failed: code " + error);
                }
                @Override public void onServiceUnregistered(NsdServiceInfo info) {
                    record("CAST_ADVERTISE", "Test service unregistered");
                }
                @Override public void onUnregistrationFailed(NsdServiceInfo info, int error) {
                    record("WARN", "Cast test unregister failed: code " + error);
                }
            };
            nsd.registerService(service, NsdManager.PROTOCOL_DNS_SD, registration);
            record("CAST_ADVERTISE", "Requested experimental Cast DNS-SD advertisement");
        } catch (RuntimeException e) {
            record("ERROR", "Could not request Cast advertisement: " + e.getClass().getSimpleName());
        }
    }

    private String randomHexId() {
        byte[] bytes = new byte[16];
        random.nextBytes(bytes);
        StringBuilder s = new StringBuilder();
        for (byte item : bytes) s.append(String.format(Locale.US, "%02x", item & 255));
        return s.toString();
    }

    private void discoverNearbyReceivers() {
        try {
            discovery = new NsdManager.DiscoveryListener() {
                @Override public void onDiscoveryStarted(String type) {
                    synchronized (CastDiagnostics.this) { discovered = true; }
                    record("CAST_SCAN", "Cast DNS-SD discovery started");
                }
                @Override public void onServiceFound(NsdServiceInfo service) {
                    String name = service.getServiceName();
                    if (name == null) name = "unknown";
                    // A name is user-facing and may identify a local device; sanitize.
                    name = name.replaceAll("[^a-zA-Z0-9 _.-]", "?");
                    if (name.length() > 65) name = name.substring(0, 65);
                    record("CAST_FOUND", "Nearby Cast service: " + name);
                }
                @Override public void onServiceLost(NsdServiceInfo service) {
                    record("CAST_SCAN", "Previously discovered Cast service went offline");
                }
                @Override public void onStartDiscoveryFailed(String type, int error) {
                    record("ERROR", "Cast service discovery failed: code " + error);
                }
                @Override public void onStopDiscoveryFailed(String type, int error) {
                    record("WARN", "Cast service discovery stop failed: code " + error);
                }
                @Override public void onDiscoveryStopped(String type) {
                    synchronized (CastDiagnostics.this) { discovered = false; }
                    record("CAST_SCAN", "Cast discovery stopped");
                }
            };
            nsd.discoverServices(CAST_SERVICE, NsdManager.PROTOCOL_DNS_SD, discovery);
        } catch (RuntimeException error) {
            record("ERROR", "Cast DNS-SD discovery could not start: " + error.getClass().getSimpleName());
        }
    }

    public synchronized void record(String category, String detail) {
        if (key == null || stoppedAt != 0) return;
        String safeCategory = category.replaceAll("[^A-Z_]", "").substring(0,
                Math.min(28, category.replaceAll("[^A-Z_]", "").length()));
        // All call sites supply whitelisted, human-readable events (never raw media URLs).
        String safeDetail = detail.replace('\n', ' ').replace('\r', ' ');
        if (safeDetail.length() > 130) safeDetail = safeDetail.substring(0, 130);
        counts.put(safeCategory, counts.containsKey(safeCategory) ? counts.get(safeCategory) + 1 : 1);
        events.addLast(utc(System.currentTimeMillis()) + "  " + safeCategory + "  " + safeDetail);
        while (events.size() > MAX_EVENTS) events.removeFirst();
        changed();
    }

    public void stopProbe() {
        boolean wasRunning;
        synchronized (this) {
            wasRunning = running;
            running = false;
        }
        CastProtocolProbe probe = protocolProbe;
        protocolProbe = null;
        if (probe != null) probe.stop();
        if (nsd != null && discovery != null) {
            try { nsd.stopServiceDiscovery(discovery); } catch (RuntimeException ignored) {}
            discovery = null;
        }
        if (nsd != null && registration != null) {
            try { nsd.unregisterService(registration); } catch (RuntimeException ignored) {}
            registration = null;
        }
        if (wifiLock != null) {
            try { if (wifiLock.isHeld()) wifiLock.release(); } catch (RuntimeException ignored) {}
            wifiLock = null;
        }
        synchronized (this) {
            if (wasRunning) {
                record("SESSION", "Connection probe stopped; report remains available while app is open");
                stoppedAt = System.currentTimeMillis();
            }
        }
        changed();
    }

    public synchronized String getReportUrl(String receiverLocation) {
        if (key == null || receiverLocation == null
                || !receiverLocation.startsWith("http://") || !receiverLocation.endsWith("/device.xml"))
            return "";
        return receiverLocation.substring(0, receiverLocation.length() - "device.xml".length())
                + "report?key=" + key;
    }

    public synchronized String reportForKey(String supplied) {
        if (key == null || supplied == null
                || !java.security.MessageDigest.isEqual(
                        key.getBytes(java.nio.charset.StandardCharsets.US_ASCII),
                        supplied.getBytes(java.nio.charset.StandardCharsets.US_ASCII))) {
            return null;
        }
        return renderReport();
    }

    public synchronized String summary() {
        if (key == null) return "No connection test started";
        return (running ? "TEST RUNNING" : "TEST STOPPED")
                + "  |  Cast TCP: " + tcpContacts
                + "  |  Nearby Cast: " + count("CAST_FOUND")
                + "  |  TLS OK: " + count("TLS_OK")
                + "  |  TLS failed: " + count("TLS_FAILED")
                + "  |  Deviceauth: " + count("V2_AUTH")
                + "  |  DLNA searches: " + count("SSDP_SEARCH")
                + "  |  DLNA requests: " + count("DLNA_HTTP")
                + "  |  Errors: " + count("ERROR");
    }

    private int count(String name) {
        return counts.containsKey(name) ? counts.get(name) : 0;
    }

    public synchronized String renderReport() {
        StringBuilder s = new StringBuilder(12000);
        s.append("WEBPORTAL CAST CONNECTION REPORT\n")
                .append("Generated UTC: ").append(utc(System.currentTimeMillis())).append("\n")
                .append("App version: ").append(BuildConfig.VERSION_NAME)
                .append(" (").append(BuildConfig.VERSION_CODE).append(")\n")
                .append("TV: ").append(Build.MANUFACTURER).append(" / ")
                .append(Build.MODEL).append(" (Android API ").append(Build.VERSION.SDK_INT).append(")\n")
                .append("Session started: ").append(startedAt > 0 ? utc(startedAt) : "none").append("\n")
                .append("Session stopped: ").append(stoppedAt > 0 ? utc(stoppedAt) : "still running").append("\n")
                .append("Status: ").append(summary()).append("\n")
                .append("Test Cast advertisement registered: ").append(registered).append("\n")
                .append("Cast discovery currently active: ").append(discovered).append("\n")
                .append("TLS attempts: ").append(count("TLS_STARTED")).append("\n")
                .append("TLS handshakes completed: ").append(count("TLS_OK")).append("\n")
                .append("TLS handshakes failed: ").append(count("TLS_FAILED")).append("\n")
                .append("TLS handshake timeouts: ").append(count("TLS_TIMEOUT")).append("\n")
                .append("Cast V2 authenticated: NO (diagnostic test identity only)\n\n")
                .append("INTERPRETATION\n")
                .append("- No events does not prove that Quest did not cast: we only see packets addressed to this app or local discovery callbacks.\n")
                .append("- Cast discovery and a TCP contact do not establish Cast V2 authentication or video playback.\n")
                .append("- The local TLS server uses a self-signed test identity, NOT a Google-trusted device certificate.\n")
                .append("- TLS success is not Cast device authentication; a deviceauth challenge is only observed, never answered.\n")
                .append("- Cast V2 frames are read in memory only to extract namespaces; no payloads or certificates are retained.\n")
                .append("- No Cast media or screen mirroring is implemented; a Quest error is expected.\n")
                .append("- No sender addresses, media links, credentials, packet payloads, audio or video are captured.\n")
                .append("- Nearby receiver names may identify local devices; review before sharing.\n\n")
                .append("EVENT COUNTS\n");
        for (Map.Entry<String, Integer> e : counts.entrySet()) {
            s.append(e.getKey()).append(": ").append(e.getValue()).append("\n");
        }
        s.append("\nEVENT TIMELINE (most recent ").append(MAX_EVENTS).append(")\n");
        for (String entry : events) s.append(entry).append("\n");
        return s.toString();
    }

    public void close() {
        stopProbe();
        synchronized (this) { key = null; events.clear(); counts.clear(); }
        handler.removeCallbacks(notifyListener);
    }
}
