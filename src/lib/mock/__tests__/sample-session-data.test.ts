import { describe, it, expect } from 'vitest';
import {
  SAMPLE_STUDY_SESSION,
  SAMPLE_TIMELINE_EVENTS,
  convertEventsToTimeline,
} from '../sample-session-data';
import type { SessionDetectionEvent } from '@/lib/detection/session-event-engine';

describe('Sample Session Data & Converter', () => {
  it('provides a realistic 25-minute mock session structure', () => {
    expect(SAMPLE_STUDY_SESSION.durationSeconds).toBe(1500);
    expect(SAMPLE_STUDY_SESSION.events.length).toBe(18);
    expect(SAMPLE_TIMELINE_EVENTS.length).toBe(18);

    // Verify non-empty counts and mathematical consistency
    expect(SAMPLE_STUDY_SESSION.counts.eyesClosed).toBe(3);
    expect(SAMPLE_STUDY_SESSION.counts.longEyeClosure).toBe(3);
    expect(SAMPLE_STUDY_SESSION.counts.headTurned).toBe(8);
    expect(SAMPLE_STUDY_SESSION.counts.lookingAway).toBe(4);
    expect(SAMPLE_STUDY_SESSION.counts.total).toBe(18);
    expect(SAMPLE_STUDY_SESSION.counts.total).toBe(SAMPLE_STUDY_SESSION.events.length);
    expect(
      SAMPLE_STUDY_SESSION.counts.eyesClosed +
        SAMPLE_STUDY_SESSION.counts.longEyeClosure +
        SAMPLE_STUDY_SESSION.counts.headTurned +
        SAMPLE_STUDY_SESSION.counts.lookingAway
    ).toBe(SAMPLE_STUDY_SESSION.counts.total);
  });

  it('converts live SessionDetectionEvent items to timeline items correctly', () => {
    const rawEvents: SessionDetectionEvent[] = [
      {
        id: 'test-1',
        eventType: 'eyes_closed',
        startedAtMs: 65000,
        endedAtMs: 67200,
        durationMs: 2200,
        startedAtIso: new Date(1731304865000).toISOString(),
      },
      {
        id: 'test-2',
        eventType: 'looking_away',
        startedAtMs: 125000,
        endedAtMs: 129500,
        durationMs: 4500,
        startedAtIso: new Date(1731304925000).toISOString(),
      },
    ];

    const converted = convertEventsToTimeline(
      rawEvents,
      new Date(1731304800000).toISOString()
    );

    expect(converted.length).toBe(2);
    expect(converted[0].title).toBe('Eyes closed');
    expect(converted[0].durationSeconds).toBe(2.2);
    expect(converted[0].minuteMark).toBe(1.1);

    expect(converted[1].title).toBe('Looking away');
    expect(converted[1].durationSeconds).toBe(4.5);
  });
});
