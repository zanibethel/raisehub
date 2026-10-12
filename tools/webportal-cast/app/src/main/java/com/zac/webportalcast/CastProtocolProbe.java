package com.zac.webportalcast;

import android.app.Activity;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;

import java.io.DataInputStream;
import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketException;
import java.net.SocketTimeoutException;
import java.security.MessageDigest;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.SecureRandom;
import java.util.Collections;
import java.util.Date;
import java.util.Set;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLException;
import javax.net.ssl.SSLHandshakeException;
import javax.net.ssl.SSLServerSocket;
import javax.net.ssl.SSLSocket;
import javax.security.auth.x500.X500Principal;

/**
 * Explicitly experimental Cast V2 transport diagnostics. NOT a Cast receiver.
 *
 * Uses an app-owned, untrusted AndroidKeyStore self-signed TLS test identity.
 * It cannot impersonate Google-certified devices, respond to deviceauth
 * challenges, or receive gameplay. No production secrets are bundled.
 *
 * Only TLS state and bounded protobuf namespace metadata are recorded.
 * No source addresses, packet contents, media, credentials or certificates
 * are exported. Inbound sessions never cause code execution or proxying.
 */
public final class CastProtocolProbe {
    public interface Listener {
        void onReady(int port);
        void onContact();
        void onEvent(String category, String description);
    }

    private static final String KEY_ALIAS = "webportal_cast_local_test_tls_01";
    private static final int FRAME_LIMIT = 65536;
    private static final int MAX_FRAMES = 6;
    private static final int MAX_SESSION_MS = 9000;
    private static final int HANDSHAKE_TIMEOUT_MS = 5000;
    private static final int HEADER_TIMEOUT_MS = 1500;
    private static final int SELF_TEST_TIMEOUT_MS = 3000;
    private static final int FRAME_READ_TIMEOUT_MS = 2200;

    private final Activity activity;
    private final Listener listener;
    private final Set<SSLSocket> activeSockets =
            Collections.newSetFromMap(new java.util.concurrent.ConcurrentHashMap<SSLSocket, Boolean>());
    private final ThreadPoolExecutor connections = new ThreadPoolExecutor(
            3, 3, 0L, TimeUnit.MILLISECONDS, new ArrayBlockingQueue<Runnable>(8),
            runnable -> {
                Thread thread = new Thread(runnable, "webportal-cast-tls-client");
                thread.setDaemon(true);
                return thread;
            }, new ThreadPoolExecutor.AbortPolicy());

    private volatile boolean running;
    private volatile ServerSocket server;
    private final Set<Socket> activePlainSockets =
            Collections.newSetFromMap(new java.util.concurrent.ConcurrentHashMap<Socket, Boolean>());
    private volatile boolean firstContactClassified;
    private Thread acceptThread;
    private int connectionSequence;

    public CastProtocolProbe(Activity activity, Listener listener) {
        this.activity = activity;
        this.listener = listener;
    }

    public synchronized void start() {
        if (running) return;
        running = true;
        acceptThread = new Thread(this::serve, "webportal-cast-tls-probe");
        acceptThread.setDaemon(true);
        acceptThread.start();
    }

    private void serve() {
        try {
            listener.onEvent("TLS_SETUP", "Preparing local self-signed AndroidKeyStore test identity");
            SSLContext context = createTlsContext();
            if (!running) return;
            runLoopbackSelfTest(context);
            if (!running) return;

            // Use a plain accept socket so we can classify the first five bytes
            // of just ONE inbound connection. That connection is then closed;
            // subsequent peers use regular TLS. No source IP or bytes are logged.
            ServerSocket socket = new ServerSocket(0, 8);
            socket.setSoTimeout(1000);
            server = socket;
            if (!running) {
                socket.close();
                return;
            }
            listener.onEvent("TLS_READY", "Experimental TLS listener active; NOT a Google-trusted Cast receiver");
            listener.onReady(socket.getLocalPort());
            while (running) {
                try {
                    Socket raw = socket.accept();
                    if (!running) { raw.close(); break; }
                    final int number;
                    synchronized (this) { number = ++connectionSequence; }
                    activePlainSockets.add(raw);
                    listener.onContact();
                    if (!firstContactClassified) {
                        firstContactClassified = true;
                        try {
                            connections.execute(() -> classifyOneConnection(raw, number));
                        } catch (RejectedExecutionException overloaded) {
                            activePlainSockets.remove(raw);
                            raw.close();
                            listener.onEvent("TLS_BUSY", "Diagnostic listener overloaded");
                        }
                        continue;
                    }
                    try {
                        // The layered server socket is exercised by the loopback
                        // self-test on the TV before advertising this listener.
                        SSLSocket peer = (SSLSocket) context.getSocketFactory()
                                .createSocket(raw, "localhost", raw.getPort(), true);
                        // The SSL socket now owns the underlying TCP socket.
                        activePlainSockets.remove(raw);
                        activeSockets.add(peer);
                        try {
                            connections.execute(() -> examine(peer, number));
                        } catch (RejectedExecutionException overloaded) {
                            activeSockets.remove(peer);
                            peer.close();
                            listener.onEvent("TLS_BUSY", "Probe is busy; a connection was dropped");
                        }
                    } catch (Exception wrapping) {
                        if (running) listener.onEvent("TLS_WRAP_ERROR",
                                "Connection #" + number + " TLS socket could not initialize: " +
                                        wrapping.getClass().getSimpleName());
                        try { raw.close(); } catch (IOException ignored) {}
                        activePlainSockets.remove(raw);
                    }
                } catch (SocketTimeoutException idle) {
                    // Periodically check the stop flag.
                }
            }
        } catch (Exception error) {
            if (running) {
                listener.onEvent("TLS_SETUP_ERROR", "TLS probe startup failed: " + error.getClass().getSimpleName());
            }
        } finally {
            ServerSocket open = server;
            if (open != null) {
                try { open.close(); } catch (IOException ignored) {}
                server = null;
            }
        }
    }

