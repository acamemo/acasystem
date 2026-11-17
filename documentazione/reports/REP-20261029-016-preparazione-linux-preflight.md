# Definizione della preparazione Linux isolata per il preflight

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261029-016 |
| Stato | Completata la definizione; preparazione non eseguita |
| Data | 2026-10-29, Europe/Rome |
| Autore / modello | Assistente Codex; identificativo esatto del modello non disponibile. |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta di riferimento | «Ok, definiamo come predisporre l’ambiente Linux isolato e i materiali per eseguire il preflight P0–P4, mantenendo i pin di HA e senza installare ancora nulla né modificare il codice.» |
| Autorizzazione | Definizione documentale della futura preparazione e dei materiali. Nessuna installazione, acquisizione di immagini/pacchetti, preparazione effettiva, esecuzione del preflight o modifica al codice. |

## Obiettivo e perimetro

Precisare come predisporre un ambiente Linux separato per P0-P4 U13: base immutabile U11, acquisizione/verifica dei materiali esatti, bootstrap del venv host, isolamento e montaggi, output/evidenze e criteri di prontezza. Conservare i pin HA e distinguere materiali del solo preflight da toolchain necessarie alle successive build Android.

All'avvio presenti modifiche/file non tracciati TV/Zigbee, documenti precedenti e directory locali di strumenti/dipendenze. Preservati con snapshot temporaneo di Git, SHA256 di 1.643 file applicativi visibili (escluse node_modules, .git, dist e .tmp) e dei tre materiali documentali U11. Nessun file applicativo sarà scritto o aggiunto a Git.

## Criteri di completamento

- Definire runtime Linux futuro e separazione acquisizione/preparazione/esecuzione offline, senza predisporli ora.
- Identificare materiali, hash, percorsi, bootstrap e vincoli dei pacchetti da installare solo in un successivo incarico.
- Specificare filesystem/montaggi/utente/rete e destinazioni di output/evidenze, senza confondere container e VM.
- Definire controlli di prontezza e limiti, preservando P0-P4 come prove non eseguite.
- Aggiornare memoria e indici; verificare codice, materiali e documenti.

## Avanzamento e modifiche

Definita in `documentazione/riprogettazione/blocchi/01-preparazione-ambiente-preflight.md` la futura sequenza S0-S4: verifica runtime, acquisizione selettiva, estrazione/layout Linux, venv/lock20 da wheelhouse e immagine dedicata con output separati. Scelta esecutiva proposta Docker Desktop/WSL 2, conservando Debian linux/amd64 per digest U11. Nessuna configurazione del PC o Docker modificata.

Ricognizione locale soltanto in lettura: Windows X64; client Docker 29.8.2, build 7fc2dff; metadata Desktop 4.94.0.241994; comando wsl.exe presente. Non sono state contattate API Engine, avviati Desktop/WSL o letti stato/versione del backend. La presenza dei comandi non è dichiarata come prontezza del runtime.

Selezionati dal manifest immutato PBS host, venti wheel, solo sdist cryptography 50.0.1 e base Debian/documenti. Distinta la successiva toolchain Android, non necessaria a P0-P4. Definito bootstrap con venv nuovo senza pip e pip 26.2.2 dalla wheel verificata; pin/hash, only-binary e no-compile, senza fallback o aggiornamenti. Non assunta la chiusura delle dipendenze native di runtime/wheel: eventuali lacune andranno documentate senza APT floating.

Specificati layout e conservazione dell'intero sdist, futuro runner ancora da implementare, immagine derivata con identità non inventata, utente 1000, input/root filesystem RO, volume output Linux e tmpfs, rete/pull impliciti disabilitati. Distinto PRONTO PER IL PREFLIGHT dal superamento P0-P4 e dal funzionamento Android.

Creati studio e report; aggiornati sette documenti esistenti: seguito U13, ingresso riprogettazione, indicazioni, diario U14/A14, stato, indice report e LEGGIMI. Nove documenti pertinenti; nessun Dockerfile, requirement operativo o script creato. Nessuna acquisizione di immagini/archivi/pacchetti, installazione o ambiente predisposto.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Stato iniziale | Git, `rg --files`, SHA256 | Superato | Snapshot temporaneo prima delle modifiche documentali. |
| Runtime disponibile | `Get-Command docker/wsl`, lettura `OSArchitecture`, `docker --version` e VersionInfo dell'eseguibile Desktop | Superato, sola ricognizione | X64, CLI 29.8.2 e metadata Desktop 4.94.0.241994; nessuna API Engine/WSL, container o servizio avviato. Operatività ancora non verificata. |
| Procedura e fonti | Lettura web ufficiale Docker/Python/pip e plugin GitHub su sorgenti versionati v3.14.10, pip 26.2.2, PBS 20261026 e cryptography 50.0.1 | Superato, riscontro documentale | Bootstrap dalla wheel e opzioni di isolamento confrontati; fonti puntuali nello studio. Nessuna estrazione, installazione o procedura operativa eseguita. |
| Revisione indipendente | Tre agenti hanno riletto bootstrap, isolamento e selezione/provenienza dei materiali | Superato | Nessun errore concreto rilevato; prontezza distinta da P0-P4 superati e digest base distinto dall'immagine derivata. |
| Integrità applicativa | `rg --files --hidden progetto` con esclusioni node_modules, .git, dist e .tmp; SHA256 e confronto con snapshot iniziale | Superato | 1.643 file, zero variazioni. Stato Git fuori documentazione invariato. |
| Conservazione materiali | SHA256 e confronto dei tre file U11 con snapshot iniziale | Superato | Distinta JSON e due lock conservati byte per byte, zero variazioni. |
| Documenti e diff | UTF-8 strict, spazi finali e link introdotti rispetto allo snapshot; `git -c core.safecrlf=false diff --check -- documentazione` | Superato | Nove documenti, 22 collegamenti locali e 2 ancore validi. Nessuna verifica di disponibilità continua dei siti esterni. |
| Preparazione/P0-P4 | Non assegnati | Non eseguito | Richiesta limitata alla definizione. |

## Controllo del diff e decisioni

Diff limitato ai nove documenti pertinenti e coerente con i criteri. Nessun Dockerfile, script operativo, requirements o configurazione applicativa aggiunto. Codice, pin/distinta/lock U11, archivio storico e servizi non modificati. Nessun ADR o commit.

## Chiusura e punto di ripresa

Incarico di definizione completato: preparazione concreta e rivedibile, separata dall'acquisizione/installazione effettive e dall'esecuzione P0-P4. Diario, ingresso e indici aggiornati. Nessun lavoro dell'incarico resta attivo.

Restano successivi incarichi: verificare il motore/backend, realizzare e revisionare runner/ricetta, acquisire i materiali, predisporre e inventariare immagine/volume, poi eseguire P0-P4. Oggi nessuna fase di preparazione o preflight è iniziata. Nessun avvio automatico, installazione, commit o deploy richiesto.

## Rettifiche successive

Nessuna.
