# Discussione sulla distribuzione del frontend e sul backend Home Assistant

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261029-006 |
| Stato | Completato |
| Data | 2026-10-29, Europe/Rome |
| Autore / modello | Assistente Codex; identificativo esatto del modello non disponibile. |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69`, con modifiche preesistenti. |
| Richiesta di riferimento | «Ma perché il server ACA contiene anche il frontend se l’app lo scarica già da GitHub? Questa doppia strada serve davvero o possiamo semplificare? Per ora ragioniamoci senza modificare il codice. Altra domanda che ti pongo, perché non scaricarsi da github il sorgente di Home Assistant e usare il suo backend?» |
| Autorizzazione | Discussione e analisi in sola lettura, mantenendo la memoria della riprogettazione. Nessuna implementazione, sostituzione tecnologica, fork, installazione o pubblicazione. |

## Obiettivo e perimetro

Spiegare l'origine documentata della doppia distribuzione del frontend, le dipendenze presenti e le alternative per semplificarla. Distinguere l'uso del backend ufficiale Home Assistant tramite API, l'esecuzione dei suoi sorgenti e la manutenzione di una variante modificata.

Le modifiche preesistenti sono preservate. Prima delle scritture documentali è stato acquisito uno snapshot temporaneo dei sette documenti da aggiornare, dello stato Git e degli hash dei file visibili sotto `progetto/`, escludendo `node_modules`, `.git`, `dist` e `.tmp`.

## Criteri di completamento

1. Motivazioni storiche e dipendenze effettive supportate da sorgenti o documenti identificabili.
2. Alternative confrontate senza presentare preferenze dell'assistente come decisioni umane.
3. Ruoli di Core, HA OS, Supervisor e servizio ACA distinti, con fonti primarie datate per i fatti esterni.
4. Domande e valutazioni salvate nel diario e nel blocco 1; punto di ripresa aggiornato.
5. Verifica finale di integrità applicativa e collegamenti documentali.

## Avanzamento e modifiche

Perimetro e criteri registrati prima dell'aggiornamento sostanziale della memoria. Lettura dello script di release, route statiche, API e schema dati ACA; ricostruzione indipendente della doppia distribuzione in sola lettura. Consultazione della documentazione ufficiale Home Assistant.

Esteso il documento del blocco 1 con origine della doppia distribuzione, dipendenza dello script di release, confronto fra distribuzione solo nei client e solo sul server, distinzione fra API HA, Core eseguito dai sorgenti e variante modificata. Aggiunti U4 testuale e A4 come sintesi nel diario; aggiornati indicazioni, ingresso della riprogettazione, passaggio di consegne, stato e indice dei report.

Evidenze locali determinanti: REP-20261026-002, righe 295-297, registra che il server locale del guscio consentiva di lasciare invariato il server precedente; `progetto/client/scripts/make-release.ts`, righe 19-20 e 53-57, estrae la UI dall'immagine server; `startup.ts`, righe 85-139, sceglie GitHub o cache; `backend/src/server.ts`, righe 69-103, e `models/database.ts`, righe 15-124, mostrano responsabilità ACA distinte dalla distribuzione degli statici.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Stato iniziale e letture | `git status`, `rg -n`, `Get-Content`; inventario e hash iniziali. | Eseguito | Nessuna esecuzione applicativa. 1.643 file visibili sotto `progetto/` inventariati. |
| Fonti Home Assistant | Ricerca e apertura delle fonti primarie: architettura, API WebSocket, ambiente di sviluppo e repository ufficiale Core. | Eseguito | Consultazione del 2026-10-29; URL diretti nel blocco 1. Core, HA OS e Supervisor distinti senza dedurre che clonare Core equivalga a installare l'intero sistema. Nessun clone eseguito. |
| Revisione indipendente | Rilettura delle nuove sezioni del blocco e di U4/A4 da parte dell'agente incaricato della doppia distribuzione. | Superato | Nessuna correzione necessaria; motivazioni supportate, ruoli distinti e nessuna approvazione inventata. |
| Integrità applicativa e perimetro | `rg --files --hidden progetto` con le esclusioni indicate, `Get-FileHash` SHA-256, `Compare-Object` su percorso/hash e stato Git fuori da `documentazione/`. | Superato | 1.643 file prima e dopo, zero differenze; stato Git fuori documentazione invariato. |
| Collegamenti e formattazione | Controllo PowerShell dei link introdotti, ancore di titolo, UTF-8 e spazi finali; `git diff --check -- documentazione`. | Superato | 19 collegamenti locali, di cui 3 con ancora; nessun errore. |
| Test, build e prove applicative | Non previsti per questa discussione. | Non eseguito | Nessun servizio avviato, nessuna dipendenza installata e nessuna modifica a client, server, HA o distribuzione. |

## Controllo del diff e decisioni

Sono valutazioni da discutere: nessuna rimozione del frontend, eliminazione del server ACA o adozione di una variante Home Assistant è stata approvata.

Il diff dell'intervento riguarda soltanto otto documenti: il presente report e i sette documenti indicati nello snapshot. I criteri di completamento sono soddisfatti. Nessun nuovo ADR o requisito introdotto e nessun report chiuso riscritto; la nuova discussione è aggiunta alla memoria esistente.

## Chiusura e punto di ripresa

Discussione documentata e incarico di analisi completato. Restano aperte la scelta del canale frontend e le responsabilità da mantenere nel servizio ACA. Proseguire dalle domande dell'utente sul blocco 1; nessun lavoro implementativo assegnato. Codice invariato, nessun commit o pubblicazione eseguito.

## Rettifiche successive

Nessuna.
