package com.zac.webportalcast;

import org.junit.Test;
import static org.junit.Assert.*;

public final class ScreenFitStateTest {
    @Test public void defaultStateIsFullScreen() {
        ScreenFitState state = new ScreenFitState(100, 0, 0);
        assertEquals(100, state.scalePercent);
        assertEquals(0, state.offsetXDp);
        assertEquals(0, state.offsetYDp);
    }

    @Test public void zoomIsBoundedToSeventyThroughOneHundred() {
        ScreenFitState state = new ScreenFitState(100, 0, 0);
        for (int n = 0; n < 20; n++) state.zoom(-ScreenFitState.SCALE_STEP);
        assertEquals(70, state.scalePercent);
        for (int n = 0; n < 20; n++) state.zoom(ScreenFitState.SCALE_STEP);
        assertEquals(100, state.scalePercent);
    }

    @Test public void positionalArrowsAreClamped() {
        ScreenFitState state = new ScreenFitState(85, 0, 0);
        state.move(500, -500);
        assertEquals(120, state.offsetXDp);
        assertEquals(-120, state.offsetYDp);
        state.move(-600, 600);
        assertEquals(-120, state.offsetXDp);
        assertEquals(120, state.offsetYDp);
    }

    @Test public void oldOrCorruptSavedValuesAreClamped() {
        ScreenFitState state = new ScreenFitState(-999, 1000, -999);
        assertEquals(70, state.scalePercent);
        assertEquals(120, state.offsetXDp);
        assertEquals(-120, state.offsetYDp);
    }

    @Test public void resetRestoresSafeDefault() {
        ScreenFitState state = new ScreenFitState(75, 90, -110);
        state.reset();
        assertEquals(100, state.scalePercent);
        assertEquals(0, state.offsetXDp);
        assertEquals(0, state.offsetYDp);
    }
}
