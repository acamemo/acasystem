import type { NextFunction, Request, Response } from 'express';
import { CONTENT_SECURITY_POLICY } from '../config/security.ts';

/** Toglie X-Powered-By e aggiunge la Content-Security-Policy a ogni risposta. */
export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  res.removeHeader('X-Powered-By');
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  next();
};
