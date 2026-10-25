# ADR-0019 — La configurazione di un widget segue il dispositivo: niente widget nascosti, memoria per dispositivo

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0019 — Un widget non si nasconde più, si elimina; la sua configurazione resta in memoria per (tipo, dispositivo) e torna quando un widget dello stesso tipo viene collegato a quel dispositivo. Il numero è quello che l'indice teneva riservato a questa decisione (ADR-0020 lo cita così); ADR-0015 resta riservata a «Hub e bridge». |
| Stato | **Accettata** (2026-10-23). |
| Data e autore | 2026-10-23. Scheda redatta da Claude Code (`claude-sonnet-5-5`) per l'incarico dell'agente principale che riporta la richiesta dell'utente. |
| Decisore e autorizzazione | Richiesta dell'utente del 2026-10-23, con la schermata della pagina Multimedia dove un widget nascosto lascia due caselle vuote senza «+», come riportata dall'agente principale: «andrei anche a togliere la possibilità di nascondere un widget, anche perché è inutile dato che non esiste un pulsante per nasconderlo, e per andare ad ovviare al problema del widget nascosto, andrei a modificare il modo di salvare i dati, facendo in modo che se venisse eliminato un widget erroneamente, noi salviamo lo stato e all'aggiunta del widget la configurazione fatta su quel dispositivo rimane». Risposte: widget già nascosti = «Eliminati, config salvata»; ripristino = «Al collegamento». Precisazione successiva: «se aggiugno il dispositivo ed è lo stesso, si va bene che viene copiata la configurazione Ma mettiamo caso che un utente vuole avere due widget sullo stesso televisore e vuole avere però altre funzionalità su quello specifico widget rispetto all'altro, però vuole copiare la stessa configurazione. Quello che dobbiamo fare è che se viene messo lo stesso dispositivo, viene configurato automaticamente a quello attuale, ma se l'utente decide di modificare dei parametri, può farlo liberamente, a meno che questi non si vadano a scontrare.» Le tre regole di dettaglio (copia al collegamento, indipendenza dopo la copia, «scontri» = impostazioni del dispositivo) sono state concordate dall'agente principale con l'utente e trasmesse con l'incarico. I criteri di classificazione e i tetti delle sezioni «Decisione» e «Inventario» sono scelte esecutive dell'agente dentro quelle regole e si correggono con una frase dell'utente. |
| Collegamenti | Problemi: [ISSUE-114](../project-status.md#issue-114) (risolto qui). Report: [REP-20261021-003](../reports/REP-20261021-003-interazioni-schermo-intero.md) (annotazione del 2026-10-23), [REP-20261023-002](../reports/REP-20261023-002-studio-pannelli-widget.md) (osservazione sulle impostazioni che descrivono il dispositivo), [REP-20261022-002](../reports/REP-20261022-002-piano-blocchi-thread.md) (il lavoro sopra ISSUE-109 non è disfatto). Decisioni: ADR-0004 (primitive), ADR-0007 (launcher a widget), ADR-0016 (modifica e «Annulla»), ADR-0020 (pannelli per capacità, proposta) e ADR-0021 (configurazione dei dispositivi, proposta) che ne dipendono. |
| Sostituisce / sostituita da | Nessuna. |

## Contesto ed evidenze

**Dove esisteva il nascondere un widget** (verificato nel codice il 2026-10-23):

- **Interfaccia:** una sola voce, l'interruttore «Nascondi il widget» in `WidgetSettingsSheet.tsx` (sezione «Generali»). Nessun pulsante nella barra del widget, nella vista pagine o nel vassoio.
- **Dati:** la lista `hiddenCards` (id dei widget) in `localStorage` (`tunet_hidden_cards`), nello stato `PageContext` (`hiddenCards`, `toggleCardVisibility`, `persistHiddenCards`), nell'istantanea (`layout.hiddenCards` di `collectSnapshot`/`applySnapshot`, quindi nei profili, nel file di esportazione e nella sincronizzazione con il backend) e nell'aggiunta di una scheda (`handleAddSelected` toglieva dalla lista l'id aggiunto di nuovo).
- **Effetto:** `isWidgetHidden` del launcher dava «nascosto» a quegli id. Fuori dalla modifica il widget non si disegnava e la sua posizione restava riservata come casella vuota **senza «+»**: la schermata dell'utente. Il backend non legge il contenuto dell'istantanea (nessun riferimento a `hiddenCards`), che resta un blob JSON entro il limite di 2 MB.

**Come funziona oggi la rimozione.** `removeWidget` del controller toglie solo la posizione dalla disposizione, in ogni classe di dispositivo. Le impostazioni (`cardSettings["pagina::id"]`), il nome e l'icona (`customNames`, `customIcons`, per id del widget) non vengono toccati: restano **orfani**. Anche lo spostamento di un widget su un'altra pagina copia le impostazioni sulla chiave della pagina di arrivo e lascia quella di partenza ([ISSUE-114](../project-status.md#issue-114): dopo «Annulla» resta la voce creata dal trasferimento). Un widget aggiunto di nuovo ha quasi sempre un id nuovo (`…_<ora>`), quindi non ritrova nulla.

**Dove vivono le impostazioni.** Per widget, non per dispositivo: due widget sullo stesso televisore duplicano ogni scelta ([REP-20261023-002](../reports/REP-20261023-002-studio-pannelli-widget.md), «Impostazioni»).

**Cosa non si tocca (dichiarato).** Il **nascondere le pagine** della vista pagine (`LauncherPage.hidden`, l'occhio di `PageOverviewBar`) è un'altra funzione e resta com'è. La **visibilità condizionale** di un widget (sezione «Visibilità condizionale» delle impostazioni, `visibilityCondition`: «Mostra il widget soltanto quando le regole sono vere») non è un interruttore di nascondimento e non è nella richiesta: resta. Con regole false lascia la casella riservata senza «+» come prima; vedi «Questioni aperte».

## Decisione

**Decisione umana accettata (richiesta e risposte citate sopra); i dettagli tecnici sono dell'agente.**

1. **Non si nasconde più un widget.** Tolti l'interruttore, `hiddenCards`, `toggleCardVisibility`, `persistHiddenCards`, il campo dell'istantanea e lo «sconto» in aggiunta. Un widget o è sulla pagina o è eliminato; «Annulla» dopo l'eliminazione funziona come prima (il layout precedente torna e le impostazioni non erano state toccate).

2. **Migrazione al caricamento, idempotente e senza perdita.** Un widget presente nella vecchia lista:
   - esce dalla disposizione (ogni pagina e classe di dispositivo, le pile, le liste `pagesConfig` della compatibilità): le caselle tornano libere con il «+»;
   - se è collegato a un dispositivo, la sua configurazione va nella memoria;
   - se non è collegato (separatore, orologio, un widget ancora da collegare) **non c'è nulla da conservare**: se ne libera soltanto il posto.
   Vale su ogni percorso di persistenza: all'avvio sul contenuto di `localStorage` (prima che lo stato lo legga) e a ogni istantanea che arriva (profilo, file importato, altro dispositivo, sincronizzazione). L'istantanea non porta più `hiddenCards`. Rieseguita, la migrazione non cambia nulla; una vecchia istantanea applicata due volte dà lo stesso risultato.

3. **Memoria per dispositivo.** Chiave: (tipo di widget, dispositivo).
   - **Tipo:** il tipo di categoria (`categoryWidgetType`) o, per i widget aggiunti da un'entità, quello delle regole degli id già in uso (`kindOf`).
   - **Dispositivo:** l'`entity_id` a cui il widget è collegato (la prima entità per i widget di più entità, per esempio più lettori o più calendari); per un widget aggiunto da un'entità, l'entità stessa. Per la stanza l'identificativo del collegamento è l'`area_id`: non è un dispositivo di HA ma lo schema è lo stesso. Un widget senza collegamento non ha chiave e non lascia nulla. Nome e area dei dispositivi in Home Assistant non si toccano mai.
   - **Contenuto:** nome, icona e impostazioni, **mai** posizione né pagina, né il collegamento stesso (il dispositivo è la chiave) né i campi che dicono che cosa è il widget (`categoryWidgetType`, `type`; per la stanza `entityIds` e `areaName`). Un valore di impostazione più lungo di 2000 caratteri (per esempio un'immagine) non si salva.
   - **Quando si salva:** all'eliminazione di un widget (anche di tutta una pagina, e dei membri di una pila) e nella migrazione. Per la sola eliminazione le impostazioni restano al loro posto come oggi, quindi «Annulla» è invariato. Una voce di memoria più recente della stessa chiave non viene sostituita da una più vecchia.
   - **Tetto:** al massimo **100 voci**; oltre, le meno recentemente modificate vengono scartate. Più 400 «orari di ultima modifica». Nell'uso reale sono pochi KB, ben sotto il limite di 2 MB del corpo del backend. Le due scelte sono dell'agente.
   - **Dove vive:** `localStorage` (`tunet_widget_memory`) e campo `widgetMemory` dell'istantanea: segue profili, esportazione e sincronizzazione tra i dispositivi.

4. **Copia al collegamento.** Quando un widget viene collegato a un dispositivo (alla fine dell'aggiunta con un'entità, o quando nelle impostazioni si sceglie il dispositivo di un widget da collegare) e **non è mai stato modificato**:
   - la configurazione presa è la più recente tra quella di un altro widget presente, dello stesso tipo e sullo stesso dispositivo, e quella in memoria per (tipo, dispositivo); a parità vince il widget;
   - «più recente» è l'orario dell'ultima modifica della configurazione (salvataggio di un'impostazione non strutturale, del nome o dell'icona; il collegamento non conta come modifica). Un widget mai modificato dopo questa decisione non ha orario e vale come il più vecchio come sorgente; alla sua eliminazione la voce di memoria vale come modificata in quel momento;
   - i valori che il nuovo widget ha già (per esempio quelli scelti nell'aggiunta) restano; la copia riempie il resto;
   - un widget già modificato non viene toccato (non si sovrascrive il lavoro dell'utente);
   - un avviso breve (`role="status"`) dice «Impostazioni riprese da “nome”»; il nome è quello del widget sorgente o salvato in memoria, altrimenti il nome dell'entità;
   - la voce di memoria non si consuma: una nuova eliminazione la aggiorna;
   - i campi del foglio delle impostazioni ripartono dai valori ripresi.

5. **Dopo la copia i widget sono indipendenti.** La copia è profonda e nessun dato è condiviso: modificare un widget non cambia l'altro. Vale per tutte le impostazioni **del widget**.

6. **Impostazioni «del dispositivo»: un solo valore per dispositivo.** Sono le impostazioni che dicono quali entità di Home Assistant compongono il dispositivo o come raggiungerlo, e i valori predefiniti inviati con ogni comando: due widget con valori diversi si contraddirebbero sullo stesso dispositivo (lo «scontro» della precisazione). Salvata su un widget, un'impostazione del dispositivo viene scritta su tutti gli altri widget **dello stesso tipo sullo stesso dispositivo**; il foglio mostra sotto di esse la scritta «Vale per tutti i widget di questo dispositivo». L'elenco (`DEVICE_SCOPED_SETTINGS` in `utils/launcher/deviceMemory.ts`) è nell'inventario sotto. Il resto è libero.

7. **ISSUE-114 è integrata nello stesso schema.** All'avvio le impostazioni dei widget che non sono più su nessuna pagina (compresa la copia lasciata da uno spostamento o da un suo «Annulla») vengono sistemate: se il widget è ancora su un'altra pagina la copia vecchia si scarta; se non è più su nessuna pagina la configurazione va nella memoria quando il widget aveva un dispositivo, e la voce si scarta se era collegato o conteneva soltanto struttura. Una voce senza dispositivo con impostazioni vere resta dov'è. Si guardano soltanto le pagine di widget e la copertina presenti nella disposizione: le chiavi di altre pagine (`settings::…`, pagine non più esistenti) non si toccano. Gli orari di modifica di widget scomparsi si scartano.

### Inventario delle impostazioni dei widget

Criterio (agente, dentro la regola 3 dell'incarico): è «del dispositivo» ciò che identifica il dispositivo o lo raggiunge, o è un valore predefinito inviato con i comandi; è «del widget» ciò che cambia come un widget appare o che cosa fa per la persona. Nessuna impostazione dei fogli chiama un servizio di HA direttamente.

| Gruppo | Chiavi | Classe |
|---|---|---|
| Identità del widget | nome (`customNames`), icona (`customIcons`), `heading`, `headingAlign`, `appearanceFrame`, `appearanceOpacity`, `variant`, `adaptiveSpacing`, `colSpan`, `heightPx`, `size` | del widget |
| Che cosa mostra e come | `adaptiveControls` (controlli visibili e ordine), `graphStyle`, `showWithSupport`, `showName`, `showIcon`, `showStatus`, `showLastChanged`, `sensorStatusMode`, `sensorStatusText`, `sensorStatusEntityId`, `sensorStatusAttribute`, `scriptStatusText`, `artworkMode`, `imageUrl`, `todayLabel`, `monthLabel`, `subtitle`, `graphHistoryHours`, `adaptiveHistoryHours`, `adaptivePeriod`, `currency`, `decimals`, `climateFavoriteModes`, `activeId` | del widget |
| Che cosa fa al tocco o altrove | `tapAction`, `sensorAction`, `navigateOnTap`, `navigateToPageId` | del widget |
| Visibilità | `visibilityCondition` | del widget |
| Collegamento (struttura) | `categoryWidgetType`, `type`, la chiave di collegamento di ciascun tipo (`bindingEntityId`, `entityId`, `lockId`, `cameraId`, `climateId`, `coverId`, `alarmId`, `mediaPlayerId`, `mediaIds`, `weatherId`, `calendars`, `todoEntityId`, `todayId`, `nordpoolId`, `areaId`, `batteryId`), `entityIds` e `areaName` della stanza | non si copia: è la chiave |
| Entità che compongono il dispositivo | `adaptiveBindings`, `sonosAlarmIds`, `remoteId`, `linkedMediaPlayers`, `roomScripts`, le 12 associazioni dell'aspirapolvere (`batterySensorId`…`mapImageEntityId`), le 20 dell'auto oltre alla batteria (`rangeId`…`updateButtonId`) più `chargingStateId`, `chargingId`, `chargeControlIds` | **del dispositivo** |
| Connessione di una videocamera | `cameraStreamEngine`, `cameraWebrtcUrl`, `cameraGo2rtcMode`, `cameraRefreshMode`, `cameraRefreshInterval`, `cameraMotionSensor`, `cameraCastIds`, `cameraPtz`, `cameraCaptureDirectory`, `cameraRecordDuration` | **del dispositivo** |
| Valori predefiniti dei comandi | `lightTransition` (durata della transizione di accensione), `sonosSleepMinutes` (durata del timer) | **del dispositivo** |

Classificazioni discutibili, decise dall'agente e correggibili cambiando l'elenco: `climateFavoriteModes` (le modalità scorciatoia) è **del widget**, perché è l'esempio di «altre funzionalità su quello specifico widget»; `currency` e `decimals` sono formattazione e restano del widget; l'immagine dell'auto è del widget.

## Alternative e motivazioni

- **Tenere il nascondere e mettere il «+» sulle caselle nascoste.** Scartata: l'utente chiede di toglierlo e osserva che non esiste un pulsante per usarlo.
- **Memoria per id del widget.** Scartata: gli id nuovi hanno un'ora dentro e non ritrovano nulla; l'utente vuole che la configurazione appartenga al dispositivo.
- **Un'unica configurazione per dispositivo letta da tutti i widget (niente copie).** Scartata dalla precisazione dell'utente: due widget sullo stesso televisore devono poter avere funzioni diverse. Costerebbe inoltre la riscrittura di ogni lettore di impostazioni.
- **Copiare anche posizione e pagina.** Scartata dall'incarico.
- **Potare le chiavi orfane a ogni uscita dalla modifica.** Scartata: rischia di cancellare impostazioni durante la finestra di «Annulla». Si pota solo all'avvio.
- **Dichiarare che nessuna impostazione è del dispositivo.** Scartata: lo studio [REP-20261023-002](../reports/REP-20261023-002-studio-pannelli-widget.md) osserva che diverse impostazioni descrivono il dispositivo e sono duplicate, e le due regolazioni predefinite (transizione, timer) agiscono sui comandi al dispositivo.

## Conseguenze

- **Comportamento:** non c'è più «Nascondi il widget»; i widget già nascosti scompaiono e le loro caselle tornano libere con il «+». Aggiungendo un widget per un dispositivo noto, o collegando un widget da collegare, le impostazioni tornano da sole con un avviso. Le impostazioni «del dispositivo» seguono tutti i widget di quel dispositivo; il resto si modifica liberamente.
- **Dati e API:** nuova chiave `tunet_widget_memory`; l'istantanea porta `widgetMemory` e non più `hiddenCards` (un client più vecchio che riceve l'istantanea non trova la lista e non nasconde nulla; un'istantanea vecchia viene migrata da questo). `PageContext` perde `hiddenCards`, `toggleCardVisibility`, `persistHiddenCards` e guadagna `rememberRemovedWidget`, `rememberRemovedPage`, `requestWidgetAdoption`, `widgetMemoryNotice`, `persistWidgetMemory`. Nessuna dipendenza nuova, nessuna modifica al backend.
- **Limiti noti:**
  - Gli orari di modifica usano l'orologio del dispositivo; con orologi molto diversi la «più recente» può sbagliare tra tablet diversi.
  - Un widget già configurato che viene collegato a un altro dispositivo non riprende nulla, e le sue impostazioni «del dispositivo» non vengono allineate agli altri widget finché non le si modifica.
  - Le voci senza dispositivo con impostazioni vere restano tra i dati anche se il widget non c'è più.
  - Dopo «Annulla» la voce di memoria creata dall'eliminazione resta (è uguale al widget tornato).
  - La scritta «Vale per tutti i widget di questo dispositivo» è nei fogli delle impostazioni e nelle etichette dei due cursori (transizione della luce, timer Sonos), non negli altri punti dove una di queste impostazioni potesse comparire.
- **Verifiche:** vedi sotto.

### Questioni aperte (per l'utente)

- La **visibilità condizionale** di un widget può ancora lasciare una casella senza «+» quando le regole sono false. Non era nella richiesta e non è stata toccata. Se va tolta, o se la casella deve mostrare il «+», serve una risposta.
- L'elenco delle impostazioni «del dispositivo» è una classificazione dell'agente; si cambia in un punto solo.

## Verifiche e revisione

- **Eseguite il 2026-10-23** (cartella `progetto/acasystem/frontend`, Vitest con `--maxWorkers=4`, mai la suite completa, nessun browser, nessun tablet): `DeviceMemory.test.ts` (30 test: chiave, contenuto, tetto, lettura, copia dalla memoria e da un altro widget con la regola del più recente, indipendenza, impostazioni del dispositivo, migrazione dei nascosti, idempotenza, vecchi dati, ISSUE-114), `WidgetMemoryProvider.test.tsx` (avvio, istantanea in arrivo, eliminazione e collegamento sullo stato vero, impostazione del dispositivo), un test in `LauncherScreen.test.tsx` per l'eliminazione con «Annulla», uno per l'avviso e due in `SystemSheets.test.tsx`; `tsc`, `eslint`, `lint:typography`, `lint:theme-colors`. Esiti e comandi: annotazione del 2026-10-23 in [REP-20261021-003](../reports/REP-20261021-003-interazioni-schermo-intero.md).
- **Non eseguiti:** suite completa, `build`, prova sul tablet o in un browser, sincronizzazione reale tra due dispositivi, un profilo vero con widget nascosti.
- **Revisione se:** l'utente cambia la classificazione delle impostazioni del dispositivo; si decide la sorte della visibilità condizionale; l'elenco dei tipi di widget o delle impostazioni cambia (ADR-0020 sposta le impostazioni nei pannelli per capacità).
