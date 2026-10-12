package com.zac.webportalcast;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import java.util.Arrays;

/**
 * Experimental, self-signed Cast device-auth response.
 *
 * Never contains Google-issued or vendor credentials. A strict Cast sender
 * should reject the chain. This is only an interoperability diagnostic to
 * distinguish a well-formed, locally signed response from AuthError.
 *
 * Fields follow cast_channel.proto's DeviceAuthMessage and AuthResponse.
 */
final class CastLocalAuthResponse {
    static final int MAX_CHALLENGE_BYTES = 1024;
    static final int MAX_NONCE_BYTES = 64;
    static final int SIGNATURE_RSA_PKCS1 = 1;
    static final int HASH_SHA1 = 0;
    static final int HASH_SHA256 = 1;

    static final class Challenge {
        final byte[] nonce;
        final int signatureAlgorithm;
        final int hashAlgorithm;
        final boolean noncePresent;

        Challenge(byte[] nonce, int signatureAlgorithm, int hashAlgorithm, boolean noncePresent) {
            this.nonce = nonce;
            this.signatureAlgorithm = signatureAlgorithm;
            this.hashAlgorithm = hashAlgorithm;
            this.noncePresent = noncePresent;
        }
    }

    private CastLocalAuthResponse() {}

    /** Parse DeviceAuthMessage.challenge (field 1) and its 3 optional fields. */
    static Challenge parseChallenge(byte[] deviceAuthMessage) throws IOException {
        if (deviceAuthMessage == null || deviceAuthMessage.length > MAX_CHALLENGE_BYTES)
            throw new IOException("Auth challenge size invalid");
        byte[] nested = null;
        int index = 0;
        while (index < deviceAuthMessage.length) {
            Value tag = varint(deviceAuthMessage, index);
            int field = (int)(tag.number >>> 3);
            int wire = (int)(tag.number & 7);
            if (field == 1 && wire == 2) {
                Value length = varint(deviceAuthMessage, tag.next);
                if (nested != null || length.number > MAX_CHALLENGE_BYTES ||
                        length.number > deviceAuthMessage.length - length.next)
                    throw new IOException("Malformed or repeated auth challenge");
                nested = Arrays.copyOfRange(deviceAuthMessage, length.next,
                        length.next + (int)length.number);
                index = length.next + (int)length.number;
            } else {
                index = skip(deviceAuthMessage, tag.next, wire);
            }
        }
        if (nested == null) throw new IOException("Missing device-auth challenge");
        int sig = SIGNATURE_RSA_PKCS1;
        int hash = HASH_SHA1; // Official protobuf default, not a guess.
        byte[] nonce = new byte[0];
        boolean hasNonce = false;
        int pos = 0;
        while (pos < nested.length) {
            Value tag = varint(nested, pos);
            int field = (int)(tag.number >>> 3);
            int wire = (int)(tag.number & 7);
            if ((field == 1 || field == 3) && wire == 0) {
                Value value = varint(nested, tag.next);
                if (value.number > 16) throw new IOException("Unknown auth algorithm");
                if (field == 1) sig = (int)value.number;
                else hash = (int)value.number;
                pos = value.next;
            } else if (field == 2 && wire == 2) {
                Value length = varint(nested, tag.next);
                if (hasNonce || length.number > MAX_NONCE_BYTES ||
                        length.number > nested.length - length.next)
                    throw new IOException("Invalid auth nonce");
                nonce = Arrays.copyOfRange(nested, length.next, length.next+(int)length.number);
                hasNonce = true;
                pos = length.next+(int)length.number;
            } else pos = skip(nested, tag.next, wire);
        }
        return new Challenge(nonce, sig, hash, hasNonce);
    }

    static boolean supported(Challenge challenge) {
        return challenge != null && challenge.signatureAlgorithm == SIGNATURE_RSA_PKCS1
                && (challenge.hashAlgorithm == HASH_SHA1 || challenge.hashAlgorithm == HASH_SHA256);
    }

