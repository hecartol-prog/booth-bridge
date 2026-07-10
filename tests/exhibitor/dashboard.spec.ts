import { test, expect } from '@playwright/test';
import { waitForAuthBootstrap } from '../helpers/auth';

test.describe('Exhibitor dashboard', () => {
  test('shows dashboard metrics and setup wizard entry point', async ({ page }) => {
    await page.goto('/');
    await waitForAuthBootstrap(page);

    await expect(page.getByRole('heading', { name: /^dashboard$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /setup wizard/i })).toBeVisible();
  });

  test('can open products page from dashboard navigation', async ({ page }) => {
    await page.goto('/');
    await waitForAuthBootstrap(page);

    await page.getByRole('link', { name: /^products$/i }).first().click();
    await expect(page).toHaveURL(/\/products/);
    await expect(page.getByRole('heading', { name: /^products$/i })).toBeVisible();
  });
});
