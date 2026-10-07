import type { NextFunction, Request, Response } from 'express';

/**
 * URL senza il prefisso X-Ingress-Path, se presente; usato anche dal proxy verso HA,
 * che risponde prima di questo middleware (HTTP e upgrade WebSocket).
 */
export const removeIngressPrefix = (url: string, ingressPath: unknown): string => {
  if (typeof ingressPath === 'string' && ingressPath && url.startsWith(ingressPath)) {
    return url.slice(ingressPath.length) || '/';
  }
  return url;
};

/** Supporto all'ingress di HA: toglie il prefisso X-Ingress-Path dall'URL della richiesta. */
export const stripIngressPath = (req: Request, _res: Response, next: NextFunction): void => {
  req.url = removeIngressPrefix(req.url, req.headers['x-ingress-path']);
  next();
};
