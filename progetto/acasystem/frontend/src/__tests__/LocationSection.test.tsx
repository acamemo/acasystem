import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocationSection } from '@/pages/system/sections/LocationSection';

afterEach(cleanup);

describe('Sistema → Posizione (REP-20261007-025)', () => {
  it('mostra la posizione di casa e salva quella scritta nei campi', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<LocationSection home={{ lat: 40.85, lon: 14.27 }} canEdit onSave={onSave} />);
    const lat = screen.getByLabelText('Latitudine');
    expect(lat).toHaveValue('40.85');
    const save = screen.getByRole('button', { name: 'Salva la posizione' });
    expect(save).toBeDisabled();
    // A half-typed value stays in the field; the point follows once it parses.
    fireEvent.change(lat, { target: { value: '40.' } });
    expect(lat).toHaveValue('40.');
    fireEvent.change(lat, { target: { value: '40,9' } });
    expect(save).toBeEnabled();
    await act(async () => {
      fireEvent.click(save);
    });
    expect(onSave).toHaveBeenCalledWith({ lat: 40.9, lon: 14.27 });
    expect(screen.getByRole('status')).toHaveTextContent('Posizione salvata');
  });

  it('segnala coordinate non valide e gli errori di Home Assistant', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('unauthorized'));
    render(<LocationSection home={{ lat: 40.85, lon: 14.27 }} canEdit onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('Latitudine'), { target: { value: '95' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salva la posizione' }));
    });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Coordinate non valide');
    fireEvent.change(screen.getByLabelText('Latitudine'), { target: { value: '41' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salva la posizione' }));
    });
    expect(screen.getByRole('status')).toHaveTextContent('non ha salvato la posizione');
  });

  it('senza permessi di amministratore non permette di cambiarla', () => {
    render(<LocationSection home={null} canEdit={false} onSave={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Salva la posizione' })).toBeNull();
    expect(screen.getByText(/Solo un amministratore/)).toBeInTheDocument();
    expect(screen.getByLabelText('Latitudine')).toBeDisabled();
  });
});
