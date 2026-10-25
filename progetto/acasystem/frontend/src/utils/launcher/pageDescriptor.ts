/**
 * What the launcher needs to know about a page to show it (REP-20261009-004, ADR-0012): pure
 * data from a pager entry, with no React and no Home Assistant. The cover is a page like the
 * others whose data differ: its columns start at three and its top bar never shows. The rules
 * of the page editor (what can move, be renamed or deleted) stay with the editor.
 */
import type { LauncherPage, PageKind } from '@/@types/launcher';
import { COLUMNS_RANGE, COVER_COLUMNS } from './deviceClass';
import type { PagerEntry } from './pager';

/** How a page fills its area: a grid of widgets, or one full special page. */
export type PageSurface = 'grid' | 'special';

export const surfaceOf = (kind: PageKind): PageSurface =>
  kind === 'cover' || kind === 'widgets' ? 'grid' : 'special';

interface PageFields {
  /** The key of the pager entry: the id of the page, `cover` for the cover. */
  key: string;
  kind: PageKind;
  label: string;
  /** The first page of its family (continuations share its columns and grid). */
  familyRootId: string;
  /** Least columns the page can have, as stored (the landscape count). */
  columns: { minSaved: number };
  /** Marked «Nascosta» in the overview: a hidden page, the cover that is off. */
  hidden: boolean;
  /** The page the launcher opens on. */
  main: boolean;
  /** `never`: the top bar does not show on this page, not even in edit mode (the cover). */
  topBar: 'auto' | 'never';
  /**
   * `edit-only`: outside edit mode the free cells of a grid are only wells without «+» (the
   * cover, REP-20261007-030); `always`: wells with «+» on every page (the pages of widgets again
   * since the request of 2026-10-21, which reverses D-8 of ADR-0016).
   */
  addCells: 'always' | 'edit-only';
}

/**
 * `acceptsWidgets`: a page of widgets or the cover, which take widgets; the others do not. The
 * page is always there for those; it is null only for a cover whose grids are not known yet.
 */
export type PageDescriptor = PageFields &
  (
    | { acceptsWidgets: true; page: LauncherPage }
    | { acceptsWidgets: false; page: LauncherPage | null }
  );

/** The descriptor of one pager entry; `mainPageId` is the page the launcher opens on. */
export function describePage(entry: PagerEntry, mainPageId: string | null): PageDescriptor {
  if (entry.type === 'cover') {
    const fields: PageFields = {
      key: entry.key,
      kind: 'cover',
      label: entry.label,
      familyRootId: entry.key,
      columns: { minSaved: COVER_COLUMNS },
      hidden: Boolean(entry.hidden),
      main: false,
      topBar: 'never',
      addCells: 'edit-only',
    };
    return entry.page
      ? { ...fields, page: entry.page, acceptsWidgets: true }
      : { ...fields, page: null, acceptsWidgets: false };
  }
  const { page } = entry;
  const fields: PageFields = {
    key: entry.key,
    kind: page.kind,
    label: entry.label,
    familyRootId: page.continuationOf ?? page.id,
    columns: { minSaved: COLUMNS_RANGE.min },
    hidden: Boolean(page.hidden),
    main: entry.key === mainPageId,
    topBar: 'auto',
    addCells: 'always',
  };
  return surfaceOf(page.kind) === 'grid'
    ? { ...fields, page, acceptsWidgets: true }
    : { ...fields, page, acceptsWidgets: false };
}

/** True when two descriptors tell the same thing about a page (the page itself by identity). */
const sameDescriptor = (a: PageDescriptor, b: PageDescriptor): boolean =>
  a.page === b.page &&
  a.key === b.key &&
  a.kind === b.kind &&
  a.label === b.label &&
  a.familyRootId === b.familyRootId &&
  a.columns.minSaved === b.columns.minSaved &&
  a.hidden === b.hidden &&
  a.main === b.main &&
  a.topBar === b.topBar &&
  a.addCells === b.addCells &&
  a.acceptsWidgets === b.acceptsWidgets;

/**
 * The descriptors of the entries. A page whose descriptor says the same as in `previous` keeps
 * that object, so a card added to the list (the cover that is off, in the overview) leaves the
 * other pages as they were (REP-20261012-003).
 */
export const describePages = (
  entries: readonly PagerEntry[],
  mainPageId: string | null,
  previous: readonly PageDescriptor[] = []
): PageDescriptor[] =>
  entries.map((entry) => {
    const next = describePage(entry, mainPageId);
    const before = previous.find((descriptor) => descriptor.key === entry.key);
    return before && sameDescriptor(before, next) ? before : next;
  });
