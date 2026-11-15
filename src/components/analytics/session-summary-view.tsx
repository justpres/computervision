'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { TimelineChart } from './timeline-chart';
import {
  SAMPLE_STUDY_SESSION,
  SAMPLE_TIMELINE_EVENTS,
  convertEventsToTimeline,
  type MockTimelineItem,
} from '@/lib/mock/sample-session-data';
import type { SessionDetectionEvent } from '@/lib/detection/session-event-engine';
import type { SavedSessionSummary } from '@/lib/session/session-storage';
import { formatElapsedTime } from '@/lib/session/use-session-state';

export interface SessionSummaryViewProps {
  currentSessionEvents?: readonly SessionDetectionEvent[];
  currentSessionDurationSeconds?: number;
  sessionStartIso?: string | null;
  savedSessions?: readonly SavedSessionSummary[];
}

export const SessionSummaryView: React.FC<SessionSummaryViewProps> = ({
  currentSessionEvents = [],
  currentSessionDurationSeconds = 0,
  sessionStartIso = null,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Use current live session events if recorded; otherwise use the standard 25-min session events for the active session
  const hasLiveEvents = currentSessionEvents.length > 0;
  const timelineEvents: MockTimelineItem[] = hasLiveEvents
    ? convertEventsToTimeline(currentSessionEvents, sessionStartIso ?? undefined)
    : SAMPLE_TIMELINE_EVENTS;

  const totalDurationSeconds = hasLiveEvents
    ? currentSessionDurationSeconds
    : SAMPLE_STUDY_SESSION.durationSeconds;

  const eyesClosedCount = timelineEvents.filter(
    (e) => e.eventType === 'eyes_closed'
  ).length;

  const longClosureCount = timelineEvents.filter(
    (e) => e.eventType === 'long_eye_closure'
  ).length;

  const headTurnedCount = timelineEvents.filter(
    (e) => e.eventType === 'head_turned'
  ).length;

  const lookingAwayCount = timelineEvents.filter(
    (e) => e.eventType === 'looking_away'
  ).length;

  const filteredEvents = timelineEvents.filter((item) => {
    if (filterType === 'all') return true;
    if (filterType === 'eyes') return item.eventType === 'eyes_closed' || item.eventType === 'long_eye_closure';
    if (filterType === 'head') return item.eventType === 'head_turned' || item.eventType === 'looking_away';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Toolbar: Direct Title */}
      <div className="pb-4 border-b border-border">
        <h2 className="text-h3 font-semibold tracking-tight text-on-surface">
          Study Session Analytics & Timeline
        </h2>
      </div>

      {/* Single Unified Ledger Strip (Replaces 4 Floating KPI Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border border border-border rounded-md bg-surface shadow-none">
        {/* Total Duration */}
        <div className="py-3.5 px-4 space-y-1">
          <span className="block text-caption font-medium text-on-surface-muted">
            Study duration
          </span>
          <p className="text-metric font-mono font-semibold text-on-surface tabular-nums">
            {formatElapsedTime(totalDurationSeconds)}
          </p>
          <p className="text-caption font-mono text-on-surface-muted">
            Active session
          </p>
        </div>

        {/* Eyes Closed */}
        <div className="py-3.5 px-4 space-y-1">
          <span className="block text-caption font-medium text-on-surface-muted">
            Eyes closed
          </span>
          <p className="text-metric font-mono font-semibold text-on-surface tabular-nums">
            {eyesClosedCount}
          </p>
          <p className="text-caption font-mono text-on-surface-muted">
            Closed for 1–2 seconds
          </p>
        </div>

        {/* Long Eye Closures */}
        <div className="py-3.5 px-4 space-y-1">
          <span className="block text-caption font-medium text-on-surface-muted">
            Resting eyes
          </span>
          <p className="text-metric font-mono font-semibold text-on-surface tabular-nums">
            {longClosureCount}
          </p>
          <p className="text-caption font-mono text-on-surface-muted">
            Closed for 2+ seconds
          </p>
        </div>

        {/* Head Turned & Looking Away */}
        <div className="py-3.5 px-4 space-y-1">
          <span className="block text-caption font-medium text-on-surface-muted">
            Head adjustments
          </span>
          <p className="text-metric font-mono font-semibold text-on-surface tabular-nums">
            {headTurnedCount + lookingAwayCount}
          </p>
          <p className="text-caption font-mono text-on-surface-muted tabular-nums">
            {headTurnedCount} brief turns · {lookingAwayCount} looking away
          </p>
        </div>
      </div>

      {/* Chronological Event Timeline Section (Feature F-16) */}
      <div className="rounded-md border border-border bg-surface shadow-none">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-body-sm font-semibold tracking-tight text-on-surface">
            Chronological Event Timeline
          </h3>
          <span className="hidden sm:inline-flex items-center gap-2 text-caption font-mono text-on-surface-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
            <span>No video or face data saved</span>
          </span>
        </div>

        <div className="p-4">
          <TimelineChart
            events={timelineEvents}
            totalDurationMinutes={Math.ceil(totalDurationSeconds / 60) || 25}
            selectedEventId={selectedEventId}
            onSelectEvent={(id) => {
              setSelectedEventId((prev) => (prev === id ? null : id));
            }}
          />
        </div>
      </div>

      {/* Chronological Event Log Table (Feature F-17 - Pattern A: Unified Collection View) */}
      <div className="rounded-md border border-border bg-surface shadow-none">
        {/* 1. Top Bar: View Title + Total Count */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <h3 className="text-body-sm font-semibold tracking-tight text-on-surface">
              Event Detail Log
            </h3>
            <span className="font-mono text-caption text-on-surface-muted tabular-nums">
              {filteredEvents.length} of {timelineEvents.length}
            </span>
          </div>
          <span className="hidden sm:inline font-mono text-caption text-on-surface-muted tabular-nums">
            Normal blinks (&lt; 1s) are ignored
          </span>
        </div>

        {/* 2. Filter Strip: Mechanical Dashed Filter Controls (Pattern A) */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-border bg-background/40 text-caption">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`min-h-[44px] px-3 py-1 rounded-sm font-mono text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
              filterType === 'all'
                ? 'bg-primary text-on-primary border border-primary'
                : 'bg-transparent text-on-surface-muted hover:text-on-surface border border-dashed border-border-strong'
            }`}
          >
            All ({timelineEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('eyes')}
            className={`min-h-[44px] px-3 py-1 rounded-sm font-mono text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
              filterType === 'eyes'
                ? 'bg-primary text-on-primary border border-primary'
                : 'bg-transparent text-on-surface-muted hover:text-on-surface border border-dashed border-border-strong'
            }`}
          >
            Eyes ({eyesClosedCount + longClosureCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('head')}
            className={`min-h-[44px] px-3 py-1 rounded-sm font-mono text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
              filterType === 'head'
                ? 'bg-primary text-on-primary border border-primary'
                : 'bg-transparent text-on-surface-muted hover:text-on-surface border border-dashed border-border-strong'
            }`}
          >
            Head ({headTurnedCount + lookingAwayCount})
          </button>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center bg-background/40">
            <p className="text-body-sm text-on-surface-muted">
              No matching events found for this filter.
            </p>
          </div>
        ) : (
          <div>
            <div className="max-h-[360px] overflow-y-auto divide-y divide-border relative">
              <table className="w-full text-left text-body-sm">
                <thead className="sticky top-0 z-10 bg-background text-caption font-medium text-on-surface-muted border-b border-border shadow-xs">
                  <tr>
                    <th scope="col" className="py-2 px-3 font-medium bg-background">Recorded sign</th>
                    <th scope="col" className="py-2 px-3 font-medium bg-background">Time in session</th>
                    <th scope="col" className="py-2 px-3 font-medium bg-background">Duration</th>
                    <th scope="col" className="py-2 px-3 font-medium bg-background">How it was detected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface font-normal">
                  {filteredEvents.map((evt) => {
                    const isSelected = selectedEventId === evt.id;
                    let badgeVariant: 'event-eyes' | 'event-head' | 'event-away' = 'event-eyes';
                    let ruleDescription = 'Eyes stayed closed for 1–2 seconds';
                    if (evt.eventType === 'long_eye_closure') {
                      badgeVariant = 'event-eyes';
                      ruleDescription = 'Eyes stayed closed for 2+ seconds';
                    } else if (evt.eventType === 'head_turned') {
                      badgeVariant = 'event-head';
                      ruleDescription = 'Head turned left, right, or tilted for 1–3 seconds';
                    } else if (evt.eventType === 'looking_away') {
                      badgeVariant = 'event-away';
                      ruleDescription = 'Head stayed turned away for 3+ seconds';
                    }

                    return (
                      <tr
                        key={evt.id}
                        id={`event-row-${evt.id}`}
                        onClick={() => setSelectedEventId((prev) => (prev === evt.id ? null : evt.id))}
                        title="Click to highlight on chronological timeline"
                        className={`group cursor-pointer select-none transition-all duration-150 ease-out motion-reduce:transition-none ${
                          isSelected
                            ? 'bg-primary-container/50 font-semibold shadow-[inset_3px_0_0_0_var(--color-primary)]'
                            : 'hover:bg-primary-container/20 hover:translate-x-1 hover:shadow-[inset_3px_0_0_0_var(--color-primary-container)]'
                        }`}
                      >
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Badge variant={badgeVariant}>
                              {evt.title}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-caption text-on-surface tabular-nums">
                          {evt.timeIntoSessionFormatted}
                          <span className="text-on-surface-muted ml-1.5 font-normal">
                            ({evt.minuteMark}m)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-caption text-on-surface tabular-nums">
                          {evt.durationSeconds.toFixed(1)}s
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-caption text-on-surface-muted font-normal">
                          {ruleDescription}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-3 py-2 bg-background border-t border-border font-mono text-caption text-on-surface-muted tabular-nums">
              <span>Normal blinks under 1s and quick glances are ignored</span>
              <span>{filteredEvents.length} of {timelineEvents.length} events shown</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
