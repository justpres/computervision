import React from 'react';
import { User, Play, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatusRow } from '@/components/session/status-row';

export interface LiveStatusCardProps {
  isMonitoring: boolean;
  isWorkerReady: boolean;
  faceDetected: boolean;
  onStart?: () => void;
  onStop?: () => void;
  className?: string;
}

/**
 * Student-facing session card (M0 baseline):
 * - Standby: "Ready to start" with one primary Start action and a short privacy note.
 * - Active: "Session in progress" with Stop, and a live Face status row.
 * - No developer telemetry (latency, engine state) is shown to the student.
 * - Elapsed time lives only in the header MonitoringIndicator (no duplication).
 * - Accessible status region (role="status", aria-live="polite").
 */
export const LiveStatusCard: React.FC<LiveStatusCardProps> = ({
  isMonitoring,
  isWorkerReady,
  faceDetected,
  onStart,
  onStop,
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

        {onStart && (
          <Button
            variant="primary"
            size="default"
            onClick={onStart}
            className="w-full sm:w-auto min-w-[160px] gap-2 font-semibold"
            aria-label="Start study session with consent check"
          >
            <Play className="w-4 h-4 fill-current" aria-hidden="true" />
            <span>Start session</span>
          </Button>
        )}

        <p className="pt-4 border-t border-border text-body-sm text-on-surface-muted">
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
        'rounded-lg border border-border bg-surface p-6 space-y-4 shadow-none',
        className
      )}
    >
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

      <div role="status" aria-live="polite" aria-atomic="true">
        <StatusRow icon={User} label="Face" value={face.value} tone={face.tone} hint={face.hint} />
      </div>

      <p className="pt-4 border-t border-border text-body-sm text-on-surface-muted">
        No video is saved · Processed in your browser
      </p>
    </div>
  );
};
