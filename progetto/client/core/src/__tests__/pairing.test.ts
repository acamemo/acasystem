import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parsePairingCode } from '../pairing.ts';

const webFixture = JSON.parse(
  readFileSync(
    new URL('../../../../acasystem/frontend/src/__tests__/fixtures/pairing-web-v1.json', import.meta.url),
    'utf8',
  ),
) as {
  endpoint: string;
  houseId: string;
  invite: string;
  url: string;
  invalid: string[];
};

const code = (endpoint = 'http://192.168.1.50:3002') =>
  `acasystem://pair?v=1&endpoint=${encodeURIComponent(endpoint)}&house=house-1&invite=${'a'.repeat(43)}`;

describe('QR ACA di acquisizione', () => {
  it('legge la fixture web condivisa con il browser e mantiene lo stesso contratto del legacy', () => {
    const legacy = `acasystem://pair?v=1&endpoint=${encodeURIComponent(webFixture.endpoint)}&house=${webFixture.houseId}&invite=${webFixture.invite}`;
    expect(parsePairingCode(webFixture.url)).toEqual({
      ok: true,
      value: {
        endpoint: webFixture.endpoint,
        houseId: webFixture.houseId,
        invite: webFixture.invite,
        config: { host: '192.168.1.50', port: 3002 },
      },
    });
    expect(parsePairingCode(webFixture.url)).toEqual(parsePairingCode(legacy));
  });
  it.each(['10.0.0.20', '172.16.0.20', '172.31.255.254', '192.168.1.50'])(
    'accetta la rete privata canonica %s e deriva la destinazione solo dall’origine',
    (host) => {
      expect(
        parsePairingCode(webFixture.url.replace('192.168.1.50', host)),
      ).toMatchObject({
        ok: true,
        value: {
          endpoint: `http://${host}:3002`,
          config: { host, port: 3002 },
        },
      });
    },
  );
  it.each(webFixture.invalid)(
    'rifiuta il QR web non canonico o ambiguo: %s',
    (value) => {
      expect(parsePairingCode(value).ok).toBe(false);
    },
  );
  it('legge casa, invito e porta senza modificare configurazioni', () => {
    expect(parsePairingCode(code())).toEqual({
      ok: true,
      value: {
        endpoint: 'http://192.168.1.50:3002',
        houseId: 'house-1',
        invite: 'a'.repeat(43),
        config: { host: '192.168.1.50', port: 3002 },
      },
    });
  });
  it.each([
    'http://127.0.0.1:47320',
    'http://example.com',
    'https://192.168.1.50',
    'http://8.8.8.8',
    'http://192.168.1.50/path',
    'http://user:pass@192.168.1.50',
    'http://192.168.1.50/?next=x',
  ])('rifiuta una destinazione non supportata: %s', (endpoint) => {
    expect(parsePairingCode(code(endpoint))).toEqual({
      ok: false,
      error: 'unsupported-endpoint',
    });
  });
  it('rifiuta parametri doppi, frammenti, altri QR e versioni ignote', () => {
    expect(parsePairingCode(`${code()}&house=other`).ok).toBe(false);
    expect(parsePairingCode(`${code()}#token`).ok).toBe(false);
    expect(parsePairingCode('https://example.com').ok).toBe(false);
    expect(parsePairingCode(code().replace('?v=1', '?v=2'))).toEqual({
      ok: false,
      error: 'unsupported-version',
    });
  });
});
