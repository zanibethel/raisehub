# WebPortal Cast (Fire TV)

Independent, sideloadable receiver app, distinct from WebPortal (com.zac.webportal).

## Version 0.1.4 receiver capability

- **DLNA/UPnP AV MediaRenderer**, advertised using SSDP with a local HTTP device/service descriptor.
- Handles AVTransport `SetAVTransportURI`, `Play`, `Pause`, `Stop`, `Seek`, status inquiries, and basic volume control.
- Plays standard unprotected MP4, HLS, DASH and audio URLs with Media3 / Android decoders.
- D-pad remote playback controls, foreground-only receiver, no account, ads, subscription, or remote telemetry.
- Settings-free home screen with connection log and direct URL playback for testing.
- LAN-only service; no WAN port forwarding. Only start the app on a trusted home network.

**NOT YET IMPLEMENTED:** Google Cast/Chromecast receiver, Meta Quest direct casting, AirPlay, Miracast or DRM playback. Merely advertising a Chromecast service is not functional casting. Do not call this an AirScreen-equivalent APK yet.

### Build and install

GitHub Actions builds a separately signed release APK, plus a debug APK for pull requests, without touching WebPortal:

```sh
cd tools/webportal-cast
gradle :app:assembleDebug
adb connect FIRE_TV_IP:5555
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Cast V2 TLS transport diagnostics (v0.1.4)

**Purpose:** Investigate why Meta Quest discovers and connects to the experimental WebPortal Cast TEST receiver but reports a casting error. This is an opt-in, foreground-only probe, **not** a working Chromecast receiver.

- AndroidKeyStore creates a local test-only, self-signed RSA certificate on the Fire TV. No Google-issued Cast identity, certificate, private keys, or hardware credentials are used. The identity is intentionally untrusted; Quest may reject it at TLS or device authentication.
- Cast test DNS-SD advertisement is published only after the temporary TLS listener starts. Each inbound TCP connection gets a local session index, no sender IP is retained.
- TLS probes report handshake started, completed, failed, interrupted, or timed out. If TLS succeeds, a bounded Cast V2 framed protobuf parser extracts only the `namespace` field. Device-authentication challenges are recognized, not answered or forged. Probes stop after six frames, a 64-KB frame limit and limited read/handshake timeouts.
- Reports show TLS counts and non-sensitive failure categories, never raw packets, device IDs, sender addresses, payloads, credentials, keys, media URLs, or gameplay footage. No cloud transmission or persistent logging. QR local-network export remains available.
- Expected Quest behavior: connection may fail at TLS verification, certified-device authentication, or unimplemented control/streaming steps. A successful TLS handshake **does not** mean screen casting works or that the Quest authenticated us.
- **Test**: install v0.1.4 with the in-app updater; open Cast Diagnostics → Start new test; choose WebPortal Cast TEST on Quest → Chromecast; capture the Quest's error; Stop test; scan the report QR from a phone on the same Wi-Fi; paste the new report into ChatGPT.
- This phase is transport diagnostics only, with no certificate spoofing, encrypted traffic interception, packet payload capture, or stream decoding. A Google Cast-compliant receiver may require official certification and cannot be fabricated by naming a DNS-SD service.

### Approved Fire TV branding (v0.1.3)

- Launcher icon: approved cyan/blue portal-play symbol only (no miniature words), 256x256 WebP with dark navy background and clear safe-area margins.
- Fire TV/Android TV banner: 320x180 WebP with a full WebPortal Cast wordmark and safe margins. Set through `android:banner="@drawable/tv_banner"`.
- In-app landing header displays the matching mark at fixed size with readable native text rather than scaling a wordmark down.
- Assets are in `app/src/main/res/drawable`; they do not alter application ID, release signing, updater or Quest diagnostics.

### Quest connection report (v0.1.2)

Open **Cast Diagnostics** on the Fire TV receiver home screen, select **Start new test**, then open the Meta Quest casting picker and attempt to select **WebPortal Cast TEST**, if listed. The temporary experiment:
- Advertises `_googlecast._tcp.` under an unmistakably experimental name and counts inbound TCP connections. Since v0.1.4 it also probes TLS and bounded Cast V2 namespaces using a local self-signed certificate; it cannot authenticate as a Google device.
- Watches DNS-SD for nearby Cast receivers such as AirScreen, so you can see local Cast discovery results from **our app**, rather than needing a screenshot from a competitor.
- Captures receiver-side SSDP M-SEARCH, DLNA descriptor requests, SOAP control actions and error status; logs media player activity/error codes. Discovery does **not** prove the Quest found our test receiver or that streaming will work.
- Generates a timestamped, structured report with app version, Android device info, a category count summary, and a bounded event timeline. No headset IPs, raw network packets, passwords, credentials, media URLs, audio or video are captured. Nearby receiver names can be identifying; review before sharing.
- Shows an offline-generated QR code and local HTTP address. Scan on a phone **on the same Wi-Fi** to open the report as copyable text. A fresh cryptographically random access token is created each session. The report exists only while the receiver app is open; the app never uploads reports to external services.
- **Stop test** tears down the experimental Cast advertisement/TCP listener while preserving the report for review. Leaving the app pauses the probe; returning and pressing **Start new test** begins a new session.

This probe detects only connections to the experimental receiver and discovery signals accessible on the TV. It cannot inspect encrypted AirScreen communications, prove that Quest's internal casting checks will pass, or implement certified Cast authentication/game streaming.

### Built-in updater

- v0.1.1 adds **Check for updates** to the receiver home screen. Checks automatically on opening the app; updates are user-controlled.
- The app loads the GitHub release manifest (version code/name, expected file size, asset SHA-256 digest and a matching metadata checksum). It offers **Download & install** only when the release versionCode is higher than the installed versionCode.
- Downloads stay in app-private cache. SHA-256, APK package name, embedded versionCode, and Android signing certificate are compared against the installed release.
- Android/Fire OS installer approval is always required. On Android 8+, the first install may need Settings > Install unknown apps > WebPortal Cast.
- A debug-signed prototype cannot upgrade in place to the persistently signed public release; uninstall the debug prototype and install `https://raisehub.app/cast` once.
- Preserve `applicationId = com.zac.webportalcast` and the same permanent release keystore. Increase `versionCode` for every release. The GitHub release publisher rejects non-increasing versions.
- The stable Downloader URL is `https://raisehub.app/cast` and the **subsequent** upgrades are launched inside the TV app.
- The release body contains machine-readable `Version-Code`, `Version-Name` and `SHA256` lines, matched to GitHub's asset digest, to avoid serving a partially published update.

