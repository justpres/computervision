import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiveStatusCard } from '../live-status-card';

describe('LiveStatusCard Component', () => {
  it('renders "Ready to start" standby state with Start button and privacy note when not monitoring', () => {
    const onStart = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <LiveStatusCard
        isMonitoring={false}
        isWorkerReady={false}
        faceDetected={false}
        onStart={onStart}
        onOpenSettings={onOpenSettings}
      />
    );

    expect(screen.getByText('Ready to start')).toBeDefined();
    expect(screen.getByText(/Your camera turns on only after you agree/)).toBeDefined();
    expect(screen.getByText('No video is saved · Processed in your browser')).toBeDefined();

    const startBtn = screen.getByRole('button', { name: /Start study session/i });
    expect(startBtn).toBeDefined();
    fireEvent.click(startBtn);
    expect(onStart).toHaveBeenCalledTimes(1);

    const settingsBtn = screen.getByRole('button', { name: /Detection settings/i });
    expect(settingsBtn).toBeDefined();
    fireEvent.click(settingsBtn);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('renders seeking state when active but no face detected, with Stop button and next step hint', () => {
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
    expect(stopBtn).toBeDefined();
    fireEvent.click(stopBtn);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('renders "In view", "Eyes open", "Head centered", and hides raw developer readouts', () => {
    render(
      <LiveStatusCard
        isMonitoring={true}
        isWorkerReady={true}
        faceDetected={true}
        isEyesClosed={false}
        isHeadTurned={false}
      />
    );

    expect(screen.getByText('In view')).toBeDefined();
    expect(screen.getByText('Eyes open')).toBeDefined();
    expect(screen.getByText('Head centered')).toBeDefined();

    // Verify developer telemetry is not rendered in student view
    expect(screen.queryByText(/Blink level/)).toBeNull();
    expect(screen.queryByText(/Yaw/)).toBeNull();
    expect(screen.queryByText(/Pitch/)).toBeNull();
    expect(screen.queryByText(/Response:/)).toBeNull();
    expect(screen.queryByText('Ready')).toBeNull();
  });

  it('renders "Eyes closed 1.4s" when eyes are closed', () => {
    render(
      <LiveStatusCard
        isMonitoring={true}
        isWorkerReady={true}
        faceDetected={true}
        isEyesClosed={true}
        eyeClosureDurationMs={1400}
      />
    );

    expect(screen.getByText('Eyes closed 1.4s')).toBeDefined();
  });

  it('renders "Head turned 1.8s" when head is turned', () => {
    render(
      <LiveStatusCard
        isMonitoring={true}
        isWorkerReady={true}
        faceDetected={true}
        isHeadTurned={true}
        headPoseDurationMs={1800}
      />
    );

    expect(screen.getByText('Head turned 1.8s')).toBeDefined();
  });

  it('renders "Long eye closure", "Looking away", and 4-item This session summary', () => {
    render(
      <LiveStatusCard
        isMonitoring={true}
        isWorkerReady={true}
        faceDetected={true}
        isEyesClosed={true}
        isLongEyeClosure={true}
        eyeClosureDurationMs={2400}
        isHeadTurned={true}
        isLookingAway={true}
        lookingAwayDurationMs={3400}
        eventCounts={{
          eyesClosed: 2,
          longEyeClosure: 1,
          headTurned: 3,
          lookingAway: 1,
          total: 7,
        }}
      />
    );

    expect(screen.getByText('Long eye closure 2.4s')).toBeDefined();
    expect(screen.getByText('Looking away 3.4s')).toBeDefined();
    expect(screen.getByText('This session')).toBeDefined();
    expect(screen.getByTestId('count-eyes-closed').textContent).toBe('2');
    expect(screen.getByTestId('count-long-eye-closure').textContent).toBe('1');
    expect(screen.getByTestId('count-head-turned').textContent).toBe('3');
    expect(screen.getByTestId('count-looking-away').textContent).toBe('1');
  });
});
