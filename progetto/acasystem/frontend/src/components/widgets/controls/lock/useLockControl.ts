import { useCallback, useEffect, useRef, useState } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { ServiceData } from '@/@types/ha';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { featuresOf, hasFeature, stringAttr } from '../shared/entity';
import { LOCK_STATE_LABELS } from '../shared/labels';
import { useTrackedCommand } from '../shared/useTrackedCommand';

const FEATURE_OPEN = 1;
/** Second tap window of «Sblocca» (legacy: 3 s). */
export const UNLOCK_CONFIRM_MS = 3000;
const LOCK_TIMEOUT_MS = 30_000;

export type LockTarget = 'locked' | 'unlocked' | 'open';

/**
 * Lock commands of the legacy LockCard: lock.lock, lock.unlock (after a confirming second
 * tap) and lock.open, with `code` when the lock asks for one. Without a connection, in edit
 * mode or when unavailable nothing is sent.
 */
export function useLockControl(entityId: string | undefined, disabled: boolean) {
  const runtime = useWidgetRuntime();
  const entity: HassEntity | undefined = entityId ? runtime.entities[entityId] : undefined;
  const state = String(entity?.state ?? 'unknown').toLowerCase();
  const isLocked = state === 'locked' || state === 'locking';
  const isUnlocked = state === 'unlocked' || state === 'unlocking';
  const isOpen = state === 'open' || state === 'opening';
  const isJammed = state === 'jammed';
  const unavailable = !entity || state === 'unavailable' || state === 'unknown';
  const supportsOpen = hasFeature(featuresOf(entity), FEATURE_OPEN);
  const codeFormat = stringAttr(entity, 'code_format').trim();
  const requiresCode = !!codeFormat && codeFormat !== 'none';
  const actionDisabled = disabled || !runtime.conn || unavailable || !entityId;
  const startingState = useRef(state);
  const reached = useCallback(
    (target: string, confirmed: string) =>
      target === 'open'
        ? confirmed === 'open' ||
          confirmed === 'opening' ||
          (confirmed === 'unlocked' && startingState.current === 'locked')
        : target === confirmed,
    []
  );
  const command = useTrackedCommand<string>(state, reached, LOCK_TIMEOUT_MS);
  const [confirmUnlock, setConfirmUnlock] = useState(false);

  useEffect(() => {
    if (!confirmUnlock) return undefined;
    const timer = setTimeout(() => setConfirmUnlock(false), UNLOCK_CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [confirmUnlock]);

  const send = useCallback(
    (target: LockTarget, code?: string) => {
      if (!entityId) return;
      const payload: ServiceData = { entity_id: entityId };
      const trimmed = code?.trim();
      if (trimmed) payload.code = trimmed;
      const service = target === 'locked' ? 'lock' : target === 'unlocked' ? 'unlock' : 'open';
      startingState.current = state;
      command.run(target, 'lock', service, payload);
    },
    [command, entityId, state]
  );

  /** Returns false when a code is needed and missing: the caller asks for it (details sheet). */
  const lock = (code?: string): boolean => {
    setConfirmUnlock(false);
    if (actionDisabled || isLocked) return true;
    if (requiresCode && !code?.trim()) return false;
    send('locked', code);
    return true;
  };
  const unlock = (code?: string): boolean => {
    if (actionDisabled || isUnlocked || isOpen) return true;
    if (!confirmUnlock) {
      setConfirmUnlock(true);
      return true;
    }
    setConfirmUnlock(false);
    if (requiresCode && !code?.trim()) return false;
    send('unlocked', code);
    return true;
  };
  const open = (code?: string): boolean => {
    setConfirmUnlock(false);
    if (actionDisabled || !supportsOpen || isOpen) return true;
    if (requiresCode && !code?.trim()) return false;
    send('open', code);
    return true;
  };

  const label = LOCK_STATE_LABELS[state] ?? (entity?.state || LOCK_STATE_LABELS.unknown);
  return {
    entityId,
    entity,
    state,
    label,
    isLocked,
    isUnlocked,
    isOpen,
    isJammed,
    unavailable,
    supportsOpen,
    requiresCode,
    actionDisabled,
    confirmUnlock,
    command,
    lockDisabled: actionDisabled || isLocked,
    unlockDisabled: actionDisabled || isUnlocked || isOpen,
    openDisabled: actionDisabled || !supportsOpen || isOpen,
    lock,
    unlock,
    open,
  };
}

export type LockControl = ReturnType<typeof useLockControl>;
