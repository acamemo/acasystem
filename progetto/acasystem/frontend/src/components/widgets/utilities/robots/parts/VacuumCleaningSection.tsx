import { OptionPicker, Section } from '../../shared/details';
import { stringAttr } from '../../shared/entity';
import { fanSpeeds } from '../vacuumData';
import type { VacuumState } from './useVacuumDetailsState';

export function VacuumCleaningSection({ v }: { v: VacuumState }) {
  const {
    id,
    entity,
    features,
    services,
    fanSpeed,
    mop,
    mopAvailable,
    pending,
    unavailable,
    send,
  } = v;
  return (
    <>
      {((features.canSetFanSpeed && Boolean(services?.vacuum?.set_fan_speed)) || mopAvailable) && (
        <Section title="Pulizia" icon="fan">
          <div className="utility-toolbar">
            {features.canSetFanSpeed && Boolean(services?.vacuum?.set_fan_speed) && (
              <OptionPicker
                label="Aspirazione"
                value={fanSpeed}
                options={fanSpeeds(entity).map((speed) => ({ value: speed, label: speed }))}
                pending={pending === 'fan'}
                disabled={unavailable}
                onSelect={(value) =>
                  send({
                    key: 'fan',
                    domain: 'vacuum',
                    service: 'set_fan_speed',
                    data: { entity_id: id, fan_speed: value },
                    confirm: (current) => stringAttr(current, 'fan_speed') === value,
                  })
                }
              />
            )}
            {mopAvailable && (
              <OptionPicker
                label="Lavaggio"
                value={mop.current}
                options={mop.options.map((option) => ({ value: option, label: option }))}
                pending={pending === 'mop'}
                disabled={unavailable}
                onSelect={(value) => {
                  const controlId = mop.entityId;
                  if (controlId) {
                    const domain = controlId.split('.')[0] ?? 'select';
                    send({
                      key: 'mop',
                      domain,
                      service: 'select_option',
                      data: { entity_id: controlId, option: value },
                    });
                    return;
                  }
                  send({
                    key: 'mop',
                    domain: 'vacuum',
                    service: 'set_mop_intensity',
                    data: { entity_id: id, mop_intensity: value },
                  });
                }}
              />
            )}
          </div>
        </Section>
      )}
    </>
  );
}
