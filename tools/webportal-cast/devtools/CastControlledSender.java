package com.zac.webportalcast.devtools;

import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.Key;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.SecureRandom;
import java.security.Signature;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.Arrays;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicReference;

import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLHandshakeException;
import javax.net.ssl.SSLServerSocket;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

/**
 * JDK-only, independent Cast V2 developer sender. It never trusts all TLS
 * certificates. The peer must present EXACTLY the SHA-256 certificate pin
 * supplied on the command line. PIN IS A SHA-256 DIGEST, NOT A PAIRING CODE.
 *
 * A successful run only proves the receiver's response is correct under the
 * developer's expressly permitted local test trust policy. It never proves
 * that Google/Meta trusts the device or that gameplay mirroring is available.
 *
 * Usage:
 *   java ...CastControlledSender --host 192.168.1.20 --port 12345 \
 *     --tls-cert-sha256 64_HEX_CHARACTERS
 *   java ...CastControlledSender --self-test /tmp/cast-test.p12 password
 */
public final class CastControlledSender {
    private static final String AUTH = "urn:x-cast:com.google.cast.tp.deviceauth";
    private static final String RECEIVER = "urn:x-cast:com.google.cast.receiver";
    private static final String HEARTBEAT = "urn:x-cast:com.google.cast.tp.heartbeat";
    private static final String CONNECTION = "urn:x-cast:com.google.cast.tp.connection";
    private static final int MAX_FRAME = 65536;
    private static final int MAX_MESSAGES = 16;
    private static final String APP_ID = "CC1AD845";

    private CastControlledSender() {}

    public static void main(String[] args) throws Exception {
        if (args.length == 3 && "--self-test".equals(args[0])) {
            selfTest(Path.of(args[1]), args[2]);
            return;
        }
        if (args.length != 6 || !"--host".equals(args[0]) ||
                !"--port".equals(args[2]) || !"--tls-cert-sha256".equals(args[4])) {
            System.err.println("Usage: --host PRIVATE_IPV4 --port PORT --tls-cert-sha256 SHA256_HEX");
            System.err.println("Or: --self-test KEYSTORE_P12 TEST_PASSWORD");
            System.exit(2);
        }
        InetAddress host = requireLocalIp(args[1]);
        int port = Integer.parseInt(args[3]);
        if (port < 1 || port > 65535) throw new IllegalArgumentException("Invalid port");
        String pin = requireSha256(args[5]);
        test(host, port, pin);
        System.out.println("PASS: locally pinned TLS, Cast app availability, receiver status, " +
                "self-owned nonce/cert signature, heartbeat.");
        System.out.println("NOT TESTED: Google Cast trusted CA certification or Quest media playback.");
    }

