import { json, Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { HomeAssistantAuthMiddleware } from '../middlewares/homeAssistantAuth.ts';
import { getBearerToken } from '../middlewares/homeAssistantAuth.ts';
import { createHomeAssistantLoginRateLimiter } from '../middlewares/rateLimit.ts';
import { sendJsonError } from '../middlewares/errors.ts';
import { resolveHomeAssistantProxyBaseUrl } from '../services/homeAssistantProxyService.ts';
import { createHomeAssistantSetupService, setupFailure } from '../services/homeAssistantSetup.ts';
import type { HomeAssistantSetupService } from '../services/homeAssistantSetup.ts';

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max && !/[\u0000-\u001f]/.test(value);
const invalid = (res: Response): void => sendJsonError(res, 400, 'Controlla i dati inseriti e riprova.', 'SETUP_INVALID_INPUT');

/** API limitata alla prima configurazione del mini PC già predisposto con ACA e HA. */
export const createSetupRouter = (
  authenticate: HomeAssistantAuthMiddleware,
  service: HomeAssistantSetupService = createHomeAssistantSetupService(),
): Router => {
  const router = Router();
  const attempts = createHomeAssistantLoginRateLimiter();
  router.use(json({ limit: '4kb' }));
  router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const tooLarge = typeof error === 'object' && error !== null && Reflect.get(error, 'type') === 'entity.too.large';
    res.set('Cache-Control', 'no-store');
    sendJsonError(res, tooLarge ? 413 : 400, 'Controlla i dati inseriti e riprova.', 'SETUP_INVALID_INPUT');
  });
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!resolveHomeAssistantProxyBaseUrl()) {
      sendJsonError(res, 503, 'La centrale non ha ancora un collegamento a Home Assistant.', 'HA_URL_NOT_CONFIGURED');
      return;
    }
    next();
  });
  const run = async (res: Response, action: () => Promise<void>): Promise<void> => {
    try { await action(); }
    catch (error) { const failure = setupFailure(error); sendJsonError(res, failure.status, failure.message, failure.code); }
  };
  router.get('/status', (_req, res) => run(res, async () => { res.json({ state: await service.status() }); }));
  const jsonOnly = (req: Request, res: Response, next: () => void): void => {
    if (!req.is('application/json') || Buffer.byteLength(JSON.stringify(req.body ?? null), 'utf8') > 4096) { invalid(res); return; }
    next();
  };
  router.post('/owner', attempts, jsonOnly, (req, res) => run(res, async () => {
    const body: unknown = req.body;
    if (!record(body) || Object.keys(body).some((key) => !['name', 'username', 'password'].includes(key))
      || !text(body.name, 128) || !text(body.username, 64) || typeof body.password !== 'string'
      || body.password.length < 8 || body.password.length > 256) { invalid(res); return; }
    await service.createOwner({ name: body.name.trim(), username: body.username.trim(), password: body.password });
    res.status(201).json({ created: true });
  }));
  router.post('/complete', attempts, jsonOnly, authenticate, (req, res) => run(res, async () => {
    const token = getBearerToken(req);
    if (!token || !req.authenticatedHaUser?.is_admin || req.authenticatedHaUser.source) {
      sendJsonError(res, 403, 'Serve un amministratore della casa.', 'SETUP_ADMIN_REQUIRED'); return;
    }
    const body: unknown = req.body;
    if (!record(body) || Object.keys(body).some((key) => key !== 'locationName') || !text(body.locationName, 128)) { invalid(res); return; }
    await service.complete(token, body.locationName.trim());
    res.json({ complete: true });
  }));
  return router;
};
