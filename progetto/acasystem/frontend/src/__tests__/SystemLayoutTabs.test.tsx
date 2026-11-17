import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SystemLayout } from '@/pages/system/SystemLayout';

const sections = Array.from({ length: 11 }, (_, index) => ({
  id: `section-${index}`,
  title: `Sezione ${index + 1}`,
  content: (
    <label>
      Campo {index + 1}
      <input defaultValue={`Valore ${index + 1}`} />
    </label>
  ),
}));

describe('Sistema a sezioni', () => {
  it('mantiene montati tutti gli undici pannelli, uno solo visibile e accessibile', () => {
    render(<SystemLayout sections={sections} onClose={vi.fn()} />);
    const tabs = within(screen.getByRole('tablist', { name: 'Sezioni del sistema' })).getAllByRole(
      'tab'
    );
    expect(tabs).toHaveLength(11);
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(screen.getAllByRole('tabpanel', { hidden: true })).toHaveLength(11);
    expect(screen.getByRole('tabpanel', { name: 'Sezione 1' })).toHaveAttribute(
      'id',
      tabs[0]!.getAttribute('aria-controls')
    );
    const input = screen.getByRole('textbox', { name: 'Campo 1' });
    fireEvent.change(input, { target: { value: 'Bozza intatta' } });
    fireEvent.click(tabs[10]!);
    expect(input).toBeInTheDocument();
    expect(input).not.toBeVisible();
    expect(screen.getByRole('tabpanel', { name: 'Sezione 11' })).toBeVisible();
    fireEvent.click(tabs[0]!);
    expect(screen.getByRole('textbox', { name: 'Campo 1' })).toBe(input);
    expect(input).toHaveValue('Bozza intatta');
  });

  it('naviga con frecce, Home e End mantenendo selezione e focus sul tab', () => {
    render(<SystemLayout sections={sections} onClose={vi.fn()} />);
    const tabs = screen.getAllByRole('tab');
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowRight' });
    expect(tabs[1]).toHaveFocus();
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[1]!, { key: 'End' });
    expect(tabs[10]).toHaveFocus();
    fireEvent.keyDown(tabs[10]!, { key: 'ArrowDown' });
    expect(tabs[0]).toHaveFocus();
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowLeft' });
    expect(tabs[10]).toHaveFocus();
    fireEvent.keyDown(tabs[10]!, { key: 'Home' });
    expect(tabs[0]).toHaveFocus();
    expect(tabs.filter((tab) => tab.tabIndex === 0)).toHaveLength(1);
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  });

  it('conserva ritorno, account e informativa AI senza una didascalia nella testata', () => {
    const close = vi.fn();
    const account = vi.fn();
    render(
      <SystemLayout
        sections={sections}
        onClose={close}
        accountAction={<button onClick={account}>Il mio account</button>}
      />
    );
    expect(screen.getByRole('heading', { name: 'Sistema' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Il mio account' }));
    expect(account).toHaveBeenCalledOnce();
    fireEvent.click(
      screen.getByRole('button', { name: 'Informativa sull’uso dell’AI nello sviluppo' })
    );
    expect(
      screen.getByRole('dialog', { name: 'Uso dell’AI nello sviluppo di Acasystem' })
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Torna al launcher' }));
    expect(close).toHaveBeenCalledOnce();
  });

  it('un nuovo pannello riparte dall’inizio dello scroller, senza azzerare lo scroll al ritorno da Account', () => {
    const page = (hidden = false) => <div data-testid="scene-scroll" style={{ overflowY: 'auto' }}><SystemLayout sections={sections} onClose={vi.fn()} hidden={hidden} /></div>;
    const view = render(page());
    const scroller = screen.getByTestId('scene-scroll');
    const scroll = vi.fn(); scroller.scrollTo = scroll; scroller.scrollTop = 500;
    fireEvent.click(screen.getByRole('tab', { name: 'Sezione 2' }));
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ top: 0, behavior: 'instant' });
    scroll.mockClear(); scroller.scrollTop = 120;
    view.rerender(page(true)); view.rerender(page());
    expect(scroll).not.toHaveBeenCalled();
    expect(screen.getByRole('tab', { name: 'Sezione 2' })).toHaveAttribute('aria-selected', 'true');
    expect(scroller.scrollTop).toBe(120);
  });
});
