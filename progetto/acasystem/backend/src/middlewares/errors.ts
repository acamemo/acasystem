import type { ApiErrorBody, HttpFailure } from '../@types/http.ts';

/**
 * Risposte di errore JSON dell'API, nella forma `{ error, code? }` di Tunet.
 *
 * Non c'è un gestore d'errore globale: gli errori imprevisti (corpo JSON malformato,
 * corpo assente, errori di SQLite) arrivano al gestore predefinito di Express come
 * prima, con le stesse risposte 400/500.
 */

/** Il minimo di `express.Response` usato per rispondere con JSON (sostituibile nei test). */
export interface JsonResponse {
  status(code: number): JsonResponse;
  json(body: unknown): unknown;
}

export const sendJsonError = (
  res: JsonResponse,
  statusCode: number,
  error: string,
  code?: string
): void => {
  const body: ApiErrorBody = { error };
  if (code) {
    body.code = code;
  }
  res.status(statusCode).json(body);
};

/** Risponde con l'errore previsto restituito da un validatore o da un servizio. */
export const sendFailure = (res: JsonResponse, failure: HttpFailure): void => {
  sendJsonError(res, failure.status, failure.error);
};
