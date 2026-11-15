import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  ObservableDetectionEventType,
  SessionDetectionEvent,
} from '@/lib/detection/session-event-engine';

export interface EventFeedProps {
  events: readonly SessionDetectionEvent[];
  maxVisible?: number;
  className?: string;
}

function getEventDisplayMeta(eventType: ObservableDetectionEventType): {
  label: string;
  badgeVariant: 'event-eyes' | 'event-head' | 'event-away';
} {
  switch (eventType) {
    case 'eyes_closed':
      return {
        label: 'Eyes closed',
        badgeVariant: 'event-eyes',
      };
    case 'long_eye_closure':
      return {
        label: 'Long eye closure',
        badgeVariant: 'event-eyes',
      };
    case 'head_turned':
      return {
        label: 'Head turned',
        badgeVariant: 'event-head',
      };
    case 'looking_away':
      return {
        label: 'Looking away',
        badgeVariant: 'event-away',
      };
  }
}

function formatEventTime(isoString?: string): string | null {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Clean vertical activity timeline for observable session events (Swiss-Grid Utilitarian Precision):
 * - Zero decorative icons (no <Activity />, <Clock />, <Compass />).
 * - Sharp mechanical tags (<Badge />) and exposed hairline rows.
 * - Strict tabular numerals (font-mono tabular-nums).
 */
export const EventFeed: React.FC<EventFeedProps> = ({
  events,
  maxVisible = 6,
  className,
}) => {
  const recentEvents = [...events].reverse().slice(0, maxVisible);

  return (
    <section
      aria-labelledby="event-feed-heading"
      className={cn(
        'rounded-md border border-border bg-surface shadow-none divide-y divide-border',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <h3 id="event-feed-heading" className="text-body-sm font-semibold tracking-tight text-on-surface">
          Recent activity
        </h3>
        <span className="font-mono text-caption text-on-surface-muted tabular-nums">
          Total signs: <strong className="text-on-surface">{events.length}</strong>
        </span>
      </div>

      {recentEvents.length === 0 ? (
        <p className="text-body-sm text-on-surface-muted px-4 py-6 text-center">
          No signs recorded yet in this session.
        </p>
      ) : (
        <ul
          aria-label="Recent activity log"
          className="divide-y divide-border"
        >
          {recentEvents.map((evt) => {
            const durationSec = (evt.durationMs / 1000).toFixed(1);
            const meta = getEventDisplayMeta(evt.eventType);
            const timeString = formatEventTime(evt.startedAtIso);

            return (
              <li
                key={evt.id}
                className="px-4 py-2.5 flex items-center justify-between gap-3 text-body-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant={meta.badgeVariant}>
                    {meta.label}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 font-mono text-caption text-on-surface-muted shrink-0 tabular-nums">
                  <span className="font-semibold text-on-surface">
                    {durationSec}s
                  </span>
                  {timeString && (
                    <>
                      <span>·</span>
                      <span>{timeString}</span>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
