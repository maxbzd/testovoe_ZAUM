/** Копирование с запасным путём для браузеров/iframe, где Clipboard API закрыт. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* пробуем запасной способ */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.className = 'sr-only';
    document.body.append(area);
    area.select();
    // Запасной путь для браузеров без Clipboard API (и iframe): другого способа нет.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const done = document.execCommand('copy');
    area.remove();
    return done;
  } catch {
    return false;
  }
}
