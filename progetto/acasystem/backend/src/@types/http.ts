/**
 * Valore ricevuto dal client (corpo JSON o query) che il server originale controllava
 * solo per presenza. Resta invariato fino a better-sqlite3 o a JSON.stringify, che ne
 * decidono l'esito come prima: per esempio un booleano al posto di un id produce
 * ancora l'errore di associazione di SQLite e quindi un 500.
 */
export type ClientValue = unknown;

/** Corpo JSON di ogni risposta di errore dell'API. */
export interface ApiErrorBody {
  error: string;
  code?: string;
}

/** Esito negativo di un validatore o di un servizio, tradotto in risposta dal controller. */
export interface HttpFailure {
  status: number;
  error: string;
}

/** Esito di un validatore o di un servizio: valore oppure errore HTTP previsto. */
export type Result<T> = { ok: true; value: T } | { ok: false; failure: HttpFailure };

export type Validation<T> = Result<T>;
