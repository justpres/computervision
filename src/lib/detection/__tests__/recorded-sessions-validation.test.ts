import { describe, it, expect } from 'vitest';
import {
  createInitialSessionEventEngineState,
  processSessionFrame,
  finalizeSessionEvents,
} from '../session-event-engine';
import { buildRotationMatrix4x4 } from '../rules/head-pose';
import { DETECTION_DEFAULTS } from '../config';
import { convertEventsToTimeline } from '@/lib/mock/sample-session-data';

interface FrameWindow {
  startMs: number;
  endMs: number;
  blinkScore?: number;
  yawDegrees?: number;
  pitchDegrees?: number;
}

const SESSION_DURATION_MS = 180_000; // 3-minute short recording
const FRAME_INTERVAL_MS = 125; // 8 fps worker rate (DETECTION_DEFAULTS.targetFps)
const BASE_ISO_MS = Date.parse('2026-11-16T00:00:00.000Z');

/**
 * Replays a deterministic synthetic frame trace over an 8 fps timeline
 * (plus exact segment boundary timestamps) through the pure Phase 1 detection engine.
 */
function replayRecording(windows: readonly FrameWindow[]) {
  const timestamps = new Set<number>();
  for (let t = 0; t <= SESSION_DURATION_MS; t += FRAME_INTERVAL_MS) {
    timestamps.add(t);
  }
  for (const w of windows) {
    timestamps.add(w.startMs);
    timestamps.add(w.endMs);
  }

  const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);
  const neutralMatrix = buildRotationMatrix4x4(0, 0, 0);

  let state = createInitialSessionEventEngineState();
  for (const t of sortedTimestamps) {
    let blinkScore = 0.08;
    let yawDegrees = 0;
    let pitchDegrees = 0;

    for (const w of windows) {
      if (t >= w.startMs && t < w.endMs) {
        if (w.blinkScore !== undefined) blinkScore = w.blinkScore;
        if (w.yawDegrees !== undefined) yawDegrees = w.yawDegrees;
        if (w.pitchDegrees !== undefined) pitchDegrees = w.pitchDegrees;
      }
    }

    const matrix =
      yawDegrees === 0 && pitchDegrees === 0
        ? neutralMatrix
        : buildRotationMatrix4x4(yawDegrees, pitchDegrees, 0);

    state = processSessionFrame(state, {
      faceDetected: true,
      eyeBlinkLeft: blinkScore,
      eyeBlinkRight: blinkScore,
      transformationMatrix: matrix,
      timestampMs: t,
      wallClockIso: new Date(BASE_ISO_MS + t).toISOString(),
    });
  }

  return finalizeSessionEvents(
    state,
    SESSION_DURATION_MS + FRAME_INTERVAL_MS,
    new Date(BASE_ISO_MS + SESSION_DURATION_MS + FRAME_INTERVAL_MS).toISOString()
  );
}

describe('Feature F-20: Replay Validation on Two Short Recordings', () => {
  it('Recording 1 (focused reading): ignores brief blinks/glances and captures 1 eyes_closed + 1 head_turned', () => {
    const windows: FrameWindow[] = [
      // 6 normal blinks (250ms each < 1000ms debounce threshold) -> ignored
      { startMs: 5_000, endMs: 5_250, blinkScore: 0.85 },
      { startMs: 18_000, endMs: 18_250, blinkScore: 0.82 },
      { startMs: 32_000, endMs: 32_250, blinkScore: 0.88 },
      { startMs: 65_000, endMs: 65_250, blinkScore: 0.8 },
      { startMs: 95_000, endMs: 95_250, blinkScore: 0.84 },
      { startMs: 145_000, endMs: 145_250, blinkScore: 0.81 },
      // 2 quick glances (500ms each at 35° yaw < 1000ms threshold) -> ignored
      { startMs: 25_000, endMs: 25_500, yawDegrees: 35 },
      { startMs: 82_000, endMs: 82_500, yawDegrees: -35 },
      // 1 sustained eye closure (1500ms: >= 1000ms, < 2000ms) -> eyes_closed
      { startMs: 40_000, endMs: 41_500, blinkScore: 0.85 },
      // 1 brief desk-note head turn (2000ms at 35° yaw: >= 1000ms, < 3000ms) -> head_turned
      { startMs: 110_000, endMs: 112_000, yawDegrees: 35 },
    ];

    const finalState = replayRecording(windows);

    expect(DETECTION_DEFAULTS.targetFps).toBe(8);
    expect(finalState.counts).toEqual({
      eyesClosed: 1,
      longEyeClosure: 0,
      headTurned: 1,
      lookingAway: 0,
      total: 2,
    });
    expect(finalState.events[0]).toMatchObject({
      eventType: 'eyes_closed',
      startedAtMs: 40_000,
      endedAtMs: 41_500,
      durationMs: 1500,
    });
    expect(finalState.events[1]).toMatchObject({
      eventType: 'head_turned',
      startedAtMs: 110_000,
      endedAtMs: 112_000,
      durationMs: 2000,
    });
  });

  it('Recording 2 (extended rest & turns): records long closures, looking away, and merges <2s gaps', () => {
    const windows: FrameWindow[] = [
      // 2 long eye closures (2500ms and 3000ms >= 2000ms) -> 2 long_eye_closure events
      { startMs: 20_000, endMs: 22_500, blinkScore: 0.85 },
      { startMs: 90_000, endMs: 93_000, blinkScore: 0.88 },
      // 2 sustained looking-away turns (3500ms and 4000ms at 38° yaw >= 3000ms) -> 2 looking_away events
      { startMs: 50_000, endMs: 53_500, yawDegrees: 38 },
      { startMs: 130_000, endMs: 134_000, yawDegrees: -38 },
      // 2 consecutive brief head turns separated by 1200ms (< 2000ms merge window) -> merged into 1 head_turned
      { startMs: 155_000, endMs: 156_500, yawDegrees: 34 },
      { startMs: 157_700, endMs: 159_200, yawDegrees: 34 },
    ];

    const finalState = replayRecording(windows);

    expect(finalState.counts).toEqual({
      eyesClosed: 0,
      longEyeClosure: 2,
      headTurned: 1,
      lookingAway: 2,
      total: 5,
    });

    const mergedHeadEvent = finalState.events.find(
      (evt) => evt.eventType === 'head_turned'
    );
    expect(mergedHeadEvent).toMatchObject({
      eventType: 'head_turned',
      startedAtMs: 155_000,
      endedAtMs: 159_200,
      durationMs: 4200,
    });

    const timeline = convertEventsToTimeline(
      finalState.events,
      new Date(BASE_ISO_MS).toISOString()
    );
    expect(timeline).toHaveLength(5);
    expect(timeline[0].title).toBe('Long eye closure');
    expect(timeline[1].title).toBe('Looking away');
  });
});
