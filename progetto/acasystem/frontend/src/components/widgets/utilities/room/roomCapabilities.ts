import type { HassEntity, ServiceData } from '@/@types/ha';
import type { ServiceCatalog } from '../../adaptive/operationalProfile';
import { coverActionSupported, productCoverView } from '../../home/cover/productCoverModel';
import { fanPowerSupported, productFanView } from '../../home/fan/productFanModel';
import { mediaActionAllowed, productMediaView } from '../../home/media/productMediaModel';
import {
  productVacuumView,
  vacuumActionSupported,
  type PRODUCT_VACUUM_FEATURE,
} from '../../home/vacuum/productVacuumModel';
import { climateTargetCall, productClimateView } from '../../home/climate/productClimateModel';
import { productLockView, lockActionAllowed } from '../../home/lock/productLockModel';

const simpleToggle = new Set(['light', 'switch', 'input_boolean', 'automation']);
export function roomServiceAllowed(
  entity: HassEntity | undefined,
  services: ServiceCatalog | null,
  domain: string,
  service: string,
  data: ServiceData = {}
): boolean {
  if (
    !entity ||
    !entity.state ||
    ['unknown', 'unavailable'].includes(entity.state) ||
    !Object.hasOwn(services?.[domain] ?? {}, service)
  )
    return false;
  if (simpleToggle.has(domain)) {
    if (!['on', 'off'].includes(entity.state) || !['turn_on', 'turn_off'].includes(service))
      return false;
    if (data.brightness_pct !== undefined)
      return (
        domain === 'light' &&
        roomDimmable(entity) &&
        typeof data.brightness_pct === 'number' &&
        Number.isFinite(data.brightness_pct) &&
        data.brightness_pct >= 0 &&
        data.brightness_pct <= 100
      );
    return true;
  }
  if (domain === 'fan')
    return (
      (service === 'turn_on' || service === 'turn_off') &&
      fanPowerSupported(productFanView(entity), services, service === 'turn_on')
    );
  if (domain === 'cover') {
    const action =
      service === 'open_cover'
        ? 'open'
        : service === 'close_cover'
          ? 'close'
          : service === 'stop_cover'
            ? 'stop'
            : null;
    return action !== null && coverActionSupported(productCoverView(entity), services, action);
  }
  if (domain === 'media_player') {
    const view = productMediaView(entity);
    if (service === 'media_play_pause')
      return (
        Object.hasOwn(services?.media_player ?? {}, service) &&
        mediaActionAllowed(
          view,
          {
            ...services,
            media_player: {
              ...services?.media_player,
              media_play: {},
              media_pause: {},
            },
          },
          view.state === 'playing' ? 'media_pause' : 'media_play'
        )
      );
    return mediaActionAllowed(view, services, service);
  }
  if (domain === 'vacuum')
    return (
      ['start', 'pause', 'return_to_base'].includes(service) &&
      vacuumActionSupported(
        productVacuumView(entity),
        services,
        service as keyof typeof PRODUCT_VACUUM_FEATURE
      )
    );
  if (domain === 'lock') {
    const view = productLockView(entity);
    return (
      !view.requiresCode &&
      (service === 'lock' || service === 'unlock') &&
      lockActionAllowed(view, services, service)
    );
  }
  if (domain === 'climate') {
    const view = productClimateView(entity);
    if (service === 'set_hvac_mode')
      return typeof data.hvac_mode === 'string' && view.modes.includes(data.hvac_mode);
    if (service === 'set_temperature' && typeof data.temperature === 'number')
      return climateTargetCall(view, services, 'temperature', data.temperature) !== null;
    return false;
  }
  return (
    ((domain === 'scene' || domain === 'script') && service === 'turn_on') ||
    ((domain === 'button' || domain === 'input_button') && service === 'press')
  );
}
export function roomDimmable(entity: HassEntity | undefined): boolean {
  const modes = entity?.attributes.supported_color_modes;
  return (
    Array.isArray(modes) &&
    modes.some((mode) => typeof mode === 'string' && !['onoff', 'unknown'].includes(mode))
  );
}
