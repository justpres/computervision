'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';
import { useSessionState } from '@/lib/session/use-session-state';
import { useCamera } from '@/lib/camera/use-camera';
import { useFaceDetection } from '@/lib/detection/use-face-detection';
import { useSupabaseAuth } from '@/lib/supabase/use-supabase-auth';
import { Button } from '@/components/ui/button';
import { ConsentModal } from '@/components/session/consent-modal';
import { CameraPreview } from '@/components/camera/camera-preview';
import { LiveStatusCard } from '@/components/session/live-status-card';
import { StudentLoginView } from '@/components/auth/student-login-view';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);
  const sessionConsentIsoRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.sessionStorage?.getItem('study_tracker_guest_mode');
      if (saved === 'true') {
        setIsGuestMode(true);
      }
      const consented = window.sessionStorage?.getItem('study_tracker_consented_at');
      if (consented) {
        sessionConsentIsoRef.current = consented;
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
   * Fast 1-click start: if consent is already recorded, starts session immediately.
   * If first time, prompts via ConsentModal.
   */
  const handleStartStudySession = useCallback(async () => {
    let consentedAt = sessionConsentIsoRef.current;
    if (!consentedAt && typeof window !== 'undefined') {
      consentedAt = window.sessionStorage?.getItem('study_tracker_consented_at') || null;
      if (consentedAt) {
        sessionConsentIsoRef.current = consentedAt;
      }
    }

    if (!consentedAt) {
      requestStart();
      return;
    }

    const mediaStream = await startCamera();
    if (mediaStream) {
      confirmConsent();
    }
  }, [confirmConsent, requestStart, startCamera]);

  /**
   * Called when user affirmatively gives consent in the ConsentModal.
   * Starts session timer and requests webcam hardware stream.
   */
  const handleConsentAgreed = useCallback(async () => {
    const nowIso = new Date().toISOString();
    sessionConsentIsoRef.current = nowIso;
    if (typeof window !== 'undefined') {
      window.sessionStorage?.setItem('study_tracker_consented_at', nowIso);
    }
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
            const nowIso = new Date().toISOString();
            sessionConsentIsoRef.current = nowIso;
            if (typeof window !== 'undefined') {
              window.sessionStorage?.setItem('study_tracker_consented_at', nowIso);
              window.sessionStorage?.setItem('study_tracker_guest_mode', 'true');
            }
            setIsGuestMode(true);
          }}
          isLoading={authStatus === 'loading'}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-on-surface">
      {/* Top Header / Navigation Bar (Clean & Minimal) */}
      <header className="border-b border-border bg-surface px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-h3 font-semibold text-on-surface truncate">
              Study Session Monitor
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
      <div className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        {/* Two-Column Responsive Layout: Focus card (8 cols) + camera preview (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Session Status & Controls */}
          <div className="lg:col-span-8 space-y-6">
            <LiveStatusCard
              isMonitoring={isMonitoring}
              isWorkerReady={isWorkerReady}
              faceDetected={faceDetected}
              elapsedTime={formattedElapsedTime}
              onStart={handleStartStudySession}
              onStop={handleStopSession}
            />
          </div>

          {/* Right Column: Live Camera Preview */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-body font-semibold text-on-surface">
                  Camera preview
                </h3>
                {isMonitoring ? (
                  <span className="inline-flex items-center gap-1.5 text-caption font-semibold text-danger">
                    <span className="w-2 h-2 rounded-full bg-danger" aria-hidden="true" />
                    <span>Monitoring</span>
                  </span>
                ) : (
                  <span className="text-caption font-medium text-on-surface-muted">
                    Off
                  </span>
                )}
              </div>

              {/* Mirrored Camera Preview with forwarded videoRef for worker capture */}
              <div className="overflow-hidden rounded-xl border border-border bg-background aspect-video">
                <CameraPreview
                  videoRef={videoRef}
                  stream={stream}
                  status={cameraStatus}
                  errorMessage={cameraErrorMessage}
                  onRetry={handleStartStudySession}
                />
              </div>
            </div>
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
