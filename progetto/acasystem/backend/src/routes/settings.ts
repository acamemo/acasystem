import { Router } from 'express';
import { createSettingsController } from '../controllers/settingsController.ts';
import type { DataCrypto } from '../helpers/dataCrypto.ts';
import { createSettingsRateLimiter } from '../middlewares/rateLimit.ts';
import type { SqliteDatabase } from '../models/database.ts';
import { createSettingsService } from '../services/settingsService.ts';

/**
 * Router di /api/settings, montato dopo l'autenticazione HA.
 * Endpoint: GET/PUT /current, GET/DELETE /history, GET/DELETE /devices,
 * PUT /devices/label, POST /publish.
 */
export const createSettingsRouter = (database: SqliteDatabase, crypto?: DataCrypto): Router => {
  const router = Router();
  const controller = createSettingsController(createSettingsService(database, crypto));

  router.use(createSettingsRateLimiter());

  router.get('/current', controller.getCurrent);
  router.get('/history', controller.listHistory);
  router.delete('/history', controller.deleteHistory);
  router.get('/devices', controller.listDevices);
  router.delete('/devices', controller.deleteDevice);
  router.put('/devices/label', controller.updateDeviceLabel);
  router.put('/current', controller.putCurrent);
  router.post('/publish', controller.publish);

  return router;
};
