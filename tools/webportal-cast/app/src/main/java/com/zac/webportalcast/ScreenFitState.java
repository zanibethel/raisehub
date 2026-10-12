package com.zac.webportalcast;

/**
 * Screen-fit state for TVs with overscan. All adjustments affect only the
 * WebPortal Cast user interface, never the TV's system keyboard or settings.
 * Android view transforms preserve focus and touch coordinate mapping.
 */
final class ScreenFitState {
    static final int MIN_SCALE = 70;
    static final int MAX_SCALE = 100;
    static final int SCALE_STEP = 5;
    static final int MOVE_STEP_DP = 12;
    static final int MAX_OFFSET_DP = 120;

    int scalePercent;
    int offsetXDp;
    int offsetYDp;

    ScreenFitState(int scalePercent, int offsetXDp, int offsetYDp) {
        this.scalePercent = clamp(scalePercent, MIN_SCALE, MAX_SCALE);
        this.offsetXDp = clamp(offsetXDp, -MAX_OFFSET_DP, MAX_OFFSET_DP);
        this.offsetYDp = clamp(offsetYDp, -MAX_OFFSET_DP, MAX_OFFSET_DP);
    }

    void zoom(int delta) {
        scalePercent = clamp(scalePercent + delta, MIN_SCALE, MAX_SCALE);
    }

    void move(int deltaX, int deltaY) {
        offsetXDp = clamp(offsetXDp + deltaX, -MAX_OFFSET_DP, MAX_OFFSET_DP);
        offsetYDp = clamp(offsetYDp + deltaY, -MAX_OFFSET_DP, MAX_OFFSET_DP);
    }

    void reset() {
        scalePercent = 100;
        offsetXDp = 0;
        offsetYDp = 0;
    }

    static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}
