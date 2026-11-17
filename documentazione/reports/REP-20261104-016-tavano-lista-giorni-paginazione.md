# Tavano: lista leggibile, giorni e paginazione

| Campo | Valore |
|---|---|
| ID / stato | REP-20261104-016 — Completato e installato sul banco locale |
| Data / autore | 2026-11-04, Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta | Migliorare Tavano con icona mosca/zanzara mx-icons, UI aggiornata secondo impeccable layout, filtro per giorni anziché ricerca data, età 0→6 e cancellazione a 7, paginazione. Fonte: richiesta e quattro schermate della chat corrente. |
| Autorizzazione | Implementazione mirata di Tavano e contratti/controlli necessari, conservando materiale Vetro Bianco, account/profili, sicurezza e cronologia valida. Aggiornamento locale come prosecuzione delle prove sul banco autorizzate nella sessione. Nessuna nuova funzione di report settimanale, pubblicazione o modifica dei comandi domestici. |

## Obiettivo e perimetro

Rendere la lista il contenuto principale, separare i filtri primari da quelli di approfondimento, correggere le tendine e usare le primitive condivise. Copia ed esportazione devono dichiarare quali eventi comprendono. La pagina deve funzionare a schermo stretto, con nomi lunghi, lista vuota, errori e caricamento, tastiera e preferenze di movimento/trasparenza.

L'età in giorni deriva dal timestamp di ricezione della centrale: `floor((oraCentrale − at)/24h)`. Filtro esatto 0–6 e conservazione mobile massima di sette giorni; nessuna colonna contatore aggiornata quotidianamente. Le quote 50 MiB/10 MiB e le semantiche dei comandi restano valide. Dati storici validi non vengono cancellati soltanto perché appartengono a una precedente build; nomi e identità storici non si riscrivono.

Riferimenti: [REQ/AC-26](../funzionalita/product.md), [architettura](../architecture.md), [design](../design/design.md), [ADR-0035](../decisions/ADR-0035-profili-live-client-e-tavano.md). Banco iniziale ACA 0.9.44/r99. Stato Git iniziale 539 voci preesistenti, da preservare; checkpoint del perimetro in `backup/rep043/`. Nessun token o dato personale nelle evidenze versionate.

## Criteri di completamento

- Icona insetto verificata nel pacchetto mx-icons già presente e usata nel catalogo/widget/vista pertinenti.
- UI Tavano coerente con il tema e gerarchia leggibile; nessun input datetime, filtri giorni e approfondimento usabili senza ID grezzi come etichette principali quando sono disponibili nomi.
- Vera navigazione fra pagine senza duplicazioni o concatenazione silenziosa; cambio filtri/aggiornamenti e risposte fuori ordine gestiti.
- Età 0–6 e scadenza al limite esatto di sette giorni verificate su lettura, esportazione e pulizia, anche senza nuovi eventi; quote preservate.
- Copia, export depurato e distinzione comando accettato/stato osservato conservati. Eventi storici non reinterpretati come bug di versione.
- Test pertinenti, strict/build, QA visiva desktop/telefono con dati sintetici e regressioni mirate; limiti hardware dichiarati. Nessuna pubblicazione.

## Avanzamento e modifiche

Analisi layout e backend delegate indipendentemente; scansione meccanica e baseline visiva separate. Skill `impeccable` esplicitamente richiesta, modalità Operate; contesto già caricato nella sessione, playbook layout e craft-floor applicati. [Brief Tavano](../design/componenti/tavano.md) come fonte della superficie.

La baseline mostrava il primo log a y859 su390px e y878 su320px, menu orizzontali, opzioni che sparivano dopo il filtro categoria ed Escape che lasciava la Console. La lista ora prevale: titolo non duplicato, insetto, Giorni/Categoria e filtri secondari raccolti, azione in evidenza con peso500, autore/client storici, dettagli sotto ogni riga. I menu sono verticali, scrollabili e limitati sui viewport corti; Escape chiude soltanto la tendina, anche immediatamente dopo l'apertura. Il fallback senza API Popover è visibile. Omonimi disambiguati solo nei filtri con suffissoID; ID completi nei dettagli, nessuna riscrittura degli autori storici.

`BugLinear` è presente nel subpath pubblico `mx-icons/components/bug`, non tra gli export effettivi della radice del pacchetto1.1.2. Aggiunta la dichiarazione di tipi precisa e ammesso soltanto quel subpath nel controllo dei confini UI. Non sono disponibili icone Fly/Mosquito; nessuna icona inventata o dipendenza nuova.

