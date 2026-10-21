import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FocusStage } from '../focus-stage';

describe('FocusStage Component', () => {
  const defaultCounts = {
    eyesClosed: 0,
    longEyeClosure: 0,
    headTurned: 0,
    lookingAway: 0,
    total: 0,
  };

  it('renders standby state with digital timer and Start study session button', () => {
    const onStart = vi.fn();
    render(
      <FocusStage
        isMonitoring={false}
        formattedElapsedTime="00:00"
        faceDetected={false}
        isEyesClosed={false}
        isLongEyeClosure={false}
        eyeClosureDurationMs={0}
        isHeadTurned={false}
        isHeadTilted={false}
        isLookingAway={false}
        headPoseDurationMs={0}
        lookingAwayDurationMs={0}
        eventCounts={defaultCounts}
        onStart={onStart}
        onStop={vi.fn()}
        onOpenSettings={vi.fn()}
      />
    );

    expect(screen.getByText('Study Session')).toBeDefined();
    expect(screen.getByText('00:00')).toBeDefined();

    const startBtn = screen.getByRole('button', { name: /Start study session/ });
    expect(startBtn).toBeDefined();

    fireEvent.click(startBtn);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('renders active state with End study session CTA, timer, and live status pills', () => {
    const onStop = vi.fn();
    render(
      <FocusStage
        isMonitoring={true}
        formattedElapsedTime="12:34"
        faceDetected={true}
        isEyesClosed={false}
        isLongEyeClosure={false}
        eyeClosureDurationMs={0}
        isHeadTurned={false}
        isHeadTilted={false}
        isLookingAway={false}
        headPoseDurationMs={0}
        lookingAwayDurationMs={0}
        eventCounts={{
          eyesClosed: 2,
          longEyeClosure: 1,
          headTurned: 3,
          lookingAway: 1,
          total: 7,
        }}
        onStart={vi.fn()}
        onStop={onStop}
        onOpenSettings={vi.fn()}
      />
    );

    expect(screen.getByText('Focus Session')).toBeDefined();
    expect(screen.getByText('12:34')).toBeDefined();

    expect(screen.getByText('Face in view')).toBeDefined();
    expect(screen.getByText('Eyes open')).toBeDefined();
    expect(screen.getByText('Head centered')).toBeDefined();
    expect(screen.getByText('7')).toBeDefined();

    const endBtn = screen.getByRole('button', { name: /End study session/ });
    expect(endBtn).toBeDefined();

    fireEvent.click(endBtn);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('renders reactive status pill states for detection events without layout shift', () => {
    render(
      <FocusStage
        isMonitoring={true}
        formattedElapsedTime="05:10"
        faceDetected={true}
        isEyesClosed={true}
        isLongEyeClosure={false}
        eyeClosureDurationMs={1500}
        isHeadTurned={false}
        isHeadTilted={false}
        isLookingAway={true}
        headPoseDurationMs={0}
        lookingAwayDurationMs={2200}
        eventCounts={defaultCounts}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onOpenSettings={vi.fn()}
      />
    );

    expect(screen.getByText(/Closed \(1\.5s\)/)).toBeDefined();
    expect(screen.getByText(/Away \(2\.2s\)/)).toBeDefined();
  });

  it('triggers onOpenSettings when sensitivity shortcut is clicked', () => {
    const onOpenSettings = vi.fn();
    render(
      <FocusStage
        isMonitoring={false}
        formattedElapsedTime="00:00"
        faceDetected={false}
        isEyesClosed={false}
        isLongEyeClosure={false}
        eyeClosureDurationMs={0}
        isHeadTurned={false}
        isHeadTilted={false}
        isLookingAway={false}
        headPoseDurationMs={0}
        lookingAwayDurationMs={0}
        eventCounts={defaultCounts}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onOpenSettings={onOpenSettings}
      />
    );

    const settingsBtn = screen.getByRole('button', {
      name: /Adjust detection sensitivity/,
    });
    fireEvent.click(settingsBtn);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