    private void classifyOneConnection(Socket raw, int number) {
        try (Socket socket = raw) {
            socket.setSoTimeout(HEADER_TIMEOUT_MS);
            InputStream in = socket.getInputStream();
            byte[] first = new byte[5];
            int length = 0;
            while (running && length < first.length) {
                int got = in.read(first, length, first.length - length);
                if (got < 0) break;
                length += got;
            }
            if (running) listener.onEvent("PROTO_FIRST", "Connection #" + number +
                    " started with: " + CastHandshakeClassifier.firstRecord(first, length) +
                    " (one diagnostic contact intentionally closed)");
            // The five bytes are discarded immediately; never export or persist.
        } catch (SocketTimeoutException timeout) {
            if (running) listener.onEvent("PROTO_FIRST", "First connection sent no complete header before timeout");
        } catch (IOException closed) {
            if (running) listener.onEvent("PROTO_FIRST", "First connection ended during header classification");
        } finally {
            activePlainSockets.remove(raw);
        }
    }

    /**
     * Checks the precise server-side TLS layering used by external connections.
     * Both endpoints are inside this process, bound to loopback only. The test
     * client trusts precisely the certificate stored under our LOCAL alias,
     * never arbitrary certificates or network hosts.
     */
    private void runLoopbackSelfTest(SSLContext serverContext) {
        listener.onEvent("TLS_SELFTEST", "Running isolated loopback TLS test with locally pinned certificate");
        try {
            KeyStore localKeys = KeyStore.getInstance("AndroidKeyStore");
            localKeys.load(null);
            final X509Certificate expected = (X509Certificate) localKeys.getCertificate(KEY_ALIAS);
            if (expected == null) throw new CertificateException("Local test identity not found");
            X509TrustManager localPin = new X509TrustManager() {
                @Override public void checkClientTrusted(X509Certificate[] chain, String authType)
                        throws CertificateException {
                    throw new CertificateException("Client certificates are not supported");
                }
                @Override public void checkServerTrusted(X509Certificate[] chain, String authType)
                        throws CertificateException {
                    if (chain == null || chain.length == 0 || chain[0] == null)
                        throw new CertificateException("Missing local test certificate");
                    try {
                        if (!MessageDigest.isEqual(chain[0].getEncoded(), expected.getEncoded()))
                            throw new CertificateException("Unexpected local test certificate");
                    } catch (java.security.cert.CertificateEncodingException exception) {
                        throw new CertificateException("Certificate unreadable", exception);
                    }
                }
                @Override public X509Certificate[] getAcceptedIssuers() {
                    return new X509Certificate[0];
                }
            };
            SSLContext clientContext = SSLContext.getInstance("TLS");
            clientContext.init(null, new TrustManager[] { localPin }, new SecureRandom());
            try (ServerSocket loopServer = new ServerSocket(
                    0, 1, InetAddress.getLoopbackAddress())) {
                loopServer.setSoTimeout(SELF_TEST_TIMEOUT_MS);
                AtomicBoolean serverSuccess = new AtomicBoolean(false);
                AtomicReference<Throwable> serverError = new AtomicReference<>();
                Thread loopThread = new Thread(() -> {
                    try (Socket accepted = loopServer.accept();
                         SSLSocket serverSide = (SSLSocket) serverContext.getSocketFactory()
                                 .createSocket(accepted, "localhost", accepted.getPort(), true)) {
                        serverSide.setUseClientMode(false);
                        serverSide.setSoTimeout(SELF_TEST_TIMEOUT_MS);
                        serverSide.startHandshake();
                        serverSuccess.set(true);
                    } catch (Exception problem) {
                        serverError.set(problem);
                    }
                }, "cast-tls-selftest");
                loopThread.setDaemon(true);
                loopThread.start();
                boolean clientSuccess = false;
                Throwable clientError = null;
                try (SSLSocket client = (SSLSocket) clientContext.getSocketFactory()
                        .createSocket(InetAddress.getLoopbackAddress(), loopServer.getLocalPort())) {
                    client.setUseClientMode(true);
                    client.setSoTimeout(SELF_TEST_TIMEOUT_MS);
                    client.startHandshake();
                    clientSuccess = true;
                } catch (Exception failure) {
                    clientError = failure;
                }
                loopThread.join(SELF_TEST_TIMEOUT_MS + 500L);
                if (clientSuccess && serverSuccess.get()) {
                    listener.onEvent("TLS_SELFTEST_OK", "Fire TV completed local TLS handshake using the test key");
                } else {
                    Throwable reason = clientError != null ? clientError : serverError.get();
                    listener.onEvent("TLS_SELFTEST_FAIL", "Local TLS test failed: " +
                            CastHandshakeClassifier.tlsFailure(reason) + " (" +
                            (reason == null ? "incomplete handshake" : reason.getClass().getSimpleName()) + ")");
                }
            }
        } catch (Exception failure) {
            listener.onEvent("TLS_SELFTEST_FAIL",
                    "Local TLS test unavailable: " + failure.getClass().getSimpleName());
        }
    }

