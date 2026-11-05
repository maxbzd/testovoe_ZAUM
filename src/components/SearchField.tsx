import type { RefObject } from 'react';
import { Icon } from './Icon';
import { Kbd } from './Badges';

interface Props {
  value: string;
  onChange: (value: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

/** Поиск по блогеру, артикулу и комментарию. `Esc` очищает, затем снимает фокус. */
export function SearchField({ value, onChange, inputRef }: Props) {
  return (
    <label className="search">
      <Icon name="search" size={15} />
      <input
        ref={inputRef}
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="Блогер, артикул, комментарий"
        aria-label="Поиск по блогеру, артикулу, комментарию"
        value={value}
        maxLength={100}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            if (value) onChange('');
            else event.currentTarget.blur();
          }
        }}
      />
      {value ? (
        <button
          type="button"
          className="search__clear"
          aria-label="Очистить поиск"
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
        >
          <Icon name="x" size={14} />
        </button>
      ) : (
        <Kbd>/</Kbd>
      )}
    </label>
  );
}
