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
