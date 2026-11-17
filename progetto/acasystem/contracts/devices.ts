/** Contratti di trasporto /api/dispositivi, condivisi da server e browser. Solo tipi; nessuna dipendenza applicativa. */

export type DeviceFamily =
  | 'tv'
  | 'sonos'
  | 'media'
  | 'light'
  | 'plug'
  | 'climate'
  | 'sensor'
  | 'cover'
  | 'lock'
  | 'camera'
  | 'vacuum'
  | 'mower'
  | 'fan'
  | 'alarm';

export type IdentityState =
  | 'active'
  | 'missing'
  | 'unreadable'
  | 'expired'
  | 'rejected'
  | 'not_admin'
  | 'mismatch'
  | 'unreachable';

export type FlowFieldKind =
  | 'text'
  | 'password'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  /** A file the person picks; the answer is the id HA gave to the upload (`file` selector). */
  | 'file'
  /** A picture to scan (`qr_code` selector): shown, never answered. */
  | 'qr';

export type QrLevel = 'L' | 'M' | 'Q' | 'H';

export interface FlowFieldDto {
  name: string;
  kind: FlowFieldKind;
  required: boolean;
  label: string;
  hint?: string;
  default?: string | number | boolean;
  /** A text field that takes several lines. */
  multiline?: boolean;
  /** A text field for an address, an e-mail or a phone number (the keyboard and the format). */
  inputType?: 'url' | 'email' | 'tel';
  /** A choice that also takes a value of the person's own (HA `custom_value`). */
  allowCustom?: boolean;
  /**
   * Section (HA `expandable`) the field belongs to. `name` is then `section.field`; the answer is
   * nested again when it is sent to HA.
   */
  section?: string;
  sectionLabel?: string;
  /** The section itself is required: it is sent even if every field of it is left empty. */
  sectionRequired?: boolean;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  /** `file`: what the picker accepts (HTML `accept`: `.json,image/*`). */
  accept?: string;
  /** `qr`: the text to encode and the error correction HA asked for. */
  qr?: { data: string; level: QrLevel };
}

export interface FlowErrorDto {
  /** Field the error belongs to; null for an error of the whole step. */
  field: string | null;
  code: string;
  message: string;
}

export interface FlowFormDto {
  type: 'form';
  flowId: string;
  handler: string;
  stepId: string;
  title: string;
  description: string | null;
  waitSeconds: number | null;
  fields: FlowFieldDto[];
  errors: FlowErrorDto[];
}

export interface FlowMenuDto {
  type: 'menu';
  flowId: string;
  handler: string;
  stepId: string;
  title: string;
  description: string | null;
  options: { id: string; label: string }[];
}

export interface FlowProgressDto {
  type: 'progress';
  flowId: string;
  handler: string;
  stepId: string;
  title: string;
  /** Italian sentence for the wait. */
  description: string;
  /** Machine key of the task (`progress_action`), for the registry and the tests. */
  progressAction: string | null;
}

export interface FlowExternalDto {
  type: 'external';
  flowId: string;
  handler: string;
  stepId: string;
  title: string;
  description: string;
  /** Page to open in a new window; always http or https. */
  url: string;
}

export interface FlowAbortDto {
  type: 'abort';
  handler: string;
  reason: string;
  message: string;
}

export interface FlowCreatedStepDto {
  type: 'create_entry';
  handler: string;
  entryId: string;
  domain: string;
  title: string;
}

export type FlowOpenStepDto = FlowFormDto | FlowMenuDto | FlowProgressDto | FlowExternalDto;

export type FlowTerminalDto = FlowAbortDto | FlowCreatedStepDto;

export interface CatalogItem {
  domain: string;
  name: string;
  brand: string | null;
  integrationType: string | null;
  iotClass: string | null;
  /** Domain whose flow is started (a virtual integration is served by `supported_by`). */
  startDomain: string;
}

export interface CatalogEntryDto extends CatalogItem {
  startable: boolean;
  requiresInstaller: boolean;
}

