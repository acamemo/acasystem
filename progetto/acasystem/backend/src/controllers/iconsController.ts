import type { Request, Response } from 'express';
import { sendFailure } from '../middlewares/errors.ts';
import { findMdiIconPath, listMdiIcons } from '../services/iconService.ts';
import { normalizeIconQuery, validateIconName } from '../validators/iconValidators.ts';

/** Gestori HTTP di /api/icons (pubblici, senza autenticazione HA). */

/** GET /api/icons/mdi?q= */
export const listIcons = (req: Request, res: Response): void => {
  res.json({ icons: listMdiIcons(normalizeIconQuery(req.query.q)) });
};

/** GET /api/icons/mdi/:name */
export const getIcon = (req: Request<{ name: string }>, res: Response): void => {
  const name = validateIconName(req.params.name);
  if (!name.ok) {
    sendFailure(res, name.failure);
    return;
  }

  const path = findMdiIconPath(name.value);
  if (path === null) {
    sendFailure(res, { status: 404, error: 'Icon not found' });
    return;
  }
  res.json({ name: `mdi:${name.value}`, path });
};
