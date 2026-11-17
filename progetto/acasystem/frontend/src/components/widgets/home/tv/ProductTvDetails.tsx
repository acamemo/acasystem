import { useState, type ReactNode } from 'react';
import type { WidgetDetailsProps } from '@/@types/launcher';
import {
  Body,
  Caption,
  ConsoleColumns,
  Disclosure,
  DisclosureGroup,
} from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { AdaptiveCategoryWidget } from '../../adaptive/AdaptiveCategoryWidget';
import { DetailsBody, OptionPicker, Section, StatList } from '../../utilities/shared/details';
import { CommandStatus } from '../../media/parts/Controls';
import { TvPowerKey, TvVolumeKey, TvChannelKey } from '../../media/parts/tv/TvFace';
import {
  TvAppsSection,
  TvChooseSection,
  TvInputsSection,
  TvSoundOutputSection,
  TvSoundSection,
} from '../../media/parts/tv/TvChoices';
import { TvPlayer } from '../../media/parts/tv/TvPlayer';
import { TvRemote } from '../../media/parts/tv/TvRemote';
import { TvSteps } from '../../media/parts/tv/TvSteps';
import { TvPowerSetupAction, TvPowerSetupStep } from '../../media/parts/tv/TvPowerSetup';
import { TvLinkHint } from '../../media/parts/tv/TvLinkHint';
import { MEDIA_FEATURE, declares } from '../../media/model/features';
import type { TvKind } from '../../media/model/tv';
import { ProductTvScope } from './ProductTvScope';
import { tvChannelName, tvProductBinding } from './productTvModel';
import { useProductTvState } from './useProductTvState';
import './productTv.css';

function TvChannel({
  kind,
  usage,
  technical,
  ...props
}: WidgetDetailsProps & { kind: TvKind; usage: ReactNode; technical: ReactNode }) {
  const tv = useProductTvState(kind, props);
  if (tv.powerSetup.open) return <TvPowerSetupStep tv={tv} />;
  const enabled = tv.view.isOn && !tv.view.unavailable;
  return (
    <>
      <Section title={tv.view.deviceName}>
        <Body size="sm">
          {tv.view.entity?.state === 'unknown' ? 'Stato sconosciuto' : tv.statusLine}
        </Body>
        <div className="product-tv__keys">
          {tv.powerSupported && <TvPowerKey tv={tv} size="lg" editMode={!tv.interactive} />}
          <TvVolumeKey tv={tv} size="lg" editMode={!tv.interactive} />
          <TvChannelKey tv={tv} size="lg" editMode={!tv.interactive} />
        </div>
        <TvLinkHint guard={tv.castGuard} />
        <CommandStatus error={tv.failed} message={tv.notice} />
      </Section>
      {enabled && (
        <>
          <TvSteps tv={{ ...tv, config: { ...tv.config, remoteId: '' } }} />
          <TvRemote tv={tv} />
          <TvInputsSection tv={tv} />
          <TvSoundSection tv={tv} />
          <TvSoundOutputSection tv={tv} />
          {declares(tv.view.entity, MEDIA_FEATURE.PLAY_MEDIA) && <TvChooseSection tv={tv} />}
          <TvPlayer tv={{ ...tv, kind: 'android' }} />
        </>
      )}
      {!tv.view.unavailable &&
        (enabled || tv.powerSupported) &&
        (declares(tv.view.entity, MEDIA_FEATURE.SELECT_SOURCE) ||
          declares(tv.view.entity, MEDIA_FEATURE.PLAY_MEDIA)) && <TvAppsSection tv={tv} />}
      {usage}
      <DisclosureGroup>
        <Disclosure id={`${props.id}-tv-maintenance`} title="Tecnica e manutenzione">
          <TvPowerSetupAction tv={tv} />
          {tv.powerSetup.label && (
            <Caption>
              L'accensione dalla rete dipende dalle funzioni della TV e dalla configurazione Home
              Assistant.
            </Caption>
          )}
          {technical}
        </Disclosure>
      </DisclosureGroup>
    </>
  );
}

export function ProductTvDetails({ kind, ...props }: WidgetDetailsProps & { kind?: TvKind }) {
  const runtime = useWidgetRuntime(),
    binding = tvProductBinding(props.settings);
  const [selected, setSelected] = useState(binding?.primaryEntityId ?? '');
  if (!binding) return null;
  const active = binding.channelEntityIds.includes(selected) ? selected : binding.primaryEntityId;
  const actualKind =
    kind ?? (props.settings.categoryWidgetType === 'appletv' ? 'apple' : 'android');
  const technical = new Set(binding.technicalEntityIds ?? []);
  const readings = new Set([
    'sensor',
    'binary_sensor',
    'event',
    'update',
    'remote',
    'media_player',
  ]);
  const stats = (ids: string[]) =>
    ids.map((id) => {
      const entity = runtime.entities[id],
        available = entity && !['unknown', 'unavailable', ''].includes(entity.state);
      return {
        key: id,
        label: tvChannelName(id, runtime.entities),
        value: available ? entity.state : 'Non disponibile',
        unit:
          available && typeof entity.attributes.unit_of_measurement === 'string'
            ? entity.attributes.unit_of_measurement
            : undefined,
      };
    });
  const extra = (ids: string[]) =>
    ids.map((id) => (
      <Section key={id} title={tvChannelName(id, runtime.entities)}>
        <AdaptiveCategoryWidget
          type="sensor"
          entityId={id}
          id={id}
          settingsKey={props.settingsKey}
          settings={{ categoryWidgetType: 'sensor', bindingEntityId: id }}
          size={{ w: 4, h: 4 }}
          editMode={false}
          detailsMode
        />
      </Section>
    ));
  const secondary = binding.secondaryEntityIds.filter(
    (id) => !id.startsWith('remote.') || technical.has(id)
  );
  const usage = secondary.filter((id) => !technical.has(id));
  const isReading = (id: string) => readings.has(id.split('.')[0]!);
  return (
    <div className="product-tv-details">
      <DetailsBody label="TV del dispositivo">
        {binding.channelEntityIds.length > 1 && (
          <OptionPicker
            label="Canale TV"
            value={active}
            options={binding.channelEntityIds.map((id) => ({
              value: id,
              label: tvChannelName(id, runtime.entities),
            }))}
            onSelect={(id) => {
              if (binding.channelEntityIds.includes(id)) setSelected(id);
            }}
            isolateEscape
          />
        )}
        <ProductTvScope key={active} settings={props.settings} binding={binding} active={active}>
          {(settings) => (
            <TvChannel
              key={active}
              {...props}
              id={`${props.id}-${active.replace(/[^a-zA-Z0-9_-]/g, '-')}`}
              settings={settings}
              kind={actualKind}
              usage={
                <>
                  {usage.some(isReading) && (
                    <Section title="Misure">
                      <StatList items={stats(usage.filter(isReading))} />
                    </Section>
                  )}
                  {extra(usage.filter((id) => !isReading(id)))}
                </>
              }
              technical={
                <>
                  <StatList
                    items={stats(secondary.filter((id) => technical.has(id) && isReading(id)))}
                  />
                  {extra(secondary.filter((id) => technical.has(id) && !isReading(id)))}
                  <Caption>Dispositivo Home Assistant · {binding.deviceId}</Caption>
                </>
              }
            />
          )}
        </ProductTvScope>
      </DetailsBody>
    </div>
  );
}

export function ProductTvConsole(props: WidgetDetailsProps & { kind?: TvKind }) {
  return (
    <ConsoleColumns
      main={
        <div className="widget-console-details">
          <ProductTvDetails {...props} />
        </div>
      }
    />
  );
}
