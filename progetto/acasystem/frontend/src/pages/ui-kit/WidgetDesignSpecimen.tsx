import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Body,
  Button,
  Caption,
  Display,
  Field,
  Heading,
  Icon,
  Numeric,
  Sheet,
  Slider,
  Surface,
  Toggle,
} from '@/components/primitives';
import { definitionForType, type AddWidgetType } from '@/templates/sheets/catalog';
import { GestureControl } from './GestureControl';
import { WidgetDesignChart } from './WidgetDesignChart';
import {
  initialPreference,
  normalizedValue,
  preferenceForDevice,
  profilesFor,
  valuesFor,
  visibleCapacity,
  type Capability,
  type DeviceProfile,
  type SampleStatus,
  type SampleValue,
  type SampleValues,
  type Task,
  type WidgetPreference,
} from './widgetDesignModel';

export interface SpecimenSnapshot {
  preference: WidgetPreference;
  values: SampleValues;
  size: Size;
  status: SampleStatus;
}

type Size = 'compact' | 'standard' | 'large' | 'page';
const dimensions: readonly { id: Size; label: string }[] = [
  { id: 'compact', label: 'Compatta' },
  { id: 'standard', label: 'Standard' },
  { id: 'large', label: 'Grande' },
  { id: 'page', label: 'Pagina' },
];
interface ControlProps {
  capability: Capability;
  values: SampleValues;
  onChange: (id: string, value: SampleValue) => void;
  onAction: (capability: Extract<Capability, { kind: 'action' }>) => void;
  disabled: boolean;
  detail?: boolean;
  taskLimit?: number;
}

