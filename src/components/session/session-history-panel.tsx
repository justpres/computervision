'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatElapsedTime } from '@/lib/session/use-session-state';
import type { SavedSessionSummary } from '@/lib/session/session-storage';
import { DeleteSessionModal } from './delete-session-modal';

export interface SessionHistoryPanelProps {
  sessions: readonly SavedSessionSummary[];
  isLoading?: boolean;
  onDeleteSession: (sessionId: string) => Promise<void> | void;
  lastDeletedSessionId?: string | null;
}

/**
 * Formats an ISO timestamp into a readable local date and time string.
 */
export function formatSessionStartTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Saved Sessions ledger built with Swiss-Grid Utilitarian Precision:
 * - Zero decorative icons.
 * - Flush hairline rows (divide-y divide-border) instead of nested cards.
 * - 6px solid semantic dot for clear sessions; sharp mechanical tags for recorded signs.
 */
export const SessionHistoryPanel: React.FC<SessionHistoryPanelProps> = ({
  sessions,
  isLoading = false,
  onDeleteSession,
  lastDeletedSessionId = null,
}) => {
  const [sessionToDelete, setSessionToDelete] = useState<SavedSessionSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleConfirmDelete = async (sessionId: string) => {
    setIsDeleting(true);
    try {
      await onDeleteSession(sessionId);
    } finally {
      setIsDeleting(false);
      setSessionToDelete(null);
    }
  };

  return (
    <section
      aria-labelledby="saved-sessions-heading"
      className="rounded-md border border-border bg-surface shadow-none"
    >
      {/* Top Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 border-b border-border">
        <h2
          id="saved-sessions-heading"
          className="text-body-sm font-semibold tracking-tight text-on-surface"
        >
          Saved Sessions
        </h2>

        <span className="font-mono text-caption text-on-surface-muted tabular-nums">
          Saved records: <strong className="text-on-surface">{sessions.length}</strong>
        </span>
      </div>

      {/* Data Minimization Strip */}
      <div className="px-4 py-2.5 border-b border-border bg-background/40 font-mono text-caption text-on-surface-muted">
        Only event timestamps and durations are saved—never video or face landmarks.
      </div>

      {lastDeletedSessionId && (
        <div
          role="status"
          className="flex items-center gap-2 border-b border-border bg-background px-4 py-3 text-body-sm text-on-surface calm-fade-in"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" aria-hidden="true" />
          <span>Session and all associated event records were permanently deleted.</span>
        </div>
      )}

      {isLoading ? (
        <div
          role="status"
          aria-label="Loading saved study sessions..."
          className="divide-y divide-border"
        >
          <span className="sr-only">Loading saved study sessions...</span>
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="flex items-center justify-between px-4 py-4 gap-4"
            >
              <div className="space-y-2 flex-1 max-w-md">
                <div className="h-4 w-44 bg-background animate-pulse rounded-sm" />
                <div className="h-3.5 w-64 bg-background animate-pulse rounded-sm" />
              </div>
              <div className="h-8 w-16 bg-background animate-pulse rounded-sm shrink-0" />
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="p-8 text-center space-y-1">
          <p className="text-body-sm font-semibold text-on-surface">
            No saved sessions yet
          </p>
          <p className="text-caption text-on-surface-muted">
            Completed study sessions are automatically saved when you click Stop Monitoring.
          </p>
        </div>
      ) : (
        <ul
          aria-label="Saved study sessions"
          className="divide-y divide-border"
        >
          {sessions.map((session) => {
            const hasAnyEvents = session.counts.total > 0;

            return (
              <li
                key={session.id}
                className="px-4 py-3.5 hover:bg-background/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-caption font-semibold text-on-surface tabular-nums">
                        {formatSessionStartTime(session.startedAt)}
                      </span>
                      <span className="font-mono text-caption text-on-surface-muted tabular-nums">
                        · Duration {formatElapsedTime(session.durationSeconds)}
                      </span>
                    </div>

                    {/* Signs Summary: 6px dot if 0, else sharp mechanical tags */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {!hasAnyEvents ? (
                        <span className="inline-flex items-center gap-2 text-caption font-medium text-on-surface-muted">
                          <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" aria-hidden="true" />
                          <span>Clear session (no signs recorded)</span>
                        </span>
                      ) : (
                        <>
                          {session.counts.eyesClosed > 0 && (
                            <Badge variant="event-eyes" className="tabular-nums">
                              <span>Eyes closed: {session.counts.eyesClosed}</span>
                            </Badge>
                          )}

                          {session.counts.longEyeClosure > 0 && (
                            <Badge variant="event-eyes" className="tabular-nums">
                              <span>Long eye closure: {session.counts.longEyeClosure}</span>
                            </Badge>
                          )}

                          {session.counts.headTurned > 0 && (
                            <Badge variant="event-head" className="tabular-nums">
                              <span>Head turned: {session.counts.headTurned}</span>
                            </Badge>
                          )}

                          {session.counts.lookingAway > 0 && (
                            <Badge variant="event-away" className="tabular-nums">
                              <span>Looking away: {session.counts.lookingAway}</span>
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Accessible Delete Control (44px target, zero decorative icon) */}
                  <div className="flex items-center shrink-0 self-start sm:self-auto">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      title="Delete session"
                      aria-label={`Delete session from ${formatSessionStartTime(session.startedAt)}`}
                      onClick={() => setSessionToDelete(session)}
                      className="min-h-[44px] px-3.5 font-mono text-caption text-on-surface-muted hover:text-error hover:border-error/50 hover:bg-error-container/40 rounded-md shadow-none transition-colors"
                    >
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Floating Centered Confirmation Modal */}
      <DeleteSessionModal
        session={sessionToDelete}
        isOpen={sessionToDelete !== null}
        isDeleting={isDeleting}
        onCancel={() => setSessionToDelete(null)}
        onConfirm={() => {
          if (sessionToDelete) {
            void handleConfirmDelete(sessionToDelete.id);
          }
        }}
        formatStartTime={formatSessionStartTime}
      />
    </section>
  );
};
