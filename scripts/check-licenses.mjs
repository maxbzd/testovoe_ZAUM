#!/usr/bin/env node
/** Проверяет лицензии зависимостей: npm run licenses */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { productionPackages, violations } from './check-licenses.lib.mjs';

const lock = JSON.parse(readFileSync(resolve(import.meta.dirname, '../package-lock.json'), 'utf8'));
const packages = productionPackages(lock);
for (const pkg of packages) console.log(`${pkg.name}@${pkg.version}  ${pkg.license}`);

const bad = violations(packages);
if (bad.length > 0) {
  console.error(
    `Недопустимые лицензии:\n  ${bad.map((p) => `${p.name}: ${p.license}`).join('\n  ')}`,
  );
  process.exit(1);
}
console.log(`Проверено пакетов: ${packages.length}, все лицензии допустимы.`);
