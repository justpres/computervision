'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSessionState } from '@/lib/session/use-session-state';
import { useCamera } from '@/lib/camera/use-camera';
import { useFaceDetection } from '@/lib/detection/use-face-detection';
import { useDetectionSettings } from '@/lib/settings/settings-store';
import { useSupabaseAuth } from '@/lib/supabase/use-supabase-auth';
import {
  saveCompletedSession,
  loadSavedSessions,
  deleteSavedSession,
  type SavedSessionSummary,
} from '@/lib/session/session-storage';
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
import { SessionHistoryPanel } from '@/components/session/session-history-panel';
import { SessionSummaryView } from '@/components/analytics/session-summary-view';
import { BreakReminder } from '@/components/session/break-reminder';
import { StudentLoginView } from '@/components/auth/student-login-view';
import { cn } from '@/lib/utils';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeTab, setActiveTab] = useState<'focus' | 'analytics' | 'history'>('focus');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBreakReminderOpen, setIsBreakReminderOpen] = useState(false);
  const [savedSessions, setSavedSessions] = useState<SavedSessionSummary[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedSummarySessionId, setSelectedSummarySessionId] = useState<
    string | null
  >(null);
  const [lastDeletedSessionId, setLastDeletedSessionId] = useState<
    string | null
  >(null);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);

  const sessionStartIsoRef = useRef<string | null>(null);
  const sessionConsentIsoRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.sessionStorage?.getItem('study_tracker_guest_mode');
      if (saved === 'true') {
        setIsGuestMode(true);
      }
      const savedConsent = window.sessionStorage?.getItem('study_tracker_consented_at');
      if (savedConsent) {
        sessionConsentIsoRef.current = savedConsent;
      }
    }
  }, []);

  const {
    status: sessionStatus,
    isMonitoring,
    elapsedSeconds,
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
    userId: authUserId,
    email: authEmail,
    signInWithEmail,
    signUpWithEmail,
    resetPasswordForEmail,
    signOut,
  } = useSupabaseAuth();

  // Load saved sessions on mount and when auth user changes (Strict Tenant Isolation)
  useEffect(() => {
    if (authStatus === 'loading') {
      return;
    }
    let isMounted = true;
    async function refreshSavedSessions() {
      setIsLoadingHistory(true);
      // Immediately clear current list and selection so previous user's sessions don't linger
      setSavedSessions([]);
      setSelectedSummarySessionId(null);
      const { sessions } = await loadSavedSessions({}, authUserId);
      if (isMounted) {
        setSavedSessions(sessions);
        setIsLoadingHistory(false);
      }
    }
    void refreshSavedSessions();
    return () => {
      isMounted = false;
    };
  }, [authStatus, authUserId, authEmail]);

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

  // Session event accumulator state (Feature F-09, F-10, F-11, F-12, F-13)
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

  // Break Reminder triggered after extended continuous study (Feature F-18)
  useEffect(() => {
    if (!isMonitoring) return;
    const triggerSeconds = (settings.breakReminderMinutes || 45) * 60;
    if (elapsedSeconds > 0 && elapsedSeconds % triggerSeconds === 0) {
      setIsBreakReminderOpen(true);
    }
  }, [isMonitoring, elapsedSeconds, settings.breakReminderMinutes]);

  /**
   * Called when user affirmatively gives consent in the ConsentModal.
   * Records consent timestamp, saves to session storage for 1-click starts, and requests webcam.
   */
  const handleConsentAgreed = useCallback(async () => {
    const nowIso = new Date().toISOString();
    sessionConsentIsoRef.current = nowIso;
    sessionStartIsoRef.current = nowIso;
    if (typeof window !== 'undefined') {
      window.sessionStorage?.setItem('study_tracker_consented_at', nowIso);
    }

    confirmConsent();
    setEngineState(createInitialSessionEventEngineState());
    lastProcessedTimestampRef.current = 0;
    await startCamera();
  }, [confirmConsent, startCamera]);

  /**
   * Fast 1-Click Start:
   * If the student already consented at login/entry, start camera and session immediately.
   * Otherwise, open ConsentModal once to record affirmative agreement.
   */
  const handleStartStudySession = useCallback(async () => {
    if (!sessionConsentIsoRef.current) {
      requestStart();
      return;
    }

    const nowIso = new Date().toISOString();
    sessionStartIsoRef.current = nowIso;
    confirmConsent();
    setEngineState(createInitialSessionEventEngineState());
    lastProcessedTimestampRef.current = 0;
    await startCamera();
  }, [confirmConsent, requestStart, startCamera]);

  /**
   * Called when user stops monitoring.
   * Finalizes any active event, releases camera hardware tracks immediately, stops timer,
   * persists the completed session, and resets the live event engine.
   */
  const handleStopSession = useCallback(async () => {
    const endedAtIso = new Date().toISOString();
    const startedAtIso = sessionStartIsoRef.current ?? endedAtIso;
    const consentedAtIso = sessionConsentIsoRef.current ?? startedAtIso;

    const finalized = finalizeSessionEvents(
      engineStateRef.current,
      performance.now(),
      endedAtIso
    );

    // Reset live engine state so live feed resets upon session completion
    const initialEngineState = createInitialSessionEventEngineState();
    engineStateRef.current = initialEngineState;
    lastProcessedTimestampRef.current = 0;
    setEngineState(initialEngineState);

    stopCamera();
    stopSession();

    const saveResult = await saveCompletedSession(
      {
        startedAt: startedAtIso,
        endedAt: endedAtIso,
        consentedAt: consentedAtIso,
        settings,
        events: finalized.events,
      },
      {},
      authUserId
    );

    if (saveResult.success && saveResult.session) {
      const saved = saveResult.session;
      setSavedSessions((prev) => [
        saved,
        ...prev.filter((s) => s.id !== saved.id),
      ]);
      setSelectedSummarySessionId(saved.id);
    }
  }, [authUserId, settings, stopCamera, stopSession]);

  /**
   * Deletes a saved session and its associated events from both Supabase and browser storage.
   */
  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      const res = await deleteSavedSession(sessionId, {}, authUserId);
      if (res.success) {
        setSavedSessions((prev) => prev.filter((s) => s.id !== sessionId));
        setSelectedSummarySessionId((prev) => (prev === sessionId ? null : prev));
        setLastDeletedSessionId(sessionId);
      }
    },
    [authUserId]
  );

  const handleSignOut = useCallback(async () => {
    if (isMonitoring) {
      await handleStopSession();
    }
    // CRITICAL: Immediately clear in-memory sessions so nothing leaks to the next user!
    setSavedSessions([]);
    setSelectedSummarySessionId(null);
    if (authEmail) {
      await signOut();
    }
    setIsGuestMode(false);
    if (typeof window !== 'undefined') {
      window.sessionStorage?.removeItem('study_tracker_guest_mode');
      window.sessionStorage?.removeItem('study_tracker_consented_at');
    }
  }, [authEmail, isMonitoring, handleStopSession, signOut]);

  if (!authEmail && !isGuestMode) {
    return (
      <main className="min-h-dvh bg-background text-on-surface">
        <StudentLoginView
          onSignIn={signInWithEmail}
          onSignUp={signUpWithEmail}
          onForgotPassword={resetPasswordForEmail}
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
              COGNIFOCUS
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Student Account & Sign Out */}
            <span className="hidden md:inline font-mono text-caption text-on-surface-muted truncate max-w-[200px]">
              {authEmail || 'Guest'}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void handleSignOut()}
              className="min-h-[44px] px-3.5 rounded-md shadow-none text-caption font-medium"
            >
              <span>Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Sub-Header Navigation Tabs: Zero decorative icons, sharp bottom border indicator */}
      <div className="border-b border-border bg-surface">
        <div
          role="tablist"
          aria-label="Study session sections"
          className="mx-auto flex max-w-[1120px] items-center gap-1 px-4 sm:px-6"
        >
          <button
            type="button"
            id="tab-focus"
            role="tab"
            aria-selected={activeTab === 'focus'}
            aria-controls="tabpanel-focus"
            onClick={() => setActiveTab('focus')}
            className={cn(
              'inline-flex items-center gap-2 min-h-[44px] px-4 py-3 text-label font-semibold border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              activeTab === 'focus'
                ? 'border-primary text-on-surface'
                : 'border-transparent text-on-surface-muted hover:text-on-surface hover:border-border'
            )}
          >
            <span>Monitoring Room</span>
          </button>

          <button
            type="button"
            id="tab-analytics"
            role="tab"
            aria-selected={activeTab === 'analytics'}
            aria-controls="tabpanel-analytics"
            onClick={() => setActiveTab('analytics')}
            className={cn(
              'inline-flex items-center gap-2 min-h-[44px] px-4 py-3 text-label font-semibold border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              activeTab === 'analytics'
                ? 'border-primary text-on-surface'
                : 'border-transparent text-on-surface-muted hover:text-on-surface hover:border-border'
            )}
          >
            <span>Summary & Timeline</span>
          </button>

          <button
            type="button"
            id="tab-history"
            role="tab"
            aria-selected={activeTab === 'history'}
            aria-controls="tabpanel-history"
            onClick={() => setActiveTab('history')}
            className={cn(
              'inline-flex items-center gap-2 min-h-[44px] px-4 py-3 text-label font-semibold border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              activeTab === 'history'
                ? 'border-primary text-on-surface'
                : 'border-transparent text-on-surface-muted hover:text-on-surface hover:border-border'
            )}
          >
            <span>Session History</span>
            <span className="ml-1 rounded-sm border border-border-strong/50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-on-surface-muted tabular-nums">
              {savedSessions.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Single Centered Column (max 1120px) */}
      <div className="mx-auto max-w-[1120px] p-4 sm:p-6 space-y-6">
        {/* Tab 1: Monitoring Room */}
        <div
          role="tabpanel"
          id="tabpanel-focus"
          aria-labelledby="tab-focus"
          className={activeTab === 'focus' ? 'block calm-fade-in' : 'hidden'}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left/Center Column (7 cols): The Hero Focus Stage */}
            <div className="lg:col-span-7 space-y-4">
              <FocusStage
                isMonitoring={isMonitoring}
                formattedElapsedTime={formattedElapsedTime}
                faceDetected={faceDetected}
                isEyesClosed={engineState.eyeClosure.isClosed}
                isLongEyeClosure={engineState.eyeClosure.isLongClosure}
                eyeClosureDurationMs={engineState.eyeClosure.continuousDurationMs}
                isHeadTurned={engineState.headPose.isTurned}
                isHeadTilted={engineState.headPose.isTilted}
                isLookingAway={engineState.headPose.isLookingAway}
                headPoseDurationMs={engineState.headPose.continuousDurationMs}
                lookingAwayDurationMs={engineState.headPose.yawTurnDurationMs}
                eventCounts={engineState.counts}
                onStart={() => void handleStartStudySession()}
                onStop={() => void handleStopSession()}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            </div>

            {/* Right Column (5 cols): Compact Peripheral Camera with 6px Semantic Status Dot */}
            <div className="lg:col-span-5 space-y-5">
              <div className="rounded-md border border-border bg-surface shadow-none divide-y divide-border">
                <div className="flex items-center justify-between px-4 py-3">
                  <h3 className="text-body-sm font-semibold tracking-tight text-on-surface">
                    Camera preview
                  </h3>
                  {isMonitoring ? (
                    <span className="inline-flex items-center gap-2 text-caption font-medium text-on-surface select-none">
                      <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" aria-hidden="true" />
                      <span>On · Stays in browser</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-caption font-medium text-on-surface-muted select-none">
                      <span className="h-1.5 w-1.5 rounded-full bg-on-surface-muted/60 shrink-0" aria-hidden="true" />
                      <span>Camera off</span>
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <CameraPreview
                    videoRef={videoRef}
                    stream={stream}
                    status={cameraStatus}
                    errorMessage={cameraErrorMessage}
                    onRetry={startCamera}
                  />
                </div>
              </div>

              {/* Active Session Event Feed */}
              {isMonitoring && (
                <EventFeed events={engineState.events} />
              )}
            </div>
          </div>
        </div>

        {/* Tab 2: Analytics & Timeline View (M3 Feature F-16 & F-17) */}
        {activeTab === 'analytics' && (
          <div
            role="tabpanel"
            id="tabpanel-analytics"
            aria-labelledby="tab-analytics"
            className="block calm-fade-in"
          >
            <SessionSummaryView
              isMonitoring={isMonitoring}
              currentSessionEvents={engineState.events}
              currentSessionDurationSeconds={elapsedSeconds}
              sessionStartIso={sessionStartIsoRef.current}
              savedSessions={savedSessions}
              isLoadingHistory={isLoadingHistory}
              selectedSessionId={selectedSummarySessionId}
              onSelectSession={setSelectedSummarySessionId}
            />
          </div>
        )}

        {/* Tab 3: Session History View (M2 Feature F-14 & F-15) */}
        {activeTab === 'history' && (
          <div
            role="tabpanel"
            id="tabpanel-history"
            aria-labelledby="tab-history"
            className="block calm-fade-in"
          >
            <SessionHistoryPanel
              sessions={savedSessions}
              isLoading={isLoadingHistory}
              onDeleteSession={handleDeleteSession}
              onInspectSession={(sessionId) => {
                setSelectedSummarySessionId(sessionId);
                setActiveTab('analytics');
              }}
              lastDeletedSessionId={lastDeletedSessionId}
            />
          </div>
        )}
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

      {/* Gentle Break Reminder Modal Dialog (Feature F-18) */}
      <BreakReminder
        isOpen={isBreakReminderOpen}
        studyDurationMinutes={settings.breakReminderMinutes || 45}
        onDismiss={() => setIsBreakReminderOpen(false)}
        onTakeBreak={() => setIsBreakReminderOpen(false)}
      />
    </main>
  );
}
