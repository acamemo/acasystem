import { afterEach, describe, expect, it } from 'vitest';
import { decideKey, isEditingKey, type KeyLike } from '@/casa3d/exploreKeys';

/** A host with a shadow root holding a text field: the keys of the 3D view come from there. */
function makeViewWithField() {
  const root = document.createElement('div');
  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'open' });
  const input = document.createElement('input');
  const button = document.createElement('button');
  shadow.append(input, button);
  root.append(host);
  document.body.append(root);
  return { root, host, input, button };
}

/**
 * Presses a key on `target` and asks the rules from a window listener, as the page does: the path
 * of an event exists only while it is dispatched.
 */
function press(
  target: Element,
  init: KeyboardEventInit,
  root: Element | null,
  exploring: boolean,
  overlay = false
) {
  let decision: ReturnType<typeof decideKey> | undefined;
  let seenTarget: EventTarget | null = null;
  const onWindow = (event: KeyboardEvent) => {
    seenTarget = event.target;
    decision = decideKey(event, { root, exploring, overlay });
  };
  window.addEventListener('keydown', onWindow);
  target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true, ...init }));
  window.removeEventListener('keydown', onWindow);
  return { decision, seenTarget };
}

describe('Casa 3D keyboard rules (composedPath)', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('sees through the shadow root: the window gets the host as target, the rules get the field', () => {
    const { root, host, input } = makeViewWithField();
    const { decision, seenTarget } = press(input, { key: 'Escape' }, root, true);
    expect(seenTarget).toBe(host);
    // In a text field of the view Esc is the field's: Esplora does not end, the launcher does not see it.
    expect(decision).toBe('swallow');
  });

  it('ends Esplora with Esc from anywhere else, inside the view or outside', () => {
    const { root, button } = makeViewWithField();
    expect(press(button, { key: 'Escape' }, root, true).decision).toBe('exit');
    expect(press(document.body, { key: 'Escape' }, root, true).decision).toBe('exit');
  });

  it('leaves Esc alone when Esplora is off or an overlay of the launcher is open', () => {
    const { root, button } = makeViewWithField();
    expect(press(button, { key: 'Escape' }, root, false).decision).toBe('pass');
    expect(press(button, { key: 'Escape' }, root, true, true).decision).toBe('pass');
  });

  it('keeps Delete, Backspace and undo or redo inside the page', () => {
    const { root, input, button } = makeViewWithField();
    for (const init of [
      { key: 'Delete' },
      { key: 'Backspace' },
      { key: 'z', ctrlKey: true },
      { key: 'Z', metaKey: true },
      { key: 'y', ctrlKey: true },
    ]) {
      expect(press(input, init, root, true).decision).toBe('swallow');
      expect(press(button, init, root, false).decision).toBe('swallow');
    }
  });

  it('does not touch the same keys pressed outside the page, or any other key', () => {
    const { root, button } = makeViewWithField();
    const outside = document.createElement('button');
    document.body.append(outside);
    expect(press(outside, { key: 'Delete' }, root, true).decision).toBe('pass');
    expect(press(outside, { key: 'z', ctrlKey: true }, root, true).decision).toBe('pass');
    expect(press(button, { key: 'a' }, root, true).decision).toBe('pass');
    expect(press(button, { key: 'z' }, root, true).decision).toBe('pass');
  });

  it('recognises the editing keys', () => {
    const base = { ctrlKey: false, metaKey: false };
    expect(isEditingKey({ ...base, key: 'Delete' })).toBe(true);
    expect(isEditingKey({ ...base, key: 'z', ctrlKey: true })).toBe(true);
    expect(isEditingKey({ ...base, key: 'z' })).toBe(false);
    const event: KeyLike = { ...base, key: 'Escape', composedPath: () => [] };
    expect(decideKey(event, { root: null, exploring: true, overlay: false })).toBe('exit');
  });
});
