import { Icon } from './Icon';

export function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="empty">
      <span className="empty__icon" aria-hidden="true">
        <Icon name="inbox" size={22} />
      </span>
      <h3>Ничего не найдено</h3>
      <p>Попробуйте изменить запрос или снять фильтры.</p>
      <button type="button" className="btn" onClick={onReset}>
        Сбросить фильтры
      </button>
    </div>
  );
}
