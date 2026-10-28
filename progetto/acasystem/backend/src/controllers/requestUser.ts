import type { Request, Response } from 'express';
import type { Result } from '../@types/http.ts';
import { sendFailure } from '../middlewares/errors.ts';
import { validateRequestUser } from '../validators/common.ts';

/**
 * Id dell'utente HA autenticato; altrimenti risponde 401 e restituisce null.
 * Ogni gestore lo chiama per primo, come `ensureRequestUser` nei router originali.
 */
export const requireRequestUserId = (req: Pick<Request, 'authenticatedHaUser'>, res: Response): string | null => {
  const user = validateRequestUser(req.authenticatedHaUser);
  if (!user.ok) {
    sendFailure(res, user.failure);
    return null;
  }
  return user.value;
};

/** Gestore che parte solo con un utente autenticato (401 altrimenti) e lo riceve come terzo argomento. */
export const authed =
  <P = Record<string, string>>(run: (req: Request<P>, res: Response, userId: string) => void) =>
  (req: Request<P>, res: Response): void => {
    const userId = requireRequestUserId(req, res);
    if (userId) run(req, res, userId);
  };

/** Concatena un esito e il passo successivo; il primo errore passa invariato. */
export const andThen = <T, R>(input: Result<T>, next: (value: T) => Result<R>): Result<R> =>
  input.ok ? next(input.value) : input;

/** Risponde con il valore (stato 200 o `status`) oppure con l'errore previsto. */
export const respond = <T>(res: Response, result: Result<T>, status = 200): void => {
  if (result.ok) res.status(status).json(result.value);
  else sendFailure(res, result.failure);
};
