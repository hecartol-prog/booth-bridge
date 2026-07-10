import { test, expect } from '@playwright/test';

test.describe('Legacy route redirects', () => {
  test('redirects /BusinessCard to /business-card', async ({ page }) => {
    await page.goto('/BusinessCard');
    await expect(page).toHaveURL(/\/business-card|\/login/);
  });

  test('redirects /businesscard to /business-card', async ({ page }) => {
    await page.goto('/businesscard');
    await expect(page).toHaveURL(/\/business-card|\/login/);
  });
});
