package com.zac.webportalcast;

import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.security.Signature;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.Arrays;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

/**
 * A real in-process client of the Fire TV Cast control listener. Unlike the
 * CI-only fixture, this exercises the Android TLS server, AndroidKeyStore
 * device-auth signing, Cast V2 replies and heartbeat over a real TLS socket.
 *
 * The trust policy pins ONLY this app's exact test certificate. That is not
 * Google/Meta Cast certification and cannot establish stock Quest acceptance.
 * Uses loopback only: never connects to nearby devices or the Internet.
 */
final class CastOnDeviceSelfTest {
    interface Events { void record(String kind, String description); }
    private static final String AUTH = "urn:x-cast:com.google.cast.tp.deviceauth";
    private static final String HEARTBEAT = "urn:x-cast:com.google.cast.tp.heartbeat";
    private static final String CONNECTION = "urn:x-cast:com.google.cast.tp.connection";
    private static final String RECEIVER = "urn:x-cast:com.google.cast.receiver";

    private CastOnDeviceSelfTest() {}

    static void run(int port, X509Certificate expected, Events events) {
        String stage = "init";
        events.record("V2_SELFTEST_START", "Testing local Cast V2 control over pinned TLS loopback");
        try {
            if (expected == null) throw new IOException("Missing local test certificate");
            final byte[] exactCertificate = expected.getEncoded();
            if (exactCertificate.length < 64) throw new IOException("Invalid local certificate");
            final boolean[] pinned = { false };
            X509TrustManager trust = new X509TrustManager() {
                @Override public void checkClientTrusted(X509Certificate[] chain, String auth)
                        throws CertificateException {
                    throw new CertificateException("Client identities not accepted");
                }
                @Override public void checkServerTrusted(X509Certificate[] chain, String auth)
                        throws CertificateException {
                    if (chain == null || chain.length == 0 || chain[0] == null)
                        throw new CertificateException("TLS peer missing identity");
                    try {
                        if (!MessageDigest.isEqual(chain[0].getEncoded(), exactCertificate))
                            throw new CertificateException("Pinned TLS identity mismatched");
                        chain[0].checkValidity();
                        pinned[0] = true;
                    } catch (java.security.GeneralSecurityException e) {
                        throw new CertificateException("Pinned TLS identity invalid", e);
                    }
                }
                @Override public X509Certificate[] getAcceptedIssuers() {
                    return new X509Certificate[0];
                }
            };
            SSLContext tls = SSLContext.getInstance("TLS");
            tls.init(null, new TrustManager[]{trust}, new SecureRandom());
            stage = "TLS_PIN";
            try (SSLSocket client = (SSLSocket) tls.getSocketFactory()
                    .createSocket(InetAddress.getLoopbackAddress(), port)) {
                client.setUseClientMode(true);
                client.setSoTimeout(7000);
                client.startHandshake();
                require(pinned[0], "Certificate pin not verified");
                DataInputStream in = new DataInputStream(client.getInputStream());
                DataOutputStream out = new DataOutputStream(client.getOutputStream());

                stage = "CONNECT";
                sendJson(out, CONNECTION, "{\"type\":\"CONNECT\",\"connType\":0}");

                stage = "APP_AVAILABILITY";
                sendJson(out, RECEIVER, "{\"type\":\"GET_APP_AVAILABILITY\"," +
                        "\"requestId\":548,\"appId\":[\"CC1AD845\"]}");
                JSONObject available = readJson(in, RECEIVER);
                require("GET_APP_AVAILABILITY".equals(
                                available.optString("responseType")) &&
                                available.optLong("requestId") == 548L &&
                                "APP_UNAVAILABLE".equals(
                                        available.getJSONObject("availability")
                                                .optString("CC1AD845")),
                        "App availability mismatch");

                stage = "RECEIVER_STATUS";
                sendJson(out, RECEIVER, "{\"type\":\"GET_STATUS\",\"requestId\":549}");
                JSONObject status = readJson(in, RECEIVER);
                require("RECEIVER_STATUS".equals(status.optString("responseType")) &&
                                status.optLong("requestId") == 549L &&
                                status.getJSONObject("status").getJSONArray("applications")
                                        .length() == 0,
                        "Receiver status mismatch");

                stage = "AUTH_SIGNATURE";
                byte[] nonce = new byte[16];
                new SecureRandom().nextBytes(nonce);
                byte[] challenge = field(1, concat(
                        number(1, 1), field(2, nonce), number(3, 1)));
                CastV2Envelope.write(out, new CastV2Envelope(
                        "sender-0", "receiver-0", AUTH, CastV2Envelope.BINARY, challenge));
                CastV2Envelope auth = CastV2Envelope.read(in);
                require(AUTH.equals(auth.namespace) &&
                        auth.payloadType == CastV2Envelope.BINARY, "Expected binary deviceauth");
                byte[] response = findBytes(auth.payload, 2);
                require(response != null, "Expected a signed device-auth response");
                byte[] signature = findBytes(response, 1);
                byte[] responseCert = findBytes(response, 2);
                byte[] echoedNonce = findBytes(response, 5);
                require(signature != null && signature.length >= 128 &&
                                responseCert != null && echoedNonce != null &&
                                MessageDigest.isEqual(exactCertificate, responseCert) &&
                                MessageDigest.isEqual(nonce, echoedNonce) &&
                                findNumber(response, 4, -1) == 1 &&
                                findNumber(response, 6, -1) == 1,
                        "Auth payload identity, nonce or algorithms did not match");
                Signature verify = Signature.getInstance("SHA256withRSA");
                verify.initVerify(expected.getPublicKey());
                verify.update(concat(nonce, exactCertificate));
                require(verify.verify(signature), "RSA/SHA256 auth signature did not verify");

                stage = "HEARTBEAT";
                sendJson(out, HEARTBEAT, "{\"type\":\"PING\"}");
                require("PONG".equals(readJson(in, HEARTBEAT).optString("type")),
                        "Cast heartbeat PONG missing");

                stage = "CLOSE";
                sendJson(out, CONNECTION, "{\"type\":\"CLOSE\"}");
            }
            events.record("V2_SELFTEST_OK",
                    "PASS: pinned real TV TLS, app availability, receiver status, " +
                    "local signed nonce/certificate auth, PING/PONG; NOT Google certified");
        } catch (Exception failure) {
            events.record("V2_SELFTEST_FAIL", "FAIL at " + stage + " (" +
                    failure.getClass().getSimpleName() + "); no Google Cast trust inferred");
        }
    }

