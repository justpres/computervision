'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface BreakReminderProps {
  isOpen: boolean;
  studyDurationMinutes: number;
  onDismiss: () => void;
  onTakeBreak?: () => void;
}

/**
 * Gentle Time-Based Break Reminder (Feature F-18) — Swiss-Grid Utilitarian Precision:
 * - Zero decorative icons (only functional X close button).
 * - Hairline-divided modal structure.
 */
export const BreakReminder: React.FC<BreakReminderProps> = ({
  isOpen,
  studyDurationMinutes,
  onDismiss,
  onTakeBreak,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onDismiss]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="break-reminder-title"
      aria-describedby="break-reminder-desc"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm calm-fade-in"
    >
      <div className="relative w-full max-w-md rounded-lg border border-border bg-surface shadow-sm text-on-surface divide-y divide-border">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5">
          <h3
            id="break-reminder-title"
            className="text-body-sm font-semibold tracking-tight text-on-surface"
          >
            Time for a short break
          </h3>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] -mr-2 rounded-md text-on-surface-muted hover:text-on-surface hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Dismiss break reminder"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <p id="break-reminder-desc" className="text-body-sm text-on-surface tabular-nums">
            You have been studying for {studyDurationMinutes} minutes. Taking short pauses helps maintain comfortable focus and eye comfort.
          </p>

          <div className="pt-3 border-t border-border text-caption text-on-surface-muted">
            <span className="font-semibold text-on-surface">Recommended rest: </span>
            Look at an object 20 feet away for 20 seconds, stretch, or grab water.
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 px-5 py-3.5 bg-background/40">
          <Button
            type="button"
            variant="secondary"
            size="default"
            onClick={onDismiss}
            className="flex-1 min-h-[44px] rounded-md shadow-none"
          >
            Dismiss
          </Button>
          <Button
            type="button"
            variant="primary"
            size="default"
            onClick={onTakeBreak || onDismiss}
            className="flex-1 min-h-[44px] rounded-md shadow-none"
          >
            Take 5-min break
          </Button>
        </div>
      </div>
    </div>
  );
};
