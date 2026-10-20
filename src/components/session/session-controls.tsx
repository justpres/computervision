import React from 'react';
import { Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SessionControlsProps {
  isMonitoring: boolean;
  onStart: () => void;
  onStop: () => void;
  className?: string;
}

/**
 * Session control button:
 * - One primary button that switches between "Start session" and "Stop session".
 * - Large target (at least 44px high).
 * - Stop ends monitoring immediately with no confirmation step.
 */
export const SessionControls: React.FC<SessionControlsProps> = ({
  isMonitoring,
  onStart,
  onStop,
  className,
}) => {
  return (
    <div className={className}>
      {isMonitoring ? (
        <Button
          variant="danger"
          size="default"
          onClick={onStop}
          className="w-full sm:w-auto min-w-[160px] gap-2 font-semibold"
          aria-label="Stop study session immediately"
        >
          <Square className="w-4 h-4 fill-current" aria-hidden="true" />
          <span>Stop session</span>
        </Button>
      ) : (
        <Button
          variant="primary"
          size="default"
          onClick={onStart}
          className="w-full sm:w-auto min-w-[160px] gap-2 font-semibold"
          aria-label="Start study session with consent check"
        >
          <Play className="w-4 h-4 fill-current" aria-hidden="true" />
          <span>Start session</span>
        </Button>
      )}
    </div>
  );
};
