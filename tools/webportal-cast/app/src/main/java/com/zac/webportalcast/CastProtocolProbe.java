package com.zac.webportalcast;

import android.app.Activity;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;

import java.io.DataInputStream;
import java.io.EOFException;
import java.io.IOException;
import java.net.InetAddress;
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
import java.security.PrivateKey;
import java.security.Signature;
import java.security.cert.Certificate;
import java.security.SecureRandom;
import java.util.Collections;
import java.util.Date;
import java.util.Set;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.KeyManager;
import javax.net.ssl.X509KeyManager;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLException;
import javax.net.ssl.SSLHandshakeException;
import javax.net.ssl.SSLServerSocket;
import javax.net.ssl.SSLSocket;
import javax.security.auth.x500.X500Principal;

/**
 * Experimental Cast V2 control receiver. NOT a certified or video-capable Cast receiver.
 *
 * Uses an app-owned, untrusted AndroidKeyStore self-signed TLS test identity.
 * It cannot impersonate Google-certified devices or receive Cast gameplay.
 * It answers deviceauth challenges with an explicit error (never a forged
 * certificate/signature), and supports heartbeat / truthful idle status.
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

    // v0.1.9: use a new alias; old key authorizations cannot be widened
    // after generation and the old key remains untouched.
    // New local-only test identity: constrained TLS validity, not Cast-certified.
    private static final String KEY_ALIAS = "webportal_cast_auth_test_tls_03";
    private static final int FRAME_LIMIT = 65536;
    private static final int MAX_FRAMES = 6;
    private static final int MAX_SESSION_MS = 9000;
    private static final int HANDSHAKE_TIMEOUT_MS = 5000;
    private static final int SELF_TEST_TIMEOUT_MS = 3000;
    private static final int FRAME_READ_TIMEOUT_MS = 2200;

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
    private volatile SSLServerSocket server;
    private volatile PrivateKey localAuthKey;
    private volatile X509Certificate localAuthCertificate;
    private Thread acceptThread;
    private int connectionSequence;

    public CastProtocolProbe(Activity activity, Listener listener) {
        this.listener = listener;
    }

    public synchronized void start() {
        if (running) return;
        running = true;
        acceptThread = new Thread(this::serve, "webportal-cast-tls-probe");
        acceptThread.setDaemon(true);
        acceptThread.start();
    }

    /**
     * Accept TLS connections in server mode directly, rather than wrapping
     * accepted TCP sockets with SSLContext.getSocketFactory() (a client
     * factory) and changing modes afterward. Android 7 / Fire OS 5's TLS
     * provider may not behave consistently with that layered construction.
     *
     * The first inbound connection is now treated the same as every other;
     * v0.1.5 established that the Quest sends a TLS ClientHello.
     */
    private void serve() {
        try {
            listener.onEvent("TLS_SETUP", "Preparing local self-signed AndroidKeyStore test identity");
            SSLContext context = createTlsContext();
            if (!running) return;
            runLoopbackSelfTest(context);
            if (!running) return;

            SSLServerSocket socket = (SSLServerSocket)
                    context.getServerSocketFactory().createServerSocket(0, 8);
            socket.setUseClientMode(false);
            socket.setNeedClientAuth(false);
            socket.setSoTimeout(1000);
            server = socket;
            if (!running) {
                socket.close();
                return;
            }
            listener.onEvent("TLS_READY", "Server-mode TLS listener active; NOT a certified Cast receiver");
            listener.onReady(socket.getLocalPort());
            // Connect the *real* Android listener to the independent on-device
            // test client using only the loopback interface. Run on a new
            // thread so the accept loop remains free to serve the test socket.
            Thread controlSelfTest = new Thread(() ->
                    CastOnDeviceSelfTest.run(socket.getLocalPort(),
                            localAuthCertificate, (category, description) -> {
                                if (running) listener.onEvent(category, description);
                            }), "cast-v2-on-device-selftest");
            controlSelfTest.setDaemon(true);
            controlSelfTest.start();
            while (running) {
                try {
                    SSLSocket peer = (SSLSocket) socket.accept();
                    if (!running) { peer.close(); break; }
                    final int number;
                    synchronized (this) { number = ++connectionSequence; }
                    activeSockets.add(peer);
                    // The local self-test must never inflate counters intended
                    // for real Quest/sender Cast TCP connections.
                    if (!peer.getInetAddress().isLoopbackAddress())
                        listener.onContact();
                    try {
                        connections.execute(() -> examine(peer, number));
                    } catch (RejectedExecutionException overloaded) {
                        activeSockets.remove(peer);
                        peer.close();
                        listener.onEvent("TLS_BUSY", "Probe is busy; a connection was dropped");
                    }
                } catch (SocketTimeoutException idle) {
                    // Check the lifecycle flag.
                }
            }
        } catch (Exception error) {
            if (running) listener.onEvent("TLS_SETUP_ERROR",
                    "TLS probe startup failed: " + error.getClass().getSimpleName());
        } finally {
            SSLServerSocket open = server;
            if (open != null) {
                try { open.close(); } catch (IOException ignored) {}
                server = null;
            }
        }
    }

    /**
     * Checks the same SSLServerSocket-based server path used for Quest peers,
     * using a local client pinned exactly to our AndroidKeyStore test cert.
     * Both endpoints stay on loopback; no internet or device credentials.
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
            try (SSLServerSocket loopServer = (SSLServerSocket)
                    serverContext.getServerSocketFactory().createServerSocket(
                            0, 1, InetAddress.getLoopbackAddress())) {
                loopServer.setUseClientMode(false);
                loopServer.setNeedClientAuth(false);
                loopServer.setSoTimeout(SELF_TEST_TIMEOUT_MS);
                AtomicBoolean serverSuccess = new AtomicBoolean(false);
                AtomicReference<Throwable> serverError = new AtomicReference<>();
                Thread loopThread = new Thread(() -> {
                    try (SSLSocket serverSide = (SSLSocket) loopServer.accept()) {
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
                    Throwable serverFailure = serverError.get();
                    listener.onEvent("TLS_SELFTEST_FAIL", "Local TLS check incomplete: client=" +
                            safeSelfTestFailure(clientError, clientSuccess) + " server=" +
                            safeSelfTestFailure(serverFailure, serverSuccess.get()));
                }
            }
        } catch (Exception failure) {
            listener.onEvent("TLS_SELFTEST_FAIL",
                    "Local TLS test unavailable: " + failure.getClass().getSimpleName());
        }
    }

    private static String safeSelfTestFailure(Throwable failure, boolean completed) {
        if (completed) return "PASS";
        if (failure == null) return "no completion";
        return failure.getClass().getSimpleName() + "/"
                + CastHandshakeClassifier.tlsFailure(failure);
    }

    private SSLContext createTlsContext() throws Exception {
        // AndroidKeystore keys are generated on the TV; only a test certificate
        // is made. No Google/device/vendor certificate is used or imitated.
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        // Sender implementations may reject TLS self-signed certificates with
        // more than four days remaining, even before checking Cast device auth.
        // Rotate only our test identity near expiry; retain all older aliases.
        Certificate previous = keyStore.getCertificate(KEY_ALIAS);
        if (previous instanceof X509Certificate &&
                ((X509Certificate)previous).getNotAfter().getTime() -
                        System.currentTimeMillis() < 12L * 60 * 60 * 1000) {
            keyStore.deleteEntry(KEY_ALIAS);
            listener.onEvent("TLS_IDENTITY", "Expired or expiring local test TLS identity rotated");
        }
        if (!keyStore.containsAlias(KEY_ALIAS)) {
            KeyPairGenerator generator = KeyPairGenerator.getInstance(
                    KeyProperties.KEY_ALGORITHM_RSA, "AndroidKeyStore");
            long now = System.currentTimeMillis();
            KeyGenParameterSpec parameters = new KeyGenParameterSpec.Builder(
                    KEY_ALIAS, KeyProperties.PURPOSE_SIGN | KeyProperties.PURPOSE_DECRYPT)
                    .setKeySize(2048)
                    // Android's TLS stack signs already-hashed transcript data.
                    // The old key only permitted SHA256, not DIGEST_NONE.
                    .setDigests(KeyProperties.DIGEST_NONE, KeyProperties.DIGEST_SHA1,
                            KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA384,
                            KeyProperties.DIGEST_SHA512)
                    .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1,
                            KeyProperties.SIGNATURE_PADDING_RSA_PSS)
                    // TLS providers may require no-padding or PKCS#1 when
                    // performing RSA server operations on older Android.
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE,
                            KeyProperties.ENCRYPTION_PADDING_RSA_PKCS1)
                    .setRandomizedEncryptionRequired(false)
                    .setCertificateSubject(new X500Principal("CN=WebPortal Cast TEST"))
                    .setCertificateSerialNumber(BigInteger.valueOf(3))
                    .setCertificateNotBefore(new Date(now - 60000L))
                    .setCertificateNotAfter(new Date(now + 2L * 86400000L))
                    .build();
            generator.initialize(parameters);
            generator.generateKeyPair();
        }

        // Restrict this TLS context to the new key. Both the old v0.1.4
        // and new v0.1.9 keys coexist in AndroidKeyStore, so choosing a
        // generic RSA alias could otherwise defeat our pinned self-test.
        Certificate certificate = keyStore.getCertificate(KEY_ALIAS);
        java.security.Key privateKeyCandidate = keyStore.getKey(KEY_ALIAS, null);
        boolean hasCertificate = certificate instanceof X509Certificate;
        boolean hasPrivateKey = privateKeyCandidate instanceof PrivateKey;
        listener.onEvent("TLS_IDENTITY",
                "Test key=" + hasPrivateKey + " certificate=" + hasCertificate
                        + " pinned RSA server identity=" + (hasPrivateKey && hasCertificate));
        if (!hasPrivateKey || !hasCertificate)
            throw new java.security.KeyStoreException("Local test TLS key or certificate unavailable");

        PrivateKey privateKey = (PrivateKey) privateKeyCandidate;
        X509Certificate x509 = (X509Certificate) certificate;
        // Public SHA-256 certificate fingerprint is safe to export. Enables
        // an external, developer-controlled sender to pin this exact test
        // identity rather than implicitly trust arbitrary TLS certificates.
        byte[] publicFingerprint = MessageDigest.getInstance("SHA-256").digest(x509.getEncoded());
        StringBuilder pin = new StringBuilder(64);
        for (byte octet : publicFingerprint)
            pin.append(String.format(java.util.Locale.US, "%02x", octet & 255));
        listener.onEvent("TLS_TEST_SHA256", "Public local TLS certificate SHA256: " + pin);
        localAuthKey = privateKey;
        localAuthCertificate = x509;
        long remainingHours = Math.max(0,
                (x509.getNotAfter().getTime() - System.currentTimeMillis()) / 3600000L);
        listener.onEvent("TLS_AUTH_TEST_IDENTITY",
                "Local self-owned certificate, valid for " + remainingHours +
                        " more hours (NOT Google-trusted)");
        checkLocalSigning(privateKey, x509);

        SSLContext tls = SSLContext.getInstance("TLS");
        tls.init(new javax.net.ssl.KeyManager[]{
                new CastTestKeyManager(KEY_ALIAS, privateKey, x509)
        }, null, new SecureRandom());
        return tls;
    }

    /**
     * Test the exact raw-signing primitive some Android TLS providers use.
     * The message, signature, and key are ephemeral/private and never logged.
     * Failure is diagnostic only; the local TLS self-test remains definitive.
     */
    private void checkLocalSigning(PrivateKey key, X509Certificate certificate) {
        try {
            byte[] sample = new byte[32];
            new SecureRandom().nextBytes(sample);
            Signature signing = Signature.getInstance("NONEwithRSA");
            signing.initSign(key);
            signing.update(sample);
            byte[] signature = signing.sign();
            Signature verify = Signature.getInstance("NONEwithRSA");
            verify.initVerify(certificate.getPublicKey());
            verify.update(sample);
            listener.onEvent("TLS_KEY_SIGN", "Raw RSA test signature verified=" + verify.verify(signature));
        } catch (Exception error) {
            listener.onEvent("TLS_KEY_SIGN", "Raw RSA test unavailable: " + error.getClass().getSimpleName());
        }
    }

    private void examine(SSLSocket peer, int number) {
        String id = "#" + number;
        boolean localTest = peer.getInetAddress().isLoopbackAddress();
        try (SSLSocket socket = peer) {
            socket.setUseClientMode(false);
            socket.setNeedClientAuth(false);
            socket.setSoTimeout(HANDSHAKE_TIMEOUT_MS);
            if (!localTest) listener.onEvent("TLS_STARTED", "Connection " + id + " attempting TLS handshake");
            socket.startHandshake();
            if (!localTest) listener.onEvent("TLS_OK", "Connection " + id + " negotiated " +
                    safeProtocol(socket.getSession().getProtocol()));
            // Cast V2 deviceauth is distinct from the TLS handshake. We now
            // retain the authenticated TLS channel long enough to respond to
            // heartbeats and truthful status requests, and explicitly decline
            // unsupported device identity/streaming operations.
            socket.setSoTimeout(8000);
            CastV2ControlSession.run(socket, number,
                    (category, description) -> {
                        if (running && !localTest) listener.onEvent(category, description);
                    }, localAuthKey, localAuthCertificate);
        } catch (SSLHandshakeException authFailure) {
            if (!localTest) listener.onEvent("TLS_FAILED", "Connection " + id +
                    " TLS handshake failed (" + CastHandshakeClassifier.tlsFailure(authFailure) + ")");
        } catch (SSLException tlsFailure) {
            if (!localTest) listener.onEvent("TLS_FAILED", "Connection " + id +
                    " TLS negotiation interrupted (" + CastHandshakeClassifier.tlsFailure(tlsFailure) + ")");
        } catch (SocketTimeoutException timeout) {
            if (!localTest) listener.onEvent("TLS_TIMEOUT", "Connection " + id + " handshake timed out");
        } catch (IOException closed) {
            if (running && !localTest) listener.onEvent("TLS_CLOSED", "Connection " + id +
                    " closed or disconnected (" + closed.getClass().getSimpleName() + ")");
        } catch (RuntimeException error) {
            if (running && !localTest) listener.onEvent("TLS_ERROR", "Connection " + id + " receiver exception");
        } finally {
            activeSockets.remove(peer);
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
        SSLServerSocket socket = server;
        server = null;
        if (socket != null) {
            try { socket.close(); } catch (IOException ignored) {}
        }
        for (SSLSocket peer : activeSockets) {
            try { peer.close(); } catch (IOException ignored) {}
        }
        activeSockets.clear();
        connections.shutdownNow();
    }
}
