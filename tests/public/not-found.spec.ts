import { test, expect } from '@playwright/test';
import { waitForAuthBootstrap } from '../helpers/auth';

test.describe('404 page', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/definitely-not-a-real-page');
    await waitForAuthBootstrap(page);
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Authenticated 404', () => {
  test.skip(true, 'Requires authenticated storage state');
});
