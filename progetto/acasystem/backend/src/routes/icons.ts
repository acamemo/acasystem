import { Router } from 'express';
import { getIcon, listIcons } from '../controllers/iconsController.ts';

/** Router di /api/icons (pubblico): GET /mdi, GET /mdi/:name. */
export const createIconsRouter = (): Router => {
  const router = Router();

  router.get('/mdi', listIcons);
  router.get('/mdi/:name', getIcon);

  return router;
};
