# WebPortal Cast (Fire TV)

Independent, sideloadable receiver app, distinct from WebPortal (com.zac.webportal).

## Version 0.2.4 receiver capability

- **DLNA/UPnP AV MediaRenderer**, advertised using SSDP with a local HTTP device/service descriptor.
- Handles AVTransport `SetAVTransportURI`, `Play`, `Pause`, `Stop`, `Seek`, status inquiries, and basic volume control.
- Plays standard unprotected MP4, HLS, DASH and audio URLs with Media3 / Android decoders.
- D-pad remote playback controls, foreground-only receiver, no account, ads, subscription, or remote telemetry.
- Settings-free home screen with connection log and direct URL playback for testing.
- LAN-only service; no WAN port forwarding. Only start the app on a trusted home network.

**Now experimental:** Meta Quest **direct casting through a separately sideloaded Quest companion APK**, using user-approved MediaProjection, hardware H.264 video, and AES-GCM authenticated/encrypted local transport. This is a first hardware-test preview, not a verified replacement for AirScreen. **Not yet implemented:** native Quest Chromecast destination casting, Google Cast certified receiver, AirPlay, Miracast, captured game audio, DRM video.

### Build and install

GitHub Actions builds a separately signed release APK, plus a debug APK for pull requests, without touching WebPortal:

```sh
cd tools/webportal-cast
gradle :app:assembleDebug
adb connect FIRE_TV_IP:5555
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Physical Fire TV on-device Cast control self-test (v0.2.4)

**Reason:** The independent Java 17 controlled sender passed in GitHub CI with a simulated TLS Cast receiver, but until v0.2.4 we had not run the equivalent full protocol roundtrip through Fire TV's actual AndroidKeyStore + TLS Cast listener. A locally controlled sender uses a self-owned certificate pin; this DOES NOT mean the stock Quest will trust WebPortal Cast.

**One-device hardware test — no Mac/PC and no Quest required:**
1. Upgrade the Fire TV app to 0.2.4 via its normal in-app updater (persistent APK signing identity preserved). Open **Test Quest's built-in Chromecast connection** → **Start new test**.
2. The TV automatically opens a **loopback-only** SSL client to its actual Cast TLS listener. This independently pins the exact on-device self-owned TLS certificate and then requests virtual CONNECT, GET_APP_AVAILABILITY (honest APP_UNAVAILABLE), GET_STATUS (no applications), signed nonce + TLS certificate deviceauth response, and heartbeat PING/PONG, then closes.
3. On the report screen, look for **Real TV V2 test: PASS** or **FAIL** and the event **V2_SELFTEST_OK** or **V2_SELFTEST_FAIL**. Send the QR report if failed; it includes the failing stage and exception class, **not** any credentials, keys or media. The loopback test's artificially generated contact/TLS/Cast events are excluded from Quest session counters.
4. End the test. There is **no need** to run the Quest native Cast menu for this test, because that would just repeat the observed six authentication disconnects with an uncertified local identity.

A PASS validates the Fire TV's real Cast transport and control-message implementation **under the explicit local trust policy**. It does not demonstrate acceptance by the Quest or gameplay mirroring. A FAIL provides an actionable receiver implementation stage to fix. No outside server, Meta login, or Quest companion app is used; no video is captured.

The existing desktop Java controlled sender in `devtools/CastControlledSender.java` remains an optional independent client for manual later LAN tests, using the TLS public SHA-256 fingerprint and ephemeral listener port in diagnostic reports. No hardware certificate export or universal trust change.

Upstream compatibility note: Open Screen's [streaming schema](https://chromium.googlesource.com/openscreen/+/refs/heads/main/cast/protocol/streaming_session_protocol.md) uses `responseType` for `RECEIVER_STATUS`, while a [current receiver unit test](https://chromium.googlesource.com/openscreen/+/refs/heads/main/cast/receiver/application_agent_unittest.cc) expects `type`. WebPortal Cast v0.2.4 sends both names to maximize compatibility without claiming native Cast certification.

### Quest's built-in Web casting through Silk (v0.2.3)

**Purpose:** Provide a legitimate Fire TV-only experiment for native headset screen capture **without a Quest companion APK**, using the Quest's built-in **Cast → Web** option. This is distinct from selecting a Chromecast receiver; the official Meta browser stream uses Meta's hosted casting page. The user asked for a no-sideloaded-headset experience and previously reported successful Quest → AirScreen mirroring but timed out on AirScreen's free tier.

**Important previous attempt:** The separate WebPortal Android 7 embedded WebView (v1.9.8–1.9.11) spoofed a desktop Chrome user-agent, displayed Meta's casting page, then showed "Casting stopped". Diagnostics there reported missing remote SDP. The new experiment **does not repeat that implementation**: it opens Meta's official page directly in Amazon Silk, a separately maintained Chromium-based browser on Fire TV.

**User flow:**
1. Open WebPortal Cast 0.2.3 on Fire TV.
2. Choose **Try Quest Web casting through Amazon Silk**, review the explanatory dialog, and choose **Open Meta Casting**.
3. The app tries the installed Amazon Silk package first, then the system browser resolver. It never embeds Meta login in its app or reads cookies.
4. On the browser page at `https://horizon.meta.com/casting/`, sign in directly to Meta if required, enable desktop-site mode if the page requests a desktop browser.
5. On the headset, use its built-in **Cast → Web** (not the Chromecast destination). No headset APK, no app pairing key.
6. Observe whether the page receives a video stream, shows a compatibility warning, or returns "Casting stopped." If it works, try fullscreen in Silk and capture only a description of the result. If the browser is missing, WebPortal Cast reports that it must be enabled or installed.

