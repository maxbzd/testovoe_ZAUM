import { defineConfig, devices } from '@playwright/test';

/**
 * Скриншотные тесты: защищают внешний вид от случайных поломок.
 * Результат зависит от ОС и шрифтов, поэтому эталоны снимаются в том же окружении (Linux)
 * и в CI не входят. Обновить эталоны: npm run test:visual -- --update-snapshots
 */
const executablePath = process.env['CHROME_PATH'];
const launchOptions = executablePath ? { executablePath } : {};

export default defineConfig({
  testDir: 'e2e-visual',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled' } },
  use: { baseURL: 'http://localhost:4173', reducedMotion: 'reduce' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions },
    },
    { name: 'phone', use: { ...devices['Pixel 7'], launchOptions } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
