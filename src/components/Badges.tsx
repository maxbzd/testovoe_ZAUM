import { PLATFORMS, STATUSES, type Platform, type Status } from '../types';

export const statusIndex = (status: Status): number => STATUSES.indexOf(status);

/** Статус: цветная точка и подпись. Цвет — только подсказка, смысл несёт текст. */
export function StatusBadge({ status, short = false }: { status: Status; short?: boolean }) {
  return (
    <span className="status" data-status={statusIndex(status)}>
      <span className="status__dot" aria-hidden="true" />
      {short && status === 'Результаты получены' ? 'Результаты' : status}
    </span>
  );
}

const ABBR: Record<Platform, string> = { Telegram: 'TG', VK: 'VK', YouTube: 'YT' };

export function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span className="platform" data-platform={PLATFORMS.indexOf(platform)}>
      <span className="platform__mark" aria-hidden="true">
        {ABBR[platform]}
      </span>
      {platform}
    </span>
  );
}

export function Kbd({ children }: { children: string }) {
  return <kbd className="kbd">{children}</kbd>;
}
