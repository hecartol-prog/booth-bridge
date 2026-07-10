import { test, expect } from '@playwright/test';
import { waitForAuthBootstrap } from '../helpers/auth';
import { adminRoutes } from '../helpers/routes';

test.describe('Admin route smoke', () => {
  for (const route of adminRoutes) {
    test(`loads ${route.path}`, async ({ page }) => {
      await page.goto(route.path);
      await waitForAuthBootstrap(page);

      await expect(page).not.toHaveURL(/\/admin-login/);
      await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible();
    });
  }
});

test.describe('Admin navigation', () => {
  test('sidebar navigates between operational sections', async ({ page }) => {
    await page.goto('/admin');
    await waitForAuthBootstrap(page);

    const sections = [
      { link: /^users$/i, heading: /user management/i },
      { link: /^events$/i, heading: /event management/i },
      { link: /^settings$/i, heading: /system settings/i },
    ];

    for (const section of sections) {
      await page.getByRole('link', { name: section.link }).click();
      await waitForAuthBootstrap(page);
      await expect(page.getByRole('heading', { name: section.heading }).first()).toBeVisible();
    }
  });
});
