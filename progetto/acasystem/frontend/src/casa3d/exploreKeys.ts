/**
 * Keyboard rules of the Casa 3D page (ADR-0014, T4b). The 3D view keeps its controls in a shadow
 * root, so a key pressed in one of its fields reaches the window retargeted to the view element:
 * `event.target` no longer says where it came from. The rules read `composedPath()` instead, the
 * real chain of the event, to tell a key typed in a field of the view from one pressed anywhere
 * else.
 *
 * - Esc leaves Esplora, unless it is pressed in a text field of the view (that field closes
 *   itself first) or an overlay of the launcher is open (it closes it).
 * - Delete, Backspace and Ctrl/Cmd+Z, +Y pressed inside the page belong to the page: they never
 *   reach the handlers of the launcher (today none uses them; the editor of the installer will).
 */

const TEXT_FIELD = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

export type KeyDecision = 'exit' | 'swallow' | 'pass';

export interface KeyLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  composedPath: () => EventTarget[];
}

/** The element that really received the event, looking through shadow roots. */
function originOf(path: readonly EventTarget[]): Element | null {
  const first = path[0];
  return typeof Element !== 'undefined' && first instanceof Element ? first : null;
}

/** Deleting and undoing: the keys of an editor, which the launcher must not see from the page. */
export function isEditingKey(event: Pick<KeyLike, 'key' | 'ctrlKey' | 'metaKey'>): boolean {
  if (event.key === 'Delete' || event.key === 'Backspace') return true;
  const letter = event.key.toLowerCase();
  return (event.ctrlKey || event.metaKey) && (letter === 'z' || letter === 'y');
}

/** True while a dialog or a popover of the launcher is open: Esc belongs to it. */
export function overlayOpen(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.querySelector('dialog[open]')) return true;
  try {
    return Boolean(document.querySelector(':popover-open'));
  } catch {
    return false;
  }
}

/**
 * What the page does with a key. `root` is the page; `exploring` tells whether Esplora is on.
 * 'exit' leaves Esplora, 'swallow' stops the key from going further up, 'pass' leaves it alone.
 */
export function decideKey(
  event: KeyLike,
  { root, exploring, overlay }: { root: Element | null; exploring: boolean; overlay: boolean }
): KeyDecision {
  const path = event.composedPath();
  const inside = root !== null && path.includes(root);
  const origin = originOf(path);
  const inField = Boolean(origin?.matches(TEXT_FIELD));
  if (event.key === 'Escape') {
    if (inside && inField) return 'swallow';
    if (exploring && !overlay) return 'exit';
    return 'pass';
  }
  if (inside && isEditingKey(event)) return 'swallow';
  return 'pass';
}
