import { z } from 'zod';
import { DETECTION_DEFAULTS } from '../detection/config';

/**
 * Permitted observable event types.
 * Excludes gaze, fatigue, and attention score events.
 */
export const EventTypeSchema = z.enum([
  'eyes_closed',
  'long_eye_closure',
  'head_turned',
  'looking_away',
]);

export type EventType = z.infer<typeof EventTypeSchema>;

/**
 * Safe bounds for adjustable detection settings.
 * Prevents impossible or crash-inducing thresholds.
 */
export const SessionSettingsSchema = z.object({
  eyeClosedScoreThreshold: z
    .number()
    .min(0.1)
    .max(0.95)
    .default(DETECTION_DEFAULTS.eyeClosedScoreThreshold),
  eyeClosedDurationMs: z
    .number()
    .int()
    .min(500)
    .max(5000)
    .default(DETECTION_DEFAULTS.eyeClosedDurationMs),
  longEyeClosureDurationMs: z
    .number()
    .int()
    .min(1000)
    .max(10000)
    .default(DETECTION_DEFAULTS.longEyeClosureDurationMs),
  headTurnYawAngleDegrees: z
    .number()
    .min(15)
    .max(60)
    .default(DETECTION_DEFAULTS.headTurnYawAngleDegrees),
  headTiltPitchAngleDegrees: z
    .number()
    .min(15)
    .max(60)
    .default(DETECTION_DEFAULTS.headTiltPitchAngleDegrees),
  lookingAwayDurationMs: z
    .number()
    .int()
    .min(1000)
    .max(10000)
    .default(DETECTION_DEFAULTS.lookingAwayDurationMs),
  breakReminderMinutes: z
    .number()
    .int()
    .min(15)
    .max(180)
    .default(DETECTION_DEFAULTS.breakReminderMinutes),
});

export type SessionSettings = z.infer<typeof SessionSettingsSchema>;

/**
 * Schema for an event stored in Supabase `events` table.
 * Enforces zero-biometric data: only timing and type are captured.
 */
export const EventRecordSchema = z.object({
  id: z.string().uuid().optional(),
  session_id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  event_type: EventTypeSchema,
  started_at: z.string().datetime(),
  duration_ms: z.number().int().min(0),
});

export type EventRecord = z.infer<typeof EventRecordSchema>;

/**
 * Schema for a study session stored in Supabase `sessions` table.
 */
export const SessionRecordSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  started_at: z.string().datetime(),
  ended_at: z.string().datetime().nullable().optional(),
  consented_at: z.string().datetime(),
  settings: SessionSettingsSchema.optional(),
});

export type SessionRecord = z.infer<typeof SessionRecordSchema>;

/**
 * Schema for an individual event submitted when saving a completed session.
 * Strict validation ensures zero facial landmark, video, or image data can be passed.
 */
export const SaveSessionEventInputSchema = z
  .object({
    id: z.string().min(1).max(128).optional(),
    event_type: EventTypeSchema,
    started_at: z.string().datetime(),
    duration_ms: z.number().int().min(0).max(86_400_000),
  })
  .strict();

export type SaveSessionEventInput = z.infer<typeof SaveSessionEventInputSchema>;

/**
 * Schema for saving a completed study session and its events via Server Action.
 */
export const SaveSessionPayloadSchema = z
  .object({
    id: z.string().uuid(),
    started_at: z.string().datetime(),
    ended_at: z.string().datetime(),
    consented_at: z.string().datetime(),
    settings: SessionSettingsSchema,
    events: z.array(SaveSessionEventInputSchema).max(5000),
  })
  .strict();

export type SaveSessionPayload = z.infer<typeof SaveSessionPayloadSchema>;

/**
 * Schema for deleting a saved study session by UUID.
 */
export const DeleteSessionPayloadSchema = z
  .object({
    sessionId: z.string().uuid(),
  })
  .strict();

export type DeleteSessionPayload = z.infer<typeof DeleteSessionPayloadSchema>;

