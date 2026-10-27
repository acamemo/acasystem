import type { SqliteDatabase } from './database.ts';

/**
 * Tables of the device facade: open configuration flows, the registry of actions and the
 * links of the power-on recipe. None of them holds an address, a MAC or a token.
 */

export type DeviceFlowStatus = 'open' | 'cancelling';

export interface DeviceFlowRow {
  flow_id: string;
  ha_user_id: string;
  handler: string;
  step_id: string | null;
  status: DeviceFlowStatus;
  created_at: number;
  updated_at: number;
  expires_at: number;
}

export type DeviceActionOutcome = 'ok' | 'denied' | 'error';

export interface DeviceActionRow {
  id: number;
  at: number;
  ha_user_id: string | null;
  ha_user_name: string | null;
  source: string;
  action: string;
  domain: string | null;
  entry_id: string | null;
  outcome: DeviceActionOutcome;
  code: string | null;
}

export type NewDeviceAction = Omit<DeviceActionRow, 'id'>;

export interface PowerLinkRow {
  webostv_entry_id: string;
  wol_entry_id: string;
  automation_id: string;
  device_id: string;
  media_player_entity_id: string;
  trigger_form: string;
  created_by: string;
  created_at: number;
}

/** The registry keeps the latest rows only: older ones are deleted. */
const MAX_ACTION_ROWS = 10_000;

export interface DeviceModel {
  flows: {
    insert(row: DeviceFlowRow): void;
    get(flowId: string): DeviceFlowRow | undefined;
    updateStep(flowId: string, stepId: string, updatedAt: number, expiresAt: number): void;
    setStatus(flowId: string, status: DeviceFlowStatus): void;
    remove(flowId: string): void;
    listOpenForUser(haUserId: string, now: number): DeviceFlowRow[];
    findOpenForHandler(haUserId: string, handler: string, now: number): DeviceFlowRow | undefined;
    countOpen(now: number, haUserId?: string): number;
    listExpired(now: number): DeviceFlowRow[];
    listCancelling(): DeviceFlowRow[];
    listAll(): DeviceFlowRow[];
    markAllCancelling(): void;
  };
  actions: {
    insert(action: NewDeviceAction): void;
    list(limit: number): DeviceActionRow[];
    /** True when the registry records that a person created this entry from Acasystem (F4). */
    createdEntry(entryId: string): boolean;
  };
  links: {
    get(webostvEntryId: string): PowerLinkRow | undefined;
    upsert(row: PowerLinkRow): void;
    remove(webostvEntryId: string): void;
    list(): PowerLinkRow[];
  };
}

