# Compatibilità documentale pycparser 2.23, Python 3.14 e CFFI 2.0.0

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261029-014 |
| Stato | Completato, analisi e documentazione |
| Data | 2026-10-29, Europe/Rome |
| Autore / modello | Assistente Codex; identificativo esatto del modello non disponibile. |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta di riferimento | «Ok, approfondiamo la compatibilità di pycparser 2.23 con Python 3.14 e CFFI 2.0.0 prima di compilare, mantenendo i pin di HA e senza installare nulla né modificare il codice.» |
| Autorizzazione | Analisi dei sorgenti/evidenze upstream e memoria documentale; nessuna installazione, compilazione o modifica al codice. |

## Obiettivo e perimetro

Valutare se la lacuna della CI pycparser 2.23 rispetto a Python 3.14 nasconda un'incompatibilità concreta, verificando API usate, interazione con CFFI 2.0.0 e percorso della generazione C in cryptography 50.0.1. Conservare i pin HA e la distinta U11, senza eseguire pacchetti o preparare l'ambiente.

All'avvio sono presenti modifiche e file non tracciati applicativi TV/Zigbee, documenti precedenti e directory di strumenti/dipendenze locali. Preservati con snapshot temporaneo di stato Git e SHA256 di 1.643 file visibili sotto `progetto/`, escluse node_modules, .git, dist e .tmp. Nessun file applicativo sarà scritto o aggiunto a Git.

## Criteri di completamento

- Distinguere compatibilità dichiarata, corrispondenza statica delle API ed evidenze effettive di esecuzione.
- Esaminare pycparser/PLY rispetto a CPython 3.14 e la sua interfaccia con CFFI 2.0.0, con fonti primarie/versionate.
- Ricercare segnalazioni o CI pertinenti alla combinazione esatta, senza generalizzare altri interpreti/piattaforme.
- Registrare conclusione e verifiche future, aggiornare memoria e indici e confermare l'integrità applicativa.

## Avanzamento e modifiche

Concluse tre letture parallele su pycparser/PLY e CPython, contratto CFFI/cryptography e CI/PR upstream. Mantenuta pycparser 2.23 nella baseline; nessun pin o hash della distinta U11 modificato.

Evidenza nuova: PR pycparser #581 del 15 settembre 2025 aggiunge il ramo Python 3.14 alla CI e i classificatori senza modificare parser/PLY. Il confronto dal tag 2.23 al merge cambia soltanto workflow, setup.py e TODO. Il run 17708600529 del 14 settembre, head b933db7c3cc7227f5892dbb67cecbe10524890a8 con versione dichiarata 2.23, comprende tre job 3.14 riusciti su Linux/macOS/Windows. Workflow e conclusioni sono disponibili; non viene attribuita una patch Python precisa ai job che ammettevano prerelease. Questo amplia l'evidenza oltre la matrice del solo tag 2.23, senza trasformarla in prova del nostro ambiente.

Documentata corrispondenza di CParser/parse, alias d'errore e AST fra CFFI 2.0.0 e pycparser 2.23; nessun blocco specifico dalle API CPython 3.14 esaminate. Registrato il precedente cryptography PR #13416 con entrambi i pin, distinguendolo dalla terna ACA esatta. Condizioni della futura generazione: docstring conservate e ottimizzazione 0; host GIL come scelta uniforme della baseline. La differenza di C generato fra host GIL/free-threaded non è presentata come prova di incompatibilità universale.

Creati studio `01-pycparser-223-python314-cffi.md` e questo report; aggiornati sette documenti esistenti: seguito della baseline host, ingresso riprogettazione, indicazioni, diario U12/A12, stato, indice report e LEGGIMI. Descritto un preflight futuro di parsing/generazione C prima delle build native. Nessun pacchetto eseguito o installato, nessuna generazione C o acquisizione di archivi/binari.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Stato iniziale | Git, `rg --files` e `Get-FileHash -Algorithm SHA256` | Superato | Snapshot temporaneo prima delle modifiche documentali. |
| Sorgenti e contratto | Plugin GitHub `fetch_file`/`fetch` sui tag pycparser release_v2.23, CFFI v2.0.0, CPython v3.14.10 e cryptography 50.0.1; ricerca issue e letture web primarie | Superato, riscontro documentale | API, AST, inspect/re/import e generazione C esaminati staticamente. Ricerca selettiva, non dimostrazione di assenza di ogni bug. Fonti puntuali nello studio. |
| CI upstream | `fetch_workflow_run_jobs` sul run 17708600529; lettura metadata run, PR #581 e confronto tag/merge | Superato, riscontro di risultati altrui | 18 job risultano success, inclusi i tre Python 3.14. Verificati head SHA e workflow unittest; step/log storici non disponibili, patch Python esatta e dettagli di esecuzione non ricostruiti. Nessun test locale dichiarato. |
| Metadata dei pacchetti | `Invoke-RestMethod` su PyPI pycparser/2.23 e cffi/2.0.0 | Superato | Requisiti, classificatori e hash delle due wheel già fissate coerenti; artefatti non ritirati. Nessuna wheel scaricata o importata. |
| Revisione indipendente | Rilettura CI/evidenze e CFFI/generazione/runtime da due agenti | Superato | Nessun errore residuo segnalato. Ridimensionata la formulazione sull'host GIL: scelta della baseline, non obbligo tecnico universale dimostrato; considerato il Py_LIMITED_API esplicito di cryptography. |
| Conservazione della distinta | `ConvertFrom-Json` e confronto nome/versione/SHA256 dei 20 artefatti con la selezione U11 | Superato | Venti pin/hash conservati; Core 2026.10.4, orjson 3.11.9 e cryptography 50.0.1 invariati. JSON e lock U11 non modificati. |
| Integrità applicativa | `rg --files --hidden progetto` con esclusioni node_modules, .git, dist e .tmp; SHA256 e `Compare-Object` rispetto allo snapshot | Superato | 1.643 file, zero variazioni; stato Git fuori documentazione invariato. |
| Documenti e diff | UTF-8 strict, spazi finali e link introdotti rispetto allo snapshot; `git -c core.safecrlf=false diff --check -- documentazione` | Superato | Nove documenti, 22 collegamenti locali e 2 ancore validi. |
| Import/generazione/build/test Android | Non assegnati | Non eseguito | Nessuna installazione o esecuzione dei pacchetti esaminati. |

## Controllo del diff e decisioni

Diff limitato ai nove documenti pertinenti, coerente con richiesta e criteri. Nessun aggiornamento di pin, codice, configurazione operativa, distinta U11, archivio storico o ADR; nessuna patch applicata. Le condizioni del futuro preflight sono proposte documentali, non attività già avviate. Nessun commit.

## Chiusura e punto di ripresa

Incarico completato: evidenza upstream positiva e contratto coerente sostengono il mantenimento di pycparser 2.23, con limiti espliciti sulla terna esatta e sull'Android. Diario, ingresso e indici aggiornati. Nessun lavoro di questo incarico resta attivo.

Successivi incarichi possibili: predisporre l'host e verificare import/versioni/modalità GIL/docstring, parsing CFFI ed emissione del C effettivo cryptography prima di chiamare i compilatori. Tutti non eseguiti e non assegnati qui. Build native, riproducibilità e prove sul M11 restano separati; nessun preflight parte automaticamente. Nessun commit o deploy richiesto.

## Rettifiche successive

Nessuna.
