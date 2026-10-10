package com.zac.tvwebplayer;

import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.net.wifi.WifiManager;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketException;
import java.util.UUID;

/**
 * An opt-in LOCAL NETWORK feasibility experiment, not a working Chromecast.
 * It tests DNS-SD discovery and whether a Quest/Cast sender attempts to
 * contact an independently advertised receiver. No TLS or media receiver
 * is provided. The user must opt in by selecting Start.
 */
public final class CastLabActivity extends Activity {
    private static final String CAST_SERVICE = "_googlecast._tcp.";
    private static final int CYAN = Color.rgb(75, 225, 246);
    private final StringBuilder events = new StringBuilder();

    private NsdManager nsd;
    private NsdManager.RegistrationListener registrationListener;
    private NsdManager.DiscoveryListener discoveryListener;
    private WifiManager.MulticastLock multicastLock;
    private ServerSocket testSocket;
    private Thread acceptThread;
    private TextView statusView;
    private TextView eventsView;
    private Button startButton;
    private Button stopButton;
    private boolean registered;
    private boolean discovering;
    private volatile boolean running;
    private int contactCount;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        nsd = (NsdManager) getSystemService(Context.NSD_SERVICE);
        buildUi();
        log("No receiver is running. Start the test only while on your home Wi-Fi.");
    }

    private void buildUi() {
        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setPadding(dp(26), dp(18), dp(26), dp(18));
        page.setBackgroundColor(Color.rgb(7, 18, 35));

        TextView title = text("WebPortal Cast Lab", 27, CYAN);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        page.addView(title);

        TextView description = text(
                "Phase 1: Cast receiver discovery test. This does NOT play video yet. "
                + "It checks whether a Quest can see WebPortal as a potential Cast "
                + "destination, and whether it attempts a connection. "
                + "Nothing is recorded or sent to a server.", 18, Color.WHITE);
        description.setPadding(0, dp(10), 0, dp(12));
        page.addView(description);

        statusView = text("Stopped — no device advertised", 19, CYAN);
        page.addView(statusView);

        LinearLayout controls = new LinearLayout(this);
        controls.setOrientation(LinearLayout.HORIZONTAL);
        controls.setPadding(0, dp(10), 0, dp(12));

        startButton = new Button(this);
        startButton.setText("Start receiver test");
        startButton.setAllCaps(false);
        startButton.setOnClickListener(v -> start());
        controls.addView(startButton, new LinearLayout.LayoutParams(0, dp(58), 1f));

        stopButton = new Button(this);
        stopButton.setText("Stop");
        stopButton.setAllCaps(false);
        stopButton.setEnabled(false);
        stopButton.setOnClickListener(v -> stop());
        controls.addView(stopButton, new LinearLayout.LayoutParams(0, dp(58), 0.5f));
        page.addView(controls);

        TextView instructions = text(
                "After Start: open Quest → Cast and look for 'WebPortal Cast Lab'. "
                + "AirScreen should also appear under nearby receivers when running. "
                + "Even if WebPortal appears, selecting it is expected to fail until "
                + "we implement an authenticated Cast protocol and streaming receiver.", 17,
                Color.rgb(195, 208, 229));
        page.addView(instructions);

        eventsView = text("", 17, Color.WHITE);
        eventsView.setPadding(0, dp(10), 0, 0);
        ScrollView scroll = new ScrollView(this);
        scroll.addView(eventsView);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f);
        lp.topMargin = dp(10);
        page.addView(scroll, lp);
        setContentView(page);
    }

    private TextView text(String s, int size, int color) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(size);
        t.setTextColor(color);
        t.setGravity(Gravity.START);
        return t;
    }

    private int dp(float px) {
        return (int) (px * getResources().getDisplayMetrics().density + 0.5f);
    }

    private void log(String message) {
        // Keep this short and privacy-safe: no IPs, credentials or packet data.
        String time = new java.text.SimpleDateFormat(
                "HH:mm:ss", java.util.Locale.US).format(new java.util.Date());
        events.append(time).append("  ").append(message).append("\n");
        if (events.length() > 4600) events.delete(0, events.length() - 3100);
        if (eventsView != null) eventsView.setText(events.toString());
    }

    private void start() {
        if (running) return;
        if (nsd == null) {
            log("Device does not support Android network service discovery.");
            return;
        }
        try {
            // The dynamic port is deliberately NOT a real Cast V2 TLS listener.
            // This test must not claim to be a certified or functional Chromecast.
            testSocket = new ServerSocket(0, 4);
            testSocket.setSoTimeout(2000);
            running = true;
            contactCount = 0;
            acquireMulticastLock();
            int port = testSocket.getLocalPort();
            startButton.setEnabled(false);
            stopButton.setEnabled(true);
            statusView.setText("Advertising WebPortal Cast Lab (experimental)");
            log("Listening for test connections on TCP port " + port);
            runAcceptLoop();
            advertise(port);
            discoverCastReceivers();
        } catch (Exception error) {
            log("Unable to start: " + error.getClass().getSimpleName());
            stop();
        }
    }

    private void acquireMulticastLock() {
        try {
            WifiManager manager = (WifiManager) getApplicationContext()
                    .getSystemService(Context.WIFI_SERVICE);
            if (manager == null) return;
            multicastLock = manager.createMulticastLock("WebPortalCastLab");
            multicastLock.setReferenceCounted(false);
            multicastLock.acquire();
        } catch (Exception error) {
            log("Wi-Fi multicast permission unavailable; discovery may be limited.");
        }
    }

    private void runAcceptLoop() {
        ServerSocket server = testSocket;
        acceptThread = new Thread(() -> {
            while (running && server != null && !server.isClosed()) {
                try (Socket peer = server.accept()) {
                    runOnUiThread(() -> {
                        contactCount++;
                        log("Incoming Cast-port TCP contact #" + contactCount
                                + " — protocol not implemented yet");
                    });
                    // Immediately close: do not impersonate or authenticate as a Cast device.
                } catch (java.net.SocketTimeoutException timeout) {
                    // Recheck lifecycle flag.
                } catch (IOException error) {
                    if (running) runOnUiThread(() -> log("Test listener stopped unexpectedly."));
                    break;
                }
            }
        }, "webportal-cast-lab-accept");
        acceptThread.setDaemon(true);
        acceptThread.start();
    }

    private void advertise(int port) {
        NsdServiceInfo info = new NsdServiceInfo();
        info.setServiceName("WebPortal Cast Lab");
        info.setServiceType(CAST_SERVICE);
        info.setPort(port);
        String uuid = getPreferences(MODE_PRIVATE).getString("cast_lab_device_id", null);
        if (uuid == null) {
            uuid = UUID.randomUUID().toString().replace("-", "");
            getPreferences(MODE_PRIVATE).edit().putString("cast_lab_device_id", uuid).apply();
        }
        info.setAttribute("id", uuid);
        info.setAttribute("fn", "WebPortal Cast Lab");
        info.setAttribute("md", "WebPortal Lab (experimental)");
        info.setAttribute("ve", "05");
        info.setAttribute("ca", "4101");
        info.setAttribute("st", "0");
        registrationListener = new NsdManager.RegistrationListener() {
            @Override
            public void onServiceRegistered(NsdServiceInfo service) {
                runOnUiThread(() -> {
                    registered = true;
                    log("Advertised: " + service.getServiceName());
                });
            }
            @Override
            public void onRegistrationFailed(NsdServiceInfo service, int error) {
                runOnUiThread(() -> log("Cast service advertisement failed: " + error));
            }
            @Override
            public void onServiceUnregistered(NsdServiceInfo service) {
                runOnUiThread(() -> log("Cast Lab advertisement stopped."));
            }
            @Override
            public void onUnregistrationFailed(NsdServiceInfo service, int error) {
                runOnUiThread(() -> log("Could not stop advertisement: " + error));
            }
        };
        nsd.registerService(info, NsdManager.PROTOCOL_DNS_SD, registrationListener);
    }

    private void discoverCastReceivers() {
        discoveryListener = new NsdManager.DiscoveryListener() {
            @Override
            public void onDiscoveryStarted(String type) {
                runOnUiThread(() -> {
                    discovering = true;
                    log("Searching local network for Cast services...");
                });
            }
            @Override
            public void onServiceFound(NsdServiceInfo service) {
                runOnUiThread(() -> log("Nearby: " + service.getServiceName()));
            }
            @Override
            public void onServiceLost(NsdServiceInfo service) {
                runOnUiThread(() -> log("No longer nearby: " + service.getServiceName()));
            }
            @Override
            public void onStartDiscoveryFailed(String type, int error) {
                runOnUiThread(() -> log("Local discovery unavailable: " + error));
            }
            @Override
            public void onStopDiscoveryFailed(String type, int error) {
                runOnUiThread(() -> log("Failed to stop discovery: " + error));
            }
            @Override
            public void onDiscoveryStopped(String type) {
                runOnUiThread(() -> {
                    discovering = false;
                    log("Discovery stopped.");
                });
            }
        };
        nsd.discoverServices(CAST_SERVICE, NsdManager.PROTOCOL_DNS_SD, discoveryListener);
    }

    private void stop() {
        running = false;
        if (testSocket != null) {
            try { testSocket.close(); } catch (IOException ignored) {}
            testSocket = null;
        }
        if (nsd != null && discoveryListener != null) {
            try { nsd.stopServiceDiscovery(discoveryListener); }
            catch (IllegalArgumentException ignored) {}
            discoveryListener = null;
        }
        if (nsd != null && registrationListener != null) {
            try { nsd.unregisterService(registrationListener); }
            catch (IllegalArgumentException ignored) {}
            registrationListener = null;
        }
        if (multicastLock != null) {
            try { if (multicastLock.isHeld()) multicastLock.release(); }
            catch (RuntimeException ignored) {}
            multicastLock = null;
        }
        registered = false;
        discovering = false;
        statusView.setText("Stopped — no device advertised");
        startButton.setEnabled(true);
        stopButton.setEnabled(false);
        log("Cast Lab stopped. No background listener left running.");
    }

    @Override
    protected void onStop() {
        stop();
        super.onStop();
    }
}
