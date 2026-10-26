import { describe, expect, it } from 'vitest';
import { needsBrowserReset } from '../browserReset.ts';

describe('needsBrowserReset (cambio di mini PC)', () => {
  it('cancella i dati quando il mini PC cambia', () => {
    expect(needsBrowserReset('http://192.168.1.183:3002', 'http://192.168.1.19:3002')).toBe(true);
    expect(needsBrowserReset('http://192.168.1.19:3006', 'http://192.168.1.19:3002')).toBe(true);
  });

  it('non tocca nulla con lo stesso mini PC o senza un avvio precedente ricordato', () => {
    expect(needsBrowserReset('http://192.168.1.19:3002', 'http://192.168.1.19:3002')).toBe(false);
    expect(needsBrowserReset(null, 'http://192.168.1.19:3002')).toBe(false);
  });
});
