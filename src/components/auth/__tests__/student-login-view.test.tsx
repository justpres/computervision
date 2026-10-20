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

    expect(screen.getByRole('heading', { name: /Study Session Monitor/i })).toBeDefined();
    expect(screen.getByLabelText(/Student Email/i)).toBeDefined();
    expect(screen.getByLabelText(/Password/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Sign in to Study Monitor/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Continue as Guest Tester/i })).toBeDefined();
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

    expect(screen.getByRole('button', { name: /Sign in to Study Monitor/i })).toBeDefined();
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
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign in to Study Monitor/i }));

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
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'badpassword' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign in to Study Monitor/i }));

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

    fireEvent.click(screen.getByRole('button', { name: /Continue as Guest Tester/i }));
    expect(onContinueAsGuest).toHaveBeenCalledTimes(1);
  });
});
