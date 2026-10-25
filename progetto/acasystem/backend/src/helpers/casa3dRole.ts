import type { HomeAssistantUser } from '../@types/homeAssistant.ts';

/**
 * Chi può modificare la Casa 3D (ADR-0014, D13; ISSUE-102). Decisione dell'utente del 2026-10-21:
 * «chi modifica tutti anche i clienti». Ogni utente autenticato può scrivere il piano, le immagini,
 * la cronologia e i backup: non esiste più un ruolo installatore (né un PIN o un file di diritti).
 * Restano i controlli sul dato, non sulla persona: revisione e conflitto (compare-and-swap), validazione
 * del piano, controllo dei byte delle immagini, limiti di frequenza e di dimensione.
 *
 * «Autenticato» è quello che il middleware di autenticazione ha stabilito interrogando Home Assistant con
 * il token dell'utente: il ruolo non viene mai dal client. Il punto da cambiare se la decisione cambia
 * (ruolo di Acasystem, credenziale fuori da Home Assistant) è solo questa funzione.
 */
export type Casa3dRole = 'editor';

export const resolveCasa3dRole = (user: HomeAssistantUser | undefined): Casa3dRole | null =>
  typeof user?.id === 'string' && user.id !== '' ? 'editor' : null;
