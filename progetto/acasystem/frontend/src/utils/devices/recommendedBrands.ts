/**
 * The brands «Aggiungi un dispositivo» proposes first for each family of devices (plan
 * REP-20261027-003, T3): a tap starts that integration directly, skipping the catalogue. Data
 * only, so another family is one more entry. The handlers are the integrations the server knows
 * for the brand (`TV_BRANDS` in the backend); the label is what the person calls the brand.
 */
import type { DeviceFamily } from './classify';

export interface RecommendedBrand {
  /** Domain of the integration that is started. */
  handler: string;
  label: string;
}

export const RECOMMENDED_BRANDS: Readonly<
  Partial<Record<DeviceFamily, readonly RecommendedBrand[]>>
> = {
  tv: [
    { handler: 'samsungtv', label: 'Samsung' },
    { handler: 'webostv', label: 'LG' },
    { handler: 'androidtv_remote', label: 'Android TV / Google TV' },
    { handler: 'braviatv', label: 'Sony' },
    { handler: 'philips_js', label: 'Philips' },
    { handler: 'panasonic_viera', label: 'Panasonic' },
    { handler: 'apple_tv', label: 'Apple TV' },
    { handler: 'roku', label: 'Roku' },
  ],
  // The other families (REP-20261028-003, «prima il tipo, poi la marca»): integrations of Home
  // Assistant with a configuration flow (manifest `config_flow: true`, core at `336839fa`)
  // that ask for an address or an account, not for credentials of a developer (OAuth).
  sonos: [{ handler: 'sonos', label: 'Sonos' }],
  media: [
    { handler: 'cast', label: 'Google Cast' },
    { handler: 'heos', label: 'Denon HEOS' },
    { handler: 'yamaha_musiccast', label: 'Yamaha MusicCast' },
    { handler: 'bluesound', label: 'Bluesound' },
  ],
  light: [
    { handler: 'hue', label: 'Philips Hue' },
    { handler: 'wiz', label: 'WiZ' },
    { handler: 'lifx', label: 'LIFX' },
    { handler: 'nanoleaf', label: 'Nanoleaf' },
    { handler: 'yeelight', label: 'Yeelight' },
  ],
  plug: [
    { handler: 'shelly', label: 'Shelly' },
    { handler: 'tplink', label: 'TP-Link (Tapo, Kasa)' },
    { handler: 'tuya', label: 'Tuya / Smart Life' },
    { handler: 'fritzbox', label: 'FRITZ!' },
    { handler: 'switchbot', label: 'SwitchBot' },
  ],
  climate: [
    { handler: 'daikin', label: 'Daikin' },
    { handler: 'ecobee', label: 'ecobee' },
  ],
  sensor: [
    { handler: 'xiaomi_ble', label: 'Xiaomi (Bluetooth)' },
    { handler: 'switchbot', label: 'SwitchBot' },
  ],
  cover: [
    { handler: 'overkiz', label: 'Somfy TaHoma (Overkiz)' },
    { handler: 'motion_blinds', label: 'Motionblinds' },
  ],
  lock: [
    { handler: 'nuki', label: 'Nuki' },
    { handler: 'august', label: 'August' },
  ],
  camera: [
    { handler: 'reolink', label: 'Reolink' },
    { handler: 'onvif', label: 'ONVIF (altre marche)' },
    { handler: 'unifiprotect', label: 'UniFi Protect' },
    { handler: 'ring', label: 'Ring' },
  ],
  vacuum: [
    { handler: 'roborock', label: 'Roborock' },
    { handler: 'ecovacs', label: 'Ecovacs' },
    { handler: 'roomba', label: 'iRobot Roomba' },
    { handler: 'xiaomi_miio', label: 'Xiaomi' },
  ],
  alarm: [
    { handler: 'verisure', label: 'Verisure' },
    { handler: 'risco', label: 'Risco' },
  ],
};

/** The brands of a family, narrowed to `handlers` when the widget takes only some of them. */
export function recommendedBrands(
  family: DeviceFamily | null | undefined,
  handlers?: readonly string[]
): readonly RecommendedBrand[] {
  const brands = (family ? RECOMMENDED_BRANDS[family] : undefined) ?? [];
  return handlers ? brands.filter((brand) => handlers.includes(brand.handler)) : brands;
}
