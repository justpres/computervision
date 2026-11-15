import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SAVED_SESSIONS_STORAGE_KEY,
  saveCompletedSession,
  loadSavedSessions,
  deleteSavedSession,
  readLocalSavedSessions,
} from '../session-storage';
import { DEFAULT_SESSION_SETTINGS } from '@/lib/settings/settings-store';
import {
  SaveSessionPayloadSchema,
  DeleteSessionPayloadSchema,
} from '@/lib/validation/session';
import type { SessionDetectionEvent } from '@/lib/detection/session-event-engine';

describe('Session Storage & Validation Service', () => {
  const sampleEvents: SessionDetectionEvent[] = [
    {
      id: 'evt-1',
      eventType: 'eyes_closed',
      startedAtMs: 1000,
      endedAtMs: 2400,
      durationMs: 1400,
      startedAtIso: '2026-11-16T09:00:05.000Z',
    },
    {
      id: 'evt-2',
      eventType: 'long_eye_closure',
      startedAtMs: 5000,
      endedAtMs: 7500,
      durationMs: 2500,
      startedAtIso: '2026-11-16T09:00:10.000Z',
    },
    {
      id: 'evt-3',
      eventType: 'head_turned',
      startedAtMs: 10000,
      endedAtMs: 11800,
      durationMs: 1800,
      startedAtIso: '2026-11-16T09:00:20.000Z',
    },
    {
      id: 'evt-4',
      eventType: 'looking_away',
      startedAtMs: 15000,
      endedAtMs: 18500,
      durationMs: 3500,
      startedAtIso: '2026-11-16T09:00:30.000Z',
    },
  ];

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('strictly validates SaveSessionPayloadSchema and rejects unexpected biometric fields', () => {
    const valid = SaveSessionPayloadSchema.safeParse({
      id: '11111111-2222-4333-8444-555555555555',
      started_at: '2026-11-16T09:00:00.000Z',
      ended_at: '2026-11-16T09:10:00.000Z',
      consented_at: '2026-11-16T08:59:58.000Z',
      settings: DEFAULT_SESSION_SETTINGS,
      events: [
        {
          event_type: 'looking_away',
          started_at: '2026-11-16T09:02:00.000Z',
          duration_ms: 3200,
        },
      ],
    });
    expect(valid.success).toBe(true);

    const rejectedWithLandmarks = SaveSessionPayloadSchema.safeParse({
      id: '11111111-2222-4333-8444-555555555555',
      started_at: '2026-11-16T09:00:00.000Z',
      ended_at: '2026-11-16T09:10:00.000Z',
      consented_at: '2026-11-16T08:59:58.000Z',
      settings: DEFAULT_SESSION_SETTINGS,
      events: [],
      landmarks: [[0.1, 0.2, 0.3]],
    });
    expect(rejectedWithLandmarks.success).toBe(false);

    const rejectedDelete = DeleteSessionPayloadSchema.safeParse({
      sessionId: 'not-a-uuid',
    });
    expect(rejectedDelete.success).toBe(false);
  });

  it('saves a completed session to Supabase via saveAction and mirrors it to localStorage', async () => {
    const mockSaveAction = vi.fn().mockResolvedValue({
      success: true,
      syncedToCloud: true,
      sessionId: '22222222-3333-4444-8555-666666666666',
    });

    const result = await saveCompletedSession(
      {
        id: '22222222-3333-4444-8555-666666666666',
        startedAt: '2026-11-16T09:00:00.000Z',
        endedAt: '2026-11-16T09:05:00.000Z',
        consentedAt: '2026-11-16T08:59:55.000Z',
        settings: DEFAULT_SESSION_SETTINGS,
        events: sampleEvents,
      },
      { saveAction: mockSaveAction }
    );

    expect(result.success).toBe(true);
    expect(result.syncedToCloud).toBe(true);
    expect(mockSaveAction).toHaveBeenCalledTimes(1);
    expect(result.session?.durationSeconds).toBe(300);
    expect(result.session?.counts).toEqual({
      eyesClosed: 1,
      longEyeClosure: 1,
      headTurned: 1,
      lookingAway: 1,
      total: 4,
    });

    const local = readLocalSavedSessions();
    expect(local).toHaveLength(1);
    expect(local[0].id).toBe('22222222-3333-4444-8555-666666666666');
    expect(local[0].syncedToCloud).toBe(true);
  });

  it('preserves session in browser localStorage when cloud storage is offline or unauthenticated', async () => {
    const mockOfflineSave = vi.fn().mockResolvedValue({
      success: false,
      syncedToCloud: false,
      error: 'No active cloud user session.',
    });

    const result = await saveCompletedSession(
      {
        id: '33333333-4444-4555-8666-777777777777',
        startedAt: '2026-11-16T10:00:00.000Z',
        endedAt: '2026-11-16T10:02:00.000Z',
        consentedAt: '2026-11-16T09:59:55.000Z',
        settings: DEFAULT_SESSION_SETTINGS,
        events: sampleEvents.slice(0, 2),
      },
      { saveAction: mockOfflineSave }
    );

    expect(result.success).toBe(true);
    expect(result.syncedToCloud).toBe(false);
    expect(result.session?.counts.total).toBe(2);

    const local = readLocalSavedSessions();
    expect(local).toHaveLength(1);
    expect(local[0].syncedToCloud).toBe(false);
  });

  it('merges cloud sessions and local sessions by ID in loadSavedSessions', async () => {
    // Save one local-only session first
    await saveCompletedSession(
      {
        id: '44444444-5555-4666-8777-888888888888',
        startedAt: '2026-11-16T08:00:00.000Z',
        endedAt: '2026-11-16T08:01:00.000Z',
        consentedAt: '2026-11-16T07:59:50.000Z',
        settings: DEFAULT_SESSION_SETTINGS,
        events: [],
      },
      {
        saveAction: vi.fn().mockResolvedValue({
          success: false,
          syncedToCloud: false,
        }),
      }
    );

    const mockListAction = vi.fn().mockResolvedValue({
      success: true,
      syncedToCloud: true,
      sessions: [
        {
          id: '55555555-6666-4777-8888-999999999999',
          user_id: 'aaaa1111-2222-4333-8444-555555555555',
          started_at: '2026-11-16T11:00:00.000Z',
          ended_at: '2026-11-16T11:03:00.000Z',
          consented_at: '2026-11-16T10:59:55.000Z',
          settings: DEFAULT_SESSION_SETTINGS,
          events: [
            {
              id: 'evt-cloud-1',
              event_type: 'looking_away' as const,
              started_at: '2026-11-16T11:01:00.000Z',
              duration_ms: 3400,
            },
          ],
        },
      ],
    });

    const loaded = await loadSavedSessions({ listAction: mockListAction });
    expect(loaded.syncedToCloud).toBe(true);
    expect(loaded.sessions).toHaveLength(2);
    expect(loaded.sessions[0].id).toBe('55555555-6666-4777-8888-999999999999');
    expect(loaded.sessions[0].counts.lookingAway).toBe(1);
    expect(loaded.sessions[1].id).toBe('44444444-5555-4666-8777-888888888888');
  });

  it('deletes a saved session from both localStorage and Supabase via deleteAction', async () => {
    const sessionId = '66666666-7777-4888-8999-000000000000';
    await saveCompletedSession(
      {
        id: sessionId,
        startedAt: '2026-11-16T12:00:00.000Z',
        endedAt: '2026-11-16T12:04:00.000Z',
        consentedAt: '2026-11-16T11:59:55.000Z',
        settings: DEFAULT_SESSION_SETTINGS,
        events: sampleEvents,
      },
      {
        saveAction: vi.fn().mockResolvedValue({
          success: true,
          syncedToCloud: true,
          sessionId,
        }),
      }
    );

    expect(readLocalSavedSessions()).toHaveLength(1);

    const mockDeleteAction = vi.fn().mockResolvedValue({
      success: true,
      syncedToCloud: true,
      deletedSessionId: sessionId,
    });

    const deleteRes = await deleteSavedSession(sessionId, {
      deleteAction: mockDeleteAction,
    });

    expect(deleteRes.success).toBe(true);
    expect(deleteRes.deletedSessionId).toBe(sessionId);
    expect(mockDeleteAction).toHaveBeenCalledWith({ sessionId });
    expect(readLocalSavedSessions()).toHaveLength(0);
    expect(
      JSON.parse(window.localStorage.getItem(SAVED_SESSIONS_STORAGE_KEY) ?? '[]')
    ).toHaveLength(0);
  });

  it('strictly isolates sessions per user and prevents cross-user data collision', async () => {
    const userA = 'user-uuid-aaa-111';
    const userB = 'user-uuid-bbb-222';
    const sessionIdA = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
    const sessionIdB = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';

    // User A saves a session
    await saveCompletedSession(
      {
        id: sessionIdA,
        startedAt: '2026-11-16T14:00:00.000Z',
        endedAt: '2026-11-16T14:15:00.000Z',
        consentedAt: '2026-11-16T13:59:50.000Z',
        settings: DEFAULT_SESSION_SETTINGS,
        events: sampleEvents,
      },
      {
        saveAction: vi.fn().mockResolvedValue({
          success: true,
          syncedToCloud: true,
          sessionId: sessionIdA,
        }),
      },
      userA
    );

    // User B saves a session
    await saveCompletedSession(
      {
        id: sessionIdB,
        startedAt: '2026-11-16T15:00:00.000Z',
        endedAt: '2026-11-16T15:30:00.000Z',
        consentedAt: '2026-11-16T14:59:50.000Z',
        settings: DEFAULT_SESSION_SETTINGS,
        events: sampleEvents,
      },
      {
        saveAction: vi.fn().mockResolvedValue({
          success: true,
          syncedToCloud: true,
          sessionId: sessionIdB,
        }),
      },
      userB
    );

    // Verify User A local storage
    const userASessions = readLocalSavedSessions(userA);
    expect(userASessions).toHaveLength(1);
    expect(userASessions[0].id).toBe(sessionIdA);

    // Verify User B local storage
    const userBSessions = readLocalSavedSessions(userB);
    expect(userBSessions).toHaveLength(1);
    expect(userBSessions[0].id).toBe(sessionIdB);

    // Verify Guest partition has zero sessions
    const guestSessions = readLocalSavedSessions(null);
    expect(guestSessions).toHaveLength(0);

    // Verify loadSavedSessions returns strictly scoped records
    const loadedForA = await loadSavedSessions(
      {
        listAction: vi.fn().mockResolvedValue({
          success: true,
          syncedToCloud: true,
          sessions: [],
        }),
      },
      userA
    );
    expect(loadedForA.sessions).toHaveLength(1);
    expect(loadedForA.sessions[0].id).toBe(sessionIdA);

    const loadedForB = await loadSavedSessions(
      {
        listAction: vi.fn().mockResolvedValue({
          success: true,
          syncedToCloud: true,
          sessions: [],
        }),
      },
      userB
    );
    expect(loadedForB.sessions).toHaveLength(1);
    expect(loadedForB.sessions[0].id).toBe(sessionIdB);
  });
});
