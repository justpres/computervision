import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeAll } from 'vitest';
import { SessionSummaryView } from '../session-summary-view';
import { DEFAULT_SESSION_SETTINGS } from '@/lib/settings/settings-store';
import type { SavedSessionSummary } from '@/lib/session/session-storage';

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const savedSessionLatest: SavedSessionSummary = {
  id: '11111111-2222-4333-8444-555555555555',
  startedAt: '2026-11-20T08:00:00.000Z',
  endedAt: '2026-11-20T08:10:00.000Z',
  consentedAt: '2026-11-20T07:59:55.000Z',
  durationSeconds: 600,
  settings: DEFAULT_SESSION_SETTINGS,
  counts: {
    eyesClosed: 1,
    longEyeClosure: 1,
    headTurned: 1,
    lookingAway: 0,
    total: 3,
  },
  events: [
    {
      id: 'evt-1',
      event_type: 'eyes_closed',
      started_at: '2026-11-20T08:01:30.000Z',
      duration_ms: 1500,
    },
    {
      id: 'evt-2',
      event_type: 'long_eye_closure',
      started_at: '2026-11-20T08:04:00.000Z',
      duration_ms: 3200,
    },
    {
      id: 'evt-3',
      event_type: 'head_turned',
      started_at: '2026-11-20T08:07:15.000Z',
      duration_ms: 2100,
    },
  ],
  syncedToCloud: true,
};

const savedSessionOlder: SavedSessionSummary = {
  id: '22222222-3333-4444-8555-666666666666',
  startedAt: '2026-11-19T14:00:00.000Z',
  endedAt: '2026-11-19T14:05:00.000Z',
  consentedAt: '2026-11-19T13:59:55.000Z',
  durationSeconds: 300,
  settings: DEFAULT_SESSION_SETTINGS,
  counts: {
    eyesClosed: 0,
    longEyeClosure: 0,
    headTurned: 0,
    lookingAway: 1,
    total: 1,
  },
  events: [
    {
      id: 'evt-older-1',
      event_type: 'looking_away',
      started_at: '2026-11-19T14:02:00.000Z',
      duration_ms: 4200,
    },
  ],
  syncedToCloud: true,
};

describe('SessionSummaryView Component', () => {
  it('renders an honest empty state when an account has no saved or active sessions', () => {
    render(<SessionSummaryView savedSessions={[]} />);

    expect(
      screen.getByText('Study Session Analytics & Timeline')
    ).toBeDefined();
    expect(screen.getByText('00:00')).toBeDefined();
    expect(screen.getByText('No session recorded')).toBeDefined();
    expect(screen.getByText('0 of 0')).toBeDefined();
    expect(screen.queryByText('25:00')).toBeNull();
    expect(screen.queryByText('18 of 18')).toBeNull();
  });

  it('displays the latest saved session from database/history and allows switching sessions', () => {
    render(
      <SessionSummaryView
        savedSessions={[savedSessionLatest, savedSessionOlder]}
      />
    );

    // Defaults to latest saved session (10:00, 3 events)
    expect(screen.getByText('10:00')).toBeDefined();
    expect(screen.getByText('3 of 3')).toBeDefined();
    expect(screen.getByText('All (3)')).toBeDefined();
    expect(screen.getByText('Eyes (2)')).toBeDefined();
    expect(screen.getByText('Head (1)')).toBeDefined();

    // Switch to the older saved session via selector
    const selector = screen.getByLabelText('Select study session to inspect');
    fireEvent.change(selector, { target: { value: savedSessionOlder.id } });

    expect(screen.getByText('05:00')).toBeDefined();
    expect(screen.getByText('1 of 1')).toBeDefined();
    expect(screen.getByText('4.2s')).toBeDefined();
    expect(screen.getAllByText('Looking away').length).toBeGreaterThanOrEqual(2);
  });

  it('allows toggling event category filters in the table for saved sessions', () => {
    render(<SessionSummaryView savedSessions={[savedSessionLatest]} />);

    const headFilterBtn = screen.getByRole('button', { name: /Head \(1\)/i });
    expect(headFilterBtn).toBeDefined();

    fireEvent.click(headFilterBtn);
    expect(headFilterBtn.className).toContain('bg-primary');
    expect(screen.getByText('1 of 3')).toBeDefined();
  });

  it('displays the active live session when monitoring is on', () => {
    render(
      <SessionSummaryView
        isMonitoring={true}
        currentSessionEvents={[]}
        currentSessionDurationSeconds={95}
        savedSessions={[savedSessionLatest]}
      />
    );

    expect(screen.getByText('Active session')).toBeDefined();
    expect(screen.getByText('01:35')).toBeDefined();
    expect(screen.getByText('0 of 0')).toBeDefined();
  });
});
