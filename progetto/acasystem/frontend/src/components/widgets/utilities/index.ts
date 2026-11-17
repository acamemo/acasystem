import type { IconName } from '@/components/primitives';
import type { PageKindDefinition, WidgetDefinition } from '@/@types/launcher';
import { CostWidget } from './energy/CostWidget';
import { CostDetails, CostConsole } from './energy/CostDetails';
import { NordpoolWidget } from './energy/NordpoolWidget';
import { NordpoolDetails, NordpoolConsole } from './energy/NordpoolDetails';
import { CarWidget } from './car/CarWidget';
import { CarDetails, CarConsole } from './car/CarDetails';
import { MowerWidget, VacuumWidget } from './robots/RobotWidget';
import { VacuumDetails } from './robots/VacuumDetails';
import { VacuumConsole } from './robots/VacuumConsole';
import { MowerDetails } from './robots/MowerDetails';
import { RoomWidget } from './room/RoomWidget';
import { RoomDetails } from './room/RoomDetails';
import { RoomConsole } from './room/RoomConsole';
import { SpacerWidget } from './spacer/SpacerWidget';
import { DiscoverWidget } from './discover/DiscoverWidget';
import { DiscoverDetails } from './discover/DiscoverDetails';
import { ZigbeeWidget } from './zigbee/ZigbeeWidget';
import { ZigbeeDetails } from './zigbee/ZigbeeDetails';
import { BatteryPage } from './fullpage/BatteryPage';
import { RoomsPage } from './fullpage/RoomsPage';
import { TavanoWidget } from './tavano/TavanoWidget';
import { TavanoDetails } from './tavano/TavanoDetails';

/** Icons of the add-widget sheet: names of the Icon primitive (checked by the type). */
const icon = (name: IconName): string => name;

/** Utility widgets (wave 2, B5): energy, car, robots, rooms and the separator. */
export const utilityWidgets: WidgetDefinition[] = [
  {
    type: 'tavano', label: 'Tavano', icon: icon('menu'),
    sizes: { min: { w: 2, h: 1 }, max: { w: 4, h: 2 }, default: { w: 2, h: 1 } },
    matches: (id) => id.startsWith('tavano_card_'), Widget: TavanoWidget,
    Details: TavanoDetails, Console: TavanoDetails,
  },
  {
    type: 'cost',
    label: 'Energia e consumi',
    icon: icon('wallet'),
    sizes: { min: { w: 2, h: 1 }, max: { w: 2, h: 2 }, default: { w: 2, h: 2 } },
    matches: (id) => id.startsWith('cost_card_'),
    Widget: CostWidget,
    Details: CostDetails, Console: CostConsole,
  },
  {
    type: 'nordpool',
    label: 'Prezzo dell’energia',
    icon: icon('energy'),
    sizes: { min: { w: 2, h: 1 }, max: { w: 4, h: 2 }, default: { w: 2, h: 2 } },
    matches: (id) => id.startsWith('nordpool_card_'),
    Widget: NordpoolWidget,
    Details: NordpoolDetails, Console: NordpoolConsole,
  },
  {
    type: 'car',
    label: 'Auto',
    icon: icon('car'),
    sizes: { min: { w: 2, h: 1 }, max: { w: 2, h: 2 }, default: { w: 2, h: 2 } },
    matches: (id) => id === 'car' || id.startsWith('car_card_'),
    Widget: CarWidget,
    Details: CarDetails, Console: CarConsole,
  },
  {
    type: 'vacuum',
    label: 'Aspirapolvere',
    icon: icon('vacuum'),
    sizes: { min: { w: 2, h: 1 }, max: { w: 2, h: 2 }, default: { w: 2, h: 2 } },
    matches: (id) => id.startsWith('vacuum.'),
    Widget: VacuumWidget,
    Details: VacuumDetails,
    Console: VacuumConsole,
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
    Console: RoomConsole,
  },
  {
    type: 'rileva',
    label: 'Trova dispositivi',
    icon: icon('wifi'),
    sizes: { min: { w: 2, h: 2 }, max: { w: 4, h: 4 }, default: { w: 2, h: 2 } },
    matches: (id) => id.startsWith('rileva_card_'),
    Widget: DiscoverWidget,
    Details: DiscoverDetails,
  },
  {
    type: 'zigbee',
    label: 'Gateway Zigbee',
    icon: icon('server'),
    sizes: { min: { w: 2, h: 1 }, max: { w: 4, h: 2 }, default: { w: 2, h: 2 } },
    matches: (id) => id.startsWith('zigbee_card_'),
    Widget: ZigbeeWidget,
    Details: ZigbeeDetails,
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
