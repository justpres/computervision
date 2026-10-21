'use client';

import React from 'react';
import {
  Play,
  Square,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FocusStageProps {
  isMonitoring: boolean;
  formattedElapsedTime: string;
  faceDetected: boolean;
  isEyesClosed: boolean;
  isLongEyeClosure: boolean;
  eyeClosureDurationMs: number;
  isHeadTurned: boolean;
  isHeadTilted: boolean;
  isLookingAway: boolean;
  headPoseDurationMs: number;
  lookingAwayDurationMs: number;
  eventCounts: {
    eyesClosed: number;
    longEyeClosure: number;
    headTurned: number;
    lookingAway: number;
    total: number;
  };
  onStart: () => void;
  onStop: () => void;
  onOpenSettings: () => void;
  className?: string;
}

/**
 * Formats duration in milliseconds into seconds with one decimal point.
 */
function formatSeconds(durationMs: number): string {
  return `${(Math.max(0, durationMs) / 1000).toFixed(1)}s`;
}

/**
 * Dedicated Focus Room stage for active studying:
 * - Prominent, calming digital session timer.
 * - Single high-affordance Start/End study session CTA.
 * - Fixed 3-column horizontal status row that never wraps or shifts layout.
 * - Clean session signs metrics bar.
 */
export const FocusStage: React.FC<FocusStageProps> = ({
  isMonitoring,
  formattedElapsedTime,
  faceDetected,
  isEyesClosed,
  isLongEyeClosure,
  eyeClosureDurationMs,
  isHeadTurned,
  isHeadTilted,
  isLookingAway,
  headPoseDurationMs,
  lookingAwayDurationMs,
  eventCounts,
  onStart,
  onStop,
  onOpenSettings,
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface p-6 sm:p-10 flex flex-col items-center justify-center text-center space-y-8 shadow-sm transition-all',
        className
      )}
    >
      {/* Session Title (No redundant status badge) */}
      <div className="space-y-1 flex flex-col items-center">
        <h2 className="text-h2 font-semibold text-on-surface">
          {isMonitoring ? 'Focus Session' : 'Study Session'}
        </h2>
        <p className="text-caption text-on-surface-muted">
          {isMonitoring
            ? 'Monitoring active · Stay focused on your material'
            : 'Start a session when you are ready to study'}
        </p>
      </div>

      {/* Prominent Digital Timer */}
      <div className="flex flex-col items-center justify-center py-2 select-none">
        <div
          className="text-6xl sm:text-7xl font-bold tracking-tight text-on-surface tabular-nums"
          aria-live="polite"
          aria-label={`Session duration: ${formattedElapsedTime}`}
        >
          {formattedElapsedTime}
        </div>
        <span className="text-caption uppercase tracking-wider text-on-surface-muted mt-1 font-semibold">
          {isMonitoring ? 'Elapsed Focus Time' : 'Session Duration'}
        </span>
      </div>

      {/* Primary Action Button */}
      <div className="flex flex-col items-center gap-3">
        {isMonitoring ? (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={onStop}
            className="gap-2.5 h-12 px-8 text-body-md font-semibold rounded-full border-error/50 text-error hover:bg-error-container hover:text-on-error-container transition-all shadow-sm"
          >
            <Square className="w-4 h-4 fill-current" aria-hidden="true" />
            <span>End study session</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={onStart}
            className="gap-2.5 h-12 px-8 text-body-md font-semibold rounded-full shadow-sm hover:shadow transition-all"
          >
            <Play className="w-5 h-5 fill-current" aria-hidden="true" />
            <span>Start study session</span>
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onOpenSettings}
          className="gap-1.5 text-caption text-on-surface-muted hover:text-on-surface h-8"
        >
          <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Adjust detection sensitivity</span>
        </Button>
      </div>

      {/* Live Status Region: Fixed 3-Column Grid (Zero Layout Shift) */}
      {isMonitoring && (
        <div className="w-full max-w-lg space-y-4 pt-2 border-t border-border/60">
          <div
            role="status"
            aria-live="polite"
            className="grid grid-cols-3 gap-2 w-full max-w-md mx-auto"
          >
            {/* Slot 1: Face Presence */}
            <div
              className={cn(
                'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-full text-caption font-semibold border transition-colors truncate',
                faceDetected
                  ? 'bg-success-container text-success border-success/30'
                  : 'bg-caution-container text-on-caution-container border-caution/40'
              )}
            >
              {faceDetected ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">Face in view</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">Face: None</span>
                </>
              )}
            </div>

            {/* Slot 2: Eyes State */}
            <div
              className={cn(
                'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-full text-caption font-semibold border transition-colors truncate',
                !faceDetected
                  ? 'bg-surface text-on-surface-muted border-border'
                  : isLongEyeClosure || isEyesClosed
                  ? 'bg-event-eyes-container text-event-eyes border-event-eyes/30'
                  : 'bg-surface text-on-surface border-border'
              )}
            >
              {!faceDetected ? (
                <>
                  <Eye className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">Eyes: —</span>
                </>
              ) : isLongEyeClosure ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    Closed ({formatSeconds(eyeClosureDurationMs)})
                  </span>
                </>
              ) : isEyesClosed ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    Closed ({formatSeconds(eyeClosureDurationMs)})
                  </span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 shrink-0 text-success" aria-hidden="true" />
                  <span className="truncate">Eyes open</span>
                </>
              )}
            </div>

            {/* Slot 3: Head Direction */}
            <div
              className={cn(
                'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-full text-caption font-semibold border transition-colors truncate',
                !faceDetected
                  ? 'bg-surface text-on-surface-muted border-border'
                  : isLookingAway
                  ? 'bg-event-away-container text-event-away border-event-away/30'
                  : isHeadTurned || isHeadTilted
                  ? 'bg-event-head-container text-event-head border-event-head/30'
                  : 'bg-surface text-on-surface border-border'
              )}
            >
              {!faceDetected ? (
                <>
                  <Compass className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">Head: —</span>
                </>
              ) : isLookingAway ? (
                <>
                  <Compass className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    Away ({formatSeconds(lookingAwayDurationMs)})
                  </span>
                </>
              ) : isHeadTurned ? (
                <>
                  <Compass className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    Turned ({formatSeconds(headPoseDurationMs)})
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-success" aria-hidden="true" />
                  <span className="truncate">Head centered</span>
                </>
              )}
            </div>
          </div>

          {/* Quick Active Session Metrics */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-caption text-on-surface-muted pt-1">
            <span>
              Total signs recorded:{' '}
              <strong className="text-on-surface tabular-nums">
                {eventCounts.total}
              </strong>
            </span>
            <span>·</span>
            <span>
              Eyes closed:{' '}
              <strong className="text-on-surface tabular-nums">
                {eventCounts.eyesClosed}
              </strong>
            </span>
            <span>·</span>
            <span>
              Head turned:{' '}
              <strong className="text-on-surface tabular-nums">
                {eventCounts.headTurned}
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
