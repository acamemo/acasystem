import { useRef, type ReactNode } from 'react';
import { useFooterBand } from './footerBand';
import '../../design/layout/appShell.css';

export interface AppShellProps {
  /**
   * Sistema, the gear fixed at the top right: present in every state of the launcher
   * (ADR-0016, C1). It is the first control of the frame.
   */
  gear?: ReactNode;
  /**
   * Commands with no visible face, for the keyboard and for assistive technology (ADR-0016,
   * C3): they show only while one has the keyboard focus.
   */
  commands?: ReactNode;
  /** Connection messages share the top rail and reserve space while they are visible. */
  notice?: ReactNode;
  /**
   * Top bar: the page indicator, in edit mode and for a moment after a page change. It lies over
   * the pages normally; visible profile/connection notices give the chrome its own rail.
   */
  top?: ReactNode;
  /**
   * Bottom bars of edit mode (the bar of a widget, the bar of the pages), laid over
   * the pages in a band of constant height; out of edit mode they wait below the screen.
   */
  footer: ReactNode;
  /** The pager. */
  children: ReactNode;
  editMode?: boolean;
}

/**
 * Frame of the «OS»: the pager at full screen on one metal background, exactly the height of the
 * screen (pages never scroll vertically). Nothing takes room from the grid but the safe areas
 * (and, on a tablet in landscape, a few pixels for the gear): the gear, the top bar, the
 * notice and the bottom bars are laid over it, so the area measured by the grid is the same in
 * normal view and in edit mode without notices (ADR-0016, which supersedes ADR-0013 on the bars;
 * REP-20261021-003). Visible notices temporarily reserve viewport space, keeping their actions,
 * the indicator and the page content separate without rewriting the saved grid.
 * The bottom band fits the density of the edit bar to the width of the screen (footerBand.ts).
 */
export function AppShell({
  gear,
  commands,
  notice,
  top,
  footer,
  children,
  editMode = false,
}: AppShellProps) {
  const footerRef = useRef<HTMLElement>(null);
  useFooterBand(footerRef);
  return (
    <div className={['aca-shell', editMode && 'is-editing'].filter(Boolean).join(' ')}>
      {commands}
      {(top || notice) && (
        <div className="aca-shell__top">
          <div className="aca-shell__notices">{notice}</div>
          {top}
        </div>
      )}
      {gear}
      <main className="aca-shell__main" aria-label="Pagine">
        {children}
      </main>
      <footer ref={footerRef} className="aca-shell__footer">
        {footer}
      </footer>
    </div>
  );
}
