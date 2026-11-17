# Responsabilità ACA e valutazione senza mini PC

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261029-007 |
| Stato | Completato |
| Data | 2026-10-29, Europe/Rome |
| Autore / modello | Assistente Codex; identificativo esatto del modello non disponibile. |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69`, con modifiche preesistenti. |
| Richiesta di riferimento | «Quindi quali funzioni del server ACA servono davvero e quali possiamo affidare direttamente a Home Assistant? Vorrei capire se possiamo eliminarlo o ridurlo al minimo, senza modificare ancora il codice. Vorrei valutare anche di fare come altre app, che gestiscono tutto da telefono, come l'app SmartLife di Volcano Technology oppure l'app di Alexa, se riesci a trovare informazioni su come funzionano, magari seguiamo il loro approccio, facendo girare l'app su un unico dispositivo magari. Una mia idea per questa teoria sarebbe quello di fare fetch su github ad HA e prendere la parte backend/API e escludendo il frontend in caso di aggiornamenti, ma fai le tue valutazioni.» |
| Chiarimento umano | Alla domanda sul significato di unico dispositivo, l'utente ha scelto «Solo telefono o tablet, senza mini PC». Fonte nella chat corrente, da conservare nel diario. |
| Autorizzazione | Analisi e ricerca di fonti primarie, confronto di alternative e aggiornamento della memoria. Nessuna modifica applicativa, installazione, migrazione o scelta architetturale da applicare. |

## Obiettivo e perimetro

Mappare le responsabilità ACA e il loro possibile trasferimento alle API HA o all'app nel nuovo scenario con un solo telefono/tablet. Confrontare il modello pubblico Smart Life/Tuya e Alexa, distinguendo interfaccia sul telefono, cloud, motore locale e hardware di collegamento. Valutare l'ipotesi HA Core senza frontend, senza confonderla con un porting già disponibile su Android.

La precedente ipotesi con mini PC è un riferimento storico, non un vincolo da imporre alla nuova valutazione. Il cloud, il funzionamento offline e l'elenco minimo dei dispositivi non sono stati scelti. Tutte le modifiche preesistenti restano preservate; prima delle scritture è stato acquisito uno snapshot temporaneo dei documenti interessati, dello stato Git e degli hash dei file visibili sotto `progetto/`, escludendo `node_modules`, `.git`, `dist` e `.tmp`.

## Criteri di completamento

1. Mappa concreta fra responsabilità HA, dati ACA e funzioni trasferibili nell'app, con evidenze dai sorgenti.
2. Fonti primarie aperte per Smart Life/Tuya, Alexa, installazioni HA e vincoli del runtime mobile; fatti distinti da inferenze.
3. Valutazione di Core senza frontend basata su una revisione identificata, senza affermare una fattibilità mobile non provata.
4. Conservazione della domanda e del chiarimento umano; opzioni e questioni residue registrate senza approvazioni inventate.
5. Controllo finale dei documenti e dell'assenza di modifiche applicative.

## Avanzamento e modifiche

Perimetro e criteri registrati prima dell'aggiornamento sostanziale della memoria. Letture indipendenti del server e ricerche primarie Tuya/Alexa affidate a tre agenti in sola lettura; l'assistente principale verifica sorgenti rilevanti, componenti HA e runtime Android.

Creato `documentazione/riprogettazione/blocchi/01-valutazione-solo-telefono.md`, con mappa delle responsabilità, fonti primarie, confronto dei modelli e limiti. Aggiornati documento iniziale del blocco, ingresso, indicazioni, diario, passaggio di consegne, stato e indice dei report. Il diario conserva U5 testuale, la domanda di chiarimento e U5a testuale, oltre ad A5 come sintesi.

Risultato: molte responsabilità proprie di ACA sono trasferibili nell'app nello scenario di un solo dispositivo; stati, comandi e automazioni sono già eseguiti da HA. Eliminare ACA non colloca automaticamente quel motore sul telefono. Smart Life/Alexa documentano cloud e percorsi locali con dispositivi/controller, non un backend universale tutto sul telefono. I manifest Core 2026.10.4 distinguono API e frontend; il funzionamento del motore su Android resta da verificare.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Stato iniziale e sorgenti | `git status`, `git rev-parse HEAD`, `rg`, `Get-Content` e snapshot SHA-256. | Eseguito | 1.643 file visibili sotto `progetto/` inventariati. Nessun comando applicativo, build o installazione. |
| Mappa delle responsabilità | Lettura di server, route, client HA, schema SQLite, catalogo API e servizi dispositivi; riferimenti puntuali nella valutazione. | Eseguito | Dati e logiche ACA distinti da operazioni già eseguite in HA; nessuna percentuale o stima di riduzione dichiarata. |
| Ricerca Smart Life/Tuya | Apertura di scheda Google Play, overview SmartLife, SDK Android per LAN/cloud e manuale ufficiale. | Eseguito | Identità Volcano confermata; piattaforma e capacità documentate distinte dall'implementazione interna completa dell'app. Le FAQ Tuya che hanno dato redirect loop non fondano le conclusioni. |
| Ricerca Alexa | Apertura delle opzioni di sviluppo Amazon e guida Matter; lettura delle fonti utente su Zigbee e controllo locale. | Eseguito | Ruoli di app, cloud e controller/hub distinti; nessuna generalizzazione di offline a tutte le funzioni. |
| Separazione API/frontend HA | Apertura dei manifest `api`, `websocket_api` e `frontend` nel tag ufficiale Core `2026.10.4`. | Eseguito | Componenti distinti e dipendenze verificate; non è prova di un'app backend Android funzionante. |
| Installazioni HA e Android | Documentazione primaria sulle installazioni HA e sui processi Android in background, consultata il 2026-10-29. | Eseguito | Nessun pacchetto ufficiale backend Android identificato nelle installazioni documentate; runtime e continuità restano aspetti da progettare e provare. |
| Revisione indipendente | Rilettura della valutazione e di U5/U5a/A5 dall'agente incaricato della mappa ACA. | Superato | Nessuna correzione necessaria; chiarimento umano preservato, nessuna approvazione o fattibilità mobile inventata. |
| Integrità applicativa e perimetro | `Get-FileHash` SHA-256, `Compare-Object` su percorso/hash e confronto dello stato Git fuori da `documentazione/`. | Superato | 1.643 file prima e dopo, zero differenze; stato Git fuori documentazione invariato. Esclusioni dell'inventario indicate nel perimetro. |
| Collegamenti e formattazione | Controllo PowerShell dei collegamenti locali e ancore introdotti, UTF-8, spazi finali e `git diff --check -- documentazione`. | Superato | 29 collegamenti locali verificati, di cui 4 con ancora; nessun errore. |
| Test applicativi, hardware e porting | Non previsti nell'incarico di valutazione. | Non eseguito | Nessuna installazione, clone HA, build, emulazione, analisi di binari proprietari o modifica a dispositivi e servizi. |

## Controllo del diff e decisioni

Il chiarimento definisce l'obiettivo da valutare, non un'approvazione a eliminare ACA o a eseguire HA sul telefono. Nessun nuovo ADR o requisito da implementare in questo incarico.

Il diff dell'intervento riguarda nove documenti: due nuovi (valutazione e presente report) e sette aggiornamenti circoscritti. Non sono stati riscritti report chiusi o cancellate decisioni precedenti. Le cinque condizioni di completamento sono soddisfatte; il nuovo obiettivo è registrato senza trasformare la ricerca in un incarico implementativo.

## Chiusura e punto di ripresa

Analisi e memoria completate. Proseguire dalla valutazione con l'utente di cloud, autonomia offline, dispositivo mobile e dispositivi domotici da supportare. L'eventuale motore HA sul tablet richiederà un futuro incarico di verifica tecnica prima di assumere una fattibilità di prodotto. Nessun lavoro implementativo attivo, nessun commit o pubblicazione eseguito; codice invariato.

## Rettifiche successive

Nessuna.
