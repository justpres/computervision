import React from 'react';
import {
  User,
  Eye,
  EyeOff,
  Compass,
  Clock,
  Play,
  Square,
  Sliders,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatusRow } from '@/components/session/status-row';

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
  processingTimeMs?: number;
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
 * Student-focused Live Session & Status Card:
 * - Standby: "Ready to start" card with primary Start action, privacy disclosures, and optional settings.
 * - Active: "Session in progress" card with Stop action, fixed-label live status list (Face, Eyes, Head),
 *   and "This session" event counts summary.
 * - All developer telemetry (angles, blink score %, latency ms, engine state, threshold strings) is removed from the student view.
 * - Elapsed duration lives in the header MonitoringIndicator to eliminate redundancy.
 * - Fully accessible with role="status" and aria-live="polite".
 */
export const LiveStatusCard: React.FC<LiveStatusCardProps> = ({
  isMonitoring,
  isWorkerReady,
  faceDetected,
  onStart,
  onStop,
  onOpenSettings,
  isEyesClosed = false,
  isLongEyeClosure = false,
  eyeClosureDurationMs = 0,
  isHeadTurned = false,
  isHeadTilted = false,
  isLookingAway = false,
  headPoseDurationMs = 0,
  lookingAwayDurationMs = 0,
  eventCounts = DEFAULT_COUNTS,
  className,
}) => {
  if (!isMonitoring) {
    return (
      <div
        className={cn(
          'rounded-lg border border-border bg-surface p-6 space-y-4 shadow-none',
          className
        )}
      >
        <div className="space-y-1">
          <h2 className="text-h2 font-semibold text-on-surface">Ready to start</h2>
          <p className="text-body-md text-on-surface-muted">
            Your camera turns on only after you agree. You can stop at any time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {onStart && (
            <Button
              variant="primary"
              size="default"
              onClick={onStart}
              className="w-full sm:w-auto min-w-[160px] gap-2 font-semibold text-on-primary"
              aria-label="Start study session with consent check"
            >
              <Play className="w-4 h-4 fill-current text-on-primary" aria-hidden="true" />
              <span>Start session</span>
            </Button>
          )}

          {onOpenSettings && (
            <Button
              type="button"
              variant="secondary"
              size="default"
              onClick={onOpenSettings}
              className="w-full sm:w-auto gap-2"
            >
              <Sliders className="w-4 h-4" aria-hidden="true" />
              <span>Detection settings</span>
            </Button>
          )}
        </div>

        <p className="pt-4 border-t border-border text-body-sm text-on-surface-muted">
          No video is saved · Processed in your browser
        </p>
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

  // 1. Face status
  const face = !isWorkerReady
    ? { value: 'Getting ready…', tone: 'neutral' as const, hint: undefined }
    : faceDetected
      ? { value: 'In view', tone: 'success' as const, hint: undefined }
      : {
          value: 'Not found',
          tone: 'caution' as const,
          hint: 'Move into the camera view.',
        };

  // 2. Eye status
  const eye = !faceDetected
    ? { value: '—', tone: 'neutral' as const, icon: Eye }
    : isLongEyeClosure
      ? {
          value: `Long eye closure${formattedEyeDurationSec ? ` ${formattedEyeDurationSec}` : ''}`,
          tone: 'eyes' as const,
          icon: Clock,
        }
      : effectiveEyeClosed
        ? {
            value: `Eyes closed${formattedEyeDurationSec ? ` ${formattedEyeDurationSec}` : ''}`,
            tone: 'eyes' as const,
            icon: EyeOff,
          }
        : { value: 'Eyes open', tone: 'neutral' as const, icon: Eye };

  // 3. Head status
  const head = !faceDetected
    ? { value: '—', tone: 'neutral' as const }
    : isLookingAway
      ? {
          value: `Looking away${formattedHeadDurationSec ? ` ${formattedHeadDurationSec}` : ''}`,
          tone: 'away' as const,
        }
      : isHeadDeviated
        ? {
            value: `Head turned${formattedHeadDurationSec ? ` ${formattedHeadDurationSec}` : ''}`,
            tone: 'head' as const,
          }
        : { value: 'Head centered', tone: 'neutral' as const };

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface p-6 space-y-5 shadow-none',
        className
      )}
    >
      {/* Header: Title & Immediate Stop Action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h3 font-semibold text-on-surface">Session in progress</h2>

        {onStop && (
          <Button
            variant="danger"
            size="default"
            onClick={onStop}
            className="w-full sm:w-auto min-w-[140px] gap-2 font-semibold"
            aria-label="Stop study session immediately"
          >
            <Square className="w-4 h-4 fill-current" aria-hidden="true" />
            <span>Stop session</span>
          </Button>
        )}
      </div>

      {/* Live Observable Status Rows (Fixed label column, zero layout jump) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="rounded-md border border-border bg-background p-3.5 divide-y divide-border/60"
      >
        <StatusRow
          icon={User}
          label="Face"
          value={face.value}
          tone={face.tone}
          hint={face.hint}
        />
        <StatusRow
          icon={eye.icon}
          label="Eyes"
          value={eye.value}
          tone={eye.tone}
        />
        <StatusRow
          icon={Compass}
          label="Head"
          value={head.value}
          tone={head.tone}
        />
      </div>

      {/* Student Session Event Counts */}
      <div
        aria-label="This session events summary"
        className="space-y-2.5 pt-1"
      >
        <div className="flex items-center justify-between">
          <span className="text-label text-on-surface">This session</span>
          <span className="text-caption text-on-surface-muted tabular-nums">
            Total signs: <strong className="text-on-surface">{eventCounts.total}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-md bg-background border border-border p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-event-eyes">
              <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="text-caption font-semibold">Eyes closed</span>
            </div>
            <span
              data-testid="count-eyes-closed"
              className="text-h3 font-semibold text-on-surface tabular-nums block"
            >
              {eventCounts.eyesClosed}
            </span>
          </div>

          <div className="rounded-md bg-background border border-border p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-event-eyes">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="text-caption font-semibold">Long closures</span>
            </div>
            <span
              data-testid="count-long-eye-closure"
              className="text-h3 font-semibold text-on-surface tabular-nums block"
            >
              {eventCounts.longEyeClosure}
            </span>
          </div>

          <div className="rounded-md bg-background border border-border p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-event-head">
              <Compass className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="text-caption font-semibold">Head turned</span>
            </div>
            <span
              data-testid="count-head-turned"
              className="text-h3 font-semibold text-on-surface tabular-nums block"
            >
              {eventCounts.headTurned}
            </span>
          </div>

          <div className="rounded-md bg-background border border-border p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-event-away">
              <Compass className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="text-caption font-semibold">Looking away</span>
            </div>
            <span
              data-testid="count-looking-away"
              className="text-h3 font-semibold text-on-surface tabular-nums block"
            >
              {eventCounts.lookingAway}
            </span>
          </div>
        </div>
      </div>

      {/* Footer: Privacy Notice & Optional Settings */}
      <div className="flex items-center justify-between pt-3 border-t border-border text-body-sm text-on-surface-muted">
        <span>No video is saved · Processed in your browser</span>
        {onOpenSettings && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onOpenSettings}
            className="gap-1.5 h-8 px-2.5 text-caption"
            aria-label="Adjust detection sensitivity"
          >
            <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Settings</span>
          </Button>
        )}
      </div>
    </div>
  );
};
