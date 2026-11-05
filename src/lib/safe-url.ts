/**
 * Ссылки в данных приходят из таблицы, то есть от людей. Пропускаем только http(s):
 * `javascript:`, `data:` и прочее никогда не попадёт в href.
 */
export function safeExternalUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}
