import { importQrPairing, type QrAcceptance, type QrConfiguration } from './qrPairing';
import { isObject } from '@/validators/guards';
import type { LauncherContextSetters } from '@/hooks/launcher/useSnapshotSetters';

const HANDOFF_KEY = 'aca_pairing_last_handoff';
/** La consegna nativa resta idempotente; il consumatore v2 conserva le copie senza applicarle. */
export async function drainQrHandoffs(setters: LauncherContextSetters, signal?: AbortSignal,
  consume?: (value: QrAcceptance) => void | Promise<void>): Promise<void> {
  for (let count = 0; count < 4; count++) {
    const response = await fetch('/__acasystem/pairing', { cache: 'no-store', signal });
    if (!response.ok || response.status === 204) return;
    const value: unknown = await response.json();
    if (!isObject(value) || value.schema !== 1 || typeof value.pairingId !== 'string'
      || typeof value.houseId !== 'string' || (value.mode !== 'account' && value.mode !== 'configuration')) return;
    if (localStorage.getItem(HANDOFF_KEY) !== value.pairingId) {
      if (consume) await consume(value as unknown as QrAcceptance);
      else importQrPairing(value as unknown as QrAcceptance, setters);
      localStorage.setItem(HANDOFF_KEY, value.pairingId);
    }
    const ack = await fetch('/__acasystem/pairing/ack', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pairingId: value.pairingId }), signal,
    });
    if (!ack.ok) return;
  }
}

export const PENDING_LAYOUT_COPY_KEY = 'aca:qr:pending-layout-copy:v2';
export function readPendingLayoutCopy(): QrConfiguration | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(PENDING_LAYOUT_COPY_KEY) || 'null');
    return isObject(value) && isObject(value.snapshot) && value.snapshot.version === 1
      && isObject(value.snapshot.layout) && isObject(value.appearance) ? value as unknown as QrConfiguration : null;
  } catch { return null; }
}
export const clearPendingLayoutCopy = () => localStorage.removeItem(PENDING_LAYOUT_COPY_KEY);
export async function captureNativeQrHandoff(signal: AbortSignal): Promise<void> {
  await drainQrHandoffs({}, signal, (value) => {
    if (value.mode === 'account') importQrPairing(value, {});
    else if (value.configuration) {
      const serialized = JSON.stringify(value.configuration);
      if (new TextEncoder().encode(serialized).length > 512 * 1024) throw new Error('Il layout ricevuto è troppo grande.');
      localStorage.setItem(PENDING_LAYOUT_COPY_KEY, serialized);
      // Il file rimane una copia da convalidare: aggiorna soltanto il tipo di ingresso,
      // senza applicare lo snapshot né conservare un vincolo account precedente.
      importQrPairing({ ...value, configuration: undefined }, {});
    }
  });
}
