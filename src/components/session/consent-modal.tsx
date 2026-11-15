'use client';

import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

export interface ConsentModalProps {
  isOpen: boolean;
  onAgree: () => void;
  onDecline: () => void;
}

/**
 * Consent screen modal (Swiss-Grid Utilitarian Precision):
 * - Equal button sizes, no pre-checked items, no guilt wording.
 * - Zero decorative icons and zero nested boxes: exposed hairline rows (`divide-y divide-border`).
 * - Accessible dialog pattern with keyboard support (Esc closes) and focus management.
 */
export const ConsentModal: React.FC<ConsentModalProps> = ({
  isOpen,
  onAgree,
  onDecline,
}) => {
  const agreeButtonRef = useRef<HTMLButtonElement>(null);

  // Esc key closes modal (decline)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDecline();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Autofocus primary agreement button
    agreeButtonRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onDecline]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4 calm-fade-in"
      role="presentation"
      onClick={onDecline}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        aria-describedby="consent-description"
        className="w-full max-w-lg rounded-md bg-surface border border-border shadow-md divide-y divide-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 space-y-1">
          <span className="block font-mono text-[11px] font-semibold text-on-surface-muted uppercase tracking-wider">
            Privacy &amp; Consent
          </span>
          <h2 id="consent-title" className="text-h3 font-semibold tracking-tight text-on-surface">
            Study Session Monitoring Consent
          </h2>
          <p id="consent-description" className="text-caption text-on-surface-muted">
            Before monitoring starts, here is what this system measures and what stays private.
          </p>
        </div>

        {/* Hairline Fact Rows (Zero Nested Cards) */}
        <div className="divide-y divide-border">
          <div className="px-5 py-3.5 space-y-0.5">
            <h3 className="text-caption font-semibold text-on-surface">What is measured</h3>
            <p className="text-caption text-on-surface-muted">
              Simple observable signs (eyes closed, head turned, looking away) computed strictly inside your browser.
            </p>
          </div>

          <div className="px-5 py-3.5 space-y-0.5">
            <h3 className="text-caption font-semibold text-on-surface">What is never saved or sent</h3>
            <p className="text-caption text-on-surface-muted">
              No video, camera frames, or facial landmarks are ever saved or uploaded. Only event timestamps and durations are kept.
            </p>
          </div>

          <div className="px-5 py-3.5 space-y-0.5">
            <h3 className="text-caption font-semibold text-on-surface">Your control</h3>
            <p className="text-caption text-on-surface-muted">
              You can stop monitoring at any time. Session records can be deleted whenever you wish.
            </p>
          </div>
        </div>

        {/* Equal Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 px-5 py-4 bg-background/40">
          <Button
            ref={agreeButtonRef}
            variant="primary"
            onClick={onAgree}
            className="flex-1 rounded-md shadow-none"
          >
            I agree and start
          </Button>
          <Button
            variant="secondary"
            onClick={onDecline}
            className="flex-1 rounded-md shadow-none"
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
};
