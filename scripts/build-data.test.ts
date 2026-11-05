import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — чистый ES-модуль без типов
import { buildPlacements, parseCsv } from './build-data.lib.mjs';
import committed from '../src/data/bloggers.json';

const HEADER =
  '№,Артикул,Блогер,Площадка,Категория бюджета,Подписчики,Возраст аудитории,Гео аудитории,Охват сторис,Просмотры рилс,"Стоимость размещения, ₽","Себестоимость товара, ₽",Формат рекламы,Статус,Дата рекламы,Ссылка на рекламу,Комментарий';
const ROW =
  '1,DEMO-1,Блогер 001,Telegram,Платное размещение,1000,25–34,РФ 65%,100,300,500,50,Пост,Согласование,2026-11-02,https://example.com/1,"Заметка, с запятой"';
const csv = (...rows: string[]): string => [HEADER, ...rows].join('\n');
const broken = (from: string, to: string): string => csv(ROW.replace(from, to));

describe('parseCsv', () => {
  it('понимает кавычки, запятые внутри полей, экранированные кавычки и переводы строк', () => {
    expect(parseCsv('a,"b,c","d ""e"""\r\n1,2,3\n')).toEqual([
      ['a', 'b,c', 'd "e"'],
      ['1', '2', '3'],
    ]);
    expect(parseCsv('"многострочное\nполе",x')).toEqual([['многострочное\nполе', 'x']]);
  });

  it('пропускает пустые строки, снимает BOM и читает последнюю строку без перевода', () => {
    expect(parseCsv('﻿a,b\n\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
    expect(parseCsv('')).toEqual([]);
  });
});

describe('buildPlacements', () => {
  it('собирает размещения из корректной выгрузки', () => {
    expect(buildPlacements(csv(ROW))).toEqual([
      expect.objectContaining({
        id: 1,
        name: 'Блогер 001',
        platform: 'Telegram',
        cost: 500,
        date: '2026-11-02',
        comment: 'Заметка, с запятой',
      }),
    ]);
  });

  it('строка короче заголовка: недостающий комментарий считается пустым', () => {
    const short = ROW.slice(0, ROW.indexOf(',"Заметка'));
    expect(buildPlacements(csv(short))[0]).toMatchObject({ id: 1, comment: '' });
  });

  it.each([
    ['пустую таблицу', () => buildPlacements(''), 'пуст'],
    ['отсутствующую колонку', () => buildPlacements('№,Артикул\n1,x'), 'нет колонки'],
    [
      'неизвестную площадку',
      () => buildPlacements(broken('Telegram', 'TikTok')),
      'неизвестное значение',
    ],
    [
      'неизвестный статус',
      () => buildPlacements(broken('Согласование', 'Отменено')),
      'неизвестное значение',
    ],
    ['пустое обязательное поле', () => buildPlacements(broken('Блогер 001', '')), 'пустое поле'],
    ['отрицательное число', () => buildPlacements(broken(',500,', ',-5,')), 'ожидалось число'],
    ['нечисловое значение', () => buildPlacements(broken(',1000,', ',много,')), 'ожидалось число'],
    [
      'дату в другом формате',
      () => buildPlacements(broken('2026-11-02', '02.11.2026')),
      'ГГГГ-ММ-ДД',
    ],
    [
      'несуществующую дату',
      () => buildPlacements(broken('2026-11-02', '2026-13-45')),
      'ГГГГ-ММ-ДД',
    ],
    [
      'опасную ссылку',
      () => buildPlacements(broken('https://example.com/1', 'javascript:alert(1)')),
      'http(s)',
    ],
    ['повторяющиеся номера', () => buildPlacements(csv(ROW, ROW)), 'повторяющиеся'],
  ])('отвергает %s', (_name, run, message) => {
    expect(run).toThrow(message);
  });
});

describe('buildPlacements: детали разбора', () => {
  const second = ROW.replace('1,DEMO-1,Блогер 001', '2,DEMO-2,Блогер 002');

  it('BOM снимается только в начале файла', () => {
    expect(parseCsv('\uFEFFa,b')).toEqual([['a', 'b']]);
    expect(parseCsv('a,b\n\uFEFFc')).toEqual([['a', 'b'], ['\uFEFFc']]);
  });

  it('понимает любые переводы строк и не плодит пустые строки', () => {
    expect(parseCsv('a\r\nb\rc\nd')).toEqual([['a'], ['b'], ['c'], ['d']]);
    expect(parseCsv('a,b\n,\n')).toEqual([['a', 'b']]);
  });

  it('обрезает пробелы вокруг значений и понимает числа с пробелами', () => {
    const padded = ROW.replace('Блогер 001', '  Блогер 001  ').replace(',1000,', ', 1 000 ,');
    expect(buildPlacements(csv(padded))[0]).toMatchObject({
      name: 'Блогер 001',
      subscribers: 1000,
    });
    const noComment = csv(ROW.replace(',"Заметка, с запятой"', ',   '));
    expect(buildPlacements(noComment)[0]).toMatchObject({ comment: '' });
  });

  it('ноль допустим в числовых полях', () => {
    expect(buildPlacements(broken(',500,', ',0,'))[0]).toMatchObject({ cost: 0 });
  });

  it('в сообщении об ошибке номер строки считается по файлу (заголовок — первая)', () => {
    expect(() => buildPlacements(csv(ROW, second.replace('Согласование', 'Отменено')))).toThrow(
      'строка 3',
    );
    expect(() => buildPlacements(csv(broken('Telegram', 'TikTok')))).toThrow('строка 2');
  });

  it('дата только «ГГГГ-ММ-ДД»: время и посторонний префикс отвергаются, хотя Date.parse их понимает', () => {
    expect(() => buildPlacements(broken('2026-11-02', '2026-11-02T10:00:00'))).toThrow(
      'ГГГГ-ММ-ДД',
    );
    expect(() => buildPlacements(broken('2026-11-02', '1 2026-11-02'))).toThrow('ГГГГ-ММ-ДД');
  });

  it('дата и ссылка проверяются целиком: ни префикс, ни суффикс не проходят', () => {
    expect(() => buildPlacements(broken('2026-11-02', '2026-11-02x'))).toThrow('ГГГГ-ММ-ДД');
    expect(() => buildPlacements(broken('2026-11-02', 'x2026-11-02'))).toThrow('ГГГГ-ММ-ДД');
    expect(() => buildPlacements(broken('https://example.com/1', 'xhttps://example.com'))).toThrow(
      'http(s)',
    );
    expect(() => buildPlacements(broken('https://example.com/1', 'ftp://example.com'))).toThrow(
      'http(s)',
    );
    expect(buildPlacements(broken('https://example.com/1', 'http://example.com'))[0]).toMatchObject(
      {
        link: 'http://example.com',
      },
    );
    expect(buildPlacements(broken('https://example.com/1', 'HTTPS://EXAMPLE.COM'))).toHaveLength(1);
  });
});

describe('данные в репозитории', () => {
  it('bloggers.json в точности соответствует data/bloggers.csv (запустите npm run data)', () => {
    const fromCsv = buildPlacements(readFileSync('data/bloggers.csv', 'utf8'));
    expect(committed).toEqual(fromCsv);
  });
});
