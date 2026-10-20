'use client';

import React, { useRef, useEffect } from 'react';
import { Camera, AlertCircle, RefreshCw } from 'lucide-react';
import { type CameraStatus } from '@/lib/camera/use-camera';
import { Button } from '@/components/ui/button';

export interface CameraPreviewProps {
  stream: MediaStream | null;
  status: CameraStatus;
  errorMessage: string | null;
  onRetry?: () => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  className?: string;
}

/**
 * Camera preview component:
 * - Pure mirrored video feed during active session (zero text overlays on video).
 * - Restrained size (aspect-video) and never recorded.
 * - Calm caution notice (amber #6B4500 on #FFF1CF) on errors; never red alarms.
 * - Displays empty, loading, active, and error states.
 */
export const CameraPreview: React.FC<CameraPreviewProps> = ({
  stream,
  status,
  errorMessage,
  onRetry,
  videoRef: externalVideoRef,
  className,
}) => {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef ?? internalVideoRef;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream && status === 'active') {
      video.srcObject = stream;
      const playPromise = video.play();
      if (playPromise !== undefined && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Autoplay may be deferred until user interaction in some browser policies
        });
      }
    } else {
      video.srcObject = null;
    }
  }, [stream, status, videoRef]);

  const isError =
    status === 'denied' ||
    status === 'not_found' ||
    status === 'busy' ||
    status === 'error';

  return (
    <div
      className={`relative w-full aspect-video rounded-lg overflow-hidden border border-border bg-on-surface/5 flex flex-col items-center justify-center text-center ${
        className ?? ''
      }`}
      aria-label="Webcam camera preview"
    >
      {/* 1. Active State: Pure Mirrored Video Feed */}
      {status === 'active' && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
          aria-label="Live webcam video preview (mirrored)"
        />
      )}

      {/* 2. Standby / Idle State */}
      {status === 'idle' && (
        <div className="p-6 flex flex-col items-center justify-center text-on-surface-muted space-y-2">
          <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-on-surface-muted">
            <Camera className="w-6 h-6" aria-hidden="true" />
          </div>
          <span className="text-caption text-on-surface-muted">
            Camera is off
          </span>
        </div>
      )}

      {/* 3. Requesting / Loading State */}
      {status === 'requesting' && (
        <div className="p-6 space-y-2 flex flex-col items-center">
          <RefreshCw className="w-6 h-6 text-primary animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <p className="text-caption text-on-surface-muted">
            Connecting to camera...
          </p>
        </div>
      )}

      {/* 4. Calm Caution Notice State */}
      {isError && (
        <div
          role="alert"
          className="m-4 p-5 rounded-md bg-caution-container text-caution border border-caution/20 space-y-3 text-left max-w-md"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-caution" aria-hidden="true" />
            <div className="space-y-1">
              <h3 className="text-label font-semibold text-caution">
                {status === 'denied' && 'Camera Permission Blocked'}
                {status === 'not_found' && 'Camera Not Found'}
                {status === 'busy' && 'Camera Already in Use'}
                {status === 'error' && 'Camera Unavailable'}
              </h3>
              <p className="text-body-sm text-caution leading-relaxed">
                {errorMessage}
              </p>
            </div>
          </div>

          {onRetry && (
            <div className="pt-1 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={onRetry}
                className="gap-1.5 text-body-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                Try again
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
