package com.zac.webportalcast;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;

/**
 * Opens Meta's official Quest "Cast to Web" viewer in a dedicated TV browser.
 *
 * The earlier in-app Android 7 WebView lacked a working remote WebRTC SDP
 * session. Amazon Silk uses its own maintained Chromium-based browser engine.
 * This is not Google Cast receiver emulation and makes no claim that
 * particular Fire OS 5 builds support Meta's site.
 *
 * All authentication takes place directly on Meta's website in the browser.
 * This app neither reads nor stores session cookies, accounts or stream data.
 */
final class QuestWebCasting {
    static final String META_CAST_URL = "https://horizon.meta.com/casting/";
    private static final String SILK_PACKAGE = "com.amazon.cloud9";

    private QuestWebCasting() {}

    static void showGuide(Activity activity) {
        new AlertDialog.Builder(activity)
                .setTitle("Quest built-in Web casting (experimental)")
                .setMessage(
                        "This uses Meta's official Web casting option instead of " +
                        "the Chromecast receiver protocol. No Quest APK or pairing code.\n\n" +
                        "1. Open Meta's casting page in Amazon Silk on this Fire TV.\n" +
                        "2. If asked, sign in on Meta's site with the account on your Quest.\n" +
                        "3. On Quest: Cast → Web (not Chromecast).\n" +
                        "4. If available, select fullscreen playback in Silk.\n\n" +
                        "Silk's browser engine is separate from our older WebPortal WebView. " +
                        "Fire OS 5 playback is not verified. " +
                        "No gameplay is recorded or routed through our servers.")
                .setPositiveButton("Open Meta Casting", (dialog, which) -> open(activity))
                .setNegativeButton("Cancel", null)
                .show();
    }

    static boolean open(Activity activity) {
        Uri uri = Uri.parse(META_CAST_URL);
        Intent preferred = new Intent(Intent.ACTION_VIEW, uri);
        preferred.addCategory(Intent.CATEGORY_BROWSABLE);
        preferred.setPackage(SILK_PACKAGE);

        if (launch(activity, preferred)) return true;

        // Some Fire TV variants have a different browser installation.
        // Only invoke Android's normal browser resolver for the fixed Meta URL.
        Intent fallback = new Intent(Intent.ACTION_VIEW, uri);
        fallback.addCategory(Intent.CATEGORY_BROWSABLE);
        if (launch(activity, fallback)) return true;

        new AlertDialog.Builder(activity)
                .setTitle("No web browser found")
                .setMessage("Install or enable the Amazon Silk (Internet) browser " +
                        "on Fire TV, then select this option again. " +
                        "WebPortal Cast does not require a browser login itself.")
                .setPositiveButton("OK", null)
                .show();
        return false;
    }

    private static boolean launch(Activity activity, Intent intent) {
        try {
            if (intent.resolveActivity(activity.getPackageManager()) == null)
                return false;
            activity.startActivity(intent);
            return true;
        } catch (ActivityNotFoundException | SecurityException unavailable) {
            return false;
        }
    }
}
