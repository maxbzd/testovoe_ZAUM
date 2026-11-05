import { defineConfig, devices } from '@playwright/test';

/**
 * Сквозные проверки в настоящем браузере: сценарии, доступность (axe) и
 * отсутствие горизонтальной прокрутки на разных экранах и в обеих темах.
 *
 * Локально можно указать уже установленный Chromium: CHROME_PATH=/путь/к/chrome npm run test:e2e
 */
const executablePath = process.env.CHROME_PATH;
const launchOptions = executablePath ? { executablePath } : {};

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions },
    },
    {
      name: 'phone',
      use: { ...devices['Pixel 7'], launchOptions },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
