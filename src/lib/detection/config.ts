/**
 * Detection configuration and defaults.
 *
 * MediaPipe Tasks Vision Face Landmarker is executed in the browser Web Worker
 * using self-hosted WASM binaries and model files (zero external network reliance).
 */

export const FACE_LANDMARKER_WASM_PATH = '/mediapipe';
export const FACE_LANDMARKER_MODEL_PATH = '/models/face_landmarker.task';

/**
 * Pinned options for the MediaPipe Face Landmarker.
 * Blendshapes provide eye blink scores; the facial transformation matrix provides head pose (yaw, pitch, roll).
 */
export const FACE_LANDMARKER_BASE_OPTIONS = {
  modelAssetPath: FACE_LANDMARKER_MODEL_PATH,
  delegate: 'GPU' as const, // falls back gracefully to CPU in unsupported environments
};

export const FACE_LANDMARKER_RUN_OPTIONS = {
  runningMode: 'VIDEO' as const,
  numFaces: 1,
  outputFaceBlendshapes: true,
  outputFacialTransformationMatrixes: true,
};

/**
 * Starting defaults for detection settings.
 * All thresholds are adjustable and safe-bounded.
 */
export const DETECTION_DEFAULTS = {
  /** Eye closed when average of left and right blink blendshape scores >= this value (0.0 to 1.0) */
  eyeClosedScoreThreshold: 0.6,

  /** Eyes-closed event created after continuous closure for this duration (milliseconds) */
  eyeClosedDurationMs: 1000,

  /** Long eye closure (drowsiness sign) counted after continuous closure for this duration (milliseconds) */
  longEyeClosureDurationMs: 2000,

  /** Head turned when absolute yaw angle exceeds this threshold (degrees) */
  headTurnYawAngleDegrees: 30,

  /** Looking-away event created when head turned exceeds yaw threshold for this duration (milliseconds) */
  lookingAwayDurationMs: 3000,

  /** Merge consecutive events of the same type occurring within this debounce window (milliseconds) */
  eventMergeDebounceMs: 2000,

  /** Target detection processing rate in frames per second (keeps detection light) */
  targetFps: 8,

  /** Break reminder notice after continuous elapsed session time (minutes) */
  breakReminderMinutes: 45,
} as const;

export type DetectionDefaults = typeof DETECTION_DEFAULTS;
