import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Compliance', () => {
  test('splash page should have no accessibility violations', async ({
    page,
  }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('login page should have no accessibility violations', async ({
    page,
  }) => {
    // First navigate to splash and wait for redirect
    await page.goto('/');
    await expect(page).toHaveURL('/login', { timeout: 5000 });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('splash page animated logo should have accessible attributes', async ({
    page,
  }) => {
    await page.goto('/');

    // Check that animated Radio icon has proper ARIA or is decorative
    const radioIcon = page.locator('svg.lucide-radio');
    await expect(radioIcon).toBeVisible();

    // Icons from lucide-react are decorative by default (aria-hidden="true")
    // Or should have aria-label if they convey meaning
    const ariaHidden = await radioIcon.getAttribute('aria-hidden');
    const ariaLabel = await radioIcon.getAttribute('aria-label');

    // Icon should either be hidden from assistive tech or have a label
    expect(ariaHidden === 'true' || ariaLabel !== null).toBe(true);
  });

  test('color contrast meets WCAG AA standards', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();

    // Filter for color contrast violations
    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'color-contrast'
    );

    expect(contrastViolations).toEqual([]);
  });
});
