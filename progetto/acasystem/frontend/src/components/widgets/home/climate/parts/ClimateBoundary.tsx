import type { ReactNode } from 'react';
import type { CardSettings } from '@/@types/dashboard';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { displayName, settingEntity } from '../../shared/entity';
import { systemUnit } from '../../shared/units';
import { WidgetNotice } from '../../shared/WidgetShell';
import { readClimate, type ClimateView } from '../climateModel';
import { useClimateDetailsState, type ClimateDetailsState } from './useClimateDetailsState';

function ClimateStateHolder({
  name,
  view,
  settings,
  children,
}: {
  name: string;
  view: ClimateView;
  settings: CardSettings;
  children: (state: ClimateDetailsState) => ReactNode;
}) {
  return <>{children(useClimateDetailsState(name, view, settings))}</>;
}

/**
 * Resolves the thermostat of the widget: the notice when it is missing, otherwise the shared state
 * handed to `children` (the sheet and the console compose the same sections from it).
 */
export function ClimateBoundary({
  id,
  settings,
  children,
}: Pick<WidgetDetailsProps, 'id' | 'settings'> & {
  children: (state: ClimateDetailsState) => ReactNode;
}) {
  const { entities, customNames, haConfig } = useWidgetRuntime();
  const { entityId, entity } = settingEntity(entities, settings, 'climateId');
  const name = displayName(customNames, id, entity, entity && entityId ? entityId : 'Clima');
  if (!entityId || !entity) {
    return (
      <WidgetNotice
        icon="thermostat"
        title={name}
        message={
          entityId
            ? 'Il termostato non è più presente in Home Assistant.'
            : 'Scegli un termostato nelle impostazioni del widget.'
        }
        detail={entityId}
      />
    );
  }
  return (
    <ClimateStateHolder
      name={name}
      view={readClimate(entityId, entity, systemUnit(haConfig, 'temperature'))}
      settings={settings}
    >
      {children}
    </ClimateStateHolder>
  );
}
