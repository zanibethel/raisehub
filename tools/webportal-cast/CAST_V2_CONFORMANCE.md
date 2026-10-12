# Cast V2 interoperability audit — October 12, 2026

## Target
Meta Quest built-in Chromecast casting menu to WebPortal Cast on Amazon AFTMM (Fire OS 5 / Android API25), with no Quest app, no extra browser sign-in, no vendor contact, and no subscription.

## Evidence from physical hardware
- v0.2.1: 5 successful TLSv1.2 sessions, 5 device-authentication challenges, 5 explicit protocol error replies, 0 post-auth controls.
- v0.2.2: 6 successful TLSv1.2 sessions, 6 locally signed nonce+TLS-cert responses, 0 post-auth controls, 0 heartbeats. Each sender subsequently closed.
- Session #1 of v0.2.2 sent CONNECT, GET_APP_AVAILABILITY and GET_STATUS **before** its authentication challenge. We previously ignored GET_APP_AVAILABILITY. This pre-auth activity is not proof that any sender authenticated our untrusted device identity.
- The original local TLS self-test passed, but TLS is not certified Cast device authentication.
- Last production version 0.2.3 adds an optional Meta Web browser shortcut, not native mirroring. This conformance branch is not yet deployed.

## Specific protocol corrections staged here
1. Answer the observed GET_APP_AVAILABILITY with an exact requestId and the documented responseType/availability schema. Since there is no native Cast mirroring app to launch, report each requested app ID as APP_UNAVAILABLE rather than falsely advertising support. Bound the number and size of identifiers and reject unsafe input.
2. Stop assuming protobuf fields arrive in numbered order. Defer payload/string-type validation until the entire CastMessage is parsed.
3. Recognize the officially defined CastMessage protocol version values 0, 1, 2, 3 when frames are complete. Explicitly reject continued/chunked frames since reassembly is unimplemented.
4. Unit-test reordered fields, known unchunked versions, chunk rejection, app-availability JSON shape and invalid identifiers.

## Hard boundary
Chromium Cast sender authentication verifies receiver device-auth certificates against its trusted Cast roots. A locally generated key can sign the expected bytes yet never chain to Google's trusted Cast CA. The six immediate post-response disconnects are consistent with that requirement but do not disclose the Quest's precise internal rejection reason.

No private hardware keys, precomputed signatures from proprietary software, impersonated device identities or certification bypasses will be introduced. Adding video decoding first would not resolve sender trust.

## Controlled sender validation (staged in this draft PR)

A standalone **Java 17**, JDK-only sender now lives at
`tools/webportal-cast/devtools/CastControlledSender.java`. It requires no
Quest app, Google API or third-party dependency. It has two modes:

**GitHub Actions offline mode (fully automated for PRs):** a temporary
48-hour RSA/PKCS#12 test certificate is created by `keytool`, and a local
loopback TLS fixture answers Cast V2 messages. The sender then verifies
the exact SHA-256 certificate fingerprint (and deliberately rejects a
wrong fingerprint), `GET_APP_AVAILABILITY`, `GET_STATUS`, the sender nonce
and authenticated RSA/SHA256 signature over `nonce || TLS_cert_DER`, and
a heartbeat PING/PONG. This proves the independent sender and its
controlled fixture interoperate; it is **not yet a hardware-in-the-loop
test of the actual Android receiver**. The existing Android unit tests
verify the receiver's separate auth serializer and envelope handling.

**Optional later LAN hardware mode (only after a signed diagnostic
update):** the draft receiver adds the **public** identity fields
`TLS_TEST_SHA256` (64-hex character SHA-256 of its locally generated
test TLS certificate) and `CAST_TEST_PORT` (ephemeral listener port)
to the retained Cast Diagnostics report. The Fire TV's local IPv4 address
can be determined from the existing DLNA/report address in the app. From
a trusted computer on the same LAN with Java 17:

```sh
cd tools/webportal-cast
mkdir -p /tmp/cast-controlled-classes
javac --release 17 -d /tmp/cast-controlled-classes \
    devtools/CastControlledSender.java

java -cp /tmp/cast-controlled-classes \
    com.zac.webportalcast.devtools.CastControlledSender \
    --host FIRE_TV_PRIVATE_IPV4 \
    --port PORT_FROM_CAST_TEST_PORT \
    --tls-cert-sha256 64_HEX_FROM_TLS_TEST_SHA256
```

The sender strictly permits only RFC1918/loopback IPv4, uses TLS 1.2,
requires explicit certificate pinning, never ignores a mismatch, and
verifies the Cast auth signature *cryptographically*. It then sends
post-auth heartbeat and status messages under the developer's own
explicit, local trust policy. The production Quest sender has no such
custom trust setting.

**Do not run the LAN mode against today's released v0.2.3: it has not
yet been updated to expose these public test values or include this
draft's app-availability fix.** No production APK has been published as
part of this work. Once CI and controlled-device feasibility justify
a release, install a signed debug/production build through the
existing compatible update path and confirm the report then.

## Next engineering gate
1. Keep this PR as draft. Run unit tests/build to check our code without asking for repeated device installs.
2. Validate the control protocol using a separately developed sender whose trust configuration explicitly accepts an app-owned test cert. This does not change stock Quest behavior.
3. If the controlled sender passes and stock Quest still rejects, classify native casting as blocked by trusted device identity until a supported path is found. If the controlled sender fails, fix the exact observed protocol error, not a speculative certificate tweak.
4. Do not publish a new Fire TV APK solely to get another certificate rejection.

## Public references
- Official Cast protobuf: https://chromium.googlesource.com/openscreen/+/refs/heads/main/cast/common/channel/proto/cast_channel.proto
- Streaming session app availability schema: https://chromium.googlesource.com/openscreen/+/refs/heads/main/cast/protocol/streaming_session_protocol.md
- Receiver conformance test: https://chromium.googlesource.com/openscreen/+/refs/heads/main/cast/receiver/application_agent_unittest.cc
- Cast sender authentication verifier: https://chromium.googlesource.com/openscreen/+/refs/heads/main/cast/sender/channel/cast_auth_util.cc
- Independent open-source receiver documenting trusted-cert blocker: https://github.com/yukarikaname/openchromecast
