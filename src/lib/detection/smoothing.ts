/**
 * Exponential Moving Average (EMA) smoothing for facial blendshape scores.
 *
 * Formula:
 *   S_t = alpha * X_t + (1 - alpha) * S_{t-1}
 *
 * Provides noise reduction over rapid single-frame flickers while preserving
 * response time to sustained facial movements.
 */

export interface SmoothingState {
  smoothedLeft: number;
  smoothedRight: number;
  hasPrevious: boolean;
}

export function createInitialSmoothingState(): SmoothingState {
  return {
    smoothedLeft: 0,
    smoothedRight: 0,
    hasPrevious: false,
  };
}

function clampScore(val: number): number {
  if (Number.isNaN(val)) return 0;
  if (val > 1) return 1;
  if (val < 0) return 0;
  return val;
}

function clampAlpha(val: number): number {
  if (Number.isNaN(val)) return 0.65;
  if (val > 1) return 1;
  if (val < 0.05) return 0.05;
  return val;
}

/**
 * Calculates smoothed blink scores using EMA.
 * Clamps alpha to a safe range [0.05, 1.0].
 * Clamps input scores to [0, 1].
 */
export function applyBlinkSmoothing(
  state: SmoothingState,
  rawLeft: number,
  rawRight: number,
  alpha = 0.65
): { state: SmoothingState; left: number; right: number } {
  const safeAlpha = clampAlpha(alpha);
  const safeLeft = clampScore(rawLeft);
  const safeRight = clampScore(rawRight);

  if (!state.hasPrevious) {
    const nextState: SmoothingState = {
      smoothedLeft: safeLeft,
      smoothedRight: safeRight,
      hasPrevious: true,
    };
    return {
      state: nextState,
      left: Math.round(safeLeft * 1000) / 1000,
      right: Math.round(safeRight * 1000) / 1000,
    };
  }

  const nextLeft = safeAlpha * safeLeft + (1 - safeAlpha) * state.smoothedLeft;
  const nextRight = safeAlpha * safeRight + (1 - safeAlpha) * state.smoothedRight;

  const nextState: SmoothingState = {
    smoothedLeft: nextLeft,
    smoothedRight: nextRight,
    hasPrevious: true,
  };

  return {
    state: nextState,
    left: Math.round(nextLeft * 1000) / 1000,
    right: Math.round(nextRight * 1000) / 1000,
  };
}

/**
 * Resets the smoothing state when a face is lost or tracking is interrupted.
 */
export function resetSmoothingState(): SmoothingState {
  return createInitialSmoothingState();
}
