import React from 'react';
import { User, Play, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatusRow } from '@/components/session/status-row';

export interface LiveStatusCardProps {
  isMonitoring: boolean;
  isWorkerReady: boolean;
  faceDetected: boolean;
  elapsedTime?: string;
  onStart?: () => void;
  onStop?: () => void;
  className?: string;
}

/**
 * Student-facing session card (M0 baseline styled with Template 1 Focus Room aesthetic):
 * - Standby: "Ready to start" with big digital timer, one primary Start action, and privacy note.
 * - Active: "Session in progress" with running timer, Stop button, and live Face status row.
 * - No developer telemetry (latency, engine state) is shown to the student.
 * - Accessible status region (role="status", aria-live="polite").
 */
export const LiveStatusCard: React.FC<LiveStatusCardProps> = ({
  isMonitoring,
  isWorkerReady,
  faceDetected,
  elapsedTime = '00:00',
  onStart,
  onStop,
  className,
}) => {
  if (!isMonitoring) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-sm flex flex-col items-center text-center space-y-6',
          className
        )}
      >
        <div className="space-y-1.5">
          <h2 className="text-h2 font-semibold text-on-surface">Ready to start</h2>
          <p className="text-body-md text-on-surface-muted max-w-md mx-auto">
            Your camera turns on only after you agree. You can stop at any time.
          </p>
        </div>

        {/* Digital Clock Display (Standby) */}
        <div className="flex flex-col items-center justify-center py-4">
          <div
            className="text-6xl sm:text-7xl font-mono font-bold tracking-tight text-on-surface tabular-nums"
            aria-label="Session duration: 00:00"
          >
            00:00
          </div>
          <span className="text-caption font-semibold uppercase tracking-wider text-on-surface-muted mt-2">
            Session duration
          </span>
        </div>

        {onStart && (
          <Button
            variant="primary"
            size="lg"
            onClick={onStart}
            className="w-full sm:w-auto min-w-[200px] h-12 text-body-md font-semibold text-on-primary gap-2 shadow-sm"
            aria-label="Start study session with consent check"
          >
            <Play className="w-5 h-5 fill-current text-on-primary" aria-hidden="true" />
            <span>Start session</span>
          </Button>
        )}

        <p className="pt-4 border-t border-border w-full text-body-sm text-on-surface-muted">
          No video is saved · Processed in your browser
        </p>
      </div>
    );
  }

  const face = !isWorkerReady
    ? { value: 'Getting ready…', tone: 'neutral' as const, hint: undefined }
    : faceDetected
      ? { value: 'In view', tone: 'success' as const, hint: undefined }
      : {
          value: 'Not found',
          tone: 'caution' as const,
          hint: 'Move into the camera view.',
        };

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-sm flex flex-col items-center text-center space-y-6',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 w-full">
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

      {/* Digital Clock Display (Active) */}
      <div className="flex flex-col items-center justify-center py-2">
        <div
          className="text-6xl sm:text-7xl font-mono font-bold tracking-tight text-on-surface tabular-nums"
          aria-label={`Session duration: ${elapsedTime}`}
        >
          {elapsedTime}
        </div>
        <span className="text-caption font-semibold uppercase tracking-wider text-on-surface-muted mt-2">
          Session duration
        </span>
      </div>

      <div role="status" aria-live="polite" aria-atomic="true" className="w-full max-w-md">
        <StatusRow icon={User} label="Face" value={face.value} tone={face.tone} hint={face.hint} />
      </div>

      <p className="pt-4 border-t border-border w-full text-body-sm text-on-surface-muted">
        No video is saved · Processed in your browser
      </p>
    </div>
  );
};
