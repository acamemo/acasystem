/**
 * Answers of the device facade (`/api/dispositivi`, ADR-0021 and ADR-0022), as the browser sees
 * them. Copied by hand from the DTOs of the server: backend/src/services/devices/deviceService.ts,
 * flowModel.ts, catalog.ts and powerRecipe.ts. Keep the two in step: a test compares the keys
 * that the screens read (DevicesApi.test.ts).
 */

import type { DeviceFamily } from '@/utils/devices/classify';

export type FlowFieldKind =
  'text' | 'password' | 'integer' | 'number' | 'boolean' | 'select' | 'multiselect';

export interface FlowFieldDto {
  name: string;
  kind: FlowFieldKind;
  required: boolean;
  label: string;
  hint?: string;
  default?: string | number | boolean;
  /** A text field that takes several lines. */
  multiline?: boolean;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
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
  /** Seconds the person is asked to wait at the TV (pairing). */
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
  progressAction: string | null;
}

/** A step that continues on another site (the login of the maker's cloud, OAuth). */
export interface FlowExternalDto {
  type: 'external';
  flowId: string;
  handler: string;
  stepId: string;
  title: string;
  description: string;
  /** Page to open in a new window; the server only sends http and https. */
  url: string;
}

export interface FlowAbortDto {
  type: 'abort';
  handler: string;
  reason: string;
  message: string;
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
  entities: string[];
  mediaPlayerEntityId: string | null;
  /** Power-on recipe state for a TV; null for other integrations. */
  power: { configured: boolean } | null;
  /** What to tell the person when the entry is not loaded; else null. */
  message: string | null;
}

export interface FlowCreatedDto {
  type: 'create_entry';
  handler: string;
  entryId: string;
  domain: string;
  title: string;
  entry: EntryDto | null;
  /** True while the entry is not described yet or not loaded. */
  pending: boolean;
}

export type FlowOpenStepDto = FlowFormDto | FlowMenuDto | FlowProgressDto | FlowExternalDto;
export type FlowResponseDto = FlowOpenStepDto | FlowAbortDto | FlowCreatedDto;

/** A device that Home Assistant found on the network and nobody added yet (`GET /scoperti`). */
export interface DiscoveredDeviceDto {
  flowId: string;
  handler: string;
  /** `zeroconf`, `ssdp`, `dhcp`... */
  source: string;
  name: string;
  model: string | null;
  /** Family of the integration, when the server knows it. */
  family: DeviceFamily | null;
  /** False when Acasystem cannot carry the flow to the end for a customer. */
  addable: boolean;
  /** Why not, in Italian; only when `addable` is false. */
  reason?: string;
}

/** What the television asks of the person while it is connected. */
export type TvConfirmation = 'consenti' | 'pin' | 'codice' | 'nessuno';

/** A television Home Assistant saw on the network (`GET /tv-in-rete`): no address, no MAC. */
export interface TvInReteDto {
  /** Opaque id; `POST /tv-in-rete/:id/collega` starts the connection. */
  id: string;
  /** Machine key of the maker (`samsung`, `lg`, `amazon`...), for the icon. */
  brandKey: string;
  brand: string;
  name: string;
  model: string | null;
  handler: string | null;
  conferma: TvConfirmation;
  /** False when the maker needs something Acasystem cannot do for a customer. */
  collegabile: boolean;
  /** Why not, in Italian; only when `collegabile` is false. */
  motivo?: string;
}

export interface FlowSummaryDto {
  flowId: string;
  handler: string;
  stepId: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface CatalogEntryDto {
  domain: string;
  name: string;
  brand: string | null;
  integrationType: string | null;
  iotClass: string | null;
  startDomain: string;
  startable: boolean;
  requiresInstaller: boolean;
}

export interface CatalogDto {
  items: CatalogEntryDto[];
  total: number;
  degraded: boolean;
  message: string | null;
}

export interface StatusDto {
  user: { isAdmin: boolean };
  service: {
    state: string;
    active: boolean;
    message: string | null;
    detail?: string;
    expiresAt?: string | null;
  };
  homeAssistant: {
    reachable: boolean;
    onboarded: boolean | null;
    version?: string | null;
    verified?: boolean;
  };
  features: { catalog: boolean; flows: boolean; power: boolean };
  warnings?: string[];
}

export interface PowerStatusDto {
  entryId: string;
  configured: boolean;
  /** True when the TV shows the turn-on feature; null when it could not be checked. */
  active: boolean | null;
  message: string | null;
}

export interface PowerSetupBody {
  /** Installer only. */
  mac?: string;
  /** Installer only. */
  broadcastAddress?: string;
  /** Installer only. */
  broadcastPort?: number;
}

export interface AreaDto {
  id: string;
  name: string;
}

/** Body of an error answer: `{ error, code, field?, flowId?, retryAfterSeconds? }`. */
export interface DeviceErrorBody {
  error: string;
  code: string;
  field?: string;
  flowId?: string;
  retryAfterSeconds?: number;
}

/** An error of the facade as the screens use it (see `toDeviceError`). */
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
