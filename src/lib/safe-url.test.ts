import { describe, expect, it } from 'vitest';
import { safeExternalUrl } from './safe-url';

describe('safeExternalUrl', () => {
  it('пропускает http и https', () => {
    expect(safeExternalUrl('https://example.com/demo-1')).toBe('https://example.com/demo-1');
    expect(safeExternalUrl('http://example.com/')).toBe('http://example.com/');
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    '//evil.example',
    'не ссылка',
    '',
  ])('отбрасывает %s', (value) => {
    expect(safeExternalUrl(value)).toBeNull();
  });
});
