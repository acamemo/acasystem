import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EditToolbar } from '@/components/system/edit/EditToolbar';
import { applyFooterBand } from '@/templates/app-shell/footerBand';

afterEach(cleanup);

const toolbar = (hidden: boolean) =>
  render(
    <footer className="aca-shell__footer">
      <EditToolbar
        hidden={hidden}
        canAddWidget
        onAddWidget={() => undefined}
        onPages={() => undefined}
        onDone={() => undefined}
      />
    </footer>
  );

describe('barre di modifica sempre montate (REP-20261007-018)', () => {
  it('fuori dalla modifica: nascoste, inerti e mute', () => {
    const { container } = toolbar(true);
    const bar = container.querySelector('.aca-edit-toolbar');
    expect(bar).toHaveClass('aca-edit-toolbar--hidden');
    expect(bar).toHaveAttribute('inert');
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('button', { name: 'Modifica le pagine' })).toBeNull();
  });

  it('in modifica: visibili e usabili', () => {
    const { container } = toolbar(false);
    expect(container.querySelector('.aca-edit-toolbar')).not.toHaveClass(
      'aca-edit-toolbar--hidden'
    );
    expect(screen.getByRole('button', { name: 'Modifica le pagine' })).toBeInTheDocument();
  });

  it('nascoste non tolgono spazio all’indicatore', () => {
    const { container } = toolbar(true);
    const footer = container.querySelector<HTMLElement>('.aca-shell__footer');
    if (!footer) throw new Error('footer');
    footer.dataset.bandDensity = 'short';
    applyFooterBand(footer, { key: '' });
    expect(footer.dataset.bandDensity).toBeUndefined();
    expect(footer.style.getPropertyValue('--aca-band-room')).toBe('');
  });
});

describe('nota delle pagine speciali (REP-20261013-002)', () => {
  it('la fascia non la misura: è marcata come parte che prende ciò che la pillola lascia', () => {
    render(
      <footer className="aca-shell__footer">
        <EditToolbar
          canAddWidget={false}
          onAddWidget={() => undefined}
          onPages={() => undefined}
          onDone={() => undefined}
        />
      </footer>
    );
    expect(screen.getByText('Questa pagina non contiene widget')).toHaveAttribute('data-band-flex');
  });
});

describe('scambio con la barra delle pagine (REP-20261009-004)', () => {
  it('«closing» è una classe della barra, non una condizione del pager', () => {
    const { container, rerender } = render(
      <EditToolbar canAddWidget onAddWidget={() => undefined} onPages={() => undefined} onDone={() => undefined} />
    );
    expect(container.querySelector('.aca-edit-toolbar')).not.toHaveClass('aca-edit-toolbar--closing');
    rerender(
      <EditToolbar
        closing
        canAddWidget
        onAddWidget={() => undefined}
        onPages={() => undefined}
        onDone={() => undefined}
      />
    );
    expect(container.querySelector('.aca-edit-toolbar')).toHaveClass('aca-edit-toolbar--closing');
  });

  it('la barra che arriva aspetta quella che va via: i due «Fine» non sono insieme', async () => {
    const specifier = 'node:fs';
    const fs = (await import(/* @vite-ignore */ specifier)) as {
      readFileSync: (path: string, encoding: 'utf8') => string;
    };
    const edit = fs
      .readFileSync('src/components/system/edit/edit.css', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    // The exit of a bar takes 200 ms (opacity); the one that comes waits for it, the pager saying
    // which way the swap goes with a class of the bar (G2: not a `:has()` on the main area).
    expect(edit).toMatch(
      /\.aca-edit-toolbar--hidden > \.aca-edit-toolbar__group \{[^}]*opacity var\(--aca-dur-bar-fade-out, 200ms\)/
    );
    expect(edit).toMatch(
      /\.aca-edit-toolbar--closing:not\(\.aca-edit-toolbar--hidden\) > \.aca-edit-toolbar__group \{\s*transition-delay: 180ms;/
    );
    expect(edit).toMatch(
      /\.aca-page-overview--overview:not\(\.aca-widget-actions, \.aca-page-overview--hidden\)\s*> \.aca-page-overview__group \{\s*transition-delay: calc\(var\(--aca-stagger, 40ms\) \* 4\);/
    );
  });
});
