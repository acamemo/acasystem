import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authed } from './controllers/requestUser.ts';
import type { HomeAssistantAuthMiddleware } from './middlewares/homeAssistantAuth.ts';
import type { SqliteDatabase } from './models/database.ts';
import { createPairingService, parsePairingEndpoint, sanitizeSharedConfiguration } from './pairing.ts';
import { portableConfiguration } from './pairingPortable.ts';

export const createPairingRouter = (database: SqliteDatabase, authenticate: HomeAssistantAuthMiddleware, canWrite: (userId: string) => boolean = () => true): Router => {
  const router = Router();
  const service = createPairingService(database);
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  const invitationLimit = rateLimit({ windowMs: 60_000, limit: 90, standardHeaders: true, legacyHeaders: false });
  router.post('/invites', invitationLimit, authenticate, authed((req, res, userId) => {
    const endpoint = parsePairingEndpoint(req.body?.endpoint);
    const configuration = sanitizeSharedConfiguration(req.body?.configuration);
    if (!endpoint || !configuration) {
      res.status(400).json({ error: 'Indirizzo della centrale o configurazione non validi.' });
      return;
    }
    res.status(201).json(service.issue(userId, endpoint, configuration));
  }));
  router.post('/accept', invitationLimit, (req, res) => {
    const action = req.body?.action;
    if (action !== 'account' && action !== 'configuration') {
      res.status(400).json({ error: 'Scegli account o configurazione.' });
      return;
    }
    const accepted = service.accept(req.body?.invite, req.body?.houseId, action);
    if (!accepted) { res.status(410).json({ error: 'Il QR Code è scaduto o è già stato usato. Generane uno nuovo sul PC.' }); return; }
    res.json(accepted);
  });
  router.post('/configuration/import', invitationLimit, authenticate, (req, res) => {
    if (Buffer.byteLength(JSON.stringify(req.body ?? null), 'utf8') > 512 * 1024) {
      res.status(413).json({ error: 'Scegli un file layout ACA di massimo 512 KB.' }); return;
    }
    const configuration = req.body?.format === 'acasystem-layout' && req.body?.schema === 1
      ? sanitizeSharedConfiguration(req.body.configuration) : null;
    if (!configuration) { res.status(400).json({ error: 'Il file non contiene un layout ACA compatibile.' }); return; }
    res.json({ schema: 1, configuration: portableConfiguration(configuration) });
  });
  router.get('/settings', authenticate, authed((_req, res, userId) => res.json(service.readSettings(userId))));
  router.get('/events', authenticate, authed((_req, res, userId) => {
    res.set({ 'Content-Type': 'text/event-stream', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    const changed = (revision: number) => {
      if (!res.destroyed && !res.writableEnded) res.write(`event: revision\ndata: ${JSON.stringify({ revision })}\n\n`);
    };
    changed(service.readSettings(userId)?.revision ?? 0);
    const unsubscribe = service.subscribe(userId, changed);
    const keepAlive = setInterval(() => { if (!res.destroyed && !res.writableEnded) res.write(': keep-alive\n\n'); }, 15_000);
    res.on('close', () => { clearInterval(keepAlive); unsubscribe(); });
  }));
  router.put('/settings', authenticate, authed((req, res, userId) => {
    if (!canWrite(userId)) { res.status(426).json({ error: 'Aggiorna Acasystem per modificare questo profilo sincronizzato.', code: 'PROFILE_SYNC_UPGRADE_REQUIRED' }); return; }
    const configuration = sanitizeSharedConfiguration(req.body?.configuration);
    const revision = req.body?.baseRevision;
    if (!configuration || !Number.isSafeInteger(revision) || revision < 0) {
      res.status(400).json({ error: 'Configurazione o revisione non valide.' }); return;
    }
    const saved = service.writeSettings(userId, revision, configuration);
    if (!saved) { res.status(409).json({ error: 'La configurazione è cambiata su un altro dispositivo.' }); return; }
    res.json(saved);
  }));
  return router;
};
