/**
 * Types of the «Dispositivi trovati» screen (REP-20261028-003): what the ignored-devices calls of
 * the device facade answer. Kept apart from `devices.ts`, which belongs to the facade's contract.
 */
import type { DeviceFamily } from '@/utils/devices/classify';

/** A discovery the person chose to ignore; Home Assistant keeps it as an entry with source `ignore`. */
export interface IgnoredDeviceDto {
  entryId: string;
  handler: string;
  name: string;
  family: DeviceFamily | null;
}

/** What `POST /api/dispositivi/servizio/ripara` answers: whether the service works now. */
export interface RepairResultDto {
  active: boolean;
  message: string;
}
