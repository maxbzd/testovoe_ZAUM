import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { sample } from './test/fixtures';

const rowNames = (): string[] =>
  screen
    .getAllByRole('row')
    .slice(1) // без заголовка
    .map((row) => within(row).getByRole('button', { name: /Блогер/ }).textContent ?? '');

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('App', () => {
  it('показывает все размещения и показатели', () => {
    render(<App placements={sample} />);
    expect(rowNames()).toEqual(['Блогер 002', 'Блогер 003', 'Блогер 001', 'Блогер 004']); // по дате
    expect(screen.getByText('Платный бюджет')).toBeInTheDocument();
    expect(screen.getByText('4 из 4')).toBeInTheDocument();
  });

  it('ищет по тексту и сообщает, если ничего нет', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);
    await user.type(screen.getByRole('textbox', { name: /Поиск по блогеру/ }), 'проверить');
    expect(rowNames()).toEqual(['Блогер 002']);

    await user.clear(screen.getByRole('textbox', { name: /Поиск по блогеру/ }));
    await user.type(screen.getByRole('textbox', { name: /Поиск по блогеру/ }), 'zzzz');
    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Сбросить фильтры' }));
    expect(rowNames()).toHaveLength(4);
  });

  it('фильтрует по статусу из боковой панели и запоминает в адресе', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);
    await user.click(screen.getByRole('button', { name: /Опубликовано/ }));
    expect(rowNames()).toEqual(['Блогер 002']);
    await waitFor(() => expect(window.location.search).toBe('?status=published'));
  });

  it('фильтрует по площадке через меню', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);
    await user.click(screen.getByRole('button', { name: 'Площадка', expanded: false }));
    await user.click(screen.getByRole('checkbox', { name: /Telegram/ }));
    expect(rowNames()).toEqual(['Блогер 001', 'Блогер 004']);
    await waitFor(() => expect(window.location.search).toContain('platform=telegram'));
  });

  it('сортирует по клику на заголовок и переворачивает порядок', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);
    await user.click(screen.getByRole('button', { name: /^Стоимость/ }));
    expect(rowNames()).toEqual(['Блогер 004', 'Блогер 003', 'Блогер 002', 'Блогер 001']);
    await user.click(screen.getByRole('button', { name: /^Стоимость/ }));
    expect(rowNames()).toEqual(['Блогер 001', 'Блогер 002', 'Блогер 003', 'Блогер 004']);
    expect(screen.getByRole('columnheader', { name: /Стоимость/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('открывает карточку, листает клавишами и закрывает по Esc', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);
    await user.click(screen.getByRole('button', { name: 'Блогер 003' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Блогер 003' })).toBeInTheDocument();
    await waitFor(() => expect(window.location.search).toBe('?open=3'));

    await user.keyboard('j');
    expect(
      within(screen.getByRole('dialog')).getByRole('heading', { name: 'Блогер 001' }),
    ).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('безопасно показывает ссылку: опасные адреса не попадают в href', async () => {
    const user = userEvent.setup();
    const evil = [{ ...sample[0]!, id: 9, name: 'Блогер 009', link: 'javascript:alert(1)' }];
    render(<App placements={evil} />);
    expect(screen.queryByRole('link', { name: /Открыть публикацию/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Блогер 009' }));
    expect(screen.queryByRole('link', { name: /Открыть публикацию/ })).not.toBeInTheDocument();
    expect(screen.getByText('Нет ссылки')).toBeInTheDocument();
  });

  it('внешние ссылки открываются безопасно', () => {
    render(<App placements={sample} />);
    const link = screen.getAllByRole('link', { name: /Открыть публикацию/ })[0]!;
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('командная палитра: ⌘K, поиск блогера, переход в карточку', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);
    await user.keyboard('{Control>}k{/Control}');
    const palette = screen.getByRole('dialog', { name: 'Поиск и команды' });
    await user.type(within(palette).getByRole('combobox'), 'блогер 004');
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('dialog', { name: 'Блогер 004' })).toBeInTheDocument();
  });

  it('пока открыта палитра, буквы J/K не листают карточку, а Esc закрывает только её', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);
    await user.click(screen.getByRole('button', { name: 'Блогер 003' }));
    await user.keyboard('{Control>}k{/Control}');
    await user.keyboard('jk');
    expect(screen.getByRole('combobox')).toHaveValue('jk');
    expect(screen.getByRole('dialog', { name: 'Блогер 003' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Поиск и команды' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('dialog', { name: 'Блогер 003' })).toBeInTheDocument();
  });

  it('клавиша «/» переводит фокус в поиск', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);
    await user.keyboard('/');
    expect(screen.getByRole('textbox', { name: /Поиск по блогеру/ })).toHaveFocus();
  });

  it('переключает тему и запоминает выбор', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);
    await user.click(screen.getByRole('button', { name: /^Тема: системная/ }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(window.localStorage.getItem('bloggers:theme')).toBe('light');
  });

  it('восстанавливает состояние из адреса', () => {
    window.history.replaceState(null, '', '/?status=results&sort=-cost');
    render(<App placements={sample} />);
    expect(rowNames()).toEqual(['Блогер 003']);
  });
});
