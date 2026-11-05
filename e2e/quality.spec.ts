import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// axe внедряется в страницу; строгая CSP это блокирует, поэтому только здесь она отключена.
test.use({ bypassCSP: true });

const isPhone = (page: Page): boolean => (page.viewportSize()?.width ?? 0) < 900;

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} тема`, () => {
    test.use({ colorScheme: scheme });

    test('нет нарушений доступности и горизонтальной прокрутки', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Размещения', level: 1 })).toBeVisible();
      // Ждём конца вступительных анимаций: axe не должен мерить полупрозрачные элементы.
      await expect(page.locator('.app')).not.toHaveClass(/is-intro/);

      const scan = () =>
        new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'])
          .analyze();
      const noOverflow = () =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        );

      expect((await scan()).violations).toEqual([]);
      expect(await noOverflow()).toBe(true);

      const first = isPhone(page) ? page.locator('.item').first() : page.locator('tbody tr').nth(2);
      await first.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.waitForTimeout(500);
      expect((await scan()).violations).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();

      await page.keyboard.press('Control+k');
      await expect(page.getByRole('dialog', { name: 'Поиск и команды' })).toBeVisible();
      await page.waitForTimeout(300);
      expect((await scan()).violations).toEqual([]);
    });
  });
}

for (const width of [320, 360, 390, 768, 899, 900, 1024, 1280, 1920]) {
  test(`ширина ${width}px: страница не прокручивается вбок`, async ({ page }) => {
    test.skip(['phone', 'iphone'].includes(test.info().project.name), 'размер задаётся явно');
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Размещения', level: 1 })).toBeVisible();
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(fits).toBe(true);
  });
}
