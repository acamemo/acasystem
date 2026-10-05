import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PanelPresence, Skeleton } from '../primitives';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import ModalSuspense from '../components/ui/ModalSuspense';
import AddCardContent from '../modals/AddCardContent';
import TodoCard from '../components/cards/TodoCard';
import { getAreas, getTodoItems } from '../services/haClient';

vi.mock('../services/haClient', () => ({
  getAreas: vi.fn(),
  getEntitiesForArea: vi.fn(),
  getTodoItems: vi.fn(),
  addTodoItem: vi.fn(),
  updateTodoItem: vi.fn(),
  removeTodoItem: vi.fn(),
}));

function Panel({ onClose, name = 'Pannello' }) {
  return (
    <AccessibleModalShell open onClose={onClose}>
      {(id) => (
        <>
          <h2 id={id}>{name}</h2>
          <input aria-label={name} />
          <button onClick={onClose}>Chiudi</button>
        </>
      )}
    </AccessibleModalShell>
  );
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Panel presence', () => {
  it('retains the DOM for exit, blocks repeated Escape and restores focus after unmount', () => {
    vi.useFakeTimers();
    const close = vi.fn();
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    function App() {
      const [open, setOpen] = useState(true);
      return (
        <PanelPresence>
          {open && (
            <Panel
              onClose={() => {
                close();
                setOpen(false);
              }}
            />
          )}
        </PanelPresence>
      );
    }
    const view = render(<App />);
    expect(screen.getByRole('textbox')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(view.container.querySelector('[data-panel-state="exiting"]')).toHaveAttribute('inert');
    expect(view.container.querySelector('[role="dialog"]')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(close).toHaveBeenCalledOnce();
    act(() => vi.advanceTimersByTime(200));
    expect(view.container.querySelector('[role="dialog"]')).toBeNull();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
    opener.remove();
  });
  it('cancels the exit timer when reopened and preserves the current content', () => {
    vi.useFakeTimers();
    const close = vi.fn();
    const view = render(
      <PanelPresence>
        <Panel onClose={close} />
      </PanelPresence>
    );
    view.rerender(<PanelPresence>{false}</PanelPresence>);
    act(() => vi.advanceTimersByTime(90));
    view.rerender(
      <PanelPresence>
        <Panel onClose={close} name="Riaperto" />
      </PanelPresence>
    );
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByRole('dialog')).toHaveTextContent('Riaperto');
    expect(view.container.querySelector('[data-panel-state]')).toHaveAttribute(
      'data-panel-state',
      'open'
    );
  });
  it('finishes without waiting for motion when reduced motion is enabled', () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const view = render(
      <PanelPresence>
        <Panel onClose={() => {}} />
      </PanelPresence>
    );
    view.rerender(<PanelPresence>{false}</PanelPresence>);
    act(() => vi.advanceTimersByTime(0));
    expect(view.container.querySelector('[role="dialog"]')).toBeNull();
  });
  it('does not steal focus or unlock scrolling from a newly opened panel', () => {
    vi.useFakeTimers();
    const view = render(
      <>
        <PanelPresence>
          <Panel name="Primo" onClose={() => {}} />
        </PanelPresence>
        <PanelPresence>{false}</PanelPresence>
      </>
    );
    view.rerender(
      <>
        <PanelPresence>{false}</PanelPresence>
        <PanelPresence>
          <Panel name="Secondo" onClose={() => {}} />
        </PanelPresence>
      </>
    );
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByRole('textbox', { name: 'Secondo' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
  });
  it('finishes on the panel exit event, without responding to child animations', () => {
    vi.useFakeTimers();
    const view = render(
      <PanelPresence>
        <Panel onClose={() => {}} />
      </PanelPresence>
    );
    view.rerender(<PanelPresence>{false}</PanelPresence>);
    function end(target, animationName) {
      // jsdom lacks AnimationEvent; React may register the vendor-prefixed event.
      for (const name of ['animationend', 'webkitAnimationEnd']) {
        const event = new Event(name, { bubbles: true });
        Object.defineProperty(event, 'animationName', { value: animationName });
        fireEvent(target, event);
      }
    }
    end(view.container.querySelector('input'), 'aca-skeleton-shimmer');
    expect(view.container.querySelector('[role="dialog"]')).toBeInTheDocument();
    end(view.container.querySelector('[role="dialog"]'), 'aca-panel-out');
    expect(view.container.querySelector('[role="dialog"]')).toBeNull();
  });
  it('cleans up its fallback timer when the containing view unmounts', () => {
    vi.useFakeTimers();
    const view = render(
      <PanelPresence>
        <Panel onClose={() => {}} />
      </PanelPresence>
    );
    const initialTimers = vi.getTimerCount();
    view.rerender(<PanelPresence>{false}</PanelPresence>);
    view.unmount();
    expect(vi.getTimerCount()).toBe(initialTimers);
    expect(document.body.style.overflow).toBe('');
  });
});

describe('Fetch skeletons', () => {
  const roomProps = () => ({
    onClose: vi.fn(),
    addCardTargetPage: 'home',
    addCardType: 'room',
    setAddCardType: vi.fn(),
    searchTerm: '',
    setSearchTerm: vi.fn(),
    entities: {},
    pagesConfig: { home: [] },
    selectedEntities: [],
    setSelectedEntities: vi.fn(),
    onAddSelected: vi.fn(),
    getAddCardAvailableLabel: () => '',
    getAddCardNoneLeftLabel: () => '',
    conn: {},
    t: (key) => key,
  });
  it('uses one announced status with decorative rows, instead of a spinner', () => {
    const view = render(<Skeleton rows={3} />);
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento');
    expect(view.container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(view.container.querySelectorAll('.aca-skeleton__row')).toHaveLength(3);
    expect(view.container.querySelector('.animate-spin')).toBeNull();
  });
  it('replaces the lazy panel spinner with a structured fallback', () => {
    const Lazy = React.lazy(() => new Promise(() => {}));
    render(
      <ModalSuspense>
        <Lazy />
      </ModalSuspense>
    );
    expect(screen.getByRole('dialog', { name: 'Caricamento del pannello' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento del pannello');
  });
  it('keeps the room list footprint while pending, then shows fetched data', async () => {
    const request = deferred();
    getAreas.mockReturnValueOnce(request.promise);
    const view = render(<AddCardContent {...roomProps()} />);
    const list = view.container.querySelector('[aria-busy="true"].space-y-3');
    expect(list).toHaveClass('min-h-[216px]');
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento delle stanze');
    await act(async () => request.resolve([{ area_id: 'office', name: 'Ufficio' }]));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button', { name: /Ufficio/ })).toBeInTheDocument();
    expect(list).toHaveAttribute('aria-busy', 'false');
    expect(list).toHaveClass('min-h-[216px]');
  });
  it('reports a failed fetch, without presenting it as an empty successful list', async () => {
    const request = deferred();
    getAreas.mockReturnValueOnce(request.promise);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<AddCardContent {...roomProps()} />);
    await act(async () => request.reject(new Error('Unavailable')));
    expect(screen.getByRole('alert')).toHaveTextContent('Impossibile caricare le stanze');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByText('addCard.noAreas')).toBeNull();
  });
  it('shows the true empty result after a successful fetch', async () => {
    getAreas.mockResolvedValueOnce([]);
    render(<AddCardContent {...roomProps()} />);
    await act(async () => {});
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('addCard.noAreas')).toBeInTheDocument();
  });
  it('preserves loaded todo data during the next fetch instead of replacing it', async () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      }
    );
    const first = deferred(),
      second = deferred();
    getTodoItems.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const props = {
      cardId: 'todo.office',
      settings: { todoEntityId: 'todo.office' },
      conn: {},
      t: (key) => key,
      size: 'large',
    };
    const view = render(<TodoCard {...props} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    await act(async () =>
      first.resolve([{ uid: '1', summary: 'Controllare impianto', status: 'needs_action' }])
    );
    expect(screen.getByText('Controllare impianto')).toBeInTheDocument();
    view.rerender(<TodoCard {...props} conn={{}} />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Controllare impianto')).toBeInTheDocument();
    await act(async () =>
      second.resolve([{ uid: '1', summary: 'Controllare impianto', status: 'needs_action' }])
    );
  });
});
