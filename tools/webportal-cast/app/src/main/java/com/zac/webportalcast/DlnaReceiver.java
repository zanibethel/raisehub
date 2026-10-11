package com.zac.webportalcast;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.wifi.WifiManager;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.DatagramPacket;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.MulticastSocket;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketException;
import java.nio.charset.StandardCharsets;
import java.util.Enumeration;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Small, foreground-only, LAN UPnP MediaRenderer.
 *
 * Implements SSDP discovery + device/SCPD descriptors + SOAP AVTransport.
 * Does not advertise Google Cast, AirPlay, Miracast or Quest capabilities.
 * Zero external dependencies, outside of Android/Media3 used by the activity.
 */
public final class DlnaReceiver {
    public interface Listener {
        void onQueued(String url);
        void onPlay();
        void onPause();
        void onStop();
        void onSeek(long positionMs);
        long positionMs();
        long durationMs();
        boolean isPlaying();
        void onLog(String message);
    }

    private static final String SSDP_GROUP = "239.255.255.250";
    private static final int SSDP_PORT = 1900;
    private static final int MAX_REQUEST_BODY = 262144;
    private static final String ROOT = "upnp:rootdevice";
    private static final String RENDERER = "urn:schemas-upnp-org:device:MediaRenderer:1";
    private static final String AV = "urn:schemas-upnp-org:service:AVTransport:1";
    private static final String RC = "urn:schemas-upnp-org:service:RenderingControl:1";
    private static final String CM = "urn:schemas-upnp-org:service:ConnectionManager:1";
    private static final String SOAP = "http://schemas.xmlsoap.org/soap/envelope/";

    private final Context context;
    private final Listener listener;
    private final String uuid;
    private final ExecutorService workers = Executors.newFixedThreadPool(4);
    private ServerSocket httpServer;
    private MulticastSocket ssdp;
    private WifiManager.MulticastLock wifiLock;
    private volatile boolean running;
    private volatile String currentUri = "";
    private volatile String location = "";
    private volatile int requestedVolume = 50;

    public DlnaReceiver(Context context, Listener listener) {
        this.context = context.getApplicationContext();
        this.listener = listener;
        SharedPreferences preferences = this.context.getSharedPreferences("receiver", Context.MODE_PRIVATE);
        String previous = preferences.getString("uuid", "");
        if (previous.isEmpty()) {
            previous = UUID.randomUUID().toString();
            preferences.edit().putString("uuid", previous).apply();
        }
        uuid = "uuid:" + previous;
    }

    public synchronized boolean isRunning() { return running; }
    public String getLocation() { return location.isEmpty() ? "not listening" : location; }

    public synchronized void start() {
        if (running) return;
        try {
            httpServer = new ServerSocket(0, 16);
            httpServer.setSoTimeout(2000);
            location = "http://" + localIPv4() + ":" + httpServer.getLocalPort() + "/device.xml";
            running = true;
            workers.execute(this::httpAcceptLoop);
            acquireMulticast();
            startDiscovery();
            listener.onLog("DLNA service started: " + uuid);
        } catch (Exception error) {
            listener.onLog("Could not start local receiver: " + error.getClass().getSimpleName());
            stop();
        }
    }

    private void acquireMulticast() {
        WifiManager wifi = (WifiManager) context.getSystemService(Context.WIFI_SERVICE);
        if (wifi == null) return;
        try {
            wifiLock = wifi.createMulticastLock("WebPortalCastDLNA");
            wifiLock.setReferenceCounted(false);
            wifiLock.acquire();
        } catch (RuntimeException error) {
            listener.onLog("Multicast lock unavailable; discovery may fail");
        }
    }

    private void startDiscovery() {
        try {
            ssdp = new MulticastSocket(null);
            ssdp.setReuseAddress(true);
            ssdp.bind(new InetSocketAddress(SSDP_PORT));
            ssdp.setSoTimeout(2000);
            ssdp.joinGroup(InetAddress.getByName(SSDP_GROUP));
            workers.execute(this::discoveryLoop);
        } catch (Exception error) {
            listener.onLog("SSDP port 1900 unavailable: " + error.getClass().getSimpleName());
            if (ssdp != null) ssdp.close();
            ssdp = null;
        }
    }

