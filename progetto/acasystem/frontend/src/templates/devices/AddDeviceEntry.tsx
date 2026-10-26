import { Body, Button, Caption, Icon } from '@/components/primitives';
import { deviceTexts } from './deviceTexts';

/**
 * The way into «Aggiungi un dispositivo» (D-D1, D-D2): one row under the list of the devices
 * Home Assistant already has, in «Collega» and in «Aggiungi un widget».
 */
export function AddDeviceEntry({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="control"
      size="sm"
      className="aca-pick-row"
      contentClassName="aca-pick-row__content"
      onClick={onClick}
    >
      <span className="aca-pick-row__text">
        <Body as="span" size="sm" className="aca-pick-row__title">
          {deviceTexts.addDevice}
        </Body>
        <Caption className="aca-pick-row__subtitle">{deviceTexts.addDeviceHint}</Caption>
      </span>
      <Icon name="widgetAdd" size="md" />
    </Button>
  );
}
