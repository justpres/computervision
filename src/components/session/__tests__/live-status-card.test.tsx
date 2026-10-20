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
    expect(screen.getByText('Detection ready')).toBeDefined();
    expect(screen.getByText('Looking for face...')).toBeDefined();
    expect(
      screen.getByText(/Please ensure your face is well-lit/)
    ).toBeDefined();
  });

  it('renders "Face detected", "Eyes open", "Head centered", and latency when face is present', () => {
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

    expect(screen.getByText('Face detected')).toBeDefined();
    expect(
      screen.getByText(/One person detected in view/)
    ).toBeDefined();
    expect(screen.getByText('Eyes open')).toBeDefined();
    expect(screen.getByText('Head centered')).toBeDefined();
    expect(screen.getByText('Blink level')).toBeDefined(); expect(screen.getByText('12%')).toBeDefined();
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
    expect(screen.getByText('Blink level')).toBeDefined(); expect(screen.getByText('78%')).toBeDefined();
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
});
