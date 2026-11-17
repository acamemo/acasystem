# Continuità di Home Assistant sul tablet Android

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261029-017 |
| Stato | Completato |
| Data | 2026-10-29, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile. |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta di riferimento | «Ok, ma se chiudo ACA o spengo lo schermo del tablet, Home Assistant continuerà a gestire dispositivi e automazioni? Approfondiamo questo punto senza installare nulla né modificare il codice.» |
| Autorizzazione | Analisi in lettura, fonti primarie e memoria locale della riprogettazione. Nessuna installazione, modifica applicativa o prova sul tablet. |

## Obiettivo e perimetro

Distinguere uscita dalla UI, schermo spento, rimozione dai recenti, stop esplicito, terminazione del processo e riavvio. Valutare servizio Android, energia/rete e piano futuro di verifica per HA Core locale, conservando i pin già definiti e il frontend HA presente ma nascosto (ADR-0026). Documentare anche la precedente richiesta di riepilogo semplice senza trasformarla in approvazione tecnica.

Sono presenti modifiche e file non tracciati preesistenti in progetto/, documentazione/ e altre cartelle. Censimento iniziale dei sorgenti, stato Git e copie dei documenti interessati conservati in una directory temporanea. Non modificare né includere il lavoro estraneo.

## Criteri di completamento

- Risposta comprensibile con comportamento desiderato e limiti Android documentati.
- Stato attuale verificato sui sorgenti pertinenti; proposta distinta dall'implementazione.
- Piano di prove future con criteri osservabili, tutte non eseguite.
- Diario, punto di ripresa e indici aggiornati; diff limitato ai documenti richiesti.
- UTF-8, collegamenti introdotti, diff, sorgenti applicativi e materiali congelati controllati.

## Avanzamento e modifiche

Creato lo [studio di continuità](../riprogettazione/blocchi/01-continuita-android.md): matrice dei significati di chiusura, servizio indipendente dalla UI, FGS/CPU/rete, Doze e Low Power Standby, tipi di servizio, stop e primo sblocco. Definite prove future con eventi reali e osservazione separata dalla UI. Nessun tipo FGS scelto o implementato, nessuna garanzia H24.

Verificati in lettura manifest, variables.gradle, build.gradle e UiActivity del client Android. Aggiornati ingresso della riprogettazione, indicazioni, diario U15/A15 e U16/A16, punto di ripresa del precedente studio Android, stato, LEGGIMI e indice report. In totale nove documenti interessati, inclusi studio e report nuovi. La precedente risposta semplice A15 è registrata come sintesi a posteriori, non come approvazione architetturale.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Stato iniziale | git status --short; git rev-parse HEAD; censimento SHA256 di progetto/ | Superato | Stato acquisito, modifiche preesistenti preservate. |
| Client attuale | Get-Content dei sorgenti pertinenti; rg su servizio/Python/boot/wake lock | Superato | Manifest sorgente senza servizio HA/receiver e con solo INTERNET; target 36. Nessuna build o verifica del manifest unito. |
| Fatti esterni | Consultazione delle fonti primarie Android/AOSP il 2026-10-29, collegate nello studio | Superato | Distinte API/regole per versione e limiti del firmware concreto; nessuna osservazione sul dispositivo. |
| Revisione indipendente | Rilettura dello studio e confronto con fonti Android e sorgenti locali da parte di un altro agente | Superato | Nessun problema sostanziale rilevato; non è un collaudo del prodotto. |
| Integrità documenti e collegamenti | Decodifica UTF-8 rigorosa, confronto con copie iniziali, risoluzione link locali e ancore, git -c core.safecrlf=false diff --check -- documentazione | Superato | 30 collegamenti introdotti e 3 ancore locali validi; nessuno spazio finale introdotto. |
| Codice e modifiche preesistenti | rg --files --hidden progetto con esclusioni node_modules/.git/dist/.tmp; Get-FileHash SHA256; confronto git status --porcelain=v1 --untracked-files=all fuori documentazione/ | Superato | 1.643 file censiti, zero differenze; stato Git esterno ai documenti invariato. |
| Materiali congelati U11 | Get-FileHash SHA256 dei tre materiali, confronto con censimento iniziale | Superato | Tre file identici; nessun pin o distinta modificato. |
| Prove di continuità sul tablet | Matrice futura nello studio, inclusi sonno naturale/controllato, alimentazione, rete, stop e riavvio | Non eseguito | Nessun ADB, impostazione o processo del tablet interrogato/modificato. |
| Preparazione Linux e P0-P4 | Percorso definito dagli incarichi precedenti | Non eseguito | Nessuna installazione, pull, import/generazione C o compilazione. |

## Controllo del diff e decisioni

Il confronto con la richiesta conferma un diff soltanto documentale. Nessuna nuova architettura adottata, modifica applicativa, nuovo REQ o ADR. Scelte esecutive e criteri di prova sono proposte attribuite all'assistente; nessun commit o deploy.

## Chiusura e punto di ripresa

Analisi completata. Chiudere la UI o il display è compatibile con l'obiettivo di un motore indipendente, da realizzare e provare; lo stop esplicito o la perdita di alimentazione interrompono HA sul tablet. Restano tipo FGS e host mobile, energia/rete del firmware reale, aspettative dopo reboot e collaudo delle integrazioni. Nessuna garanzia di continuità verificata.

Nessun incarico esecutivo resta attivo. Proseguire dalle domande dell'utente; non avviare automaticamente preparazione Linux, preflight, installazioni, porting o prove. Pin e materiali congelati invariati. [Ingresso della riprogettazione](../riprogettazione/README.md), [stato del progetto](../project-status.md).

