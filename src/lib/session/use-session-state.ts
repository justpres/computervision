'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type SessionStatus = 'idle' | 'consent_pending' | 'active' | 'stopped';

export interface UseSessionStateReturn {
  status: SessionStatus;
  consentedAt: string | null;
  elapsedSeconds: number;
  formattedElapsedTime: string;
  isMonitoring: boolean;
  requestStart: () => void;
  confirmConsent: () => void;
  declineConsent: () => void;
  stopSession: () => void;
  resetSession: () => void;
}

/**
 * Formats elapsed seconds into HH:MM:SS format using tabular numbers.
 */
export function formatElapsedTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Custom hook managing the study session lifecycle, consent barrier, and timer.
 * Enforces explicit consent before start and immediate stop without confirmation.
 */
export function useSessionState(): UseSessionStateReturn {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [consentedAt, setConsentedAt] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer lifecycle
  useEffect(() => {
    if (status === 'active') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);

  /**
   * Request to start a session.
   * If consent has not been provided yet, prompts for consent first.
   */
  const requestStart = useCallback(() => {
    if (status === 'active') return;

    if (!consentedAt) {
      setStatus('consent_pending');
    } else {
      setStatus('active');
    }
  }, [status, consentedAt]);

  /**
   * User affirmatively consents to monitoring.
   */
  const confirmConsent = useCallback(() => {
    const now = new Date().toISOString();
    setConsentedAt(now);
    setElapsedSeconds(0);
    setStatus('active');
  }, []);

  /**
   * User declines consent ("Not now").
   */
  const declineConsent = useCallback(() => {
    setStatus('idle');
  }, []);

  /**
   * Immediate stop control (no confirmation prompt, immediate stream release hook).
   */
  const stopSession = useCallback(() => {
    setStatus('stopped');
  }, []);

  /**
   * Resets session state to idle.
   */
  const resetSession = useCallback(() => {
    setStatus('idle');
    setConsentedAt(null);
    setElapsedSeconds(0);
  }, []);

  return {
    status,
    consentedAt,
    elapsedSeconds,
    formattedElapsedTime: formatElapsedTime(elapsedSeconds),
    isMonitoring: status === 'active',
    requestStart,
    confirmConsent,
    declineConsent,
    stopSession,
    resetSession,
  };
}
