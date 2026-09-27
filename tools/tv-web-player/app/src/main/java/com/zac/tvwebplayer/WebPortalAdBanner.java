package com.zac.tvwebplayer;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

public class WebPortalAdBanner extends LinearLayout {
    public interface DestinationHandler {
        void open(String url);
    }

    private static final String FEED_URL =
            "https://raisehub.app/api/webportal/ads";
    private static final long DEFAULT_ROTATION_MS = 12000L;
    private static final long CONFIG_REFRESH_MS = 15 * 60 * 1000L;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final DestinationHandler destinationHandler;
    private final List<AdItem> items = new ArrayList<>();

    private final ImageView qrView;
    private final TextView eyebrowView;
    private final TextView titleView;
    private final TextView messageView;

    private int currentIndex;
    private long rotationMs = DEFAULT_ROTATION_MS;
    private boolean pausedForFocus;

    private final Runnable rotationRunnable = new Runnable() {
        @Override
        public void run() {
            if (!pausedForFocus && items.size() > 1 && getVisibility() == VISIBLE) {
                currentIndex = (currentIndex + 1) % items.size();
                renderCurrent();
            }
            scheduleRotation();
        }
    };

    private final Runnable configRefreshRunnable = new Runnable() {
        @Override
        public void run() {
            refreshConfig();
            mainHandler.postDelayed(this, CONFIG_REFRESH_MS);
        }
    };

