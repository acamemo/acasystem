# Fattibilità di ACA e Home Assistant Core sul tablet Android

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261029-008 |
| Stato | Completato |
| Data | 2026-10-29, Europe/Rome |
| Autore / modello | Assistente Codex; identificativo esatto del modello non disponibile. |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69`, con modifiche preesistenti. |
| Richiesta di riferimento | «Approfondiamo l’idea di ACA e backend HA senza frontend sullo stesso tablet Android. Quali sono gli ostacoli concreti e come possiamo valutarne la fattibilità, senza modificare ancora il codice?» |
| Autorizzazione | Ricerca, lettura dei sorgenti e piano di verifica, con aggiornamento della memoria. Nessuna modifica al codice, build, installazione, porting o prova sul dispositivo. |

## Obiettivo e perimetro

Identificare ostacoli concreti di runtime e dipendenze, avvio senza frontend, continuità Android, rete/hardware, dati e aggiornamenti. Distinguere compatibilità di un motore sul tablet da confezionamento in un unico APK e proporre verifiche progressive con criteri osservabili.

Le modifiche preesistenti restano preservate; prima delle scritture documentali è stato acquisito uno snapshot temporaneo dei sette documenti da aggiornare, dello stato Git e degli hash dei file visibili sotto `progetto/`, esclusi `node_modules`, `.git`, `dist` e `.tmp`. Modello, configurazione e prestazioni attuali del tablet candidato non sono stati inventariati; le prove storiche della sola UI non attestano la capacità di eseguire Core.

## Criteri di completamento

1. Ostacoli sostenuti da fonti primarie aperte e sorgenti ACA, con revisione HA identificata.
2. Distinzione esplicita fra non mostrare la UI HA e rimuovere il componente frontend dal motore.
3. Piano progressivo che possa fermarsi prima di un refactor, con criteri proposti e prove future marcate come non eseguite.
4. Domanda e risultati conservati, senza autorizzazioni implicite a installare o modificare l'app.
5. Verifica finale di integrità applicativa e collegamenti documentali.

## Avanzamento e modifiche

Richiesta, perimetro e criteri registrati prima dell'aggiornamento sostanziale della memoria. Tre letture indipendenti in sola lettura su runtime HA/Android, continuità Android e divario rispetto al client attuale. L'assistente principale verifica le evidenze determinanti e prepara il piano.

Creato `documentazione/riprogettazione/blocchi/01-fattibilita-tablet-android.md` con fonti, ostacoli, differenza fra ambiente di laboratorio e APK e sette fasi di verifica proposte. Aggiornati confronto senza mini PC, ingresso, indicazioni, diario, passaggio di consegne, stato e indice dei report. U6 è conservato testualmente e A6 è una sintesi esplicita.

Risultati discriminanti: Core 2026.10.4 richiede Python almeno 3.14.2 e `orjson==3.11.9`, il cui progetto non supporta embedded Android/iOS; il bootstrap carica e considera critico `frontend`. Il client ACA non contiene un runtime Python, Service o receiver di boot e richiede ancora il contratto del server ACA. Il piano distingue prove di compatibilità, autenticazione, dispositivo reale, continuità e dati, senza attribuire un esito positivo a nessuna di esse.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Stato iniziale | `git status`, `git rev-parse HEAD`, `rg`, `Get-Content` e inventario SHA-256. | Eseguito | 1.643 file visibili sotto `progetto/` inventariati; nessun comando applicativo o dispositivo modificato. |
| Runtime e bootstrap HA | Apertura di `pyproject.toml`, `bootstrap.py` e sorgenti pertinenti nel tag ufficiale Core 2026.10.4; lettura del README orjson nel tag 3.11.9 e della documentazione Python 3.14 per Android. | Eseguito | Requisiti, supporto dichiarato e dipendenze frontend verificati. Non è un test di compatibilità del runtime; un accesso PyPI non riuscito è stato sostituito dalla fonte versionata del progetto. |
| Continuità e piattaforma Android | Fonti primarie su foreground service, Doze, Direct Boot, stopped state, rete/radio e storage. | Eseguito | Fonti consultate il 2026-10-29 e collegate nel piano. Timeout di dataSync/mediaProcessing non generalizzati a tutti i servizi; riavvio e Force Stop distinti. |
| Divario del client attuale | Lettura di manifest, Gradle, server locale, ponte, health e setup; ricerca di runtime, Service e receiver con `rg -n`. | Eseguito | SDK minimo 26 e target 36, sole Activity/INTERNET, assenza dell'host HA persistente e dipendenze dal contratto server/Supervisor documentate. |
| Revisione indipendente | Rilettura del piano e di U6/A6 dall'agente che ha verificato runtime e bootstrap. | Superato | Nessuna correzione necessaria; fonti versionate e distinzioni fra UI/componente e laboratorio/APK corrette. |
| Integrità applicativa e perimetro | `Get-FileHash` SHA-256 e `Compare-Object` su percorso/hash; confronto dello stato Git fuori da `documentazione/`. | Superato | 1.643 file prima e dopo, zero differenze; stato Git fuori documentazione invariato. |
| Collegamenti e formattazione | Controllo PowerShell di percorsi locali e ancore introdotti, UTF-8 e spazi finali; `git diff --check -- documentazione`. | Superato | 27 collegamenti locali, di cui 2 con ancora; nessun errore. |
| Prove del piano | Inventario attuale del tablet, installazione/avvio Core, porting, dispositivo reale, continuità, backup e aggiornamenti. | Non eseguito | Tutte le fasi restano proposte. Non sono stati eseguiti test, build, installazioni o modifiche al tablet o al codice. |

## Controllo del diff e decisioni

Le alternative e le prove proposte non sono un nuovo incarico implementativo. Nessuna scelta di runtime, rimozione del frontend o versione personalizzata di HA approvata.

Il diff dell'intervento riguarda nove documenti: due nuovi (piano e presente report) e sette aggiornamenti circoscritti. Nessun report chiuso o archivio modificato, nessun ADR o requisito implementativo introdotto. La precisazione sul bootstrap è aggiunta al confronto precedente senza attribuire a quel confronto una prova che non aveva eseguito. I criteri di completamento sono soddisfatti.

## Chiusura e punto di ripresa

Analisi e piano documentale completati. Proseguire dalle domande dell'utente su significato di senza frontend, tablet e integrazioni minime e condizioni della prima verifica. Nessun prototipo o lavoro implementativo resta attivo; non avviare automaticamente le fasi proposte. Nessun commit o pubblicazione eseguito; codice e dispositivi invariati.

## Rettifiche successive

Nessuna.
