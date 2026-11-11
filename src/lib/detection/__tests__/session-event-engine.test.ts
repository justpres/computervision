import { describe, it, expect } from 'vitest';
import {
  createInitialSessionEventEngineState,
  processSessionFrame,
  finalizeSessionEvents,
} from '../session-event-engine';
import { buildRotationMatrix4x4 } from '../rules/head-pose';

describe('Session Event Engine', () => {
  const neutralMatrix = buildRotationMatrix4x4(0, 0, 0);
  const turnedMatrix = buildRotationMatrix4x4(36, 0, 0);

  it('accumulates completed eyes_closed and head_turned events across frames', () => {
    let state = createInitialSessionEventEngineState();

    // Frame 1 (t = 1000ms): eyes close and head turns
    state = processSessionFrame(state, {
      faceDetected: true,
      eyeBlinkLeft: 0.8,
      eyeBlinkRight: 0.8,
      transformationMatrix: turnedMatrix,
      timestampMs: 1000,
      wallClockIso: '2026-10-20T10:00:01.000Z',
    });
    expect(state.eyeClosure.isClosed).toBe(true);
    expect(state.headPose.isTurned).toBe(true);
    expect(state.events).toHaveLength(0);

    // Frame 2 (t = 2200ms): held for 1200ms -> both events active
    state = processSessionFrame(state, {
      faceDetected: true,
      eyeBlinkLeft: 0.82,
      eyeBlinkRight: 0.78,
      transformationMatrix: turnedMatrix,
      timestampMs: 2200,
      wallClockIso: '2026-10-20T10:00:02.200Z',
    });
    expect(state.eyeClosure.isEventActive).toBe(true);
    expect(state.headPose.isEventActive).toBe(true);
    expect(state.events).toHaveLength(0);

    // Frame 3 (t = 2500ms): eyes open and head centers -> both events finalized
    state = processSessionFrame(state, {
      faceDetected: true,
      eyeBlinkLeft: 0.1,
      eyeBlinkRight: 0.1,
      transformationMatrix: neutralMatrix,
      timestampMs: 2500,
      wallClockIso: '2026-10-20T10:00:02.500Z',
    });

    expect(state.events).toHaveLength(2);
    expect(state.events[0]).toMatchObject({
      eventType: 'eyes_closed',
      startedAtMs: 1000,
      endedAtMs: 2500,
      durationMs: 1500,
    });
    expect(state.events[1]).toMatchObject({
      eventType: 'head_turned',
      startedAtMs: 1000,
      endedAtMs: 2500,
      durationMs: 1500,
    });
  });

  it('merges consecutive events of the same type occurring less than 2000ms apart', () => {
    let state = createInitialSessionEventEngineState();

    // First eye closure: 1000ms -> 2200ms
    state = processSessionFrame(state, {
      faceDetected: true,
      eyeBlinkLeft: 0.75,
      eyeBlinkRight: 0.75,
      transformationMatrix: neutralMatrix,
      timestampMs: 1000,
    });
    state = processSessionFrame(state, {
      faceDetected: true,
      eyeBlinkLeft: 0.75,
      eyeBlinkRight: 0.75,
      transformationMatrix: neutralMatrix,
      timestampMs: 2200,
    });
    state = processSessionFrame(state, {
      faceDetected: true,
      eyeBlinkLeft: 0.1,
      eyeBlinkRight: 0.1,
      transformationMatrix: neutralMatrix,
      timestampMs: 2300,
    });
    expect(state.events).toHaveLength(1);
    expect(state.events[0].durationMs).toBe(1300);

    // Second eye closure starts at 3500ms (1200ms after first ended < 2000ms merge window)
    state = processSessionFrame(state, {
      faceDetected: true,
      eyeBlinkLeft: 0.8,
      eyeBlinkRight: 0.8,
      transformationMatrix: neutralMatrix,
      timestampMs: 3500,
    });
    state = processSessionFrame(state, {
      faceDetected: true,
      eyeBlinkLeft: 0.8,
      eyeBlinkRight: 0.8,
      transformationMatrix: neutralMatrix,
      timestampMs: 4700,
    });
    state = processSessionFrame(state, {
      faceDetected: true,
      eyeBlinkLeft: 0.1,
      eyeBlinkRight: 0.1,
      transformationMatrix: neutralMatrix,
      timestampMs: 4800,
    });

    // Should merge into a single event spanning 1000ms -> 4800ms (3800ms total)
    expect(state.events).toHaveLength(1);
    expect(state.events[0].startedAtMs).toBe(1000);
    expect(state.events[0].endedAtMs).toBe(4800);
    expect(state.events[0].durationMs).toBe(3800);
  });

  it('keeps events separate when gap is >= 2000ms', () => {
    let state = createInitialSessionEventEngineState();

    // First event: 1000ms -> 2200ms
    state = processSessionFrame(state, {
      faceDetected: true,
      eyeBlinkLeft: 0.75,
      eyeBlinkRight: 0.75,
      transformationMatrix: neutralMatrix,
      timestampMs: 1000,
    });
    state = processSessionFrame(state, {
      faceDetected: true,
      eyeBlinkLeft: 0.75,
      eyeBlinkRight: 0.75,
      transformationMatrix: neutralMatrix,
      timestampMs: 2100,
    });
    state = processSessionFrame(state, {
      faceDetected: true,
      eyeBlinkLeft: 0.1,
      eyeBlinkRight: 0.1,
      transformationMatrix: neutralMatrix,
      timestampMs: 2200,
    });

    // Second event starts at 4500ms (2300ms gap >= 2000ms)
    state = processSessionFrame(state, {
      faceDetected: true,
      eyeBlinkLeft: 0.75,
      eyeBlinkRight: 0.75,
      transformationMatrix: neutralMatrix,
      timestampMs: 4500,
    });
    state = processSessionFrame(state, {
      faceDetected: true,
      eyeBlinkLeft: 0.75,
      eyeBlinkRight: 0.75,
      transformationMatrix: neutralMatrix,
      timestampMs: 5600,
    });
    state = processSessionFrame(state, {
      faceDetected: true,
      eyeBlinkLeft: 0.1,
      eyeBlinkRight: 0.1,
      transformationMatrix: neutralMatrix,
      timestampMs: 5700,
    });

    expect(state.events).toHaveLength(2);
  });

  it('finalizes in-progress active events when finalizeSessionEvents is called on stop', () => {
    let state = createInitialSessionEventEngineState();

    state = processSessionFrame(state, {
      faceDetected: true,
      eyeBlinkLeft: 0.85,
      eyeBlinkRight: 0.85,
      transformationMatrix: neutralMatrix,
      timestampMs: 1000,
    });
    state = processSessionFrame(state, {
      faceDetected: true,
      eyeBlinkLeft: 0.85,
      eyeBlinkRight: 0.85,
      transformationMatrix: neutralMatrix,
      timestampMs: 2400,
    });
    expect(state.eyeClosure.isEventActive).toBe(true);
    expect(state.events).toHaveLength(0);

    const finalized = finalizeSessionEvents(state, 2600);
    expect(finalized.eyeClosure.isClosed).toBe(false);
    expect(finalized.events).toHaveLength(1);
    expect(finalized.events[0].durationMs).toBe(1600);
  });
});
