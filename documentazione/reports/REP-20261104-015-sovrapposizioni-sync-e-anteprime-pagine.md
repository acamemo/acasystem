# Sincronizzazione leggibile e anteprime laterali delle pagine

| Campo | Valore |
|---|---|
| ID / stato | REP-20261104-015 — Completato e installato sul banco locale |
| Data / autore | 2026-11-04, Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richieste | «risolvi queste sovrapposizioni grafiche» con screenshot indicatore/sincronizzazione e bozza; durante il lavoro «aggiungere animazione pagine diminuendo la grandezza della pagina precedente e successiva e lasciando di questa dimensione la pagina in visualizzazione». |
| Autorizzazione | Correzione grafica dell'app appena messa sul banco e rifinitura della vista pagine; aggiornamento locale del banco come prosecuzione dell'intervento autorizzato in REP014, senza pubblicazione. |

## Obiettivo e perimetro

Separare indicatore/nome della pagina e messaggi di sincronizzazione/bozza, conservando azioni e contenuto leggibili quando il messaggio va a capo. Evitare sovrapposizioni con ingranaggio, toolbar e contenuto. Non intervenire sul coordinatore, sui permessi o sulla logica di conservazione/riconciliazione delle bozze per risolvere un problema grafico.

Nella vista di modifica/panoramica lasciare la pagina corrente alla dimensione attuale; le pagine precedente/successiva diventano più piccole e raggiungono la dimensione corrente durante il passaggio. Riutilizzare gesti e tempi del pager, senza introdurre librerie o cambiare ordine, dimensioni persistenti, selezione del profilo o comportamento Casa3D.

Conservare le532voci Git preesistenti, elencate in `backup/rep042/git-status-before.txt`. [Design](../design/design.md), ADR-0016/ADR-0043 e report del banco [REP014](REP-20261104-014-banco-vetro-bianco.md) sono i riferimenti; nessun nuovo incarico di autenticazione o revisione delle lease.

## Criteri di completamento

- Stato sincronizzato, testo lungo, errore/azioni bozza e conflitto in aree distinte dall'indicatore e dal nome della pagina su desktop/telefono.
- Nessuna eliminazione di bozze, messaggi o comandi per nascondere le sovrapposizioni; focus, scroll e target conservati.
- In panoramica pagina centrale alla scala precedente, laterali ridotte; transizione continua e interruptibile al cambio, movimento ridotto rispettato, hit-test/drag coerenti.
- Controlli mirati e resa con le primitive reali; eventuali stati di test sintetici dichiarati come tali.
- Build locale e banco aggiornati con provenienza/backup/rollback e conservazione verificati, senza riavviare HA/D1 o pubblicare.

## Avanzamento

Rilievo iniziale: il messaggio di `LiveProfilesContext` e la fascia superiore del pager hanno posizionamenti sovrapposti, indipendenti dall'altezza del contenuto. Analisi della prenotazione dello spazio e delle trasformazioni del pager in corso.

Baseline isolata: banner DOM sintetici conformi ai componenti sulla demo reale,6viste1366/390/320. La pill sincronizzata interseca il binario dell'indicatore per3796px²; l'errore copre anche il nome pagina (1844px² nel campione). Nel telefono il messaggio con azioni raggiunge circa238px e può coprire i widget. Questi sono stati grafici simulati: nessuna lease, bozza o identità umana manipolata.

Una prima soluzione di solo offset dell'indicatore avrebbe lasciato il rischio di spostarlo sui widget: scelta scartata prima della consegna. Si riserva quindi una fascia reale, limitata e scrollabile, per gli avvisi; AppShell dispone indicatore e avviso connessione nel flusso quando occorre. È un adattamento temporaneo dell'area disponibile, non una riscrittura di coordinate/ordine/dimensioni nel profilo. Scala principale del pager invariata; l'area renderizzata può adattarsi allo spazio temporaneamente disponibile. [ADR-0044](../decisions/ADR-0044-avvisi-e-anteprime-pagine.md) annota l'eccezione grafica alla precedente policy delle barre sovrapposte.

