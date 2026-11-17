import { backendRequest } from './backendClient';
import { getDemoSource } from './demoSource';
import { notifyActivityChanged } from './activityApi';
import { reportDiagnostic } from './diagnosticApi';
import type { CommandIntent, HaUserCommand } from '../../../contracts/activity';
import { isProfileUsageFailure, requireProfileUsageHeaders } from './usageProof';

export class CommandResultError extends Error {
  readonly intentId: string | null;
  readonly code: string;
  constructor(code: string, intentId: string | null) {
    super(
      code === 'RESULT_UNKNOWN'
        ? 'Esito non disponibile. Il comando non verrà reinviato automaticamente.'
        : code === 'NOT_SENT'
          ? 'Comando non inviato. Verifica il collegamento.'
          : 'Home Assistant non ha accettato il comando.'
    );
    this.name = 'CommandResultError';
    this.code = code;
    this.intentId = intentId;
  }
}
const request = async (
  path: string,
  command?: HaUserCommand,
  headers?: Record<string, string>
): Promise<CommandIntent> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    return (await backendRequest(
      `/v2/commands${path}`,
      {
        ...(command ? { method: 'POST', body: JSON.stringify({ command }) } : {}),
        signal: controller.signal,
        headers,
      },
      { retryOnOAuthUnauthorized: false }
    )) as CommandIntent;
  } finally {
    clearTimeout(timer);
  }
};
export const getCommandResult = (id: string): Promise<CommandIntent> =>
  request(`/${encodeURIComponent(id)}`);
const demoCommand = async (command: HaUserCommand): Promise<unknown> => {
  const conn = getDemoSource()!.conn;
  if (command.kind === 'home.location')
    return conn.sendMessagePromise({
      type: 'config/core/update',
      latitude: command.latitude,
      longitude: command.longitude,
    });
  if (command.kind === 'zigbee.backup')
    return conn.sendMessagePromise({ type: 'zha/network/backups/create' });
  const { target, ...rest } = command.data ?? {};
  return conn.sendMessagePromise({
    type: 'call_service',
    domain: command.domain,
    service: command.service,
    ...(target ? { target, service_data: rest } : { service_data: command.data }),
  });
};
export const sendUserCommand = async (command: HaUserCommand): Promise<unknown> => {
  if (getDemoSource()) return demoCommand(command);
  const usage = requireProfileUsageHeaders();
  if (navigator.onLine === false) throw new CommandResultError('NOT_SENT', null);
  let intent: CommandIntent;
  try {
    intent = await request('/prepare', command, usage);
  } catch (error) {
    if (isProfileUsageFailure(error)) throw error;
    reportDiagnostic('client.command_error');
    throw new CommandResultError('NOT_SENT', null);
  }
  try {
    const latest = requireProfileUsageHeaders();
    if (latest['x-aca-usage-lease'] !== usage['x-aca-usage-lease'])
      throw Object.assign(
        new Error('L’uso del profilo è cambiato: il comando non è stato inviato.'),
        { status: 409, body: { code: 'PROFILE_USAGE_EXPIRED' } }
      );
    try {
      intent = await request(`/${encodeURIComponent(intent.id)}/execute`, command, usage);
    } catch (error) {
      if (isProfileUsageFailure(error)) throw error;
      intent = await getCommandResult(intent.id);
    }
    // Solo consultazione: nessun reinvio dopo una risposta persa o durante pending.
    for (let attempt = 0; intent.state === 'pending' && attempt < 20; attempt += 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      intent = await getCommandResult(intent.id);
    }
    notifyActivityChanged();
    if (intent.state === 'accepted') return undefined;
    if (intent.state === 'error')
      throw new CommandResultError(intent.code ?? 'HA_REJECTED', intent.id);
    throw new CommandResultError('RESULT_UNKNOWN', intent.id);
  } catch (error) {
    if (isProfileUsageFailure(error)) throw error;
    const result =
      error instanceof CommandResultError
        ? error
        : new CommandResultError('RESULT_UNKNOWN', intent.id);
    reportDiagnostic(
      result.code === 'RESULT_UNKNOWN' ? 'client.command_unknown' : 'client.command_error'
    );
    notifyActivityChanged();
    throw result;
  }
};
export const mutateHaConfiguration = (
  kind: 'home.location' | 'zigbee.backup',
  data: { latitude: number; longitude: number } | Record<string, never> = {}
): Promise<unknown> =>
  sendUserCommand(
    kind === 'home.location'
      ? { kind, latitude: Number(data.latitude), longitude: Number(data.longitude) }
      : { kind }
  );
