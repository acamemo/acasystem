import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { WidgetRuntime } from '@/@types/launcher';
import type { CardSettings } from '@/@types/dashboard';
import { Body, Button, Caption, Field, Slider } from '@/components/primitives';
import { useWidgetRuntime, WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import {
  carCapabilities,
  carFiniteNumber,
  carNativeBounds,
  configuredCarSources,
  type CarSourceField,
} from '@/domain/car/carSources';
import { useCommand } from '../shared/useCommand';
import { useRequestedValue } from '../shared/useRequestedValue';
import { OptionPicker } from '../shared/details';
import { UtilityIcon } from '../shared/UtilityIcon';
import { useLockControl } from '../../controls/lock/useLockControl';
import { CommandFeedback } from '../../controls/shared/CommandFeedback';

/** Target-specific fence: a delayed child callback can never inherit a later connection. */
export function CarControlScope({
  field,
  entityId,
  settings,
  children,
}: {
  field: CarSourceField;
  entityId: string;
  settings: CardSettings;
  children: ReactNode;
}) {
  const runtime = useWidgetRuntime(),
    visible = usePageVisible(),
    mounted = useRef(false);
  const live = useRef({ runtime, visible, settings });
  live.current = { runtime, visible, settings };
  const temperatureUnit =
    field === 'climateId'
      ? (carNativeBounds(
          runtime.entities[entityId],
          field,
          runtime.haConfig?.unit_system?.temperature
        )?.unit ?? null)
      : null;
  const generation = useRef({ conn: runtime.conn, visible, temperatureUnit, value: 0 });
  if (
    generation.current.conn !== runtime.conn ||
    generation.current.visible !== visible ||
    generation.current.temperatureUnit !== temperatureUnit
  )
    generation.current = {
      conn: runtime.conn,
      visible,
      temperatureUnit,
      value: generation.current.value + 1,
    };
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const expectedConn = runtime.conn;
  const expectedEpoch = generation.current.value;
  const callService = useCallback<WidgetRuntime['callService']>(
    (domain, service, data) => {
      const current = live.current,
        config = configuredCarSources(current.settings),
        entity = current.runtime.entities[entityId];
      const linked =
        field === 'chargeControlId'
          ? config.chargeControlIds.includes(entityId)
          : config.ids[field] === entityId;
      if (
        !mounted.current ||
        expectedEpoch !== generation.current.value ||
        !current.visible ||
        !expectedConn ||
        expectedConn !== current.runtime.conn ||
        expectedConn.connected === false ||
        !linked ||
        data?.entity_id !== entityId ||
        !carCapabilities(
          entity,
          field,
          current.runtime.services,
          current.runtime.haConfig?.unit_system?.temperature
        ).includes(`${domain}.${service}`)
      )
        return Promise.reject(new Error('Comando non disponibile per questa fonte'));
      if (service === 'set_value' || service === 'set_temperature') {
        const bounds =
          field === 'chargeLimitNumberId' || field === 'climateId'
            ? carNativeBounds(entity, field, current.runtime.haConfig?.unit_system?.temperature)
            : null;
        const value = carFiniteNumber(service === 'set_value' ? data.value : data.temperature);
        if (
          !bounds ||
          value === null ||
          value < bounds.min ||
          value > bounds.max ||
          Math.abs(
            (value - bounds.min) / bounds.step - Math.round((value - bounds.min) / bounds.step)
          ) > 1e-6
        )
          return Promise.reject(new Error('Valore non compatibile con il dispositivo'));
      }
      if (
        service === 'select_option' &&
        (!Array.isArray(entity?.attributes.options) ||
          !entity.attributes.options.includes(data.option))
      )
        return Promise.reject(new Error('Opzione non disponibile'));
      return current.runtime.callService(domain, service, data);
    },
    [entityId, expectedConn, expectedEpoch, field]
  );
  if (!visible) return null;
  if (!runtime.conn || runtime.conn.connected === false)
    return <Caption>Comandi non disponibili senza collegamento.</Caption>;
  return (
    <WidgetRuntimeProvider key={generation.current.value} value={{ ...runtime, callService }}>
      {children}
    </WidgetRuntimeProvider>
  );
}

export function CarAction({
  entityId,
  action,
  label,
  sensitive = false,
  targetName,
}: {
  entityId: string;
  action: string;
  label: string;
  sensitive?: boolean;
  targetName?: string;
}) {
  const runtime = useWidgetRuntime(),
    entity = runtime.entities[entityId],
    command = useCommand(entity);
  const [armed, setArmed] = useState(false);
  const [domain, service] = action.split('.');
  const send = () => {
    if (sensitive && !armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    const target = service === 'turn_on' ? 'on' : service === 'turn_off' ? 'off' : null;
    command.run({
      key: 'action',
      domain: domain!,
      service: service!,
      data: { entity_id: entityId },
      confirm: target ? (current) => current?.state === target : undefined,
    });
  };
  return (
    <div className="car-control">
      <div className="car-control__actions">
        <Button
          variant="control"
          size="sm"
          loading={command.pendingKey !== null}
          onClick={send}
          aria-label={targetName ? `${label}: ${targetName}` : undefined}
        >
          {armed ? `Conferma ${label.toLocaleLowerCase('it-IT')}` : label}
        </Button>
        {armed && (
          <Button variant="control" size="sm" onClick={() => setArmed(false)}>
            Annulla
          </Button>
        )}
      </div>
      {command.pendingKey && (
        <Caption role="status">Richiesta inviata, in attesa dello stato osservato.</Caption>
      )}
      {command.errorKey && (
        <Body size="sm" role="status">
          Comando non riuscito. Riprova.
        </Body>
      )}
      {command.unconfirmedKey && (
        <Body size="sm" role="status">
          Nessuna conferma dal dispositivo.
        </Body>
      )}
    </div>
  );
}

export function CarNumeric({
  entityId,
  field,
  label,
}: {
  entityId: string;
  field: 'chargeLimitNumberId' | 'climateId';
  label: string;
}) {
  const runtime = useWidgetRuntime(),
    entity = runtime.entities[entityId],
    bounds = carNativeBounds(entity, field, runtime.haConfig?.unit_system?.temperature);
  const confirmed = carFiniteNumber(
    field === 'climateId' ? entity?.attributes.temperature : entity?.state
  );
  const requested = useRequestedValue({
    confirmed,
    tolerance: (bounds?.step ?? 0.01) / 2,
    toCall: (value) => ({
      domain: field === 'climateId' ? 'climate' : 'number',
      service: field === 'climateId' ? 'set_temperature' : 'set_value',
      data: { entity_id: entityId, [field === 'climateId' ? 'temperature' : 'value']: value },
    }),
  });
  if (!bounds || confirmed === null || confirmed < bounds.min || confirmed > bounds.max)
    return null;
  const value = requested.value ?? confirmed;
  const clamp = (next: number) =>
    Math.min(
      bounds.max,
      Math.max(bounds.min, bounds.min + Math.round((next - bounds.min) / bounds.step) * bounds.step)
    );
  const format = (next: number) =>
    `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 6 }).format(next)} ${bounds.unit}`;
  return (
    <div className="car-numeric">
      <Body size="sm">
        {label}: {format(value)}
      </Body>
      <div className="utility-stepper" data-no-long-press>
        <Button
          variant="control"
          shape="circle"
          size="md"
          aria-label={`Diminuisci ${label.toLocaleLowerCase('it-IT')}`}
          disabled={value <= bounds.min}
          onClick={() => requested.request(clamp(value - bounds.step))}
        >
          <UtilityIcon name="minus" size="md" />
        </Button>
        <Slider
          label={label}
          value={value}
          min={bounds.min}
          max={bounds.max}
          step={bounds.step}
          valueText={format(value)}
          pending={requested.pending}
          error={requested.error}
          onValueChange={(next) => requested.request(clamp(next))}
        />
        <Button
          variant="control"
          shape="circle"
          size="md"
          aria-label={`Aumenta ${label.toLocaleLowerCase('it-IT')}`}
          disabled={value >= bounds.max}
          onClick={() => requested.request(clamp(value + bounds.step))}
        >
          <UtilityIcon name="add" size="md" />
        </Button>
      </div>
      {requested.error && <Caption role="status">Valore non impostato. Riprova.</Caption>}
      {requested.unconfirmed && <Caption role="status">Nessuna conferma dal dispositivo.</Caption>}
    </div>
  );
}

export function CarSelect({ entityId }: { entityId: string }) {
  const runtime = useWidgetRuntime(),
    entity = runtime.entities[entityId],
    command = useCommand(entity);
  const options = Array.isArray(entity?.attributes.options)
    ? entity.attributes.options.filter(
        (value): value is string => typeof value === 'string' && value.trim() !== ''
      )
    : [];
  return (
    <div className="car-control">
      <OptionPicker
        label="Limite di ricarica"
        value={entity?.state ?? null}
        options={options.map((value) => ({ value, label: value }))}
        pending={command.pendingKey !== null}
        onSelect={(option) =>
          command.run({
            key: 'select',
            domain: 'select',
            service: 'select_option',
            data: { entity_id: entityId, option },
            confirm: (current) => current?.state === option,
          })
        }
        isolateEscape
      />
      {command.errorKey && <Caption role="status">Opzione non impostata. Riprova.</Caption>}
      {command.unconfirmedKey && <Caption role="status">Nessuna conferma dal dispositivo.</Caption>}
    </div>
  );
}

export function CarLock({ entityId }: { entityId: string }) {
  const [generation, setGeneration] = useState(0);
  return (
    <CarLockBody
      key={generation}
      entityId={entityId}
      onCancel={() => setGeneration((value) => value + 1)}
    />
  );
}

function CarLockBody({ entityId, onCancel }: { entityId: string; onCancel: () => void }) {
  const runtime = useWidgetRuntime(),
    lock = useLockControl(entityId, false),
    [code, setCode] = useState(''),
    [error, setError] = useState<string | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const caps = carCapabilities(runtime.entities[entityId], 'lockId', runtime.services);
  return (
    <div className="car-control">
      {lock.requiresCode && (
        <Field
          label="Codice della serratura"
          type="password"
          autoComplete="off"
          value={code}
          error={error}
          disabled={lock.command.pending}
          onChange={(event) => {
            setCode(event.target.value);
            setError(undefined);
          }}
        />
      )}
      <div className="car-control__actions">
        {(confirmOpen || lock.confirmUnlock) && (
          <Button variant="control" onClick={onCancel}>
            Annulla
          </Button>
        )}
        {caps.includes('lock.open') && (
          <Button
            variant="control"
            disabled={lock.command.pending}
            onClick={() => {
              if (lock.command.pending) return;
              if (!confirmOpen) {
                setConfirmOpen(true);
                return;
              }
              setConfirmOpen(false);
              if (!lock.open(code)) setError('Inserisci il codice della serratura.');
            }}
          >
            {confirmOpen ? 'Conferma apertura' : 'Apri'}
          </Button>
        )}
        {caps.includes('lock.lock') && (
          <Button
            variant="control"
            disabled={lock.command.pending}
            onClick={() => {
              if (lock.command.pending) return;
              if (!lock.lock(code)) setError('Inserisci il codice della serratura.');
            }}
          >
            Blocca
          </Button>
        )}
        {caps.includes('lock.unlock') && (
          <Button
            variant="control"
            disabled={lock.command.pending}
            onClick={() => {
              if (lock.command.pending) return;
              if (!lock.unlock(code)) setError('Inserisci il codice della serratura.');
            }}
          >
            {lock.confirmUnlock ? 'Conferma sblocco' : 'Sblocca'}
          </Button>
        )}
      </div>
      <CommandFeedback
        message={lock.command.message}
        pendingText={lock.confirmUnlock ? 'Conferma per sbloccare.' : null}
      />
    </div>
  );
}
