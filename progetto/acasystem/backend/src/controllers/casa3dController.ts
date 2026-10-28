import type { Request, Response } from 'express';
import { sendFailure, sendJsonError } from '../middlewares/errors.ts';
import type { Casa3dService } from '../services/casa3dService.ts';
import {
  validateImageId,
  validateImportBody,
  validateSaveBody,
  validateSnapshotId,
} from '../validators/casa3dValidators.ts';
import { valid } from '../validators/common.ts';
import { andThen, authed, respond } from './requestUser.ts';

/** Gestori HTTP di /api/casa3d (ADR-0014, T6). L'utente autenticato lo ha già verificato `requireCasa3dEditor` (ISSUE-102: scrive chiunque sia autenticato). */

type Handler = (req: Request, res: Response) => void;

export const BACKUP_FORMAT = 'acasystem-casa3d-backup';

/** Tipi ammessi nell'intestazione `Content-Type` del caricamento di un'immagine. */
const IMAGE_TYPES: ReadonlySet<string> = new Set(['image/png', 'image/jpeg', 'image/webp']);

/** Risposta delle immagini: nessun contenuto eseguibile anche se aperta come documento. */
const IMAGE_CSP = "default-src 'none'; sandbox";

export interface Casa3dController {
  getBuilding: Handler;
  getRevision: Handler;
  putBuilding: Handler;
  getImage: Handler;
  putImage: Handler;
  deleteImage: Handler;
  listHistory: Handler;
  createSnapshot: Handler;
  restoreSnapshot: Handler;
  exportBackup: Handler;
  importBackup: Handler;
}

export const createCasa3dController = (service: Casa3dService): Casa3dController => ({
  getBuilding: authed((_req, res) => {
    const result = service.getBuilding();
    if (result.ok) res.setHeader('Cache-Control', 'no-store');
    respond(res, result);
  }),

  getRevision: authed((_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ revision: service.getRevision() });
  }),

  putBuilding: authed((req, res, userId) => {
    const input = validateSaveBody(req.body);
    if (!input.ok) {
      sendFailure(res, input.failure);
      return;
    }
    const result = service.saveBuilding({ ...input.value, userId });
    if (!result.ok) {
      res.status(result.status).json({
        error: result.error,
        ...(result.revision === undefined ? {} : { revision: result.revision }),
      });
      return;
    }
    res.json({ revision: result.revision, updated_at: result.updated_at });
  }),

  getImage: authed((req, res) => {
    const id = validateImageId(req.params.id);
    if (!id.ok) {
      sendFailure(res, id.failure);
      return;
    }
    const image = service.getImage(id.value);
    if (!image) {
      sendJsonError(res, 404, 'Image not found');
      return;
    }
    const etag = `"${image.sha256}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', IMAGE_CSP);
    if (req.get('if-none-match') === etag) {
      res.status(304).end();
      return;
    }
    res.type(image.mime).send(image.bytes);
  }),

  putImage: authed((req, res, userId) => {
    const id = validateImageId(req.params.id);
    if (!id.ok) {
      sendFailure(res, id.failure);
      return;
    }
    const declared = (req.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
    if (!IMAGE_TYPES.has(declared)) {
      sendJsonError(res, 415, 'Content-Type must be image/png, image/jpeg or image/webp (SVG is not allowed)');
      return;
    }
    const body: unknown = req.body;
    if (!Buffer.isBuffer(body)) {
      sendJsonError(res, 400, 'The request has no image');
      return;
    }
    const result = service.putImage(id.value, body, userId, declared);
    respond(res, result.ok ? { ok: true, value: { id: id.value, ...result.value } } : result);
  }),

  deleteImage: authed((req, res) => {
    const id = validateImageId(req.params.id);
    if (!id.ok) {
      sendFailure(res, id.failure);
      return;
    }
    if (!service.removeImage(id.value)) {
      sendJsonError(res, 404, 'Image not found');
      return;
    }
    res.json({ success: true });
  }),

  listHistory: authed((_req, res) => {
    res.json({ snapshots: service.listHistory() });
  }),

  createSnapshot: authed((_req, res) => {
    const result = service.snapshot();
    respond(res, result.ok ? valid({ snapshot: result.value }) : result);
  }),

  restoreSnapshot: authed((req, res, userId) => {
    const id = validateSnapshotId(req.params.id);
    respond(res, andThen(id, (value) => service.restore(value, userId)));
  }),

  exportBackup: authed((_req, res) => {
    const result = service.exportBackup();
    if (!result.ok) {
      sendFailure(res, result.failure);
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      format: BACKUP_FORMAT,
      version: 1,
      exported_at: new Date().toISOString(),
      building: result.value.building,
      packs: [],
    });
  }),

  importBackup: authed((req, res, userId) => {
    const input = validateImportBody(req.body);
    respond(res, andThen(input, (value) => service.importBackup({ ...value, userId })));
  }),
});
