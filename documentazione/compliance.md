# Registro dei vincoli software e cloud

Aggiornato: 2026-10-05. Ambito approvato: software e cloud, secondo [ADR-0001](decisions/ADR-0001-documentazione-e-storico.md). Installazioni fisiche, sicurezza elettrica e conformità hardware sono separate; le dipendenze note restano in ISSUE-005.

Questo registro raccoglie vincoli, evidenze e verifiche mancanti. Non dichiara la conformità complessiva del prodotto. Applicabilità delle norme, ruoli giuridici e valutazioni contrattuali richiedono informazioni sul servizio e, dove necessario, verifica professionale.

## Stati e responsabilità

**Verificato nella fonte** descrive ciò che una fonte attesta, non la conformità dell'adozione ACA. Le altre condizioni sono **Da valutare**, **Da risolvere**, **Verificato per l'uso approvato** e **Non applicabile con motivazione**. Una voce richiede una nuova verifica quando cambiano versione, fornitore, distribuzione, finalità o flusso dei dati.

Il committente approva il perimetro e individua i responsabili. Ruoli specifici per licenze, privacy e operazioni non sono ancora assegnati. Gli agenti raccolgono evidenze e distinguono questioni tecniche da valutazioni legali, senza auto-certificare il prodotto.

## Registro dei vincoli

| ID | Oggetto | Evidenza / stato attuale | Verifica necessaria per l'uso ACA | Problema |
|---|---|---|---|---|
| C-01 | HAKit Core e Components | Testi delle licenze verificati nella revisione esaminata; uso commerciale richiede licenza separata. Adozione da risolvere. | Documentare autorizzazione/licenza applicabile alla versione e al prodotto prima dell'integrazione commerciale, oppure sottoporre un'alternativa all'utente. | ISSUE-001 |
| C-02 | Riuso Tunet | Tunet 1.22.1, revisione 5dec995, acquisito e installato nel banco prova su richiesta umana; GPL-3.0 e licenza originale conservata. Distribuzione commerciale da valutare. | Identificare modifiche e artefatti forniti sui mini PC/Raspberry; verificare condizioni di distribuzione, licenze e notice prima della consegna ai clienti. | ISSUE-002 |
| C-03 | Altre dipendenze e modelli AI | Manifest/lockfile Tunet acquisiti senza aggiornamenti; nessun modello AI adottato. Da valutare per la distribuzione ACA. | Inventariare versioni, provenienza, licenze, notice e condizioni d'uso; valutare compatibilità con distribuzione e servizio previsti. | ISSUE-014 |
| C-04 | Fornitori esterni | Hetzner non applicabile alla direzione corrente per ADR-0003. Google/Resend restano opzioni future; nessun provider scelto per il remoto. | Quando un servizio viene proposto, identificare condizioni, dati inviati, localizzazione/trasferimenti e accessi; il funzionamento locale non certifica da solo la conformità. | ISSUE-014 |
| C-05 | Identità, privilegi e isolamento | Flusso admin iniziale/cliente e ruolo condominiale approvati; meccanismo non definito né collaudato. | Verificare logout/privilegi residui, autorizzazioni comuni/private, revoca e rifiuto delle API non autorizzate; valutare isolamento su hardware condiviso. | ISSUE-006/008/015 |
| C-06 | Account e dati d'impianto | Banco prova: account HA locale, sessione OAuth nel browser, layout/preferenze e snapshot/profili Tunet nel browser/SQLite. Nessuna credenziale acquisita dall'agente. Dati del prodotto da valutare. | Documentare necessità, finalità, ruoli, accessi, informazione agli utenti, conservazione e gestione delle richieste sui dati quando applicabili; includere flussi esterni ISSUE-016. | ISSUE-014/016 |
| C-07 | Chat, contesto AI e scenari | Nessun flusso dati implementato. Da valutare. | Identificare contesto ammesso, dati nei prompt/log, accessi, conservazione e condizioni del modello utilizzato. | ISSUE-010/014 |
| C-08 | Log, backup e ripristino | Procedure non definite o provate. Da valutare. | Descrivere dati raccolti, accessi, conservazione, anonimizzazione delle evidenze e prove di recupero. | ISSUE-011/014 |
| C-09 | Trasporto e credenziali | Nessun endpoint o schema TLS ACA verificato. Da valutare. | Documentare confini di fiducia, certificati, segreti fuori Git e proprietà di cifratura effettivamente dimostrate. | ISSUE-013 |
| C-10 | Reference UI raccolte | Sette esempi forniti dall'utente; autore originale, URL e licenza sconosciuti. Raccolti senza adattamento o integrazione. | Prima del riuso applicativo acquisire provenienza, licenza e condizioni per i singoli esempi; gli import React/styled-components non definiscono licenza dei campioni né dipendenze adottate. [Catalogo e fonti](design/componenti/README.md#provenienza). | ISSUE-014 |

