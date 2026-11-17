# Palette ACA fissa e conservazione del tema attuale

| Campo | Valore |
|---|---|
| ID | REP-20261104-002 |
| Stato | Completato: sorgenti/build verificati, banco locale0.9.39 aggiornato; accesso PC sul nuovo IP confermato dall’utente |
| Data | 2026-11-04, Europe/Rome |
| Autore / modello | Codex; nome esatto non disponibile |
| Commit iniziale | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Fonte umana | Dopo proposta di palette fissa, tema attuale conservato e futura nuova veste comune, l’utente: «io andrei a realizzare questa versione secondo la tua proposta, dopodiché finito il task ti andrò a spiegare come lavorare sul nuovo pacchetto che useremo come pacchetto base di Acasystem, in maniera tale da semplificare l’applicativo». |
| Perimetro | Implementare la base con palette fissa bianco/viola e tema attuale identificabile/conservato. Il nuovo pacchetto/tema sarà indicato dall’utente dopo il task: non inventarlo né installare dipendenze. Nessuna pubblicazione o integrazione bootHAOS. |

## Obiettivo e criteri

Preservare496voci Git preesistenti, configurazioni/profili/bozze e identità account. Aspetto effettivo fisso chiaro/viola/senza sfondo globale; rimuovere i relativi selettori e percorsi runtime, non solo nasconderli. Avatar/copertina dell’account e colori funzionali di errore/allarme/stato restano indipendenti. Impostazioni storiche localStorage/profili e foto wallpaper IndexedDB recuperabili, senza cancellazioni o riscritture automatiche di profili.

Tema attuale nominato ACA Classico e mantenuto tramite un ingresso comune degli stessi materiali/font: nessuna duplicazione della UI o nuovo look inventato. Webapp, shellHTML e anteprimaHAOS continuano a consumare la fonte comune. Gallery/reference storiche non sono autorizzazione a modificarne gli originali o convertirle alla nuova policy. Distinguere scelta runtime dell’app dai campioni di design.

Criteri: vecchie preferenze/import/snapshot scuri o colorati non cambiano più l’interfaccia e non generano autosave/conflitti a vuoto; niente lettura della vecchia foto globale; aspetto default e stati funzionali conservati; avatar/cover account funzionanti; source/theme packaging e regressioni pertinenti, QA isolata e build locali. Nuovo pacchetto lasciato al successivo incarico umano.

## Avanzamento e verifiche

Analizzati appearance.ts, impostazioni, applicazione dei profili live, importQR e design/copy-assets. La sincronizzazione appearance attuale può riscrivere localStorage e pubblicare operazioni: va scollegata dalla nuova policy effettiva fissa, preservando raw e storici. Agenti separati per frontend, tema condiviso e QA; checkpoint per-file in backup/rep029 prima delle modifiche. Nessun risultato dichiarato prima dell’esecuzione.

## Chiusura e punto di ripresa

Implementazione e banco completati. Il prossimo passo è ricevere dall’utente le istruzioni sul nuovo pacchetto base; nessun pacchetto o tema futuro è stato inventato/installato. Dettagli, verifiche e limite di rete nel seguito.

## Modifiche e preservazione dei dati

Ingresso comune design/index.css→themes/classic/index.css, shim webapp e singolo import nel main; stesso grafo/ordine CSS ACA+Kit2. Shell e paginaHAOS usano il copier esistente, senza duplicare materiali o font. Varianti CSS storiche mantenute per gallery e riferimenti, fuori dalle scelte dell’app; nessun fixed.css con token duplicati, nessuna nuova dipendenza.

appearance.ts passa da277a41righe: readAppearance restituisce una copia light/violet/none, applyAppearance rimuove override DOM e imposta colorScheme chiaro. Ritirati writer/hook, matchMedia, analisi tinta e accesso foto wallpaper globale. Aspetto mostra soltanto ACA Classico/Bianco e viola; rimossi i CSS orfani dei vecchi selettori. Alias/tipi storici restano compatibili come metadati.

