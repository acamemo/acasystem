import { humanizeState } from '../../shared/format';

export const DOMAIN_LABEL: Record<string, string> = {
  light: 'Luci',
  climate: 'Clima',
  media_player: 'Media',
  cover: 'Tapparelle',
  fan: 'Ventilatori',
  lock: 'Serrature',
  switch: 'Interruttori',
  input_boolean: 'Interruttori virtuali',
  vacuum: 'Aspirapolvere',
  automation: 'Automazioni',
  scene: 'Scene',
  script: 'Script',
  sensor: 'Sensori',
  binary_sensor: 'Sensori binari',
  camera: 'Videocamere',
  person: 'Persone',
  button: 'Pulsanti',
  input_button: 'Pulsanti virtuali',
  other: 'Altre entità',
};

export function domainLabel(domain: string): string {
  return DOMAIN_LABEL[domain] ?? humanizeState(domain);
}