## Fonti e revisioni già esaminate

HAKit: revisione `df12c20dba61ca68ab462fd3ec0918db16dc8a8f`. Le licenze esaminate sono quelle di [Core](https://github.com/shannonhochkins/ha-component-kit/blob/df12c20dba61ca68ab462fd3ec0918db16dc8a8f/packages/core/LICENSE.md) e [Components](https://github.com/shannonhochkins/ha-component-kit/blob/df12c20dba61ca68ab462fd3ec0918db16dc8a8f/packages/components/LICENSE.md). Questo dato non identifica una dipendenza installata nel progetto.

Tunet: revisione `5dec99587b4fcc2fb1f831a0a0002c9b90e6958e`, [licenza](https://github.com/oyvhov/Tunet/blob/5dec99587b4fcc2fb1f831a0a0002c9b90e6958e/LICENSE) e [manifest](https://github.com/oyvhov/Tunet/blob/5dec99587b4fcc2fb1f831a0a0002c9b90e6958e/package.json). I sorgenti originali sono ora acquisiti in progetto/tunet per l'installazione locale autorizzata del 2026-10-05; [provenienza e hash](../progetto/tunet-origin.json). L'audit delle condizioni degli artefatti distribuiti è ancora aperto.

Fonti consultate il 2026-10-02; metodi ed esiti nell'[audit iniziale](reports/REP-20261002-001-audit-product.md). La verifica delle condizioni di un impiego concreto resta distinta dalla lettura delle licenze.

Il 2026-10-05 `git ls-remote` conferma per Tunet main la stessa revisione `5dec99587b4fcc2fb1f831a0a0002c9b90e6958e`; README e licenza sono stati riletti. Non è una versione adottata nell'applicazione, che non esiste ancora. Distribuzione su hardware negli immobili confermata dall'utente; verifiche nel [report del pilota](reports/REP-20261005-001-direzione-pilota.md).

## Inventario dei dati da compilare

| Categoria prevista | Informazioni da acquisire | Stato |
|---|---|---|
| Account e associazioni utente-impianto | Campi necessari, finalità, ruoli, accessi, conservazione e cancellazione | Non definito. |
| Presenza, consumi e stati dei dispositivi | Dati locali/cloud, granularità, finalità e conservazione | Non definito. |
| Piantine e configurazioni | Proprietari, caricamento, accessi, backup e rimozione | Non definito. |
| Chat e scenari AI | Contenuto dei prompt, risposte, log, modello e revisori | Non definito. |
| Audit operativi e backup | Dati inclusi, destinazioni, accessi, conservazione e recupero | Non definito. |

Non compilare questo inventario con dati reali dei clienti. Registrare schemi e necessità, mantenendo dati di test e segreti fuori dalla documentazione pubblicabile.

## Banco prova Tunet — 2026-10-05

Fonti: [setup upstream acquisito](../progetto/tunet/docs/SETUP.md), oauthStorage.js, server/haAuth.js, index.html e manifest nella revisione registrata. Evidenze in [REP-20261005-004](reports/REP-20261005-004-installazione-tunet.md). Non sono stati creati account cloud o inviati token nei file del repository.

Tunet conserva cache OAuth/preferenze nel browser e dati SQLite in volume locale; la UI profili indica auto-sync attivo con ultima sincronizzazione. Cifratura applicativa a riposo off, come upstream. La pagina include Google Fonts; mappe/icone/media possono dipendere da altri endpoint, senza inventario delle richieste effettive. Questi dati richiedono approfondimento per offline e distribuzione (ISSUE-016); la raccolta locale non certifica privacy, sicurezza o conformità del prodotto. Non sono versionati account HA, database, cache, token o log applicativi.

## Chiusura e mantenimento

Per ogni verifica registrare data, responsabile, fonte/versione, uso valutato, risultato ed eventuali limiti. Collegare autorizzazioni e documentazione contrattuale tramite riferimenti sicuri, senza copiare materiale riservato. La risoluzione di un vincolo aggiorna anche il problema corrente e il report; una scelta tecnica alternativa richiede autorizzazione nell'incarico pertinente.
