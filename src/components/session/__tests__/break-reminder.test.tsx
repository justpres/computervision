import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BreakReminder } from '../break-reminder';

describe('BreakReminder Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <BreakReminder
        isOpen={false}
        studyDurationMinutes={45}
        onDismiss={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders gentle reminder dialog and duration when isOpen is true', () => {
    render(
      <BreakReminder
        isOpen={true}
        studyDurationMinutes={45}
        onDismiss={vi.fn()}
        onTakeBreak={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Time for a short break')).toBeDefined();
    expect(
      screen.getByText(/You have been studying for 45 minutes/i)
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Take 5-min break' })
    ).toBeDefined();
  });

  it('invokes callbacks on button clicks', () => {
    const onDismiss = vi.fn();
    const onTakeBreak = vi.fn();

    render(
      <BreakReminder
        isOpen={true}
        studyDurationMinutes={45}
        onDismiss={onDismiss}
        onTakeBreak={onTakeBreak}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Take 5-min break' }));
    expect(onTakeBreak).toHaveBeenCalledTimes(1);
  });

  it('dismisses when Escape key is pressed', () => {
    const onDismiss = vi.fn();

    render(
      <BreakReminder
        isOpen={true}
        studyDurationMinutes={45}
        onDismiss={onDismiss}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
