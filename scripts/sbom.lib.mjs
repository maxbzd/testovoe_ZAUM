/**
 * Список состава (SBOM) в формате CycloneDX 1.5 для того, что реально попадает в сборку.
 * Встроенная `npm sbom --omit dev` в используемой версии npm теряет часть зависимостей
 * (например, React), поэтому состав строится из package-lock.json.
 */
import { productionPackages } from './check-licenses.lib.mjs';

/** Адрес пакета по спецификации purl: `@` в имени области кодируется. */
export const purl = (name, version) => `pkg:npm/${name.replace(/^@/, '%40')}@${version}`;

export function buildSbom(lock, app) {
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    version: 1,
    metadata: { component: { type: 'application', name: app.name, version: app.version } },
    components: productionPackages(lock).map(({ name, version, license }) => ({
      type: 'library',
      name,
      version,
      purl: purl(name, version),
      licenses: [{ license: { id: license } }],
    })),
  };
}
