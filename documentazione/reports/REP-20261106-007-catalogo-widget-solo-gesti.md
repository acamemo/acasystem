# REP-20261106-007 — Catalogo widget senza pulsanti di navigazione e chiusura

| Campo | Valore |
|---|---|
| Stato | Completato e verificato localmente |
| Data | 2026-11-06, Europe/Rome |
| Autore | Codex; nome esatto del modello non disponibile |
| Base | HEAD5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69;613voci Git preesistenti conservate |
| Richiesta e autorizzazione | L'utente richiede «scorrimento da destra verso sinistra sempre col dito senza pulsanti e anche chiusura pannello senza pulsante, ma scorrendo verso il basso». Evoluzione esplicita della consegna locale REP006. |

## Obiettivo e perimetro

Rimuovere dal catalogo le frecce precedente/successiva e i pulsanti di chiusura. Mantenere la navigazione orizzontale nativa con il dito; chiudere con gesto verso il basso sulle superfici passive del catalogo, comprese le schede, senza richiedere di usare un pulsante o una maniglia. Titolo, eventuale indicatore passivo e comandi di selezione/associazione restano utili. Frecce della tastiera, Escape e Indietro conservano l'alternativa accessibile.

Preservare ingresso tramite scroll della Home, dissolvenza/foto, anteprime isolate, disposizione, aggiunta e writer, permessi e stato dell'account. Distinguere gli assi del gesto prima di intervenire, evitare selezioni residue e rispettare i controlli e lo scroll verticale dei moduli successivi. Nessuna nuova dipendenza, API, rifacimento dei widget, installazione o aggiornamento del banco.

Fonti: [REP006](REP-20261106-006-catalogo-widget-tendina.md), [ADR-0048](../decisions/ADR-0048-catalogo-widget-tendina.md), [brief](../design/componenti/catalogo-widget.md), REQ-32/AC-32. Checkpoint prima degli edit in `backup/rep057/source-before.json`:1815file/SHA `d07a51f36516ef46645fe4f3669ec84c915e34aa26ba5b95b30e091e9b2ceaa3`.

## Criteri di completamento

- Nessuna freccia/pulsante precedente, successiva o chiusura nel catalogo; eventuale grip non cliccabile.
- Swipe sinistra/destra percorre le pagine intere; swipe giù su una scheda chiude il pannello e fa ritornare la Home.
- Movimento breve, orizzontale, multitouch o annullato non seleziona widget e non provoca chiusure accidentali; niente click sintetici residui.
- I moduli mantengono lo scroll e le azioni necessarie; tastiera, Escape/Indietro, focus e movimento ridotto funzionano.
- Test mirati, strict/build, QA touch emulata e diff circoscritto verificati. Anteprima locale aggiornata, dati e banco conservati; hardware distinto.

## Avanzamento e verifiche

Rilettura iniziale della consegna e del codice effettivo: la navigazione touch orizzontale era già presente, ma affiancata da pulsanti; il gesto di chiusura era limitato al pulsante/maniglia nell'header. Correzione assegnata prima degli edit sostanziali. Esiti effettivi riportati sotto, evidenze in `backup/rep057/`.

Quattro sorgenti modificati: `BottomDrawer`, `WidgetCatalogPager` e i due CSS condivisi dei componenti e degli sheet. Rimossi frecce, X e maniglia cliccabile; restano titolo, segno decorativo e contatore passivo. Il marker generico `data-drawer-swipe` delimita le superfici del catalogo. Prima della cattura si distingue l'asse: il gesto orizzontale conserva il pan nativo, quello verso il basso segue il dito. Il rilascio chiude da56px, oppure da24px con velocità almeno0,5px/ms; un gesto annullato ritorna allo stato aperto. Moduli, controlli e scroll verticali non appartengono alla superficie trascinabile. Escape/Indietro e frecce della tastiera restano disponibili.

La review e il primo test browser hanno trovato due regressioni, corrette prima della consegna: click residuo dopo diagonale senza asse dominante e perdita della cattura implicita del bottone figlio durante il trasferimento al pannello. Conservati i negativi e il trace, poi verificati il blocco del click e la distinzione fra perdita di cattura del figlio e del pannello. Titolo con focus programmabile, senza outline che lo faccia sembrare un pulsante; focus dei controlli invariato.

## Verifiche ed evidenze