    public WebPortalAdBanner(
            Context context,
            DestinationHandler destinationHandler) {
        super(context);
        this.destinationHandler = destinationHandler;

        setOrientation(HORIZONTAL);
        setGravity(Gravity.CENTER_VERTICAL);
        int pad = dp(10);
        setPadding(dp(18), pad, dp(18), pad);
        setFocusable(true);
        setFocusableInTouchMode(false);
        setClickable(true);
        setBackground(makeBackground(false));

        qrView = new ImageView(context);
        qrView.setScaleType(ImageView.ScaleType.FIT_CENTER);
        LayoutParams qrParams = new LayoutParams(dp(88), dp(88));
        qrParams.setMarginEnd(dp(14));
        addView(qrView, qrParams);

        LinearLayout copy = new LinearLayout(context);
        copy.setOrientation(VERTICAL);
        copy.setGravity(Gravity.CENTER_VERTICAL);

        eyebrowView = new TextView(context);
        eyebrowView.setTextColor(Color.rgb(110, 231, 249));
        eyebrowView.setTextSize(11f);
        eyebrowView.setTypeface(Typeface.DEFAULT, Typeface.BOLD);

        titleView = new TextView(context);
        titleView.setTextColor(Color.WHITE);
        titleView.setTextSize(18f);
        titleView.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        titleView.setMaxLines(1);

        messageView = new TextView(context);
        messageView.setTextColor(Color.rgb(226, 232, 240));
        messageView.setTextSize(14f);
        messageView.setMaxLines(2);

        copy.addView(eyebrowView, new LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));
        copy.addView(titleView, new LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));
        copy.addView(messageView, new LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));

        addView(copy, new LayoutParams(
                0,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                1f));

        setOnFocusChangeListener((view, hasFocus) -> {
            pausedForFocus = hasFocus;
            setBackground(makeBackground(hasFocus));
            if (hasFocus) {
                mainHandler.removeCallbacks(rotationRunnable);
            } else {
                scheduleRotation();
            }
        });

        setOnClickListener(view -> {
            AdItem item = currentItem();
            if (item != null && destinationHandler != null) {
                destinationHandler.open(item.destinationUrl);
            }
        });

        items.addAll(fallbackItems());
        renderCurrent();
        scheduleRotation();
        refreshConfig();
        mainHandler.postDelayed(configRefreshRunnable, CONFIG_REFRESH_MS);
    }

    private GradientDrawable makeBackground(boolean focused) {
        GradientDrawable background = new GradientDrawable();
        background.setColor(Color.rgb(11, 18, 32));
        background.setStroke(
                dp(focused ? 3 : 1),
                focused
                        ? Color.rgb(110, 231, 249)
                        : Color.rgb(51, 65, 85));
        background.setCornerRadius(dp(12));
        return background;
    }

    private void scheduleRotation() {
        mainHandler.removeCallbacks(rotationRunnable);
        if (!pausedForFocus) {
            mainHandler.postDelayed(rotationRunnable, rotationMs);
        }
    }

    private AdItem currentItem() {
        if (items.isEmpty()) return null;
        if (currentIndex < 0 || currentIndex >= items.size()) {
            currentIndex = 0;
        }
        return items.get(currentIndex);
    }

    private void renderCurrent() {
        AdItem item = currentItem();
        if (item == null) {
            setVisibility(GONE);
            return;
        }

        eyebrowView.setText(
                item.paid
                        ? "WEBPORTAL • SPONSORED"
                        : "WEBPORTAL");
        titleView.setText(item.title);
        messageView.setText(item.message);
        qrView.setImageBitmap(makeQr(item.destinationUrl));

        setContentDescription(
                item.title
                        + ". "
                        + item.message
                        + ". Press select to open.");
    }

    public void refreshNow() {
        refreshConfig();
    }

    private void refreshConfig() {
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(FEED_URL).openConnection();
                connection.setConnectTimeout(6000);
                connection.setReadTimeout(6000);
                connection.setRequestProperty("Accept", "application/json");
                connection.setUseCaches(false);

                int status = connection.getResponseCode();
                if (status < 200 || status >= 300) return;

                StringBuilder body = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(connection.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        body.append(line);
                    }
                }

                JSONObject payload = new JSONObject(body.toString());
                int seconds = payload.optInt("rotationSeconds", 12);
                long nextRotationMs =
                        Math.max(8, Math.min(30, seconds)) * 1000L;

                JSONArray rawItems = payload.optJSONArray("items");
                List<AdItem> nextItems = new ArrayList<>();
                if (rawItems != null) {
                    for (int i = 0; i < rawItems.length(); i++) {
                        JSONObject raw = rawItems.optJSONObject(i);
                        if (raw == null) continue;

                        String id = raw.optString("id", "");
                        String kind = raw.optString("kind", "house");
                        String title = raw.optString("title", "").trim();
                        String message = raw.optString("message", "").trim();
                        String destination =
                                raw.optString("destinationUrl", "").trim();

                        if (title.isEmpty()
                                || message.isEmpty()
                                || !(destination.startsWith("https://")
                                || destination.startsWith("http://"))) {
                            continue;
                        }

                        nextItems.add(new AdItem(
                                id,
                                title,
                                message,
                                destination,
                                "paid".equals(kind)));
                    }
                }

                if (nextItems.isEmpty()) {
                    nextItems.addAll(fallbackItems());
                }

                List<AdItem> finalItems = nextItems;
                mainHandler.post(() -> {
                    rotationMs = nextRotationMs;
                    items.clear();
                    items.addAll(finalItems);
                    currentIndex = 0;
                    renderCurrent();
                    scheduleRotation();
                });
            } catch (Exception ignored) {
                // Keep the built-in house rotation when the feed is unavailable.
            } finally {
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    private List<AdItem> fallbackItems() {
        List<AdItem> fallback = new ArrayList<>();
        fallback.add(new AdItem(
                "house-raisehub-business",
                "Small business owner?",
                "Join RaiseHub and offer exclusive rewards to local supporters.",
                "https://raisehub.app/business",
                false));
        fallback.add(new AdItem(
                "house-support-webportal",
                "Support WebPortal",
                "Enjoying WebPortal? Help keep development and releases moving.",
                "https://raisehub.app/webportal/support",
                false));
        fallback.add(new AdItem(
                "house-advertise-webportal",
                "Advertise on WebPortal",
                "Put your business in this TV rotation with a scannable QR code.",
                "https://raisehub.app/webportal/advertise",
                false));
        return fallback;
    }

    private Bitmap makeQr(String value) {
        int size = 256;
        try {
            BitMatrix matrix = new QRCodeWriter().encode(
                    value,
                    BarcodeFormat.QR_CODE,
                    size,
                    size);

            int[] pixels = new int[size * size];
            for (int y = 0; y < size; y++) {
                int offset = y * size;
                for (int x = 0; x < size; x++) {
                    pixels[offset + x] =
                            matrix.get(x, y)
                                    ? Color.BLACK
                                    : Color.WHITE;
                }
            }

            Bitmap bitmap = Bitmap.createBitmap(
                    size,
                    size,
                    Bitmap.Config.ARGB_8888);
            bitmap.setPixels(
                    pixels,
                    0,
                    size,
                    0,
                    0,
                    size,
                    size);
            return bitmap;
        } catch (WriterException error) {
            return null;
        }
    }

    @Override
    protected void onDetachedFromWindow() {
        mainHandler.removeCallbacks(rotationRunnable);
        mainHandler.removeCallbacks(configRefreshRunnable);
        super.onDetachedFromWindow();
    }

    private int dp(int value) {
        return Math.round(
                value * getResources().getDisplayMetrics().density);
    }

    private static final class AdItem {
        final String id;
        final String title;
        final String message;
        final String destinationUrl;
        final boolean paid;

        AdItem(
                String id,
                String title,
                String message,
                String destinationUrl,
                boolean paid) {
            this.id = id;
            this.title = title;
            this.message = message;
            this.destinationUrl = destinationUrl;
            this.paid = paid;
        }
    }
}
