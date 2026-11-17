import { ProductClimateDetails } from './ProductClimateDetails';
import { climateProductBinding } from './productClimateModel';
import type { WidgetDetailsProps } from '@/@types/launcher';
import { ClimateBoundary } from './parts/ClimateBoundary';
import {
  ClimateChoicesSection,
  ClimateHeadSection,
  ClimateModesSection,
  ClimateTargetSection,
} from './parts/ClimateSections';

export { SLIDER_COMMIT_DELAY_MS } from './parts/useClimateDetailsState';

/** The details sheet: the sections of the climate console in a single column. */
function LegacyClimateDetails({ id, settings }: WidgetDetailsProps) {
  return (
    <ClimateBoundary id={id} settings={settings}>
      {(state) => (
        <div className="home-details">
          <ClimateHeadSection state={state} />
          <ClimateTargetSection state={state} />
          <ClimateModesSection state={state} />
          <ClimateChoicesSection state={state} />
        </div>
      )}
    </ClimateBoundary>
  );
}

export function ClimateDetails(props: WidgetDetailsProps) {
  return climateProductBinding(props.settings) ? <ProductClimateDetails {...props} /> : <LegacyClimateDetails {...props} />;
}