`useActivityPage` conserva soltanto la pagina attiva da30 voci e una storia dei cursori: pagine successive con lo stesso riferimento centrale, polling conservativo e Aggiorna manuale che riparte dalla prima pagina fresca. Filtri e cambio sessione invalidano risposte obsolete, preview e testo da copiare; un riferimento non valido, per esempio dopo arretramento dell'orologio centrale, non lascia copiabili risultati invalidati. Il feed recente del widget rimane separato e usa il clock server quando disponibile. Copia pagina dichiara il numero delle sole voci della pagina; export con anteprima riguarda tutti i filtri, pseudonimizzato e con limite5000 dichiarato, senza upload automatico.

Il server accetta `ageDays`0–6 e `asOf`ISO mantenendo date/cursori precedenti per compatibilità. Il cutoff corrente impedisce di allungare la retention usando un vecchio riferimento. La pulizia esistente su avvio/record/sweep orario è integrata da lettura/export: gli scaduti sono esclusi subito e cancellati fisicamente al prossimo passaggio di pulizia, anche senza nuova attività. Quattro indici covering e metadati limitati/cached consentono filtri fuori pagina senza leggere configurazioni altrui. Max100 opzioni per tipo, selezione valida inclusa e parzialità dichiarata. Nessuna tabella/colonna o contatore giornaliero aggiunti.

Ogni nuovo record usa un solo `receivedAt` per timestamp JSON/SQL e pulizia. Nelle righe legacy i due timestamp possono differire di pochi millisecondi: filtro/scadenza continuano a usare SQL, timestamp storico JSON conservato per presentazione/export. Nessuna migrazione distruttiva per uniformare quella differenza.

## Verifiche ed evidenze

| Controllo | Procedura | Stato | Limiti |
|---|---|---|---|
| Baseline / assessment | Layout indipendente,18catture e detector statico/rendering | Superato | Detector predefinito[] non rilevava gerarchia o race; stress DOM separato, non prova API |
| Backend | `activityDays.test.ts` + `activityCommands.test.ts`, SQLite in memoria/HTTP loopback |54PASS | Confini0/1/6/7, clock/legacy/cursori/nuovi eventi, filtri invalidi, quote, export, faccette/cache/rollback e autorizzazione |
| Frontend | Tavano, pagination hook, mockup account e utility matcher |38PASS |12UI+6hook+4mock+16matcher; risposte obsolete, sessione, copia/export depurati, menu e omonimi. Ritest subset non sommati |
| Confini e build | Strict frontend/backend/shared; UI contract e asset; Vite e Docker frontend/Casa3D | Superato |3UI/6assetPASS. Colori0violazioni; typography1violazione preesistente Connect157, nessunaTavano dopo correzione. Warning chunkHLS e debito ISSUE-134 distinti |
| UI su fixture |27stati1366/390/320, pagine30→18→30,7bucket, faccette fuori pagina, empty/copy/export/long; prove finali affette | Superato | Prima voce321/376px sui telefoni; zerooverflow, target≥44.6timingEscape più2fallbackimmediati,2short568 con ultimo item entro441/445px, Aggiorna prima/asOf fresco. Detector3viewport[]. QA sintetica, non sessione umana |
| Provenienza/runtime | Fonte↔ZIP↔immagine↔web,7checksum, smoke isolato e6comportamenti Tavano in immagine | Superato |1780file,5aggiunti/15modificati.4runtime intenzionali,113altri runtime identici.120asset/117runtime verificati; dipendenze e19APK invariati. Fixture rimosse |
| Banco e conservazione | Backup freddo verificato, update soloACA, audit post e UI anonima reale | Superato |0.9.45/r99 healthy/setupready,5UIvistePASS.27/27tabelle identiche e nessuna colonna aggiunta;4indici intenzionali. Identità HA/tecnica e HA/D1/mount conservati; nessun login umano/comando fisico |

Le27viste principali precedono gli ultimi ritocchi puntuali; dopo ogni correzione sono state rieseguite le prove affette, senza spacciare catture vecchie per quelle del CSS finale. Le prove finali controllano visibilità e opacità, non soltanto hitbox. Movimento ridotto confermato sul browser indipendente; la prima emulazione viaCDP non era confermata e non è contata.

