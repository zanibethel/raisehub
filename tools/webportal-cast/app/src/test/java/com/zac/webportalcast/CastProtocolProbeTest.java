package com.zac.webportalcast;

import org.junit.Test;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import static org.junit.Assert.*;

public final class CastProtocolProbeTest {
    private static void writeVarint(ByteArrayOutputStream out, long value) {
        while ((value & ~127L) != 0) {
            out.write((int) (value & 127) | 128);
            value >>>= 7;
        }
        out.write((int) value);
    }

    private static void field(ByteArrayOutputStream out, int number, String content) {
        byte[] bytes = content.getBytes(StandardCharsets.US_ASCII);
        writeVarint(out, (number << 3) | 2);
        writeVarint(out, bytes.length);
        out.write(bytes, 0, bytes.length);
    }

    @Test public void extractsDeviceAuthNamespaceWithoutReadingPayload() {
        ByteArrayOutputStream message = new ByteArrayOutputStream();
        writeVarint(message, 8); writeVarint(message, 0);
        field(message, 2, "sender-0");
        field(message, 3, "receiver-0");
        field(message, 4, "urn:x-cast:com.google.cast.tp.deviceauth");
        field(message, 6, "some-private-message-body");
        assertEquals("urn:x-cast:com.google.cast.tp.deviceauth",
                CastProtocolProbe.parseNamespace(message.toByteArray()));
    }

    @Test public void rejectsNonCastNamespace() {
        ByteArrayOutputStream message = new ByteArrayOutputStream();
        field(message, 4, "ftp://not-a-cast-namespace");
        assertNull(CastProtocolProbe.parseNamespace(message.toByteArray()));
    }

    @Test public void rejectsTruncatedLength() {
        assertNull(CastProtocolProbe.parseNamespace(new byte[] {34, 40, 'u', 'r', 'n'}));
    }

    @Test public void acceptsRecognizedCastNamespacesOnly() {
        ByteArrayOutputStream message = new ByteArrayOutputStream();
        field(message, 4, "urn:x-cast:com.google.cast.tp.heartbeat");
        assertEquals("urn:x-cast:com.google.cast.tp.heartbeat",
                CastProtocolProbe.parseNamespace(message.toByteArray()));
    }

    @Test public void rejectsMalformedVarint() {
        assertNull(CastProtocolProbe.parseNamespace(new byte[] {
                (byte) 0xFF, (byte) 0xFF, (byte) 0xFF
        }));
    }
}