export const createDeviceModel = (database: SqliteDatabase): DeviceModel => {
  const insertFlow = database.prepare(
    `INSERT INTO device_flows (flow_id, ha_user_id, handler, step_id, status, created_at, updated_at, expires_at)
     VALUES (@flow_id, @ha_user_id, @handler, @step_id, @status, @created_at, @updated_at, @expires_at)`
  );
  const getFlow = database.prepare<[string], DeviceFlowRow>(
    'SELECT * FROM device_flows WHERE flow_id = ?'
  );
  const updateFlowStep = database.prepare(
    'UPDATE device_flows SET step_id = ?, updated_at = ?, expires_at = ? WHERE flow_id = ?'
  );
  const setFlowStatus = database.prepare('UPDATE device_flows SET status = ? WHERE flow_id = ?');
  const removeFlow = database.prepare('DELETE FROM device_flows WHERE flow_id = ?');
  const listOpenFlowsForUser = database.prepare<[string, number], DeviceFlowRow>(
    `SELECT * FROM device_flows WHERE ha_user_id = ? AND status = 'open' AND expires_at > ? ORDER BY created_at`
  );
  const findOpenFlow = database.prepare<[string, string, number], DeviceFlowRow>(
    `SELECT * FROM device_flows WHERE ha_user_id = ? AND handler = ? AND status = 'open' AND expires_at > ? LIMIT 1`
  );
  const countOpenFlows = database.prepare<[number], { count: number }>(
    `SELECT COUNT(*) AS count FROM device_flows WHERE status = 'open' AND expires_at > ?`
  );
  const countOpenFlowsForUser = database.prepare<[number, string], { count: number }>(
    `SELECT COUNT(*) AS count FROM device_flows WHERE status = 'open' AND expires_at > ? AND ha_user_id = ?`
  );
  const listExpiredFlows = database.prepare<[number], DeviceFlowRow>(
    `SELECT * FROM device_flows WHERE status = 'open' AND expires_at <= ?`
  );
  const listCancellingFlows = database.prepare<[], DeviceFlowRow>(
    `SELECT * FROM device_flows WHERE status = 'cancelling' ORDER BY created_at`
  );
  const listAllFlows = database.prepare<[], DeviceFlowRow>(
    'SELECT * FROM device_flows ORDER BY created_at'
  );
  const markAll = database.prepare(`UPDATE device_flows SET status = 'cancelling'`);

  const insertAction = database.prepare(
    `INSERT INTO device_actions (at, ha_user_id, ha_user_name, source, action, domain, entry_id, outcome, code)
     VALUES (@at, @ha_user_id, @ha_user_name, @source, @action, @domain, @entry_id, @outcome, @code)`
  );
  const trimActions = database.prepare('DELETE FROM device_actions WHERE id <= ?');
  const listActions = database.prepare<[number], DeviceActionRow>(
    'SELECT * FROM device_actions ORDER BY id DESC LIMIT ?'
  );

  const findCreation = database.prepare<[string], { id: number }>(
    `SELECT id FROM device_actions
     WHERE entry_id = ? AND outcome = 'ok'
       AND action IN ('flow.start', 'flow.step', 'flow.read', 'scoperti.aggiungi')
     LIMIT 1`
  );

  const getLink = database.prepare<[string], PowerLinkRow>(
    'SELECT * FROM device_power_links WHERE webostv_entry_id = ?'
  );
  const upsertLink = database.prepare(
    `INSERT INTO device_power_links
       (webostv_entry_id, wol_entry_id, automation_id, device_id, media_player_entity_id, trigger_form, created_by, created_at)
     VALUES (@webostv_entry_id, @wol_entry_id, @automation_id, @device_id, @media_player_entity_id, @trigger_form, @created_by, @created_at)
     ON CONFLICT(webostv_entry_id) DO UPDATE SET
       wol_entry_id = excluded.wol_entry_id,
       automation_id = excluded.automation_id,
       device_id = excluded.device_id,
       media_player_entity_id = excluded.media_player_entity_id,
       trigger_form = excluded.trigger_form`
  );
  const removeLink = database.prepare('DELETE FROM device_power_links WHERE webostv_entry_id = ?');
  const listLinks = database.prepare<[], PowerLinkRow>(
    'SELECT * FROM device_power_links ORDER BY created_at'
  );

  return {
    flows: {
      insert: (row) => void insertFlow.run(row),
      get: (flowId) => getFlow.get(flowId),
      updateStep: (flowId, stepId, updatedAt, expiresAt) =>
        void updateFlowStep.run(stepId, updatedAt, expiresAt, flowId),
      setStatus: (flowId, status) => void setFlowStatus.run(status, flowId),
      remove: (flowId) => void removeFlow.run(flowId),
      listOpenForUser: (haUserId, now) => listOpenFlowsForUser.all(haUserId, now),
      findOpenForHandler: (haUserId, handler, now) => findOpenFlow.get(haUserId, handler, now),
      countOpen: (now, haUserId) =>
        (haUserId ? countOpenFlowsForUser.get(now, haUserId) : countOpenFlows.get(now))?.count ?? 0,
      listExpired: (now) => listExpiredFlows.all(now),
      listCancelling: () => listCancellingFlows.all(),
      listAll: () => listAllFlows.all(),
      markAllCancelling: () => void markAll.run(),
    },
    actions: {
      insert(action) {
        const { lastInsertRowid } = insertAction.run(action);
        const id = Number(lastInsertRowid);
        if (id % 500 === 0 && id > MAX_ACTION_ROWS) trimActions.run(id - MAX_ACTION_ROWS);
      },
      list: (limit) => listActions.all(limit),
      createdEntry: (entryId) => findCreation.get(entryId) !== undefined,
    },
    links: {
      get: (webostvEntryId) => getLink.get(webostvEntryId),
      upsert: (row) => void upsertLink.run(row),
      remove: (webostvEntryId) => void removeLink.run(webostvEntryId),
      list: () => listLinks.all(),
    },
  };
};
