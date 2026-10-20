import React from 'react';
import { EyeOff, Compass, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { SessionDetectionEvent } from '@/lib/detection/session-event-engine';

export interface EventFeedProps {
  events: readonly SessionDetectionEvent[];
  maxVisible?: number;
  className?: string;
}

/**
 * Displays recent observable detection events as neutral event chips:
 * - "Eyes closed 1.2s" using event-eyes blue (#2A5CAA on #FFFFFF) + EyeOff icon
 * - "Head turned 1.5s" using event-head amber-brown (#B45F06 on #FFFFFF) + Compass icon
 * - Tabular numerals for all durations and counts
 * - Strictly neutral wording
 */
export const EventFeed: React.FC<EventFeedProps> = ({
  events,
  maxVisible = 8,
  className,
}) => {
  const recentEvents = [...events].reverse().slice(0, maxVisible);

  return (
    <section
      aria-labelledby="event-feed-heading"
      className={cn(
        'rounded-lg border border-border bg-surface p-5 space-y-3 shadow-none',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-on-surface-muted" aria-hidden="true" />
          <h3 id="event-feed-heading" className="text-h3 text-on-surface">
            Observed Session Events
          </h3>
        </div>
        <span className="text-caption text-on-surface-muted tabular-nums">
          Total: <strong className="text-on-surface">{events.length}</strong>
        </span>
      </div>

      {recentEvents.length === 0 ? (
        <p className="text-body-sm text-on-surface-muted py-1">
          No eye-closure or head-turn events recorded yet during this session.
        </p>
      ) : (
        <ul
          aria-label="Recent observed events"
          className="flex flex-wrap gap-2 pt-1"
        >
          {recentEvents.map((evt) => {
            const durationSec = (evt.durationMs / 1000).toFixed(1);
            const isEyes = evt.eventType === 'eyes_closed';

            return (
              <li key={evt.id}>
                <Badge
                  variant={isEyes ? 'event-eyes' : 'event-head'}
                  className="tabular-nums"
                >
                  {isEyes ? (
                    <EyeOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <Compass className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  )}
                  <span>
                    {isEyes ? 'Eyes closed' : 'Head turned'} {durationSec}s
                  </span>
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
