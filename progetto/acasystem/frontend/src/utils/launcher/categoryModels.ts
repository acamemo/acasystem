/** Adatta i modelli puri del launcher ai metadati del registry dell'app. */
import { findWidgetDefinition } from '@/components/widgets/registry';
import type { CardSettingsMap } from '@/@types/dashboard';
import type { BaseDeviceClass, LauncherGrids, LauncherLayout } from '@/@types/launcher';
import type { LayoutContext } from '@/utils/launcher/layout';
import {
  definitionForType as resolveDefinition,
  typeVisuals as resolveVisuals,
  type AddWidgetType,
} from '@/domain/launcher/catalog';
import { categoryPageSeeds as resolveSeeds, createCategoryWidgetSeed as resolveSeed, type PageSeed } from '@/domain/launcher/categoryPages';
import {
  categoryGrid as resolveGrid,
  categoryPageGeometry as resolveGeometry,
  upgradeCategoryGrids as upgradeGrids,
} from '@/domain/launcher/categoryPageGrid';

export * from '@/domain/launcher/catalog';
export * from '@/domain/launcher/categoryPages';

const resolveSizes = (id: string, settings: Parameters<typeof findWidgetDefinition>[1]) =>
  findWidgetDefinition(id, settings)?.sizes;

export const definitionForType = (type: AddWidgetType) => resolveDefinition(type, findWidgetDefinition);
export const typeVisuals = () => resolveVisuals(findWidgetDefinition);
export const createCategoryWidgetSeed = (type: string, uniqueId: string) =>
  resolveSeed(type, uniqueId, resolveSizes);
export const categoryPageSeeds = (categoryId: string, pageId: string) =>
  resolveSeeds(categoryId, pageId, resolveSizes);
export const categoryGrid = (seeds: readonly PageSeed[], base: BaseDeviceClass) =>
  resolveGrid(seeds, base, resolveSizes);
export const categoryPageGeometry = (categoryId: string, pageId: string, grids?: LauncherGrids) =>
  resolveGeometry(categoryId, pageId, resolveSizes, grids);
export const upgradeCategoryGrids = (layout: LauncherLayout, settings: CardSettingsMap, ctx: LayoutContext) =>
  upgradeGrids(layout, settings, ctx, resolveSizes);
