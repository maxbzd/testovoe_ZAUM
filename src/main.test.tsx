import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
});

describe('main', () => {
  it('запускает приложение в #root', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await import('./main');
    expect(
      await screen.findByRole('heading', { name: 'Размещения', level: 1 }),
    ).toBeInTheDocument();
  });

  it('понятно падает, если #root нет в странице', async () => {
    await expect(import('./main')).rejects.toThrow('Не найден #root');
  });
});
