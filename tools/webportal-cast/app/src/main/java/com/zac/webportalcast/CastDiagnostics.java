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
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;
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
    // Keep important startup and local self-test findings even after hours
    // of retry activity evict the rolling timeline.
    private final Map<String, String> milestones = new LinkedHashMap<>();
    private final Map<String, Integer> tlsFailureTypes = new LinkedHashMap<>();
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
    private boolean resolvingCapabilities;
    private int resolvedAttempts;
    private final Set<String> capabilityNames = new HashSet<>();
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
            milestones.clear();
            tlsFailureTypes.clear();
            startedAt = System.currentTimeMillis();
            stoppedAt = 0;
            tcpContacts = 0;
            registered = false;
            discovered = false;
            resolvingCapabilities = false;
            resolvedAttempts = 0;
            capabilityNames.clear();
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
                    if (!name.contains("WebPortal Cast TEST")) {
                        resolveNearbyCapabilities(service, name);
                    }
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

    /**
     * Resolve one nearby non-test Cast receiver at a time. On Android 7
     * (Fire OS API 25), NSD discovery does not include TXT capability fields.
     * Log only allowlisted, low-entropy feature flags; omit IDs, IPs, ports,
     * model names, icons and full TXT records.
     */
    private synchronized void resolveNearbyCapabilities(NsdServiceInfo candidate, String safeName) {
        if (!running || nsd == null || resolvingCapabilities || resolvedAttempts >= 2
                || capabilityNames.contains(safeName)) return;
        capabilityNames.add(safeName);
        resolvedAttempts++;
        resolvingCapabilities = true;
        try {
            nsd.resolveService(candidate, new NsdManager.ResolveListener() {
                @Override public void onResolveFailed(NsdServiceInfo serviceInfo, int error) {
                    synchronized (CastDiagnostics.this) { resolvingCapabilities = false; }
                    record("CAST_CAPS", "Nearby receiver TXT capability lookup failed: code " + error);
                }
                @Override public void onServiceResolved(NsdServiceInfo resolved) {
                    synchronized (CastDiagnostics.this) { resolvingCapabilities = false; }
                    Map<String, byte[]> fields = resolved.getAttributes();
                    if (fields == null) {
                        record("CAST_CAPS", "Nearby receiver TXT capability fields unavailable");
                        return;
                    }
                    record("CAST_CAPS", "Nearby receiver TXT: ve=" + safeNumericFlag(fields, "ve")
                            + " ca=" + safeNumericFlag(fields, "ca")
                            + " st=" + safeNumericFlag(fields, "st")
                            + " flags(fn/md/id)=" + (fields.containsKey("fn") ? "Y" : "N")
                            + "/" + (fields.containsKey("md") ? "Y" : "N")
                            + "/" + (fields.containsKey("id") ? "Y" : "N"));
                }
            });
        } catch (RuntimeException error) {
            resolvingCapabilities = false;
            record("CAST_CAPS", "Nearby receiver TXT capability lookup unavailable");
        }
    }

    private static String safeNumericFlag(Map<String, byte[]> attributes, String key) {
        byte[] bytes = attributes.get(key);
        if (bytes == null || bytes.length == 0 || bytes.length > 8) return "-";
        String value = new String(bytes, StandardCharsets.US_ASCII);
        // Do not export raw TXT contents: only documented low-entropy values.
        return value.matches("[0-9]{1,8}") ? value : "-";
    }

    public synchronized void record(String category, String detail) {
        if (key == null || stoppedAt != 0) return;
        String safeCategory = category.replaceAll("[^A-Z0-9_]", "").substring(0,
                Math.min(28, category.replaceAll("[^A-Z0-9_]", "").length()));
        // All call sites supply whitelisted, human-readable events (never raw media URLs).
        String safeDetail = detail.replace('\n', ' ').replace('\r', ' ');
        // Keep both client and server local TLS causes in a single report line.
        // Values come only from our own whitelisted static error categories.
        if (safeDetail.length() > 260) safeDetail = safeDetail.substring(0, 260);
        int count = counts.containsKey(safeCategory) ? counts.get(safeCategory) + 1 : 1;
        counts.put(safeCategory, count);
        String entry = utc(System.currentTimeMillis()) + "  " + safeCategory + "  " + safeDetail;

        // Persist critical, non-sensitive milestones independently of the
        // rolling 160-event activity log.
        if (safeCategory.equals("TLS_SELFTEST_OK") || safeCategory.equals("TLS_SELFTEST_FAIL")
                || safeCategory.equals("TLS_SETUP_ERROR") || safeCategory.equals("TLS_IDENTITY")
                || safeCategory.equals("TLS_READY") || safeCategory.equals("TLS_WRAP_ERROR")
                || safeCategory.equals("TLS_KEY_SIGN")
                || safeCategory.equals("V2_AUTH_CHALLENGE")
                || safeCategory.equals("V2_AUTH_ERROR")
                || safeCategory.equals("V2_AUTH_RESPONSE_LOCAL")
                || safeCategory.equals("V2_AUTH_SIGN_FAIL")
                || safeCategory.equals("V2_POST_AUTH_TRAFFIC")
                || safeCategory.equals("TLS_AUTH_TEST_IDENTITY")
                || safeCategory.equals("V2_LAUNCH_UNSUPPORTED")
                || safeCategory.equals("V2_OFFER_UNSUPPORTED")) {
            milestones.put(safeCategory, entry);
        }
        if (safeCategory.equals("TLS_FAILED")) {
            String failure = "other";
            int from = safeDetail.lastIndexOf('(');
            if (from >= 0 && safeDetail.endsWith(")") && from < safeDetail.length() - 2) {
                String value = safeDetail.substring(from + 1, safeDetail.length() - 1);
                if (value.matches("[a-zA-Z0-9 /_-]{1,70}")) failure = value;
            }
            tlsFailureTypes.put(failure, tlsFailureTypes.containsKey(failure)
                    ? tlsFailureTypes.get(failure) + 1 : 1);
        }

        // A Quest can retry for minutes. Count every event, but print only the
        // first few and periodic summaries so startup diagnostics remain visible.
        boolean frequent = safeCategory.equals("CAST_TCP") || safeCategory.equals("TLS_STARTED")
                || safeCategory.equals("TLS_FAILED") || safeCategory.equals("SSDP_SEARCH");
        if (!frequent || count <= 3 || count % 25 == 0) {
            if (frequent && count > 3) {
                entry = utc(System.currentTimeMillis()) + "  " + safeCategory
                        + "  repeated " + count + " times (details summarized)";
            }
            events.addLast(entry);
            while (events.size() > MAX_EVENTS) events.removeFirst();
        }
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
                + "  |  Local TLS: " + (count("TLS_SELFTEST_OK") > 0 ? "PASS" :
                        count("TLS_SELFTEST_FAIL") > 0 ? "FAIL" : "PENDING")
                + "  |  Auth challenges: " + count("V2_AUTH_CHALLENGE")
                + "  |  Local auth replies: " + count("V2_AUTH_RESPONSE_LOCAL")
                + "  |  Post-auth controls: " + count("V2_POST_AUTH_TRAFFIC")
                + "  |  Cast heartbeat: " + count("V2_HEARTBEAT")
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
                .append("Initial Quest protocol: TLS (confirmed by previous v0.1.5 test; not re-captured)\n")
                .append("Loopback local TLS self-test: ")
                .append(count("TLS_SELFTEST_OK") > 0 ? "PASS" :
                        count("TLS_SELFTEST_FAIL") > 0 ? "FAIL" : "NOT RUN").append("\n")
                .append("Nearby receiver capability lookups: ").append(count("CAST_CAPS")).append("\n")
                .append("TLS attempts: ").append(count("TLS_STARTED")).append("\n")
                .append("TLS handshakes completed: ").append(count("TLS_OK")).append("\n")
                .append("TLS handshakes failed: ").append(count("TLS_FAILED")).append("\n")
                .append("TLS handshake timeouts: ").append(count("TLS_TIMEOUT")).append("\n")
                .append("Cast auth challenges received: ").append(count("V2_AUTH_CHALLENGE")).append("\n")
                .append("Locally signed self-owned replies: ")
                .append(count("V2_AUTH_RESPONSE_LOCAL")).append("\n")
                .append("Post-auth control activity: ")
                .append(count("V2_POST_AUTH_TRAFFIC")).append("\n")
                .append("Unsupported-algorithm auth errors: ")
                .append(count("V2_AUTH_UNSUPPORTED")).append("\n")
                .append("Cast heartbeat responses: ").append(count("V2_HEARTBEAT")).append("\n")
                .append("Cast receiver status replies: ").append(count("V2_STATUS")).append("\n")
                .append("Cast V2 certified authentication: NOT ESTABLISHED (self-owned test identity)\n\n")
                .append("INTERPRETATION\n")
                .append("- No events does not prove that Quest did not cast: we only see packets addressed to this app or local discovery callbacks.\n")
                .append("- Cast discovery and a TCP contact do not establish Cast V2 authentication or video playback.\n")
                .append("- v0.1.5 previously confirmed that the Quest sends a TLS handshake record.\n")
                .append("- TLS Cast control now supports PING/PONG, CONNECT and truthful idle GET_STATUS.\n")
                .append("- A self-owned, locally signed test AuthResponse is returned; it is NOT trusted by Google Cast CAs.\n")
                .append("- Observed post-auth traffic is not proof that sender validated the test certificate.\n")
                .append("- LAUNCH and stream OFFER cannot succeed until genuine authenticated receiver/media support exists.\n")
                .append("- Every new connection is accepted by a dedicated server-mode TLS socket.\n")
                .append("- The local TLS key has been regenerated with TLS-required RSA digest/padding permissions.\n")
                .append("- The loopback TLS self-test independently reports client and server failures.\n")
                .append("- Nearby Cast TXT comparison logs only allowlisted numeric flags and field presence.\n")
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
        s.append("\nCRITICAL TLS DIAGNOSTICS (retained even if activity history overflows)\n");
        if (milestones.isEmpty()) s.append("No TLS milestones captured.\n");
        for (String value : milestones.values()) s.append(value).append("\n");
        s.append("\nTLS FAILURE CATEGORIES (all attempts)\n");
        if (tlsFailureTypes.isEmpty()) s.append("None\n");
        for (Map.Entry<String, Integer> value : tlsFailureTypes.entrySet()) {
            s.append(value.getKey()).append(": ").append(value.getValue()).append("\n");
        }
        s.append("\nEVENT TIMELINE (up to ").append(MAX_EVENTS).append(" entries)\n");
        for (String entry : events) s.append(entry).append("\n");
        return s.toString();
    }

    public void close() {
        stopProbe();
        synchronized (this) { key = null; events.clear(); counts.clear(); milestones.clear(); tlsFailureTypes.clear(); }
        handler.removeCallbacks(notifyListener);
    }
}
