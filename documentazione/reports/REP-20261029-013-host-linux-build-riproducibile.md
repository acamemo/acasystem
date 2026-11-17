# Host Linux e dipendenze di build riproducibili

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261029-013 |
| Stato | Completato, analisi e documentazione |
| Data | 2026-10-29, Europe/Rome |
| Autore / modello | Assistente Codex; identificativo esatto del modello non disponibile. |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta di riferimento | «Ok, definiamo l’host Linux e le versioni delle dipendenze di build ancora mancanti, incluso pycparser, per rendere la compilazione riproducibile, mantenendo i pin di HA e senza installare nulla né modificare il codice.» |
| Autorizzazione | Definizione documentale dell'host e delle dipendenze, verifica di sorgenti/metadati e memoria. Nessuna installazione, compilazione o modifica al codice. |

## Obiettivo e perimetro

Completare la definizione dell'ambiente di compilazione dei due pin HA studiati in U9/U10: host Linux immutabile, dipendenze Python e strumenti nativi ancora mancanti, provenienza e modalità per evitare aggiornamenti impliciti. Conservare Core 2026.10.4, orjson 3.11.9, cryptography 50.0.1 e la baseline già scelta.

All'avvio sono presenti modifiche e file non tracciati applicativi TV/Zigbee, documenti precedenti e directory locali di strumenti/dipendenze. Preservati con snapshot temporaneo di stato Git e SHA256 di 1.643 file visibili sotto `progetto/`, escluse node_modules, .git, dist e .tmp. Nessun file applicativo sarà scritto o aggiunto a Git.

## Criteri di completamento

- Definire un host Linux x86_64 con identità immutabile e fonti/pacchetti di sistema congelati.
- Fissare pycparser e le dipendenze effettive della catena di build scelta, rispettando i vincoli HA e distinguendo host/target.
- Identificare provenienza e checksum disponibili, lock dei sorgenti e controlli di determinismo; esplicitare ciò che non è verificabile senza eseguire build.
- Aggiornare memoria e indici; verificare diff, collegamenti e integrità del codice preesistente.

## Avanzamento e modifiche

Definito l'host Debian 13 trixie slim Linux amd64, manifest per piattaforma `sha256:1e1a22175fbf1b32157ddaf0219e1db4e5401fab2b94ed285add64d18587cd2d`, con snapshot Debian/security del 27 ottobre 2026. Selezionati dieci pacchetti nativi diretti con versione, filename e SHA256 degli indici; distinto il catalogo congelato dall'inventario APT effettivamente installato, non disponibile.

Chiusura documentale Python di 20 wheel per CPython 3.14/Linux x86_64 senza extras, compreso pycparser 2.23; conservati CFFI 2.0.0 e setuptools 84.0.0 dei vincoli HA. Riletti tutti i relativi metadati PyPI e i vincoli HA pertinenti: anche certifi e packaging scelti soddisfano gli intervalli HA. Fissati bootstrap virtualenv 21.14.13 PYZ e policy del seed locale. Non richiesta wheel separata, essendo vendorizzata in setuptools.

Identificati Python host/target, quattro componenti Rust 1.95.0, NDK r27d e sorgenti per checksum. Descritto profilo solo wheel con NDK predisposta e metadata locale esplicito, senza installazione implicita di Java/SDK/Rust; configurazione offline e vincoli per i venv interni. Riproducibilità dei byte distinta da pin/hash degli input; pycparser su 3.14, propagazione flag, percorsi e repair restano da verificare.

