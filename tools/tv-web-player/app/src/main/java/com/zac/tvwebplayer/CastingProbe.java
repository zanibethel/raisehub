package com.zac.tvwebplayer;

import android.webkit.WebView;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import java.util.Arrays;
import java.util.HashSet;

/**
 * Local-only Meta casting diagnostics. Never records SDP, ICE addresses,
 * authentication tokens or WebRTC packet contents.
 */
final class CastingProbe {
    private CastingProbe() {}

    private static final String HOOK = """
(function() {
  if (!/^\\/casting(?:\\/|$)/i.test(location.pathname)) return;
  if (window.__webPortalCastProbe) return;

  var probe = { events: [], peers: [], mode: 'passive' };
  window.__webPortalCastProbe = probe;
  function note(message) {
    var time = new Date().toLocaleTimeString();
    probe.events.push(time + ' ' + message);
    if (probe.events.length > 25) probe.events.shift();
  }
  note('Casting diagnostics attached');

  window.addEventListener('unhandledrejection', function(event) {
    var reason = event && event.reason;
    var type = reason && reason.name ? reason.name : 'unknown';
    note('Unhandled rejection (' + String(type).slice(0, 40) + ')');
  });

  window.addEventListener('error', function(event) {
    if (event && event.error) {
      note('Page script error (' + String(event.error.name || 'Error').slice(0, 40) + ')');
    }
  });

  if (typeof RTCPeerConnection !== 'function' || typeof Proxy !== 'function') {
    note('Peer observer unavailable');
    return;
  }

  var NativePeer = window.RTCPeerConnection;
  window.RTCPeerConnection = new Proxy(NativePeer, {
    construct: function(target, args, newTarget) {
      var pc = Reflect.construct(target, args, newTarget);
      if (window.__webPortalCastSelfTest) return pc;
      var index = probe.peers.push(pc);
      note('Peer ' + index + ' created');
      [
        'connectionstatechange',
        'iceconnectionstatechange',
        'icegatheringstatechange',
        'signalingstatechange'
      ].forEach(function(name) {
        pc.addEventListener(name, function() {
          note('Peer ' + index + ': connection=' + pc.connectionState
            + ', ICE=' + pc.iceConnectionState
            + ', gather=' + pc.iceGatheringState
            + ', signaling=' + pc.signalingState);
        });
      });
      pc.addEventListener('track', function(event) {
        note('Peer ' + index + ': incoming ' + (event.track && event.track.kind || 'track'));
      });
      pc.addEventListener('icecandidateerror', function(event) {
        note('Peer ' + index + ': ICE candidate error ' + (event.errorCode || 'unknown'));
      });
      return pc;
    }
  });
  note('Peer observer active');
})()
""";

    static boolean installEarly(WebView view) {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            return false;
        }
        try {
            WebViewCompat.addDocumentStartJavaScript(view, HOOK,
                    new HashSet<>(Arrays.asList(
                            "https://*.meta.com",
                            "https://meta.com",
                            "https://*.oculus.com",
                            "https://oculus.com"
                    )));
            return true;
        } catch (RuntimeException unsupported) {
            return false;
        }
    }

    static void installLate(WebView view) {
        view.evaluateJavascript(HOOK, null);
    }

    static final String DIAGNOSTICS = """
(function() {
  var parts = [];
  var probe = window.__webPortalCastProbe;
  var videos = document.querySelectorAll('video');
  var codecs = [];
  try {
    if (window.RTCRtpReceiver && RTCRtpReceiver.getCapabilities) {
      var cap = RTCRtpReceiver.getCapabilities('video');
      codecs = (cap && cap.codecs || []).map(function(c) {
        return (c.mimeType || '').split('/').pop();
      }).filter(function(c, i, a) { return a.indexOf(c) === i; });
    }
  } catch(e) { codecs.push('query error'); }
  parts.push('Page: ' + location.host + location.pathname);
  parts.push('WebRTC API: ' + (typeof RTCPeerConnection === 'function' ? 'yes' : 'no')
    + ' | Secure: ' + !!window.isSecureContext
    + ' | Online: ' + !!navigator.onLine);
  parts.push('Video receive codecs: ' + (codecs.join(', ') || 'none reported'));
  parts.push('MediaDevices API: ' + !!navigator.mediaDevices
    + ' | HTML video elements: ' + videos.length);
  Array.prototype.forEach.call(videos, function(v, i) {
    if (i >= 3) return;
    parts.push('Video ' + (i+1) + ': ready=' + v.readyState
      + ' size=' + v.videoWidth + 'x' + v.videoHeight
      + ' paused=' + v.paused
      + ' error=' + (v.error ? v.error.code : 'none'));
  });
  if (!probe) {
    parts.push('Peer trace: unavailable (early script not supported or page was not reloaded)');
  } else {
    parts.push('Peer connections observed: ' + probe.peers.length);
    Array.prototype.forEach.call(probe.peers.slice(-3), function(pc, i) {
      parts.push('Peer: ' + pc.connectionState + ' / ICE=' + pc.iceConnectionState
        + ' / signal=' + pc.signalingState
        + ' / remote SDP=' + !!pc.remoteDescription);
    });
    parts.push('Recent events:');
    parts.push(probe.events.slice(-12).join('\\n'));
  }
  return parts.join('\\n');
})()
""";
}
