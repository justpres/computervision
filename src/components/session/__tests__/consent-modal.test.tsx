import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConsentModal } from '../consent-modal';

describe('ConsentModal Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ConsentModal isOpen={false} onAgree={() => {}} onDecline={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with disclosures and equal choices when isOpen is true', () => {
    render(
      <ConsentModal isOpen={true} onAgree={() => {}} onDecline={() => {}} />
    );

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(
      screen.getByText('Study Session Monitoring Consent')
    ).toBeDefined();

    // Verify key privacy disclosures
    expect(screen.getByText('What is measured')).toBeDefined();
    expect(screen.getByText('What is never saved or sent')).toBeDefined();
    expect(screen.getByText('Your control')).toBeDefined();

    // Verify equal action buttons
    expect(screen.getByRole('button', { name: 'I agree and start' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Not now' })).toBeDefined();
  });

  it('triggers onAgree when "I agree and start" is clicked', () => {
    const onAgree = vi.fn();
    const onDecline = vi.fn();

    render(
      <ConsentModal isOpen={true} onAgree={onAgree} onDecline={onDecline} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'I agree and start' }));
    expect(onAgree).toHaveBeenCalledTimes(1);
    expect(onDecline).not.toHaveBeenCalled();
  });

  it('triggers onDecline when "Not now" is clicked', () => {
    const onAgree = vi.fn();
    const onDecline = vi.fn();

    render(
      <ConsentModal isOpen={true} onAgree={onAgree} onDecline={onDecline} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(onAgree).not.toHaveBeenCalled();
  });

  it('triggers onDecline when Escape key is pressed', () => {
    const onAgree = vi.fn();
    const onDecline = vi.fn();

    render(
      <ConsentModal isOpen={true} onAgree={onAgree} onDecline={onDecline} />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDecline).toHaveBeenCalledTimes(1);
  });
});
