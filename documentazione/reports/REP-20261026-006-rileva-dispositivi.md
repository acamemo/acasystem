# REP-20261026-006 — Widget «Rileva dispositivi»: classificazione e dispositivi scoperti

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261026-006, widget «Rileva dispositivi» (REQ-19) |
| Stato | In corso |
| Data | 2026-10-26 (sera), Europe/Rome |
| Autore / modello | Claude Code, `claude-opus-5-5` |
| Commit di partenza | `aa6dae3` su `master` (= `origin/main`) |
| Richiesta di riferimento | «Se riusciamo a rilevare i dispositivi, sarebbe carino e opportuno realizzare nei widget un widget specifico chiamato rileva dispositivi, che rileva i dispositivi attorno a te e già te li classifica secondo quale widget dovrebbero appartenere. Ad esempio, se rileva un televisore, automaticamente te lo va ad assegnare come disponibile da allegare a un widget televisore, in modo tale che poi si deve solo configurare senza andare a cercare il dispositivo specifico. […] Quindi io lavorerei su questa compatibilità per ogni dispositivo, andiamo in modalità /plan» |
| Autorizzazione | Piano approvato dall'utente il 2026-10-26 (`ExitPlanMode`, piano «Rileva dispositivi»). Risposte alle domande del piano: «Entrambi, a fasi (Recommended)»; «Tutti, aggiunta libera»; famiglie «TV (LG, Samsung, Android/Google TV), Luci e prese, Clima e sensori». |

## Obiettivo e perimetro

**Che cosa nasce:** un widget «Rileva dispositivi» che:
- elenca i dispositivi disponibili intorno all'impianto;
- li classifica secondo il widget a cui appartengono (TV, luci, prese, clima, sensori…);
- fa nascere il widget giusto già collegato al dispositivo.

**Origine.** Prova a casa con la copia della VM sulla rete di casa (ISSUE-120): la TV Samsung non compariva perché Home Assistant (HA) la tiene tra i dispositivi «scoperti», in attesa di conferma, e Acasystem oggi non li legge.

**Fasi:**
- **F1:** dispositivi già presenti in HA ma non ancora usati da un widget. Solo frontend.
- **F2:** dispositivi scoperti da HA in rete e non ancora aggiunti. Server, con l'identità di servizio di ADR-0022, più interfaccia.
- **F3:** accompagnamento all'abbinamento per famiglia: TV, luci e prese, clima e sensori.

**Vincoli:**
- nessuna scansione propria di Acasystem (REP-20261023-003): la scoperta resta solo di HA;
- il cliente può aggiungere qualunque dispositivo scoperto ([ADR-0024](../decisions/ADR-0024-aggiunta-libera-dispositivi-scoperti.md));
- passi che Acasystem non sa mostrare (OAuth/`external`, codici Matter): «Richiede l'installatore».

**Collegamenti:**
- requisiti e decisioni: REQ-19 (nuovo), REQ-18, ADR-0021, ADR-0022, ADR-0024;
- report: REP-20261023-001 (diagnosi del rilevamento) e REP-20261023-003 (tappe D3 e D4: D4 confluisce in F2-F3);
- registro dei problemi: ISSUE-120.

**Modifiche preesistenti da preservare:**
- Il codice D1 (`/api/dispositivi`, `templates/devices/`, `api/devicesApi.ts`) è nell'albero ma **non committato**, ed è di un altro flusso.
- Ci sono modifiche non committate anche in `templates/sheets/AddWidgetSheet.tsx` e in altri file del frontend (0.9.29-0.9.31).
- Si toccano solo i punti dell'incarico; F2 parte dopo la decisione sul commit di D1.

## Criteri di completamento

1. **F1:**
   - classificatore puro con test;
   - elenco dei dispositivi già in HA non collegati a widget;
   - widget «Rileva dispositivi» nel foglio «Aggiungi un widget»;
   - un tocco su un dispositivo apre «Aggiungi un widget» sul tipo giusto con il dispositivo già scelto.
2. **F2:**
   - `GET /api/dispositivi/scoperti`, `POST …/aggiungi` e `POST …/ignora`, con l'identità di servizio, registro delle azioni e test con l'HA finto;
   - sezione «Trovati in rete» con «Aggiungi» e «Non mi interessa».
