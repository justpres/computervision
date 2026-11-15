'use client';

import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { formatElapsedTime } from '@/lib/session/use-session-state';
import type { SavedSessionSummary } from '@/lib/session/session-storage';

export interface DeleteSessionModalProps {
  session: SavedSessionSummary | null;
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  formatStartTime?: (iso: string) => string;
}

export const DeleteSessionModal: React.FC<DeleteSessionModalProps> = ({
  session,
  isOpen,
  isDeleting,
  onConfirm,
  onCancel,
  formatStartTime,
}) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Autofocus cancel button to prevent accidental confirmation
    cancelButtonRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen || !session) {
    return null;
  }

  const formattedTime = formatStartTime
    ? formatStartTime(session.startedAt)
    : session.startedAt;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4 calm-fade-in"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        className="w-full max-w-md rounded-md bg-surface border border-border shadow-md divide-y divide-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 space-y-2">
          <h2
            id="delete-dialog-title"
            className="text-body-sm font-semibold tracking-tight text-on-surface"
          >
            Delete study session?
          </h2>
          <p
            id="delete-dialog-description"
            className="text-body-sm text-on-surface-muted tabular-nums"
          >
            Are you sure you want to delete the session from{' '}
            <strong className="text-on-surface">{formattedTime}</strong>{' '}
            (Duration {formatElapsedTime(session.durationSeconds)})? This will
            permanently remove this record and all{' '}
            <strong className="text-on-surface">
              {session.counts.total}{' '}
              {session.counts.total === 1 ? 'event' : 'events'}
            </strong>
            . This cannot be undone.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-3.5 bg-background/40">
          <Button
            ref={cancelButtonRef}
            type="button"
            variant="secondary"
            size="sm"
            disabled={isDeleting}
            onClick={onCancel}
            className="min-h-[44px] px-4 rounded-md shadow-none"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={isDeleting}
            onClick={onConfirm}
            className="min-h-[44px] px-4 rounded-md shadow-none"
          >
            <span>{isDeleting ? 'Deleting...' : 'Delete session'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
