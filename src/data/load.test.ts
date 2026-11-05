import { describe, expect, it } from 'vitest';
import raw from './bloggers.json';
import { parsePlacements } from './load';

describe('parsePlacements', () => {
  it('принимает данные из таблицы', () => {
    const placements = parsePlacements(raw);
    expect(placements).toHaveLength(24);
    expect(placements[0]).toMatchObject({ name: 'Блогер 001', platform: 'Telegram', cost: 6300 });
  });

  it('все ссылки в данных — http(s)', () => {
    for (const item of parsePlacements(raw)) expect(item.link).toMatch(/^https?:\/\//);
  });

  it('падает с понятным сообщением на сломанных данных', () => {
    expect(() => parsePlacements({})).toThrow('списком');
    expect(() => parsePlacements([null])).toThrow('Размещение #1');
    expect(() => parsePlacements([{ ...raw[0], platform: 'TikTok' }])).toThrow('площадка');
    expect(() => parsePlacements([{ ...raw[0], status: 'Другое' }])).toThrow('статус');
    expect(() => parsePlacements([{ ...raw[0], cost: -1 }])).toThrow('cost');
  });
});
