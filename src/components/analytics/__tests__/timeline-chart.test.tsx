import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeAll } from 'vitest';
import { TimelineChart } from '../timeline-chart';
import { SAMPLE_TIMELINE_EVENTS } from '@/lib/mock/sample-session-data';

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('TimelineChart Component', () => {
  it('renders empty message when no events are provided', () => {
    render(<TimelineChart events={[]} />);
    expect(screen.getByText('No events recorded')).toBeDefined();
  });

  it('renders chart container and signal legend when events are present', () => {
    render(<TimelineChart events={SAMPLE_TIMELINE_EVENTS} totalDurationMinutes={25} />);

    expect(screen.getByRole('region', { name: 'Chronological event timeline chart' })).toBeDefined();
    expect(screen.getByText('Signals:')).toBeDefined();
    expect(screen.getByText('Eyes closed / Resting eyes')).toBeDefined();
    expect(screen.getByText('Head turned')).toBeDefined();
    expect(screen.getByText('Looking away')).toBeDefined();
  });
});
