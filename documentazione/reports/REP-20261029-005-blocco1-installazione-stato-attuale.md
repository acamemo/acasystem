# Blocco 1 Installazione ACA e stato attuale

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261029-005 |
| Stato | Completato |
| Data | 2026-10-29, Europe/Rome |
| Autore / modello | Assistente Codex; identificativo esatto del modello non disponibile. |
| Commit di partenza | `5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69`, con modifiche preesistenti. |
| Richiesta di riferimento | «Partiamo dalle basi: il blocco 1 per me è installazione aca, perché io ho creato 2 contenitori, uno capacitator l'altro electron, per funzionare l'app, l'idea originale era quella di sfruttare HAOS su una macchina esterna come backend e far girare l'app tramite indirizzo ip su telefoni o computer con installazione di aca come add on sulla macchina esterna e ricevendo il frontend da github, secondo te attualmente, come ti risulta fatto il lavoro?» |
| Autorizzazione | Analisi in sola lettura del blocco installazione e aggiornamento della memoria della riprogettazione, secondo le richieste della chat. Nessuna modifica al codice, installazione, pubblicazione o avvio di servizi. |

## Obiettivo e perimetro

Ricostruire dai sorgenti e dalle configurazioni i ruoli di Electron, Capacitor, frontend distribuito da GitHub, server ACA e Home Assistant OS. Confrontare lo stato osservabile con l'idea descritta dall'utente, distinguendo sorgenti, artefatti locali, pubblicazione remota e collaudi storici.

Sono preservate le numerose modifiche preesistenti a documentazione e applicazione. Prima degli aggiornamenti documentali è stato acquisito uno snapshot temporaneo degli ingressi interessati, dello stato Git e degli hash dei file visibili sotto `progetto/`, escludendo `node_modules`, `.git`, `dist` e `.tmp`.

## Criteri di completamento

1. Descrivere il flusso effettivo di installazione e avvio, con riferimenti ai sorgenti.
2. Verificare in lettura lo stato del repository pubblico di distribuzione configurato dai client.
3. Esplicitare differenze di versione e limiti delle verifiche, senza attribuire al codice prove non ripetute.
4. Salvare domanda, risultati e punto di ripresa nella memoria del blocco 1.
5. Verificare che l'intervento abbia modificato soltanto documenti.

## Avanzamento e modifiche

Richiesta, perimetro e criteri registrati prima dell'aggiornamento sostanziale della memoria. Analisi dei client e del server affidate a due letture indipendenti senza scritture; verifica remota GitHub e controllo del collegamento frontend a cura dell'assistente principale.

Creato `documentazione/riprogettazione/blocchi/01-installazione-aca.md` con schema, ruoli, sequenza di installazione, percorsi di aggiornamento, versioni osservate e limiti. Aggiunti al diario U3 testuale, sintesi della precedente chiusura documentale e risultati dell'analisi. Aggiornati ingresso della riprogettazione, indicazioni, passaggio di consegne, stato e indice dei report.

Risultati principali:

