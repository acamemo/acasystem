import { useConfirmedCommand, type ConfirmedCommand } from './commands';
import { testi } from '../testi';

/**
 * Power of a TV: one request at a time, and a request Home Assistant never confirms is not lost
 * silently: `timedOut` says «La TV non ha risposto» and `retry` sends it again.
 */
export function useTvPower(isOn: boolean): ConfirmedCommand<boolean> {
  return useConfirmedCommand(isOn, {
    ignoreWhilePending: true,
    timeoutMessage: testi.tvNonRisponde,
  });
}
