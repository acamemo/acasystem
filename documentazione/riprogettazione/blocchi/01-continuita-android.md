# Blocco 1 Home Assistant con ACA chiusa e schermo spento

Aggiornato: 2026-10-29. Fonte umana: [U16](../diario/2026-10-29.md#u16-continuita-con-aca-chiusa-e-schermo-spento). [Ingresso](../README.md), [report](../../reports/REP-20261029-017-continuita-ha-android.md).

L'obiettivo è lasciare Home Assistant attivo quando si esce dalle schermate ACA o si spegne il display. È tecnicamente plausibile ospitando il motore in un servizio Android, ma non è una proprietà del client attuale né una continuità già dimostrata sul Lenovo Tab M11. Stop da App attive, Arresto forzato dalle impostazioni e spegnimento del tablet interrompono il motore locale; sono diversi dalla normale uscita dalle schermate ACA.

**Precisazione umana del 2026-10-30, [U17](../diario/2026-10-30.md#u17-app-normale-senza-kiosk):** ACA deve aprirsi e chiudersi come un'app normale, senza kiosk, senza obbligo di restare visibile e senza mostrare l'interfaccia HA. Decisione in [ADR-0027](../../decisions/ADR-0027-app-normale-senza-kiosk.md). Il servizio del motore non implica un tablet a uso esclusivo. La possibilità di un avvio più lento non fissa tempi; la proposta è ricollegare la UI al motore già attivo, evitando di confondere ogni riapertura con un nuovo avvio completo di HA. Implementazione e prestazioni restano non verificate.

Il riepilogo semplice [A15](../diario/2026-10-29.md#a15-riepilogo-del-funzionamento-desiderato) descrive il risultato desiderato: una sola app installata, UI ACA e Core sullo stesso tablet, Linux sul PC soltanto per preparare i componenti. Non attesta un porting completato o l'eliminazione di tutte le responsabilità del server ACA. Restano [frontend HA presente ma nascosto](../../decisions/ADR-0026-frontend-ha-presente-nascosto.md) e [baseline Python/dipendenze](01-host-linux-build-riproducibile.md) invariati.

## Che cosa significa chiudere ACA

La tabella descrive il comportamento da perseguire in una futura app con motore incorporato; non il comportamento oggi implementato.

| Azione o evento | Effetto previsto sul motore | Condizione o limite |
|---|---|---|
| Home, altra app o uscita dalla schermata ACA | HA dovrebbe continuare. | Il motore appartiene a un servizio avviato, indipendente dalla vita della UI. |
| Display spento o blocco dello schermo dopo aver già sbloccato il tablet | HA dovrebbe continuare. | CPU e rete devono restare disponibili nelle condizioni energetiche reali. |
| Rimozione della scheda ACA dai recenti | Il servizio può continuare. | Non va collegato all'eliminazione del task; comportamento Lenovo da provare. |
| Stop da “App attive” Android | HA si ferma insieme all'app. | È distinto dalla semplice rimozione dai recenti. |
| “Arresto forzato” dalle impostazioni | HA si ferma. | Non prevedere riavvii automatici per aggirare lo stop umano. |
| Processo terminato dal sistema o crash | Interruzione, eventuale recupero successivo. | Recupero senza tempo garantito; non equivale a continuità. |
| Tablet spento, batteria esaurita o riavvio | HA non opera durante l'interruzione. | Avvio successivo e primo sblocco richiedono una progettazione separata. |
| Wi-Fi perso | Il processo può restare vivo, ma i dispositivi su quella rete non sono raggiungibili. | Provare riconnessione e riallineamento dello stato. |

Android distingue la rimozione del task dallo stop del servizio: `stopWithTask` e `onTaskRemoved()` governano quel rapporto. `START_STICKY` permette al sistema di tentare la ricreazione dopo una terminazione, senza promettere un recupero immediato. [API Service](https://developer.android.com/reference/android/app/Service#onTaskRemoved(android.content.Intent)), [START_STICKY](https://developer.android.com/reference/android/app/Service#START_STICKY).

Da Android 13, Stop in “App attive” rimuove l'intera app dalla memoria senza callback; job e allarmi già pianificati possono invece restare. Non è il package stopped state. Su Android 15 l'arresto forzato mantiene quello stato fino a un'azione diretta o indiretta dell'utente e cancella i PendingIntent. Per il progetto il ritorno ordinario dopo force stop sarà riaprire ACA; non attribuire questa stessa regola a tutti gli altri tipi di terminazione. [Stop da App attive](https://developer.android.com/develop/background-work/services/fgs/handle-user-stopping), [stato stopped Android 15](https://developer.android.com/about/versions/15/behavior-changes-all#changes-to-package-stopped-state).

## Separare il motore dalla schermata

La proposta è ospitare Python e HA in un servizio Android avviato e portato in foreground mentre l'utente avvia il motore da ACA. Un servizio soltanto legato alla UI non soddisfa l'obiettivo. È da valutare un processo dedicato al motore per separare memoria e guasti dalla WebView; un processo separato nello stesso pacchetto non rende HA immune allo stop dell'app.

Il servizio richiede una notifica di attività, ad esempio “ACA: motore domotico attivo”. “Foreground” indica lavoro riconoscibile dall'utente, non l'obbligo di tenere aperta la schermata ACA. Il frontend HA può restare nascosto secondo ADR-0026; questo non implica nascondere lo stato del servizio ad Android o all'utente. [Foreground services](https://developer.android.com/develop/background-work/services/fgs).

L'avvio iniziale mentre ACA è visibile è il percorso da valutare per primo. Android 12 e successivi limitano l'avvio di un nuovo foreground service dal background, salvo eccezioni. Un controllo periodico o un processo separato non devono essere presentati come soluzione universale per rilanciare il motore. [Restrizioni di avvio](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start).

Il progetto dovrà prevenire istanze HA duplicate, conservare i dati e distinguere arresto volontario, crash e perdita della rete. La riapertura di ACA dovrà collegarsi al motore già attivo. Sono proposte esecutive per un futuro incarico, non codice aggiunto o nuove funzioni approvate.

## Schermo spento, CPU e rete sono problemi diversi

Un foreground service non mantiene automaticamente sveglia la CPU. Un partial wake lock può mantenerla attiva a display spento, con consumo da misurare. Per HA, che attende timer ed eventi di rete anche durante l'inattività, non basta proteggere soltanto i pochi secondi di un comando: occorre valutare come rendere eseguibile l'intero periodo di servizio desiderato. Non assumere che il loop Python risvegli autonomamente Android. [Distinzione ufficiale FGS e wake lock](https://android-developers.googleblog.com/2026/03/battery-technical-quality-enforcement.html), [uso dei wake lock](https://developer.android.com/develop/background-work/background-tasks/awake/wakelock).

Doze limita CPU e rete quando il dispositivo è inattivo, a batteria e con display spento. In assenza di esenzione ignora i wake lock e sospende la rete. Un foreground service evita alcune condizioni di App Standby, ma non costituisce una generale esenzione da Doze. L'allowlist delle ottimizzazioni batteria permette rete e partial wake lock durante Doze, lasciando altre restrizioni. Verificare l'esenzione effettiva, senza equiparare qualsiasi voce “senza restrizioni” del firmware alla relativa API. [Doze e App Standby](https://developer.android.com/training/monitoring-device-state/doze-standby).

Esiste anche Low Power Standby: se abilitato può disabilitare rete e ignorare wake lock anche per app con servizio foreground mentre il tablet non è interattivo. Stato ed esenzione sono interrogazioni distinte da quella per Doze. Non abbiamo verificato se il firmware M11 lo supporti o lo abiliti. [PowerManager isLowPowerStandbyEnabled](https://developer.android.com/reference/android/os/PowerManager#isLowPowerStandbyEnabled()), [esenzione Low Power Standby](https://developer.android.com/reference/android/os/PowerManager#isExemptFromLowPowerStandby()).

Alimentare il tablet facilita l'uso come hub fisso e normalmente evita Doze a batteria; non dimostra da solo continuità contro crash, pressione di memoria, restrizioni ulteriori o scollegamento del caricatore. Le prove devono includere entrambi i regimi. [Gestione energetica AOSP](https://source.android.com/docs/core/power/platform_mgmt).

Un lock CPU non prova la raggiungibilità Wi-Fi. Discovery multicast e Bluetooth richiedono prove proprie: un MulticastLock evita il filtro multicast, non ogni sospensione; le scansioni BLE senza filtri sono sospese a schermo spento. Non introdurre lock radio permanenti prima di averne verificato la necessità per le integrazioni scelte. [MulticastLock](https://developer.android.com/reference/android/net/wifi/WifiManager.MulticastLock), [BluetoothLeScanner startScan](https://developer.android.com/reference/android/bluetooth/le/BluetoothLeScanner#startScan(android.bluetooth.le.ScanCallback)).

## Il tipo di servizio va scelto sul lavoro reale

Con il target SDK 36 già configurato, il progetto deve rispettare i tipi di servizio richiesti dalle versioni Android applicabili.

- `connectedDevice` è un candidato per interazioni con dispositivi esterni via rete/Bluetooth/USB, con i prerequisiti relativi.
- `specialUse` è un candidato soltanto per un caso valido non coperto dagli altri tipi; richiede permesso e descrizione del sottotipo, sottoposta a revisione se pubblicata su Google Play.
- Non scegliere `dataSync` come etichetta generica per HA sempre attivo. Su Android 15 e successivi, per target almeno 35, ha sei ore complessive in 24 ore durante il background; un ritorno dell'app in foreground azzera il contatore. `mediaProcessing` ha il proprio limite separato; `shortService` dura circa tre minuti.

Fonti: [tipi e requisiti](https://developer.android.com/develop/background-work/services/fgs/service-types), [timeout](https://developer.android.com/develop/background-work/services/fgs/timeout). Il limite di sei ore non riguarda tutti i servizi. L'assenza di quel timeout per un altro tipo non equivale a una garanzia H24; non è stato selezionato o implementato un tipo per ACA.

WorkManager serve a lavoro pianificabile e differibile: non costituisce, per questa architettura, un sostituto del processo HA che deve reagire continuamente. Anche gli allarmi Android non sostituiscono automaticamente timer ed eventi interni di HA. È una valutazione del requisito di continuità; Doze rinvia anche job e allarmi ordinari. [Restrizioni energetiche](https://developer.android.com/topic/performance/power/power-details).

## Riavvio e primo sblocco

Riaccendere il tablet e spegnere soltanto il display sono due casi diversi. Dopo un riavvio, lo storage ordinario protetto dalle credenziali diventa disponibile al primo sblocco. Le app non funzionano per impostazione predefinita in Direct Boot. Per la prima eventuale prova si propone di assumere lo sblocco iniziale umano; l'esecuzione di HA prima dello sblocco richiede una scelta specifica sui componenti e sui dati accessibili. Il blocco successivo del display non ripete il primo sblocco del riavvio. [Direct Boot](https://developer.android.com/privacy-and-security/direct-boot).

Un eventuale receiver di avvio richiede permessi e gestione del servizio appropriati. Su Android 15, per target almeno 35, il receiver BOOT_COMPLETED non può avviare, fra gli altri, servizi `dataSync`; non esiste un divieto identico per ogni tipo. Il progetto attuale non ha questo receiver. [Restrizioni Android 15](https://developer.android.com/about/versions/15/behavior-changes-15#restrictions-on-boot_completed-broadcast-receivers-launching-foreground-services).

Dopo un'interruzione, riconnettere i dispositivi e ricaricare le automazioni non prova che gli eventi persi vengano recuperati. La proposta richiede di registrare il vuoto di servizio e verificare il comportamento delle automazioni selezionate. Non promettere l'esecuzione retroattiva universale.

## Stato del client verificato in lettura

Il [manifest dell'app](../../../progetto/client/android/android/app/src/main/AndroidManifest.xml) contiene due Activity, un FileProvider e il solo permesso INTERNET; non dichiara un servizio HA, un receiver di boot o permessi per foreground service/wake lock. [variables.gradle](../../../progetto/client/android/android/variables.gradle) imposta min SDK 26 e compile/target SDK 36. Il [build dell'app](../../../progetto/client/android/android/app/build.gradle) non incorpora il runtime Python/HA proposto.

[UiActivity.onDestroy](../../../progetto/client/android/android/app/src/main/java/it/acasystem/client/UiActivity.java) distrugge la WebView. Questo non è l'host persistente di un HA locale; il proxy Java attuale non va confuso con il motore domotico. Nessuna build o analisi del manifest finale unito è stata eseguita qui.

Android 15/4 GB del Tab M11 restano dati storici da verificare sul dispositivo reale. Non sono stati letti ADB, impostazioni batteria, processo, firmware o log del tablet durante questo incarico.

## Come dimostrare la continuità in un futuro incarico

Questa matrice è proposta dall'assistente; tutte le prove sono **NON ESEGUITE**. È successiva alla disponibilità di un runtime e di una build di prova: il [preflight Linux P0-P4](01-preflight-generazione-c-cryptography.md) da solo non verifica nessuna di queste condizioni Android.

Prima delle prove identificare versione/firmware, ABI/RAM disponibili, tipo FGS e permessi, stato delle esenzioni Doze e Low Power Standby, alimentazione e integrazione campione. Raccogliere orari sincronizzati, avvio del processo HA, memoria/CPU, temperatura/consumo, stato rete e uscite del processo.

| Prova futura | Cosa osservare | Criterio proposto |
|---|---|---|
| UI chiusa con Home/Back, poi rimozione dai recenti | Automazione a orario ed evento da dispositivo reale mentre la UI resta assente. | Entrambi operano; riaprire ACA ritrova un solo motore. |
| Display spento in carica, 24 ore | Comandi/risposte e automazioni distribuiti nell'intervallo, processo e dati. | Nessun vuoto inspiegato; nessuna dipendenza dal riaccendere il display. |
| Display spento a batteria, almeno una notte | Stessi stimoli, sonno naturale/Doze, consumi e temperatura. | Ogni evento previsto ha un esito misurato; autonomia compatibile con l'uso concordato. |
| Doze e, se disponibile, Low Power Standby controllati | CPU, rete locale e automazioni con esenzioni osservate. | Nessuna falsa equivalenza tra processo vivo e motore operativo. |
| Wi-Fi interrotto e ripristinato | Perdita, riconnessione e stato reale dei dispositivi. | Recupero misurato, niente duplicati o vecchi stati presentati come attuali. |
| Pressione memoria/crash di prova | Motivo di uscita, intervallo di fermo, dati e riavvio consentito. | Interruzione esplicita, dati coerenti e una sola istanza dopo il recupero. |
| Stop App attive e force stop separati | Arresto del motore e successiva riapertura volontaria. | Lo stop umano funziona; nessun aggiramento o confusione tra i due stati. |
| Riavvio prima e dopo primo sblocco | Accesso dati, eventuale avvio e disponibilità reale HA. | Limite prima dello sblocco e tempo di ripresa documentati. |
| Ripetizione estesa per 7 giorni | Tutti gli eventi pianificati, uptime, RAM/energia e integrazioni campione. | Nessuna perdita inspiegata; collaudo limitato alla configurazione osservata. |

Per la prima integrazione locale si può proporre una soglia di risposta di 5 secondi all'evento campione; è un criterio da concordare, non uno SLA o una garanzia per tutte le integrazioni. La traccia deve includere l'evento atteso, quello ricevuto da HA e la conferma del dispositivo. Vedere la schermata aggiornata soltanto dopo averla riaperta non prova l'esecuzione durante il sonno. Un PC osservatore durante il collaudo raccoglie evidenze e non ospita il backend.

Le prove con sonno forzato e quelle con inattività naturale restano distinte. Una connessione USB che ricarica il tablet altera la condizione a batteria; il collaudo naturale deve controllare anche questo fattore. Non è stato impartito alcun comando diagnostico al dispositivo.

## Valutazione e punto di ripresa

Il risultato desiderato è **UI chiudibile e display spegnibile, con motore ancora operativo**. Richiede host Android, tipo di servizio corretto, gestione energetica/rete e collaudo del firmware reale; non segue automaticamente dal successo della compilazione di Python o dei due pacchetti.

Se il tablet è l'unico host, le automazioni eseguite da HA dipendono dalla sua disponibilità. Eventuali programmi già autonomi nei dispositivi hanno un comportamento proprio e vanno distinti da quelli eseguiti da HA. Uno stop o una batteria esaurita non rende indistintamente inutilizzabile ogni dispositivo, ma interrompe il lavoro del motore locale.

Analisi completata; nessuna installazione, modifica al codice, configurazione Android o prova eseguita. Nessuna garanzia H24 o nuova architettura approvata. Proseguire dalle domande dell'utente; preparazione Linux/P0-P4 e implementazione mobile restano non avviate.