    private void discoveryLoop() {
        long lastAdvertisement = 0L;
        byte[] buffer = new byte[4096];
        while (running) {
            long now = System.currentTimeMillis();
            if (now - lastAdvertisement > 30000L) {
                advertise("ssdp:alive");
                lastAdvertisement = now;
            }
            try {
                DatagramPacket request = new DatagramPacket(buffer, buffer.length);
                MulticastSocket socket = ssdp;
                if (socket == null) return;
                socket.receive(request);
                String message = new String(request.getData(), request.getOffset(),
                        request.getLength(), StandardCharsets.US_ASCII);
                if (!message.toUpperCase(Locale.US).startsWith("M-SEARCH")) continue;
                if (!message.toLowerCase(Locale.US).contains("ssdp:discover")) continue;
                String target = header(message, "st");
                if (target.isEmpty()) continue;
                answerSearch(request.getAddress(), request.getPort(), target);
            } catch (java.net.SocketTimeoutException timeout) {
                // Wake up to refresh announcements or observe stop().
            } catch (IOException error) {
                if (running) listener.onLog("Discovery listener stopped unexpectedly");
                break;
            }
        }
    }

    private String[] targets() {
        return new String[]{ROOT, uuid, RENDERER, AV, RC, CM};
    }

    private void answerSearch(InetAddress destination, int port, String requestTarget) {
        for (String target : targets()) {
            if (!requestTarget.equalsIgnoreCase("ssdp:all")
                    && !requestTarget.equalsIgnoreCase(target)) continue;
            String response = "HTTP/1.1 200 OK\r\n"
                    + "CACHE-CONTROL: max-age=120\r\n"
                    + "EXT:\r\n"
                    + "LOCATION: " + location + "\r\n"
                    + "SERVER: Android UPnP/1.0 WebPortalCast/0.1\r\n"
                    + "ST: " + target + "\r\n"
                    + "USN: " + uniqueServiceName(target) + "\r\n\r\n";
            sendUdp(response, destination, port);
        }
    }

    private String uniqueServiceName(String target) {
        return uuid.equals(target) ? uuid : uuid + "::" + target;
    }

    private void advertise(String nts) {
        try {
            InetAddress multicast = InetAddress.getByName(SSDP_GROUP);
            for (String target : targets()) {
                String message = "NOTIFY * HTTP/1.1\r\n"
                        + "HOST: " + SSDP_GROUP + ":" + SSDP_PORT + "\r\n"
                        + "CACHE-CONTROL: max-age=120\r\n"
                        + "LOCATION: " + location + "\r\n"
                        + "NT: " + target + "\r\n"
                        + "NTS: " + nts + "\r\n"
                        + "SERVER: Android UPnP/1.0 WebPortalCast/0.1\r\n"
                        + "USN: " + uniqueServiceName(target) + "\r\n\r\n";
                sendUdp(message, multicast, SSDP_PORT);
            }
        } catch (Exception ignored) {
            // A missing multicast route should not crash playback by direct URL.
        }
    }

    private void sendUdp(String message, InetAddress destination, int port) {
        try {
            byte[] bytes = message.getBytes(StandardCharsets.US_ASCII);
            MulticastSocket socket = ssdp;
            if (socket != null && !socket.isClosed()) {
                socket.send(new DatagramPacket(bytes, bytes.length, destination, port));
            }
        } catch (IOException ignored) {}
    }

    private void httpAcceptLoop() {
        while (running) {
            try {
                ServerSocket server = httpServer;
                if (server == null) return;
                Socket peer = server.accept();
                peer.setSoTimeout(4000);
                workers.execute(() -> handleRequest(peer));
            } catch (java.net.SocketTimeoutException timeout) {
                // Observe stop flag.
            } catch (java.util.concurrent.RejectedExecutionException closed) {
                break;
            } catch (IOException error) {
                if (running) listener.onLog("HTTP listener ended unexpectedly");
                break;
            }
        }
    }

