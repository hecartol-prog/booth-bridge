import { test, expect } from '@playwright/test';
import { gotoPath } from '../helpers/auth';

test.describe('Legacy route redirects', () => {
  test('redirects /BusinessCard to /business-card', async ({ page }) => {
    await gotoPath(page, '/BusinessCard');
    await expect(page).toHaveURL(/\/business-card|\/login/);
  });

  test('redirects /businesscard to /business-card', async ({ page }) => {
    await gotoPath(page, '/businesscard');
    await expect(page).toHaveURL(/\/business-card|\/login/);
  });
});
