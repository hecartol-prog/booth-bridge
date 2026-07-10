import { test, expect } from '@playwright/test';
import { waitForAuthBootstrap } from '../helpers/auth';
import { buyerRoutes } from '../helpers/routes';

test.describe('Buyer route smoke', () => {
  for (const route of buyerRoutes) {
    test(`loads ${route.path}`, async ({ page }) => {
      await page.goto(route.path);
      await waitForAuthBootstrap(page);

      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible();
    });
  }
});

test.describe('Buyer navigation', () => {
  test('primary capture CTAs are visible on dashboard', async ({ page }) => {
    await page.goto('/');
    await waitForAuthBootstrap(page);

    await expect(page.getByText('QR Scan')).toBeVisible();
    await expect(page.getByText('NFC Tap')).toBeVisible();
    await expect(page.getByText('OCR Scan')).toBeVisible();
  });

  test('sidebar navigates to saved booths', async ({ page }) => {
    await page.goto('/');
    await waitForAuthBootstrap(page);

    await page.getByRole('link', { name: /saved booths/i }).first().click();
    await expect(page).toHaveURL(/\/saved-booths/);
    await expect(page.getByRole('heading', { name: /saved booths/i })).toBeVisible();
  });
});
