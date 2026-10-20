import React from 'react';
import { cn } from '@/lib/utils';

export interface MonitoringIndicatorProps {
  isMonitoring: boolean;
  elapsedTime?: string;
  className?: string;
}

/**
 * Persistent monitoring indicator:
 * - Single signifier: dot (hollow when off, filled pulse when on) + clear label.
 * - Non-reliance on color alone (shape/fill + text difference).
 * - Uses tabular figures for elapsed duration.
 * - Accessible live region (aria-live="polite").
 */
export const MonitoringIndicator: React.FC<MonitoringIndicatorProps> = ({
  isMonitoring,
  elapsedTime,
  className,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-caption font-semibold transition-colors select-none',
        isMonitoring
          ? 'bg-primary-container text-on-primary-container border border-primary/25'
          : 'bg-surface text-on-surface-muted border border-border',
        className
      )}
    >
      {/* Visual status indicator: hollow ring when off, filled dot when on */}
      <span
        className={cn(
          'w-2.5 h-2.5 rounded-full shrink-0',
          isMonitoring
            ? 'bg-primary motion-safe:animate-pulse'
            : 'border-2 border-on-surface-muted'
        )}
        aria-hidden="true"
      />

      <span className="font-semibold text-caption">
        {isMonitoring ? 'Monitoring is on' : 'Camera off'}
      </span>

      {/* Tabular elapsed duration */}
      {isMonitoring && elapsedTime && (
        <span
          className="ml-0.5 pl-2 border-l border-primary/30 font-semibold tabular-nums text-caption"
          aria-label={`Elapsed session time: ${elapsedTime}`}
        >
          {elapsedTime}
        </span>
      )}
    </div>
  );
};
