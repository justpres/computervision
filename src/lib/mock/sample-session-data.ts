import type { SavedSessionSummary } from '@/lib/session/session-storage';
import type { SessionDetectionEvent } from '@/lib/detection/session-event-engine';
import { DETECTION_DEFAULTS } from '@/lib/detection/config';

/**
 * Realistic 25-minute student study session mock dataset.
 *
 * Simulates a student focused for 25 minutes (1,500,000 ms) with natural posture adjustments:
 * - 3 eyes closed instances (natural closures >= 0.5s)
 * - 3 long eye closures (resting eyes, thinking with eyes shut for 2.2s - 4.1s)
 * - 8 brief head turns (glancing at desk notes or notebook for 1.5s - 2.8s)
 * - 4 looking away instances (sustained head turn past 3.0s threshold)
 * Total: 18 recorded observable events.
 * Normal blinks (< 1.0s) are automatically filtered out by the debounce engine.
 */

const BASE_START_TIMESTAMP = 1731304800000; // 2026-11-11 14:00:00 UTC
const SESSION_DURATION_MS = 25 * 60 * 1000; // 25 minutes = 1,500,000 ms

export interface MockTimelineItem {
  id: string;
  eventType: 'eyes_closed' | 'long_eye_closure' | 'head_turned' | 'looking_away';
  title: string;
  minuteMark: number; // e.g. 2.4 (minutes into session)
  startedAtMs: number;
  durationMs: number;
  durationSeconds: number;
  timeIntoSessionFormatted: string; // e.g. "02:24"
  startedAtIso: string;
}

export const SAMPLE_SESSION_EVENTS_RAW: Array<{
  type: 'eyes_closed' | 'long_eye_closure' | 'head_turned' | 'looking_away';
  title: string;
  offsetSeconds: number;
  durationSeconds: number;
}> = [
  { type: 'head_turned', title: 'Head turned', offsetSeconds: 78, durationSeconds: 1.8 },
  { type: 'head_turned', title: 'Head turned', offsetSeconds: 142, durationSeconds: 2.1 },
  { type: 'eyes_closed', title: 'Eyes closed', offsetSeconds: 235, durationSeconds: 2.4 },
  { type: 'long_eye_closure', title: 'Long eye closure', offsetSeconds: 310, durationSeconds: 3.2 },
  { type: 'looking_away', title: 'Looking away', offsetSeconds: 420, durationSeconds: 4.5 },
  { type: 'head_turned', title: 'Head turned', offsetSeconds: 512, durationSeconds: 1.6 },
  { type: 'head_turned', title: 'Head turned', offsetSeconds: 615, durationSeconds: 2.0 },
  { type: 'eyes_closed', title: 'Eyes closed', offsetSeconds: 730, durationSeconds: 2.2 },
  { type: 'long_eye_closure', title: 'Long eye closure', offsetSeconds: 840, durationSeconds: 3.8 },
  { type: 'looking_away', title: 'Looking away', offsetSeconds: 915, durationSeconds: 5.1 },
  { type: 'head_turned', title: 'Head turned', offsetSeconds: 1010, durationSeconds: 1.5 },
  { type: 'head_turned', title: 'Head turned', offsetSeconds: 1105, durationSeconds: 2.3 },
  { type: 'looking_away', title: 'Looking away', offsetSeconds: 1180, durationSeconds: 3.6 },
  { type: 'head_turned', title: 'Head turned', offsetSeconds: 1245, durationSeconds: 1.9 },
  { type: 'eyes_closed', title: 'Eyes closed', offsetSeconds: 1310, durationSeconds: 2.5 },
  { type: 'long_eye_closure', title: 'Long eye closure', offsetSeconds: 1375, durationSeconds: 4.1 },
  { type: 'looking_away', title: 'Looking away', offsetSeconds: 1420, durationSeconds: 3.9 },
  { type: 'head_turned', title: 'Head turned', offsetSeconds: 1470, durationSeconds: 1.7 },
];

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const SAMPLE_TIMELINE_EVENTS: MockTimelineItem[] = SAMPLE_SESSION_EVENTS_RAW.map(
  (raw, idx) => {
    const startedAtMs = raw.offsetSeconds * 1000;
    const durationMs = Math.round(raw.durationSeconds * 1000);
    const dateObj = new Date(BASE_START_TIMESTAMP + startedAtMs);
    return {
      id: `sample-evt-${idx + 1}`,
      eventType: raw.type,
      title: raw.title,
      minuteMark: parseFloat((raw.offsetSeconds / 60).toFixed(1)),
      startedAtMs,
      durationMs,
      durationSeconds: raw.durationSeconds,
      timeIntoSessionFormatted: formatTime(raw.offsetSeconds),
      startedAtIso: dateObj.toISOString(),
    };
  }
);

