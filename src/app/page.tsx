'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Sliders, User } from 'lucide-react';
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
import { MonitoringIndicator } from '@/components/session/monitoring-indicator';
import { SessionControls } from '@/components/session/session-controls';
import { ConsentModal } from '@/components/session/consent-modal';
import { CameraPreview } from '@/components/camera/camera-preview';
import { LiveStatusCard } from '@/components/session/live-status-card';
import { EventFeed } from '@/components/session/event-feed';
import { SettingsModal } from '@/components/session/settings-modal';
import { StudentLoginView } from '@/components/auth/student-login-view';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

  const { settings, updateSettings, resetSettings } = useDetectionSettings();

  // Background Web Worker face detection pipeline (zero main-thread slowdown)
  const {
    isWorkerReady,
    faceDetected,
    eyeBlinkScore,
    eyeBlinkLeft,
    eyeBlinkRight,
    transformationMatrix,
    lastFrameTimestamp,
    processingTimeMs,
  } = useFaceDetection({
    videoRef,
    isMonitoring,
  });

  const engineStateRef = useRef<SessionEventEngineState>(
    createInitialSessionEventEngineState()
  );
  const lastProcessedTimestampRef = useRef<number>(0);
  const [engineState, setEngineState] = useState<SessionEventEngineState>(
    createInitialSessionEventEngineState
  );

  useEffect(() => {
    if (!isMonitoring) {
      return;
    }

    if (
      lastFrameTimestamp === 0 ||
      lastFrameTimestamp === lastProcessedTimestampRef.current
    ) {
      return;
    }

    lastProcessedTimestampRef.current = lastFrameTimestamp;

    const nextState = processSessionFrame(engineStateRef.current, {
      faceDetected,
      eyeBlinkLeft,
      eyeBlinkRight,
      transformationMatrix,
      timestampMs: lastFrameTimestamp,
      thresholds: {
        eyeClosedScoreThreshold: settings.eyeClosedScoreThreshold,
        eyeClosedDurationMs: settings.eyeClosedDurationMs,
        headTurnYawAngleDegrees: settings.headTurnYawAngleDegrees,
        headTiltPitchAngleDegrees: settings.headTiltPitchAngleDegrees,
      },
    });
    engineStateRef.current = nextState;
    setEngineState(nextState);
  }, [
    isMonitoring,
    faceDetected,
    eyeBlinkLeft,
    eyeBlinkRight,
    transformationMatrix,
    lastFrameTimestamp,
    settings,
  ]);

  /**
   * Called when user affirmatively gives consent in the ConsentModal.
   * Resets session event accumulator, starts session timer, and requests webcam stream.
   */
  const handleConsentAgreed = useCallback(async () => {
    const freshEngine = createInitialSessionEventEngineState();
    engineStateRef.current = freshEngine;
    lastProcessedTimestampRef.current = 0;
    setEngineState(freshEngine);
    confirmConsent();
    await startCamera();
  }, [confirmConsent, startCamera]);

  /**
   * Called when user stops monitoring.
   * Finalizes any active event, releases camera hardware tracks immediately, and stops timer.
   */
  const handleStopSession = useCallback(() => {
    const finalized = finalizeSessionEvents(
      engineStateRef.current,
      performance.now()
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
            <span
              tabIndex={0}
              title="Experimental: Phase 1 features are functional baselines and are not yet validated for accuracy."
              aria-label="Phase 1 Experimental: functional baseline features not yet validated for accuracy"
              className="hidden sm:inline-flex rounded-full bg-experimental-container px-2.5 py-0.5 text-caption font-semibold text-experimental focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
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
          {/* Left Column: Live Camera Preview & Observed Events */}
          <div className="lg:col-span-6 space-y-5">
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

            {/* Observable Session Events Feed */}
            <EventFeed events={engineState.events} />
          </div>

          {/* Right Column: Live Status & Controls */}
          <div className="lg:col-span-6 space-y-5">
            {/* Real-time Detection Status Card */}
            <LiveStatusCard
              isMonitoring={isMonitoring}
              isWorkerReady={isWorkerReady}
              faceDetected={faceDetected}
              processingTimeMs={processingTimeMs}
              isEyesClosed={engineState.eyeClosure.isClosed}
              eyeClosureDurationMs={engineState.eyeClosure.continuousDurationMs}
              eyeBlinkScore={eyeBlinkScore}
              isHeadTurned={engineState.headPose.isTurned}
              isHeadTilted={engineState.headPose.isTilted}
              headPoseDurationMs={engineState.headPose.continuousDurationMs}
              headYawDegrees={engineState.headAngles?.yawDegrees ?? null}
              headPitchDegrees={engineState.headAngles?.pitchDegrees ?? null}
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

              {/* Secondary Settings Action (Visual Hierarchy #5: quiet, reachable, never competing) */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="text-caption text-on-surface-muted tabular-nums">
                  Thresholds: Eyes {(settings.eyeClosedScoreThreshold * 100).toFixed(0)}% (
                  {(settings.eyeClosedDurationMs / 1000).toFixed(1)}s) · Yaw{' '}
                  {settings.headTurnYawAngleDegrees}° · Pitch{' '}
                  {settings.headTiltPitchAngleDegrees}°
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsSettingsOpen(true)}
                  className="gap-2"
                >
                  <Sliders className="w-4 h-4" aria-hidden="true" />
                  Detection settings
                </Button>
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