    private static void sendJson(DataOutputStream out, String namespace, String json)
            throws IOException {
        CastV2Envelope.write(out, new CastV2Envelope("sender-0", "receiver-0",
                namespace, CastV2Envelope.STRING, json.getBytes(StandardCharsets.UTF_8)));
    }

    private static JSONObject readJson(DataInputStream in, String namespace) throws Exception {
        CastV2Envelope message = CastV2Envelope.read(in);
        require(message.payloadType == CastV2Envelope.STRING &&
                namespace.equals(message.namespace) &&
                "receiver-0".equals(message.source) &&
                "sender-0".equals(message.destination), "Unexpected Cast response envelope");
        return new JSONObject(message.utf8());
    }

    private static void require(boolean value, String error) throws IOException {
        if (!value) throw new IOException(error);
    }

    private static byte[] concat(byte[]... parts) {
        int size = 0;
        for (byte[] part : parts) size += part.length;
        byte[] result = new byte[size];
        int offset = 0;
        for (byte[] part : parts) {
            System.arraycopy(part, 0, result, offset, part.length);
            offset += part.length;
        }
        return result;
    }

    private static byte[] field(int number, byte[] bytes) {
        return concat(varint((number << 3) | 2), varint(bytes.length), bytes);
    }

    private static byte[] number(int field, int value) {
        return concat(varint(field << 3), varint(value));
    }

    private static byte[] varint(long n) {
        ByteArrayOutputStream result = new ByteArrayOutputStream();
        while ((n & ~127L) != 0L) {
            result.write(((int)n & 127) | 128);
            n >>>= 7;
        }
        result.write((int)n);
        return result.toByteArray();
    }

    private static long[] readVarint(byte[] source, int from) throws IOException {
        long number = 0;
        for (int i = 0; i < 10; i++) {
            if (from >= source.length) throw new IOException("Truncated protobuf varint");
            int b = source[from++] & 255;
            if (i == 9 && (b & 254) != 0) throw new IOException("Bad protobuf varint");
            number |= (long)(b & 127) << (i * 7);
            if ((b & 128) == 0) return new long[]{number, from};
        }
        throw new IOException("Oversized protobuf varint");
    }

    private static byte[] findBytes(byte[] source, int target) throws IOException {
        int index = 0;
        while (index < source.length) {
            long[] tag = readVarint(source, index);
            int field = (int)(tag[0] >>> 3), wire = (int)(tag[0] & 7);
            index = (int)tag[1];
            if (wire == 2) {
                long[] size = readVarint(source, index);
                index = (int)size[1];
                if (size[0] > source.length - index)
                    throw new IOException("Invalid protobuf length");
                int end = index + (int)size[0];
                if (field == target) return Arrays.copyOfRange(source, index, end);
                index = end;
            } else if (wire == 0) {
                index = (int)readVarint(source, index)[1];
            } else if (wire == 5 || wire == 1) {
                index += wire == 5 ? 4 : 8;
                if (index > source.length) throw new IOException("Truncated protobuf field");
            } else throw new IOException("Unexpected protobuf wire type");
        }
        return null;
    }

    private static long findNumber(byte[] source, int target, long defaultValue)
            throws IOException {
        int index = 0;
        while (index < source.length) {
            long[] tag = readVarint(source, index);
            int field = (int)(tag[0] >>> 3), wire = (int)(tag[0] & 7);
            index = (int)tag[1];
            if (wire == 0) {
                long[] value = readVarint(source, index);
                if (field == target) return value[0];
                index = (int)value[1];
            } else if (wire == 2) {
                long[] size = readVarint(source, index);
                index = (int)size[1];
                if (size[0] > source.length - index)
                    throw new IOException("Invalid protobuf length");
                index += (int)size[0];
            } else if (wire == 5 || wire == 1) {
                index += wire == 5 ? 4 : 8;
                if (index > source.length) throw new IOException("Truncated protobuf field");
            } else throw new IOException("Unexpected protobuf wire type");
        }
        return defaultValue;
    }
}
