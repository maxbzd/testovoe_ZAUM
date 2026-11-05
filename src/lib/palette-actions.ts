import type { IconName } from '../components/Icon';
import { MODES, type Mode } from './appearance';
import { PLATFORMS, STATUSES, type Platform, type Status } from '../types';

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  keywords?: string;
  icon: IconName;
  run: () => void;
}

interface Params {
  statusCounts: Record<Status, number>;
  selectedPlatforms: readonly Platform[];
  rowCount: number;
  filtersActive: boolean;
  selectStatus: (status: Status | null) => void;
  togglePlatform: (platform: Platform) => void;
  resetFilters: () => void;
  exportCsv: () => void;
  setMode: (mode: Mode) => void;
}

const MODE_LABEL: Record<Mode, string> = {
  system: 'системная',
  light: 'светлая',
  dark: 'тёмная',
};
const MODE_ICON: Record<Mode, IconName> = { system: 'monitor', light: 'sun', dark: 'moon' };

/** Команды палитры ⌘K: каждая — то же, что можно сделать мышью, только быстрее. */
export function buildPaletteActions(p: Params): PaletteAction[] {
  const actions: PaletteAction[] = [
    {
      id: 'view-all',
      label: 'Показать все размещения',
      icon: 'table',
      keywords: 'все статус вид',
      run: () => p.selectStatus(null),
    },
    ...STATUSES.map<PaletteAction>((status) => ({
      id: `view-${status}`,
      label: `Показать: ${status}`,
      hint: String(p.statusCounts[status]),
      icon: 'table',
      keywords: 'статус вид воронка',
      run: () => p.selectStatus(status),
    })),
    ...PLATFORMS.map<PaletteAction>((platform) => ({
      id: `platform-${platform}`,
      label: `${p.selectedPlatforms.includes(platform) ? 'Убрать' : 'Добавить'} фильтр: ${platform}`,
      icon: 'filter',
      keywords: 'площадка фильтр',
      run: () => p.togglePlatform(platform),
    })),
    {
      id: 'export',
      label: 'Экспорт в CSV',
      hint: String(p.rowCount),
      icon: 'download',
      keywords: 'скачать выгрузка excel',
      run: p.exportCsv,
    },
    ...MODES.map<PaletteAction>((mode) => ({
      id: `theme-${mode}`,
      label: `Тема: ${MODE_LABEL[mode]}`,
      icon: MODE_ICON[mode],
      keywords: 'оформление цвет',
      run: () => p.setMode(mode),
    })),
  ];
  if (p.filtersActive) {
    actions.unshift({
      id: 'reset',
      label: 'Сбросить фильтры',
      icon: 'x',
      keywords: 'очистить убрать',
      run: p.resetFilters,
    });
  }
  return actions;
}
