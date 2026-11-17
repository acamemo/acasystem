# ACA 0.9.34: pubblicazione e aggiornamento della centrale

| Campo | Valore |
|---|---|
| ID | REP-20261102-013 |
| Stato | Completato: pubblicazione verificata, banco aggiornato, accesso iPhone confermato dall'utente |
| Data | 2026-11-02, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit iniziale | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta U55 | «Ok, procedi con la pubblicazione di ACA 0.9.34 e l’aggiornamento della centrale, così posso provare le nuove funzioni da PC e iPhone.» |
| Autorizzazione | Pubblicare gli artefatti ACA0.9.34 verificati in REP012, aggiornare il catalogo pubblico esistente e la centrale identificata, con backup, controlli e istruzioni PC/iPhone. |

## Obiettivo e perimetro

Distribuire i sorgenti, bundle web, immagine e materiali HAOS di ACA0.9.34, poi aggiornare la centrale esistente conservando configurazione, credenziali e dati. Nessun aggiornamento HA/dipendenze, riprogettazione, riattivazione dell'esperimento VM, nuova infrastruttura remota o modifica dei volumi per iniziativa autonoma. La nuova autorizzazione supera il limite alla sola consegna locale di [REP012](REP-20261102-012-profili-client-editing-tavano.md), senza dichiarare retroattivamente eseguiti i collaudi fisici.

Stato Git iniziale conservato in `backup/rep020/git-status-before.txt`; modifiche preesistenti e HEAD locale preservati. Baseline locale REP012: 1740 file, SHA256 `9a839d40cdbdfd78576546ddd8e61dedac44837661ec549379a1ff3b1fa33ffe`. Snapshot effettivamente pubblicato dopo minimizzazione: **1735 file, SHA256 `813208fb0073515dd62e9447adc4b2e1308692ec4b855be03f4c1191a556316d`**. [ADR-0035](../decisions/ADR-0035-profili-live-client-e-tavano.md), REQ23–27 e guida collegata restano le fonti del comportamento.

## Criteri di completamento

1. Artefatti/versioni/provenienza riconfermati e controllo di pubblicabilità senza segreti o dati personali reali.
2. Immagine0.9.34 pubblica e scaricabile anonimamente; catalogo aggiornato soltanto dopo l'immagine.
3. Release v0.9.34 completa, con sorgenti, bundle, manifest, bootstrap/istruzioni/checksum e provenienza; download pubblici verificati, precedenti release preservate.
4. Centrale individuata senza supposizioni, backup consistente e recuperabile prima dell'aggiornamento; servizi e dati personali conservati.
5. Health0.9.34, asset/bundle/API e raggiungibilità locale controllati; indirizzo e percorso PC/iPhone forniti. Distinguere accessibilità dalla prova su iPhone fisico.

## Avanzamento e modifiche

Avvio: letti istruzioni, stato, infrastruttura, report e procedura di pubblicazione0.9.33. Ricognizione centrale e revisione degli artefatti delegate in sola lettura; mutazioni operative gestite dal coordinatore. La pubblicazione/autorizzazione è esplicita nella richiesta U55; non richiede una seconda conferma ordinaria.

**Target umano:** alla domanda sulla centrale l'utente ha scelto «Il banco su questo PC, per provarlo da PC e iPhone». Aggiornato soltanto `aca-tunet-tunet-1` da0.9.32 a0.9.34; non un mini PC fisico. HA Container2026.9.4 e D1 rimangono sugli stessi container/immagini/avvii. Nessuna VM avviata.

### Preparazione e pubblicazione

Il preflight ha rilevato percorsi personali in note QA non runtime: `frontend/.impeccable/` e `upstream-tunet/design-qa.md`. Il raccoglitore esclude ora quei percorsi dal contesto Docker e dall'archivio pubblico, lasciando intatti tutti gli originali locali. Cinque file esclusi complessivamente, di cui quattro note con percorsi personali. Test reale su repository temporaneo verifica esclusione e conservazione di sorgenti/licenze/originali. Nessun nuovo comportamento applicativo; il bundle web è **byte-identico** a quello collaudato in REP012.

Bootstrap, README e fixture sono riallineati a0.9.34; lo script rimane di prima installazione/ripetizione della stessa versione e rifiuta l'aggiornamento automatico di una versione diversa. DOCS/changelog del catalogo descrivono profili, accessi e Tavano, conservando limiti hardware e LAN. Test strumenti **9/9 PASS**. Nuova immagine base costruita da snapshot; wrapper definitivo preparato senza suffisso99. Nessuna dipendenza aggiornata.

Pubblicata **`ghcr.io/acamemo/acasystem:0.9.34`**, digest **`sha256:69eb0d6a389e850ab591a508108b39c47b8494eccd8b0fc33cbd57736e1df2d4`**, linux/amd64,19layer. Manifest e config verificati anonimamente prima dell'aggiornamento del catalogo.

