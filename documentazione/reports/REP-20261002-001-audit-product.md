# REP-20261002-001 — Audit del PRD originale

| Campo | Valore |
|---|---|
| Stato | Completato |
| Data | 2026-10-02 |
| Autore | Codex; identificativo esatto del modello non disponibile. |
| Origine | Audit richiesto prima della preparazione documentale, ricostruito dalla conversazione; fonti ricontrollate durante questo incarico. |
| Richiesta umana | «ho creato un file chiamato product.md, leggilo e dimmi che ne pensi, non va implementato niente ancora». |
| Perimetro | Lettura, valutazione e verifica di fonti; nessuna implementazione applicativa. |
| Base conservata | [PRD originale](../archive/product-original-2026-10-02.md), poi acquisito nel commit `912ec16b818f2446c77b844b6ff24f44e30a5fa9`. Al momento della lettura iniziale Git era assente. |

## Metodo e criteri di completamento

Leggere integralmente il PRD e distinguere meriti della visione, assunzioni tecniche, fatti verificabili e decisioni mancanti. L'esito è una valutazione del documento, non un collaudo di codice, dispositivi o servizi.

Il controllo locale ha individuato solo `product.md`, nessun repository Git o applicazione. Non sono stati utilizzati accessi a cloud, gateway o impianti. Le fonti primarie seguenti sono state consultate il 2026-10-02; per i repository le revisioni sono state ottenute dalle API GitHub e i file rilevanti letti con riferimenti fissati alla revisione.

## Fatti verificati nelle fonti

| Osservazione | Fonte primaria | Impatto sul PRD |
|---|---|---|
| Le licenze esaminate di HAKit Core/Components sono proprietarie e prevedono licenza commerciale separata. | S-01/S-02 | La descrizione generica come toolkit open-source liberamente riutilizzabile va corretta; ISSUE-001. |
| Il manifest esaminato di HAKit Core, versione dichiarata 6.0.2, richiede React/React DOM >=19.x. | S-03 | La combinazione con React 18 proposta nel documento non è coerente con questa revisione; ISSUE-003. |
| Tunet dichiara GPL-3.0. | S-04 | Definire modalità di riuso e condizioni degli artefatti distribuiti; ISSUE-002. |
| HA documenta proprie credenziali/API di autenticazione e controlli di permesso. | S-05/S-06 | Il collegamento con l'identità ACA e l'applicazione dei permessi non sono già risolti dalla presenza delle API; ISSUE-006/008. |
| Home Assistant Container non include la gestione delle app/add-on di HA OS. | S-07 | Delimitare la conservazione delle funzionalità e i servizi complementari; ISSUE-004. |
| Shelly 1PM Gen3 e Aqara FP2 dichiarano Wi-Fi/Bluetooth. | S-08/S-09 | Gli esempi classificati come Zigbee richiedono correzione; ISSUE-005. |
| Il multiprotocollo Zigbee/Thread su ZBT-1 è sperimentale e sconsigliato nella fonte ufficiale. | S-10 | Precisare radio/firmware e collaudo; ISSUE-005. |

Sono letture di fonti, non dipendenze installate o verifiche di funzionamento sul banco ACA. La compatibilità di altre versioni non è stata provata.

## Valutazioni e proposte dell'audit

La separazione tra automazioni locali, gestione centrale e interfaccia proprietaria è una direzione plausibile. Piantina 2D e generazione AI di bozze soggette a revisione hanno un perimetro comprensibile. Queste sono valutazioni progettuali, non dimostrazioni di affidabilità o approvazioni tecniche.

Proposte da decidere nel relativo incarico:

- Esplicitare autenticazione gateway, revoca, autorizzazioni e separazione degli impianti (ISSUE-006/008).
- Includere il riavvio del tablet senza internet nel comportamento offline (ISSUE-007).
- Distinguere widget, logiche locali e ciclo di distribuzione degli scenari, includendo conferma e ripristino (ISSUE-009).
- Definire validazione funzionale delle bozze AI, benchmark e trattamento dei dati (ISSUE-010/014).
- Delimitare primo segmento/impianto, operazioni e criteri misurabili; rendere verificabile la proprietà di cifratura citata (ISSUE-011/012/013).

