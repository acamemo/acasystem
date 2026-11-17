# Blocco 1 ACA prepara e gestisce automaticamente la VM HA OS

Aggiornato: 2026-10-30. Fonte umana: [U20](../diario/2026-10-30.md#u20-installazione-e-gestione-automatica-della-vm). [Studio Windows precedente](01-windows-electron-ha-locale.md), [report](../../reports/REP-20261030-004-provisioning-vm-haos.md).

ACA può essere progettata per predisporre VirtualBox e una VM HA OS senza chiedere all'utente di usare il Manager, assegnare RAM o cercare l'IP di HA. Nell'uso ordinario si vedrebbero soltanto schermate ACA e l'eventuale conferma amministratore Windows. Questo studio definisce un possibile percorso; non realizza un installer né approva nuove installazioni o dipendenze.

L'automazione della configurazione non elimina prerequisiti, riavvii, download e licenze. Non si può garantire un'installazione interamente invisibile su qualsiasi PC. Il motore resta locale e il frontend HA presente ma non caricato nel flusso ACA.

## Esperienza proposta per l'utente

Al primo avvio ACA propone “Prepara questo PC”, controlla i requisiti e mostra l'avanzamento: verifica del computer, acquisizione dei componenti, preparazione del motore, creazione dell'account e disponibilità della casa. Non presenta impostazioni VirtualBox o la dashboard HA.

L'utente deve fornire i dati che dipendono da lui, come account, dati della casa ed eventuali scelte di rete ambigue. Una conferma UAC o un riavvio necessario vengono spiegati da ACA; un rifiuto non produce una falsa installazione riuscita. Non sono necessari account HA preconfezionati o password universali.

Alle aperture successive ACA ritrova il motore della propria installazione e lo avvia soltanto se necessario. Non riscarica il disco iniziale e non ripete la creazione del proprietario. Avvio iniziale, installazione dopo un riavvio Windows e semplice riapertura della finestra sono percorsi distinti.

## Componenti e confini dei privilegi

Proposta: separare UI Electron, coordinatore del motore e piccolo componente di installazione con elevazione temporanea. La UI e i contenuti scaricati non devono essere eseguiti come amministratore. Il componente elevato effettua solo operazioni previste, su pacchetti verificati; non riceve una riga di comando generica dal renderer.

VirtualBox installa componenti di sistema. Il suo MSI richiede privilegi; l'installazione silenziosa non elimina UAC e criteri Windows. Se l'elevazione viene effettuata con un altro account, installare il programma e registrare la VM sotto quell'altro utente sono due operazioni da distinguere. [MSI Oracle 7.2.22](https://github.com/VirtualBox/virtualbox/blob/v7.2.22/src/VBox/Installer/win/VirtualBox.wxs), [UAC Microsoft](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/user-account-control/how-it-works).

La verifica precedente ha rilevato Windows 11 Home, 15,7 GiB e HypervisorPresent true; qui non viene interrogato nuovamente il PC. Quel dato non certifica prestazioni VirtualBox: il percorso Hyper-V/WHP può avere limitazioni e degrado. Il prototipo non deve disabilitare automaticamente protezioni Windows per ottenere un avvio. [Oracle Hyper-V e limiti](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/AdvancedTopics.html).

## Installer VirtualBox e riavvio

Oracle documenta installazioni unattended mediante MSI e proprietà che evitano l'apertura del Manager e i collegamenti non necessari. Il riferimento sorgente esaminato è **VirtualBox 7.2.22**, non una versione già adottata per ACA.

Il profilo minimo va scelto sul lavoro effettivo: binari principali; driver bridge se si usa la LAN in bridge; driver host-only solo per quel profilo; USB solo quando richiesto. I binding VBoxPython non servono per pilotare la CLI da Electron. Eventuali runtime Microsoft richiesti dal pacchetto reale devono rientrare nei controlli preliminari. Non assumere che ogni installer contenga esattamente le stesse dipendenze. [Installazione Oracle 7.2](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/installation.html).

La procedura futura deve distinguere:

| Esito | Interpretazione proposta |
|---|---|
| Successo e verifica del componente riuscita | Può passare alla preparazione della VM. |
| MSI 3010 | Installazione riuscita ma riavvio necessario; checkpoint e ripresa successiva. |
| MSI 1641 | Riavvio già iniziato, non fallimento generico. |
| Annullamento o elevazione negata | Attesa di una nuova azione umana, senza ripetere prompt o procedere. |
| Altro installer in corso / errore | Esito identificabile e recupero della fase, senza retry cieco. |

I codici MSI non vanno trasferiti automaticamente al bootstrapper EXE: nel tag 7.2.22 molti fallimenti vengono ridotti a errore generico. Inoltre `--ignore-reboot` può nascondere il 3010: non è il modo di rilevare un'installazione pronta. La futura procedura dovrebbe rinviare i riavvii automatici, conservarne la necessità e riprendere dopo il riavvio, senza dichiarare eliminato il requisito. [Bootstrapper Oracle](https://github.com/VirtualBox/virtualbox/blob/v7.2.22/src/VBox/Installer/win/Stub/VBoxStub.cpp), [codici MSI](https://learn.microsoft.com/en-us/windows/win32/msi/error-codes), [opzioni Microsoft](https://learn.microsoft.com/en-us/windows/win32/msi/standard-installer-command-line-options).

Se VirtualBox è già presente, rilevare versione, componenti e compatibilità senza sostituirlo automaticamente. Un aggiornamento dell'hypervisor incide anche sulle VM altrui; il fallimento di ACA non autorizza una sua disinstallazione globale.

## Materiali e versioni da verificare

Un futuro manifesto di distribuzione ACA dovrebbe identificare artefatti, provenienza, hash e compatibilità, senza risolvere “latest” a ogni installazione. Verificare il pacchetto completo prima dell'uso e conservarne l'esito; download parziale o estrazione incompleta non sono materiali pronti.

La sola metadata ufficiale letta in questo incarico identifica:

| Materiale candidato | Identità osservata, non acquisita |
|---|---|
| VirtualBox | 7.2.22 indicata da Oracle; installer e firma non scaricati/verificati qui. |
| HA OS | Release 18.4, pubblicata il 2026-10-27. |
| Asset VirtualBox x64 HA OS | `haos_ova-18.4.vdi.zip`, 560.370.635 byte. |
| SHA256 pubblicato dell'archivio HA OS | `e46c3b9bcf437ff56e5905b29e92ebaef4a50dac376eb8d919c29fbcea33b7be`. |
| Core di riferimento ACA | 2026.10.4, da verificare nel motore effettivamente avviato. |

Fonti: [Oracle downloads](https://www.oracle.com/virtualization/technologies/vm/downloads/virtualbox-downloads.html), [release HA OS 18.4](https://github.com/home-assistant/operating-system/releases/tag/18.4), [metadata GitHub dell'asset](https://api.github.com/repos/home-assistant/operating-system/releases/tags/18.4). Il digest è quello pubblicato per lo ZIP: non è un hash del VDI estratto o della VM dopo il primo avvio. Per questo asset non occorre inventare una conversione da qcow2 o una decompressione xz.

**Fissare HA OS non fissa automaticamente Core e Supervisor.** Il primo avvio può acquisire componenti dal canale aggiornamenti; il sorgente Supervisor 2026.10.5 seleziona la versione disponibile per l'installazione. [Installazione Core nel Supervisor](https://github.com/home-assistant/supervisor/blob/2026.10.5/supervisor/homeassistant/core.py).

La proposta conserva Core 2026.10.4 con un controllo della versione effettiva. Se prima della creazione del proprietario arriva un Core diverso, il percorso deve fermarsi con una schermata ACA riconoscibile: non può promettere di aggiornarlo tramite API amministrative non ancora autorizzate. Dopo onboarding e autenticazione amministratore esiste il percorso Supervisor per una versione esplicita, ma non è una giustificazione per installare prima qualsiasi versione o effettuare downgrade automatici. Il confezionamento che garantisca la combinazione iniziale resta da definire e provare.

Base VirtualBox e Extension Pack sono distribuzioni distinte. La base è pubblicata sotto GPLv3; per VM HA OS, headless, VDI ed EFI non emerge una necessità dell'Extension Pack. Non includerlo per abitudine. Nel tag 7.2.22 i dispositivi EHCI/xHCI sono nel codice base GPL: non trasferire vecchie tabelle delle funzionalità a questa versione. Il testo completo PUEL corrente non è stato acquisito, quindi non viene attestato un diritto di redistribuzione dell'estensione. Modalità distributiva, notice e materiali richiesti vanno valutati secondo C-03 del [registro software](../../compliance.md). [EHCI](https://github.com/VirtualBox/virtualbox/blob/v7.2.22/src/VBox/Devices/USB/DevEHCI.cpp), [xHCI](https://github.com/VirtualBox/virtualbox/blob/v7.2.22/src/VBox/Devices/USB/DevXHCI.cpp).

## Creazione della VM senza Manager

Le operazioni VirtualBox necessarie hanno equivalenti CLI: creazione e registrazione, configurazione hardware/rete, dischi, avvio headless e lettura dello stato. È possibile automatizzarle senza clic nella GUI. [VBoxManage 7.2](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/vboxmanage.html).

Il profilo futuro deve fissare firmware EFI, almeno 2 vCPU e RAM adeguata, controller/disco di avvio e rete. HA indica almeno 2 GB per il guest; 4 GB possono essere un profilo iniziale da misurare sul PC, non una garanzia di prestazioni. Non servono Guest Additions per il normale controllo della VM tramite CLI. [Guida HA Windows](https://www.home-assistant.io/installation/windows/).

Preparare una copia di lavoro del disco con identità distinta, verificando le collisioni con dischi già registrati. L'archivio originale resta un materiale di partenza; dopo il primo avvio il VDI contiene dati e non deve essere ricopiato da zero durante un retry. Ogni clone operativo richiede identità proprie, senza cambiare gli UUID dei dischi già in uso.

Il registro del coordinatore conserva identità dell'installazione e dell'utente Windows, UUID VM, percorso canonico .vbox, UUID/percorso dei dischi, MAC e porte assegnate. Una VM omonima, una porta aperta o un HA che risponde non bastano per provarne la proprietà.

VirtualBox usa il registro del profilo che lo esegue. Un registro privato tramite VBOX_USER_HOME è valutabile soltanto nell'ambiente del coordinatore, senza cambiare le variabili globali o la cartella VM dell'utente. Non modificare direttamente gli XML per fare concorrenza al servizio VirtualBox. [Configurazione e profili Oracle](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/Troubleshooting.html).

Lo [storico infrastruttura](../../infrastructure.md) contiene già riferimenti alla VM `acasystem-ha`, con versioni e stato di banco riportati in momenti precedenti. Non è un inventario corrente e non autorizza a convertirla nella VM gestita da ACA. Le vecchie misure di avvio non sono tempi garantiti per il nuovo installer.

## Collegamento locale e rete domestica

L'obiettivo di evitare la ricerca manuale dell'IP richiede un canale di controllo deterministico. Le alternative da confrontare sono:

| Profilo di rete | Cosa risolve | Cosa resta da provare |
|---|---|---|
| Solo bridge | Segue il percorso HA documentato e porta il guest sulla LAN. | Individuazione non ambigua del guest, DHCP, cambio adattatore e Wi-Fi. |
| Solo NAT con inoltro su loopback Windows | Endpoint locale prevedibile e accesso Internet dal guest. | Non sostituisce discovery multicast e collegamenti LAN necessari alle integrazioni. |
| NAT di controllo più bridge LAN | Candidato per unire endpoint ACA locale e partecipazione alla rete domestica. | Routing, interfaccia HA selezionata, annunci/callback e gestione di due NIC. |

Come candidato da collaudare, il coordinatore può configurare inoltri TCP solo su 127.0.0.1 verso la porta effettiva HA e, se mantenuto, server ACA 3002 nel guest. Le porte Windows non devono coincidere necessariamente con quelle guest e vanno assegnate/verificate. Il proxy UI corrente 47320 è un altro endpoint, da non confondere.

**Rettifica documentale 2026-10-30, emersa in U21:** il riferimento precedente a 8123 non è un default universale per una nuova VM. Da 2026.8 le nuove installazioni HA OS usano normalmente 80; installazioni migrate possono conservare 8123, che resta il default Container. Rilevare configurazione/contesto effettivi prima degli inoltri; nessuna porta reale modificata. [HTTP HA](https://www.home-assistant.io/integrations/http/), [Core 2026.10.4](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/http/config.py).

Il secondo adattatore in bridge deve riferirsi alla rete domestica appropriata, senza scegliere alla cieca VPN o adattatori virtuali. Se la scelta è ambigua, ACA può presentare nomi comprensibili nelle proprie schermate; non deve rinviare l'utente alle impostazioni VirtualBox. Nessun port forwarding sul router o bind Windows su tutte le interfacce è richiesto dal solo canale di controllo locale. La presenza del bridge non rende però il guest invisibile alla LAN. [NAT e bridge Oracle](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/networkingdetails.html).

Non basarsi su un IP restituito da Guest Additions presunte presenti o sul primo `homeassistant.local` trovato. Verificare identità e sessione dopo il collegamento. NAT operativo prova il percorso API, non il funzionamento di tutte le integrazioni.

## Configurazione HA nelle schermate ACA

Il client [setup.ts](../../../progetto/client/core/src/setup.ts) contiene già parti del percorso: rileva onboarding, crea il proprietario o autentica un amministratore, completa passi e installa l'add-on ACA con Supervisor. Presuppone però HA già raggiungibile; non prepara VM, installer o driver. Il login attuale non gestisce MFA.

Nel Core 2026.10.4 esistono view per:

- leggere lo stato iniziale con GET /api/onboarding;
- creare una sola volta il proprietario con POST /api/onboarding/users e scambiare il codice con /auth/token;
- completare gli altri passi autenticati; configurare i dati della casa con API appropriate.

Le view di onboarding sono un contratto interno da verificare sul tag, non una promessa pubblica stabile per ogni release. Dopo completamento e riavvio possono non essere registrate: un loro 404 non prova da solo un motore guasto. “VM accesa”, landing page, Core pronto, onboarding necessario e sessione valida sono stati distinti. [View Core 2026.10.4](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/onboarding/views.py), [registrazione onboarding](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/onboarding/__init__.py).

Per la futura verifica della versione prima dell'owner, il messaggio WebSocket auth_required contiene ha_version. Dopo autenticazione, /api/core/state espone stato Core e recorder/migrazioni; Supervisor /info espone stato e versioni, mentre /supervisor/info espone anche healthy/supported senza uno stato globale equivalente. Questi controlli completano il semplice controllo della porta. [Handshake Core](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/websocket_api/auth.py), [stato Core](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/api/__init__.py), [info Supervisor](https://github.com/home-assistant/supervisor/blob/2026.10.5/supervisor/api/root.py).

Il client_id dell'autenticazione deve rispettare il contratto HTTP/HTTPS e la callback coerente; non assumere valido uno schema app:// soltanto perché Electron lo può aprire. Per la ripresa dei passi occorre verificare gli effetti già avvenuti e non ripetere ciecamente una richiesta dopo errore. [Validazione Core](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/auth/indieauth.py).

Il proprietario viene creato dall'utente attraverso ACA; nessuna copia di un disco già configurato con utenti/token condivisi. Password e token non finiscono nel journal o negli argomenti dei processi. MFA, recupero dell'accesso e flussi di integrazione particolari richiedono schermate ACA da realizzare prima di promettere un percorso completo senza UI HA.

Se si conserva il server ACA nell'add-on, il coordinatore può riprendere dal flusso Supervisor esistente e attendere health/compatibilità del frontend. Le API proprie ACA non vengono eliminate per il solo fatto che il motore è locale. Download iniziali e accesso ai registry devono essere previsti: non si promette un'installazione offline con il solo ZIP dell'interfaccia.

Nel Supervisor esaminato convivono API v1 con /addons e /store/addons e API v2 con /v2/apps e /v2/store/apps. Il codice ACA attuale usa la prima famiglia: la futura ricetta deve conservarne una combinazione verificata senza mescolare formati e rotte delle due versioni.

## Procedura riprendibile

Tutti gli stati seguenti sono una proposta; non esiste ancora il relativo coordinatore operativo.

| Stato | Azione futura e condizione per avanzare |
|---|---|
| PVM0 Riconciliazione | Lock del provisioning; journal e risorse osservati sotto la corretta identità. |
| PVM1 Prerequisiti | Architettura, risorse, virtualizzazione, rete e componenti compatibili; niente disabilitazioni automatiche di sicurezza. |
| PVM2 Componenti host | Riutilizzo di VirtualBox compatibile o installazione verificata; eventuale attesa riavvio con ripresa. |
| PVM3 Materiali | Archivi completi e verificati; estrazione controllata, spazio e disco operativo individuati. |
| PVM4 VM predisposta | UUID, disco, hardware e rete corrispondono al profilo posseduto da ACA. |
| PVM5 Avvio e versione | Avvio headless se necessario; endpoint disponibile e versione effettiva compatibile. |
| PVM6 Account e casa | Stato onboarding riletto; dati umani e autenticazione ottenuti dalle schermate ACA. |
| PVM7 Servizio ACA | Add-on se mantenuto, health e frontend compatibili; nessuna seconda istanza del motore. |
| PVM8 Operativo | Ricollegamento UI e sorveglianza; riapertura non ripete l'installazione. |

Ogni fase registra intenzione, risultato osservato e risorse proprie con scritture atomiche. Dopo timeout si osserva prima di ripetere: una risposta persa può nascondere un account creato o un'installazione completata. Il rollback MSI non comprende automaticamente disco, VM, onboarding e dati. [Rollback Windows Installer](https://learn.microsoft.com/en-us/windows/win32/msi/rollback-installation).

| Interruzione | Ripresa proposta |
|---|---|
| Download interrotto | Verificare/riprendere il materiale parziale, senza usarlo come archivio valido. |
| Riavvio dopo driver | Ripartire dal controllo del componente, non dall'inizio della creazione VM. |
| VM già registrata o già accesa | Confrontare identità e stato, evitando duplicati o reset. |
| Risposta onboarding persa | Rileggere lo stato e proseguire con accesso appropriato, senza ricreare utenti. |
| Core inatteso / migrazione / aggiornamento in corso | Fermare l'avanzamento e mostrare diagnosi ACA; non forzare stop o downgrade. |
| Porta occupata | Verificare ownership e assegnazione, senza collegarsi al processo sconosciuto o terminarlo. |
| Mancanza di spazio / permesso | Conservare i dati già prodotti e la fase raggiunta; niente ricopia del disco originario. |

## Gestione quotidiana stop e avvio automatico

Chiudere la finestra, arrestare Core e spegnere tutta HA OS sono operazioni diverse. La politica di X/Esci e continuità resta una scelta aperta dello studio U19. Il coordinatore non deve interpretare uno stop volontario del motore come un crash da annullare con un immediato riavvio.

Per spegnere il guest, il percorso da provare è POST /host/shutdown del Supervisor, autenticato mediante WebSocket Core `supervisor/api` con privilegi appropriati e `force:false`. La caduta della connessione è attesa ma non dimostra da sola VM spenta: verificare lo stato VirtualBox. Il normale proxy HTTP HA non ammette arbitrariamente tutti gli endpoint Supervisor. [WebSocket Core](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/hassio/websocket_api.py), [host API](https://contributors.home-assistant.io/apps/supervisor-api/host/).

Il controllo ACPI è un'alternativa da collaudare, con attesa dell'effettivo arresto. Le operazioni VirtualBox shutdown/reboot che richiedono Guest Additions non possono presumerle presenti; poweroff/reset non sono uno spegnimento gentile e non vanno usati automaticamente come rimedio a ogni timeout. Un semplice stop Core lascia il resto del guest operativo. [Controllo VM Oracle](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/vboxmanage.html).

Avvio della VM quando si apre ACA e avvio del motore prima del login sono requisiti diversi. Oracle documenta autostart Windows per utente con credenziali e vincoli sulle password; documenta anche VBoxSVC in Session 0, disabilitato per default, con modifica di sistema e riavvio. Non è una funzione già predisposta dal normale installer ACA e non viene abilitata qui. Account, registro VM e continuità dopo logout vanno scelti insieme. [Autostart e Session 0](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/AdvancedTopics.html).

Per il primo prototipo è ragionevole proporre installazione e ripresa nella sessione dello stesso utente, senza promettere il pre-login. Un host indipendente rimane un approfondimento separato. In entrambi i casi sleep, ibernazione o PC spento non mantengono operative le automazioni soltanto perché la VM è configurata per l'autostart.

## Dati aggiornamenti disinstallazione

Proposta: file VM e dischi persistenti fuori dalla directory d'installazione e dalla cache frontend, in una posizione locale coerente con l'identità scelta. Un servizio di sistema può richiedere una posizione e permessi diversi da quelli del profilo utente. Non mettere indiscriminatamente il VDI nella directory roaming userData.

Aggiornamenti di ACA, add-on, Core, Supervisor, HA OS e VirtualBox hanno cicli differenti. Prima di un aggiornamento del motore servono backup completato, versione attesa e percorso di ripristino provato. Una snapshot dipendente dallo stesso disco non è un backup indipendente; la copia del solo VDI attivo non garantisce coerenza. [Backup Supervisor](https://contributors.home-assistant.io/apps/supervisor-api/backups/).

Un aggiornamento o reinstallazione ACA non deve inizializzare nuovamente il disco. Come proposta conservativa, la disinstallazione dell'interfaccia conserva dati e metadati del motore per un'eventuale reinstallazione; l'eliminazione completa è un'operazione separata, esplicita e limitata alle risorse proprie. Non eseguire `unregistervm --delete`, rimuovere VirtualBox condiviso o fermare VM altrui come effetto implicito di una chiusura o di un errore.

## Prove future e punto di ripresa

Tutte le verifiche applicative sono **NON ESEGUITE**:

| Prova futura | Risultato da osservare |
|---|---|
| Windows pulito, VirtualBox presente compatibile e versione incompatibile | Percorsi distinti, nessun aggiornamento o rimozione indebiti. |
| UAC negata, altra installazione, reboot richiesto | Ripresa corretta senza duplicazioni e nessun falso completamento. |
| ZIP corrotto, spazio esaurito, interruzione a ogni stato PVM | Materiali rifiutati o ripresa; disco dati preservato. |
| Vecchia VM omonima e più utenti Windows | Nessuna adozione basata sul nome, niente interferenza tra registri o dischi. |
| NAT/bridge, Ethernet/Wi-Fi, VPN e cambio rete | Endpoint ACA corretto e discovery reale, con conferme sui dispositivi campione. |
| Core diverso dal pin e onboarding già completato | Errore riconoscibile o accesso previsto, senza downgrade/reset automatico. |
| Apertura, chiusura, crash, logout e riavvio | Semantica scelta rispettata, motore singolo e intervalli di fermo misurati. |
| Backup, ripristino, update e reinstallazione | Dati HA/ACA recuperabili e versione effettiva verificata. |
| Primo avvio e riapertura con motore attivo | Tempi reali separati; nessuna promessa ricavata dalla sola dimensione del download. |

Prima di costruire l'installer di prodotto occorre una prova isolata del profilo VM e delle sue prestazioni sul PC, soprattutto con l'hypervisor Windows già presente. Poi si potrà verificare il coordinatore sulle interruzioni, senza usare l'impianto o la vecchia VM come banco implicito.

Analisi completata: il percorso senza configurazione manuale VirtualBox e senza UI HA è plausibile, con prerequisiti dichiarati e gestione riprendibile da sviluppare. Restano profilo rete, combinazione iniziale garantita HA OS/Supervisor/Core, ownership per utente o sistema, lifecycle e distribuzione dei componenti. Nessun installer, immagine o pacchetto acquisito; nessun comando VirtualBox, installazione, codice o configurazione modificati. Pin/materiali U11 invariati; iOS rinviato.

