/**
 * «UI kit» page at #/ui-kit (REP-20261007-004): prototypes and every component preview, not
 * wired to Home Assistant. The «Prototipi» tab rebuilds the Home and Temperature concept shared
 * by the user with the «Metallo» kit; the other tabs load the existing previews (kit gallery and
 * widget previews) with their simulated data. Nothing here sends a command.
 */
import { lazy, Suspense, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Body,
  Button,
  Caption,
  Display,
  Heading,
  Icon,
  IconText,
  Label,
  MaterialLayers,
  Numeric,
  Slider,
  Surface,
  AddTile,
  Tile,
  Title,
  materialClass,
  type IconName,
} from '@/components/primitives';
import { EditToolbar } from '@/components/system/edit/EditToolbar';
import { PageIndicator } from '@/components/system/page-indicator/PageIndicator';
import { StatusBar } from '@/components/system/status-bar/StatusBar';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { CoverPage } from '@/pages/cover/CoverPage';
import { LocationSection } from '@/pages/system/sections/LocationSection';
import { useFooterBand } from '@/templates/app-shell/footerBand';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import './uiKit.css';

/**
 * Every other tab is an existing preview, loaded on request with its own styles and simulated
 * data (each brings its own <main>). The Sistema preview is left out: it seeds the launcher
 * configuration in localStorage, which here is the real one of the bench.
 */
const galleries = {
  widgets: {
    label: 'Widget',
    Page: lazy(() => import('./WidgetDesignGallery')),
  },
  kit2: {
    label: 'Kit 2',
    Page: lazy(() => import('@/pages/kit2/Kit2Page')),
  },
  kit: {
    label: 'Kit Metallo',
    Page: lazy(() => import('./KitGallery')),
  },
  controls: {
    label: 'Controlli',
    Page: lazy(() => import('@/components/widgets/controls/preview/ControlsPreview')),
  },
  comfort: {
    label: 'Comfort',
    Page: lazy(() => import('./HomeGallery')),
  },
  media: {
    label: 'Media',
    Page: lazy(() => import('./MediaGallery')),
  },
  utilities: {
    label: 'Utilità',
    Page: lazy(() => import('@/components/widgets/utilities/preview/PreviewPage')),
  },
} as const;

type GalleryKey = keyof typeof galleries;
type Tab = 'prototypes' | GalleryKey;
type NavKey = 'home' | 'settings' | 'scenes' | 'alerts';

const navItems: Array<{ key: NavKey; icon: IconName; label: string }> = [
  { key: 'home', icon: 'grid', label: 'Pagine' },
  { key: 'settings', icon: 'settings', label: 'Impostazioni' },
  { key: 'scenes', icon: 'sun', label: 'Scene' },
  { key: 'alerts', icon: 'bell', label: 'Notifiche' },
];

/*
 * The prototypes are composed from kit primitives only (ADR-0010): Tile, AddTile, Button
 * (round key, steppers, navigation keys), Slider (horizontal, vertical column) and Meter.
 * uiKit.css holds only the page layout.
 */

/** Bottom navigation: four rounded keys, the current page with the blue line. */
function BottomNav({ current, onChange }: { current: NavKey; onChange: (key: NavKey) => void }) {
  return (
    <nav className="uik-nav" aria-label="Navigazione del prototipo">
      {navItems.map((item) => (
        <Button
          key={item.key}
          variant="control"
          shape="rounded"
          state={current === item.key && 'current'}
          aria-label={item.label}
          aria-current={current === item.key ? 'page' : undefined}
          onClick={() => onChange(item.key)}
        >
          <Icon name={item.icon} size="md" />
        </Button>
      ))}
    </nav>
  );
}

/** Round power key: the kit's circle in xl, orange line when on. */
function PowerKey({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <Button
      variant="control"
      shape="circle"
      size="xl"
      state={on && 'on'}
      aria-pressed={on}
      aria-label="Accensione"
      onClick={onToggle}
    >
      <Icon name="power" size="lg" />
    </Button>
  );
}