Non è stata approvata una sostituzione di librerie, una topologia di rete, un modello AI o un dimensionamento cloud. Le promesse <30ms, <2s, >70% di risparmio e le durate degli sprint non hanno evidenze sperimentali.

## Fonti

| ID | Riferimento | Revisione / limite |
|---|---|---|
| S-01 | [Licenza HAKit Core](https://github.com/shannonhochkins/ha-component-kit/blob/df12c20dba61ca68ab462fd3ec0918db16dc8a8f/packages/core/LICENSE.md) | Revisione HAKit `df12c20dba61ca68ab462fd3ec0918db16dc8a8f`. |
| S-02 | [Licenza HAKit Components](https://github.com/shannonhochkins/ha-component-kit/blob/df12c20dba61ca68ab462fd3ec0918db16dc8a8f/packages/components/LICENSE.md) | Stessa revisione. |
| S-03 | [Manifest HAKit Core](https://github.com/shannonhochkins/ha-component-kit/blob/df12c20dba61ca68ab462fd3ec0918db16dc8a8f/packages/core/package.json) | Manifest del sorgente, non prova di un pacchetto installato. |
| S-04 | [Licenza Tunet](https://github.com/oyvhov/Tunet/blob/5dec99587b4fcc2fb1f831a0a0002c9b90e6958e/LICENSE), [manifest](https://github.com/oyvhov/Tunet/blob/5dec99587b4fcc2fb1f831a0a0002c9b90e6958e/package.json) | Revisione Tunet `5dec99587b4fcc2fb1f831a0a0002c9b90e6958e`. |
| S-05 | [Autenticazione Home Assistant](https://developers.home-assistant.io/docs/auth_api/) | Pagina viva; revisione immutabile non acquisita. |
| S-06 | [Permessi Home Assistant](https://developers.home-assistant.io/docs/auth_permissions/) | Pagina viva; nessuna prova dei permessi ACA. |
| S-07 | [Installazione Home Assistant](https://www.home-assistant.io/installation/) | Pagina viva; riferimento alla modalità Container. |
| S-08 | [Specifiche Shelly 1PM Gen3](https://kb.shelly.cloud/knowledge-base/shelly-1pm-gen3) | Dati del produttore; nessun collaudo hardware. |
| S-09 | [Specifiche Aqara FP2](https://www.aqara.com/en/product/presence-sensor-fp2/specs/) | Dati del produttore; nessun collaudo hardware. |
| S-10 | [FAQ Home Assistant ZBT-1](https://www.home-assistant.io/connectzbt1/) | Pagina viva; indicazione sul multiprotocollo. |

## Esiti, limiti e punto di ripresa

Lettura del documento e verifica delle fonti: eseguite. Test applicativi, benchmark, provisioning, test dei dispositivi e valutazione di conformità complessiva: non eseguiti.

L'audit non ha implementato le proposte. I problemi sono riportati nel [registro corrente](../project-status.md#registro-dei-problemi-e-limiti); lo stato può evolvere senza riscrivere questo risultato storico. Il successivo incarico autorizzato è la [preparazione documentale](REP-20261002-002-documentazione.md).

## Rettifiche successive

Nessuna alla chiusura. Aggiungere eventuali rettifiche datate con nuove evidenze, mantenendo le osservazioni originali.

### Annotazione del 2026-10-02 — Trasferimento delle cartelle

Questo report è stato trasferito da `docs/reports/` a `documentazione/reports/` nell'incarico [REP-20261002-003](REP-20261002-003-organizzazione-cartelle.md). Osservazioni e fonti dell'audit restano quelle registrate alla chiusura; l'originale collegato conserva gli stessi byte.
