import { describe, it, expect } from 'vitest';
import {
  createInitialEyeClosureState,
  computeAverageBlinkScore,
  isEyeBlinkAboveThreshold,
  evaluateEyeClosure,
} from '../rules/eye-closure';

describe('Eye Closure Rule', () => {
  describe('computeAverageBlinkScore', () => {
    it('computes the exact average of left and right blink scores', () => {
      expect(computeAverageBlinkScore(0.6, 0.8)).toBe(0.7);
      expect(computeAverageBlinkScore(0.0, 0.0)).toBe(0);
      expect(computeAverageBlinkScore(1.0, 1.0)).toBe(1);
    });

    it('clamps out-of-range and non-finite inputs safely into [0, 1]', () => {
      expect(computeAverageBlinkScore(-0.5, 0.5)).toBe(0.25);
      expect(computeAverageBlinkScore(1.5, 0.5)).toBe(0.75);
      expect(computeAverageBlinkScore(Number.NaN, 0.8)).toBe(0.4);
      expect(computeAverageBlinkScore(Number.POSITIVE_INFINITY, 0.4)).toBe(0.2);
    });
  });

  describe('isEyeBlinkAboveThreshold', () => {
    it('uses default threshold of 0.6 when none is provided', () => {
      expect(isEyeBlinkAboveThreshold(0.59)).toBe(false);
      expect(isEyeBlinkAboveThreshold(0.6)).toBe(true);
      expect(isEyeBlinkAboveThreshold(0.85)).toBe(true);
    });

    it('respects custom thresholds and clamps extreme thresholds to safe range [0.1, 0.95]', () => {
      expect(isEyeBlinkAboveThreshold(0.45, 0.4)).toBe(true);
      expect(isEyeBlinkAboveThreshold(0.35, 0.4)).toBe(false);
      // Threshold below 0.1 clamps to 0.1
      expect(isEyeBlinkAboveThreshold(0.05, 0.01)).toBe(false);
      expect(isEyeBlinkAboveThreshold(0.12, 0.01)).toBe(true);
    });

    it('returns false for non-finite blink score', () => {
      expect(isEyeBlinkAboveThreshold(Number.NaN)).toBe(false);
    });
  });

  describe('evaluateEyeClosure state machine', () => {
    it('ignores normal short blinks under 1000ms without emitting an event', () => {
      let state = createInitialEyeClosureState();

      // Frame 1: eyes close at t = 1000ms
      const step1 = evaluateEyeClosure(state, {
        faceDetected: true,
        eyeBlinkLeft: 0.75,
        eyeBlinkRight: 0.75,
        timestampMs: 1000,
      });
      state = step1.state;
      expect(state.isClosed).toBe(true);
      expect(state.closedSinceMs).toBe(1000);
      expect(state.continuousDurationMs).toBe(0);
      expect(state.isEventActive).toBe(false);
      expect(step1.justTriggered).toBe(false);
      expect(step1.completedEvent).toBeNull();

      // Frame 2: eyes still closed at t = 1400ms (400ms blink)
      const step2 = evaluateEyeClosure(state, {
        faceDetected: true,
        eyeBlinkLeft: 0.8,
        eyeBlinkRight: 0.7,
        timestampMs: 1400,
      });
      state = step2.state;
      expect(state.isClosed).toBe(true);
      expect(state.continuousDurationMs).toBe(400);
      expect(state.isEventActive).toBe(false);
      expect(step2.justTriggered).toBe(false);

      // Frame 3: eyes reopen at t = 1550ms (550ms total < 1000ms threshold)
      const step3 = evaluateEyeClosure(state, {
        faceDetected: true,
        eyeBlinkLeft: 0.1,
        eyeBlinkRight: 0.1,
        timestampMs: 1550,
      });
      expect(step3.state.isClosed).toBe(false);
      expect(step3.state.closedSinceMs).toBeNull();
      expect(step3.state.continuousDurationMs).toBe(0);
      expect(step3.state.isEventActive).toBe(false);
      expect(step3.justTriggered).toBe(false);
      expect(step3.completedEvent).toBeNull();
    });

    it('triggers eyes_closed event at 1000ms and emits completedEvent when eyes reopen', () => {
      let state = createInitialEyeClosureState();

      // t = 2000ms: closure starts
      const f1 = evaluateEyeClosure(state, {
        faceDetected: true,
        eyeBlinkLeft: 0.65,
        eyeBlinkRight: 0.65,
        timestampMs: 2000,
      });
      state = f1.state;
      expect(f1.justTriggered).toBe(false);

      // t = 2999ms: 999ms elapsed -> not yet triggered
      const f2 = evaluateEyeClosure(state, {
        faceDetected: true,
        eyeBlinkLeft: 0.7,
        eyeBlinkRight: 0.7,
        timestampMs: 2999,
      });
      state = f2.state;
      expect(state.continuousDurationMs).toBe(999);
      expect(state.isEventActive).toBe(false);
      expect(f2.justTriggered).toBe(false);

      // t = 3000ms: 1000ms elapsed -> crosses threshold!
      const f3 = evaluateEyeClosure(state, {
        faceDetected: true,
        eyeBlinkLeft: 0.72,
        eyeBlinkRight: 0.68,
        timestampMs: 3000,
      });
      state = f3.state;
      expect(state.continuousDurationMs).toBe(1000);
      expect(state.isEventActive).toBe(true);
      expect(f3.justTriggered).toBe(true);
      expect(f3.completedEvent).toBeNull();

      // t = 3400ms: 1400ms elapsed -> remains active, justTriggered is false on subsequent frames
      const f4 = evaluateEyeClosure(state, {
        faceDetected: true,
        eyeBlinkLeft: 0.8,
        eyeBlinkRight: 0.8,
        timestampMs: 3400,
      });
      state = f4.state;
      expect(state.continuousDurationMs).toBe(1400);
      expect(state.isEventActive).toBe(true);
      expect(f4.justTriggered).toBe(false);

      // t = 3600ms: eyes open -> emits completedEvent with 1600ms duration
      const f5 = evaluateEyeClosure(state, {
        faceDetected: true,
        eyeBlinkLeft: 0.15,
        eyeBlinkRight: 0.12,
        timestampMs: 3600,
      });
      expect(f5.state.isClosed).toBe(false);
      expect(f5.state.isEventActive).toBe(false);
      expect(f5.completedEvent).toEqual({
        eventType: 'eyes_closed',
        startedAtMs: 2000,
        endedAtMs: 3600,
        durationMs: 1600,
      });
    });

    it('finalizes an active event and resets state if face is lost mid-closure', () => {
      let state = createInitialEyeClosureState();

      state = evaluateEyeClosure(state, {
        faceDetected: true,
        eyeBlinkLeft: 0.8,
        eyeBlinkRight: 0.8,
        timestampMs: 5000,
      }).state;

      state = evaluateEyeClosure(state, {
        faceDetected: true,
        eyeBlinkLeft: 0.8,
        eyeBlinkRight: 0.8,
        timestampMs: 6200,
      }).state;

      expect(state.isEventActive).toBe(true);

      // Face lost at t = 6500ms
      const lostEval = evaluateEyeClosure(state, {
        faceDetected: false,
        eyeBlinkLeft: 0,
        eyeBlinkRight: 0,
        timestampMs: 6500,
      });

      expect(lostEval.averageBlinkScore).toBe(0);
      expect(lostEval.state.isClosed).toBe(false);
      expect(lostEval.completedEvent).toEqual({
        eventType: 'eyes_closed',
        startedAtMs: 5000,
        endedAtMs: 6500,
        durationMs: 1500,
      });
    });

    it('handles non-monotonic timestamps safely without negative durations', () => {
      let state = createInitialEyeClosureState();

      state = evaluateEyeClosure(state, {
        faceDetected: true,
        eyeBlinkLeft: 0.9,
        eyeBlinkRight: 0.9,
        timestampMs: 2000,
      }).state;

      const outOfOrder = evaluateEyeClosure(state, {
        faceDetected: true,
        eyeBlinkLeft: 0.9,
        eyeBlinkRight: 0.9,
        timestampMs: 1950,
      });

      expect(outOfOrder.state.continuousDurationMs).toBe(0);
      expect(outOfOrder.state.isEventActive).toBe(false);
    });

    it('promotes continuous eye closures >= 2000ms to long_eye_closure events', () => {
      let state = createInitialEyeClosureState();

      // t = 1000ms: closure starts
      state = evaluateEyeClosure(state, {
        faceDetected: true,
        eyeBlinkLeft: 0.78,
        eyeBlinkRight: 0.82,
        timestampMs: 1000,
      }).state;
      expect(state.isEventActive).toBe(false);
      expect(state.isLongClosure).toBe(false);

      // t = 2500ms: 1500ms elapsed -> standard eyes_closed active, not yet long closure
      state = evaluateEyeClosure(state, {
        faceDetected: true,
        eyeBlinkLeft: 0.8,
        eyeBlinkRight: 0.8,
        timestampMs: 2500,
      }).state;
      expect(state.isEventActive).toBe(true);
      expect(state.isLongClosure).toBe(false);

      // t = 3000ms: 2000ms elapsed -> crosses longDurationThresholdMs (2000ms)
      state = evaluateEyeClosure(state, {
        faceDetected: true,
        eyeBlinkLeft: 0.85,
        eyeBlinkRight: 0.85,
        timestampMs: 3000,
      }).state;
      expect(state.isEventActive).toBe(true);
      expect(state.isLongClosure).toBe(true);

      // t = 3400ms: eyes reopen -> emits long_eye_closure with 2400ms duration
      const done = evaluateEyeClosure(state, {
        faceDetected: true,
        eyeBlinkLeft: 0.1,
        eyeBlinkRight: 0.1,
        timestampMs: 3400,
      });
      expect(done.state.isClosed).toBe(false);
      expect(done.state.isLongClosure).toBe(false);
      expect(done.completedEvent).toEqual({
        eventType: 'long_eye_closure',
        startedAtMs: 1000,
        endedAtMs: 3400,
        durationMs: 2400,
      });
    });

    it('respects custom longDurationThresholdMs and enforces >= durationThresholdMs', () => {
      let state = createInitialEyeClosureState();

      state = evaluateEyeClosure(state, {
        faceDetected: true,
        eyeBlinkLeft: 0.8,
        eyeBlinkRight: 0.8,
        timestampMs: 0,
        durationThresholdMs: 1000,
        longDurationThresholdMs: 3000,
      }).state;

      // At 2500ms (< custom 3000ms long threshold), should still be standard eyes_closed
      state = evaluateEyeClosure(state, {
        faceDetected: true,
        eyeBlinkLeft: 0.8,
        eyeBlinkRight: 0.8,
        timestampMs: 2500,
        durationThresholdMs: 1000,
        longDurationThresholdMs: 3000,
      }).state;
      expect(state.isEventActive).toBe(true);
      expect(state.isLongClosure).toBe(false);

      const reopen = evaluateEyeClosure(state, {
        faceDetected: true,
        eyeBlinkLeft: 0.1,
        eyeBlinkRight: 0.1,
        timestampMs: 2600,
        durationThresholdMs: 1000,
        longDurationThresholdMs: 3000,
      });
      expect(reopen.completedEvent?.eventType).toBe('eyes_closed');
    });
  });
});
