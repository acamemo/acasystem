import { useState, type CSSProperties } from 'react';
import {
  Badge,
  Body,
  Button,
  Caption,
  Display,
  Field,
  Heading,
  Icon,
  IconText,
  Label,
  MaterialLayers,
  Numeric,
  Popover,
  ProgressRing,
  Segmented,
  SelectTrigger,
  Sheet,
  Slider,
  Surface,
  Title,
  Toggle,
  materialClass,
  type IconName,
} from '@/components/primitives';
import StateMatrix from './StateMatrix';

type Period = 'week' | 'month';
type Order = 'name' | 'room' | 'recent';

const tiles: Array<{ icon: IconName; label: string; badge?: boolean }> = [
  { icon: 'chevronRight', label: 'Avanti' },
  { icon: 'chevronLeft', label: 'Indietro' },
  { icon: 'heart', label: 'Preferiti' },
  { icon: 'bag', label: 'Carrello, novità', badge: true },
  { icon: 'bell', label: 'Notifiche, nuove', badge: true },
  { icon: 'menu', label: 'Menu' },
];

/** Accent swatches: surface colour and the ink variants used on metal (contrast minima). */
const accents = [
  {
    name: 'Arancione',
    hex: '#ff622a',
    swatch: 'var(--aca-orange)',
    on: 'var(--aca-on-orange)',
    onLabel: 'Testo #202020, 5,5:1',
    role: 'Acceso, attivo, azione principale, riempimenti',
    tone: 'active' as const,
    inks: 'Testo #7b290b ≥ 4,7:1 · icone #a3380f ≥ 3,2:1',
  },
  {
    name: 'Blu elettrico',
    hex: '#295bff',
    swatch: 'var(--aca-blue)',
    on: 'var(--aca-on-blue)',
    onLabel: 'Testo bianco, 5,2:1',
    role: 'Focus, selezione, pagina corrente, informazioni',
    tone: 'info' as const,
    inks: 'Testo #1233b1 ≥ 4,7:1 · icone #1d48e5 ≥ 3,3:1',
  },
];

const orders: Array<{ value: Order; label: string }> = [
  { value: 'name', label: 'Nome' },
  { value: 'room', label: 'Stanza' },
  { value: 'recent', label: 'Uso recente' },
];

