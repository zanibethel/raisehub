package com.zac.webportalcast;

import org.junit.Test;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.junit.Assert.*;

public final class CastV2EnvelopeTest {
    @Test public void parsesSenderHeartbeatAndEncodesReceiverPong() throws Exception {
        CastV2Envelope request = new CastV2Envelope(
                "sender-0", "receiver-0", CastV2ControlSession.HEARTBEAT,
                CastV2Envelope.STRING, "{\"type\":\"PING\"}".getBytes(StandardCharsets.UTF_8));
        CastV2Envelope decoded = roundTrip(request);
        assertEquals("sender-0", decoded.source);
        assertEquals("receiver-0", decoded.destination);
        assertEquals(CastV2ControlSession.HEARTBEAT, decoded.namespace);
        assertEquals("{\"type\":\"PING\"}", decoded.utf8());

        CastV2Envelope reply = roundTrip(new CastV2Envelope(
                "receiver-0", "sender-0", CastV2ControlSession.HEARTBEAT,
                CastV2Envelope.STRING, "{\"type\":\"PONG\"}".getBytes(StandardCharsets.UTF_8)));
        assertEquals("receiver-0", reply.source);
        assertEquals("sender-0", reply.destination);
    }

    @Test public void encodesExplicitDeviceAuthErrorWithoutForgedCertificate() throws Exception {
        byte[] unsupportedIdentity = {0x1a, 0x02, 0x08, 0x00};
        CastV2Envelope e = roundTrip(new CastV2Envelope("receiver-0", "sender-0",
                CastV2ControlSession.AUTH, CastV2Envelope.BINARY, unsupportedIdentity));
        assertArrayEquals(unsupportedIdentity, e.payload);
        assertEquals(CastV2Envelope.BINARY, e.payloadType);
    }

    @Test public void rejectsOversizeAndTruncatedFrames() throws Exception {
        try {
            CastV2Envelope.decode(new byte[CastV2Envelope.MAX_FRAME + 1]);
            fail("Oversized input accepted");
        } catch (IOException expected) {}
        try {
            CastV2Envelope.read(new DataInputStream(new ByteArrayInputStream(new byte[]{
                    0,0,0,12,8,0
            })));
            fail("Truncated frame accepted");
        } catch (IOException expected) {}
    }

    @Test public void rejectsMissingRequiredProtobufFields() throws Exception {
        try {
            CastV2Envelope.decode(new byte[]{8,0});
            fail("Incomplete envelope accepted");
        } catch (IOException expected) {}
    }

    @Test public void refusesOversizeTextBeforeJsonParsing() throws Exception {
        try {
            roundTrip(new CastV2Envelope("sender-0", "receiver-0",
                    CastV2ControlSession.HEARTBEAT, CastV2Envelope.STRING,
                    new byte[CastV2Envelope.MAX_TEXT + 1]));
            fail("Oversize JSON accepted");
        } catch (IOException expected) {}
    }

    private static CastV2Envelope roundTrip(CastV2Envelope envelope) throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        CastV2Envelope.write(new DataOutputStream(bytes), envelope);
        return CastV2Envelope.read(new DataInputStream(new ByteArrayInputStream(bytes.toByteArray())));
    }
}
