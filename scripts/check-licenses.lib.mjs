/**
 * Проверка лицензий производственных зависимостей по package-lock.json.
 * Всё, чего нет в списке разрешённых, требует решения человека, а не молчаливого принятия.
 */

export const ALLOWED = [
  'MIT',
  'ISC',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'OFL-1.1',
];

/** Пакеты, которые попадают в сборку (без инструментов разработки). */
export function productionPackages(lock) {
  return Object.entries(lock.packages)
    .filter(([path, pkg]) => path !== '' && !pkg.dev && !pkg.devOptional)
    .map(([path, pkg]) => ({
      name: path.replace(/.*node_modules\//, ''),
      version: pkg.version,
      license: pkg.license ?? 'НЕ УКАЗАНА',
    }));
}

export const violations = (packages, allowed = ALLOWED) =>
  packages.filter((pkg) => !allowed.includes(pkg.license));
