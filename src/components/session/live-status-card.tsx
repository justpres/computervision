import React from 'react';
import { UserCheck, UserX, Cpu, Play, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface LiveStatusCardProps {
  isMonitoring: boolean;
  isWorkerReady: boolean;
  faceDetected: boolean;
  processingTimeMs: number;
  formattedElapsedTime?: string;
  onStart?: () => void;
  onStop?: () => void;
  className?: string;
}

/**
 * Live status & unified session card:
 * - In standby: "Ready to Start" card with primary Start action and privacy facts.
 * - When active: "Active Session" card with Stop action, session duration, face status, and response time.
 * - Balances column heights across the interface and removes duplicate cards.
 * - Neutral wording: "Face detected" / "Looking for face" (never "distracted" or alarms).
 * - Accessible status region (role="status", aria-live="polite").
 */
export const LiveStatusCard: React.FC<LiveStatusCardProps> = ({
  isMonitoring,
  isWorkerReady,
  faceDetected,
  processingTimeMs,
  formattedElapsedTime = '00:00',
  onStart,
  onStop,
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
      </div>
    );
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-h3 font-semibold text-on-surface">Active Session</h3>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-caption font-semibold',
                isWorkerReady
                  ? 'bg-success-container text-success'
                  : 'bg-caution-container text-caution'
              )}
            >
              <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
              {isWorkerReady ? 'Detection ready' : 'Starting...'}
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
            className="w-full sm:w-auto min-w-[140px] gap-2 font-semibold"
            aria-label="Stop study session immediately"
          >
            <Square className="w-4 h-4 fill-current" aria-hidden="true" />
            <span>Stop session</span>
          </Button>
        )}
      </div>

      {/* Primary Detection Signal: Face Detected */}
      <div
        className={cn(
          'flex items-center gap-3 p-4 rounded-md border transition-colors',
          faceDetected
            ? 'bg-success-container/40 border-success/30 text-on-surface'
            : 'bg-background border-border text-on-surface-muted'
        )}
      >
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
            faceDetected
              ? 'bg-success-container text-success'
              : 'bg-surface border border-border text-on-surface-muted'
          )}
          aria-hidden="true"
        >
          {faceDetected ? (
            <UserCheck className="w-5 h-5" />
          ) : (
            <UserX className="w-5 h-5" />
          )}
        </div>

        <div className="space-y-0.5">
          <div className="text-label font-semibold">
            {faceDetected ? 'Face detected' : 'Looking for face...'}
          </div>
          <p className="text-caption text-on-surface-muted">
            {faceDetected
              ? 'One person detected in view. Landmark analysis running in background.'
              : 'Please ensure your face is well-lit and facing the front laptop camera.'}
          </p>
        </div>
      </div>

      {/* Diagnostics Bar */}
      <div className="flex items-center justify-between pt-1 border-t border-border/60 text-caption text-on-surface-muted">
        <span>Runs privately in your browser</span>
        {processingTimeMs > 0 && (
          <span className="tabular-nums font-medium">
            Response time: <strong className="text-on-surface">{processingTimeMs} ms</strong>
          </span>
        )}
      </div>
    </div>
  );
};
