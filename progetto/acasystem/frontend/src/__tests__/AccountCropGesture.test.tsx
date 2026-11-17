import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/components/account/imageCrop', async (original) => ({ ...await original<typeof import('@/components/account/imageCrop')>(),
  loadCropImage: async () => ({ width: 1000, height: 600, close: vi.fn() }), drawCrop: vi.fn() }));
import { AccountImageCropper } from '@/components/account/AccountImageCropper';

function pointer(target: HTMLElement, type: string, pointerId: number, clientX: number) {
  fireEvent(target, Object.assign(new Event(type, { bubbles: true }), { pointerId, clientX, clientY: 100 }));
}
describe('crop condiviso con un solo puntatore proprietario', () => {
  it('ignora il secondo tocco senza saltare o cancellare il drag originale e mostra etichette/valori', async () => {
    render(<AccountImageCropper file={new File(['demo'], 'foto.jpg')} kind="avatar" onSave={vi.fn()} onClose={vi.fn()} />);
    const slider = screen.getByRole('slider', { name: 'Posizione orizzontale' }) as HTMLInputElement;
    await waitFor(() => expect(slider).toBeEnabled());
    const canvas = screen.getByLabelText('Anteprima del ritaglio');
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width: 200, height: 200 } as DOMRect);
    pointer(canvas, 'pointerdown', 1, 100); pointer(canvas, 'pointermove', 1, 120);
    const first = Number(slider.value);
    expect(first).toBeGreaterThan(0);
    pointer(canvas, 'pointerdown', 2, 300); pointer(canvas, 'pointermove', 2, 0); pointer(canvas, 'pointerup', 2, 0);
    expect(Number(slider.value)).toBe(first);
    pointer(canvas, 'pointermove', 1, 140);
    expect(Number(slider.value)).toBeGreaterThan(first);
    expect(screen.getByText('Zoom')).toBeVisible(); expect(screen.getByText('Orizzontale')).toBeVisible(); expect(screen.getByText('Verticale')).toBeVisible();
    expect(screen.getByText('1×')).toBeVisible();
  });
});
