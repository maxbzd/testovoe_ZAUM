import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { normalize, searchText } from '../lib/filter';
import type { Placement } from '../types';
import { Kbd, StatusBadge } from './Badges';
import { Icon, type IconName } from './Icon';

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  keywords?: string;
  icon: IconName;
  run: () => void;
}

interface Props {
  placements: readonly Placement[];
  actions: readonly PaletteAction[];
  onOpenPlacement: (id: number) => void;
  onClose: () => void;
}

type Entry =
  | { kind: 'action'; key: string; action: PaletteAction }
  | { kind: 'placement'; key: string; item: Placement };

const MAX_RESULTS = 10;

/** ⌘K: быстро прыгнуть к блогеру или выполнить действие, не трогая мышь. */
export function CommandPalette({ placements, actions, onOpenPlacement, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const entries = useMemo<Entry[]>(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    const matches = (text: string): boolean => words.every((word) => text.includes(word));
    const actionEntries: Entry[] = actions
      .filter((action) => matches(normalize(`${action.label} ${action.keywords ?? ''}`)))
      .map((action) => ({ kind: 'action', key: `a:${action.id}`, action }));
    const placementEntries: Entry[] = placements
      .filter((item) => words.length > 0 && matches(searchText(item)))
      .map((item) => ({ kind: 'placement', key: `p:${item.id}`, item }));
    // Пустой запрос: сначала действия. Есть запрос: сначала найденные блогеры.
    const ordered = words.length > 0 ? [...placementEntries, ...actionEntries] : actionEntries;
    return ordered.slice(0, MAX_RESULTS);
  }, [query, actions, placements]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [active, entries]);

  const run = (entry: Entry | undefined): void => {
    if (!entry) return;
    onClose();
    if (entry.kind === 'action') entry.action.run();
    else onOpenPlacement(entry.item.id);
  };

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (entries.length ? (index + 1) % entries.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (entries.length ? (index - 1 + entries.length) % entries.length : 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(entries[active]);
    } else if (event.key === 'Tab') {
      event.preventDefault();
    }
  };

  return (
    <div className="palette-layer">
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Поиск и команды"
        onKeyDown={onKeyDown}
      >
        <div className="palette__field">
          <Icon name="search" size={16} />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={entries[active] ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            placeholder="Блогер, артикул или команда…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
          />
          <Kbd>Esc</Kbd>
        </div>
        <ul id={listId} ref={listRef} className="palette__list" role="listbox">
          {entries.length === 0 && <li className="palette__empty">Ничего не нашлось</li>}
          {entries.map((entry, index) => (
            <li
              key={entry.key}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              data-active={index === active}
              className="palette__item"
              onPointerMove={() => setActive(index)}
              onClick={() => run(entry)}
            >
              {entry.kind === 'action' ? (
                <>
                  <Icon name={entry.action.icon} size={15} className="palette__icon" />
                  <span className="palette__label">{entry.action.label}</span>
                  {entry.action.hint && <span className="muted">{entry.action.hint}</span>}
                </>
              ) : (
                <>
                  <span className="avatar avatar--sm" aria-hidden="true">
                    {String(entry.item.id).padStart(2, '0')}
                  </span>
                  <span className="palette__label">
                    {entry.item.name} <span className="muted">{entry.item.article}</span>
                  </span>
                  <StatusBadge status={entry.item.status} />
                </>
              )}
            </li>
          ))}
        </ul>
        <div className="palette__foot">
          <span>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> выбрать
          </span>
          <span>
            <Kbd>↵</Kbd> открыть
          </span>
        </div>
      </div>
    </div>
  );
}
