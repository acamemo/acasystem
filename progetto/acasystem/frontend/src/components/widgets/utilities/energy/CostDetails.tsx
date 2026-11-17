import { useId, useState } from 'react';
import {
  Body,
  Caption,
  ConsoleColumns,
  Disclosure,
  DisclosureGroup,
} from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { EnergyHistory } from './EnergyHistory';
import { DetailsBody, OptionPicker, Section, StatList } from '../shared/details';
import { entityOf } from '../shared/entity';
import { readCostSettings } from './costData';
import { energyPreferences, energyReading, validatableEnergySourceIds } from './energyModel';
import './energy.css';

export function CostDetails({ settings }: WidgetDetailsProps) {
  const sectionId = useId();
  const runtime = useWidgetRuntime(),
    config = readCostSettings(settings),
    ids = validatableEnergySourceIds(settings),
    preferences = energyPreferences(settings);
  const sources = (
    [
      ['powerId', 'power', 'Potenza'],
      ['consumptionId', 'energy', 'Energia'],
      ['todayId', 'cost', config.todayLabel],
      ['monthId', 'cost', config.monthLabel],
    ] as const
  ).flatMap(([key, kind, label]) => {
    const id = ids[key];
    return settings[key] != null && settings[key] !== ''
      ? [
          {
            key,
            kind,
            id,
            label,
            entity: entityOf(runtime.entities, id),
            reading: energyReading(entityOf(runtime.entities, id), kind, preferences),
          },
        ]
      : [];
  });
  const [selected, setSelected] = useState<string | null>(null);
  const active = sources.find((source) => source.key === selected) ?? sources[0];
  return (
    <div className="energy-details">
      <DetailsBody label="Energia e consumi">
        {sources.length ? (
          <>
            <Section title="Letture">
              <StatList
                items={sources.map((source) => ({
                  key: source.key,
                  label: source.label,
                  value: source.id ? source.reading.valueText : 'Fonte incompatibile',
                  unit: source.reading.available ? (source.reading.unit ?? undefined) : undefined,
                  note: source.reading.reason ? (
                    <Caption>{source.reading.reason}</Caption>
                  ) : undefined,
                }))}
              />
            </Section>
            {sources.length > 1 && (
              <OptionPicker
                label="Fonte della cronologia"
                value={active?.key ?? null}
                options={sources.map((source) => ({ value: source.key, label: source.label }))}
                onSelect={setSelected}
                isolateEscape
              />
            )}
            {active?.entity && active.reading.status !== 'invalid' ? (
              <EnergyHistory
                key={active.id + '|' + active.key}
                entity={active.entity}
                initialHours={settings.adaptiveHistoryHours}
                kind={active.kind}
                preferences={preferences}
              />
            ) : (
              <Body size="sm">Cronologia non disponibile per la fonte selezionata.</Body>
            )}
          </>
        ) : (
          <Body size="sm">Scegli le fonti energetiche nelle impostazioni del widget.</Body>
        )}
        <DisclosureGroup>
          <Disclosure id={sectionId} title="Informazioni sulle fonti">
            <StatList
              items={sources.map((source) => ({
                key: source.key,
                label: source.label,
                value: source.reading.label,
                note: source.id ? <Caption>{source.id}</Caption> : undefined,
              }))}
            />
            <Caption>Valori forniti da Home Assistant. Nessuna somma o stima dei costi.</Caption>
            {preferences.currency && (
              <Caption>
                La valuta impostata non converte né sostituisce l’unità della fonte.
              </Caption>
            )}
          </Disclosure>
        </DisclosureGroup>
      </DetailsBody>
    </div>
  );
}

export function CostConsole(props: WidgetDetailsProps) {
  return (
    <ConsoleColumns
      main={
        <div className="widget-console-details">
          <CostDetails {...props} />
        </div>
      }
    />
  );
}
