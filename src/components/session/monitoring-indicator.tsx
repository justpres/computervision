import React from 'react';
import { cn } from '@/lib/utils';

export interface MonitoringIndicatorProps {
  isMonitoring: boolean;
  elapsedTime?: string;
  className?: string;
  showWhenIdle?: boolean;
}

/**
 * Persistent monitoring indicator:
 * - Only visible while monitoring is active (by default) to prevent header clutter in idle mode.
 * - Single signifier: filled calm teal dot + "Monitoring is on" + tabular elapsed duration.
 * - Non-reliance on color alone (filled dot signifier + explicit label).
 * - Accessible live region (aria-live="polite").
 */
export const MonitoringIndicator: React.FC<MonitoringIndicatorProps> = ({
  isMonitoring,
  elapsedTime,
  className,
  showWhenIdle = false,
}) => {
  if (!isMonitoring && !showWhenIdle) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-caption font-semibold transition-colors select-none',
        isMonitoring
          ? 'bg-primary-container text-on-primary-container border border-primary/25 shadow-sm animate-in fade-in duration-200'
          : 'bg-surface text-on-surface-muted border border-border',
        className
      )}
    >
      {/* Visual status indicator: hollow ring when off, filled dot when on */}
      <span
        className={cn(
          'w-2.5 h-2.5 rounded-full shrink-0',
          isMonitoring ? 'bg-primary' : 'border-2 border-on-surface-muted'
        )}
        aria-hidden="true"
      />

      <span className="font-semibold text-caption">
        {isMonitoring ? 'Monitoring is on' : 'Monitoring is off'}
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
