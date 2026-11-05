import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { parsePlacements } from './data/load';

/**
 * Запускает приложение. Данные проверяются до первого рендера: если таблица
 * сломана, человек увидит понятное сообщение, а не пустую страницу.
 */
export function mount(container: HTMLElement, rawData: unknown): Root {
  const root = createRoot(container);
  try {
    const placements = parsePlacements(rawData);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App placements={placements} />
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (error) {
    root.render(
      <main className="fatal" role="alert">
        <h1>Данные не загрузились</h1>
        <p>{error instanceof Error ? error.message : 'Неизвестная ошибка данных'}</p>
      </main>,
    );
  }
  return root;
}
