import { DETECTION_DEFAULTS } from '../config';

/**
 * Pure detection rule for eye closure monitoring.
 *
 * Operates exclusively on scalar blendshape scores (`eyeBlinkLeft`, `eyeBlinkRight`)
 * and frame timestamps. No images or facial landmark coordinates are used or stored.
 *
 * Reports observable physical state ("eyes_closed") without judgmental labels.
 */

export interface EyeClosureState {
  /** Whether the average blink score is currently at or above the threshold */
  isClosed: boolean;
  /** Timestamp (ms) when continuous eye closure began, or null when eyes are open */
  closedSinceMs: number | null;
  /** Accumulated continuous duration (ms) of the current eye closure */
  continuousDurationMs: number;
  /** True once continuousDurationMs reaches or exceeds durationThresholdMs (default 1000ms) */
  isEventActive: boolean;
  /** True once continuousDurationMs reaches or exceeds longDurationThresholdMs (default 2000ms) */
  isLongClosure: boolean;
}

export interface CompletedEyeClosureEvent {
  eventType: 'eyes_closed' | 'long_eye_closure';
  startedAtMs: number;
  endedAtMs: number;
  durationMs: number;
}

export interface EyeClosureFrameInput {
  faceDetected: boolean;
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  timestampMs: number;
  scoreThreshold?: number;
  durationThresholdMs?: number;
  longDurationThresholdMs?: number;
}

export interface EyeClosureEvaluation {
  /** Average of left and right eye blink scores in [0, 1] (0 when no face is detected) */
  averageBlinkScore: number;
  /** Next immutable eye closure state */
  state: EyeClosureState;
  /** True on the exact frame where continuous closure crosses durationThresholdMs */
  justTriggered: boolean;
  /** Populated when an active eye-closure event ends (eyes reopen or face leaves view) */
  completedEvent: CompletedEyeClosureEvent | null;
}

/**
 * Creates a clean initial state for eye closure tracking.
 */
export function createInitialEyeClosureState(): EyeClosureState {
  return {
    isClosed: false,
    closedSinceMs: null,
    continuousDurationMs: 0,
    isEventActive: false,
    isLongClosure: false,
  };
}

/**
 * Clamps a numeric blendshape score into [0, 1], treating non-finite values as 0.
 */
function clampBlinkScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }
  return Math.min(1, Math.max(0, score));
}

/**
 * Computes the average of left and right eye blink blendshape scores in [0, 1].
 */
export function computeAverageBlinkScore(
  eyeBlinkLeft: number,
  eyeBlinkRight: number
): number {
  const left = clampBlinkScore(eyeBlinkLeft);
  const right = clampBlinkScore(eyeBlinkRight);
  return Math.round(((left + right) / 2) * 10000) / 10000;
}

/**
 * Evaluates whether an average blink score meets or exceeds the eye-closed threshold.
 */
export function isEyeBlinkAboveThreshold(
  averageBlinkScore: number,
  scoreThreshold: number = DETECTION_DEFAULTS.eyeClosedScoreThreshold
): boolean {
  if (!Number.isFinite(averageBlinkScore)) {
    return false;
  }
  const effectiveThreshold = Number.isFinite(scoreThreshold)
    ? Math.min(0.95, Math.max(0.1, scoreThreshold))
    : DETECTION_DEFAULTS.eyeClosedScoreThreshold;

  return averageBlinkScore >= effectiveThreshold;
}

/**
 * Pure state-transition function that evaluates a single frame for eye closure.
 *
 * - Normal blinks (< durationThresholdMs, default 1000ms) update `isClosed` and
 *   `continuousDurationMs` while eyes are shut, but do not trigger or emit an
 *   `eyes_closed` event when the eyes reopen.
 * - Continuous closures >= durationThresholdMs set `isEventActive = true`,
 *   set `justTriggered = true` on the threshold-crossing frame, and emit a
 *   `completedEvent` with full duration when the eyes reopen (or face is lost).
 */
export function evaluateEyeClosure(
  prevState: EyeClosureState,
  input: EyeClosureFrameInput
): EyeClosureEvaluation {
  const scoreThreshold =
    input.scoreThreshold ?? DETECTION_DEFAULTS.eyeClosedScoreThreshold;
  const durationThresholdMs =
    input.durationThresholdMs ?? DETECTION_DEFAULTS.eyeClosedDurationMs;
  const rawLongThresholdMs =
    input.longDurationThresholdMs ?? DETECTION_DEFAULTS.longEyeClosureDurationMs;
  const longDurationThresholdMs = Math.max(
    durationThresholdMs,
    Number.isFinite(rawLongThresholdMs)
      ? rawLongThresholdMs
      : DETECTION_DEFAULTS.longEyeClosureDurationMs
  );
  const safeTimestampMs = Number.isFinite(input.timestampMs)
    ? input.timestampMs
    : (prevState.closedSinceMs ?? 0);

  if (!input.faceDetected) {
    let completedEvent: CompletedEyeClosureEvent | null = null;
    if (prevState.isEventActive && prevState.closedSinceMs !== null) {
      const endedAtMs = Math.max(prevState.closedSinceMs, safeTimestampMs);
      const durationMs = Math.max(
        prevState.continuousDurationMs,
        Math.round(endedAtMs - prevState.closedSinceMs)
      );
      const isLongClosure =
        prevState.isLongClosure || durationMs >= longDurationThresholdMs;
      completedEvent = {
        eventType: isLongClosure ? 'long_eye_closure' : 'eyes_closed',
        startedAtMs: prevState.closedSinceMs,
        endedAtMs,
        durationMs,
      };
    }

    return {
      averageBlinkScore: 0,
      state: createInitialEyeClosureState(),
      justTriggered: false,
      completedEvent,
    };
  }

  const averageBlinkScore = computeAverageBlinkScore(
    input.eyeBlinkLeft,
    input.eyeBlinkRight
  );
  const isClosed = isEyeBlinkAboveThreshold(averageBlinkScore, scoreThreshold);

  if (isClosed) {
    const closedSinceMs =
      prevState.isClosed && prevState.closedSinceMs !== null
        ? prevState.closedSinceMs
        : safeTimestampMs;

    const continuousDurationMs = Math.max(
      0,
      Math.round(safeTimestampMs - closedSinceMs)
    );
    const isEventActive = continuousDurationMs >= durationThresholdMs;
    const isLongClosure = continuousDurationMs >= longDurationThresholdMs;
    const justTriggered = isEventActive && !prevState.isEventActive;

    return {
      averageBlinkScore,
      state: {
        isClosed: true,
        closedSinceMs,
        continuousDurationMs,
        isEventActive,
        isLongClosure,
      },
      justTriggered,
      completedEvent: null,
    };
  }

  // Eyes are open on this frame
  let completedEvent: CompletedEyeClosureEvent | null = null;
  if (prevState.isEventActive && prevState.closedSinceMs !== null) {
    const endedAtMs = Math.max(prevState.closedSinceMs, safeTimestampMs);
    const durationMs = Math.max(
      prevState.continuousDurationMs,
      Math.round(endedAtMs - prevState.closedSinceMs)
    );
    const isLongClosure =
      prevState.isLongClosure || durationMs >= longDurationThresholdMs;
    completedEvent = {
      eventType: isLongClosure ? 'long_eye_closure' : 'eyes_closed',
      startedAtMs: prevState.closedSinceMs,
      endedAtMs,
      durationMs,
    };
  }

  return {
    averageBlinkScore,
    state: createInitialEyeClosureState(),
    justTriggered: false,
    completedEvent,
  };
}
