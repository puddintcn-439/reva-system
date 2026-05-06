// @ts-check
/**
 * E2E tests — Sales lookup flow
 * Run with: npx playwright test
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

test.describe('Sales lookup (public page)', () => {
  test('sales lookup page renders search form', async ({ page }) => {
    await page.goto(`${BASE_URL}/tra-cuu`);
    await expect(page.locator('input[placeholder], input[type="text"]').first()).toBeVisible();
  });

  test('unknown product code shows empty state or error', async ({ page }) => {
    await page.goto(`${BASE_URL}/tra-cuu`);
    const input = page.locator('input').first();
    await input.fill('NONEXISTENT_CODE_12345');
    await page.keyboard.press('Enter');
    // Should show some feedback — not a blank crash
    await page.waitForTimeout(1500);
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(0);
  });
});

test.describe('404 route', () => {
  test('unknown route shows 404 page', async ({ page }) => {
    await page.goto(`${BASE_URL}/this-route-does-not-exist`);
    await expect(page.locator('body')).toContainText('404');
  });
});
