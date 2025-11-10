/**
 * Unit tests for auth-toasts utility
 *
 * NOTE: These tests require Vitest to be configured.
 * TODO: Install and configure Vitest
 *
 * Test coverage:
 * - First-time user gets "Welcome to EasyPing" message
 * - Returning user gets "Welcome back" message
 * - Agent toast includes appropriate description
 * - Toast duration is 5 seconds
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { showWelcomeToast } from '@/lib/auth-toasts';
import { toast } from 'sonner';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe('showWelcomeToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show first-time user welcome message', () => {
    showWelcomeToast('John Doe', 'Test Org', 'end_user', true);

    expect(toast.success).toHaveBeenCalledWith(
      'Welcome to EasyPing, John Doe!',
      {
        description: 'Test Org Service Desk',
        duration: 5000,
      }
    );
  });

  it('should show returning user welcome back message', () => {
    showWelcomeToast('Jane Smith', 'Test Org', 'end_user', false);

    expect(toast.success).toHaveBeenCalledWith('Welcome back, Jane Smith!', {
      description: 'Test Org Service Desk',
      duration: 5000,
    });
  });

  it('should show agent-specific description', () => {
    showWelcomeToast('Agent Name', 'Test Org', 'agent', false);

    expect(toast.success).toHaveBeenCalledWith('Welcome back, Agent Name!', {
      description: 'Your inbox is ready.',
      duration: 5000,
    });
  });

  it('should show manager-specific description', () => {
    showWelcomeToast('Manager Name', 'Test Org', 'manager', false);

    expect(toast.success).toHaveBeenCalledWith('Welcome back, Manager Name!', {
      description: 'System overview is ready.',
      duration: 5000,
    });
  });

  it('should show owner-specific description', () => {
    showWelcomeToast('Owner Name', 'Test Org', 'owner', false);

    expect(toast.success).toHaveBeenCalledWith('Welcome back, Owner Name!', {
      description: 'System overview is ready.',
      duration: 5000,
    });
  });

  it('should use 5 second duration for all toasts', () => {
    showWelcomeToast('Test User', 'Test Org', 'end_user', false);

    const callArgs = (toast.success as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1]).toEqual({
      description: 'Test Org Service Desk',
      duration: 5000,
    });
  });
});
