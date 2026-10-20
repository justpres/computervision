import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionState, formatElapsedTime } from '../use-session-state';

describe('useSessionState Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes in idle state with no elapsed time', () => {
    const { result } = renderHook(() => useSessionState());

    expect(result.current.status).toBe('idle');
    expect(result.current.isMonitoring).toBe(false);
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.formattedElapsedTime).toBe('00:00');
    expect(result.current.consentedAt).toBeNull();
  });

  it('prompts for consent on first start request', () => {
    const { result } = renderHook(() => useSessionState());

    act(() => {
      result.current.requestStart();
    });

    expect(result.current.status).toBe('consent_pending');
    expect(result.current.isMonitoring).toBe(false);
  });

  it('returns to idle when consent is declined', () => {
    const { result } = renderHook(() => useSessionState());

    act(() => {
      result.current.requestStart();
    });
    expect(result.current.status).toBe('consent_pending');

    act(() => {
      result.current.declineConsent();
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.consentedAt).toBeNull();
  });

  it('activates session and runs timer when consent is confirmed', () => {
    const { result } = renderHook(() => useSessionState());

    act(() => {
      result.current.requestStart();
    });

    act(() => {
      result.current.confirmConsent();
    });

    expect(result.current.status).toBe('active');
    expect(result.current.isMonitoring).toBe(true);
    expect(result.current.consentedAt).not.toBeNull();

    // Advance time by 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.elapsedSeconds).toBe(3);
    expect(result.current.formattedElapsedTime).toBe('00:03');
  });

  it('stops immediately when stopSession is called', () => {
    const { result } = renderHook(() => useSessionState());

    act(() => {
      result.current.requestStart();
      result.current.confirmConsent();
    });
    expect(result.current.isMonitoring).toBe(true);

    act(() => {
      result.current.stopSession();
    });

    expect(result.current.status).toBe('stopped');
    expect(result.current.isMonitoring).toBe(false);

    // Ensure timer stops advancing
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it('formats elapsed time with hours correctly', () => {
    expect(formatElapsedTime(45)).toBe('00:45');
    expect(formatElapsedTime(65)).toBe('01:05');
    expect(formatElapsedTime(3665)).toBe('01:01:05');
  });
});
