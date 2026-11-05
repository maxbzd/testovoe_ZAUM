import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../lib/transition';
import { STATUSES, type Status } from '../types';

interface Props {
  total: number;
  counts: Record<Status, number>;
  active: Status | null;
  onSelect: (status: Status | null) => void;
}

const SHORT: Record<Status, string> = {
  Согласование: 'Согласование',
  Запланировано: 'Запланировано',
  Опубликовано: 'Опубликовано',
  'Результаты получены': 'Результаты',
};

/** Статусы воронки одной лентой под рукой: на телефоне это главный способ отбора. */
export function StatusChips({ total, counts, active, onSelect }: Props) {
  const rail = useRef<HTMLDivElement>(null);

  // Выбранный чип всегда оказывается в поле зрения.
  useEffect(() => {
    const container = rail.current;
    const chip = container?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!container || !chip) return;
    container.scrollTo({
      left: chip.offsetLeft - (container.clientWidth - chip.offsetWidth) / 2,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, [active]);

  const items: {
    key: string;
    label: string;
    count: number;
    status: Status | null;
    index: number;
  }[] = [
    { key: 'all', label: 'Все', count: total, status: null, index: -1 },
    ...STATUSES.map((status, index) => ({
      key: status,
      label: SHORT[status],
      count: counts[status],
      status,
      index,
    })),
  ];

  return (
    <div className="schips" ref={rail} role="group" aria-label="Статус размещения">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="schip"
          data-status={item.index >= 0 ? item.index : undefined}
          aria-pressed={active === item.status}
          onClick={() => onSelect(item.status)}
        >
          {item.index >= 0 && <span className="schip__dot" aria-hidden="true" />}
          {item.label}
          <span className="schip__count">{item.count}</span>
        </button>
      ))}
    </div>
  );
}
