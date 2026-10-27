/**
 * The step where a television shows a code and the person writes it (F5). Most televisions use
 * the same step, a form with one field called `pin` or `code`; what changes is how long the code
 * is, which tells when it can be sent without a button.
 */
import type { FlowFormDto } from '@/@types/devices';

export interface PinSpec {
  fieldName: string;
  /** Characters of the code when the integration is known to use a fixed length; else null. */
  length: number | null;
  /** The code is hexadecimal (Android TV), otherwise decimal. */
  hex: boolean;
}

/** Fields that hold a code shown on the device. */
const PIN_FIELD = /^(pin|pin_code|pairing_pin|code|pairing_code|passcode)$/i;

/** Code length and alphabet by integration: the ones whose pairing is known. */
const PIN_FORMAT: Readonly<Record<string, { length: number; hex: boolean }>> = {
  samsungtv: { length: 4, hex: false },
  androidtv_remote: { length: 6, hex: true },
  braviatv: { length: 4, hex: false },
  philips_js: { length: 4, hex: false },
  panasonic_viera: { length: 4, hex: false },
  apple_tv: { length: 4, hex: false },
};

/** The code field of a step, or null when the step is not "write the code on the screen". */
export function pinSpecFor(form: FlowFormDto): PinSpec | null {
  if (form.fields.length !== 1) return null;
  const [field] = form.fields;
  if (!field || (field.kind !== 'text' && field.kind !== 'password' && field.kind !== 'integer')) {
    return null;
  }
  if (!PIN_FIELD.test(field.name)) return null;
  const format = PIN_FORMAT[form.handler];
  return {
    fieldName: field.name,
    length: format?.length ?? null,
    hex: format?.hex ?? false,
  };
}

/**
 * What the person typed, reduced to the characters a code of this kind can have. A code whose
 * length is not known may hold anything (letters, dashes): it is only trimmed.
 */
export function cleanPin(raw: string, spec: PinSpec): string {
  if (spec.length === null) return raw.trim();
  const allowed = spec.hex ? /[^0-9a-f]/gi : /[^0-9]/g;
  const text = raw.replace(allowed, '');
  return (spec.hex ? text.toUpperCase() : text).slice(0, spec.length);
}
