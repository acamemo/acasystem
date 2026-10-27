import { ConsoleColumns } from '@/components/primitives';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { ClimateBoundary } from './parts/ClimateBoundary';
import {
  ClimateChoicesSection,
  ClimateHeadSection,
  ClimateModesSection,
  ClimateTargetSection,
} from './parts/ClimateSections';

/**
 * Content of the climate console (Console primitive): the sections of the sheet in two columns.
 * Left, the thermostat: current temperature, power and the target. Right, the choices: HVAC modes,
 * presets, fan and swing. On a narrow screen the columns stack in that order.
 */
export function ClimateConsole({ id, settings }: WidgetDetailsProps) {
  return (
    <ClimateBoundary id={id} settings={settings}>
      {(state) => (
        <ConsoleColumns
          main={
            <>
              <ClimateHeadSection state={state} large />
              <ClimateTargetSection state={state} />
            </>
          }
          side={
            <>
              <ClimateModesSection state={state} />
              <ClimateChoicesSection state={state} />
            </>
          }
        />
      )}
    </ClimateBoundary>
  );
}
