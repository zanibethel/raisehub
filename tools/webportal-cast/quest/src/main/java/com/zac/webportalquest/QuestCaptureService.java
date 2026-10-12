package com.zac.webportalquest;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.MediaCodec;
import android.media.MediaCodecInfo;
import android.media.MediaFormat;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.view.Surface;

import com.zac.castprotocol.LanCastProtocol;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.ByteBuffer;
import java.security.GeneralSecurityException;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;

/** MediaProjection sender for explicit, user-approved local casting only. */
public final class QuestCaptureService extends Service {
    public static final String ACTION_START = "com.zac.webportalquest.START";
    public static final String ACTION_STOP = "com.zac.webportalquest.STOP";
    private static final String CHANNEL = "quest-casting";
    private static final int NOTIFICATION_ID = 451;
    public static volatile String status = "Not casting";

    private final AtomicBoolean stopping = new AtomicBoolean();
    private Thread sender;
    private volatile Socket socket;
    private volatile MediaProjection projection;
    private volatile VirtualDisplay display;
    private volatile MediaCodec encoder;
    private volatile Surface inputSurface;

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override public void onCreate() {
        super.onCreate();
        NotificationManager notifications = (NotificationManager)
                getSystemService(NOTIFICATION_SERVICE);
        NotificationChannel channel = new NotificationChannel(CHANNEL,
                "WebPortal Quest screen casting", NotificationManager.IMPORTANCE_LOW);
        notifications.createNotificationChannel(channel);
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || ACTION_STOP.equals(intent.getAction())) {
            status = "Casting stopped";
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!ACTION_START.equals(intent.getAction()) || sender != null) {
            return START_NOT_STICKY;
        }
        // Android 14/15: permission prompt has already been granted by Activity;
        // foreground mediaProjection service must run BEFORE getMediaProjection.
        startForeground(NOTIFICATION_ID, notification(),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
        String host = intent.getStringExtra("host");
        String code = intent.getStringExtra("code");
        int resultCode = intent.getIntExtra("resultCode", 0);
        Intent projectionToken = intent.getParcelableExtra("projectionToken");
        if (!isPrivateIp(host) || !LanCastProtocol.validCode(code)
                || resultCode != android.app.Activity.RESULT_OK || projectionToken == null) {
            status = "Invalid pairing or missing screen-capture permission";
            stopSelf();
            return START_NOT_STICKY;
        }
        status = "Connecting to Fire TV...";
        sender = new Thread(() -> capture(host, code, resultCode, projectionToken),
                "quest-video-sender");
        sender.setDaemon(true);
        sender.start();
        return START_NOT_STICKY;
    }

    private Notification notification() {
        Intent stop = new Intent(this, QuestCaptureService.class);
        stop.setAction(ACTION_STOP);
        PendingIntent stopIntent = PendingIntent.getService(this, 99, stop,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent view = PendingIntent.getActivity(this, 98, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new Notification.Builder(this, CHANNEL)
                .setContentTitle("WebPortal Quest Cast")
                .setContentText("Casting screen to your paired Fire TV")
                .setSmallIcon(android.R.drawable.ic_menu_share)
                .setContentIntent(view)
                .setOngoing(true)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel,
                        "Stop casting", stopIntent)
                .build();
    }

    private void capture(String host, String code, int resultCode, Intent permission) {
        try (Socket peer = new Socket()) {
            socket = peer;
            peer.connect(new InetSocketAddress(host, LanCastProtocol.PORT), 5000);
            peer.setTcpNoDelay(true);
            peer.setSoTimeout(12000);
            LanCastProtocol.Session stream = LanCastProtocol.clientAuthenticate(peer, code);
            if (stopping.get()) return;
            MediaProjectionManager manager = (MediaProjectionManager)
                    getSystemService(MEDIA_PROJECTION_SERVICE);
            if (manager == null) throw new IOException("MediaProjection unavailable");
            projection = manager.getMediaProjection(resultCode, permission);
            if (projection == null) throw new IOException("Quest capture permission invalid");
            projection.registerCallback(new MediaProjection.Callback() {
                @Override public void onStop() {
                    status = "Quest ended screen-capture permission";
                    stopSelf();
                }
            }, new Handler(Looper.getMainLooper()));

            MediaFormat format = MediaFormat.createVideoFormat(
                    MediaFormat.MIMETYPE_VIDEO_AVC, LanCastProtocol.WIDTH, LanCastProtocol.HEIGHT);
            format.setInteger(MediaFormat.KEY_COLOR_FORMAT,
                    MediaCodecInfo.CodecCapabilities.COLOR_FormatSurface);
            format.setInteger(MediaFormat.KEY_BIT_RATE, 2500000);
            format.setInteger(MediaFormat.KEY_FRAME_RATE, LanCastProtocol.FPS);
            format.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1);
            format.setInteger(MediaFormat.KEY_BITRATE_MODE,
                    MediaCodecInfo.EncoderCapabilities.BITRATE_MODE_CBR);

            MediaCodec videoEncoder = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_VIDEO_AVC);
            encoder = videoEncoder;
            videoEncoder.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);
            inputSurface = videoEncoder.createInputSurface();
            videoEncoder.start();

