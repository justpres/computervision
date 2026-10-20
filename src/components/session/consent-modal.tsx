'use client';

import React, { useEffect, useRef } from 'react';
import { ShieldCheck, VideoOff, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ConsentModalProps {
  isOpen: boolean;
  onAgree: () => void;
  onDecline: () => void;
}

/**
 * Consent screen modal:
 * - Equal button sizes, no pre-checked items, no guilt wording.
 * - Transparent disclosures (no video saved, browser-only, full user control).
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-4 transition-opacity animate-in fade-in"
      role="presentation"
      onClick={onDecline}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        aria-describedby="consent-description"
        className="w-full max-w-lg rounded-lg bg-surface p-6 border border-border shadow-lg space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-primary">
            <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
            <span className="text-label text-primary uppercase tracking-wide">
              Privacy & Consent
            </span>
          </div>
          <h2 id="consent-title" className="text-h2 font-semibold text-on-surface">
            Study Session Monitoring Consent
          </h2>
          <p id="consent-description" className="text-body-sm text-on-surface-muted">
            Before monitoring starts, here is exactly what this system does and does not do.
          </p>
        </div>

        {/* Fact Cards */}
        <div className="space-y-3">
          {/* What is measured */}
          <div className="flex gap-3 p-3.5 rounded-md bg-background border border-border">
            <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <h3 className="text-label text-on-surface">What is measured</h3>
              <p className="text-body-sm text-on-surface-muted">
                Simple observable signs (eyes closed, head turned, looking away) computed strictly inside your browser.
              </p>
            </div>
          </div>

          {/* What is never saved */}
          <div className="flex gap-3 p-3.5 rounded-md bg-background border border-border">
            <VideoOff className="w-5 h-5 text-secondary shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <h3 className="text-label text-on-surface">What is never saved or sent</h3>
              <p className="text-body-sm text-on-surface-muted">
                No video, camera frames, or facial landmarks are ever saved or uploaded. Only event timestamps and durations are kept.
              </p>
            </div>
          </div>

          {/* Control */}
          <div className="flex gap-3 p-3.5 rounded-md bg-background border border-border">
            <ShieldCheck className="w-5 h-5 text-success shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <h3 className="text-label text-on-surface">Your control</h3>
              <p className="text-body-sm text-on-surface-muted">
                You can stop monitoring at any time. Session records can be deleted whenever you wish.
              </p>
            </div>
          </div>
        </div>

        {/* Equal Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            ref={agreeButtonRef}
            variant="primary"
            onClick={onAgree}
            className="flex-1"
          >
            I agree and start
          </Button>
          <Button
            variant="secondary"
            onClick={onDecline}
            className="flex-1"
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
};
