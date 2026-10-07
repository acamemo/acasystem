import type { Request, Response } from 'express';

/** GET /api/health: stato e versione del backend (backend/package.json). */
export const createHealthController =
  (appVersion: string) =>
  (_req: Request, res: Response): void => {
    res.json({ status: 'ok', version: appVersion });
  };
