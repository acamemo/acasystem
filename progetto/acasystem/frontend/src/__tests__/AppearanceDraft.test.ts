import { beforeEach, describe, expect, it } from 'vitest';
import { discardAppearanceImages, readAppearanceImages, rememberAppearanceImages } from '@/components/account/appearanceDraft';
import { discardUnboundAppearanceImages, readOwnerAppearance, rememberMemberAppearance, rememberOwnerAppearance } from '@/api/ownerAppearance';

const image = 'data:image/jpeg;base64,AQID';
beforeEach(() => { sessionStorage.clear(); discardAppearanceImages('first'); discardAppearanceImages('next'); });
describe('ritagli preregistrazione soltanto in RAM', () => {
  it('mantiene soltanto il nonce corrente e aggiorna senza accumulare i ritagli', () => {
    rememberAppearanceImages('first', { avatar: image, cover: image });
    rememberAppearanceImages('first', { avatar: image });
    expect(readAppearanceImages('first')).toEqual({ avatar: image });
    rememberAppearanceImages('next', { cover: image });
    expect(readAppearanceImages('first')).toEqual({});
    expect(readAppearanceImages('next')).toEqual({ cover: image });
    expect(sessionStorage.length).toBe(0);
  });
  it('nessuna immagine entra nel recupero; abbandonare il flusso elimina soltanto i ritagli non associati', () => {
    rememberMemberAppearance('anna', '#123abc', 'attempt-a', { avatar: image, cover: image });
    const intent = readOwnerAppearance()!;
    expect(readAppearanceImages(intent.id)).toEqual({ avatar: image, cover: image });
    expect(sessionStorage.getItem('aca:setup:owner-appearance')).not.toContain('data:');
    discardUnboundAppearanceImages();
    expect(readAppearanceImages(intent.id)).toEqual({});
    expect(readOwnerAppearance()?.id).toBe(intent.id);
  });
  it('rifiuta ritagli fuori quota prima di sostituire un intento valido', () => {
    rememberOwnerAppearance('anna', '#123abc', { avatar: image });
    const previous = readOwnerAppearance()!;
    expect(() => rememberOwnerAppearance('other', '#ffffff', { avatar: `data:image/jpeg;base64,${'A'.repeat(360_000)}` })).toThrow(/limite/);
    expect(readOwnerAppearance()?.id).toBe(previous.id);
    expect(readAppearanceImages(previous.id)).toEqual({ avatar: image });
  });
});
