# Definizione del preflight di import, parsing e generazione C

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261029-015 |
| Stato | Completata la definizione; preflight non eseguito |
| Data | 2026-10-29, Europe/Rome |
| Autore / modello | Assistente Codex; identificativo esatto del modello non disponibile. |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta di riferimento | «Ok, definiamo il preflight di import, parsing e generazione C di cryptography con Python 3.14.10, CFFI 2.0.0 e pycparser 2.23, mantenendo i pin di HA e senza installare nulla né modificare il codice.» |
| Autorizzazione | Definizione documentale di procedura, input, casi, criteri ed evidenze. Nessuna preparazione dell'host, installazione, esecuzione del preflight o modifica al codice. |

## Obiettivo e perimetro

Rendere concreto e rivedibile il preflight proposto in U12, separando controlli di import/provenienza, parsing e sola emissione C di cryptography 50.0.1. Conservare la terna esatta Python 3.14.10 GIL / CFFI 2.0.0 / pycparser 2.23, i pin HA e la distinta U11. Definire come distinguere esito del preflight, build nativa e prova Android.

All'avvio sono presenti modifiche e file non tracciati applicativi TV/Zigbee, documenti precedenti e directory locali di strumenti/dipendenze. Preservati con snapshot temporaneo di stato Git, SHA256 di 1.643 file visibili sotto `progetto/` (escluse node_modules, .git, dist e .tmp) e dei tre materiali documentali U11. Nessun file applicativo sarà scritto o aggiunto a Git.

## Criteri di completamento

- Definire prerequisiti e condizioni di esecuzione futura, senza predisporli ora.
- Specificare controlli di import e casi di parsing positivi/negativi con risultati attesi verificabili.
- Descrivere ingresso/env/output del generatore upstream e controlli sul C emesso senza avviare compilatori.
- Stabilire evidenze, stati e criteri di arresto, con limiti su ABI/Android/riproducibilità.
- Aggiornare diario e indici; verificare documenti e conservazione di codice/materiali.

## Avanzamento e modifiche

Definita in `documentazione/riprogettazione/blocchi/01-preflight-generazione-c-cryptography.md` la procedura host P0-P4: prerequisiti/materiali, import/provenienza, nove fixture, ingresso del generatore upstream e confronto di due output C. Specificati risultati attesi, classificazione degli errori, evidenze e verdetti. Tutte le fasi restano NON ESEGUITE.

P0/P1 distinguono hash dell'archivio wheel, file originali, metadata e RECORD installato; versione dell'interprete, identità PBS e symlink del venv non vengono confusi. Separati sysconfig host e simulazione Android, build GIL e GIL runtime; precisato che `-B` impedisce scrittura `.pyc` ma non lettura di cache o rigenerazione PLY.

P2 separa C ordinario, estensioni CFFI e negativi: il raw parser deve rifiutare le ellissi CFFI, mentre `cdef` le accetta; un corpo funzione è accettato come C ma rifiutato da cdef. Nessuna misura o conclusione sul layout Android. Le aspettative derivano da sorgenti/test versionati e non sono risultati di test locali.

P3 usa direttamente `build_openssl.py` 50.0.1 con Python host fissato e cwd del ponte Rust/CFFI, senza avviare Cargo. Identificati 22 moduli di dichiarazioni, output `_openssl.c`, marker strutturali e separazione emissione/compilazione. P4 richiede processi nuovi e directory distinte, confronto byte senza normalizzazioni e inventari prima/dopo. Non assegnata l'implementazione di un harness.

Creati procedura e report; aggiornati sette documenti esistenti: seguito U12, ingresso riprogettazione, indicazioni, diario U13/A13, stato, indice report e LEGGIMI. Nove documenti pertinenti. Nessun pacchetto eseguito o installato, nessun artefatto di esecuzione prodotto.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Stato iniziale | Git, `rg --files`, `Get-FileHash -Algorithm SHA256` | Superato | Snapshot temporaneo prima delle modifiche documentali. |
| Procedura e fonti | Plugin GitHub `fetch_file` e lettura web dei sorgenti versionati CPython v3.14.10, CFFI v2.0.0, pycparser release_v2.23 e cryptography 50.0.1 | Superato, riscontro documentale | Ingresso/env/cwd/output del generatore e `emit_c_code(call_c_compiler=False, uses_ffiplatform=False)` confrontati; fonti puntuali nella procedura. Non sono stati eseguiti i pacchetti o i test upstream. |
| Revisione indipendente | Tre agenti hanno riletto P0/P1/RECORD, corpus P2 ed emissione/confronto P3/P4 | Superato | Nessun errore residuo segnalato. Precisati il nome completo `_PYTHON_SYSCONFIGDATA_PATH` e il limite di `-B`; il rifiuto raw E2 si ferma alla prima ellissi e non prova separatamente l'enum. |
| Conservazione materiali | `Get-FileHash -Algorithm SHA256` e confronto con snapshot dei tre file sotto materiali U11 | Superato | Distinta JSON e due lock conservati byte per byte, zero variazioni; nessun pin aggiornato. |
| Integrità applicativa | `rg --files --hidden progetto` con esclusioni node_modules, .git, dist e .tmp; SHA256 e `Compare-Object` rispetto allo snapshot | Superato | 1.643 file, zero variazioni. Stato Git fuori documentazione invariato. |
| Documenti e diff | UTF-8 strict, spazi finali, link introdotti rispetto allo snapshot; `git -c core.safecrlf=false diff --check -- documentazione` | Superato | Nove documenti, 22 collegamenti locali e 2 ancore validi. Nessuna verifica di disponibilità continua dei siti esterni. |
| Esecuzione preflight/build | Non assegnata | Non eseguito | Nessuna installazione, import dei pacchetti o generazione C. |

## Controllo del diff e decisioni

Diff limitato ai nove documenti pertinenti e conforme ai criteri. Nessun nuovo script eseguibile, file C, schema di risultati simulato come eseguito, pin aggiornato o patch. Codice, configurazioni operative, distinta U11, lock e archivio storico non modificati. Nessun ADR o commit.

## Chiusura e punto di ripresa

Incarico di definizione completato: procedura concreta e rivedibile con input, casi, criteri, confini ed evidenze. Diario, ingresso e indici aggiornati. Nessun lavoro di questo incarico resta attivo; tutte le fasi P0-P4 rimangono NON ESEGUITE.

L'eventuale esecuzione richiederà un successivo incarico che consenta preparazione dell'host/materiali e avvio del preflight. Il relativo esito non può essere dedotto da questa revisione documentale. Build native, riproducibilità delle wheel, prove Android e funzionamento HA restano separati. Nessun avvio automatico, commit o deploy richiesto.

## Rettifiche successive

Nessuna.
