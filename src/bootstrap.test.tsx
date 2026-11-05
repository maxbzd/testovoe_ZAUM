import { act, screen } from '@testing-library/react';
import type { Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from './bootstrap';
import raw from './data/bloggers.json';
import * as load from './data/load';

const roots: Root[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  // Размонтируем деревья: иначе планировщик React доработает после закрытия окружения.
  await act(async () => {
    roots.splice(0).forEach((root) => root.unmount());
  });
  document.body.innerHTML = '';
});

const container = (): HTMLElement => {
  const el = document.createElement('div');
  document.body.append(el);
  return el;
};

const mountTracked = (data: unknown): void => {
  roots.push(mount(container(), data));
};

describe('mount', () => {
  it('запускает приложение с корректными данными', async () => {
    mountTracked(raw);
    expect(
      await screen.findByRole('heading', { name: 'Размещения', level: 1 }),
    ).toBeInTheDocument();
  });

  it('показывает понятное сообщение, если данные сломаны', async () => {
    mountTracked([{ id: 1 }]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Данные не загрузились');
    expect(screen.getByRole('alert')).toHaveTextContent('Размещение #1');
  });

  it('справляется и с необычной ошибкой', async () => {
    vi.spyOn(load, 'parsePlacements').mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- проверяем и такой случай
      throw 'строка вместо ошибки';
    });
    mountTracked([]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Неизвестная ошибка данных');
  });
});
