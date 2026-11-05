#!/usr/bin/env node
/** Проверяет размер собранных ресурсов: npm run build && npm run size */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BUDGETS, measure, overBudget } from './check-size.lib.mjs';

const dir = resolve(import.meta.dirname, '../dist/assets');
const files = readdirSync(dir).map((name) => ({ name, content: readFileSync(resolve(dir, name)) }));
const totals = measure(files);

for (const [kind, limit] of Object.entries(BUDGETS)) {
  console.log(
    `${kind.toUpperCase().padEnd(4)} ${totals[kind].toFixed(1).padStart(6)} КБ gzip (лимит ${limit})`,
  );
}
const problems = overBudget(totals);
if (problems.length > 0) {
  console.error(`Бюджет превышен:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