    static void test(InetAddress host, int port, String pin) throws Exception {
        final X509Certificate[] observed = new X509Certificate[1];
        X509TrustManager exactCertPin = new X509TrustManager() {
            @Override public X509Certificate[] getAcceptedIssuers() {
                return new X509Certificate[0];
            }
            @Override public void checkClientTrusted(X509Certificate[] chain, String method)
                    throws CertificateException {
                throw new CertificateException("Sender does not accept client certificates");
            }
            @Override public void checkServerTrusted(X509Certificate[] chain, String method)
                    throws CertificateException {
                if (chain == null || chain.length == 0 || chain[0] == null)
                    throw new CertificateException("Missing receiver certificate");
                try {
                    if (!MessageDigest.isEqual(hexSha256(chain[0].getEncoded())
                            .getBytes(StandardCharsets.US_ASCII),
                            pin.getBytes(StandardCharsets.US_ASCII)))
                        throw new CertificateException("Cast test TLS certificate fingerprint mismatch");
                    chain[0].checkValidity();
                    observed[0] = chain[0];
                } catch (java.security.GeneralSecurityException failed) {
                    if (failed instanceof CertificateException) throw (CertificateException) failed;
                    throw new CertificateException("Unable to validate pinned TLS certificate", failed);
                }
            }
        };
        SSLContext tls = SSLContext.getInstance("TLS");
        tls.init(null, new TrustManager[]{exactCertPin}, new SecureRandom());

        try (Socket transport = new Socket()) {
            transport.connect(new InetSocketAddress(host, port), 5000);
            transport.setSoTimeout(8000);
            try (SSLSocket socket = (SSLSocket) tls.getSocketFactory()
                    .createSocket(transport, host.getHostAddress(), port, true)) {
                socket.setUseClientMode(true);
                socket.setEnabledProtocols(new String[]{"TLSv1.2"});
                socket.startHandshake();
                if (observed[0] == null) throw new IOException("TLS pinned identity not observed");
                DataInputStream in = new DataInputStream(socket.getInputStream());
                DataOutputStream out = new DataOutputStream(socket.getOutputStream());

                write(out, text(CONNECTION, "{\"type\":\"CONNECT\",\"connType\":0}"));
                write(out, text(RECEIVER,
                        "{\"type\":\"GET_APP_AVAILABILITY\",\"requestId\":548," +
                        "\"appId\":[\"" + APP_ID + "\"]}"));
                Wire availability = read(in);
                require(availability.namespace.equals(RECEIVER) && availability.type == 0,
                        "Missing app availability reply");
                String avail = availability.utf8();
                require(avail.contains("\"responseType\":\"GET_APP_AVAILABILITY\"") &&
                        avail.contains("\"requestId\":548") &&
                        avail.contains("\"" + APP_ID + "\":\"APP_UNAVAILABLE\""),
                        "Receiver app availability mismatch: " + safeSummary(avail));

                write(out, text(RECEIVER, "{\"type\":\"GET_STATUS\",\"requestId\":549}"));
                Wire status = read(in);
                require(status.namespace.equals(RECEIVER) && status.type == 0,
                        "Missing receiver status reply");
                String statusJson = status.utf8();
                require(statusJson.contains("\"responseType\":\"RECEIVER_STATUS\"") &&
                        statusJson.contains("\"requestId\":549") &&
                        statusJson.contains("\"applications\":[]"),
                        "Receiver status mismatch: " + safeSummary(statusJson));

                byte[] nonce = new byte[16];
                new SecureRandom().nextBytes(nonce);
                byte[] challenge = message(
                        field(1, concat(integer(1, 1), field(2, nonce), integer(3, 1))));
                write(out, new Wire("sender-0", "receiver-0", AUTH, 1, challenge));
                Wire response = read(in);
                require(response.namespace.equals(AUTH) && response.type == 1,
                        "No Cast deviceauth binary response");
                validateLocalAuth(response.body, nonce, observed[0]);

                // Post-auth commands are deliberately sent because this sender
                // chose to trust the local key. Quest is not configured so.
                write(out, text(HEARTBEAT, "{\"type\":\"PING\"}"));
                Wire pong = read(in);
                require(pong.namespace.equals(HEARTBEAT) &&
                        pong.utf8().contains("\"type\":\"PONG\""),
                        "No post-auth Cast heartbeat response");

                write(out, text(CONNECTION, "{\"type\":\"CLOSE\"}"));
            }
        }
    }

    private static void validateLocalAuth(byte[] raw, byte[] nonce, X509Certificate tlsCertificate)
            throws Exception {
        byte[] response = findBytes(raw, 2);
        require(response != null, "Missing AuthResponse (auth error instead?)");
        byte[] signature = findBytes(response, 1);
        byte[] certificateDer = findBytes(response, 2);
        byte[] echoedNonce = findBytes(response, 5);
        require(signature != null && signature.length > 128, "Missing RSA auth signature");
        require(certificateDer != null && certificateDer.length > 64,
                "Missing self-owned auth certificate");
        require(Arrays.equals(certificateDer, tlsCertificate.getEncoded()),
                "Auth credential differs from pinned TLS test certificate");
        require(Arrays.equals(nonce, echoedNonce), "Auth response did not echo sender nonce");
        require(findInteger(response, 4, -1) == 1, "Unexpected Cast signature algorithm");
        require(findInteger(response, 6, -1) == 1, "Unexpected Cast hash algorithm");

        byte[] signedContent = concat(nonce, tlsCertificate.getEncoded());
        Signature verifier = Signature.getInstance("SHA256withRSA");
        verifier.initVerify(tlsCertificate.getPublicKey());
        verifier.update(signedContent);
        require(verifier.verify(signature), "Receiver signature invalid for nonce + TLS certificate");
    }

    private static String safeSummary(String s) {
        return s.length() < 120 ? s : s.substring(0, 120) + "...";
    }

    private static void require(boolean condition, String message) throws IOException {
        if (!condition) throw new IOException(message);
    }

