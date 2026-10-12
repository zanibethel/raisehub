package com.zac.webportalcast;

import org.junit.Test;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import static org.junit.Assert.*;

public final class CastLocalAuthResponseTest {
    private static byte[] tlsCertificateBytes() {
        byte[] der = new byte[512];
        for (int i=0; i<der.length; i++) der[i] = (byte)(i*13 + 7);
        return der;
    }

    @Test public void acceptsEmptyLegacyChallengeWithSha1Default() throws Exception {
        CastLocalAuthResponse.Challenge parsed = CastLocalAuthResponse.parseChallenge(
                new byte[]{0x0a, 0x00});
        assertEquals(1, parsed.signatureAlgorithm);
        assertEquals(0, parsed.hashAlgorithm);
        assertFalse(parsed.noncePresent);
        assertEquals(0, parsed.nonce.length);
    }

    @Test public void signsSha256NonceAndTlsCertificateWithOwnKey() throws Exception {
        byte[] nonce = "test-nonce-16byt".getBytes(StandardCharsets.US_ASCII);
        ByteArrayOutputStream challenge = new ByteArrayOutputStream();
        challenge.write(0x08); challenge.write(1); // RSASSA_PKCS1v15
        challenge.write(0x12); challenge.write(nonce.length); challenge.write(nonce);
        challenge.write(0x18); challenge.write(1); // SHA256
        byte[] nested = challenge.toByteArray();
        ByteArrayOutputStream payload = new ByteArrayOutputStream();
        payload.write(10); payload.write(nested.length); payload.write(nested);
        CastLocalAuthResponse.Challenge request = CastLocalAuthResponse.parseChallenge(
                payload.toByteArray());
        assertEquals(1, request.hashAlgorithm);
        assertArrayEquals(nonce, request.nonce);
        assertTrue(request.noncePresent);

        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        KeyPair pair = generator.generateKeyPair();
        byte[] tlsCert = tlsCertificateBytes();
        byte[] serialized = CastLocalAuthResponse.encode(
                request, pair.getPrivate(), pair.getPublic(), tlsCert);

        // DeviceAuthMessage.response(field2) -> AuthResponse.signature(field1)
        // and .client_auth_certificate(field2). Require nonce echoed (field5)
        // and hash-algorithm SHA256 (field6).
        assertEquals(0x12, serialized[0] & 255);
        int[] index = {1};
        int responseSize = readVarint(serialized, index);
        assertEquals(responseSize, serialized.length - index[0]);
        byte[] response = Arrays.copyOfRange(serialized, index[0], serialized.length);
        index[0] = 0;
        assertEquals(0x0a, response[index[0]++] & 255);
        int sigLen = readVarint(response, index);
        byte[] signature = Arrays.copyOfRange(response, index[0], index[0]+sigLen);
        index[0] += sigLen;
        assertEquals(0x12, response[index[0]++] & 255);
        int certLen = readVarint(response, index);
        assertArrayEquals(tlsCert, Arrays.copyOfRange(response,index[0],index[0]+certLen));
        index[0] += certLen;
        assertEquals(0x20, response[index[0]++] & 255);
        assertEquals(1, readVarint(response,index));
        assertEquals(0x2a, response[index[0]++] & 255);
        assertEquals(nonce.length, readVarint(response,index));
        assertArrayEquals(nonce, Arrays.copyOfRange(response,index[0],index[0]+nonce.length));
        index[0] += nonce.length;
        assertEquals(0x30, response[index[0]++] & 255);
        assertEquals(1, readVarint(response,index));
        assertEquals(response.length,index[0]);

        byte[] signedInput = new byte[nonce.length+tlsCert.length];
        System.arraycopy(nonce,0,signedInput,0,nonce.length);
        System.arraycopy(tlsCert,0,signedInput,nonce.length,tlsCert.length);
        Signature verify = Signature.getInstance("SHA256withRSA");
        verify.initVerify(pair.getPublic());
        verify.update(signedInput);
        assertTrue(verify.verify(signature));
    }

    @Test public void validatesSha1LegacyResponseAndUnsupportedAlgorithm() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        KeyPair pair = generator.generateKeyPair();
        CastLocalAuthResponse.Challenge legacy =
                CastLocalAuthResponse.parseChallenge(new byte[]{10,0});
        byte[] response = CastLocalAuthResponse.encode(legacy,
                pair.getPrivate(),pair.getPublic(),tlsCertificateBytes());
        assertTrue(response.length>256);

        CastLocalAuthResponse.Challenge pss =
                CastLocalAuthResponse.parseChallenge(new byte[]{10,2,8,2});
        assertFalse(CastLocalAuthResponse.supported(pss));
        assertArrayEquals(new byte[]{0x1a,0x02,0x08,0x02},
                CastLocalAuthResponse.unsupportedAlgorithmError());
    }

    @Test public void rejectsMalformedOrOversizeNonce() throws Exception {
        try {
            CastLocalAuthResponse.parseChallenge(new byte[]{10,3,18,2,1});
            fail("truncated nonce accepted");
        } catch(IOException expected) {}
        byte[] tooLong = new byte[67];
        tooLong[0]=10;
        tooLong[1]=65;
        tooLong[2]=18;
        tooLong[3]=63;
        // Metadata length mismatch is also a rejection.
        try {
            CastLocalAuthResponse.parseChallenge(tooLong);
            fail("oversized / malformed auth challenge accepted");
        } catch(IOException expected) {}
    }

    private static int readVarint(byte[] data, int[] position) throws IOException {
        int shift=0, value=0;
        while (shift<=28 && position[0]<data.length) {
            int b=data[position[0]++] & 255;
            value|=(b&127)<<shift;
            if ((b&128)==0) return value;
            shift+=7;
        }
        throw new IOException("Bad varint");
    }
}
