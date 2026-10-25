import { useState } from 'react';
import { Body, Button, Sheet } from '@/components/primitives';
import './aiDevelopmentNotice.css';

/** Information about development tools; it does not enable an AI feature in the app. */
export function AiDevelopmentNotice() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <Button
        variant="control"
        className="aca-ai-notice"
        aria-label="Informativa sull’uso dell’AI nello sviluppo"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="aca-ai-notice__icon" aria-hidden="true" />
        AI
      </Button>
      <Sheet
        open={open}
        onClose={close}
        title="Uso dell’AI nello sviluppo di Acasystem"
        closeLabel="Chiudi l’informativa sull’uso dell’AI"
        footer={
          <Button variant="secondary" onClick={close}>
            Chiudi
          </Button>
        }
      >
        <div className="aca-ai-notice__content">
          <Body>
            Acasystem è sviluppata da MeMo Srl. Lo sviluppo software è curato da Mattia Pentagallo.
          </Body>
          <Body>
            Nel processo di sviluppo vengono utilizzati strumenti di intelligenza artificiale come
            supporto alla programmazione, in particolare per:
          </Body>
          <Body as="div">
            <ul className="aca-ai-notice__list">
              <li>Automatizzare attività ripetitive di sviluppo e manutenzione.</li>
              <li>
                Preparare test e analizzare il comportamento su macchine virtuali e dispositivi con
                risorse limitate.
              </li>
              <li>Supportare lo sviluppo e il miglioramento delle funzionalità.</li>
              <li>Rifattorizzare il codice e individuare opportunità di ottimizzazione.</li>
            </ul>
          </Body>
          <Body>
            Le decisioni sul progetto e sulla pubblicazione delle versioni restano in capo al team
            di sviluppo di MeMo Srl. L’uso di questi strumenti non sostituisce la valutazione delle
            modifiche e le verifiche necessarie prima del rilascio.
          </Body>
          <Body size="sm" tone="muted">
            Questa informativa riguarda il processo di sviluppo dell’applicazione.
          </Body>
        </div>
      </Sheet>
    </>
  );
}
