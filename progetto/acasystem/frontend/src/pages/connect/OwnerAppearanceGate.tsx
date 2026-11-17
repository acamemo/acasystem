import { useEffect, useState, type ReactNode } from 'react';
import type { ClientSession } from '@/api/clientSession';
import { applyOwnerAppearance, hasOwnerAppearance, readOwnerAppearance } from '@/api/ownerAppearance';
import { Button, StatusMessage } from '@/components/primitives';
import { useHomeStartupSignal } from '@/hooks/startup/HomeStartupContext';

/** Runs after genuine client binding and before any profile editor is mounted. */
export function OwnerAppearanceGate({ session, children }: { session: ClientSession; children: ReactNode }) {
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [readyFor, setReadyFor] = useState('');
  const key = hasOwnerAppearance(session) ? `${readOwnerAppearance()?.id}:${session.houseId}:${session.user.id}` : '';
  useEffect(() => {
    let active = true;
    if (!key) return undefined;
    setReadyFor(''); setError('');
    void applyOwnerAppearance(session).then(() => { if (active) setReadyFor(key); })
      .catch((failure) => { if (active) setError(failure instanceof Error ? failure.message : 'Personalizzazione non completata. Riprova.'); });
    return () => { active = false; };
  }, [session, retry, key]);
  const blocked = Boolean(key && readyFor !== key);
  useHomeStartupSignal('profile', blocked ? { status: 'outside' } : null);
  if (!blocked) return children;
  return <main className="aca-connect"><StatusMessage
    message={error || 'Salvataggio della personalizzazione…'} messageRole={error ? 'alert' : 'status'}>
    {error && <Button variant="primary" onClick={() => setRetry((value) => value + 1)}>Riprova</Button>}
  </StatusMessage></main>;
}
