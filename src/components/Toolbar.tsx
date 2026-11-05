import { useCallback, useRef, useState, type RefObject } from 'react';
import { useDismiss } from '../hooks/useDismiss';
import { PLATFORMS, type Platform, type Sort, type SortKey } from '../types';
import { Kbd } from './Badges';
import { Icon } from './Icon';

export const SORT_LABELS: Record<SortKey, string> = {
  name: 'Блогер',
  platform: 'Площадка',
  status: 'Статус',
  date: 'Дата',
  subscribers: 'Подписчики',
  storyReach: 'Охват сторис',
  reelsViews: 'Просмотры рилс',
  cost: 'Стоимость',
  cpm: 'CPM',
};

interface Props {
  query: string;
  onQuery: (value: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  platforms: readonly Platform[];
  platformCounts: Record<Platform, number>;
  onTogglePlatform: (platform: Platform) => void;
  onClearPlatforms: () => void;
  sort: Sort;
  onSort: (key: SortKey) => void;
  onToggleDir: () => void;
  /** На телефоне заголовков таблицы нет — сортировка живёт здесь. */
  showSort: boolean;
  shown: number;
  total: number;
  hasFilters: boolean;
  onReset: () => void;
}

export function Toolbar(props: Props) {
  const {
    query,
    onQuery,
    searchRef,
    platforms,
    platformCounts,
    onTogglePlatform,
    onClearPlatforms,
    sort,
    onSort,
    onToggleDir,
    showSort,
    shown,
    total,
    hasFilters,
    onReset,
  } = props;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setMenuOpen(false), []);
  useDismiss(menuRef, menuOpen, close);

  return (
    <div className="toolbar">
      <label className="search">
        <Icon name="search" size={15} />
        <input
          ref={searchRef}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Блогер, артикул, комментарий"
          aria-label="Поиск по блогеру, артикулу, комментарию"
          value={query}
          maxLength={100}
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              if (query) onQuery('');
              else event.currentTarget.blur();
            }
          }}
        />
        {query ? (
          <button
            type="button"
            className="search__clear"
            aria-label="Очистить поиск"
            onClick={() => {
              onQuery('');
              searchRef.current?.focus();
            }}
          >
            <Icon name="x" size={14} />
          </button>
        ) : (
          <Kbd>/</Kbd>
        )}
      </label>

      <div className="menu" ref={menuRef}>
        <button
          type="button"
          className="chip"
          aria-haspopup="true"
          aria-expanded={menuOpen}
          data-active={platforms.length > 0 || undefined}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name="filter" size={14} />
          Площадка
          {platforms.length > 0 && <span className="chip__badge">{platforms.length}</span>}
        </button>
        {menuOpen && (
          <div className="popover" role="group" aria-label="Площадка">
            {PLATFORMS.map((platform) => (
              <label key={platform} className="check">
                <input
                  type="checkbox"
                  checked={platforms.includes(platform)}
                  onChange={() => onTogglePlatform(platform)}
                />
                <span className="check__box" aria-hidden="true">
                  <Icon name="check" size={12} />
                </span>
                <span className="check__label">{platform}</span>
                <span className="check__count">{platformCounts[platform]}</span>
              </label>
            ))}
            {platforms.length > 0 && (
              <button type="button" className="popover__reset" onClick={onClearPlatforms}>
                Сбросить
              </button>
            )}
          </div>
        )}
      </div>

      {showSort && (
        <div className="sortbox">
          <label className="select">
            <span className="sr-only">Сортировка</span>
            <select value={sort.key} onChange={(event) => onSort(event.target.value as SortKey)}>
              {Object.entries(SORT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" size={14} />
          </label>
          <button
            type="button"
            className="icon-btn icon-btn--bordered"
            onClick={onToggleDir}
            aria-label={sort.dir === 'asc' ? 'По возрастанию. Сменить' : 'По убыванию. Сменить'}
          >
            <Icon name={sort.dir === 'asc' ? 'arrowUp' : 'arrowDown'} size={15} />
          </button>
        </div>
      )}

      <div className="toolbar__end">
        {hasFilters && (
          <button type="button" className="link-btn" onClick={onReset}>
            Сбросить
          </button>
        )}
        <span className="toolbar__count" role="status" aria-live="polite">
          {shown} из {total}
        </span>
      </div>
    </div>
  );
}
