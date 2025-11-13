import { test, expect } from '@playwright/test';

test.describe('Ping Status Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as agent
    await page.goto('http://localhost:4000/auth/login');
    await page.fill('input[type="email"]', 'agent@test.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/inbox');
  });

  test('Agent sends first reply to New ping → Status changes to In Progress', async ({
    page,
  }) => {
    // Create a new ping as end user first
    // (This would require switching to end user or using API)
    // For now, select first New ping
    await page.click('[data-testid="ping-list-item"]:has-text("New")');

    // Get the current status
    const statusDropdown = page.locator('select[value="new"]');
    await expect(statusDropdown).toBeVisible();

    // Send a message as agent
    await page.fill(
      'textarea[placeholder*="reply"]',
      'Hello, I am working on this issue now.'
    );
    await page.click('button:has-text("Send")');

    // Wait for status to update to in_progress
    await expect(statusDropdown).toHaveValue('in_progress');

    // Check for system message
    await expect(
      page.locator('text=/started working on this ping/')
    ).toBeVisible();
  });

  test('System message created when agent starts working on ping', async ({
    page,
  }) => {
    // Select a New ping
    await page.click('[data-testid="ping-list-item"]:has-text("New")');

    // Send first reply
    await page.fill('textarea[placeholder*="reply"]', 'Starting work on this.');
    await page.click('button:has-text("Send")');

    // Verify system message appears
    await expect(
      page.locator(
        '[data-message-type="system"]:has-text("started working on this ping")'
      )
    ).toBeVisible();
  });

  test('Agent manually changes status using dropdown in inbox', async ({
    page,
  }) => {
    // Select any ping
    await page.click('[data-testid="ping-list-item"]').first();

    // Get the status dropdown
    const statusDropdown = page.locator('select[class*="status"]');
    const initialStatus = await statusDropdown.inputValue();

    // Change status to waiting_on_user
    await statusDropdown.selectOption('waiting_on_user');

    // Verify status changed
    await expect(statusDropdown).toHaveValue('waiting_on_user');

    // Verify different from initial
    expect(initialStatus).not.toBe('waiting_on_user');
  });

  test('Dropdown shows all 5 status options', async ({ page }) => {
    // Select any ping
    await page.click('[data-testid="ping-list-item"]').first();

    // Get the status dropdown
    const statusDropdown = page.locator('select[class*="status"]');

    // Verify all options exist
    await expect(statusDropdown.locator('option[value="new"]')).toBeVisible();
    await expect(
      statusDropdown.locator('option[value="in_progress"]')
    ).toBeVisible();
    await expect(
      statusDropdown.locator('option[value="waiting_on_user"]')
    ).toBeVisible();
    await expect(
      statusDropdown.locator('option[value="resolved"]')
    ).toBeVisible();
    await expect(
      statusDropdown.locator('option[value="closed"]')
    ).toBeVisible();
  });

  test('Agent manually changes status to Waiting on User', async ({ page }) => {
    // Select an in_progress ping
    await page.click('[data-testid="ping-list-item"]:has-text("In Progress")');

    // Change to waiting_on_user
    await page
      .locator('select[class*="status"]')
      .selectOption('waiting_on_user');

    // Wait for success toast
    await expect(
      page.locator('text=/Status changed to Waiting on User/')
    ).toBeVisible();

    // Verify system message
    await expect(
      page.locator('text=/is waiting for.*to respond/')
    ).toBeVisible();
  });

  test('System message created when waiting on user', async ({ page }) => {
    // Select an in_progress ping
    await page.click('[data-testid="ping-list-item"]:has-text("In Progress")');

    // Change to waiting_on_user
    await page
      .locator('select[class*="status"]')
      .selectOption('waiting_on_user');

    // Check system message
    await expect(
      page.locator('[data-message-type="system"]:has-text("is waiting for")')
    ).toBeVisible();
  });

  test('User replies to Waiting on User ping → Status changes to In Progress', async ({
    page,
  }) => {
    // This test requires logging in as end user
    // Would need to implement user context switching or use API
    test.skip();
  });

  test('Agent manually changes status to Resolved', async ({ page }) => {
    // Select any active ping
    await page.click('[data-testid="ping-list-item"]').first();

    // Change to resolved
    await page.locator('select[class*="status"]').selectOption('resolved');

    // Wait for success toast
    await expect(
      page.locator('text=/Status changed to Resolved/')
    ).toBeVisible();

    // Verify system message
    await expect(
      page.locator('text=/changed status to Resolved/')
    ).toBeVisible();
  });

  test('System message created when status changed to Resolved', async ({
    page,
  }) => {
    // Select an active ping
    await page.click('[data-testid="ping-list-item"]').first();

    // Change to resolved
    await page.locator('select[class*="status"]').selectOption('resolved');

    // Check system message
    await expect(
      page.locator(
        '[data-message-type="system"]:has-text("changed status to Resolved")'
      )
    ).toBeVisible();
  });

  test('Status filter tabs work correctly in My Pings view', async ({
    page,
  }) => {
    // Navigate to My Pings
    await page.goto('http://localhost:4000/my-pings');

    // Check All tab (default)
    await expect(page.locator('button:has-text("All")')).toHaveClass(
      /text-blue-400/
    );

    // Click Active tab
    await page.click('button:has-text("Active")');

    // Verify Active pings shown (New, In Progress, Waiting on User)
    const pings = page.locator('[data-testid="ping-list-item"]');
    const count = await pings.count();

    for (let i = 0; i < count; i++) {
      const ping = pings.nth(i);
      const status = await ping.getAttribute('data-status');
      expect(['new', 'in_progress', 'waiting_on_user']).toContain(status);
    }
  });

  test('Closed pings appear only in Closed filter tab', async ({ page }) => {
    // Navigate to My Pings
    await page.goto('http://localhost:4000/my-pings');

    // Click Closed tab
    await page.click('button:has-text("Closed")');

    // Verify only closed pings shown
    const pings = page.locator('[data-testid="ping-list-item"]');
    const count = await pings.count();

    for (let i = 0; i < count; i++) {
      const ping = pings.nth(i);
      const status = await ping.getAttribute('data-status');
      expect(status).toBe('closed');
    }
  });

  test('Status badges display with correct colors and icons', async ({
    page,
  }) => {
    // Navigate to My Pings
    await page.goto('http://localhost:4000/my-pings');

    // Check for status indicators
    await expect(
      page.locator('[data-testid="status-indicator"]:has-text("New")')
    ).toBeVisible();

    // Verify icon and color classes exist (via CSS classes)
    const newIndicator = page.locator(
      '[data-testid="status-indicator"]:has-text("New")'
    );
    await expect(newIndicator).toHaveClass(/text-purple-500/);
  });

  test('Real-time status update appears for other users', async ({
    page,
    context,
  }) => {
    // Open second browser context (simulating another agent)
    const page2 = await context.newPage();

    // Login second agent
    await page2.goto('http://localhost:4000/auth/login');
    await page2.fill('input[type="email"]', 'agent2@test.com');
    await page2.fill('input[type="password"]', 'testpassword');
    await page2.click('button[type="submit"]');
    await page2.waitForURL('**/inbox');

    // Both agents select same ping
    await page.click('[data-testid="ping-list-item"]').first();
    const pingTitle = await page.locator('h4').first().textContent();

    await page2.click(
      `[data-testid="ping-list-item"]:has-text("${pingTitle}")`
    );

    // Agent 1 changes status
    await page.locator('select[class*="status"]').selectOption('resolved');

    // Verify Agent 2 sees the update in real-time
    await expect(page2.locator('select[class*="status"]')).toHaveValue(
      'resolved',
      { timeout: 5000 }
    );

    await page2.close();
  });
});
