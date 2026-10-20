'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'denied'
  | 'not_found'
  | 'busy'
  | 'error';

export interface UseCameraReturn {
  status: CameraStatus;
  stream: MediaStream | null;
  errorMessage: string | null;
  startCamera: () => Promise<MediaStream | null>;
  stopCamera: () => void;
  isActive: boolean;
}

/**
 * Standard camera constraints.
 * Strict privacy: audio is explicitly set to false (no microphone).
 * Resolution is modest (640x480) to keep background Web Worker inference light.
 */
export const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 15, max: 30 },
    facingMode: 'user',
  },
  audio: false,
};

/**
 * Hook to manage the webcam MediaStream lifecycle:
 * - Triggers only on affirmative user action.
 * - Releases all MediaStreamTracks immediately on stop or window unload.
 * - Maps browser errors to calm status states.
 */
export function useCamera(): UseCameraReturn {
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /**
   * Immediately stops all tracks on the active stream and clears references.
   * Ensures physical webcam LED hardware light turns off promptly.
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore already stopped tracks
        }
      });
      streamRef.current = null;
    }

    setStream(null);
    setStatus('idle');
    setErrorMessage(null);
  }, []);

  /**
   * Requests camera access via navigator.mediaDevices.getUserMedia.
   */
  const startCamera = useCallback(async (): Promise<MediaStream | null> => {
    // If already active, return the existing stream
    if (streamRef.current && status === 'active') {
      return streamRef.current;
    }

    // Stop any dangling stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      setStatus('error');
      setErrorMessage(
        'Camera API is not supported in this browser environment. Please use Google Chrome on a laptop.'
      );
      return null;
    }

    setStatus('requesting');
    setErrorMessage(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(
        CAMERA_CONSTRAINTS
      );

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setStatus('active');
      return mediaStream;
    } catch (err: unknown) {
      const error = err as Error;
      let mappedStatus: CameraStatus = 'error';
      let message = 'An unexpected camera error occurred.';

      if (
        error.name === 'NotAllowedError' ||
        error.name === 'PermissionDeniedError'
      ) {
        mappedStatus = 'denied';
        message =
          'Camera access was denied. Please click the camera or lock icon in your browser address bar to allow camera access.';
      } else if (
        error.name === 'NotFoundError' ||
        error.name === 'DevicesNotFoundError'
      ) {
        mappedStatus = 'not_found';
        message =
          'No camera was found. Please ensure your laptop webcam is connected and enabled.';
      } else if (
        error.name === 'NotReadableError' ||
        error.name === 'TrackStartError'
      ) {
        mappedStatus = 'busy';
        message =
          'Camera is currently in use by another application (e.g. Zoom or Teams). Please close other camera apps and try again.';
      } else if (error.name === 'OverconstrainedError') {
        mappedStatus = 'error';
        message = 'Camera does not meet requested resolution requirements.';
      }

      setStatus(mappedStatus);
      setErrorMessage(message);
      return null;
    }
  }, [status]);

  // Release camera on page unload or browser tab navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    status,
    stream,
    errorMessage,
    startCamera,
    stopCamera,
    isActive: status === 'active',
  };
}
