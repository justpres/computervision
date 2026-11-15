import {
  SaveSessionPayloadSchema,
  DeleteSessionPayloadSchema,
  SessionSettingsSchema,
  type SaveSessionPayload,
  type SaveSessionEventInput,
  type SessionSettings,
} from '@/lib/validation/session';
import {
  type SessionDetectionEvent,
  type SessionEventCounts,
} from '@/lib/detection/session-event-engine';
import {
  saveCompletedSessionAction,
  listUserSessionsAction,
  deleteUserSessionAction,
  type CloudStoredSession,
  type SaveSessionActionResult,
  type ListSessionsActionResult,
  type DeleteSessionActionResult,
} from '@/app/actions/sessions';

export const SAVED_SESSIONS_STORAGE_KEY = 'study_tracker_saved_sessions_v1';

/**
 * Returns a user-scoped storage key to ensure complete tenant data isolation
 * ("data of mine should never be the same as yours").
 */
export function getSavedSessionsStorageKey(userId?: string | null): string {
  if (userId === undefined) {
    return SAVED_SESSIONS_STORAGE_KEY;
  }
  if (!userId) {
    return `${SAVED_SESSIONS_STORAGE_KEY}_guest`;
  }
  const cleanId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
  return `${SAVED_SESSIONS_STORAGE_KEY}_u_${cleanId}`;
}

export interface SavedSessionSummary {
  id: string;
  startedAt: string;
  endedAt: string;
  consentedAt: string;
  durationSeconds: number;
  settings: SessionSettings;
  counts: SessionEventCounts;
  events: SaveSessionEventInput[];
  syncedToCloud: boolean;
}

export interface SaveCompletedSessionInput {
  id?: string;
  startedAt: string;
  endedAt: string;
  consentedAt: string;
  settings: SessionSettings;
  events: readonly SessionDetectionEvent[];
}

export interface SessionStorageDependencies {
  saveAction?: (payload: unknown) => Promise<SaveSessionActionResult>;
  listAction?: () => Promise<ListSessionsActionResult>;
  deleteAction?: (payload: unknown) => Promise<DeleteSessionActionResult>;
}

/**
 * Generates a RFC 4122 v4 UUID using Web Crypto API with a deterministic fallback.
 */
export function generateSessionUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Computes per-category event counts from stored event items.
 */
export function computeCountsFromStoredEvents(
  events: readonly SaveSessionEventInput[]
): SessionEventCounts {
  let eyesClosed = 0;
  let longEyeClosure = 0;
  let headTurned = 0;
  let lookingAway = 0;

  for (const evt of events) {
    switch (evt.event_type) {
      case 'eyes_closed':
        eyesClosed++;
        break;
      case 'long_eye_closure':
        longEyeClosure++;
        break;
      case 'head_turned':
        headTurned++;
        break;
      case 'looking_away':
        lookingAway++;
        break;
    }
  }

  return {
    eyesClosed,
    longEyeClosure,
    headTurned,
    lookingAway,
    total: events.length,
  };
}

/**
 * Computes elapsed duration in seconds from ISO start and end timestamps.
 */
export function computeDurationSeconds(startedAt: string, endedAt: string): number {
  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(endedAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return 0;
  }
  return Math.max(0, Math.round((endMs - startMs) / 1000));
}

/**
 * Reads saved study sessions from browser localStorage for a specific user partition.
 */
export function readLocalSavedSessions(userId?: string | null): SavedSessionSummary[] {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return [];
  }

  try {
    const key = getSavedSessionsStorageKey(userId);
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const valid: SavedSessionSummary[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, unknown>;
      const payloadCheck = SaveSessionPayloadSchema.safeParse({
        id: rec.id,
        started_at: rec.startedAt,
        ended_at: rec.endedAt,
        consented_at: rec.consentedAt,
        settings: rec.settings ?? {},
        events: Array.isArray(rec.events) ? rec.events : [],
      });
      if (!payloadCheck.success) continue;

      const d = payloadCheck.data;
      valid.push({
        id: d.id,
        startedAt: d.started_at,
        endedAt: d.ended_at,
        consentedAt: d.consented_at,
        durationSeconds: computeDurationSeconds(d.started_at, d.ended_at),
        settings: d.settings,
        counts: computeCountsFromStoredEvents(d.events),
        events: d.events,
        syncedToCloud: Boolean(rec.syncedToCloud),
      });
    }

    return valid.sort(
      (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)
    );
  } catch {
    return [];
  }
}

/**
 * Writes saved study sessions to browser localStorage for a specific user partition.
 */
