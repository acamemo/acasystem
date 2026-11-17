import { useEffect, useState } from 'react';
import { Body, Button, Caption, ConfirmSheet, Field, Heading, Surface } from '@/components/primitives';
import { listClients, renameClient, revokeClient, type ClientRecord } from '@/api/clientSession';
import { useClientSession } from '@/hooks/client/ClientAccessGate';

export function ClientsSection({ onLogout }: { onLogout: () => void }) {
  const session = useClientSession();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<ClientRecord | null>(null);
  const [retry, setRetry] = useState(0);
  const houseId = session?.houseId;
  const userId = session?.user.id;
  const offline = session?.offline;
  useEffect(() => {
    if (!houseId || !userId || offline) return;
    let active = true;
    void listClients().then((rows) => {
      if (!active) return;
      setClients(rows); setNames(Object.fromEntries(rows.map((row) => [row.id, row.label]))); setError('');
    }).catch(() => { if (active) setError('Non riesco a leggere i dispositivi. Riprova quando la centrale è raggiungibile.'); });
    return () => { active = false; };
  }, [houseId, userId, offline, retry]);
  const replace = (record: ClientRecord) => setClients((rows) => rows.map((row) => row.id === record.id ? record : row));
  const rename = async (record: ClientRecord) => {
    const label = names[record.id]?.trim(); if (!label || busy) return;
    setBusy(record.id); setError(''); setNotice('');
    try { replace(await renameClient(record.id, label)); setNotice('Nome del dispositivo aggiornato.'); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Nome non aggiornato. Riprova.'); }
    finally { setBusy(null); }
  };
  const revoke = async () => {
    if (!pending || busy) return;
    const selected = pending; setPending(null); setBusy(selected.id); setError(''); setNotice('');
    try {
      const record = await revokeClient(selected.id); replace(record);
      setNotice(record.revocationPending ? 'Accesso bloccato in ACA. La conferma della centrale è ancora in attesa: riprova quando è raggiungibile.' : 'Dispositivo scollegato. Per usarlo di nuovo sarà necessario accedere.');
      // ACA blocca subito questo accesso anche se HA deve ancora confermare la revoca.
      if (record.id === session?.client.id) onLogout();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Non riesco a scollegare questo dispositivo.'); }
    finally { setBusy(null); }
  };
  if (!session) return <Body>Accedi al tuo account per gestire i dispositivi collegati.</Body>;
  return <div className="aca-system__stack">
    <Body size="sm">Questi dispositivi usano il tuo account. Scollegarne uno conserva gli altri accessi, i profili e l’account della casa.</Body>
    {session.offline && <Body role="status">La centrale non è raggiungibile. Nomi e accessi potranno essere aggiornati quando tornerà disponibile.</Body>}
    {clients.map((record) => <Surface key={record.id} behavior="static" shape="card" contentClassName="aca-system__stack">
      <Heading level={3} size="sm">{record.label}{record.id === session.client.id ? ' · Questo dispositivo' : ''}</Heading>
      <Caption>{record.platform === 'windows' ? 'App Windows' : record.platform === 'android' ? 'Android' : 'Browser'}{record.revokedAt ? record.revocationPending ? ' · Revoca in attesa' : ' · Scollegato' : ''}</Caption>
      {!record.revokedAt && <>
        <Field label={`Nome di ${record.label}`} value={names[record.id] ?? record.label} maxLength={128} disabled={busy !== null || session.offline}
          onChange={(event) => setNames((previous) => ({ ...previous, [record.id]: event.target.value }))} />
        <Button variant="control" disabled={busy !== null || session.offline || !names[record.id]?.trim()} onClick={() => void rename(record)}>Salva nome</Button>
      </>}
      {(!record.revokedAt || record.revocationPending) && <Button variant="control" disabled={busy !== null || session.offline} onClick={() => setPending(record)}>{record.revocationPending ? 'Riprova revoca' : 'Scollega dispositivo'}</Button>}
    </Surface>)}
    {notice && <Body role="status">{notice}</Body>}
    {error && <Body role="alert">{error}</Body>}
    <Button variant="control" disabled={busy !== null || session.offline} onClick={() => setRetry((value) => value + 1)}>Aggiorna elenco</Button>
    <ConfirmSheet open={pending !== null} title={`Scollegare ${pending?.label ?? 'il dispositivo'}?`}
      description="Questo accesso verrà revocato. Gli altri dispositivi e i tuoi profili restano disponibili."
      confirmLabel="Scollega dispositivo" danger onCancel={() => setPending(null)} onConfirm={() => void revoke()} />
  </div>;
}
