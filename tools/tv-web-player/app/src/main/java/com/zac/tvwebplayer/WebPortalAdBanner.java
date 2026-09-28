package com.zac.tvwebplayer;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
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
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

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
    private final ConcurrentHashMap<String, Bitmap> logoCache =
            new ConcurrentHashMap<>();

    private final ImageView brandLogoView;
    private final TextView brandFallbackView;
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
        setPadding(dp(7), dp(6), dp(7), dp(6));
        setFocusable(true);
        setFocusableInTouchMode(false);
        setClickable(true);
        setBackground(makeBackground(false));

        FrameLayout brandFrame = new FrameLayout(context);
        LayoutParams brandParams = new LayoutParams(dp(48), dp(48));
        brandParams.setMarginEnd(dp(8));

        brandFallbackView = new TextView(context);
        brandFallbackView.setGravity(Gravity.CENTER);
        brandFallbackView.setTextColor(Color.WHITE);
        brandFallbackView.setTextSize(15f);
        brandFallbackView.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        brandFallbackView.setBackground(makeBrandFallbackBackground());

        brandLogoView = new ImageView(context);
        brandLogoView.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        brandLogoView.setPadding(dp(3), dp(3), dp(3), dp(3));

        brandFrame.addView(
                brandFallbackView,
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT));
        brandFrame.addView(
                brandLogoView,
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT));
        addView(brandFrame, brandParams);

        LinearLayout copy = new LinearLayout(context);
        copy.setOrientation(VERTICAL);
        copy.setGravity(Gravity.CENTER_VERTICAL);

        eyebrowView = new TextView(context);
        eyebrowView.setTextColor(Color.rgb(103, 232, 249));
        eyebrowView.setTextSize(8f);
        eyebrowView.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        eyebrowView.setMaxLines(1);

        titleView = new TextView(context);
        titleView.setTextColor(Color.WHITE);
        titleView.setTextSize(13f);
        titleView.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        titleView.setMaxLines(1);

        messageView = new TextView(context);
        messageView.setTextColor(Color.rgb(226, 232, 240));
        messageView.setTextSize(10f);
        messageView.setMaxLines(2);

        copy.addView(
                eyebrowView,
                new LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT));
        copy.addView(
                titleView,
                new LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT));
        copy.addView(
                messageView,
                new LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT));

        LayoutParams copyParams = new LayoutParams(
                0,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                1f);
        copyParams.setMarginEnd(dp(8));
        addView(copy, copyParams);

        qrView = new ImageView(context);
        qrView.setScaleType(ImageView.ScaleType.FIT_CENTER);
        qrView.setBackgroundColor(Color.WHITE);
        qrView.setPadding(dp(2), dp(2), dp(2), dp(2));
        addView(qrView, new LayoutParams(dp(54), dp(54)));

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
        int[] colors = focused
                ? new int[] {
                    Color.rgb(8, 22, 42),
                    Color.rgb(20, 19, 55),
                    Color.rgb(43, 12, 63)
                }
                : new int[] {
                    Color.rgb(6, 15, 29),
                    Color.rgb(13, 20, 45),
                    Color.rgb(30, 10, 45)
                };

        GradientDrawable background = new GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                colors);
        background.setStroke(
                dp(focused ? 3 : 1),
                focused
                        ? Color.rgb(103, 232, 249)
                        : Color.rgb(80, 70, 130));
        background.setCornerRadius(dp(12));
        return background;
    }

    private GradientDrawable makeBrandFallbackBackground() {
        GradientDrawable background = new GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                new int[] {
                    Color.rgb(14, 116, 144),
                    Color.rgb(67, 56, 202),
                    Color.rgb(126, 34, 206)
                });
        background.setStroke(dp(1), Color.rgb(103, 232, 249));
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
                        ? "SPONSORED"
                        : item.id.startsWith("house-raisehub")
                                ? "RAISEHUB"
                                : "WEBPORTAL");
        titleView.setText(item.title);
        messageView.setText(item.message);
        qrView.setImageBitmap(makeQr(item.destinationUrl));
        renderBrand(item);

        setContentDescription(
                item.title
                        + ". "
                        + item.message
                        + ". Press select to open.");
    }

    private void renderBrand(AdItem item) {
        brandLogoView.setImageDrawable(null);
        brandLogoView.setVisibility(View.GONE);
        brandFallbackView.setVisibility(View.VISIBLE);
        brandFallbackView.setText(initials(item.title));

        if (!item.paid) {
            if (item.id.startsWith("house-raisehub")) {
                brandFallbackView.setText("RH");
                return;
            }

            brandFallbackView.setVisibility(View.GONE);
            brandLogoView.setImageResource(R.drawable.app_icon);
            brandLogoView.setVisibility(View.VISIBLE);
            return;
        }

        if (item.logoUrl == null || item.logoUrl.isEmpty()) return;

        Bitmap cached = logoCache.get(item.logoUrl);
        if (cached != null) {
            showBusinessLogo(item.logoUrl, cached);
            return;
        }

        loadBusinessLogo(item.logoUrl);
    }

    private String initials(String value) {
        String clean = value == null ? "" : value.trim();
        if (clean.isEmpty()) return "AD";

        String[] parts = clean.split("\\s+");
        StringBuilder result = new StringBuilder();
        for (String part : parts) {
            if (part.isEmpty()) continue;
            result.append(part.substring(0, 1).toUpperCase(Locale.US));
            if (result.length() >= 2) break;
        }
        return result.length() > 0 ? result.toString() : "AD";
    }

    private void loadBusinessLogo(String logoUrl) {
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(logoUrl);
                String protocol = url.getProtocol();
                if (!"https".equalsIgnoreCase(protocol)
                        && !"http".equalsIgnoreCase(protocol)) {
                    return;
                }

                connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(5000);
                connection.setReadTimeout(5000);
                connection.setUseCaches(true);

                if (connection.getResponseCode() < 200
                        || connection.getResponseCode() >= 300) {
                    return;
                }

                Bitmap bitmap = BitmapFactory.decodeStream(
                        connection.getInputStream());
                if (bitmap == null) return;

                logoCache.put(logoUrl, bitmap);
                mainHandler.post(() -> showBusinessLogo(logoUrl, bitmap));
            } catch (Exception ignored) {
                // Initials remain visible if the business logo cannot be loaded.
            } finally {
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    private void showBusinessLogo(String logoUrl, Bitmap bitmap) {
        AdItem current = currentItem();
        if (current == null
                || current.logoUrl == null
                || !current.logoUrl.equals(logoUrl)) {
            return;
        }

        brandLogoView.setImageBitmap(bitmap);
        brandFallbackView.setVisibility(View.GONE);
        brandLogoView.setVisibility(View.VISIBLE);
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
                        String logoUrl =
                                raw.optString("logoUrl", "").trim();

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
                                "paid".equals(kind),
                                logoUrl));
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
                false,
                ""));
        fallback.add(new AdItem(
                "house-support-webportal",
                "Support WebPortal",
                "Enjoying WebPortal? Help keep development and releases moving.",
                "https://raisehub.app/webportal/support",
                false,
                ""));
        fallback.add(new AdItem(
                "house-advertise-webportal",
                "Advertise on WebPortal",
                "Put your business in this TV rotation with a scannable QR code.",
                "https://raisehub.app/webportal/advertise",
                false,
                ""));
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
        final String logoUrl;

        AdItem(
                String id,
                String title,
                String message,
                String destinationUrl,
                boolean paid,
                String logoUrl) {
            this.id = id;
            this.title = title;
            this.message = message;
            this.destinationUrl = destinationUrl;
            this.paid = paid;
            this.logoUrl = logoUrl == null ? "" : logoUrl;
        }
    }
}
