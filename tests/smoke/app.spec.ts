import { test, expect } from '@playwright/test';
import { gotoApp, gotoPath } from '../helpers/auth';

test.describe('App shell', () => {
  test('loads the login page with correct document title', async ({ page }) => {
    await gotoApp(page, '/login');

    await expect(page).toHaveTitle(/Booth Bridge/i);
    await expect(page.locator('#root')).toBeVisible();
  });

  test('serves the web app manifest', async ({ page }) => {
    const response = await gotoPath(page, '/manifest.json');
    expect(response?.ok()).toBeTruthy();
  });

  test('has no critical console errors on login page', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await gotoApp(page, '/login');

    const criticalErrors = errors.filter(
      (message) =>
        !message.includes('ResizeObserver') &&
        !message.includes('Non-Error promise rejection') &&
        !message.includes('VITE_SUPABASE_URL'),
    );
    expect(criticalErrors).toEqual([]);
  });
});
