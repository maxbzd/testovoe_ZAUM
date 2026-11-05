import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { SearchField } from './SearchField';

function Harness() {
  const [value, setValue] = useState('');
  return <SearchField value={value} onChange={setValue} inputRef={createRef<HTMLInputElement>()} />;
}

describe('SearchField', () => {
  it('Esc сначала очищает запрос, потом снимает фокус', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'блогер');
    expect(input).toHaveValue('блогер');
    await user.keyboard('{Escape}');
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(input).not.toHaveFocus();
  });

  it('кнопка очистки возвращает фокус в поле', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByRole('textbox'), 'abc');
    await user.click(screen.getByRole('button', { name: 'Очистить поиск' }));
    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('ограничивает длину запроса', () => {
    render(<Harness />);
    expect(screen.getByRole('textbox')).toHaveAttribute('maxlength', '100');
  });
});