Provider live non riscrive aca_appearance né genera operazioni appearance durante refresh/eventi. ImportQR applica il layout e la palette effettiva senza sovrascrivere il raw locale. Fallback account non-v2 conserva l’appearance raw dell’ultima risposta server nei soli salvataggi di layout, compresi campi storici sconosciuti; il confronto usa il collect effettivo, evitando loop. Nuove configurazioni/esportazioni usano la palette fissa. Due testi del trasferimento promettono ora copia layout.

Raw localStorage, appearance del profilo e foto IndexedDB restano recuperabili. Avatar, copertina e colore personale, controlli reali di luciRGB e token semantici di errore/allarme non modificati. Non eseguita una riscrittura in massa dei dati o un’eliminazione della personalizzazione personale.

## Verifiche effettive

- Design5/5PASS: copia/import/font offline e grafo Classic/index/shim equivalente esattamente alle definizioni/ordine precedenti.
- Frontend7suite pertinenti37/37PASS, strictTypeScript e lint7moduliPASS. SystemPage22PASS/1FAIL: asserzione globale /indirizzo/ incompatibile con didascaliaQR già presente. Asserzione/didascalia immutate nei sorgenti del checkpoint; non dichiarata una riesecuzione completa della baseline. Nessun comportamento QR cambiato per il test. Totale osservato8file59PASS/1FAIL, non suite interamente verde; ISSUE-134 distinto.
- Build web e Docker riuscite; warning chunk preesistente. Detector sul componente Aspetto una volta, nessun rilievo. Backend/contratti non modificati: suite744 precedente non ripetuta e non attribuita a questa versione.
- QA isolata **4/4PASS** su app reale+FakeHA/SQLite in memoria. Nove token default identici, Aspetto senza controlli. Legacy dark/orange/photo/hue mantiene raw server/localStorage/BlobIndexedDB ma non ricolora. Reload+sistema scuro non alterano resa o revisione, zero operazioni automatiche. Le due POSToperations sono entrambe fixture esplicite. Avatar/cover e colore personale intatti;0erroriJS/0comandi fisici.
- PNG launcher e account identici byte per byte alla baseline nei due campioni controllati con orario fisso. Aspetto cambia come richiesto. Nessuna equivalenza grafica universale o collaudo Android fisico dedotto. Fixture fermate e porte verificate non raggiungibili.
- Asset frontendJS+CSS aggregati:2722487→2714215byte, gzip808079→805211byte (gzip separato per file). Risparmio2868byte gzip; non è una misura di avvio/FPS o promessa di miglioramento generale.

Evidenze in backup/rep029: frontend-handoff.md e frontend-source-evidence.json (14file/hash prima-dopo), checkpoint design/frontend, qa-classic-final-handoff.md/JSON/PNG, classic-png-comparison.json, build-size.json e log. Primo setup QA della foto ha incontrato CSP su fetch(data:), corretto nel solo harness creando Blob da bytes; nessun indebolimento CSP/app.

## Versione locale e provenienza

Preparata ACA0.9.39, wrapper **ghcr.io/acamemo/acasystem:0.9.39.99**, digest **sha256:d13fc15ec98c75c83437838f10217a7d643cd9d4d690d46d24a821f52197da95**. Base **sha256:68234ab5425a86b8cf700bba5895c546e712ff64c864a0b58d59774d600cc490**. Snapshot1748file SHA256 **79a2557796d026aa5648aa57b2e336143dfe4b98667808db7ecd0b3af9dfde19**. Bundle3128398byte SHA256 **424c6c4bdc50319a9cb590370531a684fcbd03454c8ea707ff373663b7779b74**, minServer0.9.39/minShell0.1.0.

~~~powershell
node progetto/ha-app/build-base.mjs --version 0.9.39 --tag aca-system:classic-local
node progetto/ha-app/prepare.mjs --version 0.9.39 --revision 99 --base-image aca-system:classic-local
~~~

Audit indipendentePASS:7checksum,1748sorgenti ZIP/proof/working tree,22strumenti+2file generati,119asset web/Casa3D e116runtime backend/contratti identici. Smoke networknone/read-only/tmpfs/SQLite memory: health/HTML/manifest200, bootstrap anonimo401. Out progetto/ha-app/out/0.9.39.99. Nessun push/catalogo/release pubblica nuova; pubblico0.9.34 invariato. La fonte comune genera le future build native; pacchetti nativi precedenti non ricompilati, la nuova webapp si distribuisce tramite manifest della centrale. Anteprima4178 rigenerata con il tema Classico, mantenendo layout/testi inglesi dell’iterazione2.

