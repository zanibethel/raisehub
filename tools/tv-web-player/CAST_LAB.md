# WebPortal Cast Lab — Phase 1

**Status:** Local-network feasibility test only. **Not a functional Chromecast, Google Cast, AirScreen replacement, or Quest casting receiver.**

## Why this exists

Meta Horizon's website loads in WebPortal, but WebRTC diagnostics showed multiple local offers without a remote session description. Further Android WebView user-agent changes did not fix that.

A native Quest casting receiver needs more than DNS-SD discovery. A real sender may demand Cast V2 TLS, trust-chain/device authentication, Cast Streaming control and media handling. Certification or registration cannot be replaced with invented credentials.

## Phase 1 behavior

Open **WebPortal → Menu → Cast Lab (experimental)** and choose **Start receiver test**.

* Registers an explicitly experimental Google Cast DNS-SD service named **WebPortal Cast Lab** on the local network.
* Starts a simple TCP listener on a dynamically chosen port. Counts inbound connection attempts only; does not perform TLS, authentication, Cast V2 framing, streaming, or video/audio decoding.
* Discovers nearby Google Cast DNS-SD service names, including AirScreen when running and advertising that service.
* Shows only local, privacy-safe event messages. Does not retain packet contents, credentials, addresses, or media; does not send telemetry.
* Releases the multicast lock, unregisters discovery/advertisement and closes the listener on Stop or leaving the activity.

The test **does not claim successful casting** if the headset lists WebPortal. Device authentication and streaming must be verified separately.

## Fire TV / Quest manual test

1. Put Fire TV and Quest on the same home Wi-Fi, with AirScreen closed for the first attempt.
2. Open Cast Lab and press Start receiver test.
3. In Quest, inspect available Cast destinations. Look for WebPortal Cast Lab.
4. If shown, select it once. An incoming TCP attempt will appear in the event panel. The connection is expected to fail at the unimplemented receiver protocol stage.
5. Capture the Cast Lab event panel and whether the Quest displayed the receiver.
6. If it wasn't visible, start AirScreen, restart the Cast Lab scan, and compare whether AirScreen appears as a nearby service.
7. Press Stop. Do not leave the experiment advertising in the background.

## Decision gates

* No local discovery: investigate Fire OS local networking permissions, Wi-Fi AP isolation, and multicast.
* Quest discovers lab but rejects it: prioritize Cast device authentication compatibility. Do not build video decoding yet.
* Quest sees AirScreen but not lab: compare advertisement records and Cast behavior, without copying private device identities or certificates.
* Standards-compliant connection is achieved: implement streaming control and codec negotiation as a separate opt-in module. Reuse WebPortal Media3 playback where possible.

## References

* https://developer.android.com/reference/android/net/nsd/NsdManager
* https://developers.google.com/cast/docs/get-started
* https://github.com/googlecast/openscreen
* https://github.com/yukarikaname/openchromecast

Never extract Cast private keys, impersonate certified devices or weaken receiver authentication.
