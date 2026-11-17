import { useEffect, useState } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import { Field } from '@/components/primitives';
import { energyPreferences } from '@/components/widgets/utilities/energy/energyModel';
import { FormRow, SheetSection } from './parts/Form';
import type { EnergyWidgetKind } from './EnergyBindingSection';

/** Display preferences only: source units remain authoritative; no subsidy or currency conversion. */
export function EnergyPreferencesSection({
  kind,
  settings,
  save,
}: {
  kind: EnergyWidgetKind;
  settings: CardSettings;
  save: (key: string, value: unknown) => void;
}) {
  const decimals = energyPreferences(settings).decimals;
  const [digits, setDigits] = useState(String(decimals));
  const [todayLabel, setTodayLabel] = useState(
    typeof settings.todayLabel === 'string' ? settings.todayLabel : ''
  );
  const [monthLabel, setMonthLabel] = useState(
    typeof settings.monthLabel === 'string' ? settings.monthLabel : ''
  );
  useEffect(() => {
    setDigits(String(decimals));
  }, [decimals]);
  useEffect(() => {
    setTodayLabel(typeof settings.todayLabel === 'string' ? settings.todayLabel : '');
  }, [settings.todayLabel]);
  useEffect(() => {
    setMonthLabel(typeof settings.monthLabel === 'string' ? settings.monthLabel : '');
  }, [settings.monthLabel]);
  return (
    <SheetSection title="Visualizzazione">
      <FormRow label="Decimali">
        {({ labelId }) => (
          <Field
            label="Decimali"
            aria-labelledby={labelId}
            type="number"
            min={0}
            max={6}
            step={1}
            value={digits}
            onChange={(event) => setDigits(event.target.value)}
            onBlur={() => {
              const value = digits.trim() ? Number(digits) : decimals;
              const next = Number.isFinite(value)
                ? Math.max(0, Math.min(6, Math.round(value)))
                : decimals;
              setDigits(String(next));
              if (next !== decimals) save('decimals', next);
            }}
          />
        )}
      </FormRow>
      {kind === 'cost' && (
        <>
          <FormRow label="Etichetta del costo di oggi">
            {({ labelId }) => (
              <Field
                label="Etichetta del costo di oggi"
                aria-labelledby={labelId}
                value={todayLabel}
                placeholder="Oggi"
                onChange={(event) => setTodayLabel(event.target.value)}
                onBlur={() => {
                  const next = todayLabel.trim() || null;
                  if (next !== (settings.todayLabel ?? null)) save('todayLabel', next);
                }}
              />
            )}
          </FormRow>
          <FormRow label="Etichetta del costo del mese">
            {({ labelId }) => (
              <Field
                label="Etichetta del costo del mese"
                aria-labelledby={labelId}
                value={monthLabel}
                placeholder="Questo mese"
                onChange={(event) => setMonthLabel(event.target.value)}
                onBlur={() => {
                  const next = monthLabel.trim() || null;
                  if (next !== (settings.monthLabel ?? null)) save('monthLabel', next);
                }}
              />
            )}
          </FormRow>
        </>
      )}
    </SheetSection>
  );
}
