import React from 'react';
import { UserCheck, UserX, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LiveStatusCardProps {
  isMonitoring: boolean;
  isWorkerReady: boolean;
  faceDetected: boolean;
  processingTimeMs: number;
  className?: string;
}

/**
 * Live status card:
 * - Neutral wording: "Face detected" / "Looking for face" (never "distracted" or alarms).
 * - Calming colors: success/teal containers when present, neutral slate when seeking.
 * - Live worker performance metrics (inference time) in tabular figures.
 * - Accessible status region (role="status", aria-live="polite").
 */
export const LiveStatusCard: React.FC<LiveStatusCardProps> = ({
  isMonitoring,
  isWorkerReady,
  faceDetected,
  processingTimeMs,
  className,
}) => {
  if (!isMonitoring) {
    return (
      <div
        className={cn(
          'rounded-lg border border-border bg-surface p-5 space-y-3',
          className
        )}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-h3 text-on-surface">Detection Status</h3>
          <span className="text-caption text-on-surface-muted">Idle</span>
        </div>
        <p className="text-body-sm text-on-surface-muted">
          Real-time browser detection begins automatically when you start your session.
        </p>
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
      <div className="flex items-center justify-between">
        <h3 className="text-h3 text-on-surface">Live Detection</h3>

        {/* Worker Engine State */}
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-semibold',
            isWorkerReady
              ? 'bg-success-container text-success'
              : 'bg-caution-container text-caution'
          )}
        >
          <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
          {isWorkerReady ? 'Detection ready' : 'Starting detection...'}
        </span>
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
