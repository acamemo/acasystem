import { ProductTvConsole } from './home/tv/ProductTvDetails';
import { ProductMediaConsole } from './home/media/ProductMediaDetails';
import { sensorProductBinding, multimediaProductBinding } from '@/utils/devices/productBinding';
import { ProductMowerConsole } from './home/mower/ProductMowerDetails';
import { ProductVacuumConsole } from './home/vacuum/ProductVacuumDetails';
import type { CardSettings } from '@/@types/dashboard';
import type { PageKind, PageKindDefinition, WidgetDefinition } from '@/@types/launcher';
import { casa3dPages } from './casa3d';
import { controlsPages, controlsWidgets } from './controls';
import { homePages, homeWidgets } from './home';
import { coverWidgets } from './home/cover';
import { ProductCoverConsole } from './home/cover/ProductCoverDetails';
import { ProductCameraConsole } from './home/camera/ProductCameraDetails';
import { ProductAlarmConsole } from './home/alarm/ProductAlarmDetails';
import { ProductLockConsole } from './home/lock/ProductLockDetails';
import { ProductFanConsole } from './home/fan/ProductFanDetails';
import { mediaPages, mediaWidgets } from './media';
import { utilityPages, utilityWidgets } from './utilities';
import { ADAPTIVE_WIDGET_TYPES } from './adaptive/widgetTypes';
import { isProductDeviceBinding } from '../../../../contracts/productDevice';

import { ProductSensorConsole } from './home/sensor/ProductSensorDetails';

const sensorProductDefinitions = new WeakMap<WidgetDefinition, WidgetDefinition>();
const multimediaProductDefinitions = new WeakMap<WidgetDefinition, WidgetDefinition>();
const adaptiveDefinitions = new WeakMap<WidgetDefinition, WidgetDefinition>();
const climateProductDefinitions = new WeakMap<WidgetDefinition, WidgetDefinition>();
const coverProductDefinitions = new WeakMap<WidgetDefinition, WidgetDefinition>();
const mowerProductDefinitions = new WeakMap<WidgetDefinition, WidgetDefinition>();
const vacuumProductDefinitions = new WeakMap<WidgetDefinition, WidgetDefinition>();
const cameraProductDefinitions = new WeakMap<WidgetDefinition, WidgetDefinition>();
const alarmProductDefinitions = new WeakMap<WidgetDefinition, WidgetDefinition>();
const lockProductDefinitions = new WeakMap<WidgetDefinition, WidgetDefinition>();
const fanProductDefinitions = new WeakMap<WidgetDefinition, WidgetDefinition>();

/**
 * Every widget definition, in matching order. The controls group goes last because it holds
 * the generic sensor fallback (settings.type sensor/entity/toggle), like the legacy registry.
 */
export const widgetDefinitions: readonly WidgetDefinition[] = [
  ...coverWidgets,
  ...homeWidgets,
  ...mediaWidgets,
  ...utilityWidgets,
  ...controlsWidgets,
];

export const pageKindDefinitions: readonly PageKindDefinition[] = [
  ...controlsPages,
  ...homePages,
  ...mediaPages,
  ...utilityPages,
  ...casa3dPages,
];

