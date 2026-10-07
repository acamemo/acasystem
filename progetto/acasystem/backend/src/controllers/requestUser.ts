import type { Request, Response } from 'express';
import { sendFailure } from '../middlewares/errors.ts';
import { validateRequestUser } from '../validators/common.ts';

/**
 * Id dell'utente HA autenticato; altrimenti risponde 401 e restituisce null.
 * Ogni gestore lo chiama per primo, come `ensureRequestUser` nei router originali.
 */
export const requireRequestUserId = (req: Request, res: Response): string | null => {
  const user = validateRequestUser(req.authenticatedHaUser);
  if (!user.ok) {
    sendFailure(res, user.failure);
    return null;
  }
  return user.value;
};
