'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  WorkerRequest,
  WorkerResponse,
} from './worker-types';
import {
  FACE_LANDMARKER_WASM_PATH,
  FACE_LANDMARKER_MODEL_PATH,
  DETECTION_DEFAULTS,
} from './config';

export interface UseFaceDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isMonitoring: boolean;
  targetFps?: number;
}

export interface UseFaceDetectionReturn {
  isWorkerReady: boolean;
  faceDetected: boolean;
  eyeBlinkScore: number;
  processingTimeMs: number;
  transformationMatrix: number[] | null;
  error: string | null;
}

/**
 * Hook that captures frames from a <video> element and streams them
 * to the background Web Worker via zero-copy ImageBitmap transfer.
 * Keeps detection at 8-10 fps without ever slowing the 60fps main UI thread.
 */
export function useFaceDetection({
  videoRef,
  isMonitoring,
  targetFps = DETECTION_DEFAULTS.targetFps,
}: UseFaceDetectionOptions): UseFaceDetectionReturn {
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [eyeBlinkScore, setEyeBlinkScore] = useState(0);
  const [processingTimeMs, setProcessingTimeMs] = useState(0);
  const [transformationMatrix, setTransformationMatrix] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const isWorkerBusyRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Web Worker
  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return;
    }

    try {
      const worker = new Worker(
        new URL('../../workers/detection.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const response = e.data;

        if (response.type === 'INIT_SUCCESS') {
          setIsWorkerReady(true);
          setError(null);
        } else if (response.type === 'INIT_ERROR') {
          setIsWorkerReady(false);
          setError(response.error);
        } else if (response.type === 'FRAME_RESULT') {
          isWorkerBusyRef.current = false;
          const { data } = response;
          setFaceDetected(data.faceDetected);
          setProcessingTimeMs(data.processingTimeMs);
          setTransformationMatrix(data.transformationMatrix);

          if (data.faceDetected) {
            const avgBlink =
              Math.round(((data.eyeBlinkLeft + data.eyeBlinkRight) / 2) * 1000) / 1000;
            setEyeBlinkScore(avgBlink);
          } else {
            setEyeBlinkScore(0);
          }
        } else if (response.type === 'FRAME_ERROR') {
          isWorkerBusyRef.current = false;
        }
      };

      // Send INIT request with self-hosted paths
      const initMessage: WorkerRequest = {
        type: 'INIT',
        payload: {
          wasmPath: FACE_LANDMARKER_WASM_PATH,
          modelPath: FACE_LANDMARKER_MODEL_PATH,
        },
      };
      worker.postMessage(initMessage);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not create Web Worker';
      setError(msg);
    }

    return () => {
      if (workerRef.current) {
        const term: WorkerRequest = { type: 'TERMINATE' };
        workerRef.current.postMessage(term);
        workerRef.current.terminate();
        workerRef.current = null;
      }
      setIsWorkerReady(false);
    };
  }, []);

  // Frame capture loop
  const processNextFrame = useCallback(async () => {
    if (
      !isWorkerReady ||
      !workerRef.current ||
      isWorkerBusyRef.current ||
      !videoRef.current
    ) {
      return;
    }

    const video = videoRef.current;
    if (
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return;
    }

    try {
      isWorkerBusyRef.current = true;
      const timestamp = performance.now();
      const bitmap = await createImageBitmap(video);

      const msg: WorkerRequest = {
        type: 'PROCESS_FRAME',
        bitmap,
        timestamp,
      };

      // Transfer ImageBitmap zero-copy to Web Worker
      workerRef.current.postMessage(msg, [bitmap]);
    } catch {
      isWorkerBusyRef.current = false;
    }
  }, [isWorkerReady, videoRef]);

  // Loop timer active only during active monitoring
  useEffect(() => {
    if (!isMonitoring || !isWorkerReady) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setFaceDetected(false);
      setEyeBlinkScore(0);
      setProcessingTimeMs(0);
      return;
    }

    const intervalMs = Math.round(1000 / targetFps);
    timerRef.current = setInterval(processNextFrame, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isMonitoring, isWorkerReady, targetFps, processNextFrame]);

  return {
    isWorkerReady,
    faceDetected,
    eyeBlinkScore,
    processingTimeMs,
    transformationMatrix,
    error,
  };
}