    private void handleRequest(Socket peer) {
        try (Socket socket = peer) {
            InputStream in = new BufferedInputStream(socket.getInputStream());
            OutputStream out = socket.getOutputStream();
            String requestLine = readLine(in, 8192);
            if (requestLine == null) return;
            String[] requestParts = requestLine.split(" ");
            if (requestParts.length < 2) { respond(out, 400, "text/plain", "Bad request"); return; }

            String method = requestParts[0].toUpperCase(Locale.US);
            String path = requestParts[1].split("\\?", 2)[0];
            int contentLength = 0;
            String soapAction = "";
            String line;
            while ((line = readLine(in, 8192)) != null && !line.isEmpty()) {
                int separator = line.indexOf(':');
                if (separator < 0) continue;
                String key = line.substring(0, separator).trim().toLowerCase(Locale.US);
                String value = line.substring(separator + 1).trim();
                if ("content-length".equals(key)) {
                    try { contentLength = Integer.parseInt(value); }
                    catch (NumberFormatException error) { contentLength = -1; }
                }
                if ("soapaction".equals(key)) soapAction = value.replace("\"", "");
            }
            if (contentLength < 0 || contentLength > MAX_REQUEST_BODY) {
                respond(out, 413, "text/plain", "Request too large");
                return;
            }
            String body = "";
            if (contentLength > 0) {
                byte[] payload = new byte[contentLength];
                int position = 0;
                while (position < contentLength) {
                    int read = in.read(payload, position, contentLength - position);
                    if (read < 0) break;
                    position += read;
                }
                if (position != contentLength) {
                    respond(out, 400, "text/plain", "Incomplete request");
                    return;
                }
                body = new String(payload, StandardCharsets.UTF_8);
            }

            if ("GET".equals(method) || "HEAD".equals(method)) {
                String xml;
                if ("/device.xml".equals(path) || "/".equals(path)) xml = deviceDescriptor();
                else if ("/upnp/scpd/avtransport.xml".equals(path)) xml = scpd("av");
                else if ("/upnp/scpd/rendering.xml".equals(path)) xml = scpd("rc");
                else if ("/upnp/scpd/connection.xml".equals(path)) xml = scpd("cm");
                else { respond(out, 404, "text/plain", "Not found"); return; }
                respond(out, 200, "text/xml; charset=utf-8", "HEAD".equals(method) ? "" : xml);
                return;
            }
            if ("POST".equals(method) && path.startsWith("/upnp/control/")) {
                String service;
                if (path.endsWith("/avtransport")) service = AV;
                else if (path.endsWith("/rendering")) service = RC;
                else if (path.endsWith("/connection")) service = CM;
                else { respond(out, 404, "text/plain", "Unknown service"); return; }
                int hash = soapAction.lastIndexOf('#');
                String action = hash >= 0 ? soapAction.substring(hash + 1).trim() : "";
                if (!soapAction.startsWith(service + "#") || !action.matches("[A-Za-z]{2,40}")) {
                    respond(out, 400, "text/plain", "Bad SOAP action");
                    return;
                }
                String result = control(service, action, body);
                respond(out, result == null ? 501 : 200, "text/xml; charset=utf-8",
                        result == null ? fault() : result);
                return;
            }
            if ("SUBSCRIBE".equals(method) || "UNSUBSCRIBE".equals(method)) {
                respond(out, 501, "text/plain", "GENA notifications not implemented");
                return;
            }
            respond(out, 405, "text/plain", "Method not allowed");
        } catch (IOException ignored) {
            // Broken control-point connection. Avoid logging private network info.
        } catch (RuntimeException error) {
            listener.onLog("Receiver request error: " + error.getClass().getSimpleName());
        }
    }

