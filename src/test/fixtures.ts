import type { Placement } from '../types';

export const make = (overrides: Partial<Placement> & Pick<Placement, 'id'>): Placement => ({
  article: `DEMO-${100 + overrides.id}`,
  name: `Блогер ${String(overrides.id).padStart(3, '0')}`,
  platform: 'Telegram',
  budgetType: 'Платное размещение',
  subscribers: 10_000,
  audienceAge: '25–34',
  audienceGeo: 'РФ 65%',
  storyReach: 1_000,
  reelsViews: 3_000,
  cost: 2_000,
  productCost: 300,
  format: 'Пост',
  status: 'Согласование',
  date: '2026-11-02',
  link: 'https://example.com/demo',
  comment: '',
  ...overrides,
});

export const sample: Placement[] = [
  make({
    id: 1,
    platform: 'Telegram',
    status: 'Согласование',
    cost: 2_000,
    storyReach: 1_000,
    date: '2026-11-03',
  }),
  make({
    id: 2,
    platform: 'VK',
    status: 'Опубликовано',
    cost: 3_000,
    storyReach: 2_000,
    date: '2026-11-01',
    comment: 'Проверить результаты',
  }),
  make({
    id: 3,
    platform: 'YouTube',
    budgetType: 'Бартер',
    status: 'Результаты получены',
    cost: 4_000,
    storyReach: 4_000,
    date: '2026-11-02',
  }),
  make({
    id: 4,
    platform: 'Telegram',
    status: 'Запланировано',
    cost: 5_000,
    storyReach: 0,
    date: '2026-11-04',
  }),
];
