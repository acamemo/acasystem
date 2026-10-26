import { Router } from 'express';
import { createDevicesController } from '../controllers/devicesController.ts';
import { createDevicesRateLimiter } from '../middlewares/rateLimit.ts';
import type { DeviceModule } from '../services/devices/index.ts';

/**
 * Router of /api/dispositivi (ADR-0021 and ADR-0022), mounted after the Home Assistant
 * authentication. The routes below are the closed list of operations of the facade; any other
 * path is a 404. Admin-only operations (installer) are enforced in the service, not here.
 *
 * - GET    /stato                    state of the service, of HA and of the functions
 * - GET    /catalogo?q=&limit=       integrations: all listed, only some startable
 * - GET    /flussi                   own open flows
 * - POST   /flussi                   start a flow            {handler}
 * - GET    /flussi/:flowId           current step of an own flow (resume)
 * - POST   /flussi/:flowId           answer the step         {input}
 * - DELETE /flussi/:flowId           cancel an own flow
 * - GET    /voci/:entryId            entry with its device and entities
 * - PATCH  /dispositivi/:deviceId    name and room           {name?, areaId?}
 * - GET    /stanze, POST /stanze     rooms (areas)           {name}
 * - GET    /accensione/:entryId      power-on recipe state of a TV
 * - POST   /accensione/:entryId      set up the recipe       {mac?, broadcastAddress?, broadcastPort?}
 * - DELETE /accensione/:entryId      remove the recipe (installer)
 * - GET    /registro?limit=          registry of actions (installer)
 */
export const createDevicesRouter = (devices: Pick<DeviceModule, 'service' | 'power'>): Router => {
  const router = Router();
  const controller = createDevicesController(devices.service, devices.power);

  router.use(createDevicesRateLimiter());

  router.get('/stato', controller.status);
  router.get('/catalogo', controller.catalog);

  router.get('/flussi', controller.listFlows);
  router.post('/flussi', controller.startFlow);
  router.get('/flussi/:flowId', controller.getFlow);
  router.post('/flussi/:flowId', controller.stepFlow);
  router.delete('/flussi/:flowId', controller.cancelFlow);

  router.get('/voci/:entryId', controller.getEntry);
  router.patch('/dispositivi/:deviceId', controller.updateDevice);

  router.get('/stanze', controller.listAreas);
  router.post('/stanze', controller.createArea);

  router.get('/accensione/:entryId', controller.powerStatus);
  router.post('/accensione/:entryId', controller.powerSetup);
  router.delete('/accensione/:entryId', controller.powerRemove);

  router.get('/registro', controller.listActions);

  router.use(controller.notFound);

  return router;
};
