import type * as CsvModule from './lib/csv';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { sample } from './test/fixtures';

const downloadCsv = vi.hoisted(() => vi.fn());
vi.mock('./config', () => ({ config: { preview: true } }));
vi.mock('./lib/csv', async (importOriginal) => ({
  ...(await importOriginal<typeof CsvModule>()),
  downloadCsv,
}));

describe('App в режиме превью', () => {
  it('честно сообщает, что скачивание отключено, и не пытается скачать', async () => {
    const user = userEvent.setup();
    render(<App placements={sample} />);
    await user.click(screen.getByRole('button', { name: /Экспорт CSV/ }));
    expect(await screen.findByText(/скачивание отключено/)).toBeInTheDocument();
    expect(downloadCsv).not.toHaveBeenCalled();
  });
});