    private static InetAddress requireLocalIp(String host) throws Exception {
        if (host == null || !host.matches("[0-9]{1,3}(\\.[0-9]{1,3}){3}"))
            throw new IllegalArgumentException("Provide numeric private IPv4 only, no DNS names");
        InetAddress addr = InetAddress.getByName(host);
        byte[] b = addr.getAddress();
        if (!(addr instanceof Inet4Address) ||
                !((b[0] & 255) == 10 || (b[0] & 255) == 127 ||
                  ((b[0] & 255) == 192 && (b[1] & 255) == 168) ||
                  ((b[0] & 255) == 172 && (b[1] & 255) >= 16 && (b[1] & 255) <= 31)))
            throw new IllegalArgumentException("Only RFC1918/loopback IPv4 permitted");
        return addr;
    }

    private static String requireSha256(String pin) {
        if (pin == null || !pin.matches("(?i)[0-9a-f]{64}"))
            throw new IllegalArgumentException("Explicit 64-character TLS cert SHA256 required");
        return pin.toLowerCase(Locale.ROOT);
    }

    static String hexSha256(byte[] data) throws Exception {
        byte[] sha = MessageDigest.getInstance("SHA-256").digest(data);
        StringBuilder out = new StringBuilder(64);
        for (byte b : sha) out.append(String.format(Locale.ROOT, "%02x", b & 255));
        return out.toString();
    }

    private static Wire text(String ns, String json) {
        return new Wire("sender-0", "receiver-0", ns, 0,
                json.getBytes(StandardCharsets.UTF_8));
    }
    private static final class Wire {
        final String source, dest, namespace;
        final int type;
        final byte[] body;
        Wire(String source, String dest, String namespace, int type, byte[] body) {
            this.source = source; this.dest = dest; this.namespace = namespace;
            this.type = type; this.body = body;
        }
        String utf8() throws IOException {
            require(type == 0 && body.length <= 8192, "Expected bounded Cast JSON");
            return new String(body, StandardCharsets.UTF_8);
        }
    }

    private static void write(DataOutputStream out, Wire wire) throws IOException {
        byte[] raw = concat(
                integer(1, 0),
                field(2, wire.source.getBytes(StandardCharsets.US_ASCII)),
                field(3, wire.dest.getBytes(StandardCharsets.US_ASCII)),
                field(4, wire.namespace.getBytes(StandardCharsets.US_ASCII)),
                integer(5, wire.type),
                field(wire.type == 0 ? 6 : 7, wire.body));
        require(raw.length <= MAX_FRAME, "Cast frame too large");
        out.writeInt(raw.length);
        out.write(raw);
        out.flush();
    }

    private static Wire read(DataInputStream in) throws Exception {
        int size = in.readInt();
        require(size > 0 && size <= MAX_FRAME, "Unexpected framed Cast message size");
        byte[] body = new byte[size];
        in.readFully(body);
        String source = null, dest = null, ns = null;
        int version = -1, type = -1, payloadField = 0;
        byte[] payload = null;
        int cursor = 0;
        while (cursor < body.length) {
            Item i = next(body, cursor);
            cursor = i.next;
            if (i.field == 1) version = (int)i.number;
            else if (i.field == 5) type = (int)i.number;
            else if (i.field == 2) source = ascii(i.bytes);
            else if (i.field == 3) dest = ascii(i.bytes);
            else if (i.field == 4) ns = ascii(i.bytes);
            else if (i.field == 6 || i.field == 7) {
                require(payload == null, "Duplicate payload");
                payload = i.bytes;
                payloadField = i.field;
            } else if (i.field == 8) require(i.number == 0, "Unsupported Cast chunk");
            else if (i.field == 9) require(i.number == 0, "Unsupported Cast chunk");
        }
        require(version >= 0 && version <= 3 && source != null && dest != null && ns != null &&
                        (type == 0 || type == 1) && payload != null &&
                        payloadField == (type == 0 ? 6 : 7),
                "Invalid Cast V2 response envelope");
        return new Wire(source, dest, ns, type, payload);
    }

    private static String ascii(byte[] bytes) throws IOException {
        require(bytes != null && bytes.length > 0 && bytes.length <= 160,
                "Invalid route field");
        return new String(bytes, StandardCharsets.US_ASCII);
    }

    private static byte[] message(byte[] bytes) { return bytes; }

