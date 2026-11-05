import react from '@vitejs/plugin-react';
import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { defineConfig, type Plugin } from 'vitest/config';

/** `npm run build:single` собирает один HTML-файл (для превью без хостинга). */
const single = process.env.SINGLEFILE === '1';

/**
 * Строгая политика безопасности: только свои скрипты, стили и шрифты, никаких
 * внешних запросов, фреймов и форм. На GitHub Pages заголовков нет, поэтому meta.
 * В одно-файловой сборке скрипт встроен в HTML, там политику задаёт хост.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function htmlVariants(): Plugin {
  return {
    name: 'html-variants',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (single) return html.replace(/<script src="\/?\.?\/?theme-init\.js"><\/script>\s*/, '');
        if (!ctx.bundle) return html; // dev-сервер: HMR требует встроенных скриптов
        return html.replace(
          '</title>',
          `</title>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
        );
      },
    },
  };
}

export default defineConfig({
  base: './',
  define: { __PREVIEW__: JSON.stringify(single) },
  plugins: [react(), htmlVariants(), single ? viteSingleFile() : null],
  css: {
    // Современный CSS (light-dark, color-mix) приводится к виду, понятному браузерам из browserslist.
    transformer: 'lightningcss',
    lightningcss: { targets: browserslistToTargets(browserslist()) },
  },
  build: {
    cssMinify: 'lightningcss',
    target: 'es2022',
    outDir: single ? 'dist-single' : 'dist',
    assetsInlineLimit: single ? Number.MAX_SAFE_INTEGER : 0,
    cssCodeSplit: !single,
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/main.tsx',
        'src/**/*.d.ts',
        'src/data/bloggers.json',
      ],
      reporter: ['text-summary', 'text'],
    },
  },
});
