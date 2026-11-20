'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import type { MockTimelineItem } from '@/lib/mock/sample-session-data';

export interface TimelineChartProps {
  events: readonly MockTimelineItem[];
  totalDurationMinutes?: number;
  selectedEventId?: string | null;
  onSelectEvent?: (eventId: string) => void;
}

const EVENT_COLOR_MAP: Record<MockTimelineItem['eventType'], string> = {
  eyes_closed: 'var(--color-event-eyes)',
  long_eye_closure: 'var(--color-event-eyes)',
  head_turned: 'var(--color-event-head)',
  looking_away: 'var(--color-event-away)',
};

const EVENT_DOT_CLASS_MAP: Record<MockTimelineItem['eventType'], string> = {
  eyes_closed: 'bg-event-eyes',
  long_eye_closure: 'bg-event-eyes',
  head_turned: 'bg-event-head',
  looking_away: 'bg-event-away',
};

interface TooltipPayloadItem {
  payload?: MockTimelineItem;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

const CustomTimelineTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length || !payload[0].payload) {
    return null;
  }

  const data = payload[0].payload;
  const dotClass = EVENT_DOT_CLASS_MAP[data.eventType] || 'bg-event-eyes';

  return (
    <div
      role="tooltip"
      className="rounded-md border border-border-strong bg-surface p-3 shadow-md text-on-surface space-y-1.5 min-w-[180px]"
    >
      <div className="flex items-center gap-2">
        <span
          className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClass}`}
          aria-hidden="true"
        />
        <span className="text-label font-semibold">{data.title}</span>
      </div>
      <div className="text-body-sm text-on-surface-muted space-y-0.5">
        <p>
          Time in session:{' '}
          <span className="font-semibold text-on-surface font-tnum">
            {data.timeIntoSessionFormatted} ({data.minuteMark}m)
          </span>
        </p>
        <p>
          Duration:{' '}
          <span className="font-semibold text-on-surface font-tnum">
            {data.durationSeconds}s
          </span>
        </p>
      </div>
    </div>
  );
};

/**
 * Interactive Chronological Event Timeline Chart (Feature F-16).
 *
 * Renders detected student posture adjustments along the session timeline using Recharts.
 * - Horizontal X-Axis: Session progression in minutes (0 to session end).
 * - Vertical Y-Axis: Observable event duration (in seconds).
 * - Distinct colors matching Calm Transparency tokens in DESIGN.md.
 */
export const TimelineChart: React.FC<TimelineChartProps> = ({
  events,
  totalDurationMinutes = 25,
  selectedEventId = null,
  onSelectEvent,
}) => {
  if (!events || events.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center p-6 text-center">
        <p className="text-body-sm font-semibold text-on-surface">No events recorded</p>
        <p className="text-caption text-on-surface-muted max-w-sm mt-1">
          Signs such as eyes closed or head turned will appear across the timeline during your study session.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend Indicator */}
      <div className="flex flex-wrap items-center gap-4 text-caption text-on-surface-muted">
        <span className="font-semibold text-on-surface">Signals:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-event-eyes" aria-hidden="true" />
          <span>Eyes closed / Resting eyes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-event-head" aria-hidden="true" />
          <span>Head turned</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rotate-45 rounded-xs bg-event-away" aria-hidden="true" />
          <span>Looking away</span>
        </div>
      </div>

      {/* Recharts Responsive Container */}
      <div
        role="region"
        aria-label="Chronological event timeline chart"
        className="h-64 w-full"
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={200}
          initialDimension={{ width: 600, height: 256 }}
        >
          <BarChart
            data={[...events]}
            margin={{ top: 12, right: 16, left: -10, bottom: 8 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--color-border)"
            />
            <XAxis
              dataKey="minuteMark"
              type="number"
              domain={[
                0,
                events.reduce(
                  (max, e) => Math.max(max, e.minuteMark + 1),
                  totalDurationMinutes
                ),
              ]}
              tickFormatter={(val: number) => `${val}m`}
              tick={{ fontSize: 12, fill: 'var(--color-on-surface-muted)' }}
              axisLine={{ stroke: 'var(--color-border-strong)' }}
              tickLine={{ stroke: 'var(--color-border-strong)' }}
            />
            <YAxis
              dataKey="durationSeconds"
              unit="s"
              tick={{ fontSize: 12, fill: 'var(--color-on-surface-muted)' }}
              axisLine={{ stroke: 'var(--color-border-strong)' }}
              tickLine={{ stroke: 'var(--color-border-strong)' }}
            />
            <Tooltip
              content={<CustomTimelineTooltip />}
              cursor={{ fill: 'var(--color-primary-container)' }}
            />
            <Bar
              dataKey="durationSeconds"
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
              isAnimationActive={false}
            >
              {events.map((entry) => {
                const isSelected = selectedEventId === entry.id;
                const baseColor = EVENT_COLOR_MAP[entry.eventType] || 'var(--color-event-eyes)';
                return (
                  <Cell
                    key={entry.id}
                    fill={baseColor}
                    stroke={isSelected ? 'var(--color-on-surface)' : 'transparent'}
                    strokeWidth={isSelected ? 2 : 0}
                    opacity={selectedEventId && !isSelected ? 0.35 : 1}
                    className="cursor-pointer transition-opacity"
                    onClick={() => onSelectEvent?.(entry.id)}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
