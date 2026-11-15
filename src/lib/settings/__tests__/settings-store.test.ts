import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_SESSION_SETTINGS,
  SETTINGS_STORAGE_KEY,
  sanitizeSessionSettings,
  validateSettingsUpdate,
  loadSessionSettings,
  saveSessionSettings,
  resetSessionSettings,
} from '../settings-store';

describe('Detection Settings Store', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns default settings when localStorage is empty', () => {
    const loaded = loadSessionSettings();
    expect(loaded).toEqual(DEFAULT_SESSION_SETTINGS);
    expect(loaded.eyeClosedScoreThreshold).toBe(0.6);
    expect(loaded.eyeClosedDurationMs).toBe(1000);
    expect(loaded.headTurnYawAngleDegrees).toBe(30);
    expect(loaded.headTiltPitchAngleDegrees).toBe(25);
  });

  it('saves valid custom settings to localStorage and loads them back', () => {
    const saved = saveSessionSettings({
      eyeClosedScoreThreshold: 0.5,
      headTurnYawAngleDegrees: 35,
      headTiltPitchAngleDegrees: 28,
      eyeClosedDurationMs: 1200,
    });

    expect(saved.eyeClosedScoreThreshold).toBe(0.5);
    expect(saved.headTurnYawAngleDegrees).toBe(35);
    expect(saved.headTiltPitchAngleDegrees).toBe(28);
    expect(saved.eyeClosedDurationMs).toBe(1200);

    const loaded = loadSessionSettings();
    expect(loaded).toEqual(saved);
  });

  it('clamps out-of-range values into safe bounds during sanitizeSessionSettings', () => {
    const sanitized = sanitizeSessionSettings({
      eyeClosedScoreThreshold: 0.01, // below 0.1 min
      headTurnYawAngleDegrees: 85, // above 50 max
      headTiltPitchAngleDegrees: 5, // below 15 min
      eyeClosedDurationMs: 100, // below 500 min
    });

    expect(sanitized.eyeClosedScoreThreshold).toBe(0.1);
    expect(sanitized.headTurnYawAngleDegrees).toBe(50);
    expect(sanitized.headTiltPitchAngleDegrees).toBe(15);
    expect(sanitized.eyeClosedDurationMs).toBe(500);
  });

  it('falls back to defaults when stored JSON in localStorage is corrupted', () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, '{corrupted-json');
    const loaded = loadSessionSettings();
    expect(loaded).toEqual(DEFAULT_SESSION_SETTINGS);
  });

  it('rejects out-of-range and non-finite values in validateSettingsUpdate', () => {
    const badEye = validateSettingsUpdate(DEFAULT_SESSION_SETTINGS, {
      eyeClosedScoreThreshold: 0.99,
    });
    expect(badEye.success).toBe(false);

    const nanEye = validateSettingsUpdate(DEFAULT_SESSION_SETTINGS, {
      eyeClosedScoreThreshold: Number.NaN,
    });
    expect(nanEye.success).toBe(false);

    const badDuration = validateSettingsUpdate(DEFAULT_SESSION_SETTINGS, {
      eyeClosedDurationMs: 250,
    });
    expect(badDuration.success).toBe(false);

    const badYaw = validateSettingsUpdate(DEFAULT_SESSION_SETTINGS, {
      headTurnYawAngleDegrees: 10,
    });
    expect(badYaw.success).toBe(false);

    const badPitch = validateSettingsUpdate(DEFAULT_SESSION_SETTINGS, {
      headTiltPitchAngleDegrees: 55,
    });
    expect(badPitch.success).toBe(false);

    const valid = validateSettingsUpdate(DEFAULT_SESSION_SETTINGS, {
      eyeClosedScoreThreshold: 0.65,
      eyeClosedDurationMs: 1200,
      headTurnYawAngleDegrees: 28,
      headTiltPitchAngleDegrees: 22,
    });
    expect(valid.success).toBe(true);
  });

  it('resets settings back to defaults and clears localStorage', () => {
    saveSessionSettings({ eyeClosedScoreThreshold: 0.45 });
    expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).not.toBeNull();

    const reset = resetSessionSettings();
    expect(reset).toEqual(DEFAULT_SESSION_SETTINGS);
    expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
  });

  it('enforces longEyeClosureDurationMs >= eyeClosedDurationMs and validates lookingAwayDurationMs bounds', () => {
    const sanitized = sanitizeSessionSettings({
      eyeClosedDurationMs: 2500,
      longEyeClosureDurationMs: 1800, // below eyeClosedDurationMs -> bumped to 2500
      lookingAwayDurationMs: 900, // below 1500 min -> clamped to 1500
    });
    expect(sanitized.eyeClosedDurationMs).toBe(2500);
    expect(sanitized.longEyeClosureDurationMs).toBe(2500);
    expect(sanitized.lookingAwayDurationMs).toBe(1500);

    const invalidLongEye = validateSettingsUpdate(DEFAULT_SESSION_SETTINGS, {
      eyeClosedDurationMs: 2200,
      longEyeClosureDurationMs: 1800,
    });
    expect(invalidLongEye.success).toBe(false);

    const invalidLookingAway = validateSettingsUpdate(DEFAULT_SESSION_SETTINGS, {
      lookingAwayDurationMs: 1200,
    });
    expect(invalidLookingAway.success).toBe(false);

    const validM2 = validateSettingsUpdate(DEFAULT_SESSION_SETTINGS, {
      longEyeClosureDurationMs: 2500,
      lookingAwayDurationMs: 3500,
    });
    expect(validM2.success).toBe(true);
  });
});
