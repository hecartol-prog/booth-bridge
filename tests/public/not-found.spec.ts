import { test, expect } from '@playwright/test';
import { gotoApp } from '../helpers/auth';

test.describe('404 page', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await gotoApp(page, '/definitely-not-a-real-page');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Authenticated 404', () => {
  test.skip(true, 'Requires authenticated storage state');
});
