'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from './client';

export type SupabaseAuthStatus = 'loading' | 'authenticated' | 'local_only';

export interface UseSupabaseAuthReturn {
  status: SupabaseAuthStatus;
  userId: string | null;
  email: string | null;
  isAnonymous: boolean;
  errorMessage: string | null;
  signInWithEmail: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

/**
 * Manages client-side Supabase authentication for Row Level Security.
 *
 * - On mount, checks for an existing session via `supabase.auth.getSession()`.
 * - If no session exists, automatically attempts `supabase.auth.signInAnonymously()`
 *   so study sessions can be saved under RLS (`(select auth.uid()) = user_id`) without friction.
 * - Also supports optional email + password sign-in or sign-up.
 * - Falls back gracefully to `'local_only'` if Supabase is unreachable or anonymous auth is disabled.
 */
export function useSupabaseAuth(): UseSupabaseAuthReturn {
  const [status, setStatus] = useState<SupabaseAuthStatus>('loading');
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const applyUser = useCallback(
    (
      user: {
        id: string;
        email?: string | null;
        is_anonymous?: boolean;
      } | null
    ) => {
      if (user) {
        setStatus('authenticated');
        setUserId(user.id);
        setEmail(user.email ?? null);
        setIsAnonymous(Boolean(user.is_anonymous ?? !user.email));
        setErrorMessage(null);
      } else {
        setStatus('local_only');
        setUserId(null);
        setEmail(null);
        setIsAnonymous(false);
      }
    },
    []
  );

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session?.user) {
          applyUser(session.user);
          return;
        }

        const { data: anonData, error: anonError } =
          await supabase.auth.signInAnonymously();

        if (!isMounted) return;

        if (anonError || !anonData.user) {
          setStatus('local_only');
          setUserId(null);
          setEmail(null);
          setIsAnonymous(false);
          return;
        }

        applyUser(anonData.user);
      } catch {
        if (!isMounted) return;
        setStatus('local_only');
        setUserId(null);
        setEmail(null);
        setIsAnonymous(false);
      }
    }

    void initAuth();

    return () => {
      isMounted = false;
    };
  }, [applyUser]);

  const signInWithEmail = useCallback(
    async (
      inputEmail: string,
      inputPassword: string
    ): Promise<{ success: boolean; error?: string }> => {
      const trimmedEmail = inputEmail.trim();
      if (!trimmedEmail || !inputPassword) {
        return {
          success: false,
          error: 'Please enter both your email address and password.',
        };
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: inputPassword,
        });

        if (error || !data.user) {
          const msg = error?.message ?? 'Unable to sign in with those credentials.';
          setErrorMessage(msg);
          return { success: false, error: msg };
        }

        applyUser(data.user);
        return { success: true };
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Unable to connect to authentication service.';
        setErrorMessage(msg);
        return { success: false, error: msg };
      }
    },
    [applyUser]
  );

  const signUpWithEmail = useCallback(
    async (
      inputEmail: string,
      inputPassword: string
    ): Promise<{ success: boolean; error?: string }> => {
      const trimmedEmail = inputEmail.trim();
      if (!trimmedEmail || inputPassword.length < 6) {
        return {
          success: false,
          error: 'Please enter a valid email and a password of at least 6 characters.',
        };
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: inputPassword,
        });

        if (error) {
          setErrorMessage(error.message);
          return { success: false, error: error.message };
        }

        if (data.user) {
          applyUser(data.user);
        }

        return { success: true };
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Unable to create account right now.';
        setErrorMessage(msg);
        return { success: false, error: msg };
      }
    },
    [applyUser]
  );

  const signOut = useCallback(async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore network sign-out errors
    }
    applyUser(null);
  }, [applyUser]);

  return {
    status,
    userId,
    email,
    isAnonymous,
    errorMessage,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };
}
