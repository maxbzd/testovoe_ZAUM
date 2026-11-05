import { describe, expect, it } from 'vitest';
import { DEFAULT_SORT } from './sort';
import { initialState, parseState, serializeState } from './url-state';

describe('url-state', () => {
  it('пустой адрес — состояние по умолчанию', () => {
    expect(parseState('')).toEqual(initialState());
    expect(serializeState(initialState())).toBe('');
  });

  it('читает фильтры, сортировку и открытую карточку', () => {
    const state = parseState('?q=блогер&status=published&platform=telegram,vk&sort=-cost&open=7');
    expect(state.filters).toEqual({
      query: 'блогер',
      status: 'Опубликовано',
      platforms: ['Telegram', 'VK'],
    });
    expect(state.sort).toEqual({ key: 'cost', dir: 'desc' });
    expect(state.openId).toBe(7);
  });

  it('туда и обратно без потерь', () => {
    const state = parseState('?q=demo&status=results&platform=youtube&sort=-storyReach&open=3');
    expect(parseState(serializeState(state))).toEqual(state);
  });

  it('игнорирует мусор в адресе', () => {
    const state = parseState(
      '?status=hack&platform=evil,telegram,telegram&sort=;drop&open=-5&q=' + 'x'.repeat(500),
    );
    expect(state.filters.status).toBeNull();
    expect(state.filters.platforms).toEqual(['Telegram']);
    expect(state.sort).toEqual(DEFAULT_SORT);
    expect(state.openId).toBeNull();
    expect(state.filters.query).toHaveLength(100);
  });
});
