/**
 * App client di Acasystem per Windows e Android (ADR-0023). L'app apre questa interfaccia da un
 * proprio server locale e si riconosce dallo user agent («AcasystemShell/<versione>»). Nel
 * browser e nella PWA non c'è: lì l'indirizzo del server è quello della pagina.
 */

const CLIENT_SHELL_MARKER = /\bAcasystemShell\/\d/;

/** Indirizzo che l'app intercetta per riaprire la procedura guidata (come la scorciatoia). */
export const CHANGE_ADDRESS_URL = 'acasystem://change-address';

export function isClientShell(userAgent: string = globalThis.navigator?.userAgent ?? ''): boolean {
  return CLIENT_SHELL_MARKER.test(userAgent);
}

/** Torna alla procedura guidata dell'app per scegliere un altro mini PC. */
export function openChangeAddress(): void {
  window.location.assign(CHANGE_ADDRESS_URL);
}
