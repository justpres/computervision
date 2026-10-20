import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCamera, CAMERA_CONSTRAINTS } from '../use-camera';

describe('useCamera Hook', () => {
  let mockTrack: { stop: ReturnType<typeof vi.fn> };
  let mockStream: { getTracks: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockTrack = { stop: vi.fn() };
    mockStream = { getTracks: vi.fn(() => [mockTrack]) };

    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes in idle status without stream', () => {
    const { result } = renderHook(() => useCamera());

    expect(result.current.status).toBe('idle');
    expect(result.current.stream).toBeNull();
    expect(result.current.isActive).toBe(false);
  });

  it('acquires webcam stream with strict audio:false constraint', async () => {
    const { result } = renderHook(() => useCamera());

    let returnedStream: MediaStream | null = null;
    await act(async () => {
      returnedStream = await result.current.startCamera();
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
      CAMERA_CONSTRAINTS
    );
    expect(CAMERA_CONSTRAINTS.audio).toBe(false);
    expect(result.current.status).toBe('active');
    expect(result.current.isActive).toBe(true);
    expect(returnedStream).toBe(mockStream);
  });

  it('stops all tracks and releases stream on stopCamera', async () => {
    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });
    expect(result.current.status).toBe('active');

    act(() => {
      result.current.stopCamera();
    });

    expect(mockTrack.stop).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('idle');
    expect(result.current.stream).toBeNull();
    expect(result.current.isActive).toBe(false);
  });

  it('maps NotAllowedError to denied status with calm message', async () => {
    const permissionError = new Error('Permission denied');
    permissionError.name = 'NotAllowedError';
    vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue(
      permissionError
    );

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.status).toBe('denied');
    expect(result.current.stream).toBeNull();
    expect(result.current.errorMessage).toContain('Camera access was denied');
  });

  it('maps NotFoundError to not_found status with hardware guidance', async () => {
    const notFoundError = new Error('Requested device not found');
    notFoundError.name = 'NotFoundError';
    vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue(
      notFoundError
    );

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.status).toBe('not_found');
    expect(result.current.errorMessage).toContain('No camera was found');
  });

  it('maps NotReadableError to busy status suggesting closing other camera apps', async () => {
    const busyError = new Error('Device in use');
    busyError.name = 'NotReadableError';
    vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue(busyError);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.status).toBe('busy');
    expect(result.current.errorMessage).toContain('Zoom or Teams');
  });
});