3. **F3:** testi e prove con l'HA finto per `webostv`, `samsungtv`, `androidtv_remote`, `cast`, `hue`, `shelly`, `tplink`, `wiz`, `yeelight`, `lifx`, `nanoleaf`, `homekit_controller`.
4. **Prova reale a casa** (copia della VM a ponte): le due LG già in HA in «Pronti da aggiungere», la Samsung in «Trovati in rete», poi aggiunta con «Consenti» sulla TV e widget TV collegato.
5. **Controlli:** typecheck strict, ESLint, controlli di tipografia e colori, suite del frontend e del backend; documenti e `verification.md` aggiornati.

## Avanzamento e modifiche

**2026-10-26, F0.** Scritti:
- questo report;
- REQ-19 e AC-19 in `product.md`;
- ADR-0024;
- annotazioni su ADR-0021, ADR-0022 e REP-20261023-003;
- righe negli indici, `project-status.md`.

**2026-10-26, commit di D1.** Su richiesta dell'utente («fai un commit separato del codice D1 […] così F2 parte da lì»), creato il commit `603b023` «feat: device facade and add-device flow from Acasystem (D1)». Non inviato su GitHub.
- **Contenuto (69 file):**
  - le patch di `backup/d1/patch/` (server 41 file, frontend 24), applicate all'indice e non dalla copia di lavoro. Nei 9 file condivisi le modifiche di lavoro coincidevano con le patch;
  - il test `devicesComposeSecret.test.ts`;
  - dal compose, le sole righe del volume del segreto;
  - REP-20261023-003 senza l'annotazione D4 di stasera.
- **Verifica del contenuto da solo** (esportato con `git checkout-index` in una cartella separata):
  - backend: typecheck superato, 30 file, 428 test superati, 1 saltato;
  - frontend: typecheck strict superato, 11 file di test dei dispositivi e della TV, 168 test superati.

**2026-10-26, F1 (codice scritto da un subagente Claude Code con modello Sonnet, controllato dall'agente principale).** Nessun commit.
- **File nuovi:**
  - `utils/devices/classify.ts`: classificatore e tabelle `PLATFORM_FAMILY`, `TV_PLATFORMS`, `SERVICE_PLATFORMS`, `FAMILY_WIDGET_TYPE`;
  - `utils/devices/bound.ts`: dispositivi già usati dai widget;
  - `components/widgets/utilities/discover/`: widget e dettagli;
  - `hooks/launcher/AddWidgetRequestContext.tsx`.
- **File modificati:** `AddWidgetSheet.tsx` (prop `initialSelection`), `catalog.ts` (tipo `rileva`, categoria Utilità), `cardActions.ts`, `categoryPages.ts`, `cardUtils.ts`, `LauncherScreen.tsx`, `LauncherContext.tsx`, `WidgetDesignGallery.tsx`.
- **Scelte esecutive:**
  - **contesto nel livello hooks:** le regole di livello vietano ai widget di importare dai fogli;
  - **presa → «Sensori e comandi»:** non esiste un tipo «Comandi» separato;
  - **Cast con classe speaker/receiver → «Lettori multimediali»**, non TV.
- **Effetto collaterale da sapere:** il tipo nella categoria Utilità aggiunge un segnaposto in più alle pagine di categoria nuove. I conteggi di due test sono passati da 25 a 26. `categoryDefaultsVersion` non è stato alzato: gli impianti esistenti non lo ricevono da soli.
- **Controlli dell'agente principale** dopo la fine del subagente: typecheck strict, ESLint, tipografia (0 su 545 file), colori (0 su 359), **suite completa 213 file, 3252 test superati**.
- **Non provato:** il tocco nell'app vera e la lettura dei registri da un HA reale.

**2026-10-27, F4 approvata: parità del cliente con il sistemista.** Approvazione dell'utente: «Approvo F4: niente liste per il cliente, moduli generici dallo schema di HA, passi esterni (accesso al cloud), aiuti come «Fai lampeggiare» e «Rimuovi dispositivo». L'assistenza a distanza la decidiamo dopo. Prima finiamo la prova con la Samsung.» Il punto 5 (assistenza a distanza) **non** è approvato. Ordine: prima la prova con la Samsung, poi F4. Origine: decisione dell'utente annotata in ADR-0024 («permettere all'utente a casa, tramite gli stessi passaggi che fa il sistemista, di poter fare tutte le configurazioni che vuole»).

