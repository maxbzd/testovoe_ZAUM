import { memo } from 'react';
import { cssVars } from '../lib/css';
import { formatDateShort, formatInt, formatRub } from '../lib/format';
import { cpmOf } from '../lib/metrics';
import { safeExternalUrl } from '../lib/safe-url';
import type { Placement, Sort, SortKey } from '../types';
import { PlatformBadge, StatusBadge } from './Badges';
import { Icon } from './Icon';

interface Column {
  key: SortKey | null;
  label: string;
  end?: boolean;
}

const COLUMNS: readonly Column[] = [
  { key: 'name', label: 'Блогер' },
  { key: 'platform', label: 'Площадка' },
  { key: 'status', label: 'Статус' },
  { key: 'date', label: 'Дата' },
  { key: 'subscribers', label: 'Подписчики', end: true },
  { key: 'storyReach', label: 'Охват сторис', end: true },
  { key: 'reelsViews', label: 'Рилс', end: true },
  { key: 'cost', label: 'Стоимость', end: true },
  { key: 'cpm', label: 'CPM', end: true },
  { key: null, label: 'Ссылка' },
];

interface RowProps {
  item: Placement;
  index: number;
  maxReach: number;
  maxReels: number;
  active: boolean;
  onOpen: (id: number) => void;
}

const Row = memo(function Row({ item, index, maxReach, maxReels, active, onOpen }: RowProps) {
  const link = safeExternalUrl(item.link);
  return (
    <tr
      className="row"
      data-active={active || undefined}
      style={cssVars({ '--i': Math.min(index, 14), viewTransitionName: `row-${item.id}` })}
      onClick={() => onOpen(item.id)}
    >
      <td>
        <div className="cell-name">
          <span className="avatar" aria-hidden="true">
            {String(item.id).padStart(2, '0')}
          </span>
          <span className="cell-name__text">
            <button
              type="button"
              className="row__open"
              onClick={(event) => {
                event.stopPropagation();
                onOpen(item.id);
              }}
            >
              {item.name}
            </button>
            <span className="muted">{item.article}</span>
          </span>
        </div>
      </td>
      <td>
        <PlatformBadge platform={item.platform} />
      </td>
      <td>
        <StatusBadge status={item.status} />
      </td>
      <td className="muted">{formatDateShort(item.date)}</td>
      <td className="num">{formatInt(item.subscribers)}</td>
      <td className="num">
        <span>{formatInt(item.storyReach)}</span>
        <span className="bar" aria-hidden="true">
          <span style={cssVars({ '--w': maxReach > 0 ? item.storyReach / maxReach : 0 })} />
        </span>
      </td>
      <td className="num">
        <span>{formatInt(item.reelsViews)}</span>
        <span className="bar bar--soft" aria-hidden="true">
          <span style={cssVars({ '--w': maxReels > 0 ? item.reelsViews / maxReels : 0 })} />
        </span>
      </td>
      <td className="num">
        <div className="cell-cost">
          <span>{formatRub(item.cost)}</span>
          {item.budgetType === 'Бартер' && <span className="tag">бартер</span>}
        </div>
      </td>
      <td className="num muted">{formatRub(cpmOf(item))}</td>
      <td className="cell-link">
        {link && (
          <a
            className="icon-btn"
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Открыть публикацию: ${item.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <Icon name="external" size={15} />
          </a>
        )}
      </td>
    </tr>
  );
});

interface Props {
  rows: readonly Placement[];
  sort: Sort;
  onSort: (key: SortKey) => void;
  activeId: number | null;
  onOpen: (id: number) => void;
  /** Максимумы по всем данным: полоски в ячейках сравнимы между фильтрами. */
  maxReach: number;
  maxReels: number;
}

export function PlacementTable({
  rows,
  sort,
  onSort,
  activeId,
  onOpen,
  maxReach,
  maxReels,
}: Props) {
  return (
    <div className="table-wrap">
      <table className="grid">
        <caption className="sr-only">Размещения у блогеров</caption>
        <thead>
          <tr>
            {COLUMNS.map((column) => {
              const sorted = column.key !== null && sort.key === column.key;
              return (
                <th
                  key={column.label}
                  scope="col"
                  className={column.end ? 'th th--end' : 'th'}
                  aria-sort={sorted ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {column.key === null ? (
                    <span className="sr-only">{column.label}</span>
                  ) : (
                    <button
                      type="button"
                      className="th__btn"
                      data-sorted={sorted || undefined}
                      onClick={() => onSort(column.key as SortKey)}
                    >
                      {column.label}
                      <Icon
                        name={sorted && sort.dir === 'desc' ? 'arrowDown' : 'arrowUp'}
                        size={12}
                        className="th__arrow"
                      />
                    </button>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((item, index) => (
            <Row
              key={item.id}
              item={item}
              index={index}
              maxReach={maxReach}
              maxReels={maxReels}
              active={activeId === item.id}
              onOpen={onOpen}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