## Aggiornamento banco, rete e riscontro umano

Il banco su questo PC, già oggetto delle autorizzazioni operative della sessione, è stato aggiornato nel perimetro della nuova versione richiesta; l’azione è stata annunciata prima di arrestare il solo ACA. Backup a freddo backup/rep029/cold-bank-pre-0.9.39/aca-data-pre-0.9.39.tgz: **222261byte**, SHA256 **17459bbb5f9aa63aaeeddbfb7079dbbb8f8086c6dd87e249f00055e668f4ba2f**. Estrazione tmpfs/integritàok, volume segreto tecnico escluso. Postavvio27/27tabelle identiche per hash/conteggi delle colonne precedenti, nessuno schema nuovo. HA/D1 mantengono stessa ora di avvio/stato; nessuna VM o protezione Windows modificate.

L’avvio sul vecchio IP192.168.1.11 è fallito. La lettura rete mostrava inizialmente172.20.10.6; anche il tentativo su tale indirizzo è fallito, quindi ripristinato il banco su loopback per non lasciare indisponibile il PC. L’utente ha poi segnalato ERR_CONNECTION_REFUSED su192.168.1.11; nuova lettura ha rilevato Wi-Fi192.168.1.19. Override locale aggiornato a127.0.0.1 e192.168.1.19 tramite ports:!override, senza cambiare compose base/.env, firewall o HA. Primo controlloHTTP dopo la ricreazione troppo precoce (ResponseEnded), successivo controllo con ErrorActionStop conferma entrambi health0.9.39 e HTML200.

Dopo il link corretto, l’utente conferma **«Sì, compare ACA»**. Ciò verifica l’accesso Edge sul PC al nuovo IP, non un login completo o la raggiungibilità da telefono nella rete odierna (profiloWindowsPublic; regole firewall lasciate intatte). Origini correnti: **http://192.168.1.19:3002/** e **http://127.0.0.1:3002/** dal PC. Il vecchio .11 non è l’origine corrente. Preview4178 rigenerata con --origin http://192.168.1.19:3002/; source default precedente conservato come esempio, non usato come dato corrente.

~~~powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep029/compose-classic-local.yaml up -d --no-deps --no-build --pull never tunet
~~~

Evidenze manifestbackup, sqlite-before/data-comparison, bank-final e network-restored.json, untouched-before/after. Container finale healthy, setupready e hash nuovo bundle verificato. I vecchi override non aggiornano l’indirizzo: per ripristini usare porte coerenti con la rete corrente.

## Consegna e limiti residui

Versione locale completata: palette fissa, tema ACA Classico nominato/condiviso, dati conservati e banco PC accessibile confermato. Ricaricare ACA per ricevere il nuovo bundle. Nuovo pacchetto base/nuovo tema rimane al successivo incarico che l’utente ha annunciato; non è stato aggiunto un tema fittizio. Funzioni HA, sync/esclusività e layout non riprogettati. Nessun commit/pubblicazione.

ISSUE-141 registra la fragilità dell’IP statico del banco durante cambi rete come proposta operativa distinta, non implementata automaticamente. TestdebtSystemPage e limiti fisici/di rete dichiarati; non rappresentarli come nuove regressioni cromatiche.

Verifica finale di consegna: 193 nuovi collegamenti documentali controllati, nessun collegamento locale mancante; hash e dimensioni dei pacchetti nativi conservati confermati. Guida di prova aggiornata con versione, override e indirizzo corrente; README dell’anteprima distingue il default storico dall’origine passata esplicitamente. Nuova lettura del banco: container running/healthy, health LAN e loopback entrambi 0.9.39, digest atteso. `bank-final.json` aggiornato anche con il riscontro umano, senza dedurne una prova iPhone. Il controllo whitespace segnala una sola riga vuota finale nel CSS ridotto `system.css`: rilievo cosmetico presente nei sorgenti già verificati dell’artefatto, lasciato esplicito senza alterare a posteriori il pacchetto. Nessuno spazio finale o rientro anomalo rilevato dagli altri controlli richiesti.
