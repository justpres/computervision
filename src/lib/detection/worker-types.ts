/**
 * Worker communication protocol types.
 * Ensures zero-biometric data persistence.
 * Only face presence, blendshapes, and transformation matrices are transferred.
 */

export interface WorkerInitPayload {
  wasmPath: string;
  modelPath: string;
}

export type WorkerRequest =
  | { type: 'INIT'; payload: WorkerInitPayload }
  | { type: 'PROCESS_FRAME'; bitmap: ImageBitmap; timestamp: number }
  | { type: 'TERMINATE' };

export interface FrameResultData {
  faceDetected: boolean;
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  transformationMatrix: number[] | null;
  timestamp: number;
  processingTimeMs: number;
}

export type WorkerResponse =
  | { type: 'INIT_SUCCESS' }
  | { type: 'INIT_ERROR'; error: string }
  | { type: 'FRAME_RESULT'; data: FrameResultData }
  | { type: 'FRAME_ERROR'; error: string };
