/**
 * The last guard of the demo mode (REP-20261028-005): while the demo is open, `fetch` answers the
 * calls of the app's own server (`/api/...`) from the facade and refuses everything else, so even
 * a page that reaches for the network by itself (the version on «Informazioni», the plan of the
 * house) stays inside the browser.
 */
import type { MockRequest, MockResponse } from './deviceFacade';

const requestUrl = (input: RequestInfo | URL): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

export function installFetchGuard(handle: (request: MockRequest) => Promise<MockResponse>) {
  const original = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(
      requestUrl(input),
      globalThis.document?.baseURI ?? globalThis.location.href
    );
    const at = url.pathname.indexOf('/api/');
    if (url.origin !== globalThis.location.origin || at < 0) {
      throw new TypeError('Failed to fetch: la modalità dimostrativa non usa la rete.');
    }
    const body = typeof init?.body === 'string' ? init.body : null;
    const answer = await handle({
      method: init?.method ?? (input instanceof Request ? input.method : 'GET'),
      path: `${url.pathname.slice(at + 4)}${url.search}`,
      body,
    });
    const status = answer.status;
    return answer.blob
      ? new Response(answer.blob, { status })
      : new Response(JSON.stringify(answer.body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
  };
  return () => {
    globalThis.fetch = original;
  };
}
