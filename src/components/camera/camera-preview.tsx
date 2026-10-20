'use client';

import React, { useRef, useEffect } from 'react';
import { Camera, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
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
 * - Horizontally mirrored (scale-x-[-1]) for natural mirror behavior.
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
      {/* 1. Active State: Mirrored Video Feed */}
      {status === 'active' && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
            aria-label="Live webcam video preview (mirrored)"
          />

          {/* Active Overlay Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface/90 backdrop-blur-xs text-caption font-semibold text-primary border border-border/50 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Live preview
            </span>
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center pointer-events-none">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-surface/80 text-[11px] font-medium text-on-surface-muted">
              <CheckCircle2 className="w-3 h-3 text-success" />
              Processed locally
            </span>
          </div>
        </>
      )}

      {/* 2. Standby / Idle State */}
      {status === 'idle' && (
        <div className="p-6 space-y-3 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-on-surface-muted">
            <Camera className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="space-y-1 max-w-xs">
            <h3 className="text-label text-on-surface">Camera is off</h3>
            <p className="text-body-sm text-on-surface-muted">
              Preview will turn on here when your study session begins.
            </p>
          </div>
        </div>
      )}

      {/* 3. Requesting / Loading State */}
      {status === 'requesting' && (
        <div className="p-6 space-y-3 flex flex-col items-center animate-pulse">
          <div className="w-12 h-12 rounded-full bg-primary-container text-primary flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h3 className="text-label text-on-surface">Connecting to camera</h3>
            <p className="text-body-sm text-on-surface-muted">
              Please grant camera access when prompted by your browser.
            </p>
          </div>
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