Evidenze in `backup/rep043/`: baseline, brief/handoff frontend e backend, `tavano-final-handoff.md`, JSON/script/screenshot omonimi; `qa-verified-freeze.json`; audit fonte/artifact/image/runtime e gate `artifacts-expected.json`; log build e prove; backup, confronti identità/servizi/dati/dimensioni e controlli UI reali. I browser QA posseduti sono stati chiusi, senza toccare quelli dell'utente.

## Materiali e operazioni

ACA0.9.45/r99: sorgenti1780 SHA256 `4e38287b12bec27aa372d5720094fc3afcd5510121db2cc24dc1dccae93234d0`; base `sha256:153fabfbeccb6e66b88ccc751a331f3863a33fc2f6a729e862f2adb117844d9e`; wrapper `sha256:3f41809c31b0cc7071a0b93826992145ce235596d78ae2a7580aad1a2e51de2e`. Web3345634byte SHA256 `6016dccffc92a63905e54cd9215c7349ccefbf494f211a18958397a1a780a896`, minServer0.9.45/minShell0.1.0. Build `ha-app/build-base.mjs --version 0.9.45 --tag aca-system:tavano-local` e `prepare.mjs --version 0.9.45 --revision 99 --base-image aca-system:tavano-local`, senza push.

Prima installazione soltanto dopo gate finale: una prima preparazione era stata rifiutata perché un test era cambiato dopo il freeze; un candidato successivo è stato ritirato per i rilievi finali di font/Escape/fallback. Tutti i materiali respinti restano nelle evidenze, nessuno installato. Rilevati inoltre import root dell'icona non esportato, ciclo di import e whitelist UI da adeguare al subpath; risolti prima del materiale finale. Anche gli errori del harness (preview precedente, timing animazioni, opacità/focus) sono distinti dai bug del prodotto.

Aggiornato solo `tunet`, con `--no-deps --no-build --pull never`; baseline/rollback .44 conservati. Backup nuovo240382byte SHA256 `90847bbcf42806dcc665aa3776e425ccd9379b7c70bcebc9f9849a6db1473c51`, estratto/verificato in tmpfs e confrontato al cold snapshot. Post6/6audit più confronto live identità PASS:27tabelle identiche,3utenti/2credenziali HA invariati, identità tecnica e mount stessi hash, HA/D1 stessi ID/immagini/avvii.

Dimensioni fisiche osservate prima/dopo: DB1576960byte, WAL4120032, SHM32768, journal0; totale5729760byte in entrambi i campioni. Pagine SQLite385→388, freelist1→0;4indici nuovi misurati con `dbstat`,4096byte ciascuno/16384totali. Le pagine nuove riusano spazio libero e WAL già allocato: dimensione dei file uguale non significa schema identico o costo nullo. Registro logico13340byte, diagnostica0, quote50MiB/10MiB conservate.

Loopback eLAN192.168.1.11 health/manifest0.9.45 e setupready; UI anonima5viste realiPASS, senza form/credenziali/azioni. Nessuna scheda umana/IndexedDB o bozza locale è stata aperta, chiusa o scartata dagli strumenti. Il backup centrale non certifica le bozze dei browser.

## Controllo del diff e limiti

Delta limitato a Tavano/contratti/indici/test pertinenti, opzioni facoltative scoped di OptionPicker, icona condivisa/catalogo e whitelist esatta del pacchetto già presente. Coordinatore/API dei profili, autorizzazione, intenti comando e dipendenze invariati; modifiche preesistenti preservate. Nessun ADR aggiuntivo necessario per scelte esecutive entro la richiesta; requisiti/design/architettura aggiornati con la fonte umana.

Safari/iPhone, Android fisico e prestazioni M11 non collaudati. I nomi dei profili senza fonte disponibile restano identificativi tecnici; non si leggono profili altrui per abbellire le etichette. Faccette limitate e timestamp legacy spiegati sopra. ISSUE-134/145/146 non risolti implicitamente. Nessun report settimanale, accesso remoto, deploy pubblico o nuova installazione nativa/HAOS.

## Chiusura e punto di ripresa

Incarico completato sul banco. Aprire [ACA sul PC](http://127.0.0.1:3002/) o [sulla LAN](http://192.168.1.11:3002/), caricare il nuovo frontend e riaprire Tavano con l'account esistente. [Guida corrente](../riprogettazione/blocchi/03-profili-client-tavano-prova.md) e [avvio/rollback](../infrastructure.md). La verifica dell'utente sui propri dati/iPhone è distinta dalle prove automatiche. Nessun ulteriore incarico attivo, nessun commit o pubblicazione.
