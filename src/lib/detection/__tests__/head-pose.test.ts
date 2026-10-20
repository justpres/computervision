import { describe, it, expect } from 'vitest';
import {
  createInitialHeadPoseState,
  extractEulerAnglesFromMatrix,
  buildRotationMatrix4x4,
  buildColumnMajorTransformationMatrix4x4,
  evaluateHeadPose,
} from '../rules/head-pose';

describe('Head Direction Rule', () => {
  describe('extractEulerAnglesFromMatrix', () => {
    it('extracts 0° yaw, pitch, and roll from a 4x4 identity matrix', () => {
      const identity = buildRotationMatrix4x4(0, 0, 0);
      const angles = extractEulerAnglesFromMatrix(identity);

      expect(angles).toEqual({
        yawDegrees: 0,
        pitchDegrees: 0,
        rollDegrees: 0,
      });
    });

    it('accurately recovers positive and negative yaw, pitch, and roll angles', () => {
      const m1 = buildRotationMatrix4x4(35, 0, 0);
      expect(extractEulerAnglesFromMatrix(m1)).toEqual({
        yawDegrees: 35,
        pitchDegrees: 0,
        rollDegrees: 0,
      });

      const m2 = buildRotationMatrix4x4(-40, 28, -12);
      const extracted = extractEulerAnglesFromMatrix(m2);
      expect(extracted).not.toBeNull();
      expect(extracted!.yawDegrees).toBeCloseTo(-40, 1);
      expect(extracted!.pitchDegrees).toBeCloseTo(28, 1);
      expect(extracted!.rollDegrees).toBeCloseTo(-12, 1);
    });

    it('accurately recovers angles from MediaPipe column-major 4x4 transformation matrices under simultaneous pitch and roll', () => {
      const colMajor = buildColumnMajorTransformationMatrix4x4(0, 30, 20, [2.5, -1.2, -45]);
      const extracted = extractEulerAnglesFromMatrix(colMajor);
      expect(extracted).not.toBeNull();
      expect(extracted!.yawDegrees).toBeCloseTo(0, 1);
      expect(extracted!.pitchDegrees).toBeCloseTo(30, 1);
      expect(extracted!.rollDegrees).toBeCloseTo(20, 1);

      const colMajorCombined = buildColumnMajorTransformationMatrix4x4(32, -26, -15, [0, 0, -38]);
      const extractedCombined = extractEulerAnglesFromMatrix(colMajorCombined);
      expect(extractedCombined).not.toBeNull();
      expect(extractedCombined!.yawDegrees).toBeCloseTo(32, 1);
      expect(extractedCombined!.pitchDegrees).toBeCloseTo(-26, 1);
      expect(extractedCombined!.rollDegrees).toBeCloseTo(-15, 1);
    });

    it('clamps out-of-range R[2,0] values safely without returning NaN (gimbal lock resilience)', () => {
      const matrix = buildRotationMatrix4x4(0, 0, 0);
      matrix[8] = -1.00005; // Slight floating-point overshoot beyond -1
      const angles = extractEulerAnglesFromMatrix(matrix);

      expect(angles).not.toBeNull();
      expect(angles!.yawDegrees).toBe(90);
      expect(Number.isNaN(angles!.pitchDegrees)).toBe(false);
      expect(Number.isNaN(angles!.rollDegrees)).toBe(false);
    });

    it('returns null for null, short, or non-finite transformation matrices', () => {
      expect(extractEulerAnglesFromMatrix(null)).toBeNull();
      expect(extractEulerAnglesFromMatrix(undefined)).toBeNull();
      expect(extractEulerAnglesFromMatrix([1, 0, 0, 0])).toBeNull();

      const corrupted = buildRotationMatrix4x4(10, 10, 0);
      corrupted[8] = Number.NaN;
      expect(extractEulerAnglesFromMatrix(corrupted)).toBeNull();
    });
  });

  describe('evaluateHeadPose state machine', () => {
    it('reports centered state when yaw < 30° and pitch < 25°', () => {
      const state = createInitialHeadPoseState();
      const matrix = buildRotationMatrix4x4(18, -15, 5);

      const evaluation = evaluateHeadPose(state, {
        faceDetected: true,
        transformationMatrix: matrix,
        timestampMs: 1000,
      });

      expect(evaluation.angles?.yawDegrees).toBeCloseTo(18, 1);
      expect(evaluation.angles?.pitchDegrees).toBeCloseTo(-15, 1);
      expect(evaluation.state.isTurned).toBe(false);
      expect(evaluation.state.isTilted).toBe(false);
      expect(evaluation.state.isDeviated).toBe(false);
      expect(evaluation.completedEvent).toBeNull();
    });

    it('detects head turn when |yaw| >= 30° and emits head_turned event after continuous duration', () => {
      let state = createInitialHeadPoseState();
      const turnedRightMatrix = buildRotationMatrix4x4(34, 5, 0);

      // t = 1000ms: head turns right to 34°
      const f1 = evaluateHeadPose(state, {
        faceDetected: true,
        transformationMatrix: turnedRightMatrix,
        timestampMs: 1000,
      });
      state = f1.state;
      expect(state.isTurned).toBe(true);
      expect(state.isTilted).toBe(false);
      expect(state.isDeviated).toBe(true);
      expect(state.isEventActive).toBe(false);

      // t = 2100ms: held for 1100ms -> crosses 1000ms event threshold
      const f2 = evaluateHeadPose(state, {
        faceDetected: true,
        transformationMatrix: turnedRightMatrix,
        timestampMs: 2100,
      });
      state = f2.state;
      expect(state.isEventActive).toBe(true);
      expect(f2.justTriggered).toBe(true);

      // t = 2500ms: head returns to center (0° yaw) -> emits completedEvent
      const centeredMatrix = buildRotationMatrix4x4(0, 0, 0);
      const f3 = evaluateHeadPose(state, {
        faceDetected: true,
        transformationMatrix: centeredMatrix,
        timestampMs: 2500,
      });
      expect(f3.state.isTurned).toBe(false);
      expect(f3.state.isDeviated).toBe(false);
      expect(f3.completedEvent).toEqual({
        eventType: 'head_turned',
        startedAtMs: 1000,
        endedAtMs: 2500,
        durationMs: 1500,
      });
    });

    it('detects head tilt when |pitch| >= 25° even if yaw is centered', () => {
      const state = createInitialHeadPoseState();
      const tiltedDownMatrix = buildRotationMatrix4x4(5, -28, 0);

      const evaluation = evaluateHeadPose(state, {
        faceDetected: true,
        transformationMatrix: tiltedDownMatrix,
        timestampMs: 3000,
      });

      expect(evaluation.state.isTurned).toBe(false);
      expect(evaluation.state.isTilted).toBe(true);
      expect(evaluation.state.isDeviated).toBe(true);
    });

    it('respects custom yaw and pitch thresholds', () => {
      const state = createInitialHeadPoseState();
      const matrix = buildRotationMatrix4x4(22, 10, 0);

      const evalDefault = evaluateHeadPose(state, {
        faceDetected: true,
        transformationMatrix: matrix,
        timestampMs: 1000,
      });
      expect(evalDefault.state.isTurned).toBe(false);

      const evalCustom = evaluateHeadPose(state, {
        faceDetected: true,
        transformationMatrix: matrix,
        timestampMs: 1000,
        yawThresholdDegrees: 20,
      });
      expect(evalCustom.state.isTurned).toBe(true);
    });
  });
});
