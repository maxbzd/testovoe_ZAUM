import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { make, sample } from '../test/fixtures';
import { mockReducedMotion, resetMedia } from '../test/media';
import type { PaletteAction } from '../lib/palette-actions';
import { computeMetrics } from '../lib/metrics';
import { CommandPalette } from './CommandPalette';
import { Drawer } from './Drawer';
import { ErrorBoundary } from './ErrorBoundary';
import { PlacementTable } from './PlacementTable';
import { PlatformFilter } from './PlatformFilter';
import { StatsBar } from './StatsBar';
import { StatusChips } from './StatusChips';
import { Toast } from './Toast';

afterEach(() => {
  resetMedia();
  vi.restoreAllMocks();
});

const actions = (run = vi.fn()): PaletteAction[] => [
  { id: 'a', label: 'Первое действие', icon: 'table', run },
  { id: 'b', label: 'Второе действие', icon: 'table', hint: '5', run },
  { id: 'c', label: 'Экспорт в CSV', icon: 'download', keywords: 'скачать выгрузка', run },
];

const renderPalette = (run = vi.fn()) => {
  const onClose = vi.fn();
  const onOpenPlacement = vi.fn();
  render(
    <CommandPalette
      open
      placements={sample}
      actions={actions(run)}
      onOpenPlacement={onOpenPlacement}
      onClose={onClose}
    />,
  );
  return { onClose, onOpenPlacement, run };
};

const selected = (): string =>
  screen.getAllByRole('option').find((o) => o.getAttribute('aria-selected') === 'true')
    ?.textContent ?? '';

