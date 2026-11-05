/**
 * Разбор и проверка выгрузки таблицы. Только чистые функции, без файлового ввода-вывода:
 * их можно тестировать, а CLI (build-data.mjs) лишь читает и пишет файлы.
 */

export const STATUSES = ['Согласование', 'Запланировано', 'Опубликовано', 'Результаты получены'];
export const PLATFORMS = ['Telegram', 'VK', 'YouTube'];
export const BUDGET_TYPES = ['Платное размещение', 'Бартер'];

/** Минимальный парсер CSV по RFC 4180: кавычки, запятые и переводы строк внутри полей. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');

  const endRow = () => {
    row.push(field);
    field = '';
    if (row.some((cell) => cell !== '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      // «\r\n» даёт два конца строки подряд: пустую строку endRow() отбрасывает.
      endRow();
    } else {
      field += ch;
    }
  }
  endRow(); // последняя строка без перевода в конце; пустая отбрасывается
  return rows;
}

export const COLUMNS = {
  id: '№',
  article: 'Артикул',
  name: 'Блогер',
  platform: 'Площадка',
  budgetType: 'Категория бюджета',
  subscribers: 'Подписчики',
  audienceAge: 'Возраст аудитории',
  audienceGeo: 'Гео аудитории',
  storyReach: 'Охват сторис',
  reelsViews: 'Просмотры рилс',
  cost: 'Стоимость размещения, ₽',
  productCost: 'Себестоимость товара, ₽',
  format: 'Формат рекламы',
  status: 'Статус',
  date: 'Дата рекламы',
  link: 'Ссылка на рекламу',
  comment: 'Комментарий',
};

const fail = (line, message) => {
  throw new Error(`bloggers.csv, строка ${line}: ${message}`);
};

/** Превращает текст CSV в проверенный список размещений. При любой неожиданности бросает ошибку. */
export function buildPlacements(csvText) {
  const [header, ...body] = parseCsv(csvText);
  if (!header) throw new Error('bloggers.csv пуст');

  const index = {};
  for (const [key, title] of Object.entries(COLUMNS)) {
    const at = header.indexOf(title);
    if (at === -1) throw new Error(`В таблице нет колонки «${title}»`);
    index[key] = at;
  }

  const records = body.map((cells, n) => {
    const line = n + 2;
    const get = (key) => (cells[index[key]] ?? '').trim();
    const text = (key) => {
      const value = get(key);
      if (!value) fail(line, `пустое поле «${COLUMNS[key]}»`);
      return value;
    };
    const oneOf = (key, allowed) => {
      const value = text(key);
      if (!allowed.includes(value))
        fail(line, `«${COLUMNS[key]}»: неизвестное значение «${value}»`);
      return value;
    };
    const count = (key) => {
      const value = Number(get(key).replace(/\s/g, ''));
      if (!Number.isFinite(value) || value < 0)
        fail(line, `«${COLUMNS[key]}»: ожидалось число ≥ 0`);
      return value;
    };

    const date = text('date');
    // Stryker disable next-line Regex: Date.parse сам отвергает посторонний префикс, `^` — для ясности
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
      fail(line, `«${COLUMNS.date}»: ожидался формат ГГГГ-ММ-ДД, получено «${date}»`);
    }
    const link = text('link');
    if (!/^https?:\/\//i.test(link)) {
      fail(line, `«${COLUMNS.link}»: допустимы только http(s)-ссылки`);
    }

    return {
      id: count('id'),
      article: text('article'),
      name: text('name'),
      platform: oneOf('platform', PLATFORMS),
      budgetType: oneOf('budgetType', BUDGET_TYPES),
      subscribers: count('subscribers'),
      audienceAge: text('audienceAge'),
      audienceGeo: text('audienceGeo'),
      storyReach: count('storyReach'),
      reelsViews: count('reelsViews'),
      cost: count('cost'),
      productCost: count('productCost'),
      format: text('format'),
      status: oneOf('status', STATUSES),
      date,
      link,
      comment: get('comment'),
    };
  });

  const ids = new Set(records.map((record) => record.id));
  if (ids.size !== records.length) throw new Error('В колонке «№» есть повторяющиеся значения');
  return records;
}
