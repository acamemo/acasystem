import { useRef, useState } from 'react';
import { Body, Button, Heading } from '@/components/primitives';
import { WidgetDesignSpecimen, type SpecimenSnapshot } from './WidgetDesignSpecimen';
import { ADD_WIDGET_TYPES, WIDGET_CATEGORIES, categoryOf } from '@/templates/sheets/catalog';
import './widgetDesigns.css';

const COVER_DESIGNS = new Set([
  'calendar',
  'cover_calendar',
  'cover_clock',
  'weather',
  'cover_weather',
]);
// «Rileva dispositivi» lists real devices of Home Assistant: it has no simulated device to draw.
export const DESIGN_WIDGET_TYPES = ADD_WIDGET_TYPES.filter(
  (item) => !COVER_DESIGNS.has(item.type) && item.type !== 'rileva'
);

export default function WidgetDesignGallery() {
  const session = useRef(new Map<string, SpecimenSnapshot>());
  const [category, setCategory] = useState('all');
  const categories = WIDGET_CATEGORIES.filter(
    (item) =>
      (category === 'all' || item.id === category) &&
      DESIGN_WIDGET_TYPES.some((widget) => categoryOf(widget.type) === item.id)
  );
  return (
    <main className="uikw-gallery">
      <div className="uik-block">
        <Heading level={2} size="lg">
          Design dei widget
        </Heading>
        <Body size="sm" tone="muted" className="uik-lead">
          I {DESIGN_WIDGET_TYPES.length} widget da definire del catalogo, nello stile di Principale
          e Temperatura. Proposte grafiche con dati di esempio: i controlli si possono provare,
          senza collegare dispositivi. Orologio, data, calendario e meteo mantengono i componenti
          già realizzati nella Copertina, visibili nella scheda Prototipi.
        </Body>
        <div className="uikw-filters" role="group" aria-label="Categorie dei design">
          {[
            { id: 'all', label: 'Tutti' },
            ...WIDGET_CATEGORIES.filter((item) =>
              DESIGN_WIDGET_TYPES.some((widget) => categoryOf(widget.type) === item.id)
            ),
          ].map((item) => (
            <Button
              key={item.id}
              variant="control"
              aria-pressed={category === item.id}
              state={category === item.id && 'current'}
              onClick={() => setCategory(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
      {categories.map((category) => (
        <section className="uik-block" key={category.id} aria-labelledby={`uikw-${category.id}`}>
          <Heading level={2} size="md" id={`uikw-${category.id}`}>
            {category.label}
          </Heading>
          <div className="uikw-grid">
            {DESIGN_WIDGET_TYPES.filter((item) => categoryOf(item.type) === category.id).map(
              (item) => (
                <WidgetDesignSpecimen key={item.type} item={item} session={session.current} />
              )
            )}
          </div>
        </section>
      ))}
    </main>
  );
}
