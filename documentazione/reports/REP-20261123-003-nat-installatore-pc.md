# NAT per i download della centrale installata su PC

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261123-003 |
| Stato | Completato localmente |
| Data | 2026-11-23, Europe/Rome |
| Autore / modello | Codex, modello esatto non documentato |
| Commit di partenza | `22eca26cce781caaebb51a420fe83bf940665e5a` |
| Richiesta di riferimento | «Riesci ad automatizzare il processo di nat?»; chiarimento «NAT nell’installatore». |
| Autorizzazione | Integrare il NAT nel percorso di installazione PC della nuova centrale, mantenendo l'accesso LAN proposto e verificando su ambiente isolato. |

## Obiettivo e perimetro

Instradare i download di prima installazione via NAT e passare automaticamente al bridge prima della consegna in LAN. L'immagine HAOS distribuita ricava l'indirizzo del QR dalla rotta predefinita. Il passaggio sullo stesso adattatore consente di riusare l'immagine e di far convergere entrambi i QR sull'IP LAN. La rete del funzionamento ordinario resta quella documentata. Centrali già installate, aggiornamenti all'avanzamento e documentazione preesistente da preservare. Nessuna pubblicazione richiesta. Sorgenti e prove del problema in [REP-20261123-001](REP-20261123-001-diagnosi-installazione-pc.md).

## Criteri di completamento

- Una nuova centrale creata dall'app Windows parte con VirtualBox NAT e inoltri solo su loopback. Dopo il primo avvio il client passa al bridge e mostra il QR solo dopo una risposta positiva dall'indirizzo LAN della VM.
- Download via NAT, raggiungibilità LAN tramite bridge e persistenza del cambio verificati con un'installazione isolata.
- Pacchettizzazione e regressioni pertinenti ripetibili. Esiti e limiti registrati separatamente dalla prova ancora da eseguire sul PC lento.

## Avanzamento e modifiche

