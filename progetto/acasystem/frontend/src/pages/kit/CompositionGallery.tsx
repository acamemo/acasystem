/**
 * Composition gallery of the kit (ADR-0010, REP-20261007-006): every family of classes and every
 * component with its variants. Under each specimen the classes are read back from the DOM, so
 * the label always matches what is drawn; aliases of the first kit (aca-m--*) are left out.
 */
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  AddTile,
  Badge,
  Body,
  Button,
  Caption,
  Field,
  Heading,
  Icon,
  MaterialLayers,
  Meter,
  ProgressRing,
  Segmented,
  Slider,
  Tile,
  Toggle,
  kitClass,
  type KitRelief,
  type KitState,
  type KitTone,
  type MaterialShape,
  type MaterialSize,
} from '@/components/primitives';

/**
 * Classes of the composed families, read from the first material inside the specimen and kept
 * in sync when its state changes (e.g. a tile switched on).
 */
function useComposedClasses() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [classes, setClasses] = useState('');
  useLayoutEffect(() => {
    const target = ref.current?.querySelector('.aca-m, .aca-slider');
    if (!target) return undefined;
    const read = () =>
      setClasses(
        [...target.classList]
          .filter((name) => !name.startsWith('aca-m--') && !name.startsWith('is-'))
          .join(' ')
      );
    read();
    if (typeof MutationObserver === 'undefined') return undefined;
    const observer = new MutationObserver(read);
    observer.observe(target, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return [ref, classes] as const;
}

function Specimen({
  title,
  children,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const [ref, classes] = useComposedClasses();
  return (
    <figure className={['kit-spec', wide && 'kit-spec--wide'].filter(Boolean).join(' ')}>
      <div ref={ref} className="kit-spec__stage">
        {children}
      </div>
      <figcaption className="kit-spec__caption">
        <Caption>{title}</Caption>
        <code className="kit-spec__classes">{classes}</code>
      </figcaption>
    </figure>
  );
}

function Group({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section className="kit-section" aria-labelledby={id}>
      <Heading level={3} size="md" id={id}>
        {title}
      </Heading>
      {lead && (
        <Body size="sm" tone="muted" className="kit-lead">
          {lead}
        </Body>
      )}
      <div className="kit-specs">{children}</div>
    </section>
  );
}

const families: Array<[string, string]> = [
  ['Base', 'aca-m'],
  ['Rilievo', 'aca-raised · aca-well · aca-well-soft'],
  ['Forma', 'aca-pill · aca-circle · aca-rounded · aca-square · aca-card'],
  ['Misura', 'aca-sm · aca-md · aca-lg · aca-xl'],
  ['Tono', 'aca-tone-primary · aca-tone-quiet · aca-tone-danger'],
  ['Animazione', 'aca-fx-press · aca-fx-hover-light · aca-fx-wiggle'],
  ['Stato', 'aca-on · aca-current · aca-selected · aca-error (+ ARIA, disabilitato, aria-busy)'],
  ['Componente', 'aca-tile · aca-slider (--vertical, --column) · aca-meter · aca-toggle · …'],
];

const reliefs: KitRelief[] = ['raised', 'well', 'well-soft'];
const shapes: MaterialShape[] = ['pill', 'circle', 'rounded', 'square', 'card'];
const sizes: MaterialSize[] = ['sm', 'md', 'lg', 'xl'];
const tones: Array<KitTone | undefined> = [undefined, 'primary', 'quiet', 'danger'];
const states: Array<KitState | undefined> = [undefined, 'on', 'current', 'selected', 'error'];
const stateName = (state: KitState | undefined) => state ?? 'riposo';

/** A bare composed material (span), to show one family at a time. */
function Swatch({
  shape,
  relief = 'raised',
  label,
}: {
  shape: MaterialShape;
  relief?: KitRelief;
  label: string;
}) {
  const style: CSSProperties | undefined =
    shape === 'square'
      ? ({ '--aca-dim': '5rem' } as CSSProperties)
      : shape === 'card'
        ? { width: '10rem' }
        : undefined;
  return (
    <span className={kitClass({ relief, shape })} style={style}>
      <MaterialLayers>
        <span className="kit-spec__label">{label}</span>
      </MaterialLayers>
    </span>
  );
}

export default function CompositionGallery() {
  const [tiles, setTiles] = useState<Record<string, boolean>>({ a: true, b: false });
  const [power, setPower] = useState(true);
  const [horizontal, setHorizontal] = useState(40);
  const [bar, setBar] = useState(60);
  const [vertical, setVertical] = useState(55);
  const [thermo, setThermo] = useState(22);
  const [toggle, setToggle] = useState(true);
  const [mode, setMode] = useState<'auto' | 'heat' | 'cool'>('auto');

  return (
    <section className="kit-block" aria-labelledby="kit-composizione">
      <Heading level={2} size="lg" id="kit-composizione">
        Composizione
      </Heading>
      <Body size="sm" tone="muted" className="kit-lead">
        Il kit si compone per famiglie, una classe per famiglia, come le utility di Tailwind
        (ADR-0010). Sotto ogni esemplare ci sono le classi che lo compongono, lette dalla pagina. Le
        classi aca-m--* del primo kit restano come alias finché l'app non è migrata.
      </Body>

      <section className="kit-section" aria-labelledby="kit-famiglie">
        <Heading level={3} size="md" id="kit-famiglie">
          Famiglie
        </Heading>
        <dl className="kit-families">
          {families.map(([name, classes]) => (
            <div key={name} className="kit-families__row">
              <dt>
                <Body as="span" size="sm">
                  {name}
                </Body>
              </dt>
              <dd>
                <code className="kit-spec__classes">{classes}</code>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <Group
        id="kit-rilievo-forma"
        title="Rilievo × forma"
        lead="Solo base, rilievo e forma: nessuna animazione né stato."
      >
        {reliefs.flatMap((relief) =>
          shapes.map((shape) => (
            <Specimen key={`${relief}-${shape}`} title={`${relief} · ${shape}`}>
              <Swatch relief={relief} shape={shape} label={shape === 'circle' ? 'A' : 'Aa'} />
            </Specimen>
          ))
        )}
      </Group>

      <Group
        id="kit-misura"
        title="Misura"
        lead="Cambia solo la dimensione del testo; ombre, margini e raggi seguono in em. Le forme a misura fissa si allineano alla griglia di 4 px."
      >
        {sizes.map((size) => (
          <Specimen key={`pill-${size}`} title={`pill · ${size}`}>
            <Button variant="control" size={size}>
              Scena
            </Button>
          </Specimen>
        ))}
        {sizes.map((size) => (
          <Specimen key={`circle-${size}`} title={`circle · ${size}`}>
            <Button variant="control" shape="circle" size={size} aria-label="Accensione">
              <Icon name="power" size="sm" />
            </Button>
          </Specimen>
        ))}
      </Group>

      <Group
        id="kit-tono"
        title="Tono"
        lead="Il tono cambia faccia o inchiostro, mai le ombre: tutti gli stati restano uguali."
      >
        {tones.map((tone) => (
          <Specimen key={tone ?? 'neutral'} title={tone ?? 'neutro'}>
            <Button
              variant={
                tone === 'primary'
                  ? 'primary'
                  : tone === 'quiet'
                    ? 'secondary'
                    : tone === 'danger'
                      ? 'danger'
                      : 'control'
              }
              size="md"
            >
              {tone === 'danger' ? 'Rimuovi' : 'Conferma'}
            </Button>
          </Specimen>
        ))}
      </Group>

      <Group
        id="kit-animazione"
        title="Animazione"
        lead="Separata dal design: lo stesso riquadro con nessuna, una o più animazioni. Premi e passa con il mouse."
      >
        <Specimen title="nessuna">
          <span
            className={kitClass({ shape: 'square' }, 'aca-tile')}
            style={{ '--aca-dim': '5rem' } as CSSProperties}
          >
            <MaterialLayers>
              <Icon name="light" size="lg" />
              <span className="kit-spec__label">Statico</span>
            </MaterialLayers>
          </span>
        </Specimen>
        <Specimen title="press">
          <button
            type="button"
            className={kitClass({ shape: 'square', motion: ['press'] }, 'aca-tile')}
            style={{ '--aca-dim': '5rem' } as CSSProperties}
          >
            <MaterialLayers>
              <Icon name="light" size="lg" />
              <span className="kit-spec__label">Premi</span>
            </MaterialLayers>
          </button>
        </Specimen>
        <Specimen title="press + hover-light">
          <Tile icon="light" name="Premi" dim="5rem" />
        </Specimen>
        <Specimen title="wiggle (modifica)">
          <span
            className={kitClass({ shape: 'square', motion: ['wiggle'] }, 'aca-tile')}
            style={{ '--aca-dim': '5rem' } as CSSProperties}
          >
            <MaterialLayers>
              <Icon name="move" size="lg" />
              <span className="kit-spec__label">Sposta</span>
            </MaterialLayers>
          </span>
        </Specimen>
      </Group>

      <Group
        id="kit-stato"
        title="Stato"
        lead="Acceso (linea arancione), corrente (linea blu), selezionato (pressione morbida blu), errore (LED rosso), disabilitato."
      >
        {states.map((state) => (
          <Specimen key={`tile-${stateName(state)}`} title={`riquadro · ${stateName(state)}`}>
            <Tile icon="lamp" name="Lampada" dim="5rem" state={state} />
          </Specimen>
        ))}
        <Specimen title="riquadro · disabilitato">
          <Tile icon="lamp" name="Lampada" dim="5rem" disabled />
        </Specimen>
        {states.map((state) => (
          <Specimen key={`button-${stateName(state)}`} title={`pulsante · ${stateName(state)}`}>
            <Button variant="control" size="md" state={state}>
              Scena
            </Button>
          </Specimen>
        ))}
        <Specimen title="pulsante · caricamento">
          <Button variant="control" size="md" loading>
            Scena
          </Button>
        </Specimen>
      </Group>

      <Group
        id="kit-componenti"
        title="Componenti"
        lead="Primitive pronte, composte dalle famiglie. Sono interattive."
      >
        <Specimen title="Tile (spento / acceso)">
          <div className="kit-row">
            <Tile
              icon="tv"
              name="TV"
              dim="6rem"
              on={tiles.b}
              onClick={() => setTiles((t) => ({ ...t, b: !t.b }))}
            />
            <Tile
              icon="wifi"
              name="Wi-Fi"
              dim="6rem"
              on={tiles.a}
              onClick={() => setTiles((t) => ({ ...t, a: !t.a }))}
            />
          </div>
        </Specimen>
        <Specimen title="AddTile">
          <AddTile dim="6rem" />
        </Specimen>
        <Specimen title="Tasto tondo xl (Button circle)">
          <Button
            variant="control"
            shape="circle"
            size="xl"
            state={power && 'on'}
            aria-pressed={power}
            aria-label="Accensione"
            onClick={() => setPower((v) => !v)}
          >
            <Icon name="power" size="lg" />
          </Button>
        </Specimen>
        <Specimen title="Tasto di navigazione (rounded · current)">
          <div className="kit-row">
            <Button
              variant="control"
              shape="rounded"
              state="current"
              aria-current="page"
              aria-label="Pagine"
            >
              <Icon name="grid" size="md" />
            </Button>
            <Button variant="control" shape="rounded" aria-label="Impostazioni">
              <Icon name="settings" size="md" />
            </Button>
          </div>
        </Specimen>
        <Specimen title="Slider orizzontale con pomello" wide>
          <Slider
            label="Luminosità"
            value={horizontal}
            onValueChange={setHorizontal}
            valueText={`${horizontal}%`}
          />
        </Specimen>
        <Specimen title="Slider orizzontale a colonna (barra regolabile)" wide>
          <Slider
            label="Volume"
            variant="column"
            value={bar}
            onValueChange={setBar}
            valueText={`${bar}%`}
          />
        </Specimen>
        <Specimen title="Slider verticale con pomello">
          <div className="kit-spec__tall">
            <Slider
              label="Tapparella"
              orientation="vertical"
              value={vertical}
              onValueChange={setVertical}
              valueText={`${vertical}%`}
            />
          </div>
        </Specimen>
        <Specimen title="Termometro (slider verticale a colonna)">
          <div className="kit-spec__tall">
            <Slider
              label="Temperatura"
              orientation="vertical"
              variant="column"
              min={16}
              max={30}
              value={thermo}
              onValueChange={setThermo}
              valueText={`${thermo} °C`}
            />
          </div>
        </Specimen>
        <Specimen title="Meter orizzontale (sola lettura)" wide>
          <Meter label="Batteria" value={72} valueText="72%" />
        </Specimen>
        <Specimen title="Meter verticale (sola lettura)">
          <div className="kit-spec__tall">
            <Meter label="Serbatoio" orientation="vertical" value={35} valueText="35%" />
          </div>
        </Specimen>
        <Specimen title="Toggle">
          <Toggle
            checked={toggle}
            aria-label="Riscaldamento"
            onClick={() => setToggle((v) => !v)}
          />
        </Specimen>
        <Specimen title="Segmented" wide>
          <Segmented
            label="Modalità"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'heat', label: 'Caldo' },
              { value: 'cool', label: 'Freddo' },
            ]}
          />
        </Specimen>
        <Specimen title="Field" wide>
          <Field label="Cerca" icon="search" placeholder="Nome del dispositivo" />
        </Specimen>
        <Specimen title="ProgressRing">
          <ProgressRing label="Avanzamento" value={64}>
            <Body as="span" size="sm">
              64%
            </Body>
          </ProgressRing>
        </Specimen>
        <Specimen title="Badge su un tasto">
          <span className="kit-badge-host">
            <Button variant="control" shape="circle" aria-label="Notifiche, nuove">
              <Icon name="bell" size="sm" />
            </Button>
            <Badge />
          </span>
        </Specimen>
      </Group>
    </section>
  );
}
