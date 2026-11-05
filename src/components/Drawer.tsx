import { useEffect, useRef, type ReactNode } from 'react';
import { useDialog } from '../hooks/useDialog';
import { useSheetDrag } from '../hooks/useSheetDrag';
import { cssVars } from '../lib/css';
import { isTyping } from '../lib/dom';
import { formatDateLong, formatInt, formatRub } from '../lib/format';
import { cpmOf } from '../lib/metrics';
import { safeExternalUrl } from '../lib/safe-url';
import { STATUSES, type Placement } from '../types';
import { Kbd, PlatformBadge, StatusBadge, statusIndex } from './Badges';
import { Icon } from './Icon';

interface Props {
  item: Placement;
  closing: boolean;
  /** Поверх открылась палитра или фильтры: карточка не слушает клавиатуру. */
  suspended: boolean;
  /** Позиция в текущем отборе; null — карточка открыта не из списка. */
  position: { index: number; total: number } | null;
  onClose: () => void;
  onStep: (delta: 1 | -1) => void;
  onCopy: (text: string) => void;
}

const SHORT_STEPS = ['Согласование', 'Запланировано', 'Опубликовано', 'Результаты'] as const;

function Prop({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="prop">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function Drawer({ item, closing, suspended, position, onClose, onStep, onCopy }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useDialog(rootRef, { onClose, initialFocus: closeRef, suspended });
  const drag = useSheetDrag(rootRef, onClose);

  // J/K и стрелки листают размещения; пока печатают или открыта палитра — молчим.
  useEffect(() => {
    if (suspended) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;
      if (event.key === 'j' || event.key === 'ArrowDown') {
        event.preventDefault();
        onStep(1);
      } else if (event.key === 'k' || event.key === 'ArrowUp') {
        event.preventDefault();
        onStep(-1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onStep, suspended]);

  const link = safeExternalUrl(item.link);
  const current = statusIndex(item.status);
  const cpm = cpmOf(item);
  const total = item.cost + item.productCost;

  return (
    <div className="drawer-layer" data-closing={closing || undefined}>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={rootRef}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="drawer__grip" aria-hidden="true" {...drag}>
          <span />
        </div>

        <header className="drawer__head">
          <span className="drawer__crumb">
            {item.article}
            {position && (
              <span className="muted">
                {' '}
                · {position.index + 1} из {position.total}
              </span>
            )}
          </span>
          <div className="drawer__tools">
            <button
              type="button"
              className="icon-btn"
              onClick={() => onStep(-1)}
              disabled={!position}
              aria-label="Предыдущее размещение"
            >
              <Icon name="chevronUp" size={17} />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => onStep(1)}
              disabled={!position}
              aria-label="Следующее размещение"
            >
              <Icon name="chevronDown" size={17} />
            </button>
            <button
              ref={closeRef}
              type="button"
              className="icon-btn"
              onClick={onClose}
              aria-label="Закрыть"
            >
              <Icon name="x" size={17} />
            </button>
          </div>
        </header>

        <div
          className="drawer__body"
          key={item.id}
          tabIndex={0}
          role="region"
          aria-labelledby="drawer-title"
        >
          <h2 id="drawer-title" className="drawer__title">
            {item.name}
          </h2>
          <div className="drawer__line">
            <StatusBadge status={item.status} />
            <span className="muted">{formatDateLong(item.date)}</span>
          </div>

          <ol className="steps" aria-label="Этап воронки">
            {STATUSES.map((status, index) => (
              <li
                key={status}
                className="step"
                data-state={index < current ? 'done' : index === current ? 'current' : 'todo'}
                data-status={index}
                aria-current={index === current ? 'step' : undefined}
                style={cssVars({ '--i': index })}
              >
                <span className="step__bar" aria-hidden="true" />
                <span className="step__label">{SHORT_STEPS[index]}</span>
              </li>
            ))}
          </ol>

          <section className="group">
            <h3>Результаты</h3>
            <dl>
              <Prop label="Охват сторис">{formatInt(item.storyReach)}</Prop>
              <Prop label="Просмотры рилс">{formatInt(item.reelsViews)}</Prop>
              <Prop label="CPM">{formatRub(cpm)}</Prop>
            </dl>
          </section>

          <section className="group">
            <h3>Размещение</h3>
            <dl>
              <Prop label="Площадка">
                <PlatformBadge platform={item.platform} />
              </Prop>
              <Prop label="Формат">{item.format}</Prop>
              <Prop label="Категория бюджета">{item.budgetType}</Prop>
            </dl>
          </section>

          <section className="group">
            <h3>Затраты</h3>
            <dl>
              <Prop label={item.budgetType === 'Бартер' ? 'Стоимость (оценка)' : 'Размещение'}>
                {formatRub(item.cost)}
              </Prop>
              <Prop label="Себестоимость товара">{formatRub(item.productCost)}</Prop>
              <Prop label="Итого">
                <strong>{formatRub(total)}</strong>
              </Prop>
            </dl>
          </section>

          <section className="group">
            <h3>Блогер и аудитория</h3>
            <dl>
              <Prop label="Подписчики">{formatInt(item.subscribers)}</Prop>
              <Prop label="Возраст аудитории">{item.audienceAge}</Prop>
              <Prop label="Гео аудитории">{item.audienceGeo}</Prop>
            </dl>
          </section>

          {item.comment && (
            <section className="group">
              <h3>Комментарий</h3>
              <p className="note">{item.comment}</p>
            </section>
          )}
        </div>

        <footer className="drawer__foot">
          {link ? (
            <a className="btn btn--primary" href={link} target="_blank" rel="noopener noreferrer">
              <Icon name="external" size={15} />
              Открыть публикацию
            </a>
          ) : (
            <span className="btn btn--primary" aria-disabled="true">
              Нет ссылки
            </span>
          )}
          <button
            type="button"
            className="btn"
            onClick={() => onCopy(item.article)}
            aria-label={`Копировать артикул ${item.article}`}
          >
            <Icon name="copy" size={15} />
            Артикул
          </button>
          <span className="drawer__keys" aria-hidden="true">
            <Kbd>J</Kbd>
            <Kbd>K</Kbd>
          </span>
        </footer>
      </div>
    </div>
  );
}
