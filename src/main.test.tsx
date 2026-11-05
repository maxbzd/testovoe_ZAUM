import { act, screen } from '@testing-library/react';
import type * as ReactDomClient from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Запоминаем созданные деревья, чтобы размонтировать их до закрытия тестового окружения.
const roots = vi.hoisted(() => [] as { unmount: () => void }[]);

vi.mock('react-dom/client', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactDomClient>();
  return {
    ...actual,
    createRoot: (...args: Parameters<typeof actual.createRoot>) => {
      const root = actual.createRoot(...args);
      roots.push(root);
      return root;
    },
  };
});

afterEach(async () => {
  await act(async () => {
    roots.splice(0).forEach((root) => {
      root.unmount();
    });
  });
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
