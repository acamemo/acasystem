import { useMemo, useState } from 'react';
import { Body, Button, Caption, Field, Icon } from '@/components/primitives';
import { useDomId } from './hooks';
import { iconLabel, kitIcon, matchIcons, pickerIcons, shownIcon } from './iconChoices';
import '../sheets.css';

export interface IconPickerProps {
  /** Saved icon name (customIcons of a widget or icon of a page). */
  value: string | null | undefined;
  onSelect: (name: string) => void;
  /** Back to the default icon of the widget or page. */
  onClear?: () => void;
  label?: string;
}

/**
 * Icon selector on the metal kit: it offers the kit icons of the Icon primitive and saves their
 * names. A saved name outside the kit (legacy lucide or «mdi:» names) is left as it is: the
 * picker shows it with the fallback icon and says so, until another icon is chosen.
 */
export function IconPicker({ value, onSelect, onClear, label = 'Icona' }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const panelId = useDomId('icone');

  const choices = useMemo(() => pickerIcons(), []);
  const matching = useMemo(() => matchIcons(choices, query), [choices, query]);
  const current = kitIcon(value);
  const legacy = Boolean(value) && !current;
  const summary = current
    ? iconLabel(current)
    : legacy
      ? `«${value}», mostrata come generica`
      : 'Predefinita';

  const choose = (name: string) => {
    onSelect(name);
    setOpen(false);
  };

  return (
    <div className="aca-form-row">
      <Button
        variant="control"
        size="sm"
        className="aca-pick-row"
        contentClassName="aca-pick-row__content"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${label}: ${summary}`}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className="aca-icon-picker__current" aria-hidden="true">
          <Icon name={shownIcon(value)} size="md" />
        </span>
        <span className="aca-pick-row__text">
          <Body as="span" size="sm" className="aca-pick-row__title">
            {label}
          </Body>
          <Caption className="aca-pick-row__subtitle">{summary}</Caption>
        </span>
        <Caption>{open ? 'Chiudi' : 'Cambia'}</Caption>
        <Icon name="chevronDown" size="md" />
      </Button>

      {open && (
        <div id={panelId} className="aca-icon-picker">
          {legacy && (
            <Caption as="p">
              L’icona salvata «{value}» non fa parte del kit: resta salvata e compare con l’icona
              generica finché non ne scegli un’altra.
            </Caption>
          )}
          <Field
            label="Cerca un’icona"
            icon="search"
            type="search"
            placeholder="Per esempio lampada"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {onClear && (
            <Button
              variant="control"
              size="sm"
              aria-pressed={!value}
              onClick={() => {
                onClear();
                setOpen(false);
              }}
            >
              Usa l’icona predefinita
            </Button>
          )}
          {matching.length === 0 ? (
            <Caption as="p" className="aca-pick__empty">
              Nessuna icona per «{query.trim()}».
            </Caption>
          ) : (
            <div role="group" aria-label="Icone disponibili" className="aca-icon-picker__grid">
              {matching.map((choice) => (
                <Button
                  key={choice.name}
                  variant="control"
                  shape="rounded"
                  size="sm"
                  aria-pressed={current === choice.name}
                  aria-label={choice.label}
                  title={choice.label}
                  onClick={() => choose(choice.name)}
                >
                  <Icon name={choice.name} size="md" />
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
