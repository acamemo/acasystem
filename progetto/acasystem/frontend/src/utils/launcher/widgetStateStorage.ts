/**
 * The widget memory and the load-time migration of ADR-0019 on the browser storage.
 * The rules are in `deviceMemory.ts`; here only the keys are read and written.
 */
import type { CardSettingsMap, PagesConfig } from '@/@types/dashboard';
import {
  sanitizeCardSettingsMap,
  sanitizePagesConfig,
  sanitizeStringList,
  sanitizeStringMap,
} from '@/validators/dashboardConfig';
import { isLauncherLayout, sanitizeLauncherLayout } from '@/validators/launcher';
import {
  WIDGET_MEMORY_STORAGE_KEY,
  emptyWidgetMemory,
  normalizeWidgetState,
  sanitizeWidgetMemory,
  type WidgetMemory,
  type WidgetState,
} from './deviceMemory';
import { LAUNCHER_LAYOUT_STORAGE_KEY } from './storage';

/** Key of the retired list of hidden widgets: read once to migrate it, then emptied. */
export const LEGACY_HIDDEN_CARDS_KEY = 'tunet_hidden_cards';

const read = (key: string): unknown => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** Writes a key; false when the browser refused (quota full, storage blocked). */
const write = (key: string, value: unknown): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
    return false;
  }
};

export function loadWidgetMemory(): WidgetMemory {
  const raw = read(WIDGET_MEMORY_STORAGE_KEY);
  return raw ? sanitizeWidgetMemory(raw) : emptyWidgetMemory();
}

/** The widget state as stored in this browser (nothing is normalised or written). */
export function readStoredWidgetState(): WidgetState {
  return {
    layout: sanitizeLauncherLayout(read(LAUNCHER_LAYOUT_STORAGE_KEY)),
    pagesConfig: sanitizePagesConfig(read('tunet_pages_config')),
    cardSettings: sanitizeCardSettingsMap(read('tunet_card_settings')) ?? {},
    customNames: sanitizeStringMap(read('tunet_custom_names')) ?? {},
    customIcons: sanitizeStringMap(read('tunet_custom_icons')) ?? {},
    memory: loadWidgetMemory(),
  };
}

/**
 * Runs once when the app starts, before the settings are read into state: migrates the hidden
 * widgets (they leave the pages, their configuration goes to the memory) and tidies the
 * settings of widgets that are no longer on a page. Every key is rewritten only if it changed,
 * and a second run changes nothing. The memory is written first: if the browser refuses it,
 * nothing else is touched (the settings the tidy-up would drop are still the only copy) and the
 * list of hidden widgets stays, so the next start tries again. That list is emptied last.
 */
export function migrateStoredWidgetState(now = Date.now()): void {
  const hidden = sanitizeStringList(read(LEGACY_HIDDEN_CARDS_KEY)) ?? [];
  const before = readStoredWidgetState();
  const after = normalizeWidgetState(before, hidden, now, { sweep: true });
  if (after.memory !== before.memory && !write(WIDGET_MEMORY_STORAGE_KEY, after.memory)) return;
  // Also a stored layout that reading cleaned (an empty stack taken out, its cells freed) is
  // written back, so the next start finds it clean; a second run changes nothing.
  const storedLayout = read(LAUNCHER_LAYOUT_STORAGE_KEY);
  if (
    after.layout &&
    (after.layout !== before.layout || (storedLayout !== null && !isLauncherLayout(storedLayout)))
  ) {
    write(LAUNCHER_LAYOUT_STORAGE_KEY, after.layout);
  }
  if (after.pagesConfig !== before.pagesConfig && after.pagesConfig) {
    write('tunet_pages_config', after.pagesConfig satisfies PagesConfig);
  }
  if (after.cardSettings !== before.cardSettings) {
    write('tunet_card_settings', after.cardSettings satisfies CardSettingsMap);
  }
  if (hidden.length > 0) write(LEGACY_HIDDEN_CARDS_KEY, []);
}