Proposta dell'agente:
1. **Nessuna lista per il cliente:**
   - i gestori avviabili dal catalogo (D3) e quelli scoperti valgono per tutti;
   - via `CUSTOMER_STARTABLE_HANDLERS` e il rifiuto «gestore sconosciuto» di F2;
   - va annotato ADR-0022 b1 per intero.
2. **Moduli generici:** i passi dei flussi si disegnano dallo schema che manda HA (`data_schema`: testo, numero, scelta, interruttore, password), non da regole scritte a mano per ogni gestore. Le regole attuali di `flowInput.ts` restano come rifinitura dei testi.
3. **Passi oggi impossibili:**
   - `external` (accesso al cloud del produttore, OAuth): si apre la pagina del produttore e poi si torna nell'app;
   - `menu` e `progress`: si mostrano;
   - Matter: resta da studiare (serve il codice e spesso il Bluetooth del telefono).
4. **Buon senso aiutato, non imposto:**
   - dove il dispositivo lo permette, «Fai lampeggiare» prima di confermare;
   - nome, marca e modello ben visibili;
   - «Rimuovi dispositivo» per tornare indietro (tappa D6).
5. **Assistenza a distanza (idea collegata, da decidere a parte):** il sistemista vede la stessa schermata del cliente dal suo PC e lo guida senza muoversi. È l'obiettivo dichiarato dall'utente: niente uscite per configurazioni semplici.
6. **Versioni di HA:** aggiornare l'elenco delle versioni provate (oggi 2026.9.4) con la 2026.10.x dopo le prove. Senza questo, su un mini PC appena installato le funzioni D1 restano spente.

**2026-10-27 notte, prova reale con la TV Samsung (copia `acasystem-ha-s45` a ponte sulla rete di casa, HA 2026.10.4, Acasystem locale su `127.0.0.1:3007`).**

1. **Widget e F1 nell'app vera.** «Rileva dispositivi» si aggiunge dal foglio: è in fondo all'elenco e va trovato scorrendo, rilievo per ISSUE-118. Mostra «2 dispositivi da aggiungere», le due LG rimaste nella memoria dell'istantanea, con «+» per il widget TV. Senza servizio la sezione «Trovati in rete» dice «Servizio non attivo».
2. **Attivazione del servizio.** La prima prova è stata rifiutata: «La versione 2026.10.4 di Home Assistant non è stata né provata né confrontata con Acasystem». Per la sola copia di prova si è usato `DEVICES_ALLOW_UNVERIFIED_HA_VERSION=1`, poi l'utente ha attivato il servizio dal proprio terminale. Registro del server: «flows on».
   - **Conseguenza [valutazione]:** su un mini PC appena installato HA è sempre l'ultima versione, quindi l'elenco delle versioni provate va aggiornato (F4 punto 6).
