import { Button, Numeric } from '@/components/primitives';
import type { WidgetProps } from '@/@types/launcher';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePageVisible } from '@/hooks/launcher/PageVisibilityContext';
import { useNow } from '../hooks/commands';
import { MediaIcon } from '../icons';
import { attrString, isMediaActive, stringList, type Entity } from '../model/entity';
import { testi } from '../testi';
import { WidgetLoading, WidgetMessage, missingDevice } from '../parts/WidgetShell';
import { PlayerView } from './PlayerView';

/** `media_player.*` widget (legacy MediaPlayerCard). */
export function MediaPlayerWidget({ id, settings, size, editMode }: WidgetProps) {
  const runtime = useWidgetRuntime();
  if (!runtime.entitiesLoaded) return <WidgetLoading size={size} label={testi.caricamentoLettore} />;
  const entity = runtime.entities[id];
  if (!entity) {
    return <WidgetMessage size={size} editMode={editMode} {...missingDevice(id)} />;
  }
  const name = runtime.customNames[id] || attrString(entity, 'friendly_name') || testi.lettore;
  return (
    <PlayerView
      size={size}
      editMode={editMode}
      entityId={id}
      name={name}
      settings={settings}
      onOpen={() => runtime.openDetails(id)}
    />
  );
}

export interface GroupSelection {
  members: Entity[];
  active: Entity[];
  current: Entity | undefined;
  /** Players the switch button cycles through (legacy cyclePool). */
  cyclePool: Entity[];
}

/** Current player of a media group: saved activeId, else the first playing, else the first. */
export function selectGroupPlayer(
  entities: Record<string, Entity | undefined>,
  mediaIds: readonly string[],
  activeId: unknown,
  nowMs: number
): GroupSelection {
  const members = mediaIds.map((id) => entities[id]).filter((entity): entity is Entity => Boolean(entity));
  const active = members.filter((entity) => isMediaActive(entity, nowMs));
  const playing = members.filter((entity) => entity.state === 'playing');
  const pool = active.length > 0 ? active : members;
  const cyclePool = playing.length > 1 ? playing : active.length > 1 ? active : pool;
  const current = pool.find((entity) => entity.entity_id === activeId) ?? playing[0] ?? pool[0];
  return { members, active, current, cyclePool };
}

/** `media_group_*` and `sonos_group_*` widgets (legacy MediaGroupCard). */
export function MediaGroupWidget({ id, settingsKey, settings, size, editMode }: WidgetProps) {
  const runtime = useWidgetRuntime();
  const visible = usePageVisible();
  const now = useNow(10000, visible);
  if (!runtime.entitiesLoaded) return <WidgetLoading size={size} label={testi.caricamentoLettore} />;
  const mediaIds = stringList(settings.mediaIds);
  const group = selectGroupPlayer(runtime.entities, mediaIds, settings.activeId, now);
  if (!group.current) {
    return (
      <WidgetMessage
        size={size}
        editMode={editMode}
        title={testi.gruppoVuoto}
        note={testi.gruppoVuotoNota}
        onOpen={() => runtime.openDetails(id)}
      />
    );
  }
  const current = group.current;
  const name = runtime.customNames[id] || attrString(current, 'friendly_name') || testi.musica;
  const switchPlayer = () => {
    const pool = group.cyclePool;
    if (pool.length < 2) return;
    const index = pool.findIndex((entity) => entity.entity_id === current.entity_id);
    const next = pool[(index + 1) % pool.length];
    runtime.saveCardSetting(settingsKey, 'activeId', next.entity_id);
  };
  const chip =
    group.cyclePool.length > 1 ? (
      <Button
        variant="control"
        size="sm"
        aria-label={testi.cambiaLettore(group.cyclePool.length)}
        disabled={editMode}
        onClick={(event) => {
          event.stopPropagation();
          switchPlayer();
        }}
      >
        <MediaIcon name="swap" size="sm" />
        <Numeric>{group.cyclePool.length}</Numeric>
      </Button>
    ) : null;
  return (
    <PlayerView
      size={size}
      editMode={editMode}
      entityId={current.entity_id}
      name={name}
      settings={settings}
      extra={chip}
      activeOverride={group.active.length > 0}
      onOpen={() => runtime.openDetails(id)}
    />
  );
}
