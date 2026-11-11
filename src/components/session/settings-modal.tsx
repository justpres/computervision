'use client';

import React, { useEffect, useRef } from 'react';
import { Sliders, Eye, EyeOff, Compass, RotateCcw } from 'lucide-react';
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
 * Adjustable detection settings modal with live calibration feedback.
 *
 * - Wide 2-column layout that fits standard laptop viewports without scrolling.
 * - Backdrop blur for elegant depth.
 * - Neutral wording only ("Eyes closed", "Eyes open", "Head turned", "Head centered").
 * - Validates and constrains sliders to SAFE_SETTINGS_BOUNDS.
 * - Live calibration meters let the student blink or turn their head and immediately
 *   see how their movement compares against the configured threshold.
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-md p-3 sm:p-4 overflow-y-auto transition-all animate-in fade-in"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        aria-describedby="settings-modal-description"
        className="w-full max-w-4xl max-h-[94vh] flex flex-col rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-2xl space-y-3 sm:space-y-3.5 my-auto select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            <h2 id="settings-modal-title" className="text-h3 font-semibold text-on-surface">
              Detection Settings &amp; Calibration
            </h2>
          </div>
          <Badge
            variant="experimental"
            tabIndex={0}
            title="Experimental: Thresholds are developer starting defaults not yet calibrated across lighting conditions."
            aria-label="Experimental: Thresholds are developer starting defaults not yet calibrated across lighting conditions"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 shrink-0"
          >
            Experimental
          </Badge>
        </div>

        {/* 2-Column Wide Grid for Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto max-h-[calc(94vh-100px)] py-0.5">
          {/* Column 1: Eye Closure Threshold & Duration */}
          <div className="rounded-xl border border-border bg-background p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-event-eyes shrink-0" aria-hidden="true" />
                <h3 className="text-body font-semibold text-on-surface whitespace-nowrap">
                  Eye Closure Sensitivity
                </h3>
              </div>
              {isMonitoring && faceDetected ? (
                <Badge
                  variant={isEyeAboveThreshold ? 'event-eyes' : 'neutral'}
                  className="tabular-nums text-caption py-0"
                >
                  {isEyeAboveThreshold ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Eyes closed</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Eyes open</span>
                    </>
                  )}
                </Badge>
              ) : isMonitoring ? (
                <Badge variant="neutral" className="text-caption py-0">
                  Looking for face
                </Badge>
              ) : null}
            </div>

            {/* Threshold Slider */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-body-sm">
                <label
                  htmlFor="eye-threshold-slider"
                  className="text-label text-on-surface text-caption sm:text-body-sm"
                >
                  Eye closure threshold
                </label>
                <span className="tabular-nums font-semibold text-primary text-caption sm:text-body-sm">
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
              <div className="flex justify-between text-[11px] text-on-surface-muted tabular-nums">
                <span>0.10 (More sensitive)</span>
                <span>Default: {DEFAULT_SESSION_SETTINGS.eyeClosedScoreThreshold.toFixed(2)}</span>
                <span>0.90 (Less sensitive)</span>
              </div>
            </div>

            {/* Live Eye Calibration Meter */}
            <div className="space-y-0.5 pt-0.5">
              <div className="flex items-center justify-between text-[11px] text-on-surface-muted tabular-nums">
                <span>Live blink level</span>
                <span className="font-semibold text-on-surface">{blinkPercent}%</span>
              </div>
              <div
                className="relative h-2 w-full rounded-full bg-surface border border-border-strong overflow-hidden"
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
            <div className="space-y-0.5 pt-1 border-t border-border">
              <div className="flex items-center justify-between text-body-sm">
                <label
                  htmlFor="eye-duration-slider"
                  className="text-label text-on-surface text-caption sm:text-body-sm"
                >
                  Minimum closure duration
                </label>
                <span className="tabular-nums font-semibold text-primary text-caption sm:text-body-sm">
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
                  })
                }
              />
              <p className="text-[11px] text-on-surface-muted">
                Normal blinks under {(settings.eyeClosedDurationMs / 1000).toFixed(1)}s are ignored.
              </p>
            </div>
          </div>

          {/* Column 2: Head Direction Thresholds */}
          <div className="rounded-xl border border-border bg-background p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-event-head shrink-0" aria-hidden="true" />
                <h3 className="text-body font-semibold text-on-surface whitespace-nowrap">
                  Head Direction Angles
                </h3>
              </div>
              {isMonitoring && faceDetected ? (
                <Badge
                  variant={isHeadDeviatedNow ? 'event-head' : 'neutral'}
                  className="tabular-nums text-caption py-0"
                >
                  <Compass className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{isHeadDeviatedNow ? 'Head turned' : 'Head centered'}</span>
                </Badge>
              ) : isMonitoring ? (
                <Badge variant="neutral" className="text-caption py-0">
                  Looking for face
                </Badge>
              ) : null}
            </div>

            {/* Head Turn Yaw Angle Slider */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-body-sm">
                <label
                  htmlFor="head-yaw-slider"
                  className="text-label text-on-surface text-caption sm:text-body-sm"
                >
                  Head turn angle (left / right yaw)
                </label>
                <span className="tabular-nums font-semibold text-primary text-caption sm:text-body-sm">
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
              <div className="flex justify-between text-[11px] text-on-surface-muted tabular-nums">
                <span>15° (Strict)</span>
                <span>Default: {DEFAULT_SESSION_SETTINGS.headTurnYawAngleDegrees}°</span>
                <span>50° (Wide)</span>
              </div>
            </div>

            {/* Live Yaw Angle Needle Meter */}
            <div className="space-y-0.5 pt-0.5">
              <div className="flex items-center justify-between text-[11px] text-on-surface-muted tabular-nums">
                <span>Live yaw angle needle (-60° to +60°)</span>
                <span className="font-semibold text-on-surface">
                  {Math.round(currentYawDegrees ?? 0)}°
                </span>
              </div>
              <div
                className="relative h-2 w-full rounded-full bg-surface border border-border-strong overflow-hidden"
                aria-label={`Live yaw angle ${Math.round(currentYawDegrees ?? 0)} degrees`}
              >
                {/* Center 0° guide */}
                <div
                  className="absolute top-0 bottom-0 left-1/2 w-px bg-border-strong"
                  title="Center (0°)"
                />
                {/* Left and right yaw threshold markers */}
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
                {/* Live yaw needle */}
                <div
                  className="absolute top-0 bottom-0 w-2 -ml-1 rounded-full bg-event-head transition-all duration-150 motion-reduce:transition-none"
                  style={{ left: `${yawNeedlePercent}%` }}
                  title={`Current yaw: ${Math.round(currentYawDegrees ?? 0)}°`}
                />
              </div>
            </div>

            {/* Head Tilt Pitch Angle Slider */}
            <div className="space-y-0.5 pt-1 border-t border-border">
              <div className="flex items-center justify-between text-body-sm">
                <label
                  htmlFor="head-pitch-slider"
                  className="text-label text-on-surface text-caption sm:text-body-sm"
                >
                  Head tilt angle (up / down pitch)
                </label>
                <span className="tabular-nums font-semibold text-primary text-caption sm:text-body-sm">
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
              <div className="flex justify-between text-[11px] text-on-surface-muted tabular-nums">
                <span>
                  Live yaw: <strong className="text-on-surface">{Math.round(currentYawDegrees ?? 0)}°</strong>
                </span>
                <span>Default: {DEFAULT_SESSION_SETTINGS.headTiltPitchAngleDegrees}°</span>
                <span>
                  Live pitch: <strong className="text-on-surface">{Math.round(currentPitchDegrees ?? 0)}°</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions: Reset to Defaults (secondary) & Done (primary) */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-1.5 shrink-0 border-t border-border/60">
          <Button
            type="button"
            variant="secondary"
            onClick={onResetSettings}
            className="gap-2 h-9 text-body-sm px-3"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Reset to defaults</span>
          </Button>

          <Button
            ref={doneButtonRef}
            type="button"
            variant="primary"
            onClick={onClose}
            className="h-9 px-6 text-body-sm font-semibold"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
