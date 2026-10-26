// Indirizzo interno di Home Assistant visto da un'app di HA OS (REP-20261026-005, S1):
// `homeassistant` sulla rete del Supervisor, con porta e protocollo letti da GET /core/info.
// Su un mini PC lento il Supervisor può tardare (VM di prova con 1 CPU, REP-20261026-005 S4-S5):
// si riprova per circa un minuto; poi si cerca HA sulle porte 8123 e 80, infine 8123 di serie.
// Stampa l'URL; i ripieghi si scrivono nel log.
const supervisor = process.env.ACASYSTEM_SUPERVISOR_URL || 'http://supervisor';
const token = process.env.SUPERVISOR_TOKEN;
const haHost = process.env.ACASYSTEM_HA_HOST || 'homeassistant';
const attempts = Number(process.env.ACASYSTEM_DETECT_ATTEMPTS || 6);
const pauseMs = Number(process.env.ACASYSTEM_DETECT_PAUSE_MS || 5000);

const fromSupervisor = async () => {
  const response = await fetch(`${supervisor}/core/info`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json();
  const port = Number(body?.data?.port);
  if (!response.ok || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`risposta inattesa (HTTP ${response.status})`);
  }
  return `${body.data.ssl === true ? 'https' : 'http'}://${haHost}:${port}`;
};

/** HA risponde a /api/ anche senza token (401): basta che la porta sia sua. */
const probe = async (url) => {
  try {
    const response = await fetch(`${url}/api/`, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
    await response.body?.cancel();
    return response.status === 200 || response.status === 401;
  } catch {
    return false;
  }
};

const detect = async () => {
  if (!token) {
    console.error('[acasystem] SUPERVISOR_TOKEN assente: cerco Home Assistant sulle porte 8123 e 80');
  } else {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await fromSupervisor();
      } catch (error) {
        console.error(`[acasystem] porta di Home Assistant non letta dal Supervisor (tentativo ${attempt}/${attempts}: ${error.message})`);
        if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, pauseMs));
      }
    }
  }
  for (const candidate of [`http://${haHost}:8123`, `http://${haHost}:80`]) {
    if (await probe(candidate)) {
      console.error(`[acasystem] Home Assistant trovato su ${candidate}`);
      return candidate;
    }
  }
  console.error('[acasystem] Home Assistant non trovato: uso la porta 8123 di serie');
  return `http://${haHost}:8123`;
};

process.stdout.write(await detect());
