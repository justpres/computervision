import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveCompletedSessionAction,
  listUserSessionsAction,
  deleteUserSessionAction,
} from '../sessions';
import { DEFAULT_SESSION_SETTINGS } from '@/lib/settings/settings-store';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

describe('Sessions Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid payloads in saveCompletedSessionAction before touching database', async () => {
    const res = await saveCompletedSessionAction({
      id: 'invalid-uuid',
      started_at: 'not-a-date',
    });

    expect(res.success).toBe(false);
    expect(res.syncedToCloud).toBe(false);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('returns syncedToCloud: false when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const res = await saveCompletedSessionAction({
      id: '11111111-2222-4333-8444-555555555555',
      started_at: '2026-11-16T09:00:00.000Z',
      ended_at: '2026-11-16T09:05:00.000Z',
      consented_at: '2026-11-16T08:59:55.000Z',
      settings: DEFAULT_SESSION_SETTINGS,
      events: [],
    });

    expect(res.success).toBe(false);
    expect(res.syncedToCloud).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('inserts session and events scoped to authenticated user.id in saveCompletedSessionAction', async () => {
    const mockUserId = 'aaaa1111-2222-4333-8444-555555555555';
    mockGetUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });

    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      insert: mockInsert,
    });

    const sessionId = '22222222-3333-4444-8555-666666666666';
    const res = await saveCompletedSessionAction({
      id: sessionId,
      started_at: '2026-11-16T09:00:00.000Z',
      ended_at: '2026-11-16T09:05:00.000Z',
      consented_at: '2026-11-16T08:59:55.000Z',
      settings: DEFAULT_SESSION_SETTINGS,
      events: [
        {
          event_type: 'long_eye_closure',
          started_at: '2026-11-16T09:01:00.000Z',
          duration_ms: 2300,
        },
      ],
    });

    expect(res.success).toBe(true);
    expect(res.syncedToCloud).toBe(true);
    expect(res.sessionId).toBe(sessionId);
    expect(mockFrom).toHaveBeenCalledWith('sessions');
    expect(mockFrom).toHaveBeenCalledWith('events');
    expect(mockInsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: sessionId,
        user_id: mockUserId,
      })
    );
    expect(mockInsert).toHaveBeenNthCalledWith(1 + 1, [
      {
        session_id: sessionId,
        user_id: mockUserId,
        event_type: 'long_eye_closure',
        started_at: '2026-11-16T09:01:00.000Z',
        duration_ms: 2300,
      },
    ]);
  });

  it('lists authenticated user sessions with nested events in listUserSessionsAction', async () => {
    const mockUserId = 'aaaa1111-2222-4333-8444-555555555555';
    mockGetUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });

    const mockLimit = vi.fn().mockResolvedValue({
      data: [
        {
          id: '33333333-4444-4555-8666-777777777777',
          user_id: mockUserId,
          started_at: '2026-11-16T10:00:00.000Z',
          ended_at: '2026-11-16T10:04:00.000Z',
          consented_at: '2026-11-16T09:59:55.000Z',
          settings: DEFAULT_SESSION_SETTINGS,
          events: [
            {
              id: 'evt-1',
              event_type: 'looking_away',
              started_at: '2026-11-16T10:01:00.000Z',
              duration_ms: 3500,
            },
          ],
        },
      ],
      error: null,
    });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const res = await listUserSessionsAction();
    expect(res.success).toBe(true);
    expect(res.syncedToCloud).toBe(true);
    expect(res.sessions).toHaveLength(1);
    expect(res.sessions[0].events).toHaveLength(1);
    expect(mockEq).toHaveBeenCalledWith('user_id', mockUserId);
  });

  it('deletes session scoped to id and user_id in deleteUserSessionAction', async () => {
    const mockUserId = 'aaaa1111-2222-4333-8444-555555555555';
    const sessionId = '44444444-5555-4666-8777-888888888888';
    mockGetUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });

    const mockEqUser = vi.fn().mockResolvedValue({ error: null });
    const mockEqId = vi.fn().mockReturnValue({ eq: mockEqUser });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEqId });
    mockFrom.mockReturnValue({ delete: mockDelete });

    const res = await deleteUserSessionAction({ sessionId });
    expect(res.success).toBe(true);
    expect(res.syncedToCloud).toBe(true);
    expect(res.deletedSessionId).toBe(sessionId);
    expect(mockEqId).toHaveBeenCalledWith('id', sessionId);
    expect(mockEqUser).toHaveBeenCalledWith('user_id', mockUserId);
  });
});
