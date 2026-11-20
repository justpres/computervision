import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SessionHistoryPanel } from '../session-history-panel';
import { DEFAULT_SESSION_SETTINGS } from '@/lib/settings/settings-store';
import type { SavedSessionSummary } from '@/lib/session/session-storage';

describe('SessionHistoryPanel Component', () => {
  const sampleSession: SavedSessionSummary = {
    id: '11111111-2222-4333-8444-555555555555',
    startedAt: '2026-11-16T09:00:00.000Z',
    endedAt: '2026-11-16T09:05:30.000Z',
    consentedAt: '2026-11-16T08:59:55.000Z',
    durationSeconds: 330,
    settings: DEFAULT_SESSION_SETTINGS,
    counts: {
      eyesClosed: 2,
      longEyeClosure: 1,
      headTurned: 3,
      lookingAway: 1,
      total: 7,
    },
    events: [],
    syncedToCloud: true,
  };

  it('renders empty state when no sessions are saved', () => {
    render(
      <SessionHistoryPanel sessions={[]} onDeleteSession={vi.fn()} />
    );

    expect(screen.getByText('Saved Sessions')).toBeDefined();
    expect(screen.getByText('No saved sessions yet')).toBeDefined();
    expect(
      screen.getByText(/Completed study sessions are automatically saved/)
    ).toBeDefined();
  });

  it('renders saved session duration and per-category event count badges when counts > 0', () => {
    render(
      <SessionHistoryPanel
        sessions={[sampleSession]}
        onDeleteSession={vi.fn()}
      />
    );

    expect(screen.getByText(/Duration 05:30/)).toBeDefined();
    expect(screen.getByText('Eyes closed: 2')).toBeDefined();
    expect(screen.getByText('Long eye closure: 1')).toBeDefined();
    expect(screen.getByText('Head turned: 3')).toBeDefined();
    expect(screen.getByText('Looking away: 1')).toBeDefined();
  });

  it('renders calm "Clear session" indicator when total events is 0 and suppresses zero-count badges', () => {
    const zeroEventSession: SavedSessionSummary = {
      ...sampleSession,
      id: '22222222-3333-4444-5555-666666666666',
      counts: {
        eyesClosed: 0,
        longEyeClosure: 0,
        headTurned: 0,
        lookingAway: 0,
        total: 0,
      },
    };

    render(
      <SessionHistoryPanel
        sessions={[zeroEventSession]}
        onDeleteSession={vi.fn()}
      />
    );

    expect(screen.getByText('Clear session (no signs recorded)')).toBeDefined();
    expect(screen.queryByText('Eyes closed: 0')).toBeNull();
    expect(screen.queryByText('Head turned: 0')).toBeNull();
    expect(screen.queryByText('Long eye closure: 0')).toBeNull();
    expect(screen.queryByText('Looking away: 0')).toBeNull();
  });

  it('opens floating modal before deleting a session and allows cancelling', async () => {
    const onDeleteSession = vi.fn();

    render(
      <SessionHistoryPanel
        sessions={[sampleSession]}
        onDeleteSession={onDeleteSession}
      />
    );

    // Initial state: trash icon button rendered with accessible title/aria-label
    const deleteBtn = screen.getByRole('button', {
      name: /Delete session from/,
    });
    expect(deleteBtn).toBeDefined();

    // Step 1: Click trash icon -> opens floating modal dialog
    act(() => {
      fireEvent.click(deleteBtn);
    });

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Delete study session?')).toBeDefined();
    expect(
      screen.getByText(/permanently remove this record and all/)
    ).toBeDefined();
    expect(onDeleteSession).not.toHaveBeenCalled();

    // Step 2: Cancel closes modal without deleting
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    act(() => {
      fireEvent.click(cancelBtn);
    });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onDeleteSession).not.toHaveBeenCalled();

    // Step 3: Reopen modal and confirm deletion
    act(() => {
      fireEvent.click(deleteBtn);
    });
    const confirmBtn = screen.getByRole('button', { name: 'Delete session' });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(onDeleteSession).toHaveBeenCalledTimes(1);
    expect(onDeleteSession).toHaveBeenCalledWith(sampleSession.id);
  });

  it('renders deletion confirmation banner when lastDeletedSessionId is present', () => {
    render(
      <SessionHistoryPanel
        sessions={[]}
        onDeleteSession={vi.fn()}
        lastDeletedSessionId="11111111-2222-4333-8444-555555555555"
      />
    );

    expect(
      screen.getByText(
        'Session and all associated event records were permanently deleted.'
      )
    ) .toBeDefined();
  });

  it('calls onInspectSession when clicking View summary on a saved session', () => {
    const onInspectSession = vi.fn();

    render(
      <SessionHistoryPanel
        sessions={[sampleSession]}
        onDeleteSession={vi.fn()}
        onInspectSession={onInspectSession}
      />
    );

    const viewBtn = screen.getByRole('button', {
      name: /View summary for session from/,
    });
    fireEvent.click(viewBtn);

    expect(onInspectSession).toHaveBeenCalledTimes(1);
    expect(onInspectSession).toHaveBeenCalledWith(sampleSession.id);
  });
});
