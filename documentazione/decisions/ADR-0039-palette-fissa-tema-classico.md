# ADR-0039 — Palette fissa e tema ACA Classico

## Annotazione sostitutiva del 2026-11-04 — nuovo tema richiesto

La successiva richiesta umana «realizziamo il nuovo ui kit tema liquid glass e applichiamolo» assegna il look finora rimandato. [ADR-0042](ADR-0042-tema-liquid-glass.md) sostituisce il solo default Classico con ACA Liquid Glass e supera il rinvio della nuova veste. Restano validi Classico come fonte conservata, assenza di selettore globale, conservazione dei dati storici e indipendenza di avatar/copertina e colori funzionali. Implementazione del nuovo tema in corso; esiti da registrare in [REP008](../reports/REP-20261104-008-tema-liquid-glass.md). Il testo seguente conserva la decisione e le verifiche precedenti, senza attribuirle al nuovo tema.

| Campo | Valore |
|---|---|
| Stato | Accettata dalla richiesta umana; implementata e verificata nel software, banco0.9.39 aggiornato |
| Data / autore | 2026-11-04, Codex; nome esatto del modello non disponibile |
| Fonte umana | L’utente propone di conservare il design attuale come tema, togliere le scelte di colore e usare bianco/viola; accetta la proposta dell’assistente: «io andrei a realizzare questa versione secondo la tua proposta», precisando che dopo il task indicherà il nuovo pacchetto base ACA. |
| Relazione | Precisa [ADR-0032](ADR-0032-design-condiviso-workspaces.md)/[ADR-0033](ADR-0033-ui-movimento-layout-condivisi.md): fonti e primitive condivise rimangono, il tema attuale è ACA Classico; personalizzazione globale dell’aspetto ritirata. |
| Evidenza | [REP-20261104-002](../reports/REP-20261104-002-palette-fissa-tema-classico.md), REQ-30 |

## Decisione e confini

Palette effettiva dell’app fissa sullo stato attuale chiaro/viola/senza wallpaper globale. Il fondo chiaro, i rilievi e il viola attuali rimangono: non trasformare la richiesta in una diversa composizione o in un nuovo look senza indicazioni. Conservati i colori funzionali per allarmi, errori e stati; avatar e copertina account indipendenti.

Il tema attuale prende il nome ACA Classico e un ingresso comune esplicito, che usa le stesse fonti esistenti, senza copiare componenti o valori. L’utente descriverà dopo il task il nuovo pacchetto: nessuna dipendenza, nuova veste grafica, selettore con temi inesistenti o sostituzione dello stack è assegnata ora.

Rimuovere i selettori globali e i percorsi runtime di tinta derivata, foto wallpaper e tema automatico/scuro dell’app. I dati storici in localStorage, profili/versioni e IndexedDB rimangono recuperabili; applicazione del tema e ricezione snapshot non riscrivono preferenze né causano autosave a vuoto. Le importazioni vecchie sono leggibili ma non possono riattivare una palette personalizzata.

Gallery e campioni storici conservano i loro controlli e CSS. La rimozione dei percorsi runtime e dei selettori non è presentata come eliminazione di tutte le varianti CSS storiche o come un benchmark di prestazioni. Non rifattorizzare adesso tali campioni per anticipare un pacchetto ancora da descrivere.

## Scelte esecutive

Ingresso design/index.css→themes/classic/index.css, consumato anche da webapp attraverso uno shim unico e dagli adattatori tramite il copier esistente. Ordine ACA+Kit2 invariato, nessun fixed.css che duplichi i token o nuova infrastruttura di temi.

Aspetto effettivo fisso separato dai contratti/dati legacy. Eliminare il listener che traduce cambiamenti di aspetto locale in operazioni di profilo. Applicare il tema senza scrivere i raw ricevuti. Nuovi profili/esportazioni usano l’aspetto fisso, i profili esistenti non sono riscritti in massa.

## Verifiche

Regressioni di lettura/import/refresh legacy, conservazione dati e assenza di autosave; selettori assenti, foto globale non caricata, avatar/cover e stati conservati. Compatibilità ingressi/copie dei temi, look default prima/dopo, build e QA isolata. Esiti e limiti nel report; integrazione del nuovo pacchetto rimandata alle prossime istruzioni umane.


## Esito2026-11-04

[REP002](../reports/REP-20261104-002-palette-fissa-tema-classico.md): QA4PASS e campioni default/account identici; dati legacy conservati e nessun autosave di normalizzazione.37test pertinentiPASS, SystemPage22PASS/1incongruenza preesistente, strict/lint/build/auditPASS. Banco0.9.39/r99 con backup/27tabelle identiche e HA/D1 invariati. Accesso PC confermato sul nuovoIP192.168.1.19. CSS storici della gallery conservati, nessun nuovo tema o pacchetto anticipato.