Catalogo aggiornato tramite connettore GitHub: solo `acasystem/config.yaml`, `DOCS.md`, `CHANGELOG.md`. Albero confrontato prima di muovere il ref; altri quattro file preservati. Commit **`ff77efe8788faeb2a442ce0a5aecd8fb6d20e980`**, parent `6171905ee7c2e82b81c8f28097a935ed1e260b65`; main aggiornato con revisione attesa. Nessun remote o commit locale creato.

Il connettore non espone release/upload: usate le API GitHub con credenziale GHCR già configurata, solo in memoria. Bozza completa, otto asset verificati per size/digest, quindi pubblicazione con tag esplicito e latest. [Release v0.9.34](https://github.com/acamemo/acasystem-releases/releases/tag/v0.9.34), ID **431854516**, pubblicata il2026-11-02 alle **19:00:24UTC / 20:00:24 Europe/Rome**, sul commit del catalogo. Otto download anonimi confrontati ai materiali locali; sette checksum e1735sorgenti/1760entry verificati. Release0.9.33 con undici asset e relativi digest preservata.

Artefatti pubblici: `acasystem-src-0.9.34.zip`, `acasystem-web-0.9.34.zip`, `manifest.json`, `bootstrap-haos.sh`, `BOOTSTRAP.md`, `PUBBLICAZIONE.md`, `SOURCE-PROVENANCE.json`, `SHA256SUMS`. Byte/SHA completi in `backup/rep020/published-release.json` e checksum pubblici. SorgentiZIP **c796aa1f0aa754e17f1e58e3358b4ea2431065032009e69e61f10bd9099007ed**, webZIP **a95c3f8214a9cadd587090e1ea04bf6fb9d8002af5b883a15abec29bf6329ce3**; minServer0.9.34/minShell0.1.0. Native ZIP/APK restano locali come dichiarato nelle note pubbliche.

### Backup e aggiornamento del banco

Fermato soltanto ACA con arresto ordinato. Copia a freddo dell'intero volume **`aca-tunet_tunet-data`** in `backup/rep020/cold-bank-pre-0.9.34/aca-tunet-data-pre-0.9.34.tgz`, **451.635byte**, SHA256 **`113f84fa984859d3cb2562fd5222544f670c122c117ba4d4f25d3d7ae242d064`**. Helper senza rete, volume sorgente readonly; estrazione in tmpfs e `integrity_check=ok`. Segreto servizio separato ed escluso; non era presente un'identità tecnica nel banco. Copiati anche compose/versione precedenti, senza pubblicarli.

Compose usa ora il wrapper pubblico con bundle pre-login; tolta la build diretta della sola base che avrebbe perso il bundle nativo a una successiva ricostruzione. Aggiornati versione in `.env` e binding LAN dal vecchio indirizzo non più presente all'attuale **192.168.1.11**, mantenendo loopback e bind puntuale. `docker compose ... config --quiet` e `up -d --no-build --pull never tunet` riusciti; immagine effettiva uguale al digest pubblico, servizio healthy.

Dopo l'avvio: integrità SQLite ok, **nove tabelle precedenti identiche per contenuti hash/conteggio**, comprese12configurazioni correnti e188revisioni storiche. Profili salvati legacy0righe. Verifica effettuata prima di eventuali attività successive dell'utente. Un checkpoint automatico pre-v2 da1.282.048byte presente nel volume. Nessun originale attribuito a un account diverso.

Il collegamento dal PC rispondeva su loopback e LAN, ma l'utente ha rettificato la prima conferma dell'iPhone dichiarando che non raggiungeva ACA. IP del telefono nella stessa sottorete; vicinato e singolo ICMP hanno confermato il percorso locale di base. Le regole Docker erano limitate al profilo Public, mentre il Wi-Fi è Private. Con elevazione UAC è stata aggiunta e verificata la sola regola **`ACA-System-LAN-3002`**: TCP3002 in ingresso, profilo Private, indirizzo locale192.168.1.11, remotoLocalSubnet, interfacciaWi-Fi, EdgeTraversalBlock. Nessuna disattivazione del firewall o regola verso Internet.

Alla riprova dopo la regola l'utente ha risposto **«Sì, ora compare ACA»**. Questa conferma valida la raggiungibilità della schermata sull'iPhone; non certifica già login, profili e comandi fisici. Il solo cambio IP non era sufficiente; il retest umano distingue il risultato dal test LAN effettuato sul PC stesso.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Preflight | Scan indipendente sorgenti/bundle e confronto snapshot/proof | PASS | Nessun segreto ad alta confidenza o percorso personale nei candidati finali; fixture dimostrative distinte. Metadati anonimi `artifact-preflight-scan.json`. |
| Strumenti release | `node --test ...source-provenance.test.mjs ...bootstrap/bootstrap.test.mjs` |9/9PASS | Nessun Supervisor o dispositivo reale chiamato dai test. |
| Build/pubblicazione | Builder snapshot, prepare0.9.34, dockerpush, connettore catalogo, API release | PASS | Log `base-build`, `prepare-public`, `registry-push`, `release-publication`. Nessuna versione99 pubblicata. |
| Audit pubblico indipendente | Latest/tag, rawcatalogo, otto download anonimi, GHCRmanifest/config | PASS | `independent-public-audit.json`: digest/config/arch/licenze/source coerenti; vecchi asset preservati per metadata, non riscaricati dall'auditor. |
| Backup | Utility controllata, ACA fermo, tar readonly, verifica tmpfs | PASS | Manifest/SHA e SQLiteok in `cold-bank-pre-0.9.34/`; nessun segreto incluso. |
| Integrità e conservazione | Fingerprint tabelle prima/dopo e confronto ID/avvio HA/D1 | PASS | `legacy-data-comparison.json`, `other-services-before/after.txt`; nove tabelle intatte. |
| Banco HTTP | Health, bundle con SHA e APIv2 senza token, loopback+LAN | PASS | `bank-final-probe.json`;0.9.34, bundle identico al pubblico e401 sulle API protette. |
| Browser banco reale | Quattro contesti freschi PC/telefono × loopback/LAN, mutazioni bloccate |4/4PASS |35asset200per contesto, zeroerrori JS/console/rete esterna; unico GETapp setup/status. `bank-readonly-browser/summary.json`. |
| Firewall | Regola puntuale applicata con UAC e riletta | PASS | `firewall-lan-result.json`; privata/localesubnet, nessuna apertura generica. |
| iPhone fisico | Riprova dell'utente sul Wi-Fi dopo la regola | Confermato | «Sì, ora compare ACA». Autenticazione e funzioni successive non ancora collaudate su hardware. |
| Proprietario HA | Stato pubblico e soli conteggi anonimi del registro | owner-required | HA già senza proprietario prima dell'aggiornamento; nessun account creato dall'agente. |

HA richiede ancora la prima configurazione: l'utente deve creare il proprietario nella webapp ACA e completare la casa, poi accedere dallo stesso account sul secondo dispositivo e scegliere lo stesso profilo. L'identità tecnica per i nuovi membri si prepara tramite il percorso esistente dopo il proprietario. Le prove complete dei nuovi flussi restano quelle software/HA simulato di REP012; nessuna password richiesta o salvata dall'agente, nessun comando fisico eseguito. ISSUE-134 rimane il debito generale già dichiarato e non è nascosta dalla pubblicazione.

## Controllo del diff e decisioni

Diff limitato a materiali/provenienza della distribuzione, pinbootstrap/test, compose/versione del banco, documenti ed evidenze. Codice applicativo/bundle invariato; cinque note QA escluse soltanto dai materiali pubblicabili, originali preservati. L'aggiornamento del banco e la correzione della rete locale sono interni al risultato PC+iPhone autorizzato. Nessun cambiamento HA/D1, dipendenze, servizio remoto, regole firewall generali, layout personali o credenziali. Verifica finale dei documenti/diff registrata nelle evidenze; HEAD locale preservato.

Chiusura documentale:57nuovi collegamenti locali verificati rispetto al checkpoint, zero destinazioni mancanti; controllo completo dei4documenti delegati191link/0mancanti. Hash dei due artefatti nativi locali ancora corretti; checksum della copia fredda ricalcolato identico. Preflight finale immagine/sorgenti riconferma1735file eSHA813208fb…6316d. `git diff --check` riuscito con gestione esplicita CRLF (`core.whitespace=trailing-space,space-before-tab,cr-at-eol`); nessuna normalizzazione generale o commit locale. Ultimo inventario Docker: solo i tre servizi del banco, ACA healthy; nessun helper/browser di prova lasciato in esecuzione.

## Chiusura e punto di ripresa

U55 completato: pubblicazione verificata, banco0.9.34 healthy, dati conservati, accesso iPhone confermato dopo la correzione firewall. Indirizzo comune **http://192.168.1.11:3002/**; sul PC disponibile anche http://127.0.0.1:3002/. PC acceso e stessa rete necessari. Primo proprietario e accessi personali spettano all'utente; nessun ulteriore incarico operativo rimane attivo. Test autenticati/automazioni su hardware e installazione su mini PC fisico sono passi distinti.

### Recupero in caso di successiva regressione

Vecchia immagine conservata: `sha256:4e56f918ecd9573ba504fb022c2a7f31ba1c9a3f195b0ec1cdf4de6fb85e8b91`, con compose/versione precedenti in `backup/rep020/config-before/`. Prima di ripristinare, fermare soltanto ACA e conservare **anche** i dati successivi all'aggiornamento in una copia separata; non sovrapporre il database freddo a quello in uso. Verificare nuovamente checksum/integrità, ripristinare su un volume separato e usare la vecchia immagine con l'indirizzo LAN corrente. Non eliminare il volume aggiornato o i nuovi dati per un rollback. Ripristino non eseguito perché tutti i controlli operativi sono riusciti.

**Seguito UI, 2026-11-02:** le successive richieste sui testi e sull'occhiolino sono completate in [REP014](REP-20261102-014-accesso-essenziale-password-visibile.md), con banco locale0.9.35/override e ulteriore backup. La pubblicazione0.9.34, i suoi hash e gli esiti di questo report sono preservati; il nuovo codice UI non è stato pubblicato.
