import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Badge / Event Chip component mapped to design system tokens (Swiss-Grid Precision):
 * - event-eyes: text event-eyes (#2A5CAA), border event-eyes/50
 * - event-head: text event-head (#B45F06), border event-head/50
 * - event-away: text event-away (#6A4BB5), border event-away/50
 * - info: text info (#2A3F9E), border info/40
 * - experimental: text experimental (#4B2F94), border experimental/40
 * - success: text success (#16643D), border success/40
 * - caution: text caution (#6B4500), border caution/40
 * - neutral: text on-surface-muted (#465866), border border-strong/50
 */
export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider font-semibold bg-transparent transition-colors',
  {
    variants: {
      variant: {
        'event-eyes':
          'text-event-eyes border-event-eyes/50',
        'event-head':
          'text-event-head border-event-head/50',
        'event-away':
          'text-event-away border-event-away/50',
        info: 'text-info border-info/40',
        experimental: 'text-experimental border-experimental/40',
        success: 'text-success border-success/40',
        caution: 'text-caution border-caution/40',
        neutral: 'text-on-surface-muted border-border-strong/50',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, className }))}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';
