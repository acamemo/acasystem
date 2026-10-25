import express, { Router } from 'express';
import type { ErrorRequestHandler } from 'express';
import { createCasa3dController } from '../controllers/casa3dController.ts';
import type { DataCrypto } from '../helpers/dataCrypto.ts';
import { MAX_IMAGE_BYTES } from '../helpers/casa3dImage.ts';
import { requireCasa3dEditor } from '../middlewares/casa3dRole.ts';
import { sendJsonError } from '../middlewares/errors.ts';
import { createCasa3dImageRateLimiter, createCasa3dRateLimiter } from '../middlewares/rateLimit.ts';
import type { SqliteDatabase } from '../models/database.ts';
import { createCasa3dService } from '../services/casa3dService.ts';

/**
 * Router di /api/casa3d, montato dopo l'autenticazione HA (ADR-0014, T6).
 * Lettura per ogni utente autenticato; ogni scrittura (e cronologia e backup) per ogni utente autenticato, anche non amministratore (ISSUE-102, 401 senza utente):
 * - GET /building, GET /building/revision, PUT /building (compare-and-swap sulla revisione, 409);
 * - GET /images/:id, PUT /images/:id (corpo binario PNG, JPEG o WebP), DELETE /images/:id;
 * - GET /history, POST /history, POST /history/:id/restore;
 * - GET /backup, POST /backup.
 */
export const createCasa3dApiRouter = (database: SqliteDatabase, crypto?: DataCrypto): Router => {
  const router = Router();
  const controller = createCasa3dController(createCasa3dService(database, crypto));

  router.use(createCasa3dRateLimiter());
  router.use('/images', createCasa3dImageRateLimiter());

  router.get('/building', controller.getBuilding);
  router.get('/building/revision', controller.getRevision);
  router.put('/building', requireCasa3dEditor, controller.putBuilding);

  router.get('/images/:id', controller.getImage);
  // Raw body of any type up to the limit: the type is judged from the bytes by the service, not here.
  router.put(
    '/images/:id',
    requireCasa3dEditor,
    express.raw({ type: () => true, limit: MAX_IMAGE_BYTES }),
    controller.putImage
  );
  router.delete('/images/:id', requireCasa3dEditor, controller.deleteImage);

  router.get('/history', requireCasa3dEditor, controller.listHistory);
  router.post('/history', requireCasa3dEditor, controller.createSnapshot);
  router.post('/history/:id/restore', requireCasa3dEditor, controller.restoreSnapshot);

  router.get('/backup', requireCasa3dEditor, controller.exportBackup);
  router.post('/backup', requireCasa3dEditor, controller.importBackup);

  // A body over the limit is a JSON 413 here, not the HTML page of the default handler.
  const bodyErrors: ErrorRequestHandler = (error: unknown, _req, res, next) => {
    const type = typeof error === 'object' && error !== null ? (error as { type?: unknown }).type : undefined;
    if (type === 'entity.too.large') {
      sendJsonError(res, 413, 'The request body is too large');
      return;
    }
    next(error);
  };
  router.use(bodyErrors);

  return router;
};
