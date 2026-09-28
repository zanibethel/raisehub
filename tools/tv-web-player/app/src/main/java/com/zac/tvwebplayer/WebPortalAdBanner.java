package com.zac.tvwebplayer;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
    private final Map<String, Bitmap> logoCache = new HashMap<>();

    private final ImageView brandView;
    private final ImageView qrView;
    private final TextView eyebrowView;
    private final TextView titleView;
    private final TextView messageView;
    private final TextView qrCaptionView;

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
        setPadding(dp(7), dp(5), dp(7), dp(5));
        setFocusable(true);
        setFocusableInTouchMode(false);
        setClickable(true);
        setBackground(makeBackground(false));

        brandView = new ImageView(context);
        brandView.setScaleType(ImageView.ScaleType.FIT_CENTER);
        brandView.setPadding(dp(4), dp(4), dp(4), dp(4));
        brandView.setBackground(makeBrandBackground());
        brandView.setClipToOutline(true);

        LayoutParams brandParams = new LayoutParams(dp(48), dp(48));
        brandParams.setMarginEnd(dp(8));
        addView(brandView, brandParams);

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
        titleView.setEllipsize(android.text.TextUtils.TruncateAt.END);

        messageView = new TextView(context);
        messageView.setTextColor(Color.rgb(226, 232, 240));
        messageView.setTextSize(9.5f);
        messageView.setMaxLines(2);
        messageView.setEllipsize(android.text.TextUtils.TruncateAt.END);

        copy.addView(eyebrowView, new LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));
        copy.addView(titleView, new LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));
        copy.addView(messageView, new LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));

        LayoutParams copyParams = new LayoutParams(
                0,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                1f);
        copyParams.setMarginEnd(dp(7));
        addView(copy, copyParams);

        LinearLayout qrColumn = new LinearLayout(context);
        qrColumn.setOrientation(VERTICAL);
        qrColumn.setGravity(Gravity.CENTER);

        qrView = new ImageView(context);
        qrView.setScaleType(ImageView.ScaleType.FIT_CENTER);
        qrView.setBackground(makeQrBackground());
        qrView.setPadding(dp(2), dp(2), dp(2), dp(2));

        qrCaptionView = new TextView(context);
        qrCaptionView.setText("Scan");
        qrCaptionView.setTextColor(Color.rgb(203, 213, 225));
        qrCaptionView.setTextSize(7.5f);
        qrCaptionView.setGravity(Gravity.CENTER);
        qrCaptionView.setMaxLines(1);

        qrColumn.addView(qrView, new LayoutParams(dp(52), dp(52)));
        qrColumn.addView(qrCaptionView, new LayoutParams(
                dp(58),
                ViewGroup.LayoutParams.WRAP_CONTENT));
        addView(qrColumn, new LayoutParams(
                dp(60),
                ViewGroup.LayoutParams.MATCH_PARENT));

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
        GradientDrawable background = new GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                new int[] {
                        Color.rgb(5, 10, 24),
                        Color.rgb(21, 11, 41),
                        Color.rgb(5, 27, 40)
                });
        background.setStroke(
                dp(focused ? 3 : 1),
                focused
                        ? Color.rgb(103, 232, 249)
                        : Color.rgb(109, 80, 255));
        background.setCornerRadius(dp(12));
        return background;
    }

    private GradientDrawable makeBrandBackground() {
        GradientDrawable background = new GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                new int[] {
                        Color.rgb(18, 24, 48),
                        Color.rgb(38, 18, 64)
                });
        background.setStroke(dp(1), Color.rgb(76, 201, 240));
        background.setCornerRadius(dp(13));
        return background;
    }

    private GradientDrawable makeQrBackground() {
        GradientDrawable background = new GradientDrawable();
        background.setColor(Color.WHITE);
        background.setStroke(dp(1), Color.rgb(103, 232, 249));
        background.setCornerRadius(dp(7));
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
        qrCaptionView.setText(item.paid ? "Scan offer" : "Scan");

        renderBrand(item);

        setContentDescription(
                item.title
                        + ". "
                        + item.message
                        + ". Press select to open.");
    }

    private void renderBrand(AdItem item) {
        if ("webportal".equals(item.logoMode)) {
            brandView.setImageResource(R.drawable.app_icon);
            return;
        }

        String fallbackText = safeInitials(item.logoText, item.title);
        brandView.setImageBitmap(makeInitialsBadge(fallbackText));

        if (item.logoUrl == null
                || item.logoUrl.trim().isEmpty()
                || !(item.logoUrl.startsWith("https://")
                || item.logoUrl.startsWith("http://"))) {
            return;
        }

        Bitmap cached = logoCache.get(item.logoUrl);
        if (cached != null) {
            brandView.setImageBitmap(cached);
            return;
        }

        String expectedItemId = item.id;
        String expectedUrl = item.logoUrl;

        new Thread(() -> {
            Bitmap bitmap = downloadBitmap(expectedUrl);
            if (bitmap == null) return;

            synchronized (logoCache) {
                logoCache.put(expectedUrl, bitmap);
            }

            mainHandler.post(() -> {
                AdItem current = currentItem();
                if (current != null
                        && expectedItemId.equals(current.id)
                        && expectedUrl.equals(current.logoUrl)) {
                    brandView.setImageBitmap(bitmap);
                }
            });
        }).start();
    }

    private Bitmap downloadBitmap(String urlValue) {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(urlValue).openConnection();
            connection.setConnectTimeout(6000);
            connection.setReadTimeout(6000);
            connection.setInstanceFollowRedirects(true);
            connection.setRequestProperty("Accept", "image/*");
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) return null;
            return BitmapFactory.decodeStream(connection.getInputStream());
        } catch (Exception ignored) {
            return null;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private String safeInitials(String preferred, String fallback) {
        String source = preferred == null || preferred.trim().isEmpty()
                ? fallback
                : preferred;
        if (source == null || source.trim().isEmpty()) return "AD";

        String[] parts = source.trim().split("\\s+");
        StringBuilder result = new StringBuilder();
        for (String part : parts) {
            if (part.isEmpty()) continue;
            result.append(Character.toUpperCase(part.charAt(0)));
            if (result.length() >= 2) break;
        }
        return result.length() == 0 ? "AD" : result.toString();
    }

    private Bitmap makeInitialsBadge(String initials) {
        int size = 192;
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
        fill.setColor(Color.rgb(20, 15, 47));
        canvas.drawRoundRect(0, 0, size, size, 42, 42, fill);

        Paint ring = new Paint(Paint.ANTI_ALIAS_FLAG);
        ring.setStyle(Paint.Style.STROKE);
        ring.setStrokeWidth(8f);
        ring.setColor(Color.rgb(76, 201, 240));
        canvas.drawRoundRect(7, 7, size - 7, size - 7, 37, 37, ring);

        Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        textPaint.setColor(Color.WHITE);
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        textPaint.setTextSize(initials.length() > 1 ? 74f : 88f);

        Paint.FontMetrics metrics = textPaint.getFontMetrics();
        float baseline = size / 2f - (metrics.ascent + metrics.descent) / 2f;
        canvas.drawText(initials, size / 2f, baseline, textPaint);
        return bitmap;
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
                        String logoUrl = raw.optString("logoUrl", "").trim();
                        String logoMode = raw.optString("logoMode", "").trim();
                        String logoText = raw.optString("logoText", "").trim();

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
                                logoUrl.isEmpty() ? null : logoUrl,
                                logoMode,
                                logoText));
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
                null,
                "initials",
                "RH"));
        fallback.add(new AdItem(
                "house-support-webportal",
                "Support WebPortal",
                "Enjoying WebPortal? Help keep development and releases moving.",
                "https://raisehub.app/webportal/support",
                false,
                null,
                "webportal",
                "WP"));
        fallback.add(new AdItem(
                "house-advertise-webportal",
                "Advertise on WebPortal",
                "Put your business in this TV rotation with a scannable QR code.",
                "https://raisehub.app/webportal/advertise",
                false,
                null,
                "webportal",
                "WP"));
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
        final String logoMode;
        final String logoText;

        AdItem(
                String id,
                String title,
                String message,
                String destinationUrl,
                boolean paid,
                String logoUrl,
                String logoMode,
                String logoText) {
            this.id = id;
            this.title = title;
            this.message = message;
            this.destinationUrl = destinationUrl;
            this.paid = paid;
            this.logoUrl = logoUrl;
            this.logoMode = logoMode;
            this.logoText = logoText;
        }
    }
}
