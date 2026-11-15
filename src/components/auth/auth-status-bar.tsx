'use client';

import React, { useState } from 'react';
import { Cloud, HardDrive, User, LogOut, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SupabaseAuthStatus } from '@/lib/supabase/use-supabase-auth';

export interface AuthStatusBarProps {
  status: SupabaseAuthStatus;
  email: string | null;
  isAnonymous: boolean;
  errorMessage: string | null;
  onSignIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  onSignUp: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  onSignOut: () => Promise<void>;
}

/**
 * Quiet, accessible authentication and storage status bar.
 * Shows whether sessions sync to Supabase under Row Level Security or stay in browser storage,
 * with an optional email/password sign-in dialog.
 */
export const AuthStatusBar: React.FC<AuthStatusBarProps> = ({
  status,
  email,
  isAnonymous,
  errorMessage,
  onSignIn,
  onSignUp,
  onSignOut,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [formFeedback, setFormFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);
    setIsSubmitting(true);

    try {
      const result =
        mode === 'signin'
          ? await onSignIn(emailInput, passwordInput)
          : await onSignUp(emailInput, passwordInput);

      if (result.success) {
        setPasswordInput('');
        setIsModalOpen(false);
      } else {
        setFormFeedback(result.error ?? 'Authentication failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-2.5">
          {status === 'authenticated' ? (
            <Badge variant="success">
              <Cloud className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {isAnonymous
                  ? 'Cloud storage active (Anonymous RLS)'
                  : `Signed in: ${email}`}
              </span>
            </Badge>
          ) : (
            <Badge variant="neutral">
              <HardDrive className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {status === 'loading'
                  ? 'Connecting storage...'
                  : 'Browser storage active'}
              </span>
            </Badge>
          )}
          <span className="text-caption text-on-surface-muted hidden sm:inline">
            Only event timestamps and durations are saved. You can delete any session at any time.
          </span>
        </div>

        <div className="flex items-center gap-2">
          {status === 'authenticated' && !isAnonymous ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void onSignOut()}
              className="gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              Sign out
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setFormFeedback(null);
                setIsModalOpen(true);
              }}
              className="gap-1.5"
            >
              <User className="w-3.5 h-3.5" aria-hidden="true" />
              Account sign-in
            </Button>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-4"
          role="presentation"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-lg space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 id="auth-modal-title" className="text-h2 text-on-surface">
                  {mode === 'signin' ? 'Sign In to Save Sessions' : 'Create Study Account'}
                </h2>
                <p className="text-body-sm text-on-surface-muted">
                  Your saved sessions are protected with Row Level Security so only you can view or delete them.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close sign-in dialog"
                onClick={() => setIsModalOpen(false)}
                className="rounded-sm p-1.5 text-on-surface-muted hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="auth-email-input"
                  className="text-label text-on-surface block"
                >
                  Email address
                </label>
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  autoComplete="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="student@example.edu"
                  className="w-full h-11 rounded-sm border border-border-strong bg-surface px-3 text-body-md text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="auth-password-input"
                  className="text-label text-on-surface block"
                >
                  Password
                </label>
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full h-11 rounded-sm border border-border-strong bg-surface px-3 text-body-md text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              {(formFeedback || errorMessage) && (
                <div
                  role="alert"
                  className="rounded-md bg-caution-container p-3 text-body-sm text-caution"
                >
                  {formFeedback ?? errorMessage}
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setFormFeedback(null);
                    setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
                  }}
                >
                  {mode === 'signin' ? 'Need an account?' : 'Have an account?'}
                </Button>

                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting
                    ? 'Connecting...'
                    : mode === 'signin'
                      ? 'Sign in'
                      : 'Create account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
