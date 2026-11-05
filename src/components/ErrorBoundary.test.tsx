import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Boom(): never {
  throw new Error('тестовый сбой');
}

afterEach(() => vi.restoreAllMocks());

describe('ErrorBoundary', () => {
  it('показывает сообщение вместо белого экрана', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Что-то пошло не так');
    expect(screen.getByRole('button', { name: 'Обновить страницу' })).toBeInTheDocument();
  });

  it('не мешает, пока всё хорошо', () => {
    render(
      <ErrorBoundary>
        <p>работает</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('работает')).toBeInTheDocument();
  });
});
