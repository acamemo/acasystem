import { useEffect, useState } from 'react';
import { Body, Button, Caption, Field, Icon, Skeleton } from '@/components/primitives';
import type { CatalogDto, CatalogEntryDto } from '@/@types/devices';
import { searchCatalog, toDeviceError } from '@/api/devicesApi';
import { Notice, SheetSection } from '../sheets/parts/Form';
import { deviceTexts, integrationName, RECOMMENDED_HANDLERS } from './deviceTexts';
import type { DeviceKind } from './useDeviceFlow';

const SEARCH_DELAY_MS = 250;
const PAGE_LIMIT = 50;

/** One integration: «Aggiungi» when the customer may start it, a plain note when not. */
function CatalogRow({
  title,
  subtitle,
  startable,
  disabled,
  onStart,
}: {
  title: string;
  subtitle?: string;
  startable: boolean;
  disabled: boolean;
  onStart: () => void;
}) {
  return (
    <Button
      variant="control"
      size="sm"
      className="aca-pick-row"
      contentClassName="aca-pick-row__content"
      disabled={disabled || !startable}
      aria-label={startable ? `${deviceTexts.addRow}: ${title}` : undefined}
      onClick={onStart}
    >
      <span className="aca-pick-row__text">
        <Body as="span" size="sm" className="aca-pick-row__title">
          {title}
        </Body>
        {subtitle && <Caption className="aca-pick-row__subtitle">{subtitle}</Caption>}
      </span>
      {startable ? (
        <>
          <Caption tone="active">{deviceTexts.addRow}</Caption>
          <Icon name="add" size="md" />
        </>
      ) : (
        <Caption>{deviceTexts.requiresInstaller}</Caption>
      )}
    </Button>
  );
}

/**
 * First step: the integration. The ones recommended for the widget come first and need no
 * search; below them a search over the names the server lists. Every integration the server
 * lists can be started (F4); only a row the server marks as not startable is shown disabled.
 */
export function CatalogStep({
  kind,
  busy,
  onStart,
  onExit,
}: {
  kind: DeviceKind;
  busy: boolean;
  onStart: (handler: string) => void;
  onExit: () => void;
}) {
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState<CatalogDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The search waits for a pause in the typing; the first, empty one goes out at once.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(
      () => {
        searchCatalog(query, PAGE_LIMIT)
          .then((result) => {
            if (cancelled) return;
            setCatalog(result);
            setError(null);
          })
          .catch((failure: unknown) => {
            if (!cancelled) setError(toDeviceError(failure).message);
          });
      },
      query.trim() ? SEARCH_DELAY_MS : 0
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const recommended = RECOMMENDED_HANDLERS[kind] ?? [];
  const rows: CatalogEntryDto[] = (catalog?.items ?? []).filter(
    (item) => !recommended.includes(item.domain)
  );

  return (
    <div className="aca-device-flow">
      {recommended.length > 0 && (
        <SheetSection title={deviceTexts.recommended}>
          <ul className="aca-pick__list">
            {recommended.map((domain) => (
              <li key={domain}>
                <CatalogRow
                  title={integrationName(domain, domain)}
                  startable
                  disabled={busy}
                  onStart={() => onStart(domain)}
                />
              </li>
            ))}
          </ul>
        </SheetSection>
      )}

      <SheetSection
        title={recommended.length > 0 ? deviceTexts.otherIntegrations : deviceTexts.catalogByBrand}
      >
        <Field
          label={deviceTexts.searchLabel}
          icon="search"
          type="search"
          placeholder={deviceTexts.searchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {error && <Notice tone="danger">{error}</Notice>}
        {!catalog && !error && <Skeleton rows={3} label={deviceTexts.catalogLoading} />}
        {catalog && (
          <>
            {rows.length === 0 ? (
              <Caption as="p">{deviceTexts.catalogEmpty}</Caption>
            ) : (
              <ul className="aca-pick__list">
                {rows.map((item) => {
                  const { startable } = item;
                  return (
                    <li key={item.domain}>
                      <CatalogRow
                        title={integrationName(item.domain, item.name)}
                        startable={startable}
                        disabled={busy}
                        onStart={() => onStart(item.startDomain)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
            {catalog.message && <Caption as="p">{catalog.message}</Caption>}
            {catalog.total > catalog.items.length && (
              <Caption as="p">
                {deviceTexts.catalogShown(catalog.items.length, catalog.total)}
              </Caption>
            )}
          </>
        )}
      </SheetSection>

      <div className="aca-device-actions">
        <Button variant="secondary" size="md" onClick={onExit} disabled={busy}>
          {deviceTexts.exit}
        </Button>
      </div>
    </div>
  );
}
