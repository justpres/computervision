'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';
import { useSessionState } from '@/lib/session/use-session-state';
import { useCamera } from '@/lib/camera/use-camera';
import { useFaceDetection } from '@/lib/detection/use-face-detection';
import { useDetectionSettings } from '@/lib/settings/settings-store';
import { useSupabaseAuth } from '@/lib/supabase/use-supabase-auth';
import {
  createInitialSessionEventEngineState,
  processSessionFrame,
  finalizeSessionEvents,
  type SessionEventEngineState,
} from '@/lib/detection/session-event-engine';
import { Button } from '@/components/ui/button';
import { ConsentModal } from '@/components/session/consent-modal';
import { CameraPreview } from '@/components/camera/camera-preview';
import { FocusStage } from '@/components/session/focus-stage';
import { EventFeed } from '@/components/session/event-feed';
import { SettingsModal } from '@/components/session/settings-modal';
import { StudentLoginView } from '@/components/auth/student-login-view';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

  const { settings, updateSettings, resetSettings } = useDetectionSettings();

  const {
    status: authStatus,
    email: authEmail,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  } = useSupabaseAuth();

  // Background Web Worker face detection pipeline (zero main-thread slowdown)
  const {
    isWorkerReady,
    faceDetected,
    eyeBlinkScore,
    eyeBlinkLeft,
    eyeBlinkRight,
    transformationMatrix,
    lastFrameTimestamp,
  } = useFaceDetection({
    videoRef,
    isMonitoring,
  });

  // Session event accumulator state (Feature F-09, F-10)
  const [engineState, setEngineState] = useState<SessionEventEngineState>(() =>
    createInitialSessionEventEngineState()
  );

  const engineStateRef = useRef<SessionEventEngineState>(engineState);
  useEffect(() => {
    engineStateRef.current = engineState;
  }, [engineState]);

  const lastProcessedTimestampRef = useRef<number>(0);

  // Process each worker detection result frame through the accumulator engine
  useEffect(() => {
    if (!isMonitoring || !isWorkerReady) return;
    if (lastFrameTimestamp <= lastProcessedTimestampRef.current) return;
    lastProcessedTimestampRef.current = lastFrameTimestamp;

    const next = processSessionFrame(
      engineStateRef.current,
      {
        timestampMs: lastFrameTimestamp,
        faceDetected,
        eyeBlinkLeft,
        eyeBlinkRight,
        transformationMatrix,
        thresholds: settings,
      }
    );

    setEngineState(next);
  }, [
    isMonitoring,
    isWorkerReady,
    lastFrameTimestamp,
    faceDetected,
    eyeBlinkLeft,
    eyeBlinkRight,
    transformationMatrix,
    settings,
  ]);

  const eventCounts = useMemo(() => ({
    eyesClosed: engineState.events.filter((e) => e.eventType === 'eyes_closed').length,
    longEyeClosure: 0,
    headTurned: engineState.events.filter((e) => e.eventType === 'head_turned').length,
    lookingAway: 0,
    total: engineState.events.length,
  }), [engineState.events]);

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
      setEngineState(createInitialSessionEventEngineState());
      lastProcessedTimestampRef.current = 0;
    }
  }, [confirmConsent, requestStart, startCamera]);

  /**
   * Called when user affirmatively gives consent in the ConsentModal.
   */
  const handleConsentAgreed = useCallback(async () => {
    const nowIso = new Date().toISOString();
    sessionConsentIsoRef.current = nowIso;
    if (typeof window !== 'undefined') {
      window.sessionStorage?.setItem('study_tracker_consented_at', nowIso);
    }
    confirmConsent();
    setEngineState(createInitialSessionEventEngineState());
    lastProcessedTimestampRef.current = 0;
    await startCamera();
  }, [confirmConsent, startCamera]);

  /**
   * Called when user stops monitoring.
   * Releases camera hardware tracks immediately and stops timer.
   */
  const handleStopSession = useCallback(() => {
    const finalized = finalizeSessionEvents(
      engineStateRef.current,
      performance.now(),
      new Date().toISOString()
    );
    engineStateRef.current = finalized;
    lastProcessedTimestampRef.current = 0;
    setEngineState(finalized);
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
            <span
              tabIndex={0}
              title="Experimental: Phase 1 features are functional baselines and are not yet validated for accuracy."
              aria-label="Experimental: Phase 1 features are functional baselines and are not yet validated for accuracy."
              className="hidden sm:inline-flex rounded-full bg-experimental-container px-2.5 py-0.5 text-caption font-semibold text-experimental focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Experimental
            </span>
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

      {/* Main Workspace (Focus Room) */}
      <div className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Primary Column: Focus Stage (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            <FocusStage
              isMonitoring={isMonitoring}
              formattedElapsedTime={formattedElapsedTime}
              faceDetected={faceDetected}
              isEyesClosed={engineState.eyeClosure.isClosed}
              isLongEyeClosure={false}
              eyeClosureDurationMs={engineState.eyeClosure.continuousDurationMs}
              isHeadTurned={engineState.headPose.isTurned}
              isHeadTilted={engineState.headPose.isTilted}
              isLookingAway={false}
              headPoseDurationMs={engineState.headPose.continuousDurationMs}
              lookingAwayDurationMs={3000}
              eventCounts={eventCounts}
              onStart={handleStartStudySession}
              onStop={handleStopSession}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />

            {/* Event Feed Component */}
            <EventFeed events={engineState.events} />
          </div>

          {/* Right Peripheral Column: Camera Preview (4 cols) */}
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

              <div className="overflow-hidden rounded-xl border border-border bg-background aspect-video">
                <CameraPreview
                  stream={stream}
                  status={cameraStatus}
                  videoRef={videoRef}
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

      {/* Adjustable Detection Settings & Live Calibration Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onUpdateSettings={updateSettings}
        onResetSettings={resetSettings}
        onClose={() => setIsSettingsOpen(false)}
        isMonitoring={isMonitoring}
        faceDetected={faceDetected}
        currentBlinkLevel={eyeBlinkScore}
        currentYawDegrees={engineState.headAngles?.yawDegrees ?? null}
        currentPitchDegrees={engineState.headAngles?.pitchDegrees ?? null}
      />
    </main>
  );
}
