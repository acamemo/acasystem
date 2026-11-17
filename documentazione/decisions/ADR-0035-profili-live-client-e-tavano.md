# ADR-0035 — Profili live, client riconoscibili e Tavano

| Campo | Valore |
|---|---|
| Stato | Accettata dall'utente; implementata localmente, con verifiche software e limiti di collaudo dichiarati |
| Data e autore | 2026-11-02, Codex; nome esatto del modello non disponibile |
| Decisore | Utente U51: denominazione dispositivo e scelte nelle domande; U52 «PLEASE IMPLEMENT THIS PLAN» con piano completo; U53 presentazione Tavano fullscreen/copia testo; U54 vista account, foto/colore, ritaglio e copertina. |
| Fonti | [Piano approvato](../riprogettazione/blocchi/03-profili-dispositivi-tavano-piano.md), [report012](../reports/REP-20261102-012-profili-client-editing-tavano.md), ISSUE-135/136/137. |
| Sostituzione | Precisa i flussi account di ADR-0031; supera per i profili live la disposizione indipendente per classe descritta in ADR-0007 e nei rapporti launcher. Non riattiva VM o accesso remoto. |

## Contesto

**Aggiornamento umano successivo, 2026-11-02:** [ADR-0036](ADR-0036-account-e-modifiche-immediate.md) sostituisce denominazione obbligatoria, selezione locale per client e Salva globale con accesso centrato sull'account e checkpoint automatici. Le formulazioni seguenti conservano la decisione U51–U54 e il suo risultato storico; riserve, bozze, proprietà e Tavano rimangono validi.

La sincronizzazione precedente usa snapshot globali e profili caricati come copie; revisioni e retry non preservano automaticamente cambi concorrenti. Il nome dispositivo presente sul profilo è metadato, non identità del client. Il registro dispositivi/stati HA non costituisce un diario generale di ACA. U49–U50 hanno distinto osservazioni e proposte; U52 assegna ora l'implementazione.

## Decisione umana

Registrazione libera sulla centrale raggiungibile, con HA autorità delle credenziali. Identità tecnica soltanto per creare normali membri, sessione personale per i loro comandi. Nessuna nuova gerarchia visibile installatore/amministratore ACA.

Client nominati e sessioni verificabili/revocabili separatamente, profili personali con scelta locale. Contenuti e ordine comuni, proiezione adattiva della griglia; nessuna scrittura condivisa causata dalla sola apertura/rotazione.

Operazioni granulari, revisioni risorse, riserve45s rinnovate15s, salvataggi confermati e undo mirato. Bozze offline esplicite10MiB, conflitti conservati e scelta visibile, nessun comando fisico differito.

Tavano condiviso da tutti gli utenti autenticati, senza accesso di modifica ai profili altrui. Finestra mobile7giorni entro quota50MiB/diagnosi10MiB. Intenti comando monouso60s, esito incerto senza retry; accettazione HA distinta da effetto osservato.

U53: Tavano a schermo intero con lista azioni, iniziale in cerchio colorato, nome client, azione/esito e dettagli. Colore utente facoltativo alla registrazione. Copia testo delle voci mostrate con prompt diagnostico AI; anteprima/conteggio, pseudonimi e rimozione segreti, nessun invio automatico. Export JSON conservato.

U54 durante l'incarico: icona account apre vista personale con colore o foto, ritaglio/posizionamento e cover visibile soltanto in quella vista. La foto sostituisce il colore dell'avatar. Reference UI-012 fornita come ispirazione di layout; originale integro e nessuna adozione di styled-components. Revisione account e immagini separate dai profili dashboard, proprietà di modifica personale, avatar leggibile dai membri autenticati per il registro; sorgenti/payload immagini esclusi da Tavano/export.

## Conseguenze e verifiche

Migrazione con checkpoint e originali recuperabili; vecchi writer non possono sovrascrivere i profili migrati. API versionate e contratti condivisi sullo stack esistente. Visibilità e registrazione scelte esplicitamente dall'utente, non inferite dal principio storico delle funzioni ordinarie.

**Risultato locale al 2026-11-02:** flussi v2 di registrazione/client, profili, riserve, bozze e Tavano collegati alla webapp; account con immagini separate. Le prove software coprono contratti/CAS, conflitti e retry, ordine comune senza scritture di hydration, ingresso/revoca, comandi e registro, immagini e mantenimento della schermata account durante gli aggiornamenti dei metadati. Strict, lint, build e singoli esiti, compresi gli eventuali limiti delle suite generali, hanno come fonte il [report012](../reports/REP-20261102-012-profili-client-editing-tavano.md); questa scheda non duplica i conteggi.

Le verifiche browser U52–U54 usano un banco locale isolato e HA simulato. Non sono un collaudo con HA reale, impianto domestico, mini PC, tablet/iPhone fisici, Safari, fotocamera o continuità H24. Oltre ai test del coordinatore con storage iniettato, il modulo IndexedDB reale è stato provato in Chromium con profilo persistente: riapertura, cache e isolamento casa/utente; due schede scrivono6MiB simultanei, una riceve `DRAFT_QUOTA` e la bozza precedente resta intatta. Esiti in `qa-drafts-indexeddb-results.json`, collegato al report012. Il lotto U52–U54 non ha effettuato deploy o installazioni domestiche. Rivedere su richiesta umana o rottura delle API HA verificate; fonti primarie HA2026.10.4 nel piano e nei report precedenti.

**Evidenza operativa successiva U55, 2026-11-02:** su autorizzazione distinta, [report013](../reports/REP-20261102-013-pubblicazione-0.9.34-aggiornamento-centrale.md) documenta la [pubblicazione0.9.34](https://github.com/acamemo/acasystem-releases/releases/tag/v0.9.34) e l'aggiornamento con backup del banco su questo PC, non di un mini PC domestico. HA/D1 conservati; HA era già senza proprietario. Il retest umano dopo la regola firewall LAN conferma che ACA compare sull'iPhone a http://192.168.1.11:3002/. Confermata la raggiungibilità, non ancora login, profili o comandi fisici sul telefono. Questa evidenza non cambia la fonte della decisione né costituisce un nuovo collaudo/signoff di prodotto.
