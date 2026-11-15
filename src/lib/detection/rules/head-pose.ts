import { DETECTION_DEFAULTS } from '../config';

/**
 * Pure detection rule for head direction detection (turn and tilt).
 *
 * Extracts scalar Euler angles (yaw, pitch, roll in degrees) from the 4x4 facial
 * transformation matrix and immediately discards the matrix. No landmark coordinates
 * or biometric meshes are persisted.
 *
 * Uses neutral, observable physical descriptions ("head_turned") without judgmental labels.
 */

export interface HeadEulerAngles {
  /** Horizontal head turn (left/right rotation around Y-axis) in degrees */
  yawDegrees: number;
  /** Vertical head tilt (up/down rotation around X-axis) in degrees */
  pitchDegrees: number;
  /** Lateral head roll (ear-to-shoulder rotation around Z-axis) in degrees */
  rollDegrees: number;
}

export interface HeadPoseState {
  /** True when |yawDegrees| >= yawThresholdDegrees */
  isTurned: boolean;
  /** True when |pitchDegrees| >= pitchThresholdDegrees */
  isTilted: boolean;
  /** True when either isTurned or isTilted is active */
  isDeviated: boolean;
  /** Timestamp (ms) when continuous head turn/tilt began, or null when centered */
  deviatedSinceMs: number | null;
  /** Continuous duration (ms) of current head turn/tilt */
  continuousDurationMs: number;
  /** True once continuousDurationMs reaches or exceeds minEventDurationMs (default 1000ms) */
  isEventActive: boolean;
  /** Timestamp (ms) when continuous horizontal yaw turn began, or null when not turned horizontally */
  yawTurnStartTimeMs: number | null;
  /** Continuous duration (ms) of horizontal yaw turn */
  yawTurnDurationMs: number;
  /** True once continuous horizontal yaw turn reaches or exceeds lookingAwayDurationMs (default 3000ms) */
  isLookingAway: boolean;
}

export interface CompletedHeadPoseEvent {
  eventType: 'head_turned' | 'looking_away';
  startedAtMs: number;
  endedAtMs: number;
  durationMs: number;
}

export interface HeadPoseFrameInput {
  faceDetected: boolean;
  transformationMatrix: readonly number[] | null | undefined;
  timestampMs: number;
  yawThresholdDegrees?: number;
  pitchThresholdDegrees?: number;
  minEventDurationMs?: number;
  lookingAwayDurationMs?: number;
}

export interface HeadPoseEvaluation {
  /** Extracted Euler angles in degrees, or null when no valid face/matrix is present */
  angles: HeadEulerAngles | null;
  /** Next immutable head pose state */
  state: HeadPoseState;
  /** True on the exact frame where continuous head turn/tilt reaches minEventDurationMs */
  justTriggered: boolean;
  /** Populated when an active head_turned or looking_away event ends (head centers or face leaves view) */
  completedEvent: CompletedHeadPoseEvent | null;
}

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;
const GIMBAL_LOCK_EPSILON = 1e-6;

/**
 * Normalizes a rounded angle in degrees so -0 becomes 0.
 */
