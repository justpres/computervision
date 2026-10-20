'use client';

import React, { useState } from 'react';
import { KeyRound, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface StudentLoginViewProps {
  onSignIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  onSignUp: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  onContinueAsGuest: () => void;
  isLoading?: boolean;
}

/**
 * Welcoming student entry view:
 * - Single-screen layout that never scrolls on 720p/768p or mobile.
 * - Clean student sign-in / registration form.
 * - Single-click "Try without an account" option for immediate testing.
 */
export const StudentLoginView: React.FC<StudentLoginViewProps> = ({
  onSignIn,
  onSignUp,
  onContinueAsGuest,
  isLoading = false,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorFeedback(null);

    if (!email.trim() || !password.trim()) {
      setErrorFeedback('Please enter both your email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res =
        mode === 'signin'
          ? await onSignIn(email.trim(), password)
          : await onSignUp(email.trim(), password);

      if (!res.success) {
        setErrorFeedback(res.error ?? 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh w-full flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 sm:p-6 space-y-4 shadow-none">
        {/* Brand Header inside card */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-h3 font-semibold text-on-surface">
              Study Session Monitor
            </h1>
            <span className="rounded-full bg-experimental-container px-2 py-0.5 text-[10px] font-semibold text-experimental uppercase tracking-wide">
              Experimental
            </span>
          </div>
          <p className="text-caption text-on-surface-muted">
            Sign in to save your sessions, or try immediately.
          </p>
        </div>

        {/* Mode Toggle */}
        <div
          role="tablist"
          aria-label="Account options"
          className="grid grid-cols-2 rounded-lg bg-background p-1 border border-border"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            onClick={() => {
              setMode('signin');
              setErrorFeedback(null);
            }}
            className={`rounded-md py-1.5 text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              mode === 'signin'
                ? 'bg-surface text-on-surface shadow-xs'
                : 'text-on-surface-muted hover:text-on-surface'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            onClick={() => {
              setMode('signup');
              setErrorFeedback(null);
            }}
            className={`rounded-md py-1.5 text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              mode === 'signup'
                ? 'bg-surface text-on-surface shadow-xs'
                : 'text-on-surface-muted hover:text-on-surface'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Feedback */}
        {errorFeedback && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md bg-error-container p-2.5 text-caption text-on-error-container"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorFeedback}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label
              htmlFor="student-email-input"
              className="text-caption font-semibold text-on-surface block"
            >
              Student Email
            </label>
            <input
              id="student-email-input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.edu"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-body-sm text-on-surface placeholder:text-on-surface-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="student-password-input"
              className="text-caption font-semibold text-on-surface block"
            >
              Password
            </label>
            <input
              id="student-password-input"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-body-sm text-on-surface placeholder:text-on-surface-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            {mode === 'signup' && (
              <span className="text-[11px] text-on-surface-muted block">
                Must be at least 6 characters.
              </span>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || isLoading}
            className="w-full justify-center gap-2 mt-1 py-2 font-semibold text-body-sm"
          >
            <KeyRound className="w-4 h-4" aria-hidden="true" />
            <span>
              {isSubmitting
                ? 'Processing...'
                : mode === 'signin'
                  ? 'Sign in to Study Monitor'
                  : 'Create Student Account'}
            </span>
          </Button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-0.5">
          <div className="w-full border-t border-border" />
          <span className="bg-surface px-2 text-[11px] text-on-surface-muted uppercase tracking-wider">
            or
          </span>
        </div>

        {/* Guest Action & Quiet Footnote */}
        <div className="space-y-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onContinueAsGuest}
            disabled={isSubmitting || isLoading}
            className="w-full justify-center py-2 text-body-sm font-semibold"
          >
            Try without an account
          </Button>
          <p className="text-[11px] text-on-surface-muted text-center leading-normal">
            No sign-up needed. No video or photos are saved or uploaded.
          </p>
        </div>
      </div>
    </div>
  );
};
