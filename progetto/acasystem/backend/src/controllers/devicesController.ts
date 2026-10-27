import type { Request, RequestHandler, Response } from 'express';
import { sendJsonError } from '../middlewares/errors.ts';
import { DeviceError, describeForLog, isDeviceError } from '../services/devices/deviceErrors.ts';
import type { DeviceUser } from '../services/devices/deviceContext.ts';
import type { DeviceService } from '../services/devices/deviceService.ts';
import type { PowerRecipe } from '../services/devices/powerRecipe.ts';
import {
  validateAreaBody,
  validateCatalogQuery,
  validateDeviceId,
  validateDeviceUpdateBody,
  validateEntryId,
  validateFlowId,
  validateLimitQuery,
  validatePowerBody,
  validateStartFlowBody,
  validateStepBody,
  validateTvId,
} from '../validators/deviceValidators.ts';

/**
 * HTTP handlers of /api/dispositivi. Each handler reads the Home Assistant user set by the
 * authentication middleware, validates the request, calls the service and answers with JSON.
 * Failures become `{ error, code }` with a message in Italian; nothing from HA is passed on.
 */

export interface DevicesController {
  status: RequestHandler;
  catalog: RequestHandler;
  listFlows: RequestHandler;
  startFlow: RequestHandler;
  getFlow: RequestHandler;
  stepFlow: RequestHandler;
  cancelFlow: RequestHandler;
  listDiscovered: RequestHandler;
  addDiscovered: RequestHandler;
  ignoreDiscovered: RequestHandler;
  listTvs: RequestHandler;
  connectTv: RequestHandler;
  getEntry: RequestHandler;
  removeEntry: RequestHandler;
  updateDevice: RequestHandler;
  listAreas: RequestHandler;
  createArea: RequestHandler;
  powerStatus: RequestHandler;
  powerSetup: RequestHandler;
  powerRemove: RequestHandler;
  listActions: RequestHandler;
  notFound: RequestHandler;
}

const readUser = (req: Request): DeviceUser | null => {
  const user = req.authenticatedHaUser;
  if (!user?.id) return null;
  return { id: user.id, name: user.name, isAdmin: user.is_admin === true };
};

const sendDeviceError = (res: Response, error: unknown): void => {
  if (isDeviceError(error)) {
    if (error.retryAfterSeconds) res.setHeader('Retry-After', String(error.retryAfterSeconds));
    const body: Record<string, unknown> = { error: error.message, code: error.code };
    if (error.field) body.field = error.field;
    if (error.flowId) body.flowId = error.flowId;
    if (error.retryAfterSeconds) body.retryAfterSeconds = error.retryAfterSeconds;
    res.status(error.status).json(body);
    return;
  }

  // Unexpected: log the class only. The message of an unknown error may carry an address.
  console.warn(`[devices] unexpected error: ${describeForLog(error)}`);
  sendJsonError(res, 500, new DeviceError('INTERNAL').message, 'INTERNAL');
};

type Handler = (req: Request, user: DeviceUser) => Promise<unknown> | unknown;

const route =
  (handler: Handler, successStatus = 200): RequestHandler =>
  async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const user = readUser(req);
    if (!user) {
      sendJsonError(res, 401, 'Missing authenticated Home Assistant user');
      return;
    }
    try {
      res.status(successStatus).json(await handler(req, user));
    } catch (error) {
      sendDeviceError(res, error);
    }
  };

export const createDevicesController = (
  service: DeviceService,
  power: PowerRecipe
): DevicesController => ({
  status: route((_req, user) => service.status(user)),

  catalog: route((req, user) => service.listCatalog(user, validateCatalogQuery(req.query))),

  listFlows: route((_req, user) => ({ flows: service.listFlows(user) })),

  startFlow: route(
    (req, user) => service.startFlow(user, validateStartFlowBody(req.body).handler),
    201
  ),

  getFlow: route((req, user) => service.getFlow(user, validateFlowId(req.params.flowId))),

  stepFlow: route((req, user) =>
    service.stepFlow(user, validateFlowId(req.params.flowId), validateStepBody(req.body).input)
  ),

  cancelFlow: route((req, user) => service.cancelFlow(user, validateFlowId(req.params.flowId))),

  listDiscovered: route((_req, user) => service.listDiscovered(user)),

  addDiscovered: route((req, user) =>
    service.addDiscovered(user, validateFlowId(req.params.flowId))
  ),

  ignoreDiscovered: route((req, user) =>
    service.ignoreDiscovered(user, validateFlowId(req.params.flowId))
  ),

  listTvs: route((_req, user) => service.listTvs(user)),

  connectTv: route(
    (req, user) => service.connectTv(user, validateTvId(req.params.tvId)),
    201
  ),

  getEntry: route((req, user) => service.getEntry(user, validateEntryId(req.params.entryId))),

  removeEntry: route((req, user) =>
    service.removeEntry(user, validateEntryId(req.params.entryId))
  ),

  updateDevice: route((req, user) =>
    service.updateDevice(
      user,
      validateDeviceId(req.params.deviceId),
      validateDeviceUpdateBody(req.body)
    )
  ),

  listAreas: route(async (_req, user) => ({ areas: await service.listAreas(user) })),

  createArea: route((req, user) => service.createArea(user, validateAreaBody(req.body).name), 201),

  powerStatus: route((req, user) => power.status(user, validateEntryId(req.params.entryId))),

  powerSetup: route((req, user) =>
    power.setup(user, validateEntryId(req.params.entryId), validatePowerBody(req.body))
  ),

  powerRemove: route((req, user) => power.remove(user, validateEntryId(req.params.entryId))),

  listActions: route((req, user) => ({
    actions: service.listActions(user, validateLimitQuery(req.query)),
  })),

  notFound: (_req, res) => {
    sendDeviceError(res, new DeviceError('NOT_FOUND'));
  },
});
