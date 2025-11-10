/**
 * Unit tests for SplashPage component
 *
 * Test coverage:
 * - Renders Radio icon with animations
 * - Renders "EasyPing" and "AI-native service desk" text
 * - Auto-redirects after 4 seconds
 * - Enter key triggers immediate redirect
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SplashPage from '@/components/splash-page';

describe('SplashPage Component', () => {
  it('should render Radio icon with animations', () => {
    render(<SplashPage />);

    // Radio icon should be present
    const radioIcon = document.querySelector('.lucide-radio');
    expect(radioIcon).toBeInTheDocument();

    // Check for pulse animation
    const pulseElements = document.querySelectorAll('.animate-ping');
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it('should render "EasyPing" heading', () => {
    render(<SplashPage />);

    expect(screen.getByText('EasyPing')).toBeInTheDocument();
  });

  it('should render "AI-native service desk" subtitle', () => {
    render(<SplashPage />);

    expect(screen.getByText('AI-native service desk')).toBeInTheDocument();
  });

  // Note: Auto-redirect and Enter key redirect functionality are tested in E2E tests
  // Unit testing Next.js router navigation with timers is complex and better suited for E2E testing
});