    private String control(String service, String action, String xml) {
        String answer;
        if (AV.equals(service)) {
            switch (action) {
                case "SetAVTransportURI":
                    String url = decodeXml(argument(xml, "CurrentURI")).trim();
                    if (!validMediaUrl(url)) return null;
                    currentUri = url;
                    listener.onQueued(url);
                    answer = "";
                    break;
                case "Play":
                    if (currentUri.isEmpty()) return null;
                    listener.onPlay();
                    answer = "";
                    break;
                case "Pause": listener.onPause(); answer = ""; break;
                case "Stop": listener.onStop(); answer = ""; break;
                case "Seek":
                    String target = argument(xml, "Target");
                    long ms = parseTime(target);
                    if (ms < 0) return null;
                    listener.onSeek(ms);
                    answer = "";
                    break;
                case "GetTransportInfo":
                    String state = listener.isPlaying() ? "PLAYING"
                            : currentUri.isEmpty() ? "NO_MEDIA_PRESENT" : "STOPPED";
                    answer = "<CurrentTransportState>" + state + "</CurrentTransportState>"
                            + "<CurrentTransportStatus>OK</CurrentTransportStatus>"
                            + "<CurrentSpeed>1</CurrentSpeed>";
                    break;
                case "GetPositionInfo":
                    String pos = formatTime(listener.positionMs());
                    String dur = formatTime(listener.durationMs());
                    answer = "<Track>1</Track><TrackDuration>" + dur + "</TrackDuration>"
                            + "<TrackMetaData></TrackMetaData><TrackURI>" + escape(currentUri) + "</TrackURI>"
                            + "<RelTime>" + pos + "</RelTime><AbsTime>" + pos + "</AbsTime>"
                            + "<RelCount>0</RelCount><AbsCount>0</AbsCount>";
                    break;
                case "GetMediaInfo":
                    answer = "<NrTracks>1</NrTracks><MediaDuration>" + formatTime(listener.durationMs())
                            + "</MediaDuration><CurrentURI>" + escape(currentUri) + "</CurrentURI>"
                            + "<CurrentURIMetaData></CurrentURIMetaData><NextURI></NextURI>"
                            + "<NextURIMetaData></NextURIMetaData><PlayMedium>NETWORK</PlayMedium>"
                            + "<RecordMedium>NOT_IMPLEMENTED</RecordMedium><WriteStatus>NOT_IMPLEMENTED</WriteStatus>";
                    break;
                case "GetCurrentTransportActions":
                    answer = "<Actions>Play,Pause,Stop,Seek</Actions>";
                    break;
                default: return null;
            }
        } else if (CM.equals(service)) {
            if (!"GetProtocolInfo".equals(action)) return null;
            answer = "<Source></Source><Sink>http-get:*:video/mp4:*,http-get:*:audio/mpeg:*,"
                    + "http-get:*:audio/mp4:*,http-get:*:application/vnd.apple.mpegurl:*,"
                    + "http-get:*:application/dash+xml:*</Sink>";
        } else if (RC.equals(service)) {
            if ("GetVolume".equals(action)) answer = "<CurrentVolume>" + requestedVolume + "</CurrentVolume>";
            else if ("SetVolume".equals(action)) {
                try {
                    requestedVolume = Math.max(0, Math.min(100,
                            Integer.parseInt(argument(xml, "DesiredVolume"))));
                    android.media.AudioManager audio = (android.media.AudioManager)
                            context.getSystemService(Context.AUDIO_SERVICE);
                    if (audio != null) {
                        int max = audio.getStreamMaxVolume(android.media.AudioManager.STREAM_MUSIC);
                        audio.setStreamVolume(android.media.AudioManager.STREAM_MUSIC,
                                (int) Math.round(max * (requestedVolume / 100.0)), 0);
                    }
                } catch (NumberFormatException error) { return null; }
                answer = "";
            } else return null;
        } else return null;
        return "<?xml version=\"1.0\" encoding=\"utf-8\"?>"
                + "<s:Envelope xmlns:s=\"" + SOAP + "\" s:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\">"
                + "<s:Body><u:" + action + "Response xmlns:u=\"" + service + "\">"
                + answer + "</u:" + action + "Response></s:Body></s:Envelope>";
    }

