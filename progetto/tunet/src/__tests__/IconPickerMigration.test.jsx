import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import IconPicker from '../components/ui/IconPicker';

vi.mock('../icons', () => ({
  getAllIconKeys: () => ['Home', 'mdi:lightbulb', 'Door'],
  getIconComponent: () =>
    function CatalogIcon() {
      return <svg aria-hidden="true" />;
    },
  preloadMdiIcons: () => Promise.resolve(),
}));
const t = (key) => key;

describe('migrated icon picker compatibility', () => {
  it('filters and returns the original persisted icon key', () => {
    const onSelect = vi.fn();
    render(<IconPicker value="Home" onSelect={onSelect} t={t} />);
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    fireEvent.change(screen.getByRole('textbox', { name: 'form.searchIcon' }), {
      target: { value: 'lightbulb' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'mdi:lightbulb', exact: true }));
    expect(onSelect).toHaveBeenCalledWith('mdi:lightbulb');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
  it('restores the default icon through the existing callback', () => {
    const onClear = vi.fn();
    render(<IconPicker value="Home" onSelect={vi.fn()} onClear={onClear} t={t} />);
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    fireEvent.click(screen.getByRole('button', { name: 'form.defaultIcon' }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
