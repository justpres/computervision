import { describe, it, expect } from 'vitest';
import {
  createInitialSmoothingState,
  applyBlinkSmoothing,
  resetSmoothingState,
} from '../smoothing';

describe('Blink EMA Smoothing', () => {
  it('initializes with baseline scores on the very first frame without attenuation', () => {
    const initial = createInitialSmoothingState();
    expect(initial.hasPrevious).toBe(false);

    const step1 = applyBlinkSmoothing(initial, 0.4, 0.5, 0.65);
    expect(step1.left).toBe(0.4);
    expect(step1.right).toBe(0.5);
    expect(step1.state.hasPrevious).toBe(true);
  });

  it('smooths consecutive values using exponential moving average', () => {
    let state = createInitialSmoothingState();

    // Frame 1: baseline at 0.2
    const step1 = applyBlinkSmoothing(state, 0.2, 0.2, 0.65);
    state = step1.state;
    expect(step1.left).toBe(0.2);

    // Frame 2: sudden spike to 0.8 (e.g. single frame artifact)
    // Next value = 0.65 * 0.8 + 0.35 * 0.2 = 0.52 + 0.07 = 0.59
    const step2 = applyBlinkSmoothing(state, 0.8, 0.8, 0.65);
    state = step2.state;
    expect(step2.left).toBe(0.59);
    expect(step2.right).toBe(0.59);

    // Frame 3: immediate return to baseline 0.2
    // Next value = 0.65 * 0.2 + 0.35 * 0.59 = 0.13 + 0.2065 = 0.3365 -> 0.337
    const step3 = applyBlinkSmoothing(state, 0.2, 0.2, 0.65);
    expect(step3.left).toBe(0.337);
  });

  it('safely clamps input scores and alpha to valid bounds', () => {
    const state = createInitialSmoothingState();

    // Out-of-range negative and high scores
    const step = applyBlinkSmoothing(state, -1.5, 2.5, 1.5);
    expect(step.left).toBe(0);
    expect(step.right).toBe(1);

    // Non-finite scores
    const stepNaN = applyBlinkSmoothing(state, Number.NaN, Number.POSITIVE_INFINITY, -0.5);
    expect(stepNaN.left).toBe(0);
    expect(stepNaN.right).toBe(1);
  });

  it('resets smoothing state cleanly when face is lost', () => {
    const state = createInitialSmoothingState();
    const step1 = applyBlinkSmoothing(state, 0.7, 0.7, 0.65);
    expect(step1.state.hasPrevious).toBe(true);

    const reset = resetSmoothingState();
    expect(reset.hasPrevious).toBe(false);
    expect(reset.smoothedLeft).toBe(0);
    expect(reset.smoothedRight).toBe(0);

    // Next frame after reset acts as a new baseline
    const stepAfterReset = applyBlinkSmoothing(reset, 0.3, 0.3, 0.65);
    expect(stepAfterReset.left).toBe(0.3);
    expect(stepAfterReset.right).toBe(0.3);
  });
});
