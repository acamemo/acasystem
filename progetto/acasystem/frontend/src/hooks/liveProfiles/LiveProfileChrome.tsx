import type { ReactNode } from 'react';

/** Notices take real viewport space; the saved profile grid is never rewritten. */
export function LiveProfileChrome({ notice, children }: { notice: ReactNode; children: ReactNode }) {
  return (
    <div className="aca-live-profile">
      <div className="aca-live-chrome">{notice}</div>
      <div className="aca-live-app">{children}</div>
    </div>
  );
}
