import { useEffect, useState } from 'react';
import { Button } from '@/components/primitives';
import { getEntry, removeEntry, toDeviceError } from '@/api/devicesApi';
import { getEntityRegistry } from '@/api/haClient';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { InlineConfirm, Notice } from '../sheets/parts/Form';
import { deviceTexts } from './deviceTexts';

type Phase = 'checking' | 'hidden' | 'ready' | 'asking' | 'removing' | 'removed' | 'failed';

/**
 * «Rimuovi dispositivo» (F4), under the device a widget is linked to. The integration of the
 * device is found in the entity registry; the server decides whether Acasystem may remove it (a
 * system integration, or an entry made by hand in Home Assistant, answers «no» and the button is
 * not drawn). A confirmation says what happens: the device leaves Home Assistant and every
 * widget. After it, `onRemoved` lets the caller unlink the widget.
 */
export function RemoveDevice({
  entityId,
  onRemoved,
}: {
  entityId: string | null;
  onRemoved: () => void;
}) {
  const { conn } = useWidgetRuntime();
  const [phase, setPhase] = useState<Phase>('checking');
  const [entryId, setEntryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPhase('checking');
    setEntryId(null);
    setError(null);
    if (!entityId || !conn) {
      setPhase('hidden');
      return undefined;
    }
    void (async () => {
      try {
        const registry = await getEntityRegistry(conn);
        const configEntryId = registry.find((entry) => entry.entity_id === entityId)
          ?.config_entry_id;
        if (typeof configEntryId !== 'string' || !configEntryId) throw new Error('no entry');
        // The server answers only for an entry it may show: the same rule decides the removal.
        await getEntry(configEntryId);
        if (cancelled) return;
        setEntryId(configEntryId);
        setPhase('ready');
      } catch {
        if (!cancelled) setPhase('hidden');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conn, entityId]);

  const remove = () => {
    if (!entryId) return;
    setPhase('removing');
    setError(null);
    removeEntry(entryId).then(
      () => {
        setPhase('removed');
        onRemoved();
      },
      (failure: unknown) => {
        setError(toDeviceError(failure).message || deviceTexts.removeFailed);
        setPhase('failed');
      }
    );
  };

  if (phase === 'checking' || phase === 'hidden') return null;
  if (phase === 'removed') return <Notice tone="success">{deviceTexts.removeDone}</Notice>;
  if (phase === 'asking') {
    return (
      <InlineConfirm
        message={deviceTexts.removeAsk}
        confirmLabel={deviceTexts.removeConfirm}
        onConfirm={remove}
        onCancel={() => setPhase('ready')}
      />
    );
  }
  return (
    <>
      {error && <Notice tone="danger">{error}</Notice>}
      <Button
        variant="control"
        size="md"
        loading={phase === 'removing'}
        onClick={() => setPhase('asking')}
      >
        {deviceTexts.removeDevice}
      </Button>
    </>
  );
}
