# ACA Electron e Home Assistant sullo stesso PC Windows

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261030-003 |
| Stato | Completato |
| Data | 2026-10-30, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile. |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta di riferimento | «Ok, approfondiamo come far girare ACA e Home Assistant sullo stesso PC Windows con Electron, come un’unica app normale e senza mostrare HA. Per ora senza installare nulla né modificare il codice.» |
| Autorizzazione | Studio in lettura, fonti primarie e documentazione locale. Nessuna installazione, prova runtime, modifica applicativa o scelta iOS. |

## Obiettivo e perimetro

Confrontare motore HA nativo Windows e ambiente Linux locale sullo stesso PC, mantenendo una sola esperienza ACA, frontend HA presente ma non mostrato e uso ordinario dell'app. Analizzare avvio/chiusura, continuità, rete/dispositivi, dati e aggiornamenti; distinguere proposta da architettura adottata.

Stato Git e file applicativi/documentali preesistenti preservati. Copie iniziali di sette documenti, censimenti SHA256 di codice e materiali U11 e stato Git conservati in directory temporanea. Conservare pin HA 2026.10.4 e baseline precedenti senza dedurne automaticamente il pacchetto Windows.

## Criteri di completamento

- Stato del client Windows verificato dai sorgenti e distinto dall'host HA locale ancora assente.
- Alternative concrete con supporto upstream, prerequisiti e limiti, senza promessa di compatibilità al 100%.
- Proposta di esperienza unica e ciclo di vita, con decisioni aperte identificabili.
- Piano futuro di fattibilità, non eseguito; diario/indici/punto di ripresa aggiornati.
- Verifica di link, diff, integrità codice e materiali; nessuna installazione o esecuzione di ambienti.

## Avanzamento e modifiche

Creato lo [studio Windows](../riprogettazione/blocchi/01-windows-electron-ha-locale.md), con blocchi Unix di Core 2026.10.4, confronto HA OS VM/WSL, esperienza unica ACA, ciclo di vita, rete/hardware, dati e piano W0-W6. Raccomandazione documentale: VM HA OS come riferimento iniziale; nessuna alternativa approvata.

Aggiornati [diario U19/A19](../riprogettazione/diario/2026-10-30.md#u19-aca-e-ha-sullo-stesso-pc-windows), indicazioni/ingresso della riprogettazione, studio installazione, stato, LEGGIMI e indice dei report. Nove documenti interessati, due nuovi; nessun ADR nuovo o modifica a report chiusi.

Lettura selettiva del PC tramite CIM: Windows 11 Home, 10.0.26300/build 26300, OS 64 bit, 15,7 GiB fisici, HypervisorPresent true. Non è una verifica di WSL/VM o del ruolo Hyper-V completo. Letti i sorgenti del client Windows e quelli Core tramite GitHub; consultate fonti ufficiali HA, Microsoft, Electron, Node, Python, Docker e Oracle, collegate nello studio. Nessun runtime o hypervisor avviato/interrogato.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Stato iniziale | git status --short; git rev-parse HEAD; censimenti SHA256 | Superato | Modifiche preesistenti identificate e preservate. |
| Client Windows | Get-Content e rg su package.json, main.ts, localServer.ts, fileStore.ts, core/startup.ts e setup.ts | Superato | Finestra normale e proxy esistenti; nessun host HA locale. X chiude l'ultima finestra e termina Electron. Nessun build/test. |
| Core e supporto upstream | GitHub fetch dei file del tag 2026.10.4; pagine primarie consultate il 2026-10-30 | Superato | Guardia OS, fcntl/resource e segnali Unix osservati; non una revisione completa o un errore runtime riprodotto. Distinti metodi di installazione e motore Core. |
| PC candidato | Get-CimInstance Win32_OperatingSystem e Win32_ComputerSystem, proprietà selezionate | Superato | Solo edizione/versione/architettura/RAM/HypervisorPresent; nessuna impostazione, distribuzione o processo HA verificati. |
| Revisione indipendente | Rilettura dello studio da parte di un altro agente | Superato | Nessun problema sostanziale rilevato su proposte, Windows Home, host Linux e ciclo di vita. Non è un collaudo del prodotto. |
| Documenti e link | UTF-8 rigoroso, confronto aggiunte con copie iniziali, link locali/ancore, git -c core.safecrlf=false diff --check -- documentazione | Superato | 33 link introdotti e 4 ancore locali validi; nessuno spazio finale introdotto. |
| Struttura del piano | Lettura documento, conteggio delimitatori e fasi | Superato | Due delimitatori del diagramma, sette fasi W0-W6; solo controllo strutturale, nessun rendering o prova eseguita. |
| Codice e lavoro preesistente | rg --files --hidden progetto con esclusioni node_modules/.git/dist/.tmp; Get-FileHash SHA256; confronto git status fuori documentazione/ | Superato | 1.643 file censiti, zero differenze; stato Git esterno ai documenti invariato. |
| Materiali U11 | Get-FileHash SHA256 e confronto con censimento iniziale | Superato | Tre materiali invariati, nessun pin modificato. |
| Runtime Windows/WSL/VM | Installazione e avvio | Non eseguito | Nessuna installazione, attivazione o interrogazione del backend assegnata. |
| Fattibilità W0-W6 e preflight Android | Prove future definite nei rispettivi studi | Non eseguito | Nessuna immagine/pacchetto acquisito, import/generazione C, compilazione o test runtime. iOS rinviato. |

## Controllo del diff e decisioni

Diff limitato ai documenti pertinenti e confrontato con richiesta e criteri. ADR-0026/27/28 conservati; nessuna nuova architettura approvata dallo studio. Virtualizzazione, servizio, Tray e riduzione del server ACA restano proposte. Nessuna installazione, modifica applicativa/configurazione, commit o deploy.

## Chiusura e punto di ripresa

Studio completato. È plausibile un'unica esperienza ACA con Electron e motore HA Linux sullo stesso PC. Il percorso standard nativo Windows richiederebbe porting; la raccomandazione è HA OS VM come riferimento, con WSL 2 alternativa da collaudare e Docker Desktop escluso dalla procedura HA Container documentata.

Restano host da scegliere, significato di X/Esci, continuità dopo logout/prima del login, integrazioni e responsabilità ACA. Nessuna promessa di compatibilità completa, affidabilità H24 o tempi di avvio. Nessun incarico esecutivo resta attivo: proseguire dalle domande dell'utente, senza avviare installazioni, prove, preparazione Linux o studio iOS.

