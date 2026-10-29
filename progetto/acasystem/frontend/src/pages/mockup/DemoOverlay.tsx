import { Suspense, lazy, useEffect, useState } from 'react';
import { Body, Button, Caption, Popover, SelectTrigger, Skeleton } from '@/components/primitives';
import { MATERIALS_HASH } from '@/routes/mockupRoutes';
import { applyAppearance, readAppearance } from '@/utils/appearance';
import { currentScenario, leaveDemo, switchScenario } from '@/utils/mockup/demoMode';
import { MOCK_SCENARIOS, type MockScenario } from '@/utils/mockup/mockData';
import './mockup.css';

/** «Materiali» (decision M-2 of REP-20261028-005): the Kit 2 reference page, loaded on demand. */
const Kit2Page = lazy(() => import('../kit2/Kit2Page'));

/**
 * The only interface of the demo mode (REP-20261028-005): a slim bar over the real app, with the
 * «Scenario» of the house, the page of the materials (Kit 2) and the way out. The app under it is
 * the real one; changing the scenario rebuilds the simulated house and reloads into the demo.
 */
export default function DemoOverlay() {
  const [inMaterials, setInMaterials] = useState(() => window.location.hash === MATERIALS_HASH);
  const [scenario, setScenario] = useState<MockScenario>(currentScenario);
  const active = MOCK_SCENARIOS.find((item) => item.id === scenario) ?? MOCK_SCENARIOS[0]!;

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
        <Popover
          label="Scenario"
          placement="bottom-start"
          contentClassName="aca-mockup-menu"
          trigger={(props) => (
            <SelectTrigger
              size="sm"
              className="aca-mockup-touch"
              label={active.label}
              aria-label={`Scenario: ${active.label}`}
              aria-haspopup="dialog"
              {...props}
            />
          )}
        >
          {(close) => (
            <>
              <Caption as="p">Scenario</Caption>
              {MOCK_SCENARIOS.map((item) => (
                <Button
                  key={item.id}
                  variant="control"
                  size="sm"
                  className="aca-mockup-touch aca-mockup-menu__item"
                  aria-pressed={item.id === scenario}
                  onClick={() => {
                    close();
                    setScenario(item.id);
                    switchScenario(item.id);
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </>
          )}
        </Popover>
        <Button
          variant="control"
          size="sm"
          className="aca-mockup-touch"
          onClick={() => setInMaterials((open) => !open)}
        >
          {inMaterials ? 'Torna alla demo' : 'Materiali'}
        </Button>
        <Button variant="control" size="sm" className="aca-mockup-touch" onClick={leaveDemo}>
          Esci
        </Button>
      </div>
    </>
  );
}
