import React from 'react';
import { EyeOff, Compass, Activity } from 'lucide-react';
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
  toneClass: string;
  icon: typeof EyeOff;
} {
  switch (eventType) {
    case 'eyes_closed':
      return {
        label: 'Eyes closed',
        toneClass: 'text-event-eyes',
        icon: EyeOff,
      };
    case 'head_turned':
      return {
        label: 'Head turned',
        toneClass: 'text-event-head',
        icon: Compass,
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
 * Clean vertical activity timeline for observable session events (M1 baseline):
 * - Shows recent events in reverse chronological order (newest on top).
 * - Fixed, aligned row structure eliminates jagged line wraps.
 * - Non-punitive, plain-spoken wording ("Recent activity", "signs").
 * - Pairs icons with text labels per WCAG 2.1 AAA / DR-03.
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
        'rounded-lg border border-border bg-surface p-5 space-y-3 shadow-none',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" aria-hidden="true" />
          <h3 id="event-feed-heading" className="text-h3 font-semibold text-on-surface">
            Recent activity
          </h3>
        </div>
        <span className="text-caption text-on-surface-muted tabular-nums">
          Total signs: <strong className="text-on-surface">{events.length}</strong>
        </span>
      </div>

      {recentEvents.length === 0 ? (
        <p className="text-body-sm text-on-surface-muted py-2">
          No signs recorded yet in this session.
        </p>
      ) : (
        <ul
          aria-label="Recent activity log"
          className="divide-y divide-border/60"
        >
          {recentEvents.map((evt) => {
            const durationSec = (evt.durationMs / 1000).toFixed(1);
            const meta = getEventDisplayMeta(evt.eventType);
            const Icon = meta.icon;
            const timeString = formatEventTime(evt.startedAtIso);

            return (
              <li
                key={evt.id}
                className="py-2.5 flex items-center justify-between gap-3 text-body-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={cn('w-4 h-4 shrink-0', meta.toneClass)}
                    aria-hidden="true"
                  />
                  <span className={cn('font-medium truncate', meta.toneClass)}>
                    {meta.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-caption text-on-surface-muted shrink-0 tabular-nums">
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
