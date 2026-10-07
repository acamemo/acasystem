/**
 * Verifica del token a lunga durata per i tablet kiosk, attraverso il proxy di Acasystem
 * (ADR-0009). Il token passa solo a home-assistant-js-websocket: queste funzioni non lo
 * scrivono nei log né altrove.
 */
import {
  ERR_INVALID_AUTH,
  createConnection,
  createLongLivedTokenAuth,
  type Connection,
} from 'home-assistant-js-websocket';
import { currentLoginTarget, fetchAuthProviders, loginErrorCode } from '@/api/haLogin';
import { getHassUrl } from '@/api/haUrl';

export type ProbeResult = 'ok' | 'unreachable' | 'rejected' | 'not_configured';

export const PROBE_MESSAGES: Record<Exclude<ProbeResult, 'ok'>, string> = {
  unreachable:
    'Home Assistant non risponde. Controlla che sia acceso e raggiungibile dal server Acasystem, poi riprova.',
  rejected:
    'Home Assistant ha rifiutato il token. Creane uno nuovo dal tuo profilo di Home Assistant e incollalo qui.',
  not_configured:
    'Il server Acasystem non sa ancora dove si trova Home Assistant. Chi lo ha installato deve indicarne l’indirizzo nella configurazione del server.',
};

/**
 * Il WebSocket non dice perché non si apre: una richiesta di sola lettura al proxy distingue
 * il server non configurato (503) da Home Assistant che non risponde.
 */
async function explainUnreachable(): Promise<Exclude<ProbeResult, 'ok'>> {
  try {
    await fetchAuthProviders(currentLoginTarget());
    return 'unreachable';
  } catch (error) {
    return loginErrorCode(error) === 'not_configured' ? 'not_configured' : 'unreachable';
  }
}

/**
 * Apre una connessione di prova con il token e la chiude subito. Gli errori diventano un caso su
 * cui l'utente può agire; un collegamento che non risponde in tempo vale come irraggiungibile.
 */
export async function probeToken(
  token: string,
  { timeoutMs = 10_000, hassUrl = getHassUrl() }: { timeoutMs?: number; hassUrl?: string } = {}
): Promise<ProbeResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const attempt: Promise<{ conn: Connection } | { error: unknown }> = (async () => {
    try {
      return { conn: await createConnection({ auth: createLongLivedTokenAuth(hassUrl, token) }) };
    } catch (error) {
      return { error };
    }
  })();
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs);
  });
  try {
    const result = await Promise.race([attempt, timeout]);
    if (result === 'timeout') {
      void attempt.then((late) => {
        if ('conn' in late) late.conn.close();
      });
      return explainUnreachable();
    }
    if ('conn' in result) {
      result.conn.close();
      return 'ok';
    }
    if (result.error === ERR_INVALID_AUTH) return 'rejected';
    return explainUnreachable();
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
