# Studio di build Android per orjson e cryptography ai pin HA

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261029-010 |
| Stato | Completato |
| Data | 2026-10-29, Europe/Rome |
| Autore / modello | Assistente Codex; identificativo esatto del modello non disponibile. |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69`, con modifiche preesistenti. |
| Richiesta di riferimento | «Ok, approfondiamo come ottenere le dipendenze mancanti per Android, partendo da orjson e cryptography, mantenendo le versioni richieste da HA e senza installare nulla né modificare il codice.» |
| Autorizzazione | Ricerca e studio documentale di sorgenti, metadati e procedure di build; aggiornamento della memoria. Nessuna installazione, compilazione, download di archivi/binari, modifica al codice o pubblicazione. |

## Obiettivo e perimetro

Valutare come produrre artefatti Android per `orjson==3.11.9` e `cryptography==50.0.1` mantenendo i pin di Core 2026.10.4 e il frontend HA presente ma non mostrato (ADR-0026). Distinguere sorgenti invariati, eventuali patch future e ambiente Linux locale, senza presentarli come soluzioni già provate.

Le modifiche preesistenti sono preservate. Prima delle scritture sono stati acquisiti in una cartella temporanea i sette documenti da aggiornare, lo stato Git e gli hash dei file visibili sotto `progetto/`, esclusi `node_modules`, `.git`, `dist` e `.tmp`. Non è stata eseguita una nuova interrogazione del tablet: ABI e risorse effettive restano non confermate secondo REP-20261029-009.

## Criteri di completamento

1. Requisiti di build estratti dai tag esatti, distinti da documentazione o ricette di versioni diverse.
2. Percorso concreto per produrre wheel Android proprie, con dipendenze native e collegamento al Python target espliciti.
3. Pin conservati; sorgenti invariati e patch eventuali non confusi, nessun successo di compilazione o runtime dichiarato.
4. Distinzione fra wheel prodotta, testata nel runtime e utilizzabile in HA; controlli futuri identificati.
5. Memoria e indici aggiornati; verifica di integrità applicativa e documentale.

## Avanzamento e modifiche

Perimetro e criteri registrati prima dell'aggiornamento sostanziale. Tre ricerche indipendenti in sola lettura sui due pin e sulle fondamenta Android; l'assistente principale verifica sorgenti e metadati determinanti.

Creato `documentazione/riprogettazione/blocchi/01-orjson-cryptography-android.md` con fonti versionate, requisiti, percorso di produzione wheel, ricette di riferimento e prove future. Aggiunti U8 testuale e A8 sintetico al diario; aggiornati matrice precedente, ingresso, indicazioni, passaggio di consegne, stato e indice dei report.

Risultato: cross-build da sorgenti invariati come primo tentativo futuro, mantenendo i due pin. Orjson richiede Rust almeno 1.95 e non presenta un rifiuto Android nel build script esaminato, pur escludendo l'embedded dal supporto; cryptography contiene già logica cross per gli header Python target e richiede anche CFFI/provider target. Cibuildwheel è la strada documentata da Chaquopy per Python 3.13+, senza che alcuno dei tool sia stato eseguito o scelto per il progetto.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Stato e fonti iniziali | Git, lettura degli ingressi e snapshot SHA-256. | Eseguito | Nessuna esecuzione applicativa. |
| Artefatti pubblici dei due pin | JSON ufficiali PyPI letti con `Invoke-RestMethod`. | Eseguito | Entrambi: zero artefatti Android e una sdist; nessun archivio scaricato. |
| Sorgenti dei pin | Lettura di Cargo, lock, pyproject e build script nei tag orjson 3.11.9 e cryptography 50.0.1; documentazione primaria collegata nello studio. | Eseguito | Versioni e prerequisiti distinti da compatibilità dimostrata; orjson identificato anche dal commit 705515d77b28429d0b7c30c3d781abe52e8a1e5a. |
| Strumenti e collegamento Android | Fonti ufficiali Chaquopy, cibuildwheel, Rust, NDK, Python e PyO3 delle versioni pertinenti. | Eseguito | Produzione e test delle wheel distinti; SDK automatico non avviato, nessun ambiente Linux/macOS o workflow predisposto. |
| Catena cryptography | Sorgenti e docs 50.0.1, controllo minimo OpenSSL, CFFI, libffi e ricette primarie di versioni diverse. | Eseguito | Le ricette sono precedenti tecnici, non pacchetti pronti al pin richiesto; nessun provider o versione alternativa adottata. |
| Revisione indipendente | Rilettura dello studio da parte dell'agente cryptography. | Superato | Nessun errore sui requisiti; recepita la precisazione che una wheel Linux richiede anche la libc coerente e non è equivalente a Termux/Bionic. |
| Integrità applicativa e perimetro | `Get-FileHash` SHA-256 e `Compare-Object` su percorso/hash; confronto dello stato Git fuori da `documentazione/`. | Superato | 1.643 file prima e dopo, zero differenze; stato Git fuori documentazione invariato. |
| Collegamenti e formattazione | Controllo PowerShell dei percorsi locali, ancore, UTF-8 e spazi finali; `git diff --check -- documentazione`. | Superato | 21 collegamenti locali, di cui 2 con ancora; nessun errore. |
| Build, import e prove HA | Tutte le fasi operative proposte. | Non eseguito | Nessuna installazione, compilazione, patch, acquisizione di archivi/wheel, prova sul tablet o modifica al codice. |

## Controllo del diff e decisioni

Nessuna toolchain, fork, patch, modifica dei pin o installazione approvata. ADR-0026 resta il vincolo umano sul frontend; il presente studio non è un nuovo ADR.

Il diff dell'intervento riguarda nove documenti: due nuovi (studio e presente report) e sette aggiornamenti circoscritti. Nessun report chiuso, archivio o ADR storico modificato. I cinque criteri di completamento sono soddisfatti per lo studio, senza attribuire alle fasi future risultati o autorizzazioni inesistenti.

## Chiusura e punto di ripresa

Studio completato. Il prossimo passo da discutere è fissare runtime/ABI e distinta dei materiali, compresa la catena CFFI/libffi/OpenSSL, prima di un eventuale incarico di compilazione isolata. Nessuna attività implementativa o installazione resta assegnata; non eseguire automaticamente le fasi descritte. Nessun commit o pubblicazione, codice invariato.

## Rettifiche successive

Nessuna.
