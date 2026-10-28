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

export const RECOMMENDED_BRANDS: Readonly<Partial<Record<DeviceFamily, readonly RecommendedBrand[]>>> =
  {
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
  };

/** The brands of a family, narrowed to `handlers` when the widget takes only some of them. */
export function recommendedBrands(
  family: DeviceFamily | null | undefined,
  handlers?: readonly string[]
): readonly RecommendedBrand[] {
  const brands = (family ? RECOMMENDED_BRANDS[family] : undefined) ?? [];
  return handlers ? brands.filter((brand) => handlers.includes(brand.handler)) : brands;
}
