import { useCallback, useRef, useState } from 'react';
import { useDismiss } from '../hooks/useDismiss';
import { PLATFORMS, type Platform } from '../types';
import { Icon } from './Icon';

interface Props {
  selected: readonly Platform[];
  counts: Record<Platform, number>;
  onToggle: (platform: Platform) => void;
  onClear: () => void;
}

/** Выпадающий фильтр по площадке (десктоп). На телефоне то же самое живёт в шторке. */
export function PlatformFilter({ selected, counts, onToggle, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        className="chip"
        aria-haspopup="true"
        aria-expanded={open}
        data-active={selected.length > 0 || undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="filter" size={14} />
        Площадка
        {selected.length > 0 && <span className="chip__badge">{selected.length}</span>}
      </button>
      {open && (
        <div className="popover" role="group" aria-label="Площадка">
          {PLATFORMS.map((platform) => (
            <label key={platform} className="check">
              <input
                type="checkbox"
                checked={selected.includes(platform)}
                onChange={() => onToggle(platform)}
              />
              <span className="check__box" aria-hidden="true">
                <Icon name="check" size={12} />
              </span>
              <span className="check__label">{platform}</span>
              <span className="check__count">{counts[platform]}</span>
            </label>
          ))}
          {selected.length > 0 && (
            <button type="button" className="popover__reset" onClick={onClear}>
              Сбросить
            </button>
          )}
        </div>
      )}
    </div>
  );
}
