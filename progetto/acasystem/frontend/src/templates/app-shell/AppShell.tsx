import { useRef, type ReactNode } from 'react';
import { useFooterBand } from './footerBand';
import './appShell.css';

export interface AppShellProps {
  /** Status bar at the top. */
  statusBar: ReactNode;
  /** Messages under the bar (connection). */
  notice?: ReactNode;
  /**
   * Bottom band, of constant height: the page indicator and, in edit mode, the edit toolbar or
   * the move controls (placed by appShell.css, so the grid above never changes size).
   */
  footer: ReactNode;
  /** The pager. */
  children: ReactNode;
  editMode?: boolean;
}

/**
 * Frame of the «OS»: status bar, full-screen pager and footer band, on one metal background,
 * exactly the height of the screen (pages never scroll vertically). Status bar and footer keep
 * the same height in normal view and in edit mode; the edit bar adapts its density to the
 * room the page indicator leaves (footerBand.ts).
 */
export function AppShell({ statusBar, notice, footer, children, editMode = false }: AppShellProps) {
  const footerRef = useRef<HTMLElement>(null);
  useFooterBand(footerRef);
  return (
    <div className={['aca-shell', editMode && 'is-editing'].filter(Boolean).join(' ')}>
      {statusBar}
      {notice}
      <main className="aca-shell__main" aria-label="Pagine">
        {children}
      </main>
      <footer ref={footerRef} className="aca-shell__footer">
        {footer}
      </footer>
    </div>
  );
}