    private SSLContext createTlsContext() throws Exception {
        // AndroidKeystore keys are generated on the TV; only a test certificate
        // is made. No Google/device/vendor certificate is used or imitated.
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        if (!keyStore.containsAlias(KEY_ALIAS)) {
            KeyPairGenerator generator = KeyPairGenerator.getInstance(
                    KeyProperties.KEY_ALGORITHM_RSA, "AndroidKeyStore");
            long now = System.currentTimeMillis();
            KeyGenParameterSpec parameters = new KeyGenParameterSpec.Builder(
                    KEY_ALIAS, KeyProperties.PURPOSE_SIGN | KeyProperties.PURPOSE_DECRYPT)
                    .setKeySize(2048)
                    .setDigests(KeyProperties.DIGEST_SHA256)
                    .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_RSA_PKCS1)
                    .setCertificateSubject(new X500Principal("CN=WebPortal Cast TEST"))
                    .setCertificateSerialNumber(BigInteger.valueOf(1))
                    .setCertificateNotBefore(new Date(now - 86400000L))
                    .setCertificateNotAfter(new Date(now + 3650L * 86400000L))
                    .build();
            generator.initialize(parameters);
            generator.generateKeyPair();
        }

        KeyManagerFactory keys = KeyManagerFactory.getInstance(
                KeyManagerFactory.getDefaultAlgorithm());
        keys.init(keyStore, null);
        SSLContext tls = SSLContext.getInstance("TLS");
        tls.init(keys.getKeyManagers(), null, new SecureRandom());
        return tls;
    }

    private void examine(SSLSocket peer, int number) {
        String id = "#" + number;
        long started = System.currentTimeMillis();
        try (SSLSocket socket = peer) {
            socket.setUseClientMode(false);
            socket.setNeedClientAuth(false);
            socket.setSoTimeout(HANDSHAKE_TIMEOUT_MS);
            listener.onEvent("TLS_STARTED", "Connection " + id + " attempting TLS handshake");
            socket.startHandshake();
            listener.onEvent("TLS_OK", "Connection " + id + " negotiated " +
                    safeProtocol(socket.getSession().getProtocol()));
            socket.setSoTimeout(FRAME_READ_TIMEOUT_MS);
            DataInputStream stream = new DataInputStream(socket.getInputStream());
            int messages = 0;
            while (running && messages < MAX_FRAMES
                    && System.currentTimeMillis() - started < MAX_SESSION_MS) {
                int length;
                try {
                    length = stream.readInt(); // Cast V2 unsigned 32-bit network-order length.
                } catch (SocketTimeoutException timeout) {
                    listener.onEvent("V2_WAIT", "Connection " + id + " has TLS but no complete Cast V2 header");
                    break;
                } catch (EOFException ended) {
                    listener.onEvent("V2_CLOSED", "Connection " + id + " closed after TLS handshake");
                    break;
                }
                if (length <= 0 || length > FRAME_LIMIT) {
                    listener.onEvent("V2_INVALID", "Connection " + id + " frame length is unsupported");
                    break;
                }
                byte[] frame = new byte[length];
                try {
                    stream.readFully(frame); // In memory only, never saved or logged.
                } catch (SocketTimeoutException timeout) {
                    listener.onEvent("V2_WAIT", "Connection " + id + " sent incomplete Cast frame");
                    break;
                }
                messages++;
                String namespace = parseNamespace(frame);
                if (namespace == null) {
                    listener.onEvent("V2_INVALID", "Connection " + id + " sent unrecognized protobuf envelope");
                    break;
                }
                if (namespace.equals("urn:x-cast:com.google.cast.tp.deviceauth")) {
                    listener.onEvent("V2_AUTH", "Connection " + id +
                            " sent Cast deviceauth message; no certified response available");
                    break;
                }
                listener.onEvent("V2_NAMESPACE", "Connection " + id + " namespace: " + namespace);
            }
            if (messages >= MAX_FRAMES) {
                listener.onEvent("V2_LIMIT", "Connection " + id + " diagnostic frame limit reached");
            }
        } catch (SSLHandshakeException authFailure) {
            listener.onEvent("TLS_FAILED", "Connection " + id +
                    " TLS handshake failed (" + CastHandshakeClassifier.tlsFailure(authFailure) + ")");
        } catch (SSLException tlsFailure) {
            listener.onEvent("TLS_FAILED", "Connection " + id +
                    " TLS negotiation interrupted (" + CastHandshakeClassifier.tlsFailure(tlsFailure) + ")");
        } catch (SocketTimeoutException timeout) {
            listener.onEvent("TLS_TIMEOUT", "Connection " + id + " handshake timed out");
        } catch (IOException closed) {
            if (running) listener.onEvent("TLS_CLOSED", "Connection " + id +
                    " closed or disconnected (" + closed.getClass().getSimpleName() + ")");
        } catch (RuntimeException error) {
            if (running) listener.onEvent("TLS_ERROR", "Connection " + id + " receiver exception");
        } finally {
            activeSockets.remove(peer);
            // The underlying TCP socket closes with its TLS wrapper; raw set
            // is session-local and never exported or reused.
        }
    }

    private static String safeProtocol(String value) {
        if (value == null) return "unknown TLS";
        return value.matches("TLSv[0-9.]{2,8}") ? value : "TLS";
    }

    /**
     * Parse only protobuf field #4 (Cast namespace). Never read content from
     * payload fields #6/#7 into a string. Invalid wire data is rejected.
     */
    static String parseNamespace(byte[] frame) {
        int offset = 0;
        int fields = 0;
        while (offset < frame.length && fields++ < 32) {
            Varint tag = readVarint(frame, offset);
            if (tag == null || tag.value < 8) return null;
            offset = tag.next;
            int type = (int) (tag.value & 7);
            int number = (int) (tag.value >>> 3);
            if (type == 0) {
                Varint value = readVarint(frame, offset);
                if (value == null) return null;
                offset = value.next;
            } else if (type == 1) {
                if (offset + 8 > frame.length) return null;
                offset += 8;
            } else if (type == 5) {
                if (offset + 4 > frame.length) return null;
                offset += 4;
            } else if (type == 2) {
                Varint len = readVarint(frame, offset);
                if (len == null || len.value > frame.length) return null;
                offset = len.next;
                if (len.value < 0 || len.value > frame.length - offset) return null;
                int size = (int) len.value;
                if (number == 4) {
                    if (size < 6 || size > 160) return null;
                    String namespace = new String(frame, offset, size, StandardCharsets.US_ASCII);
                    if (namespace.matches("urn:x-cast:[A-Za-z0-9._-]{1,145}"))
                        return namespace;
                    return null;
                }
                offset += size;
            } else return null;
        }
        return null;
    }

    private static Varint readVarint(byte[] bytes, int offset) {
        long value = 0;
        int shift = 0;
        for (int i = 0; i < 10; i++) {
            if (offset >= bytes.length) return null;
            int b = bytes[offset++] & 255;
            if (i == 9 && (b & 254) != 0) return null;
            value |= (long)(b & 127) << shift;
            if ((b & 128) == 0) return new Varint(value, offset);
            shift += 7;
        }
        return null;
    }

    private static final class Varint {
        final long value;
        final int next;
        Varint(long value, int next) { this.value = value; this.next = next; }
    }

    public void stop() {
        running = false;
        ServerSocket socket = server;
        server = null;
        if (socket != null) {
            try { socket.close(); } catch (IOException ignored) {}
        }
        for (SSLSocket peer : activeSockets) {
            try { peer.close(); } catch (IOException ignored) {}
        }
        activeSockets.clear();
        for (Socket raw : activePlainSockets) {
            try { raw.close(); } catch (IOException ignored) {}
        }
        activePlainSockets.clear();
        connections.shutdownNow();
    }
}
