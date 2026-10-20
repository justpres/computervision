import React from 'react';
import {
  UserCheck,
  UserX,
  Cpu,
  Eye,
  EyeOff,
  Compass,
  Clock,
  Play,
  Square,
  Sliders,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface SessionEventCounts {
  eyesClosed: number;
  longEyeClosure: number;
  headTurned: number;
  lookingAway: number;
  total: number;
}

export interface LiveStatusCardProps {
  isMonitoring: boolean;
  isWorkerReady: boolean;
  faceDetected: boolean;
  processingTimeMs: number;
  formattedElapsedTime?: string;
  onStart?: () => void;
  onStop?: () => void;
  onOpenSettings?: () => void;
  settingsSummary?: string;
  isEyesClosed?: boolean;
  isLongEyeClosure?: boolean;
  eyeClosureDurationMs?: number;
  eyeBlinkScore?: number;
  isHeadTurned?: boolean;
  isHeadTilted?: boolean;
  isLookingAway?: boolean;
  headPoseDurationMs?: number;
  lookingAwayDurationMs?: number;
  headYawDegrees?: number | null;
  headPitchDegrees?: number | null;
  eventCounts?: SessionEventCounts;
  className?: string;
}

const DEFAULT_COUNTS: SessionEventCounts = {
  eyesClosed: 0,
  longEyeClosure: 0,
  headTurned: 0,
  lookingAway: 0,
  total: 0,
};

/**
 * Unified Live Session & Status Card:
 * - Standby: "Ready to Start" card with primary Start action, privacy disclosures, and settings.
 * - Active: "Active Session" card with Stop action, session duration, live Face status pill in header,
 *   2 generous columns for Eye State and Head Direction (zero text clipping), event counts, and settings.
 * - WCAG 2.1 AAA Enhanced contrast with event-eyes, event-head, and event-away tokens.
 * - Fully accessible with role="status" and aria-live="polite".
 */
export const LiveStatusCard: React.FC<LiveStatusCardProps> = ({
  isMonitoring,
  isWorkerReady,
  faceDetected,
  processingTimeMs,
  formattedElapsedTime = '00:00',
  onStart,
  onStop,
  onOpenSettings,
  settingsSummary,
  isEyesClosed = false,
  isLongEyeClosure = false,
  eyeClosureDurationMs = 0,
  eyeBlinkScore = 0,
  isHeadTurned = false,
  isHeadTilted = false,
  isLookingAway = false,
  headPoseDurationMs = 0,
  lookingAwayDurationMs = 0,
  headYawDegrees = null,
  headPitchDegrees = null,
  eventCounts = DEFAULT_COUNTS,
  className,
}) => {
  if (!isMonitoring) {
    return (
      <div
        className={cn(
          'rounded-lg border border-border bg-surface p-5 sm:p-6 space-y-5 shadow-none',
          className
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-h2 font-semibold text-on-surface">Ready to Start</h2>
            <p className="text-body-sm text-on-surface-muted">
              Click start to begin private webcam study monitoring.
            </p>
          </div>

          {onStart && (
            <Button
              variant="primary"
              size="default"
              onClick={onStart}
              className="w-full sm:w-auto min-w-[150px] gap-2 font-semibold"
              aria-label="Start study session with consent check"
            >
              <Play className="w-4 h-4 fill-current" aria-hidden="true" />
              <span>Start session</span>
            </Button>
          )}
        </div>

        <div className="rounded-md border border-border bg-background p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-label text-on-surface-muted">Session Status</span>
            <span className="text-body-sm font-semibold text-on-surface">Standby</span>
          </div>
          <p className="text-body-sm text-on-surface-muted">
            Your camera only turns on after you review and accept the privacy consent. All detection runs entirely inside your browser.
          </p>
        </div>

        {onOpenSettings && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border text-caption text-on-surface-muted">
            {settingsSummary ? (
              <span className="tabular-nums">Thresholds: {settingsSummary}</span>
            ) : (
              <span>Adjustable detection sensitivity</span>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={onOpenSettings}
              className="gap-2 h-8 px-3 text-caption self-start sm:self-auto"
            >
              <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Detection settings</span>
            </Button>
          </div>
        )}
      </div>
    );
  }

  const effectiveEyeClosed = isEyesClosed || isLongEyeClosure;
  const formattedEyeDurationSec =
    eyeClosureDurationMs >= 500
      ? `${(eyeClosureDurationMs / 1000).toFixed(1)}s`
      : null;

  const isHeadDeviated = isHeadTurned || isHeadTilted || isLookingAway;
  const effectiveHeadDurationMs = Math.max(
    headPoseDurationMs,
    lookingAwayDurationMs || (isLookingAway ? 3000 : 0)
  );
  const formattedHeadDurationSec =
    effectiveHeadDurationMs >= 500
      ? `${(effectiveHeadDurationMs / 1000).toFixed(1)}s`
      : null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'rounded-lg border border-border bg-surface p-5 space-y-4 shadow-none',
        className
      )}
    >
      {/* Top Header: Title, Face Status Pill, Elapsed Duration & Stop Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-h3 font-semibold text-on-surface">Active Session</h3>

            {/* Face Status Pill */}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-semibold transition-colors',
                faceDetected
                  ? 'bg-success-container text-success'
                  : 'bg-caution-container text-caution'
              )}
            >
              {faceDetected ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Face in view</span>
                </>
              ) : (
                <>
                  <UserX className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Looking for face...</span>
                </>
              )}
            </span>

            {/* Worker Engine State */}
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium',
                isWorkerReady
                  ? 'bg-background text-on-surface-muted border border-border'
                  : 'bg-caution-container text-caution'
              )}
            >
              <Cpu className="w-3 h-3" aria-hidden="true" />
              {isWorkerReady ? 'Ready' : 'Starting...'}
            </span>
          </div>

          <p className="text-caption text-on-surface-muted">
            Elapsed duration:{' '}
            <strong className="text-primary font-semibold tabular-nums">
              {formattedElapsedTime}
            </strong>{' '}
            · Monitored locally
          </p>
        </div>

        {onStop && (
          <Button
            variant="danger"
            size="default"
            onClick={onStop}
            className="w-full sm:w-auto min-w-[140px] gap-2 font-semibold self-start sm:self-auto shrink-0"
            aria-label="Stop study session immediately"
          >
            <Square className="w-4 h-4 fill-current" aria-hidden="true" />
            <span>Stop session</span>
          </Button>
        )}
      </div>

      {/* Observable Signals: 2 Wide Equal Columns (Eye State & Head Direction) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Eye Closure State Sub-Card */}
        <div className="rounded-md border border-border bg-background p-3.5 space-y-2.5">
          <span className="text-caption font-semibold uppercase tracking-wider text-on-surface-muted block">
            Eye State
          </span>

          <div className="flex items-center">
            {faceDetected ? (
              <Badge
                variant={effectiveEyeClosed ? 'event-eyes' : 'neutral'}
                className="tabular-nums text-body-sm py-1 px-3 w-full justify-center text-center"
              >
                {effectiveEyeClosed ? (
                  <>
                    {isLongEyeClosure ? (
                      <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <EyeOff className="w-4 h-4 shrink-0" aria-hidden="true" />
                    )}
                    <span>
                      {isLongEyeClosure ? 'Long eye closure' : 'Eyes closed'}
                      {formattedEyeDurationSec ? ` ${formattedEyeDurationSec}` : ''}
                    </span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Eyes open</span>
                  </>
                )}
              </Badge>
            ) : (
              <Badge variant="neutral" className="w-full justify-center py-1">
                No signal
              </Badge>
            )}
          </div>

          <div className="pt-2 border-t border-border/50 flex items-center justify-between text-caption text-on-surface-muted">
            <span>Blink level</span>
            <span className="font-semibold text-on-surface font-tnum">
              {faceDetected ? `${Math.round(eyeBlinkScore * 100)}%` : '—'}
            </span>
          </div>
        </div>

        {/* Head Direction State Sub-Card */}
        <div className="rounded-md border border-border bg-background p-3.5 space-y-2.5">
          <span className="text-caption font-semibold uppercase tracking-wider text-on-surface-muted block">
            Head Direction
          </span>

          <div className="flex items-center">
            {faceDetected ? (
              <Badge
                variant={
                  isLookingAway
                    ? 'event-away'
                    : isHeadDeviated
                      ? 'event-head'
                      : 'neutral'
                }
                className="tabular-nums text-body-sm py-1 px-3 w-full justify-center text-center"
              >
                <Compass className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {isLookingAway
                    ? `Looking away${formattedHeadDurationSec ? ` ${formattedHeadDurationSec}` : ''}`
                    : isHeadDeviated
                      ? `Head turned${formattedHeadDurationSec ? ` ${formattedHeadDurationSec}` : ''}`
                      : 'Head centered'}
                </span>
              </Badge>
            ) : (
              <Badge variant="neutral" className="w-full justify-center py-1">
                No signal
              </Badge>
            )}
          </div>

          <div className="pt-2 border-t border-border/50 flex items-center justify-between text-caption text-on-surface-muted">
            <span>Angles</span>
            <span className="font-semibold text-on-surface font-tnum">
              {faceDetected && headYawDegrees !== null
                ? `Yaw ${Math.round(headYawDegrees)}° · Pitch ${Math.round(headPitchDegrees ?? 0)}°`
                : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Session Event Counts Summary Bar */}
      <div
        aria-label="Session event counts"
        className="rounded-md border border-border bg-background p-3.5 space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <span className="text-label text-on-surface">Session Event Counts</span>
          <span className="text-caption text-on-surface-muted tabular-nums">
            Total recorded: <strong className="text-on-surface">{eventCounts.total}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-sm bg-surface border border-border p-2.5 space-y-0.5">
            <span className="text-caption text-event-eyes font-semibold block">
              Eyes closed
            </span>
            <span
              data-testid="count-eyes-closed"
              className="text-h3 font-semibold text-on-surface tabular-nums block"
            >
              {eventCounts.eyesClosed}
            </span>
          </div>

          <div className="rounded-sm bg-surface border border-border p-2.5 space-y-0.5">
            <span className="text-caption text-event-eyes font-semibold block">
              Long eye closures
            </span>
            <span
              data-testid="count-long-eye-closure"
              className="text-h3 font-semibold text-on-surface tabular-nums block"
            >
              {eventCounts.longEyeClosure}
            </span>
          </div>

          <div className="rounded-sm bg-surface border border-border p-2.5 space-y-0.5">
            <span className="text-caption text-event-head font-semibold block">
              Head turned
            </span>
            <span
              data-testid="count-head-turned"
              className="text-h3 font-semibold text-on-surface tabular-nums block"
            >
              {eventCounts.headTurned}
            </span>
          </div>

          <div className="rounded-sm bg-surface border border-border p-2.5 space-y-0.5">
            <span className="text-caption text-event-away font-semibold block">
              Looking away
            </span>
            <span
              data-testid="count-looking-away"
              className="text-h3 font-semibold text-on-surface tabular-nums block"
            >
              {eventCounts.lookingAway}
            </span>
          </div>
        </div>
      </div>

      {/* Footer: Telemetry & Settings */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-border/60 text-caption text-on-surface-muted">
        <div className="flex items-center gap-3">
          <span>Runs privately in your browser</span>
          {processingTimeMs > 0 && (
            <span className="tabular-nums font-medium">
              Response: <strong className="text-on-surface">{processingTimeMs} ms</strong>
            </span>
          )}
        </div>

        {onOpenSettings && (
          <Button
            type="button"
            variant="secondary"
            onClick={onOpenSettings}
            className="gap-1.5 h-8 px-3 text-caption self-start sm:self-auto"
          >
            <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Detection settings</span>
          </Button>
        )}
      </div>
    </div>
  );
};
