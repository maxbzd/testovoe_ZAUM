import { expect, test, type Page } from '@playwright/test';

const isPhone = (page: Page): boolean => (page.viewportSize()?.width ?? 0) < 900;

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} тема`, () => {
    test.use({ colorScheme: scheme });

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Размещения', level: 1 })).toBeVisible();
      await expect(page.locator('.app')).not.toHaveClass(/is-intro/);
    });

    test('главный экран', async ({ page }) => {
      await expect(page).toHaveScreenshot(`main-${scheme}.png`);
    });

    test('карточка размещения', async ({ page }) => {
      const row = isPhone(page) ? page.locator('.item').nth(2) : page.locator('tbody tr').nth(2);
      await row.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.waitForTimeout(400);
      await expect(page).toHaveScreenshot(`drawer-${scheme}.png`);
    });

    test('поиск и команды или фильтры', async ({ page }) => {
      if (isPhone(page)) {
        await page.getByRole('button', { name: /Фильтры и сортировка/ }).click();
      } else {
        await page.keyboard.press('Control+k');
      }
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.waitForTimeout(400);
      await expect(page).toHaveScreenshot(`overlay-${scheme}.png`);
    });
  });
}
