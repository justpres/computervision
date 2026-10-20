import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CameraPreview } from '../camera-preview';

describe('CameraPreview Component', () => {
  it('renders standby state when camera is idle', () => {
    render(
      <CameraPreview
        stream={null}
        status="idle"
        errorMessage={null}
      />
    );

    expect(screen.getByText('Camera is off')).toBeDefined();
  });

  it('renders loading state when camera is requesting permission', () => {
    render(
      <CameraPreview
        stream={null}
        status="requesting"
        errorMessage={null}
      />
    );

    expect(screen.getByText('Connecting to camera...')).toBeDefined();
  });

  it('renders clean video element with mirrored scale-x-[-1] styling and zero text overlays when active', () => {
    const mockStream = {} as MediaStream;

    render(
      <CameraPreview
        stream={mockStream}
        status="active"
        errorMessage={null}
      />
    );

    const video = screen.getByLabelText('Live webcam video preview (mirrored)');
    expect(video).toBeDefined();
    expect(video.className).toContain('scale-x-[-1]');
    expect(screen.queryByText('Live preview')).toBeNull();
    expect(screen.queryByText('Processed locally')).toBeNull();
  });

  it('renders calm caution card and retry action when permission is denied', () => {
    const onRetry = vi.fn();

    render(
      <CameraPreview
        stream={null}
        status="denied"
        errorMessage="Camera access was denied by browser settings."
        onRetry={onRetry}
      />
    );

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Camera Permission Blocked')).toBeDefined();
    expect(
      screen.getByText('Camera access was denied by browser settings.')
    ).toBeDefined();

    const retryBtn = screen.getByRole('button', { name: /Try again/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
