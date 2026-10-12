package com.zac.webportalcast;

import org.junit.Test;
import javax.net.ssl.SSLHandshakeException;
import javax.net.ssl.SSLProtocolException;
import java.io.IOException;
import static org.junit.Assert.*;

public final class CastHandshakeClassifierTest {
    @Test public void detectsTlsClientHandshakeRecord() {
        assertEquals("TLS handshake record", CastHandshakeClassifier.firstRecord(
                new byte[] {22, 3, 3, 0, 42}, 5));
    }

    @Test public void detectsTlsAlert() {
        assertEquals("TLS alert record", CastHandshakeClassifier.firstRecord(
                new byte[] {21, 3, 3, 0, 2}, 5));
    }

    @Test public void detectsHttpMethodsWithoutExportingPath() {
        assertEquals("HTTP GET request", CastHandshakeClassifier.firstRecord(
                new byte[] {'G','E','T',' ','/'}, 5));
        assertEquals("HTTP POST request", CastHandshakeClassifier.firstRecord(
                new byte[] {'P','O','S','T',' '}, 5));
        assertEquals("HTTP HEAD request", CastHandshakeClassifier.firstRecord(
                new byte[] {'H','E','A','D',' '}, 5));
    }

    @Test public void handlesShortAndUnknownRecords() {
        assertEquals("peer closed before sending data",
                CastHandshakeClassifier.firstRecord(new byte[0], 0));
        assertEquals("incomplete initial record",
                CastHandshakeClassifier.firstRecord(new byte[] {22, 3}, 2));
        assertEquals("unrecognized binary initial record",
                CastHandshakeClassifier.firstRecord(new byte[] {9, 9, 9, 9, 9}, 5));
    }

    @Test public void labelsGenericHandshakeAlertsWithoutClaimingCertificateFailure() {
        assertEquals("generic TLS handshake failure alert",
                CastHandshakeClassifier.tlsFailure(
                        new SSLHandshakeException("SSLV3_ALERT_HANDSHAKE_FAILURE")));
    }

    @Test public void distinguishesKnownCertificateAndCipherFailures() {
        assertEquals("certificate or trust alert",
                CastHandshakeClassifier.tlsFailure(
                        new SSLHandshakeException("TLSV1_ALERT_UNKNOWN_CA")));
        assertEquals("cipher suite incompatibility",
                CastHandshakeClassifier.tlsFailure(
                        new SSLHandshakeException("no shared cipher")));
        assertEquals("TLS version incompatibility",
                CastHandshakeClassifier.tlsFailure(
                        new SSLProtocolException("protocol_version")));
    }

    @Test public void examinesCauseChainButNeverReturnsRawExceptionContent() {
        SSLHandshakeException outer = new SSLHandshakeException("general SSL alert");
        outer.initCause(new IOException("certificate verify failed SECRET123"));
        String classified = CastHandshakeClassifier.tlsFailure(outer);
        assertEquals("certificate or trust alert", classified);
        assertFalse(classified.contains("SECRET123"));
    }
}