function HomePrototype() {
  const [nav, setNav] = useState<NavKey>('home');
  const [on, setOn] = useState<Record<string, boolean>>({ tv: false, wifi: false, clima: true });
  const flip = (key: string) => setOn((current) => ({ ...current, [key]: !current[key] }));
  const [target, setTarget] = useState(20);

  return (
    <Surface className="uik-phone" contentClassName="uik-phone__content">
      <header className="uik-phone__header">
        <Title level={2} tone="engraved">
          Principale
        </Title>
        <Icon name="profile" size="lg" />
      </header>
      <div className="uik-tiles">
        <Tile icon="tv" name="TV" on={on.tv} onClick={() => flip('tv')} />
        <Tile icon="wifi" name="Wi-Fi" on={on.wifi} onClick={() => flip('wifi')} />
        <Tile icon="thermostat" name="Temperatura" on={on.clima} onClick={() => flip('clima')} />
        <AddTile aria-label="Aggiungi un widget" />
      </div>
      <div className="uik-reading">
        <Label size="md">Temperatura</Label>
        <Display size="sm" as="span">
          {target} °C
        </Display>
      </div>
      <Slider
        label="Temperatura"
        value={target}
        min={16}
        max={30}
        onValueChange={setTarget}
        valueText={`${target} °C`}
      />
      <BottomNav current={nav} onChange={setNav} />
    </Surface>
  );
}

function TemperaturePrototype() {
  const [nav, setNav] = useState<NavKey>('home');
  const [power, setPower] = useState(true);
  const [turbo, setTurbo] = useState(false);
  const [target, setTarget] = useState(25);
  const step = (delta: number) => setTarget((value) => Math.min(30, Math.max(16, value + delta)));

  return (
    <Surface className="uik-phone" contentClassName="uik-phone__content">
      <header className="uik-phone__heading">
        <Title level={2} tone="engraved">
          Temperatura
        </Title>
        <Caption tone="muted">Soggiorno</Caption>
      </header>
      <div className="uik-climate">
        <div className="uik-climate__main">
          <Display size="lg" as="span" className="uik-climate__value">
            {target}
            <span className="uik-climate__unit">°C</span>
          </Display>
          <IconText icon="sun" tone="muted">
            20 °C fuori
          </IconText>
          <PowerKey on={power} onToggle={() => setPower((value) => !value)} />
          <div className="uik-steppers">
            <Button variant="control" shape="circle" aria-label="Abbassa" onClick={() => step(-1)}>
              <Icon name="minus" size="sm" />
            </Button>
            <Button variant="control" shape="circle" aria-label="Alza" onClick={() => step(1)}>
              <Icon name="add" size="sm" />
            </Button>
          </div>
          <div className="uik-climate__tiles">
            <Tile icon="clock" name="Timer" dim="5rem" />
            <Tile
              icon="energy"
              name="Turbo"
              dim="5rem"
              on={turbo}
              onClick={() => setTurbo((value) => !value)}
            />
          </div>
        </div>
        <Slider
          className="uik-climate__thermo"
          orientation="vertical"
          variant="column"
          label="Temperatura impostata"
          value={target}
          min={16}
          max={30}
          onValueChange={setTarget}
          valueText={`${target} °C`}
        />
      </div>
      <BottomNav current={nav} onChange={setNav} />
    </Surface>
  );
}

const coverRuntime = createFixtureRuntime({
  entities: fixtureEntities([
    fixtureEntity('weather.home', 'partlycloudy', {
      friendly_name: 'Casa',
      temperature: 18.6,
      temperature_unit: '°C',
    }),
  ]),
});

/**
 * The real status bar of the launcher, in a band like the footer's, with the page indicator
 * between its two pills (REP-20261013-002, ADR-0013): the clock, the connection and Sistema at
 * the left, «Modifica» at the right.
 */
function StatusBarSpecimen() {
  const footerRef = useRef<HTMLElement>(null);
  const [page, setPage] = useState(0);
  useFooterBand(footerRef);
  return (
    <div className="aca-shell uik-band-shell">
      <footer ref={footerRef} className="aca-shell__footer">
        <StatusBar
          time={new Date()}
          connection={{ phase: 'connected', label: 'Collegato' }}
          chips={[]}
          onEdit={() => undefined}
          onOpenSystem={() => undefined}
        />
        <PageIndicator labels={['Casa', 'Luci', 'Clima']} index={page} onChange={setPage} />
      </footer>
    </div>
  );
}

/** The real edit bars of the launcher footer: «+ Widget», «Pagine» and «Fine». */
function EditToolbarSpecimen() {
  const [editing, setEditing] = useState(true);
  return (
    <>
      <Button variant="control" onClick={() => setEditing((value) => !value)}>
        {editing ? 'Esci dalla modifica' : 'Entra in modifica'}
      </Button>
      <EditToolbar
        hidden={!editing}
        canAddWidget
        onAddWidget={() => undefined}
        onPages={() => undefined}
        onDone={() => setEditing(false)}
      />
    </>
  );
}

