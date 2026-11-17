// Compatibilità: i dati e gli algoritmi vivono nel dominio, il registry nell'adattatore.
export {
  BINDING_KEYS,
  categoryEntityId,
  CATEGORY_PAGES,
  isCategoryWidgetReady,
  isCategoryWidgetUnbound,
  categoryDeviceId,
} from '@/domain/launcher/categoryPages';
export type { PageSeed } from '@/domain/launcher/categoryPages';
export { categoryPageSeeds } from '@/utils/launcher/categoryModels';
