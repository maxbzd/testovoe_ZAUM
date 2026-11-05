import { cssVars } from '../lib/css';
import { formatInt, formatRub } from '../lib/format';
import { positionInRange, type Metrics } from '../lib/metrics';
import { PLATFORMS, STATUSES, type Placement, type Status } from '../types';
import { AnimatedNumber } from './AnimatedNumber';

interface Props {
  metrics: Metrics;
  rows: readonly Placement[];
  /** Диапазон CPM и максимум охвата по всем данным: шкала не «прыгает» при фильтрации. */
  scale: { cpmMin: number; cpmMax: number; maxReach: number };
  statusCounts: Record<Status, number>;
  filtered: boolean;
  /** Лента прокручивается (телефон): нужен доступ с клавиатуры. */
  scrollable: boolean;
}

export function StatsBar({ metrics, rows, scale, statusCounts, filtered, scrollable }: Props) {
  const paid = PLATFORMS.map((platform) => ({
    platform,
    value: metrics.paidByPlatform[platform],
  })).filter((item) => item.value > 0);

  const byDate = [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const marker = positionInRange(metrics.avgCpm, scale.cpmMin, scale.cpmMax);

  return (
    <section
      className="stats"
      tabIndex={scrollable ? 0 : undefined}
      aria-label={filtered ? 'Показатели по текущему отбору' : 'Показатели'}
    >
      <div className="stat">
        <span className="stat__label">Платный бюджет</span>
        <span className="stat__value">
          <AnimatedNumber value={metrics.paidBudget} format={formatRub} />
        </span>
        <span className="split" aria-hidden="true">
          {paid.map((item) => (
            <span key={item.platform} style={cssVars({ '--grow': item.value })} />
          ))}
        </span>
        <span className="stat__sub">
          {paid.length > 0
            ? paid.map((item) => `${item.platform} ${formatInt(item.value)}`).join(' · ')
            : 'Платных размещений нет'}
        </span>
      </div>

      <div className="stat">
        <span className="stat__label">Бартер (оценка)</span>
        <span className="stat__value">
          <AnimatedNumber value={metrics.barterValue} format={formatRub} />
        </span>
        <span className="stat__sub stat__sub--keep">
          {metrics.barterCount > 0
            ? `${metrics.barterCount} размещений, без оплаты`
            : 'Бартера нет'}
        </span>
      </div>

      <div className="stat">
        <span className="stat__label">Охват сторис</span>
        <span className="stat__value">
          <AnimatedNumber value={metrics.storyReach} format={formatInt} />
        </span>
        <span className="spark" aria-hidden="true">
          {byDate.map((item) => (
            <span
              key={item.id}
              style={cssVars({ '--h': scale.maxReach > 0 ? item.storyReach / scale.maxReach : 0 })}
            />
          ))}
        </span>
        <span className="stat__sub">Просмотры рилс: {formatInt(metrics.reelsViews)}</span>
      </div>

      <div className="stat">
        <span className="stat__label">Средний CPM</span>
        <span className="stat__value">
          {metrics.count > 0 ? <AnimatedNumber value={metrics.avgCpm} format={formatRub} /> : '—'}
        </span>
        <span
          className="range"
          data-empty={metrics.count === 0 || undefined}
          role="img"
          aria-label={`Диапазон CPM по всем данным: ${formatInt(scale.cpmMin)}–${formatInt(scale.cpmMax)} ₽`}
          title={`Диапазон по всем данным: ${formatInt(scale.cpmMin)}–${formatInt(scale.cpmMax)} ₽`}
        >
          <span style={cssVars({ '--pos': marker })} />
        </span>
        <span className="stat__sub">
          {metrics.count > 0 ? 'за 1000 охвата сторис' : 'Нет данных'}
        </span>
      </div>

      <div className="stat">
        <span className="stat__label">Результаты получены</span>
        <span className="stat__value">
          <AnimatedNumber value={metrics.resultsReceived} format={formatInt} />
          <span className="stat__of"> из {metrics.count}</span>
        </span>
        <span className="split split--status" aria-hidden="true">
          {STATUSES.map((status, index) =>
            statusCounts[status] > 0 ? (
              <span
                key={status}
                data-status={index}
                style={cssVars({ '--grow': statusCounts[status] })}
              />
            ) : null,
          )}
        </span>
        <span className="stat__sub">
          {metrics.awaitingResults > 0
            ? `${metrics.awaitingResults} опубликованных ждут результатов`
            : 'Ждать нечего'}
        </span>
      </div>
    </section>
  );
}
