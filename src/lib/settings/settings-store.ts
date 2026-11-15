'use client';

import { useState, useCallback, useEffect } from 'react';
import { DETECTION_DEFAULTS } from '../detection/config';
import {
  SessionSettingsSchema,
  type SessionSettings,
} from '../validation/session';

/**
 * Local settings store and safe-range validator:
 * Adjustable settings for eye closure and head direction.
 *
 * Persists only non-sensitive numeric threshold preferences in browser localStorage.
 * Validated strictly against `SessionSettingsSchema` and UI safe bounds.
 */

export const SETTINGS_STORAGE_KEY = 'computervision.detection.settings.v1';

export const SAFE_SETTINGS_BOUNDS = {
  eyeClosedScoreThreshold: {
    min: 0.1,
    max: 0.9,
    step: 0.05,
    default: DETECTION_DEFAULTS.eyeClosedScoreThreshold,
  },
  eyeClosedDurationMs: {
    min: 500,
    max: 5000,
    step: 100,
    default: DETECTION_DEFAULTS.eyeClosedDurationMs,
  },
  longEyeClosureDurationMs: {
    min: 1500,
    max: 10000,
    step: 500,
    default: DETECTION_DEFAULTS.longEyeClosureDurationMs,
  },
  headTurnYawAngleDegrees: {
    min: 15,
    max: 50,
    step: 1,
    default: DETECTION_DEFAULTS.headTurnYawAngleDegrees,
  },
  headTiltPitchAngleDegrees: {
    min: 15,
    max: 50,
    step: 1,
    default: DETECTION_DEFAULTS.headTiltPitchAngleDegrees,
  },
  lookingAwayDurationMs: {
    min: 1500,
    max: 10000,
    step: 500,
    default: DETECTION_DEFAULTS.lookingAwayDurationMs,
  },
} as const;

export const DEFAULT_SESSION_SETTINGS: SessionSettings =
  SessionSettingsSchema.parse({});

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

/**
 * Clamps and sanitizes an arbitrary settings object into safe bounds,
 * falling back to `DEFAULT_SESSION_SETTINGS` for any missing or corrupted fields.
 */
export function sanitizeSessionSettings(raw: unknown): SessionSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SESSION_SETTINGS };
  }

  const record = raw as Record<string, unknown>;

  const eyeClosedDurationMs = Math.round(
    clampNumber(
      record.eyeClosedDurationMs,
      SAFE_SETTINGS_BOUNDS.eyeClosedDurationMs.min,
      SAFE_SETTINGS_BOUNDS.eyeClosedDurationMs.max,
      DEFAULT_SESSION_SETTINGS.eyeClosedDurationMs
    )
  );

  const candidate = {
    eyeClosedScoreThreshold:
      Math.round(
        clampNumber(
          record.eyeClosedScoreThreshold,
          SAFE_SETTINGS_BOUNDS.eyeClosedScoreThreshold.min,
          SAFE_SETTINGS_BOUNDS.eyeClosedScoreThreshold.max,
          DEFAULT_SESSION_SETTINGS.eyeClosedScoreThreshold
        ) * 100
      ) / 100,
    eyeClosedDurationMs,
    longEyeClosureDurationMs: Math.round(
      clampNumber(
        record.longEyeClosureDurationMs,
        Math.max(
          SAFE_SETTINGS_BOUNDS.longEyeClosureDurationMs.min,
          eyeClosedDurationMs
        ),
        SAFE_SETTINGS_BOUNDS.longEyeClosureDurationMs.max,
        Math.max(
          DEFAULT_SESSION_SETTINGS.longEyeClosureDurationMs,
          eyeClosedDurationMs
        )
      )
    ),
    headTurnYawAngleDegrees: Math.round(
      clampNumber(
        record.headTurnYawAngleDegrees,
        SAFE_SETTINGS_BOUNDS.headTurnYawAngleDegrees.min,
        SAFE_SETTINGS_BOUNDS.headTurnYawAngleDegrees.max,
        DEFAULT_SESSION_SETTINGS.headTurnYawAngleDegrees
      )
    ),
    headTiltPitchAngleDegrees: Math.round(
      clampNumber(
        record.headTiltPitchAngleDegrees,
        SAFE_SETTINGS_BOUNDS.headTiltPitchAngleDegrees.min,
        SAFE_SETTINGS_BOUNDS.headTiltPitchAngleDegrees.max,
        DEFAULT_SESSION_SETTINGS.headTiltPitchAngleDegrees
      )
    ),
    lookingAwayDurationMs: Math.round(
      clampNumber(
        record.lookingAwayDurationMs,
        SAFE_SETTINGS_BOUNDS.lookingAwayDurationMs.min,
        SAFE_SETTINGS_BOUNDS.lookingAwayDurationMs.max,
        DEFAULT_SESSION_SETTINGS.lookingAwayDurationMs
      )
    ),
    breakReminderMinutes: Math.round(
      clampNumber(
        record.breakReminderMinutes,
        15,
        180,
        DEFAULT_SESSION_SETTINGS.breakReminderMinutes
      )
    ),
  };

  const parsed = SessionSettingsSchema.safeParse(candidate);
  return parsed.success ? parsed.data : { ...DEFAULT_SESSION_SETTINGS };
}

