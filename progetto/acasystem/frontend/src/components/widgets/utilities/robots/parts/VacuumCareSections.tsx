import { Body, Button, Caption } from '@/components/primitives';
import { Section, StatList, type StatItem } from '../../shared/details';
import { Chip, Meter } from '../../shared/UtilityCard';
import { formatCompact, formatDuration, parseNumber } from '../../shared/format';
import type { Reading } from '../vacuumData';
import type { VacuumState } from './useVacuumDetailsState';

const readingText = (reading: Reading | null) =>
  reading
    ? `${formatCompact(parseNumber(reading.value), 1, reading.value)}${reading.unit ? ` ${reading.unit}` : ''}`
    : '--';

export function VacuumStatsSection({ v }: { v: VacuumState }) {
  const { stats, lastClean } = v;
  const areaUnit = stats.totalArea?.unit ?? 'm²';
  const history: StatItem[] = [
    {
      key: 'cleaningTime',
      label: 'Durata della pulizia',
      value: stats.cleaningTime
        ? formatDuration(parseNumber(stats.cleaningTime.value), stats.cleaningTime.unit)
        : '--',
    },
    { key: 'cleanedArea', label: 'Area pulita', value: readingText(stats.cleanedArea) },
    { key: 'totalCount', label: 'Pulizie totali', value: stats.totalCount ?? '--' },
    { key: 'totalTime', label: 'Tempo totale', value: readingText(stats.totalTime) },
    { key: 'totalArea', label: 'Area totale', value: readingText(stats.totalArea) },
    { key: 'last', label: 'Ultima pulizia', value: lastClean },
    ...(stats.avgTime !== null
      ? [
          {
            key: 'avgTime',
            label: 'Durata media',
            value: formatCompact(stats.avgTime, 0),
            unit: 'min',
          },
        ]
      : []),
    ...(stats.avgArea !== null
      ? [
          {
            key: 'avgArea',
            label: 'Area media',
            value: formatCompact(stats.avgArea, 1),
            unit: areaUnit,
          },
        ]
      : []),
  ];

  return (
    <Section title="Statistiche" icon="chart">
      {history.some((item) => item.value !== '--') ? (
        <StatList items={history.filter((item) => item.value !== '--')} />
      ) : (
        <Caption>Il dispositivo non fornisce statistiche di pulizia.</Caption>
      )}
    </Section>
  );
}

export function VacuumMaintenanceSection({ v }: { v: VacuumState }) {
  const {
    consumables,
    pending,
    unavailable,
    runtime,
    services,
    configuredIds,
    resetConfirm,
    setResetConfirm,
    send,
  } = v;
  return (
    <>
      {consumables.length > 0 && (
        <Section title="Manutenzione" icon="timer">
          <ul className="utility-list">
            {consumables.map((item) => (
              <li className="utility-list__row" key={item.key}>
                <span className="utility-list__main">
                  <Body as="span" size="sm" tone="ink">
                    {item.label}
                  </Body>
                  {item.percent !== null && (
                    <Meter
                      value={item.percent}
                      label={`Durata residua: ${item.label}`}
                      low={item.percent < 20}
                      valueText={`${item.percent}%`}
                    />
                  )}
                </span>
                <span className="utility-list__end">
                  {item.percent !== null && <Caption>{item.percent}%</Caption>}
                  {item.buttonId && (
                    <Button
                      variant="control"
                      size="sm"
                      loading={pending === `reset-${item.key}`}
                      disabled={
                        unavailable ||
                        !runtime.conn ||
                        !configuredIds.has(item.buttonId) ||
                        !services?.button?.press
                      }
                      onClick={() => {
                        if (resetConfirm !== item.key) {
                          setResetConfirm(item.key);
                          return;
                        }
                        setResetConfirm(null);
                        send({
                          key: `reset-${item.key}`,
                          domain: 'button',
                          service: 'press',
                          data: { entity_id: item.buttonId },
                        });
                      }}
                    >
                      {resetConfirm === item.key ? 'Conferma azzeramento' : 'Azzera'}
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

export function VacuumDiagnosticsSection({ v }: { v: VacuumState }) {
  const { diagnostics } = v;
  return (
    <>
      {diagnostics.length > 0 && (
        <Section title="Diagnostica" icon="sensor">
          <ul className="utility-list">
            {diagnostics.map((item) => (
              <li className="utility-list__row" key={item.key}>
                <span className="utility-list__main">
                  <Body as="span" size="sm" tone="ink">
                    {item.label}
                  </Body>
                </span>
                <span className="utility-list__end">
                  {item.warn ? (
                    <Chip icon="warning" tone="danger">
                      {item.text}
                    </Chip>
                  ) : (
                    <Caption>{item.text}</Caption>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

export function VacuumTelemetrySection({ v }: { v: VacuumState }) {
  const { advanced, telemetryOpen, setTelemetryOpen, telemetryId } = v;
  return (
    <>
      {advanced.length > 0 && (
        <Section title="Altri sensori" icon="sensor">
          <Button
            variant="control"
            size="sm"
            aria-expanded={telemetryOpen}
            aria-controls={telemetryId}
            onClick={() => setTelemetryOpen((value) => !value)}
          >
            {telemetryOpen ? 'Nascondi' : `Mostra ${advanced.length} sensori`}
          </Button>
          {telemetryOpen && (
            <ul className="utility-list" id={telemetryId}>
              {advanced.map((item) => (
                <li className="utility-list__row" key={item.id}>
                  <span className="utility-list__main">
                    <Body as="span" size="sm" tone="ink" className="utility-truncate">
                      {item.label}
                    </Body>
                  </span>
                  <span className="utility-list__end">
                    <Caption>
                      {formatCompact(parseNumber(item.value), 1, item.value)}
                      {item.unit ? ` ${item.unit}` : ''}
                    </Caption>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </>
  );
}
