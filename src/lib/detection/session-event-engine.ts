import { DETECTION_DEFAULTS } from './config';
import {
  createInitialEyeClosureState,
  evaluateEyeClosure,
  type EyeClosureState,
} from './rules/eye-closure';
import {
  createInitialHeadPoseState,
  evaluateHeadPose,
  type HeadEulerAngles,
  type HeadPoseState,
} from './rules/head-pose';

/**
 * In-memory session event accumulator.
 *
 * Coordinates `evaluateEyeClosure` and `evaluateHeadPose` per frame,
 * merges consecutive events of the same type within `eventMergeDebounceMs`,
 * and maintains an in-memory event list for the live UI.
 */

export type ObservableDetectionEventType = 'eyes_closed' | 'head_turned';

export interface SessionDetectionEvent {
  id: string;
  eventType: ObservableDetectionEventType;
  startedAtMs: number;
  endedAtMs: number;
  durationMs: number;
  startedAtIso: string;
}

export interface DetectionEngineThresholds {
  eyeClosedScoreThreshold?: number;
  eyeClosedDurationMs?: number;
  headTurnYawAngleDegrees?: number;
  headTiltPitchAngleDegrees?: number;
  eventMergeDebounceMs?: number;
}

export interface SessionEventEngineState {
  eyeClosure: EyeClosureState;
  headPose: HeadPoseState;
  averageBlinkScore: number;
  headAngles: HeadEulerAngles | null;
  events: SessionDetectionEvent[];
  nextEventSeq: number;
}

export interface EngineFrameInput {
  faceDetected: boolean;
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  transformationMatrix: readonly number[] | null | undefined;
  timestampMs: number;
  wallClockIso?: string;
  thresholds?: DetectionEngineThresholds;
}

/**
 * Creates a clean initial state for the session event engine.
 */
export function createInitialSessionEventEngineState(): SessionEventEngineState {
  return {
    eyeClosure: createInitialEyeClosureState(),
    headPose: createInitialHeadPoseState(),
    averageBlinkScore: 0,
    headAngles: null,
    events: [],
    nextEventSeq: 1,
  };
}

/**
 * Appends a completed event to the event list, or merges it into the most recent
 * event of the same type if the gap between them is less than `mergeDebounceMs`.
 */
function appendOrMergeEvent(
  existingEvents: readonly SessionDetectionEvent[],
  candidate: {
    eventType: ObservableDetectionEventType;
    startedAtMs: number;
    endedAtMs: number;
    durationMs: number;
  },
  seq: number,
  wallClockIso: string,
  mergeDebounceMs: number
): { events: SessionDetectionEvent[]; nextSeq: number } {
  if (mergeDebounceMs > 0 && existingEvents.length > 0) {
    // Find the latest event of the same type
    for (let i = existingEvents.length - 1; i >= 0; i--) {
      const prev = existingEvents[i];
      if (prev.eventType === candidate.eventType) {
        const gapMs = candidate.startedAtMs - prev.endedAtMs;
        if (gapMs >= 0 && gapMs < mergeDebounceMs) {
          const mergedEndedAtMs = Math.max(prev.endedAtMs, candidate.endedAtMs);
          const mergedDurationMs = Math.round(mergedEndedAtMs - prev.startedAtMs);
          const updated: SessionDetectionEvent = {
            ...prev,
            endedAtMs: mergedEndedAtMs,
            durationMs: mergedDurationMs,
          };
          const nextEvents = [...existingEvents];
          nextEvents[i] = updated;
          return { events: nextEvents, nextSeq: seq };
        }
        break;
      }
    }
  }

  const newEvent: SessionDetectionEvent = {
    id: `evt-${seq}-${candidate.eventType}-${Math.round(candidate.startedAtMs)}`,
    eventType: candidate.eventType,
    startedAtMs: candidate.startedAtMs,
    endedAtMs: candidate.endedAtMs,
    durationMs: candidate.durationMs,
    startedAtIso: wallClockIso,
  };

  return {
    events: [...existingEvents, newEvent],
    nextSeq: seq + 1,
  };
}

/**
 * Evaluates a single frame through both eye closure and head pose
 * pure detection rules and updates the session event accumulator.
 */
export function processSessionFrame(
  prevState: SessionEventEngineState,
  input: EngineFrameInput
): SessionEventEngineState {
  const thresholds = input.thresholds ?? {};
  const mergeDebounceMs =
    thresholds.eventMergeDebounceMs ?? DETECTION_DEFAULTS.eventMergeDebounceMs;
  const wallClockIso = input.wallClockIso ?? new Date().toISOString();

  const eyeEval = evaluateEyeClosure(prevState.eyeClosure, {
    faceDetected: input.faceDetected,
    eyeBlinkLeft: input.eyeBlinkLeft,
    eyeBlinkRight: input.eyeBlinkRight,
    timestampMs: input.timestampMs,
    scoreThreshold: thresholds.eyeClosedScoreThreshold,
    durationThresholdMs: thresholds.eyeClosedDurationMs,
  });

  const headEval = evaluateHeadPose(prevState.headPose, {
    faceDetected: input.faceDetected,
    transformationMatrix: input.transformationMatrix,
    timestampMs: input.timestampMs,
    yawThresholdDegrees: thresholds.headTurnYawAngleDegrees,
    pitchThresholdDegrees: thresholds.headTiltPitchAngleDegrees,
    minEventDurationMs: thresholds.eyeClosedDurationMs,
  });

  let events = prevState.events;
  let nextEventSeq = prevState.nextEventSeq;

  if (eyeEval.completedEvent) {
    const res = appendOrMergeEvent(
      events,
      eyeEval.completedEvent,
      nextEventSeq,
      wallClockIso,
      mergeDebounceMs
    );
    events = res.events;
    nextEventSeq = res.nextSeq;
  }

  if (headEval.completedEvent) {
    const res = appendOrMergeEvent(
      events,
      headEval.completedEvent,
      nextEventSeq,
      wallClockIso,
      mergeDebounceMs
    );
    events = res.events;
    nextEventSeq = res.nextSeq;
  }

  return {
    eyeClosure: eyeEval.state,
    headPose: headEval.state,
    averageBlinkScore: eyeEval.averageBlinkScore,
    headAngles: headEval.angles,
    events,
    nextEventSeq,
  };
}

/**
 * Finalizes any currently active events when a session stops, then resets active flags.
 */
export function finalizeSessionEvents(
  prevState: SessionEventEngineState,
  timestampMs: number,
  wallClockIso?: string
): SessionEventEngineState {
  return processSessionFrame(prevState, {
    faceDetected: false,
    eyeBlinkLeft: 0,
    eyeBlinkRight: 0,
    transformationMatrix: null,
    timestampMs,
    wallClockIso,
  });
}
