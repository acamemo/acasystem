import { Router } from 'express';
import type { Response } from 'express';
import type { ActivityQuery, ClientDiagnostic } from '../../../contracts/activity.ts';
import { createSlidingWindowLimiter } from '../helpers/slidingWindow.ts';
import { ActivityError } from './activity.ts';
import type { ActivityService, AuthorizeActivity } from './activity.ts';

export const activityFailure = (res: Response, error: unknown): void => {
  const value = error as { status?: number; code?: string; message?: string } | null;
  const status = value?.status && value.status >= 400 && value.status <= 599 ? value.status : 500;
  res.status(status).json({ error: status >= 500 ? 'Operazione non disponibile.' : value?.message ?? 'Richiesta non valida.',
    code: value?.code ?? 'ACTIVITY_UNAVAILABLE' });
};
const queryFrom = (raw: Record<string, unknown>): ActivityQuery => {
  if (Object.keys(raw).some((key) => /^(ageDays|asOf)\[/.test(key)))
    throw new ActivityError(400, 'INVALID_FILTER', 'Filtro non valido.');
  const query: Record<string, string | number> = {};
  for (const key of ['before', 'limit', 'from', 'to', 'userId', 'clientId', 'profileId', 'widgetId', 'kind', 'outcome', 'ageDays', 'asOf']) {
    if (raw[key] === undefined) continue;
    if (typeof raw[key] !== 'string') throw new ActivityError(400, 'INVALID_FILTER', 'Filtro non valido.');
    if (key === 'ageDays' && !/^[0-6]$/.test(raw[key])) throw new ActivityError(400, 'INVALID_AGE_DAYS', 'Giorni non validi.');
    query[key] = key === 'before' || key === 'limit' || key === 'ageDays' ? Number(raw[key]) : raw[key];
  }
  return query as ActivityQuery;
};
const DIAGNOSTIC_CODES: readonly ClientDiagnostic['code'][] = [
  'client.error', 'client.command_error', 'client.command_unknown', 'client.activity_unavailable',
];
export interface ActivityRouterOptions {
  activity: ActivityService;
  authorize: AuthorizeActivity;
}
export const createActivityRouter = ({ activity, authorize }: ActivityRouterOptions): Router => {
  const router = Router();
  const diagnosticLimit = createSlidingWindowLimiter(60, 60_000);
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  router.get('/', async (req, res) => {
    try { await authorize(req); res.json(activity.list(queryFrom(req.query))); }
    catch (error) { activityFailure(res, error); }
  });
  router.get('/export', async (req, res) => {
    try { await authorize(req); res.json(activity.exportData(queryFrom(req.query))); }
    catch (error) { activityFailure(res, error); }
  });
  router.post('/diagnostics', async (req, res) => {
    try {
      const { actor } = await authorize(req);
      if (!diagnosticLimit.take(actor.clientId ?? actor.userId).allowed)
        throw new ActivityError(429, 'DIAGNOSTIC_RATE_LIMIT', 'Attendi prima di inviare altre segnalazioni.');
      const events: unknown = req.body?.events;
      if (!Array.isArray(events) || events.length > 50) throw new ActivityError(400, 'INVALID_DIAGNOSTICS', 'Segnalazioni non valide.');
      const diagnostics = events.map((item: unknown): ClientDiagnostic => {
        const value = item as Partial<ClientDiagnostic> | null;
        if (!value || typeof value.eventId !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(value.eventId)
          || !DIAGNOSTIC_CODES.includes(value.code as ClientDiagnostic['code'])
          || typeof value.occurredAt !== 'string' || !Number.isFinite(Date.parse(value.occurredAt)))
          throw new ActivityError(400, 'INVALID_DIAGNOSTICS', 'Segnalazioni non valide.');
        return { eventId: value.eventId, code: value.code as ClientDiagnostic['code'], occurredAt: value.occurredAt };
      });
      let accepted = 0;
      for (const event of diagnostics) if (activity.recordDiagnostic(actor, event)) accepted += 1;
      if (accepted) activity.publish();
      res.json({ accepted });
    } catch (error) { activityFailure(res, error); }
  });
  return router;
};
