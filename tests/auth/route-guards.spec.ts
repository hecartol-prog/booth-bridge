import { test, expect } from '@playwright/test';
import { gotoApp } from '../helpers/auth';
import { protectedAppPaths } from '../helpers/routes';

test.describe('Route guards', () => {
  for (const path of protectedAppPaths) {
    test(`redirects unauthenticated users from ${path}`, async ({ page }) => {
      await gotoApp(page, path);
      await expect(page).toHaveURL(/\/(login|admin-login)/);
    });
  }

  test('redirects unknown routes to login when unauthenticated', async ({ page }) => {
    await gotoApp(page, '/this-route-does-not-exist');
    await expect(page).toHaveURL(/\/login/);
  });
});
