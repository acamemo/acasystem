// Indirizzo interno di Home Assistant visto da un'app di HA OS (REP-20261026-005, S1):
// `homeassistant` sulla rete del Supervisor, con porta e protocollo letti da GET /core/info.
// Stampa l'URL; se il Supervisor non risponde usa la porta di serie 8123 e lo scrive nel log.
const supervisor = process.env.ACASYSTEM_SUPERVISOR_URL || 'http://supervisor';
const token = process.env.SUPERVISOR_TOKEN;
let url = 'http://homeassistant:8123';

if (!token) {
  console.error('[acasystem] SUPERVISOR_TOKEN assente: Home Assistant sulla porta 8123 di serie');
} else {
  try {
    const response = await fetch(`${supervisor}/core/info`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    const body = await response.json();
    const port = Number(body?.data?.port);
    if (!response.ok || !Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`risposta inattesa (HTTP ${response.status})`);
    }
    url = `${body.data.ssl === true ? 'https' : 'http'}://homeassistant:${port}`;
  } catch (error) {
    console.error(`[acasystem] porta di Home Assistant non letta dal Supervisor (${error.message}): uso 8123`);
  }
}

process.stdout.write(url);