    private static byte[] field(int field, byte[] bytes) {
        return concat(varint((field << 3) | 2), varint(bytes.length), bytes);
    }
    private static byte[] integer(int field, long value) {
        return concat(varint(field << 3), varint(value));
    }
    private static byte[] varint(long v) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        while ((v & ~127L) != 0) { out.write(((int)v & 127) | 128); v >>>= 7; }
        out.write((int)v);
        return out.toByteArray();
    }
    private static byte[] concat(byte[]... parts) {
        int size = 0;
        for (byte[] part : parts) size += part.length;
        byte[] all = new byte[size];
        int pos = 0;
        for (byte[] part : parts) { System.arraycopy(part, 0, all, pos, part.length); pos += part.length; }
        return all;
    }

    private static int findInteger(byte[] message, int field, int fallback) throws IOException {
        int pos = 0;
        while (pos < message.length) {
            Item item = next(message, pos);
            if (item.field == field && item.wire == 0) return (int)item.number;
            pos = item.next;
        }
        return fallback;
    }
    private static byte[] findBytes(byte[] message, int field) throws IOException {
        int pos = 0;
        while (pos < message.length) {
            Item item = next(message, pos);
            if (item.field == field && item.wire == 2) return item.bytes;
            pos = item.next;
        }
        return null;
    }
    private static Item next(byte[] raw, int cursor) throws IOException {
        long[] tag = readVarint(raw, cursor);
        int field = (int)(tag[0] >>> 3);
        int wire = (int)(tag[0] & 7);
        cursor = (int)tag[1];
        require(field > 0 && field <= 127, "Invalid protobuf tag");
        if (wire == 0) {
            long[] number = readVarint(raw, cursor);
            return new Item(field, wire, number[0], null, (int)number[1]);
        }
        if (wire == 2) {
            long[] length = readVarint(raw, cursor);
            cursor = (int)length[1];
            require(length[0] >= 0 && length[0] <= raw.length - cursor, "Malformed protobuf length");
            byte[] bytes = Arrays.copyOfRange(raw, cursor, cursor + (int)length[0]);
            return new Item(field, wire, 0, bytes, cursor + (int)length[0]);
        }
        if (wire == 1 || wire == 5) {
            int skipped = wire == 1 ? 8 : 4;
            require(skipped <= raw.length - cursor, "Truncated protobuf fixed field");
            return new Item(field, wire, 0, null, cursor + skipped);
        }
        throw new IOException("Invalid protobuf wire type");
    }
    private static long[] readVarint(byte[] raw, int cursor) throws IOException {
        long n = 0;
        for (int i = 0; i < 10; i++) {
            require(cursor < raw.length, "Truncated protobuf varint");
            int octet = raw[cursor++] & 255;
            if (i == 9 && (octet & 254) != 0) throw new IOException("Protobuf overflow");
            n |= (long)(octet & 127) << (i*7);
            if ((octet & 128) == 0) return new long[]{n, cursor};
        }
        throw new IOException("Protobuf varint too long");
    }
    private static final class Item {
        final int field, wire, next;
        final long number;
        final byte[] bytes;
        Item(int field, int wire, long number, byte[] bytes, int next) {
            this.field=field;this.wire=wire;this.number=number;this.bytes=bytes;this.next=next;
        }
    }

    /**
     * Offline ephemeral TLS fixture. It intentionally trusts its OWN key and
     * simulates the TV's responses to exercise the sender's strict verifier.
     * Real AFTMM verification must run separately on the same local network.
     */
    private static void selfTest(Path pkcs12, String password) throws Exception {
        require(Files.isRegularFile(pkcs12), "Missing temporary test keystore");
        KeyStore store = KeyStore.getInstance("PKCS12");
        try (InputStream stream = Files.newInputStream(pkcs12)) {
            store.load(stream, password.toCharArray());
        }
        PrivateKey key = (PrivateKey)store.getKey("cast-test", password.toCharArray());
        X509Certificate cert = (X509Certificate)store.getCertificate("cast-test");
        if (key == null || cert == null) throw new IOException("Temporary TLS fixture key missing");
        KeyManagerFactory keys = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
        keys.init(store, password.toCharArray());
        SSLContext tls = SSLContext.getInstance("TLS");
        tls.init(keys.getKeyManagers(), null, new SecureRandom());
        try (SSLServerSocket server = (SSLServerSocket)tls.getServerSocketFactory()
                .createServerSocket(0, 2, InetAddress.getLoopbackAddress())) {
            server.setEnabledProtocols(new String[]{"TLSv1.2"});
            server.setSoTimeout(10000);
            AtomicReference<Throwable> serverFailure = new AtomicReference<>();
            Thread accept = new Thread(() -> {
                for (int attempt = 0; attempt < 2; attempt++) {
                    try (SSLSocket peer = (SSLSocket)server.accept()) {
                        peer.setSoTimeout(7000);
                        peer.setUseClientMode(false);
                        peer.startHandshake();
                        if (attempt == 0) answerFixture(peer, key, cert);
                    } catch (Exception error) {
                        if (attempt == 0) serverFailure.set(error);
                        // Second handshake is intentionally rejected by the
                        // sender's incorrect fingerprint.
                    }
                }
            }, "local-cast-controlled-fixture");
            accept.setDaemon(true);
            accept.start();
            String pin = hexSha256(cert.getEncoded());
            test(requireLocalIp("127.0.0.1"), server.getLocalPort(), pin);
            try {
                test(requireLocalIp("127.0.0.1"), server.getLocalPort(),
                        "0000000000000000000000000000000000000000000000000000000000000000");
                throw new IOException("Incorrect TLS certificate pin was unexpectedly accepted");
            } catch (SSLHandshakeException expected) {
                System.out.println("PASS: incorrect certificate fingerprint rejected at TLS handshake");
            }
            accept.join(10000);
            require(!accept.isAlive(), "TLS fixture server did not terminate");
            if (serverFailure.get() != null)
                throw new AssertionError("Fixture server failed", serverFailure.get());
            System.out.println("PASS: local controlled-sender loopback checks complete");
        }
    }

    private static void answerFixture(SSLSocket socket, PrivateKey privateKey,
                                      X509Certificate certificate) throws Exception {
        DataInputStream in = new DataInputStream(socket.getInputStream());
        DataOutputStream out = new DataOutputStream(socket.getOutputStream());
        Wire connected = read(in);
        require(CONNECTION.equals(connected.namespace) &&
                connected.utf8().contains("\"CONNECT\""), "Missing virtual connection");

        Wire apps = read(in);
        require(RECEIVER.equals(apps.namespace) &&
                apps.utf8().contains("\"GET_APP_AVAILABILITY\""), "Missing app query");
        write(out, new Wire("receiver-0", apps.source, RECEIVER, 0,
                ("{\"responseType\":\"GET_APP_AVAILABILITY\",\"requestId\":548," +
                 "\"availability\":{\""+APP_ID+"\":\"APP_UNAVAILABLE\"}}")
                        .getBytes(StandardCharsets.UTF_8)));

        Wire status = read(in);
        require(RECEIVER.equals(status.namespace) &&
                status.utf8().contains("\"GET_STATUS\""), "Missing status query");
        write(out, new Wire("receiver-0", status.source, RECEIVER, 0,
                "{\"responseType\":\"RECEIVER_STATUS\",\"requestId\":549,".concat(
                        "\"status\":{\"applications\":[]}}")
                        .getBytes(StandardCharsets.UTF_8)));

        Wire auth = read(in);
        require(AUTH.equals(auth.namespace) && auth.type == 1, "Missing auth challenge");
        byte[] nestedChallenge = findBytes(auth.body, 1);
        require(nestedChallenge != null, "Malformed auth challenge");
        byte[] nonce = findBytes(nestedChallenge, 2);
        require(nonce != null && nonce.length == 16, "Invalid test sender nonce");
        require(findInteger(nestedChallenge, 3, -1) == 1, "Unexpected test sender hash");
        byte[] certDer = certificate.getEncoded();
        Signature sign = Signature.getInstance("SHA256withRSA");
        sign.initSign(privateKey);
        sign.update(concat(nonce, certDer));
        byte[] response = concat(
                field(1, sign.sign()), field(2, certDer), integer(4, 1),
                field(5, nonce), integer(6, 1));
        write(out, new Wire("receiver-0", auth.source, AUTH, 1, field(2, response)));

        Wire ping = read(in);
        require(HEARTBEAT.equals(ping.namespace) &&
                ping.utf8().contains("\"PING\""), "Missing heartbeat");
        write(out, new Wire("receiver-0", ping.source, HEARTBEAT, 0,
                "{\"type\":\"PONG\"}".getBytes(StandardCharsets.UTF_8)));
        Wire close = read(in);
        require(CONNECTION.equals(close.namespace) &&
                close.utf8().contains("\"CLOSE\""), "Missing virtual CLOSE");
    }
}
