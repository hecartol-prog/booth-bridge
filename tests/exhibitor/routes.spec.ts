import { test, expect } from '@playwright/test';
import { gotoApp, waitForAuthBootstrap } from '../helpers/auth';
import { exhibitorRoutes } from '../helpers/routes';

test.describe('Exhibitor route smoke', () => {
  for (const route of exhibitorRoutes) {
    test(`loads ${route.path}`, async ({ page }) => {
      await gotoApp(page, route.path);

      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible();
    });
  }
});

test.describe('Exhibitor navigation', () => {
  test('sidebar links navigate to key pages', async ({ page }) => {
    await gotoApp(page, '/');

    const navTargets = [
      { link: /my qr/i, heading: /my qr code/i },
      { link: /^products$/i, heading: /^products$/i },
      { link: /^meetings$/i, heading: /^meetings$/i },
      { link: /^profile$/i, heading: /^profile$/i },
    ];

    for (const target of navTargets) {
      await page.getByRole('link', { name: target.link }).first().click();
      await waitForAuthBootstrap(page);
      await expect(page.getByRole('heading', { name: target.heading }).first()).toBeVisible();
    }
  });
});
