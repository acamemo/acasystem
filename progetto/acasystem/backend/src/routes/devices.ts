import express, { Router } from 'express';
import { MAX_UPLOAD_BYTES } from '../services/devices/flowExtras.ts';
import { createDevicesController } from '../controllers/devicesController.ts';
import { createDevicesRateLimiter } from '../middlewares/rateLimit.ts';
import type { DeviceModule } from '../services/devices/index.ts';

/**
 * Router of /api/dispositivi (ADR-0021 and ADR-0022), mounted after the Home Assistant
 * authentication. The routes below are the closed list of operations of the facade; any other
 * path is a 404. Operations reserved to administrators (none today, see INSTALLER_ONLY_OPERATIONS) are enforced in the service.
 *
 * - GET    /stato                    state of the service, of HA and of the functions
 * - GET    /catalogo?q=&limit=       integrations: all listed, only some startable
 * - GET    /flussi                   own open flows
 * - POST   /flussi                   start a flow            {handler}
 * - GET    /flussi/:flowId           current step of an own flow (resume)
 * - POST   /flussi/:flowId           answer the step         {input}
 * - DELETE /flussi/:flowId           cancel an own flow
 * - POST   /flussi/:flowId/file?campo=&nome=  upload the file of a `file` field (raw body)
 * - GET    /scoperti                 devices that HA found on the network (ADR-0024)
 * - POST   /scoperti/:flowId/aggiungi  take a discovered flow over, answers with its step
 * - POST   /scoperti/:flowId/ignora    «Non mi interessa»
 * - GET    /scoperti/ignorati        discoveries somebody ignored (HA keeps them as entries)
 * - POST   /scoperti/ignorati/:entryId/ripristina  take one back, HA finds the device again
 * - GET    /loghi/:domain?tema=scuro logo of an integration (PNG, through HA; same access as /scoperti)
 * - GET    /tv-in-rete               televisions HA saw on the network (F5), no address
 * - POST   /tv-in-rete/:tvId/collega  start the integration with the address filled in, answers with its step
 * - GET    /voci/:entryId            entry with its device and entities
 * - DELETE /voci/:entryId            «Rimuovi dispositivo»: the entry leaves HA (not system ones)
 * - PATCH  /dispositivi/:deviceId    name and room           {name?, areaId?}
 * - GET    /stanze, POST /stanze     rooms (areas)           {name}
 * - GET    /accensione/:entryId      power-on recipe state of a TV
 * - POST   /accensione/:entryId      set up the recipe       {mac?, broadcastAddress?, broadcastPort?}
 * - DELETE /accensione/:entryId      remove the recipe
 * - GET    /registro?limit=          registry of actions
 * - POST   /servizio/ripara          «Ripara il servizio»: every user; answers {active, message}
 */
export const createDevicesRouter = (
  devices: Pick<DeviceModule, 'service' | 'power' | 'keeper'>
): Router => {
  const router = Router();
  const controller = createDevicesController(devices.service, devices.power, devices.keeper);

  router.use(createDevicesRateLimiter());

  router.get('/stato', controller.status);
  router.get('/catalogo', controller.catalog);

  router.get('/flussi', controller.listFlows);
  router.post('/flussi', controller.startFlow);
  router.get('/flussi/:flowId', controller.getFlow);
  router.post('/flussi/:flowId', controller.stepFlow);
  router.delete('/flussi/:flowId', controller.cancelFlow);
  // The file of a `file` field: raw bytes up to the limit, any type (HA judges it).
  const rawFile = express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES });
  router.post('/flussi/:flowId/file', rawFile, controller.uploadFlowFile, controller.uploadFlowFileErrors);

  router.get('/scoperti', controller.listDiscovered);
  router.get('/scoperti/ignorati', controller.listIgnored);
  router.post('/scoperti/ignorati/:entryId/ripristina', controller.restoreIgnored);
  router.get('/loghi/:domain', controller.logo);
  router.post('/scoperti/:flowId/aggiungi', controller.addDiscovered);
  router.post('/scoperti/:flowId/ignora', controller.ignoreDiscovered);

  router.get('/tv-in-rete', controller.listTvs);
  router.post('/tv-in-rete/:tvId/collega', controller.connectTv);

  router.get('/voci/:entryId', controller.getEntry);
  router.delete('/voci/:entryId', controller.removeEntry);
  router.patch('/dispositivi/:deviceId', controller.updateDevice);

  router.get('/stanze', controller.listAreas);
  router.post('/stanze', controller.createArea);

  router.get('/accensione/:entryId', controller.powerStatus);
  router.post('/accensione/:entryId', controller.powerSetup);
  router.delete('/accensione/:entryId', controller.powerRemove);

  router.get('/registro', controller.listActions);

  router.post('/servizio/ripara', controller.repairService);

  router.use(controller.notFound);

  return router;
};
