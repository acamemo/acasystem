import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageOverviewBar, EMPTY_NAME } from '@/components/system/edit/PageOverviewBar';
import { WidgetActionBar } from '@/components/system/edit/WidgetActionBar';

// The name of the page in the bar of the overview (REP-20261009-005, N2 and N3).

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const REST_WIDTH = 200;
const FIELD_WIDTH = 448;

function renderBar(extra: Partial<Parameters<typeof PageOverviewBar>[0]> = {}) {
  const handlers = {
    onRename: vi.fn(),
    onRenameCancel: vi.fn(),
    onEmptyName: vi.fn(),
    onNameError: vi.fn(),
    onEditingChange: vi.fn(),
    onDone: vi.fn(),
    onSetHome: vi.fn(),
    onDelete: vi.fn(),
  };
  render(
    <PageOverviewBar
      hidden={false}
      pageName="Casa"
      widgetCount={0}
      deleteBlocked={null}
      isHome={false}
      homeBlocked={null}
      isHidden={false}
      hideBlocked={null}
      onToggleHidden={() => undefined}
      onAdd={() => undefined}
      onBlocked={() => undefined}
      {...handlers}
      {...extra}
    />
  );
  return handlers;
}

const bar = () => screen.getByRole('toolbar', { name: 'Pagine' });
const group = () => bar().querySelector('.aca-page-overview__group') as HTMLElement;
const tools = () => bar().querySelector('.aca-page-overview__tools') as HTMLElement;
const nameButton = () => screen.getByRole('button', { name: 'Rinomina Casa' });
const field = () => screen.getByRole('textbox', { name: 'Nome della pagina' });
const openField = () => fireEvent.click(nameButton());