    private String fault() {
        return "<?xml version=\"1.0\"?><s:Envelope xmlns:s=\"" + SOAP
                + "\" s:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\">"
                + "<s:Body><s:Fault><faultcode>s:Client</faultcode><faultstring>UPnPError</faultstring>"
                + "<detail><UPnPError xmlns=\"urn:schemas-upnp-org:control-1-0\">"
                + "<errorCode>401</errorCode><errorDescription>Invalid Action or URI</errorDescription>"
                + "</UPnPError></detail></s:Fault></s:Body></s:Envelope>";
    }

    private String deviceDescriptor() {
        String prefix = location.substring(0, location.lastIndexOf('/') + 1);
        return "<?xml version=\"1.0\" encoding=\"utf-8\"?>"
                + "<root xmlns=\"urn:schemas-upnp-org:device-1-0\"><specVersion><major>1</major>"
                + "<minor>0</minor></specVersion><URLBase>" + escape(prefix) + "</URLBase>"
                + "<device><deviceType>" + RENDERER + "</deviceType>"
                + "<friendlyName>WebPortal Cast</friendlyName><manufacturer>WebPortal</manufacturer>"
                + "<modelName>WebPortal Cast DLNA</modelName><modelNumber>0.1</modelNumber>"
                + "<UDN>" + uuid + "</UDN><serviceList>"
                + service(AV, "AVTransport", "/upnp/scpd/avtransport.xml", "/upnp/control/avtransport")
                + service(RC, "RenderingControl", "/upnp/scpd/rendering.xml", "/upnp/control/rendering")
                + service(CM, "ConnectionManager", "/upnp/scpd/connection.xml", "/upnp/control/connection")
                + "</serviceList></device></root>";
    }

    private String service(String type, String id, String scpd, String control) {
        return "<service><serviceType>" + type + "</serviceType>"
                + "<serviceId>urn:upnp-org:serviceId:" + id + "</serviceId>"
                + "<SCPDURL>" + scpd + "</SCPDURL><controlURL>" + control + "</controlURL>"
                + "<eventSubURL>/upnp/event/" + id + "</eventSubURL></service>";
    }

