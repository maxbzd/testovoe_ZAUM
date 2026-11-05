import type { RefObject } from 'react';
import type { Platform } from '../types';
import { PlatformFilter } from './PlatformFilter';
import { SearchField } from './SearchField';

interface Props {
  query: string;
  onQuery: (value: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  platforms: readonly Platform[];
  platformCounts: Record<Platform, number>;
  onTogglePlatform: (platform: Platform) => void;
  onClearPlatforms: () => void;
  shown: number;
  total: number;
  hasFilters: boolean;
  onReset: () => void;
}

/** Панель над таблицей (десктоп): поиск, фильтр, счётчик. */
export function Toolbar(props: Props) {
  return (
    <div className="toolbar">
      <SearchField value={props.query} onChange={props.onQuery} inputRef={props.searchRef} />
      <PlatformFilter
        selected={props.platforms}
        counts={props.platformCounts}
        onToggle={props.onTogglePlatform}
        onClear={props.onClearPlatforms}
      />
      <div className="toolbar__end">
        {props.hasFilters && (
          <button type="button" className="link-btn" onClick={props.onReset}>
            Сбросить
          </button>
        )}
        <span className="toolbar__count" role="status" aria-live="polite">
          {props.shown} из {props.total}
        </span>
      </div>
    </div>
  );
}
