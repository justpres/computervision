import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeAll } from 'vitest';
import { SessionSummaryView } from '../session-summary-view';

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('SessionSummaryView Component', () => {
  it('renders summary title and 4 metric cards', () => {
    render(<SessionSummaryView />);

    expect(
      screen.getByText('Study Session Analytics & Timeline')
    ).toBeDefined();

    // 4 metric cards
    expect(screen.getByText('Study duration')).toBeDefined();
    expect(screen.getAllByText('Eyes closed').length).toBeGreaterThan(0);
    expect(screen.getByText('Resting eyes')).toBeDefined();
    expect(screen.getByText('Head adjustments')).toBeDefined();

    // Timeline and event log
    expect(screen.getByText('Chronological Event Timeline')).toBeDefined();
    expect(screen.getByText('Event Detail Log')).toBeDefined();
  });

  it('allows toggling event category filters in the table', () => {
    render(<SessionSummaryView />);

    const headFilterBtn = screen.getByRole('button', { name: /Head \(/i });
    expect(headFilterBtn).toBeDefined();

    fireEvent.click(headFilterBtn);
    expect(headFilterBtn.className).toContain('bg-primary');
  });

  it('populates active session timeline and events directly', () => {
    render(
      <SessionSummaryView
        currentSessionEvents={[]}
        currentSessionDurationSeconds={0}
      />
    );

    expect(screen.getByText('Active session')).toBeDefined();
    expect(screen.getByText('25:00')).toBeDefined();
    expect(screen.getByText('18 of 18')).toBeDefined();
  });
});