export function findWidgetDefinition(
  id: string,
  settings: CardSettings = {}
): WidgetDefinition | undefined {
  let definition = widgetDefinitions.find((definition) => definition.matches(id, settings));
  if (definition?.type === 'sensor' && sensorProductBinding(settings)) {
    let product = sensorProductDefinitions.get(definition);
    if (!product) {
      product = { ...definition, label: 'Sensori', Console: ProductSensorConsole, sizes: { ...definition.sizes, min: { w: 2, h: 2 } } };
      sensorProductDefinitions.set(definition, product);
    }
    definition = product;
  }
  const multimedia = multimediaProductBinding(settings);
  if (definition && multimedia && (multimedia.family === 'tv' ? ['androidTv', 'appleTv'].includes(definition.type)
    : ['mediaGroup', 'mediaPlayer'].includes(definition.type))) {
    let product = multimediaProductDefinitions.get(definition);
    if (!product) {
      product = { ...definition, Console: multimedia.family === 'tv' ? ProductTvConsole : ProductMediaConsole,
        sizes: { ...definition.sizes, min: { w: 2, h: 2 } } };
      multimediaProductDefinitions.set(definition, product);
    }
    definition = product;
  }
  if (definition?.type === 'climate' && isProductDeviceBinding(settings.productDevice)
    && settings.productDevice.family === 'climate' && settings.climateId === settings.productDevice.primaryEntityId) {
    let product = climateProductDefinitions.get(definition);
    if (!product) {
      product = { ...definition, sizes: { ...definition.sizes, min: { w: 2, h: 2 } } };
      climateProductDefinitions.set(definition, product);
    }
    definition = product;
  }
  if (definition?.type === 'cover' && isProductDeviceBinding(settings.productDevice)
    && settings.productDevice.family === 'cover' && settings.coverId === settings.productDevice.primaryEntityId) {
    let product = coverProductDefinitions.get(definition);
    if (!product) {
      product = { ...definition, Console: ProductCoverConsole, sizes: { ...definition.sizes, min: { w: 2, h: 2 } } };
      coverProductDefinitions.set(definition, product);
    }
    definition = product;
  }
  if (definition?.type === 'fan' && isProductDeviceBinding(settings.productDevice)
    && settings.productDevice.family === 'fan' && settings.bindingEntityId === settings.productDevice.primaryEntityId) {
    let product = fanProductDefinitions.get(definition);
    if (!product) {
      product = { ...definition, Console: ProductFanConsole, sizes: { ...definition.sizes, min: { w: 2, h: 2 } } };
      fanProductDefinitions.set(definition, product);
    }
    definition = product;
  }
  if (definition?.type === 'lock' && isProductDeviceBinding(settings.productDevice)
    && settings.productDevice.family === 'lock' && settings.lockId === settings.productDevice.primaryEntityId) {
    let product = lockProductDefinitions.get(definition);
    if (!product) {
      product = { ...definition, Console: ProductLockConsole, sizes: { ...definition.sizes, min: { w: 2, h: 2 } } };
      lockProductDefinitions.set(definition, product);
    }
    definition = product;
  }
  if (definition?.type === 'alarm' && isProductDeviceBinding(settings.productDevice)
    && settings.productDevice.family === 'alarm' && settings.alarmId === settings.productDevice.primaryEntityId) {
    let product = alarmProductDefinitions.get(definition);
    if (!product) {
      product = { ...definition, Console: ProductAlarmConsole, sizes: { ...definition.sizes, min: { w: 2, h: 2 } } };
      alarmProductDefinitions.set(definition, product);
    }
    definition = product;
  }
  if (definition?.type === 'mower' && isProductDeviceBinding(settings.productDevice)
    && settings.productDevice.family === 'mower' && settings.bindingEntityId === settings.productDevice.primaryEntityId) {
    let product = mowerProductDefinitions.get(definition);
    if (!product) {
      product = { ...definition, Console: ProductMowerConsole, sizes: { ...definition.sizes, min: { w: 2, h: 2 } } };
      mowerProductDefinitions.set(definition, product);
    }
    definition = product;
  }
  if (definition?.type === 'vacuum' && isProductDeviceBinding(settings.productDevice)
    && settings.productDevice.family === 'vacuum' && settings.bindingEntityId === settings.productDevice.primaryEntityId) {
    let product = vacuumProductDefinitions.get(definition);
    if (!product) {
      product = { ...definition, Console: ProductVacuumConsole, sizes: { ...definition.sizes, min: { w: 2, h: 2 } } };
      vacuumProductDefinitions.set(definition, product);
    }
    definition = product;
  }
  if (definition?.type === 'camera' && isProductDeviceBinding(settings.productDevice)
    && settings.productDevice.family === 'camera' && settings.cameraId === settings.productDevice.primaryEntityId) {
    let product = cameraProductDefinitions.get(definition);
    if (!product) {
      product = { ...definition, Console: ProductCameraConsole, sizes: { ...definition.sizes, min: { w: 2, h: 2 } } };
      cameraProductDefinitions.set(definition, product);
    }
    definition = product;
  }
  if (!definition || !ADAPTIVE_WIDGET_TYPES.has(String(settings.categoryWidgetType)))
    return definition;
  let adaptive = adaptiveDefinitions.get(definition);
  if (!adaptive) {
    adaptive = {
      ...definition,
      sizes: {
        min: definition.sizes.min,
        max: { w: Math.max(4, definition.sizes.max.w), h: Math.max(4, definition.sizes.max.h) },
        default: { w: 2, h: 2 },
      },
    };
    adaptiveDefinitions.set(definition, adaptive);
  }
  return adaptive;
}

export function findPageKindDefinition(kind: PageKind): PageKindDefinition | undefined {
  return pageKindDefinitions.find((definition) => definition.kind === kind);
}