/**
 * Strictly validates a partial settings update against `SessionSettingsSchema`
 * and safe slider ranges without silently clamping out-of-bounds values.
 */
export function validateSettingsUpdate(
  current: SessionSettings,
  update: Partial<SessionSettings>
): { success: true; data: SessionSettings } | { success: false; error: string } {
  const merged = { ...current, ...update };

  if (
    !Number.isFinite(merged.eyeClosedScoreThreshold) ||
    merged.eyeClosedScoreThreshold < SAFE_SETTINGS_BOUNDS.eyeClosedScoreThreshold.min ||
    merged.eyeClosedScoreThreshold > SAFE_SETTINGS_BOUNDS.eyeClosedScoreThreshold.max
  ) {
    return {
      success: false,
      error: `Eye closure sensitivity must be between ${SAFE_SETTINGS_BOUNDS.eyeClosedScoreThreshold.min} and ${SAFE_SETTINGS_BOUNDS.eyeClosedScoreThreshold.max}.`,
    };
  }

  if (
    !Number.isFinite(merged.eyeClosedDurationMs) ||
    merged.eyeClosedDurationMs < SAFE_SETTINGS_BOUNDS.eyeClosedDurationMs.min ||
    merged.eyeClosedDurationMs > SAFE_SETTINGS_BOUNDS.eyeClosedDurationMs.max
  ) {
    return {
      success: false,
      error: `Eye closure duration must be between ${SAFE_SETTINGS_BOUNDS.eyeClosedDurationMs.min} ms and ${SAFE_SETTINGS_BOUNDS.eyeClosedDurationMs.max} ms.`,
    };
  }

  if (
    update.eyeClosedDurationMs !== undefined &&
    update.longEyeClosureDurationMs === undefined &&
    merged.longEyeClosureDurationMs < merged.eyeClosedDurationMs
  ) {
    merged.longEyeClosureDurationMs = merged.eyeClosedDurationMs;
  }

  if (
    !Number.isFinite(merged.longEyeClosureDurationMs) ||
    merged.longEyeClosureDurationMs < SAFE_SETTINGS_BOUNDS.longEyeClosureDurationMs.min ||
    merged.longEyeClosureDurationMs > SAFE_SETTINGS_BOUNDS.longEyeClosureDurationMs.max ||
    merged.longEyeClosureDurationMs < merged.eyeClosedDurationMs
  ) {
    return {
      success: false,
      error: `Long eye closure duration must be between ${Math.max(
        SAFE_SETTINGS_BOUNDS.longEyeClosureDurationMs.min,
        merged.eyeClosedDurationMs
      )} ms and ${SAFE_SETTINGS_BOUNDS.longEyeClosureDurationMs.max} ms.`,
    };
  }

  if (
    !Number.isFinite(merged.headTurnYawAngleDegrees) ||
    merged.headTurnYawAngleDegrees < SAFE_SETTINGS_BOUNDS.headTurnYawAngleDegrees.min ||
    merged.headTurnYawAngleDegrees > SAFE_SETTINGS_BOUNDS.headTurnYawAngleDegrees.max
  ) {
    return {
      success: false,
      error: `Head turn angle must be between ${SAFE_SETTINGS_BOUNDS.headTurnYawAngleDegrees.min}° and ${SAFE_SETTINGS_BOUNDS.headTurnYawAngleDegrees.max}°.`,
    };
  }

  if (
    !Number.isFinite(merged.headTiltPitchAngleDegrees) ||
    merged.headTiltPitchAngleDegrees < SAFE_SETTINGS_BOUNDS.headTiltPitchAngleDegrees.min ||
    merged.headTiltPitchAngleDegrees > SAFE_SETTINGS_BOUNDS.headTiltPitchAngleDegrees.max
  ) {
    return {
      success: false,
      error: `Head tilt angle must be between ${SAFE_SETTINGS_BOUNDS.headTiltPitchAngleDegrees.min}° and ${SAFE_SETTINGS_BOUNDS.headTiltPitchAngleDegrees.max}°.`,
    };
  }

  if (
    !Number.isFinite(merged.lookingAwayDurationMs) ||
    merged.lookingAwayDurationMs < SAFE_SETTINGS_BOUNDS.lookingAwayDurationMs.min ||
    merged.lookingAwayDurationMs > SAFE_SETTINGS_BOUNDS.lookingAwayDurationMs.max
  ) {
    return {
      success: false,
      error: `Looking-away duration must be between ${SAFE_SETTINGS_BOUNDS.lookingAwayDurationMs.min} ms and ${SAFE_SETTINGS_BOUNDS.lookingAwayDurationMs.max} ms.`,
    };
  }

  const parsed = SessionSettingsSchema.safeParse(merged);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid detection settings.',
    };
  }

  return { success: true, data: parsed.data };
}

