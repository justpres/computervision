'use client';

import React, { useState } from 'react';
import { User, KeyRound, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
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
 * Welcoming student entry view.
 * Provides a clean student sign-in / registration form, plus a single-click
 * "Continue as Guest Tester" option for immediate testing without credentials.
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
    <div className="mx-auto max-w-md w-full px-4 py-8 sm:py-16 space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-container text-primary mb-1">
          <User className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="text-h1 font-semibold text-on-surface">
          Study Session Monitor
        </h1>
        <p className="text-body-sm text-on-surface-muted max-w-sm mx-auto">
          Sign in to save and manage your study sessions, or continue as a guest to test immediately.
        </p>
      </div>

      {/* Main Card */}
      <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 space-y-6 shadow-none">
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
            className={`rounded-md py-2 text-label font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              mode === 'signin'
                ? 'bg-surface text-on-surface shadow-sm'
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
            className={`rounded-md py-2 text-label font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              mode === 'signup'
                ? 'bg-surface text-on-surface shadow-sm'
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
            className="flex items-start gap-2.5 rounded-md bg-error-container p-3 text-caption text-on-error-container"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorFeedback}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="student-email-input"
              className="text-label text-on-surface block"
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
              className="w-full rounded-md border border-border-strong bg-background px-3.5 py-2.5 text-body-sm text-on-surface placeholder:text-on-surface-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="student-password-input"
              className="text-label text-on-surface block"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="student-password-input"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-border-strong bg-background px-3.5 py-2.5 text-body-sm text-on-surface placeholder:text-on-surface-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            {mode === 'signup' && (
              <span className="text-caption text-on-surface-muted block">
                Must be at least 6 characters.
              </span>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || isLoading}
            className="w-full justify-center gap-2 mt-2"
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
        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-border" />
          <span className="bg-surface px-3 text-caption text-on-surface-muted uppercase tracking-wider">
            or
          </span>
        </div>

        {/* Guest Action */}
        <div className="space-y-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onContinueAsGuest}
            disabled={isSubmitting || isLoading}
            className="w-full justify-center gap-2 py-3 text-body-sm"
          >
            <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
            <span>Continue as Guest Tester</span>
            <ArrowRight className="w-4 h-4 text-on-surface-muted ml-1" aria-hidden="true" />
          </Button>
          <p className="text-caption text-on-surface-muted text-center">
            No registration required. Test all camera and detection features immediately.
          </p>
        </div>
      </div>

      {/* Quiet Footnote */}
      <p className="text-caption text-on-surface-muted text-center max-w-xs mx-auto">
        Your privacy is protected: no video or photos are saved or uploaded.
      </p>
    </div>
  );
};
