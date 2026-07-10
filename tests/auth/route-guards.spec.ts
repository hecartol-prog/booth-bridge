import { test, expect } from '@playwright/test';
import { waitForAuthBootstrap } from '../helpers/auth';
import { protectedAppPaths } from '../helpers/routes';

test.describe('Route guards', () => {
  for (const path of protectedAppPaths) {
    test(`redirects unauthenticated users from ${path}`, async ({ page }) => {
      await page.goto(path);
      await waitForAuthBootstrap(page);
      await expect(page).toHaveURL(/\/(login|admin-login)/);
    });
  }

  test('redirects unknown routes to login when unauthenticated', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await waitForAuthBootstrap(page);
    await expect(page).toHaveURL(/\/login/);
  });
});
