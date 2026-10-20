import { describe, it, expect } from 'vitest';
import {
  EventTypeSchema,
  EventRecordSchema,
  SessionSettingsSchema,
  SessionRecordSchema,
} from '../session';

describe('Session and Event Validation', () => {
  describe('EventTypeSchema', () => {
    it('accepts permitted observable event types', () => {
      expect(EventTypeSchema.parse('eyes_closed')).toBe('eyes_closed');
      expect(EventTypeSchema.parse('long_eye_closure')).toBe('long_eye_closure');
      expect(EventTypeSchema.parse('head_turned')).toBe('head_turned');
      expect(EventTypeSchema.parse('looking_away')).toBe('looking_away');
    });

    it('rejects unsupported and unrecognized event types', () => {
      expect(() => EventTypeSchema.parse('eye_gaze_distraction')).toThrow();
      expect(() => EventTypeSchema.parse('phone_detected')).toThrow();
      expect(() => EventTypeSchema.parse('attention_score_drop')).toThrow();
      expect(() => EventTypeSchema.parse('fatigue_detected')).toThrow();
    });
  });

  describe('EventRecordSchema', () => {
    it('validates a correct event payload', () => {
      const validEvent = {
        session_id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        event_type: 'eyes_closed',
        started_at: '2026-10-20T14:30:00.000Z',
        duration_ms: 1250,
      };

      const parsed = EventRecordSchema.parse(validEvent);
      expect(parsed.session_id).toBe(validEvent.session_id);
      expect(parsed.duration_ms).toBe(1250);
    });

    it('rejects negative duration', () => {
      const invalidEvent = {
        session_id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        event_type: 'eyes_closed',
        started_at: '2026-10-20T14:30:00.000Z',
        duration_ms: -50,
      };

      expect(() => EventRecordSchema.parse(invalidEvent)).toThrow();
    });

    it('rejects invalid UUID for session_id', () => {
      const invalidEvent = {
        session_id: 'not-a-uuid',
        event_type: 'head_turned',
        started_at: '2026-10-20T14:30:00.000Z',
        duration_ms: 3200,
      };

      expect(() => EventRecordSchema.parse(invalidEvent)).toThrow();
    });
  });

  describe('SessionSettingsSchema', () => {
    it('provides sensible defaults when empty object provided', () => {
      const parsed = SessionSettingsSchema.parse({});
      expect(parsed.eyeClosedScoreThreshold).toBe(0.6);
      expect(parsed.eyeClosedDurationMs).toBe(1000);
      expect(parsed.headTurnYawAngleDegrees).toBe(30);
    });

    it('enforces safe bounds on user-adjusted settings', () => {
      // Below min
      expect(() =>
        SessionSettingsSchema.parse({ eyeClosedScoreThreshold: 0.05 })
      ).toThrow();

      // Above max
      expect(() =>
        SessionSettingsSchema.parse({ headTurnYawAngleDegrees: 75 })
      ).toThrow();
    });
  });

  describe('SessionRecordSchema', () => {
    it('validates a compliant session record', () => {
      const validSession = {
        started_at: '2026-10-20T14:00:00.000Z',
        consented_at: '2026-10-20T13:59:50.000Z',
      };

      const parsed = SessionRecordSchema.parse(validSession);
      expect(parsed.consented_at).toBe(validSession.consented_at);
    });
  });
});