Creati studio `01-host-linux-build-riproducibile.md`, distinta documentale JSON e due copie documentali Cargo.lock originali come `.txt`, oltre a questo report. Aggiornati sette documenti esistenti: seguito U10, ingresso riprogettazione, indicazioni, diario (U11 integrale/A11 sintesi), stato, indice report e LEGGIMI. Totale dodici file pertinenti. Nessun ambiente creato, immagine/toolchain acquisita o strumento installato; nessun sorgente applicativo o configurazione operativa modificato.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Stato iniziale | `git status --porcelain=v1 --untracked-files=all`, `git rev-parse HEAD`, `rg --files` e `Get-FileHash -Algorithm SHA256` | Superato | Snapshot temporaneo prima delle modifiche documentali. |
| Host e cataloghi Debian | Plugin GitHub su commit immutabile degli artefatti Debian; lettura HTTP di Release/indici e confronto hash degli indici compressi in memoria nella verifica parallela | Superato, riscontro documentale | Digest amd64 distinto dall'indice multiarch; dieci radici con versioni/hash. Scelte finali da Packages.xz, inclusi aggiornamenti security di ca-certificates e xz-utils. Il lookup preliminare Packages.gz non chiudeva il lato security. Nessun `.deb`/layer scaricato, APT simulato o firma InRelease verificata localmente. |
| Lock Python | `Invoke-RestMethod` sui 20 endpoint PyPI versione-specifici, selezione della wheel tramite SHA256 pubblicato e controllo requisiti/marker | Superato, riscontro documentale | Venti artefatti presenti e non ritirati; chiusura dichiarata senza extras, 15 archi attivi. Non è `pip check` su ambiente installato. |
| Rust e sorgenti | Lettura testuale del manifest Rust 1.95.0 e sorgenti via plugin GitHub; `Get-FileHash -Algorithm SHA256`, `git hash-object --no-filters` sulle copie Cargo.lock | Superato | Quattro URL/hash Rust fissati; 35 voci lock orjson e 40 cryptography. SHA256 locali e identità dei due blob corrispondenti agli upstream; nessun archivio/crate acquisito. NDK identificata con SHA1 pubblicato, non SHA256 inventato. |
| Distinta e metadata | `ConvertFrom-Json`, verifica riferimenti dei 15 archi attivi, formato hash, SHA256 dei lock e del metadata XML; parsing `[xml]` | Superato | 20 wheel, 10 radici APT, 4 componenti Rust, 5 archivi sorgente. XML ben formato e hash corrispondente; XSD/SDK manager non eseguiti. Hash dei binari restano pubblicati, non ricalcolati su download. |
| Revisione indipendente | Due agenti hanno riletto host/APT e Rust/SDK/offline/determinismo | Superato | Corretta la dimensione compressa dell'indice updates: 720 byte, 1406 decompressi. Nessun altro errore concreto segnalato; nessuna build dichiarata. |
| Integrità applicativa | `rg --files --hidden progetto` con esclusioni node_modules, .git, dist e .tmp; SHA256 e `Compare-Object` rispetto allo snapshot iniziale | Superato | 1.643 file, zero variazioni; stato Git fuori documentazione invariato. |
| Documenti e diff | UTF-8 strict, spazi finali, link introdotti confrontati con snapshot; `git -c core.safecrlf=false diff --check -- documentazione` | Superato | Dodici file, 25 collegamenti locali e 2 ancore validi. Nessuna verifica di disponibilità continua dei siti esterni. |
| Build e confronto degli artefatti | Non assegnati | Non eseguito | Nessuna riproducibilità binaria già dimostrata. |

## Controllo del diff e decisioni

Diff circoscritto ai dodici documenti/metadati pertinenti, conforme alla richiesta. I lock e il JSON sono memoria della ricetta nel percorso documentale: nessun Dockerfile, workflow, requirement operativo o script aggiunto al progetto. Nessun cambio dello stack applicativo, pin HA alterato, archivio storico modificato o ADR aggiunto. Nessun commit.

## Chiusura e punto di ripresa

Incarico completato: host e dipendenze mancanti definiti per versione/provenienza, con distinta e politica di isolamento. Gli input sono congelati documentalmente; nessun lavoro di questo incarico resta attivo e nessuna preparazione parte automaticamente.

Le attività successive richiedono incarico: acquisizione/verifica dei materiali, immagine derivata con inventario APT completo, bootstrap/venv, cablaggio effettivo dei flag, due build pulite confrontate e test Android. Non affermare compatibilità pycparser 3.14 o riproducibilità binaria sulla sola base del lock; non confondere l'host Linux con il runtime sul tablet. Nessun commit o deploy richiesto.

## Rettifiche successive

Nessuna.
