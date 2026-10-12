package com.zac.webportalcast;

import java.net.Socket;
import java.security.Principal;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;

import javax.net.ssl.SSLEngine;
import javax.net.ssl.X509ExtendedKeyManager;

/**
 * Explicitly binds the test TLS listener to its single app-owned local key.
 *
 * AndroidKeyStore still contains older experimental keys from previous
 * versions. A generic KeyManagerFactory may choose a different RSA alias,
 * causing the pinned loopback client to see the wrong certificate.
 *
 * Not a Google Cast device identity; never exposes or exports key bytes.
 */
final class CastTestKeyManager extends X509ExtendedKeyManager {
    private final String alias;
    private final PrivateKey key;
    private final X509Certificate certificate;

    CastTestKeyManager(String alias, PrivateKey key, X509Certificate certificate) {
        if (alias == null || alias.isEmpty() || key == null || certificate == null)
            throw new IllegalArgumentException("Complete local test TLS identity required");
        this.alias = alias;
        this.key = key;
        this.certificate = certificate;
    }

    private boolean serverRsa(String keyType) {
        return "RSA".equals(keyType);
    }

    @Override public String[] getClientAliases(String keyType, Principal[] issuers) {
        return null;
    }
    @Override public String chooseClientAlias(String[] keyTypes, Principal[] issuers, Socket socket) {
        return null;
    }
    @Override public String chooseEngineClientAlias(String[] keyTypes, Principal[] issuers, SSLEngine engine) {
        return null;
    }
    @Override public String[] getServerAliases(String keyType, Principal[] issuers) {
        return serverRsa(keyType) ? new String[]{alias} : null;
    }
    @Override public String chooseServerAlias(String keyType, Principal[] issuers, Socket socket) {
        return serverRsa(keyType) ? alias : null;
    }
    @Override public String chooseEngineServerAlias(String keyType, Principal[] issuers, SSLEngine engine) {
        return serverRsa(keyType) ? alias : null;
    }
    @Override public X509Certificate[] getCertificateChain(String requestedAlias) {
        return alias.equals(requestedAlias) ? new X509Certificate[]{certificate} : null;
    }
    @Override public PrivateKey getPrivateKey(String requestedAlias) {
        return alias.equals(requestedAlias) ? key : null;
    }
}
