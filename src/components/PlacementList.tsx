import { cssVars } from '../lib/css';
import { formatDateShort, formatInt, formatRub } from '../lib/format';
import { cpmOf } from '../lib/metrics';
import type { Placement } from '../types';
import { StatusBadge } from './Badges';

interface Props {
  rows: readonly Placement[];
  activeId: number | null;
  onOpen: (id: number) => void;
}

/** Телефонный вид: плоский плотный список вместо таблицы, без «карточек в рамках». */
export function PlacementList({ rows, activeId, onOpen }: Props) {
  return (
    <ul className="list" aria-label="Размещения у блогеров">
      {rows.map((item, index) => (
        <li
          key={item.id}
          className="list__li"
          style={cssVars({ '--i': Math.min(index, 10), viewTransitionName: `row-${item.id}` })}
        >
          <button
            type="button"
            className="item"
            data-active={activeId === item.id || undefined}
            onClick={() => onOpen(item.id)}
          >
            <span className="item__top">
              <span className="item__name">{item.name}</span>
              <StatusBadge status={item.status} />
            </span>
            <span className="item__meta">
              {item.platform} · {item.format} · {formatDateShort(item.date)}
              {item.budgetType === 'Бартер' ? ' · бартер' : ''}
            </span>
            <span className="item__nums">
              <span>
                <i>Охват</i>
                {formatInt(item.storyReach)}
              </span>
              <span>
                <i>Рилс</i>
                {formatInt(item.reelsViews)}
              </span>
              <span>
                <i>CPM</i>
                {formatRub(cpmOf(item))}
              </span>
              <span>
                <i>{item.budgetType === 'Бартер' ? 'Бартер' : 'Стоимость'}</i>
                {formatRub(item.cost)}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
