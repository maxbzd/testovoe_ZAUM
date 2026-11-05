import type { Mode } from '../lib/appearance';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { ThemeButton } from './ThemeButton';

interface Props {
  mode: Mode;
  onMode: (mode: Mode) => void;
  onOpenPalette: () => void;
  onExport: () => void;
}

/** Верхняя полоса на телефоне: бренд и три действия, остальное — ниже по экрану. */
export function MobileBar({ mode, onMode, onOpenPalette, onExport }: Props) {
  return (
    <header className="mbar">
      <div className="brand">
        <Logo className="brand__logo" height={13} />
        <span className="brand__section">Блогеры</span>
      </div>
      <div className="mbar__actions">
        <button
          type="button"
          className="icon-btn icon-btn--bordered"
          onClick={onOpenPalette}
          aria-label="Поиск и команды"
        >
          <Icon name="command" size={16} />
        </button>
        <ThemeButton mode={mode} onChange={onMode} />
        <button
          type="button"
          className="icon-btn icon-btn--bordered"
          onClick={onExport}
          aria-label="Экспорт в CSV"
        >
          <Icon name="download" size={16} />
        </button>
      </div>
    </header>
  );
}
