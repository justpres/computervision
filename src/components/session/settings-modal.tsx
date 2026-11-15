'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  SAFE_SETTINGS_BOUNDS,
  DEFAULT_SESSION_SETTINGS,
} from '@/lib/settings/settings-store';
import type { SessionSettings } from '@/lib/validation/session';

export interface SettingsModalProps {
  isOpen: boolean;
  settings: SessionSettings;
  onUpdateSettings: (partial: Partial<SessionSettings>) => void;
  onResetSettings: () => void;
  onClose: () => void;
  /** Live calibration telemetry when camera monitoring is active */
  isMonitoring: boolean;
  faceDetected: boolean;
  currentBlinkLevel: number;
  currentYawDegrees: number | null;
  currentPitchDegrees: number | null;
}

/**
 * Adjustable detection settings & calibration inspector (Pattern B: Right-Hand Slide-Over Drawer):
 * - Zero decorative icons (only functional X close button).
 * - Zero nested cards: exposed hairline dividers (`divide-y divide-border`) inside a single slide-over drawer.
 * - Neutral wording only ("Eyes closed", "Eyes open", "Head turned", "Head centered").
 * - Validates and constrains sliders to SAFE_SETTINGS_BOUNDS.
 */
export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  onResetSettings,
  onClose,
  isMonitoring,
  faceDetected,
  currentBlinkLevel,
  currentYawDegrees,
  currentPitchDegrees,
}) => {
  const doneButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    doneButtonRef.current?.focus();

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isEyeAboveThreshold =
    faceDetected && currentBlinkLevel >= settings.eyeClosedScoreThreshold;
  const absYaw = currentYawDegrees !== null ? Math.abs(currentYawDegrees) : 0;
  const absPitch =
    currentPitchDegrees !== null ? Math.abs(currentPitchDegrees) : 0;
  const isHeadTurnedNow =
    faceDetected &&
    currentYawDegrees !== null &&
    absYaw >= settings.headTurnYawAngleDegrees;
  const isHeadTiltedNow =
    faceDetected &&
    currentPitchDegrees !== null &&
    absPitch >= settings.headTiltPitchAngleDegrees;
  const isHeadDeviatedNow = isHeadTurnedNow || isHeadTiltedNow;

  const blinkPercent = Math.min(100, Math.max(0, Math.round(currentBlinkLevel * 100)));
  const thresholdPercent = Math.round(settings.eyeClosedScoreThreshold * 100);

  // Map yaw angle in [-60°, +60°] to [0%, 100%] with 50% as 0° center
  const clampedYaw = Math.min(60, Math.max(-60, currentYawDegrees ?? 0));
  const yawNeedlePercent = Math.round(((clampedYaw + 60) / 120) * 100);
  const yawLeftBoundPercent = Math.round(
    ((-settings.headTurnYawAngleDegrees + 60) / 120) * 100
  );
  const yawRightBoundPercent = Math.round(
    ((settings.headTurnYawAngleDegrees + 60) / 120) * 100
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-on-surface/40 backdrop-blur-sm calm-fade-in"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        aria-describedby="settings-modal-description"
        className="w-full max-w-lg h-full flex flex-col border-l border-border bg-surface shadow-xl divide-y divide-border select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Inspector Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <h2 id="settings-modal-title" className="text-body-sm font-semibold tracking-tight text-on-surface truncate">
              Detection Settings &amp; Calibration
            </h2>
            <Badge
              variant="experimental"
              tabIndex={0}
              title="Experimental: Thresholds are developer starting defaults not yet calibrated across lighting conditions."
              aria-label="Experimental: Thresholds are developer starting defaults not yet calibrated across lighting conditions"
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 shrink-0"
            >
              Experimental
            </Badge>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings inspector"
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] -mr-2 rounded-md text-on-surface-muted hover:text-on-surface hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Hairline-Divided Inspector Body (Zero Nested Cards) */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {/* Section 1: Eye Closure Sensitivity */}
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-body-sm font-semibold tracking-tight text-on-surface">
                Eye Closure Sensitivity
              </h3>
              {isMonitoring && faceDetected ? (
                <span className="inline-flex items-center gap-2 text-caption font-mono text-on-surface tabular-nums">
                  <span
                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      isEyeAboveThreshold ? 'bg-event-eyes' : 'bg-success'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{isEyeAboveThreshold ? 'Eyes closed' : 'Eyes open'}</span>
                </span>
              ) : isMonitoring ? (
                <span className="inline-flex items-center gap-2 text-caption font-mono text-on-surface-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-caution shrink-0" aria-hidden="true" />
                  <span>Looking for face</span>
                </span>
              ) : null}
            </div>

            {/* Threshold Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-caption">
                <label
                  htmlFor="eye-threshold-slider"
                  className="font-medium text-on-surface"
                >
                  Eye closure sensitivity
                </label>
                <span className="font-mono font-semibold text-on-surface tabular-nums">
                  {settings.eyeClosedScoreThreshold.toFixed(2)} ({thresholdPercent}%)
                </span>
              </div>
              <Slider
                id="eye-threshold-slider"
                aria-label="Eye closure threshold"
                min={SAFE_SETTINGS_BOUNDS.eyeClosedScoreThreshold.min}
                max={SAFE_SETTINGS_BOUNDS.eyeClosedScoreThreshold.max}
                step={SAFE_SETTINGS_BOUNDS.eyeClosedScoreThreshold.step}
                value={settings.eyeClosedScoreThreshold}
                onValueChange={(val) =>
                  onUpdateSettings({ eyeClosedScoreThreshold: val })
                }
              />
              <div className="flex justify-between font-mono text-[11px] text-on-surface-muted tabular-nums">
                <span>0.10 (More sensitive)</span>
                <span>Default: {DEFAULT_SESSION_SETTINGS.eyeClosedScoreThreshold.toFixed(2)}</span>
                <span>0.90 (Less sensitive)</span>
              </div>
            </div>

            {/* Live Eye Calibration Meter (4px linear bar per 8.4 Tufte) */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between font-mono text-[11px] text-on-surface-muted tabular-nums">
                <span>Current eye closure</span>
                <span className="font-semibold text-on-surface">{blinkPercent}%</span>
              </div>
              <div
                className="relative h-1.5 w-full rounded-sm bg-background border border-border-strong overflow-hidden"
                aria-label={`Live blink level ${blinkPercent} percent`}
              >
                <div
                  className="h-full bg-event-eyes transition-all duration-150 motion-reduce:transition-none"
                  style={{ width: `${blinkPercent}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-on-surface"
                  style={{ left: `${thresholdPercent}%` }}
                  title={`Threshold: ${thresholdPercent}%`}
                />
              </div>
            </div>

            {/* Minimum Continuous Closure Duration Slider */}
            <div className="space-y-1 pt-3 border-t border-border">
              <div className="flex items-center justify-between text-caption">
                <label
                  htmlFor="eye-duration-slider"
                  className="font-medium text-on-surface"
                >
                  Minimum closure duration
                </label>
                <span className="font-mono font-semibold text-on-surface tabular-nums">
                  {(settings.eyeClosedDurationMs / 1000).toFixed(1)} s ({settings.eyeClosedDurationMs} ms)
                </span>
              </div>
              <Slider
                id="eye-duration-slider"
                aria-label="Minimum closure duration"
                min={SAFE_SETTINGS_BOUNDS.eyeClosedDurationMs.min}
                max={SAFE_SETTINGS_BOUNDS.eyeClosedDurationMs.max}
                step={SAFE_SETTINGS_BOUNDS.eyeClosedDurationMs.step}
                value={settings.eyeClosedDurationMs}
                onValueChange={(val) =>
                  onUpdateSettings({
                    eyeClosedDurationMs: val,
                    longEyeClosureDurationMs: Math.max(
                      settings.longEyeClosureDurationMs,
                      val
                    ),
                  })
                }
              />
              <p className="text-[11px] text-on-surface-muted tabular-nums">
                Normal blinks under {(settings.eyeClosedDurationMs / 1000).toFixed(1)}s are ignored.
              </p>
            </div>

            {/* Long Eye Closure Duration Slider */}
            <div className="space-y-1 pt-3 border-t border-border">
              <div className="flex items-center justify-between text-caption">
                <label
                  htmlFor="long-eye-duration-slider"
                  className="font-medium text-on-surface"
                >
                  Long eye closure duration
                </label>
                <span className="font-mono font-semibold text-on-surface tabular-nums">
                  {(settings.longEyeClosureDurationMs / 1000).toFixed(1)} s ({settings.longEyeClosureDurationMs} ms)
                </span>
              </div>
              <Slider
                id="long-eye-duration-slider"
                aria-label="Long eye closure duration"
                min={Math.max(
                  SAFE_SETTINGS_BOUNDS.longEyeClosureDurationMs.min,
                  settings.eyeClosedDurationMs
                )}
                max={SAFE_SETTINGS_BOUNDS.longEyeClosureDurationMs.max}
                step={SAFE_SETTINGS_BOUNDS.longEyeClosureDurationMs.step}
                value={settings.longEyeClosureDurationMs}
                onValueChange={(val) =>
                  onUpdateSettings({
                    longEyeClosureDurationMs: Math.max(
                      settings.eyeClosedDurationMs,
                      val
                    ),
                  })
                }
              />
              <p className="text-[11px] text-on-surface-muted tabular-nums">
                Eye closures reaching {(settings.longEyeClosureDurationMs / 1000).toFixed(1)}s are recorded as long closures.
              </p>
            </div>
          </div>

          {/* Section 2: Head Direction Thresholds */}
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-body-sm font-semibold tracking-tight text-on-surface">
                Head Direction Angles
              </h3>
              {isMonitoring && faceDetected ? (
                <span className="inline-flex items-center gap-2 text-caption font-mono text-on-surface tabular-nums">
                  <span
                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      isHeadDeviatedNow ? 'bg-event-head' : 'bg-success'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{isHeadDeviatedNow ? 'Head turned' : 'Head centered'}</span>
                </span>
              ) : isMonitoring ? (
                <span className="inline-flex items-center gap-2 text-caption font-mono text-on-surface-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-caution shrink-0" aria-hidden="true" />
                  <span>Looking for face</span>
                </span>
              ) : null}
            </div>

            {/* Head Turn Yaw Angle Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-caption">
                <label
                  htmlFor="head-yaw-slider"
                  className="font-medium text-on-surface"
                >
                  Head turn angle (left or right)
                </label>
                <span className="font-mono font-semibold text-on-surface tabular-nums">
                  {settings.headTurnYawAngleDegrees}°
                </span>
              </div>
              <Slider
                id="head-yaw-slider"
                aria-label="Head turn angle (left / right yaw)"
                min={SAFE_SETTINGS_BOUNDS.headTurnYawAngleDegrees.min}
                max={SAFE_SETTINGS_BOUNDS.headTurnYawAngleDegrees.max}
                step={SAFE_SETTINGS_BOUNDS.headTurnYawAngleDegrees.step}
                value={settings.headTurnYawAngleDegrees}
                onValueChange={(val) =>
                  onUpdateSettings({ headTurnYawAngleDegrees: val })
                }
              />
              <div className="flex justify-between font-mono text-[11px] text-on-surface-muted tabular-nums">
                <span>15° (Small turn)</span>
                <span>Default: {DEFAULT_SESSION_SETTINGS.headTurnYawAngleDegrees}°</span>
                <span>50° (Wide turn)</span>
              </div>
            </div>

            {/* Live Yaw Angle Needle Meter */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between font-mono text-[11px] text-on-surface-muted tabular-nums">
                <span>Current left / right turn (-60° to +60°)</span>
                <span className="font-semibold text-on-surface">
                  {Math.round(currentYawDegrees ?? 0)}°
                </span>
              </div>
              <div
                className="relative h-1.5 w-full rounded-sm bg-background border border-border-strong overflow-hidden"
                aria-label={`Live yaw angle ${Math.round(currentYawDegrees ?? 0)} degrees`}
              >
                <div
                  className="absolute top-0 bottom-0 left-1/2 w-px bg-border-strong"
                  title="Center (0°)"
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-on-surface"
                  style={{ left: `${yawLeftBoundPercent}%` }}
                  title={`Left threshold: -${settings.headTurnYawAngleDegrees}°`}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-on-surface"
                  style={{ left: `${yawRightBoundPercent}%` }}
                  title={`Right threshold: +${settings.headTurnYawAngleDegrees}°`}
                />
                <div
                  className="absolute top-0 bottom-0 w-2 -ml-1 rounded-sm bg-event-head transition-all duration-150 motion-reduce:transition-none"
                  style={{ left: `${yawNeedlePercent}%` }}
                  title={`Current turn: ${Math.round(currentYawDegrees ?? 0)}°`}
                />
              </div>
            </div>

            {/* Head Tilt Pitch Angle Slider */}
            <div className="space-y-1 pt-3 border-t border-border">
              <div className="flex items-center justify-between text-caption">
                <label
                  htmlFor="head-pitch-slider"
                  className="font-medium text-on-surface"
                >
                  Head tilt angle (up or down)
                </label>
                <span className="font-mono font-semibold text-on-surface tabular-nums">
                  {settings.headTiltPitchAngleDegrees}°
                </span>
              </div>
              <Slider
                id="head-pitch-slider"
                aria-label="Head tilt angle (up / down pitch)"
                min={SAFE_SETTINGS_BOUNDS.headTiltPitchAngleDegrees.min}
                max={SAFE_SETTINGS_BOUNDS.headTiltPitchAngleDegrees.max}
                step={SAFE_SETTINGS_BOUNDS.headTiltPitchAngleDegrees.step}
                value={settings.headTiltPitchAngleDegrees}
                onValueChange={(val) =>
                  onUpdateSettings({ headTiltPitchAngleDegrees: val })
                }
              />
              <div className="flex justify-between font-mono text-[11px] text-on-surface-muted tabular-nums">
                <span>
                  Left / right: <strong className="text-on-surface">{Math.round(currentYawDegrees ?? 0)}°</strong>
                </span>
                <span>Default: {DEFAULT_SESSION_SETTINGS.headTiltPitchAngleDegrees}°</span>
                <span>
                  Up / down: <strong className="text-on-surface">{Math.round(currentPitchDegrees ?? 0)}°</strong>
                </span>
              </div>
            </div>

            {/* Looking-Away Duration Slider */}
            <div className="space-y-1 pt-3 border-t border-border">
              <div className="flex items-center justify-between text-caption">
                <label
                  htmlFor="looking-away-duration-slider"
                  className="font-medium text-on-surface"
                >
                  Looking-away duration
                </label>
                <span className="font-mono font-semibold text-on-surface tabular-nums">
                  {(settings.lookingAwayDurationMs / 1000).toFixed(1)} s ({settings.lookingAwayDurationMs} ms)
                </span>
              </div>
              <Slider
                id="looking-away-duration-slider"
                aria-label="Looking-away duration"
                min={SAFE_SETTINGS_BOUNDS.lookingAwayDurationMs.min}
                max={SAFE_SETTINGS_BOUNDS.lookingAwayDurationMs.max}
                step={SAFE_SETTINGS_BOUNDS.lookingAwayDurationMs.step}
                value={settings.lookingAwayDurationMs}
                onValueChange={(val) =>
                  onUpdateSettings({ lookingAwayDurationMs: val })
                }
              />
              <p className="text-[11px] text-on-surface-muted tabular-nums">
                Head turns held for {(settings.lookingAwayDurationMs / 1000).toFixed(1)}s are recorded as looking away.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions: Reset to Defaults (secondary) & Done (1 primary CTA) */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-background/40 shrink-0">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onResetSettings}
            className="min-h-[44px] px-4 rounded-md shadow-none text-caption font-medium"
          >
            <span>Reset to defaults</span>
          </Button>

          <Button
            ref={doneButtonRef}
            type="button"
            variant="primary"
            size="sm"
            onClick={onClose}
            className="min-h-[44px] px-6 rounded-md shadow-none text-caption font-semibold"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
