import type { PairingCode } from '../../core/src/pairing.ts';
import type { AcaShellPlugin, CapacitorHttpPlugin } from './capacitorPorts.ts';

export type PairingAction = 'account' | 'configuration';
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** CONFIG acquisisce una copia: non cambia mai la propria casa. */
export async function acceptPairing(
  code: PairingCode,
  action: PairingAction,
  http: CapacitorHttpPlugin,
  shell: Pick<AcaShellPlugin, 'savePairing' | 'saveConfig'>,
): Promise<void> {
  const response = await http.request({
    method: 'POST',
    url: `${code.endpoint}/api/pairing/accept`,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    data: { invite: code.invite, houseId: code.houseId, action },
    connectTimeout: 10_000,
    readTimeout: 15_000,
    responseType: 'json',
  });
  if (response.status === 410)
    throw new Error(
      'Il codice è scaduto o è già stato usato. Mostra un nuovo codice QR sul dispositivo di partenza.',
    );
  if (response.status !== 200)
    throw new Error(
      'Non riesco a completare il collegamento. Mostra un nuovo codice QR e riprova.',
    );
  let data: unknown = response.data;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }
  if (
    !record(data) ||
    data.schema !== 1 ||
    data.houseId !== code.houseId ||
    data.mode !== action ||
    typeof data.pairingId !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      data.pairingId,
    ) ||
    data.loginRequired !== true ||
    (action === 'account' && typeof data.accountUserId !== 'string') ||
    (action === 'configuration' && !record(data.configuration))
  ) {
    throw new Error(
      'Il codice non ha restituito un collegamento ACA valido. Generane uno nuovo.',
    );
  }
  const packet = {
    schema: 1,
    pairingId: data.pairingId,
    houseId: code.houseId,
    endpoint: code.endpoint,
    mode: action,
    loginRequired: true,
    ...(action === 'account'
      ? { accountUserId: data.accountUserId }
      : { configuration: data.configuration }),
  };
  await shell.savePairing({ value: JSON.stringify(packet) });
  if (action === 'account')
    await shell.saveConfig({ value: JSON.stringify(code.config) });
}
