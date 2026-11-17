import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AccountImageKind } from '@/api/accountApi';
vi.mock('@/components/account/AccountImageCropper', () => ({ AccountImageCropper: ({ onSave, onClose }: { onSave: (value: string) => Promise<void>; onClose: () => void }) =>
  <div><button onClick={() => void onSave('data:image/jpeg;base64,AQID')}>Conferma ritaglio locale</button><button onClick={onClose}>Annulla ritaglio locale</button></div> }));
import { AccountAppearanceEditor } from '@/components/account/AccountAppearanceEditor';

function Editor({ compact }: { compact: boolean }) {
  const [color, setColor] = useState('#123abc');
  const [images, setImages] = useState<Partial<Record<AccountImageKind, string>>>({});
  return <AccountAppearanceEditor compact={compact} name="Anna" color={color} avatar={images.avatar ?? null} cover={images.cover ?? null}
    onColor={setColor} onImage={async (kind, dataUrl) => setImages((value) => ({ ...value, [kind]: dataUrl }))}
    onRemove={(kind) => setImages((value) => { const next = { ...value }; delete next[kind]; return next; })} />;
}
describe('editor account completo comune ai due host', () => {
  it.each([true, false])('colore libero, foto, cover e rimozione nello stesso componente (compatto=%s)', async (compact) => {
    render(<Editor compact={compact} />);
    fireEvent.change(screen.getByLabelText('Personalizza colore profilo'), { target: { value: '#fe87a2' } });
    expect(screen.getByLabelText('Personalizza colore profilo')).toHaveValue('#fe87a2');
    if (compact) {
      expect(screen.getAllByRole('img', { name: 'Anteprima profilo: A' })).toHaveLength(1);
      fireEvent.click(screen.getByRole('button', { name: 'Foto e sfondo' }));
    }
    expect(screen.getByRole('button', { name: 'Carica foto profilo' })).toHaveFocus();
    fireEvent.change(screen.getByLabelText('File della foto profilo'), { target: { files: [new File(['local'], 'foto.jpg', { type: 'image/jpeg' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Conferma ritaglio locale' }));
    await screen.findByRole('button', { name: 'Rimuovi foto profilo' });
    expect(screen.queryByLabelText('Personalizza colore profilo')).toBeNull();
    fireEvent.change(screen.getByLabelText('File dello sfondo account'), { target: { files: [new File(['local'], 'sfondo.jpg', { type: 'image/jpeg' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Conferma ritaglio locale' }));
    await screen.findByAltText('Sfondo del mio account');
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi foto profilo' }));
    expect(screen.getByLabelText('Personalizza colore profilo')).toHaveValue('#fe87a2');
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi sfondo account' }));
    expect(screen.queryByAltText('Sfondo del mio account')).toBeNull();
  });
});
