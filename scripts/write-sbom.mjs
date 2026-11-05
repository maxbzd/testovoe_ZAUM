#!/usr/bin/env node
/** Записывает sbom.cdx.json: npm run sbom */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSbom } from './sbom.lib.mjs';

const root = resolve(import.meta.dirname, '..');
const read = (file) => JSON.parse(readFileSync(resolve(root, file), 'utf8'));
const sbom = buildSbom(read('package-lock.json'), read('package.json'));
writeFileSync(resolve(root, 'sbom.cdx.json'), `${JSON.stringify(sbom, null, 2)}\n`);
console.log(`SBOM: ${sbom.components.length} компонентов → sbom.cdx.json`);