3. **Difetto trovato e corretto.** Su HA 2026.10.4 `GET /api/config/config_entries/flow` risponde **405**. La lista dei flussi va letta con il comando WS `config_entries/flow/progress`, che risponde: provato con l'accesso del servizio.
   - Corretti `haAdapter.ts` (`flowsInProgress` passa nell'API WebSocket), `deviceService.ts`, il catalogo delle chiamate (`flowList` diventa WS) e l'HA finto: GET 405 e comando WS.
   - Esito: test del server 31 file, 464 superati, 1 saltato; lint pulito.
4. **Rete della VM.** Dopo il passaggio da NAT a ponte, la ricerca zeroconf di HA usava ancora l'indirizzo NAT `10.0.2.15` («Network unreachable»). Corretto con `ha network reload` e il riavvio di Core.
5. **Perché la Samsung non diventa «scoperta».**
   - HA riceve gli annunci SSDP della TV (registro di debug `ssdp.scanner`: `urn:samsung.com:device:RemoteControlReceiver:1` da `192.168.1.10`).
   - La scheda descrittiva indicata dalla TV (`http://192.168.1.10:7676/rcr/`) va in timeout sia dalla VM sia dal PC, quindi HA non legge il produttore e non apre il flusso `samsungtv`. L'API della TV sulla porta 8001 risponde.
   - Modello: **UE50J6200, serie J del 2015**. Secondo la documentazione di HA i modelli H/J usano il protocollo cifrato con abbinamento tramite PIN (fonte: https://www.home-assistant.io/integrations/samsungtv/, consultata il 2026-10-27).
   - **Conclusione [verificato fino alla porta 7676; il resto è valutazione]:** questa TV non si fa scoprire da sola. Si aggiunge per indirizzo dal catalogo, con il PIN mostrato sulla TV. Questa strada è F4 (catalogo aperto a tutti e moduli generici), oggi non realizzata: nell'interfaccia attuale il catalogo avvia solo `webostv`.
6. **Diagnosi lasciate sulla copia:** il registro di debug di HA per ssdp, zeroconf, dhcp e samsungtv è attivo fino al prossimo riavvio di Core.

**2026-10-27, F4 realizzata e Samsung aggiunta (prova reale).**

*Codice.* F4 è stata scritta da un subagente Claude Code con modello Sonnet, a partire dagli schemi e dai testi osservati sull'HA reale:
- catalogo aperto al cliente, `CUSTOMER_STARTABLE_HANDLERS` tolto;
- moduli generici dallo schema di HA, con le etichette italiane di `frontend/get_translations` e testi nostri di riserva;
- passi `menu`, `progress` ed `external`;
- «Non lo trovi? Aggiungi per marca» in «Rileva dispositivi»;
- «Fai lampeggiare»;
- «Rimuovi dispositivo» (`DELETE /voci/:id`, operazione `voci.rimuovi`, integrazioni di sistema escluse);
- serie HA 2026.10 tra le versioni provate.

*Controlli dell'agente principale:* server 32 file, 505 test (1 saltato); frontend 216 file, 3294 test; typecheck, lint, tipografia (0 su 555 file) e colori (0 su 365) superati.

*Prova reale con la TV Samsung UE50J6200:*
1. **Flusso `samsungtv` sull'HA reale.** `user` (`host`) → `encrypted_pairing` (`pin`, segreto, `description_placeholders.device` = «UE50J6200 (UE50J6200)»). Il PIN appare sulla TV per tutta la durata del flusso.
2. **Abbinamento.** Il flusso è stato completato dall'agente con il PIN letto dalla TV e scritto in chat dall'utente («3759»), su richiesta dell'utente. Esito `create_entry` «UE50J6200 (UE50J6200)».
   - **Limite:** il PIN non è stato inserito dalle schermate F4. L'aggiunta dall'app per indirizzo resta da provare, dopo aver rimosso la TV con «Rimuovi dispositivo».
3. **«Rileva dispositivi».** La TV è comparsa in «Pronti da aggiungere» e l'utente ha creato il widget TV collegato con il «+».
4. **Comandi.** Lo spegnimento dal widget non funzionava.
   - **Causa, dal registro di debug di `samsungtvws.encrypted`:** il `turn_off` di HA manda `KEY_POWEROFF` e poi `KEY_POWER`, la TV li conferma entrambi ma resta accesa. `remote.send_command` con il solo `KEY_POWER` la spegne (verificato dall'utente).
   - **Correzione nel widget TV:**
     - `tvPowerOffCall` in `model/tv.ts`: per `platform: samsungtv` con telecomando, lo spegnimento è `remote.send_command KEY_POWER`;
     - volume e muto si mostrano quando la TV li dichiara (`tvShowsVolume`, `tvShowsMute`);
     - tasti Samsung per frecce, OK, Indietro, Home e Menu;
     - test `TvSamsung.test.tsx`: 4 nuovi, 61 superati nei file TV.
   - **Esito dell'utente:** «spegnimento, muto e volume abbassato e alzato» funzionano.
5. **Accensione: non funziona, ed è atteso.** La TV è in Wi-Fi (`networkType: wireless`) e HA non le attribuisce `TURN_ON`.
   - **Strade possibili [proposta, non decisa]:** cavo di rete con Wake on LAN, emettitore infrarossi (es. Broadlink), oppure HDMI-CEC da un dispositivo collegato alla TV.
6. **Ambiente di prova.**
   - Dopo una ricostruzione dell'interfaccia il server di prova va riavviato, perché legge la pagina iniziale solo all'avvio: la pagina restava bianca con due file 404.
   - Sul mini PC l'aggiornamento riavvia il server, quindi il problema non si presenta.

**2026-10-27 notte, richieste dell'utente prima di dormire.**
- **Grafica del widget TV:** «il pulsante del volume è unico: al singolo click muto e smuto, pressione e scorrimento verso l'alto alza il volume e viceversa verso il basso lo abbassa […] Studia la concorrenza». Poi: «tanto a funzionare funziona, miglioriamo la grafica».
- **Collegamento delle TV:** «facciamo l'update per ricevere il pin e lavoriamo per la compatibilità con tutti i modelli di televisori, facciamo in modo che per collegare un televisore non bisogni fare tutti questi passaggi che ho fatto io se sei d'accordo, ma associarla con un tap».
- L'agente si è detto d'accordo, con il limite della conferma sulla TV («Consenti» o PIN), che non si può saltare. Lavoro senza commit, da valutare domattina.

**Studio della concorrenza per il widget TV (subagente di ricerca, fonti consultate il 2026-10-27):**
- tocco = attiva/disattiva e trascinamento = valore sullo stesso controllo è uno schema di piattaforma (Android `ToggleRangeTemplate`; pillola verticale del Centro di Controllo iOS);
- per le TV non si usano grafici né termometri: il volume è un riempimento o una pillola, con il valore solo durante il trascinamento;
- le TV senza livello di volume vanno a passi;
- il D-pad sta nei dettagli;
- serve un'alternativa a puntatore singolo (WCAG 2.5.7).

Fonti principali: https://developer.android.com/develop/ui/views/device-control, https://9to5google.com/2024/11/12/google-home-media-controls-redesign/, https://www.home-assistant.io/dashboards/features/, https://github.com/kalkih/mini-media-player, https://github.com/Clooos/Bubble-Card, https://github.com/Nerwyn/universal-remote-card, https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html.

**F5 — collegamento di una TV con un tocco (piano dell'agente; autorizzato dall'utente con «se sei d'accordo»).**

*Fatto osservato su HA 2026.10.4 (copia della VM, rete di casa).* I comandi WS di sola lettura `ssdp/subscribe_discovery`, `zeroconf/subscribe_discovery` e `dhcp/subscribe_discovery` elencano ciò che HA stesso vede in rete:
- in DHCP c'è la Samsung: `192.168.1.10`, MAC con prefisso `14:BB:6E` (Samsung);
- in SSDP c'è una «Fire TV Stick» con produttore, modello e `x_homeassistant_matching_domains`;
- zeroconf è vuoto.

Leggere questi elenchi non è una scansione di Acasystem: è il risultato della scoperta di HA.

*Piano:*
1. **Server: elenco «TV in rete».**
   - Dagli elenchi SSDP/zeroconf/DHCP di HA ricava le TV candidate: produttore e modello da UPnP; prefissi MAC dei produttori di TV (Samsung, LG, Sony, Philips/TP Vision, Hisense, TCL, Panasonic) e nomi host; `x_homeassistant_matching_domains`.
   - Scarta le TV già configurate e quelle già nei flussi scoperti.
   - Associa a ogni candidata il gestore: `samsungtv`, `webostv`, `androidtv_remote`, `braviatv`, `philips_js`, `panasonic_viera`, `roku`, `apple_tv`, `cast`.
2. **«Collega» con un tocco:**
   - il server avvia il flusso del gestore e compila da solo il passo con l'indirizzo, poi va diretto al passo sulla TV («Consenti», PIN o codice);
   - schermata del PIN grande, con invio automatico alla cifra finale;
   - alla fine apre il widget TV già collegato.
3. **Compatibilità:** testi e prove con l'HA finto per ogni gestore della lista; MAC salvato per l'accensione via rete dove la TV la supporta.
4. **Non incluso:** l'accesso ai cloud dei produttori (SmartThings, LG ThinQ) per l'accensione.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Diagnosi di partenza | Registri salvati di HA nella copia `acasystem-ha-s45` (console della VM) | Osservato | Nessun dispositivo nuovo dopo il passaggio sulla rete di casa; le LG vengono dall'istantanea a caldo (ISSUE-120). |

## Controllo del diff e decisioni

Da compilare alla chiusura.

## Chiusura e punto di ripresa

**Punto di ripresa (2026-10-27):**
- commit di F1-F4 e delle correzioni (su richiesta dell'utente);
- prova dell'aggiunta per indirizzo dalle schermate F4, dopo «Rimuovi dispositivo»;
- accensione della Samsung (proposte al punto 5);
- assistenza a distanza: [REP-20261027-001](REP-20261027-001-assistenza-a-distanza.md), da decidere.
