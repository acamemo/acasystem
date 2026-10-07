/**
 * «Kit 2» (REP-20261007-007): a soft-UI kit modelled on the neumorphism references shared by
 * the user, rebuilt with the project's code (no file of the ZIP, no external fonts or icons),
 * to compare it with the Metallo kit. Light/dark theme and accent are switchable; the page shows
 * every component and the Principale / Temperatura screens. Static sample data only.
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/primitives';
import '@/themes/kit2/tokens.css';
import '@/themes/kit2/components.css';
import './kit2.css';

type Theme = 'light' | 'dark';
type Accent = 'violet' | 'red' | 'cyan' | 'orange';

const accents: Array<{ key: Accent; label: string }> = [
  { key: 'violet', label: 'Viola' },
  { key: 'red', label: 'Rosso' },
  { key: 'cyan', label: 'Ciano' },
  { key: 'orange', label: 'Arancione Acasystem' },
];

const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

/* ── Components of Kit 2, composed from the families of components.css ── */

function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className="k2-el k2-switch"
      onClick={onToggle}
    />
  );
}

function Check({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="k2-el k2-check" aria-label={label}>
      <input type="checkbox" defaultChecked={defaultChecked} />
      <Icon name="ok" size={22} />
    </label>
  );
}

function Radio({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="k2-el k2-radio" aria-label={label}>
      <input type="radio" name={name} defaultChecked={defaultChecked} />
    </label>
  );
}

