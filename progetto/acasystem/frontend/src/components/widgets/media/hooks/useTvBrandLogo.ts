import { useBrandLogo } from '../../utilities/discover/useBrandLogo';
import { tvBrandDomains, type TvView } from '../model/tv';

/**
 * The logo of the brand of a TV (object URL, the cache of `useBrandLogo`), or null to keep the TV
 * icon. The maker's logo is asked first where the integration is generic; the integration's is
 * asked only when the maker has none.
 */
export function useTvBrandLogo(view: TvView): string | null {
  const { maker, platform } = tvBrandDomains(view.entity);
  const makerLogo = useBrandLogo(maker, 'tv');
  const askPlatform = !maker || (makerLogo.settled && !makerLogo.url);
  const platformLogo = useBrandLogo(askPlatform ? platform : '', 'tv');
  return makerLogo.url ?? platformLogo.url;
}
