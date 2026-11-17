# Provisioning automatico della VM HA OS da ACA

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261030-004 |
| Stato | Completato |
| Data | 2026-10-30, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile. |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta di riferimento | «Ok, approfondiamo come ACA potrebbe installare e gestire automaticamente la VM con HA OS, senza far configurare VirtualBox all’utente e senza mostrare HA. Per ora senza installare nulla né modificare il codice.» |
| Autorizzazione | Analisi in lettura e documentazione; nessuna acquisizione di installer/immagini, installazione, comando di gestione VM o modifica applicativa/configurazione. |

## Obiettivo e perimetro

Definire il percorso possibile per prerequisiti, installazione VirtualBox, immagine HA OS, rete, boot/onboarding ACA, gestione e recupero. Distinguere assenza di configurazione manuale VirtualBox da UAC/riavvio/prerequisiti che non possono essere promessi invisibili. Conservare Core 2026.10.4 e storico delle prove precedenti senza riutilizzare automaticamente VM o account.

Modifiche preesistenti in progetto/ e documentazione/ preservate. Copie iniziali di sette documenti, censimenti SHA256 di sorgenti/materiali e stato Git conservati in directory temporanea. Le fonti documentali riportano una vecchia VM di banco; non equivalgono a un inventario corrente né autorizzano a modificarla.

## Criteri di completamento

- Flusso automatizzabile concreto con stato/checkpoint, prerequisiti e confini dei privilegi.
- Fonti primarie per installer, CLI, immagine e onboarding; versioni/identità distinte e licenze da verificare per la distribuzione.
- Proprietà della VM, gestione rete/dati, stop/aggiornamento e recupero definiti come proposte.
- Esperienza solo ACA e limiti attuali del client verificati; prove future tutte non eseguite.
- Diario/punto di ripresa/indici aggiornati e integrità dei file controllata.

## Avanzamento e modifiche

Creato lo [studio del provisioning](../riprogettazione/blocchi/01-provisioning-vm-haos.md): esperienza ACA, confini dei privilegi, installer/riavvio, materiali, proprietà della VM, rete, onboarding, stati PVM0-PVM8, gestione/dati e prove future. VirtualBox 7.2.22 e HA OS 18.4 sono riferimenti documentali; non sono stati adottati nuovi componenti. La garanzia iniziale di Core 2026.10.4 rimane da definire perché l'immagine OS non lo fissa automaticamente.

Aggiornati [diario U20/A20](../riprogettazione/diario/2026-10-30.md#u20-installazione-e-gestione-automatica-della-vm), ingresso/indicazioni della riprogettazione, stato, LEGGIMI, indice report e collegamento dallo studio Windows precedente. Nove documenti interessati, due nuovi. Nessuna modifica a codice, configurazioni, archivi o report chiusi.

Consultati sorgenti/metadati ufficiali e manuali Oracle, Microsoft, HA e relativi repository; il percorso licensing resta limitato alle evidenze reperite, senza attestare redistribuzione dell'Extension Pack. Letti i riferimenti storici alla vecchia VM nel repository; nessun inventario corrente o accesso alla VM. Il tag Supervisor 2026.10.5 è un riferimento sorgente, non una versione rilevata nel guest o un nuovo pin approvato.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Stato iniziale | git status --short; git rev-parse HEAD; censimenti SHA256 | Superato | Modifiche preesistenti preservate. |
| Client e storico | Get-Content/rg sui documenti pertinenti e setup.ts | Superato | Parti onboarding/add-on esistenti, coordinatore VM assente; nessuna adozione della vecchia VM di banco. |
| Installer e controllo | Manuali 7.2 e sorgenti Oracle v7.2.22; documentazione MSI/UAC Microsoft, consultati il 2026-10-30 | Superato | Automazione documentata, nessuna esecuzione o verifica della firma di un installer acquisito. Distinti MSI/EXE e riavvio. |
| Immagine HA OS | GitHub API release tags/18.4 | Superato | Asset haos_ova-18.4.vdi.zip, 560370635 byte, digest pubblicato registrato nello studio. Nessun hash locale del binario o VDI. |
| Contratti HA | Sorgenti Core 2026.10.4 e Supervisor 2026.10.5, API documentate | Superato | Onboarding, versione effettiva, proxy amministrativo e controllo host letti; nessuna chiamata API alla VM. Contratti/versioni da collaudare. |
| Revisione indipendente | Rilettura dello studio da parte di un altro agente | Superato | Nessun problema sostanziale rilevato su perimetro, ownership, privilegi, rete e limite del pin Core. Non è un collaudo applicativo. |
| Documenti e link | UTF-8 rigoroso, confronto con copie iniziali, link locali/ancore, git -c core.safecrlf=false diff --check -- documentazione | Superato | 22 link introdotti e 4 ancore locali validi; nessuno spazio finale introdotto. |
| Struttura del percorso | Lettura e conteggio stati | Superato | Nove stati proposti PVM0-PVM8, nessun runner o script operativo creato. |
| Codice e lavoro preesistente | rg --files --hidden progetto con esclusioni node_modules/.git/dist/.tmp; Get-FileHash SHA256; confronto stato Git fuori documentazione/ | Superato | 1.643 file censiti, zero differenze; stato Git esterno ai documenti invariato. |
| Materiali U11 | Get-FileHash SHA256 e confronto con censimento iniziale | Superato | Tre materiali invariati, pin precedenti conservati. |
| Provisioning VM e installer | Esecuzione di prove future | Non eseguito | Nessuna installazione o gestione VM autorizzata. |
| Licenza completa Extension Pack e distribuzione finale | Reperimento termini e valutazione del distributivo ACA | Non eseguito | Sito dei termini non accessibile nel tentativo effettuato; nessuna estensione adottata o diritto di redistribuzione attestato. |

## Controllo del diff e decisioni

Diff confrontato con richiesta e criteri: soltanto documenti pertinenti. Nessuna nuova architettura, dipendenza, funzione, permesso o profilo VM adottati; nessun nuovo ADR o REQ. Ownership, rete e recovery sono proposte per un incarico futuro. Nessun commit o deploy.

## Chiusura e punto di ripresa

Studio completato. È plausibile automatizzare installazione e configurazione senza Manager VirtualBox/UI HA, mantenendo espliciti requisiti Windows e dati umani. Restano profilo rete, garanzia della combinazione iniziale HA OS/Supervisor/Core, distribuzione dei componenti, proprietà per utente/sistema e lifecycle. Il confezionamento e la ripresa non sono stati realizzati o provati.

Nessun incarico esecutivo resta attivo. Proseguire dalle domande dell'utente, senza acquisire installer/immagini, installare, avviare VM, modificare la vecchia macchina di banco o predisporre il preflight Android. iOS resta rinviato.

## Rettifiche successive

**2026-10-30, durante U21:** corretta nel documento di provisioning la precedente destinazione fissa HA 8123. La documentazione HTTP e il codice Core 2026.10.4 confermano il default 80 per nuove installazioni HA OS nel contesto Supervisor; installazioni migrate possono conservare 8123 e Container mantiene 8123. Il profilo deve rilevare la porta effettiva. Nessuna configurazione/porta reale modificata; esiti storici dei controlli sopra conservati. Fonti: [HTTP HA](https://www.home-assistant.io/integrations/http/), [default nel codice](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/http/config.py). Controllo della rettifica registrato in [REP-20261030-005](REP-20261030-005-dati-multidispositivo-remoto.md).