            int density = getResources().getDisplayMetrics().densityDpi;
            display = projection.createVirtualDisplay("WebPortalQuestCast",
                    LanCastProtocol.WIDTH, LanCastProtocol.HEIGHT, density,
                    DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                    inputSurface, null, null);
            if (display == null) throw new IOException("Quest virtual display unavailable");

            peer.setSoTimeout(0);
            status = "Casting encrypted video to " + host + " • Stop anytime";
            MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
            long count = 0;
            while (!stopping.get()) {
                int index = videoEncoder.dequeueOutputBuffer(info, 250000);
                if (index == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                    MediaFormat actual = videoEncoder.getOutputFormat();
                    sendFormatBuffer(actual, "csd-0", stream);
                    sendFormatBuffer(actual, "csd-1", stream);
                    continue;
                }
                if (index == MediaCodec.INFO_TRY_AGAIN_LATER) continue;
                if (index < 0) continue;
                try {
                    ByteBuffer buffer = videoEncoder.getOutputBuffer(index);
                    if (buffer == null || info.size <= 0) continue;
                    if (info.size > LanCastProtocol.MAX_VIDEO_SAMPLE)
                        throw new IOException("Encoded video sample exceeds frame limit");
                    buffer.position(info.offset);
                    buffer.limit(info.offset + info.size);
                    byte[] encoded = new byte[info.size];
                    buffer.get(encoded);
                    boolean config = (info.flags & MediaCodec.BUFFER_FLAG_CODEC_CONFIG) != 0;
                    stream.writeFrame(config ? LanCastProtocol.TYPE_CONFIG :
                            LanCastProtocol.TYPE_VIDEO, info.presentationTimeUs, encoded);
                    if (!config && ++count % 300 == 0)
                        status = "Casting to " + host + " • " + count +
                                " frames sent • encrypted local video";
                } finally {
                    videoEncoder.releaseOutputBuffer(index, false);
                }
                if ((info.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) break;
            }
            if (!stopping.get()) stream.writeFrame(LanCastProtocol.TYPE_END, 0L, new byte[0]);
        } catch (IOException | GeneralSecurityException | RuntimeException error) {
            if (!stopping.get()) status = "Casting ended: " +
                    error.getClass().getSimpleName() + " • check TV address and code";
        } finally {
            closeCapture();
            stopSelf();
        }
    }

    private void sendFormatBuffer(MediaFormat format, String name, LanCastProtocol.Session session)
            throws IOException, GeneralSecurityException {
        if (!format.containsKey(name)) return;
        ByteBuffer source = format.getByteBuffer(name);
        if (source == null || source.remaining() > LanCastProtocol.MAX_VIDEO_SAMPLE) return;
        ByteBuffer copy = source.duplicate();
        byte[] data = new byte[copy.remaining()];
        copy.get(data);
        if (data.length > 0) session.writeFrame(LanCastProtocol.TYPE_CONFIG, 0, data);
    }

    private void closeCapture() {
        stopping.set(true);
        Socket s = socket;
        socket = null;
        if (s != null) try { s.close(); } catch (IOException ignored) {}
        VirtualDisplay vd = display;
        display = null;
        if (vd != null) try { vd.release(); } catch (Exception ignored) {}
        MediaCodec video = encoder;
        encoder = null;
        if (video != null) {
            try { video.stop(); } catch (Exception ignored) {}
            try { video.release(); } catch (Exception ignored) {}
        }
        Surface surface = inputSurface;
        inputSurface = null;
        if (surface != null) try { surface.release(); } catch (Exception ignored) {}
        MediaProjection live = projection;
        projection = null;
        if (live != null) try { live.stop(); } catch (Exception ignored) {}
    }

    @Override public void onDestroy() {
        closeCapture();
        if (status.startsWith("Casting encrypted") || status.startsWith("Casting to"))
            status = "Casting stopped";
        super.onDestroy();
    }

    public static boolean isPrivateIp(String host) {
        if (host == null || !host.matches("[0-9]{1,3}(\\.[0-9]{1,3}){3}"))
            return false;
        String[] parts = host.split("\\.");
        int[] a = new int[4];
        for (int i = 0; i < 4; i++) {
            a[i] = Integer.parseInt(parts[i]);
            if (a[i] < 0 || a[i] > 255) return false;
        }
        return a[0] == 10 || a[0] == 192 && a[1] == 168 ||
                a[0] == 172 && a[1] >= 16 && a[1] <= 31;
    }
}
