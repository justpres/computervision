import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MonitoringIndicatorProps {
  isMonitoring: boolean;
  elapsedTime?: string;
  className?: string;
}

/**
 * Persistent monitoring indicator:
 * - Most emphasized status element so students always know when the camera is active.
 * - Pairs color with an icon and text label (never relies on color alone).
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
        'inline-flex items-center gap-2.5 h-10 px-4 rounded-full text-label transition-colors select-none',
        isMonitoring
          ? 'bg-primary-container text-on-primary-container border border-primary/20'
          : 'bg-surface text-on-surface-muted border border-border',
        className
      )}
    >
      {/* Visual status indicator (dot + icon + label) */}
      <span className="flex items-center gap-2">
        <span
          className={cn(
            'w-2.5 h-2.5 rounded-full shrink-0',
            isMonitoring ? 'bg-primary animate-pulse' : 'bg-secondary'
          )}
          aria-hidden="true"
        />
        {isMonitoring ? (
          <Eye className="w-4 h-4 shrink-0 text-primary" aria-hidden="true" />
        ) : (
          <EyeOff className="w-4 h-4 shrink-0 text-on-surface-muted" aria-hidden="true" />
        )}
      </span>

      <span className="font-semibold text-body-sm">
        {isMonitoring ? 'Monitoring is on' : 'Monitoring is off'}
      </span>

      {/* Tabular elapsed duration */}
      {isMonitoring && elapsedTime && (
        <span
          className="ml-1 pl-2 border-l border-primary/30 font-semibold tabular-nums text-body-sm"
          aria-label={`Elapsed session time: ${elapsedTime}`}
        >
          {elapsedTime}
        </span>
      )}
    </div>
  );
};
