import { describe, it, expect } from 'vitest';
import {
  FACE_LANDMARKER_WASM_PATH,
  FACE_LANDMARKER_MODEL_PATH,
  FACE_LANDMARKER_RUN_OPTIONS,
  DETECTION_DEFAULTS,
} from '../config';

describe('Detection Configuration', () => {
  it('points to self-hosted WASM and model asset paths', () => {
    expect(FACE_LANDMARKER_WASM_PATH).toBe('/mediapipe');
    expect(FACE_LANDMARKER_MODEL_PATH).toBe('/models/face_landmarker.task');
  });

  it('enables blendshapes and facial transformation matrix for 1 face', () => {
    expect(FACE_LANDMARKER_RUN_OPTIONS.numFaces).toBe(1);
    expect(FACE_LANDMARKER_RUN_OPTIONS.outputFaceBlendshapes).toBe(true);
    expect(FACE_LANDMARKER_RUN_OPTIONS.outputFacialTransformationMatrixes).toBe(true);
    expect(FACE_LANDMARKER_RUN_OPTIONS.runningMode).toBe('VIDEO');
  });

  it('defines valid starting defaults', () => {
    expect(DETECTION_DEFAULTS.eyeClosedScoreThreshold).toBe(0.6);
    expect(DETECTION_DEFAULTS.eyeClosedDurationMs).toBe(1000);
    expect(DETECTION_DEFAULTS.longEyeClosureDurationMs).toBe(2000);
    expect(DETECTION_DEFAULTS.headTurnYawAngleDegrees).toBe(30);
    expect(DETECTION_DEFAULTS.lookingAwayDurationMs).toBe(3000);
    expect(DETECTION_DEFAULTS.eventMergeDebounceMs).toBe(2000);
    expect(DETECTION_DEFAULTS.breakReminderMinutes).toBe(45);
    expect(DETECTION_DEFAULTS.targetFps).toBeGreaterThanOrEqual(5);
    expect(DETECTION_DEFAULTS.targetFps).toBeLessThanOrEqual(10);
  });
});
