'use server';

import { createClient } from '@/lib/supabase/server';
import {
  SaveSessionPayloadSchema,
  DeleteSessionPayloadSchema,
  type EventType,
  type SessionSettings,
} from '@/lib/validation/session';

export interface CloudStoredEvent {
  id: string;
  event_type: EventType;
  started_at: string;
  duration_ms: number;
}

export interface CloudStoredSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  consented_at: string;
  settings: Partial<SessionSettings>;
  events: CloudStoredEvent[];
}

export interface SaveSessionActionResult {
  success: boolean;
  syncedToCloud: boolean;
  sessionId?: string;
  error?: string;
}

export interface ListSessionsActionResult {
  success: boolean;
  syncedToCloud: boolean;
  sessions: CloudStoredSession[];
  error?: string;
}

export interface DeleteSessionActionResult {
  success: boolean;
  syncedToCloud: boolean;
  deletedSessionId?: string;
  error?: string;
}

/**
 * Persists a completed study session and its debounced event records to Supabase
 * under Row Level Security (`(select auth.uid()) = user_id`).
 *
 * Strictly validated with Zod so zero video, image, or facial landmark data can be accepted.
 */
export async function saveCompletedSessionAction(
  rawPayload: unknown
): Promise<SaveSessionActionResult> {
  const parsed = SaveSessionPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return {
      success: false,
      syncedToCloud: false,
      error:
        parsed.error.issues[0]?.message ??
        'Invalid session data submitted for storage.',
    };
  }

  const payload = parsed.data;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        syncedToCloud: false,
        error: 'No active cloud user session.',
      };
    }

    const { error: sessionError } = await supabase.from('sessions').insert({
      id: payload.id,
      user_id: user.id,
      started_at: payload.started_at,
      ended_at: payload.ended_at,
      consented_at: payload.consented_at,
      settings: payload.settings,
    });

    if (sessionError) {
      return {
        success: false,
        syncedToCloud: false,
        error: sessionError.message,
      };
    }

    if (payload.events.length > 0) {
      const eventRows = payload.events.map((evt) => ({
        session_id: payload.id,
        user_id: user.id,
        event_type: evt.event_type,
        started_at: evt.started_at,
        duration_ms: evt.duration_ms,
      }));

      const { error: eventsError } = await supabase
        .from('events')
        .insert(eventRows);

      if (eventsError) {
        return {
          success: false,
          syncedToCloud: false,
          error: eventsError.message,
        };
      }
    }

    return {
      success: true,
      syncedToCloud: true,
      sessionId: payload.id,
    };
  } catch (err) {
    return {
      success: false,
      syncedToCloud: false,
      error:
        err instanceof Error ? err.message : 'Unable to reach cloud storage.',
    };
  }
}

/**
 * Lists the authenticated user's saved study sessions and their associated events
 * from Supabase under Row Level Security.
 */
export async function listUserSessionsAction(): Promise<ListSessionsActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        syncedToCloud: false,
        sessions: [],
        error: 'No active cloud user session.',
      };
    }

    const { data, error } = await supabase
      .from('sessions')
      .select(
        'id, user_id, started_at, ended_at, consented_at, settings, events(id, event_type, started_at, duration_ms)'
      )
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(50);

    if (error || !data) {
      return {
        success: false,
        syncedToCloud: false,
        sessions: [],
        error: error?.message ?? 'Failed to load sessions from cloud storage.',
      };
    }

    const sessions: CloudStoredSession[] = (
      data as unknown as Array<{
        id: string;
        user_id: string;
        started_at: string;
        ended_at: string | null;
        consented_at: string;
        settings: Partial<SessionSettings> | null;
        events?: CloudStoredEvent[] | null;
      }>
    ).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      started_at: row.started_at,
      ended_at: row.ended_at,
      consented_at: row.consented_at,
      settings: row.settings ?? {},
      events: Array.isArray(row.events) ? row.events : [],
    }));

    return {
      success: true,
      syncedToCloud: true,
      sessions,
    };
  } catch (err) {
    return {
      success: false,
      syncedToCloud: false,
      sessions: [],
      error:
        err instanceof Error ? err.message : 'Unable to reach cloud storage.',
    };
  }
}

/**
 * Deletes a user's saved study session (and cascades deletion to its events)
 * in Supabase under Row Level Security.
 */
export async function deleteUserSessionAction(
  rawPayload: unknown
): Promise<DeleteSessionActionResult> {
  const parsed = DeleteSessionPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return {
      success: false,
      syncedToCloud: false,
      error:
        parsed.error.issues[0]?.message ?? 'Invalid session identifier.',
    };
  }

  const { sessionId } = parsed.data;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        syncedToCloud: false,
        error: 'No active cloud user session.',
      };
    }

    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (error) {
      return {
        success: false,
        syncedToCloud: false,
        error: error.message,
      };
    }

    return {
      success: true,
      syncedToCloud: true,
      deletedSessionId: sessionId,
    };
  } catch (err) {
    return {
      success: false,
      syncedToCloud: false,
      error:
        err instanceof Error ? err.message : 'Unable to reach cloud storage.',
    };
  }
}
