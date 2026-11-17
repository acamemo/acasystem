import type { WidgetProps } from '@/@types/launcher';
import { Body, Button, Caption, Icon } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { WidgetContent, WidgetLoading } from '../../controls/shared/WidgetContent';
import { TvPowerKey, TvVolumeKey } from '../../media/parts/tv/TvFace';
import type { TvKind } from '../../media/model/tv';
import { ProductTvScope } from './ProductTvScope';
import { tvChannelName, tvChannelStatus, tvProductBinding } from './productTvModel';
import { useProductTvState } from './useProductTvState';
import './productTv.css';

function Identity({ name }: { name: string }) {
  return (
    <div className="product-tv__identity">
      <Icon name="tv" size="sm" />
      <Body as="span" size="sm" className="ctl-name ctl-clamp-2">
        {name}
      </Body>
    </div>
  );
}

function SingleTv({
  kind,
  name,
  openDetails,
  ...props
}: WidgetProps & { kind: TvKind; name: string; openDetails: () => void }) {
  const tv = useProductTvState(kind, { ...props, onClose: () => undefined });
  const tapToggle = kind === 'apple' && props.settings.tapAction === 'toggle';
  return (
    <WidgetContent
      name={name}
      size={props.size}
      editMode={props.editMode}
      onOpen={tapToggle ? tv.togglePower : openDetails}
      openLabel={tapToggle ? `${tv.view.isOn ? 'Spegni' : 'Accendi'} ${name}` : undefined}
    >
      {tapToggle ? (
        <Button
          variant="plain"
          className="product-tv__name-button"
          aria-label={`Dettagli: ${name}`}
          disabled={props.editMode}
          onClick={(event) => {
            event.stopPropagation();
            openDetails();
          }}
        >
          <Identity name={name} />
        </Button>
      ) : (
        <Identity name={name} />
      )}
      <Caption className="product-tv__status ctl-clamp-2" title={tv.statusLine}>
        {tv.view.entity?.state === 'unknown' ? 'Stato sconosciuto' : tv.statusLine}
      </Caption>
      <div className="product-tv__keys">
        {tv.powerSupported && (
          <TvPowerKey tv={tv} size="md" editMode={props.editMode || !tv.interactive} />
        )}
        <TvVolumeKey tv={tv} size="md" editMode={props.editMode || !tv.interactive} />
      </div>
    </WidgetContent>
  );
}

export function ProductTvWidget({
  kind,
  openDetails,
  ...props
}: WidgetProps & {
  kind?: TvKind;
  openDetails?: () => void;
}) {
  const runtime = useWidgetRuntime(),
    binding = tvProductBinding(props.settings);
  if (!runtime.entitiesLoaded) return <WidgetLoading size={props.size} />;
  if (!binding) return null;
  const name =
    runtime.customNames[props.id] ||
    (typeof props.settings.name === 'string' && props.settings.name) ||
    tvChannelName(binding.primaryEntityId, runtime.entities);
  const actualKind =
    kind ?? (props.settings.categoryWidgetType === 'appletv' ? 'apple' : 'android');
  const open = openDetails ?? (() => runtime.openDetails(props.id));
  return (
    <article
      className="product-tv"
      data-widget-type={actualKind === 'apple' ? 'appletv' : 'androidtv'}
      data-entity-id={binding.primaryEntityId}
      aria-label={name}
    >
      {binding.channelEntityIds.length > 1 ? (
        <WidgetContent name={name} size={props.size} editMode={props.editMode} onOpen={open}>
          <Identity name={name} />
          <div className="product-tv__summary">
            <Body size="sm">{binding.channelEntityIds.length} canali</Body>
            <Caption>
              {
                binding.channelEntityIds.filter(
                  (id) => tvChannelStatus(id, runtime.entities) === 'In riproduzione'
                ).length
              }{' '}
              in riproduzione
            </Caption>
          </div>
        </WidgetContent>
      ) : (
        <ProductTvScope
          settings={props.settings}
          binding={binding}
          active={binding.primaryEntityId}
        >
          {(settings) => (
            <SingleTv
              {...props}
              settings={settings}
              kind={actualKind}
              name={name}
              openDetails={open}
            />
          )}
        </ProductTvScope>
      )}
    </article>
  );
}