function TaskControl({
  tasks,
  onChange,
  disabled,
  detail,
  limit,
}: {
  tasks: readonly Task[];
  onChange: (tasks: readonly Task[]) => void;
  disabled: boolean;
  detail: boolean;
  limit: number;
}) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [completed, setCompleted] = useState(true);
  return (
    <div className="uikwa-tasks">
      {tasks
        .filter((task) => completed || !task.done)
        .slice(0, limit)
        .map((task) => (
          <div className="uikwa-task" key={task.id}>
            <Button
              variant="control"
              disabled={disabled}
              aria-pressed={task.done}
              onClick={() =>
                onChange(
                  tasks.map((item) => (item.id === task.id ? { ...item, done: !item.done } : item))
                )
              }
            >
              <Icon name={task.done ? 'done' : 'task'} />
              <Body as="span" size="sm">
                {task.label}
              </Body>
            </Button>
            {detail && (
              <>
                <Button
                  variant="control"
                  shape="circle"
                  disabled={disabled}
                  aria-label={`Modifica ${task.label}`}
                  onClick={() => {
                    setEditing(task.id);
                    setName(task.label);
                  }}
                >
                  <Icon name="edit" />
                </Button>
                <Button
                  variant="control"
                  shape="circle"
                  disabled={disabled}
                  aria-label={`Elimina ${task.label}`}
                  onClick={() => onChange(tasks.filter((item) => item.id !== task.id))}
                >
                  <Icon name="trash" />
                </Button>
              </>
            )}
          </div>
        ))}
      {!tasks.length && <Caption>Nessuna attività.</Caption>}
      {!detail && tasks.length > limit && (
        <Caption tone="muted">Altre {tasks.length - limit} attività nei dettagli.</Caption>
      )}
      {detail && (
        <>
          <Field
            label="Nome attività"
            value={name}
            disabled={disabled}
            onChange={(event) => setName(event.target.value)}
          />
          <Button
            variant="control"
            disabled={disabled || !name.trim()}
            onClick={() => {
              onChange(
                editing === null
                  ? [
                      ...tasks,
                      {
                        id: Math.max(0, ...tasks.map((item) => item.id)) + 1,
                        label: name.trim(),
                        done: false,
                      },
                    ]
                  : tasks.map((item) =>
                      item.id === editing ? { ...item, label: name.trim() } : item
                    )
              );
              setName('');
              setEditing(null);
            }}
          >
            {editing === null ? 'Aggiungi attività' : 'Salva attività'}
          </Button>
          <div className="uikwa-options">
            <Button
              variant="control"
              aria-pressed={completed}
              onClick={() => setCompleted((value) => !value)}
            >
              Mostra completate
            </Button>
            <Button
              variant="control"
              disabled={disabled || !tasks.some((task) => task.done)}
              onClick={() => onChange(tasks.filter((task) => !task.done))}
            >
              Elimina completate
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/** Same renderer and values are used in the card and detail sheet. */
function CapabilityControl({
  capability: cap,
  values,
  onChange,
  onAction,
  disabled,
  detail = false,
  taskLimit = Number.POSITIVE_INFINITY,
}: ControlProps) {
  const value = values[cap.id];
  if (cap.kind === 'range') {
    const numeric = Number(value);
    return (
      <div className="uikwa-range">
        <GestureControl
          capability={cap}
          value={numeric}
          onChange={(next) => onChange(cap.id, next)}
          disabled={disabled}
          saturation={Number(values.saturation ?? 100)}
        />
        {detail && (
          <>
            <Slider
              label={`${cap.label} · cursore`}
              value={numeric}
              min={cap.min}
              max={cap.colour === 'hue' ? 359 : cap.max}
              step={cap.step}
              disabled={disabled}
              onValueChange={(next) => onChange(cap.id, normalizedValue(cap, next))}
              valueText={`${numeric} ${cap.unit}`}
            />
            <div className="uikwa-options">
              <Button
                variant="control"
                disabled={disabled}
                aria-label={`Diminuisci ${cap.label}`}
                onClick={() => onChange(cap.id, normalizedValue(cap, numeric - cap.step))}
              >
                <Icon name="minus" />
              </Button>
              <Button
                variant="control"
                disabled={disabled}
                aria-label={`Aumenta ${cap.label}`}
                onClick={() => onChange(cap.id, normalizedValue(cap, numeric + cap.step))}
              >
                <Icon name="add" />
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }
  if (cap.kind === 'reading')
    return (
      <div className="uikw-reading" data-control-id={cap.id}>
        {typeof value === 'number' || /^\d/.test(String(value)) ? (
          <Display as="span" size="sm">
            <Numeric>
              {typeof value === 'number'
                ? new Intl.NumberFormat('it-IT').format(value)
                : String(value)}
            </Numeric>
            <span className="uikw-unit"> {cap.unit}</span>
          </Display>
        ) : (
          <Heading level={3} size="md">
            {String(value)}
          </Heading>
        )}
        <Caption tone="muted">
          {cap.id === 'today' && values.period === 'Mese'
            ? 'Costo del mese'
            : cap.id === 'price' && values.period === 'Domani'
              ? 'Prezzo di domani'
              : cap.label}
        </Caption>
      </div>
    );
  if (cap.kind === 'toggle')
    return (
      <div className="uikwa-toggle" data-control-id={cap.id}>
        <Button
          variant="control"
          shape="circle"
          size="lg"
          disabled={disabled}
          state={Boolean(value) && 'on'}
          aria-label={cap.label}
          aria-pressed={Boolean(value)}
          onClick={() => onChange(cap.id, !value)}
        >
          <Icon name={cap.icon} size="lg" />
        </Button>
        <Caption>{cap.label}</Caption>
        <Caption tone="muted">{value ? cap.on : cap.off}</Caption>
      </div>
    );
  if (cap.kind === 'options')
    return (
      <div className="uikwa-choice" data-control-id={cap.id}>
        <Caption>{cap.label}</Caption>
        <div className="uikwa-options" role="group" aria-label={cap.label}>
          {cap.options.map((option) => (
            <Button
              variant="control"
              key={option}
              disabled={disabled}
              state={value === option && 'current'}
              aria-pressed={value === option}
              onClick={() => onChange(cap.id, option)}
            >
              {option}
            </Button>
          ))}
        </div>
      </div>
    );
  if (cap.kind === 'input')
    return (
      <Field
        label={cap.label}
        type={cap.inputType}
        value={String(value)}
        disabled={disabled}
        onChange={(event) => onChange(cap.id, event.target.value)}
      />
    );
  if (cap.kind === 'list')
    return (
      <div data-control-id={cap.id}>
        <TaskControl
          tasks={value as readonly Task[]}
          onChange={(next) => onChange(cap.id, next)}
          disabled={disabled}
          detail={detail}
          limit={taskLimit}
        />
      </div>
    );
  return (
    <div className="uikwa-action" data-control-id={cap.id}>
      <Button
        variant="control"
        shape="circle"
        size="lg"
        aria-label={cap.label}
        disabled={disabled}
        onClick={() => onAction(cap)}
      >
        <Icon name={cap.icon} size="lg" />
      </Button>
      <Caption>{cap.label}</Caption>
    </div>
  );
}

function PreferenceEditor({
  devices,
  preference,
  onChange,
}: {
  devices: readonly DeviceProfile[];
  preference: WidgetPreference;
  onChange: (preference: WidgetPreference) => void;
}) {
  const deviceId = useId();
  const device = devices.find((item) => item.id === preference.deviceId)!;
  const capabilities = preference.order
    .map((id) => device.capabilities.find((item) => item.id === id))
    .filter((item): item is Capability => !!item);
  const move = (index: number, direction: -1 | 1) => {
    const order = [...preference.order];
    [order[index], order[index + direction]] = [order[index + direction]!, order[index]!];
    onChange({ ...preference, order });
  };
  return (
    <div className="uikwa-config">
      <label htmlFor={deviceId}>
        <Body as="span" size="sm">
          Dispositivo simulato
        </Body>
      </label>
      <select
        id={deviceId}
        value={device.id}
        onChange={(event) =>
          onChange(
            preferenceForDevice(
              preference,
              devices.find((item) => item.id === event.target.value)!
            )
          )
        }
      >
        {devices.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <Body size="sm" tone="muted">
        Scegli quali controlli mostrare nella card e il loro ordine. I dettagli conservano tutte le
        funzioni del dispositivo, anche quelle escluse.
      </Body>
      {capabilities.map((cap, index) => (
        <div key={cap.id} className="uikwa-config__row">
          <Toggle
            compact
            checked={preference.visible.includes(cap.id)}
            aria-label={`Mostra ${cap.label}`}
            onClick={() =>
              onChange({
                ...preference,
                visible: preference.visible.includes(cap.id)
                  ? preference.visible.filter((id) => id !== cap.id)
                  : [...preference.visible, cap.id],
              })
            }
          />
          <Body as="span" size="sm">
            {cap.label}
          </Body>
          <Button
            variant="control"
            shape="circle"
            disabled={index === 0}
            aria-label={`Sposta su ${cap.label}`}
            onClick={() => move(index, -1)}
          >
            <Icon name="chevronUp" />
          </Button>
          <Button
            variant="control"
            shape="circle"
            disabled={index === capabilities.length - 1}
            aria-label={`Sposta giù ${cap.label}`}
            onClick={() => move(index, 1)}
          >
            <Icon name="chevronDown" />
          </Button>
        </div>
      ))}
    </div>
  );
}

const statusNames: Record<SampleStatus, string> = {
  available: 'Disponibile',
  unavailable: 'Non disponibile',
  pending: 'Comando in attesa',
  error: 'Errore del comando',
};

export function WidgetDesignSpecimen({
  item,
  session,
}: {
  item: AddWidgetType;
  session: Map<string, SpecimenSnapshot>;
}) {
  const saved = session.get(item.type);
  const devices = useMemo(() => profilesFor(item.type), [item.type]);
  const [preference, setPreference] = useState<WidgetPreference>(
    () => saved?.preference ?? initialPreference(devices[0]!)
  );
  const device = devices.find((candidate) => candidate.id === preference.deviceId)!;
  const [values, setValues] = useState<SampleValues>(() => saved?.values ?? valuesFor(device));
  const [size, setSize] = useState<Size>(saved?.size ?? 'standard');
  const [status, setStatus] = useState<SampleStatus>(saved?.status ?? 'available');
  const [message, setMessage] = useState('');
  const [panel, setPanel] = useState<'details' | 'config' | null>(null);
  const [draft, setDraft] = useState<WidgetPreference>(preference);
  const [code, setCode] = useState('');
  const [capacity, setCapacity] = useState(4);
  const bodyRef = useRef<HTMLDivElement>(null);
  const detailsButtonRef = useRef<HTMLButtonElement>(null);
  const panelOpened = useRef(false);
  useEffect(() => {
    session.set(item.type, { preference, values, size, status });
  }, [session, item.type, preference, values, size, status]);
  const label = definitionForType(item)?.label ?? item.label;
  const blocked = status !== 'available';
  const ordered = useMemo(
    () =>
      preference.order
        .map((id) => device.capabilities.find((cap) => cap.id === id))
        .filter((cap): cap is Capability => !!cap),
    [preference.order, device.capabilities]
  );
  const selected = useMemo(
    () => ordered.filter((cap) => preference.visible.includes(cap.id)),
    [ordered, preference.visible]
  );
  const shown = size === 'page' ? selected : selected.slice(0, capacity);
  useLayoutEffect(() => {
    const element = bodyRef.current;
    if (!element) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      setCapacity(visibleCapacity(rect.width, rect.height * 2));
    };
    if (typeof ResizeObserver === 'undefined') {
      setCapacity(size === 'compact' ? 1 : size === 'standard' ? 4 : 6);
      return;
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [size, selected, status]);
  // Real control heights decide the final fit; options and lists need more room than knobs.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (
      size !== 'page' &&
      body &&
      body.clientHeight > 0 &&
      body.scrollHeight > body.clientHeight + 1 &&
      capacity > 1
    ) {
      setCapacity((value) => value - 1);
    }
  }, [size, selected, capacity, status, message]);
  useEffect(() => {
    if (panel === null) {
      setCode('');
      if (panelOpened.current) detailsButtonRef.current?.focus();
    } else panelOpened.current = true;
  }, [panel]);
  const change = (id: string, value: SampleValue) => {
    setValues((previous) => {
      const next = { ...previous, [id]: value };
      if (id === 'arming') next.state = value;
      if (id === 'content') next.track = value;
      if (id === 'period' && item.type === 'cost') next.today = value === 'Mese' ? '48,20' : '2,84';
      if (id === 'period' && item.type === 'nordpool') {
        next.price = value === 'Domani' ? '0,16' : '0,18';
        next.minimum = value === 'Domani' ? '0,10' : '0,12';
        next.slot = value === 'Domani' ? '12:00 – 14:00' : '14:00 – 16:00';
      }
      return next;
    });
    setMessage('');
  };
  const execute = (cap: Extract<Capability, { kind: 'action' }>) => {
    if (cap.update) change(cap.update.id, cap.update.value);
    setMessage(cap.message);
  };
  const openConfig = () => {
    setDraft(preference);
    setPanel('config');
  };
  const needsCode = item.type === 'alarm' || item.type === 'lock';
  const controlsDisabled = blocked || (needsCode && panel === 'details' && code !== '1234');
  const propsFor = (cap: Capability, detail = false): ControlProps => ({
    capability: cap,
    values,
    onChange: change,
    onAction: execute,
    disabled: detail ? controlsDisabled : blocked || (needsCode && cap.kind !== 'reading'),
    detail,
    taskLimit:
      detail || size === 'page'
        ? Number.POSITIVE_INFINITY
        : size === 'compact'
          ? 1
          : size === 'standard'
            ? 3
            : 5,
  });
  return (
    <article
      className={`uikw-specimen uikwa-specimen--${size}`}
      data-design-type={item.type}
      aria-label={`Design ${label}`}
    >
      <div className="uikwa-toolbar">
        <label>
          <Caption>Dimensione</Caption>
          <select
            aria-label={`Dimensione ${label}`}
            value={size}
            onChange={(event) => setSize(event.target.value as Size)}
          >
            {dimensions.map((dimension) => (
              <option key={dimension.id} value={dimension.id}>
                {dimension.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          ref={detailsButtonRef}
          variant="control"
          size="sm"
          onClick={() => setPanel('details')}
        >
          Dettagli
        </Button>
      </div>
      <Surface className="uikw-card aca-stretch" contentClassName="uikw-card__content">
        <WidgetDesignChart
          type={item.type}
          capabilities={device.capabilities}
          values={values}
          status={status}
        />
        <div ref={bodyRef} className="uikw-card__body uikwa-body">
          <div className="uikwa-controls" data-size={size}>
            {shown.map((cap) => (
              <CapabilityControl key={cap.id} {...propsFor(cap)} />
            ))}
          </div>
          {!selected.length && (
            <Caption tone="muted">
              Nessun controllo selezionato. Personalizza il widget dai dettagli.
            </Caption>
          )}
          {status !== 'available' && (
            <Body size="sm" tone={status === 'error' ? 'danger' : 'muted'} role="status">
              {statusNames[status]}
            </Body>
          )}
          {message && <Caption role="status">{message}</Caption>}
        </div>
      </Surface>
      <div className="uikwa-feedback">
        {' '}
        {selected.length > shown.length && (
          <Caption tone="muted">
            Altri {selected.length - shown.length} controlli: ingrandisci il widget.
          </Caption>
        )}
        {needsCode && <Caption tone="muted">Comandi disponibili nei dettagli con PIN.</Caption>}
      </div>
      <Sheet
        key={panel}
        open={panel !== null}
        onClose={() => setPanel(null)}
        title={`${panel === 'config' ? 'Configura' : 'Dettagli'} ${label}`}
        description="Dispositivo e comandi simulati; nessun collegamento a Home Assistant."
        footer={
          panel === 'config' ? (
            <div className="uikwa-options">
              <Button variant="control" onClick={() => setPanel('details')}>
                Annulla
              </Button>
              <Button
                variant="control"
                onClick={() => {
                  const nextDevice = devices.find((candidate) => candidate.id === draft.deviceId)!;
                  setPreference(draft);
                  setValues((previous) => valuesFor(nextDevice, previous));
                  setPanel('details');
                  setMessage('Configurazione applicata');
                }}
              >
                Salva
              </Button>
            </div>
          ) : (
            <Button variant="control" onClick={openConfig}>
              Configura widget
            </Button>
          )
        }
      >
        {panel === 'config' ? (
          <PreferenceEditor devices={devices} preference={draft} onChange={setDraft} />
        ) : panel === 'details' ? (
          <div className="uikwa-details">
            <Body size="sm" tone="muted">
              {device.label}
            </Body>
            <div className="uikwa-options" role="group" aria-label="Stato simulato">
              {(Object.keys(statusNames) as SampleStatus[]).map((state) => (
                <Button
                  key={state}
                  variant="control"
                  aria-pressed={status === state}
                  onClick={() => setStatus(state)}
                >
                  {statusNames[state]}
                </Button>
              ))}
            </div>
            {needsCode && (
              <>
                <Caption>PIN dimostrativo: 1234. Non viene salvato.</Caption>
                <Field
                  label="PIN del dispositivo simulato"
                  type="password"
                  inputMode="numeric"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  error={code && code !== '1234' ? 'PIN dimostrativo non corretto' : undefined}
                />
              </>
            )}
            {device.capabilities.map((cap) => (
              <section className="uikwa-detail-control" key={cap.id}>
                <CapabilityControl {...propsFor(cap, true)} />
              </section>
            ))}
            {message && (
              <Body size="sm" role="status">
                {message}
              </Body>
            )}
            {status !== 'available' && (
              <Body size="sm" role="status">
                {statusNames[status]}
              </Body>
            )}
          </div>
        ) : null}
      </Sheet>
    </article>
  );
}
