# Registro delle patch di casa3d

File generato da `tools/rinomina.mjs`: non modificarlo a mano.

## Origine

- Base: progetto di terzi con licenza MIT, revisione `1383a14200c2c96d676ff3fda8b8d87b709089fc` (v1.20.2, 2026-10-19).
- Archivio scaricato da codeload.github.com: SHA-256 `8841c84f1b72673317dda9958afbcf0628bac2661ccd50a18ab48a9a38f33a02`.
- Copia verbatim: `upstream/` (205 file; impronte in `upstream.sha256`, controllate a ogni esecuzione dello script).
- Copia di lavoro: `src/` (188 file generati da 193 sorgenti) e `lang/en.json`.
- Avvisi di copyright e licenze: `NOTICE`, `LICENSE-MIT-Mastershort`, `LICENSE-BSD3-lit`, `LICENSE-MIT-three`.

## Come si usa

- `npm run rinomina` rigenera `src/` e `lang/` e questo file. Si modifica sempre lo script, `overrides/` o i dati: mai `src/`.
- `npm test` esegue i test `node --test` dei sorgenti copiati; `npm run marchio` controlla che il nome e il marchio originali, il formato delle chiavi di licenza e ogni URL verso terzi non compaiano nel prodotto, che non ci siano API di rete proprie (`sendBeacon`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `importScripts`, `Worker`) e che le chiamate per indirizzo (`fetch`, `import()`, `Image`, caricatori di texture) compaiano solo nei file elencati nello script, con il motivo.
- Il nome e il marchio originali compaiono, per forza, soltanto in: `upstream/`, `upstream.sha256`, `NOTICE`, `LICENSE-*`, `UPSTREAM.md`, questo file e `tools/rinomina.mjs`.
- Il prefisso tecnico `fp3d` (classi CSS, elementi `fp3d-*`, variabili `--fp3d-*`, `__FP3D_*__`) è mantenuto (ADR-0014, D3).

## 1. File non portati in src/

| File | Motivo |
|---|---|
| `panel.ts` | Pannello laterale di Home Assistant: sostituito dalla pagina Casa 3D di Acasystem. |
| `card.ts` | Scheda Lovelace della dashboard: non esiste in Acasystem. |
| `card-editor.ts` | Editor visuale della scheda Lovelace. |
| `card-config.ts` | Configurazione della scheda Lovelace (usata solo da card.ts e card-editor.ts). |
| `load-card-editor.ts` | Caricatore del bundle dell'editor della scheda. |
| `components/extensions.ts` | Pagina Estensioni: negozio, chiave di licenza, pacchetti firmati, newsletter, Discord. Sostituita in T8 dalla sezione Piano e pacchetti. |
| `fonts.ts` | Registrazione dei font del progetto originale; il font di Acasystem arriva con T9. |
| `diagnostics.ts` | Rapporti d'uso volontari verso un server di terzi (telemetria) e raccolta degli errori. |
| `diagnostics.test.ts` | Test del modulo diagnostics.ts rimosso. |
| `beta.ts` | Programma beta/Supporter e collegamento alla community del progetto originale. |
| `import/app.ts` | Pagina web di importazione del sito dell'autore (contiene un contatore di visite verso un server di terzi). I lettori dei formati restano in import/. |

Non sono copiati affatto (nemmeno in `upstream/`): le altre 15 lingue di `frontend/lang`, i font e le immagini, i bundle compilati, gli script di build accessori (anteprime, registrazioni, pacchetti di immagini), il sito, i tutorial, gli strumenti, i test Python, la documentazione dell'autore e l'integrazione Python (salvo i cinque file di riferimento per T6).

## 2. File sostituiti da overrides/

| File | Motivo |
|---|---|
| `main.ts` | Punto d'ingresso provvisorio: registra la vista 3D e il pannello stanza (niente pannello, scheda e font del progetto originale). |

## 2b. File aggiunti da overrides/

