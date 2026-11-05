/** Воронка работы с блогером — порядок важен: он же используется для сортировки. */
export const STATUSES = [
  'Согласование',
  'Запланировано',
  'Опубликовано',
  'Результаты получены',
] as const;
export type Status = (typeof STATUSES)[number];

export const PLATFORMS = ['Telegram', 'VK', 'YouTube'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const BUDGET_TYPES = ['Платное размещение', 'Бартер'] as const;
export type BudgetType = (typeof BUDGET_TYPES)[number];

/** Одна строка таблицы — одно размещение у блогера. */
export interface Placement {
  id: number;
  article: string;
  name: string;
  platform: Platform;
  budgetType: BudgetType;
  subscribers: number;
  audienceAge: string;
  audienceGeo: string;
  storyReach: number;
  reelsViews: number;
  /** Стоимость размещения, ₽ (для бартера — оценка стоимости). */
  cost: number;
  /** Себестоимость товара, ₽. */
  productCost: number;
  format: string;
  status: Status;
  /** Дата в формате ГГГГ-ММ-ДД. */
  date: string;
  link: string;
  comment: string;
}

export type SortKey =
  | 'name'
  | 'platform'
  | 'status'
  | 'date'
  | 'subscribers'
  | 'storyReach'
  | 'reelsViews'
  | 'cost'
  | 'cpm';
export type SortDir = 'asc' | 'desc';
export interface Sort {
  key: SortKey;
  dir: SortDir;
}

export interface Filters {
  query: string;
  status: Status | null;
  platforms: Platform[];
}
