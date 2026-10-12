package com.zac.webportalcast;

import android.media.MediaCodec;
import android.media.MediaFormat;
import android.view.Surface;

import com.zac.castprotocol.LanCastProtocol;

import java.io.IOException;
import java.net.InetAddress;
import java.net.Inet4Address;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.ByteBuffer;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Enumeration;

/**
 * A separate, explicitly started Quest direct video receiver.
 * No Chromecast impersonation, no screen capture on the Fire TV.
 * Receives 720p H.264 encrypted frames from one paired Quest sender.
 */
public final class QuestVideoReceiver {
    public interface Listener {
        void onStatus(String message);
        void onConnected();
        void onStopped();
    }

    private final Listener listener;
    private final String code = LanCastProtocol.newPairingCode(new SecureRandom());
    private volatile boolean running;
    private volatile ServerSocket server;
    private volatile Socket active;
    private volatile MediaCodec decoder;
    private Thread worker;
    private int failedPairings;

    public QuestVideoReceiver(Listener listener) {
        this.listener = listener;
    }

    public String getCode() {
        return code.substring(0, 4) + "-" + code.substring(4, 8)
                + "-" + code.substring(8, 12);
    }

    public String getAddress() {
        return localIPv4() + ":" + LanCastProtocol.PORT;
    }

    public synchronized void start(Surface surface) {
        if (running || surface == null || !surface.isValid()) return;
        running = true;
        worker = new Thread(() -> listen(surface), "quest-direct-tv");
        worker.setDaemon(true);
        worker.start();
    }

    private void listen(Surface surface) {
        try (ServerSocket incoming = new ServerSocket(LanCastProtocol.PORT, 2)) {
            server = incoming;
            incoming.setSoTimeout(1500);
            listener.onStatus("Ready for Quest • " + getAddress() +
                    "\nEnter the TV pairing code in the Quest companion app.");
            while (running) {
                Socket socket;
                try {
                    socket = incoming.accept();
                } catch (java.net.SocketTimeoutException idle) {
                    continue;
                }
                if (!running) { socket.close(); break; }
                active = socket;
                try (Socket peer = socket) {
                    if (!trustedPrivateIPv4(peer.getInetAddress())) {
                        listener.onStatus("Rejected non-private-network sender");
                        continue;
                    }
                    peer.setTcpNoDelay(true);
                    peer.setSoTimeout(12000);
                    LanCastProtocol.Session stream;
                    try {
                        stream = LanCastProtocol.serverAuthenticate(peer, code);
                    } catch (IOException | GeneralSecurityException denied) {
                        failedPairings++;
                        listener.onStatus("Pairing unsuccessful (" + failedPairings + "/5). " +
                                (failedPairings >= 5 ? "Reopen Quest Cast to reset." :
                                "Check the 12-character pairing code."));
                        if (failedPairings >= 5) break;
                        continue;
                    }
                    failedPairings = 0;
                    listener.onConnected();
                    listener.onStatus("Quest connected • encrypted local H.264 stream\n" +
                            "Press Back on TV or Stop on Quest to disconnect");
                    peer.setSoTimeout(10000);
                    decodeStream(stream, surface);
                    if (running) listener.onStatus("Quest disconnected; receiver ready for reconnection.");
                } catch (IOException | GeneralSecurityException error) {
                    if (running) listener.onStatus("Stream interrupted: " + error.getClass().getSimpleName());
                } finally {
                    active = null;
                }
            }
        } catch (IOException error) {
            if (running) listener.onStatus("Could not start Quest receiver (port " +
                    LanCastProtocol.PORT + " unavailable)");
        } finally {
            running = false;
            server = null;
            listener.onStopped();
        }
    }

    private void decodeStream(LanCastProtocol.Session stream, Surface surface)
            throws IOException, GeneralSecurityException {
        MediaCodec codec = null;
        try {
            codec = MediaCodec.createDecoderByType(MediaFormat.MIMETYPE_VIDEO_AVC);
            decoder = codec;
            MediaFormat format = MediaFormat.createVideoFormat(MediaFormat.MIMETYPE_VIDEO_AVC,
                    LanCastProtocol.WIDTH, LanCastProtocol.HEIGHT);
            format.setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, LanCastProtocol.MAX_VIDEO_SAMPLE);
            codec.configure(format, surface, null, 0);
            codec.start();
            MediaCodec.BufferInfo output = new MediaCodec.BufferInfo();
            int frames = 0;
            while (running) {
                LanCastProtocol.Frame frame = stream.readFrame();
                if (frame == null || frame.type == LanCastProtocol.TYPE_END) break;
                if (frame.bytes.length == 0) continue;
                int input = codec.dequeueInputBuffer(10000);
                if (input >= 0) {
                    ByteBuffer dst = codec.getInputBuffer(input);
                    if (dst == null || dst.remaining() < frame.bytes.length)
                        throw new IOException("Decoder input capacity exceeded");
                    dst.clear();
                    dst.put(frame.bytes);
                    codec.queueInputBuffer(input, 0, frame.bytes.length, frame.ptsUs,
                            frame.type == LanCastProtocol.TYPE_CONFIG ?
                                    MediaCodec.BUFFER_FLAG_CODEC_CONFIG : 0);
                }
                for (int n = 0; n < 4; n++) {
                    int idx = codec.dequeueOutputBuffer(output, 0);
                    if (idx < 0) break;
                    codec.releaseOutputBuffer(idx, true);
                }
                if (frame.type == LanCastProtocol.TYPE_VIDEO && ++frames % 300 == 0)
                    listener.onStatus("Quest video streaming • " + frames + " frames received\n" +
                            "Press Back to disconnect");
            }
        } catch (RuntimeException codecError) {
            if (running) listener.onStatus("Video decoder error: " +
                    codecError.getClass().getSimpleName());
        } finally {
            decoder = null;
            if (codec != null) {
                try { codec.stop(); } catch (Exception ignored) {}
                try { codec.release(); } catch (Exception ignored) {}
            }
        }
    }

    private static boolean trustedPrivateIPv4(InetAddress address) {
        if (!(address instanceof Inet4Address)) return false;
        byte[] a = address.getAddress();
        int first = a[0] & 255;
        int second = a[1] & 255;
        return first == 10 || first == 192 && second == 168
                || first == 172 && second >= 16 && second <= 31;
    }

    private static String localIPv4() {
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface network = interfaces.nextElement();
                if (!network.isUp() || network.isLoopback()) continue;
                Enumeration<InetAddress> addresses = network.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress address = addresses.nextElement();
                    if (address instanceof Inet4Address && !address.isLoopbackAddress()
                            && trustedPrivateIPv4(address)) return address.getHostAddress();
                }
            }
        } catch (Exception ignored) {}
        return "Check Fire TV Wi-Fi IP";
    }

    public void stop() {
        running = false;
        Socket socket = active;
        if (socket != null) try { socket.close(); } catch (IOException ignored) {}
        ServerSocket listen = server;
        if (listen != null) try { listen.close(); } catch (IOException ignored) {}
    }
}
