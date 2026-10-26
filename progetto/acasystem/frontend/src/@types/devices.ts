/**
 * Answers of the device facade (`/api/dispositivi`, ADR-0021 and ADR-0022), as the browser sees
 * them. Copied by hand from the DTOs of the server: backend/src/services/devices/deviceService.ts,
 * flowModel.ts, catalog.ts and powerRecipe.ts. Keep the two in step: a test compares the keys
 * that the screens read (DevicesApi.test.ts).
 */

export type FlowFieldKind =
  'text' | 'password' | 'integer' | 'number' | 'boolean' | 'select' | 'multiselect';

export interface FlowFieldDto {
  name: string;
  kind: FlowFieldKind;
  required: boolean;
  label: string;
  hint?: string;
  default?: string | number | boolean;
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
  options: { id: string; label: string }[];
}

export interface FlowProgressDto {
  type: 'progress';
  flowId: string;
  handler: string;
  stepId: string;
  title: string;
  progressAction: string | null;
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

export type FlowOpenStepDto = FlowFormDto | FlowMenuDto | FlowProgressDto;
export type FlowResponseDto = FlowOpenStepDto | FlowAbortDto | FlowCreatedDto;

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
  startableHandlers: string[];
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
