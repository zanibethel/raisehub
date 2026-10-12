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


    @Test public void protobufPayloadMayPrecedeItsType() throws Exception {
        // The protobuf format is field-order independent. Earlier receiver
        // code rejected a valid frame when payload_utf8 was before field 5.
        byte[] ordinary = serialized(new CastV2Envelope("sender-0", "receiver-0",
                CastV2ControlSession.HEARTBEAT, CastV2Envelope.STRING,
                "{\"type\":\"PING\"}".getBytes(StandardCharsets.UTF_8)));
        // Standard encoding starts with version(1), route(2,3,4),
        // type(5), and payload(6). Swap the final two fields.
        int offset = 0;
        for (int field = 1; field <= 4; field++) {
            int[] index = {offset};
            int tag = readVarint(ordinary, index);
            assertEquals(field, tag >>> 3);
            if (field == 1) {
                readVarint(ordinary, index);
            } else {
                int length = readVarint(ordinary, index);
                index[0] += length;
            }
            offset = index[0];
        }
        assertEquals(40, ordinary[offset] & 255); // field 5, varint wire
        assertEquals(0, ordinary[offset + 1] & 255); // STRING
        byte[] swapped = new byte[ordinary.length];
        System.arraycopy(ordinary, 0, swapped, 0, offset);
        System.arraycopy(ordinary, offset + 2, swapped, offset,
                ordinary.length - offset - 2);
        swapped[swapped.length - 2] = ordinary[offset];
        swapped[swapped.length - 1] = ordinary[offset + 1];
        CastV2Envelope result = CastV2Envelope.decode(swapped);
        assertEquals(CastV2ControlSession.HEARTBEAT, result.namespace);
        assertEquals("{\"type\":\"PING\"}", result.utf8());
    }

    @Test public void parsesUnchunkedNewerProtocolVersions() throws Exception {
        byte[] old = serialized(new CastV2Envelope("sender-0", "receiver-0",
                CastV2ControlSession.HEARTBEAT, CastV2Envelope.STRING,
                "{\"type\":\"PING\"}".getBytes(StandardCharsets.UTF_8)));
        assertEquals(8, old[0] & 255);
        for (int version = 0; version <= 3; version++) {
            byte[] frame = old.clone();
            frame[1] = (byte) version;
            assertEquals("sender-0", CastV2Envelope.decode(frame).source);
        }
        byte[] unknown = old.clone();
        unknown[1] = 7;
        expectRejected(unknown);

        // Mark a protobuf continued chunk: no reassembly support exists.
        java.io.ByteArrayOutputStream continued = new java.io.ByteArrayOutputStream();
        continued.write(old);
        continued.write(new byte[] {64, 1}); // field 8: continued=true
        expectRejected(continued.toByteArray());
        java.io.ByteArrayOutputStream remaining = new java.io.ByteArrayOutputStream();
        remaining.write(old);
        remaining.write(new byte[] {72, 4}); // field 9: remaining_length=4
        expectRejected(remaining.toByteArray());
    }

    @Test public void idleReceiverStatusUsesDocumentedResponseType() throws Exception {
        assertEquals(
                "{\"type\":\"RECEIVER_STATUS\",\"responseType\":\"RECEIVER_STATUS\",\"requestId\":549," +
                "\"status\":{\"applications\":[],\"isActiveInput\":true," +
                "\"standby\":false,\"volume\":{\"level\":0.5,\"muted\":false}}}",
                CastV2ControlSession.idleStatusJson(549L));
        assertTrue(CastV2ControlSession.idleStatusJson(-1L)
                .contains("\"requestId\":0"));
    }

    @Test public void availabilityRepliesFollowOpenScreenSchema() throws Exception {
        String response = CastV2ControlSession.unavailableAppsJson(
                548L, new String[] {"1A2B3C4D", "CC1AD845"});
        assertEquals(
                "{\"responseType\":\"GET_APP_AVAILABILITY\",\"requestId\":548,\"availability\":{" +
                "\"1A2B3C4D\":\"APP_UNAVAILABLE\",\"CC1AD845\":\"APP_UNAVAILABLE\"}}",
                response);
        assertEquals("{\"responseType\":\"GET_APP_AVAILABILITY\",\"requestId\":0,\"availability\":{}}",
                CastV2ControlSession.unavailableAppsJson(-4, new String[0]));
        try {
            CastV2ControlSession.unavailableAppsJson(1, new String[] {"evil\" : true"});
            fail("invalid JSON ID accepted");
        } catch (IOException expected) {}
        try {
            CastV2ControlSession.unavailableAppsJson(1, new String[17]);
            fail("oversized request accepted");
        } catch (IOException expected) {}
    }

    private static void expectRejected(byte[] frame) throws Exception {
        try {
            CastV2Envelope.decode(frame);
            fail("Invalid or incomplete frame accepted");
        } catch (IOException expected) {}
    }

    private static int readVarint(byte[] bytes, int[] index) throws IOException {
        int shift = 0;
        int value = 0;
        while (shift <= 28 && index[0] < bytes.length) {
            int b = bytes[index[0]++] & 255;
            value |= (b & 127) << shift;
            if ((b & 128) == 0) return value;
            shift += 7;
        }
        throw new IOException("bad varint");
    }

    private static byte[] serialized(CastV2Envelope frame) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        CastV2Envelope.write(new DataOutputStream(bytes), frame);
        byte[] withLength = bytes.toByteArray();
        return java.util.Arrays.copyOfRange(withLength, 4, withLength.length);
    }

    private static CastV2Envelope roundTrip(CastV2Envelope envelope) throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        CastV2Envelope.write(new DataOutputStream(bytes), envelope);
        return CastV2Envelope.read(new DataInputStream(new ByteArrayInputStream(bytes.toByteArray())));
    }
}
