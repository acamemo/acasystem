import express from 'express';
import type { Express, RequestHandler } from 'express';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createFrontendController, setNoCacheHeaders } from '../controllers/frontendController.ts';
import { buildHashedAssetFallbackMap } from '../services/frontendAssets.ts';

/**
 * Build del frontend in produzione: asset con cache lunga e ripiego per hash superati,
 * file statici, index.html senza cache e ripiego SPA. Va registrato dopo le API.
 */
export const registerFrontendRoutes = (
  app: Express,
  distPath: string,
  assetFallbackRateLimiter: RequestHandler
): void => {
  if (!existsSync(distPath)) {
    console.warn('[server] dist/ folder not found. Only API routes will be available.');
    return;
  }

  const assetsPath = join(distPath, 'assets');
  const indexHtmlPath = join(distPath, 'index.html');
  const indexHtml = existsSync(indexHtmlPath) ? readFileSync(indexHtmlPath, 'utf8') : null;
  const assetFiles = existsSync(assetsPath) ? readdirSync(assetsPath) : [];

  const controller = createFrontendController({
    assetsPath,
    indexHtml,
    hashedAssetFallbackMap: buildHashedAssetFallbackMap(assetFiles),
  });

  app.use(
    '/assets',
    express.static(assetsPath, {
      fallthrough: true,
      immutable: true,
      maxAge: '1y',
    })
  );

  app.get('/assets/{*path}', assetFallbackRateLimiter, controller.serveHashedAssetFallback);

  app.use(
    express.static(distPath, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          setNoCacheHeaders(res);
        }
        if (filePath.endsWith('sw.js')) {
          setNoCacheHeaders(res);
          res.setHeader('Service-Worker-Allowed', '/');
        }
      },
    })
  );

  app.get('/index.html', controller.serveIndex);

  // SPA fallback — serve index.html for all non-API routes
  app.use(controller.spaFallback);
};
