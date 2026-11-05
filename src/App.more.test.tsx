import type * as CsvModule from './lib/csv';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { sample } from './test/fixtures';
import { mockReducedMotion, resetMedia } from './test/media';

const copyText = vi.hoisted(() => vi.fn());
const downloadCsv = vi.hoisted(() => vi.fn());
vi.mock('./lib/clipboard', () => ({ copyText }));
vi.mock('./lib/csv', async (importOriginal) => ({
  ...(await importOriginal<typeof CsvModule>()),
  downloadCsv,
}));

const names = (): string[] =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getByRole('button', { name: /Блогер/ }).textContent ?? '');

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  window.localStorage.clear();
  copyText.mockReset().mockResolvedValue(true);
  downloadCsv.mockReset().mockReturnValue(true);
});

afterEach(() => resetMedia());

describe('App: действия', () => {
  it('копирует артикул и сообщает об успехе или неудаче', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);
    await user.click(screen.getByRole('button', { name: 'Блогер 003' }));
    await user.click(screen.getByRole('button', { name: /Копировать артикул/ }));
    expect(copyText).toHaveBeenCalledWith('DEMO-103');
    expect(await screen.findByText('Артикул DEMO-103 скопирован')).toBeInTheDocument();

    copyText.mockResolvedValue(false);
    await user.click(screen.getByRole('button', { name: /Копировать артикул/ }));
    expect(await screen.findByText('Не удалось скопировать')).toBeInTheDocument();
  });

  it('экспортирует то, что на экране, и сообщает результат', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);
    await user.click(screen.getByRole('button', { name: /Экспорт CSV/ }));
    expect(downloadCsv).toHaveBeenCalledTimes(1);
    expect(downloadCsv.mock.calls[0]?.[1]).toMatch(/^bloggers-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(await screen.findByText('Выгружено: 4 размещения')).toBeInTheDocument();

    downloadCsv.mockReturnValue(false);
    await user.click(screen.getByRole('button', { name: /Экспорт CSV/ }));
    expect(await screen.findByText('Не удалось создать файл')).toBeInTheDocument();
  });

  it('«Сбросить» в панели и в выпадающем фильтре снимает отбор', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);
    await user.type(screen.getByRole('textbox', { name: /Поиск по блогеру/ }), 'блогер 001');
    expect(names()).toEqual(['Блогер 001']);
    await user.click(screen.getByRole('button', { name: 'Сбросить' }));
    expect(names()).toHaveLength(4);

    await user.click(screen.getByRole('button', { name: 'Площадка', expanded: false }));
    await user.click(screen.getByRole('checkbox', { name: /Telegram/ }));
    await user.click(screen.getByRole('checkbox', { name: /Telegram/ })); // снять обратно
    expect(names()).toHaveLength(4);
    await user.click(screen.getByRole('checkbox', { name: /VK/ }));
    expect(names()).toEqual(['Блогер 002']);
    await user.click(
      within(screen.getByRole('group', { name: 'Площадка' })).getByRole('button', {
        name: 'Сбросить',
      }),
    );
    expect(names()).toHaveLength(4);
  });

  it('повторный клик по заголовку «Дата» разворачивает сортировку', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);
    await user.click(screen.getByRole('button', { name: /^Дата/ }));
    expect(names()).toEqual(['Блогер 004', 'Блогер 001', 'Блогер 003', 'Блогер 002']);
  });

  it('палитра открывается из боковой панели', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);
    await user.click(screen.getByRole('button', { name: /Поиск и команды/ }));
    expect(screen.getByRole('dialog', { name: 'Поиск и команды' })).toBeInTheDocument();
  });

  it('карточка скрытого фильтром блогера: листать нельзя, а кнопки отключены', async () => {
    window.history.replaceState(null, '', '/?open=2&status=approval');
    const user = userEvent.setup();
    render(<App placements={sample} />);
    const dialog = screen.getByRole('dialog', { name: 'Блогер 002' });
    expect(within(dialog).getByRole('button', { name: 'Следующее размещение' })).toBeDisabled();
    await user.keyboard('j');
    expect(screen.getByRole('dialog', { name: 'Блогер 002' })).toBeInTheDocument();
  });

  it('несуществующий номер в адресе не открывает карточку', () => {
    window.history.replaceState(null, '', '/?open=999');
    render(<App placements={sample} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('двойной Esc во время закрытия карточки безопасен', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);
    await user.click(screen.getByRole('button', { name: 'Блогер 003' }));
    await user.keyboard('{Escape}{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('при отключённых анимациях карточка исчезает сразу', async () => {
    mockReducedMotion();
    const user = userEvent.setup();
    render(<App placements={sample} />);
    await user.click(screen.getByRole('button', { name: 'Блогер 003' }));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('вступительная анимация снимается сама', async () => {
    const { container } = render(<App placements={sample} />);
    expect(container.querySelector('.app')).toHaveClass('is-intro');
    await waitFor(() => expect(container.querySelector('.app')).not.toHaveClass('is-intro'), {
      timeout: 3000,
    });
  });

  it('пустые данные не ломают экран', () => {
    render(<App placements={[]} />);
    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();
  });
});
