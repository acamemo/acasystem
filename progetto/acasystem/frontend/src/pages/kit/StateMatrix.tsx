import { useLayoutEffect, useRef, type ReactNode } from 'react';
import {
  Button,
  Caption,
  Field,
  Heading,
  Icon,
  IconText,
  MaterialLayers,
  Segmented,
  SelectTrigger,
  Skeleton,
  Slider,
  Surface,
  Text,
  Toggle,
  materialClass,
} from '@/components/primitives';

const STATES = [
  { key: 'rest', label: 'Riposo' },
  { key: 'hover', label: 'Hover' },
  { key: 'active', label: 'Click' },
  { key: 'focus', label: 'Focus' },
  { key: 'selected', label: 'Selezione' },
  { key: 'disabled', label: 'Disabilitato' },
  { key: 'loading', label: 'Caricamento' },
  { key: 'error', label: 'Errore' },
] as const;

type StateKey = (typeof STATES)[number]['key'];

/** Preview classes: the same selectors as :hover, :active and :focus-visible in the CSS. */
const forced: Partial<Record<StateKey, string>> = {
  hover: 'is-hover',
  active: 'is-active',
  focus: 'is-focus',
};

interface Row {
  name: string;
  /** null = the state does not apply to this component. */
  render: (state: StateKey) => ReactNode | null;
}

/** Adds a preview class to an inner element the component does not expose (e.g. a segment). */
function Force({
  className,
  selector,
  children,
}: {
  className: string;
  selector: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current?.querySelector(selector);
    element?.classList.add(className);
    return () => element?.classList.remove(className);
  });
  return (
    <div ref={ref} className="kit-force">
      {children}
    </div>
  );
}

const noop = () => {};

