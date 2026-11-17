'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ArrowLeft, Mail, Eye, EyeOff } from 'lucide-react';
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
  onForgotPassword?: (
    email: string
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
  onContinueAsGuest: () => void;
  isLoading?: boolean;
}

/**
 * Welcoming student entry view:
 * - Single-screen layout that never scrolls on 720p/768p or mobile.
 * - Clean student sign-in / registration / password recovery form.
 * - Single-click "Try without an account" option for immediate testing.
 * - Industry-standard confirmation & alert design (Linear, Stripe, Clerk inspired).
 */
export const StudentLoginView: React.FC<StudentLoginViewProps> = ({
  onSignIn,
  onSignUp,
  onForgotPassword,
  onContinueAsGuest,
  isLoading = false,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorFeedback(null);
    setSuccessFeedback(null);

    if (mode === 'forgot') {
      if (!email.trim()) {
        setErrorFeedback('Please enter your student email address.');
        return;
      }
      setIsSubmitting(true);
      try {
        if (onForgotPassword) {
          const res = await onForgotPassword(email.trim());
          if (res.success) {
            setSuccessFeedback(
              res.message ??
                'Password reset link sent! Check your inbox to set a new password.'
            );
          } else {
            const raw =
              res.error ?? res.message ?? 'Failed to send password reset link.';
            let friendly = raw;
            const lower = raw.toLowerCase();
            if (lower.includes('rate limit')) {
              friendly = 'For security, please wait 60 seconds before requesting another reset link.';
            } else if (lower.includes('user not found') || lower.includes('not found')) {
              friendly = 'This email is not registered in our database. Please check your spelling or create an account.';
            }
            setErrorFeedback(friendly);
          }
        } else {
          setErrorFeedback('Password reset is not configured.');
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

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
        setErrorFeedback(
          res.error ?? 'Authentication failed. Please check your credentials.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isConfirmationView = mode === 'forgot' && Boolean(successFeedback);

  return (
    <div className="min-h-dvh w-full flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 sm:p-6 space-y-4 shadow-none">
        {/* Dedicated "Check Your Email" Confirmation View (Linear & Stripe Standard) */}
        {isConfirmationView ? (
          <div className="space-y-4 text-center py-1">
            {/* Branded Icon Badge */}
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-container text-primary border border-primary/20">
              <Mail className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>

            {/* Single Clear Heading & Context */}
            <div className="space-y-1.5">
              <h1 className="text-h3 font-semibold text-on-surface">
                Check your email
              </h1>
              <p
                role="status"
                className="text-body-sm text-on-surface-muted leading-relaxed"
              >
                If an account exists for{' '}
                <strong className="font-semibold text-on-surface break-all">
                  {email}
                </strong>
                , a password reset link has been sent.
              </p>
            </div>

            {/* Neutral Security & Spam Guidance Note */}
            <div className="rounded-lg bg-background p-3.5 border border-border text-left space-y-1">
              <p className="text-[12px] text-on-surface-muted leading-relaxed">
                Check your inbox and spam folder. If you haven&apos;t registered this email address yet, no email will arrive to protect user privacy.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-1">
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setMode('signin');
                  setShowPassword(false);
                  setErrorFeedback(null);
                  setSuccessFeedback(null);
                }}
                className="w-full justify-center py-2.5 font-semibold text-body-sm text-on-primary rounded-md shadow-none"
              >
                Back to sign in
              </Button>

              <div className="flex items-center justify-center gap-3 text-caption text-on-surface-muted">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessFeedback(null);
                  }}
                  className="text-primary hover:underline font-medium min-h-[36px]"
                >
                  Try another email
                </button>
                <span className="text-on-surface-muted select-none" aria-hidden="true">
                  •
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorFeedback(null);
                    setSuccessFeedback(null);
                  }}
                  className="text-primary hover:underline font-medium min-h-[36px]"
                >
                  Create an account
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Brand Header inside card */}
            <div className="text-center space-y-1">
              <h1 className="text-h3 font-semibold text-on-surface">
                COGNIFOCUS
              </h1>
              <p className="text-caption text-on-surface-muted">
                {mode === 'forgot'
                  ? 'Recover your account password'
                  : 'Sign in to save your sessions, or try immediately.'}
              </p>
            </div>

            {/* Mode Toggle (only in signin or signup modes) */}
            {mode !== 'forgot' ? (
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
                    setShowPassword(false);
                    setErrorFeedback(null);
                    setSuccessFeedback(null);
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
                    setShowPassword(false);
                    setErrorFeedback(null);
                    setSuccessFeedback(null);
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
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setShowPassword(false);
                  setErrorFeedback(null);
                  setSuccessFeedback(null);
                }}
                className="inline-flex items-center gap-1.5 text-caption text-primary hover:underline font-medium min-h-[36px]"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>Back to sign in</span>
              </button>
            )}

            {/* Error Feedback Banner */}
            {errorFeedback && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-error/30 bg-error-container/60 p-3 text-caption text-on-error-container text-left"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" aria-hidden="true" />
                <span className="leading-snug">{errorFeedback}</span>
              </div>
            )}

            {/* Inline Success Feedback Banner */}
            {successFeedback && (
              <div
                role="status"
                className="rounded-lg border border-success/30 bg-success-container/40 p-3 space-y-1 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success text-on-primary">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  </span>
                  <span className="text-caption font-semibold text-on-surface">
                    Password reset link sent
                  </span>
                </div>
                <p className="text-[12px] text-on-surface-muted pl-6 leading-relaxed">
                  {successFeedback}
                </p>
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

              {mode !== 'forgot' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="student-password-input"
                      className="text-caption font-semibold text-on-surface block"
                    >
                      Password
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setShowPassword(false);
                          setErrorFeedback(null);
                          setSuccessFeedback(null);
                        }}
                        className="text-caption text-primary hover:underline font-medium min-h-[44px] flex items-center"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <input
                      id="student-password-input"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full min-h-[44px] rounded-md border border-border bg-background pl-3 pr-11 py-2 text-body-sm text-on-surface placeholder:text-on-surface-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      className="absolute right-0 inline-flex h-[44px] w-[44px] items-center justify-center rounded-r-md text-on-surface-muted hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {mode === 'signup' && (
                    <span className="text-[11px] text-on-surface-muted block">
                      Must be at least 6 characters.
                    </span>
                  )}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || isLoading}
                className="w-full justify-center mt-1 py-2 font-semibold text-body-sm text-on-primary rounded-md shadow-none"
              >
                <span>
                  {isSubmitting
                    ? 'Processing...'
                    : mode === 'forgot'
                      ? 'Send reset link'
                      : mode === 'signin'
                        ? 'Sign in to COGNIFOCUS'
                        : 'Create Student Account'}
                </span>
              </Button>
            </form>

            {/* Divider & Guest Action (only when not in forgot mode) */}
            {mode !== 'forgot' && (
              <>
                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 border-t border-border" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-on-surface-muted select-none">
                    or
                  </span>
                  <div className="flex-1 border-t border-border" />
                </div>

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
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
