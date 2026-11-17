# CFFI, libffi, OpenSSL e header Android di cryptography

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261029-012 |
| Stato | Completato, analisi e documentazione |
| Data | 2026-10-29, Europe/Rome |
| Autore / modello | Assistente Codex; identificativo esatto del modello non disponibile. |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta di riferimento | «Ok, definiamo anche le versioni di CFFI, libffi e OpenSSL e come risolvere il problema degli header di cryptography, mantenendo i pin di HA e senza installare nulla né modificare il codice.» |
| Autorizzazione | Analisi, scelta documentale delle versioni e configurazione proposta degli header; memoria nel repository. Nessuna installazione, compilazione o modifica al codice. |

## Obiettivo e perimetro

Completare la baseline documentale U9 per `cryptography==50.0.1` con versioni esatte CFFI/libffi/OpenSSL e una configurazione esterna degli include per il runtime CPython Android 3.14.10. Conservare i pin HA e la combinazione Python/NDK/Rust/maturin già scelta. La baseline descrive una futura prova, non l'approvazione di un porting.

All'avvio sono presenti modifiche e file non tracciati TV/Zigbee, documentazione di incarichi precedenti, directory di strumenti e dipendenze locali. Preservati mediante snapshot temporaneo di stato Git e SHA256 di 1.643 file visibili sotto `progetto/`, esclusi node_modules, .git, dist e .tmp. Nessun file applicativo sarà scritto o aggiunto a Git.

## Criteri di completamento

- Fissare CFFI, libffi e OpenSSL con versione esatta, fonti primarie datate e motivazione rispetto ai vincoli del tag cryptography.
- Distinguere moduli/strumenti host, librerie target e provider già presente nel runtime Python.
- Descrivere come passare gli header Android senza modificare i sorgenti upstream, esplicitando limiti e prove future.
- Aggiornare memoria e indici; verificare documenti e assenza di cambiamenti applicativi.

## Avanzamento e modifiche

Ricerca in sola lettura su fonti upstream versionate e metadati pubblici, con tre verifiche parallele su CFFI, librerie native e header. Definiti CFFI **2.0.0**, libffi **3.8.0** statica PIC per `_cffi_backend` e OpenSSL **3.5.9** statica PIC per cryptography, conservando i materiali del runtime e gli strumenti U9.

Riscontro determinante: il file effettivo `homeassistant/package_constraints.txt` di Core 2026.10.4 contiene `cffi==2.0.0` e `setuptools==84.0.0`. La sola lettura di pyproject/requirements_all non basta a conservare tutti i pin HA. Esclusa quindi CFFI 2.1.1 dalla baseline, benché ammessa dal minimo cryptography; nessuna versione è stata installata o configurata nel progetto.

Descritto nel nuovo `documentazione/riprogettazione/blocchi/01-cffi-libffi-openssl-header.md` il passaggio esplicito degli header Android con `CFLAGS_aarch64_linux_android`, mantenendo `PYO3_CROSS_LIB_DIR` nella directory lib. Precisati interprete CFFI host, selezione maturin CLI/PEP517, ordine delle variabili cibuildwheel, include libffi, limitazione di pkg-config, provider OpenSSL e controlli di linking/16 KB. Distinte le revisioni NDK/API delle ricette source-deps CPython dalla futura build autonoma r27d/API24. Nessuna soluzione dichiarata collaudata.

Creati studio e report; aggiornati sette documenti esistenti: baseline U9, ingresso riprogettazione, indicazioni, diario (U10 integrale/A10 sintesi), stato progetto, indice report e LEGGIMI. Nessun archivio/binario acquisito o script upstream eseguito. Nessun ADR aggiunto: le scelte sono esecutive dello studio richiesto, senza attribuire all'utente un'approvazione del porting.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Stato iniziale | `git status --porcelain=v1 --untracked-files=all`, `git rev-parse HEAD`, `rg --files` e `Get-FileHash -Algorithm SHA256` | Superato | Stato preesistente preservato e snapshot temporaneo. |
| Fonti e configurazione | Plugin GitHub `fetch_file`/`fetch`, lettura web ufficiale e `Invoke-RestMethod` dei metadati PyPI | Superato, riscontro documentale | Tag HA 2026.10.4, CFFI v2.0.0, cryptography 50.0.1, CPython v3.14.10, libffi v3.8.0, OpenSSL openssl-3.5.9, cc 1.4.0, maturin v1.16.0 e cibuildwheel v4.3.5. Fonti puntuali e hash pubblicati nello studio; nessun archivio ispezionato o script eseguito. |
| Revisione indipendente | Rilettura separata dello studio su header/env/host-target e librerie/linking/provenienza da due agenti | Superato | Nessun errore concreto rilevato nel perimetro esaminato; non equivale a una compilazione. |
| Integrità applicativa | `rg --files --hidden progetto` con esclusioni node_modules, .git, dist e .tmp; `Get-FileHash -Algorithm SHA256` e `Compare-Object` rispetto allo snapshot iniziale | Superato | 1.643 file, zero variazioni. Stato Git fuori documentazione invariato; output e dipendenze esclusi dal censimento. |
| Documenti e diff | Decodifica UTF-8 strict, controllo spazi finali e link introdotti rispetto allo snapshot; `git -c core.safecrlf=false diff --check -- documentazione` | Superato | 22 collegamenti locali e 2 ancore validi nei nove documenti dell'incarico. Nessuna verifica di disponibilità continua dei siti esterni. |
| Build/import/test sul tablet | Non assegnati | Non eseguito | Nessuna installazione o modifica al codice. |

## Controllo del diff e decisioni

Il diff dell'incarico è limitato ai nove documenti pertinenti e soddisfa i criteri. Configurazioni e percorsi nel Markdown sono specifiche non eseguite, senza nuovi file operativi. Nessun aggiornamento di dipendenze del progetto, modifica al codice, patch a cryptography, archivio storico alterato o nuovo ADR. Nessun commit.

## Chiusura e punto di ripresa

Incarico completato: tre versioni fissate e soluzione esterna degli header documentata con vincoli e limiti. Diario, ingresso e indici aggiornati. Nessun lavoro di questo incarico resta attivo; nessuna prova viene avviata automaticamente.

Restano per eventuali incarichi successivi: ABI reale del tablet, host e lock completo inclusa pycparser, cablaggio dell'orchestratore, build/ispezione ELF, conferma degli include effettivi e test simultanei dei moduli sul runtime Android. Le altre dipendenze HA e il supporto embedded di orjson non sono risolti da questo studio. Nessun commit o deploy richiesto.

## Rettifiche successive

Nessuna.