    private String scpd(String kind) {
        StringBuilder actions = new StringBuilder();
        String vars;
        if ("av".equals(kind)) {
            actions.append(action("SetAVTransportURI", "InstanceID|in|A_ARG_TYPE_InstanceID",
                    "CurrentURI|in|AVTransportURI", "CurrentURIMetaData|in|AVTransportURIMetaData"));
            actions.append(action("Play", "InstanceID|in|A_ARG_TYPE_InstanceID", "Speed|in|TransportPlaySpeed"));
            actions.append(action("Pause", "InstanceID|in|A_ARG_TYPE_InstanceID"));
            actions.append(action("Stop", "InstanceID|in|A_ARG_TYPE_InstanceID"));
            actions.append(action("Seek", "InstanceID|in|A_ARG_TYPE_InstanceID",
                    "Unit|in|A_ARG_TYPE_SeekMode", "Target|in|A_ARG_TYPE_SeekTarget"));
            actions.append(action("GetTransportInfo", "InstanceID|in|A_ARG_TYPE_InstanceID",
                    "CurrentTransportState|out|TransportState",
                    "CurrentTransportStatus|out|TransportStatus", "CurrentSpeed|out|TransportPlaySpeed"));
            actions.append(action("GetPositionInfo", "InstanceID|in|A_ARG_TYPE_InstanceID",
                    "Track|out|CurrentTrack", "TrackDuration|out|CurrentTrackDuration",
                    "TrackMetaData|out|CurrentTrackMetaData", "TrackURI|out|CurrentTrackURI",
                    "RelTime|out|RelativeTimePosition", "AbsTime|out|AbsoluteTimePosition",
                    "RelCount|out|RelativeCounterPosition", "AbsCount|out|AbsoluteCounterPosition"));
            actions.append(action("GetMediaInfo", "InstanceID|in|A_ARG_TYPE_InstanceID",
                    "NrTracks|out|NumberOfTracks", "MediaDuration|out|CurrentMediaDuration",
                    "CurrentURI|out|AVTransportURI", "CurrentURIMetaData|out|AVTransportURIMetaData",
                    "NextURI|out|NextAVTransportURI", "NextURIMetaData|out|NextAVTransportURIMetaData",
                    "PlayMedium|out|PlaybackStorageMedium", "RecordMedium|out|RecordStorageMedium",
                    "WriteStatus|out|RecordMediumWriteStatus"));
            actions.append(action("GetCurrentTransportActions", "InstanceID|in|A_ARG_TYPE_InstanceID",
                    "Actions|out|CurrentTransportActions"));
            vars = variable("A_ARG_TYPE_InstanceID", "ui4")
                    + variable("AVTransportURI", "string") + variable("AVTransportURIMetaData", "string")
                    + variable("TransportPlaySpeed", "string") + variable("TransportState", "string")
                    + variable("TransportStatus", "string") + variable("A_ARG_TYPE_SeekMode", "string")
                    + variable("A_ARG_TYPE_SeekTarget", "string") + variable("CurrentTrack", "ui4")
                    + variable("CurrentTrackDuration", "string") + variable("CurrentTrackMetaData", "string")
                    + variable("CurrentTrackURI", "string") + variable("RelativeTimePosition", "string")
                    + variable("AbsoluteTimePosition", "string") + variable("RelativeCounterPosition", "i4")
                    + variable("AbsoluteCounterPosition", "i4") + variable("NumberOfTracks", "ui4")
                    + variable("CurrentMediaDuration", "string") + variable("NextAVTransportURI", "string")
                    + variable("NextAVTransportURIMetaData", "string")
                    + variable("PlaybackStorageMedium", "string") + variable("RecordStorageMedium", "string")
                    + variable("RecordMediumWriteStatus", "string")
                    + variable("CurrentTransportActions", "string");
        } else if ("cm".equals(kind)) {
            actions.append(action("GetProtocolInfo", "Source|out|SourceProtocolInfo", "Sink|out|SinkProtocolInfo"));
            vars = variable("SourceProtocolInfo", "string") + variable("SinkProtocolInfo", "string");
        } else {
            actions.append(action("GetVolume", "InstanceID|in|A_ARG_TYPE_InstanceID",
                    "Channel|in|A_ARG_TYPE_Channel", "CurrentVolume|out|Volume"));
            actions.append(action("SetVolume", "InstanceID|in|A_ARG_TYPE_InstanceID",
                    "Channel|in|A_ARG_TYPE_Channel", "DesiredVolume|in|Volume"));
            vars = variable("A_ARG_TYPE_InstanceID", "ui4") + variable("A_ARG_TYPE_Channel", "string")
                    + variable("Volume", "ui2");
        }
        return "<?xml version=\"1.0\" encoding=\"utf-8\"?>"
                + "<scpd xmlns=\"urn:schemas-upnp-org:service-1-0\">"
                + "<specVersion><major>1</major><minor>0</minor></specVersion>"
                + "<actionList>" + actions + "</actionList><serviceStateTable>"
                + vars + "</serviceStateTable></scpd>";
    }

    private String action(String name, String... parameters) {
        StringBuilder value = new StringBuilder("<action><name>").append(name)
                .append("</name><argumentList>");
        for (String argument : parameters) {
            String[] parts = argument.split("\\|", 3);
            value.append("<argument><name>").append(parts[0]).append("</name><direction>")
                    .append(parts[1]).append("</direction><relatedStateVariable>")
                    .append(parts[2]).append("</relatedStateVariable></argument>");
        }
        return value.append("</argumentList></action>").toString();
    }

    private String variable(String name, String dataType) {
        return "<stateVariable sendEvents=\"no\"><name>" + name + "</name><dataType>"
                + dataType + "</dataType></stateVariable>";
    }

    private static String header(String raw, String name) {
        Pattern p = Pattern.compile("(?im)^" + Pattern.quote(name) + ":\\s*(.*?)\\s*$");
        Matcher matcher = p.matcher(raw);
        return matcher.find() ? matcher.group(1) : "";
    }

