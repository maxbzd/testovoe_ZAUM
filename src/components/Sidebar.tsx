import { useLayoutEffect, useRef, useState } from 'react';
import { cssVars } from '../lib/css';
import { STATUSES, type Status } from '../types';
import { Kbd } from './Badges';
import { Icon } from './Icon';
import { Logo } from './Logo';

interface Props {
  total: number;
  counts: Record<Status, number>;
  active: Status | null;
  onSelect: (status: Status | null) => void;
  onOpenPalette: () => void;
}

interface Marker {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * «Виды» — как в Linear: «Все» и по одному на каждый статус воронки.
 * Один маркер плавно переезжает между пунктами, а не мигает на каждом.
 */
export function Sidebar({ total, counts, active, onSelect, onOpenPalette }: Props) {
  const navRef = useRef<HTMLElement>(null);
  const [marker, setMarker] = useState<Marker | null>(null);
  const activeKey = active ?? 'all';

  useLayoutEffect(() => {
    const nav = navRef.current as HTMLElement; // layout-эффект: элемент уже в DOM
    const measure = (): void => {
      // Активный пункт есть всегда: «Все» или один из статусов.
      const target = nav.querySelector('[aria-current="true"]') as HTMLElement;
      setMarker({
        x: target.offsetLeft,
        y: target.offsetTop,
        width: target.offsetWidth,
        height: target.offsetHeight,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [activeKey]);

  const items: {
    key: string;
    label: string;
    count: number;
    status: Status | null;
    index: number;
  }[] = [
    { key: 'all', label: 'Все размещения', count: total, status: null, index: -1 },
    ...STATUSES.map((status, index) => ({
      key: status,
      label: status,
      count: counts[status],
      status,
      index,
    })),
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <Logo className="brand__logo" height={13} />
        <span className="brand__section">Блогеры</span>
      </div>

      <button type="button" className="finder" onClick={onOpenPalette}>
        <Icon name="search" size={15} />
        <span className="finder__label">Поиск и команды</span>
        <Kbd>⌘K</Kbd>
      </button>

      <nav className="views" ref={navRef} aria-label="Статусы размещений">
        <span className="views__title">Виды</span>
        {marker && (
          <span
            className="views__marker"
            aria-hidden="true"
            style={cssVars({
              '--x': `${marker.x}px`,
              '--y': `${marker.y}px`,
              '--w': `${marker.width}px`,
              '--h': `${marker.height}px`,
            })}
          />
        )}
        {items.map((item, i) => (
          <button
            key={item.key}
            type="button"
            className="views__item"
            data-status={item.index >= 0 ? item.index : undefined}
            aria-current={activeKey === item.key ? 'true' : undefined}
            style={cssVars({ '--i': i })}
            onClick={() => onSelect(item.status)}
          >
            {item.index >= 0 ? (
              <span className="views__dot" aria-hidden="true" />
            ) : (
              <Icon name="table" size={15} className="views__icon" />
            )}
            <span className="views__label">{item.label}</span>
            <span className="views__count">{item.count}</span>
          </button>
        ))}
      </nav>

      <p className="sidebar__hint">
        <Kbd>/</Kbd> поиск · <Kbd>J</Kbd>
        <Kbd>K</Kbd> листать
      </p>
    </aside>
  );
}