export function writeLocalSavedSessions(
  sessions: readonly SavedSessionSummary[],
  userId?: string | null
): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  try {
    const key = getSavedSessionsStorageKey(userId);
    window.localStorage.setItem(
      key,
      JSON.stringify(sessions.slice(0, 50))
    );
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Converts a cloud-stored session row into a normalized `SavedSessionSummary`.
 */
function mapCloudSessionToSummary(cloud: CloudStoredSession): SavedSessionSummary {
  const endedAt = cloud.ended_at ?? cloud.started_at;
  const settings = SessionSettingsSchema.parse(cloud.settings ?? {});
  const events: SaveSessionEventInput[] = (cloud.events ?? []).map((evt) => ({
    id: evt.id,
    event_type: evt.event_type,
    started_at: evt.started_at,
    duration_ms: evt.duration_ms,
  }));

  return {
    id: cloud.id,
    startedAt: cloud.started_at,
    endedAt,
    consentedAt: cloud.consented_at,
    durationSeconds: computeDurationSeconds(cloud.started_at, endedAt),
    settings,
    counts: computeCountsFromStoredEvents(events),
    events,
    syncedToCloud: true,
  };
}

/**
 * Validates and persists a completed study session and its events.
 * Writes to Supabase via Server Action and mirrors to localStorage.
 */
export async function saveCompletedSession(
  input: SaveCompletedSessionInput,
  deps: SessionStorageDependencies = {},
  userId?: string | null
): Promise<{
  success: boolean;
  session?: SavedSessionSummary;
  syncedToCloud: boolean;
  error?: string;
}> {
  const saveAction = deps.saveAction ?? saveCompletedSessionAction;
  const sessionId = input.id ?? generateSessionUuid();

  const mappedEvents: SaveSessionEventInput[] = input.events.map((evt) => ({
    event_type: evt.eventType,
    started_at: evt.startedAtIso,
    duration_ms: Math.max(0, Math.round(evt.durationMs)),
  }));

  const candidatePayload: SaveSessionPayload = {
    id: sessionId,
    started_at: input.startedAt,
    ended_at: input.endedAt,
    consented_at: input.consentedAt,
    settings: input.settings,
    events: mappedEvents,
  };

  const validation = SaveSessionPayloadSchema.safeParse(candidatePayload);
  if (!validation.success) {
    return {
      success: false,
      syncedToCloud: false,
      error:
        validation.error.issues[0]?.message ?? 'Invalid session payload.',
    };
  }

  const validPayload = validation.data;
  let syncedToCloud = false;
  let cloudError: string | undefined;

  try {
    const cloudResult = await saveAction(validPayload);
    syncedToCloud = cloudResult.syncedToCloud;
    if (!cloudResult.success) {
      cloudError = cloudResult.error;
    }
  } catch (err) {
    syncedToCloud = false;
    cloudError =
      err instanceof Error ? err.message : 'Cloud storage unavailable.';
  }

  const summary: SavedSessionSummary = {
    id: validPayload.id,
    startedAt: validPayload.started_at,
    endedAt: validPayload.ended_at,
    consentedAt: validPayload.consented_at,
    durationSeconds: computeDurationSeconds(
      validPayload.started_at,
      validPayload.ended_at
    ),
    settings: validPayload.settings,
    counts: computeCountsFromStoredEvents(validPayload.events),
    events: validPayload.events,
    syncedToCloud,
  };

  const existingLocal = readLocalSavedSessions(userId).filter(
    (s) => s.id !== summary.id
  );
  writeLocalSavedSessions([summary, ...existingLocal], userId);

  return {
    success: true,
    session: summary,
    syncedToCloud,
    error: cloudError,
  };
}

/**
 * Loads saved sessions from Supabase (when authenticated) merged with local browser sessions
 * for that specific user partition.
 */
export async function loadSavedSessions(
  deps: SessionStorageDependencies = {},
  userId?: string | null
): Promise<{
  sessions: SavedSessionSummary[];
  syncedToCloud: boolean;
}> {
  const listAction = deps.listAction ?? listUserSessionsAction;
  const localSessions = readLocalSavedSessions(userId);

  try {
    const cloudResult = await listAction();
    if (cloudResult.success && cloudResult.syncedToCloud) {
      const byId = new Map<string, SavedSessionSummary>();
      for (const local of localSessions) {
        byId.set(local.id, local);
      }
      for (const cloudRow of cloudResult.sessions) {
        byId.set(cloudRow.id, mapCloudSessionToSummary(cloudRow));
      }
      const merged = Array.from(byId.values()).sort(
        (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)
      );
      writeLocalSavedSessions(merged, userId);
      return {
        sessions: merged,
        syncedToCloud: true,
      };
    }
  } catch {
    // Fall back to local sessions if cloud is unreachable
  }

  return {
    sessions: localSessions,
    syncedToCloud: false,
  };
}

/**
 * Deletes a saved study session by ID from both Supabase (cascading to its events)
 * and the specific user's local browser storage.
 */
export async function deleteSavedSession(
  sessionId: string,
  deps: SessionStorageDependencies = {},
  userId?: string | null
): Promise<{
  success: boolean;
  deletedSessionId?: string;
  syncedToCloud: boolean;
  error?: string;
}> {
  const deleteAction = deps.deleteAction ?? deleteUserSessionAction;
  const parsed = DeleteSessionPayloadSchema.safeParse({ sessionId });

  if (!parsed.success) {
    return {
      success: false,
      syncedToCloud: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid session ID.',
    };
  }

  const remainingLocal = readLocalSavedSessions(userId).filter(
    (s) => s.id !== parsed.data.sessionId
  );
  writeLocalSavedSessions(remainingLocal, userId);

  let syncedToCloud = false;
  let cloudError: string | undefined;

  try {
    const cloudResult = await deleteAction({
      sessionId: parsed.data.sessionId,
    });
    syncedToCloud = cloudResult.syncedToCloud;
    if (!cloudResult.success) {
      cloudError = cloudResult.error;
    }
  } catch (err) {
    syncedToCloud = false;
    cloudError =
      err instanceof Error ? err.message : 'Cloud storage unavailable.';
  }

  return {
    success: true,
    deletedSessionId: parsed.data.sessionId,
    syncedToCloud,
    error: cloudError,
  };
}
