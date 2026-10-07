import { useRef, useState, type ChangeEvent } from 'react';
import { Body, Button, Caption, Field, IconText, Skeleton } from '@/components/primitives';
import type { ProfileRecord } from '@/@types/api';
import { FormRow, InlineConfirm, Notice } from '@/templates/sheets/parts/Form';

export interface ProfilesSectionProps {
  /** A Home Assistant user is known: profiles live on the server under that user. */
  hasUser: boolean;
  backendAvailable: boolean;
  profiles: ProfileRecord[];
  loading: boolean;
  error: string | null;
  loadSummary: string | null;
  onSave: (name: string, deviceLabel: string) => Promise<unknown>;
  onLoad: (profile: ProfileRecord) => void;
  onRename: (id: string, name: string, deviceLabel: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  /** Snapshot of this device, ready to be saved as a file. */
  onExport: () => unknown;
  /** Applies an imported snapshot; throws when the file is not a valid configuration. */
  onImport: (data: unknown) => void;
}

type Pending =
  | { kind: 'load'; profile: ProfileRecord }
  | { kind: 'delete'; profile: ProfileRecord }
  | { kind: 'rename'; profile: ProfileRecord }
  | null;

const dateOf = (value: string | undefined): string => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
};

/** Downloads a JSON file built in memory (no server round trip). */
function downloadJson(data: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

/**
 * Profiles saved on the Acasystem server for the HA user, plus export and import of this
 * device's configuration as a file. Loading or importing replaces the current layout.
 */
export function ProfilesSection({
  hasUser,
  backendAvailable,
  profiles,
  loading,
  error,
  loadSummary,
  onSave,
  onLoad,
  onRename,
  onDelete,
  onExport,
  onImport,
}: ProfilesSectionProps) {
  const [name, setName] = useState('');
  const [device, setDevice] = useState('');
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState<Pending>(null);
  const [renameName, setRenameName] = useState('');
  const [renameDevice, setRenameDevice] = useState('');
  const [fileMessage, setFileMessage] = useState<{
    tone: 'danger' | 'success';
    text: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Dai un nome al profilo.');
      return;
    }
    setNameError(undefined);
    try {
      await onSave(trimmed, device.trim());
      setName('');
      setDevice('');
    } catch {
      // The hook keeps the error message.
    }
  };

  const exportFile = () => {
    setFileMessage(null);
    try {
      const data = onExport();
      downloadJson(data, `acasystem-configurazione-${new Date().toISOString().slice(0, 10)}.json`);
      setFileMessage({ tone: 'success', text: 'File della configurazione creato.' });
    } catch {
      setFileMessage({
        tone: 'danger',
        text: 'Esportazione non riuscita: la configurazione non è valida.',
      });
    }
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFileMessage(null);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      onImport(parsed);
      setFileMessage({ tone: 'success', text: `Configurazione importata da «${file.name}».` });
    } catch {
      setFileMessage({
        tone: 'danger',
        text: 'Il file non è una configurazione di Acasystem o di Tunet valida: nulla è cambiato.',
      });
    }
  };

  const serverReady = hasUser && backendAvailable;

  return (
    <div className="aca-system__stack">
      <div className="aca-system__group">
        <Body as="span" size="sm" className="aca-form-row__label">
          File della configurazione
        </Body>
        <Caption as="p">
          Pagine, widget e barra di stato di questo dispositivo, senza credenziali.
        </Caption>
        <div className="aca-system__actions">
          <Button variant="control" size="sm" onClick={exportFile}>
            <IconText icon="share">Esporta in un file</IconText>
          </Button>
          <Button variant="control" size="sm" onClick={() => fileRef.current?.click()}>
            <IconText icon="add">Importa da un file</IconText>
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-label="File della configurazione da importare"
            onChange={(event) => {
              void importFile(event);
            }}
          />
        </div>
        {fileMessage && <Notice tone={fileMessage.tone}>{fileMessage.text}</Notice>}
      </div>

      <div className="aca-system__group">
        <Body as="span" size="sm" className="aca-form-row__label">
          Profili sul server
        </Body>
        {!hasUser && (
          <Notice>Collega Home Assistant con un utente per salvare e caricare i profili.</Notice>
        )}
        {hasUser && !backendAvailable && (
          <Notice tone="danger">
            Il server di Acasystem non risponde: i profili non sono disponibili per ora.
          </Notice>
        )}
        {serverReady && (
          <>
            <FormRow label="Nome del nuovo profilo">
              {({ labelId }) => (
                <Field
                  label="Nome del nuovo profilo"
                  aria-labelledby={labelId}
                  placeholder="Per esempio Tablet dell’ingresso"
                  value={name}
                  error={nameError}
                  onChange={(event) => setName(event.target.value)}
                />
              )}
            </FormRow>
            <FormRow label="Dispositivo, facoltativo">
              {({ labelId }) => (
                <Field
                  label="Dispositivo"
                  aria-labelledby={labelId}
                  value={device}
                  onChange={(event) => setDevice(event.target.value)}
                />
              )}
            </FormRow>
            <div className="aca-system__actions">
              <Button variant="primary" size="md" loading={loading} onClick={() => void save()}>
                Salva il profilo
              </Button>
            </div>
          </>
        )}
        {error && (
          <Notice tone="danger">
            Operazione sui profili non riuscita. Controlla il collegamento al server e riprova.
          </Notice>
        )}
        {loadSummary && (
          <Notice>Profilo caricato: alcune pagine mancanti o vuote sono state ricostruite.</Notice>
        )}
        {serverReady &&
          (loading && profiles.length === 0 ? (
            <Skeleton rows={2} label="Caricamento dei profili…" />
          ) : profiles.length === 0 ? (
            <Caption as="p">
              Nessun profilo salvato. Salva questa configurazione per iniziare.
            </Caption>
          ) : (
            <ul className="aca-system__list" aria-label="Profili salvati">
              {profiles.map((profile) => {
                const label = profile.name || 'Profilo senza nome';
                const details = [profile.device_label, dateOf(profile.updated_at)]
                  .filter(Boolean)
                  .join(' · ');
                const current = pending?.profile.id === profile.id ? pending : null;
                return (
                  <li key={profile.id} className="aca-system__item">
                    <div className="aca-system__item-text">
                      <Body as="span" size="sm">
                        {label}
                      </Body>
                      {details && <Caption>{details}</Caption>}
                    </div>
                    {current?.kind === 'load' && (
                      <InlineConfirm
                        message={`Caricare «${label}»? Pagine e widget di questo dispositivo vengono sostituiti.`}
                        confirmLabel="Carica"
                        onCancel={() => setPending(null)}
                        onConfirm={() => {
                          setPending(null);
                          onLoad(profile);
                        }}
                      />
                    )}
                    {current?.kind === 'delete' && (
                      <InlineConfirm
                        message={`Eliminare il profilo «${label}» dal server?`}
                        confirmLabel="Elimina"
                        onCancel={() => setPending(null)}
                        onConfirm={() => {
                          setPending(null);
                          void onDelete(profile.id).catch(() => undefined);
                        }}
                      />
                    )}
                    {current?.kind === 'rename' && (
                      <div className="aca-system__subpanel">
                        <Field
                          label="Nuovo nome"
                          value={renameName}
                          onChange={(event) => setRenameName(event.target.value)}
                        />
                        <Field
                          label="Dispositivo"
                          placeholder="Dispositivo, facoltativo"
                          value={renameDevice}
                          onChange={(event) => setRenameDevice(event.target.value)}
                        />
                        <div className="aca-system__actions">
                          <Button variant="control" size="sm" onClick={() => setPending(null)}>
                            Annulla
                          </Button>
                          <Button
                            variant="control"
                            size="sm"
                            disabled={!renameName.trim()}
                            onClick={() => {
                              setPending(null);
                              void onRename(
                                profile.id,
                                renameName.trim(),
                                renameDevice.trim()
                              ).catch(() => undefined);
                            }}
                          >
                            Salva il nome
                          </Button>
                        </div>
                      </div>
                    )}
                    {!current && (
                      <div className="aca-system__actions">
                        <Button
                          variant="control"
                          size="sm"
                          aria-label={`Carica ${label}`}
                          onClick={() => setPending({ kind: 'load', profile })}
                        >
                          Carica
                        </Button>
                        <Button
                          variant="control"
                          size="sm"
                          aria-label={`Rinomina ${label}`}
                          onClick={() => {
                            setRenameName(profile.name ?? '');
                            setRenameDevice(profile.device_label ?? '');
                            setPending({ kind: 'rename', profile });
                          }}
                        >
                          Rinomina
                        </Button>
                        <Button
                          variant="control"
                          size="sm"
                          aria-label={`Elimina ${label}`}
                          onClick={() => setPending({ kind: 'delete', profile })}
                        >
                          Elimina
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ))}
      </div>
    </div>
  );
}
