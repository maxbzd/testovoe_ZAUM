/**
 * Бюджет размера сборки. Растущий бандл незаметно замедляет телефон, поэтому
 * превышение лимита роняет проверку, а не остаётся «на потом».
 */
import { gzipSync } from 'node:zlib';

/** Лимиты в КБ после gzip (текущие значения: JS около 86, CSS около 7). */
export const BUDGETS = { js: 100, css: 10 };

export const gzipKb = (buffer) => gzipSync(buffer).length / 1024;

/** Группирует файлы сборки по типу и суммирует размер после gzip. */
export function measure(files) {
  const totals = { js: 0, css: 0 };
  for (const { name, content } of files) {
    if (name.endsWith('.js')) totals.js += gzipKb(content);
    else if (name.endsWith('.css')) totals.css += gzipKb(content);
  }
  return totals;
}

/** Возвращает список превышений: пустой список — всё в пределах бюджета. */
export function overBudget(totals, budgets = BUDGETS) {
  return Object.entries(budgets)
    .filter(([kind, limit]) => totals[kind] > limit)
    .map(
      ([kind, limit]) =>
        `${kind.toUpperCase()}: ${totals[kind].toFixed(1)} КБ при лимите ${limit} КБ`,
    );
}
