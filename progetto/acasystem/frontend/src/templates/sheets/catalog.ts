// Compatibilità: i dati e gli algoritmi vivono nel dominio, il registry nell'adattatore.
export {
  ADD_WIDGET_GROUPS,
  ADD_WIDGET_TYPES,
  candidateEntityIds,
  temperatureSensorIds,
  WIDGET_CATEGORIES,
  categoryOf,
} from '@/domain/launcher/catalog';
export type {
  AddWidgetFlow,
  AddWidgetGroup,
  AddWidgetType,
  TypeVisual,
  WidgetCategoryId,
} from '@/domain/launcher/catalog';
export { definitionForType, typeVisuals } from '@/utils/launcher/categoryModels';