    /**
     * Sign sender_nonce || TLS DER certificate (not an arbitrary payload).
     * This follows sender verification logic, but cannot confer Cast CA trust.
     */
    static byte[] encode(Challenge challenge, PrivateKey key,
                         PublicKey publicKey, byte[] tlsCertificateDer)
            throws GeneralSecurityException, IOException {
        if (!supported(challenge)) throw new IOException("Unsupported auth algorithm");
        if (key == null || publicKey == null || tlsCertificateDer == null ||
                tlsCertificateDer.length < 64 || tlsCertificateDer.length > 8192)
            throw new IOException("Missing local test identity");
        byte[] signedInput = new byte[challenge.nonce.length+tlsCertificateDer.length];
        System.arraycopy(challenge.nonce, 0, signedInput, 0, challenge.nonce.length);
        System.arraycopy(tlsCertificateDer, 0, signedInput, challenge.nonce.length,
                tlsCertificateDer.length);
        String signingAlgorithm = challenge.hashAlgorithm == HASH_SHA256
                ? "SHA256withRSA" : "SHA1withRSA";
        Signature signer = Signature.getInstance(signingAlgorithm);
        signer.initSign(key);
        signer.update(signedInput);
        byte[] signature = signer.sign();

        // An in-memory local verification proves the response's signature
        // matches our own certificate key, NOT that it is Google-trusted.
        Signature verifier = Signature.getInstance(signingAlgorithm);
        verifier.initVerify(publicKey);
        verifier.update(signedInput);
        if (!verifier.verify(signature))
            throw new GeneralSecurityException("Local auth signature could not be verified");

        ByteArrayOutputStream response = new ByteArrayOutputStream();
        bytes(response, 1, signature);
        bytes(response, 2, tlsCertificateDer);
        number(response, 4, SIGNATURE_RSA_PKCS1);
        if (challenge.noncePresent) bytes(response, 5, challenge.nonce);
        number(response, 6, challenge.hashAlgorithm);

        ByteArrayOutputStream message = new ByteArrayOutputStream();
        bytes(message, 2, response.toByteArray()); // DeviceAuthMessage.response
        return message.toByteArray();
    }

    static byte[] unsupportedAlgorithmError() {
        return new byte[]{0x1a, 0x02, 0x08, 0x02}; // error_type=2
    }

    private static void number(ByteArrayOutputStream out, int field, int n) {
        putVarint(out, field << 3);
        putVarint(out, n);
    }

    private static void bytes(ByteArrayOutputStream out, int field, byte[] data) {
        putVarint(out, (field << 3) | 2);
        putVarint(out, data.length);
        out.write(data, 0, data.length);
    }

    private static void putVarint(ByteArrayOutputStream out, long n) {
        while ((n & ~127L) != 0L) {
            out.write(((int)n & 127) | 128);
            n >>>= 7;
        }
        out.write((int)n);
    }

    private static Value varint(byte[] data, int position) throws IOException {
        long value = 0;
        for (int i=0;i<10;i++) {
            if (position >= data.length) throw new IOException("Truncated auth protobuf");
            int byteValue = data[position++] & 255;
            if (i==9 && (byteValue & 254)!=0)
                throw new IOException("Protobuf varint overflow");
            value |= (long)(byteValue & 127) << (i*7);
            if ((byteValue & 128)==0) return new Value(value, position);
        }
        throw new IOException("Protobuf varint too long");
    }

    private static int skip(byte[] data, int pos, int wire) throws IOException {
        if (wire == 0) return varint(data,pos).next;
        if (wire == 1 || wire == 5) {
            int end = pos + (wire == 1 ? 8 : 4);
            if (end > data.length) throw new IOException("Truncated auth protobuf field");
            return end;
        }
        if (wire == 2) {
            Value len = varint(data,pos);
            if (len.number > data.length - len.next)
                throw new IOException("Truncated auth protobuf length");
            return len.next + (int)len.number;
        }
        throw new IOException("Invalid auth protobuf wire type");
    }

    private static final class Value {
        final long number;
        final int next;
        Value(long number, int next) {this.number=number;this.next=next;}
    }
}
