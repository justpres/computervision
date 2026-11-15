'use client';

import React from 'react';
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
 * Focus Room stage built with Swiss-Grid Utilitarian Precision:
 * - Zero decorative icons.
 * - Exposed hairline grids instead of nested cards or pill badges.
 * - 6px solid semantic dot indicators for live sensor states.
 * - Strict tabular numerals (font-mono tabular-nums) on timer and counters.
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
        'rounded-md border border-border bg-surface shadow-none flex flex-col justify-between',
        className
      )}
    >
      {/* Top Header Strip */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <h2 className="text-body-sm font-semibold tracking-tight text-on-surface">
          {isMonitoring ? 'Focus Session' : 'Study Session'}
        </h2>
        {isMonitoring && (
          <span className="inline-flex items-center gap-2 text-caption font-medium text-on-surface-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
            <span>Monitoring is on</span>
          </span>
        )}
      </div>

      {/* Center Timer & Primary Control */}
      <div className="px-6 py-10 flex flex-col items-center justify-center text-center space-y-6">
        <div className="flex flex-col items-center justify-center select-none">
          <div
            className="text-6xl sm:text-7xl font-mono font-semibold tracking-tight text-on-surface tabular-nums"
            aria-live="polite"
            aria-label={`Session duration: ${formattedElapsedTime}`}
          >
            {formattedElapsedTime}
          </div>
          <span className="text-caption font-mono uppercase tracking-wider text-on-surface-muted mt-2">
            {isMonitoring ? 'Elapsed Focus Time' : 'Session Duration'}
          </span>
        </div>

        {/* Primary Action & Sensitivity Control (44px minimum target size) */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {isMonitoring ? (
            <Button
              type="button"
              variant="primary"
              size="default"
              onClick={onStop}
              className="min-h-[44px] px-6 text-body-sm font-semibold text-on-primary rounded-md shadow-none"
            >
              <span>End study session</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="default"
              onClick={onStart}
              className="min-h-[44px] px-6 text-body-sm font-semibold text-on-primary rounded-md shadow-none"
            >
              <span>Start study session</span>
            </Button>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onOpenSettings}
            className="min-h-[44px] px-4 text-caption font-medium rounded-md shadow-none"
          >
            <span>Adjust detection sensitivity</span>
          </Button>
        </div>
      </div>

      {/* Bottom Hairline Ledger: Active Sensor Status */}
      {isMonitoring && (
        <div className="border-t border-border bg-surface">
          {/* Live Status Region: Exposed 3-Column Hairline Grid with 6px Semantic Dots */}
          <div
            role="status"
            aria-live="polite"
            className="grid grid-cols-3 divide-x divide-border border-b border-border bg-surface"
          >
            {/* Slot 1: Face Presence */}
            <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 truncate bg-surface">
              <span className="text-caption text-on-surface-muted bg-transparent">Face</span>
              <span className="inline-flex items-center gap-2 text-caption font-medium text-on-surface truncate bg-transparent">
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full shrink-0',
                    faceDetected ? 'bg-success' : 'bg-caution'
                  )}
                  aria-hidden="true"
                />
                <span className="truncate bg-transparent">
                  {faceDetected ? 'Face in view' : 'No face in view'}
                </span>
              </span>
            </div>

            {/* Slot 2: Eyes State */}
            <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 truncate bg-surface">
              <span className="text-caption text-on-surface-muted bg-transparent">Eyes</span>
              <span className="inline-flex items-center gap-2 text-caption font-medium text-on-surface truncate bg-transparent">
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full shrink-0',
                    !faceDetected
                      ? 'bg-on-surface-muted/60'
                      : isLongEyeClosure || isEyesClosed
                      ? 'bg-event-eyes'
                      : 'bg-success'
                  )}
                  aria-hidden="true"
                />
                <span className="truncate font-mono tabular-nums bg-transparent">
                  {!faceDetected
                    ? 'Waiting for face'
                    : isLongEyeClosure || isEyesClosed
                    ? `Closed (${formatSeconds(eyeClosureDurationMs)})`
                    : 'Eyes open'}
                </span>
              </span>
            </div>

            {/* Slot 3: Head Direction */}
            <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 truncate bg-surface">
              <span className="text-caption text-on-surface-muted bg-transparent">Head</span>
              <span className="inline-flex items-center gap-2 text-caption font-medium text-on-surface truncate bg-transparent">
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full shrink-0',
                    !faceDetected
                      ? 'bg-on-surface-muted/60'
                      : isLookingAway
                      ? 'bg-event-away'
                      : isHeadTurned || isHeadTilted
                      ? 'bg-event-head'
                      : 'bg-success'
                  )}
                  aria-hidden="true"
                />
                <span className="truncate font-mono tabular-nums bg-transparent">
                  {!faceDetected
                    ? 'Waiting for face'
                    : isLookingAway
                    ? `Away (${formatSeconds(lookingAwayDurationMs)})`
                    : isHeadTurned
                    ? `Turned (${formatSeconds(headPoseDurationMs)})`
                    : 'Head centered'}
                </span>
              </span>
            </div>
          </div>

          {/* Unified Active Session Counter Strip */}
          <div className="grid grid-cols-3 divide-x divide-border px-4 py-2.5 text-caption text-on-surface-muted bg-surface">
            <div className="flex items-center justify-between pr-3 bg-transparent">
              <span className="bg-transparent">Total signs</span>
              <strong className="font-mono text-on-surface tabular-nums bg-transparent">
                {eventCounts.total}
              </strong>
            </div>
            <div className="flex items-center justify-between px-3 bg-transparent">
              <span className="bg-transparent">Eyes closed</span>
              <strong className="font-mono text-on-surface tabular-nums bg-transparent">
                {eventCounts.eyesClosed}
              </strong>
            </div>
            <div className="flex items-center justify-between pl-3 bg-transparent">
              <span className="bg-transparent">Head turned</span>
              <strong className="font-mono text-on-surface tabular-nums bg-transparent">
                {eventCounts.headTurned}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
