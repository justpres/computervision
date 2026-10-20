import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MonitoringIndicator } from '../monitoring-indicator';

describe('MonitoringIndicator Component', () => {
  it('renders "Camera off" when inactive with no duplicate icons', () => {
    const { container } = render(<MonitoringIndicator isMonitoring={false} />);

    expect(screen.getByText('Camera off')).toBeDefined();
    expect(container.querySelector('svg')).toBeNull();
    const statusContainer = screen.getByRole('status');
    expect(statusContainer.getAttribute('aria-live')).toBe('polite');
  });

  it('renders "Monitoring is on" and displays elapsed time when active', () => {
    render(<MonitoringIndicator isMonitoring={true} elapsedTime="05:23" />);

    expect(screen.getByText('Monitoring is on')).toBeDefined();
    expect(screen.getByText('05:23')).toBeDefined();
  });

  it('includes accessible labels for assistive technologies', () => {
    render(<MonitoringIndicator isMonitoring={true} elapsedTime="01:30" />);

    const timer = screen.getByLabelText('Elapsed session time: 01:30');
    expect(timer).toBeDefined();
  });
});