La panoramica conserva fattore base/passo del pager, con fattore aggiuntivo1 per la pagina centrale e0,90 per le laterali. Durante il trascinamento i fattori seguono la distanza dal centro (a metà passaggio0,95 per le due pagine vicine); stessa trasformazione per contenuto e target clic, senza introdurre animazioni di layout o stato persistente.

Il primo controllo del nuovo rail ha trovato un secondo difetto reale: dopo la rimozione del messaggio una catena di contenitori senza altezza esplicita in `LauncherPage` lasciava l'area del pager ridotta. La correzione comprende il ripristino corretto dell'altezza, da verificare nel renderer e non dedurre dal solo test dei componenti.

Dopo tale correzione i12stati di avviso non si intersecano più con indicatore/gear/widget, ma la verifica visiva aggiuntiva320/390×568 ha trovato un'altra regressione: l'area più bassa produce card standard di80px, insufficienti per la loro presentazione precedente. Si riutilizza la presentazione compatta già prevista dal widget quando le sue dimensioni fisiche effettive lo richiedono, tornando alla presentazione originale quando lo spazio si libera. Le dimensioni logiche/preferenze restano persistenti e invariate; non si nascondono didascalie per aggirare l'errore né si aggiunge una nuova procedura di bozza.

Pager:148test core e81guardie CSS PASS. Prima QA visuale4contesti1366/390 normale/ridotto: centro0,72 e laterali0,648 (0,72×0,90); metà passaggio0,684 per le due pagine, nuova centrale0,72 e target/opener coerenti entro0,1px. Le prime asserzioni sul rilascio esattamente a metà e sulla grafia CSS dell'identità in ridotto sono state corrette nel solo harness, con tentativi preservati. Nessuna modifica del prodotto per soddisfare una forma testuale del CSS. Tempi di assestamento condivisi del pager conservati per tenere spostamento e scala coordinati, non introdotto un secondo ritardo.

## Verifiche ed evidenze

| Controllo | Stato | Limiti |
|---|---|---|
| Avvisi e ripristino | Superato nel campione |12stati HUD e16azioni focus/hit: avvisi/indicatore/nome/widget separati, messaggi lunghi scrollabili, layout/preferenze invariati e area ripristinata dopo rimozione. Componenti launcher reali con stati DOM sintetici conformi a LiveProfileChrome, non coordinatore o sessione umana. |
| Viewport corto | Superato |9viste320/390×568 e1366×900: none→rail→none,0clipping interno/target fuori, min44px, tier e controlli originali ripristinati.2ricatture pulite aggiuntive. Nome accessibile contestuale conservato; presentazione compatta visiva è quella esistente, senza nome completo nell'header. |
| Panoramica | Superato |229test mirati (148pager/gesti+81guardieCSS),4contesti1366/390 normale/ridotto. Senza avvisi centro/passo/posizione identici alla baseline, scala0,72; laterali0,648. Metà pan0,684, rilascio60% porta nuova centrale0,72, opener coerente entro0,1px e chiusura scala identità. Movimento ridotto0s. |
| Componenti e build | Superato |53test chrome/frame,33adattivi/nome e94regressioni operative PASS, strict e build frontend/Casa3D PASS. Risorse condivise6/6PASS. Conteggi dei gruppi non presentati come totale unico. Segnalazione chunkHLS e debito ISSUE-134 distinti. |
| Provenienza e runtime | Superato | Audit indipendente:1775file snapshot, delta14file (3nuovi/11modificati) solo UI/test.163backend,9contratti/116runtime,31API/coordinatore,2fileIndexedDB,8package/lock/Dockerfile e22strumenti identici alla .43.7checksum/120asset web coerenti, markerUI presenti. Runtime Node26.13.0/Alpine3.24.3/SQLite3.53.4 e19APK senza differenze rispetto alla .43. Smoke isolato PASS, fixture rimosse. |
| Backup e conservazione | Superato | Backup nuovo240344byte SHA256 `f70c4fb6d3363f318daedf717db068ab8ab33c2a3878821726a5810ff9ccf20e`, estrazione/integrità e audit dedicato PASS.27/27tabelle identiche al cold snapshot, nessuna colonna aggiunta, identità HA/tecnica uguali. HA/D1 stessi ID/immagini/avvii e stessi mount. Il backup centrale non certifica le bozze locali del browser, che non sono state aperte/scartate dagli strumenti. |
| Banco effettivo | Superato | ACA0.9.44/r99 health/manifest200, setupready, localhost eLAN192.168.1.11. UI anonima reale5/5viste1366/390/320 e preferenze,0overflow/errori/esterne/mutazioni; foto/fallback corretti. Queste viste non sono una prova autenticata della bozza o della lease dell'utente. |

