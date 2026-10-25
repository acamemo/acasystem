import { memo } from 'react';
import { surfaceOf, type PageDescriptor } from '@/utils/launcher/pageDescriptor';
import { PageKindHost } from './PageKindHost';
import { WidgetGrid } from './WidgetGrid';

/**
 * The one place that mounts the content of a page of the launcher (REP-20261009-004,
 * ADR-0012): the cover, the pages of widgets and the special pages come through here, and what
 * tells them apart is the data of the page (PageDescriptor), not a branch of the screen. A
 * grid is WidgetGrid; a special page is PageKindHost. The wrapper takes no box of its own: it
 * only carries `data-page-kind` and `data-top-bar` for styles and tests.
 * It is not a primitive: the grid reads the contexts of the launcher (ADR-0004, ADR-0008).
 * Memoized: the pointer frames of a drag re-render the launcher, not the pages (the grid reads
 * the drag from its own context).
 */
export const PageShell = memo(function PageShell({
  descriptor,
  editMode,
}: {
  descriptor: PageDescriptor;
  editMode: boolean;
}) {
  const { page } = descriptor;
  return (
    <div
      className="aca-page-shell"
      data-page-kind={descriptor.kind}
      data-top-bar={descriptor.topBar}
    >
      {page &&
        (surfaceOf(descriptor.kind) === 'grid' ? (
          <WidgetGrid
            page={page}
            cells={editMode || descriptor.addCells === 'always' ? 'interactive' : 'wells'}
          />
        ) : (
          <PageKindHost page={page} editMode={editMode} />
        ))}
    </div>
  );
});