const rows: Row[] = [
  {
    name: 'Pulsante',
    render: (state) =>
      state === 'error' ? null : (
        <Button
          variant="control"
          size="md"
          className={forced[state]}
          aria-pressed={state === 'selected' || undefined}
          disabled={state === 'disabled'}
          loading={state === 'loading'}
        >
          Scena
        </Button>
      ),
  },
  {
    name: 'Azione principale',
    render: (state) =>
      state === 'selected' || state === 'error' ? null : (
        <Button
          variant="primary"
          size="md"
          className={forced[state]}
          disabled={state === 'disabled'}
          loading={state === 'loading'}
        >
          <Icon name="add" size="md" />
          Aggiungi
        </Button>
      ),
  },
  {
    // Destructive action: red ink on metal, never orange; selection and error do not apply.
    name: 'Azione distruttiva',
    render: (state) =>
      state === 'selected' || state === 'error' ? null : (
        <Button
          variant="danger"
          size="md"
          className={forced[state]}
          disabled={state === 'disabled'}
          loading={state === 'loading'}
        >
          <Icon name="close" size="md" />
          Rimuovi
        </Button>
      ),
  },
  {
    name: 'Tassello icona',
    render: (state) =>
      state === 'error' ? null : (
        <Button
          variant="control"
          shape="rounded"
          size="md"
          className={forced[state]}
          aria-label="Notifiche"
          aria-pressed={state === 'selected'}
          disabled={state === 'disabled'}
          loading={state === 'loading'}
        >
          <Icon name="bell" size="md" />
        </Button>
      ),
  },
  {
    name: 'Interruttore',
    render: (state) => (
      <Toggle
        checked={state === 'selected' || state === 'loading'}
        className={forced[state]}
        aria-label="Luce del soggiorno"
        disabled={state === 'disabled'}
        pending={state === 'loading'}
        error={state === 'error'}
      />
    ),
  },
  {
    name: 'Cursore',
    render: (state) =>
      state === 'selected' ? null : (
        <Slider
          value={state === 'loading' ? 70 : 40}
          onValueChange={noop}
          label="Luminosità"
          valueText={state === 'loading' ? '70%' : '40%'}
          className={['kit-matrix__slider', forced[state]].filter(Boolean).join(' ')}
          disabled={state === 'disabled'}
          pending={state === 'loading'}
          error={state === 'error'}
        />
      ),
  },
  {
    name: 'Segmentato',
    render: (state) => {
      if (state === 'selected' || state === 'loading' || state === 'error') return null;
      const segmented = (
        <Segmented
          label="Vista"
          size="sm"
          value="day"
          onChange={noop}
          disabled={state === 'disabled'}
          options={[
            { value: 'day', label: 'Oggi' },
            { value: 'month', label: 'Mese' },
          ]}
        />
      );
      const className = forced[state];
      if (!className) return segmented;
      const target = state === 'focus' ? "[aria-pressed='true']" : "[aria-pressed='false']";
      return (
        <Force className={className} selector={`.aca-segmented__item${target}`}>
          {segmented}
        </Force>
      );
    },
  },
  {
    name: 'Campo',
    render: (state) => {
      if (state === 'hover' || state === 'active' || state === 'selected' || state === 'loading')
        return null;
      return (
        <div className="kit-matrix__wide">
          <Field
            label="Nome della scena"
            icon="search"
            size="sm"
            placeholder="Cerca"
            defaultValue={state === 'error' ? 'Sera!' : undefined}
            containerClassName={forced[state]}
            disabled={state === 'disabled'}
            error={state === 'error' ? 'Usa solo lettere e numeri.' : undefined}
          />
        </div>
      );
    },
  },
  {
    name: 'Menu a tendina',
    render: (state) =>
      state === 'error' ? null : (
        <SelectTrigger
          label="Ordina"
          size="sm"
          className={forced[state]}
          expanded={state === 'selected'}
          disabled={state === 'disabled'}
          loading={state === 'loading'}
        />
      ),
  },
  {
    // Soft well (.aca-m--well-soft): a quiet slot repeated many times, e.g. a free cell of the
    // launcher grid; its «+» carries the meaning. Selection, loading and error do not apply.
    name: 'Pozzetto tenue',
    render: (state) =>
      state === 'selected' || state === 'loading' || state === 'error' ? null : (
        <button
          type="button"
          className={materialClass(
            { behavior: 'static', shape: 'card', size: 'md' },
            'aca-m--well-soft',
            'kit-matrix__slot',
            forced[state]
          )}
          aria-label="Aggiungi un widget"
          disabled={state === 'disabled'}
        >
          <MaterialLayers contentClassName="kit-matrix__slot-content">
            <Icon name="add" size="md" />
          </MaterialLayers>
        </button>
      ),
  },
  {
    name: 'Scheda',
    render: (state) => (
      <Surface
        behavior="press"
        size="sm"
        role="button"
        tabIndex={state === 'disabled' ? -1 : 0}
        className={['kit-matrix__card', forced[state]].filter(Boolean).join(' ')}
        aria-pressed={state === 'selected'}
        aria-disabled={state === 'disabled' || undefined}
        aria-busy={state === 'loading' || undefined}
        error={state === 'error'}
      >
        {state === 'loading' ? (
          <Skeleton variant="compact" rows={1} label="Caricamento della scheda…" />
        ) : state === 'error' ? (
          <IconText icon="warning" iconTone="danger" tone="danger" className="kit-matrix__note">
            Non disponibile
          </IconText>
        ) : (
          <>
            <Text tone="engraved" className="kit-matrix__card-title">
              Cucina
            </Text>
            <Caption as="p">3 luci accese</Caption>
          </>
        )}
      </Surface>
    ),
  },
];

/**
 * Every kit component in each state. Hover, click and focus are forced with the preview
 * classes; the other states use the real props (aria-pressed, disabled, loading, error).
 */
export default function StateMatrix() {
  return (
    <div className="kit-matrix">
      {rows.map((row) => (
        <section key={row.name} className="kit-matrix__row" aria-label={row.name}>
          <Heading level={3} size="sm" tone="ink">
            {row.name}
          </Heading>
          <div className="kit-matrix__cells">
            {STATES.map(({ key, label }) => {
              const content = row.render(key);
              return (
                <figure key={key} className="kit-matrix__cell" data-state={key}>
                  <div className="kit-matrix__stage">
                    {content ?? (
                      <Caption tone="muted" className="kit-matrix__na">
                        Non previsto
                      </Caption>
                    )}
                  </div>
                  <Caption as="figcaption">{label}</Caption>
                </figure>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
