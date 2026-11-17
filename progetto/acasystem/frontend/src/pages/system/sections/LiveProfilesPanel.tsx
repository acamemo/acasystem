import { useRef, useState } from 'react';
import { Body, Button, Caption, Field } from '@/components/primitives';
import { useLiveProfiles } from '@/hooks/liveProfiles/LiveProfilesContext';
import { isObject } from '@/validators/guards';
import { isValidSnapshot } from '@/api/snapshot';
import { unwrapImportedSnapshot } from '@/validators/snapshot';
import { Notice } from '@/templates/sheets/parts/Form';
import type { Configuration } from '../../../../../contracts/collaboration';
import { applyChanges } from '../../../../../contracts/profileResources';

export function downloadProfileJson(value: unknown, name: string) {
  const href = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  );
  const link = document.createElement('a');
  link.href = href;
  link.download = name;
  link.click();
  URL.revokeObjectURL(href);
}

/** La libreria e la selezione appartengono all'account. */
export function LiveProfilesPanel() {
  const { state, coordinator, create } = useLiveProfiles();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rename, setRename] = useState<{ id: string; name: string } | null>(null);
  const [remove, setRemove] = useState<string | null>(null);
  const [discardPending, setDiscardPending] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const act = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Operazione non riuscita.');
    } finally {
      setBusy(false);
    }
  };
  const current = state.editor?.working ?? state.profile?.configuration;
  return (
    <div className="aca-system__stack">
      <Body>La tua configurazione è condivisa fra PC, telefono e tablet.</Body>
      {state.offline && (
        <Notice>
          Centrale non raggiungibile. Le modifiche restano bozze su questo dispositivo.
        </Notice>
      )}
      {(error || state.error) && <Notice tone="danger">{error || state.error}</Notice>}
      <div className="aca-system__group">
        <Field
          label="Nome del nuovo profilo"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button
          variant="primary"
          disabled={
            busy || state.offline || Boolean(state.editor) || !name.trim()
          }
          onClick={() =>
            void act(async () => {
              await create(name.trim(), state.clientName, current);
              setName('');
            })
          }
        >
          Crea una copia come nuovo profilo
        </Button>
      </div>
      <ul className="aca-system__list" aria-label="Profili dell’account">
        {state.profiles.map((profile) => (
          <li key={profile.id} className="aca-system__item">
            <div className="aca-system__item-text">
              <Body>{profile.name}</Body>
              <Caption>
                {profile.id === state.profile?.id
                  ? 'Attivo nel tuo account'
                  : `Revisione ${profile.revision}`}
              </Caption>
            </div>
            {rename?.id === profile.id ? (
              <div className="aca-system__actions">
                <Field
                  label="Nuovo nome del profilo"
                  value={rename.name}
                  onChange={(event) => setRename({ ...rename, name: event.target.value })}
                />
                <Button variant="control" onClick={() => setRename(null)}>
                  Annulla
                </Button>
                <Button
                  variant="primary"
                  disabled={busy || !rename.name.trim()}
                  onClick={() =>
                    void act(async () => {
                      await coordinator.rename(profile.id, rename.name.trim());
                      setRename(null);
                    })
                  }
                >
                  Salva il nome
                </Button>
              </div>
            ) : remove === profile.id ? (
              <div className="aca-system__actions">
                <Caption>Eliminare «{profile.name}»? Le bozze locali restano esportabili.</Caption>
                <Button variant="control" onClick={() => setRemove(null)}>
                  Annulla
                </Button>
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() =>
                    void act(async () => {
                      await coordinator.remove(profile.id);
                      setRemove(null);
                    })
                  }
                >
                  Elimina
                </Button>
              </div>
            ) : (
              <div className="aca-system__actions">
                <Button
                  variant="control"
                  disabled={
                    busy ||
                    state.offline ||
                    Boolean(state.editor) ||
                    profile.id === state.profile?.id
                  }
                  onClick={() => void act(() => coordinator.select(profile.id))}
                >
                  Usa questo profilo
                </Button>
                <Button
                  variant="control"
                  disabled={busy || state.offline}
                  onClick={() => setRename({ id: profile.id, name: profile.name })}
                >
                  Rinomina
                </Button>
                <Button
                  variant="control"
                  disabled={busy || state.offline || Boolean(state.editor)}
                  onClick={() => setRemove(profile.id)}
                >
                  Elimina
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="aca-system__group">
        <Body>File della configurazione</Body>
        <Caption>
          L’importazione crea una copia indipendente, senza cambiare casa o accesso.
        </Caption>
        <div className="aca-system__actions">
          <Button
            variant="control"
            disabled={!current}
            onClick={() => downloadProfileJson(current, 'acasystem-configurazione.json')}
          >
            Esporta configurazione
          </Button>
          <Button
            variant="control"
            disabled={busy || state.offline || Boolean(state.editor)}
            onClick={() => input.current?.click()}
          >
            Importa come nuovo profilo
          </Button>
          <input
            ref={input}
            type="file"
            accept=".json,application/json"
            hidden
            aria-label="Importa configurazione indipendente"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              void act(async () => {
                const value: unknown = JSON.parse(await file.text());
                const snapshot =
                  isObject(value) && isObject(value.snapshot)
                    ? value.snapshot
                    : unwrapImportedSnapshot(value);
                if (!snapshot || !isValidSnapshot(snapshot))
                  throw new Error('Il file non contiene una configurazione valida.');
                await create(
                  name.trim() || file.name.replace(/\.json$/i, ''),
                  state.clientName,
                  (isObject(value) && isObject(value.snapshot)
                    ? value
                    : { snapshot }) as Configuration
                );
              });
            }}
          />
        </div>
      </div>
      <div className="aca-system__group">
        <Body>Bozze locali</Body>
        <Caption>
          Fino a 10 MiB, senza cancellazione automatica. Le bozze non inviano comandi ai
          dispositivi.
        </Caption>
        {!state.drafts.length && <Caption>Nessuna bozza conservata.</Caption>}
        {state.drafts.map((draft) => (
          <div key={draft.id} className="aca-system__item">
            <div className="aca-system__item-text">
              <Body>{draft.title}</Body>
              <Caption>{new Date(draft.updatedAt).toLocaleString('it-IT')}</Caption>
            </div>
            <div className="aca-system__actions">
              <Button
                variant="control"
                disabled={busy || Boolean(state.editor)}
                onClick={() => void act(() => coordinator.resume(draft))}
              >
                Riprendi
              </Button>
              <Button
                variant="control"
                disabled={busy || state.offline || Boolean(state.editor)}
                onClick={() =>
                  void act(() =>
                    create(
                      `${draft.title} — copia`,
                      state.clientName,
                      applyChanges(draft.base, draft.changes)
                    )
                  )
                }
              >
                Crea copia indipendente
              </Button>
              <Button
                variant="control"
                onClick={() => downloadProfileJson(draft, 'acasystem-bozza.json')}
              >
                Esporta bozza
              </Button>
              <Button
                variant="control"
                disabled={state.editor?.draftId === draft.id}
                onClick={() =>
                  draft.pendingOperation
                    ? setDiscardPending(draft.id)
                    : void act(() => coordinator.discardDraft(draft.id))
                }
              >
                Scarta
              </Button>
              {discardPending === draft.id && (
                <div className="aca-system__subpanel">
                  <Caption>
                    Può essere già salvata sulla centrale. Scartare questa copia locale non annulla
                    le modifiche già applicate.
                  </Caption>
                  <Button variant="control" onClick={() => setDiscardPending(null)}>
                    Conserva bozza
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() =>
                      void act(async () => {
                        await coordinator.discardDraft(draft.id);
                        setDiscardPending(null);
                      })
                    }
                  >
                    Scarta solo la copia locale
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
