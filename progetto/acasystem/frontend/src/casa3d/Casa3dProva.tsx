/**
 * Development page of the Casa 3D view (ADR-0014, T3), at #/casa3d-prova. It is not linked from
 * anywhere and the customer never meets it: it exists to see the 3D view with the real rooms and
 * states of the Home Assistant in use. The page of the launcher (Casa3dPage, T4a) shows the same
 * view in Light; this one stays as the measuring bench (ISSUE-091 asks whether it stays in production).
 *
 * Read-only, Light quality only: every command the view tries to send is refused by the adapter
 * and listed here. The plan is the example one (examplePlan.ts), its rooms tied to the areas of
 * the Home Assistant when the user may read them.
 */
import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Body, Button, Caption, Heading } from '@/components/primitives';
import { buildExamplePlan } from './examplePlan';
import { LIGHT_PROPS } from './lightProps';
import { useCasa3dBundle } from './useCasa3dBundle';
import { useCasa3dHass } from './useCasa3dHass';
import './casa3dProva.css';

interface ViewTap {
  floorId: string | null;
  roomId: string | null;
}

/** The two custom elements, as the page uses them: properties are set from code. */
type LitElement = HTMLElement & Record<string, unknown>;

export interface Casa3dProvaProps {
  onClose: () => void;
}

export function Casa3dProva({ onClose }: Casa3dProvaProps) {
  const [attempt, setAttempt] = useState(0);
  const bundle = useCasa3dBundle(attempt);
  const [refused, setRefused] = useState<string[]>([]);
  const onRefused = useCallback(
    (what: string) =>
      setRefused((list) => [what, ...list.filter((item) => item !== what)].slice(0, 4)),
    []
  );
  const { hass, registriesLoaded, failed } = useCasa3dHass(null, onRefused);
  const areas = hass?.areas;
  const devices = hass?.devices;
  const entities = hass?.entities;
  const example = useMemo(
    () => buildExamplePlan({ areas: areas ?? {}, devices, entities }),
    [areas, devices, entities]
  );
  const [roomId, setRoomId] = useState<string | null>(null);
  const viewRef = useRef<LitElement | null>(null);
  const panelRef = useRef<LitElement | null>(null);

  const floor = example.building.floors[0] ?? null;
  const room = floor?.rooms.find((candidate) => candidate.id === roomId) ?? null;
  const ready = bundle.status === 'ready' && hass !== null;

  // Properties are assigned on the elements, never written as attributes (they carry objects).
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !hass) return;
    Object.assign(view, LIGHT_PROPS, {
      hass,
      building: example.building,
      packs: [],
      floorId: floor?.id ?? null,
      roomId,
      panelOpen: roomId !== null,
    });
  }, [hass, example, floor, roomId, ready]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !hass) return;
    Object.assign(panel, {
      hass,
      room,
      floor,
      building: example.building,
      confirmEntities: new Set<string>(),
      readOnly: false,
    });
  }, [hass, room, floor, example, ready]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return undefined;
    const onRoomTap = (event: Event) => {
      const detail = (event as CustomEvent<ViewTap>).detail;
      if (!detail?.roomId) return;
      setRoomId((current) => (current === detail.roomId ? null : detail.roomId));
    };
    const onFloorTap = () => setRoomId(null);
    view.addEventListener('room-tap', onRoomTap);
    view.addEventListener('floor-tap', onFloorTap);
    view.addEventListener('back', onFloorTap);
    return () => {
      view.removeEventListener('room-tap', onRoomTap);
      view.removeEventListener('floor-tap', onFloorTap);
      view.removeEventListener('back', onFloorTap);
    };
  }, [ready]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return undefined;
    const close = () => setRoomId(null);
    panel.addEventListener('close', close);
    return () => panel.removeEventListener('close', close);
  }, [room]);

  return (
    <main className="c3p-page">
      <header className="c3p-header">
        <div className="c3p-title">
          <Heading level={1} size="lg">
            Casa 3D: pagina di prova
          </Heading>
          <Caption as="p">
            Sola lettura, qualità Light. Non è visibile ai clienti: serve a vedere la vista con i
            dati di questa casa.
          </Caption>
        </div>
        <Button variant="secondary" onClick={onClose}>
          Torna alla home
        </Button>
      </header>

      <section className="c3p-stage" aria-label="Vista 3D della casa">
        {bundle.status === 'loading' && <Body>Caricamento di Casa 3D…</Body>}
        {bundle.status === 'error' && (
          <div className="c3p-message" role="alert">
            <Body>{bundle.message}</Body>
            <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>
              Riprova
            </Button>
          </div>
        )}
        {bundle.status === 'ready' && !hass && <Body>In attesa di Home Assistant…</Body>}
        {ready && createElement('fp3d-view3d', { ref: viewRef, className: 'c3p-view' })}
        {ready &&
          room &&
          createElement('fp3d-room-panel', { ref: panelRef, className: 'c3p-panel' })}
      </section>

      <footer className="c3p-info">
        <Caption as="p">
          {hass
            ? `Utente: ${hass.user.is_admin ? 'amministratore' : 'non amministratore'}. `
            : 'Utente: non ancora noto. '}
          {registriesLoaded && hass
            ? `Registri: ${Object.keys(hass.areas).length} aree, ${Object.keys(hass.floors).length} piani, ` +
              `${Object.keys(hass.devices).length} dispositivi, ${Object.keys(hass.entities).length} entità` +
              (failed.length ? ` (non letti: ${failed.join(', ')})` : '') +
              '. '
            : 'Registri: in lettura. '}
          {`Stanze legate ad aree: ${example.bound} di ${floor?.rooms.length ?? 0}, ${example.pins} dispositivi nelle stanze. `}
          {hass ? `Entità: ${Object.keys(hass.states).length}. ` : ''}
          {bundle.status === 'ready' ? `Versione: ${bundle.loaded.manifest.version}.` : ''}
        </Caption>
        <Caption as="p">
          {refused.length
            ? `Comandi rifiutati (sola lettura): ${refused.join(', ')}.`
            : 'Nessun comando rifiutato.'}
        </Caption>
      </footer>
    </main>
  );
}

export default Casa3dProva;