function roundAngleDegrees(radians: number): number {
  const degrees = radians * RAD_TO_DEG;
  const rounded = Math.round(degrees * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

/**
 * Creates a clean initial state for head pose tracking.
 */
export function createInitialHeadPoseState(): HeadPoseState {
  return {
    isTurned: false,
    isTilted: false,
    isDeviated: false,
    deviatedSinceMs: null,
    continuousDurationMs: 0,
    isEventActive: false,
    yawTurnStartTimeMs: null,
    yawTurnDurationMs: 0,
    isLookingAway: false,
  };
}

/**
 * Extracts Euler angles (yaw, pitch, roll in degrees) from a 4x4 homogeneous
 * transformation matrix R = Rz(roll) * Ry(yaw) * Rx(pitch).
 *
 * Supports both:
 * 1. MediaPipe FaceLandmarker column-major 4x4 matrices (`MatrixData` default layout),
 *    where translation (tx, ty, tz) is in indices [12, 13, 14] and the bottom homogeneous
 *    row [0, 0, 0, 1] is at indices [3, 7, 11, 15].
 * 2. Row-major 4x4 rotation/transformation matrices where the bottom homogeneous
 *    row [0, 0, 0, 1] is at indices [12, 13, 14, 15].
 *
 * Returns null if the matrix is missing, shorter than 16 elements, or contains non-finite numbers.
 */
export function extractEulerAnglesFromMatrix(
  matrix: readonly number[] | null | undefined
): HeadEulerAngles | null {
  if (!matrix || matrix.length < 16) {
    return null;
  }

  for (let i = 0; i < 16; i++) {
    if (!Number.isFinite(matrix[i])) {
      return null;
    }
  }

  // Detect column-major layout: MediaPipe's 4x4 pose_transform_matrix places 3D translation
  // (tx, ty, tz) in column 3 (indices 12, 13, 14) and [0, 0, 0] in row 3 (indices 3, 7, 11).
  const hasColMajorTranslation =
    Math.abs(matrix[12]) + Math.abs(matrix[13]) + Math.abs(matrix[14]) > 1e-6 &&
    Math.abs(matrix[3]) < 1e-5 &&
    Math.abs(matrix[7]) < 1e-5 &&
    Math.abs(matrix[11]) < 1e-5;

  const r00 = matrix[0];
  const r01 = hasColMajorTranslation ? matrix[4] : matrix[1];
  const r10 = hasColMajorTranslation ? matrix[1] : matrix[4];
  const r11 = matrix[5];
  const r20 = hasColMajorTranslation ? matrix[2] : matrix[8];
  const r21 = hasColMajorTranslation ? matrix[6] : matrix[9];
  const r22 = matrix[10];

  // Clamp -r20 to [-1, 1] to prevent Math.asin NaN on floating-point overshoot
  const clampedSinYaw = Math.min(1, Math.max(-1, -r20));
  const yawRad = Math.asin(clampedSinYaw);
  const cosYaw = Math.cos(yawRad);

  let pitchRad: number;
  let rollRad: number;

  if (Math.abs(cosYaw) > GIMBAL_LOCK_EPSILON) {
    pitchRad = Math.atan2(r21, r22);
    rollRad = Math.atan2(r10, r00);
  } else {
    // Gimbal lock fallback when |yaw| ≈ 90°
    pitchRad = Math.atan2(-r01, r11);
    rollRad = 0;
  }

  return {
    yawDegrees: roundAngleDegrees(yawRad),
    pitchDegrees: roundAngleDegrees(pitchRad),
    rollDegrees: roundAngleDegrees(rollRad),
  };
}

/**
 * Helper to construct a 4x4 row-major homogeneous rotation matrix R = Rz(roll) * Ry(yaw) * Rx(pitch)
 * from Euler angles in degrees. Useful for calibration and deterministic testing.
 */
export function buildRotationMatrix4x4(
  yawDegrees: number,
  pitchDegrees: number,
  rollDegrees: number = 0
): number[] {
  const y = yawDegrees * DEG_TO_RAD;
  const p = pitchDegrees * DEG_TO_RAD;
  const r = rollDegrees * DEG_TO_RAD;

  const cy = Math.cos(y);
  const sy = Math.sin(y);
  const cp = Math.cos(p);
  const sp = Math.sin(p);
  const cr = Math.cos(r);
  const sr = Math.sin(r);

  return [
    cr * cy,
    cr * sy * sp - sr * cp,
    cr * sy * cp + sr * sp,
    0,
    sr * cy,
    sr * sy * sp + cr * cp,
    sr * sy * cp - cr * sp,
    0,
    -sy,
    cy * sp,
    cy * cp,
    0,
    0,
    0,
    0,
    1,
  ];
}

/**
 * Helper to construct a 4x4 column-major homogeneous transformation matrix
 * matching MediaPipe FaceLandmarker's `facialTransformationMatrixes[0].data` layout
 * (with 3D translation in indices 12..14 and [0, 0, 0, 1] in indices 3, 7, 11, 15).
 */
export function buildColumnMajorTransformationMatrix4x4(
  yawDegrees: number,
  pitchDegrees: number,
  rollDegrees: number = 0,
  translation: readonly [number, number, number] = [0, 0, -40]
): number[] {
  const rowMajor = buildRotationMatrix4x4(yawDegrees, pitchDegrees, rollDegrees);
  return [
    rowMajor[0],
    rowMajor[4],
    rowMajor[8],
    0,
    rowMajor[1],
    rowMajor[5],
    rowMajor[9],
    0,
    rowMajor[2],
    rowMajor[6],
    rowMajor[10],
    0,
    translation[0],
    translation[1],
    translation[2],
    1,
  ];
}

/**
 * Evaluates a single frame for head direction (yaw turn and pitch tilt).
 */
export function evaluateHeadPose(
  prevState: HeadPoseState,
  input: HeadPoseFrameInput
): HeadPoseEvaluation {
  const rawYawThreshold =
    input.yawThresholdDegrees ?? DETECTION_DEFAULTS.headTurnYawAngleDegrees;
  const rawPitchThreshold =
    input.pitchThresholdDegrees ?? DETECTION_DEFAULTS.headTiltPitchAngleDegrees;
  const minEventDurationMs =
    input.minEventDurationMs ?? DETECTION_DEFAULTS.eyeClosedDurationMs;
  const rawLookingAwayMs =
    input.lookingAwayDurationMs ?? DETECTION_DEFAULTS.lookingAwayDurationMs;
  const lookingAwayDurationMs = Math.max(
    minEventDurationMs,
    Number.isFinite(rawLookingAwayMs)
      ? rawLookingAwayMs
      : DETECTION_DEFAULTS.lookingAwayDurationMs
  );

  const yawThreshold = Number.isFinite(rawYawThreshold)
    ? Math.min(60, Math.max(15, rawYawThreshold))
    : DETECTION_DEFAULTS.headTurnYawAngleDegrees;
  const pitchThreshold = Number.isFinite(rawPitchThreshold)
    ? Math.min(60, Math.max(15, rawPitchThreshold))
    : DETECTION_DEFAULTS.headTiltPitchAngleDegrees;

  const safeTimestampMs = Number.isFinite(input.timestampMs)
    ? input.timestampMs
    : (prevState.deviatedSinceMs ?? 0);

  const buildCompletedHeadEvent = (
    stateToFinalize: HeadPoseState,
    endTimestampMs: number
  ): CompletedHeadPoseEvent | null => {
    if (!stateToFinalize.isEventActive || stateToFinalize.deviatedSinceMs === null) {
      return null;
    }

    const yawDurationOnEnd =
      stateToFinalize.isTurned && stateToFinalize.yawTurnStartTimeMs !== null
        ? Math.max(
            stateToFinalize.yawTurnDurationMs,
            Math.round(
              Math.max(stateToFinalize.yawTurnStartTimeMs, endTimestampMs) -
                stateToFinalize.yawTurnStartTimeMs
            )
          )
        : stateToFinalize.yawTurnDurationMs;

    const isLookingAway =
      stateToFinalize.isLookingAway || yawDurationOnEnd >= lookingAwayDurationMs;

    const startedAtMs =
      isLookingAway && stateToFinalize.yawTurnStartTimeMs !== null
        ? stateToFinalize.yawTurnStartTimeMs
        : stateToFinalize.deviatedSinceMs;

    const endedAtMs = Math.max(startedAtMs, endTimestampMs);
    const durationMs = Math.max(
      isLookingAway ? yawDurationOnEnd : stateToFinalize.continuousDurationMs,
      Math.round(endedAtMs - startedAtMs)
    );

    return {
      eventType: isLookingAway ? 'looking_away' : 'head_turned',
      startedAtMs,
      endedAtMs,
      durationMs,
    };
  };

  const angles = input.faceDetected
    ? extractEulerAnglesFromMatrix(input.transformationMatrix)
    : null;

  if (!angles) {
    const completedEvent = buildCompletedHeadEvent(prevState, safeTimestampMs);

    return {
      angles: null,
      state: createInitialHeadPoseState(),
      justTriggered: false,
      completedEvent,
    };
  }

  const isTurned = Math.abs(angles.yawDegrees) >= yawThreshold;
  const isTilted = Math.abs(angles.pitchDegrees) >= pitchThreshold;
  const isDeviated = isTurned || isTilted;

  if (isDeviated) {
    // If the user was looking away (horizontal yaw turn >= lookingAwayDurationMs)
    // and now centered yaw while remaining tilted, finalize the looking_away event
    // and start a fresh tilt-only tracking window.
    let completedEvent: CompletedHeadPoseEvent | null = null;
    let basePrevState = prevState;

    if (prevState.isLookingAway && !isTurned) {
      completedEvent = buildCompletedHeadEvent(prevState, safeTimestampMs);
      basePrevState = createInitialHeadPoseState();
    }

    const deviatedSinceMs =
      basePrevState.isDeviated && basePrevState.deviatedSinceMs !== null
        ? basePrevState.deviatedSinceMs
        : safeTimestampMs;

    const continuousDurationMs = Math.max(
      0,
      Math.round(safeTimestampMs - deviatedSinceMs)
    );
    const isEventActive = continuousDurationMs >= minEventDurationMs;
    const justTriggered = isEventActive && !basePrevState.isEventActive;

    const yawTurnStartTimeMs = isTurned
      ? basePrevState.isTurned && basePrevState.yawTurnStartTimeMs !== null
        ? basePrevState.yawTurnStartTimeMs
        : safeTimestampMs
      : null;

    const yawTurnDurationMs =
      isTurned && yawTurnStartTimeMs !== null
        ? Math.max(0, Math.round(safeTimestampMs - yawTurnStartTimeMs))
        : 0;

    const isLookingAway =
      isTurned && yawTurnDurationMs >= lookingAwayDurationMs;

    return {
      angles,
      state: {
        isTurned,
        isTilted,
        isDeviated: true,
        deviatedSinceMs,
        continuousDurationMs,
        isEventActive,
        yawTurnStartTimeMs,
        yawTurnDurationMs,
        isLookingAway,
      },
      justTriggered,
      completedEvent,
    };
  }

  // Head returned to neutral center pose
  const completedEvent = buildCompletedHeadEvent(prevState, safeTimestampMs);

  return {
    angles,
    state: createInitialHeadPoseState(),
    justTriggered: false,
    completedEvent,
  };
}
