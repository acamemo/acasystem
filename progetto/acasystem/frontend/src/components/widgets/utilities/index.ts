import type { IconName } from '@/components/primitives';
import type { PageKindDefinition, WidgetDefinition } from '@/@types/launcher';
import { CostWidget } from './energy/CostWidget';
import { CostDetails } from './energy/CostDetails';
import { NordpoolWidget } from './energy/NordpoolWidget';
import { NordpoolDetails } from './energy/NordpoolDetails';
import { CarWidget } from './car/CarWidget';
import { CarDetails } from './car/CarDetails';
import { MowerWidget, VacuumWidget } from './robots/RobotWidget';
import { VacuumDetails } from './robots/VacuumDetails';
import { MowerDetails } from './robots/MowerDetails';
import { RoomWidget } from './room/RoomWidget';
import { RoomDetails } from './room/RoomDetails';
import { SpacerWidget } from './spacer/SpacerWidget';
import { DiscoverWidget } from './discover/DiscoverWidget';
import { DiscoverDetails } from './discover/DiscoverDetails';
import { BatteryPage } from './fullpage/BatteryPage';
import { RoomsPage } from './fullpage/RoomsPage';

/** Icons of the add-widget sheet: names of the Icon primitive (checked by the type). */
const icon = (name: IconName): string => name;

/** Utility widgets (wave 2, B5): energy, car, robots, rooms and the separator. */
export const utilityWidgets: WidgetDefinition[] = [
  {
    type: 'cost',
    label: 'Costi energetici',
    icon: icon('wallet'),
    sizes: { min: { w: 2, h: 1 }, max: { w: 2, h: 2 }, default: { w: 2, h: 2 } },
    matches: (id) => id.startsWith('cost_card_'),
    Widget: CostWidget,
    Details: CostDetails,
  },
  {
    type: 'nordpool',
    label: 'Prezzo dell’energia',
    icon: icon('energy'),
    sizes: { min: { w: 2, h: 1 }, max: { w: 4, h: 2 }, default: { w: 2, h: 2 } },
    matches: (id) => id.startsWith('nordpool_card_'),
    Widget: NordpoolWidget,
    Details: NordpoolDetails,
  },
  {
    type: 'car',
    label: 'Auto',
    icon: icon('car'),
    sizes: { min: { w: 2, h: 1 }, max: { w: 2, h: 2 }, default: { w: 2, h: 2 } },
    matches: (id) => id === 'car' || id.startsWith('car_card_'),
    Widget: CarWidget,
    Details: CarDetails,
  },
  {
    type: 'vacuum',
    label: 'Aspirapolvere',
    icon: icon('vacuum'),
    sizes: { min: { w: 2, h: 1 }, max: { w: 2, h: 2 }, default: { w: 2, h: 2 } },
    matches: (id) => id.startsWith('vacuum.'),
    Widget: VacuumWidget,
    Details: VacuumDetails,
  },
  {
    type: 'mower',
    label: 'Tosaerba',
    icon: icon('mower'),
    sizes: { min: { w: 2, h: 1 }, max: { w: 2, h: 2 }, default: { w: 2, h: 2 } },
    matches: (id) => id.startsWith('lawn_mower.'),
    Widget: MowerWidget,
    Details: MowerDetails,
  },
  {
    type: 'room',
    label: 'Stanza',
    icon: icon('room'),
    sizes: { min: { w: 2, h: 1 }, max: { w: 2, h: 2 }, default: { w: 2, h: 2 } },
    matches: (id) => id.startsWith('room_card_'),
    Widget: RoomWidget,
    Details: RoomDetails,
  },
  {
    type: 'rileva',
    label: 'Rileva dispositivi',
    icon: icon('wifi'),
    sizes: { min: { w: 2, h: 2 }, max: { w: 4, h: 4 }, default: { w: 2, h: 2 } },
    matches: (id) => id.startsWith('rileva_card_'),
    Widget: DiscoverWidget,
    Details: DiscoverDetails,
  },
  {
    type: 'spacer',
    label: 'Separatore',
    icon: icon('grid'),
    sizes: { min: { w: 1, h: 1 }, max: { w: 8, h: 1 }, default: { w: 4, h: 1 } },
    matches: (id) => id.startsWith('spacer_card_'),
    Widget: SpacerWidget,
    // Only space: the launcher draws no kit frame around it.
    frameless: true,
  },
];

/** Special full pages of the legacy dashboard owned by this group. */
export const utilityPages: PageKindDefinition[] = [
  { kind: 'battery', label: 'Batterie', Page: BatteryPage },
  { kind: 'rooms', label: 'Stanze', Page: RoomsPage },
];
