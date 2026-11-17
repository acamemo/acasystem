# Installazione pulita e aggiornamenti del pilota ACA

**Annotazione di ripresa, 2026-11-16:** l'incarico prosegue nel [REP-20261116-001](REP-20261116-001-consegna-pilota-con-subagenti.md) con tre subagenti e integrazione centrale. L'utente sceglie successivamente **VirtualBox con VM creata dall'utente** come requisito PC, conservando il materiale Hyper-V candidato. Gli esiti e i limiti riportati sotto restano quelli del 13 novembre; le nuove verifiche non sono retrodatate.

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261113-007 |
| Stato | In corso |
| Data | 2026-11-13, Europe/Rome |
| Autore / modello | Codex; identificativo esatto del modello non disponibile |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta di riferimento | Delega dalla chat `01a188ed-0f5c-72f1-b339-5ee6b0b7b79e`: avviare in questa chat la procedura di installazione e aggiornamento per il pilota reale, seguendo REP006 con tutte le annotazioni. |
| Autorizzazione | Preparare e verificare localmente piano esecutivo, contratti e materiali di installer/bootstrap/aggiornamenti/distribuzione. Questa assegnazione avvia il lavoro prima limitato al confronto. Pubblicazione e aggiornamento del banco richiedono prima un risultato concreto verificato; nessuna attivazione Hyper-V, riavvio host, accesso al destinatario o scrittura di dischi fisici dedotti. |

## Obiettivo e perimetro

Base HAOS ufficiale vergine, destinazione Hyper-V candidata e mini PC alternativa, bootstrap applicativo comune per SonoffLAN e ACA. Esperienza reale con account/casa nuovi, eWeLink inserito localmente dall'utente, propri dispositivi e widget confermati. Aggiornamenti ACA più recenti compatibili, backend/bundle coerenti, dati e bozze conservati; controllo disponibilità separato per HAOS/Core/Supervisor/Sonoff e shell native.

All'avvio: HEAD confermato e 898 voci Git preesistenti. Nessuna pulizia, staging o commit massivo. Banco Container .72/HA2026.9.4 distinto dal pilota HAOS; nessuna modifica ai suoi volumi, HA/D1, VM storiche, widget o MINIR4M. Fonti: [REP006](REP-20261113-006-piano-pilota-capo.md), [REP005](REP-20261113-005-banco-sonofflan-trvzb.md), ISSUE-162/163/164, ADR-0022/0023/0031.

## Criteri di completamento

- Piano esecutivo con contratti, versioni candidate, ordine di pubblicazione e matrice di verifica, distinguendo codice locale e collaudo sul target.
- Materiali bootstrap legati alla versione generata, senza il vincolo errato fisso .34/18.4 e senza installare una combinazione non dichiarata.
- Predisposizione SonoffLAN originale verificabile, senza HACS, credenziali personali, sovrascrittura di integrazioni diverse o aggiornamento Core implicito.
- Predisposizione Hyper-V separata dal client e dal bootstrap, con verifiche preventive e canale iniziale autenticato; nessun uso di PowerShell Direct sul guest Linux.
- Contratto aggiornamenti e controlli locali per compatibilità, assenza downgrade, offline, integrità e conservazione dati; nessuna promessa di updater operativo prima della prova completa.
- Esiti realmente eseguiti, limiti HAOS/Hyper-V/hardware e punto di ripresa aggiornati, con diff pertinente e dati preesistenti conservati.

## Avanzamento e modifiche

Piano esecutivo e matrice delle prove in [ha-app/pilot/README.md](../../progetto/ha-app/pilot/README.md). La delega successiva dalla chat di origine riferisce la conferma umana «continua per la versione aca del capo»; il redesign Sonoff resta rimandato nel REP009. Le aggiunte REP008/009 e ISSUE-165 sono preservate.

### Bootstrap e materiali

`bootstrap/materials.mjs` genera versioni ACA, revisione app Supervisor, HAOS e Core esplicite; template ineseguibile prima della generazione. `prepare.mjs` non copia più il vecchio script .34 in ogni consegna e richiede versioni candidate/ZIP Sonoff prima della build; `--check` resta il solo controllo immagine/sorgenti. Generatore separato per preparare file senza Docker o rete. `installation.json` marca la combinazione come candidata non collaudata. Hash di tutti i file e sottoinsieme `BOOTSTRAP-SHA256SUMS` per il trasferimento.

