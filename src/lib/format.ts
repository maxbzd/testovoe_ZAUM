const intFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

const MONTHS_SHORT = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
] as const;
const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
] as const;
const WEEKDAYS = [
  'воскресенье',
  'понедельник',
  'вторник',
  'среда',
  'четверг',
  'пятница',
  'суббота',
] as const;

/** 23200 → «23 200» (неразрывные пробелы, чтобы число не рвалось на две строки). */
export const formatInt = (value: number): string => intFormat.format(Math.round(value));

/** 6300 → «6 300 ₽». */
export const formatRub = (value: number): string => `${formatInt(value)} ₽`;

/** Доля 0..1 → «25%». */
export const formatPercent = (ratio: number): string => `${Math.round(ratio * 100)}%`;

interface DateParts {
  year: number;
  month: number;
  day: number;
}

/** Разбор ГГГГ-ММ-ДД без часовых поясов: дата не «съезжает» на соседний день. */
export function parseIsoDate(iso: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [, y, m, d] = match;
  const parts = { year: Number(y), month: Number(m), day: Number(d) };
  const probe = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const valid =
    probe.getUTCFullYear() === parts.year &&
    probe.getUTCMonth() === parts.month - 1 &&
    probe.getUTCDate() === parts.day;
  return valid ? parts : null;
}

/** «2026-11-02» → «2 ноя». */
export function formatDateShort(iso: string): string {
  const parts = parseIsoDate(iso);
  if (!parts) return iso;
  return `${parts.day} ${MONTHS_SHORT[parts.month - 1] ?? ''}`;
}

/** «2026-11-12» → «12 ноября 2026, четверг». */
export function formatDateLong(iso: string): string {
  const parts = parseIsoDate(iso);
  if (!parts) return iso;
  const weekday = WEEKDAYS[new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()];
  return `${parts.day} ${MONTHS_GENITIVE[parts.month - 1] ?? ''} ${parts.year}, ${weekday ?? ''}`;
}

/** Русское склонение: plural(1, ['размещение','размещения','размещений']) → «размещение». */
export function plural(n: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}

/** «2026-11-02», «2026-11-25» → «2–25 ноября 2026». */
export function formatDateRange(fromIso: string, toIso: string): string {
  const from = parseIsoDate(fromIso);
  const to = parseIsoDate(toIso);
  if (!from || !to) return '';
  if (from.year === to.year && from.month === to.month) {
    const month = MONTHS_GENITIVE[to.month - 1] ?? '';
    return from.day === to.day
      ? `${to.day} ${month} ${to.year}`
      : `${from.day}–${to.day} ${month} ${to.year}`;
  }
  return `${formatDateShort(fromIso)} – ${formatDateShort(toIso)} ${to.year}`;
}
