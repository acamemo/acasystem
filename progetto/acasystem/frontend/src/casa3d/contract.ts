/**
 * Contract between the Acasystem frontend and the Casa 3D bundle (ADR-0014, T3).
 *
 * These are the parts of the Home Assistant object that the Casa 3D package reads (see
 * `casa3d/src/types.ts`). The file has no imports on purpose: the casa3d workspace type-checks it
 * (`casa3d/src/hass-contract.test.ts`) and proves that `Casa3dHass` fits the type the bundle
 * expects, so the two copies cannot drift apart unnoticed.
 */

/** Floor of Home Assistant's floor registry. */
export interface Casa3dFloor {
  floor_id: string;
  name: string;
  level?: number | null;
}

export interface Casa3dArea {
  area_id: string;
  name: string;
  floor_id?: string | null;
}

/** Entry of the entity registry (display form) as the bundle reads it. */
export interface Casa3dEntityEntry {
  entity_id: string;
  name?: string | null;
  device_id?: string | null;
  area_id?: string | null;
  hidden?: boolean;
  entity_category?: 'config' | 'diagnostic' | null;
  translation_key?: string | null;
  display_precision?: number | null;
}

export interface Casa3dDevice {
  id: string;
  area_id?: string | null;
  name?: string | null;
  name_by_user?: string | null;
}

export interface Casa3dEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
}

export interface Casa3dConnection {
  subscribeMessage<T>(
    callback: (msg: T) => void,
    msg: Record<string, unknown>
  ): Promise<() => Promise<void>>;
}

/** The registries the adapter keeps: the same four the Home Assistant frontend shows. */
export interface Casa3dRegistries {
  areas: Record<string, Casa3dArea>;
  floors: Record<string, Casa3dFloor>;
  devices: Record<string, Casa3dDevice>;
  entities: Record<string, Casa3dEntityEntry>;
}

/** What a call of the view may add to a service call. */
export interface Casa3dCallOptions {
  ask?: boolean;
}

/** The `hass` object handed to the Casa 3D elements: read-only, but for the commands the host lets through (T7). */
export interface Casa3dHass {
  language: string;
  user: { is_admin: boolean; name: string };
  areas: Record<string, Casa3dArea>;
  floors: Record<string, Casa3dFloor>;
  entities: Record<string, Casa3dEntityEntry>;
  devices: Record<string, Casa3dDevice>;
  states: Record<string, Casa3dEntity>;
  config: {
    unit_system?: { temperature?: string; length?: string };
    latitude?: number;
    longitude?: number;
    time_zone?: string;
  };
  connection: Casa3dConnection;
  callWS<T>(msg: Record<string, unknown>): Promise<T>;
  /**
   * `options.ask`: the device is marked «ask first» in the plan, so the host asks the person before it
   * sends the command (the bundle never calls the browser's confirm(), T7).
   */
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    options?: Casa3dCallOptions
  ): Promise<unknown>;
}

/** What the view reports about its drawing context (`ContextEvent` of the bundle, T5). */
export interface Casa3dContextEvent {
  /**
   * lost: the browser took the context away; restored: it came back; failed: none could be made;
   * error: the view could not start for another reason (its code did not load, its data was refused).
   */
  state: 'lost' | 'restored' | 'failed' | 'error';
}

/** The statistics of the view, sent in the `stats` event while the host asks for them (`ViewerStats`, T5). */
export interface Casa3dStats {
  /** Frames per second while something moves; 0 at rest. */
  fps: number;
  /** What keeps the picture moving. */
  busy: string[];
  /** Slowest frame of the last measuring window (ms). */
  worstMs: number;
  /** Draw calls and triangles of the last frame. */
  calls: number;
  triangles: number;
  /** The Light level is active. */
  low: boolean;
  /** The level in use. */
  quality: 'light' | 'medium' | 'high';
  pixelRatio: number;
  gpu: string | null;
}
