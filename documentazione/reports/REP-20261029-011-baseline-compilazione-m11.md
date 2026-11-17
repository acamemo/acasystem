# Baseline documentale di compilazione per il Tab M11

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261029-011 |
| Stato | Completato, analisi e documentazione |
| Data | 2026-10-29, Europe/Rome |
| Autore / modello | Assistente Codex; identificativo esatto del modello non disponibile. |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69` |
| Richiesta di riferimento | «Ok, definiamo la combinazione precisa di runtime Python, NDK, Rust e maturin per compilare i due pacchetti per il Tab M11, mantenendo i pin di HA e senza installare nulla né modificare il codice.» |
| Autorizzazione | Scelta documentale della combinazione e memoria della discussione; nessuna installazione, compilazione o modifica al codice. |

## Obiettivo e perimetro

Definire versioni esatte e coerenti per la prima possibile compilazione Android di `orjson==3.11.9` e `cryptography==50.0.1`, conservando Core 2026.10.4 e la scelta sul frontend in ADR-0026. Distinguere requisiti verificati nei sorgenti, scelta esecutiva dello studio e compatibilità da provare.

All'avvio sono presenti modifiche e file non tracciati applicativi TV/Zigbee, documenti di incarichi precedenti, directory di strumenti e dipendenze locali. Vengono preservati; nessun file applicativo sarà scritto o aggiunto a Git. Snapshot temporaneo degli hash di 1.643 file visibili sotto `progetto/` e dello stato Git, esclusi dipendenze, output e directory temporanee.

## Criteri di completamento

- Indicare Python Android, ABI/API, NDK, Rust e maturin con versione esatta e fonte primaria datata.
- Verificare la compatibilità dei vincoli dichiarati dai due tag upstream e distinguere host e target.
- Registrare ostacoli residui della ricetta e verifiche future senza dichiarare build o import riusciti.
- Aggiornare diario, punto di ripresa e indici; verificare diff, collegamenti e assenza di variazioni al codice.

## Avanzamento e modifiche

Ricerca in sola lettura di sorgenti versionati e metadati pubblici, con confronto indipendente dei vincoli da parte di altri agenti. Definita in `documentazione/riprogettazione/blocchi/01-baseline-compilazione-m11.md` la combinazione CPython Android ufficiale 3.14.10 con GIL, NDK r27d 27.3.13750724, Rust 1.95.0 e maturin 1.16.0; cibuildwheel 4.3.5 come orchestratore ausiliario. Pin orjson 3.11.9 e cryptography 50.0.1 invariati.

Separati host Linux x86_64 glibc e target Android ARM64/API24. Il NDK segue il pin del sorgente CPython; Rust copre i minimi dichiarati e maturin appartiene all'intersezione dei due intervalli upstream. Registrati hash pubblicati, senza acquisire gli archivi. Non è dichiarata una distinta completa: restano host/digest, dipendenze CFFI/libffi/OpenSSL e configurazione degli include/linker. Evidenziato il disallineamento dedotto tra layout cibuildwheel e derivazione degli header nel build script CFFI di cryptography; nessun errore di build osservato.

Aggiornati sette documenti esistenti: studio precedente con collegamento al seguito, ingresso della riprogettazione, indicazioni, diario con U9 integrale/A9 sintetica, stato del progetto, indice report e LEGGIMI. Creati questo report e il documento baseline. Nessun ADR aggiunto: è una scelta esecutiva dell'analisi richiesta, senza attribuirle un'approvazione umana del porting.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Stato iniziale | `git status --porcelain=v1 --untracked-files=all`, `git rev-parse HEAD`; hash SHA256 via PowerShell e `rg --files` | Superato | Modifiche preesistenti conservate; snapshot locale temporaneo. |
| Fonti e coerenza | `Invoke-WebRequest` / `Invoke-RestMethod` e lettura web dei tag CPython v3.14.10, orjson 3.11.9, cryptography 50.0.1, maturin v1.16.0, cibuildwheel v4.3.5 e metadati PyPI | Superato, riscontro documentale | Versioni/range/MSRV/manifest confrontati; maturin 1.16.0 e cibuildwheel 4.3.5 non ritirati nei metadati consultati. Fonti puntuali nel documento baseline; nessuna esecuzione degli script. |
| Revisione indipendente | Confronto documentale Python/NDK e intersezione Rust/maturin, con due agenti | Superato | Nessuna incoerenza rilevata; resa esplicita anche la variante target del launcher C++. Non equivale a build o test. |
| Inventario tablet | `adb devices -l`, binario esistente del SDK Windows | Superato, sola enumerazione | Zero dispositivi autorizzati; nessun `adb shell`. ABI/API/page size effettive non lette. |
| Integrità applicativa | `rg --files --hidden progetto` con esclusione di node_modules, .git, dist e .tmp; `Get-FileHash -Algorithm SHA256`, `Compare-Object` rispetto allo snapshot iniziale | Superato | 1.643 file, zero variazioni. Stato Git fuori documentazione invariato; dipendenze/output esclusi dal censimento. |
| Documenti e diff | Decodifica UTF-8 strict, controllo spazi finali e link introdotti rispetto allo snapshot, `git -c core.safecrlf=false diff --check -- documentazione` | Superato | 22 collegamenti locali e 2 ancore validi; confronto limitato ai nove documenti dell'incarico. Nessuna verifica di disponibilità continua dei siti esterni. |
| Compilazione/import/tablet | Non assegnati | Non eseguito | Nessuna installazione o prova di compatibilità. |

## Controllo del diff e decisioni

Il confronto con richiesta e criteri conferma un diff limitato ai nove documenti pertinenti. Nessun codice, dipendenza, configurazione di build, archivio storico o ADR modificato. La selezione delle versioni è una baseline dello studio richiesto, non l'approvazione di un porting o una modifica ai pin HA. Nessuna patch o funzionalità fuori incarico applicata; nessun commit.

## Chiusura e punto di ripresa

Incarico completato: quattro componenti fissati con fonti, distinzione host/target e limiti. Diario e indici aggiornati. Nessun lavoro di questo incarico resta attivo e nessuna prova parte automaticamente.

Per proseguire la discussione: completare eventualmente la distinta CFFI/libffi/OpenSSL e l'host, chiarire configurazione degli header/linker e confermare ABI reale. Compilare, importare, provare sul tablet e incorporare il runtime nell'app sono lavori successivi non assegnati. Il supporto embedded escluso da orjson e le altre dipendenze Core restano limiti aperti. Nessun commit o deploy richiesto.

## Rettifiche successive

Nessuna.
