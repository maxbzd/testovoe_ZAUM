import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from './bootstrap';
import raw from './data/bloggers.json';
import * as load from './data/load';

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

const container = (): HTMLElement => {
  const el = document.createElement('div');
  document.body.append(el);
  return el;
};

describe('mount', () => {
  it('запускает приложение с корректными данными', async () => {
    mount(container(), raw);
    expect(
      await screen.findByRole('heading', { name: 'Размещения', level: 1 }),
    ).toBeInTheDocument();
  });

  it('показывает понятное сообщение, если данные сломаны', async () => {
    mount(container(), [{ id: 1 }]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Данные не загрузились');
    expect(screen.getByRole('alert')).toHaveTextContent('Размещение #1');
  });

  it('справляется и с необычной ошибкой', async () => {
    vi.spyOn(load, 'parsePlacements').mockImplementation(() => {
      throw 'строка вместо ошибки';
    });
    mount(container(), []);
    expect(await screen.findByRole('alert')).toHaveTextContent('Неизвестная ошибка данных');
  });
});
