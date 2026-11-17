import express from 'express';
import type { Express } from 'express';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { isProductionEnvironment, readPort, readDataDir } from './config/env.ts';
import { DEFAULT_CASA3D_DIST_PATH, DEFAULT_FRONTEND_DIST_PATH } from './config/paths.ts';
import { JSON_BODY_LIMIT } from './config/security.ts';
import { resolveAppVersion } from './config/version.ts';
import { createHealthController } from './controllers/healthController.ts';
import { createHomeAssistantAuthMiddleware, getBearerToken } from './middlewares/homeAssistantAuth.ts';
import { stripIngressPath } from './middlewares/ingressPath.ts';
import { createApiRateLimiter, createAssetFallbackRateLimiter } from './middlewares/rateLimit.ts';
import { securityHeaders } from './middlewares/securityHeaders.ts';
import { getDatabase } from './models/database.ts';
import type { SqliteDatabase } from './models/database.ts';
import { registerCasa3dRoutes } from './routes/casa3d.ts';
import { createCasa3dApiRouter } from './routes/casa3dApi.ts';
import { registerFrontendRoutes } from './routes/frontend.ts';
import {
  attachHomeAssistantWebSocketProxy,
  createHomeAssistantProxyRouter,
} from './routes/homeAssistantProxy.ts';
import { createIconsRouter } from './routes/icons.ts';
import { createDevicesRouter } from './routes/devices.ts';
import { createProfilesRouter } from './routes/profiles.ts';
import { createSettingsRouter } from './routes/settings.ts';
import { createSetupRouter } from './routes/setup.ts';
import { createPairingRouter } from './pairingRoutes.ts';
import { createClientBundleRouter, readVerifiedClientManifest } from './clientBundleRoutes.ts';
import { createUpdateMaintenance } from './updateMaintenance.ts';
import type { UpdateMaintenance } from './updateMaintenance.ts';
import { createUpdateRequests } from './updateRequests.ts';
import { createDeviceModule } from './services/devices/index.ts';
import type { DeviceModule, DeviceModuleOptions } from './services/devices/index.ts';
import { createCollaborationStore } from './v2/store.ts';
import { createCollaborationAuth } from './v2/auth.ts';
import { createCollaborationRouter, collaborationFailure } from './v2/router.ts';
import { createRegistrationRouter } from './v2/registrationRoutes.ts';
import { createActivityService, runWithActivityActor } from './v2/activity.ts';
import { createActivityRouter } from './v2/activityRoutes.ts';
import { createCommandsRouter } from './v2/commands.ts';
import { createAccountRouter } from './v2/account.ts';

/**
 * Backend Acasystem (ex server Express di Tunet 1.22.1). Node lo esegue direttamente
 * con lo stripping dei tipi: `node src/server.ts` (ADR-0008).
 */

export interface CreateAppOptions {
  appVersion?: string;
  /** Build del frontend; predefinita `frontend/dist` del monorepo. */
  distPath?: string;
  /** Build della Casa 3D, servita sotto /casa3d/; predefinita `casa3d/dist` del monorepo. */
  casa3dPath?: string;
  /** Serve la build del frontend; predefinito NODE_ENV === 'production'. */
  isProduction?: boolean;
  /** Database SQLite; predefinito `<DATA_DIR>/tunet.db`, aperto alla creazione dell'app. */
  database?: SqliteDatabase;
  /** Device facade (/api/dispositivi): server configuration by default, replaceable in tests. */
  devices?: DeviceModuleOptions;
  updateMaintenance?: { directory: string; targetId: string; token: string; appVersion?: string };
}

