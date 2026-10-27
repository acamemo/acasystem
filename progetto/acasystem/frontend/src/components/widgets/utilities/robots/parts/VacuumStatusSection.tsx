import { Body, Button, Caption } from '@/components/primitives';
import { Section } from '../../shared/details';
import { Chip, Meter, Notice } from '../../shared/UtilityCard';
import { UtilityIcon } from '../../shared/UtilityIcon';
import { stateIn } from '../../shared/useCommand';
import { formatCompact } from '../../shared/format';
import { VACUUM_CONFIRM } from '../vacuumData';
import { isErrorState, robotActionSupported } from '../robotSpecs';
import type { VacuumState } from './useVacuumDetailsState';

const PRIMARY_LABEL = { start: 'Avvia', pause: 'Pausa', stop: 'Arresta' } as const;

export function VacuumStatusSection({ v }: { v: VacuumState }) {
  const {
    entity,
    stats,
    primary,
    pending,
    unavailable,
    runtime,
    services,
    features,
    send,
    statusText,
    configurationError,
    notice,
  } = v;
  return (
    <>
      <Section title="Stato" icon="vacuum">
        <div className="utility-split">
          <div className="utility-stack">
            <Body size="md" tone={isErrorState(entity.state) ? 'danger' : 'ink'} aria-live="polite">
              {statusText}
            </Body>
            <div className="utility-chips">
              {stats.room && (
                <Chip icon="location" label={`Stanza: ${stats.room}`}>
                  {stats.room}
                </Chip>
              )}
              {isErrorState(entity.state) && (
                <Chip icon="warning" tone="danger">
                  Richiede attenzione
                </Chip>
              )}
            </div>
          </div>
          {stats.battery !== null && (
            <div className="utility-stack">
              <Caption>Batteria {formatCompact(stats.battery, 0)}%</Caption>
              <Meter
                value={stats.battery}
                label="Batteria dell’aspirapolvere"
                low={stats.battery < 20}
              />
            </div>
          )}
        </div>
        <div className="utility-actions">
          <Button
            variant={primary === 'start' ? 'primary' : 'control'}
            size="md"
            loading={pending === primary}
            disabled={
              unavailable ||
              !runtime.conn ||
              !robotActionSupported(entity, 'vacuum', primary, services)
            }
            onClick={() =>
              send({
                key: primary,
                domain: 'vacuum',
                service: primary,
                confirm: stateIn(...VACUUM_CONFIRM[primary]),
              })
            }
          >
            <UtilityIcon
              name={primary === 'start' ? 'play' : primary === 'pause' ? 'pause' : 'stop'}
              size="md"
            />
            {PRIMARY_LABEL[primary]}
          </Button>
          {features.canReturnToBase && Boolean(services?.vacuum?.return_to_base) && (
            <Button
              variant="control"
              size="md"
              loading={pending === 'dock'}
              disabled={unavailable}
              onClick={() =>
                send({
                  key: 'dock',
                  domain: 'vacuum',
                  service: 'return_to_base',
                  confirm: stateIn(...VACUUM_CONFIRM.dock),
                })
              }
            >
              <UtilityIcon name="home" size="md" />
              Torna alla base
            </Button>
          )}
          {features.canLocate && Boolean(services?.vacuum?.locate) && (
            <Button
              variant="control"
              size="md"
              loading={pending === 'locate'}
              disabled={unavailable}
              onClick={() => send({ key: 'locate', domain: 'vacuum', service: 'locate' })}
            >
              <UtilityIcon name="search" size="md" />
              Trova
            </Button>
          )}
        </div>
        {unavailable && (
          <Notice icon="wifi">Il dispositivo non è raggiungibile: i comandi sono sospesi.</Notice>
        )}
        {configurationError && (
          <Notice tone="danger" live>
            {configurationError}
          </Notice>
        )}
        {notice && (
          <Notice tone={notice.tone} icon="warning" live>
            {notice.text}
          </Notice>
        )}
      </Section>
    </>
  );
}
