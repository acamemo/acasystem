// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type SqliteDatabase } from '../models/database.ts';
import { createDataCrypto } from '../helpers/dataCrypto.ts';
import { createCollaborationStore, type V2Actor } from '../v2/store.ts';
import { createAccountService } from '../v2/account.ts';
import { createActivityService } from '../v2/activity.ts';
import { makePng } from './casa3dFixtures.ts';

const actor: V2Actor = { userId: 'mario', userName: 'Mario', clientId: 'pc', clientName: 'PC studio', sessionId: 'session-pc' };
const other: V2Actor = { ...actor, userId: 'anna', userName: 'Anna', clientId: 'anna-phone' };
const png = (width = 16, height = width) => `data:image/png;base64,${makePng(width, height).toString('base64')}`;

describe('personalizzazione account, immagini e revisioni', () => {
  let db: SqliteDatabase;
  let collaboration: ReturnType<typeof createCollaborationStore>;
  let activity: ReturnType<typeof createActivityService>;
  let account: ReturnType<typeof createAccountService>;
  beforeEach(() => {
    db = openDatabase(':memory:'); activity = createActivityService(db);
    collaboration = createCollaborationStore(db);
    account = createAccountService(db, collaboration, activity, createDataCrypto({ mode: 'off', key: '', salt: '' }));
  });
  afterEach(() => db.close());
  it('personalizza il colore dell’identità senza modificare altri utenti o dashboard', () => {
    expect(account.metadata(actor)).toMatchObject({ revision: 0, avatarRevision: null, coverRevision: null });
    expect(account.color(actor, 0, '#00CCAA')).toMatchObject({ color: '#00ccaa', revision: 1 });
    expect(account.metadata(other).revision).toBe(0);
    expect(collaboration.profiles(actor.userId)).toHaveLength(0);
    expect(() => account.color(actor, 1, 'url(javascript:alert(1))')).toThrow();
  });
  it('impedisce a PC e telefono di sovrascrivere silenziosamente la personalizzazione', () => {
    account.color(actor, 0, '#345678');
    expect(() => account.putImage({ ...actor, clientId: 'phone' }, 'avatar', 0, png())).toThrow('altro dispositivo');
    expect(account.metadata(actor)).toMatchObject({ color: '#345678', avatarRevision: null, revision: 1 });
  });
  it('conserva immagini normalizzate con revisioni e consente ripristino dell’avatar a colore', () => {
    expect(account.putImage(actor, 'avatar', 0, png())).toMatchObject({ avatarRevision: 1, revision: 1 });
    expect(account.putImage(actor, 'cover', 1, png(32, 16))).toMatchObject({ avatarRevision: 1, coverRevision: 2, revision: 2 });
    expect(account.image(actor.userId, 'avatar').bytes.equals(makePng(16, 16))).toBe(true);
    expect(account.avatars()).toEqual([{ userId: actor.userId, avatarRevision: 1 }]);
    expect(account.removeImage(actor, 'avatar', 2)).toMatchObject({ avatarRevision: null, coverRevision: 2, revision: 3 });
    expect(() => account.image(actor.userId, 'avatar')).toThrow('non presente');
    expect(account.avatars()).toEqual([]);
  });
  it('verifica byte, formato, animazione, ritaglio e limite invece di fidarsi del MIME', () => {
    expect(() => account.putImage(actor, 'avatar', 0, `data:image/png;base64,${Buffer.from('<svg><script/></svg>').toString('base64')}`)).toThrow('valida');
    expect(() => account.putImage(actor, 'avatar', 0, png(32, 16))).toThrow('ritaglio');
    expect(() => account.putImage(actor, 'cover', 0, png(16, 16))).toThrow('ritaglio');
    expect(() => account.putImage(actor, 'avatar', 0, png(513))).toThrow('ritaglio');
    expect(() => account.putImage(actor, 'avatar', 0, `data:image/png;base64,${'A'.repeat(400_000)}`)).toThrow('grande');
    expect(account.metadata(actor).revision).toBe(0);
  });
  it('esclude immagini e sorgenti dal diario ed esportazione', () => {
    const dataUrl = png(); account.putImage(actor, 'avatar', 0, dataUrl);
    const text = JSON.stringify(activity.exportData());
    expect(text).toContain('account.avatar.saved'); expect(text).not.toContain('data:image');
    expect(text).not.toContain(dataUrl.split(',')[1]);
    expect(text).not.toContain('PC studio');
  });
  it('rispetta enc_only senza salvare il base64 originale in chiaro', () => {
    const encrypted = createAccountService(db, collaboration, activity, createDataCrypto({ mode: 'enc_only', key: 'ab'.repeat(32), salt: '' }));
    encrypted.putImage(actor, 'avatar', 0, png());
    const stored = db.prepare('SELECT data,data_enc FROM aca_v2_account_images WHERE user_id=?').get(actor.userId) as { data: string; data_enc: string };
    expect(stored.data).not.toContain(makePng(16, 16).toString('base64')); expect(stored.data_enc).toBeTruthy();
    expect(encrypted.image(actor.userId, 'avatar').bytes.equals(makePng(16, 16))).toBe(true);
  });
  it('la ripetizione del callback registrazione non annulla un colore scelto successivamente', () => {
    collaboration.setUserColor(actor.userId, '#112233', false);
    account.color(actor, 0, '#445566');
    collaboration.setUserColor(actor.userId, '#112233', false);
    expect(account.metadata(actor).color).toBe('#445566');
  });
});
