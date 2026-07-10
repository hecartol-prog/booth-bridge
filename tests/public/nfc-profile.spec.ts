import { test, expect } from '@playwright/test';
import { waitForAuthBootstrap } from '../helpers/auth';

test.describe('NFC public profile', () => {
  test('loads public NFC profile route without requiring login', async ({ page }) => {
    await page.goto('/nfc/00000000-0000-0000-0000-000000000001');
    await waitForAuthBootstrap(page);

    const onLogin = page.url().includes('/login');
    const hasProfileContent = await page.locator('body').textContent();
    expect(onLogin).toBeFalsy();
    expect(hasProfileContent?.length).toBeGreaterThan(0);
  });
});
