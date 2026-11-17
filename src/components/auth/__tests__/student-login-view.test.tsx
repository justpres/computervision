import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StudentLoginView } from '../student-login-view';

describe('StudentLoginView Component', () => {
  it('renders student login form and prominent guest tester option', () => {
    render(
      <StudentLoginView
        onSignIn={vi.fn().mockResolvedValue({ success: true })}
        onSignUp={vi.fn().mockResolvedValue({ success: true })}
        onContinueAsGuest={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: /COGNIFOCUS/i })).toBeDefined();
    expect(screen.queryByText(/Experimental/i)).toBeNull();
    expect(screen.getByLabelText(/Student Email/i)).toBeDefined();
    expect(screen.getByLabelText(/^Password$/i)).toBeDefined();
    const signInButton = screen.getByRole('button', { name: /Sign in to COGNIFOCUS/i });
    expect(signInButton).toBeDefined();
    expect(signInButton.className).toContain('text-on-primary');
    expect(screen.getByRole('button', { name: /Try without an account/i })).toBeDefined();
  });

  it('allows switching between Sign In and Create Account modes', () => {
    render(
      <StudentLoginView
        onSignIn={vi.fn().mockResolvedValue({ success: true })}
        onSignUp={vi.fn().mockResolvedValue({ success: true })}
        onContinueAsGuest={vi.fn()}
      />
    );

    const signUpTab = screen.getByRole('tab', { name: /Create Account/i });
    fireEvent.click(signUpTab);

    expect(screen.getByRole('button', { name: /Create Student Account/i })).toBeDefined();
    expect(screen.getByText(/Must be at least 6 characters/i)).toBeDefined();

    const signInTab = screen.getByRole('tab', { name: /Sign In/i });
    fireEvent.click(signInTab);

    expect(screen.getByRole('button', { name: /Sign in to COGNIFOCUS/i })).toBeDefined();
  });

  it('calls onSignIn when student submits credentials', async () => {
    const onSignIn = vi.fn().mockResolvedValue({ success: true });

    render(
      <StudentLoginView
        onSignIn={onSignIn}
        onSignUp={vi.fn()}
        onContinueAsGuest={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/Student Email/i), {
      target: { value: 'test@student.edu' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign in to COGNIFOCUS/i }));

    await waitFor(() => {
      expect(onSignIn).toHaveBeenCalledWith('test@student.edu', 'password123');
    });
  });

  it('displays error feedback when authentication fails', async () => {
    const onSignIn = vi.fn().mockResolvedValue({
      success: false,
      error: 'Invalid login credentials',
    });

    render(
      <StudentLoginView
        onSignIn={onSignIn}
        onSignUp={vi.fn()}
        onContinueAsGuest={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/Student Email/i), {
      target: { value: 'wrong@student.edu' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'badpassword' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign in to COGNIFOCUS/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeDefined();
    });
  });

  it('triggers onContinueAsGuest when clicking the guest button', () => {
    const onContinueAsGuest = vi.fn();

    render(
      <StudentLoginView
        onSignIn={vi.fn()}
        onSignUp={vi.fn()}
        onContinueAsGuest={onContinueAsGuest}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Try without an account/i }));
    expect(onContinueAsGuest).toHaveBeenCalledTimes(1);
  });

  it('switches to forgot password mode and sends reset link', async () => {
    const onForgotPassword = vi.fn().mockResolvedValue({ success: true });

    render(
      <StudentLoginView
        onSignIn={vi.fn()}
        onSignUp={vi.fn()}
        onForgotPassword={onForgotPassword}
        onContinueAsGuest={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Forgot password\?/i }));

    expect(screen.getByRole('button', { name: /Send reset link/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Back to sign in/i })).toBeDefined();

    fireEvent.change(screen.getByLabelText(/Student Email/i), {
      target: { value: 'forgot@student.edu' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Send reset link/i }));

    await waitFor(() => {
      expect(onForgotPassword).toHaveBeenCalledWith('forgot@student.edu');
      expect(
        screen.getByText(/password reset link has been sent/i)
      ).toBeDefined();
    });

    // Clicking back to sign in
    fireEvent.click(screen.getByRole('button', { name: /Back to sign in/i }));
    expect(screen.getByRole('button', { name: /Sign in to COGNIFOCUS/i })).toBeDefined();
  });

  it('toggles password visibility via the eye button and resets on mode switch', () => {
    render(
      <StudentLoginView
        onSignIn={vi.fn().mockResolvedValue({ success: true })}
        onSignUp={vi.fn().mockResolvedValue({ success: true })}
        onContinueAsGuest={vi.fn()}
      />
    );

    const passwordInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const showButton = screen.getByRole('button', { name: 'Show password' });
    expect(showButton.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(showButton);
    expect(passwordInput.type).toBe('text');

    const hideButton = screen.getByRole('button', { name: 'Hide password' });
    expect(hideButton.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(hideButton);
    expect(passwordInput.type).toBe('password');

    // Reveal again, then switch to Create Account tab -> should mask password again
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(passwordInput.type).toBe('text');

    fireEvent.click(screen.getByRole('tab', { name: /Create Account/i }));
    expect(passwordInput.type).toBe('password');
  });
});
