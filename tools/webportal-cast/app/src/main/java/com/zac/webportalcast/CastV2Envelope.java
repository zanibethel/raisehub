package com.zac.webportalcast;

import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Bounded Cast V2 framed protobuf envelope codec (cast_channel.proto).
 *
 * Implemented independently from media, receiver identity or Chromecast
 * registration. No protobuf dependencies. Inputs are untrusted: enforce
 * strict lengths, wire types and metadata limits before creating strings.
 */
final class CastV2Envelope {
    static final int MAX_FRAME = 65536;
    static final int MAX_TEXT = 8192;
    static final int STRING = 0;
    static final int BINARY = 1;

    final String source;
    final String destination;
    final String namespace;
    final int payloadType;
    final byte[] payload;

    CastV2Envelope(String source, String destination, String namespace, int payloadType, byte[] payload) {
        this.source = source;
        this.destination = destination;
        this.namespace = namespace;
        this.payloadType = payloadType;
        this.payload = payload;
    }

    static CastV2Envelope read(DataInputStream source) throws IOException {
        int length = source.readInt();
        if (length <= 0 || length > MAX_FRAME) throw new IOException("Cast frame size rejected");
        byte[] raw = new byte[length];
        source.readFully(raw);
        return decode(raw);
    }

    static CastV2Envelope decode(byte[] raw) throws IOException {
        if (raw == null || raw.length == 0 || raw.length > MAX_FRAME)
            throw new IOException("Cast envelope size rejected");
        String source = null, destination = null, namespace = null;
        int version = -1, type = -1;
        byte[] payload = null;
        int pos = 0, fields = 0;
        while (pos < raw.length && fields++ < 48) {
            Varint tag = readVarint(raw, pos);
            if (tag == null || tag.value <= 0 || (tag.value >>> 3) > 127)
                throw new IOException("Malformed protobuf tag");
            pos = tag.next;
            int number = (int) (tag.value >>> 3);
            int wire = (int) (tag.value & 7);
            if (wire == 0) {
                Varint value = readVarint(raw, pos);
                if (value == null) throw new IOException("Invalid protobuf varint");
                pos = value.next;
                if (number == 1) version = (int) value.value;
                if (number == 5) type = (int) value.value;
            } else if (wire == 2) {
                Varint size = readVarint(raw, pos);
                if (size == null || size.value > raw.length) throw new IOException("Malformed protobuf length");
                pos = size.next;
                if (size.value > raw.length - pos) throw new IOException("Truncated protobuf value");
                int len = (int) size.value;
                if (number == 2 || number == 3 || number == 4) {
                    if (len == 0 || len > 160) throw new IOException("Invalid Cast routing metadata");
                    String value = new String(raw, pos, len, StandardCharsets.US_ASCII);
                    if (!value.matches("[a-zA-Z0-9.:_*\\-]{1,160}"))
                        throw new IOException("Invalid Cast routing metadata");
                    if (number == 2) source = value;
                    if (number == 3) destination = value;
                    if (number == 4) namespace = value;
                } else if (number == 6 || number == 7) {
                    if (len > MAX_FRAME - 128) throw new IOException("Cast payload too large");
                    if (payload != null) throw new IOException("Multiple Cast payload fields");
                    payload = new byte[len];
                    System.arraycopy(raw, pos, payload, 0, len);
                    if (number == 6 && type != STRING) throw new IOException("String type mismatch");
                    if (number == 7 && type != BINARY) throw new IOException("Binary type mismatch");
                }
                pos += len;
            } else if (wire == 1 || wire == 5) {
                int skip = wire == 1 ? 8 : 4;
                if (skip > raw.length - pos) throw new IOException("Truncated protobuf field");
                pos += skip;
            } else throw new IOException("Unsupported protobuf wire type");
        }
        if (pos != raw.length || version != 0 || source == null || destination == null ||
                namespace == null || (type != STRING && type != BINARY) || payload == null)
            throw new IOException("Incomplete Cast envelope");
        if (type == STRING && payload.length > MAX_TEXT)
            throw new IOException("Cast JSON payload too large");
        return new CastV2Envelope(source, destination, namespace, type, payload);
    }

    static void write(DataOutputStream target, CastV2Envelope frame) throws IOException {
        if (frame == null || frame.payload == null || frame.payload.length > MAX_FRAME - 256 ||
                (frame.payloadType != STRING && frame.payloadType != BINARY))
            throw new IOException("Invalid outgoing Cast envelope");
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        varintField(out, 1, 0);
        asciiField(out, 2, frame.source);
        asciiField(out, 3, frame.destination);
        asciiField(out, 4, frame.namespace);
        varintField(out, 5, frame.payloadType);
        lengthField(out, frame.payloadType == STRING ? 6 : 7, frame.payload);
        byte[] raw = out.toByteArray();
        if (raw.length > MAX_FRAME) throw new IOException("Outgoing Cast frame too large");
        target.writeInt(raw.length);
        target.write(raw);
        target.flush();
    }

    private static void asciiField(ByteArrayOutputStream out, int field, String value) throws IOException {
        if (value == null || !value.matches("[a-zA-Z0-9.:_*\\-]{1,160}"))
            throw new IOException("Invalid outgoing Cast route");
        lengthField(out, field, value.getBytes(StandardCharsets.US_ASCII));
    }

    private static void lengthField(ByteArrayOutputStream out, int field, byte[] value) {
        varint(out, (field << 3) | 2);
        varint(out, value.length);
        out.write(value, 0, value.length);
    }

    private static void varintField(ByteArrayOutputStream out, int field, long value) {
        varint(out, field << 3);
        varint(out, value);
    }

    private static void varint(ByteArrayOutputStream out, long n) {
        while ((n & ~127L) != 0L) {
            out.write(((int) n & 127) | 128);
            n >>>= 7;
        }
        out.write((int) n);
    }

    private static Varint readVarint(byte[] raw, int pos) {
        long value = 0;
        for (int i = 0; i < 10; i++) {
            if (pos >= raw.length) return null;
            int octet = raw[pos++] & 255;
            if (i == 9 && (octet & 254) != 0) return null;
            value |= (long) (octet & 127) << (i * 7);
            if ((octet & 128) == 0) return new Varint(value, pos);
        }
        return null;
    }

    private static final class Varint {
        final long value;
        final int next;
        Varint(long value, int next) { this.value = value; this.next = next; }
    }

    String utf8() throws IOException {
        if (payloadType != STRING || payload.length > MAX_TEXT)
            throw new IOException("Expected small JSON payload");
        return new String(payload, StandardCharsets.UTF_8);
    }
}
