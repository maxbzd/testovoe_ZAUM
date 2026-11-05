import { useRef } from 'react';
import { useDialog } from '../hooks/useDialog';
import { usePresence } from '../hooks/usePresence';
import { useSheetDrag } from '../hooks/useSheetDrag';
import { plural } from '../lib/format';
import { DEFAULT_DIR, SORT_KEYS, SORT_LABELS } from '../lib/sort';
import { PLATFORMS, type Platform, type Sort, type SortDir, type SortKey } from '../types';
import { Icon } from './Icon';

interface Props {
  open: boolean;
  platforms: readonly Platform[];
  platformCounts: Record<Platform, number>;
  onTogglePlatform: (platform: Platform) => void;
  sort: Sort;
  onSort: (sort: Sort) => void;
  shown: number;
  hasFilters: boolean;
  onReset: () => void;
  onClose: () => void;
}

export const SHEET_EXIT_MS = 240;

export function FilterSheet({ open, ...rest }: Props) {
  const { mounted, closing } = usePresence(open, SHEET_EXIT_MS);
  return mounted ? <SheetBody closing={closing} {...rest} /> : null;
}

const DIRS: { dir: SortDir; label: string; icon: 'arrowUp' | 'arrowDown' }[] = [
  { dir: 'asc', label: 'По возрастанию', icon: 'arrowUp' },
  { dir: 'desc', label: 'По убыванию', icon: 'arrowDown' },
];

function SheetBody(props: Omit<Props, 'open'> & { closing: boolean }) {
  const { closing, platforms, platformCounts, sort, shown, hasFilters, onClose } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useDialog(rootRef, { onClose, initialFocus: closeRef });
  const drag = useSheetDrag(rootRef, onClose);

  return (
    <div className="drawer-layer" data-closing={closing || undefined}>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={rootRef}
        className="drawer drawer--sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="filters-title"
      >
        <div className="drawer__grip" aria-hidden="true" {...drag}>
          <span />
        </div>
        <header className="drawer__head">
          <h2 id="filters-title" className="sheet__title">
            Фильтры и сортировка
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <Icon name="x" size={17} />
          </button>
        </header>

        <div className="sheet__body" tabIndex={0} role="region" aria-labelledby="filters-title">
          <fieldset className="fieldset">
            <legend>Площадка</legend>
            <div className="toggles">
              {PLATFORMS.map((platform) => (
                <label key={platform} className="toggle">
                  <input
                    type="checkbox"
                    checked={platforms.includes(platform)}
                    onChange={() => props.onTogglePlatform(platform)}
                  />
                  <span className="check__box" aria-hidden="true">
                    <Icon name="check" size={12} />
                  </span>
                  <span className="toggle__label">{platform}</span>
                  <span className="muted">{platformCounts[platform]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="fieldset">
            <legend>Сортировать по</legend>
            <div className="pills" role="radiogroup" aria-label="Поле сортировки">
              {SORT_KEYS.map((key: SortKey) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={sort.key === key}
                  className="pill-btn"
                  onClick={() =>
                    props.onSort({ key, dir: sort.key === key ? sort.dir : DEFAULT_DIR[key] })
                  }
                >
                  {SORT_LABELS[key]}
                </button>
              ))}
            </div>
            <div className="segmented" role="radiogroup" aria-label="Порядок сортировки">
              {DIRS.map(({ dir, label, icon }) => (
                <button
                  key={dir}
                  type="button"
                  role="radio"
                  aria-checked={sort.dir === dir}
                  className="segmented__btn"
                  onClick={() => props.onSort({ key: sort.key, dir })}
                >
                  <Icon name={icon} size={14} />
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <footer className="drawer__foot">
          {hasFilters && (
            <button type="button" className="btn" onClick={props.onReset}>
              Сбросить
            </button>
          )}
          <button type="button" className="btn btn--primary" onClick={onClose}>
            {shown === 0
              ? 'Ничего не найдено'
              : `Показать ${shown} ${plural(shown, ['размещение', 'размещения', 'размещений'])}`}
          </button>
        </footer>
      </div>
    </div>
  );
}