SonoffLAN3.13.3 originale, SHA ZIP `f4f11279fc37dc51464fc6d5e3e0118cec42e024be41073afa9b4f35eb72e532`: installer Python verifica prima l'archivio, rifiuta traversal/link/duplicati e un componente esistente diverso. Staging/rename nella sola cartella Sonoff;48file originali verificati anche in una directory temporanea reale, seconda esecuzione invariata. Nessuna lettura `.storage` o login. Solo alla prima aggiunta il bootstrap chiede il riavvio Core; installa/avvia ACA se necessario e verifica health/versione/QR, distinguendo .72 da .72.99.

### Predisposizione Hyper-V candidata

Script separati di inventario, creazione e bootstrap. Immagine ufficiale HAOS18.4 VHDX ZIP, digest API `ab49fec41536c49fb7ca23db0a383f1e6b6078ac3e1a169a177cc8ec58641993`; non scaricata né avviata. Creazione prevista solo in directory nuova/VM nuova, switch esterno già esistente,2vCPU/4GiB statica/64GiB; nessuna attivazione Hyper-V/rete/host o scrittura fisica. Chiave Ed25519 per installazione con ACL, solo chiave pubblica in CONFIG della copia boot, verifica host fuori banda, SSH/scp con host pinning, revoca finale e cancellazione locale delle chiavi. `-WhatIf` e guardie verificati con cmdlet simulati: non è prova di mount VHDX, import CONFIG, SSH o revoca effettivi.

**Limite rilevato:** HAOS vergine non garantisce Core2026.9.4 al primo download. La combinazione18.4/2026.9.4/.72/Sonoff3.13.3 è una candidata, non una matrice qualificata; osservare il Core della nuova VM e validare prima di generare la consegna. Nessun aggiornamento/downgrade Core inserito per forzare la compatibilità.

### Aggiornamenti: selezione e transazione

`update-policy.mjs`: contratto `distribution.json` con canale stable/bank, tag/versione/revisione coerenti, digest registry GHCR, bundle/minShell e intervalli OS/Core/Supervisor/upgradeFrom. Lettura fissa del repository ufficiale,30release massime, timeout15s, nessun downgrade o mutazione se offline. La pubblica .34 attuale non contiene ancora questo contratto; `check-updates.mjs` è una CLI di sola disponibilità, non un updater già collegato al prodotto.

`update-transaction.mjs`: coordinatore esterno al processo ACA, journal atomico con checkpoint prima delle mutazioni, backup verificato prima dell'installazione, ripristino immagine+dati se migrazione/health falliscono, ripresa dopo interruzione e mutua esclusione demandata all'executor di piattaforma. Un commit già verificato non viene annullato dopo la riapertura delle scritture. Una pubblicazione già fallita non viene reinstallata a ogni avvio. Test su file temporanei reali e lifecycle simulato; **adapter HAOS/Windows, drain persistente, avvio client e pipeline non ancora collegati**, nessuna promessa di protezione operativa già attiva.

`component-availability.mjs`: letture distinte OS/Core/Supervisor via API interne fisse, senza redirect del token; Sonoff tramite release upstream senza HACS. Versione non verificabile/offline resta indisponibile, non «nessun aggiornamento». Non installa componenti e non modifica le politiche HA.

**Vincolo tecnico primario verificato:** l'API store Supervisor non consente a un'app di aggiornare sé stessa e ignora una versione aggiunta al percorso install/update. Serve executor esterno con controllo esatto del catalogo e verifica finale/recupero; non elevare il normale add-on ACA a manager per aggirare il confine. Fonti e alternative nel piano tecnico.

### Pacchetto reviewabile e host disponibile

Confezionato `backup/rep088/pilot-candidate-r2/acasystem-pilot-candidate-0.9.72.99.zip`,149685byte/SHA-256 `eb8faa4a1bb872b68e717fa011872b875facf3b9e119eec38a75d642ce230e4c`,14file. Contiene script pubblici di setup, guida, licenza e materiali bootstrap; non include HAOS VHDX, app Windows/APK, immagine ACA, identità/chiavi generate o dati del banco. `MATERIAL-PROVENANCE.json`, checksum esterni/interni e sottoinsieme bootstrap verificati; byte degli script uguali ai sorgenti finali. Output bootstrap separato in `backup/rep088/bootstrap-final/`; nessuna sovrascrittura degli output .72 storici.

