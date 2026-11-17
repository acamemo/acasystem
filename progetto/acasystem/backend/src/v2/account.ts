import { Router, type Request, type Response } from 'express';
import type { AccountImageKind, AccountMetadata } from '../../../contracts/account.ts';
import { AVATAR_MAX_BYTES, COVER_MAX_BYTES } from '../../../contracts/account.ts';
import { inspectImage } from '../helpers/casa3dImage.ts';
import { dataCrypto, type DataCrypto } from '../helpers/dataCrypto.ts';
import type { SqliteDatabase } from '../models/database.ts';
import type { ActivityService, AuthorizeActivity } from './activity.ts';
import { CollaborationError, type CollaborationStore, type V2Actor } from './store.ts';
import { collaborationFailure } from './router.ts';

interface ImageRow { user_id: string; kind: AccountImageKind; revision: number; mime: string; data: string; data_enc: string | null }
export function createAccountService(database: SqliteDatabase, collaboration: CollaborationStore, activity: ActivityService, crypto: DataCrypto = dataCrypto) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS aca_v2_accounts(user_id TEXT PRIMARY KEY,revision INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS aca_v2_account_images(user_id TEXT NOT NULL,kind TEXT NOT NULL,revision INTEGER NOT NULL,mime TEXT NOT NULL,data TEXT NOT NULL,data_enc TEXT,PRIMARY KEY(user_id,kind));
  `);
  const getImageRow = (userId: string, kind: AccountImageKind) => database.prepare('SELECT * FROM aca_v2_account_images WHERE user_id=? AND kind=?').get(userId, kind) as ImageRow | undefined;
  const metadata = (actor: V2Actor): AccountMetadata => {
    const row = database.prepare('SELECT revision FROM aca_v2_accounts WHERE user_id=?').get(actor.userId) as { revision: number } | undefined;
    return { userId: actor.userId, name: actor.userName, color: collaboration.userColor(actor.userId), revision: row?.revision ?? 0, avatarRevision: getImageRow(actor.userId, 'avatar')?.revision ?? null, coverRevision: getImageRow(actor.userId, 'cover')?.revision ?? null };
  };
  const mutate = (actor: V2Actor, base: unknown, action: string, run: (revision: number) => void) => {
    const result = database.transaction(() => {
      const current = metadata(actor);
      if (!Number.isSafeInteger(base) || base !== current.revision) throw new CollaborationError(409, 'ACCOUNT_CONFLICT', 'L’account è stato modificato su un altro dispositivo. Rileggi i dati prima di salvare.', { account: current });
      const revision = current.revision + 1;
      run(revision);
      database.prepare('INSERT INTO aca_v2_accounts(user_id,revision) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision').run(actor.userId, revision);
      activity.record({ actor, kind: 'configuration', action, outcome: 'accepted', revision });
      return metadata(actor);
    })();
    activity.publish(); collaboration.publish(actor.userId, { type: 'client' }); return result;
  };
  const color = (actor: V2Actor, base: unknown, value: unknown) => mutate(actor, base, 'account.color', () => collaboration.setUserColor(actor.userId, value));
  const putImage = (actor: V2Actor, kind: AccountImageKind, base: unknown, dataUrl: unknown) => {
    if (typeof dataUrl !== 'string') throw new CollaborationError(400, 'IMAGE_REQUIRED', 'Scegli e ritaglia un’immagine.');
    const max = kind === 'avatar' ? AVATAR_MAX_BYTES : COVER_MAX_BYTES;
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
    if (!match || dataUrl.length > Math.ceil(max / 3) * 4 + 64) throw new CollaborationError(413, 'IMAGE_SIZE', 'L’immagine è troppo grande o il formato non è supportato. Ritagliala e riprova.');
    const bytes = Buffer.from(match[2]!, 'base64');
    if (bytes.length > max || bytes.toString('base64') !== match[2]) throw new CollaborationError(413, 'IMAGE_SIZE', 'L’immagine supera il limite consentito.');
    const check = inspectImage(bytes);
    if (!check.ok || check.mime !== match[1]) throw new CollaborationError(415, 'IMAGE_FORMAT', 'Scegli un’immagine PNG, JPEG o WebP valida e non animata.');
    if (kind === 'avatar' ? check.width !== check.height || check.width > 512 : check.width !== check.height * 2 || check.width > 1536 || check.height > 768) throw new CollaborationError(422, 'IMAGE_CROP', 'Conferma il ritaglio dell’immagine prima di salvarla.');
    const encoded = crypto.encryptDataText(bytes.toString('base64'));
    if (!encoded && crypto.isEncryptionWriteRequired()) throw new CollaborationError(503, 'ENCRYPTION_UNAVAILABLE', 'Non posso salvare l’immagine in questo momento.');
    const plain = crypto.shouldPersistPlaintextData() ? bytes.toString('base64') : crypto.getEncryptedOnlyPlaintextStub();
    return mutate(actor, base, `account.${kind}.saved`, revision => database.prepare('INSERT INTO aca_v2_account_images(user_id,kind,revision,mime,data,data_enc) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,kind) DO UPDATE SET revision=excluded.revision,mime=excluded.mime,data=excluded.data,data_enc=excluded.data_enc').run(actor.userId, kind, revision, check.mime, plain, encoded));
  };
  const removeImage = (actor: V2Actor, kind: AccountImageKind, base: unknown) => mutate(actor, base, `account.${kind}.removed`, () => database.prepare('DELETE FROM aca_v2_account_images WHERE user_id=? AND kind=?').run(actor.userId, kind));
  const image = (userId: string, kind: AccountImageKind) => {
    const row = getImageRow(userId, kind);
    if (!row) throw new CollaborationError(404, 'IMAGE_NOT_FOUND', 'Immagine non presente.');
    const text = crypto.resolveStoredDataText({ plainText: row.data, encryptedText: row.data_enc, context: 'account-image' });
    if (!text) throw new CollaborationError(503, 'IMAGE_UNAVAILABLE', 'Immagine momentaneamente non disponibile.');
    return { bytes: Buffer.from(text, 'base64'), mime: row.mime, revision: row.revision };
  };
  return { metadata, color, putImage, removeImage, image, avatars: () => (database.prepare("SELECT user_id,revision FROM aca_v2_account_images WHERE kind='avatar'").all() as { user_id: string; revision: number }[]).map(row => ({ userId: row.user_id, avatarRevision: row.revision })) };
}
export function createAccountRouter({ database, collaboration, activity, authorize }: { database: SqliteDatabase; collaboration: CollaborationStore; activity: ActivityService; authorize: AuthorizeActivity }) {
  const service = createAccountService(database, collaboration, activity);
  const router = Router();
  router.use((_req, res, next) => { res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); next(); });
  const route = (run: (req: Request, res: Response, actor: V2Actor) => void) => async (req: Request, res: Response) => {
    try { const { actor } = await authorize(req); if (!actor.clientId || !actor.clientName || !actor.sessionId) throw new CollaborationError(401, 'CLIENT_REQUIRED', 'Collega il dispositivo.'); run(req, res, actor as V2Actor); }
    catch (error) { collaborationFailure(res, error); }
  };
  const kind = (req: Request): AccountImageKind => { if (req.params.kind !== 'avatar' && req.params.kind !== 'cover') throw new CollaborationError(404, 'IMAGE_KIND', 'Immagine non disponibile.'); return req.params.kind; };
  const sendImage = (res: Response, value: ReturnType<typeof service.image>) => { res.set({ 'Content-Type': value.mime, 'Content-Security-Policy': "default-src 'none'; sandbox" }); res.send(value.bytes); };
  router.get('/', route((_req, res, actor) => { res.json(service.metadata(actor)); }));
  router.patch('/', route((req, res, actor) => { res.json(service.color(actor, req.body?.baseRevision, req.body?.color)); }));
  router.get('/avatars', route((_req, res) => { res.json(service.avatars()); }));
  router.get('/users/:userId/avatar', route((req, res) => { sendImage(res, service.image(String(req.params.userId), 'avatar')); }));
  router.get('/images/:kind', route((req, res, actor) => { sendImage(res, service.image(actor.userId, kind(req))); }));
  router.put('/images/:kind', route((req, res, actor) => { res.json(service.putImage(actor, kind(req), req.body?.baseRevision, req.body?.dataUrl)); }));
  router.delete('/images/:kind', route((req, res, actor) => { res.json(service.removeImage(actor, kind(req), req.body?.baseRevision)); }));
  return router;
}
