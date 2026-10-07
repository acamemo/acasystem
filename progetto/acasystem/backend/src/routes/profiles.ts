import { Router } from 'express';
import { createProfilesController } from '../controllers/profilesController.ts';
import type { DataCrypto } from '../helpers/dataCrypto.ts';
import { createProfilesRateLimiter } from '../middlewares/rateLimit.ts';
import type { SqliteDatabase } from '../models/database.ts';
import { createProfileService } from '../services/profileService.ts';

/**
 * Router di /api/profiles, montato dopo l'autenticazione HA.
 * Endpoint: GET /, GET /:id, POST /, PUT /:id, DELETE /:id.
 */
export const createProfilesRouter = (database: SqliteDatabase, crypto?: DataCrypto): Router => {
  const router = Router();
  const controller = createProfilesController(createProfileService(database, crypto));

  router.use(createProfilesRateLimiter());

  router.get('/', controller.list);
  router.get('/:id', controller.get);
  router.post('/', controller.create);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
};
