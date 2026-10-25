import { lazy, Suspense, useEffect, useState } from 'react';
import { Body, Button, Caption, Field } from '@/components/primitives';
import { useSceneReached } from '@/hooks/launcher/useOverlayScene';
import type { LatLon } from './LocationMap';

const LocationMap = lazy(() => import('./LocationMap'));

/** Centre of Italy, shown when Home Assistant has no home location yet. */
const DEFAULT_CENTRE: LatLon = { lat: 41.9, lon: 12.5 };

const round = (value: number) => Math.round(value * 1e5) / 1e5;
const same = (a: LatLon, b: LatLon) =>
  round(a.lat) === round(b.lat) && round(a.lon) === round(b.lon);
const valid = (p: LatLon) =>
  Number.isFinite(p.lat) &&
  Number.isFinite(p.lon) &&
  Math.abs(p.lat) <= 90 &&
  Math.abs(p.lon) <= 180;

export interface LocationSectionProps {
  /** Home location of Home Assistant (get_config), null when unknown. */
  home: LatLon | null;
  /** Only an administrator of Home Assistant can change the home location. */
  canEdit: boolean;
  /** Saves the home location in Home Assistant (config/core/update). */
  onSave: (next: LatLon) => Promise<void>;
}

type Status =
  { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'error'; text: string };

/**
 * Posizione (REP-20261007-025): the home location of Home Assistant on a map. A tap or a drag
 * of the pin chooses the point, the two fields allow exact coordinates and the keyboard; «Salva
 * la posizione» writes it to Home Assistant, whose weather forecast for the home follows it.
 */
export function LocationSection({ home, canEdit, onSave }: LocationSectionProps) {
  const start = home ?? DEFAULT_CENTRE;
  const [saved, setSaved] = useState<LatLon>(start);
  const [point, setPoint] = useState<LatLon>(start);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const sceneReached = useSceneReached();
  // Text of the two fields: it may be half typed («41.»), the point follows when it parses.
  const [draft, setDraft] = useState({ lat: String(start.lat), lon: String(start.lon) });

  // A new location from Home Assistant (first load, another device) replaces an unchanged point.
  useEffect(() => {
    if (!home) return;
    setSaved(home);
    if (same(point, saved)) {
      setPoint(home);
      setDraft({ lat: String(home.lat), lon: String(home.lon) });
    }
    // `saved` is read only to keep a point the user is editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home?.lat, home?.lon]);

  const changed = !same(point, saved);
  const choose = (next: LatLon) => {
    const rounded = { lat: round(next.lat), lon: round(next.lon) };
    setPoint(rounded);
    setDraft({ lat: String(rounded.lat), lon: String(rounded.lon) });
    setStatus({ kind: 'idle' });
  };
  const field = (key: 'lat' | 'lon', text: string) => {
    setDraft((current) => ({ ...current, [key]: text }));
    const value = Number(text.replace(',', '.'));
    if (text.trim() !== '' && Number.isFinite(value)) {
      setPoint((current) => ({ ...current, [key]: value }));
      setStatus({ kind: 'idle' });
    }
  };
  const save = async () => {
    if (!valid(point)) {
      setStatus({
        kind: 'error',
        text: 'Coordinate non valide: latitudine tra −90 e 90, longitudine tra −180 e 180.',
      });
      return;
    }
    setStatus({ kind: 'saving' });
    try {
      await onSave(point);
      setSaved(point);
      setStatus({ kind: 'saved' });
    } catch {
      setStatus({
        kind: 'error',
        text: 'Home Assistant non ha salvato la posizione. Riprova; serve un utente amministratore.',
      });
    }
  };

  return (
    <div className="aca-system__stack">
      <Body size="sm" tone="muted">
        Tocca la mappa o trascina il punto sulla casa. Il meteo della copertina usa questa
        posizione. La mappa viene da OpenStreetMap e richiede Internet.
      </Body>
      {/* The map is created once the page is there, not inside the fade of Sistema (60 ms). */}
      <Suspense fallback={<div className="aca-location-map aca-location-map--loading" />}>
        {sceneReached ? (
          <LocationMap value={point} zoom={home ? 15 : 5} onChange={choose} disabled={!canEdit} />
        ) : (
          <div className="aca-location-map aca-location-map--loading" />
        )}
      </Suspense>
      <div className="aca-location-fields">
        <div className="aca-location-field">
          <Caption aria-hidden="true">Latitudine</Caption>
          <Field
            label="Latitudine"
            inputMode="decimal"
            value={draft.lat}
            disabled={!canEdit}
            onChange={(event) => field('lat', event.target.value)}
          />
        </div>
        <div className="aca-location-field">
          <Caption aria-hidden="true">Longitudine</Caption>
          <Field
            label="Longitudine"
            inputMode="decimal"
            value={draft.lon}
            disabled={!canEdit}
            onChange={(event) => field('lon', event.target.value)}
          />
        </div>
      </div>
      {canEdit ? (
        <div className="aca-location-actions">
          <Button
            variant="primary"
            size="md"
            disabled={!changed}
            loading={status.kind === 'saving'}
            onClick={() => void save()}
          >
            Salva la posizione
          </Button>
          {changed && (
            <Button variant="secondary" size="md" onClick={() => choose(saved)}>
              Annulla
            </Button>
          )}
        </div>
      ) : (
        <Body size="sm" tone="muted">
          Solo un amministratore di Home Assistant può cambiare la posizione.
        </Body>
      )}
      <Body as="p" size="sm" tone={status.kind === 'error' ? 'danger' : 'muted'} role="status">
        {status.kind === 'saved'
          ? 'Posizione salvata. Il meteo si aggiorna a breve.'
          : status.kind === 'error'
            ? status.text
            : ''}
      </Body>
    </div>
  );
}
