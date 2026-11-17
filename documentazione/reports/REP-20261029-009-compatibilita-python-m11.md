# Compatibilità documentale di Python e dipendenze sul Tab M11

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261029-009 |
| Stato | Completato |
| Data | 2026-10-29, Europe/Rome |
| Autore / modello | Assistente Codex; identificativo esatto del modello non disponibile. |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69`, con modifiche preesistenti. |
| Richiesta di riferimento | «Ok, lasciamo il frontend HA presente ma nascosto. Partiamo dalla compatibilità di Python e delle dipendenze con il Lenovo Tab M11, per ora senza installare nulla né modificare il codice.» |
| Autorizzazione | Conservare la scelta umana sul frontend e verificare compatibilità mediante fonti, metadati e letture del dispositivo se disponibile. Nessuna installazione, download di pacchetti binari, compilazione o modifica al codice. |

## Obiettivo e perimetro

Identificare il Tab M11 dai dati disponibili, distinguendo scheda tecnica, misure storiche e inventario attuale. Verificare runtime Python e un primo gruppo delle dipendenze base native di Core 2026.10.4, senza assumere che CPU ARM64, disponibilità dell'interprete o una wheel Linux dimostrino compatibilità Android.

Prima degli aggiornamenti documentali sono stati acquisiti in una cartella temporanea stato Git, copie degli otto ingressi interessati e hash dei file visibili sotto `progetto/`, esclusi `node_modules`, `.git`, `dist` e `.tmp`. Le modifiche preesistenti restano preservate. La scelta umana sul frontend sarà registrata con il modello di decisione; non autorizza un porting o modifiche applicative.

## Criteri di completamento

1. Scelta del frontend presente ma non mostrato registrata con fonte umana e perimetro.
2. Stato del tablet documentato senza confondere dati storici e attuali o SoC e ABI dell'ambiente Android.
3. Matrice di runtime e dipendenze con versioni esatte, fonti primarie, riscontri positivi e lacune distinti.
4. Copertura e limiti espliciti: nessuna installazione, prova di esecuzione o compatibilità completa dichiarata.
5. Diario, indici e punto di ripresa aggiornati; integrità applicativa e collegamenti verificati.

## Avanzamento e modifiche

Richiesta, perimetro e criteri registrati prima dell'aggiornamento sostanziale della memoria. Letture documentali indipendenti su toolchain Python, dipendenze native e prove storiche del tablet. L'assistente principale verifica le fonti determinanti e la disponibilità del tablet tramite ADB preesistente.

Creati ADR-0026, con scelta umana accettata e nessuna implementazione, e `documentazione/riprogettazione/blocchi/01-compatibilita-python-m11.md`, con tablet, runtime, censimento completo dei requisiti diretti e approfondimento dei pacchetti. Aggiornati piano Android, ingresso, indicazioni, diario, passaggio di consegne, stato e indici di report/decisioni.

Risultato: Python Android ARM64 3.14.10 ufficiale e il candidato Chaquopy 17.2 documentano un interprete sufficiente. I 48 requisiti diretti comprendono 44 pin e 4 intervalli; i metadati dei pin danno 1 caso A, 30 P e 13 D, categorie di disponibilità degli artefatti. Aiohttp ha una wheel Android ARM64 cp314; lru-dict soltanto cp313; orjson esclude embedded Android. YAML ha fallback sorgenti Python documentati. Il repository aggiuntivo Chaquopy non chiude i pin critici. Nessuna compatibilità runtime o sufficienza RAM dichiarata.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Stato iniziale | `git status`, `git rev-parse HEAD`, `rg`, `Get-Content` e inventario SHA-256. | Eseguito | 1.643 file visibili sotto `progetto/` inventariati; nessuna modifica applicativa. |
| Disponibilità del tablet | ADB preesistente nel percorso documentato, `adb devices -l`, elenco trattato senza registrare seriali. | Non disponibile | Zero dispositivi autorizzati individuati. Nessun `adb shell` eseguito; proprietà ABI, RAM e storage attuali non lette. Nessuna autorizzazione, impostazione o app del tablet modificata. |
| Tablet, fonti storiche e hardware | Lettura di REP-20261012-003 e REP-20261020-002; apertura di Lenovo PSREF statico e MediaTek Helio G88. | Eseguito | TB330FU, Android 15 e 4 GB storici; MemAvailable storico distinto da MemFree. Nessuna ABI attuale inventata. La pagina dinamica PSREF non ha risposto; usata la scheda statica primaria. |
| Runtime e toolchain | Fonti Python.org 3.14.10 e Python 3.14 Android; documentazione Chaquopy 17.2 e confronto con Gradle/SDK ACA. | Eseguito | Pacchetti disponibili e requisiti numerici verificati; nessun binario scaricato, tool scelto o dipendenza aggiunta. |
| Requisiti diretti e metadati | Censimento da pyproject Core 2026.10.4 e lettura dei 44 JSON PyPI esatti; controllo indipendente dei pacchetti discriminanti con `Invoke-RestMethod`. | Eseguito | 48 requisiti, 44 pin e 4 intervalli non risolti; zero errori nel censimento dei 44 metadati. Presenza di wheel non presentata come prova d'importazione. |
| Conteggi e fedeltà della matrice | Lettura del pyproject remoto, estrazione delle stringhe in dependencies e `Compare-Object` con le righe della tabella documentale. | Superato | 48 requisiti e 48 righe, zero differenze; categorie 1 A, 30 P, 13 D, 4 R. |
| Supporto e repository aggiuntivo | README/versioni delle librerie, fonti annotatedyaml e indici completi del repository Chaquopy, senza seguire link wheel. | Eseguito | Mancanze dei pin e fallback distinti; nessun cambio silenzioso di Python o librerie. Non è un audit completo dei sorgenti o dell'intero grafo transitivo. |
| Frontend conservato | Manifest frontend Core 2026.10.4 e JSON PyPI 20260930.5. | Eseguito | Wheel universale e requisito Python verificati; dimensione del solo archivio distinta da RAM/spazio installato. Fuori dai 48 requisiti diretti. |
| Revisione indipendente | Rilettura di matrice e ADR da parte dell'agente del censimento. | Superato | Nessun errore concreto: dati storici/attuali e distribuzione/runtime distinti, nessun seriale nei nuovi documenti, nessuna installazione implicita. |
| Integrità applicativa e perimetro | `Get-FileHash` SHA-256 e `Compare-Object` su percorso/hash, confronto dello stato Git fuori da `documentazione/`. | Superato | 1.643 file prima e dopo, zero differenze; stato Git fuori documentazione invariato. |
| Collegamenti e formattazione | Controllo PowerShell di link locali, ancore, UTF-8 e spazi finali; `git diff --check -- documentazione`. | Superato | 37 collegamenti locali, di cui 4 con ancora; nessun errore. |
| Installazione, risoluzione e prove runtime | Nessuna esecuzione pip/resolver, importazione, compilazione o avvio mobile. | Non eseguito | Nessun lock completo; intervalli, transitive e integrazioni non integralmente risolti. |

## Controllo del diff e decisioni

Frontend HA presente ma nascosto: scelta umana esplicita. Runtime, toolchain, porting e modifica delle dipendenze non sono approvati; nessun codice modificato.

Il diff dell'intervento riguarda undici documenti: tre nuovi (matrice, ADR e presente report) e otto aggiornamenti circoscritti. Nessun report chiuso, archivio o ADR storico riscritto; nessun requisito applicativo aggiunto. Le cinque condizioni di completamento sono soddisfatte per la ricognizione documentale, con copertura e limiti espliciti.

## Chiusura e punto di ripresa

Ricognizione documentale e registrazione della decisione completate. Il prossimo lavoro da discutere riguarda ABI attuale del tablet e chiusura delle transitive/priorità di porting prima di una prova mobile. Nessuna attività implementativa o installazione resta assegnata; non avviare automaticamente le fasi del piano. Nessun commit o pubblicazione eseguito; codice invariato.

## Rettifiche successive

Nessuna.
