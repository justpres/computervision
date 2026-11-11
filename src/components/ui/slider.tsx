import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'onChange'
  > {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
}

/**
 * Accessible range slider component:
 * - Uses border-strong (#6F8392, 3.9:1 contrast on white) for track boundary.
 * - Uses primary (#0B6477) accent color for thumb and active range.
 * - Minimum 44px touch/interaction height (h-11) per WCAG 2.2 AA.
 * - Full keyboard navigation (Left/Right/Up/Down/Home/End) and 2px visible focus ring.
 */
export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, min, max, step = 1, onValueChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = Number.parseFloat(e.target.value);
      if (Number.isFinite(next)) {
        onValueChange(next);
      }
    };

    return (
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className={cn(
          'h-11 w-full cursor-pointer appearance-none bg-transparent accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm',
          '[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-background [&::-webkit-slider-runnable-track]:border [&::-webkit-slider-runnable-track]:border-border-strong',
          '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface',
          '[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-background [&::-moz-range-track]:border [&::-moz-range-track]:border-border-strong',
          '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-surface',
          className
        )}
        {...props}
      />
    );
  }
);

Slider.displayName = 'Slider';