function Prototypes() {
  return (
    <>
      <section className="uik-block" aria-labelledby="uik-barra">
        <Heading level={2} size="lg" id="uik-barra">
          Barra di stato
        </Heading>
        <Body size="sm" tone="muted" className="uik-lead">
          La barra vera del launcher, nella fascia in basso: «Modifica» entra in modifica,
          l’ingranaggio apre Sistema.
        </Body>
        <div className="uik-bar-frame">
          <StatusBarSpecimen />
        </div>
        <Body size="sm" tone="muted" className="uik-lead">
          Le due barre di modifica in basso (REP-20261007-017): widget, pagine e «Fine».
        </Body>
        <div className="uik-bar-frame uik-edit-frame">
          <EditToolbarSpecimen />
        </div>
      </section>
      <section className="uik-block" aria-labelledby="uik-posizione">
        <Heading level={2} size="lg" id="uik-posizione">
          Posizione
        </Heading>
        <Body size="sm" tone="muted" className="uik-lead">
          La sezione Posizione di Sistema (REP-20261007-025). Qui il salvataggio è simulato.
        </Body>
        <div className="uik-bar-frame">
          <LocationSection
            home={{ lat: 40.8518, lon: 14.2681 }}
            canEdit
            onSave={() => new Promise((resolve) => setTimeout(resolve, 600))}
          />
        </div>
      </section>
      <section className="uik-block" aria-labelledby="uik-copertina">
        <Heading level={2} size="lg" id="uik-copertina">
          Copertina
        </Heading>
        <Body size="sm" tone="muted" className="uik-lead">
          La copertina vera dell'app (REP-20261007-010) in una cornice 16:9: orologio analogico con
          l'ora sotto, e calendario con il giorno della settimana colorato e il numero scuro.
        </Body>
        <div className="uik-cover-frame">
          {/* Sample weather source, so the weather card shows without Home Assistant. */}
          <WidgetRuntimeProvider value={coverRuntime}>
            <CoverPage />
          </WidgetRuntimeProvider>
        </div>
      </section>
      <section className="uik-block" aria-labelledby="uik-schermate">
        <Heading level={2} size="lg" id="uik-schermate">
          Principale e Temperatura
        </Heading>
        <Body size="sm" tone="muted" className="uik-lead">
          Il concept «Home» e «Temperature» condiviso il 2026-10-07, composto solo con le primitive
          del kit Metallo (ADR-0010): Tile, AddTile, Button tondo e arrotondato, Slider orizzontale
          e verticale a colonna. Il termometro si trascina e si usa da tastiera. Dati di esempio,
          nessun comando inviato. Tutte le varianti sono nella scheda «Kit Metallo».
        </Body>
        <div className="uik-screens">
          <HomePrototype />
          <TemperaturePrototype />
        </div>
      </section>
    </>
  );
}

function GalleryPage({ tab }: { tab: GalleryKey }) {
  const { Page } = galleries[tab];
  return <Page />;
}

/** Tab from the hash query (#/ui-kit?tab=controls), so a preview can be linked directly. */
function initialTab(search: string): Tab {
  const value = new URLSearchParams(search).get('tab');
  return value && value in galleries ? (value as GalleryKey) : 'prototypes';
}

export default function UiKitPage() {
  const location = useLocation();
  const [tab, setTab] = useState<Tab>(() => initialTab(location.search));

  return (
    <div className="uik-page">
      <header className="uik-header">
        <div className="uik-header__title">
          <Title tone="engraved">UI kit</Title>
          <Body tone="muted" size="sm">
            Prototipi e anteprime di tutti i componenti, <Numeric>#/ui-kit</Numeric>. Dati simulati:
            niente è collegato a Home Assistant.
          </Body>
        </div>
        <div className="uik-tabs" role="group" aria-label="Sezione">
          <Button
            variant="control"
            aria-pressed={tab === 'prototypes'}
            onClick={() => setTab('prototypes')}
          >
            Prototipi
          </Button>
          {(Object.keys(galleries) as GalleryKey[]).map((key) => (
            <Button
              key={key}
              variant="control"
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
            >
              {galleries[key].label}
            </Button>
          ))}
          <a className={materialClass({ behavior: 'press', size: 'sm' })} href="#/">
            <MaterialLayers>
              <Label>Torna all'app</Label>
            </MaterialLayers>
          </a>
        </div>
      </header>
      {tab === 'prototypes' ? (
        <main>
          <Prototypes />
        </main>
      ) : (
        <Suspense fallback={<Body tone="muted">Caricamento dell'anteprima…</Body>}>
          <GalleryPage tab={tab} />
        </Suspense>
      )}
    </div>
  );
}
