import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiveStatusCard } from '../live-status-card';

describe('LiveStatusCard Component', () => {
  it('renders "Ready to start" standby state with Start button and privacy note when not monitoring', () => {
    const onStart = vi.fn();

    render(
      <LiveStatusCard
        isMonitoring={false}
        isWorkerReady={false}
        faceDetected={false}
        onStart={onStart}
      />
    );

    expect(screen.getByText('Ready to start')).toBeDefined();
    expect(screen.getByText(/Your camera turns on only after you agree/)).toBeDefined();
    expect(screen.getByText('No video is saved · Processed in your browser')).toBeDefined();

    const startBtn = screen.getByRole('button', { name: /Start study session/i });
    fireEvent.click(startBtn);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('shows "Not found" with a plain next step when active but no face detected, with Stop button', () => {
    const onStop = vi.fn();

    render(
      <LiveStatusCard
        isMonitoring={true}
        isWorkerReady={true}
        faceDetected={false}
        onStop={onStop}
      />
    );

    expect(screen.getByText('Session in progress')).toBeDefined();
    expect(screen.getByText('Face')).toBeDefined();
    expect(screen.getByText('Not found')).toBeDefined();
    expect(screen.getByText('Move into the camera view.')).toBeDefined();

    const stopBtn = screen.getByRole('button', { name: /Stop study session immediately/i });
    fireEvent.click(stopBtn);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('shows "In view" when face is present and hides all developer telemetry', () => {
    render(
      <LiveStatusCard isMonitoring={true} isWorkerReady={true} faceDetected={true} />
    );

    expect(screen.getByText('In view')).toBeDefined();
    expect(screen.queryByText(/ms/)).toBeNull();
    expect(screen.queryByText('Ready')).toBeNull();
    expect(screen.queryByText(/Elapsed/)).toBeNull();
  });

  it('shows "Getting ready…" while detection is still loading', () => {
    render(
      <LiveStatusCard isMonitoring={true} isWorkerReady={false} faceDetected={false} />
    );

    expect(screen.getByText('Getting ready…')).toBeDefined();
  });
});
