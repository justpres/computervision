'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';
import { useSessionState } from '@/lib/session/use-session-state';
import { useCamera } from '@/lib/camera/use-camera';
import { useFaceDetection } from '@/lib/detection/use-face-detection';
import { useSupabaseAuth } from '@/lib/supabase/use-supabase-auth';
import { Button } from '@/components/ui/button';
import { MonitoringIndicator } from '@/components/session/monitoring-indicator';
import { ConsentModal } from '@/components/session/consent-modal';
import { CameraPreview } from '@/components/camera/camera-preview';
import { LiveStatusCard } from '@/components/session/live-status-card';
import { StudentLoginView } from '@/components/auth/student-login-view';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.sessionStorage?.getItem('study_tracker_guest_mode');
      if (saved === 'true') {
        setIsGuestMode(true);
      }
    }
  }, []);

  const {
    status: authStatus,
    email: authEmail,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  } = useSupabaseAuth();

  const {
    status: sessionStatus,
    isMonitoring,
    formattedElapsedTime,
    requestStart,
    confirmConsent,
    declineConsent,
    stopSession,
  } = useSessionState();

  const {
    status: cameraStatus,
    stream,
    errorMessage: cameraErrorMessage,
    startCamera,
    stopCamera,
  } = useCamera();

  // Background Web Worker face detection pipeline (zero main-thread slowdown)
  const { isWorkerReady, faceDetected } = useFaceDetection({
    videoRef,
    isMonitoring,
  });

  /**
   * Called when user affirmatively gives consent in the ConsentModal.
   * Starts session timer and requests webcam hardware stream.
   */
  const handleConsentAgreed = useCallback(async () => {
    confirmConsent();
    await startCamera();
  }, [confirmConsent, startCamera]);

  /**
   * Called when user stops monitoring.
   * Immediately releases camera hardware tracks and stops session timer.
   */
  const handleStopSession = useCallback(() => {
    stopCamera();
    stopSession();
  }, [stopCamera, stopSession]);

  const handleSignOut = useCallback(async () => {
    if (isMonitoring) {
      handleStopSession();
    }
    if (authEmail) {
      await signOut();
    }
    setIsGuestMode(false);
    if (typeof window !== 'undefined') {
      window.sessionStorage?.removeItem('study_tracker_guest_mode');
    }
  }, [authEmail, isMonitoring, handleStopSession, signOut]);

  if (!authEmail && !isGuestMode) {
    return (
      <main className="min-h-dvh bg-background text-on-surface">
        <StudentLoginView
          onSignIn={signInWithEmail}
          onSignUp={signUpWithEmail}
          onContinueAsGuest={() => {
            setIsGuestMode(true);
            if (typeof window !== 'undefined') {
              window.sessionStorage?.setItem('study_tracker_guest_mode', 'true');
            }
          }}
          isLoading={authStatus === 'loading'}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-on-surface">
      {/* Top Header / Navigation Bar */}
      <header className="border-b border-border bg-surface px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-h3 font-semibold text-on-surface truncate">
              Study Session Monitor
            </h1>
            <span
              tabIndex={0}
              title="Experimental: these features work, but they have not been tested for accuracy yet."
              aria-label="Experimental: these features work, but they have not been tested for accuracy yet."
              className="hidden sm:inline-flex rounded-full bg-experimental-container px-2.5 py-0.5 text-caption font-semibold text-experimental focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Experimental
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Persistent Monitoring Indicator */}
            <MonitoringIndicator
              isMonitoring={isMonitoring}
              elapsedTime={formattedElapsedTime}
            />

            {/* Student Account & Sign Out */}
            <span className="hidden md:inline text-body-sm text-on-surface-muted truncate max-w-[200px]">
              {authEmail || 'Guest'}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void handleSignOut()}
              className="gap-1.5 h-9"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Single Centered Column (max 1120px) */}
      <div className="mx-auto max-w-[1120px] p-4 sm:p-6 space-y-6">
        {/* Two-Column Responsive Layout: camera (smaller) + session card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Live Camera Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
              <h2 className="text-h3 text-on-surface">Your camera</h2>

              {/* Mirrored Camera Preview with forwarded videoRef for worker capture */}
              <CameraPreview
                videoRef={videoRef}
                stream={stream}
                status={cameraStatus}
                errorMessage={cameraErrorMessage}
                onRetry={startCamera}
              />
            </div>
          </div>

          {/* Right Column: Session Status & Controls */}
          <div className="lg:col-span-7 space-y-5">
            <LiveStatusCard
              isMonitoring={isMonitoring}
              isWorkerReady={isWorkerReady}
              faceDetected={faceDetected}
              onStart={requestStart}
              onStop={handleStopSession}
            />
          </div>
        </div>
      </div>

      {/* Consent Modal Dialog */}
      <ConsentModal
        isOpen={sessionStatus === 'consent_pending'}
        onAgree={handleConsentAgreed}
        onDecline={declineConsent}
      />
    </main>
  );
}