| File | Motivo |
|---|---|
| `i18n.test.ts` | Test di i18n.ts (testi integrati in italiano, inglese a richiesta, ripiego sull'italiano, file mancante o rotto, indirizzo relativo al modulo). |
| `hass-contract.test.ts` | Contratto con l'adattatore dell'host (T3): il tipo dell'oggetto hass costruito da Acasystem coincide con quello atteso e i sorgenti leggono solo parti di hass che l'adattatore fornisce. |
| `esempio.test.ts` | Piano d'esempio della pagina di prova di Acasystem (T3): forma normale, stanze, aperture e mobili validi, nessun collegamento a entità o indirizzo di terzi. |
| `viewer/quality.ts` | Livelli di qualità Light, Medium e High con i loro parametri, rapporto pixel, distanza minima fra due fotogrammi e nomi usati dal viaggio nel tempo (T5). Dati e funzioni pure, senza three.js. |
| `viewer/quality.test.ts` | Test di quality.ts: livelli, nomi sconosciuti, rapporto pixel, regola che distanzia i fotogrammi in Light a 60, 90 e 120 Hz (T5). |
| `ask.test.ts` | Comandi (T7): gli elementi della vista non chiamano confirm(); un dispositivo «chiedi prima» passa all'host come callService(..., { ask: true }). |

## 3. Patch mirate

| ID | File | Tipo | Che cosa | Occorrenze |
|---|---|---|---|---|
| P01 | `features.ts` | blocco rimosso | Tolti gli indirizzi del negozio, della registrazione e del manuale online (PRO_URL, registerUrl, shopUrl, manualUrl) e la tabella dei capitoli del manuale. | 1 |
| P02 | `features.ts` | sostituzione | Tolta la funzione gratuita «diagnostics» (rapporti d'uso). | 1 |
| P03 | `features.ts` | sostituzione | Idem: «diagnostics» non è più nell'elenco delle funzioni non rilasciate. | 1 |
| P04 | `features.ts` | sostituzione | Idem: released() senza il caso «diagnostics». | 1 |
| P05 | `features.ts` | sostituzione | Commento: non c'è più una pagina Estensioni né un negozio. | 1 |
| P06 | `features.test.ts` | sostituzione | Test: tolti gli import degli indirizzi rimossi. | 1 |
| P07 | `features.test.ts` | righe rimosse | Test: tolta la verifica dell'indirizzo del manuale (de). | 1 |
| P08 | `features.test.ts` | righe rimosse | Test: tolta la verifica dell'indirizzo del manuale (en). | 1 |
| P09 | `features.test.ts` | sostituzione | Test: titolo senza il riferimento al manuale. | 1 |
| P10 | `features.test.ts` | blocco rimosso | Test: tolto il test degli indirizzi del negozio e del manuale. | 1 |
| P11 | `api.ts` | blocco rimosso | Tolte le chiamate al negozio e ai pacchetti firmati: importPack, removePack, ImportedPack, CatalogPack, ShopOffer, ShopLoyalty, offerte e aggiornamenti già visti, LicenseStatus e le quattro chiamate di licenza. | 1 |
| P12 | `api.ts` | blocco rimosso | Tolti installPack e le chiamate dei rapporti d'uso (DiagnosticsStatus, get/set/deleteDiagnostics). | 1 |
| P13 | `api.ts` | sostituzione | Formato del file di backup: acasystem-casa3d-backup. | 1 |
| P14 | `building-controller.ts` | righe rimosse | Tolto l'import della telemetria. | 1 |
| P15 | `building-controller.ts` | righe rimosse | Tolto il commento della chiamata ai rapporti d'uso. | 1 |
| P16 | `building-controller.ts` | righe rimosse | Tolta la chiamata che interrogava il backend sui rapporti d'uso. | 1 |
| P17 | `building-controller.ts` | righe rimosse | Tolto il commento della chiave di bozza del nome precedente. | 1 |
| P18 | `building-controller.ts` | righe rimosse | Tolta la chiave di bozza del nome precedente (nessuna installazione da migrare). | 1 |
| P19 | `building-controller.ts` | sostituzione | Lettura della bozza senza la chiave precedente. | 1 |
| P20 | `building-controller.ts` | righe rimosse | Idem per la cancellazione della bozza. | 1 |
| P21 | `transfer.ts` | sostituzione | Formato del file di esportazione: acasystem-casa3d (la lettura del formato originale resta una decisione aperta, D9). | 1 |
| P22 | `components/time-bar.ts` | sostituzione | Tolto l'import del modulo beta. | 1 |
| P23 | `components/time-bar.ts` | sostituzione | Tolta l'etichetta BETA con il collegamento alla community del progetto originale. | 1 |
| P24 | `components/view3d.ts` | sostituzione | Tolti gli import degli indirizzi del negozio e del manuale. | 1 |
| P25 | `components/view3d.ts` | righe rimosse | Tolto l'import della telemetria. | 1 |
| P26 | `components/view3d.ts` | righe rimosse | Tolto il campo che teneva l'ascolto dei rapporti d'uso. | 1 |
| P27 | `components/view3d.ts` | righe rimosse | Tolto il commento dell'ascolto dei rapporti d'uso. | 1 |
| P28 | `components/view3d.ts` | righe rimosse | Tolto l'ascolto dei rapporti d'uso. | 1 |
| P29 | `components/view3d.ts` | righe rimosse | Tolta la chiusura dell'ascolto (1/2). | 1 |
| P30 | `components/view3d.ts` | righe rimosse | Tolta la chiusura dell'ascolto (2/2). | 1 |
| P31 | `components/view3d.ts` | righe rimosse | Tolto l'invio dei fotogrammi ai rapporti d'uso (le statistiche locali restano). | 1 |
| P32 | `components/view3d.ts` | sostituzione | Le statistiche si mostrano solo a richiesta. | 1 |
| P33 | `components/view3d.ts` | righe rimosse | Tolto il contatore d'uso della vista 3D. | 1 |
| P34 | `components/view3d.ts` | sostituzione | Idem all'aggiornamento. | 1 |
| P35 | `components/view3d.ts` | righe rimosse | Tolto il contatore d'uso della passeggiata. | 1 |
| P36 | `components/view3d.ts` | righe rimosse | Suggerimento Pro: tolto il collegamento al negozio. | 1 |
| P37 | `components/view3d.ts` | righe rimosse | Suggerimento Pro: tolto il collegamento al manuale online. | 1 |
| P38 | `components/view3d.ts` | righe rimosse | Suggerimento Pro: tolto il pulsante verso la pagina Estensioni rimossa. | 1 |
| P39 | `components/view3d.ts` | sostituzione | Commento: il suggerimento Pro non ha più il collegamento al negozio (1/2). | 1 |
| P40 | `components/view3d.ts` | sostituzione | Commento: idem (2/2). | 1 |
| P41 | `components/editor.ts` | sostituzione | Tolti gli import degli indirizzi del negozio e del manuale. | 1 |
| P42 | `components/editor.ts` | righe rimosse | Tolto l'import del modulo beta. | 1 |
| P43 | `components/editor.ts` | blocco rimosso | Tolti loadDiagnostics, changeDiagnostics, renderDiagnostics e renderDiagnosticsView (rapporti d'uso, link all'informativa del progetto originale). | 1 |
| P44 | `components/editor.ts` | righe rimosse | Tolto l'import delle chiamate dei rapporti d'uso. | 1 |
| P45 | `components/editor.ts` | righe rimosse | Tolto lo stato _diag (proprietà reattive). | 1 |
| P46 | `components/editor.ts` | righe rimosse | Tolto lo stato _diagView. | 1 |
| P47 | `components/editor.ts` | righe rimosse | Tolto lo stato _diagBusy. | 1 |
| P48 | `components/editor.ts` | righe rimosse | Tolto lo stato _diagNote. | 1 |
| P49 | `components/editor.ts` | righe rimosse | Tolto il commento dello stato dei rapporti d'uso. | 1 |
| P50 | `components/editor.ts` | righe rimosse | Tolta la dichiarazione di _diag. | 1 |
| P51 | `components/editor.ts` | righe rimosse | Tolta la dichiarazione di _diagView. | 1 |
| P52 | `components/editor.ts` | righe rimosse | Tolta la dichiarazione di _diagBusy. | 1 |
| P53 | `components/editor.ts` | righe rimosse | Tolta la dichiarazione di _diagNote. | 1 |
| P54 | `components/editor.ts` | righe rimosse | Tolta l'inizializzazione di _diag. | 1 |
| P55 | `components/editor.ts` | righe rimosse | Tolta l'inizializzazione di _diagView. | 1 |
| P56 | `components/editor.ts` | righe rimosse | Tolta l'inizializzazione di _diagBusy. | 1 |
| P57 | `components/editor.ts` | righe rimosse | Tolta l'inizializzazione di _diagNote. | 1 |
| P58 | `components/editor.ts` | sostituzione | Tolta la finestra dei rapporti d'uso dal disegno dell'editor. | 1 |
| P59 | `components/editor.ts` | sostituzione | Tolta la sezione «Aiuta a migliorare» (rapporti d'uso) dalle impostazioni. | 1 |
| P60 | `components/editor.ts` | blocco rimosso | Tolto il CSS della finestra dei rapporti d'uso. | 1 |
| P61 | `components/editor.ts` | righe rimosse | Tolto il commento dell'import della pagina Estensioni. | 1 |
| P62 | `components/editor.ts` | righe rimosse | Tolto l'import della pagina Estensioni rimossa. | 1 |
| P63 | `components/editor.ts` | sostituzione | Elenco di controllo energia: tolto il collegamento al negozio. | 1 |
| P64 | `components/editor.ts` | blocco rimosso | La sezione di aiuto rimandava a GitHub e a un server di chat del progetto originale: ora non mostra nulla. | 1 |
| P65 | `components/editor.ts` | sostituzione | Scheda Pro energia: tolta la variabile della lingua (serviva ai collegamenti). | 1 |
| P66 | `components/editor.ts` | righe rimosse | Scheda Pro energia: tolti i due collegamenti al manuale. | 2 |
| P67 | `components/editor.ts` | righe rimosse | Scheda Pro energia: tolta l'immagine dimostrativa (file non copiato). | 1 |
| P68 | `components/editor.ts` | righe rimosse | Scheda Pro energia: tolto l'elemento immagine. | 1 |
| P69 | `components/editor.ts` | sostituzione | Schede Pro energia e auto: tolto il pulsante «Sblocca» verso il negozio. | 2 |
| P70 | `components/editor.ts` | sostituzione | Scheda auto: tolta la variabile della lingua. | 1 |
| P71 | `components/editor.ts` | righe rimosse | Avviso novità: tolto il pulsante verso il negozio. | 1 |
| P72 | `components/editor.ts` | righe rimosse | Scheda piscina: tolta la variabile beta. | 1 |
| P73 | `components/editor.ts` | righe rimosse | Scheda piscina: tolto il pulsante verso il negozio o la pagina dei sostenitori. | 1 |
| P74 | `components/editor.ts` | righe rimosse | Schede casa/elettrodomestici: tolti i pulsanti verso il negozio o la pagina dei sostenitori. | 2 |
| P75 | `components/editor.ts` | sostituzione | Scheda piscina: tolta la variabile della lingua. | 1 |
| P76 | `components/editor.ts` | sostituzione | Scheda casa: tolta la variabile della lingua. | 1 |
| P77 | `components/editor.ts` | sostituzione | Scheda elettrodomestici: tolta la variabile della lingua. | 1 |
| P78 | `components/editor.ts` | sostituzione | Immagini degli schermi: tolti i collegamenti al negozio e al manuale. | 1 |
| P79 | `components/editor.ts` | sostituzione | Libreria mobili: tolto l'invito alla pagina Estensioni rimossa. | 1 |
| P80 | `components/editor.ts` | sostituzione | Backup: tolto il rimando alla pagina web di importazione dell'autore. | 1 |
| P81 | `components/editor.ts` | sostituzione | Importazione del backup: controllo del formato acasystem-casa3d-backup. | 1 |
| P82 | `packs.ts` | sostituzione | Nome del pacchetto: prefisso degli id dei pacchetti propri (regola G9 per l'espressione regolare). | 1 |
| P83 | `import/simple.test.ts` | sostituzione | Test: il file di esportazione usa il formato acasystem-casa3d. | 2 |
| P84 | `alerts.test.ts` | sostituzione | Test: la lingua del host di prova è l'italiano. | 4 |
| P85 | `alerts.test.ts` | sostituzione | Test: testo atteso in italiano (fumo). | 1 |
| P86 | `alerts.test.ts` | sostituzione | Test: testo atteso in italiano (fumo, senza nome del dispositivo). | 1 |
| P87 | `alerts.test.ts` | sostituzione | Test: testo atteso in italiano (allarme). | 2 |
| P88 | `alerts.test.ts` | sostituzione | Test: testo atteso in italiano (blackout). | 1 |
| P89 | `alerts.test.ts` | sostituzione | Test: testo atteso in italiano (piscina). | 1 |
| P90 | `alerts.test.ts` | sostituzione | Test: testo atteso in italiano (frigorifero). | 1 |
| P91 | `markers.test.ts` | sostituzione | Test: la lingua del host di prova è l'italiano. | 2 |
| P92 | `markers.test.ts` | sostituzione | Test: testo atteso in italiano (spento). | 2 |
| P93 | `markers.test.ts` | sostituzione | Test: testo atteso in italiano (in chiusura). | 1 |
| P94 | `markers.test.ts` | sostituzione | Test: testo atteso in italiano (aperto). | 1 |
| P95 | `markers.test.ts` | sostituzione | Test: testo atteso in italiano (libero). | 1 |
| P96 | `markers.test.ts` | sostituzione | Test: testo atteso in italiano (non disponibile). | 2 |
| P97 | `presence.test.ts` | sostituzione | Test: la lingua del host di prova è l'italiano. | 1 |
| P98 | `presence.test.ts` | sostituzione | Test: testo atteso in italiano (conteggi del piano). | 1 |
| P99 | `load3d.ts` | sostituzione | Indirizzo del bundle «3d»: l'impronta del contenuto è nel nome del file e non in una query (D16, T2b). | 1 |
| P100 | `load-editor.ts` | sostituzione | Indirizzo del bundle «editor»: l'impronta del contenuto è nel nome del file e non in una query (D16, T2b). | 1 |
| P101 | `load-fun.ts` | sostituzione | Indirizzo del bundle «fun»: l'impronta del contenuto è nel nome del file e non in una query (D16, T2b). | 1 |
| P102 | `load-timetravel.ts` | sostituzione | Indirizzo del bundle «timetravel»: l'impronta del contenuto è nel nome del file e non in una query (D16, T2b). | 1 |
| P103 | `load-voice.ts` | sostituzione | Indirizzo del bundle «voice»: l'impronta del contenuto è nel nome del file e non in una query (D16, T2b). | 1 |
| P104 | `load3d.ts` | sostituzione | Il caricamento del bundle 3D che fallisce non resta in memoria e il nuovo tentativo («Riprova») chiede un indirizzo diverso (?r=n), perché un browser può tenere il modulo fallito sotto il suo indirizzo (T5). | 1 |
| P105 | `viewer/viewer3d.ts` | sostituzione | Livelli di qualità: Light, Medium e High al posto di auto, low e high (T5); i parametri stanno in quality.ts. | 1 |
| P106 | `viewer/viewer3d.ts` | sostituzione | Opzioni della vista: onContext, la perdita e il ripristino del contesto WebGL arrivano all'host (T5). | 1 |
| P107 | `viewer/viewer3d.ts` | sostituzione | ViewerStats: aggiunto il livello in uso (T5). | 1 |
| P108 | `viewer/viewer3d.ts` | blocco rimosso | Tolto isLowEnd (rilevamento automatico del livello dal solo browser): il livello lo sceglie l'host e si parte da Light su ogni dispositivo (T1, T5). | 1 |
| P109 | `viewer/viewer3d.ts` | sostituzione | Campi della vista: livello in uso, contesto perso, istante dell'ultimo disegno e timer del cambio di livello (T5). | 1 |
| P110 | `viewer/viewer3d.ts` | sostituzione | Costruttore: il livello iniziale è quello dell'host; senza indicazione e per ogni nome sconosciuto, Light (T5). | 1 |
| P111 | `viewer/viewer3d.ts` | sostituzione | Aggiunto il lettore del livello in uso (T5). | 1 |
| P112 | `viewer/viewer3d.ts` | sostituzione | setQuality rilascia il contesto vecchio prima di creare il nuovo, non cambia durante un gesto e segnala un renderer che non si può creare; perdita e ripristino del contesto WebGL (T5). | 1 |
| P113 | `viewer/viewer3d.ts` | sostituzione | dispose usa releaseRenderer e ferma il timer del cambio di livello (T5). | 1 |
| P114 | `viewer/viewer3d.ts` | sostituzione | invalidate: nessun fotogramma richiesto mentre il contesto è perso (T5). | 1 |
| P115 | `viewer/viewer3d.ts` | blocco rimosso | makeRenderer dai parametri del livello (antialias, rapporto pixel, preferenza di potenza) con l'ascolto di perdita e ripristino del contesto; imposta il livello solo a renderer creato (T5). | 1 |
| P116 | `viewer/viewer3d.ts` | sostituzione | render: in Light i fotogrammi sono distanziati mentre qualcosa si muove; niente disegno a contesto perso (T5). | 1 |
| P117 | `viewer/viewer3d.ts` | sostituzione | render: ricorda l'istante dell'ultimo disegno (T5). | 1 |
| P118 | `viewer/viewer3d.ts` | sostituzione | reportStats: il livello in uso (T5). | 1 |
| P119 | `components/view3d.ts` | sostituzione | Import dei nomi di livello usati dal viaggio nel tempo (T5). | 1 |
| P120 | `components/view3d.ts` | sostituzione | Livello predefinito della vista: Light (T5). | 1 |
| P121 | `components/view3d.ts` | sostituzione | Il viaggio nel tempo riceve il livello con i nomi che usa (T5). | 1 |
| P122 | `components/view3d.ts` | sostituzione | Proprietà statsEvents: la vista manda le statistiche all'host come evento «stats» (T5). | 1 |
| P123 | `components/view3d.ts` | sostituzione | Dichiarazione di statsEvents (T5). | 1 |
| P124 | `components/view3d.ts` | sostituzione | Inizializzazione di statsEvents (T5). | 1 |
| P125 | `components/view3d.ts` | sostituzione | Eventi «stats» e «context-state» verso l'host (T5). | 1 |
| P126 | `components/view3d.ts` | sostituzione | Le statistiche si raccolgono anche quando l'host le chiede come evento (T5). | 1 |
| P127 | `components/view3d.ts` | sostituzione | Idem all'aggiornamento (T5). | 1 |
| P128 | `components/view3d.ts` | sostituzione | Se la vista non si può creare l'host riceve «context-state»: failed se manca il contesto di disegno (niente WebGL 2), error per ogni altro errore (codice non caricato, dati rifiutati); in entrambi i casi ripiega sull'anteprima (T5). | 1 |
| P129 | `components/editor.ts` | sostituzione | Le viste 3D dell'editor partono in Light (T5; l'editor è T10). | 2 |
| P130 | `types.ts` | sostituzione | callService accetta un quarto argomento { ask }: la conferma la chiede l'host, non il browser (T7). | 1 |
| P131 | `markers.ts` | sostituzione | toggleEntity passa { ask } all'host invece di chiedere con confirm() (T7). | 1 |
| P132 | `components/view3d.ts` | sostituzione | Un tocco su un dispositivo «chiedi prima»: la domanda la fa l'host (T7), non confirm(). | 1 |
| P133 | `components/view3d.ts` | sostituzione | Scheda dell'auto: svc passa { ask } all'host (T7). | 1 |
| P134 | `components/view3d.ts` | sostituzione | Sblocco dell'auto dalla scheda: la conferma la chiede l'host (T7), non confirm(). | 1 |
| P135 | `components/quick-menu.ts` | sostituzione | Menu rapido: la domanda «chiedi prima» passa dall'host ({ ask }), non da confirm() (T7). | 1 |
| P136 | `components/quick-menu.ts` | sostituzione | Menu rapido: i pulsanti di accensione e movimento chiamano callAsk (T7). | 6 |
| P137 | `components/quick-menu.ts` | sostituzione | Menu rapido: accensione e serratura chiamano callAsk (T7). | 1 |
| P138 | `components/quick-menu.ts` | sostituzione | Menu rapido dell'auto: svc passa { ask } all'host (T7). | 1 |
| P139 | `components/quick-menu.ts` | sostituzione | Sblocco dell'auto dal menu: la conferma la chiede l'host (T7), non confirm(). | 1 |
| P140 | `components/room-panel.ts` | sostituzione | Pannello stanza: call passa { ask } all'host (T7). | 1 |
| P141 | `components/room-panel.ts` | sostituzione | Pannello stanza: nessun confirm(); i dispositivi «chiedi prima» passano { ask } all'host (T7). | 1 |
| P142 | `components/room-panel.ts` | sostituzione | Pannello stanza: interruttore delle luci con { ask } (T7). | 1 |
| P143 | `components/room-panel.ts` | sostituzione | Pannello stanza: serrature e interruttori con { ask } (T7). | 1 |
| P144 | `components/room-panel.ts` | sostituzione | Pannello stanza: apertura con { ask } (T7). | 1 |
| P145 | `components/room-panel.ts` | sostituzione | Pannello stanza: chiusura con { ask } (T7). | 1 |

## 4. Regole di rinomina generiche

Applicate in quest'ordine a tutti i file di `src/` (tranne `i18n.ts`) dopo le patch mirate.

| Regola | Sostituzione | Che cosa | Occorrenze | File |
|---|---|---|---|---|
| G1 | `custom_components\/neonplan3d\/(\w+)\.py` -> `casa3d backend: $1` | Commenti che citano i file Python dell'integrazione originale diventano «casa3d backend: nome». | 3 | 3 |
| G2 | `neonplan3d\/` -> `casa3d/` | Tipi dei comandi websocket e allowlist: neonplan3d/… diventa casa3d/… | 24 | 6 |
| G3 | `neonplan3d-` -> `casa3d-` | Nomi dei bundle (…-3d.js, …-editor.js, …), degli elementi e degli eventi. | 2 | 1 |
| G4 | `neonplan3d\.` -> `casa3d.` | Chiavi di localStorage e sessionStorage. | 47 | 6 |
| G5 | `neonplan-import` -> `casa3d-import` | Formato di importazione semplice. | 3 | 2 |
| G6 | `"neonplan"` -> `"casa3d"` | Tipo di sorgente «neonplan» dell'importatore. | 4 | 2 |
| G7 | `NeonPlan 3D` -> `Casa 3D` | Nome visibile (messaggi, console). | 4 | 3 |
| G8 | `NeonPlan` -> `Casa 3D` | Nome senza «3D» (commenti, test, stringhe). | 34 | 17 |
| G9 | `mastershort\.` -> `casa3d.` | Prefisso degli id dei pacchetti di mobili e funzioni (mastershort.xxx diventa casa3d.xxx). | 17 | 6 |

Dettaglio per file:

- G1: api.ts (1), model.ts (1), packs.ts (1)
- G2: api.ts (11), components/view3d.ts (1), timetravel/entry.ts (1), timetravel/replay-hass.test.ts (5), timetravel/replay-hass.ts (5), timetravel/timeline.ts (1)
- G3: components/editor.ts (2)
- G4: building-controller.ts (1), components/editor.ts (21), components/view3d.ts (8), director.ts (1), features.ts (7), load-voice.ts (9)
- G5: import/simple.test.ts (2), import/simple.ts (1)
- G6: import/detect.ts (3), import/simple.test.ts (1)
- G7: components/view3d.ts (2), load-timetravel.ts (1), timetravel/entry.ts (1)
- G8: fun/pets.ts (1), import/builder.ts (2), import/detect.ts (2), import/dxf.ts (1), import/floorplanner.ts (1), import/furniture-map.ts (2), import/sh3d.ts (1), import/simple.test.ts (1), import/simple.ts (3), packs.ts (1), polyfills.ts (2), viewer/projection.ts (4), viewer/walk.ts (3), voice/commands.ts (1), voice/listen.ts (1), voice/mic-probe.ts (6), voice/targets.ts (2)
- G9: components/editor.ts (1), features.test.ts (1), fun/pets.ts (1), packs.test.ts (3), packs.ts (8), viewer/furniture.test.ts (3)

## 5. Testi (i18n.ts e lang/en.json)

- `src/i18n.ts`: la tabella tedesca di origine è tolta; la tabella principale è l'italiano (1806 testi, da `frontend/lang/it.json` della copia). `translate()` usa l'italiano e, se il host è in inglese, il file `lang/en.json` caricato a richiesta (stesse chiavi, tabella inglese di origine). Le altre lingue non sono portate.
- Nei testi sono riscritti il nome del prodotto (`NeonPlan 3D` e `NeonPlan` diventano `Casa 3D`) e i due riferimenti al sito dell'autore (` \(api\.mastershort\.de\)`, ` (su|at) mastershort\.de`).
- Potati 85 testi dei servizi non portati (licenza, negozio, pagina Estensioni, Supporter e beta, rapporti d'uso, richiesta di aggiornamento tramite HACS): nessuna interfaccia li usa. Resta `license_copy`, che l'editor usa per copiare l'id della stanza. Altri testi con riferimenti residui (newsletter, GitHub) vanno riletti nella revisione dell'italiano (T9c).
- Il testo italiano non è stato rivisto da una persona.

## 6. Residui noti e lavoro rimandato

- Formato di esportazione: `acasystem-casa3d-backup` (versione 1, `GET` e `POST /api/casa3d/backup`, T6); il file nel formato originale non è letto (D9 aperta).
- Funzioni Pro: il codice c'è; `features.ts` sblocca ancora con i pacchetti installati (`hasFeature`). I diritti di Acasystem e `ACASYSTEM_PAYMENTS` sono T8, non in questo giro. Nessuna vendita, nessun modo live.
- Interruttori di prova dell'originale ancora attivi in `features.ts` e `load-voice.ts`: `?fp3d_lab`, `?fp3d_projection`, `?fp3d_mic` (scrivono chiavi di localStorage e mostrano funzioni non rilasciate). Residuo di T8: si tolgono con una patch di `overrides/features.aca.ts` insieme ai diritti.
- `hasFeature` si fida del campo `features` dei pacchetti, perché la verifica della firma Ed25519 stava nel backend Python che non è portato. Per questo il backend di Acasystem (T6) non accetta nessun pacchetto: `casa3d/packs/list` risponde sempre con una lista vuota (l'adattatore, senza chiamare il server) e l'importazione di un backup salta ogni pacchetto (`skipped`, motivo `unsupported`). Lo sblocco delle funzioni Pro resta solo ai diritti di T8.
- `diagnostics.ts` è tolto, non sostituito da un modulo vuoto, e con lui `diagnostics.test.ts`. Le patch locali hanno un test proprio in `overrides/` (`i18n.test.ts`, copiato in `src/`).
- `api.ts` non è patchato per T6: parla ancora al backend con `callWS`/`subscribeMessage` (tipi `casa3d/…`) e la traduzione verso le rotte REST `/api/casa3d/*` sta nell'adattatore del frontend (`frontend/src/casa3d/planApi.ts`, collegato in `haShim.ts`), così il confronto con l'originale resta possibile. Il piano passa solo dal backend di Acasystem, mai da Home Assistant: l'adattatore continua a rifiutare `callService` e ogni comando di scrittura verso Home Assistant. Il modulo tiene la revisione dell'ultimo piano letto o salvato e la manda a ogni salvataggio (`base_revision`; al conflitto il server risponde 409 e l'errore ha il codice `revision_conflict`). Differenze dall'originale: la risposta di `casa3d/building/get` non ha il campo `version` (`backendVersion` resta nullo e l'avviso «riavvia Home Assistant» non compare); `casa3d/building/subscribe` diventa la lettura della sola revisione ogni 30 s a pagina visibile (il server non ha un canale di notifica); le immagini viaggiano come binario (`PUT /images/:id`) e tornano come indirizzo `data:`; un'immagine che non è PNG, JPEG o WebP è rifiutata dal client prima della richiesta e dal server sui byte. La Vista del launcher non usa ancora questo canale (mostra il piano d'esempio): lo userà l'editor (T10a).
- `load-editor.ts` e `load-timetravel.ts` (caricatori dei bundle dell'editor e del viaggio nel tempo) non hanno più chi li usa: li userà il guscio della pagina (T4a, T10).
- Il punto d'ingresso `main.ts` è provvisorio (il guscio della pagina è T4a). La build è `build.mjs` (T2b): bundle con l'impronta del contenuto nel nome (`casa3d-3d-<impronta>.js`, patch dei caricatori nella sezione 3), `dist/manifest.json`, licenze accanto ai bundle; servizio sotto `/casa3d/` (D16).
- Qualità (T5): tre livelli Light, Medium e High (`viewer/quality.ts`, file aggiunto); il livello lo sceglie sempre l'host e si parte da Light su ogni dispositivo (`isLowEnd` è tolto). Light: rapporto pixel 1, niente antialias, preferenza di potenza bassa, fotogrammi distanziati di almeno 24 ms mentre qualcosa si muove solo su schermi da 75 Hz in su (frequenza misurata con i fotogrammi dello schermo: a 60 Hz nessun fotogramma è saltato; soglia 21 ms sui tempi dei callback, `displayPeriodMeter`), più le riduzioni già presenti del livello «tablet» dell'originale (luce a celle da 0,5 m, niente terreno, ombre, aloni, coni, meteo, timer a 66 ms). Medium: rapporto pixel fino a 1,25, niente antialias. High: fino a 2, antialias. `setQuality` libera il contesto vecchio prima di crearne uno nuovo e non cambia durante un gesto; `webglcontextlost` e `webglcontextrestored` sono gestiti (evento `context-state` all'host; al ripristino basta un fotogramma, non si ricostruisce la geometria). **Non fatto, da misurare sul tablet:** distanza di disegno (`far`) ridotta, niente esterni in Light, altri piani solo come contorno, fotogrammi con meno chiamate di disegno (geometrie unite o istanze), rapporto pixel 0,85 o 0,75, `powerPreference` come unica leva. Le texture da canvas 2D (`CanvasTexture`: 8x32 dell'avvolgibile in Light, più 1024x1024, 768x512 e 64x64 sopra Light) sono caricate con `texSubImage2D`: sul renderer software del PC è l'origine dei quattro avvisi «GPU stall due to ReadPixels»; non cambiate.
- I titoli e le altre stringhe in tedesco e inglese di `voice/mic-probe.ts` e le parole chiave dei comandi vocali restano nelle lingue di origine.
- Le immagini si caricano ancora da qualunque indirizzo http(s) indicato nei dati (`model.ts`, immagini degli schermi, `entity_picture`): è dato dell'utente, non una chiamata del prodotto; per `entity_picture` l'adattatore (T3) lascia passare solo percorsi sotto `/ha` e indirizzi della stessa origine (toglie gli altri e usa `entity_picture_local` come ripiego); gli indirizzi delle immagini degli schermi e degli sfondi nei dati del piano sono rifiutati dal validatore del server (T6: ammessi solo l'id di un'immagine salvata o `camera:<entità>`, ogni altro indirizzo dà 400), ma il codice copiato (`pictureUrl` in `view3d.ts`) accetta ancora un indirizzo http(s) nelle immagini degli schermi di un piano che non passa dal server (per esempio quello d'esempio).
- Il look (token, ombre, font, bersagli da 44 px, `ha-icon`, `confirm()`) e le patch dell'editor per il tablet sono T9 e T10.
- I test di alerts, markers e presence verificano testi tradotti: la lingua di prova e le attese sono passate dal tedesco all'italiano (patch della sezione 3 sui rispettivi file di test).
