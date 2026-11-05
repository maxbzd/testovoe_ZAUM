#!/usr/bin/env node
/**
 * Превращает data/bloggers.csv (выгрузка из Google-таблицы) в src/data/bloggers.json.
 * Данные проверяются: при любой неожиданности скрипт падает с понятным сообщением,
 * чтобы в сервис не попал мусор.
 *
 *   npm run data
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPlacements } from './build-data.lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(root, 'data/bloggers.csv');
const TARGET = resolve(root, 'src/data/bloggers.json');

const records = buildPlacements(readFileSync(SOURCE, 'utf8'));
writeFileSync(TARGET, `${JSON.stringify(records, null, 2)}\n`);
console.log(`Готово: ${records.length} размещений → ${TARGET.replace(`${root}/`, '')}`);
