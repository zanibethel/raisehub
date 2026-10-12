package com.zac.webportalcast;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;

import javax.net.ssl.SSLSocket;

/**
 * Minimal Cast V2 control-channel receiver that behaves accurately about what
 * it can and cannot do. Supports heartbeat and truthful receiver status, not
 * authenticated Google Cast hardware or RTP/RTCP mirror playback.
 *
 * For the explicit local-auth test it can sign with an app-owned self-signed
 * certificate, but cannot confer Cast CA trust, and never sends a successful
 * LAUNCH/ANSWER before media transport is implemented.
 */
final class CastV2ControlSession {
    interface Events { void record(String category, String message); }

    static final String AUTH = "urn:x-cast:com.google.cast.tp.deviceauth";
    static final String HEARTBEAT = "urn:x-cast:com.google.cast.tp.heartbeat";
    static final String CONNECTION = "urn:x-cast:com.google.cast.tp.connection";
    static final String RECEIVER = "urn:x-cast:com.google.cast.receiver";
    static final String STREAMING = "urn:x-cast:com.google.cast.webrtc";
    private static final int MAX_MESSAGES = 128;
    private static final long MAX_DURATION_MS = 60000L;

    private CastV2ControlSession() {}

    static void run(SSLSocket peer, int connection, Events events,
                    PrivateKey localPrivateKey, X509Certificate localCertificate)
            throws IOException {
        final String id = "#" + connection;
        DataInputStream in = new DataInputStream(peer.getInputStream());
        DataOutputStream out = new DataOutputStream(peer.getOutputStream());
        long started = System.currentTimeMillis();
        int messages = 0;
        int authChallenges = 0;
        int replied = 0;
        boolean postAuthTraffic = false;
        while (messages < MAX_MESSAGES && System.currentTimeMillis() - started < MAX_DURATION_MS) {
            CastV2Envelope frame;
            try {
                frame = CastV2Envelope.read(in);
            } catch (java.net.SocketTimeoutException idle) {
                events.record("V2_IDLE", "Session " + id + " ended after inactivity");
                break;
            } catch (EOFException closed) {
                events.record("V2_CLOSE", "Session " + id + " sender closed control channel");
                break;
            } catch (IOException malformed) {
                events.record("V2_INVALID", "Session " + id + " invalid Cast envelope: " +
                        malformed.getClass().getSimpleName());
                break;
            }
            messages++;
            if (AUTH.equals(frame.namespace)) {
                if (frame.payloadType != CastV2Envelope.BINARY) {
                    events.record("V2_AUTH_INVALID", "Session " + id + " deviceauth payload not binary");
                    break;
                }
                CastLocalAuthResponse.Challenge challenge;
                try {
                    challenge = CastLocalAuthResponse.parseChallenge(frame.payload);
                } catch (IOException notChallenge) {
                    events.record("V2_AUTH_INVALID", "Session " + id +
                            " invalid or unexpected device-auth challenge");
                    break;
                }
                authChallenges++;
                events.record("V2_AUTH_CHALLENGE", "Session " + id +
                        " received device identity challenge; receiver certificate is SELF-OWNED");
                if (replied > 0) {
                    events.record("V2_AUTH_REPEATED", "Session " + id +
                            " extra auth challenge ignored");
                    continue;
                }
                replied++;
                byte[] answer;
                if (!CastLocalAuthResponse.supported(challenge)) {
                    answer = CastLocalAuthResponse.unsupportedAlgorithmError();
                    events.record("V2_AUTH_UNSUPPORTED", "Session " + id +
                            " requested unsupported signature/hash algorithm");
                } else {
                    try {
                        answer = CastLocalAuthResponse.encode(challenge,
                                localPrivateKey, localCertificate.getPublicKey(),
                                localCertificate.getEncoded());
                        events.record("V2_AUTH_RESPONSE_LOCAL", "Session " + id +
                                " sent correctly signed SELF-OWNED test identity; Cast trust NOT established" +
                                " (hash=" + (challenge.hashAlgorithm == 1 ? "SHA256" : "SHA1") +
                                ", nonce=" + challenge.noncePresent + ")");
                    } catch (Exception localFailure) {
                        answer = new byte[] {0x1a, 0x02, 0x08, 0x00};
                        events.record("V2_AUTH_SIGN_FAIL", "Session " + id +
                                " local test signature unavailable: " +
                                localFailure.getClass().getSimpleName());
                    }
                }
                CastV2Envelope.write(out, new CastV2Envelope("receiver-0",
                        frame.source, AUTH, CastV2Envelope.BINARY, answer));
                continue;
            }
            if (replied > 0 && !postAuthTraffic) {
                postAuthTraffic = true;
                events.record("V2_POST_AUTH_TRAFFIC", "Session " + id +
                        " sender continued with Cast control messages after local response; " +
                        "acceptance of identity NOT proven");
            }
            if (frame.payloadType != CastV2Envelope.STRING) {
                events.record("V2_BINARY", "Session " + id + " non-auth binary control message");
                continue;
            }
            JSONObject message;
            try {
                message = new JSONObject(frame.utf8());
            } catch (JSONException invalidJson) {
                events.record("V2_JSON_INVALID", "Session " + id + " malformed JSON control message");
                continue;
            }
            String type = message.optString("type", "");
            if (HEARTBEAT.equals(frame.namespace) && "PING".equals(type)) {
                JSONObject pong = new JSONObject();
                try { pong.put("type", "PONG"); }
                catch (JSONException error) { throw new IOException("Could not create heartbeat"); }
                CastV2Envelope.write(out, textResponse(frame, HEARTBEAT, pong));
                events.record("V2_HEARTBEAT", "Session " + id + " heartbeat PING/PONG answered");
            } else if (CONNECTION.equals(frame.namespace) && "CONNECT".equals(type)) {
                events.record("V2_CONNECT", "Session " + id + " virtual connection request received");
                // Virtual CONNECT has no success response in Cast V2.
            } else if (CONNECTION.equals(frame.namespace) && "CLOSE".equals(type)) {
                events.record("V2_CLOSE", "Session " + id + " Cast CLOSE received");
                break;
            } else if (RECEIVER.equals(frame.namespace) && "GET_STATUS".equals(type)) {
                sendEmptyStatus(out, frame, message);
                events.record("V2_STATUS", "Session " + id + " honest receiver status sent: no running apps");
            } else if (RECEIVER.equals(frame.namespace) && "GET_APP_AVAILABILITY".equals(type)) {
                // This request was observed on Quest *before* deviceauth.
                // Previous versions silently ignored it. We advertise no
                // receiver apps because none can launch or stream natively yet.
                JSONArray requested = message.optJSONArray("appId");
                if (requested == null || requested.length() > 16) {
                    events.record("V2_APP_AVAIL_INVALID", "Session " + id +
                            " invalid app availability request");
                    continue;
                }
                String[] appIds = new String[requested.length()];
                boolean valid = true;
                for (int index = 0; index < requested.length(); index++) {
                    String appId = requested.optString(index, "");
                    if (!appId.matches("[A-Za-z0-9._-]{1,80}")) {
                        valid = false;
                        break;
                    }
                    appIds[index] = appId;
                }
                if (!valid) {
                    events.record("V2_APP_AVAIL_INVALID", "Session " + id +
                            " unsupported app identifier format");
                    continue;
                }
                long requestId = Math.max(0L, message.optLong("requestId", 0));
                byte[] json = unavailableAppsJson(requestId, appIds)
                        .getBytes(StandardCharsets.UTF_8);
                CastV2Envelope.write(out, new CastV2Envelope("receiver-0",
                        frame.source, RECEIVER, CastV2Envelope.STRING, json));
                events.record("V2_APP_AVAIL_REPLY", "Session " + id +
                        " replied APP_UNAVAILABLE for " + appIds.length +
                        " queried receiver app(s), no native streaming app installed");
            } else if (RECEIVER.equals(frame.namespace) && "LAUNCH".equals(type)) {
                // Without certified identity and a negotiated streaming app,
                // do not send fake launch success / transportId.
                sendEmptyStatus(out, frame, message);
                events.record("V2_LAUNCH_UNSUPPORTED", "Session " + id +
                        " app launch requested; authenticated streaming receiver unavailable");
            } else if (STREAMING.equals(frame.namespace) && "OFFER".equals(type)) {
                JSONObject response = new JSONObject();
                try {
                    response.put("type", "ANSWER");
                    response.put("result", "error");
                    if (message.has("seqNum")) response.put("seqNum", message.optLong("seqNum"));
                    response.put("error", new JSONObject()
                            .put("code", 1).put("description", "Streaming transport unsupported"));
                } catch (JSONException ignored) {}
                CastV2Envelope.write(out, textResponse(frame, STREAMING, response));
                events.record("V2_OFFER_UNSUPPORTED", "Session " + id +
                        " mirror offer received; RTP decoder not negotiated");
            } else {
                // Only expose a bounded known message type/namespace to
                // diagnostic logs; never capture arbitrary JSON fields.
                if (type.matches("[A-Z_]{1,32}") &&
                        frame.namespace.matches("urn:x-cast:[a-zA-Z0-9._-]{1,100}"))
                    events.record("V2_CONTROL", "Session " + id + " observed " +
                            frame.namespace + " / " + type);
                else events.record("V2_CONTROL", "Session " + id + " unhandled control namespace");
            }
        }
        events.record("V2_END", "Session " + id + " processed " + messages +
                " messages, deviceauth challenges=" + authChallenges +
                ", sender continued=" + postAuthTraffic +
                ", certified authentication NOT demonstrated");
    }

