/**
 * The «Casa 3D» page of the launcher (ADR-0014, R1): a still picture of the plan the server holds,
 * drawn in SVG, and nothing else. There is no live 3D in the pager any more: a short tap on the
 * picture (or on its button) opens the house at full screen (`#/casa`, CasaScreen). As ADR-0016
 * says, in use a tap acts at once; the swipe belongs to the pager and the long press to the
 * launcher (the click that follows a long press is swallowed by the launcher, so it opens nothing),
 * and a tap that only stops a fling of the pager is not a tap on the picture (`pagerMoving`).
 * Without a house drawn the picture says «Nessuna casa disegnata». The code of the 3D view is
 * fetched ahead (modulepreload) once the page is on screen or next to it, so the house opens fast.
 */
import { useRef, type MouseEvent } from 'react';
import { Body, Caption } from '@/components/primitives';
import type { PageKindProps } from '@/@types/launcher';
import { usePageNear, usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { Casa3dPlanPreview } from './Casa3dPlanPreview';
import { CASA3D_OPENER_ATTRIBUTE, useCasa3dHouse } from './houseContext';
import { pagerMoving } from '@/utils/launcher/pagerMoving';
import { useCasa3dPreload } from './useCasa3dPreload';
import { usePlanPreview } from './usePlanPreview';
import './casa3dPage.css';

export default function Casa3dPage({ editMode = false }: PageKindProps) {
  const visible = usePageVisible();
  const near = usePageNear();
  const active = visible && !editMode;
  const house = useCasa3dHouse();
  const rootRef = useRef<HTMLDivElement | null>(null);
  useCasa3dPreload(near || visible);
  const preview = usePlanPreview(visible, near);

  const open = (event: MouseEvent<HTMLButtonElement>) => {
    const root = rootRef.current;
    // A tap that stops the fling of the pager is not a tap on the picture.
    if (!active || !house || (root !== null && pagerMoving(root))) return;
    house.open(event.currentTarget);
  };

  return (
    <div ref={rootRef} className="c3d-shell" data-plan={preview.status}>
      <button
        type="button"
        className="c3d-open"
        {...{ [CASA3D_OPENER_ATTRIBUTE]: '' }}
        disabled={!house}
        onClick={open}
      >
        {preview.status === 'plan' && <Casa3dPlanPreview rooms={preview.rooms} decorative />}
        {preview.status === 'empty' && (
          <span className="c3d-open__message">
            <Body as="span">Nessuna casa disegnata</Body>
            <Caption as="span">Aprila per disegnare la piantina.</Caption>
          </span>
        )}
        {preview.status === 'error' && (
          <span className="c3d-open__message">
            <Body as="span">La casa non si legge ora</Body>
            <Caption as="span">Aprila per riprovare.</Caption>
          </span>
        )}
        {preview.status === 'loading' && (
          <span className="c3d-open__message">
            <Caption as="span">Caricamento della casa…</Caption>
          </span>
        )}
        <span className="c3d-open__label">
          <Body as="span" className="c3d-open__pill">
            Apri la casa
          </Body>
        </span>
      </button>
    </div>
  );
}
