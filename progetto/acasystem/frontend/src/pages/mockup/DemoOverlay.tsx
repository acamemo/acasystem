import { Suspense, lazy, useEffect, useState } from 'react';
import { Body, Button, Skeleton } from '@/components/primitives';
import { MATERIALS_HASH } from '@/routes/mockupRoutes';
import { applyAppearance, readAppearance } from '@/utils/appearance';
import { leaveDemo } from '@/utils/mockup/demoMode';
import './mockup.css';

/** «Materiali» (decision M-2 of REP-20261028-005): the Kit 2 reference page, loaded on demand. */
const Kit2Page = lazy(() => import('../kit2/Kit2Page'));

/**
 * The only interface of the demo mode (REP-20261028-005): a slim bar over the real app, with the
 * page of the materials (Kit 2) and the way out. The app under it is the real one.
 */
export default function DemoOverlay() {
  const [inMaterials, setInMaterials] = useState(() => window.location.hash === MATERIALS_HASH);

  // The Materials page changes the look of the page; whatever it did goes back to the device's.
  useEffect(() => {
    if (!inMaterials) return undefined;
    return () => applyAppearance(readAppearance());
  }, [inMaterials]);

  return (
    <>
      {inMaterials && (
        <div className="aca-mockup-materials">
          <Suspense fallback={<Skeleton variant="panel" rows={2} label="Caricamento…" />}>
            <Kit2Page />
          </Suspense>
        </div>
      )}
      <div className="aca-mockup-bar" role="region" aria-label="Modalità dimostrativa">
        <Body as="span" size="sm" tone="ink" className="aca-mockup-bar__label">
          Modalità dimostrativa
        </Body>
        <Button variant="control" size="sm" onClick={() => setInMaterials((open) => !open)}>
          {inMaterials ? 'Torna alla demo' : 'Materiali'}
        </Button>
        <Button variant="control" size="sm" onClick={leaveDemo}>
          Esci
        </Button>
      </div>
    </>
  );
}
