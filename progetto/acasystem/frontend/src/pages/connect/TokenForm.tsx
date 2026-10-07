import { useRef, useState, type FormEvent } from 'react';
import { Button, Caption, Field, IconText } from '@/components/primitives';
import { FormRow, Notice } from '@/templates/sheets/parts/Form';
import { PROBE_MESSAGES, probeToken, type ProbeResult } from './connection';
import './connect.css';

export interface TokenFormProps {
  /** Home Assistant ha accettato il token: il proprietario lo salva. */
  onAccepted: (token: string) => void;
}

/**
 * Token di accesso a lunga durata per i tablet fissi in modalità kiosk: verificato con una
 * connessione di prova attraverso il proxy, poi consegnato al proprietario.
 */
export function TokenForm({ onAccepted }: TokenFormProps) {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [testing, setTesting] = useState(false);
  const [probe, setProbe] = useState<Exclude<ProbeResult, 'ok'> | null>(null);
  const tokenRef = useRef<HTMLInputElement>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (testing) return;
    setProbe(null);
    const secret = token.trim();
    setError(secret ? undefined : 'Incolla il token di accesso.');
    if (!secret) {
      tokenRef.current?.focus();
      return;
    }
    setTesting(true);
    try {
      const result = await probeToken(secret);
      if (result === 'ok') {
        setToken('');
        onAccepted(secret);
        return;
      }
      setProbe(result);
      if (result === 'rejected') tokenRef.current?.focus();
    } finally {
      setTesting(false);
    }
  };

  return (
    <form
      className="aca-connect-form"
      noValidate
      aria-label="Token a lunga durata"
      onSubmit={(event) => void submit(event)}
    >
      <FormRow
        label="Token di accesso a lunga durata"
        hint="Per i tablet fissi in modalità kiosk. Crealo nel tuo profilo di Home Assistant, nella scheda Sicurezza."
      >
        {({ labelId, hintId }) => (
          <Field
            ref={tokenRef}
            label="Token di accesso a lunga durata"
            aria-labelledby={labelId}
            aria-describedby={hintId}
            name="token"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={token}
            error={error}
            onChange={(event) => {
              setToken(event.target.value);
              setError(undefined);
              setProbe(null);
            }}
          />
        )}
      </FormRow>

      {probe && <Notice tone="danger">{PROBE_MESSAGES[probe]}</Notice>}
      {testing && <Notice>Verifica del token in corso…</Notice>}

      <Caption as="p">
        Il token resta salvato in questo browser e arriva a Home Assistant attraverso il server
        Acasystem, che lo usa anche per riconoscere l’utente. Non viene registrato nei log.
      </Caption>

      <div className="aca-connect-form__actions">
        <Button type="submit" variant="secondary" size="md" loading={testing}>
          <IconText icon="key">Collega con il token</IconText>
        </Button>
      </div>
    </form>
  );
}