    /**
     * Pure, bounded JSON generator used by local JVM protocol tests.
     * appIds are validated by the caller and again here; no uncontrolled
     * input is interpolated into JSON. Return honest availability only.
     */
    static String unavailableAppsJson(long requestId, String[] appIds) throws IOException {
        if (appIds == null || appIds.length > 16)
            throw new IOException("App availability request too large");
        StringBuilder out = new StringBuilder(96 + appIds.length * 110);
        out.append("{\"responseType\":\"GET_APP_AVAILABILITY\",\"requestId\":");
        out.append(Math.max(0L, requestId)).append(",\"availability\":{");
        for (int i = 0; i < appIds.length; i++) {
            if (appIds[i] == null || !appIds[i].matches("[A-Za-z0-9._-]{1,80}"))
                throw new IOException("Invalid app identifier");
            if (i > 0) out.append(',');
            out.append('"').append(appIds[i]).append("\":\"APP_UNAVAILABLE\"");
        }
        return out.append("}}").toString();
    }

    private static CastV2Envelope textResponse(CastV2Envelope request,
                                                String namespace, JSONObject message) {
        return new CastV2Envelope("receiver-0", request.source, namespace,
                CastV2Envelope.STRING, message.toString().getBytes(StandardCharsets.UTF_8));
    }

    static String idleStatusJson(long requestId) {
        return "{\"responseType\":\"RECEIVER_STATUS\",\"requestId\":" +
                Math.max(0L, requestId) +
                ",\"status\":{\"applications\":[],\"isActiveInput\":true," +
                "\"standby\":false,\"volume\":{\"level\":0.5,\"muted\":false}}}";
    }

    private static void sendEmptyStatus(DataOutputStream output, CastV2Envelope request,
                                        JSONObject incoming) throws IOException {
        byte[] reply = idleStatusJson(incoming.optLong("requestId", 0L))
                .getBytes(StandardCharsets.UTF_8);
        CastV2Envelope.write(output, new CastV2Envelope("receiver-0",
                request.source, RECEIVER, CastV2Envelope.STRING, reply));
    }
}
