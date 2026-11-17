import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomeScreenSection } from '@/pages/system/sections/HomeScreenSection';

describe('ingresso diretto alla modifica condivisa', () => {
  it('apre Modifica con un solo comando anche se la configurazione storica era bloccata', () => {
    const edit = vi.fn(), unlock = vi.fn();
    render(<HomeScreenSection locked liveEditing density="normal" onLocked={unlock}
      onDensity={vi.fn()} onEditPages={edit} />);
    fireEvent.click(screen.getByRole('button', { name: /^Modifica$/ }));
    expect(edit).toHaveBeenCalledOnce();
    expect(unlock).not.toHaveBeenCalled();
    expect(screen.queryByRole('switch', { name: 'Blocca la disposizione' })).toBeNull();
  });
});
