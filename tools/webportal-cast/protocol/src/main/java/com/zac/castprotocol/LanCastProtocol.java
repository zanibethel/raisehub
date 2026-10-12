package com.zac.castprotocol;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.net.Socket;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Locale;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * Private, app-specific video transport; NOT Google Cast.
 *
 * One authenticated Quest sender -> Fire TV receiver, encrypted AES-128-GCM
 * frames with a unique server nonce and monotonically increasing counter.
 * Pairing secret is only displayed on the Fire TV and never transmitted.
 * v1 transports H.264 video samples only (no audio/other metadata).
 */
public final class LanCastProtocol {
    private static final byte[] MAGIC = "WPCQ2".getBytes(StandardCharsets.US_ASCII);
    public static final int PORT = 8765;
    public static final int WIDTH = 1280;
    public static final int HEIGHT = 720;
    public static final int FPS = 30;
    public static final int MAX_VIDEO_SAMPLE = 512 * 1024;
    private static final int MAX_ENCRYPTED = MAX_VIDEO_SAMPLE + 64;
    private static final int ITERATIONS = 40000;
    public static final int TYPE_CONFIG = 1;
    public static final int TYPE_VIDEO = 2;
    public static final int TYPE_END = 3;

    private LanCastProtocol() {}

    public static String newPairingCode(SecureRandom random) {
        byte[] secret = new byte[6];
        random.nextBytes(secret);
        StringBuilder out = new StringBuilder(12);
        for (byte b : secret) {
            out.append(Character.toUpperCase(Character.forDigit((b >> 4) & 15, 16)));
            out.append(Character.toUpperCase(Character.forDigit(b & 15, 16)));
        }
        return out.toString();
    }

    public static String cleanCode(String code) {
        return code == null ? "" : code.replace("-", "").replace(" ", "")
                .toUpperCase(Locale.US);
    }

    public static boolean validCode(String code) {
        return cleanCode(code).matches("[0-9A-F]{12}");
    }

    private static byte[] deriveKey(String code, byte[] nonce) throws GeneralSecurityException {
        PBEKeySpec spec = new PBEKeySpec(cleanCode(code).toCharArray(), nonce, ITERATIONS, 256);
        try {
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA1")
                    .generateSecret(spec).getEncoded();
        } finally {
            spec.clearPassword();
        }
    }

    private static byte[] proof(byte[] material, byte[] nonce)
            throws GeneralSecurityException {
        Mac hmac = Mac.getInstance("HmacSHA256");
        hmac.init(new SecretKeySpec(Arrays.copyOfRange(material, 16, 32), "HmacSHA256"));
        hmac.update(MAGIC);
        return hmac.doFinal(nonce);
    }

    public static Session serverAuthenticate(Socket socket, String code)
            throws IOException, GeneralSecurityException {
        if (!validCode(code)) throw new IOException("Invalid local pairing setup");
        DataInputStream in = new DataInputStream(socket.getInputStream());
        DataOutputStream out = new DataOutputStream(socket.getOutputStream());
        byte[] receivedMagic = new byte[MAGIC.length];
        in.readFully(receivedMagic);
        if (!MessageDigest.isEqual(receivedMagic, MAGIC))
            throw new IOException("Unsupported sender version");

        byte[] nonce = new byte[16];
        new SecureRandom().nextBytes(nonce);
        out.write(nonce);
        out.flush();
        byte[] receivedProof = new byte[32];
        in.readFully(receivedProof);
        byte[] key = deriveKey(code, nonce);
        if (!MessageDigest.isEqual(receivedProof, proof(key, nonce))) {
            out.writeByte(0);
            out.flush();
            throw new IOException("Pairing code rejected");
        }
        out.writeByte(1);
        out.flush();
        return new Session(in, out, Arrays.copyOfRange(key, 0, 16),
                Arrays.copyOf(nonce, 4));
    }

    public static Session clientAuthenticate(Socket socket, String code)
            throws IOException, GeneralSecurityException {
        if (!validCode(code)) throw new IOException("Pairing code must have 12 hex characters");
        DataInputStream in = new DataInputStream(socket.getInputStream());
        DataOutputStream out = new DataOutputStream(socket.getOutputStream());
        out.write(MAGIC);
        out.flush();
        byte[] nonce = new byte[16];
        in.readFully(nonce);
        byte[] material = deriveKey(code, nonce);
        out.write(proof(material, nonce));
        out.flush();
        if (in.readUnsignedByte() != 1)
            throw new IOException("Incorrect pairing code or expired TV session");
        return new Session(in, out, Arrays.copyOfRange(material, 0, 16),
                Arrays.copyOf(nonce, 4));
    }

    public static final class Frame {
        public final int type;
        public final long ptsUs;
        public final byte[] bytes;
        Frame(int type, long ptsUs, byte[] bytes) {
            this.type = type;
            this.ptsUs = ptsUs;
            this.bytes = bytes;
        }
    }

    public static final class Session {
        private final DataInputStream in;
        private final DataOutputStream out;
        private final SecretKeySpec encryptionKey;
        private final byte[] ivPrefix;
        private long frameNumber;

        Session(DataInputStream in, DataOutputStream out, byte[] key, byte[] ivPrefix) {
            this.in = in;
            this.out = out;
            this.encryptionKey = new SecretKeySpec(key, "AES");
            this.ivPrefix = ivPrefix;
        }

        private byte[] nextIv() throws IOException {
            if (frameNumber == Long.MAX_VALUE)
                throw new IOException("Stream counter exhausted");
            ByteBuffer iv = ByteBuffer.allocate(12);
            iv.put(ivPrefix);
            iv.putLong(frameNumber++);
            return iv.array();
        }

        public synchronized void writeFrame(int type, long ptsUs, byte[] bytes)
                throws IOException, GeneralSecurityException {
            if ((type != TYPE_VIDEO && type != TYPE_CONFIG && type != TYPE_END)
                    || bytes == null || bytes.length > MAX_VIDEO_SAMPLE)
                throw new IOException("Invalid video frame");
            ByteBuffer plain = ByteBuffer.allocate(bytes.length + 9);
            plain.put((byte) type).putLong(ptsUs).put(bytes);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, encryptionKey, new GCMParameterSpec(128, nextIv()));
            byte[] encrypted = cipher.doFinal(plain.array());
            out.writeInt(encrypted.length);
            out.write(encrypted);
            out.flush();
        }

        public Frame readFrame() throws IOException, GeneralSecurityException {
            int size;
            try {
                size = in.readInt();
            } catch (EOFException eof) {
                return null;
            }
            if (size < 25 || size > MAX_ENCRYPTED)
                throw new IOException("Video frame too large or invalid");
            byte[] cipherText = new byte[size];
            in.readFully(cipherText);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, encryptionKey, new GCMParameterSpec(128, nextIv()));
            byte[] plain = cipher.doFinal(cipherText);
            if (plain.length < 9) throw new IOException("Short video frame");
            ByteBuffer raw = ByteBuffer.wrap(plain);
            int type = raw.get() & 255;
            if (type != TYPE_VIDEO && type != TYPE_CONFIG && type != TYPE_END)
                throw new IOException("Unknown video frame type");
            long pts = raw.getLong();
            byte[] payload = new byte[raw.remaining()];
            raw.get(payload);
            return new Frame(type, pts, payload);
        }
    }
}
