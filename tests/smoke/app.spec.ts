import { test, expect } from '@playwright/test';
import { waitForAuthBootstrap } from '../helpers/auth';

test.describe('App shell', () => {
  test('loads the login page with correct document title', async ({ page }) => {
    await page.goto('/login');
    await waitForAuthBootstrap(page);

    await expect(page).toHaveTitle(/Booth Bridge/i);
    await expect(page.locator('#root')).toBeVisible();
  });

  test('serves the web app manifest', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    expect(response?.ok()).toBeTruthy();
  });

  test('has no critical console errors on login page', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/login');
    await waitForAuthBootstrap(page);

    const criticalErrors = errors.filter(
      (message) =>
        !message.includes('ResizeObserver') &&
        !message.includes('Non-Error promise rejection') &&
        !message.includes('VITE_SUPABASE_URL'),
    );
    expect(criticalErrors).toEqual([]);
  });
});