- Un nuovo installatore Windows avvia la VM con la stessa scheda 82540EM in NAT. Tre porte assegnate da Windows inoltrano soltanto a `127.0.0.1` le richieste del client verso il job HAOS, l'API Core e l'health di Acasystem. Lo script registra porta e scheda fisica nel suo `installazione.json`.
- Il client aspetta Core e Acasystem, passa a caldo al bridge e richiede un nuovo indirizzo DHCP facendo ciclare il link. Dopo il cambio ricerca lo stesso MAC nella LAN e mostra il QR solo con health `ok` all'indirizzo LAN. Alla ripresa legge ancora i metadati e lo stato effettivo di VirtualBox. Le centrali già installate e il percorso da ZIP con installazione manuale conservano il loro flusso.
- Nel collaudo l'API Core su 8123 si è reindirizzata alla porta 80 anche dopo l'avvio. Il client gestisce questa situazione con `/api/onboarding` sull'inoltro locale, riconoscendo i passi JSON di Core. La pagina di preparazione del Supervisor risponde con assenza del servizio. Nessun redirect viene seguito verso la porta di Windows indicata dal guest. [Implementazione HA Core](https://github.com/home-assistant/core/blob/2026.11.2/homeassistant/components/onboarding/views.py), consultata il 2026-11-23.
- App e installatore locale hanno versione 0.2.2. Si usa lo stesso disco pubblicato `centrale-vm-18.4-2`. Il NAT riguarda la preparazione e il bridge resta la configurazione operativa, compresi gli aggiornamenti successivi. [Riferimento Oracle VirtualBox 7.2](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/vboxmanage.html), consultato il 2026-11-23.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Tipo, regressioni, build | `npm run typecheck`, `npm test`, `npm run dist:zip` dal client Windows. Parser PowerShell per `Installa-Centrale.ps1`. | Superato | 187 test su 12 file. Verificati NAT in loopback, distinzione tra preparazione e risposta 307 di Core, health su LAN, cavo ripristinato se il cambio fallisce e ripresa dopo interruzione. Il primo build del pacchetto è stato ripetuto con accesso a GitHub perché il sandbox non risolveva l'host del runtime Electron già fissato. |
| Avvio reale in NAT e passaggio alla LAN | Disco pubblico verificato SHA-256, `Installa-Centrale.ps1 -Disco … -NonInterattivo` e ripresa tramite `createCentralSetup`, VirtualBox 7.2.22 su Wi-Fi | Superato | `nic1=nat`, tre inoltri su `127.0.0.1`, percentuale di Core letta durante il download. Il primo tracciamento ha evidenziato il redirect 307. Dopo la correzione è stato ripreso sulla stessa VM e ha visto health LAN `200/ok`, QR da 25×25 e stato `ready` in 35 s dalla ripresa. Non è una misura cronometrata da zero della versione finale. |
| Persistenza del bridge | Stato su VM spenta, avvio a freddo e controllo HTTP LAN | Superato | `nic1=bridged` e cavo attivo conservati. Health LAN `ok` e inoltro NAT inattivo. Il tentativo di spegnimento via ACPI è scaduto e il ciclo a freddo è stato effettuato arrestando la sola VM di prova. Rimossi VM, attività pianificata e cartella di laboratorio. |
| EXE 0.2.2 | `crea-installer.ps1` in PowerShell 5.1 con NSIS 3.0.4.1, poi lista ed estrazione con 7-Zip | Superato | `backup/rep20261123-nat-installer/ACA-System-Setup-0.2.2.exe`, 115.591.051 byte, SHA-256 `2705377c835bbfd52317327383a322f86e941210f895f8c38972a871638865c6`. Script e tre moduli del setup verificati byte per byte. In PowerShell 5.1 il default dello ZIP è stato spostato nel corpo dello script, dove `$PSScriptRoot` è disponibile. L'EXE completo è stato ispezionato su questo host; esecuzione su Windows pulito da fare. |
| PC lento e telefono fisico | Prova in ambiente di destinazione | Non eseguito | Il PC lento e il telefono non erano accessibili. I risultati locali dimostrano il percorso automatico, mentre il guadagno di velocità resta da misurare sul PC interessato. |

## Controllo del diff e chiusura

Il diff copre l'installazione iniziale della nuova VM, lettura dello stato e passaggio di rete del client Windows, test, versione e note di distribuzione. Le correzioni precedenti dell'avanzamento sono incluse nell'EXE locale. Incarico completato il 2026-11-23. Natura e canale del disco pubblico restano invariati. Nessun commit o pubblicazione. Il collaudo dell'EXE sul PC lento e la velocità effettiva della connessione restano verifiche di destinazione di ISSUE-169.

## Pubblicazione successiva — 2026-11-23

Su richiesta dell'utente per ripetere il collaudo sul PC ACA, aggiunti `ACA-System-Setup-0.2.2.exe` e `ACA-System-Setup-0.2.2.exe.sha256` alla [pre-release centrale-vm-18.4-2](https://github.com/acamemo/acasystem-releases/releases/tag/centrale-vm-18.4-2). Le note mettono in evidenza l'installer 0.2.2 e il punto di partenza e arrivo del cronometro. Gli allegati precedenti restano disponibili per lo storico. Verificata l'impronta del disco esistente nell'API GitHub.

Il download anonimo dell'intero EXE ha restituito HTTP 200 e 115.591.051 byte. L'impronta SHA-256 calcolata coincide con quella del pacchetto collaudato e con l'allegato pubblico `.sha256`. Per i sorgenti è stato scelto il ramo `codex/windows-setup-nat-0.2.2`. Il workflow che pubblica e aggiorna il banco parte dai push su `main`, operazione distinta dalla pubblicazione dell'installatore Windows. Il nuovo collaudo sul PC ACA è ancora da eseguire.
