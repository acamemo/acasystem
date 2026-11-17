# Executor HAOS candidato, app __VERSION__

Questi materiali completano il coordinatore esterno della nuova centrale HAOS. Non sono un'attivazione: il normale ACA mantiene il ruolo corrente e nessun socket Docker aggiuntivo. Il companion usa la stessa immagine/versione ACA, eseguendo un processo distinto, senza porte pubbliche, accesso Core, rete host, mappe dei dati personali di altri add-on o credenziali del banco.

L'add-on `Acasystem updater` richiede **Supervisor manager e Docker API**, disponibile solo con **Protection mode disattivato per quel companion**. L'accesso al socket Docker attribuisce un'autorità ampia sul daemon anche se il bind è read-only: non costituisce un filtro delle operazioni API. Il codice limita i target ad ACA, ma il privilegio della piattaforma resta ampio. La configurazione è tenuta fuori dal catalogo ordinario e l'attivazione richiede revisione esplicita sul target identificato. Non disabilitare protezioni Windows/HAOS o quelle del normale ACA.

## Preparazione del collaudo

1. Qualificare il Core/HAOS effettivi e l'immagine esatta ACA con runtime executor incluso; il kit contiene l'hash del runtime, vincolato anche all'immagine dalla pipeline. Non sovrascrivere .73.1: una modifica del wrapper richiede una nuova revisione. Nessuna immagine nuova è pubblicata da questi file.
2. Verificare checksum e `EXECUTOR-PROVENANCE.json`. Il catalogo ordinario resta invariato; rendere disponibile separatamente l'entry `acasystem_updater/config.yaml` nel catalogo di collaudo dello stesso repository. L'immagine deve essere quella esatta già verificata, non un tag di un'altra versione.
3. Eseguire la predisposizione **prima della creazione degli account personali**. Lo script rifiuta un'ACA diversa, un host Container, opzioni ripetute e l'applicazione senza riconoscimento dei privilegi. Il solo piano è eseguibile anche su una shell di sviluppo:

```sh
sh prepare-haos-executor.sh --app-version __VERSION__ --shell-version 0.1.1
```

4. Soltanto sulla nuova HAOS autorizzata, dalla console host root già autenticata, dopo avere revisionato i privilegi:

```sh
sh prepare-haos-executor.sh --app-version __VERSION__ --shell-version 0.1.1 --apply --ack-manager-docker
```

Alla prima esecuzione il companion viene installato senza avviarlo se Protection mode è ancora attivo. Lo script si ferma con stato2 e richiede la scelta locale per il solo companion; non cambia quella protezione tramite API. Ripetere dopo la scelta esplicita. Credenziale64hex e targetId casuali nascono nell'installazione, in `/data/update-secret` privato di ACA e companion. La copia passa solo da una directory temporanea root700 con file600, poi viene rimossa. Non trascrivere il token o copiare quelle directory in pacchetti/chat.

La predisposizione riavvia la sola ACA prima dell'onboarding; non aggiorna OS/Core/Sonoff o altre app. La credenziale di manutenzione ACA è inclusa nel **backup freddo della stessa installazione**: dopo un restore devono ripartire sia l'autenticazione sia il gate di manutenzione prima di qualsiasi nuova scrittura. Il verificatore richiede file privati, targetId corretto e credenziale presente; non avvia un ripristino che li perda. Quel tar contiene dati/credenziali della casa e resta locale, protetto, senza entrare in kit, sorgenti o release. Il token dell'identità HA di servizio resta escluso come prima. Il companion esclude dai propri backup `update-secret` e runtime; un'importazione in una nuova centrale richiede identità/credenziale nuove. Un'impostazione precedente diversa o parziale è rifiutata.

Lo script verifica health, bundle, identità e uno stato aggiornamenti elaborato dal worker, anche `offline` se GitHub non risponde. Non scambia il solo avvio del processo per una prova di update riuscito. Dopo il collaudo abilitare consapevolmente Start on boot del solo companion dall'interfaccia HA; l'impostazione predefinita candidata è manuale. Un companion già attivo viene soltanto verificato senza riavviarlo.

## Prove richieste sul target

- Primo avvio/account assenti, predisposizione e assenza del token in log/risposte normali; riavvio HAOS e ripresa del worker.
- Richiesta client → checking → current/offline/deferred; due client senza duplicazione e bozze conservate. Il canale del destinatario è solo stable, indipendente da bank/Container.
- Pubblicazione stable compatibile con catalogo esatto: drain, backup parziale circoscritto, digest effettivo, fingerprint dati e bundle, commit e riapertura.
- Crash prima/dopo installazione, migrazione/health errate, restore immagine+dati e stop esplicito su `recovery-required`; nessuna nuova scrittura cancellata dopo un commit già durevole.

Il worker recupera prima il journal anche se ACA è ferma, usa il DNS interno aggiornato dal Supervisor e non espone un terminale remoto. Non aggiorna sé stesso: il proprio ciclo è distinto e il companion resta congelato durante l'update ACA. Dopo un recupero fallito non avvia un ciclo automatico infinito di restore.

Collaudo REP004: il corretto stop richiede prova `running:false` dell'Engine anche quando Supervisor riporta `error`; sono ammessi nel tar solo header PAX di timestamp, senza override di percorsi/dimensioni. La .73.2 precedente non supera questa prova. Il ripristino reale di immagine/SQLite non recupera automaticamente la credenziale HA esclusa per ADR-0022: la successiva riattivazione del proprietario resta un limite distinto (ISSUE-166), anche se il journal dichiara `rolled-back`.

Recupero REP005: il runtime ACA0.9.76 rigenera su HAOS l'identità locale di servizio riconosciuta quando il suo segreto è perso e Core rifiuta il cambio password al Supervisor. Solo quella identità priva di segreto può essere rimossa/ricreata, con registro dell'operazione; nomi/login ambigui o estranei e file illeggibili/presenti fermano la riparazione. Verificare il servizio dopo restore prima di qualsiasi sessione del proprietario. Il primo account e «Ripara il servizio» restano una riserva esplicita. Nessun cambiamento a backup_exclude, privilegi ACA o custodia del segreto.

Fonti primarie verificate2026-11-16: [configurazione e Docker API](https://contributors.home-assistant.io/apps/reference/configuration/), [permessi Supervisor](https://contributors.home-assistant.io/apps/supervisor-api/), [DNS fra app](https://contributors.home-assistant.io/apps/guides/communication/). Test locali e file preparati non certificano questi passaggi sulla nuova VM; stato ed evidenze in REP-20261116-003.
