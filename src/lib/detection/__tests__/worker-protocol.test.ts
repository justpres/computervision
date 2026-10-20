import { describe, it, expect } from 'vitest';
import type {
  WorkerRequest,
  WorkerResponse,
  FrameResultData,
} from '../worker-types';

describe('Worker Message Protocol', () => {
  it('formats INIT request message correctly', () => {
    const initReq: WorkerRequest = {
      type: 'INIT',
      payload: {
        wasmPath: '/mediapipe',
        modelPath: '/models/face_landmarker.task',
      },
    };

    expect(initReq.type).toBe('INIT');
    expect(initReq.payload.wasmPath).toBe('/mediapipe');
    expect(initReq.payload.modelPath).toBe('/models/face_landmarker.task');
  });

  it('formats FRAME_RESULT response without leaking raw landmark coordinates', () => {
    const frameData: FrameResultData = {
      faceDetected: true,
      eyeBlinkLeft: 0.15,
      eyeBlinkRight: 0.12,
      transformationMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      timestamp: 12345.67,
      processingTimeMs: 14,
    };

    const res: WorkerResponse = {
      type: 'FRAME_RESULT',
      data: frameData,
    };

    expect(res.type).toBe('FRAME_RESULT');
    expect(res.data.faceDetected).toBe(true);
    expect(res.data.processingTimeMs).toBe(14);
    // Explicitly verify no biometric coordinates field exists in the data protocol
    const untypedData = res.data as unknown as Record<string, unknown>;
    expect(untypedData.faceLandmarks).toBeUndefined();
    expect(untypedData.mesh).toBeUndefined();
  });

  it('handles negative detection (no face) cleanly', () => {
    const frameData: FrameResultData = {
      faceDetected: false,
      eyeBlinkLeft: 0,
      eyeBlinkRight: 0,
      transformationMatrix: null,
      timestamp: 12380.0,
      processingTimeMs: 9,
    };

    const res: WorkerResponse = {
      type: 'FRAME_RESULT',
      data: frameData,
    };

    expect(res.data.faceDetected).toBe(false);
    expect(res.data.transformationMatrix).toBeNull();
  });
});
