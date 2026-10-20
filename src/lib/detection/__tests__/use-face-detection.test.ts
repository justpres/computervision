import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFaceDetection } from '../use-face-detection';
import type { WorkerResponse } from '../worker-types';

describe('useFaceDetection Hook', () => {
  let mockWorker: {
    postMessage: ReturnType<typeof vi.fn>;
    terminate: ReturnType<typeof vi.fn>;
    onmessage: ((e: MessageEvent<WorkerResponse>) => void) | null;
  };

  beforeEach(() => {
    mockWorker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null,
    };

    // Mock global Worker
    vi.stubGlobal(
      'Worker',
      vi.fn().mockImplementation(() => mockWorker)
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('instantiates Worker and sends INIT message on mount', () => {
    const videoRef = { current: null };
    renderHook(() =>
      useFaceDetection({ videoRef, isMonitoring: false })
    );

    expect(global.Worker).toHaveBeenCalledTimes(1);
    expect(mockWorker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'INIT' })
    );
  });

  it('updates isWorkerReady when worker responds with INIT_SUCCESS', () => {
    const videoRef = { current: null };
    const { result } = renderHook(() =>
      useFaceDetection({ videoRef, isMonitoring: false })
    );

    expect(result.current.isWorkerReady).toBe(false);

    act(() => {
      mockWorker.onmessage?.({
        data: { type: 'INIT_SUCCESS' },
      } as MessageEvent<WorkerResponse>);
    });

    expect(result.current.isWorkerReady).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('updates detection signals on FRAME_RESULT', () => {
    const videoRef = { current: null };
    const { result } = renderHook(() =>
      useFaceDetection({ videoRef, isMonitoring: true })
    );

    act(() => {
      mockWorker.onmessage?.({
        data: { type: 'INIT_SUCCESS' },
      } as MessageEvent<WorkerResponse>);
    });

    act(() => {
      mockWorker.onmessage?.({
        data: {
          type: 'FRAME_RESULT',
          data: {
            faceDetected: true,
            eyeBlinkLeft: 0.2,
            eyeBlinkRight: 0.4,
            transformationMatrix: [1, 0, 0, 0],
            timestamp: 1000,
            processingTimeMs: 15,
          },
        },
      } as MessageEvent<WorkerResponse>);
    });

    expect(result.current.faceDetected).toBe(true);
    expect(result.current.eyeBlinkScore).toBeCloseTo(0.3, 2);
    expect(result.current.processingTimeMs).toBe(15);
  });

  it('terminates worker on unmount', () => {
    const videoRef = { current: null };
    const { unmount } = renderHook(() =>
      useFaceDetection({ videoRef, isMonitoring: true })
    );

    unmount();
    expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: 'TERMINATE' });
    expect(mockWorker.terminate).toHaveBeenCalledTimes(1);
  });
});
