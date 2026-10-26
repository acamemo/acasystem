/**
 * Dati del browser dell'interfaccia al cambio di mini PC (REP-20261026-005). L'interfaccia gira
 * sempre sulla stessa origine locale (127.0.0.1:47320), quindi sessione, localStorage, cache e
 * service worker di un impianto resterebbero sul successivo: si cancellano quando il mini PC
 * dell'avvio è diverso da quello dell'avvio precedente.
 */

/**
 * Vero se prima di aprire l'interfaccia vanno cancellati i dati del browser. Senza un avvio
 * precedente ricordato (prima installazione o aggiornamento da una versione che non lo salvava)
 * non si cancella nulla: si registra solo l'indirizzo, così chi ha già fatto l'accesso lo mantiene.
 */
export const needsBrowserReset = (previousOrigin: string | null, nextOrigin: string): boolean =>
  previousOrigin !== null && previousOrigin !== nextOrigin;