export interface DiscoveredDeviceDto {
  flowId: string;
  handler: string;
  source: string;
  name: string;
  model: string | null;
  family: DeviceFamily | null;
  /** False when Acasystem cannot carry the flow to the end for a customer. */
  addable: boolean;
  /** Why not, in Italian; only when `addable` is false. */
  reason?: string;
}

export interface IgnoredDeviceDto {
  entryId: string;
  handler: string;
  name: string;
  family: DeviceFamily | null;
}

export interface PowerOptions {
  /** Sent by the person when HA and the network do not give it. */
  mac?: string | undefined;
  broadcastAddress?: string | undefined;
  broadcastPort?: number | undefined;
}

export interface PowerStatusDto {
  entryId: string;
  configured: boolean;
  /** True when the TV shows the turn-on feature; null when it could not be checked. */
  active: boolean | null;
  message: string | null;
  /** Where the MAC came from for this call; the value is never returned. */
  macSource?: 'home_assistant' | 'network' | 'user';
}

export type TvConfirmation = 'consenti' | 'pin' | 'codice' | 'nessuno';

export interface TvInReteDto<BrandKey extends string = string> {
  id: string;
  brandKey: BrandKey;
  brand: string;
  name: string;
  model: string | null;
  handler: string | null;
  conferma: TvConfirmation;
  collegabile: boolean;
  motivo?: string;
}

export interface DeviceDto {
  id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  areaId: string | null;
  areaName: string | null;
}

export interface EntryDto {
  entryId: string;
  domain: string;
  title: string;
  state: string;
  loaded: boolean;
  device: DeviceDto | null;
  /** Entities of the entry that are visible (the Wake on LAN button is hidden). */
  entities: string[];
  mediaPlayerEntityId: string | null;
  /** Power-on recipe state for a TV; null for other integrations. */
  power: { configured: boolean } | null;
  /** What to tell the person when the entry is not loaded (TV off, still starting); else null. */
  message: string | null;
}

export type FlowResponseDto = FlowOpenStepDto | FlowAbortDto | FlowCreatedDto;

export interface FlowSummaryDto {
  flowId: string;
  handler: string;
  stepId: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface DiscoveredListDto {
  devices: DiscoveredDeviceDto[];
}

export interface IgnoredListDto {
  devices: IgnoredDeviceDto[];
}

export interface TvListDto {
  tvs: TvInReteDto[];
}

export interface CatalogDto {
  items: CatalogEntryDto[];
  total: number;
  /** True in D1: only the flow handlers of HA are listed, without brands and translations. */
  degraded: boolean;
  message: string | null;
}

export interface StatusDto {
  user: { isAdmin: boolean };
  service: {
    state: IdentityState;
    active: boolean;
    message: string | null;
    /**
     * True when «Ripara il servizio» can fix the service by itself for this person: the app runs
     * on HA OS (Supervisor token), or the person is a Home Assistant administrator.
     */
    repairable: boolean;
    /** Installer only. */
    detail?: string;
    expiresAt?: string | null;
  };
  homeAssistant: {
    reachable: boolean;
    onboarded: boolean | null;
    /** Installer only. */
    version?: string | null;
    verified?: boolean;
  };
  features: { catalog: boolean; flows: boolean; power: boolean };
  /** Installer only. */
  warnings?: string[];
}

export interface ActionDto {
  id: number;
  at: string;
  user: string | null;
  userName: string | null;
  source: string;
  action: string;
  domain: string | null;
  entryId: string | null;
  outcome: string;
  code: string | null;
}

export interface FlowCreatedDto extends FlowCreatedStepDto {
  entry: EntryDto | null;
  pending: boolean;
}

export interface AreaDto {
  id: string;
  name: string;
}

export interface DeviceErrorInfo {
  /** HTTP status; 0 when the request did not reach the server. */
  status: number;
  code: string | null;
  /** Italian text that is safe to show. */
  message: string;
  field: string | null;
  flowId: string | null;
  retryAfterSeconds: number | null;
}

export type PowerSetupBody = PowerOptions;