export const createApp = ({
  appVersion = resolveAppVersion(),
  distPath = DEFAULT_FRONTEND_DIST_PATH,
  casa3dPath = DEFAULT_CASA3D_DIST_PATH,
  isProduction = isProductionEnvironment(),
  database = getDatabase(),
  devices: deviceOptions = {},
  updateMaintenance: maintenanceOptions,
}: CreateAppOptions = {}): Express => {
  const app = express();
  // La copia SQLite precede le migrazioni v2; l'attività è scritta nella transazione chiamante.
  const collaboration = createCollaborationStore(database, { record: input => activity.record(input) });
  const activity = createActivityService(database);
  const devices = createDeviceModule(database, { ...deviceOptions, activity });
  app.locals.devices = devices;
  app.locals.collaboration = collaboration;
  app.locals.activity = activity;
  const collaborationAuth = createCollaborationAuth(collaboration, devices);
  activity.subscribe(() => collaboration.publish(null, { type: 'activity' }));
  // An administrator who opens Acasystem lends the device facade the means to activate its
  // service identity (REP-20261028-004, T1); `devices` is created below, hence the lookup.
  const homeAssistantAuth = createHomeAssistantAuthMiddleware({
    onAdministrator: ({ user, accessToken }) =>
      (app.locals.devices as DeviceModule | undefined)?.keeper.offerAdmin({
        token: accessToken,
        user: { id: user.id, name: user.name },
      }),
  });
  app.disable('x-powered-by');
  app.use(securityHeaders);
  const updateTokenFile = process.env.ACA_UPDATE_TOKEN_FILE;
  const updateConfig = maintenanceOptions ?? (updateTokenFile ? { directory: readDataDir(),
    targetId: process.env.ACA_UPDATE_TARGET_ID ?? '', token: readFileSync(updateTokenFile, 'utf8').trim() } : undefined);
  const updateRequests = createUpdateRequests(updateConfig?.directory ?? readDataDir(), appVersion, Boolean(updateConfig));
  if (updateConfig) {
    const bundle = readVerifiedClientManifest(process.env.CLIENT_BUNDLE_DIR || '/app/client-bundle');
    const maintenance = createUpdateMaintenance({ ...updateConfig, version: appVersion,
      appVersion: maintenanceOptions?.appVersion ?? process.env.APP_VERSION ?? appVersion, database,
      bundle: () => bundle, activeEditors: () => collaboration.updateActivity().activeEditors,
      checkRequest: updateRequests.current, publishStatus: updateRequests.publish,
      pause: () => devices.pauseForUpdate(), resume: () => devices.resumeAfterUpdate() });
    app.locals.updateMaintenance = maintenance;
    app.use('/api/internal/update', maintenance.router);
    app.use(maintenance.middleware);
  }
  // Una revoca locale conosciuta vale anche sui percorsi legacy e sul proxy HTTP,
  // mentre la revoca HA può essere ancora in attesa di conferma.
  app.use((req, res, next) => {
    try { const token = getBearerToken(req); if (token) collaboration.assertAccessTokenActive(token); next(); }
    catch (error) { collaborationFailure(res, error); }
  });

  // Proxy /ha verso Home Assistant (ADR-0009): prima di express.json, così i corpi passano
  // in streaming; il WebSocket è collegato al server con attachHomeAssistantWebSocketProxy.
  app.use(createHomeAssistantProxyRouter());

  // Ingress support — strip X-Ingress-Path prefix from request URL. Before the limiter, so a
  // prefixed /x/api/... is counted as /api/... too (REP-20261028-002, S1).
  app.use(stripIngressPath);

  const apiRateLimiter = createApiRateLimiter();
  const assetFallbackRateLimiter = createAssetFallbackRateLimiter();

  app.use('/api', apiRateLimiter);
  app.use('/api/updates', updateRequests.router);

  // Il parser del setup non inoltra password o JSON malformato al gestore generico degli errori.
  app.use('/api/setup', createSetupRouter(homeAssistantAuth));
  app.use('/api/v2/registration', createRegistrationRouter({ database, devices, onRegistered: user => {
    if (user.color) collaboration.setUserColor(user.id, user.color, false);
  } }));

  // Parse JSON bodies, after the limiter: a flood is refused before its body is read (S4).
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  // API routes
  app.use('/api/client-bundle', createClientBundleRouter());
  const legacyWriterGuard: express.RequestHandler = (req, res, next) => {
    const user = (req as express.Request & { authenticatedHaUser?: { id: string } }).authenticatedHaUser;
    if (req.method !== 'GET' && req.method !== 'HEAD' && user && collaboration.migrated(user.id)) {
      res.status(426).json({ error: 'Aggiorna Acasystem per modificare questo profilo sincronizzato.', code: 'PROFILE_SYNC_UPGRADE_REQUIRED' });
      return;
    }
    next();
  };
  app.use('/api/profiles', homeAssistantAuth, legacyWriterGuard, createProfilesRouter(database));
  app.use('/api/icons', createIconsRouter());
  app.use('/api/settings', homeAssistantAuth, legacyWriterGuard, createSettingsRouter(database));
  app.use('/api/pairing', createPairingRouter(database, homeAssistantAuth, userId => !collaboration.migrated(userId)));
  app.use('/api/casa3d', homeAssistantAuth, (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || !req.authenticatedHaUser || !collaboration.clients(req.authenticatedHaUser.id).length) { next(); return; }
    void collaborationAuth.authorizeUsage(req).then(() => next()).catch(error => collaborationFailure(res, error));
  }, createCasa3dApiRouter(database));

  // Device configuration facade (ADR-0021, ADR-0022). Timers start in main(), not here.
  app.use('/api/dispositivi', homeAssistantAuth, (req, res, next) => {
    if (!req.authenticatedHaUser || !collaboration.clients(req.authenticatedHaUser.id).length) { next(); return; }
    const mutative = req.method !== 'GET' && req.method !== 'HEAD';
    void (mutative ? collaborationAuth.authorizeUsage(req) : collaborationAuth.authorize(req)).then(({ actor }) => runWithActivityActor(actor, next)).catch(error => {
      const code = (error as { code?: string }).code;
      if (!mutative && (code === 'CLIENT_REQUIRED' || code === 'SESSION_LOGIN_REQUIRED')) next();
      else collaborationFailure(res, error);
    });
  }, createDevicesRouter(devices));
  app.use('/api/v2', createCollaborationRouter(collaboration, collaborationAuth, devices));
  app.use('/api/v2/activity', createActivityRouter({ activity, authorize: collaborationAuth.authorize }));
  const commands = createCommandsRouter({ database, activity, authorize: req => req.method === 'GET' ? collaborationAuth.authorize(req) : collaborationAuth.authorizeUsage(req) });
  app.locals.commands = commands;
  app.use('/api/v2/commands', commands);
  app.use('/api/v2/account', createAccountRouter({ database, collaboration, activity, authorize: collaborationAuth.authorize }));

  // Health check
  app.get('/api/health', createHealthController(appVersion));

  // Serve static frontend files in production
  if (isProduction) {
    // Prima del frontend: sotto /casa3d/ un file mancante è un 404, non il ripiego SPA (ADR-0014, D16)
    registerCasa3dRoutes(app, casa3dPath);
    registerFrontendRoutes(app, distPath, assetFallbackRateLimiter);
  }

  return app;
};

const isMainModule =
  Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  const port = readPort();
  const app = createApp();

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(
      `[server] Tunet backend running on port ${port} (${isProductionEnvironment() ? 'production' : 'development'})`
    );
  });
  attachHomeAssistantWebSocketProxy(server, app.locals.updateMaintenance as UpdateMaintenance | undefined);

  // Cancel the flows left open by the previous run and check the Home Assistant version.
  const devices = app.locals.devices as DeviceModule;
  const maintenance = app.locals.updateMaintenance as UpdateMaintenance | undefined;
  if (maintenance?.blocked()) void devices.pauseForUpdate();
  void devices.start();
  const activity = app.locals.activity as ReturnType<typeof createActivityService>;
  const commands = app.locals.commands as ReturnType<typeof createCommandsRouter>;
  const activitySweep = setInterval(() => { if (!maintenance?.blocked()) { activity.prune(); commands.prune(); } }, 60 * 60_000);
  activitySweep.unref();
  server.on('close', () => { clearInterval(activitySweep); devices.stop(); });
}
