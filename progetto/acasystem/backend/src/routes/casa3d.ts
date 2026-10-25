import express from 'express';
import type { Express, NextFunction, Request, Response } from 'express';
import { existsSync } from 'node:fs';
import { basename } from 'node:path';
import { setNoCacheHeaders } from '../controllers/frontendController.ts';

/** Percorso pubblico dei bundle della Casa 3D (ADR-0014, D16). */
export const CASA3D_PUBLIC_PATH = '/casa3d';

/**
 * Nome con l'impronta del contenuto che scrive `casa3d/build.mjs`: `casa3d-<impronta>.js`,
 * `casa3d-<bundle>-<impronta>.js` e il relativo `.LEGAL.txt`. Un file così non cambia mai
 * sotto lo stesso nome, quindi la cache lunga è sicura.
 */
const HASHED_FILE = /^casa3d(?:-[a-z0-9]+)?-[0-9a-f]{12}\.js(?:\.LEGAL\.txt)?$/;

/** Un nome che non esiste (o non è più quello attuale) è un 404 esplicito, mai il ripiego SPA. */
const sendNotFound = (_req: Request, res: Response): void => {
  res.status(404).type('text/plain').send('Not found');
};

/**
 * Bundle della Casa 3D sotto `/casa3d/`, stessa origine dell'app (CSP invariata):
 * - file con impronta nel nome: `Cache-Control: public, max-age=31536000, immutable`;
 * - `manifest.json` (l'unico punto d'ingresso, con i nomi attuali): mai in cache;
 * - lingue, licenze e il resto: da riconvalidare a ogni uso (`no-cache` con ETag);
 * - ogni altra richiesta sotto `/casa3d` (file mancante, nome vecchio, cartella, metodo diverso da GET/HEAD):
 *   404 testuale, senza il ripiego SPA di `index.html`.
 * Va registrato prima del frontend e dopo le API.
 */
export const registerCasa3dRoutes = (app: Express, casa3dPath: string): void => {
  if (!existsSync(casa3dPath)) {
    console.warn('[server] casa3d/dist folder not found. /casa3d/ will answer 404.');
  }

  app.use(CASA3D_PUBLIC_PATH, (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  if (existsSync(casa3dPath)) {
    app.use(
      CASA3D_PUBLIC_PATH,
      express.static(casa3dPath, {
        index: false,
        redirect: false,
        dotfiles: 'ignore',
        fallthrough: true,
        setHeaders: (res, filePath) => {
          const name = basename(filePath);
          if (HASHED_FILE.test(name)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else if (name === 'manifest.json') {
            setNoCacheHeaders(res);
          } else {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      })
    );
  }

  app.use(CASA3D_PUBLIC_PATH, sendNotFound);
};