## Materiali e operazioni

Build con `ha-app/build-base.mjs --version 0.9.44 --tag aca-system:ui-fixes-local`, poi `prepare.mjs --version 0.9.44 --revision 99 --base-image aca-system:ui-fixes-local`. Nessun push. Snapshot SHA256 `68b33fb578cc5aca22bf9e22c8d466acd4205a8ccb0c4e1ef88edee92e74a255`,1775file; base `sha256:eb5d566571877f158ae9565e8711336e60b5dc577819d092e1a958d9c1e750b8`; wrapper `sha256:a6194c940d7a48e69413e5df192b77af57a0968e959ab9f9bd734e396fbb5b75`. Bundle3342260byte SHA256 `b810900bfadf078412eb937d48399f4f71b13468f25c0336b509299ba9ab48ca`, minServer0.9.44/minShell0.1.0.

Il primo preflight ha fermato correttamente l'updater prima dello stop: il PC aveva cambiato IP da192.168.1.19 a192.168.1.11. Rilevati Wi-Fi Private/gateway192.168.1.1; aggiunto il solo override di porte `compose-network-local.yaml`, loopback e nuovo IP specifico, senza allargare binding o firewall. Parser/piano risolto ricontrollati. Il rollback alla .43 include anche il nuovo override di rete, per non tornare all'IP inattivo. Solo `tunet` aggiornato con `--no-deps --no-build --pull never`; HA/D1 non ricreati. Il cambio origine di un browser non migra automaticamente il suo storage locale: nessuno storage/IndexedDB dell'utente è stato toccato o dichiarato recuperato.

Evidenze in `backup/rep042/`: handoff `sync-overlap-fix`, `overview`, `overlap-qa`; JSON baseline/final-overlap/final-short-widget e tentativi falliti preservati; test mirati, log build, source/artifact audit, confronto runtime; `cold-bank-pre-0.9.44/`, `data-comparison.json`, `identity-before/after.json`, `services-before/after.json`, `ops-preservation-audit.json`, `ops-live-identity-audit.json`, `bank-white-ui-results.json` e `runtime-final.json`. L'audit post è stato eseguito dal coordinatore con gli helper di sola lettura preparati e revisionati indipendentemente.

Limiti: prove grafiche su Chromium, non Safari/iPhone/Android/M11 fisici o misura GPU/FPS. Densità del binario16pagine sotto l'ingranaggio nel telefono già nella baseline: proposta separata ISSUE-146, non falso PASS su tutti i discendenti dell'indicatore. Nessuna correzione implicita di ISSUE-145 o della causa della lease mostrata dall'utente; la richiesta riguarda presentazione e animazioni, non scarto/riconciliazione della bozza.

## Controllo del diff

Solo frame/rail, gerarchia visiva del pager, presentazione adattiva dei widget e regressioni pertinenti. Nessun nuovo protocollo o preferenza persistente, coordinatore/API/IndexedDB invariati. Fonte e materiali congelati verificati; modifiche preesistenti conservate, nessun commit o pubblicazione.

## Chiusura e punto di ripresa

Incarico completato sul banco. [ACA sul PC](http://127.0.0.1:3002/), [ACA sulla LAN](http://192.168.1.11:3002/); avvio e rollback aggiornati in infrastruttura. Gli account/profili del banco sono conservati. Le eventuali schede con bozze locali non sono state chiuse o scartate dagli strumenti; la verifica dell'utente con la propria sessione resta distinta dalla QA sintetica.

Nessun lavoro ulteriore assegnato per questo lotto. Issue146 e le altre proposte rimangono backlog, non autorizzazione autonoma a nuove modifiche.
