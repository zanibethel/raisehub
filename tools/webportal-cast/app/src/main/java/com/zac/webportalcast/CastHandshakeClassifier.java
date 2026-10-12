package com.zac.webportalcast;

import java.util.Locale;

/**
 * Data-minimal transport classifiers. Never export raw handshake records,
 * SSL exception text, network addresses, peer certificates, or payloads.
 */
final class CastHandshakeClassifier {
    private CastHandshakeClassifier() {}

    static String firstRecord(byte[] data, int length) {
        if (data == null || length <= 0) return "peer closed before sending data";
        int first = data[0] & 255;
        if (length >= 3 && first == 22 && (data[1] & 255) == 3
                && (data[2] & 255) <= 4) return "TLS handshake record";
        if (length >= 3 && first == 21 && (data[1] & 255) == 3
                && (data[2] & 255) <= 4) return "TLS alert record";
        if (length >= 4 && data[0] == 'G' && data[1] == 'E'
                && data[2] == 'T' && data[3] == ' ') return "HTTP GET request";
        if (length >= 5 && data[0] == 'P' && data[1] == 'O'
                && data[2] == 'S' && data[3] == 'T'
                && data[4] == ' ') return "HTTP POST request";
        if (length >= 5 && data[0] == 'H' && data[1] == 'E'
                && data[2] == 'A' && data[3] == 'D'
                && data[4] == ' ') return "HTTP HEAD request";
        if (length < 5) return "incomplete initial record";
        if (first < 32 || first > 126) return "unrecognized binary initial record";
        return "unrecognized text initial record";
    }

    static String tlsFailure(Throwable error) {
        if (error == null) return "unspecified";
        StringBuilder clues = new StringBuilder(400);
        Throwable item = error;
        for (int depth = 0; depth < 5 && item != null; depth++, item = item.getCause()) {
            if (item.getMessage() != null) {
                // This text is used only for classification, never sent to a report.
                clues.append(' ').append(item.getMessage().toLowerCase(Locale.US));
            }
        }
        String s = clues.toString();
        if (has(s, "unknown_ca", "unknown ca", "certificate_unknown", "bad_certificate",
                "bad certificate", "certificate verify", "certificate_verify_failed",
                "trust anchor", "unable to find valid certification path"))
            return "certificate or trust alert";
        if (has(s, "no shared cipher", "no cipher suites in common",
                "no appropriate protocol", "no cipher suites", "insufficient security"))
            return "cipher suite incompatibility";
        if (has(s, "protocol_version", "unsupported protocol", "wrong version",
                "unsupported version", "tlsv1 alert protocol version"))
            return "TLS version incompatibility";
        if (has(s, "unrecognized ssl", "not an ssl", "not a tls",
                "wrong record type", "record overflow", "unsupported record"))
            return "invalid TLS record";
        if (has(s, "handshake_failure", "handshake failure"))
            return "generic TLS handshake failure alert";
        if (has(s, "unexpected message", "unexpected_message"))
            return "unexpected TLS message";
        if (has(s, "peer closed", "connection reset", "broken pipe",
                "connection closed", "close_notify", "end of stream", "eof"))
            return "peer closed during TLS";
        if (has(s, "certificate", "keymanager", "private key", "keystore"))
            return "local certificate/key operation or TLS certificate error";
        if (has(s, "handshake", "alert"))
            return "unclassified TLS handshake alert";
        return "other TLS failure";
    }

    private static boolean has(String message, String... values) {
        for (String value : values) if (message.contains(value)) return true;
        return false;
    }
}