describe('the name at rest', () => {
  it('is plain text: no pencil, and its accessible name stays', () => {
    renderBar();
    const name = nameButton();
    expect(name).toHaveTextContent('Casa');
    expect(name.querySelector('svg, .aca-icon, .aca-page-overview__pencil')).toBeNull();
    expect(name).toHaveAttribute('data-page-rename');
  });

  it('sits between two thin vertical lines that are not content', async () => {
    const specifier = 'node:fs';
    const fs = (await import(/* @vite-ignore */ specifier)) as {
      readFileSync: (path: string, encoding: 'utf8') => string;
    };
    const edit = fs
      .readFileSync('src/components/system/edit/edit.css', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const lines =
      edit.match(
        /\.aca-page-overview__name::before,\s*\.aca-page-overview__name::after \{([^}]*)\}/
      )?.[1] ?? '';
    expect(lines).toMatch(/content: '';/);
    expect(lines).toMatch(/width: 1px;/);
    expect(lines).toMatch(/height: 1\.25rem;/);
    expect(lines).toMatch(/background: var\(--aca-ink-muted\);/);
    expect(edit).not.toMatch(/aca-page-overview__pencil/);
    // The name of the cover is not a button but has the same box (REP-20261012-002).
    expect(edit).toMatch(
      /\.aca-page-overview__name\.is-static \{[^}]*height: var\(--aca-control-height\);/
    );
  });

  it('on the cover is the same lines and text, but no button and no field (REP-20261012-002)', () => {
    renderBar({ pageName: 'Copertina', onRename: undefined });
    const name = bar().querySelector('.aca-page-overview__name') as HTMLElement;
    expect(name).toHaveTextContent('Copertina');
    expect(name.tagName).toBe('SPAN');
    expect(name).toHaveClass('is-static');
    expect(screen.queryByRole('button', { name: /Rinomina/ })).toBeNull();
    fireEvent.click(name);
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});

describe('renaming in the bar', () => {
  beforeEach(() => {
    // No layout in jsdom: the widths are given by the state of the bar.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      const width = this.classList.contains('aca-page-overview__group')
        ? this.classList.contains('is-renaming') && !this.classList.contains('is-closing')
          ? FIELD_WIDTH
          : REST_WIDTH
        : 0;
      return { width, height: 0, top: 0, left: 0, right: width, bottom: 0, x: 0, y: 0 } as DOMRect;
    });
  });

  it('opening: the tools and «Fine» are out of reach, the field has the name selected', () => {
    const { onEditingChange } = renderBar();
    expect(tools()).not.toHaveAttribute('inert');
    openField();
    expect(group()).toHaveClass('is-renaming');
    // Hidden from the screen reader and inert: every icon and «Fine» (the house included).
    expect(tools()).toHaveAttribute('aria-hidden', 'true');
    expect(tools()).toHaveAttribute('inert');
    expect(within(bar()).queryAllByRole('button')).toEqual([]);
    expect(field()).toHaveFocus();
    expect(field()).toHaveValue('Casa');
    expect((field() as HTMLInputElement).selectionStart).toBe(0);
    expect((field() as HTMLInputElement).selectionEnd).toBe(4);
    expect(field()).toHaveAttribute('enterkeyhint', 'done');
    // The field is a sibling of the tools, in the bar itself.
    expect(field().closest('.aca-page-overview__field')?.parentElement).toBe(group());
    expect(onEditingChange).toHaveBeenLastCalledWith(true);
  });

  it('Invio saves the trimmed name and the tools and the focus come back', () => {
    const { onRename, onEditingChange } = renderBar();
    openField();
    fireEvent.change(field(), { target: { value: '  Cucina ' } });
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(onRename).toHaveBeenCalledExactlyOnceWith('Cucina');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(group()).not.toHaveClass('is-renaming');
    expect(tools()).not.toHaveAttribute('inert');
    expect(tools()).not.toHaveAttribute('aria-hidden');
    expect(nameButton()).toHaveFocus();
    expect(onEditingChange).toHaveBeenLastCalledWith(false);
  });

  it('the submit of the form (the «Fatto» of the Android keyboard) saves as Invio does', () => {
    const { onRename } = renderBar();
    openField();
    fireEvent.change(field(), { target: { value: 'Studio' } });
    // The keydown of some keyboards says Unidentified: only the form is told.
    fireEvent.keyDown(field(), { key: 'Unidentified' });
    expect(onRename).not.toHaveBeenCalled();
    fireEvent.submit(field().closest('form') as HTMLFormElement);
    expect(onRename).toHaveBeenCalledExactlyOnceWith('Studio');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(nameButton()).toHaveFocus();
  });

  it('Invio on an empty name is refused: the error, the field open, nothing saved', () => {
    const { onRename, onNameError } = renderBar();
    openField();
    fireEvent.change(field(), { target: { value: '   ' } });
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(onNameError).toHaveBeenCalledWith(EMPTY_NAME);
    expect(field()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(EMPTY_NAME)).toBeInTheDocument();
    // The same through the form.
    fireEvent.submit(field().closest('form') as HTMLFormElement);
    expect(onNameError).toHaveBeenCalledTimes(2);
    expect(onRename).not.toHaveBeenCalled();
    expect(tools()).toHaveAttribute('inert');
  });

  it('leaving the field saves a valid name; an empty one keeps the old name and says why', () => {
    const { onRename, onEmptyName } = renderBar();
    openField();
    fireEvent.change(field(), { target: { value: 'Sala' } });
    fireEvent.blur(field());
    expect(onRename).toHaveBeenCalledExactlyOnceWith('Sala');
    expect(screen.queryByRole('textbox')).toBeNull();

    openField();
    fireEvent.change(field(), { target: { value: '' } });
    fireEvent.blur(field());
    expect(onEmptyName).toHaveBeenCalledExactlyOnceWith(EMPTY_NAME);
    expect(onRename).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('Esc keeps the name and the focus goes back to it', () => {
    const { onRename, onRenameCancel } = renderBar();
    openField();
    fireEvent.change(field(), { target: { value: 'Altro' } });
    const event = fireEvent.keyDown(field(), { key: 'Escape' });
    // Held: the Esc of the launcher would close the overview.
    expect(event).toBe(false);
    expect(onRenameCancel).toHaveBeenCalledTimes(1);
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(nameButton()).toHaveFocus();
  });

  it('Tab leaves the field as Invio does: the name is saved and the focus is on it', () => {
    const { onRename } = renderBar();
    openField();
    fireEvent.change(field(), { target: { value: 'Sala' } });
    const event = fireEvent.keyDown(field(), { key: 'Tab', shiftKey: true });
    // Held: the tools are inert meanwhile, the focus would fall to the body or the last card.
    expect(event).toBe(false);
    expect(onRename).toHaveBeenCalledExactlyOnceWith('Sala');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('button', { name: 'Rinomina Casa' })).toHaveFocus();
  });

  it('Tab on an empty name keeps the old one and says why', () => {
    const { onRename, onEmptyName } = renderBar();
    openField();
    fireEvent.change(field(), { target: { value: ' ' } });
    fireEvent.keyDown(field(), { key: 'Tab' });
    expect(onEmptyName).toHaveBeenCalledExactlyOnceWith(EMPTY_NAME);
    expect(onRename).not.toHaveBeenCalled();
    expect(nameButton()).toHaveFocus();
  });

  it('the focus does not come back to the name if it went elsewhere while the bar closed', () => {
    const finish: Array<() => void> = [];
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      writable: true,
      value: vi.fn(() => {
        const animation = { cancel: vi.fn(), onfinish: null as null | (() => void) };
        finish.push(() => animation.onfinish?.());
        return animation;
      }),
    });
    try {
      renderBar();
      const other = document.createElement('button');
      other.textContent = 'Altro';
      document.body.appendChild(other);
      openField();
      fireEvent.keyDown(field(), { key: 'Enter' });
      // Closing: the user moves the focus on another control before the bar has settled.
      other.focus();
      act(() => finish[1]());
      expect(screen.queryByRole('textbox')).toBeNull();
      expect(other).toHaveFocus();
      other.remove();
    } finally {
      delete (HTMLElement.prototype as { animate?: unknown }).animate;
    }
  });

  it('with a layout the bar glides to the field and back, and the tools wait for it', () => {
    const finish: Array<() => void> = [];
    const animate = vi.fn(() => {
      const animation = { cancel: vi.fn(), onfinish: null as null | (() => void) };
      finish.push(() => animation.onfinish?.());
      return animation;
    });
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      writable: true,
      value: animate,
    });
    try {
      const { onRename } = renderBar();
      openField();
      expect(animate).toHaveBeenCalledTimes(1);
      expect(animate).toHaveBeenLastCalledWith(
        [{ width: `${REST_WIDTH}px` }, { width: `${FIELD_WIDTH}px` }],
        expect.objectContaining({ duration: 240 })
      );
      expect(group()).toHaveClass('is-renaming');
      expect(group()).not.toHaveClass('is-closing');

      fireEvent.change(field(), { target: { value: 'Cucina' } });
      fireEvent.keyDown(field(), { key: 'Enter' });
      expect(onRename).toHaveBeenCalledExactlyOnceWith('Cucina');
      expect(animate).toHaveBeenCalledTimes(2);
      expect(animate).toHaveBeenLastCalledWith(
        [{ width: `${FIELD_WIDTH}px` }, { width: `${REST_WIDTH}px` }],
        expect.objectContaining({ duration: 240 })
      );
      // Closing: the field leaves (still there, read-only and out of the way), the tools wait.
      expect(group()).toHaveClass('is-closing');
      expect(field()).toHaveAttribute('readonly');
      expect(tools()).toHaveAttribute('inert');
      expect(within(bar()).queryAllByRole('button')).toEqual([]);

      // The bar has settled: the field is gone, the tools come back, the focus on the name.
      act(() => finish[1]());
      expect(screen.queryByRole('textbox')).toBeNull();
      expect(group()).not.toHaveClass('is-renaming');
      expect(tools()).not.toHaveAttribute('inert');
      expect(nameButton()).toHaveFocus();
    } finally {
      delete (HTMLElement.prototype as { animate?: unknown }).animate;
    }
  });

  it('closing keeps its fade also when the bar rests as wide as the field', () => {
    // A phone: the bar at rest is as wide as the field, so the glide is a no-op in width.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      const width = this.classList.contains('aca-page-overview__group') ? REST_WIDTH : 0;
      return { width, height: 0, top: 0, left: 0, right: width, bottom: 0, x: 0, y: 0 } as DOMRect;
    });
    const finish: Array<() => void> = [];
    const animate = vi.fn(() => {
      const animation = { cancel: vi.fn(), onfinish: null as null | (() => void) };
      finish.push(() => animation.onfinish?.());
      return animation;
    });
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      writable: true,
      value: animate,
    });
    try {
      renderBar();
      openField();
      fireEvent.keyDown(field(), { key: 'Enter' });
      expect(animate).toHaveBeenCalledTimes(2);
      // Still closing: the field is there (read-only) until the glide ends, then it is gone.
      expect(group()).toHaveClass('is-closing');
      expect(field()).toHaveAttribute('readonly');
      act(() => finish[1]());
      expect(screen.queryByRole('textbox')).toBeNull();
      expect(tools()).not.toHaveAttribute('inert');
    } finally {
      delete (HTMLElement.prototype as { animate?: unknown }).animate;
    }
  });

  it('with reduced motion nothing glides: the change is immediate', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }))
    );
    const animate = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      writable: true,
      value: animate,
    });
    try {
      renderBar();
      openField();
      fireEvent.keyDown(field(), { key: 'Escape' });
      expect(animate).not.toHaveBeenCalled();
      expect(screen.queryByRole('textbox')).toBeNull();
      expect(tools()).not.toHaveAttribute('inert');
    } finally {
      delete (HTMLElement.prototype as { animate?: unknown }).animate;
    }
  });

  it('the fade, the width and the field are in the CSS: one time, no motion when reduced', async () => {
    const specifier = 'node:fs';
    const fs = (await import(/* @vite-ignore */ specifier)) as {
      readFileSync: (path: string, encoding: 'utf8') => string;
    };
    const edit = fs
      .readFileSync('src/components/system/edit/edit.css', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const rule = (selector: string) => {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\>]/g, '\\$&');
      return new RegExp(`(?:^|\\n|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(edit)?.[1] ?? '';
    };
    // One duration and one curve, from the tokens of the kit with literal fallbacks.
    const page = rule('.aca-page-overview:not(.aca-widget-actions) > .aca-page-overview__group');
    expect(page).toMatch(/--aca-rename-ms: 240ms;/);
    expect(page).toMatch(
      /--aca-rename-ease: var\(--aca-ease-out, cubic-bezier\(0\.23, 1, 0\.32, 1\)\);/
    );
    // The tools fade and shrink a little, out of reach; the bar takes the band, 28 rem at most.
    expect(rule('.aca-page-overview__group.is-renaming > .aca-page-overview__tools')).toMatch(
      /opacity: 0;\s*scale: 0\.92;\s*pointer-events: none;/
    );
    expect(rule('.aca-page-overview__group.is-renaming')).toMatch(/width: min\(100cqw, 28rem\);/);
    expect(rule('.aca-page-overview__group.is-closing')).toMatch(/width: auto;/);
    // Closing, the tools come back in the second half of the glide (still inert until it ends).
    expect(rule('.aca-page-overview__group.is-closing > .aca-page-overview__tools')).toMatch(
      /opacity: 1;\s*scale: 1;\s*transition-delay: calc\(var\(--aca-rename-ms\) \/ 2\);/
    );
    // A long name stays in the bar: the field covers it and gives way inside it.
    const covering = rule('.aca-page-overview__field');
    expect(covering).toMatch(/position: absolute;/);
    expect(covering).toMatch(/min-width: 0;/);
    expect(covering).toMatch(/grid-template-columns: minmax\(0, 1fr\);/);
    // Reduced motion: no transition on the tools nor the field.
    expect(edit).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[^@]*\.aca-page-overview__tools,\s*\.aca-page-overview__field \{\s*transition: none;/
    );
  });
});

describe('the bar of the widget', () => {
  it('is as before: no tools row, no renaming', () => {
    render(
      <WidgetActionBar
        hidden={false}
        name="Luce"
        changed={false}
        onDone={() => undefined}
        onUndo={() => undefined}
        onRemove={() => undefined}
      />
    );
    const widgetBar = document.querySelector('.aca-widget-actions') as HTMLElement;
    expect(widgetBar.querySelector('.aca-page-overview__tools')).toBeNull();
    expect(widgetBar.querySelector('.aca-page-overview__field')).toBeNull();
    expect(widgetBar.querySelector('.aca-page-overview__group')).not.toHaveClass('is-renaming');
  });

  it('shares the classes of the bar but none of those the rename styles hook onto', async () => {
    render(
      <WidgetActionBar
        hidden={false}
        name="Luce"
        changed={false}
        onDone={() => undefined}
        onUndo={() => undefined}
        onRemove={() => undefined}
      />
    );
    const widgetBar = document.querySelector('.aca-widget-actions') as HTMLElement;
    const used = new Set(
      [widgetBar, ...widgetBar.querySelectorAll('*')].flatMap((node) => [...node.classList])
    );
    for (const name of [
      'aca-page-overview__name',
      'aca-page-overview__label',
      'aca-page-overview__tools',
      'aca-page-overview__field',
      'is-renaming',
      'is-closing',
    ]) {
      expect(used.has(name)).toBe(false);
    }
    // The rename variables are set only on the bar of the pages.
    const specifier = 'node:fs';
    const fs = (await import(/* @vite-ignore */ specifier)) as {
      readFileSync: (path: string, encoding: 'utf8') => string;
    };
    const edit = fs
      .readFileSync('src/components/system/edit/edit.css', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const owners = [...edit.matchAll(/([^{}]*)\{[^{}]*--aca-rename-ms:/g)].map((match) =>
      match[1].trim()
    );
    expect(owners).toEqual([
      '.aca-page-overview:not(.aca-widget-actions) > .aca-page-overview__group',
    ]);
  });
});
