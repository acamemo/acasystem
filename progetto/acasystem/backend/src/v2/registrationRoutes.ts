import express, { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { ErrorRequestHandler } from 'express';
import type { SqliteDatabase } from '../models/database.ts';
import type { DeviceModule } from '../services/devices/index.ts';
import { createRegistrationService, RegistrationError, validAttemptId, validateRegistration } from './registrationService.ts';

/** Montare prima del parser generale: errori e body di registrazione non finiscono nei log. */
export function createRegistrationRouter({ database, devices, onRegistered }: {
  database: SqliteDatabase;
  devices: Pick<DeviceModule, 'context' | 'keeper'>;
  onRegistered?: (user: { id: string; name: string; color?: string }) => void;
}): Router {
  const service = createRegistrationService({
    database, ...(onRegistered ? { onRegistered } : {}),
    access: {
      async ready() {
        try {
          if ((await devices.context.compat.get()).onboarded !== true) return false;
          return (await devices.keeper.ensureReady()).active;
        } catch { return false; }
      },
      async withAdmin(operation) {
        const token = await devices.context.identity.requireToken();
        return devices.context.adapter.withWs(token, async (api) => {
          if (!(await api.currentUser()).isAdmin) throw new RegistrationError('REGISTRATION_UNAVAILABLE', 503, 'La centrale sta preparando gli accessi. Riprova fra poco.');
          return operation(api);
        });
      },
    },
  });
  const router = Router();
  const attempts = rateLimit({ windowMs: 10 * 60_000, limit: 10, legacyHeaders: false, standardHeaders: 'draft-8',
    message: { code: 'REGISTRATION_RATE_LIMITED', error: 'Troppi tentativi. Attendi qualche minuto e riprova.' } });
  router.use(express.json({ limit: '4kb' }));
  router.get('/status', (_req, res) => { void service.ready().then((ready) => res.json({ ready })); });
  router.get('/attempts/:id', (req, res) => {
    const result = validAttemptId(req.params.id) ? service.get(req.params.id) : null;
    if (!result) { res.status(404).json({ code: 'REGISTRATION_NOT_FOUND', error: 'Tentativo non disponibile.' }); return; }
    res.json(result);
  });
  router.post('/attempts', attempts, (req, res) => {
    void (async () => {
      if (!req.is('application/json') || Buffer.byteLength(JSON.stringify(req.body ?? null), 'utf8') > 4096) {
        throw new RegistrationError('REGISTRATION_INVALID', 400, 'Controlla i dati inseriti.');
      }
      const result = await service.register(validateRegistration(req.body));
      res.status(result.status === 'created' ? 201 : 202).json(result);
    })().catch((error: unknown) => {
      if (error instanceof RegistrationError) res.status(error.status).json({ code: error.code, error: error.message });
      else res.status(503).json({ code: 'REGISTRATION_UNAVAILABLE', error: 'Registrazione non completata. Riprova fra poco con gli stessi dati.' });
    });
  });
  const parserError: ErrorRequestHandler = (_error, _req, res, _next) => {
    res.status(400).json({ code: 'REGISTRATION_INVALID', error: 'Controlla i dati inseriti.' });
  };
  router.use(parserError);
  return router;
}
