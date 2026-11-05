import '@fontsource-variable/inter/wght.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import raw from './data/bloggers.json';
import { parsePlacements } from './data/load';
import './styles/index.css';
import type { Placement } from './types';

const container = document.getElementById('root');
if (!container) throw new Error('Не найден #root');
const root = createRoot(container);

let placements: Placement[] | null = null;
let failure = '';
try {
  placements = parsePlacements(raw);
} catch (error) {
  failure = error instanceof Error ? error.message : 'Неизвестная ошибка данных';
}

if (placements) {
  root.render(
    <StrictMode>
      <App placements={placements} />
    </StrictMode>,
  );
} else {
  root.render(
    <main className="fatal" role="alert">
      <h1>Данные не загрузились</h1>
      <p>{failure}</p>
    </main>,
  );
}