/** Development gallery of the «Metallo» kit: state matrix, accents, type, overlays, reference. */
export default function KitPage() {
  const [power, setPower] = useState(true);
  const [standby, setStandby] = useState(false);
  const [sync, setSync] = useState(true);
  const [pressedTiles, setPressedTiles] = useState<Record<string, boolean>>({
    'Notifiche attive': true,
    'Menu attivo': true,
  });
  const [deposit, setDeposit] = useState(38);
  const [fingerprint, setFingerprint] = useState(1);
  const [period, setPeriod] = useState<Period>('week');
  const [query, setQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [lamp, setLamp] = useState(true);
  const [brightness, setBrightness] = useState(64);
  const [order, setOrder] = useState<Order>('room');

  const togglePressed = (key: string) =>
    setPressedTiles((current) => ({ ...current, [key]: !current[key] }));

  return (
    <main className="kit-page">
      <header className="kit-header">
        <Title tone="engraved">Kit Metallo</Title>
        <Body tone="muted" className="kit-lead">
          Pagina di prova solo per lo sviluppo (ADR-0006, ADR-0007): ogni elemento è composto dai
          livelli del pulsante UI-003. Usa il mouse per hover e pressione, Tab per il focus.
        </Body>
      </header>

      <section className="kit-block" aria-labelledby="kit-matrice">
        <Heading level={2} size="lg" id="kit-matrice">
          Matrice degli stati
        </Heading>
        <Body size="sm" tone="muted" className="kit-lead">
          Hover, click e focus sono forzati dalle classi di anteprima, inserite negli stessi
          selettori del CSS; gli altri stati usano le proprietà reali. Su schermi senza hover la
          colonna Hover coincide con Riposo.
        </Body>
        <StateMatrix />
      </section>

      <section className="kit-block" aria-labelledby="kit-accenti">
        <Heading level={2} size="lg" id="kit-accenti">
          Accenti
        </Heading>
        <div className="kit-accents">
          {accents.map((accent) => (
            <Surface
              key={accent.name}
              className="kit-accent"
              contentClassName="kit-accent__content"
            >
              <span
                className="kit-accent__swatch"
                style={{ background: accent.swatch, color: accent.on }}
              >
                <Body as="span" size="sm">
                  {accent.onLabel}
                </Body>
              </span>
              <Heading level={3} size="md">
                {accent.name} <Numeric tone="muted">{accent.hex}</Numeric>
              </Heading>
              <Body size="sm">{accent.role}</Body>
              <Body size="sm" tone={accent.tone}>
                {accent.inks}
              </Body>
              <IconText
                icon="light"
                iconTone={accent.tone}
                tone="muted"
                className="kit-accent__icon"
              >
                Icona sul metallo
              </IconText>
            </Surface>
          ))}
        </div>
      </section>

      <section className="kit-block" aria-labelledby="kit-tipografia">
        <Heading level={2} size="lg" id="kit-tipografia">
          Tipografia
        </Heading>
        <Surface className="kit-type" contentClassName="kit-type__content">
          <div className="kit-type__row">
            <Caption>Display</Caption>
            <Display as="time" dateTime="18:42" size="lg">
              <Numeric>18:42</Numeric>
            </Display>
          </div>
          <div className="kit-type__row">
            <Caption>Titolo</Caption>
            <Title level={3}>Soggiorno</Title>
          </div>
          <div className="kit-type__row">
            <Caption>Intestazioni</Caption>
            <div>
              <Heading level={4} size="lg">
                Luci della zona giorno
              </Heading>
              <Heading level={4} size="md">
                Riscaldamento
              </Heading>
              <Heading level={4} size="sm">
                Sensori di presenza
              </Heading>
            </div>
          </div>
          <div className="kit-type__row">
            <Caption>Testo</Caption>
            <Body>
              Il testo corrente usa Inter a 1 rem con peso 400. La scala ha rapporto 1,2, solo i
              pesi 300, 400 e 500 e la maiuscola soltanto a inizio frase.
            </Body>
          </div>
          <div className="kit-type__row">
            <Caption>Etichetta</Caption>
            <Label size="md">Etichetta incisa</Label>
          </div>
          <div className="kit-type__row">
            <Caption>Cifre</Caption>
            <Display size="sm">
              <Numeric>8.989,30 €</Numeric> · <Numeric>21,5 °C</Numeric>
            </Display>
          </div>
          <div className="kit-type__row">
            <Caption>Icona e testo</Caption>
            <div className="kit-row">
              <IconText icon="info" iconTone="info" iconSize="sm">
                Aggiornato ora
              </IconText>
              <IconText icon="light" iconTone="active">
                3 luci accese
              </IconText>
              <IconText icon="warning" iconTone="danger" iconSize="lg" tone="danger">
                Sensore non raggiungibile
              </IconText>
            </div>
          </div>
        </Surface>
      </section>

      <section className="kit-block" aria-labelledby="kit-sovrapposti">
        <Heading level={2} size="lg" id="kit-sovrapposti">
          Foglio e popover
        </Heading>
        <div className="kit-row">
          <Button variant="control" size="md" onClick={() => setSheetOpen(true)}>
            <Icon name="light" size="md" />
            Apri il foglio
          </Button>
          <Popover
            label="Ordinamento"
            contentClassName="kit-menu"
            trigger={(props) => (
              <SelectTrigger
                label={`Ordina: ${orders.find((o) => o.value === order)?.label}`}
                aria-haspopup="dialog"
                {...props}
              />
            )}
          >
            {(close) =>
              orders.map((option) => (
                <Button
                  key={option.value}
                  variant="control"
                  size="sm"
                  className="kit-menu__item"
                  aria-pressed={option.value === order}
                  onClick={() => {
                    setOrder(option.value);
                    close();
                  }}
                >
                  {option.label}
                </Button>
              ))
            }
          </Popover>
        </div>
        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Luce del soggiorno"
          description="Regola accensione e luminosità."
          footer={
            <>
              <Button variant="secondary" size="md" onClick={() => setSheetOpen(false)}>
                Annulla
              </Button>
              <Button variant="primary" size="md" onClick={() => setSheetOpen(false)}>
                Salva
              </Button>
            </>
          }
        >
          <div className="kit-sheet-body">
            <div className="kit-sheet-line">
              <IconText icon="light" iconTone={lamp ? 'active' : undefined}>
                {lamp ? 'Accesa' : 'Spenta'}
              </IconText>
              <Toggle checked={lamp} onClick={() => setLamp((v) => !v)} aria-label="Accensione" />
            </div>
            <div>
              <div className="kit-sheet-line">
                <Caption>Luminosità</Caption>
                <Numeric>{brightness}%</Numeric>
              </div>
              <Slider
                value={brightness}
                onValueChange={setBrightness}
                label="Luminosità"
                valueText={`${brightness}%`}
              />
            </div>
            <Field label="Nome della luce" placeholder="Nome della luce" defaultValue="Lampada" />
          </div>
        </Sheet>
      </section>

      <section className="kit-block" aria-labelledby="kit-galleria">
        <Heading level={2} size="lg" id="kit-galleria">
          Galleria della reference
        </Heading>

        <div className="kit-section" aria-label="Interruttori, menu e schede">
          <div className="kit-stack">
            <Toggle
              checked={power}
              size="lg"
              onClick={() => setPower((v) => !v)}
              aria-label="Alimentazione"
            />
            <Toggle
              checked={standby}
              size="lg"
              onClick={() => setStandby((v) => !v)}
              aria-label="Standby"
            />
          </div>
          <div className="kit-stack">
            <SelectTrigger label="Menu a tendina" />
            <SelectTrigger label="Menu a tendina" expanded />
          </div>
          <Surface className="kit-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Caption as="p">Saldo del conto</Caption>
                <Display size="sm" tone="engraved">
                  <Numeric>8.989,30 €</Numeric>
                </Display>
              </div>
              <Toggle
                compact
                size="sm"
                checked={sync}
                onClick={() => setSync((v) => !v)}
                aria-label="Aggiornamento automatico"
              />
            </div>
            <svg className="kit-wave" viewBox="0 0 200 50" aria-hidden="true" focusable="false">
              <defs>
                <linearGradient id="kit-wave" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" style={{ stopColor: 'var(--aca-ink-muted)' }} />
                  <stop offset="100%" style={{ stopColor: 'var(--aca-ink-solid)' }} />
                </linearGradient>
              </defs>
              <path
                d="M2 34 C 22 18, 34 44, 52 30 S 82 22, 96 34 S 118 4, 132 10 S 146 44, 160 36 S 186 22, 198 28"
                fill="none"
                stroke="url(#kit-wave)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <div className="kit-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </Surface>
          <div className="kit-row">
            {[
              { icon: 'activity' as const, title: 'Yoga del mattino', caption: '1 ora al giorno' },
              { icon: 'coffee' as const, title: 'Meditazione', caption: '2 ore al giorno' },
            ].map((tile) => (
              <Button
                key={tile.title}
                variant="control"
                shape="card"
                size="md"
                className="kit-tile"
                contentClassName="kit-tile-content"
              >
                <Icon name={tile.icon} className="h-10 w-10" />
                <Label>{tile.title}</Label>
                <Caption>{tile.caption}</Caption>
              </Button>
            ))}
          </div>
        </div>

        <div className="kit-section" aria-label="Pulsanti icona, cursore e impronte">
          <div className="grid grid-cols-4 gap-5">
            {tiles.map((tile) => (
              <Button
                key={tile.label}
                variant="control"
                shape="rounded"
                size="md"
                aria-label={tile.label}
              >
                <span className="relative inline-flex">
                  <Icon name={tile.icon} size="md" />
                  {tile.badge && <Badge />}
                </span>
              </Button>
            ))}
            {(['Notifiche attive', 'Menu attivo'] as const).map((label) => (
              <Button
                key={label}
                variant="control"
                shape="rounded"
                size="md"
                aria-label={label}
                aria-pressed={!!pressedTiles[label]}
                onClick={() => togglePressed(label)}
              >
                <span className="relative inline-flex">
                  <Icon name={label === 'Menu attivo' ? 'menu' : 'bell'} size="md" />
                  {label !== 'Menu attivo' && <Badge />}
                </span>
              </Button>
            ))}
          </div>
          <Surface className="kit-card">
            <Caption as="p">Acconto</Caption>
            <Display size="sm" tone="engraved">
              <Numeric>98.000 €</Numeric>
            </Display>
            <Caption as="p" className="mt-1 mb-4">
              L’acconto va saldato entro 12 mesi dall’acquisto.
            </Caption>
            <Slider
              value={deposit}
              onValueChange={setDeposit}
              label="Percentuale dell’acconto"
              valueText={`${deposit}%`}
              size="sm"
            />
            <div className="mt-2 flex justify-between">
              <Caption>
                <Numeric>0%</Numeric>
              </Caption>
              <Caption>
                <Numeric>100%</Numeric>
              </Caption>
            </div>
          </Surface>
          <div className="kit-row">
            {[0, 1].map((index) => (
              <Button
                key={index}
                variant="control"
                shape="card"
                size="md"
                className="kit-tile"
                contentClassName="kit-tile-content"
                aria-pressed={fingerprint === index}
                onClick={() => setFingerprint(index)}
              >
                <Caption>Impronta {index + 1}</Caption>
                <Icon name="fingerprint" className="h-14 w-14" />
              </Button>
            ))}
          </div>
        </div>

        <div
          className="kit-section items-center"
          aria-label="Condivisione, pulsanti rotondi e anello"
        >
          <Button variant="control" size="md" contentClassName="gap-3" aria-label="Condividi">
            <span
              className={materialClass({ behavior: 'well', shape: 'circle', size: 'inherit' })}
              style={{ '--aca-dim': '2.25em' } as CSSProperties}
            >
              <MaterialLayers>
                <Icon name="share" size="md" />
              </MaterialLayers>
            </span>
            Condividi
          </Button>
          <div className="kit-row">
            <Button
              variant="control"
              shape="circle"
              size="lg"
              className="kit-circle"
              aria-label="Caffè"
            >
              <Icon name="coffee" size="md" />
            </Button>
            <Button
              variant="control"
              shape="circle"
              size="lg"
              className="kit-circle"
              aria-label="Portafoglio"
            >
              <Icon name="wallet" size="md" />
            </Button>
            {['6', '8', '9'].map((digit) => (
              <Button key={digit} variant="control" shape="circle" size="lg" className="kit-circle">
                {digit}
              </Button>
            ))}
          </div>
          <ProgressRing value={65} label="Attività in corso: 23 mila passi">
            <Display as="span" size="sm" tone="engraved">
              <Numeric>23k</Numeric>
            </Display>
            <Caption>in corso</Caption>
          </ProgressRing>
        </div>

        <div className="kit-section items-center" aria-label="Periodo e ricerca">
          <Segmented<Period>
            label="Periodo"
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'week', label: 'Questa settimana' },
              { value: 'month', label: 'Questo mese' },
            ]}
          />
          <Field
            label="Cerca"
            icon="search"
            placeholder="Cosa stai cercando?"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            containerClassName="w-full max-w-sm"
          />
        </div>
      </section>
    </main>
  );
}
