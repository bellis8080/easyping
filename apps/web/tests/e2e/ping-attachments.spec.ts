import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * E2E tests for ping attachments feature
 *
 * Test coverage per QA requirements:
 * 1. User can click attachment button and select files
 * 2. Selected files display in preview list
 * 3. User can remove selected files before upload
 * 4. Upload progress indicator appears during upload
 * 5. Message with attachments appears in conversation thread
 * 6. Image attachments display inline thumbnails
 * 7. Clicking image thumbnail opens lightbox
 * 8. Non-image attachments show download link
 * 9. Clicking download link initiates file download
 * 10. Validation error shown for files exceeding 10MB
 * 11. Validation error shown for more than 5 files
 * 12. Attachments appear in real-time for other users
 */

test.describe('Ping Attachments', () => {
  // Setup: Login before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Fill in login credentials
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL('/pings');
  });

  test('should allow user to click attachment button and select files', async ({
    page,
  }) => {
    // Navigate to a ping detail page
    await page.goto('/pings/1');

    // Find the attachment button (paperclip icon)
    const attachmentButton = page.locator('button[type="button"]', {
      has: page.locator('svg'),
    });

    // Click the attachment button
    await attachmentButton.click();

    // File picker should open (we can't directly test native file picker,
    // but we can verify the input is triggered)
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });

  test('should display selected files in preview list', async ({ page }) => {
    // Navigate to ping detail
    await page.goto('/pings/1');

    // Create test file path
    const testImagePath = path.join(__dirname, '../fixtures/test-image.png');

    // Upload file via file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    // File preview should appear
    await expect(page.getByText('test-image.png')).toBeVisible();
  });

  test('should allow user to remove selected files before upload', async ({
    page,
  }) => {
    await page.goto('/pings/1');

    const testImagePath = path.join(__dirname, '../fixtures/test-image.png');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    // File should appear
    await expect(page.getByText('test-image.png')).toBeVisible();

    // Click remove button
    const removeButton = page
      .locator('button[aria-label="Remove file"]')
      .first();
    await removeButton.click();

    // File should be removed
    await expect(page.getByText('test-image.png')).not.toBeVisible();
  });

  test('should show message with attachments in conversation thread', async ({
    page,
  }) => {
    await page.goto('/pings/1');

    const testImagePath = path.join(__dirname, '../fixtures/test-image.png');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    // Type a message
    await page.fill('textarea[placeholder*="Type"]', 'Message with attachment');

    // Send the message
    await page.click('button[type="submit"]');

    // Message should appear with attachment
    await expect(page.getByText('Message with attachment')).toBeVisible();
    await expect(page.locator('img[alt="test-image.png"]')).toBeVisible();
  });

  test('should display image attachments as inline thumbnails', async ({
    page,
  }) => {
    await page.goto('/pings/1');

    const testImagePath = path.join(__dirname, '../fixtures/test-image.png');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    await page.fill('textarea', 'Image test');
    await page.click('button[type="submit"]');

    // Image thumbnail should be visible
    const imageThumbnail = page.locator('img[alt="test-image.png"]');
    await expect(imageThumbnail).toBeVisible();

    // Should have appropriate size constraints
    const boundingBox = await imageThumbnail.boundingBox();
    expect(boundingBox).toBeTruthy();
    if (boundingBox) {
      expect(boundingBox.width).toBeLessThanOrEqual(400);
    }
  });

  test('should open lightbox when clicking image thumbnail', async ({
    page,
  }) => {
    await page.goto('/pings/1');

    const testImagePath = path.join(__dirname, '../fixtures/test-image.png');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    await page.fill('textarea', 'Image test');
    await page.click('button[type="submit"]');

    // Wait for image to appear
    const imageThumbnail = page.locator('img[alt="test-image.png"]');
    await expect(imageThumbnail).toBeVisible();

    // Click the thumbnail
    await imageThumbnail.click();

    // Lightbox dialog should open
    const lightbox = page.locator('[role="dialog"]');
    await expect(lightbox).toBeVisible();

    // Dialog should contain the image filename
    await expect(lightbox.getByText('test-image.png')).toBeVisible();
  });

  test('should show download link for non-image attachments', async ({
    page,
  }) => {
    await page.goto('/pings/1');

    const testPdfPath = path.join(__dirname, '../fixtures/test-document.pdf');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdfPath);

    await page.fill('textarea', 'PDF test');
    await page.click('button[type="submit"]');

    // PDF should show file name and download button
    await expect(page.getByText('test-document.pdf')).toBeVisible();
    const downloadButton = page.locator('button', { hasText: /download/i });
    await expect(downloadButton).toBeVisible();
  });

  test('should initiate download when clicking download link', async ({
    page,
  }) => {
    await page.goto('/pings/1');

    const testPdfPath = path.join(__dirname, '../fixtures/test-document.pdf');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdfPath);

    await page.fill('textarea', 'PDF test');
    await page.click('button[type="submit"]');

    // Wait for download button
    const downloadButton = page.locator('button', { hasText: /download/i });
    await expect(downloadButton).toBeVisible();

    // Listen for new tab/window (download triggers window.open)
    const popupPromise = page.waitForEvent('popup');
    await downloadButton.click();

    const popup = await popupPromise;
    expect(popup.url()).toContain('supabase');
  });

  test('should show validation error for files exceeding 10MB', async ({
    page,
  }) => {
    await page.goto('/pings/1');

    // Create a large file (>10MB) - this is simulation only
    // In real E2E tests, you'd need an actual large file
    const largeFilePath = path.join(__dirname, '../fixtures/large-file.bin');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(largeFilePath);

    // Toast error should appear
    await expect(page.getByText(/exceeds.*10MB limit/i)).toBeVisible();
  });

  test('should show validation error for more than 5 files', async ({
    page,
  }) => {
    await page.goto('/pings/1');

    // Try to upload 6 files
    const files = Array.from({ length: 6 }, (_, i) =>
      path.join(__dirname, `../fixtures/file${i}.png`)
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(files);

    // Toast error should appear
    await expect(page.getByText(/Maximum 5 files per message/i)).toBeVisible();
  });

  test('should show attachments in real-time for other users (simulation)', async ({
    browser,
  }) => {
    // Create two contexts (simulating two users)
    const userAContext = await browser.newContext();
    const userBContext = await browser.newContext();

    const userAPage = await userAContext.newPage();
    const userBPage = await userBContext.newPage();

    // Login as User A
    await userAPage.goto('/login');
    await userAPage.fill('input[name="email"]', 'userA@example.com');
    await userAPage.fill('input[name="password"]', 'password123');
    await userAPage.click('button[type="submit"]');
    await userAPage.waitForURL('/pings');

    // Login as User B (agent)
    await userBPage.goto('/login');
    await userBPage.fill('input[name="email"]', 'agent@example.com');
    await userBPage.fill('input[name="password"]', 'password123');
    await userBPage.click('button[type="submit"]');
    await userBPage.waitForURL('/inbox');

    // User A creates a ping with attachment
    await userAPage.goto('/pings/new');
    const testImagePath = path.join(__dirname, '../fixtures/test-image.png');
    const fileInput = userAPage.locator('input[type="file"]');
    await fileInput.setInputFiles(testImagePath);

    await userAPage.fill('textarea', 'Help request with screenshot');
    await userAPage.click('button[type="submit"]');

    // User B should see the new ping with attachment in real-time
    await userBPage.waitForSelector('text=Help request with screenshot', {
      timeout: 5000,
    });
    await expect(userBPage.locator('img[alt="test-image.png"]')).toBeVisible();

    // Cleanup
    await userAContext.close();
    await userBContext.close();
  });
});
