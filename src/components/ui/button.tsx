import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Button component adhering to design system tokens:
 * - primary: bg #0B6477, text #FFFFFF, hover #084E5D, height 44px, radius 10px (rounded-md)
 * - secondary: bg #FFFFFF, text #0B6477, border #D5DEE4, height 44px, radius 10px
 * - danger: bg #B3261E, text #FFFFFF, height 44px, radius 10px
 * - typography: label (14px font-semibold)
 * - WCAG 2.2 AA target: minimum 44px height
 * - Visible focus ring with 2px offset
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-label transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-hover',
        secondary:
          'bg-surface text-primary border border-border hover:bg-background active:bg-background',
        danger:
          'bg-error text-on-error hover:opacity-90 active:opacity-90',
      },
      size: {
        default: 'h-11 px-5 py-3 rounded-md', // 44px height
        sm: 'h-9 px-3.5 py-2 rounded-md',
        lg: 'h-12 px-6 py-3 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