- Client Windows Electron e Android Capacitor con nucleo comune; UI scaricata da GitHub, salvata sul dispositivo e servita in loopback, con inoltro API al server ACA su IP locale.
- Server ACA su HA OS con API e dati propri, proxy a HA e anche una build incorporata del frontend; il backend effettivo comprende ACA e Home Assistant.
- Installazione dell'add-on già implementata nel client tramite Supervisor, dalla configurazione iniziale di HA quando necessaria. HA OS deve già essere presente sulla macchina.
- Pubblicazione verificata: UI 0.9.30 e catalogo add-on 0.9.30.1. Il catalogo pubblico ha `homeassistant_api: false`, diverso dal template corrente `true`; non si assume equivalenza fra sorgenti locali e immagine pubblicata.
- Aggiornamenti di UI, server e guscio separati; la cache della UI non elimina la necessità del server ACA raggiungibile.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Stato iniziale | `git status --short`, `git rev-parse HEAD`, inventario `rg --files` e SHA-256. | Eseguito | 1.643 file visibili sotto `progetto/` inventariati; modifiche preesistenti rilevate prima degli aggiornamenti documentali. |
| Runtime Docker sul PC | `docker ps --format '{{.Names}}|{{.Image}}|{{.Ports}}|{{.Status}}'`. | Non disponibile | Il pipe Docker Desktop Linux non risponde. Nessun servizio avviato o riavviato; questo controllo non accerta lo stato di un mini PC o di una VM esterni. |
| Ricostruzione dei flussi | `rg --files`, `rg -n` e lettura numerata dei sorgenti di `progetto/client`, `progetto/ha-app`, Dockerfile ACA, proxy e client API del frontend. | Eseguito | Evidenze puntuali nel documento del blocco; sorgenti e configurazioni descritti senza avvio applicativo. |
| Repository e release pubblicati | Plugin GitHub: `get_repo`, `fetch` di `releases/latest`, `fetch_file` di `repository.yaml` e `acasystem/config.yaml` in `acamemo/acasystem-releases`. | Superato | Il 2026-10-29: repository pubblico, latest `v0.9.30`, catalogo 0.9.30.1; blob config `e8f38a7b019ca8714ac093b81eb01a44fc0d8c05`. Nessuna scrittura remota. |
| Manifest pubblicato | Il connettore non ha risolto il link all'asset (404); lettura HTTPS riuscita con `Invoke-RestMethod` del `manifest.json` della release v0.9.30. | Superato | UI 0.9.30, server minimo 0.9.30, guscio minimo 0.1.0; dimensione e SHA-256 dichiarati coincidono con il manifest locale. Il bundle ZIP non è stato riscaricato né eseguito. |
| Collaudi storici | Lettura di REP-20261026-005, righe 321-335. | Documentati, non ripetuti | Il report registra il percorso completo su Tab M11 e VM HA OS via USB/inoltro PC, con limiti su Wi-Fi diretta, interruzioni e Dell. Non è un collaudo attuale dei sorgenti. |
| Integrità applicativa e perimetro | Confronto `Get-FileHash` SHA-256 e `Compare-Object` con lo snapshot iniziale; confronto di `git status --porcelain=v1 --untracked-files=all` fuori da `documentazione/`. | Superato | 1.643 file prima e dopo, zero differenze; stato Git fuori documentazione invariato. Dipendenze e output esclusi dall'inventario. |
| Collegamenti e formattazione | Controllo PowerShell di percorsi e ancore introdotti negli otto documenti interessati; UTF-8 rigoroso, spazi finali e `git diff --check -- documentazione`. | Superato | 36 collegamenti locali, di cui 4 con ancora; nessun errore. |
| Revisione indipendente | Rilettura del documento del blocco da parte dell'agente che ha analizzato i client. | Superato | Nessuna correzione necessaria; comportamento descritto supportato dai sorgenti, senza approvazioni implicite o prove attuali inventate. |
| Test, build, installazioni e immagine GHCR | Non previsti per la ricostruzione in sola lettura. | Non eseguito | Nessun servizio, VM o dispositivo modificato; contenuto binario dell'immagine GHCR non ispezionato. |

## Controllo del diff e decisioni

L'intervento è limitato a otto documenti: il presente report, il documento del blocco e sei ingressi/registri già esistenti. Nessuna nuova scelta tecnica o funzionale, nessun ADR o requisito aggiunto. L'indicazione del blocco e la descrizione dell'idea originale non costituiscono approvazione di una nuova implementazione. I criteri di completamento sono soddisfatti; le modifiche preesistenti sono conservate.

## Chiusura e punto di ripresa

Analisi e aggiornamento documentale completati. Prossimo passo della conversazione: le domande dell'utente sul flusso di installazione che vuole ottenere. Nessuna attività implementativa resta attiva in questo incarico; nessun commit, pubblicazione o deploy eseguito. Le prove reali non ripetute e gli aggiornamenti dei pacchetti restano fuori dall'incarico corrente.

## Rettifiche successive

Nessuna.
