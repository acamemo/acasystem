# Prova locale: ACA sul PC e client QR

**Scenario accantonato con U36, 2026-11-02:** [REP-20261102-001](../../reports/REP-20261102-001-ritorno-mini-pc-e-accesso.md), [ADR-0031](../../decisions/ADR-0031-ritorno-mini-pc-client.md). La direzione corrente torna al mini PC centrale con HA/ACA e client desktop/Android collegati al suo IP. Sorgenti e documentazione sono archiviati nel checkpoint locale; dischi, artefatti ed evidenze VM/VMware restano conservati nei percorsi indicati dal report, senza duplicare i dischi nello ZIP. Nessun rollback applicativo è già stato eseguito. **L'EXE 0.9.31 qui collegato è ancora il checkpoint VM e può avviare il motore locale: non è il client IP ripristinato.** Le istruzioni successive conservano la prova storica VM. Registrazione/accesso nella webapp e mini PC con ACA predisposta restano una raccomandazione da decidere, non una configurazione già adottata.

Aggiornato: 2026-10-30. Consegna di prova per [U27-U30](../diario/2026-10-30.md#u27-lavoro-notturno-e-risultato-windows-vm), [ADR-0029](../../decisions/ADR-0029-desktop-centrale-qr-design-condiviso.md). Evidenze, controlli e limiti in [REP-20261030-009](../../reports/REP-20261030-009-windows-vm-automatica-design-condiviso.md).

**Stato corrente: VM ancora instabile anche dopo aggiornamento e riavvio Windows.** [U33](../diario/2026-10-30.md#u33-aggiornamento-virtualbox-autorizzato) ha autorizzato VirtualBox **7.2.22r175245**, ora installato; [U34](../diario/2026-10-30.md#u34-riavvio-windows-completato) conferma il riavvio host verificato alle 17:28:53. ACA si apre in 53,645 s, ma nei successivi cinque minuti senza sonde compaiono circa 180 s di ritardo dei timer e heartbeat mancante. Il profilo resta **default/KVM, quattro CPU, 4096 MB e HPET spento**, senza lo starter con affinità o None scartati nelle prove precedenti. Nessun nuovo account creato. Sola VM ACA arrestata normalmente: **poweroff confermato alle 17:41:08 Europe/Rome del 2026-10-30**. Gli avvii riusciti non rendono questa consegna una centrale stabile. Diagnosi e punto di ripresa in [REP-20261030-010](../../reports/REP-20261030-010-rallentamenti-vm-windows.md).

**QR web verificato sul banco:** [U32](../diario/2026-10-30.md#u32-browser-quando-lapp-non-è-presente) e [ADR-0030](../../decisions/ADR-0030-qr-web-app-browser.md) aggiungono la web app per iPhone o dispositivi senza ACA installata. Superati 14 passaggi reali sull'EXE e su un browser Electron isolato senza ponte nativo, compresi account, sincronizzazione e copia tramite file. Questo flusso richiede una centrale funzionante. Safari/fotocamera sull'iPhone fisico non sono stati verificati.

## Aprire ACA sul PC attuale

L'eseguibile locale è [Acasystem.exe](../../../progetto/client/windows/release/pc-vm-0.9.31/win-unpacked/Acasystem.exe). Deve restare insieme alle sue cartelle, in particolare `resources/engine`: non copiare il solo EXE.

1. Aprire l'eseguibile. ACA avvia in background la propria VM **ACA System Motore**, attende il motore e presenta le sue schermate.
2. Al primo accesso creare il proprio utente e password e confermare i dati della casa. Tenere ACA aperta durante la preparazione. La prima installazione usa Internet e può richiedere alcuni minuti.
3. Accedere ad ACA con quell'utente. Per associare un altro dispositivo aprire **Sistema → QR Code → Genera QR Code**.

Il PC di questa prova ha VirtualBox **7.2.22r175245**, aggiornato da 7.2.4 su autorizzazione U33. Questa consegna non installa automaticamente VirtualBox su un PC nuovo. Il motore usa quattro CPU virtuali e 4096 MB di RAM, provider configurato default/effettivo KVM e HPET spento. Non avviare contemporaneamente le vecchie VM di banco sulle stesse porte.

L'installer ufficiale Oracle **7.2.22**, con checksum e firma Authenticode validi, è stato eseguito con exit code **0**: nessun riavvio richiesto dall'MSI o pendente nel controllo successivo, configurazioni delle tre VM preservate. Sicurezza e hypervisor di Windows non sono stati disattivati. Il successivo **riavvio completo eseguito dall'utente è già stato verificato e provato in U34**, con esito negativo sui timer; non è richiesto di ripeterlo come rimedio. Un ulteriore confronto controllato del motore è da decidere; nessun altro virtualizzatore o stack è stato adottato. Il flusso descritto riguarda l'app implementata e non promette affidabilità della centrale sul banco attuale.

Chiudere ACA chiude la finestra e lascia il motore in esecuzione. Riaprire ACA riutilizza la stessa VM e i suoi dati. Spegnimento e sospensione del PC interrompono la disponibilità della centrale: la chiusura della sola finestra è un caso diverso. L'avvio automatico è riuscito nelle prove registrate, ma i successivi avvii falliti mantengono aperta l'affidabilità della VM; nessun servizio di avvio prima dell'accesso a Windows è stato introdotto.

Il [pacchetto ZIP](../../../progetto/client/windows/release/pc-vm-0.9.31/Acasystem-PC-VM-0.9.31.zip) contiene la stessa applicazione e il disco iniziale HA OS. Va estratto interamente prima dell'uso. Il disco operativo e il registro della VM sono nel profilo Windows `%APPDATA%/Acasystem/engine`; non nella cartella estratta. Non eliminare questa cartella per aggiornare l'interfaccia.

Il nuovo `Acasystem-PC-VM-0.9.31.zip` è stato rigenerato dopo il ripristino del manager al profilo precedente e controllato con 7-Zip. Per **dimensione e SHA-256 correnti** usare l'identificazione conclusiva in [REP-20261030-010](../../reports/REP-20261030-010-rallentamenti-vm-windows.md#chiusura-e-punto-di-ripresa). Gli hash delle consegne precedenti restano nello storico dei report e non identificano il pacchetto sostitutivo.

Il pacchetto di prova conserva il runtime Electron originale e si apre sul PC attuale. Non ha una firma Authenticode della distribuzione ACA: l'apertura su altri PC con controlli applicativi non è dimostrata. La precedente variante con EXE riscritto dal confezionamento è stata rifiutata da Device Guard; nessuna impostazione di sicurezza Windows è stata modificata. Per rigenerare questa variante locale: build dell'app, `node scripts/prepare-engine.mjs` e `npm run dist:zip` da `progetto/client/windows`, con i materiali iniziali già presenti come descritti nel report.

## iPhone o altro dispositivo senza app

Questi sono i passi del percorso verificato sul banco con browser Electron senza app nativa. La prova con Safari e fotocamera dell'iPhone resta da eseguire; prima serve una centrale disponibile. Identificazione del pacchetto e limiti della VM sono indicati sopra.

1. Lasciare il PC acceso e la centrale disponibile. Il telefono deve poter raggiungere il suo indirizzo privato sulla rete locale.
2. Sul PC, dopo l'accesso ad ACA, aprire **Sistema → QR Code → Genera QR Code**. Inquadrare il nuovo codice con la fotocamera dell'iPhone e aprire il collegamento in Safari. Non serve installare l'APK Android.
3. La pagina ACA presenta due scelte. Il solo caricamento della pagina non usa l'invito; scegliere il percorso desiderato come descritto sotto.

**Collega account:** premere il pulsante e poi accedere ad ACA con lo stesso account usato sul PC, se il browser non dispone già della sessione valida. L'invito identifica la casa e l'utente attesi e non contiene la password. Le modifiche condivise richiedono quell'identità; con un altro account l'app invita a cambiare accesso. La condivisione usa la stessa centrale del PC, non una nuova installazione HA sull'iPhone.

**Importa layout:** usare questa scelta per una copia dell'interfaccia da un'altra persona o casa. Dopo la conferma premere **Scarica il file layout**. Il file `acasystem-layout.aca.json` contiene la copia portabile di layout/aspetto, senza account o binding ai dispositivi del mittente. Non occorre accedere alla casa del mittente.

Per applicare il file, aprire **la propria ACA**, accedere con il proprio account e andare in **Sistema → QR Code → Importa file layout**. Selezionare il file scaricato, massimo **512 KiB**. La propria centrale controlla schema e dati e rimuove nuovamente eventuali collegamenti della casa sorgente. Casa, account e credenziali propri restano invariati; ricollegare i widget ai propri dispositivi. La copia non segue le modifiche successive del mittente. Foto locali e coordinate della sua casa non vengono trasferite.

Un file non leggibile, troppo grande o di formato diverso viene rifiutato; non modificarlo per cambiare account o centrale. Se il QR è scaduto o già usato, generarlo nuovamente sul PC. Ricaricare la pagina dopo che l'invito è stato tolto dall'indirizzo non sostituisce una nuova scansione.

## Tablet o telefono Android

L'[APK di prova](../../../progetto/client/android/android/app/build/outputs/apk/debug/app-debug.apk) è stato generato, ma non installato né collaudato su dispositivo durante questa sessione. Aprendolo senza una casa associata, il flusso predisposto chiede di scansionare il QR mostrato sul PC. La fotocamera si apre dopo l'azione dell'utente e richiede il permesso Android.

Il parser aggiornato del contenitore accetta il nuovo URL web e conserva i QR legacy `acasystem://pair`. L'APK corrente, generato alle 13:21:58 del 2026-10-30, è identificato con il nuovo hash nell'[aggiornamento della scheda Android](02-design-e-qr-client-implementazione.md#aggiornamento-apk-del-2026-10-30-ore-132158); la stessa scheda conserva i dati del precedente APK. Per gli esiti del nuovo lotto fare riferimento a REP-20261030-010. Senza l'app si può usare il percorso browser sopra.

- **Collega account:** usa la casa del PC, richiede l'accesso personale con lo stesso account e condivide le modifiche dell'interfaccia. Non copia la password dal QR.
- **Importa layout:** copia l'aspetto e la disposizione anche dall'account di un amico, senza trasferirne accessi o dispositivi. La casa e l'account del destinatario rimangono i propri; i widget vanno collegati ai propri dispositivi. Non segue le modifiche successive dell'amico.

Se il destinatario non ha ancora una propria casa associata, l'importazione rimane in attesa: serve poi il QR **Collega account** della propria centrale per aprire il layout nella propria casa.

Il primo lotto richiede che il dispositivo raggiunga il PC sulla rete locale. Un QR scade dopo cinque minuti e vale per un uso; generarlo nuovamente per un altro dispositivo. La foto del QR inviata a distanza non abilita l'accesso da Internet. Collegamento fisico Android, fotocamera, rete e possibili filtri del firewall restano da verificare sul dispositivo di prova.

Il trasporto locale attuale è HTTP: l'assenza di password/token HA nel QR non equivale a cifratura delle credenziali durante il normale accesso in rete. Questa estensione non introduce TLS, Cloud o relay.

## Cosa è stato verificato

Prova reale dell'eseguibile con VM dedicata, creazione di un proprietario temporaneo tramite ACA, configurazione della casa, installazione/avvio ACA e accesso alla UI 0.9.31. Generazione e accettazione QR via LAN e rifiuto del riutilizzo; aggiornamenti fra due sessioni Electron separate dello stesso utente. La prova con due sessioni host non sostituisce il collaudo PC–tablet. Il report registra separatamente il ripristino senza l'utente temporaneo e la verifica dell'artefatto finale.

Nell'intervento successivo REP-20261030-010, alcune esecuzioni con quattro CPU/4 GB e provider **None** sono durate oltre 14 minuti e 23 minuti e 54 secondi senza nuove segnalazioni TM catch-up o heartbeat non responsivo. I tempi osservati dall'EXE erano circa **84 secondi da VM spenta** e **2,23 secondi con VM già attiva**. La successiva partenza a freddo None/4 CPU si è però bloccata; HPET acceso ha prodotto tempo guest accelerato e watchdog, None/2 CPU tempo rallentato e catch-up, e il secondo avvio con affinità P-core un heartbeat mancante di circa **52 secondi**. Le prove inizialmente sane restano storico di tentativi scartati, non tempi garantiti o una correzione adottata. Starter e profilo None sono stati rimossi; il manager è tornato alla baseline e il banco al profilo indicato all'inizio.

Dopo l'aggiornamento U33, il modulo proprietario vuoto compare in **59,134 s** e **53,769 s** nelle due partenze da VM spenta; la riapertura a caldo in **2,887 s**. Nessun account creato. Nel primo run **473/473 HTTP 200** e 300 campioni del tempo guest in una finestra distinta di 335,399 s, con rapporto guest/host 0,999973, coesistono con catch-up TM di circa 60 s e heartbeat mancante in idle di circa 30 s. In una finestra di 90,112 s host, Virtual avanza normalmente mentre VirtSync avanza soltanto di 0,036735 s. Nel secondo run, lasciato senza sonde continuative dopo la chiusura di ACA, la lettura di fine finestra a circa 4 min 40 s rende visibili catch-up di **154,576 s** e heartbeat mancante da circa **154 s**; il timestamp della lettura non identifica l'inizio dell'anomalia. Tempi di apertura e risposte HTTP sane non dimostrano corretto funzionamento dei timer.

La prova QoS per il solo worker non è stata applicata: la guardia di identità non passa e Windows nega l'handle con diritto SET_INFORMATION (`0x1200`, errore nativo 5). Nessuna policy modificata, elevazione aggiuntiva o guardia rimossa per forzare il test. Riscontri completi e contesto dei tempi nell'[infrastruttura](../../infrastructure.md#esito-delle-prove-u33-problema-dei-timer-non-risolto) e nel report010. **Esito U33: software aggiornato e prove ripetute; affidabilità della VM ancora non risolta.**

Per l'estensione U32 sono superati **100/100 test frontend su sette file** e **8/8 test backend pairing**, oltre a typecheck frontend e lint pertinenti. Comprendono link privati e 42 URL rifiutati, nessun consumo all'apertura, scelta account prima della sincronizzazione e import file autenticato senza binding del mittente. Dopo il ripristino del manager, anche i controlli finali **Windows 100/100**, strict e build Windows sono superati: questi esiti software non risolvono il problema osservato della VM.

La QA reale QR web ha superato **14 passaggi** sull'EXE confezionato e su un browser Electron isolato senza preload o ponte nativo. I PNG QR account/copia/dopo import sono stati decodificati e confrontati con gli URL attesi. Nessun accept o richiesta HA prima della scelta; login personale e sincronizzazione dei temi/accenti in entrambe le direzioni riusciti. La copia ha scaricato esplicitamente un file layout di **10.730 byte** senza login al mittente; l'import autenticato ha conservato utente, fingerprint OAuth e houseId. Screenshot gate/copia a **390×844** ispezionati. È una prova applicativa sulla centrale del banco, non su due case fisiche. A fine QA storage/cache puliti e checkpoint pre-owner ripristinato; la VM è stata lasciata spenta. Evidenze nel report010. Safari, fotocamera iPhone e collegamento Android fisico restano da collaudare.

Non sono inclusi accesso fuori casa, cloud/relay, HA in esecuzione su Android o un'app iOS nativa. L'uso della web app nel browser è l'estensione U32 descritta sopra. Per design comune e verifiche del client vedere la [scheda dedicata](02-design-e-qr-client-implementazione.md).
