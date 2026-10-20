import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiveStatusCard } from '../live-status-card';

describe('LiveStatusCard Component', () => {
  it('renders "Ready to Start" standby state with Start button and privacy note when not monitoring', () => {
    const onStart = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <LiveStatusCard
        isMonitoring={false}
        isWorkerReady={false}
        faceDetected={false}
        processingTimeMs={0}
        onStart={onStart}
        onOpenSettings={onOpenSettings}
        settingsSummary="Eyes 60% · Yaw 30° · Pitch 25°"
      />
    );

    expect(screen.getByText('Ready to Start')).toBeDefined();
    expect(screen.getByText('Standby')).toBeDefined();
    expect(screen.getByText(/Your camera only turns on after you review and accept/)).toBeDefined();
    expect(screen.getByText('Thresholds: Eyes 60% · Yaw 30° · Pitch 25°')).toBeDefined();

    const startBtn = screen.getByRole('button', { name: /Start study session/i });
    expect(startBtn).toBeDefined();
    fireEvent.click(startBtn);
    expect(onStart).toHaveBeenCalledTimes(1);

    const settingsBtn = screen.getByRole('button', { name: /Detection settings/i });
    expect(settingsBtn).toBeDefined();
    fireEvent.click(settingsBtn);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('renders seeking state in header when active but no face detected, with Stop button and elapsed time', () => {
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
    expect(screen.getByText('Ready')).toBeDefined();
    expect(screen.getByText('Looking for face...')).toBeDefined();

    const stopBtn = screen.getByRole('button', { name: /Stop study session immediately/i });
    expect(stopBtn).toBeDefined();
    fireEvent.click(stopBtn);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('renders "Face in view", "Eyes open", "Head centered", and latency when face is present', () => {
    render(
      <LiveStatusCard
        isMonitoring={true}
        isWorkerReady={true}
        faceDetected={true}
        processingTimeMs={16}
        isEyesClosed={false}
        eyeBlinkScore={0.12}
        isHeadTurned={false}
        headYawDegrees={4}
        headPitchDegrees={-2}
      />
    );

    expect(screen.getByText('Face in view')).toBeDefined();
    expect(screen.getByText('Eyes open')).toBeDefined();
    expect(screen.getByText('Head centered')).toBeDefined();
    expect(screen.getByText('Blink level')).toBeDefined();
    expect(screen.getByText('12%')).toBeDefined();
    expect(screen.getByText('Yaw 4° · Pitch -2°')).toBeDefined();
    expect(screen.getByText('16 ms')).toBeDefined();
  });

  it('renders neutral "Eyes closed" badge with duration when eyes are closed', () => {
    render(
      <LiveStatusCard
        isMonitoring={true}
        isWorkerReady={true}
        faceDetected={true}
        processingTimeMs={14}
        isEyesClosed={true}
        eyeClosureDurationMs={1400}
        eyeBlinkScore={0.78}
      />
    );

    expect(screen.getByText('Eyes closed 1.4s')).toBeDefined();
    expect(screen.getByText('Blink level')).toBeDefined();
    expect(screen.getByText('78%')).toBeDefined();
  });

  it('renders neutral "Head turned" badge with duration and angles when head is turned', () => {
    render(
      <LiveStatusCard
        isMonitoring={true}
        isWorkerReady={true}
        faceDetected={true}
        processingTimeMs={15}
        isHeadTurned={true}
        headPoseDurationMs={1800}
        headYawDegrees={35}
        headPitchDegrees={5}
      />
    );

    expect(screen.getByText('Head turned 1.8s')).toBeDefined();
    expect(screen.getByText('Yaw 35° · Pitch 5°')).toBeDefined();
  });

  it('renders live "Long eye closure", "Looking away", and 4-item Session Event Counts summary bar', () => {
    render(
      <LiveStatusCard
        isMonitoring={true}
        isWorkerReady={true}
        faceDetected={true}
        processingTimeMs={14}
        isEyesClosed={true}
        isLongEyeClosure={true}
        eyeClosureDurationMs={2400}
        eyeBlinkScore={0.85}
        isHeadTurned={true}
        isLookingAway={true}
        lookingAwayDurationMs={3400}
        headYawDegrees={-36}
        headPitchDegrees={2}
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
    expect(screen.getByText('Session Event Counts')).toBeDefined();
    expect(screen.getByTestId('count-eyes-closed').textContent).toBe('2');
    expect(screen.getByTestId('count-long-eye-closure').textContent).toBe('1');
    expect(screen.getByTestId('count-head-turned').textContent).toBe('3');
    expect(screen.getByTestId('count-looking-away').textContent).toBe('1');
  });
});
