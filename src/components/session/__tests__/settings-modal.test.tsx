import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsModal } from '../settings-modal';
import { DEFAULT_SESSION_SETTINGS } from '@/lib/settings/settings-store';

describe('SettingsModal Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <SettingsModal
        isOpen={false}
        settings={DEFAULT_SESSION_SETTINGS}
        onUpdateSettings={vi.fn()}
        onResetSettings={vi.fn()}
        onClose={vi.fn()}
        isMonitoring={false}
        faceDetected={false}
        currentBlinkLevel={0}
        currentYawDegrees={null}
        currentPitchDegrees={null}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders sliders with current threshold values and live calibration status when open', () => {
    render(
      <SettingsModal
        isOpen={true}
        settings={DEFAULT_SESSION_SETTINGS}
        onUpdateSettings={vi.fn()}
        onResetSettings={vi.fn()}
        onClose={vi.fn()}
        isMonitoring={true}
        faceDetected={true}
        currentBlinkLevel={0.72}
        currentYawDegrees={34}
        currentPitchDegrees={6}
      />
    );

    expect(
      screen.getByText('Detection Settings & Calibration')
    ).toBeDefined();
    expect(screen.getByText('Eyes closed')).toBeDefined();
    expect(screen.getByText('Head turned')).toBeDefined();
    expect(screen.getByText('72%')).toBeDefined();
    expect(screen.getByLabelText('Live yaw angle 34 degrees')).toBeDefined();
    expect(
      screen.getByLabelText(
        /Experimental: Thresholds are developer starting defaults/
      )
    ).toBeDefined();
  });

  it('invokes onUpdateSettings when sliders are adjusted, onResetSettings on reset click, and closes on Escape', () => {
    const onUpdateSettings = vi.fn();
    const onResetSettings = vi.fn();
    const onClose = vi.fn();

    render(
      <SettingsModal
        isOpen={true}
        settings={DEFAULT_SESSION_SETTINGS}
        onUpdateSettings={onUpdateSettings}
        onResetSettings={onResetSettings}
        onClose={onClose}
        isMonitoring={false}
        faceDetected={false}
        currentBlinkLevel={0}
        currentYawDegrees={null}
        currentPitchDegrees={null}
      />
    );

    const eyeSlider = screen.getByLabelText('Eye closure threshold');
    fireEvent.change(eyeSlider, { target: { value: '0.5' } });
    expect(onUpdateSettings).toHaveBeenCalledWith({
      eyeClosedScoreThreshold: 0.5,
    });

    const yawSlider = screen.getByLabelText(
      'Head turn angle (left / right yaw)'
    );
    fireEvent.change(yawSlider, { target: { value: '35' } });
    expect(onUpdateSettings).toHaveBeenCalledWith({
      headTurnYawAngleDegrees: 35,
    });

    const resetBtn = screen.getByText('Reset to defaults');
    fireEvent.click(resetBtn);
    expect(onResetSettings).toHaveBeenCalledTimes(1);

    const doneBtn = screen.getByText('Done');
    fireEvent.click(doneBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
