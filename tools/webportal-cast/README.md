# WebPortal Cast (Fire TV)

Independent, sideloadable receiver app, distinct from WebPortal (com.zac.webportal).

## Version 0.1 receiver capability

- **DLNA/UPnP AV MediaRenderer**, advertised using SSDP with a local HTTP device/service descriptor.
- Handles AVTransport `SetAVTransportURI`, `Play`, `Pause`, `Stop`, `Seek`, status inquiries, and basic volume control.
- Plays standard unprotected MP4, HLS, DASH and audio URLs with Media3 / Android decoders.
- D-pad remote playback controls, foreground-only receiver, no account, ads, subscription, or remote telemetry.
- Settings-free home screen with connection log and direct URL playback for testing.
- LAN-only service; no WAN port forwarding. Only start the app on a trusted home network.

**NOT YET IMPLEMENTED:** Google Cast/Chromecast receiver, Meta Quest direct casting, AirPlay, Miracast or DRM playback. Merely advertising a Chromecast service is not functional casting. Do not call this an AirScreen-equivalent APK yet.

### Build and install

GitHub Actions builds a separate debug APK for this module, without touching WebPortal:

```sh
cd tools/webportal-cast
gradle :app:assembleDebug
adb connect FIRE_TV_IP:5555
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

For this first release, keep the app open. DLNA discovery stops when it is closed.

### Acceptance testing

1. Sideload on Fire TV with both TV and sender connected to same home network (no guest/AP isolation).
2. Confirm home page says "DLNA receiver active", showing a LAN address and unique device identity.
3. From a DLNA control-point, look for **WebPortal Cast**, and send an unencrypted MP4 stream. Verify video *and* audio.
4. Test pause, resume, seek, stop and disconnect. Confirm the receiver log is clear and a stopped stream returns to home.
5. Repeat on Fire TV after a restart and with Wi-Fi reconnect.
6. Meta Quest direct casting is an explicit **pending** test; it will not work until a standards-compatible Cast mirroring transport/auth solution is implemented.

### Protocol & security notes

The HTTP listener serves fixed UPnP service descriptors and a tiny allowlisted SOAP control surface; it is not a general proxy or internet-facing server. URL playback is restricted to http/https and only accepts URLs explicitly supplied via local remote or LAN control requests. XML input is size capped and no arbitrary entity expansion is allowed. No media or credentials are stored.

For deployment: replace debug signing with a persistent release keystore; do not silently replace the existing WebPortal signing key.

### Next protocol milestones

- Validate actual device discovery and DLNA interoperability.
- Add event subscriptions (GENA) and broader controller compatibility.
- Investigate the Quest's *actual* sender choice against AirScreen (Cast receiver discovery + authenticated Cast V2 / Cast Streaming vs Meta's browser WebRTC flow). Quest’s built-in Cast client may refuse uncertified devices.
- Consider a separately installed, user-consented Quest capture sender only if reliable native casting cannot be achieved without proprietary credentials.
- Add AirPlay independently under correctly attributed open-source licenses.
