'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { User } from 'lucide-react';
import { useSessionState } from '@/lib/session/use-session-state';
import { useCamera } from '@/lib/camera/use-camera';
import { useFaceDetection } from '@/lib/detection/use-face-detection';
import { useSupabaseAuth } from '@/lib/supabase/use-supabase-auth';
import { MonitoringIndicator } from '@/components/session/monitoring-indicator';
import { SessionControls } from '@/components/session/session-controls';
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
  const {
    isWorkerReady,
    faceDetected,
    processingTimeMs,
  } = useFaceDetection({
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
      <main className="min-h-screen bg-background text-on-surface">
        {/* Top Header */}
        <header className="border-b border-border bg-surface px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-h3 font-semibold text-on-surface">
                Study Session Monitor
              </h1>
              <span className="hidden sm:inline-flex rounded-full bg-experimental-container px-2.5 py-0.5 text-caption font-semibold text-experimental">
                Phase 1 Experimental
              </span>
            </div>
          </div>
        </header>

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
          <div className="flex items-center gap-3">
            <h1 className="text-h3 font-semibold text-on-surface">
              Study Session Monitor
            </h1>
            <span className="hidden sm:inline-flex rounded-full bg-experimental-container px-2.5 py-0.5 text-caption font-semibold text-experimental">
              Phase 1 Experimental
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Student Account / Guest Pill & Sign Out */}
            <div className="flex items-center gap-2 text-caption text-on-surface-muted bg-background border border-border px-2.5 py-1 rounded-md">
              <User className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              <span className="font-medium text-on-surface">
                {authEmail || 'Guest Student'}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="ml-1 text-caption text-on-surface-muted hover:text-primary transition-colors underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                Sign out
              </button>
            </div>

            {/* Persistent Monitoring Indicator */}
            <MonitoringIndicator
              isMonitoring={isMonitoring}
              elapsedTime={formattedElapsedTime}
            />
          </div>
        </div>
      </header>

      {/* Main Single Centered Column (max 1120px) */}
      <div className="mx-auto max-w-[1120px] p-4 sm:p-6 space-y-6">
        {/* Two-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Live Camera Preview */}
          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-lg border border-border bg-surface p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-h3 text-on-surface">Webcam Feed</h2>
                <span className="text-caption text-on-surface-muted">
                  {cameraStatus === 'active' ? 'Camera active' : 'Offline'}
                </span>
              </div>

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

          {/* Right Column: Live Status & Controls */}
          <div className="lg:col-span-6 space-y-5">
            {/* Real-time Detection Status Card */}
            <LiveStatusCard
              isMonitoring={isMonitoring}
              isWorkerReady={isWorkerReady}
              faceDetected={faceDetected}
              processingTimeMs={processingTimeMs}
            />

            {/* Session Control Card */}
            <section
              aria-labelledby="session-overview-heading"
              className="rounded-lg border border-border bg-surface p-6 sm:p-7 space-y-6 shadow-none"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <h2
                    id="session-overview-heading"
                    className="text-h2 font-semibold text-on-surface"
                  >
                    {isMonitoring ? 'Active Session' : 'Ready to Start'}
                  </h2>
                  <p className="text-body-sm text-on-surface-muted">
                    {isMonitoring
                      ? 'Camera stream active. Observable signs monitored locally.'
                      : 'Click start to begin private webcam study monitoring.'}
                  </p>
                </div>

                {/* Primary Action Button (Start / Stop) */}
                <SessionControls
                  isMonitoring={isMonitoring}
                  onStart={requestStart}
                  onStop={handleStopSession}
                />
              </div>

              {/* Status Box */}
              <div className="rounded-md border border-border bg-background p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-label text-on-surface-muted">Session Status</span>
                  <span className="text-body-sm font-semibold text-on-surface">
                    {isMonitoring ? 'Active' : 'Standby'}
                  </span>
                </div>

                {isMonitoring ? (
                  <div className="text-body-md text-on-surface space-y-1 pt-1">
                    <p>
                      Elapsed duration:{' '}
                      <span className="font-semibold tabular-nums text-primary">
                        {formattedElapsedTime}
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="text-body-sm text-on-surface-muted">
                    Your camera will only turn on after you review and accept the privacy consent.
                  </p>
                )}
              </div>
            </section>
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
