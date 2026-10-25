import express from 'express';
import type { Express } from 'express';
import { fileURLToPath } from 'node:url';
import { isProductionEnvironment, readPort } from './config/env.ts';
import { DEFAULT_CASA3D_DIST_PATH, DEFAULT_FRONTEND_DIST_PATH } from './config/paths.ts';
import { JSON_BODY_LIMIT } from './config/security.ts';
import { resolveAppVersion } from './config/version.ts';
import { createHealthController } from './controllers/healthController.ts';
import { createHomeAssistantAuthMiddleware } from './middlewares/homeAssistantAuth.ts';
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
import { createProfilesRouter } from './routes/profiles.ts';
import { createSettingsRouter } from './routes/settings.ts';

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
}

export const createApp = ({
  appVersion = resolveAppVersion(),
  distPath = DEFAULT_FRONTEND_DIST_PATH,
  casa3dPath = DEFAULT_CASA3D_DIST_PATH,
  isProduction = isProductionEnvironment(),
  database = getDatabase(),
}: CreateAppOptions = {}): Express => {
  const app = express();
  const homeAssistantAuth = createHomeAssistantAuthMiddleware();
  app.disable('x-powered-by');
  app.use(securityHeaders);

  // Proxy /ha verso Home Assistant (ADR-0009): prima di express.json, così i corpi passano
  // in streaming; il WebSocket è collegato al server con attachHomeAssistantWebSocketProxy.
  app.use(createHomeAssistantProxyRouter());

  // Parse JSON bodies
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  const apiRateLimiter = createApiRateLimiter();
  const assetFallbackRateLimiter = createAssetFallbackRateLimiter();

  app.use('/api', apiRateLimiter);

  // Ingress support — strip X-Ingress-Path prefix from request URL
  app.use(stripIngressPath);

  // API routes
  app.use('/api/profiles', homeAssistantAuth, createProfilesRouter(database));
  app.use('/api/icons', createIconsRouter());
  app.use('/api/settings', homeAssistantAuth, createSettingsRouter(database));
  app.use('/api/casa3d', homeAssistantAuth, createCasa3dApiRouter(database));

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
  attachHomeAssistantWebSocketProxy(server);
}
