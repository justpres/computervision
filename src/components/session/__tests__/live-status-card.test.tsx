import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveStatusCard } from '../live-status-card';

describe('LiveStatusCard Component', () => {
  it('renders idle state when not monitoring', () => {
    render(
      <LiveStatusCard
        isMonitoring={false}
        isWorkerReady={false}
        faceDetected={false}
        processingTimeMs={0}
      />
    );

    expect(screen.getByText('Detection Status')).toBeDefined();
    expect(screen.getByText('Idle')).toBeDefined();
    expect(
      screen.getByText(/Real-time browser detection begins automatically/)
    ).toBeDefined();
  });

  it('renders seeking state when active but no face detected', () => {
    render(
      <LiveStatusCard
        isMonitoring={true}
        isWorkerReady={true}
        faceDetected={false}
        processingTimeMs={12}
      />
    );

    expect(screen.getByText('Live Detection')).toBeDefined();
    expect(screen.getByText('Worker Active')).toBeDefined();
    expect(screen.getByText('Looking for face...')).toBeDefined();
    expect(
      screen.getByText(/Please ensure your face is well-lit/)
    ).toBeDefined();
  });

  it('renders "Face detected" and latency when face is present in view', () => {
    render(
      <LiveStatusCard
        isMonitoring={true}
        isWorkerReady={true}
        faceDetected={true}
        processingTimeMs={16}
      />
    );

    expect(screen.getByText('Face detected')).toBeDefined();
    expect(
      screen.getByText(/One person detected in view/)
    ).toBeDefined();
    expect(screen.getByText('16 ms')).toBeDefined();
  });
});
