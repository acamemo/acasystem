import type { ErrorRequestHandler, Request, RequestHandler, Response } from 'express';
import { sendJsonError } from '../middlewares/errors.ts';
import { DeviceError, describeForLog, isDeviceError } from '../services/devices/deviceErrors.ts';
import type { DeviceUser } from '../services/devices/deviceContext.ts';
import type { DeviceService } from '../services/devices/deviceService.ts';
import type { PowerRecipe } from '../services/devices/powerRecipe.ts';
import type { ServiceKeeper } from '../services/devices/serviceKeeper.ts';
import { getBearerToken } from '../middlewares/homeAssistantAuth.ts';
import {
  validateAreaBody,
  validateCatalogQuery,
  validateDeviceId,
  validateDeviceUpdateBody,
  validateEntryId,
  validateFlowId,
  validateLimitQuery,
  validateLogoDark,
  validateLogoDomain,
  validateFileUploadQuery,
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
  uploadFlowFile: RequestHandler;
  /** Error handler of the upload route: a body over the limit is a JSON 413. */
  uploadFlowFileErrors: ErrorRequestHandler;
  cancelFlow: RequestHandler;
  listDiscovered: RequestHandler;
  addDiscovered: RequestHandler;
  ignoreDiscovered: RequestHandler;
  listIgnored: RequestHandler;
  restoreIgnored: RequestHandler;
  logo: RequestHandler;
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
  repairService: RequestHandler;
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
  power: PowerRecipe,
  keeper: ServiceKeeper
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

  // The body is the file itself (raw bytes, see routes/devices.ts); the field and the name of the
  // file travel in the query. The answer is the id to put in the answer of the step.
  uploadFlowFile: route((req, user) => {
    const flowId = validateFlowId(req.params.flowId);
    const { field, fileName } = validateFileUploadQuery(req.query);
    if (!Buffer.isBuffer(req.body)) throw new DeviceError('INVALID_INPUT', { field });
    return service.uploadFlowFile(user, flowId, field, fileName, req.body);
  }),

  uploadFlowFileErrors: (error, _req, res, next) => {
    const type =
      typeof error === 'object' && error !== null ? (error as { type?: unknown }).type : undefined;
    if (type === 'entity.too.large') {
      sendJsonError(res, 413, 'Il file è troppo grande.', 'FILE_TOO_LARGE');
      return;
    }
    next(error);
  },

  cancelFlow: route((req, user) => service.cancelFlow(user, validateFlowId(req.params.flowId))),

  listDiscovered: route((_req, user) => service.listDiscovered(user)),

  addDiscovered: route((req, user) =>
    service.addDiscovered(user, validateFlowId(req.params.flowId))
  ),

  ignoreDiscovered: route((req, user) =>
    service.ignoreDiscovered(user, validateFlowId(req.params.flowId))
  ),

  listIgnored: route((_req, user) => service.listIgnored(user)),

  restoreIgnored: route((req, user) =>
    service.restoreIgnored(user, validateEntryId(req.params.entryId))
  ),

  // The only answer that is not JSON: the picture, with a day of private cache. A missing logo
  // is the usual JSON error, cached by the browser for an hour so the tiles do not ask again.
  logo: async (req, res) => {
    const user = readUser(req);
    if (!user) {
      sendJsonError(res, 401, 'Missing authenticated Home Assistant user');
      return;
    }
    try {
      const image = await service.logo(
        user,
        validateLogoDomain(req.params.domain),
        validateLogoDark(req.query)
      );
      res.setHeader('Content-Type', image.contentType);
      res.setHeader('Cache-Control', 'private, max-age=86400');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.status(200).send(image.data);
    } catch (error) {
      res.setHeader(
        'Cache-Control',
        isDeviceError(error) && error.code === 'LOGO_NOT_FOUND'
          ? 'private, max-age=3600'
          : 'no-store'
      );
      sendDeviceError(res, error);
    }
  },

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

  // «Ripara il servizio»: every user. An administrator's own token (if the request has one) may
  // be the means of the repair; it is used for this run only.
  repairService: route((req, user) =>
    keeper.repair(user, user.isAdmin ? getBearerToken(req) : null)
  ),

  notFound: (_req, res) => {
    sendDeviceError(res, new DeviceError('NOT_FOUND'));
  },
});