| Controllo eseguito | Esito | Evidenza e limiti |
|---|---|---|
| Vitest Drawer10/Pager8/Sistema36/Scene3 dopo entrambi i fix |57/57PASS | `drawer-pager-final-tests.json`; negativi diagonale/capture separati, nessuna deroga in produzione. |
| Integrazione Screen interessata, filtro su5casi |5/5PASS,178filtrati | `launcher-affected-tests.json`. Due fixture isolate dipendevano dal riscaldamento lazy: ora attendono il dialog reale, asserzioni conservate. Non ripetuta l'intera suite296 di REP006. |
| `npm run build -w frontend`, strict frontend e `npm run typecheck:ui` |PASS | Build definitivo in `frontend-build-release.log`; solo warning HLS oltre500kB già presente. |
| `node --test ui/contract.test.mjs design/copy-assets.test.mjs` |9/9PASS | `ui-contracts.log`. |
| `npm run lint:theme-colors -w frontend` |0violazioni | `theme-colors.log`; debito generale/ISSUE-134 e precedente rilievo tipografico non dichiarati risolti. |
| Diff rispetto alle copie iniziali |9/9whitespace e terminatori preservati | `ui-whitespace.json`, `ui-newlines.json`, `ui-final.diff`;9delta attesi, nessuna riscrittura estranea. |

QA su Chromium proprio con touch CDP emulato, senza credenziali o banco. Handoff e sigillo `qa-final-handoff.md`/`qa-final-seal.json` distinguono la provenienza:

- Primo bundleD83RHNZF: swipe sinistra e destra0→1→0 e assenza dei quattro gruppi di pulsanti verificati; negativo della chiusura conservato in `gesture-focused-first-negative.json` e `down-capture-repro.json`.
- Dopo il fix, bundleD29vACGD: swipe giù140px sulla scheda chiude al rilascio; breve30px, diagonale70/80 e annullamento lasciano il catalogo aperto senza selezionare. Tap Luce apre il modulo; a390×568 il modulo scorre61px e torna all'inizio senza chiudere. Trascinamento560px e hold950ms mantengono il pannello fino al rilascio. Escape/Back e focus connesso verificati; identità84→84,0comandi HA/errori/richieste bloccate.
- Ultimo bundleDjrVzy8b: sola regola cosmetica del titolo, una nuova apertura e screenshot `catalog-title-final390.png` confermano focus conservato e outline non disegnato. Non sono stati attribuiti a questo rebuild i test dei due bundle precedenti. Screenshot visionato dal coordinatore.

Nessuna nuova matrice dei28tipi o benchmark; preview e Home non sono cambiate. Hardware iPhone/Android/M11 non provato. Gesti touch emulati e prove unitarie non sono una certificazione del dispositivo fisico.

## Controllo del diff

Audit di tutti i sorgenti pubblicabili contro il checkpoint:1815file prima/dopo, **9modificati,0aggiunti/rimossi/estranei**. SHA finale `ca1e5d712e6b337fd3504cc9dfb87dbb46fefe0bf5ca57afc1a285b8abf2ccea`, manifest in `source-final-manifest.json` e risultato in `source-final.json`. Quattro sorgenti e cinque test; backend, dipendenze, anteprime, ingresso Home, account e profili preservati. Review indipendente senza blocker residui; le scelte esecutive attuano la richiesta senza nuove API o funzioni.

Chiusura documentale:686collegamenti validi, integrità degli originali nativi PASS e diff whitespace senza errori. Rilettura dei9file contro manifest del coordinatore e dell'owner:0divergenze dopo il sigillo; nuovo report senza whitespace finale. Log `docs-final.log`, `docs-whitespace.log`, `final-validation.json`.

## Chiusura e punto di ripresa

[Anteprima4185](http://127.0.0.1:4185/?screen=app#/mockup) aggiornata e HTTP200, pronta da ricaricare. Nel catalogo usare il dito destra/sinistra per sfogliare e verso il basso sulle schede per chiudere; tastiera ed Escape/Indietro rimangono l'alternativa. Il contatore non è un pulsante. Il banco3002 resta0.9.46, pubblica0.9.34; nessuna installazione, pubblicazione o commit.

Incarico concluso localmente; nessun lavoro software residuo assegnato. Il prossimo punto è il riscontro umano dell'anteprima. Aggiornamento banco, hardware e ristrutturazione dei singoli widget rimangono distinti.

## Installazione successiva, 2026-11-09

L'utente autorizza il banco PC: installazione e conservazione dei dati verificate nella .47 in [REP-20261109-001](REP-20261109-001-banco-pc-gesti-catalogo.md). Gli esiti e le limitazioni della consegna locale qui sopra restano storici; un nuovo ritocco di presentazione assegnato durante il rollout prosegue in REP002 del9novembre.
