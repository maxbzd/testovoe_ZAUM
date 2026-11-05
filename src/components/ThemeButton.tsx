import { MODES, type Mode } from '../lib/appearance';
import { Icon, type IconName } from './Icon';

const ICON: Record<Mode, IconName> = { system: 'monitor', light: 'sun', dark: 'moon' };
const LABEL: Record<Mode, string> = { system: 'системная', light: 'светлая', dark: 'тёмная' };

/** Одна кнопка: системная → светлая → тёмная. Без выпадающих меню ради трёх значений. */
export function ThemeButton({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length] as Mode;
  return (
    <button
      type="button"
      className="icon-btn icon-btn--bordered"
      onClick={() => onChange(next)}
      aria-label={`Тема: ${LABEL[mode]}. Переключить на ${LABEL[next]}`}
      title={`Тема: ${LABEL[mode]}`}
    >
      <Icon name={ICON[mode]} size={16} />
    </button>
  );
}