function Btn({
  children,
  accent = false,
  ...props
}: { children: ReactNode; accent?: boolean } & React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cx(
        'k2-el k2-rounded k2-fx-press k2-btn',
        accent ? 'k2-tone-accent' : 'k2-raised k2-fx-hover-accent'
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function IconBtn({
  icon,
  label,
  on = false,
  onClick,
}: {
  icon: IconName;
  label: string;
  on?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      className={cx(
        'k2-el k2-round k2-raised k2-fx-press k2-fx-hover-accent k2-iconbtn',
        on && 'k2-on'
      )}
      onClick={onClick}
    >
      <Icon name={icon} size={24} />
    </button>
  );
}

function Play() {
  const [playing, setPlaying] = useState(true);
  return (
    <div className={cx('k2-play-wrap', playing && 'is-playing')}>
      <span className="k2-play-wave" />
      <span className="k2-play-wave" />
      <button
        type="button"
        aria-label={playing ? 'Pausa' : 'Riproduci'}
        className="k2-el k2-round k2-fx-press k2-play"
        onClick={() => setPlaying((value) => !value)}
      >
        <Icon name={playing ? 'pause' : 'play'} size={36} />
      </button>
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const h = (now.getHours() % 12) * 30 + now.getMinutes() / 2;
  const m = now.getMinutes() * 6;
  const s = now.getSeconds() * 6;
  const hand = (deg: number) => ({ transform: `rotate(${deg}deg)` });
  return (
    <div
      className="k2-el k2-clock"
      role="img"
      aria-label={`Ore ${now.toLocaleTimeString('it-IT')}`}
    >
      <div className="k2-clock__dial">
        <span className="k2-clock__hand k2-clock__hand--h" style={hand(h)} />
        <span className="k2-clock__hand k2-clock__hand--m" style={hand(m)} />
        <span className="k2-clock__hand k2-clock__hand--s" style={hand(s)} />
        <span className="k2-clock__pin" />
      </div>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  const [shown, setShown] = useState(true);
  if (!shown) return <Btn onClick={() => setShown(true)}>Mostra il chip</Btn>;
  return (
    <span className="k2-el k2-rounded k2-raised k2-chip">
      <Icon name="appearance" size={20} className="k2-chip__icon" />
      {label}
      <button
        type="button"
        aria-label="Chiudi"
        className="k2-chip__close"
        onClick={() => setShown(false)}
      >
        <Icon name="close" size={18} />
      </button>
    </span>
  );
}

function Tabs() {
  const [current, setCurrent] = useState(0);
  return (
    <div className="k2-el k2-tabs" role="tablist" aria-label="Schede">
      {['Scheda 1', 'Scheda 2', 'Scheda 3'].map((label, index) => (
        <button
          key={label}
          type="button"
          role="tab"
          aria-selected={current === index}
          className={cx(
            'k2-el k2-flat k2-fx-hover-accent k2-tabs__item',
            current === index && 'k2-on'
          )}
          onClick={() => setCurrent(index)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Field({
  icon,
  placeholder,
  error = false,
}: {
  icon?: IconName;
  placeholder: string;
  error?: boolean;
}) {
  return (
    <label className={cx('k2-el k2-rounded k2-field', error && 'is-error')}>
      {icon && <Icon name={icon} size={24} />}
      <input
        type="text"
        placeholder={placeholder}
        aria-label={placeholder}
        aria-invalid={error || undefined}
      />
      {error && <Icon name="failed" size={22} />}
    </label>
  );
}

function Slider({
  value,
  onChange,
  label,
  min = 0,
  max = 100,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  min?: number;
  max?: number;
}) {
  const ratio = (value - min) / (max - min);
  return (
    <div className="k2-slider" style={{ '--k2-ratio': ratio } as CSSProperties}>
      <span className="k2-slider__track">
        <span className="k2-slider__fill" />
      </span>
      <span className="k2-slider__knob" />
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function Thermometer({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const ratio = (value - 16) / 14;
  return (
    <div className="k2-slider k2-slider--column" style={{ '--k2-ratio': ratio } as CSSProperties}>
      <span className="k2-slider__track">
        <span className="k2-slider__fill" />
      </span>
      <input
        type="range"
        min={16}
        max={30}
        value={value}
        aria-label="Temperatura impostata"
        aria-orientation="vertical"
        aria-valuetext={`${value} °C`}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function Tile({
  icon,
  name,
  on,
  onClick,
  dim,
}: {
  icon: IconName;
  name: string;
  on?: boolean;
  onClick?: () => void;
  dim?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={cx('k2-el k2-square k2-raised k2-fx-press k2-tile', on && 'k2-on')}
      style={dim ? ({ '--k2-dim': dim } as CSSProperties) : undefined}
      onClick={onClick}
    >
      <Icon name={icon} size={28} />
      <span className="k2-tile__name">{name}</span>
    </button>
  );
}

function AddTile({ dim }: { dim?: string }) {
  return (
    <button
      type="button"
      aria-label="Aggiungi un widget"
      className="k2-el k2-square k2-fx-press k2-fx-hover-accent k2-tile k2-tile--add"
      style={dim ? ({ '--k2-dim': dim } as CSSProperties) : undefined}
    >
      <Icon name="add" size={28} />
      <span className="k2-tile__name">Aggiungi</span>
    </button>
  );
}

const navItems: Array<{ icon: IconName; label: string }> = [
  { icon: 'grid', label: 'Pagine' },
  { icon: 'settings', label: 'Impostazioni' },
  { icon: 'sun', label: 'Scene' },
  { icon: 'bell', label: 'Notifiche' },
];

function Nav() {
  const [current, setCurrent] = useState(0);
  return (
    <nav className="k2p-nav" aria-label="Navigazione del prototipo">
      {navItems.map((item, index) => (
        <button
          key={item.label}
          type="button"
          aria-label={item.label}
          aria-current={current === index ? 'page' : undefined}
          className={cx(
            'k2-el k2-rounded k2-raised k2-fx-press k2-fx-hover-accent k2-nav',
            current === index && 'k2-on'
          )}
          onClick={() => setCurrent(index)}
        >
          <Icon name={item.icon} size={24} />
        </button>
      ))}
    </nav>
  );
}

/* ── Page ── */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="k2p-section">
      <h2 className="k2p-h2">{title}</h2>
      {children}
    </section>
  );
}

function Specimen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="k2p-spec">
      <div className="k2p-spec__stage">{children}</div>
      <figcaption className="k2p-caption">{label}</figcaption>
    </figure>
  );
}

function Components() {
  const [switches, setSwitches] = useState([false, true]);
  const [level, setLevel] = useState(45);
  const [icons, setIcons] = useState(0);
  return (
    <div className="k2-el k2-panel k2p-board">
      <div className="k2p-specs">
        <Specimen label="Switch">
          {switches.map((on, index) => (
            <Switch
              key={index}
              on={on}
              label={`Interruttore ${index + 1}`}
              onToggle={() => setSwitches((list) => list.map((v, i) => (i === index ? !v : v)))}
            />
          ))}
        </Specimen>
        <Specimen label="Orologio">
          <Clock />
        </Specimen>
        <Specimen label="Schede">
          <Tabs />
        </Specimen>
        <Specimen label="Checkbox">
          <Check label="Opzione 1" />
          <Check label="Opzione 2" defaultChecked />
        </Specimen>
        <Specimen label="Chip">
          <Chip label="Elemento soft UI" />
        </Specimen>
        <Specimen label="Campo di ricerca">
          <Field icon="search" placeholder="Cerca…" />
        </Specimen>
        <Specimen label="Radio">
          <Radio name="k2-radio" label="Scelta 1" defaultChecked />
          <Radio name="k2-radio" label="Scelta 2" />
        </Specimen>
        <Specimen label="Riproduzione">
          <Play />
        </Specimen>
        <Specimen label="Campo di testo, errore">
          <div className="k2p-stack">
            <Field placeholder="Scrivi qualcosa…" />
            <Field icon="key" placeholder="Codice errato" error />
          </div>
        </Specimen>
        <Specimen label="Pulsanti">
          <div className="k2p-stack">
            <Btn accent>Pulsante</Btn>
            <Btn>Pulsante</Btn>
          </div>
        </Specimen>
        <Specimen label="Pulsanti icona">
          {(['home', 'profile', 'settings'] as IconName[]).map((icon, index) => (
            <IconBtn
              key={icon}
              icon={icon}
              label={icon}
              on={icons === index}
              onClick={() => setIcons(index)}
            />
          ))}
        </Specimen>
        <Specimen label="Slider">
          <Slider label="Livello" value={level} onChange={setLevel} />
        </Specimen>
      </div>
    </div>
  );
}

function Screens() {
  const [on, setOn] = useState({ tv: false, wifi: false, clima: true });
  const [home, setHome] = useState(20);
  const [target, setTarget] = useState(25);
  const [power, setPower] = useState(true);
  const [turbo, setTurbo] = useState(false);
  return (
    <div className="k2p-screens">
      <div className="k2-el k2-panel k2p-phone">
        <header className="k2p-phone__header">
          <h3 className="k2p-title">Principale</h3>
          <Icon name="profile" size={28} className="k2p-accent" />
        </header>
        <div className="k2p-tiles">
          <Tile
            icon="tv"
            name="TV"
            on={on.tv}
            onClick={() => setOn((s) => ({ ...s, tv: !s.tv }))}
          />
          <Tile
            icon="wifi"
            name="Wi-Fi"
            on={on.wifi}
            onClick={() => setOn((s) => ({ ...s, wifi: !s.wifi }))}
          />
          <Tile
            icon="thermostat"
            name="Temperatura"
            on={on.clima}
            onClick={() => setOn((s) => ({ ...s, clima: !s.clima }))}
          />
          <AddTile />
        </div>
        <div className="k2p-reading">
          <span className="k2p-label">Temperatura</span>
          <span className="k2p-value">{home} °C</span>
        </div>
        <Slider label="Temperatura" min={16} max={30} value={home} onChange={setHome} />
        <Nav />
      </div>

      <div className="k2-el k2-panel k2p-phone">
        <header>
          <h3 className="k2p-title">Temperatura</h3>
          <span className="k2p-caption">Soggiorno</span>
        </header>
        <div className="k2p-climate">
          <div className="k2p-climate__main">
            <span className="k2p-big">
              {target}
              <span className="k2p-big__unit">°C</span>
            </span>
            <span className="k2p-outside">
              <Icon name="sun" size={20} /> 20 °C fuori
            </span>
            <button
              type="button"
              aria-pressed={power}
              aria-label="Accensione"
              className={cx('k2-el k2-round k2-raised k2-fx-press k2p-power', power && 'k2-on')}
              onClick={() => setPower((v) => !v)}
            >
              <Icon name="power" size={32} />
            </button>
            <div className="k2p-row">
              <IconBtn
                icon="minus"
                label="Abbassa"
                onClick={() => setTarget((v) => Math.max(16, v - 1))}
              />
              <IconBtn
                icon="add"
                label="Alza"
                onClick={() => setTarget((v) => Math.min(30, v + 1))}
              />
            </div>
            <div className="k2p-row">
              <Tile icon="clock" name="Timer" dim="88px" />
              <Tile
                icon="energy"
                name="Turbo"
                dim="88px"
                on={turbo}
                onClick={() => setTurbo((v) => !v)}
              />
            </div>
          </div>
          <Thermometer value={target} onChange={setTarget} />
        </div>
        <Nav />
      </div>
    </div>
  );
}

export default function Kit2Page() {
  const [theme, setTheme] = useState<Theme>('light');
  const [accent, setAccent] = useState<Accent>('violet');
  return (
    <div className="k2 k2p" data-theme={theme} data-accent={accent}>
      <header className="k2p-header">
        <div>
          <h1 className="k2p-h1">Kit 2</h1>
          <p className="k2p-lead">
            Soft UI sul modello delle reference neumorphism del 2026-10-07, riscritto con il codice
            del progetto e componibile per famiglie (k2-el, rilievo, forma, tono, animazione,
            stato). Da confrontare con il kit Metallo.
          </p>
        </div>
        <div className="k2p-controls">
          <div className="k2-el k2-tabs" role="group" aria-label="Tema">
            {(['light', 'dark'] as Theme[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={theme === key}
                className={cx('k2-el k2-flat k2-tabs__item', theme === key && 'k2-on')}
                onClick={() => setTheme(key)}
              >
                {key === 'light' ? 'Chiaro' : 'Scuro'}
              </button>
            ))}
          </div>
          <div className="k2p-swatches" role="group" aria-label="Colore d'accento">
            {accents.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-label={item.label}
                aria-pressed={accent === item.key}
                // Each swatch is its own .k2 scope with that accent, so it shows its colour.
                className={cx(
                  'k2 k2-el k2-round k2-raised k2-fx-press k2p-swatch',
                  accent === item.key && 'k2-on'
                )}
                data-accent={item.key}
                onClick={() => setAccent(item.key)}
              />
            ))}
          </div>
        </div>
      </header>
      <Section title="Componenti">
        <Components />
      </Section>
      <Section title="Principale e Temperatura">
        <Screens />
      </Section>
    </div>
  );
}
