import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { mockCompactViewport } from './test/media';
import { sample } from './test/fixtures';

const itemNames = (): string[] =>
  screen
    .getAllByRole('listitem')
    .map((li) => within(li).getByText(/^Блогер \d+$/).textContent ?? '');

beforeEach(() => {
  mockCompactViewport(true);
  window.history.replaceState(null, '', '/');
  window.localStorage.clear();
});

afterEach(() => mockCompactViewport(false));

describe('App на телефоне', () => {
  it('показывает список вместо таблицы и компактную шапку', () => {
    render(<App placements={sample} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(itemNames()).toEqual(['Блогер 002', 'Блогер 003', 'Блогер 001', 'Блогер 004']);
    expect(screen.getByRole('button', { name: 'Поиск и команды' })).toBeInTheDocument();
    expect(screen.getByText('4 из 4 · Дата ↑')).toBeInTheDocument();
  });

  it('фильтрует по статусу чипами и показывает счётчики', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);
    const group = screen.getByRole('group', { name: 'Статус размещения' });
    await user.click(within(group).getByRole('button', { name: /Опубликовано/ }));
    expect(itemNames()).toEqual(['Блогер 002']);
    expect(within(group).getByRole('button', { name: /Опубликовано/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(within(group).getByRole('button', { name: /^Все/ }));
    expect(itemNames()).toHaveLength(4);
  });

  it('фильтры и сортировка в шторке: выбор, счётчик на кнопке, закрытие', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);

    await user.click(screen.getByRole('button', { name: 'Фильтры и сортировка' }));
    const sheet = screen.getByRole('dialog', { name: 'Фильтры и сортировка' });

    await user.click(within(sheet).getByRole('checkbox', { name: /Telegram/ }));
    await user.click(within(sheet).getByRole('radio', { name: 'Стоимость' }));
    expect(
      within(sheet).getByRole('button', { name: 'Показать 2 размещения' }),
    ).toBeInTheDocument();

    await user.click(within(sheet).getByRole('radio', { name: 'По возрастанию' }));
    await user.click(within(sheet).getByRole('button', { name: /Показать/ }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(itemNames()).toEqual(['Блогер 001', 'Блогер 004']);
    expect(screen.getByText('2 из 4 · Стоимость ↑')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Фильтры и сортировка, изменено: 2' }),
    ).toBeInTheDocument();
  });

  it('«Сбросить» в шторке снимает всё', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);
    await user.click(screen.getByRole('button', { name: 'Фильтры и сортировка' }));
    const sheet = screen.getByRole('dialog');
    await user.click(within(sheet).getByRole('checkbox', { name: /YouTube/ }));
    await user.click(within(sheet).getByRole('button', { name: 'Сбросить' }));
    expect(within(sheet).queryByRole('button', { name: 'Сбросить' })).not.toBeInTheDocument();
    expect(
      within(sheet).getByRole('button', { name: 'Показать 4 размещения' }),
    ).toBeInTheDocument();
  });

  it('Esc закрывает шторку фильтров и возвращает фокус на кнопку', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);
    const trigger = screen.getByRole('button', { name: 'Фильтры и сортировка' });
    await user.click(trigger);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('открывает карточку по нажатию на строку', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);
    await user.click(screen.getByRole('button', { name: /Блогер 003/ }));
    expect(screen.getByRole('dialog', { name: 'Блогер 003' })).toBeInTheDocument();
  });

  it('палитра открывается кнопкой в шапке, а «Сбросить» в сводке снимает отбор', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);
    await user.click(screen.getByRole('button', { name: 'Поиск и команды' }));
    expect(screen.getByRole('dialog', { name: 'Поиск и команды' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.type(screen.getByRole('textbox'), 'блогер 001');
    expect(itemNames()).toEqual(['Блогер 001']);
    await user.click(screen.getByRole('button', { name: 'Сбросить' }));
    expect(itemNames()).toHaveLength(4);
  });

  it('если ничего не найдено, шторка так и пишет; выбор того же поля сохраняет порядок', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);
    await user.type(screen.getByRole('textbox'), 'яяяя');
    await user.click(screen.getByRole('button', { name: /Фильтры и сортировка/ }));
    const sheet = screen.getByRole('dialog');
    expect(within(sheet).getByRole('button', { name: 'Ничего не найдено' })).toBeInTheDocument();

    await user.click(within(sheet).getByRole('radio', { name: 'Стоимость' }));
    await user.click(within(sheet).getByRole('radio', { name: 'По возрастанию' }));
    await user.click(within(sheet).getByRole('radio', { name: 'Стоимость' })); // то же поле
    expect(within(sheet).getByRole('radio', { name: 'По возрастанию' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});
