# REP-20261111-003 — Area Multimedia

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261111-003 |
| Stato | Completato localmente |
| Data | 2026-11-11, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile. |
| Commit iniziale | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta / autorizzazione | «procedi», dopo la proposta Multimedia: Android TV e Apple TV, poi Sonos e lettori generici. Realizzazione locale; banco e pubblicazione separati. |

## Risultato e perimetro

Area Multimedia attuata nella build locale **0.9.65**: TV Android/Apple, Sonos e lettori generici, nel modello per esatto dispositivo HA. Prosecuzione di REQ-18/19 e ADR-0049; [brief](../design/componenti/multimedia.md), [matrice](../riprogettazione/matrice-widget-ha.md). Nessun aggiornamento del banco, account, profili, HA reale o release pubblica; nessun commit.

Git iniziale:750 voci preesistenti. Checkpoint .64 verificato prima delle modifiche:1918 file, SHA7318cd941542154c9e5d76f2b659f563f8664be1aa59b7f1e11cfdde9ead727f, conservato in backup/rep077/source-checkpoint.zip. Diff limitato all'incarico, senza dipendenze, stack, backend, autenticazione, trasporti, primitive UI o gesti globali nuovi. Nessuna modifica ad archive.

## Criteri e modifiche realizzate

- Contratto prodotto v1 per tv/sonos/media, canali ordinari dello stesso device_id, remotes propri e tecnica separata. Sottotipo Apple e famiglia Sonos ricavati dal registro anche se gli stati arrivano dopo. Niente raggruppamenti per nome, marchio, stanza o intera integrazione.
- Identità storiche mediaPlayerId/mediaIds preservate. La guardia sulle liste richiede tutti e soli i canali del dispositivo; i gruppi espliciti interdispositivo restano nel percorso legacy, senza conversioni. Dieci risolutori precedenti e sei corpi legacy conservati integralmente.
- Trova e manuale condividono risolutori, anteprima associata inerte, pagina idonea più vicina, Conferma e riscontro. Destinazioni esistenti, duplicati, pile e pagine nascoste rispettati. Annulla e spazio insufficiente non scollegano l'apparecchio né creano pagine automaticamente.
- Associazioni lente protette da chiusura, cambio connessione/profilo/editor, doppio invio e risposte tardive; busy fino all'ACK. Ripristinata la rimozione TV tramite componente/API esistenti. Cambiando apparecchio si scartano remote/player collegati al precedente; sullo stesso dispositivo restano gli espliciti. Anche un entityId HA riutilizzato da un device diverso invalida quelle vecchie associazioni.
- Home sintetica, senza azioni collettive nei multicanale. Dettagli per canale, capacità effettive, comandi tracciati e permessi dell'utente. Riproduzione, volume, seek, sorgenti, modalità audio, ripetizione/casuale, telecomando e applicazioni riutilizzano componenti/adattatori esistenti. Apple distingue tracce e canali; i bit non validi non concedono capacità.
- Stato osservato e accettazione software distinti. Nessun comando su mount/anteprima; ultimi valori TV bloccati dopo chiusura, perdita connessione e cambio canale. Risorse immagini/browse sospese quando nascoste; nessuna nuova riproduzione locale o scansione universale. Limiti d'ordine del gateway in ISSUE-154 invariati.
- Vetro Bianco, controlli e transizioni comuni: nessun blur o zoom aggiunto. Etichette telecomando intere, target almeno40px contenuti sulle card piccole, dettagli centrati a320/390/1916, testi lunghi, tastiera e movimento ridotto verificati.

Fonti primarie consultate il 2026-11-11: [capacità media_player HA2026.10.4](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/media_player/const.py), [Apple TV](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/apple_tv/media_player.py), [Sonos](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/sonos/media_player.py), [remote](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/remote/__init__.py). Non attestano una nuova versione installata. L'Excel resta riferimento progettuale, senza lettura a runtime o compatibilità universale dichiarata.

## Verifiche ed evidenze

Evidenze selezionate e simulate in backup/rep077, escluse da Git. I gruppi sovrapposti non si sommano.

