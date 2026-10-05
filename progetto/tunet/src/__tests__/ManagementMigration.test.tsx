import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AddPageModal from '../modals/AddPageModal';
import EditPageModal from '../modals/EditPageModal';
import { it as italian } from '../i18n';
import type { AddPageProps, EditPageProps } from '../types/management';

vi.mock('../contexts', () => ({ usePages: () => ({ pagesConfig: { pages: ['home'] } }) }));
const t = (key: string) => italian[key as keyof typeof italian] || key;
function addProps(): AddPageProps {
  return {
    isOpen: true,
    onClose: vi.fn(),
    t,
    newPageLabel: '',
    setNewPageLabel: vi.fn(),
    newPageIcon: null,
    setNewPageIcon: vi.fn(),
    onCreate: vi.fn(),
    onCreateMedia: vi.fn(),
    onCreateSonos: vi.fn(),
    onCreateLights: vi.fn(),
    onCreateBattery: vi.fn(),
    onCreateRoomExplorer: vi.fn(),
  };
}
function editProps(): EditPageProps {
  return {
    isOpen: true,
    onClose: vi.fn(),
    t,
    editingPage: 'home',
    pageSettings: {},
    savePageSetting: vi.fn(),
    pageDefaults: { home: { label: 'Principale' } },
    onDelete: vi.fn(),
  };
}

describe('Italian management interfaces', () => {
  it('keeps the standard name and create callbacks, with a labelled field', () => {
    const props = addProps();
    render(<AddPageModal {...props} />);
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ufficio' } });
    expect(props.setNewPageLabel).toHaveBeenCalledWith('Ufficio');
    fireEvent.click(
      screen
        .getAllByRole('button', { name: 'Crea pagina' })
        .find((button) => !button.hasAttribute('aria-pressed'))!
    );
    expect(props.onCreate).toHaveBeenCalledOnce();
  });
  it.each([
    ['Multimedia', 'onCreateMedia'],
    ['Sonos', 'onCreateSonos'],
    ['Luci', 'onCreateLights'],
    ['Batterie', 'onCreateBattery'],
    ['Stanze', 'onCreateRoomExplorer'],
  ] as const)('selects %s and calls its original create action', (label, callback) => {
    const props = addProps();
    render(<AddPageModal {...props} />);
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(
      screen
        .getAllByRole('button', {
          name: label === 'Sonos' ? 'Crea pagina Sonos' : 'Crea pagina',
        })
        .find((button) => !button.hasAttribute('aria-pressed'))!
    );
    expect(props[callback]).toHaveBeenCalledOnce();
    expect(props.onCreate).not.toHaveBeenCalled();
  });
  it('preserves Escape close and restores the opener focus', () => {
    const props = addProps();
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const view = render(<AddPageModal {...props} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledOnce();
    view.unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });
  it('retains page switches and grid persistence without offering HOME deletion', () => {
    const props = editProps();
    render(<EditPageModal {...props} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Nascondi pagina' }));
    expect(props.savePageSetting).toHaveBeenCalledWith('home', 'hidden', true);
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(props.savePageSetting).toHaveBeenCalledWith('home', 'gridColumns', 3);
    expect(screen.queryByRole('button', { name: 'Elimina pagina' })).not.toBeInTheDocument();
  });
  it('keeps the non-HOME delete callback and selected switches', () => {
    const props = editProps();
    props.editingPage = 'office';
    props.pageSettings = { office: { hidden: true } };
    render(<EditPageModal {...props} />);
    expect(screen.getByRole('switch', { name: 'Nascondi pagina' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Elimina pagina' }));
    expect(props.onDelete).toHaveBeenCalledWith('office');
  });
});
