/**
 * Stato dell'accesso con utente e password: passo delle credenziali, eventuale codice a due
 * fattori, attesa ed errori. Le credenziali restano nei campi del modulo e passano solo alle
 * richieste di `@/api/haLogin`; qui non vengono conservate.
 */
import { useCallback, useRef, useState } from 'react';
import type { AuthData } from 'home-assistant-js-websocket';
import {
  LOGIN_ERROR_MESSAGES,
  cancelLoginFlow,
  currentLoginTarget,
  loginErrorCode,
  loginErrorMessage,
  loginWithPassword,
  submitMfaCode,
  type LoginErrorCode,
  type LoginStep,
  type LoginTarget,
} from '@/api/haLogin';

export type LoginPhase = 'credentials' | 'mfa';

export interface LoginFailure {
  code: LoginErrorCode;
  message: string;
}

/** Esito di un invio, perché il modulo sposti il focus e svuoti i campi giusti. */
export type LoginOutcome =
  | { status: 'done' }
  | { status: 'mfa' }
  | { status: 'failed'; code: LoginErrorCode; phase: LoginPhase };

export interface HaLogin {
  phase: LoginPhase;
  busy: boolean;
  failure: LoginFailure | null;
  signIn: (username: string, password: string) => Promise<LoginOutcome>;
  verifyCode: (code: string) => Promise<LoginOutcome>;
  /** Dal codice torna a utente e password, abbandonando il flusso. */
  back: () => void;
  clearFailure: () => void;
}

/** Errori che chiudono il flusso: si ricomincia da utente e password. */
const RESTART: ReadonlySet<LoginErrorCode> = new Set(['expired', 'too_many_codes']);

const failureOf = (code: LoginErrorCode, message = LOGIN_ERROR_MESSAGES[code]): LoginFailure => ({
  code,
  message,
});

export function useHaLogin(
  onSession: (tokens: AuthData) => void,
  target: () => LoginTarget = currentLoginTarget
): HaLogin {
  const [phase, setPhase] = useState<LoginPhase>('credentials');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<LoginFailure | null>(null);
  const flowId = useRef<string | null>(null);
  const busyRef = useRef(false);

  const apply = useCallback(
    (step: LoginStep): LoginOutcome => {
      if (step.type === 'done') {
        flowId.current = null;
        setFailure(null);
        onSession(step.tokens);
        return { status: 'done' };
      }
      flowId.current = step.flowId;
      if (step.type === 'mfa') {
        setPhase('mfa');
        if (step.error) {
          setFailure(failureOf('invalid_code'));
          return { status: 'failed', code: 'invalid_code', phase: 'mfa' };
        }
        setFailure(null);
        return { status: 'mfa' };
      }
      setPhase('credentials');
      setFailure(failureOf('invalid_auth'));
      return { status: 'failed', code: 'invalid_auth', phase: 'credentials' };
    },
    [onSession]
  );

  const fail = useCallback((error: unknown, current: LoginPhase): LoginOutcome => {
    const code = loginErrorCode(error);
    const restart = RESTART.has(code);
    if (restart) {
      flowId.current = null;
      setPhase('credentials');
    }
    setFailure(failureOf(code, loginErrorMessage(error)));
    return { status: 'failed', code, phase: restart ? 'credentials' : current };
  }, []);

  const run = useCallback(
    async (current: LoginPhase, send: () => Promise<LoginStep>): Promise<LoginOutcome> => {
      if (busyRef.current) return { status: 'failed', code: 'unexpected', phase: current };
      busyRef.current = true;
      setBusy(true);
      setFailure(null);
      try {
        return apply(await send());
      } catch (error) {
        return fail(error, current);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [apply, fail]
  );

  const signIn = useCallback(
    (username: string, password: string) =>
      run('credentials', () => loginWithPassword(target(), { username, password }, flowId.current)),
    [run, target]
  );

  const verifyCode = useCallback(
    (code: string) => {
      const id = flowId.current;
      if (!id) {
        setPhase('credentials');
        setFailure(failureOf('expired'));
        return Promise.resolve<LoginOutcome>({
          status: 'failed',
          code: 'expired',
          phase: 'credentials',
        });
      }
      return run('mfa', () => submitMfaCode(target(), id, code));
    },
    [run, target]
  );

  const back = useCallback(() => {
    const id = flowId.current;
    flowId.current = null;
    setPhase('credentials');
    setFailure(null);
    if (id) void cancelLoginFlow(target(), id);
  }, [target]);

  const clearFailure = useCallback(() => setFailure(null), []);

  return { phase, busy, failure, signIn, verifyCode, back, clearFailure };
}
