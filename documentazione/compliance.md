# Registro dei vincoli software e cloud

Aggiornato: 2026-10-02. Ambito approvato: software e cloud, secondo [ADR-0001](decisions/ADR-0001-documentazione-e-storico.md). Installazioni fisiche, sicurezza elettrica e conformità hardware sono separate; le dipendenze note restano in ISSUE-005.

Questo registro raccoglie vincoli, evidenze e verifiche mancanti. Non dichiara la conformità complessiva del prodotto. Applicabilità delle norme, ruoli giuridici e valutazioni contrattuali richiedono informazioni sul servizio e, dove necessario, verifica professionale.

## Stati e responsabilità

**Verificato nella fonte** descrive ciò che una fonte attesta, non la conformità dell'adozione ACA. Le altre condizioni sono **Da valutare**, **Da risolvere**, **Verificato per l'uso approvato** e **Non applicabile con motivazione**. Una voce richiede una nuova verifica quando cambiano versione, fornitore, distribuzione, finalità o flusso dei dati.

Il committente approva il perimetro e individua i responsabili. Ruoli specifici per licenze, privacy e operazioni non sono ancora assegnati. Gli agenti raccolgono evidenze e distinguono questioni tecniche da valutazioni legali, senza auto-certificare il prodotto.

## Registro dei vincoli

| ID | Oggetto | Evidenza / stato attuale | Verifica necessaria per l'uso ACA | Problema |
|---|---|---|---|---|
| C-01 | HAKit Core e Components | Testi delle licenze verificati nella revisione esaminata; uso commerciale richiede licenza separata. Adozione da risolvere. | Documentare autorizzazione/licenza applicabile alla versione e al prodotto prima dell'integrazione commerciale, oppure sottoporre un'alternativa all'utente. | ISSUE-001 |
| C-02 | Riuso Tunet | GPL-3.0 verificata nella revisione esaminata; modalità di riuso da valutare. | Distinguere riferimento progettuale e codice incorporato; verificare condizioni degli artefatti che verranno distribuiti. | ISSUE-002 |
| C-03 | Altre dipendenze e modelli AI | Nessun manifest applicativo o modello adottato. Da valutare. | Inventariare versioni, provenienza, licenze, notice e condizioni d'uso; valutare compatibilità con distribuzione e servizio previsti. | ISSUE-014 |
| C-04 | Google OAuth, Resend, Hetzner | Fornitori proposti, nessuna configurazione o condizione contrattuale acquisita. Da valutare. | Identificare condizioni pertinenti, dati inviati, localizzazione/trasferimenti, accessi e documentazione contrattuale necessaria. | ISSUE-014 |
| C-05 | Identità, privilegi e isolamento | Progetto non definito né collaudato. Da valutare. | Definire autorizzazioni e revoca; provare il rifiuto dei comandi/API non autorizzati e l'isolamento tra impianti. | ISSUE-006/008 |
| C-06 | Account e dati d'impianto | Dati e finalità non inventariati. Da valutare. | Documentare necessità, finalità, ruoli, accessi, informazione agli utenti, conservazione e gestione delle richieste sui dati quando applicabili. | ISSUE-014 |
| C-07 | Chat, contesto AI e scenari | Nessun flusso dati implementato. Da valutare. | Identificare contesto ammesso, dati nei prompt/log, accessi, conservazione e condizioni del modello utilizzato. | ISSUE-010/014 |
| C-08 | Log, backup e ripristino | Procedure non definite o provate. Da valutare. | Descrivere dati raccolti, accessi, conservazione, anonimizzazione delle evidenze e prove di recupero. | ISSUE-011/014 |
| C-09 | Trasporto e credenziali | Nessun endpoint o schema TLS ACA verificato. Da valutare. | Documentare confini di fiducia, certificati, segreti fuori Git e proprietà di cifratura effettivamente dimostrate. | ISSUE-013 |

## Fonti e revisioni già esaminate

HAKit: revisione `df12c20dba61ca68ab462fd3ec0918db16dc8a8f`. Le licenze esaminate sono quelle di [Core](https://github.com/shannonhochkins/ha-component-kit/blob/df12c20dba61ca68ab462fd3ec0918db16dc8a8f/packages/core/LICENSE.md) e [Components](https://github.com/shannonhochkins/ha-component-kit/blob/df12c20dba61ca68ab462fd3ec0918db16dc8a8f/packages/components/LICENSE.md). Questo dato non identifica una dipendenza installata nel progetto.

Tunet: revisione `5dec99587b4fcc2fb1f831a0a0002c9b90e6958e`, [licenza](https://github.com/oyvhov/Tunet/blob/5dec99587b4fcc2fb1f831a0a0002c9b90e6958e/LICENSE) e [manifest](https://github.com/oyvhov/Tunet/blob/5dec99587b4fcc2fb1f831a0a0002c9b90e6958e/package.json). Nessun codice Tunet è incorporato in ACA.

Fonti consultate il 2026-10-02; metodi ed esiti nell'[audit iniziale](reports/REP-20261002-001-audit-product.md). La verifica delle condizioni di un impiego concreto resta distinta dalla lettura delle licenze.

## Inventario dei dati da compilare

| Categoria prevista | Informazioni da acquisire | Stato |
|---|---|---|
| Account e associazioni utente-impianto | Campi necessari, finalità, ruoli, accessi, conservazione e cancellazione | Non definito. |
| Presenza, consumi e stati dei dispositivi | Dati locali/cloud, granularità, finalità e conservazione | Non definito. |
| Piantine e configurazioni | Proprietari, caricamento, accessi, backup e rimozione | Non definito. |
| Chat e scenari AI | Contenuto dei prompt, risposte, log, modello e revisori | Non definito. |
| Audit operativi e backup | Dati inclusi, destinazioni, accessi, conservazione e recupero | Non definito. |

Non compilare questo inventario con dati reali dei clienti. Registrare schemi e necessità, mantenendo dati di test e segreti fuori dalla documentazione pubblicabile.

## Chiusura e mantenimento

Per ogni verifica registrare data, responsabile, fonte/versione, uso valutato, risultato ed eventuali limiti. Collegare autorizzazioni e documentazione contrattuale tramite riferimenti sicuri, senza copiare materiale riservato. La risoluzione di un vincolo aggiorna anche il problema corrente e il report; una scelta tecnica alternativa richiede autorizzazione nell'incarico pertinente.
