import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — чистые ES-модули без типов
import { ALLOWED, productionPackages, violations } from './check-licenses.lib.mjs';
// @ts-expect-error — чистые ES-модули без типов
import { BUDGETS, gzipKb, measure, overBudget } from './check-size.lib.mjs';
// @ts-expect-error — чистый ES-модуль без типов
import { buildSbom, purl } from './sbom.lib.mjs';

describe('бюджет размера', () => {
  it('считает размер после gzip и группирует по типу', () => {
    const text = Buffer.from('a'.repeat(50_000));
    expect(gzipKb(text)).toBeLessThan(1);
    const totals = measure([
      { name: 'index-1.js', content: text },
      { name: 'index-2.js', content: text },
      { name: 'index.css', content: text },
      { name: 'font.woff2', content: text },
    ]);
    expect(totals.js).toBeCloseTo(2 * gzipKb(text));
    expect(totals.css).toBeCloseTo(gzipKb(text));
  });

  it('молчит в пределах бюджета и называет превышение', () => {
    expect(overBudget({ js: 90, css: 5 })).toEqual([]);
    expect(overBudget({ js: BUDGETS.js, css: BUDGETS.css })).toEqual([]); // ровно в лимит — допустимо
    expect(overBudget({ js: BUDGETS.js + 1, css: 5 })).toEqual([expect.stringContaining('JS')]);
    expect(overBudget({ js: 1, css: 20 }, { js: 100, css: 10 })).toEqual([
      'CSS: 20.0 КБ при лимите 10 КБ',
    ]);
  });
});

describe('лицензии зависимостей', () => {
  it('разрешённый список: проверенные свободные лицензии', () => {
    expect(ALLOWED).toEqual([
      'MIT',
      'ISC',
      'Apache-2.0',
      'BSD-2-Clause',
      'BSD-3-Clause',
      '0BSD',
      'OFL-1.1',
    ]);
    for (const license of ALLOWED) {
      expect(violations([{ name: 'x', version: '1', license }])).toHaveLength(0);
    }
  });

  const lock = {
    packages: {
      '': { name: 'app' },
      'node_modules/react': { version: '19.0.0', license: 'MIT' },
      'node_modules/@scope/font': { version: '1.0.0', license: 'OFL-1.1' },
      'node_modules/a/node_modules/nested': { version: '2.0.0' },
      'node_modules/tool': { version: '3.0.0', license: 'GPL-3.0', dev: true },
      'node_modules/optional-tool': { version: '3.0.0', license: 'GPL-3.0', devOptional: true },
    },
  };

  it('берёт только то, что попадает в сборку, и находит нарушения', () => {
    const packages = productionPackages(lock);
    expect(packages.map((p: { name: string }) => p.name)).toEqual([
      'react',
      '@scope/font',
      'nested',
    ]);
    expect(violations(packages)).toEqual([
      { name: 'nested', version: '2.0.0', license: 'НЕ УКАЗАНА' },
    ]);
  });

  it('допускает только известные лицензии', () => {
    expect(violations([{ name: 'x', version: '1', license: 'AGPL-3.0' }], ['MIT'])).toHaveLength(1);
    expect(violations([{ name: 'x', version: '1', license: 'MIT' }], ['MIT'])).toHaveLength(0);
  });
});

describe('файл лицензий', () => {
  it('содержит все производственные зависимости из lock-файла (запустите npm run licenses:write)', () => {
    const lockFile = JSON.parse(readFileSync('package-lock.json', 'utf8')) as unknown;
    const text = readFileSync('public/third-party-licenses.txt', 'utf8');
    for (const pkg of productionPackages(lockFile) as { name: string; version: string }[]) {
      expect(text).toContain(`${pkg.name} ${pkg.version}`);
    }
  });
});

describe('SBOM', () => {
  it('purl кодирует область пакета', () => {
    expect(purl('react', '19.0.0')).toBe('pkg:npm/react@19.0.0');
    expect(purl('@fontsource-variable/inter', '5.3.0')).toBe(
      'pkg:npm/%40fontsource-variable/inter@5.3.0',
    );
  });

  it('содержит только производственные зависимости с лицензиями', () => {
    const lock = {
      packages: {
        '': {},
        'node_modules/react': { version: '19.0.0', license: 'MIT' },
        'node_modules/tool': { version: '1.0.0', license: 'GPL-3.0', dev: true },
      },
    };
    expect(buildSbom(lock, { name: 'app', version: '1.2.3' })).toEqual({
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      version: 1,
      metadata: { component: { type: 'application', name: 'app', version: '1.2.3' } },
      components: [
        {
          type: 'library',
          name: 'react',
          version: '19.0.0',
          purl: 'pkg:npm/react@19.0.0',
          licenses: [{ license: { id: 'MIT' } }],
        },
      ],
    });
  });

  it('SBOM репозитория включает React (регрессия: npm sbom его терял)', () => {
    const lockFile = JSON.parse(readFileSync('package-lock.json', 'utf8')) as unknown;
    const names = (
      buildSbom(lockFile, { name: 'x', version: '1' }).components as { name: string }[]
    ).map((c) => c.name);
    expect(names).toEqual(
      expect.arrayContaining(['react', 'react-dom', 'scheduler', '@fontsource-variable/inter']),
    );
  });
});