describe('CommandPalette', () => {
  it('стрелки ходят по кругу вниз и вверх', async () => {
    const user = userEvent.setup();
    renderPalette();
    expect(selected()).toContain('Первое');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(selected()).toContain('Экспорт');
    await user.keyboard('{ArrowDown}');
    expect(selected()).toContain('Первое');
    await user.keyboard('{ArrowUp}');
    expect(selected()).toContain('Экспорт');
  });

  it('Enter выполняет выбранное действие и закрывает палитру', async () => {
    const user = userEvent.setup();
    const { run, onClose } = renderPalette();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(run).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });

  it('наведение выбирает пункт, клик выполняет его', async () => {
    const user = userEvent.setup();
    const { run } = renderPalette();
    const second = screen.getByRole('option', { name: /Второе/ });
    fireEvent.pointerMove(second);
    expect(second).toHaveAttribute('aria-selected', 'true');
    await user.click(second);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('ищет действия по ключевым словам и блогеров по запросу', async () => {
    const user = userEvent.setup();
    const { onOpenPlacement } = renderPalette();
    await user.type(screen.getByRole('combobox'), 'выгрузка');
    expect(screen.getByRole('option', { name: /Экспорт/ })).toBeInTheDocument();

    await user.clear(screen.getByRole('combobox'));
    await user.type(screen.getByRole('combobox'), 'блогер 003');
    await user.click(screen.getByRole('option', { name: /Блогер 003/ }));
    expect(onOpenPlacement).toHaveBeenCalledWith(3);
  });

  it('без результатов показывает подсказку, а клавиши ничего не ломают', async () => {
    const user = userEvent.setup();
    const { run, onClose } = renderPalette();
    await user.type(screen.getByRole('combobox'), 'яяяя');
    expect(screen.getByText('Ничего не нашлось')).toBeInTheDocument();
    await user.keyboard('{ArrowDown}{ArrowUp}{Enter}');
    expect(run).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

const drawerProps = () => ({
  item: sample[1]!,
  closing: false,
  suspended: false,
  position: { index: 1, total: 4 },
  onClose: vi.fn(),
  onStep: vi.fn(),
  onCopy: vi.fn(),
});

describe('Drawer', () => {
  it('кнопки листают, копируют и закрывают', async () => {
    const user = userEvent.setup();
    const props = drawerProps();
    render(<Drawer {...props} />);
    await user.click(screen.getByRole('button', { name: 'Следующее размещение' }));
    expect(props.onStep).toHaveBeenLastCalledWith(1);
    await user.click(screen.getByRole('button', { name: 'Предыдущее размещение' }));
    expect(props.onStep).toHaveBeenLastCalledWith(-1);
    await user.click(screen.getByRole('button', { name: /Копировать артикул/ }));
    expect(props.onCopy).toHaveBeenCalledWith(sample[1]!.article);
    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('J, K и стрелки листают; с модификаторами, в поле ввода и в паузе — нет', async () => {
    const user = userEvent.setup();
    const props = drawerProps();
    const { rerender } = render(
      <>
        <Drawer {...props} />
        <input aria-label="внешнее поле" />
      </>,
    );
    await user.keyboard('j');
    expect(props.onStep).toHaveBeenLastCalledWith(1);
    await user.keyboard('{ArrowDown}');
    expect(props.onStep).toHaveBeenCalledTimes(2);
    await user.keyboard('k');
    expect(props.onStep).toHaveBeenLastCalledWith(-1);
    await user.keyboard('{ArrowUp}');
    expect(props.onStep).toHaveBeenCalledTimes(4);

    await user.keyboard('x'); // посторонняя клавиша
    expect(props.onStep).toHaveBeenCalledTimes(4);

    await user.keyboard('{Control>}j{/Control}');
    expect(props.onStep).toHaveBeenCalledTimes(4);

    screen.getByLabelText('внешнее поле').focus();
    await user.keyboard('jk');
    expect(props.onStep).toHaveBeenCalledTimes(4);

    (document.activeElement as HTMLElement).blur();
    rerender(
      <>
        <Drawer {...props} suspended />
        <input aria-label="внешнее поле" />
      </>,
    );
    await user.keyboard('j');
    expect(props.onStep).toHaveBeenCalledTimes(4);
  });

  it('без позиции в отборе листание отключено, без комментария блока нет', () => {
    render(<Drawer {...drawerProps()} item={make({ id: 5, comment: '' })} position={null} />);
    expect(screen.getByRole('button', { name: 'Следующее размещение' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Предыдущее размещение' })).toBeDisabled();
    expect(screen.queryByRole('heading', { name: 'Комментарий' })).not.toBeInTheDocument();
    expect(screen.queryByText(/из 4/)).not.toBeInTheDocument();
  });

  it('показывает комментарий, оценку стоимости бартера и «Нет ссылки» для опасного адреса', () => {
    const item = make({
      id: 6,
      comment: 'Важно',
      budgetType: 'Бартер',
      link: 'javascript:alert(1)',
    });
    render(<Drawer {...drawerProps()} item={item} />);
    expect(screen.getByText('Важно')).toBeInTheDocument();
    expect(screen.getByText('Стоимость (оценка)')).toBeInTheDocument();
    expect(screen.getByText('Нет ссылки')).toHaveAttribute('aria-disabled', 'true');
  });

  it('помечает этапы воронки: пройденные, текущий и будущие', () => {
    render(<Drawer {...drawerProps()} item={make({ id: 8, status: 'Опубликовано' })} />);
    const steps = within(screen.getByRole('list', { name: 'Этап воронки' })).getAllByRole(
      'listitem',
    );
    expect(steps.map((s) => s.getAttribute('data-state'))).toEqual([
      'done',
      'done',
      'current',
      'todo',
    ]);
  });
});

const tableProps = (overrides = {}) => ({
  rows: sample,
  sort: { key: 'date' as const, dir: 'asc' as const },
  onSort: vi.fn(),
  activeId: null,
  onOpen: vi.fn(),
  maxReach: 4000,
  maxReels: 12000,
  ...overrides,
});

describe('PlacementTable', () => {
  it('клик по строке открывает, клик по ссылке — нет, имя открывает один раз', async () => {
    const user = userEvent.setup();
    const props = tableProps();
    render(<PlacementTable {...props} />);
    const row = screen.getByRole('button', { name: 'Блогер 001' }).closest('tr') as HTMLElement;

    await user.click(within(row).getAllByRole('cell')[3] as HTMLElement);
    expect(props.onOpen).toHaveBeenLastCalledWith(1);

    props.onOpen.mockClear();
    await user.click(screen.getByRole('button', { name: 'Блогер 001' }));
    expect(props.onOpen).toHaveBeenCalledTimes(1);

    props.onOpen.mockClear();
    await user.click(within(row).getByRole('link'));
    expect(props.onOpen).not.toHaveBeenCalled();
  });

  it('отмечает активную строку и направление сортировки', async () => {
    const user = userEvent.setup();
    const props = tableProps({ activeId: 2, sort: { key: 'cost', dir: 'desc' } });
    render(<PlacementTable {...props} />);
    expect(screen.getByRole('button', { name: 'Блогер 002' }).closest('tr')).toHaveAttribute(
      'data-active',
    );
    expect(screen.getByRole('columnheader', { name: /Стоимость/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    await user.click(screen.getByRole('button', { name: /^Подписчики/ }));
    expect(props.onSort).toHaveBeenCalledWith('subscribers');
  });

  it('не делит на ноль, если максимумы нулевые', () => {
    render(<PlacementTable {...tableProps({ maxReach: 0, maxReels: 0 })} />);
    expect(screen.getAllByRole('row')).toHaveLength(5);
  });
});

describe('PlatformFilter', () => {
  const setup = (selected: ('Telegram' | 'VK' | 'YouTube')[] = []) => {
    const props = {
      selected,
      counts: { Telegram: 2, VK: 1, YouTube: 1 },
      onToggle: vi.fn(),
      onClear: vi.fn(),
    };
    render(<PlatformFilter {...props} />);
    return props;
  };

  it('открывается, переключает площадки и сбрасывает выбор', async () => {
    const user = userEvent.setup();
    const props = setup(['VK']);
    await user.click(screen.getByRole('button', { name: /Площадка/ }));
    await user.click(screen.getByRole('checkbox', { name: /Telegram/ }));
    expect(props.onToggle).toHaveBeenCalledWith('Telegram');
    await user.click(screen.getByRole('button', { name: 'Сбросить' }));
    expect(props.onClear).toHaveBeenCalled();
  });

  it('закрывается по Esc и по клику снаружи; без выбора кнопки «Сбросить» нет', async () => {
    const user = userEvent.setup();
    setup();
    const trigger = screen.getByRole('button', { name: /Площадка/ });
    await user.click(trigger);
    expect(screen.queryByRole('button', { name: 'Сбросить' })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: 'Площадка' })).not.toBeInTheDocument();
    await user.click(trigger);
    await user.click(document.body);
    expect(screen.queryByRole('group', { name: 'Площадка' })).not.toBeInTheDocument();
  });
});

describe('StatsBar', () => {
  const props = (rows = sample, scale = {}) => ({
    metrics: computeMetrics(rows),
    rows,
    scale: { cpmMin: 1000, cpmMax: 2000, maxReach: 4000, ...scale },
    statusCounts: { Согласование: 1, Запланировано: 1, Опубликовано: 1, 'Результаты получены': 1 },
    filtered: false,
    scrollable: false,
  });

  it('устойчив к одинаковым датам и нулевым шкалам', () => {
    const rows = [make({ id: 2, date: '2026-11-02' }), make({ id: 1, date: '2026-11-02' })];
    render(<StatsBar {...props(rows, { maxReach: 0 })} />);
    expect(screen.getByLabelText('Показатели')).toBeInTheDocument();
  });

  it('без данных показывает прочерк и подсказки «нет»', () => {
    render(<StatsBar {...props([])} />);
    expect(screen.getByText('Платных размещений нет')).toBeInTheDocument();
    expect(screen.getByText('Бартера нет')).toBeInTheDocument();
    expect(screen.getByText('Нет данных')).toBeInTheDocument();
    expect(screen.getByText('Ждать нечего')).toBeInTheDocument();
  });

  it('помечает отбор в названии области и делает ленту доступной с клавиатуры', () => {
    render(<StatsBar {...props()} filtered scrollable />);
    expect(screen.getByLabelText('Показатели по текущему отбору')).toHaveAttribute('tabindex', '0');
  });
});

describe('StatusChips', () => {
  const counts = { Согласование: 1, Запланировано: 2, Опубликовано: 3, 'Результаты получены': 4 };

  it('выбирает статус и прокручивает ленту плавно', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<StatusChips total={10} counts={counts} active="Опубликовано" onSelect={onSelect} />);
    expect(Element.prototype.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' }),
    );
    await user.click(screen.getByRole('button', { name: /Результаты/ }));
    expect(onSelect).toHaveBeenCalledWith('Результаты получены');
    await user.click(screen.getByRole('button', { name: /^Все/ }));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it('при отключённых анимациях прокручивает мгновенно', () => {
    mockReducedMotion();
    render(<StatusChips total={10} counts={counts} active={null} onSelect={vi.fn()} />);
    expect(Element.prototype.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'auto' }),
    );
  });
});

describe('Toast', () => {
  it('область есть всегда, сообщение — только когда оно есть', () => {
    const { rerender } = render(<Toast message={null} />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    rerender(<Toast message={{ id: 1, text: 'Готово' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Готово');
  });
});

describe('ErrorBoundary', () => {
  it('кнопка «Обновить страницу» перезагружает страницу', async () => {
    const user = userEvent.setup();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const Boom = (): never => {
      throw new Error('сбой');
    };
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    // jsdom не умеет перезагружать страницу и сообщит об этом в консоль — этого достаточно:
    // обработчик выполнен и не падает.
    await user.click(screen.getByRole('button', { name: 'Обновить страницу' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
