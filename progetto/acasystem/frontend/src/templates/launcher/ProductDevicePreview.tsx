import { productSensorView } from '@/components/widgets/home/sensor/productSensorModel';
import { Body, Caption, Icon, Surface } from '@/components/primitives';
import type { EntityMap } from '@/@types/ha';
import type { ProductDeviceBinding } from '../../../../contracts/productDevice';

/** Read-only placement: actual names/states, no widget loader, tracked command or demo association. */
export function ProductDevicePreview({ binding, entities, label }: {
  binding: ProductDeviceBinding; entities: EntityMap; label: string;
}) {
  if (binding.family === 'sensor') {
    const reading = productSensorView(entities[binding.primaryEntityId]);
    return <Surface style={{ height: '100%' }} contentClassName="aca-product-placement-preview">
      <Body>{label}</Body><Icon name="activity" size="lg" />
      <Caption>{reading.value}{reading.unit ? ` ${reading.unit}` : ''}</Caption>
      {binding.channelEntityIds.length > 1 && <Caption>{binding.channelEntityIds.length} misure e stati</Caption>}
    </Surface>;
  }
  const on = binding.channelEntityIds.filter((id) => entities[id]?.state === 'on').length;
  const missing = binding.channelEntityIds.filter((id) => !['on', 'off'].includes(entities[id]?.state ?? '')).length;
  const plug = binding.family === 'plug';
  if (binding.family === 'tv' || binding.family === 'sonos' || binding.family === 'media') {
    const labels: Record<string, string> = { playing: 'In riproduzione', paused: 'In pausa', idle: 'Inattivo', on: 'Acceso', off: 'Spento', standby: 'In attesa', buffering: 'Caricamento' };
    const available = binding.channelEntityIds.filter(id => Object.hasOwn(labels, entities[id]?.state ?? '')).length;
    return <Surface style={{ height: '100%' }} contentClassName="aca-product-placement-preview">
      <Body>{label}</Body><Icon name={binding.family === 'tv' ? 'tv' : 'speaker'} size="lg" />
      <Caption>{binding.channelEntityIds.length > 1 ? `${available} di ${binding.channelEntityIds.length} canali disponibili`
        : Object.hasOwn(labels, entities[binding.primaryEntityId]?.state ?? '') ? labels[entities[binding.primaryEntityId]!.state] : 'Non disponibile'}</Caption>
    </Surface>;
  }
  if (binding.family === 'vacuum' || binding.family === 'mower') {
    const labels: Record<string, string> = { idle: 'Inattivo', docked: 'Alla base', paused: 'In pausa', returning: 'Ritorno alla base', error: 'Errore',
      ...(binding.family === 'vacuum' ? { cleaning: 'Pulizia in corso' } : { mowing: 'Taglio in corso' }) };
    const available = binding.channelEntityIds.filter(id => Object.hasOwn(labels, entities[id]?.state ?? '')).length;
    return <Surface style={{ height: '100%' }} contentClassName="aca-product-placement-preview">
      <Body>{label}</Body><Icon name={binding.family === 'vacuum' ? 'vacuum' : 'mower'} size="lg" />
      <Caption>{binding.channelEntityIds.length > 1 ? `${available} di ${binding.channelEntityIds.length} canali disponibili`
        : Object.hasOwn(labels, entities[binding.primaryEntityId]?.state ?? '') ? labels[entities[binding.primaryEntityId]!.state] : 'Non disponibile'}</Caption>
    </Surface>;
  }
  if (binding.family === 'camera') {
    const labels: Record<string, string> = { idle: 'Inattiva', streaming: 'In trasmissione', recording: 'In registrazione' };
    const available = binding.channelEntityIds.filter(id => Object.hasOwn(labels, entities[id]?.state ?? '')).length;
    return <Surface style={{ height: '100%' }} contentClassName="aca-product-placement-preview">
      <Body>{label}</Body><Icon name="camera" size="lg" />
      <Caption>{binding.channelEntityIds.length > 1 ? `${available} di ${binding.channelEntityIds.length} canali disponibili`
        : Object.hasOwn(labels, entities[binding.primaryEntityId]?.state ?? '') ? labels[entities[binding.primaryEntityId]!.state] : 'Non disponibile'}</Caption>
    </Surface>;
  }
  if (binding.family === 'alarm') {
    const labels: Record<string, string> = { disarmed: 'Disinserito', armed_home: 'Attivo in casa', armed_away: 'Attivo fuori casa', armed_night: 'Attivo di notte', armed_vacation: 'Attivo in vacanza', armed_custom_bypass: 'Attivo personalizzato', pending: 'In attesa', arming: 'Inserimento in corso', disarming: 'Disinserimento in corso', triggered: 'Allarme scattato' };
    const available = binding.channelEntityIds.filter(id => Object.hasOwn(labels, entities[id]?.state ?? '')).length;
    return <Surface style={{ height: '100%' }} contentClassName="aca-product-placement-preview">
      <Body>{label}</Body><Icon name="shield" size="lg" />
      <Caption>{binding.channelEntityIds.length > 1 ? `${available} di ${binding.channelEntityIds.length} canali disponibili`
        : Object.hasOwn(labels, entities[binding.primaryEntityId]?.state ?? '') ? labels[entities[binding.primaryEntityId]!.state] : 'Non disponibile'}</Caption>
    </Surface>;
  }
  if (binding.family === 'lock') {
    const labels: Record<string, string> = { locked: 'Bloccata', unlocked: 'Sbloccata', open: 'Aperta', locking: 'Blocco in corso', unlocking: 'Sblocco in corso', opening: 'Apertura in corso', jammed: 'Inceppata' };
    const available = binding.channelEntityIds.filter(id => Object.hasOwn(labels, entities[id]?.state ?? '')).length;
    return <Surface style={{ height: '100%' }} contentClassName="aca-product-placement-preview">
      <Body>{label}</Body><Icon name="lock" size="lg" />
      <Caption>{binding.channelEntityIds.length > 1 ? `${available} di ${binding.channelEntityIds.length} canali disponibili`
        : Object.hasOwn(labels, entities[binding.primaryEntityId]?.state ?? '') ? labels[entities[binding.primaryEntityId]!.state] : 'Non disponibile'}</Caption>
    </Surface>;
  }
  if (binding.family === 'fan') {
    const available = binding.channelEntityIds.filter(id => ['on', 'off'].includes(entities[id]?.state ?? '')).length;
    const entity = entities[binding.primaryEntityId];
    const percentage = entity?.attributes.percentage;
    const validSpeed = typeof percentage === 'number' && Number.isFinite(percentage) && percentage >= 0 && percentage <= 100;
    return <Surface style={{ height: '100%' }} contentClassName="aca-product-placement-preview">
      <Body>{label}</Body><Icon name="fan" size="lg" />
      <Caption>{binding.channelEntityIds.length > 1 ? `${available} di ${binding.channelEntityIds.length} canali disponibili`
        : available ? `${entity?.state === 'on' ? 'Acceso' : 'Spento'}${validSpeed ? ` · ${percentage}%` : ''}` : 'Non disponibile'}</Caption>
    </Surface>;
  }
  if (binding.family === 'cover') {
    const states: Record<string, string> = { open: 'Aperta', closed: 'Chiusa', opening: 'In apertura', closing: 'In chiusura' };
    const available = binding.channelEntityIds.filter(id => Object.hasOwn(states, entities[id]?.state ?? '')).length;
    const entity = entities[binding.primaryEntityId];
    const position = entity?.attributes.current_position;
    const knownPosition = typeof position === 'number' && Number.isFinite(position) && position >= 0 && position <= 100;
    return <Surface style={{ height: '100%' }} contentClassName="aca-product-placement-preview">
      <Body>{label}</Body><Icon name="blinds" size="lg" />
      <Caption>{binding.channelEntityIds.length > 1 ? `${available} di ${binding.channelEntityIds.length} canali disponibili`
        : Object.hasOwn(states, entity?.state ?? '') ? `${states[entity!.state]}${knownPosition ? ` · ${position}%` : ''}` : 'Non disponibile'}</Caption>
    </Surface>;
  }
  if (binding.family === 'climate') {
    const available = binding.channelEntityIds.filter(id => entities[id] && !['unknown', 'unavailable', ''].includes(entities[id]!.state)).length;
    const entity = entities[binding.primaryEntityId];
    const current = entity?.attributes.current_temperature;
    return <Surface style={{ height: '100%' }} contentClassName="aca-product-placement-preview">
      <Body>{label}</Body><Icon name="thermostat" size="lg" />
      <Caption>{binding.channelEntityIds.length > 1 ? `${available} di ${binding.channelEntityIds.length} canali disponibili`
        : available ? typeof current === 'number' && Number.isFinite(current) ? `Temperatura attuale · ${current}${typeof entity?.attributes.temperature_unit === 'string' ? ` ${entity.attributes.temperature_unit}` : ''}`
          : 'Clima collegato' : 'Non disponibile'}</Caption>
    </Surface>;
  }
  return <Surface style={{ height: '100%' }} contentClassName="aca-product-placement-preview">
    <Body>{label}</Body>
    <Icon name={plug ? 'power' : 'light'} size="lg" />
    <Caption>{binding.channelEntityIds.length > 1 ? `${on} di ${binding.channelEntityIds.length} ${plug ? 'uscite attive' : 'luci accese'}${missing ? ` · ${missing} non disponibili` : ''}`
      : entities[binding.primaryEntityId]?.state === 'on' ? plug ? 'Attiva' : 'Accesa'
      : entities[binding.primaryEntityId]?.state === 'off' ? plug ? 'Disattiva' : 'Spenta' : 'Stato non disponibile'}</Caption>
  </Surface>;
}
