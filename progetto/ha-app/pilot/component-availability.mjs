import { compare } from './update-policy.mjs';

const status = (component, installed, latest) => {
  let newer = null;
  try { newer = compare(latest, installed) > 0; } catch { /* Versione non dichiarata: nessuna disponibilita inventata. */ }
  return { component, installed: typeof installed === 'string' ? installed : null,
    latest: typeof latest === 'string' ? latest : null, newer,
    status: newer === null ? 'unavailable' : newer ? 'available' : 'current',
    installation: 'separate-local-decision' };
};

/** Sola disponibilita, distinta dall'installazione. Token solo verso URL Supervisor fissi. */
export async function readComponentAvailability({ supervisorToken, sonoffVersion, fetcher = fetch, timeoutMs = 5000 } = {}) {
  const core = await Promise.all(['os', 'core', 'supervisor'].map(async (part) => {
    const name = part === 'os' ? 'haos' : part;
    if (!supervisorToken) return status(name);
    try {
      const response = await fetcher(`http://supervisor/${part}/info`, { method: 'GET', redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs), headers: { Authorization: `Bearer ${supervisorToken}` } });
      if (!response.ok) return status(name);
      const body = await response.json();
      return body?.result === 'ok' ? status(name, body.data?.version, body.data?.version_latest) : status(name);
    } catch { return status(name); }
  }));
  let latest;
  try {
    const response = await fetcher('https://api.github.com/repos/AlexxIT/SonoffLAN/releases/latest', {
      method: 'GET', signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'application/vnd.github+json' },
    });
    if (response.ok) {
      const body = await response.json();
      if (body?.draft === false && body.prerelease === false && /^v?\d+\.\d+\.\d+$/.test(body.tag_name ?? '')) latest = body.tag_name.replace(/^v/, '');
    }
  } catch { /* Sonoff indisponibile non interrompe le letture HA. */ }
  return [...core, status('sonofflan', sonoffVersion, latest)];
}