Keep the app open while running a receiver/diagnostic session. DLNA discovery stops when it is closed.

### Acceptance testing

1. Sideload on Fire TV with both TV and sender connected to same home network (no guest/AP isolation).
2. Confirm home page says "DLNA receiver active", showing a LAN address and unique device identity.
3. From a DLNA control-point, look for **WebPortal Cast**, and send an unencrypted MP4 stream. Verify video *and* audio.
4. Test pause, resume, seek, stop and disconnect. Confirm the receiver log is clear and a stopped stream returns to home.
5. Repeat on Fire TV after a restart and with Wi-Fi reconnect.
6. Meta Quest direct casting is an explicit **pending** test; it will not work until a standards-compatible Cast mirroring transport/auth solution is implemented.

### Protocol & security notes

The HTTP listener serves fixed UPnP service descriptors and a tiny allowlisted SOAP control surface; it is not a general proxy or internet-facing server. URL playback is restricted to http/https and only accepts URLs explicitly supplied via local remote or LAN control requests. XML input is size capped and no arbitrary entity expansion is allowed. No media or credentials are stored.

Production CI uses the persistent release key and compares the signer against the existing release to preserve in-place update compatibility.

### Next protocol milestones

- Validate actual device discovery and DLNA interoperability.
- Add event subscriptions (GENA) and broader controller compatibility.
- Investigate the Quest's *actual* sender choice against AirScreen (Cast receiver discovery + authenticated Cast V2 / Cast Streaming vs Meta's browser WebRTC flow). Quest’s built-in Cast client may refuse uncertified devices.
- Consider a separately installed, user-consented Quest capture sender only if reliable native casting cannot be achieved without proprietary credentials.
- Add AirPlay independently under correctly attributed open-source licenses.
