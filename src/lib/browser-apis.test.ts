import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from './clipboard';
import { downloadCsv } from './csv';
import { withTransition } from './transition';
import { make } from '../test/fixtures';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (document as { startViewTransition?: unknown }).startViewTransition;
});

describe('copyText', () => {
  it('использует Clipboard API', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await copyText('DEMO-1')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('DEMO-1');
  });

  it('при отказе Clipboard API копирует запасным способом', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    document.execCommand = vi.fn().mockReturnValue(true);
    expect(await copyText('DEMO-2')).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull(); // временное поле убрано
  });

  it('честно сообщает о неудаче', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    document.execCommand = vi.fn().mockImplementation(() => {
      throw new Error('нет');
    });
    expect(await copyText('x')).toBe(false);
  });
});

describe('downloadCsv', () => {
  it('создаёт ссылку на файл с нужным именем и освобождает память', () => {
    vi.useFakeTimers();
    const create = vi.fn().mockReturnValue('blob:csv');
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    expect(downloadCsv([make({ id: 1 })], 'bloggers-test.csv')).toBe(true);
    expect(click).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[download]')).toBeNull(); // временная ссылка убрана

    vi.advanceTimersByTime(1100);
    expect(revoke).toHaveBeenCalledWith('blob:csv');
    vi.useRealTimers();
  });

  it('возвращает false, если браузер не дал создать файл', () => {
    vi.stubGlobal('URL', {
      createObjectURL: () => {
        throw new Error('blocked');
      },
    });
    expect(downloadCsv([make({ id: 1 })], 'x.csv')).toBe(false);
  });
});

describe('withTransition', () => {
  it('без View Transitions обновляет сразу', () => {
    const update = vi.fn();
    withTransition(update);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('с View Transitions выполняет обновление внутри перехода', () => {
    const update = vi.fn();
    const start = vi.fn((callback: () => void) => callback());
    Object.defineProperty(document, 'startViewTransition', { value: start, configurable: true });
    withTransition(update);
    expect(start).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
