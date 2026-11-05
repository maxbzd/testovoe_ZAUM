import { expect, test, type Page } from '@playwright/test';

const isPhone = (page: Page): boolean => (page.viewportSize()?.width ?? 0) < 900;

let problems: string[] = [];

test.beforeEach(async ({ page }) => {
  problems = [];
  page.on('pageerror', (error) => problems.push(error.message));
  // Строгая CSP: любое нарушение (внешний ресурс, inline-скрипт) попадёт сюда.
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Размещения', level: 1 })).toBeVisible();
});

test.afterEach(() => {
  expect(problems).toEqual([]);
});

test('поиск, статус и карточка работают вместе', async ({ page }) => {
  const rows = isPhone(page) ? page.locator('.item') : page.locator('tbody tr');
  await expect(rows).toHaveCount(24);

  await page.getByRole('textbox', { name: /Поиск по блогеру/ }).fill('блогер 01');
  await expect(rows).not.toHaveCount(24);

  await page.getByRole('textbox', { name: /Поиск по блогеру/ }).fill('');
  const status = isPhone(page)
    ? page
        .getByRole('group', { name: 'Статус размещения' })
        .getByRole('button', { name: /Опубликовано/ })
    : page
        .getByRole('navigation', { name: 'Статусы размещений' })
        .getByRole('button', { name: /Опубликовано/ });
  await status.click();
  await expect(rows).toHaveCount(6);

  await rows.first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('состояние попадает в адрес и восстанавливается', async ({ page }) => {
  const status = isPhone(page)
    ? page
        .getByRole('group', { name: 'Статус размещения' })
        .getByRole('button', { name: /Результаты/ })
    : page
        .getByRole('navigation', { name: 'Статусы размещений' })
        .getByRole('button', { name: /Результаты/ });
  await status.click();
  await expect.poll(() => new URL(page.url()).searchParams.get('status')).toBe('results');

  await page.reload();
  const rows = isPhone(page) ? page.locator('.item') : page.locator('tbody tr');
  await expect(rows).toHaveCount(6);
});

test('на телефоне фильтры и сортировка открываются шторкой', async ({ page }) => {
  test.skip(!isPhone(page), 'только телефон');
  await page.getByRole('button', { name: /Фильтры и сортировка/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Фильтры и сортировка' });
  await sheet.getByRole('checkbox', { name: /YouTube/ }).check();
  await sheet.getByRole('radio', { name: 'Стоимость' }).click();
  await sheet.getByRole('button', { name: /Показать 8/ }).click();
  await expect(sheet).toBeHidden();
  await expect(page.locator('.item')).toHaveCount(8);
  await expect(page.getByText('8 из 24 · Стоимость ↓')).toBeVisible();
});

test('на десктопе палитра ⌘K находит блогера', async ({ page }) => {
  test.skip(isPhone(page), 'только десктоп');
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox').fill('блогер 011');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Блогер 011' })).toBeVisible();
  await page.keyboard.press('j');
  await expect(page.getByRole('dialog', { name: 'Блогер 012' })).toBeVisible();
});

test('тема переключается и запоминается', async ({ page }) => {
  await page.getByRole('button', { name: /^Тема: системная/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
