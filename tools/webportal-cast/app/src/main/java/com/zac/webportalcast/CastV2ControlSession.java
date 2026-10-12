package com.zac.webportalcast;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import javax.net.ssl.SSLSocket;

/**
 * Minimal Cast V2 control-channel receiver that behaves accurately about what
 * it can and cannot do. Supports heartbeat and truthful receiver status, not
 * authenticated Google Cast hardware or RTP/RTCP mirror playback.
 *
 * It never forges device certificates/signatures and never sends a successful
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

    static void run(SSLSocket peer, int connection, Events events) throws IOException {
        final String id = "#" + connection;
        DataInputStream in = new DataInputStream(peer.getInputStream());
        DataOutputStream out = new DataOutputStream(peer.getOutputStream());
        long started = System.currentTimeMillis();
        int messages = 0;
        int authChallenges = 0;
        int replied = 0;
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
                    events.record("V2_AUTH_INVALID", "Session " + id + " deviceauth not binary");
                    break;
                }
                // DeviceAuthMessage.challenge=field 1, wire type 2. Never read
                // nonce content or record certificate material.
                if (frame.payload.length > 0 && (frame.payload[0] & 255) == 10) {
                    authChallenges++;
                    events.record("V2_AUTH_CHALLENGE", "Session " + id +
                            " received device identity challenge; untrusted TV has no certified identity");
                    // DeviceAuthMessage.error (field 3) with AuthError.INTERNAL_ERROR (0).
                    // This is an explicit *failure* response. We cannot provide
                    // the signed Google device identity required by strict senders.
                    if (replied < 1) {
                        CastV2Envelope.write(out, new CastV2Envelope("receiver-0",
                                frame.source, AUTH, CastV2Envelope.BINARY,
                                new byte[] {0x1a, 0x02, 0x08, 0x00}));
                        replied++;
                        events.record("V2_AUTH_ERROR", "Session " + id +
                                " replied unsupported device identity; NOT authenticated");
                    }
                } else {
                    events.record("V2_AUTH_OTHER", "Session " + id +
                            " received non-challenge auth message");
                }
                // Remain on TLS channel briefly so the sender can close
                // cleanly, but do not accept a fake authenticated session.
                continue;
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
                ", authenticated=false");
    }

    private static CastV2Envelope textResponse(CastV2Envelope request,
                                                String namespace, JSONObject message) {
        return new CastV2Envelope("receiver-0", request.source, namespace,
                CastV2Envelope.STRING, message.toString().getBytes(StandardCharsets.UTF_8));
    }

    private static void sendEmptyStatus(DataOutputStream output, CastV2Envelope request,
                                        JSONObject incoming) throws IOException {
        JSONObject status = new JSONObject();
        JSONObject message = new JSONObject();
        try {
            status.put("applications", new org.json.JSONArray());
            status.put("isActiveInput", true);
            status.put("standby", false);
            status.put("volume", new JSONObject().put("level", 0.5).put("muted", false));
            message.put("type", "RECEIVER_STATUS");
            message.put("requestId", Math.max(0, incoming.optInt("requestId", 0)));
            message.put("status", status);
        } catch (JSONException impossible) {
            throw new IOException("Could not build receiver status");
        }
        CastV2Envelope.write(output, textResponse(request, RECEIVER, message));
    }
}
