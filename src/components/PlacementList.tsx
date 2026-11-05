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

/**
 * Телефонный список: три строки на размещение — кто и сколько, где и когда,
 * на каком этапе и что получили. Всё остальное — в карточке по нажатию.
 */
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
            <span className="item__row">
              <span className="item__name">{item.name}</span>
              <span className="item__cost">
                {item.budgetType === 'Бартер' && <span className="tag">бартер</span>}
                {formatRub(item.cost)}
              </span>
            </span>
            <span className="item__row item__row--meta">
              <span>
                {item.platform} · {item.format} · {formatDateShort(item.date)}
              </span>
              <span>CPM {formatRub(cpmOf(item))}</span>
            </span>
            <span className="item__row item__row--foot">
              <StatusBadge status={item.status} short />
              <span className="item__results">
                {formatInt(item.storyReach)} охват · {formatInt(item.reelsViews)} рилс
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
