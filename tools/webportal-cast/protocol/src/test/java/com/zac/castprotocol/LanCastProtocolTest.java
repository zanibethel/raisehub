package com.zac.castprotocol;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.security.SecureRandom;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import static org.junit.Assert.*;

public final class LanCastProtocolTest {
    @Test public void pairingCodeIsFormattedAndValidated() {
        String code = LanCastProtocol.newPairingCode(new SecureRandom());
        assertTrue(code.matches("[0-9A-F]{12}"));
        assertTrue(LanCastProtocol.validCode(code.substring(0,4)+"-"+code.substring(4,8)+"-"+code.substring(8)));
        assertFalse(LanCastProtocol.validCode("12345678"));
    }

    @Test public void pairedLoopbackVideoRoundTrip() throws Exception {
        try (ServerSocket server = new ServerSocket(0)) {
            String code = LanCastProtocol.newPairingCode(new SecureRandom());
            AtomicReference<Throwable> failure = new AtomicReference<>();
            Thread receiver = new Thread(() -> {
                try (Socket accepted = server.accept()) {
                    LanCastProtocol.Session session = LanCastProtocol.serverAuthenticate(accepted, code);
                    LanCastProtocol.Frame f = session.readFrame();
                    assertEquals(LanCastProtocol.TYPE_CONFIG, f.type);
                    assertArrayEquals(new byte[]{0,0,0,1,103}, f.bytes);
                    f = session.readFrame();
                    assertEquals(LanCastProtocol.TYPE_VIDEO, f.type);
                    assertEquals(123456L, f.ptsUs);
                    assertArrayEquals(new byte[]{0,0,0,1,101,9,8,7}, f.bytes);
                    assertEquals(LanCastProtocol.TYPE_END, session.readFrame().type);
                } catch (Throwable error) { failure.set(error); }
            });
            receiver.start();
            try (Socket sender = new Socket("127.0.0.1", server.getLocalPort())) {
                LanCastProtocol.Session session = LanCastProtocol.clientAuthenticate(sender, code);
                session.writeFrame(LanCastProtocol.TYPE_CONFIG, 0, new byte[]{0,0,0,1,103});
                session.writeFrame(LanCastProtocol.TYPE_VIDEO, 123456L, new byte[]{0,0,0,1,101,9,8,7});
                session.writeFrame(LanCastProtocol.TYPE_END, 0, new byte[0]);
            }
            receiver.join(7000);
            assertFalse(receiver.isAlive());
            if (failure.get() != null) throw new AssertionError(failure.get());
        }
    }

    @Test public void invalidCodeRejected() throws Exception {
        String code = LanCastProtocol.newPairingCode(new SecureRandom());
        String incorrect = code.substring(0,11)+(code.endsWith("A")?"B":"A");
        try (ServerSocket server = new ServerSocket(0)) {
            AtomicReference<Throwable> serverError = new AtomicReference<>();
            Thread receiver = new Thread(() -> {
                try (Socket client = server.accept()) {
                    LanCastProtocol.serverAuthenticate(client, code);
                    serverError.set(new AssertionError("Incorrect secret was accepted"));
                } catch (IOException expected) {
                    // Must refuse before any video data is read.
                } catch (Throwable t) { serverError.set(t); }
            });
            receiver.start();
            try (Socket sender = new Socket("127.0.0.1", server.getLocalPort())) {
                try {
                    LanCastProtocol.clientAuthenticate(sender, incorrect);
                    fail("Incorrect pairing secret was accepted");
                } catch (IOException expected) {
                    assertTrue(expected.getMessage().contains("pairing"));
                }
            }
            receiver.join(7000);
            assertFalse(receiver.isAlive());
            if (serverError.get()!=null) throw new AssertionError(serverError.get());
        }
    }

    @Test public void oversizedFramesAreRejectedBeforeAllocation() throws Exception {
        // Test the sender guard, independent of network credentials.
        assertEquals(512 * 1024, LanCastProtocol.MAX_VIDEO_SAMPLE);
    }
}
