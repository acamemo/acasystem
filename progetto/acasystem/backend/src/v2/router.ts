import { Router, type Request, type Response } from 'express';
import type { EditTarget, ProfileOperation } from '../../../contracts/collaboration.ts';
import type { DeviceModule } from '../services/devices/index.ts';
import { CollaborationError, type CollaborationStore } from './store.ts';
import type { CollaborationAuth } from './auth.ts';

const text = (value: unknown) => typeof value === 'string' ? value : '';
export function collaborationFailure(res: Response, error: unknown) {
  if (error instanceof CollaborationError) res.status(error.status).json({ error: error.message, code: error.code, ...error.details });
  else res.status(500).json({ error: 'Operazione non completata. La configurazione precedente è conservata.', code: 'COLLABORATION_UNAVAILABLE' });
}
export function createCollaborationRouter(store: CollaborationStore, auth: CollaborationAuth, devices: DeviceModule) {
  const router = Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  const route = (handler: (req: Request, res: Response) => Promise<void>) => async (req: Request, res: Response) => { try { await handler(req, res); } catch (error) { collaborationFailure(res, error); } };
  router.get('/bootstrap', route(async (req, res) => {
    const { identity } = await auth.resolve(req);
    const selection = store.accountSelection(identity.userId);
    const current = store.sessionClient(identity);
    res.json({ protocol: 2, houseId: store.houseId, user: { id: identity.userId, name: identity.userName, color: store.userColor(identity.userId) }, client: current ? { ...current, activeProfileId: selection.activeProfileId } : null, accountProfileId: selection.activeProfileId, profileSelectionRequired: selection.selectionRequired, clients: store.clients(identity.userId), profiles: store.profiles(identity.userId), sources: store.sources(identity.userId) });
  }));
  router.post('/clients', route(async (req, res) => { const { identity } = await auth.resolve(req); res.status(201).json(store.registerClient(identity, req.body ?? {})); }));
  router.get('/clients', route(async (req, res) => { const { actor } = await auth.authorize(req); res.json(store.clients(actor.userId)); }));
  router.patch('/clients/:id', route(async (req, res) => {
    const selection = req.body?.activeProfileId;
    const { actor } = selection === undefined ? await auth.authorize(req) : await auth.authorizeUsage(req, typeof selection === 'string' ? selection : undefined);
    res.json(store.updateClient(actor, text(req.params.id), req.body ?? {}));
  }));
  router.post('/clients/:id/revoke', route(async (req, res) => {
    const { actor, accessToken } = await auth.authorize(req); const id = text(req.params.id);
    store.markRevoked(actor, id, true);
    let pending = false;
    try {
      await devices.adapter.withWs(accessToken, async api => { for (const refreshId of store.sessionIds(actor.userId, id)) await api.deleteRefreshToken(refreshId); });
    } catch { pending = true; }
    res.json(pending ? store.client(actor.userId, id) : store.markRevoked(actor, id, false));
  }));
  router.get('/profiles', route(async (req, res) => { const { actor } = await auth.authorize(req); res.json(store.profiles(actor.userId)); }));
  router.post('/profiles', route(async (req, res) => {
    const { actor } = await auth.authorize(req);
    if (store.profiles(actor.userId).length) await auth.authorizeUsage(req);
    res.status(201).json(store.createProfile(actor, req.body ?? {}));
  }));
  router.get('/profiles/:id', route(async (req, res) => { const { actor } = await auth.authorize(req); res.json(store.profile(actor.userId, text(req.params.id))); }));
  router.patch('/profiles/:id', route(async (req, res) => { const { actor } = await auth.authorize(req); store.profile(actor.userId, text(req.params.id)); await auth.authorizeUsage(req); res.json(store.updateProfile(actor, text(req.params.id), req.body ?? {})); }));
  router.delete('/profiles/:id', route(async (req, res) => { const { actor } = await auth.authorize(req); store.profile(actor.userId, text(req.params.id)); await auth.authorizeUsage(req); store.deleteProfile(actor, text(req.params.id)); res.json({ success: true }); }));
  router.post('/profiles/:id/usage', route(async (req, res) => {
    const { actor } = await auth.authorize(req);
    res.status(201).json(store.acquireUsage(actor, text(req.params.id), req.body?.usageSessionId));
  }));
  router.patch('/usage/:id', route(async (req, res) => {
    const { actor } = await auth.authorize(req);
    res.json(store.renewUsage(actor, text(req.params.id), req.body?.usageSessionId));
  }));
  router.delete('/usage/:id', route(async (req, res) => {
    const { actor } = await auth.authorize(req);
    store.releaseUsage(actor, text(req.params.id), req.body?.usageSessionId, { handoff: req.body?.handoff === true });
    res.json({ released: true });
  }));
  router.get('/profiles/:id/leases', route(async (req, res) => { const { actor } = await auth.authorize(req); res.json(store.listLeases(actor.userId, text(req.params.id))); }));
  router.post('/profiles/:id/leases', route(async (req, res) => { const { actor } = await auth.authorizeUsage(req, text(req.params.id)); res.json(store.acquire(actor, text(req.params.id), text(req.body?.editSessionId), (req.body?.target ?? {}) as EditTarget, req.body?.proposedChanges ?? [])); }));
  router.patch('/leases/:id', route(async (req, res) => { const { actor } = await auth.authorizeUsage(req); res.json(store.renew(actor, text(req.params.id), text(req.body?.editSessionId))); }));
  router.delete('/leases/:id', route(async (req, res) => { const { actor } = await auth.authorize(req); store.release(actor, text(req.params.id), text(req.body?.editSessionId)); res.json({ success: true }); }));
  router.post('/profiles/:id/operations', route(async (req, res) => {
    const { actor } = await auth.authorizeUsage(req, text(req.params.id));
    const op = req.body as ProfileOperation | undefined;
    if (!op || !op.target || (op.target.kind !== 'widget' && op.target.kind !== 'structure')) throw new CollaborationError(400, 'INVALID_OPERATION', 'Modifica non valida.');
    res.json(store.commit(actor, text(req.params.id), op));
  }));
  router.get('/events', route(async (req, res) => {
    const { actor } = await auth.authorize(req);
    res.locals.acaUpdateStreamReady?.();
    if (res.destroyed || res.writableEnded) return;
    const disconnectUsage = store.connectUsage(actor, req.get('x-aca-usage-session'));
    let unsubscribe = () => {};
    let timer: ReturnType<typeof setInterval> | undefined;
    const cleanup = () => { if (timer) clearInterval(timer); unsubscribe(); disconnectUsage(); };
    res.once('close', cleanup);
    try {
      res.set({ 'Content-Type': 'text/event-stream', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' }); res.flushHeaders();
      const send = (event: unknown) => { if (!res.destroyed && !res.writableEnded) res.write(`event: change\ndata: ${JSON.stringify(event)}\n\n`); };
      send({ type: 'resync' });
      unsubscribe = store.subscribe(actor.userId, actor.clientId, send);
      let checking = false;
      timer = setInterval(() => {
        if (checking || res.destroyed || res.writableEnded) return;
        checking = true;
        const completed = res.locals.acaUpdateTask?.();
        void auth.resolve(req, true).then(() => { if (!res.destroyed && !res.writableEnded) res.write(': keep-alive\n\n'); }).catch(() => res.end()).finally(() => { checking = false; completed?.(); });
      }, 15_000);
      timer.unref();
      if (res.destroyed || res.writableEnded) cleanup();
    } catch (error) { cleanup(); throw error; }
  }));
  return router;
}
