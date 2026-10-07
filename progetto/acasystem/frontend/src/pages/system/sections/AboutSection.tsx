import { useEffect, useState } from 'react';
import { Body, Caption, Numeric } from '@/components/primitives';
import { ToggleRow } from '@/templates/sheets/parts/Form';

/** Cover page with calendar and clock, before the widget pages. */
export function CoverSection({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  /** The launcher has not created its layout yet: there is nothing to change. */
  disabled?: boolean;
}) {
  return (
    <div className="aca-system__stack">
      <ToggleRow
        label="Mostra la copertina"
        hint={
          disabled
            ? 'Disponibile dopo la prima apertura delle pagine dei widget.'
            : 'Calendario e ora come prima pagina, prima dei widget.'
        }
        checked={enabled}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}

const TUNET_URL = 'https://github.com/oyvhov/Tunet';

/** Version of the running server (as the legacy settings), the app build as fallback. */
export function useRunningVersion(fallback: string): string {
  const [version, setVersion] = useState(fallback);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/health', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: unknown) => {
        const value =
          typeof data === 'object' && data !== null && 'version' in data ? data.version : null;
        if (!cancelled && typeof value === 'string' && value) setVersion(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return version;
}

/** Version, licence and provenance of the software. */
export function AboutSection({ version }: { version: string }) {
  return (
    <dl className="aca-system__facts">
      <div>
        <dt>
          <Caption>Versione</Caption>
        </dt>
        <dd>
          <Numeric>{version}</Numeric>
        </dd>
      </div>
      <div>
        <dt>
          <Caption>Licenza</Caption>
        </dt>
        <dd>
          <Body as="span" size="sm">
            GPL-3.0
          </Body>
        </dd>
      </div>
      <div className="aca-system__facts-wide">
        <dt>
          <Caption>Origine</Caption>
        </dt>
        <dd>
          <Body size="sm">
            Acasystem deriva da Tunet 1.22.1, un’interfaccia per Home Assistant distribuita con
            licenza GPL-3.0 (
            <a className="aca-system__link" href={TUNET_URL} target="_blank" rel="noreferrer">
              github.com/oyvhov/Tunet
            </a>
            ). Anche Acasystem è distribuito con la stessa licenza.
          </Body>
        </dd>
      </div>
    </dl>
  );
}
