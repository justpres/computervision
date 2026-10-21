import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatusTone = 'neutral' | 'success' | 'caution' | 'eyes' | 'head' | 'away';

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'text-on-surface',
  success: 'text-success',
  caution: 'text-caution',
  eyes: 'text-event-eyes',
  head: 'text-event-head',
  away: 'text-event-away',
};

export interface StatusRowProps {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: StatusTone;
  hint?: string;
}

/**
 * Student-facing live status row: icon + fixed label + changing value.
 * - The label column never changes, so values update without wrapping or layout shift.
 * - Meaning is carried by text (DR-03); icon and color are supporting cues only.
 * - Body-size text so it can be read at a glance (DESIGN.md visual hierarchy level 2).
 */
export const StatusRow: React.FC<StatusRowProps> = ({
  icon: Icon,
  label,
  value,
  tone = 'neutral',
  hint,
}) => {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon
        className={cn('w-5 h-5 shrink-0 mt-0.5', TONE_CLASSES[tone])}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0 grid grid-cols-[5rem_1fr] gap-x-3 gap-y-0.5">
        <span className="text-body-md text-on-surface-muted">{label}</span>
        <span className={cn('text-body-md font-semibold tabular-nums', TONE_CLASSES[tone])}>
          {value}
        </span>
        {hint && (
          <span className="col-start-2 text-body-sm text-on-surface-muted">{hint}</span>
        )}
      </div>
    </div>
  );
};
