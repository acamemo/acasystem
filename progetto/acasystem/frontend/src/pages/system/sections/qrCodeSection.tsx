import { useEffect, useMemo, useRef, useState } from 'react';
import { Body, Button, Caption, Field, Heading } from '@/components/primitives';
import { centralConnectionUri, createQrInvitation, pairingUri, qrImage, readQrEndpoint, type QrConfiguration, type QrInvitation } from '@/api/qrPairing';
import { importPortableLayoutFile, validatePortableLayoutConfiguration } from '@/api/webPairing';
import { clearPendingLayoutCopy, readPendingLayoutCopy } from '@/api/qrHandoff';

export function QrCodeSection({ authenticated, onImportConfiguration }: {
  authenticated: boolean;
  onImportConfiguration?: (configuration: QrConfiguration) => void | Promise<unknown>;
}) {
  const [invite, setInvite] = useState<QrInvitation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [connectionUri, setConnectionUri] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pendingCopy, setPendingCopy] = useState(readPendingLayoutCopy);
  const addressRef = useRef<HTMLInputElement>(null);
  const connectionImage = useMemo(() => connectionUri ? qrImage(connectionUri) : null, [connectionUri]);
  const showConnection = async () => {
    setConnecting(true);
    setError('');
    try {
      const endpoint = await readQrEndpoint();
      if (!endpoint) throw new Error('La centrale non ha ancora un indirizzo disponibile sulla rete locale.');
      setConnectionUri(centralConnectionUri(endpoint));
      setCopied(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Non riesco a mostrare il collegamento alla centrale.');
    } finally { setConnecting(false); }
  };
  const importFile = async (file: File) => {
    if (!authenticated || !onImportConfiguration) return;
    setImporting(true);
    setError('');
    setImportMessage('');
    try {
      await onImportConfiguration(await importPortableLayoutFile(file));
      setImportMessage('Layout importato come copia. La tua casa e il tuo account sono rimasti gli stessi; ricollega i widget ai tuoi dispositivi.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Non riesco a importare il layout.');
    } finally { setImporting(false); }
  };
  const image = useMemo(() => invite ? qrImage(pairingUri(invite)) : null, [invite]);
  useEffect(() => {
    if (!invite) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [invite]);
  const generate = async () => {
    setBusy(true);
    setError('');
    setInvite(null);
    try {
      const endpoint = await readQrEndpoint();
      if (!endpoint) throw new Error('La centrale non ha ancora un indirizzo disponibile sulla rete locale.');
      const generated = await createQrInvitation(endpoint);
      pairingUri(generated);
      setInvite(generated);
      setNow(Date.now());
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Non riesco a generare il QR Code. Riprova.');
    } finally { setBusy(false); }
  };
  const expired = invite !== null && now >= invite.expiresAt;
  return (
    <div className="aca-system__stack">
      <Heading level={3} size="sm">Collegamento alla centrale</Heading>
      <Caption>Questo codice apre ACA sulla centrale. Ogni dispositivo accede con il proprio account; il codice non contiene credenziali e non associa un account.</Caption>
      <Caption>Il collegamento resta valido finché l’indirizzo del mini PC rimane lo stesso.</Caption>
      <Button variant="control" disabled={!authenticated || connecting} onClick={() => void showConnection()}>
        {connecting ? 'Preparazione…' : 'Mostra QR di collegamento'}
      </Button>
      {connectionUri && <figure>
        <img src={connectionImage ?? undefined} width={288} height={288} alt="QR Code di collegamento alla centrale" />
        <figcaption>
          <Field ref={addressRef} label="Indirizzo della centrale" readOnly value={connectionUri} onFocus={(event) => event.currentTarget.select()} />
          <Button variant="control" onClick={() => {
            void (async () => {
              try {
                if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(connectionUri);
                else { addressRef.current?.focus(); addressRef.current?.select(); if (!document.execCommand('copy')) throw new Error(); }
                setCopied(true);
              } catch { addressRef.current?.focus(); addressRef.current?.select(); setError('Indirizzo selezionato: tieni premuto oppure usa Copia dal dispositivo.'); }
            })();
          }}>Copia indirizzo</Button>
          {copied && <Caption role="status">Indirizzo copiato.</Caption>}
        </figcaption>
      </figure>}
      <Heading level={3} size="sm">Invito account o copia layout</Heading>
      <Body size="sm">Genera un invito da inquadrare con la fotocamera del telefono o con ACA. Scegli «Collega account» per usare lo stesso account sincronizzato, oppure «Importa layout» per copiare solo l’interfaccia nella tua casa.</Body>
      <Caption>Il trasferimento richiede che il dispositivo raggiunga questa centrale sulla rete locale. L’invito dura cinque minuti e si può usare una sola volta.</Caption>
      {!authenticated && <Body size="sm">Accedi ad ACA per generare il codice.</Body>}
      <Button variant="control" disabled={!authenticated || busy} onClick={() => void generate()}>
        {busy ? 'Generazione…' : invite ? 'Genera un nuovo QR Code' : 'Genera QR Code'}
      </Button>
      {error && <Body size="sm" role="alert">{error}</Body>}
      {invite && !expired && (
        <figure>
          <img src={image ?? undefined} width={288} height={288} alt="QR Code temporaneo per collegare un dispositivo ACA o copiare l’interfaccia" />
          <figcaption><Caption>Valido ancora {Math.max(1, Math.ceil((invite.expiresAt - now) / 60_000))} minuti. Non contiene password o credenziali di accesso.</Caption></figcaption>
        </figure>
      )}
      {expired && <Body size="sm" role="status">Il codice è scaduto. Generane uno nuovo.</Body>}
      <Body size="sm">Importa file layout</Body>
      {pendingCopy && <>
        <Caption>Una copia ricevuta dal QR è pronta. Salvala come nuovo profilo indipendente nella tua casa.</Caption>
        <Button variant="control" disabled={!authenticated || importing || !onImportConfiguration} onClick={() => {
          void (async () => {
            setImporting(true); setError('');
            try {
              const configuration = await validatePortableLayoutConfiguration(pendingCopy);
              await onImportConfiguration?.(configuration);
              clearPendingLayoutCopy(); setPendingCopy(null); setImportMessage('Copia salvata come nuovo profilo indipendente.');
            } catch (failure) { setError(failure instanceof Error ? failure.message : 'Non riesco a importare la copia.'); }
            finally { setImporting(false); }
          })();
        }}>Salva il layout ricevuto</Button>
      </>}
      <Caption>Se hai scaricato un layout da un’altra casa, seleziona qui il file ACA. Viene copiato il layout, senza account o dispositivi del mittente.</Caption>
      <Field label="Importa file layout" type="file" accept=".json,.aca.json,application/json"
        disabled={!authenticated || importing || !onImportConfiguration}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) void importFile(file);
        }} />
      {importing && <Body size="sm" role="status">Verifica e importazione del file…</Body>}
      {importMessage && <Body size="sm" role="status">{importMessage}</Body>}
    </div>
  );
}