| Controllo | Esito / evidenza | Limiti |
|---|---|---|
| Cinque nuovi file di verifica Multimedia |211/211 PASS: binding50, TV67, lettori61, associazione19, raccordi14 |Backend/HA simulati; nessuna prova fisica. |
| Regressioni pertinenti |Ultimi esiti per file:1912 PASS/1918,108 file;6 RED riprodotti sul checkpoint .64 |tests-summary.json; non una suite completa o CI verde. |
| Gruppo ampio originale |1875 PASS/1895,20 RED conservati |Correzioni e retest successivi qualificati per file; il negativo non è riscritto. |
| Debito storico |TvOnNetwork:6 PASS/5 RED; TvRemote:7 PASS/1 RED, identici nei19 esiti su .64 |baseline-media-debt-summary.json/source-proof; aspettative vecchia UI e GUIDE legacy, nessuna modifica produttiva per mascherarli. ISSUE-134 aperta. |
| Launcher |Catalogo18/18 PASS; Discovery13/13 PASS in due esecuzioni dopo correzione del solo harness |Attesa layout-ready e nodo dialog realmente smontato. Nessun timeout aumentato o assert di salvataggio/annullamento indebolito; baseline vecchio harness13/13 isolato, sensibilità al timing distinta dal prodotto. |
| Backend pertinente |28/28 PASS: activityCommands, collaboration, profileService |Nessun backend o database reale modificato. |
| Strict/build |Frontend, backend e UI PASS; build .65 PASS |Avviso Vite di chunk oltre500kB conservato, non una misura di prestazioni. |
| UI/materiali |3 controlli UI e6 asset PASS; colori0 violazioni |Primitive e temi globali invariati. |
| Lint |7 fingerprint ESLint identici alla .64; tipografia1 preesistente connect.css:103 |lint-comparison-final.json; ESLint non analizza tutti i test esclusi dalla configurazione. |
| Browser su ZIP finale |TV6 flussi/6 cold/5 visuali; Apple4/4/5; Media6/6/5; Sonos6/6/5: tutti PASS |22 flussi,22 riaperture e20 visuali; solo dati dimostrativi e comandi fake. |
| Rendering |Home40×40 contenuti a320; dettagli280/350/640 centrati; etichette TV su una riga; Apple senza Canali impropri |Nomi lunghi, unavailable e movimento ridotto. WebOS sleep distinto dall'indisponibilità generica con prova di capacità TURN_ON esplicita. |
| Transizioni e isolamento |Frame campionati con sfondo CSS/viewport stabili e nessun blur fullscreen nuovo; zero errori/reti inattese/WS |Nessuna promessa di pixel invariance, FPS, GPU, Safari reale o prestazioni Lenovo M11. Browser/server privati chiusi; anteprima4195 attiva. |

Difetti e negativi conservati: famiglia transitoria con snapshot in ritardo, proprietà ereditate nelle mappe di stato, risposta tardiva di associazione, due comandi dopo unmount e seek dopo cambio canale, Canali Apple e parole spezzate nel telecomando. Candidati1/2 e relativi harness qualificati rimangono separati dal risultato finale.

Una chiamata iniziale `npx tsc` dalla directory errata ha scaricato `tsc@2.0.4` nella cache npm. Non è un controllo positivo né un'installazione del progetto: package/lockfile e dipendenze sono rimasti identici; i controlli sono stati ripetuti con TypeScript già presente. Evidenza negativa conservata.

## Artefatti, integrità e controllo del diff

- Sorgente di consegna:1935 file, SHA **37714bfaf66de28c461f058e4b48a1b66ba48d90f3f6f7fd6e48b3ed7c334aeb**;28 modificati,17 nuovi,0 rimossi/estranei/cambi EOL/whitespace aggiunto. source-after.json, source-audit.json e source-final-0.9.65.zip verificati.
- ZIP web **acasystem-web-0.9.65-local.zip**,2746960 byte,110 file, SHA **974c4fb1e0f302456934bb7b8e7aee70f43cf8f4d949a15ffb4ec92c9c0f4a6d**. Entry **index-MmNpbrUb.js**, SHA **7d90327fbafbc94f29640d63663a7cd42337c2716e980c353c0604f5b0c81641**; dist/ZIP/HTTP uguali.
- Il browser ha collaudato il medesimo ZIP con sorgente4f545d65. Dopo il collaudo è cambiato soltanto DiscoveryLauncher.test.tsx: delivery-source-lineage.json ricostruisce esattamente quel precedente aggregato e dimostra produzione e ZIP byte-identici. Manifest e ricevute originali non sono falsamente riallineati a una nuova esecuzione.
- Review indipendente qa-final-source-review.json: tutti gli hash, sei corpi legacy, dieci risolutori e Launcher fuori dal raccordo di associazione verificati. Nessun cambiamento a dipendenze, API, auth, trasporti, gesti o memoria globale dei dispositivi.

## Istruzioni di prova

Aprire [anteprima locale con dati simulati](http://127.0.0.1:4195/?screen=app#/mockup). Nelle pagine Multimedia/Sonos toccare un widget per i dettagli. Dal catalogo aprire Trova dispositivi e cercare **TV studio**, **Apple TV studio**, **Lettore studio**, **Sonos studio** o gli esempi multicanale; scegliere Crea il widget, controllare l'anteprima e Conferma. I secondi esempi conservano i gruppi e i percorsi legacy. I comandi modificano esclusivamente lo scenario dimostrativo.

## Chiusura e punto di ripresa

Nessun lavoro software assegnato rimane attivo nell'area Multimedia. Build locale verificata e documenti aggiornati. Banco, pubblicazione e collaudi su apparecchi reali rimangono operazioni distinte; non sono stati eseguiti. Le famiglie successive restano backlog e mantengono i comportamenti attuali.
