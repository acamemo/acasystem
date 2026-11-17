import { useEffect, useRef, useState } from 'react';
import { Body, Button, Caption, Surface, Title } from '@/components/primitives';
import { importQrPairing, type QrConfiguration } from '@/api/qrPairing';
import { acceptWebPairing, downloadPortableLayout, type WebPairingEntry } from '@/api/webPairing';
import './connect.css';

export function WebPairingPage({ entry, onContinue }: { entry: WebPairingEntry; onContinue: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [configuration, setConfiguration] = useState<QrConfiguration | null>(null);
  const requested = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const download = () => {
    if (!configuration) return;
    try { downloadPortableLayout(configuration); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Non riesco a scaricare il file layout.'); }
  };
  const choose = async (action: 'account' | 'configuration') => {
    if (entry.kind !== 'ready' || requested.current) return;
    requested.current = true;
    setBusy(true);
    setError('');
    try {
      const value = await acceptWebPairing(entry.code, action);
      if (!active.current) return;
      if (action === 'account') {
        // Identità attesa prima di montare HomeAssistantProvider e SettingsSync.
        importQrPairing(value, {});
        onContinue();
      } else setConfiguration(value.configuration!);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Non riesco a usare il QR Code. Generane uno nuovo sul PC.');
      requested.current = false;
    } finally { setBusy(false); }
  };
  return (
    <main className="aca-connect">
      <Surface className="aca-connect__panel" contentClassName="aca-connect__content">
        <div className="aca-connect__intro">
          <Title level={1}>{configuration ? 'Il layout è pronto' : 'Apri ACA su questo dispositivo'}</Title>
          <Body tone="muted">Puoi usare ACA nel browser senza installare l’app.</Body>
        </div>
        {entry.kind === 'invalid' ? <>
          <Body role="alert">Il collegamento non è valido. Genera un nuovo QR Code sul PC.</Body>
          <Button variant="control" onClick={onContinue}>Apri ACA</Button>
        </> : configuration ? <>
          <Body>Scarica il file, poi apri ACA della tua casa e accedi con il tuo account. In Sistema → QR Code scegli «Importa file layout».</Body>
          <Caption>La copia non collega l’account o i dispositivi del mittente. Puoi chiudere questa pagina dopo il download.</Caption>
          <Button variant="control" onClick={download}>Scarica il file layout</Button>
        </> : <>
          <Body>Collega lo stesso account del PC per condividere le modifiche, oppure scarica una copia dell’interfaccia da importare nella tua casa.</Body>
          <Button variant="control" disabled={busy} onClick={() => void choose('account')}>Collega account</Button>
          <Caption>Dovrai accedere con lo stesso account ACA del PC. Il QR Code non contiene password o token di accesso.</Caption>
          <Button variant="control" disabled={busy} onClick={() => void choose('configuration')}>Importa layout</Button>
          <Caption>Scarica solo il layout e l’aspetto. Non accede alla casa del mittente e non ne copia i dispositivi.</Caption>
          {busy && <Body role="status">Acquisizione in corso…</Body>}
        </>}
        {error && <Body role="alert">{error}</Body>}
      </Surface>
    </main>
  );
}
