import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiveStatusCard } from '../live-status-card';

describe('LiveStatusCard Component', () => {
  it('renders "Ready to Start" standby state with Start button and privacy note when not monitoring', () => {
    const onStart = vi.fn();

    render(
      <LiveStatusCard
        isMonitoring={false}
        isWorkerReady={false}
        faceDetected={false}
        processingTimeMs={0}
        onStart={onStart}
      />
    );

    expect(screen.getByText('Ready to Start')).toBeDefined();
    expect(screen.getByText('Standby')).toBeDefined();
    expect(screen.getByText(/Your camera only turns on after you review and accept/)).toBeDefined();

    const startBtn = screen.getByRole('button', { name: /Start study session/i });
    expect(startBtn).toBeDefined();
    fireEvent.click(startBtn);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('renders seeking state when active but no face detected, with Stop button and elapsed time', () => {
    const onStop = vi.fn();

    render(
      <LiveStatusCard
        isMonitoring={true}
        isWorkerReady={true}
        faceDetected={false}
        processingTimeMs={12}
        formattedElapsedTime="01:23"
        onStop={onStop}
      />
    );

    expect(screen.getByText('Active Session')).toBeDefined();
    expect(screen.getByText('01:23')).toBeDefined();
    expect(screen.getByText('Detection ready')).toBeDefined();
    expect(screen.getByText('Looking for face')).toBeDefined();
    expect(screen.getByText('Seeking')).toBeDefined();

    const stopBtn = screen.getByRole('button', { name: /Stop study session immediately/i });
    expect(stopBtn).toBeDefined();
    fireEvent.click(stopBtn);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('renders "Face in view", "Present", and latency when face is present in view', () => {
    render(
      <LiveStatusCard
        isMonitoring={true}
        isWorkerReady={true}
        faceDetected={true}
        processingTimeMs={16}
      />
    );

    expect(screen.getByText('Face in view')).toBeDefined();
    expect(screen.getByText('Present')).toBeDefined();
    expect(screen.getByText('16 ms')).toBeDefined();
  });
});