    private static String argument(String xml, String name) {
        Pattern p = Pattern.compile("<(?:[A-Za-z0-9_]+:)?" + Pattern.quote(name)
                + "(?:\\s[^>]*)?>(.*?)</(?:[A-Za-z0-9_]+:)?" + Pattern.quote(name) + "\\s*>",
                Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
        Matcher result = p.matcher(xml);
        return result.find() ? result.group(1) : "";
    }

    private static String decodeXml(String input) {
        return input.replace("&lt;", "<").replace("&gt;", ">")
                .replace("&quot;", "\"").replace("&apos;", "'").replace("&amp;", "&");
    }

    private static String escape(String input) {
        return input.replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&apos;");
    }

    public static boolean validMediaUrl(String input) {
        if (input == null || input.length() > 8192) return false;
        try {
            java.net.URI uri = java.net.URI.create(input.trim());
            String scheme = uri.getScheme();
            return ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme))
                    && uri.getHost() != null && !uri.getHost().isEmpty()
                    && uri.getUserInfo() == null;
        } catch (RuntimeException invalid) { return false; }
    }

    private static long parseTime(String formatted) {
        try {
            String[] parts = formatted.split(":");
            if (parts.length != 3) return -1L;
            double seconds = Double.parseDouble(parts[2]);
            return (long) ((Integer.parseInt(parts[0]) * 3600L
                    + Integer.parseInt(parts[1]) * 60L + seconds) * 1000L);
        } catch (RuntimeException invalid) { return -1L; }
    }

    private static String formatTime(long ms) {
        long seconds = Math.max(0, ms / 1000L);
        return String.format(Locale.US, "%02d:%02d:%02d",
                seconds / 3600, seconds / 60 % 60, seconds % 60);
    }

    private static String readLine(InputStream in, int max) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        while (buffer.size() <= max) {
            int b = in.read();
            if (b < 0) return buffer.size() == 0 ? null
                    : new String(buffer.toByteArray(), StandardCharsets.US_ASCII);
            if (b == '\n') break;
            if (b != '\r') buffer.write(b);
        }
        if (buffer.size() > max) throw new IOException("Header too large");
        return new String(buffer.toByteArray(), StandardCharsets.US_ASCII);
    }

    private static void respond(OutputStream out, int status, String mime, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        String reason = status == 200 ? "OK" : status == 404 ? "Not Found"
                : status == 501 ? "Not Implemented" : "Bad Request";
        String headers = "HTTP/1.1 " + status + " " + reason + "\r\n"
                + "Content-Type: " + mime + "\r\n"
                + "Content-Length: " + bytes.length + "\r\n"
                + "Connection: close\r\n"
                + "Cache-Control: no-store\r\n\r\n";
        out.write(headers.getBytes(StandardCharsets.US_ASCII));
        out.write(bytes);
        out.flush();
    }

    private static String localIPv4() throws SocketException {
        Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
        String candidate = null;
        while (interfaces.hasMoreElements()) {
            NetworkInterface nic = interfaces.nextElement();
            if (!nic.isUp() || nic.isLoopback()) continue;
            Enumeration<InetAddress> addresses = nic.getInetAddresses();
            while (addresses.hasMoreElements()) {
                InetAddress address = addresses.nextElement();
                if (!(address instanceof Inet4Address) || address.isLoopbackAddress()) continue;
                String ip = address.getHostAddress();
                if (address.isSiteLocalAddress()) return ip;
                if (candidate == null) candidate = ip;
            }
        }
        return candidate == null ? "127.0.0.1" : candidate;
    }

    public synchronized void stop() {
        if (!running && httpServer == null && ssdp == null) return;
        if (running && ssdp != null) advertise("ssdp:byebye");
        running = false;
        if (ssdp != null) {
            try { ssdp.leaveGroup(InetAddress.getByName(SSDP_GROUP)); } catch (Exception ignored) {}
            ssdp.close();
            ssdp = null;
        }
        if (httpServer != null) {
            try { httpServer.close(); } catch (IOException ignored) {}
            httpServer = null;
        }
        if (wifiLock != null) {
            try { if (wifiLock.isHeld()) wifiLock.release(); } catch (RuntimeException ignored) {}
            wifiLock = null;
        }
        workers.shutdownNow();
    }
}
