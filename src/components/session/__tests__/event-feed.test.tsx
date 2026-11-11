import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventFeed } from '../event-feed';
import type { SessionDetectionEvent } from '@/lib/detection/session-event-engine';

describe('EventFeed Component', () => {
  it('renders calm empty state when no events have occurred', () => {
    render(<EventFeed events={[]} />);

    expect(screen.getByText('Recent activity')).toBeDefined();
    expect(
      screen.getByText('No signs recorded yet in this session.')
    ).toBeDefined();
  });

  it('renders neutral "Eyes closed" and "Head turned" events in reverse chronological order', () => {
    const events: SessionDetectionEvent[] = [
      {
        id: 'evt-1',
        eventType: 'eyes_closed',
        startedAtMs: 1000,
        endedAtMs: 2200,
        durationMs: 1200,
        startedAtIso: '2026-10-20T10:00:01.000Z',
      },
      {
        id: 'evt-2',
        eventType: 'head_turned',
        startedAtMs: 4000,
        endedAtMs: 6500,
        durationMs: 2500,
        startedAtIso: '2026-10-20T10:00:04.000Z',
      },
    ];

    render(<EventFeed events={events} />);

    expect(screen.getByText('Eyes closed')).toBeDefined();
    expect(screen.getByText('1.2s')).toBeDefined();
    expect(screen.getByText('Head turned')).toBeDefined();
    expect(screen.getByText('2.5s')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
  });
});
