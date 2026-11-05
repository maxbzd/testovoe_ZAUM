import '@fontsource-variable/inter/wght.css';
import { mount } from './bootstrap';
import raw from './data/bloggers.json';
import './styles/index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Не найден #root');
mount(container, raw);
