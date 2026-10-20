import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Badge / Event Chip component mapped to design system tokens:
 * - event-eyes: bg surface (#FFFFFF), text event-eyes (#2A5CAA), border event-eyes/30
 * - event-head: bg surface (#FFFFFF), text event-head (#B45F06), border event-head/30
 * - event-away: bg surface (#FFFFFF), text event-away (#6A4BB5), border event-away/30
 * - info: bg info-container (#E4E9FB), text info (#2A3F9E)
 * - experimental: bg experimental-container (#EDE7FA), text experimental (#4B2F94)
 * - success: bg success-container (#E2F4EA), text success (#16643D)
 * - neutral: bg background (#F6F8F9), text on-surface-muted (#465866), border border (#D5DEE4)
 */
export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold transition-colors',
  {
    variants: {
      variant: {
        'event-eyes':
          'bg-surface text-event-eyes border border-event-eyes/40',
        'event-head':
          'bg-surface text-event-head border border-event-head/40',
        'event-away':
          'bg-surface text-event-away border border-event-away/40',
        info: 'bg-info-container text-info',
        experimental: 'bg-experimental-container text-experimental',
        success: 'bg-success-container text-success',
        neutral: 'bg-background text-on-surface-muted border border-border',
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
