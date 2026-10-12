package com.zac.webportalquest;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.media.projection.MediaProjectionManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.zac.castprotocol.LanCastProtocol;

public final class MainActivity extends Activity {
    private static final int REQUEST_CAPTURE = 84;
    private EditText hostInput;
    private EditText codeInput;
    private TextView status;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean visible;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 24, 32, 24);
        layout.setBackgroundColor(Color.rgb(7, 20, 35));
        TextView heading = label("WEBPORTAL QUEST CAST", 27, Color.CYAN);
        layout.addView(heading);
        layout.addView(label("Direct Quest → Fire TV video • 720p/30 fps preview",
                18, Color.WHITE));
        layout.addView(label("1. On the TV, open WebPortal Cast → Receive Quest direct video.",
                17, Color.WHITE));
        layout.addView(label("2. Enter the TV address and one-time pairing code below.",
                17, Color.WHITE));

        hostInput = new EditText(this);
        hostInput.setSingleLine(true);
        hostInput.setHint("Fire TV IPv4 address: 192.168.1.25");
        hostInput.setInputType(InputType.TYPE_CLASS_PHONE);
        hostInput.setTextColor(Color.WHITE);
        hostInput.setHintTextColor(Color.LTGRAY);
        hostInput.setText(getPreferences(MODE_PRIVATE).getString("host", ""));
        layout.addView(hostInput, new LinearLayout.LayoutParams(-1, 66));

        codeInput = new EditText(this);
        codeInput.setSingleLine(true);
        codeInput.setHint("Pairing code: XXXX-XXXX-XXXX");
        codeInput.setInputType(InputType.TYPE_CLASS_TEXT |
                InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS);
        codeInput.setTextColor(Color.WHITE);
        codeInput.setHintTextColor(Color.LTGRAY);
        layout.addView(codeInput, new LinearLayout.LayoutParams(-1, 66));

        Button start = button("Approve capture & Start Casting", layout);
        start.setOnClickListener(v -> requestCapture());
        Button stop = button("STOP CASTING", layout);
        stop.setOnClickListener(v -> {
            stopService(new Intent(this, QuestCaptureService.class));
            status.setText("Stop requested. Capture permission is revoked when service ends.");
        });
        status = label("Not casting. Audio is not included in this preview.", 18, Color.YELLOW);
        layout.addView(status);
        layout.addView(label("Only private home-network IPs are accepted. Video is " +
                "encrypted on your LAN and not uploaded to a cloud server. " +
                "Every casting session requires your explicit Quest screen-capture consent.",
                16, Color.LTGRAY));
        setContentView(layout);
    }

    private TextView label(String text, int size, int color) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setPadding(0, 6, 0, 12);
        return view;
    }

    private Button button(String text, LinearLayout parent) {
        Button b = new Button(this);
        b.setText(text);
        b.setTextSize(18);
        b.setAllCaps(false);
        b.setTextColor(Color.BLACK);
        b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.CYAN));
        parent.addView(b, new LinearLayout.LayoutParams(-1, 68));
        return b;
    }

    private void requestCapture() {
        String host = hostInput.getText().toString().trim();
        String code = LanCastProtocol.cleanCode(codeInput.getText().toString());
        if (!QuestCaptureService.isPrivateIp(host)) {
            status.setText("Enter the TV's numeric private-network IPv4 address.");
            return;
        }
        if (!LanCastProtocol.validCode(code)) {
            status.setText("Pair code must contain 12 hex characters (0–9 / A–F).");
            return;
        }
        getPreferences(MODE_PRIVATE).edit().putString("host", host).apply();
        pendingHost = host;
        pendingCode = code;
        MediaProjectionManager manager = (MediaProjectionManager)
                getSystemService(MEDIA_PROJECTION_SERVICE);
        if (manager == null) {
            status.setText("This Quest does not expose MediaProjection.");
            return;
        }
        status.setText("Waiting for headset screen-capture approval...");
        startActivityForResult(manager.createScreenCaptureIntent(), REQUEST_CAPTURE);
    }

    private String pendingHost;
    private String pendingCode;

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_CAPTURE) return;
        if (resultCode != RESULT_OK || data == null) {
            status.setText("Capture permission declined. Not casting.");
            pendingCode = null;
            return;
        }
        Intent service = new Intent(this, QuestCaptureService.class);
        service.setAction(QuestCaptureService.ACTION_START);
        service.putExtra("host", pendingHost);
        service.putExtra("code", pendingCode);
        service.putExtra("resultCode", resultCode);
        service.putExtra("projectionToken", data);
        pendingCode = null;
        startForegroundService(service);
        status.setText("Starting encrypted direct cast. Check status or STOP CASTING here.");
    }

    private final Runnable updateStatus = new Runnable() {
        @Override public void run() {
            if (!visible) return;
            if (status != null && QuestCaptureService.status != null)
                status.setText(QuestCaptureService.status);
            handler.postDelayed(this, 1200);
        }
    };
    @Override protected void onResume() {
        super.onResume();
        visible = true;
        handler.removeCallbacks(updateStatus);
        handler.post(updateStatus);
    }
    @Override protected void onPause() {
        visible = false;
        handler.removeCallbacks(updateStatus);
        super.onPause();
    }
}
