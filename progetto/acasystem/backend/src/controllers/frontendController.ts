import { join } from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import { resolveHashedAssetFallback } from '../services/frontendAssets.ts';

/** Gestori della build del frontend servita in produzione (SPA). */

export interface FrontendControllerOptions {
  assetsPath: string;
  /** Contenuto di index.html letto all'avvio; null se manca. */
  indexHtml: string | null;
  hashedAssetFallbackMap: ReadonlyMap<string, string>;
}

/** Anche per la risposta di serve-static (`setHeaders`), che è un http.ServerResponse. */
export const setNoCacheHeaders = (res: { setHeader(name: string, value: string): unknown }): void => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
};

export const createFrontendController = ({
  assetsPath,
  indexHtml,
  hashedAssetFallbackMap,
}: FrontendControllerOptions) => {
  const sendSpaIndex = (res: Response): void => {
    setNoCacheHeaders(res);
    if (indexHtml !== null) {
      res.type('html').send(indexHtml);
      return;
    }
    res.status(503).send('Frontend unavailable');
  };

  return {
    /** GET /index.html */
    serveIndex: (_req: Request, res: Response): void => {
      sendSpaIndex(res);
    },

    /** GET /assets/*: file attuale al posto di un nome con hash superato. */
    serveHashedAssetFallback: (req: Request, res: Response, next: NextFunction): void => {
      const fallbackFileName = resolveHashedAssetFallback(req.path, hashedAssetFallbackMap);
      if (!fallbackFileName) {
        next();
        return;
      }

      res.setHeader('X-Tunet-Asset-Fallback', fallbackFileName);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.sendFile(join(assetsPath, fallbackFileName));
    },

    /** Ripiego SPA: index.html per ogni percorso che non è API e non ha estensione. */
    spaFallback: (req: Request, res: Response, next: NextFunction): void => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      if (req.path.includes('.')) {
        next();
        return;
      }
      sendSpaIndex(res);
    },
  };
};
