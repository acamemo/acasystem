/** URL di Home Assistant: normalizzazione. */

/** URL http(s) senza hash, query e barra finale; null se non valido. */
export const normalizeHomeAssistantUrl = (rawUrl: unknown): string | null => {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;

  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    parsed.hash = '';
    parsed.search = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
};

/** Aggiunge l'URL normalizzato se valido e non già presente. */
export const pushUniqueCandidate = (candidates: string[], rawCandidate: unknown): void => {
  const normalized = normalizeHomeAssistantUrl(rawCandidate);
  if (!normalized || candidates.includes(normalized)) return;
  candidates.push(normalized);
};
