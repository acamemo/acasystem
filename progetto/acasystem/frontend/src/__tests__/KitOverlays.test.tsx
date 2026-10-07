import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button, Field, Modal, Popover, Sheet } from '@/components/primitives';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.style.overflow = '';
});

describe('Regressioni della revisione del kit', () => {
  it('una scelta che chiude il popover restituisce il focus al trigger anche senza API nativa', () => {
    render(
      <Popover label="Scelta" trigger={(props) => <Button {...props}>Scegli</Button>}>
        {(close) => <Button onClick={close}>Opzione</Button>}
      </Popover>
    );
    const trigger = screen.getByRole('button', { name: 'Scegli' });
    fireEvent.click(trigger);
    const option = screen.getByRole('button', { name: 'Opzione' });
    option.focus();
    fireEvent.click(option);
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Opzione' })).not.toBeInTheDocument();
  });
  it('un tocco sul pozzetto del campo focalizza l’input, rispettando lo stato disabilitato', () => {
    const { rerender } = render(<Field label="Nome" icon="search" />);
    const field = document.querySelector('.aca-field') as HTMLElement;
    fireEvent.click(field);
    expect(screen.getByLabelText('Nome')).toHaveFocus();
    (document.activeElement as HTMLElement).blur();
    rerender(<Field label="Nome" disabled />);
    fireEvent.click(field);
    expect(screen.getByLabelText('Nome')).not.toHaveFocus();
  });

  it('il menu monta i figli solo quando aperto e focalizza la conferma sicura quando compare', () => {
    const mounted = vi.fn();
    function Content({ confirm, onConfirm }: { confirm: boolean; onConfirm: () => void }) {
      mounted();
      return confirm ? (
        <Button data-autofocus>Annulla</Button>
      ) : (
        <Button onClick={onConfirm}>Rimuovi</Button>
      );
    }
    function Harness() {
      const [confirm, setConfirm] = useState(false);
      return (
        <Popover
          label="Menu"
          onOpenChange={(open) => {
            if (!open) setConfirm(false);
          }}
          trigger={(props) => <Button {...props}>Apri menu</Button>}
        >
          <Content confirm={confirm} onConfirm={() => setConfirm(true)} />
        </Popover>
      );
    }
    render(<Harness />);
    expect(mounted).not.toHaveBeenCalled();
    const trigger = screen.getByRole('button', { name: 'Apri menu' });
    fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: 'Rimuovi' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi' }));
    expect(screen.getByRole('button', { name: 'Annulla' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Annulla' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: 'Rimuovi' })).toBeInTheDocument();
  });
});

function SheetHarness({ withField = false }: { withField?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Apri</button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Luce del soggiorno"
        description="Regola accensione e luminosità."
      >
        {withField ? <Field label="Nome" /> : <p>Contenuto</p>}
      </Sheet>
    </>
  );
}

describe('Sheet', () => {
  it('si apre come dialog con titolo e descrizione, blocca lo scroll e chiude con Escape', () => {
    render(<SheetHarness withField />);
    const opener = screen.getByRole('button', { name: 'Apri' });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Luce del soggiorno' });
    expect(dialog.tagName).toBe('DIALOG');
    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveAccessibleDescription('Regola accensione e luminosità.');
    expect(screen.getByLabelText('Nome')).toHaveFocus();
    expect(document.documentElement.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(dialog).not.toHaveAttribute('open');
    expect(document.documentElement.style.overflow).toBe('');
    expect(opener).toHaveFocus();
  });

  it('chiude con il pulsante e con un click sullo sfondo', () => {
    render(<SheetHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Apri' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    expect(dialog).not.toHaveAttribute('open');

    fireEvent.click(screen.getByRole('button', { name: 'Apri' }));
    expect(dialog).toHaveAttribute('open');
    fireEvent.click(screen.getByText('Contenuto'));
    expect(dialog).toHaveAttribute('open');
    fireEvent.pointerDown(dialog);
    fireEvent.click(dialog);
    expect(dialog).not.toHaveAttribute('open');
  });

  it('usa showModal quando disponibile e gestisce cancel senza chiudere da solo', () => {
    const proto = HTMLDialogElement.prototype as HTMLDialogElement & {
      showModal?: () => void;
      close?: () => void;
    };
    const original = { showModal: proto.showModal, close: proto.close };
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    const close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    });
    Object.assign(proto, { showModal, close });
    try {
      render(<SheetHarness />);
      fireEvent.click(screen.getByRole('button', { name: 'Apri' }));
      expect(showModal).toHaveBeenCalledOnce();
      const dialog = document.querySelector('dialog') as HTMLDialogElement;
      const cancel = new Event('cancel', { cancelable: true });
      act(() => {
        dialog.dispatchEvent(cancel);
      });
      expect(cancel.defaultPrevented).toBe(true);
      expect(close).toHaveBeenCalledOnce();
      expect(dialog).not.toHaveAttribute('open');

      // A queued close event of an already reopened dialog is ignored.
      fireEvent.click(screen.getByRole('button', { name: 'Apri' }));
      expect(showModal).toHaveBeenCalledTimes(2);
      act(() => {
        dialog.dispatchEvent(new Event('close'));
      });
      expect(dialog).toHaveAttribute('open');

      // The browser closed it on its own: the owner state follows, so it can reopen.
      act(() => {
        dialog.removeAttribute('open');
        dialog.dispatchEvent(new Event('close'));
      });
      fireEvent.click(screen.getByRole('button', { name: 'Apri' }));
      expect(showModal).toHaveBeenCalledTimes(3);
      expect(dialog).toHaveAttribute('open');
    } finally {
      Object.assign(proto, original);
    }
  });
});

describe('Popover', () => {
  function PopoverHarness() {
    return (
      <Popover
        label="Ordinamento"
        trigger={(props) => (
          <Button variant="control" {...props}>
            Ordina
          </Button>
        )}
      >
        {(close) => (
          <Button variant="control" onClick={close}>
            Per nome
          </Button>
        )}
      </Popover>
    );
  }

  it('senza API popover apre, chiude con Escape e riporta il focus', () => {
    render(<PopoverHarness />);
    const trigger = screen.getByRole('button', { name: 'Ordina' });
    const panelId = trigger.getAttribute('aria-controls') as string;
    const panel = document.getElementById(panelId) as HTMLElement;
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(panel).not.toBeVisible();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Ordinamento' })).toBeVisible();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Per nome' }));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('con l’API popover usa popovertarget e segue l’evento toggle', () => {
    const proto = HTMLElement.prototype as HTMLElement & Record<string, unknown>;
    const hidePopover = vi.fn();
    const stubs = { showPopover: vi.fn(), hidePopover, togglePopover: vi.fn() };
    const original = Object.fromEntries(Object.keys(stubs).map((key) => [key, proto[key]]));
    Object.assign(proto, stubs);
    try {
      render(<PopoverHarness />);
      const trigger = screen.getByRole('button', { name: 'Ordina' });
      const panel = document.getElementById(trigger.getAttribute('aria-controls') as string)!;
      expect(trigger).toHaveAttribute('popovertarget', panel.id);
      expect(panel).toHaveAttribute('popover', 'auto');
      act(() => {
        panel.dispatchEvent(Object.assign(new Event('toggle'), { newState: 'open' }));
      });
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      fireEvent.click(screen.getByRole('button', { name: 'Per nome', hidden: true }));
      expect(hidePopover).toHaveBeenCalledOnce();
      act(() => {
        panel.dispatchEvent(Object.assign(new Event('toggle'), { newState: 'closed' }));
      });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    } finally {
      for (const [key, value] of Object.entries(original)) {
        if (value === undefined) delete proto[key];
        else proto[key] = value;
      }
    }
  });
});

describe('Modal sulle primitive', () => {
  function ModalHarness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Nuova pagina</button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Nuova pagina"
          closeLabel="Chiudi"
          titleId="titolo-modale"
        >
          <input aria-label="Nome della pagina" />
        </Modal>
      </>
    );
  }

  it('mantiene focus, Escape, scroll bloccato e ritorno del focus', () => {
    render(<ModalHarness />);
    const opener = screen.getByRole('button', { name: 'Nuova pagina' });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Nuova pagina' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('Nome della pagina')).toHaveFocus();
    expect(document.documentElement.style.overflow).toBe('hidden');

    // Tab from the last control wraps to the first one (the close button in the header).
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Chiudi' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByLabelText('Nome della pagina')).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.documentElement.style.overflow).toBe('');
    expect(opener).toHaveFocus();
  });
});
