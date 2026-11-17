# Catalogo: trascinamento verticale diretto su tablet e PC

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261109-010 |
| Stato | Completato e installato sul banco .55/r99 |
| Data | 2026-11-09, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta di riferimento | «il gesto verticale invece funziona ancora male, devi considerare un utilizzo da tablet che con il trascinamento fa uscire i widget, sul computer si deve tradurre allo stesso modo» |
| Autorizzazione | Correggere il comportamento verticale nella stessa app/banco PC in lavorazione, preservando account/profili e il catalogo .54. Nessuna pubblicazione. |

## Obiettivo e perimetro

Il pannello segue il gesto mentre viene trascinato, sia in apertura sia in ritorno: dito sul tablet, mouse/trackpad sul PC. Il rilascio completa la posizione scelta o annulla il gesto, senza avviare aggiunte o comandi. È una precisazione umana successiva al precedente trigger automatico a soglia, descritto in [ADR-0048](../decisions/ADR-0048-catalogo-widget-tendina.md), [REQ-32/AC-32](../funzionalita/product.md) e [brief](../design/componenti/catalogo-widget.md); le verifiche storiche non provano il nuovo criterio.

**Riferimento confermato nella stessa chat:** l'utente precisa «prendi come esempio il menu di apple» e conferma «Sì, il Centro di Controllo». Adottare quel comportamento diretto e reversibile mantenendo l'apertura dal basso di ACA, non la posizione o la grafica del sistema Apple. Guida applicata: `apple-design`; fonte primaria consultata2026-11-09, [Designing Fluid Interfaces, WWDC2018/803](https://developer.apple.com/videos/play/wwdc2018/803/), principi di risposta immediata, continuità e interruzione del movimento. I valori scelti per ACA non sono dichiarati parametri interni Apple.

**Ulteriore steering, stessa chat:** «controllarla frame per frame perché mi esce uno scatto del background, che l'immagine si restringe e si allarga all'improvviso». Aggiunto controllo esplicito della fotografia: posizione, scala e ritaglio del paesaggio devono restare coerenti all'inizio, durante il gesto, al rilascio e alla fine. Non basta verificare che `blur` o la dimensione CSS dichiarata siano costanti; confrontare fotogrammi e punti riconoscibili della foto.

Conservare sfoglio X con card intere/dissolvenza, materiale e paesaggio fissi, moduli e scroll interni, comandi, blocchi, pagina Home e focus. Riutilizzare componenti/primitiva e stack esistenti, senza dipendenze o rifacimenti dei widget. La distribuzione sul banco resta quella già autorizzata nella sessione, con nuovo backup e verifiche prima del riavvio; nessun reset, installazione nativa o deploy pubblico.

Baseline effettiva ACA0.9.54/r99, fonte1816/SHA dad2ffde900187cdc27a921aa97172c375cf375cb3e19f5129b22fbeb303d25a;623voci Git preesistenti da preservare. [REP009](REP-20261109-009-catalogo-piu-spazio.md) rimane chiuso con i suoi risultati. Checkpoint e prove selezionate in `backup/rep067/`.

## Criteri di completamento

- Durante una pausa del trascinamento, il pannello mantiene una posizione intermedia coerente, prima del rilascio; niente ingresso autonomo avviato soltanto dal superamento della soglia.
- Apertura verso l'alto e ritorno verso il basso con progresso visivo continuo; gesto breve/inverso/annullato torna alla posizione corretta. Riaggancio durante l'assestamento senza salto.
- Mouse e trackpad producono lo stesso risultato del tablet, rispettando le differenze degli eventi disponibili; nessuna dipendenza da pulsanti o maniglie.
- Nessuna selezione residua, scrittura, comando o voce history duplicata per il solo trascinamento; comandi, moduli, gesture X e alternative da tastiera conservati.
- Card intere nello sfoglio X e foto coerente anche durante Y; movimento ridotto, perdita di puntatore, secondo dito e ripetizioni non lasciano blocchi.
- Diff pertinente, test di regressione e input nativi/posizioni intermedie nel browser privato. Consegna locale/banco con dati/identità/HA/D1 conservati; hardware fisico e login umano distinti.

## Avanzamento e modifiche

Diagnosi iniziale: `useHomeCatalogScroll` invoca un solo `onOpen()` a56px touch o48px wheel, scartando poi il gesto. Non trasmette progresso al pannello. Il `BottomDrawer` segue il puntatore in chiusura, ma il wheel inverso chiama soltanto `close()` a soglia. Baseline registrata con input nativi prima delle modifiche: mouse senza apertura e touch con ingresso autonomo a soglia, distinti dal nuovo comportamento diretto.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Baseline e checkpoint | Git, fonte .54/1816 e copie byte prima delle modifiche | Superato | Modifiche preesistenti conservate; nessun nuovo file applicativo |
| Gesto continuo prima/dopo | Posizioni native20/60/150px, hold600ms, ritorno/cancel, wheel e confronto della foto | Superato | Browser privato1916/390; dispositivo e trackpad fisici distinti |
| Regressioni e consegna | 81test/6suite,3UI, strict/build, pacchetto esatto, audit e dati banco | Superato | QA sintetica e vista banco anonima; nessuna nuova autenticazione umana |

## Controllo del diff e decisioni

Il nuovo comportamento umano prevale sull'apertura automatica storica. Realizzato un ponte di progresso verso il pannello esistente, con un solo proprietario della posizione, senza dipendenze o nuovo riconoscitore X. Soglie e assestamento sono scelte esecutive da verificare sul gesto reale.

## Chiusura e punto di ripresa

Completato: ACA0.9.55/r99 sul banco, fonte1816/SHA18a2ffb1539d408268c11265d079aadd58447444e376f13cff06a145b215c370,17delta attesi e nessun file aggiunto/rimosso/estraneo. Il catalogo segue la posizione durante apertura e chiusura; una pausa non completa autonomamente il gesto. Rilascio, inversione e annullamento conservano continuità e consentono il riaggancio. Il catalogo preparato resta non modale; focus e history si attivano alla conferma, una volta sola. Controlli, scroll interni, moduli, pagina Home, blocchi e permessi restano conservati.

**Riferimento e limiti dell’input:** adottati i principi di risposta immediata e continuità del Centro di Controllo, mantenendo grafica e apertura dal basso ACA. Le soglie e durate usate sono scelte esecutive ACA, non costanti interne Apple. WheelEvent non espone il rilascio fisico delle dita: i delta aggiornano il progresso e la pausa240ms termina il flusso del trackpad.

**Verifiche:**81/81test mirati in6file/suite,3contratti UI e strict frontend/UI PASS; build derivata frontend/Casa3D e audit artefatti PASS. Prove native mouse/touch1916/390:20/60/150px esatti e posizione60px mantenuta nel hold600ms; niente scritture, comandi o selezioni residue per il solo gesto. Wheel continuo, inversione, tastiera, focus, perdita di rilascio, cancel/multipointer e sfoglio X con card intere verificati nei casi registrati. Movimento ridotto coperto dai test automatici; le preferenze native di movimento ridotto, trasparenza ridotta e forced-colors non sono state rieseguite nel browser per questo incarico. Il negativo di disabilitazione durante hold e la durata di uscita del preview sono stati corretti prima del sigillo; le verifiche del candidato e del pacchetto finale rimangono distinte. La chiusura programmatica dopo ingresso completato è stata verificata prima e dopo il fix: il segnale di movimento viene applicato prima del paint, evitando che la copia fotografica compaia nel primo fotogramma di ritorno.

**Fotografia:** la baseline mostrava una differenza massima RGB49desktop/34telefono nei ritagli vuoti confrontati. Il pseudo-piano a dimensione viewport conserva la foto invece di scalarla al box della pagina: confronto finale1916/390 MAE0 e massimo0 nelle ROI registrate. Durante Y si usa la scena esterna fissa, senza animare scala o blur; X conserva dissolvenza e schede intere. Sono misure sui ritagli/frame campionati, non una certificazione di ogni pixel su ogni GPU.

**Artefatti e banco:**ZIP3375519byte/SHA8ad281981fecee30d8f5944a0fa06f89adf6410e9a1d1d4761aed7b1e5c0f632; wrapper `sha256:826bbce5f01362d113114424758fd62d120bb2289608837bb5c1843a5e057913`. Ricetta congelata con runtime conservato e nessuna installazione runtime; audit di provenienza/checksum, pacchetto esatto e Compose19file PASS. Backup freddo204910byte/SHA3d0b9182b1e09f968df225114e6aafd7382028cfd47b811b4c76dbd75cc8b616, estratto e SQLite integro. audit operativo 6/6; confronto cold→live: 27 tabelle esatte, 0 aggiornamenti seen_at monotoni e nessuna differenza imprevista. Account/profili, identità e mount conservati, HA/D1 stessi container e avvii; solo ACA ricreato. PC3002 e LAN192.168.1.37 rispondono .55/healthy e casa ready; vista anonima e asset verificati senza credenziali o comandi.

**Evidenze e ripresa:** `backup/rep067/combined-final-tests.json`, `qa-functional-summary.json`, `candidate-photo-scale-roi.json`, `packaged55-smoke.json`, `source-delta.json`, `artifact-audit-status.json`, `ops-preservation-audit.json` e `live-preservation-final.json`. Hardware tablet/trackpad fisico e nuova autenticazione umana distinti. Nessuna pubblicazione, installazione nativa o nuova funzione implicita; debito e suite generale non dichiarati risolti. Riprendere dal riscontro dell’utente o da un nuovo incarico.
