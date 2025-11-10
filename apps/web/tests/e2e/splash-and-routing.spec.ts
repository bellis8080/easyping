/**
 * E2E tests for splash page
 *
 * Test coverage:
 * - Unauthenticated user sees splash page at `/`
 * - Splash page auto-redirects to `/login` after 4 seconds
 * - Splash page displays branding correctly
 * - Splash page is responsive on mobile
 */

import { test, expect } from '@playwright/test';

test.describe('Splash Page', () => {
  test('unauthenticated user sees splash page', async ({ page }) => {
    await page.goto('/');

    // Expect to see "EasyPing" heading
    await expect(page.getByText('EasyPing')).toBeVisible();

    // Expect to see "AI-native service desk" subtitle
    await expect(page.getByText('AI-native service desk')).toBeVisible();

    // Check for Radio icon (lucide-react icon)
    const radioIcon = page.locator('svg.lucide-radio');
    await expect(radioIcon).toBeVisible();
  });

  test('splash page auto-redirects to /login after 4 seconds', async ({
    page,
  }) => {
    await page.goto('/');

    // Wait for auto-redirect (timeout of 5 seconds to account for the 4 second delay + buffer)
    await expect(page).toHaveURL('/login', { timeout: 5000 });
  });

  test('splash page displays branding correctly', async ({ page }) => {
    await page.goto('/');

    // Check that the page has gradient background
    const mainContainer = page.locator(
      'div.min-h-screen.bg-gradient-to-br.from-slate-50.to-blue-50'
    );
    await expect(mainContainer).toBeVisible();

    // Check for animated pulse rings
    const pulseRings = page.locator('div.animate-ping');
    await expect(pulseRings.first()).toBeVisible();
  });

  test('splash page is responsive on mobile', async ({ page }) => {
    // Set viewport to mobile size (iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Expect splash page content to be visible
    await expect(page.getByText('EasyPing')).toBeVisible();
    await expect(page.getByText('AI-native service desk')).toBeVisible();

    // Icon should still be visible on mobile
    const radioIcon = page.locator('svg.lucide-radio');
    await expect(radioIcon).toBeVisible();
  });
});