Inventario strettamente read-only del PC corrente: **Windows11Home**, hypervisor presente, `Get-VM` assente. Non è evidenza del Lenovo Windows11Pro dichiarato dal destinatario e non consente il collaudo Hyper-V qui con le capacità presenti. Nessuna attivazione, installazione di hypervisor, modifica di protezioni o avvio VM dedotti. Il prossimo test Hyper-V richiede un host Pro identificato/predisposto, non un riavvio automatico di questo PC.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Stato iniziale | `git rev-parse HEAD`, conteggio `git status --short`, lettura istruzioni/report | Eseguito | SHA sopra; 898 voci preesistenti. |
| Bootstrap | `node --test progetto/ha-app/bootstrap/bootstrap.test.mjs` |8/8 PASS | CLI/OS/servizi simulati; compresa revisione app distinta e template rifiutato. Primo run6/8 con aspettative QR storiche, poi adeguate al nuovo passo Core. |
| Installer Sonoff | `python -B -m unittest discover -s progetto/ha-app/bootstrap -p 'test_*.py'` |4/4 PASS | File temporanei; fixture ZIP adattata per conservare i backslash originali anche su Windows. |
| ZIP Sonoff reale | Installazione/ripetizione in `TemporaryDirectory`, senza servizi |48file, installed→unchanged | Hash originale esatto; `backup/rep088/sonoff-original-isolated.json`. |
| Guardie setup | `& progetto/ha-app/pilot/pilot-guards.test.ps1` |8guardie/WhatIf PASS | Zero comandi Hyper-V mutanti, rete o chiavi private; cmdlet simulati. |
| Update | `node --test .../update-policy.test.mjs .../update-transaction.test.mjs .../component-availability.test.mjs` |21/21 PASS | Backup/corruzione/migrazione/recupero/concorrenti verificati nella logica con adapter simulati; nessun backup del banco. |
| Packaging esistente | `node --test progetto/ha-app/source-provenance.test.mjs progetto/ha-app/client-bundle.test.mjs` |3/3 PASS | Nessuna immagine ricostruita o avviata. |
| Sintassi | `node --check`, `bash -n`, parser PowerShell | PASS sui file controllati | Non sostituisce il runtime target. |
| Test aggregati finali | `node --test` sui6file pertinenti sopra |32/32 PASS |38,9secondi; non CI generale o test del prodotto sul target. |
| Argomenti Windows | Roundtrip con processo Node locale di5valori vuoti/spazi/virgolette/testo shell |5/5 PASS | Primo tentativo rileva più eseguibili PATH, corretto selezionando il primo; niente shell intermedia/chiavi/rete. |
| ACL reale temporanea | Tentativo separato di `Set-Acl` in directory temporanea | Non eseguito | Revisione automatica rifiuta l'intero comando: «blocked by policy»; nessun successo dei permessi dedotto. |
| Pacchetto finale | `pilot-package-final-audit.json` |14file/checksum annidati/provenienza/script esatti | Materiali candidati senza dati privati; non una consegna installata. |
| HAOS/Hyper-V/hardware | Installazione vergine, LAN/telefono, onboarding, riavvio e durata | Non eseguito | Nessun target nuovo attivato. |

## Controllo del diff e decisioni

Snapshot iniziale dei file modificati in `backup/rep088/before/`, stato iniziale in `backup/rep088/initial-status.txt`; audit del delta proprio in `own-source-delta-audit.json`. Conservati LF dei sorgenti bootstrap; nessuna normalizzazione dei documenti comuni preesistenti. `git diff --check` sui file tracciati pertinenti PASS (avvisi EOL dei documenti comuni distinti), HEAD invariato e staging vuoto. Nessuna nuova dipendenza, modifica runtime backend/frontend/widget, commit, pubblicazione o mutazione del banco. REP008/009 e ISSUE-165 preservati; nessun archivio storico toccato.

## Chiusura e punto di ripresa

Incarico attivo. Materiali e logica di selezione/transazione sono reviewabili localmente; restano executor di piattaforma con drain/backup/recupero reali, collegamento del controllo all'avvio, pipeline e confezionamento finale. Nessuna validazione Hyper-V/HAOS fisico, telefono, onboarding del destinatario o continuità/H24 dedotta. Il prossimo lavoro locale riguarda l'executor separato e le verifiche dei suoi confini; l'esecuzione su host o banco resta soggetta ai target e alle autorizzazioni già fissati, senza riavvii o accessi al destinatario impliciti.