/**
 * Loads persisted detection settings from localStorage, falling back to defaults
 * if none exist or if stored JSON is invalid.
 */
export function loadSessionSettings(): SessionSettings {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return { ...DEFAULT_SESSION_SETTINGS };
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SESSION_SETTINGS };
    }
    const parsedJson: unknown = JSON.parse(raw);
    return sanitizeSessionSettings(parsedJson);
  } catch {
    return { ...DEFAULT_SESSION_SETTINGS };
  }
}

/**
 * Sanitizes and saves detection settings to localStorage.
 */
export function saveSessionSettings(settings: Partial<SessionSettings>): SessionSettings {
  const sanitized = sanitizeSessionSettings({
    ...DEFAULT_SESSION_SETTINGS,
    ...settings,
  });

  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitized));
    } catch {
      // Ignore storage quota errors
    }
  }

  return sanitized;
}

/**
 * Clears custom settings from localStorage and returns defaults.
 */
export function resetSessionSettings(): SessionSettings {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
  return { ...DEFAULT_SESSION_SETTINGS };
}

export interface UseDetectionSettingsReturn {
  settings: SessionSettings;
  updateSettings: (partial: Partial<SessionSettings>) => void;
  resetSettings: () => void;
}

/**
 * React hook for reading and updating detection settings with localStorage persistence.
 */
export function useDetectionSettings(): UseDetectionSettingsReturn {
  const [settings, setSettings] = useState<SessionSettings>(() =>
    DEFAULT_SESSION_SETTINGS
  );

  useEffect(() => {
    setSettings(loadSessionSettings());
  }, []);

  const updateSettings = useCallback((partial: Partial<SessionSettings>) => {
    setSettings((prev) => saveSessionSettings({ ...prev, ...partial }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(resetSessionSettings());
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}
