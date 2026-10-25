import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { resolveCasa3dRole } from '../helpers/casa3dRole.ts';
import { MISSING_AUTHENTICATED_USER } from '../validators/common.ts';
import { sendJsonError } from './errors.ts';

/**
 * Scrittura per ogni utente autenticato (ADR-0014, D13; ISSUE-102 deciso il 2026-10-21): senza utente
 * 401, con un utente qualunque si prosegue (nessun 403 «non amministratore»). Resta prima di ogni lettura
 * del corpo della richiesta, così una richiesta senza utente non fa caricare immagini da 6 MB.
 */
export const requireCasa3dEditor: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (resolveCasa3dRole(req.authenticatedHaUser) !== 'editor') {
    sendJsonError(res, 401, MISSING_AUTHENTICATED_USER);
    return;
  }
  next();
};
