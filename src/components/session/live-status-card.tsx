import React from 'react';
import {
  UserCheck,
  UserX,
  Cpu,
  Eye,
  EyeOff,
  Compass,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface LiveStatusCardProps {
  isMonitoring: boolean;
  isWorkerReady: boolean;
  faceDetected: boolean;
  processingTimeMs: number;
  isEyesClosed?: boolean;
  eyeClosureDurationMs?: number;
  eyeBlinkScore?: number;
  isHeadTurned?: boolean;
  isHeadTilted?: boolean;
  headPoseDurationMs?: number;
  headYawDegrees?: number | null;
  headPitchDegrees?: number | null;
  className?: string;
}

/**
 * Live status card:
 * - Neutral wording: "Face detected" / "Looking for face", "Eyes open" / "Eyes closed",
 *   "Head centered" / "Head turned" (never "distracted", "drowsy", or alarms).
 * - WCAG 2.1 AAA Enhanced contrast with event-eyes and event-head tokens.
 * - Single functional icon per badge, eliminating duplicate iconography.
 * - Vertical chunking prevents badge text wrapping or clipping card borders.
 * - Live worker performance metrics (inference time) in tabular figures.
 * - Accessible status region (role="status", aria-live="polite").
 */
export const LiveStatusCard: React.FC<LiveStatusCardProps> = ({
  isMonitoring,
  isWorkerReady,
  faceDetected,
  processingTimeMs,
  isEyesClosed = false,
  eyeClosureDurationMs = 0,
  eyeBlinkScore = 0,
  isHeadTurned = false,
  isHeadTilted = false,
  headPoseDurationMs = 0,
  headYawDegrees = null,
  headPitchDegrees = null,
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

  const formattedEyeDurationSec =
    eyeClosureDurationMs >= 500
      ? `${(eyeClosureDurationMs / 1000).toFixed(1)}s`
      : null;

  const isHeadDeviated = isHeadTurned || isHeadTilted;
  const formattedHeadDurationSec =
    headPoseDurationMs >= 500
      ? `${(headPoseDurationMs / 1000).toFixed(1)}s`
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
          {isWorkerReady ? 'Worker Active' : 'Initializing Worker'}
        </span>
      </div>

      {/* Primary Detection Signal: Face Detected */}
      <div
        className={cn(
          'flex items-center gap-3 p-4 rounded-md border transition-colors motion-reduce:transition-none',
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

      {/* Observable Signals Grid: Eye Closure & Head Direction */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Eye Closure State */}
        <div className="rounded-md border border-border bg-background p-3.5 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-label font-semibold text-on-surface">Eye State</span>
            {faceDetected ? (
              <Badge
                variant={isEyesClosed ? 'event-eyes' : 'neutral'}
                className="tabular-nums shrink-0 whitespace-nowrap"
              >
                {isEyesClosed ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>
                      Eyes closed
                      {formattedEyeDurationSec ? ` ${formattedEyeDurationSec}` : ''}
                    </span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Eyes open</span>
                  </>
                )}
              </Badge>
            ) : (
              <Badge variant="neutral" className="shrink-0">No signal</Badge>
            )}
          </div>

          <div className="pt-2 border-t border-border/50 flex items-center justify-between text-caption text-on-surface-muted">
            <span>Blink level</span>
            <span className="font-semibold text-on-surface font-tnum">
              {faceDetected ? `${Math.round(eyeBlinkScore * 100)}%` : '—'}
            </span>
          </div>
        </div>

        {/* Head Direction State */}
        <div className="rounded-md border border-border bg-background p-3.5 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-label font-semibold text-on-surface">Head Direction</span>
            {faceDetected ? (
              <Badge
                variant={isHeadDeviated ? 'event-head' : 'neutral'}
                className="tabular-nums shrink-0 whitespace-nowrap"
              >
                <Compass className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {isHeadDeviated
                    ? `Head turned${formattedHeadDurationSec ? ` ${formattedHeadDurationSec}` : ''}`
                    : 'Head centered'}
                </span>
              </Badge>
            ) : (
              <Badge variant="neutral" className="shrink-0">No signal</Badge>
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

      {/* Diagnostics Bar */}
      <div className="flex items-center justify-between pt-1 border-t border-border/60 text-caption text-on-surface-muted">
        <span>Inference thread: Web Worker (WASM)</span>
        {processingTimeMs > 0 && (
          <span className="tabular-nums">
            Latency: <strong className="font-semibold text-on-surface">{processingTimeMs} ms</strong>
          </span>
        )}
      </div>
    </div>
  );
};