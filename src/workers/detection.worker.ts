/// <reference lib="webworker" />

import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';
import type {
  WorkerRequest,
  WorkerResponse,
  FrameResultData,
} from '@/lib/detection/worker-types';
import {
  createInitialSmoothingState,
  applyBlinkSmoothing,
  resetSmoothingState,
  type SmoothingState,
} from '@/lib/detection/smoothing';

let faceLandmarker: FaceLandmarker | null = null;
let isInitializing = false;
let smoothingState: SmoothingState = createInitialSmoothingState();

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const message = e.data;

  switch (message.type) {
    case 'INIT': {
      if (faceLandmarker || isInitializing) return;
      isInitializing = true;

      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          message.payload.wasmPath
        );

        faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: message.payload.modelPath,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.65,
        });

        isInitializing = false;
        const res: WorkerResponse = { type: 'INIT_SUCCESS' };
        self.postMessage(res);
      } catch (err: unknown) {
        isInitializing = false;
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to initialize Face Landmarker';
        const res: WorkerResponse = {
          type: 'INIT_ERROR',
          error: errorMsg,
        };
        self.postMessage(res);
      }
      break;
    }

    case 'PROCESS_FRAME': {
      const { bitmap, timestamp } = message;

      if (!faceLandmarker) {
        bitmap.close();
        const res: WorkerResponse = {
          type: 'FRAME_ERROR',
          error: 'Face Landmarker is not initialized',
        };
        self.postMessage(res);
        return;
      }

      const startTime = performance.now();

      try {
        const results = faceLandmarker.detectForVideo(bitmap, timestamp);

        // Immediate memory release of image buffer
        bitmap.close();

        const faceDetected = results.faceLandmarks.length > 0;
        let eyeBlinkLeft = 0;
        let eyeBlinkRight = 0;
        let transformationMatrix: number[] | null = null;

        if (faceDetected) {
          let rawBlinkLeft = 0;
          let rawBlinkRight = 0;

          if (results.faceBlendshapes && results.faceBlendshapes[0]) {
            for (const category of results.faceBlendshapes[0].categories) {
              if (category.categoryName === 'eyeBlinkLeft') {
                rawBlinkLeft = category.score;
              } else if (category.categoryName === 'eyeBlinkRight') {
                rawBlinkRight = category.score;
              }
            }
          }

          const smoothed = applyBlinkSmoothing(smoothingState, rawBlinkLeft, rawBlinkRight);
          smoothingState = smoothed.state;
          eyeBlinkLeft = smoothed.left;
          eyeBlinkRight = smoothed.right;

          if (
            results.facialTransformationMatrixes &&
            results.facialTransformationMatrixes[0]
          ) {
            transformationMatrix = Array.from(
              results.facialTransformationMatrixes[0].data
            );
          }
        } else {
          smoothingState = resetSmoothingState();
        }

        // Biometric coordinates (faceLandmarks) are discarded immediately
        const processingTimeMs = Math.round(performance.now() - startTime);

        const frameData: FrameResultData = {
          faceDetected,
          eyeBlinkLeft,
          eyeBlinkRight,
          transformationMatrix,
          timestamp,
          processingTimeMs,
        };

        const res: WorkerResponse = {
          type: 'FRAME_RESULT',
          data: frameData,
        };
        self.postMessage(res);
      } catch (err: unknown) {
        bitmap.close();
        const errorMsg =
          err instanceof Error ? err.message : 'Error processing video frame';
        const res: WorkerResponse = {
          type: 'FRAME_ERROR',
          error: errorMsg,
        };
        self.postMessage(res);
      }
      break;
    }

    case 'TERMINATE': {
      smoothingState = resetSmoothingState();
      if (faceLandmarker) {
        try {
          faceLandmarker.close();
        } catch {
          // ignore cleanup errors
        }
        faceLandmarker = null;
      }
      break;
    }
  }
};