export const SAMPLE_STUDY_SESSION: SavedSessionSummary = {
  id: 'sample-25min-study-session-uuid',
  startedAt: new Date(BASE_START_TIMESTAMP).toISOString(),
  endedAt: new Date(BASE_START_TIMESTAMP + SESSION_DURATION_MS).toISOString(),
  consentedAt: new Date(BASE_START_TIMESTAMP - 5000).toISOString(),
  durationSeconds: 25 * 60, // 1500 seconds
  settings: {
    eyeClosedScoreThreshold: DETECTION_DEFAULTS.eyeClosedScoreThreshold,
    eyeClosedDurationMs: DETECTION_DEFAULTS.eyeClosedDurationMs,
    longEyeClosureDurationMs: DETECTION_DEFAULTS.longEyeClosureDurationMs,
    headTurnYawAngleDegrees: DETECTION_DEFAULTS.headTurnYawAngleDegrees,
    headTiltPitchAngleDegrees: DETECTION_DEFAULTS.headTiltPitchAngleDegrees,
    lookingAwayDurationMs: DETECTION_DEFAULTS.lookingAwayDurationMs,
    breakReminderMinutes: DETECTION_DEFAULTS.breakReminderMinutes,
  },
  counts: {
    eyesClosed: 3,
    longEyeClosure: 3,
    headTurned: 8,
    lookingAway: 4,
    total: 18,
  },
  events: SAMPLE_TIMELINE_EVENTS.map((e) => ({
    id: e.id,
    event_type: e.eventType,
    started_at: e.startedAtIso,
    duration_ms: e.durationMs,
    started_at_ms: e.startedAtMs,
    ended_at_ms: e.startedAtMs + e.durationMs,
  })),
  syncedToCloud: true,
};

/**
 * Converts live engine events or saved events to standard MockTimelineItem format.
 */
export function convertEventsToTimeline(
  events: readonly SessionDetectionEvent[],
  sessionStartIso?: string
): MockTimelineItem[] {
  const baseTime = sessionStartIso ? new Date(sessionStartIso).getTime() : 0;

  return events.map((evt, idx) => {
    let offsetSeconds = Math.floor(evt.startedAtMs / 1000);
    if (sessionStartIso && evt.startedAtIso) {
      const evtTime = new Date(evt.startedAtIso).getTime();
      offsetSeconds = Math.max(0, Math.floor((evtTime - baseTime) / 1000));
    }

    let title = 'Sign detected';
    if (evt.eventType === 'eyes_closed') title = 'Eyes closed';
    else if (evt.eventType === 'long_eye_closure') title = 'Long eye closure';
    else if (evt.eventType === 'head_turned') title = 'Head turned';
    else if (evt.eventType === 'looking_away') title = 'Looking away';

    return {
      id: evt.id || `live-evt-${idx}`,
      eventType: evt.eventType,
      title,
      minuteMark: parseFloat((offsetSeconds / 60).toFixed(1)),
      startedAtMs: evt.startedAtMs,
      durationMs: evt.durationMs,
      durationSeconds: parseFloat((evt.durationMs / 1000).toFixed(1)),
      timeIntoSessionFormatted: formatTime(offsetSeconds),
      startedAtIso: evt.startedAtIso,
    };
  });
}
