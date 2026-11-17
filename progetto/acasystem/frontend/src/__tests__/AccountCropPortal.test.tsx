import { fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/components/account/imageCrop', async (original) => ({ ...await original<typeof import('@/components/account/imageCrop')>(),
  loadCropImage: () => new Promise(() => undefined), drawCrop: vi.fn() }));
import { AccountAppearanceEditor } from '@/components/account/AccountAppearanceEditor';
import { Surface } from '@/components/primitives';
const props = { name: 'Anna', color: '#123abc', avatar: null, cover: null, onColor: vi.fn(), onImage: vi.fn(), onRemove: vi.fn() };

describe('crop condiviso fuori dai materiali dell’editor', () => {
  it('monta il vero dialog sul body anche da un editor dentro Surface e lo rimuove con l’host', async () => {
    const view = render(<Surface className="account-test-surface"><AccountAppearanceEditor {...props} compact /></Surface>);
    fireEvent.change(screen.getByLabelText('File della foto profilo'), { target: { files: [new File(['local'], 'foto.jpg')] } });
    const dialog = await screen.findByRole('dialog', { name: 'Ritaglia la foto profilo' });
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog.closest('.aca-m')).toBeNull();
    const material = dialog.querySelector('.aca-sheet__panel')!;
    expect(material).toBeInTheDocument();
    expect(material.matches('.aca-m .aca-card')).toBe(false);
    view.unmount();
    expect(screen.queryByRole('dialog', { name: 'Ritaglia la foto profilo' })).toBeNull();
  });
  it('può preparare il markup senza document o body e senza tentare un portal', () => {
    vi.stubGlobal('document', undefined);
    try { expect(() => renderToStaticMarkup(<AccountAppearanceEditor {...props} compact />)).not.toThrow(); }
    finally { vi.unstubAllGlobals(); }
  });
});