This is an **experimental launcher**, not a newly implemented custom Cast receiver or a guaranteed solution. It relies on the Meta-hosted web service, an existing Fire TV browser, a user-initiated Meta login and Silk's media capability. Meta documents browser casting as using its cloud service, so this route is **not** fully local. We do not send credentials, store video, inject JavaScript into Meta, spoof a browser identity, intercept network connections or open arbitrary external sites.

**References:** [Meta support on Web casting](https://communityforums.atmeta.com/discussions/OtherTroubleshooting/a-question-about-the-casting-function/1344561), [Amazon Silk developer documentation](https://docs.aws.amazon.com/silk/latest/developerguide/what-is-silk.html), [Fire TV Silk remote controls](https://digprjsurvey.amazon.com/csad/help/node/TZ6CJ7nVQJW26yiItl).

**Trust boundary:** Quest native **Cast → Chromecast** still cannot complete our certified receiver authentication. The v0.2.2 hardware report showed six signed replies, six disconnections, and no post-auth controls. The relevant Open Screen validation [requires a Cast trust root](https://chromium.googlesource.com/openscreen/+/refs/heads/main/cast/sender/channel/cast_auth_util.cc); another self-signed key won't satisfy it. Keep this diagnostic feature for protocol learning, but do not claim Silk creates a Chromecast destination.

### Self-owned Cast deviceauth compatibility experiment (v0.2.2)

**Why:** v0.2.1 on Amazon AFTMM (Android API 25) showed five real TLS 1.2 sessions, five Cast device-authentication challenges, and five protocol `AuthError` replies from our TV. All senders closed immediately afterward, before heartbeat, launch or media negotiation. This did not test whether a sender would accept a correctly formed response using an **untrusted, app-owned** credential.

**Experimental response:**
- Generate a **separate**, local-only AndroidKeyStore RSA identity (new alias) and TLS certificate that expires in **two days**, below the four-day remaining-TLS-cert limit imposed by several Chromium Cast sender implementations. Rotate just this app-owned test identity when it is about to expire; leave older diagnostic keys untouched.
- Permit SHA-1 and SHA-256 RSA signing for this narrowly scoped compatibility test (legacy protobuf default SHA-1; modern challenge may request SHA-256). No private key, credentials or certificate data are exported.
- Strictly parse `DeviceAuthMessage.challenge` including optional `signature_algorithm`, `sender_nonce` and `hash_algorithm` (with bounded metadata). Respond with a protobuf `DeviceAuthMessage.response` carrying our own certificate, RSA signature and echoed nonce and algorithm values. **Signed input** is exactly `sender_nonce || TLS_certificate_DER`, matching the public Cast sender validation logic. Verify the signature locally before sending.
- For unknown algorithms or failures, return an explicit error; never invent signed Google-issued identity, intermediate CAs, device policies or proof of Cast certification.
- Record `V2_AUTH_CHALLENGE`, `V2_AUTH_RESPONSE_LOCAL`, `V2_POST_AUTH_TRAFFIC`, `V2_AUTH_SIGN_FAIL`, `V2_AUTH_UNSUPPORTED`. Distinguish sent replies from certified/accepted authentication. A following heartbeat/status indicates **progress**, not proof the sender trusts our certificate.
- Keep current heartbeat/status handling and refuse nonexistent app launch or media streaming support. **No video or audio mirroring is added** by this experiment.

**Hardware test:** Update only the Fire TV APK to 0.2.2. Select **Test Quest's built-in Chromecast connection** → Start new test. On Quest use its native Cast → Chromecast menu and select **WebPortal Cast TEST**. End the test after the result and share the QR report. Check especially `TLS_SELFTEST_OK`, `V2_AUTH_RESPONSE_LOCAL`, `V2_POST_AUTH_TRAFFIC` and `V2_END`. A rejection of the self-owned credential would indicate a hard trust barrier rather than a transport bug.

Protocol reference: https://chromium.googlesource.com/openscreen/+/refs/heads/main/cast/common/channel/proto/cast_channel.proto . Sender verification reference: https://chromium.googlesource.com/openscreen/+/refs/heads/main/cast/sender/channel/cast_auth_util.cc .

This is a deliberately uncertified diagnostic identity. The optional Quest companion added in 0.2.0 remains a separate fallback, not required for this test.

### Quest built-in Chromecast V2 control handling (v0.2.1)

**Goal:** Move toward AirScreen-style casting that uses the Quest's existing **Cast → Chromecast** screen, with **no sideloaded Quest companion**. This is an incremental native-sender compatibility investigation, not a working Google-certified Chromecast or game-mirror receiver.

The Fire TV v0.1.9 hardware test confirmed AndroidKeyStore RSA signing, a passing local TLS test, three TLSv1.2 connections and three Cast V2 deviceauth namespace messages from nearby senders. We previously closed each socket immediately after inspecting that namespace, so we could not distinguish subsequent Cast V2 control traffic.

- Strict bounded reader/writer for Cast V2 framed protobuf `CastMessage` fields: protocol version, source/destination, namespace, UTF-8 JSON / binary payload, maximum 64 KiB per frame and 8 KiB JSON.
- On each authenticated **TLS transport** socket, handle Cast virtual `CONNECT/CLOSE`, heartbeat `PING/PONG`, and `GET_STATUS` with an honest idle `RECEIVER_STATUS` (no launched applications). Connection sessions have message/time/read limits and never export arbitrary sender messages.
- Distinguish the device-authentication **challenge received** from **device authentication succeeded**. The app has no Google-issued receiver certificate, so it responds with a protocol-defined `AuthError.INTERNAL_ERROR` (explicit lack of authenticated device identity), and never forges device credentials, signed responses or app launch success.
- Unexpected native `LAUNCH` requests receive idle status instead of fictitious success. Unexpected streaming `OFFER` gets `ANSWER` with an explicit unsupported-transport error; we do **not** announce a UDP port or pretend to support mirroring RTP/RTCP.
- Event labels retain numeric `V2_` prefixes (previous bug stripped the `2`), report auth challenges and auth-error responses independently, and retain critical milestones even if control events recur.
- **Fire TV test only:** Update WebPortal Cast to v0.2.1, open the **Test Quest's built-in Chromecast connection** button, Start new test, then use the built-in Quest casting menu to choose **WebPortal Cast TEST**. Stop the test after the Quest's result, send the QR report. Pay attention to `V2_AUTH_CHALLENGE`, `V2_AUTH_ERROR`, `V2_CONNECT`, `V2_HEARTBEAT`, `V2_STATUS`, `V2_LAUNCH_UNSUPPORTED`, `V2_OFFER_UNSUPPORTED`. Do not share sender credentials or personal media.
- **Hard limitation:** Google's Cast authentication can require Google-issued device certificates; a self-signed Android certificate is not a substitute. If the headset refuses after deviceauth, implementing more heartbeat/streaming code alone will not solve certified receiver identity. Receiver-side RTP/RTCP video and audio implementation remains separate future work, only relevant if the native Quest sender accepts the receiver.

References: [Chromium Cast V2 protobuf](https://chromium.googlesource.com/chromium/src/+/main/components/cast_channel/proto/cast_channel.proto) and [Open Screen Streaming Session Protocol](https://chromium.googlesource.com/openscreen/+/refs/heads/main/cast/protocol/streaming_session_protocol.md).

The optional companion APK introduced in 0.2.0 remains a separate **fallback**; it is *not required to run the built-in Quest casting diagnostics*. Existing DLNA, UI Screen Fit/focus, receiver video preview and updater/signing behavior remain unchanged.

### Quest Direct Cast video MVP (v0.2.0 TV + v0.1.0 Quest companion)

The previous v0.1.9 Fire TV local TLS check and the three incoming Quest connections succeeded, all negotiating TLS 1.2 and reaching the Cast `deviceauth` namespace. This still does **not** make WebPortal Cast an authenticated or certified Chromecast receiver. We instead added our own direct sender and receiver path, **separate from Cast Diagnostics**.

**Two apps:**
- **Fire TV:** `com.zac.webportalcast`, version 0.2.0, the in-place update to the existing WebPortal Cast signed release. Home → **Receive Quest direct video (no Chromecast)** shows a LAN IPv4 address, one-time 12-character code, and live H.264 video surface. Back or Return Home closes the session. The TCP receiver listens only while this screen is displayed. One sender at a time; maximum five failed pairing attempts per session.
- **Meta Quest:** `com.zac.webportalquest`, version 0.1.0, a new separate Android APK `WebPortalQuestCast.apk` published alongside the TV app. Sideload using ADB, SideQuest, or your trusted device installer. Open it from Quest apps (possibly under Unknown Sources), enter the TV's IPv4 address and 12-character code, then select **Approve capture & Start Casting** and explicitly approve the headset's system MediaProjection prompt. The companion foreground service keeps capturing after leaving the app; **STOP CASTING** in the companion or its persistent system notification ends the session.

**Pipeline and privacy:**
- Meta Horizon OS officially supports `MediaProjection` for user-consented casting, live streaming, or screen sharing: https://developers.meta.com/vr/documentation/native/native-media-projection/
- Hardware `video/avc` encoder feeds a 1280×720/30 fps target (2.5 Mbps CBR, I-frame at least once per second), then video samples are sent via TCP port **8765**. Fire OS MediaCodec decodes to a `SurfaceView`.
- A fresh **12-character hexadecimal pairing code** (48 bits) is displayed by the TV for each receiver session and never sent over the wire. Both endpoints derive a session key via PBKDF2 (40k iterations) and a fresh 16-byte server random challenge; HMAC-SHA256 authenticates possession of the code. Every H.264 payload is encrypted and authenticated via **AES-128-GCM** with per-session nonce and strictly increasing frame counter. Key material stays in memory only. No cloud relay, account, analytics, media storage, raw packet log, or credentials collection.
- Both endpoints restrict connections to private RFC1918 IPv4 addresses. **Only use a trusted home LAN.** The pairing flow is a prototype, not a formally audited secure protocol. Avoid untrusted public/shared Wi-Fi; future versions should move to an established WebRTC/DTLS-SRTP implementation or independently audited transport.
- Video only at this stage; no audio capture or codec negotiation. Allow for hardware decoder and Meta compositor differences. An initial pairing success does **not** guarantee correct imagery on all Quest/Fire OS versions.

**Build / install:**

```sh
cd tools/webportal-cast
gradle :protocol:test :app:assembleDebug :quest:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk       # Fire TV
adb install -r quest/build/outputs/apk/debug/quest-debug.apk   # Meta Quest
```

Production Fire TV APK download: https://raisehub.app/cast
Production Quest companion APK: https://github.com/zanibethel/raisehub/releases/download/webportal-cast/WebPortalQuestCast.apk

The TV production workflow signs *both* APKs (different package IDs) with the existing persistent release key; the Fire TV in-app updater still validates the regular `WebPortalCast.apk` and its SHA256. The companion is a fresh installation and **does not inherit the TV update screen**.

**Testing / troubleshooting:** Update Fire TV app first, select Quest Direct Cast and leave it showing the address/code. Install and launch companion on Quest, enter those values and approve screen capture. Look for TV `Quest connected` and a live picture; video and audio may be disabled/protected in certain apps. If it fails, share the status/error shown on each device; do **not** share the one-time pairing code. From the TV, Back immediately stops the receiver. Quest Stop Casting or notification action stops the sender.

### TLS key-usage compatibility correction (v0.1.9)

Actual Amazon AFTMM (API 25) v0.1.8 local test: `TLS_IDENTITY` confirmed key and certificate presence and a selectable RSA alias, but `TLS_SELFTEST_FAIL` still showed a handshake failure on **both loopback client and server**. The 16 inbound connections also failed; this cannot establish whether Quest rejects a certificate.

**Root-cause candidate:** The original AndroidKeyStore RSA key was generated with **only SHA-256 digest** and **only PKCS#1 encryption padding**. [Android KeyGenParameterSpec.Builder reference](https://developer.android.com/reference/android/security/keystore/KeyGenParameterSpec.Builder) states TLS signing often needs `DIGEST_NONE` and RSA TLS may need no-padding and/or PKCS#1 decryption. The old key's authorized uses cannot be expanded after generation.

- Create a fresh **test-only** AndroidKeyStore identity under a new private alias, without deleting the previous experimental identity. Allow no-digest plus modern SHA-2 digests, PKCS#1/PSS signature operations, and both no-padding and PKCS#1 RSA decryption authorizations for older Android TLS implementations.
- Install a dedicated fixed-alias `X509ExtendedKeyManager`: do not let the standard key manager accidentally choose the older key while the local loopback client is pinned to the new certificate.
- Before running TLS, perform an in-memory ephemeral `NONEwithRSA` sign/verify capability check, report only its success or class of failure as `TLS_KEY_SIGN`. Never save or export key bytes, signatures, sample data, or certificates.
- Retain the full safe client and server local TLS failure categories (previous 130-character report truncation removed the server's last words). Continue condensed and bounded network activity reporting.
- **One-step hardware test:** update to v0.1.9, open **Cast Diagnostics → Start new test**, leave Quest alone, allow the local self-test to finish, choose Stop test and share the QR report. Look for `TLS_KEY_SIGN` and `TLS_SELFTEST_OK`. **Only retry Quest if local TLS is confirmed working.**

This is a **hypothesis-driven compatibility change**, not a guarantee. It does not fabricate Google Cast device identity or enable Quest screen streaming. Preserve the existing local-only diagnostic/privacy restrictions, DLNA, Screen Fit and signed update continuity.

### TLS diagnostic retention / AndroidKeyStore alias audit (v0.1.8)

On the Amazon AFTMM (Android API 25), v0.1.7 reported **153 Cast TCP contacts and 153 TLS handshake failures**. Its local loopback handshake also failed. This does not establish that the Quest rejects the certificate; our server cannot yet reliably handshake with its own local test client.

The previous report had a **diagnostic retention bug**: its 160-event rolling window was overwhelmed by Quest retries and omitted the single, most important `TLS_SELFTEST_FAIL` event.

- Keep first/last significant `TLS_SELFTEST_OK`, `TLS_SELFTEST_FAIL`, `TLS_IDENTITY`, `TLS_SETUP_ERROR`, `TLS_READY` and `TLS_WRAP_ERROR` messages in a separate **Critical TLS Diagnostics** section that is never displaced by repeated connections. Still cap metadata-only report size.
- Count **all** TCP/TLS/SSDP activity, but print only the first three events and every twenty-fifth event from flood-prone categories. Aggregate TLS failure labels across all attempts in the report.
- Inspect test-only AndroidKeyStore at TLS listener startup to show **only booleans** for presence of a private-key entry, certificate, and whether the Android TLS key manager can choose an RSA server alias with a private key and certificate chain. No aliases, keys, certificates, fingerprints, sender IPs, or media are exported.
- The TLS transport remains experimental and uses the same local self-signed test identity. No Google Cast credential or authentication implementation is claimed.
- **Next user test**: Update to v0.1.8; choose **Cast Diagnostics → Start new test**, do not use the Quest yet; wait for the on-screen status to settle, press **Stop test**, and send the QR report. The retained `TLS_SELFTEST_FAIL` and `TLS_IDENTITY` results will identify whether the Fire TV's local test key selection or TLS handshake is failing. Once local TLS passes, retry the Quest. There is no need for another ten-minute repeated connection attempt.

### Fire TV D-pad visibility, UI screen fit, and text entry (v0.1.7)

Designed for Fire TV overscan and screens where the active button was difficult to see or the remote opened a hard-to-find on-screen text field.

- All on-screen actions have a bold **bright-yellow focus background**, dark text, a **4dp white border** and a slight 1.02× focus emphasis. Disabled buttons remain muted. No longer relies on Fire OS default gray focus.
- **Screen Fit** is accessible from the Home header, Cast Diagnostics, or the Fire TV **MENU** key. The adjustment overlay stays centered and unscaled so it remains reachable even after incorrect settings. Buttons **Smaller / Larger** adjust app size from 70–100% in 5% steps.
- Enter **Move with remote arrows** mode, then press D-pad Left/Right/Up/Down to shift the app in 12dp steps (bounded to ±120dp). Press OK or Back to exit move mode. **Center position**, **Reset 100%**, and **Save & return** are always available. Adjustments persist with local `SharedPreferences` across app restarts.
- Both Home and Cast Diagnostics use full-page scroll containers, preserving focus navigation when content is taller than the available screen. The app content scales/repositions; the overlay remains at full size. Video playback is deliberately unscaled so the actual media aspect ratio stays correct.
- Inline URL entry is replaced with a visibly labeled **Enter media URL** button and a centered dark dialog. No TV keyboard opens just from navigating past the URL field. The Fire TV system keyboard is controlled by Fire OS, so **Screen Fit cannot resize an external/system keyboard**; Back closes it.
- Existing DLNA, Quest TLS probe, QR reports, built-in updater, logo, signing key and stable download URL are preserved. The feature changes only local rendering, not the Fire TV hardware output or display settings.
- Unit tests cover Screen Fit scale bounds, offset limits, default settings and reset. Android CI still builds/tests before signed release.

### Dedicated server TLS fix / local self-test (v0.1.6)

**Why:** The Fire TV AFTMM (Android API 25) report for v0.1.5 confirmed the Meta Quest's first packet is a TLS handshake record, but the local loopback TLS test failed and all 15 subsequent Quest handshakes failed. Therefore a certificate rejection by Quest was **not demonstrated**, and the receiver's server implementation required isolation.

- Switch both the production experimental receiver and its loopback test to `SSLContext.getServerSocketFactory().createServerSocket(...)` with `SSLServerSocket`, in server mode from the start. Previously we used a client-side `getSocketFactory().createSocket(accepted,...)` and switched mode on Android 7.
- No longer intercept or discard the first Quest connection for a five-byte protocol check. The previous version established it was TLS. Every new Quest connection goes through the same server-mode TLS accept path.
- Test client still trusts **only the exact local AndroidKeyStore test certificate** and connects to device loopback. The new report prints independent, allowlisted client/server self-test outcomes in a single `TLS_SELFTEST_FAIL` event if either side fails; no raw SSL exception text, IPs or certificates are exported.
- Preserve previous defensive connection/message limits, Cast DNS-SD diagnostics, app branding, versioned releases, in-place updater, DLNA, and bounded local QR report.
- **Hardware validation required:** v0.1.6 must show `TLS_SELFTEST_OK` before concluding anything from Quest TLS failures. If it still fails, inspect the client/server categories and fix the local TLS implementation again rather than attempting to bypass device certificate checks.
- The test certificate is not a Google Cast device identity. Even if TLS works, subsequent Cast V2 device authentication and media streaming remain unimplemented.

### Quest TLS failure isolation (v0.1.5)

This follows the actual Quest-on-Fire-TV report from v0.1.4: 15 TCP contacts, 15 TLS failures, zero TLS successes, zero device-auth messages. Those observations do **not** establish whether the peer rejected the certificate, whether AndroidKeyStore can serve TLS correctly, or whether the Quest sent TLS at all.

- **First connection only:** read and immediately discard up to five initial bytes, classify the transport as a TLS handshake record, TLS alert, HTTP method, short record, or unrecognized data. That single diagnostic connection is intentionally closed; following contacts attempt ordinary TLS. Only a class label is saved, not packet bytes, sender IP or request path.
- **Local TLS self-test:** before advertising the receiver, create a temporary server on `127.0.0.1` using exactly the same layered TLS implementation. Use a separate test client whose certificate validation accepts only the local app-owned AndroidKeyStore certificate. Report `TLS_SELFTEST_OK` or `TLS_SELFTEST_FAIL`. This does not establish Google device trust.
- **Handshakes:** group TLS failures into explicit allowlisted categories: certificate/trust alert, cipher mismatch, TLS version mismatch, invalid record, generic handshake failure alert, peer disconnect, and other errors. The raw exceptions are not exported or retained. Even a peer handshake-failure alert by itself does not prove a certificate issue.
- **Nearby Cast receiver comparison:** use Android NSD service resolution to read only numeric values of TXT `ve`, `ca` and `st`, plus booleans for the presence of `fn`, `md` and `id`. Never export device IDs, addresses, models, TXT blobs or credentials. These are advertised claims, **not** proof of certified support.
- **Testing:** update v0.1.4 → v0.1.5 inside the existing app; start a new Cast Diagnostics session; select WebPortal Cast TEST from the Meta Quest Chromecast list; after the expected error, stop test and share the local QR report. Pay particular attention to `PROTO_FIRST`, `TLS_SELFTEST_*`, `TLS_FAILED`, and `CAST_CAPS`.
- This is still **not** a working Cast V2/Google-certified receiver. All probes run only when explicitly started, on a trusted home LAN, with conservative frame and handshake limits.

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
