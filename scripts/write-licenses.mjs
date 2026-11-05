#!/usr/bin/env node
/**
 * Собирает тексты лицензий производственных зависимостей в public/third-party-licenses.txt.
 * Лицензия шрифта Inter (OFL) требует прикладывать её текст к распространяемым файлам.
 *
 *   npm run licenses:write
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { productionPackages } from './check-licenses.lib.mjs';

const root = resolve(import.meta.dirname, '..');
const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'));

const sections = productionPackages(lock).map(({ name, version, license }) => {
  const file = resolve(root, 'node_modules', name, 'LICENSE');
  const text = existsSync(file) ? readFileSync(file, 'utf8').trim() : '(текст лицензии не найден)';
  return `${'='.repeat(72)}\n${name} ${version} — ${license}\n${'='.repeat(72)}\n\n${text}\n`;
});

const header =
  'Лицензии сторонних компонентов, входящих в сборку.\n' +
  'Собрано автоматически: npm run licenses:write\n\n';
writeFileSync(resolve(root, 'public/third-party-licenses.txt'), header + sections.join('\n'));
console.log(`Записано лицензий: ${sections.length}`);
