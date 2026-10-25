# REP-20261023-002 — Studio e piano: pannelli dei widget per capacità (cornice comune, blocchi condivisi, pannelli specifici)

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261023-002: studio delle interfacce dei pannelli dei widget e piano di realizzazione. **Solo studio e piano**, nessuna realizzazione. |
| Stato | **Completato (studio e piano), rivisto dopo la critica del 2026-10-23** (sezione «Rettifiche dopo la critica»). La proposta resta nello stato **proposto**. Si attendono le risposte dell'utente alle domande D-1…D-17 e l'esito di ADR-0019. Nessuna tappa di realizzazione è autorizzata. |
| Data | 2026-10-23 (Europe/Rome) |
| Autore / modello | Claude Code (Opus 5.5, `claude-opus-5-5`) per la sintesi, la verifica delle fonti di HA, il mockup e la bozza di ADR. Tre appunti preparatori dello stesso workflow, di modello non indicato: inventario del codice, capacità di HA e primitive (in `backup/studio-pannelli/`, cartella esclusa da Git). |
| Commit di partenza | `7298d4df0d33bc92123517776d9ebc7c12ecefa6` (`master`). L'albero di lavoro contiene molte modifiche non committate di altri flussi (0.9.27, ISSUE-109, ADR-0019 in scrittura): lasciate intatte. Nessun commit eseguito. |
| Richiesta di riferimento | Utente, 2026-10-23: «attualmente quando noi andiamo a cliccare su un widget esce il pannello per la configurazione dello stesso. Dobbiamo andarci a fare uno studio delle interfacce per realizzare delle interfacce che possono essere comuni a tutti i widget e poi le interfacce specifiche per il singolo widget. Cioè, che intendo? Non tutti quanti i widget hanno la stessa funzionalità o possono avere le stesse funzionalità. Quindi dobbiamo andarci a studiare caso per caso e dispositivo per dispositivo che può essere aggiunto tramite il widget, cosa in particolare è fattibile o non è fattibile creare, e cercare di creare delle interfacce che riassumono quelle funzionalità in comune a livello grafico per risparmiare linee di codice.» Alla proposta di metodo (ragionare per capacità di Home Assistant, su tre livelli) l'utente ha risposto: «avvialo subito in parallelo». |
| Autorizzazione | Studio, piano, mockup statico in `documentazione/design/proposte/`, bozza di ADR in stato «Proposta», aggiornamento degli indici. **Vietato:** modifiche al codice, a Home Assistant, a Docker o al tablet; browser sul PC; credenziali; terminare processi altrui; commit. La risposta «avvialo subito in parallelo» autorizza lo studio, non la realizzazione né alcun cambio di comportamento visibile. |

Convenzione: **[O]** osservazione (codice letto o fonte primaria), **[V]** valutazione dell'agente, **[P]** proposta non decisa e non autorizzata.

## Risposta breve

1. **[O] Il «pannello per la configurazione» sono in realtà due fogli.** Toccando un widget *collegato* fuori dalla modifica si apre `DetailsSheet` (uso). Toccando un widget di categoria *non collegato* si apre `WidgetSettingsSheet` sulla sezione «Dispositivo» («Collega»). In modifica il secondo tocco apre lo stesso `WidgetSettingsSheet` (ADR-0016). Nessuno dei due ha una testata comune (nome, stanza, stato).
2. **[O] Il codice ragiona già per capacità, ma solo a metà.** `utils/haEntityToCapabilities.ts` (1504 righe) e `adaptive/operationalProfile.ts` (1329 righe) ricavano le capacità da `supported_features` e dagli attributi, e `AdaptiveCategoryWidget` le disegna con 5 forme. I 20 pannelli di dettaglio specifici non usano quel modello. Per un widget di categoria, poi, lo stesso foglio mostra i comandi **due volte**: prima il blocco adattivo, poi il pannello del tipo (`DetailsSheet.tsx:120-137`).
3. **[V] Lo stesso controllo è scritto più volte a mano**: accensione 7 volte, cursore con −/+ 7 volte, cronologia 5, scelta da elenco in 6 forme, «richiesto o confermato» in 4 famiglie (7 hook, timeout 10 o 30 s), esito del comando 5 volte, 4 cornici di widget, 5 famiglie CSS di sezione. Qui sta il risparmio di codice, più che nei pannelli specifici.
4. **[P] Architettura su tre livelli** (bozza [ADR-0020](../decisions/ADR-0020-pannelli-per-capacita.md), stato «Proposta»): (1) una **cornice comune**; (2) **16 blocchi di capacità** che compaiono solo se Home Assistant dichiara la capacità; (3) **pannelli specifici** solo dove nessun blocco basta: videocamera dal vivo, calendario, Sonos (gruppi, timer di spegnimento, coda, sveglie), «Scegli contenuto» e Casa 3D, più altri candidati da decidere (D-12), tra cui Nordpool.
5. **[V] Risparmio stimato** da conteggio delle righe, non da misura (±30 %). **Dato principale, scenario A (solo pannelli):** circa 300-1 400 righe TS e 800-1 200 di CSS in meno. **Condizionato a D-8**, scenario B (unificare hook e aiutanti, che cambia il comportamento visibile): altre 1 300-1 800 righe TS. Solo se D-8 viene decisa in quel senso il totale arriva a 1 600-3 200 righe TS (4-9 % dei 36 570 dei gruppi widget e fogli). Esclusi: test (circa 12 000 righe di guardie interessate), pagine intere e facce legacy.
6. **[O] TV LG webOS, dalle fonti primarie:** Netflix si apre come una sorgente qualsiasi con `media_player.select_source`, cioè con un blocco comune. L'accensione compare solo se in HA c'è un'automazione col trigger `webostv.turn_on` (di solito Wake-on-LAN). Con la TV spenta l'integrazione conserva l'ultimo elenco delle sorgenti. Restano due problemi a monte (REP-20261023-001): oggi HA non ha la TV e non è nella LAN.
7. **Domande:** 17 domande separate, una per ogni comportamento visibile che cambierebbe, senza opzioni «consigliate», più le domande sulla migrazione delle impostazioni da inoltrare ad ADR-0019 (sezione 4). **Tappe:** tappe piccole con criteri misurabili, quasi tutte adatte a un modello leggero; nessuna avviabile senza autorizzazione, e solo T1a e T2 non dipendono da risposte.

## Obiettivo e perimetro

**Obiettivo.** Studiare, dispositivo per dispositivo, che cosa un pannello di widget può e non può fare con Home Assistant, e proporre interfacce comuni (cornice e blocchi) e specifiche (pannelli), con stima del risparmio, rischi, tappe e domande.

**Dentro il perimetro:** questo report; il mockup statico [`design/proposte/pannello-widget-comune.html`](../design/proposte/pannello-widget-comune.html); la bozza [ADR-0020](../decisions/ADR-0020-pannelli-per-capacita.md); gli indici `reports/README.md`, `decisions/README.md` e `design/README.md`.

**Fuori dal perimetro:** qualsiasi file sotto `progetto/`; HA, Docker, rete e tablet; la 0.9.27 e ISSUE-109 (altro flusso); il contenuto di ADR-0019 (memoria della configurazione per dispositivo, altro flusso), di cui questo studio usa solo la regola riportata nella richiesta: «copia al collegamento, poi widget indipendenti, impostazioni del dispositivo condivise»; `project-status.md` (aggiornato da altri flussi in contemporanea: le proposte di questo studio sono elencate in fondo per essere registrate da chi chiude l'incarico).

**Collegamenti:** ADR-0004 (primitive), ADR-0005 (TypeScript, italiano, mx-icons), ADR-0011 (Kit 2), ADR-0016 (tocco = dettagli, impostazioni solo in modifica), ADR-0018 (pagine fuori vista), ADR-0019 (in scrittura), ISSUE-082 (grigio dei non collegati), ISSUE-109 e ISSUE-112 (prestazioni dei fogli), [REP-20261023-001](REP-20261023-001-rilevamento-dispositivi.md) (HA senza dispositivi, TV LG da collegare), [REP-20261014-004](REP-20261014-004-widget-adattivi-gesti.md) e [REP-20261015-003](REP-20261015-003-widget-operativi.md) (widget adattivi e operativi).

**Modifiche preesistenti:** `git status` mostra decine di file modificati in `documentazione/` e `progetto/` da altri flussi. Questo studio non li tocca. Gli indici condivisi sono stati riletti subito prima della modifica e modificati solo con righe aggiunte.

## Criteri di completamento

| Criterio | Esito |
|---|---|
| Richiesta citata, perimetro e metodo | Fatto (intestazione, sezioni «Obiettivo» e «Metodo») |
| Inventario sintetico di oggi | Fatto (sezione 1) |
| Matrice capacità di HA → blocco con fattibile e non fattibile per tipo di dispositivo, inclusa la TV LG (Netflix, Wake-on-LAN) | Fatto (sezione 2) |
| Catalogo dei blocchi comuni (nome, quando compare, comandi, stati, accessibilità, testi italiani) | Fatto (sezione 3) |
| Cornice comune con impostazioni del widget separate da quelle del dispositivo, coerente con la regola di ADR-0019 | Fatto (sezione 4) |
| Pannelli specifici che restano | Fatto (sezione 5) |
| Stima delle righe risparmiate | Fatto (sezione 6), come stima |
| Rischi | Fatto (sezione 7) |
| Tappe piccole e misurabili con modelli leggeri | Fatto (sezione 8) |
| Domande separate per ogni comportamento visibile, nessuna opzione «consigliata» | Fatto (sezione 9) |
| Cosa resta fuori | Fatto (sezione 10) |
| Mockup statico (luce dimmerabile, TV LG, tapparella), marcato PROPOSTA, senza script | Fatto: `design/proposte/pannello-widget-comune.html` |
| Bozza di ADR «Proposta» col primo numero libero dopo ADR-0019 | Fatto: ADR-0020 (indice riletto prima del salvataggio) |
| Indici aggiornati | Fatto: `reports/README.md`, `decisions/README.md`, `design/README.md` |

## Metodo

1. **Codice (sola lettura).** Ho letto il working tree del 2026-10-23: percorsi del tocco, fogli, registro dei widget, profili adattivi, pannelli `*Details.tsx`, sezioni delle impostazioni, primitive, lint dei livelli e test di guardia. I numeri di riga possono scorrere, perché altri flussi stanno modificando gli stessi file. Gli appunti grezzi sono in `backup/studio-pannelli/inventario.md` e `primitive.md`.
2. **Home Assistant, fonti primarie, consultate il 2026-10-23.** Ultima versione stabile: **2026.10.2**, pubblicata il 2026-10-16 (GitHub API, `home-assistant/core/releases/latest`). Il banco usa la 2026.9.4. Fonti usate:
   - documentazione per sviluppatori `contributors.home-assistant.io/core/entities/<dominio>/` (le vecchie URL `developers.home-assistant.io` rispondono con un redirect 301) e documentazione utente `home-assistant.io/integrations/<nome>/`;
   - codice `home-assistant/core`, ramo `dev` al 2026-10-23. Ho verificato direttamente: `media_player/const.py` e `entity.py`, `light/const.py`, `cover/const.py`, `climate/const.py`, `webostv/media_player.py`.

   Le pagine sono state lette con un riassuntore automatico. I punti non verificati sono marcati **(NV)**. Il ramo `dev` può essere più avanti della 2026.10.2 (per esempio `CoverEntityFeature.SPEED = 256`): prima di realizzare, i bit vanno riletti sul tag della versione installata.
3. **Dispositivi reali:** nessuno. HA del banco non ha dispositivi (REP-20261023-001), quindi nessun attributo è stato osservato su un'entità reale.
4. **Nessun test eseguito**, nessun browser, nessun tablet.

## 1. Inventario sintetico di oggi

**Percorso del tocco [O]**

| Situazione | Che cosa si apre | Riferimento |
|---|---|---|
| Uso, widget collegato | `DetailsSheet`: titolo = nome; per i tipi di categoria il blocco adattivo **e** il pannello del tipo, uno sotto l'altro (serratura e allarme esclusi) | `templates/launcher/DetailsSheet.tsx:104-137` |
| Uso, widget di categoria non collegato | `WidgetSettingsSheet` sulla sola sezione «Dispositivo» (pulsante a tutto widget «Collega <tipo>») | `CategoryWidgetContent.tsx:290-305`, `WidgetHost.tsx:267` |
| Modifica, secondo tocco | `WidgetSettingsSheet` completo: Dimensione e pagina, Dispositivo, Controlli nella scheda, Generali, Aspetto, sezioni del tipo, Visibilità | `WidgetSettingsSheet.tsx:133-201` |
| Casi particolari | Clima e Apple TV con `tapAction: 'toggle'` accendono e spengono; Sensore con azione sulla scheda la esegue; Stanza con `navigateOnTap` apre una pagina | `ClimateWidget.tsx`, `TvWidget.tsx`, `SensorWidget.tsx:330`, `RoomWidget.tsx:189-199` |
| Eliminazione | Non è in nessun foglio: si elimina in modifica, dalla barra del widget o col tasto Canc | `WidgetHost.tsx:201-205` |

**Tipi e pannelli [O].** I tipi adattivi sono 20: sensore, luce, ventilatore, clima, tapparella, serratura, allarme, videocamera, multimedia, Sonos, Android TV, Apple TV, aspirapolvere, tosaerba, auto, stanza, attività, costi, Nordpool, separatore. Restano solo legacy Meteo, Calendario, Automazione e le cartoline della copertina. I widget si creano in due modi: il foglio di aggiunta crea schede legacy senza `categoryWidgetType`, le pagine di categoria creano segnaposto da collegare.

**Dimensioni [O]** (solo `.ts/.tsx`, esclusi test e anteprime):

| Gruppo | ts/tsx | CSS |
|---|---:|---:|
| `components/widgets/adaptive` | 3 468 | 577 |
| `components/widgets/controls` | 6 217 | 843 |
| `components/widgets/home` | 4 699 | 598 |
| `components/widgets/media` | 4 970 | 530 |
| `components/widgets/utilities` | 7 621 | 643 |
| `templates/launcher` | 4 881 | 1 488 |
| `templates/sheets` | 4 714 | 267 |
| **Totale** | **36 570** | **4 946** |

Escluso dal totale: `utils/haEntityToCapabilities.ts`, 1 504 righe.

**Duplicazioni [O]** (conteggi con grep sul working tree)

| Parte | Copie | Note |
|---|---:|---|
| Cornice del widget (`WidgetContent`, `WidgetShell` ×2, `UtilityCard`) | 4 | stesso bottone trasparente `data-widget-open` |
| Famiglie CSS di sezione del pannello (`ctl-details__*`, `home-section`, `aca-media-section`, `utility-section`/`Section`, `aca-sheet-section`) | 5 | i test fissano questi nomi di classe |
| Accensione | 7 | `PowerRow`, `Toggle` ×3, `PowerButton`, `CommandToggle`, adattivo |
| Cursore di livello con −/+ | 7+ | più 2 manopole a gesto quasi uguali |
| Scelta da elenco | 6 forme | `OptionGroup`, `OptionPicker`, `Popover` propri, `ChoiceGroup`, `<select>` nativo, `MediaChooser` |
| Cronologia | 5 | `EntityHistorySection`, `WidgetDesignChart`, `HistoryChart`, `charts.tsx`, meteo |
| «Richiesto o confermato» | 7 hook in 4 famiglie | timeout 10 s (controls, home, media) o 30 s (utilities); allo scadere controls avvisa, home e media tornano al valore in silenzio |
| Esito del comando | 5 | testi diversi per lo stesso fatto |
| Lettura di `supported_features` | 12 punti | `media/model/features.ts` abilita tutto se il campo manca, `haEntityToCapabilities` non abilita nulla |
| Aiutanti per gli attributi | 5 serie | |
| Wrapper di icona | 4 | `ControlIcon`, `HomeIcon`, `MediaIcon`, `UtilityIcon` |

**Impostazioni [O].** Nessuna impostazione dei fogli chiama un servizio di HA: tutto finisce in `cardSettings[settingsKey]`, `customNames`, `customIcons`, `hiddenCards` o, per alcune preferenze, in `localStorage`. Diverse impostazioni però descrivono il dispositivo e sono salvate per widget: mappe di entità (21 per l'auto, 12 per l'aspirapolvere, `adaptiveBindings`, `sonosAlarmIds`, `roomScripts`), motore e connessione della videocamera, `climateFavoriteModes`, `lightTransition`, valuta e decimali dei costi. Due widget sullo stesso dispositivo le duplicano. È il problema che ADR-0019 sta affrontando.

**Domini di HA senza widget [O]:** `humidifier`, `water_heater`, `valve`, `siren`, `image`, `text`, `date`/`time`, `event`, `update`, `person`/`device_tracker`. `remote` entra solo come telecomando facoltativo delle TV. Per la TV LG webOS non esiste un tipo: entrerebbe come Multimedia o Android TV, e il pannello TV mostra la lista delle app solo per Apple TV (`TvDetails.tsx:231-258`).

## 2. Matrice: capacità di Home Assistant → blocco dell'interfaccia

**Principio [O].** In HA un'azione è offerta solo se il flag corrispondente di `supported_features` è impostato. Le luci dichiarano la loro capacità soprattutto in `supported_color_modes`. Le liste di scelta stanno in attributi (`source_list`, `effect_list`, `hvac_modes`, `options`…). Un pannello può quindi comporsi da flag e attributi senza codice per singolo modello. **[V]** Unica eccezione: le funzioni dell'integrazione fuori dallo standard (`webostv.button`, PTZ ONVIF, servizi `sonos.*`), che entrano come blocchi solo se Acasystem le conosce per nome.

Legenda blocchi (catalogo nella sezione 3): **ACC** accensione · **LIV** livello · **SCE** scelta da elenco · **MM** comandi multimediali · **VOL** volume · **AZI** azioni in fila · **COL** colore e bianco · **TEM** temperatura obiettivo · **LET** lettura con storico · **IMM** immagine · **COD** codice e conferma · **TAS** tastierino direzionale · **INF** informazioni · **CAM** campo (ora, data, testo, numero) · **ESI** esito del comando (sempre) · **DIS** disponibilità (sempre).

Valori dei bit verificati sul codice di core (ramo `dev`, 2026-10-23) per media_player, light, cover e climate, più il comportamento di `webostv`. **Tutte le altre righe vengono dalla documentazione per sviluppatori letta tramite riassuntore e sono da considerare NV** (non verificate sul codice di core), anche dove la cella non lo ripete: in particolare aspirapolvere (`CLEAN_AREA`, `MAP`, batteria come sensore separato), tosaerba, serratura, allarme, sirena, aggiornamento, attività, evento, immagine, testo, data e ora, persona e localizzatore.

| Dispositivo / dominio | Capacità di HA che decidono | Blocchi | Fattibile | Non fattibile o limite |
|---|---|---|---|---|
| **Luce solo on/off** | `supported_color_modes = {onoff}` | ACC, INF | Accendi/spegni; transizione se `TRANSITION` (32) | Nessun livello: il cursore non deve comparire |
| **Luce dimmerabile** | `{brightness}`; `brightness` 1-255 | ACC, LIV (luminosità %), INF | Accensione, luminosità con −/+, gesto e frecce; `transition` | Nessun colore |
| **Luce a bianco variabile** | `color_temp` in `supported_color_modes`; `min/max_color_temp_kelvin` | ACC, LIV, COL (solo bianco caldo-freddo, in kelvin) | Temperatura del bianco | I mired sono deprecati: usare solo kelvin |
| **Luce a colori** | uno tra `hs`, `xy`, `rgb`, `rgbw`, `rgbww` (`COLOR_MODES_COLOR`) | ACC, LIV, COL; SCE degli effetti se `EFFECT` (4) | Tonalità, e saturazione se approvata (D-11); effetti da `effect_list`; lampeggio se `FLASH` (8) | Oggi Acasystem invia solo la tonalità, con saturazione fissa a 100 (`LightDetails`). I canali bianchi di `rgbw`/`rgbww` (`rgbw_color`, `rgbww_color`) e il modo `white` (`white` = luminosità del solo bianco) **non sono coperti da COL**: fuori dalla proposta salvo risposta a D-11 |
| **Gruppo di luci** | entità `light` con `entity_id` dei membri (NV per i gruppi di integrazione) | come sopra, più un elenco dei membri (ACC e LIV per membro) | Già presente in `LightDetails` («Luci del gruppo») | L'elenco dei membri è un blocco composto, non uno nuovo |
| **Interruttore, presa, `input_boolean`, automazione** | dominio `switch`/`input_boolean`/`automation`; device class `outlet` | ACC, LET (se è legato un sensore di consumo), INF | Acceso o spento | Nessun livello. Il consumo è un'altra entità dello stesso dispositivo: impostazione del dispositivo (sezione 4) |
| **Ventilatore** | `SET_SPEED`, `PRESET_MODE`, `OSCILLATE`, `DIRECTION`, `TURN_ON`/`TURN_OFF`; `percentage_step` | ACC, LIV (velocità a passi), SCE (preset, direzione), interruttore per l'oscillazione | Cursore quantizzato su `percentage_step` | Valori dei bit non riletti sul codice (NV); con 3 velocità un cursore continuo darebbe valori non validi |
| **Tapparella, tenda, cancello** | `OPEN` 1, `CLOSE` 2, `SET_POSITION` 4, `STOP` 8, `OPEN_TILT` 16, `CLOSE_TILT` 32, `STOP_TILT` 64, `SET_TILT_POSITION` 128 (`SPEED` 256 sul ramo `dev`) | AZI (Apri, Ferma, Chiudi), LIV (apertura %, posizioni rapide), LIV (inclinazione), INF | Posizione e inclinazione solo con i rispettivi bit | Senza `SET_POSITION` nessun cursore. Senza `STOP` nessun «Ferma». Un cancello o un garage (device class `gate`/`garage`) potrebbe richiedere conferma: D-9 |
| **Valvola** | `OPEN`, `CLOSE`, `SET_POSITION`, `STOP`; `reports_position` (NV sui valori dei bit) | AZI, LIV | Apri e chiudi; posizione se disponibile | Oggi non esiste un widget: realizzarlo è una funzione nuova (D-16) |
| **Clima** | `TARGET_TEMPERATURE` 1, `TARGET_TEMPERATURE_RANGE` 2, `TARGET_HUMIDITY` 4, `FAN_MODE` 8, `PRESET_MODE` 16, `SWING_MODE` 32, `TURN_OFF` 128, `TURN_ON` 256, `SWING_HORIZONTAL_MODE` 512; `hvac_modes`, `hvac_action` | ACC, TEM (singola o intervallo), SCE ×4 (modalità, preset, ventola, oscillazione), LIV (umidità), LET (temperatura attuale) | Tutte le modalità sono stringhe dell'integrazione: servono traduzioni italiane note e il testo crudo come riserva | Nessuna programmazione oraria nello standard. **Senza `TURN_ON`/`TURN_OFF`** (integrazioni meno recenti) l'accensione non usa `climate.turn_on`: ACC diventa `climate.set_hvac_mode` con `off` e, per riaccendere, l'ultima modalità diversa da `off` (o la prima di `hvac_modes`) |
| **Umidificatore** | `MODES`; `target_humidity`, `available_modes`, `action` | ACC, LIV (umidità obiettivo), SCE, LET | Sì, con gli stessi blocchi | Nessun widget oggi (D-16) |
| **Scaldacqua** | `TARGET_TEMPERATURE`, `OPERATION_MODE`, `AWAY_MODE`, `ON_OFF` (NV sui nomi delle azioni) | ACC, TEM, SCE | Sì | Nessun widget oggi (D-16); valori predefiniti in °F (110-140) da convertire |
| **Multimedia generico** (`media_player`) | `PAUSE` 1, `SEEK` 2, `VOLUME_SET` 4, `VOLUME_MUTE` 8, `PREVIOUS_TRACK` 16, `NEXT_TRACK` 32, `TURN_ON` 128, `TURN_OFF` 256, `PLAY_MEDIA` 512, `VOLUME_STEP` 1024, `SELECT_SOURCE` 2048, `STOP` 4096, `CLEAR_PLAYLIST` 8192, `PLAY` 16384, `SHUFFLE_SET` 32768, `SELECT_SOUND_MODE` 65536, `BROWSE_MEDIA` 131072, `REPEAT_SET` 262144, `GROUPING` 524288, `MEDIA_ANNOUNCE` 1048576, `MEDIA_ENQUEUE` 2097152, `SEARCH_MEDIA` 4194304 | ACC, MM, VOL, SCE (sorgente, modalità audio), IMM (copertina), più il **pannello specifico «Scegli contenuto»** se `BROWSE_MEDIA` (navigazione ad albero con il comando websocket `media_player/browse_media`, oggi `MediaChooser` e `adaptiveMediaBrowse`; sezione 5) | Ogni comando solo col proprio bit | Con lo stato `off` HA non pubblica volume, contenuto e immagine: in `entity.py` `state_attributes` si ferma dopo `group_members`. **`source_list` e `sound_mode_list` invece restano**, perché sono attributi di capacità. `STANDBY` è deprecato |
| **TV LG webOS** (`webostv`) | come Multimedia; volume solo con certe uscite audio; `TURN_ON` **solo se** esiste l'automazione col trigger «richiesta di accensione» | ACC (con avviso DIS se manca l'accensione), VOL, MM, SCE (sorgenti e app: **Netflix è una voce di `source_list`**), TAS (`webostv.button`, D-13), INF | **Netflix:** `media_player.select_source` con il nome mostrato (l'integrazione lancia l'app con `launch_app`, gli ingressi con `set_input`). **Canali:** `play_media` di tipo `channel` con numero o nome, anche parziale. **Accensione:** Wake-on-LAN tramite automazione HA | **Senza automazione di accensione la TV spenta risulta «non disponibile»** e il pannello non può accenderla. WoL richiede TV via cavo, stessa rete, WoL attivo sulla TV. Non si apre un titolo dentro Netflix (nessun collegamento diretto nello standard, NV). Il titolo in riproduzione nelle app è spesso vuoto. Con la TV spenta l'integrazione conserva l'ultimo elenco delle sorgenti («keep previous list») |
| **Android TV / Google TV** (`androidtv_remote`) | `media_player` senza stato di riproduzione; entità `remote` con tasti e `activity` (app o collegamento diretto) | ACC, VOL, SCE (app tramite `remote.turn_on activity`), TAS | Tasti, app e collegamenti diretti | Nessuno stato di riproduzione affidabile; i comandi non funzionano dentro Netflix (doc utente); Fire TV non supportata |
| **Android TV / Fire TV via ADB** (`androidtv`) | `select_source` con l'ID dell'app (`!` per chiuderla); `remote` | ACC, MM, VOL, SCE, TAS | App e tasti | Stato dedotto, quindi da mostrare come «sconosciuto» quando manca; un solo client ADB alla volta |
| **Apple TV** | `media_player` + `remote` | ACC, MM, VOL, SCE (app), TAS | Oggi è il solo tipo con la lista delle app | — |
| **Chromecast** (`cast`) | `media_player`; `play_media` solo HTTP(S) | ACC, MM, VOL, IMM | Riproduzione da URL | Non risolve i nomi `.local`; niente DLNA né SMB; gruppi Cast come entità separate (NV) |
| **Sonos** | `media_player` con `GROUPING`; `group_members` (presente anche da spento); servizi `sonos.*` | ACC, MM, VOL, SCE, IMM, CAM (ora della sveglia), più il **pannello specifico Sonos** (gruppi, timer di spegnimento, coda, sveglie; copertura nella sezione 5) | Raggruppa e separa con `media_player.join`/`unjoin`; timer di spegnimento (`sonos.set_sleep_timer`/`clear_sleep_timer`), coda (`sonos.get_queue`, con risposta), sveglie (`sonos.update_alarm`) con servizi propri (NV sui parametri) | UPnP va attivato nell'app Sonos (altrimenti errore 403); gli annunci richiedono la porta TCP 1443 |
| **Videocamera** | `ON_OFF`, `STREAM`; `motion_detection` | IMM (fermo immagine periodico), ACC (se `ON_OFF`), più il **pannello specifico dal vivo** | Istantanea, rilevamento del movimento | PTZ e audio bidirezionale non sono nello standard (PTZ via `onvif.ptz`); il token d'accesso cambia ogni 5 minuti circa. **`camera.record` non è una funzione da pannello:** scrive un file sul disco del server di HA, in un percorso che deve stare in `allowlist_external_dirs` (configurazione di HA); la persona di riferimento non potrebbe né scegliere il percorso né ritrovare il file. Classificato come limite, non come funzione (NV sui dettagli dei parametri) |
| **Serratura** (NV) | `OPEN`; `code_format`; stati `locked`/`unlocked`/`jammed`/`open`… | AZI (Blocca, Sblocca, Apri), COD, LET (cronologia), INF | Codice solo se `code_format` | Conferma prima di sbloccare o aprire: già decisa? Va confermata (D-9) |
| **Allarme** (NV) | `ARM_HOME`, `ARM_AWAY`, `ARM_NIGHT`, `ARM_VACATION`, `ARM_CUSTOM_BYPASS`, `TRIGGER`; `code_format`, `code_arm_required` | AZI (modalità di inserimento), COD (tastierino), LET | Disinserimento sempre disponibile | Nessun elenco di zone o sensori nello standard |
| **Aspirapolvere** (NV, in particolare `CLEAN_AREA` e `MAP`) | `START`, `PAUSE`, `STOP`, `RETURN_HOME`, `FAN_SPEED`, `LOCATE`, `CLEAN_SPOT`, `CLEAN_AREA` (NV), `MAP` (NV, solo informativo) | AZI, SCE (aspirazione da `fan_speed_list`), LET (batteria da entità sorella), più **mappa e stanze specifiche** | Comandi e aspirazione; stanze con `CLEAN_AREA` | Nessuna mappa in core: l'immagine della mappa è un'entità `image` dell'integrazione; la batteria non è più un attributo ma un sensore separato |
| **Tosaerba** (NV) | `START_MOWING`, `PAUSE`, `STOP`, `DOCK` | AZI, LET | Sì | Nessuna zona o altezza nello standard: solo entità sorelle (`select`/`number`) |
| **Sensore numerico** | `state_class`, `device_class`, `unit_of_measurement` | LET (valore e grafico), INF | Valore, unità, storico dal recorder | Sola lettura |
| **Sensore binario** | device class (`door`, `motion`, `moisture`…) | LET (cronologia degli eventi), INF | Testo secondo la classe («Aperta», «Movimento») | Sola lettura; `on` cambia significato con la classe |
| **Evento** (`event`, NV) | `event_types`, `event_type`; device class `doorbell`, `button`, `motion` | LET (ultimo evento) | Ultimo evento e ora | Nessuna azione; nessun widget oggi |
| **Selezione** (`select`/`input_select`) | `options` | SCE | `select_option` | — |
| **Numero** (`number`/`input_number`) | `min`, `max`, `step`, `mode`, unità | LIV; CAM con `mode: box` | `set_value` | Con `mode: box` il controllo è il campo numerico CAM, non il cursore |
| **Data e ora** (`input_datetime`, `date`, `time`, `datetime`; NV) | `has_date`, `has_time` (helper); valore nello stato | CAM | `input_datetime.set_datetime`, `date.set_value`, `time.set_value` | Nessun widget oggi per questi domini (D-16); la stessa forma serve già all'ora della sveglia Sonos |
| **Testo** (`text`/`input_text`; NV) | `min`, `max`, `pattern`, `mode` (`text`/`password`) | CAM | `text.set_value` | Nessun widget oggi (D-16); `mode: password` va escluso dalla persona di riferimento |
| **Immagine** (`image`; NV) | `image_last_updated`; URL tramite `entity_picture` | IMM | Mostrare l'immagine (es. mappa dell'aspirapolvere) | Sola lettura; nessun widget autonomo oggi (D-16) |
| **Persona, localizzatore** (`person`, `device_tracker`; NV) | stato = zona (`home`, `not_home`, nome della zona); `latitude`, `longitude`, `gps_accuracy`, `source_type` | LET, INF | Zona in parole («A casa», «Fuori casa»); coordinate solo come informazione | Nessun widget autonomo oggi (D-16). Una mappa sarebbe un pannello nuovo: fuori. Oggi il localizzatore entra solo come entità sorella dell'auto |
| **Pulsante, scena, script** | `button.press`; `scene.turn_on` (con `transition`); `script.turn_on` con `fields` | AZI | Esecuzione | La scena non ha stato acceso/spento (lo stato è la data dell'ultima attivazione); i parametri degli script con `fields` richiederebbero un modulo: fuori da questa proposta |
| **Sirena** (NV) | `TURN_ON`, `TURN_OFF`, `TONES`, `VOLUME_SET`, `DURATION` | ACC, SCE (tono), LIV (volume) | Sì | Nessun widget oggi; uso delicato: richiede conferma (D-9, D-16) |
| **Telecomando** (`remote`) | `ACTIVITY` (`activity_list`); `send_command` | ACC, SCE (attività), TAS | Tasti noti | Nessun elenco standard dei tasti validi: la griglia di tasti è fissa e l'integrazione li interpreta |
| **Meteo** | stato = condizione; previsioni solo con `weather.get_forecasts` | LET (valori attuali), più il **pannello specifico delle previsioni** | Valori e previsioni orarie o giornaliere | Le previsioni non sono attributi: serve una chiamata con risposta |
| **Calendario** | `CREATE_EVENT`, `DELETE_EVENT`, `UPDATE_EVENT`; `calendar.get_events` | **pannello specifico** | Agenda | L'agenda non è nello stato; molti calendari sono in sola lettura |
| **Attività** (`todo`, NV) | `CREATE_TODO_ITEM`, `UPDATE_TODO_ITEM`, `DELETE_TODO_ITEM`, `MOVE_TODO_ITEM`… | **pannello specifico** (elenco) | Spunta, aggiunta, se i flag lo consentono | Senza flag l'elenco è in sola lettura |
| **Aggiornamento** (`update`, NV) | `INSTALL`, `PROGRESS`, `RELEASE_NOTES`… | LET, INF | Versione installata e disponibile | Installare dal launcher è una funzione nuova e delicata per la persona: fuori (sezione 10) |
| **Auto** (composto) | 21 entità sorelle (batteria, autonomia, serratura, clima, ricarica…), tra cui un **localizzatore** (`device_tracker`) per la sezione «Posizione» (`CarDetails.tsx:156-183`, che chiede «un localizzatore con coordinate») | LET, ACC, AZI, LIV (limite di ricarica), SCE, TEM, COD: un blocco per entità | Composizione di blocchi | Nessun dominio «auto» in HA: le entità sono sorelle dello stesso dispositivo |
| **Stanza** (composto, area di HA) | entità dell'area | ACC (tutte le luci), TEM, righe compatte per entità | Composizione di blocchi | Le righe della stanza sono versioni compatte dei blocchi (D-15) |
| **Costi** | sensori | LET (con periodi), INF | Sì | Sola lettura |
| **Nordpool** (integrazione **HACS, non di core**: nessuna fonte primaria di HA la descrive) | sensore con attributi `raw_today`, `raw_tomorrow`, `tomorrow_valid` (osservato nel codice di Acasystem: `nordpoolData.ts:87-100`) | **nessun blocco adatto**: candidato specifico (D-12) | Prezzi di oggi e di domani, con le regole proprie di IVA e øre (`nordpoolData.ts:137`) | La serie è una **previsione letta da un attributo**, non uno storico dal recorder: LET non la copre. Gli attributi dipendono dalla versione dell'integrazione esterna |

**Cose che non si possono fare in generale [O/V]**

- Nessun dominio standard espone i menu interni del dispositivo (per esempio le impostazioni d'immagine della TV). Le «impostazioni del dispositivo» possibili in Acasystem sono le **entità sorelle** dello stesso `device_id` (`number`, `select`, `switch`, `sensor`) più le preferenze proprie di Acasystem.
- Le capacità cambiano nel tempo: una TV spenta perde attributi e un servizio cloud può andare offline. I blocchi devono restare al loro posto mostrando «non disponibile», senza sparire e ricomparire (DIS).
- L'accensione di un dispositivo spento dalla rete (TV con WoL, PC) non è una funzione di Acasystem: dipende da un'automazione o da un'integrazione in HA. Acasystem può solo mostrarla se HA la dichiara (`TURN_ON`) e spiegare perché manca.

## 3. Catalogo dei blocchi comuni [P]

Regole valide per tutti i blocchi:

- **Posizione nel codice:** in `components/widgets/` (cartella condivisa), perché conoscono le entità. Le parti puramente grafiche (sezione, riga, elenco di fatti) vanno invece in `primitives` o `system`, che non possono importare HA (ESLint).
- **Ingressi:** `entityId` più la capacità del profilo, mai la mappa intera delle entità. Lo stato si deriva con `useMemo` sull'entità e non si crea nessun effetto per le entità non aperte.
- **Accessibilità e stile:** area di tocco ≥ 44 px; nome accessibile in italiano che contiene il nome del dispositivo; il valore *richiesto* si distingue dal *confermato* senza usare il colore; un errore si mostra con icona e testo; nessun gergo («Home Assistant», `entity_id`) come testo principale; tipografia con le primitive; testo ingrandito con `rem`/`em` e righe che vanno a capo.
- **Disponibilità:** il blocco compare solo se la capacità è dichiarata. Se l'entità è `unavailable`, il blocco resta visibile e disattivato, con una spiegazione (DIS).
- **Focus:** all'apertura il focus va sul titolo del pannello (nome del dispositivo), non sul primo comando, così TalkBack legge prima che cosa si sta comandando e un tocco accidentale non invia nulla; alla chiusura il focus torna al widget che ha aperto il pannello. Un testo di esito non usa mai la stessa parola di un pulsante del pannello (es. ESI dice «Comando eseguito», il piede dice «Fatto»).
- **Altezza utile sul Tab M11:** Chrome a 1280×665 CSS px (memoria del progetto «Target device»). Un pannello con testata, tre o quattro blocchi, quattro azioni della cornice e il piede **supera** l'altezza visibile: il corpo scorre, testata e piede restano fissi, le azioni della cornice stanno su una riga sola o in fondo al corpo. **[V]** Misura non eseguita (nessun browser in questo incarico): va verificata nella tappa T5 a 1280×665 e al 150 % di testo.

| Blocco | Quando compare | Comandi (servizi di HA) | Stati | Accessibilità | Testi italiani (proposta) |
|---|---|---|---|---|---|
| **ACC — Accensione** | flag `TURN_ON`/`TURN_OFF`, oppure dominio con `turn_on`/`turn_off` (luce, interruttore, ventilatore…), oppure stato on/off; **clima senza `TURN_ON`/`TURN_OFF` ma con `off` in `hvac_modes`** | `<dominio>.turn_on`, `turn_off`; per quel clima `climate.set_hvac_mode` con `off` e, per riaccendere, l'ultima modalità diversa da `off` (memorizzata) o la prima di `hvac_modes` | acceso, spento, in attesa, errore, non disponibile; accensione impossibile (es. TV senza WoL) | `Toggle` con `role="switch"` e `aria-checked`; durante l'attesa `aria-busy` | «Accesa / Spenta», «Acceso / Spento», «Accendi <nome>», «In attesa di conferma…» |
| **LIV — Livello** | `brightness` (non `onoff`); `percentage` (`SET_SPEED`); posizione (`SET_POSITION`); inclinazione (`SET_TILT_POSITION`); umidità; `number` | `light.turn_on brightness_pct`; `fan.set_percentage`; `cover.set_cover_position`; `set_cover_tilt_position`; `number.set_value`… | valore confermato, valore richiesto, in attesa, errore, sola lettura | Cursore nativo `<input type=range>` con `aria-valuetext` («60 %»), **più i tasti −/+** (WCAG 2.5.7) e le posizioni rapide facoltative. **Manopola a gesto nel pannello: da decidere (D-17).** Oggi `GestureControl` compare anche nel foglio di uso, perché `DetailsSheet` rende `AdaptiveCategoryWidget` in `detailsMode` (`AdaptiveCategoryWidget.tsx:164-174`); toglierla sarebbe un cambio visibile | «Luminosità», «Velocità», «Apertura», «Inclinazione», «Diminuisci la luminosità di <nome>», «Aumenta…», «Posizioni rapide: Chiusa, 25 %, 50 %, 75 %, Aperta» |
| **VOL — Volume** | con `VOLUME_SET`: cursore e −/+; **con solo `VOLUME_STEP` (senza `VOLUME_SET`): solo i tasti −/+, senza cursore** (un cursore invierebbe `volume_set`, che il dispositivo non accetta) e senza valore se `volume_level` manca; muto con `VOLUME_MUTE` | `volume_set`, `volume_up`/`volume_down`, `volume_mute` | come LIV, più muto | Come LIV, con `aria-valuetext` che dice l'unità («Volume 18 su 100»); il muto è un pulsante con `aria-pressed` e il nome del dispositivo | «Volume», «Silenzia», «Riattiva l'audio» |
| **SCE — Scelta da elenco** | lista non vuota: `source_list` (con `SELECT_SOURCE`), `sound_mode_list`, `effect_list`, `preset_modes`, `fan_modes`, `hvac_modes`, `swing_modes`, `options`, `fan_speed_list`, `activity_list`, `available_tones` | `select_source`, `select_sound_mode`, `set_preset_mode`, `set_hvac_mode`, `select_option`… | voce corrente, voce richiesta, in attesa, elenco memorizzato (con dispositivo spento), elenco vuoto | La forma dipende dal numero di voci (D-7); voce corrente con `aria-pressed`/`aria-current`; elenchi lunghi in un `Popover` o in un foglio con ricerca | «Sorgente», «App e ingressi», «Modalità», «Programma», «Velocità della ventola», «Scegli…», «Elenco dell'ultima accensione» |
| **MM — Comandi multimediali** | `PLAY`, `PAUSE`, `STOP`, `PREVIOUS_TRACK`, `NEXT_TRACK`, `SEEK`, `SHUFFLE_SET`, `REPEAT_SET` | `media_play`, `media_pause`, `media_play_pause`, `media_stop`, `media_previous_track`, `media_next_track`, `media_seek`, `shuffle_set`, `repeat_set` | in riproduzione, in pausa, fermo, posizione | Un pulsante per comando, con nome che include il dispositivo («Brano successivo su Televisore») e `aria-pressed` per casuale e ripeti; nessun comando nascosto senza alternativa. **Con `SEEK`:** barra di posizione calcolata localmente da `media_position`, `media_position_updated_at` e `media_duration`, aggiornata con un temporizzatore **locale al blocco** (al più una volta al secondo, fermo con il pannello chiuso, in pausa o con movimento ridotto), senza scrivere nel contesto runtime né far rendere di nuovo gli altri blocchi | «Riproduci», «Pausa», «Brano precedente», «Brano successivo», «Casuale», «Ripeti» |
| **AZI — Azioni in fila** | singoli flag di azione: `OPEN`/`CLOSE`/`STOP` (tapparella, valvola), `START`/`PAUSE`/`RETURN_HOME`/`LOCATE` (aspirapolvere), `START_MOWING`/`DOCK`, `button.press`, `scene.turn_on`, `script.turn_on`, `lock`/`unlock`/`open` | il servizio di ogni azione | azione in corso (`aria-busy` sul solo pulsante), esito | Pulsanti con testo, non solo icona, nei pannelli; un solo `primary` per vista e non un comando del dispositivo (D-9 per le azioni che chiedono conferma) | «Apri», «Ferma», «Chiudi», «Avvia», «Pausa», «Torna alla base», «Trova», «Esegui» |
| **COL — Colore e bianco** | luce con `color_temp` (bianco) o un modo di `COLOR_MODES_COLOR` (colore). **Non coperti:** il modo `white` e i canali bianchi separati di `rgbw`/`rgbww` (`rgbw_color`, `rgbww_color`): una luce in questi modi riceve tonalità e, se dichiarato, bianco in kelvin; il resto è fuori salvo risposta a D-11 | `light.turn_on color_temp_kelvin`, `hs_color` | come LIV | Cursori nativi con `aria-valuetext` («Caldo, 2 700 K», «Tonalità: arancione»); mai colore da solo | «Bianco: caldo – freddo», «Colore», «Saturazione» (D-11) |
| **TEM — Temperatura obiettivo** | `TARGET_TEMPERATURE` o `TARGET_TEMPERATURE_RANGE` (clima, scaldacqua) | `climate.set_temperature` | come LIV, più l'intervallo minimo-massimo | −/+ a passi di `target_temp_step` e cursore | «Temperatura desiderata», «Minima», «Massima», «21,5 °C» |
| **LET — Lettura con storico** | sensori, sensori binari, eventi; per gli altri domini il valore principale | lettura dello **storico dal recorder** (serie passata), montata dopo l'apertura. **Non copre** le serie lette da un attributo, come le previsioni di prezzo di Nordpool (`raw_today`/`raw_tomorrow`): restano nel pannello attuale, candidato specifico (D-12) | valore, unità, caricamento (`Skeleton`), nessun dato | Testo con il valore e un grafico decorativo con descrizione testuale; periodi con `Segmented` | «Ultime 24 ore», «Nessun dato nel periodo», «Aggiornato alle 10:42» |
| **IMM — Immagine** | `entity_picture`, fermo immagine della videocamera, `media_image_url` | nessuno; il tocco apre il pannello specifico della videocamera | caricamento, immagine, non disponibile | Testo alternativo col nome; nessuna immagine automatica nei non collegati | «Anteprima di <nome>», «Immagine non disponibile» |
| **COD — Codice e conferma** | `code_format` presente (serratura, allarme); azioni che richiedono conferma (D-9) | il parametro `code` delle azioni | richiesta del codice, codice errato, conferma | Tastierino a tasti grandi, campo mascherato, focus su «Annulla» nella conferma (`ConfirmSheet`) | «Inserisci il codice», «Sbloccare la porta d'ingresso?», «Annulla», «Sblocca» |
| **TAS — Tastierino direzionale** | entità `remote` collegata, oppure integrazione nota (`webostv.button`) | `remote.send_command`, `webostv.button` | tasto inviato, errore | Croce di 5 tasti più Indietro, Home e Menu, ognuno con nome | «Su», «Giù», «Sinistra», «Destra», «OK», «Indietro», «Home» |
| **INF — Informazioni** | sempre, in fondo | nessuno | chiusa (predefinito) o aperta | Elenco `<dl>` con nomi italiani; attributi grezzi e `entity_id` solo nella parte tecnica (D-14) | «Informazioni», «Ultimo cambiamento», «Batteria», «Informazioni tecniche» |
| **ESI — Esito del comando** | sempre, accanto al comando | — | inviato, confermato, non confermato, errore | Regione `role="status"` sempre presente nel DOM; icona e testo; mai la stessa parola di un pulsante | «Comando inviato», «Comando eseguito», «Il dispositivo non ha risposto. Riprova.» (D-8) |
| **CAM — Campo (ora, data, testo, numero)** | capacità `input` del modello (`kind: 'input'`, es. ora della sveglia Sonos, `inputType: 'time'`, `operationalProfile.ts:686`, validazione HH:MM a riga 1275); `input_datetime`, `date`, `time`, `datetime`; `text`/`input_text` (non in `mode: password`); `number`/`input_number` in `mode: box` | `sonos.update_alarm`, `input_datetime.set_datetime`, `date.set_value`, `time.set_value`, `text.set_value`, `number.set_value` | valore confermato, valore richiesto (in modifica), in attesa, non valido, errore | Campo nativo (`type="time"`, `"date"`, `"text"`, `"number"` con `inputmode`) con etichetta che contiene il nome del dispositivo; validazione prima dell'invio (formato, `min`/`max`/`step`, `pattern`) con messaggio testuale; invio con un pulsante «Imposta», mai a ogni tasto | «Ora della sveglia», «Imposta», «Formato non valido: usa ore e minuti, per esempio 07:30», «Valore fuori dall'intervallo 5-30» |
| **DIS — Disponibilità** | entità `unavailable` o `unknown`, oppure accensione non dichiarata | nessuno; eventualmente «Impostazioni del dispositivo» | non disponibile, spento senza possibilità di accensione, sconosciuto | Testo nella testata e blocchi disattivati, senza farli sparire | «Il televisore è spento. Per accenderlo da qui serve l'accensione dalla rete (Wake-on-LAN).», «Dispositivo non raggiungibile» |

**Estensione del modello [P].** Il vocabolario `Capability` di `widgetDesignModel.ts` (`reading`, `range`, `toggle`, `input`, `options`, `action`, `list`) va esteso invece di crearne un altro:
- `image` e `panel` (rimando a un pannello specifico);
- gruppo e importanza della capacità;
- sola lettura e diagnostica;
- ragione d'indisponibilità per singola capacità;
- conferma obbligatoria.

Le capacità devono essere lette in **un solo punto**, che oggi sono 12. Le due liste di bit dei media vanno riconciliate, ma la regola per il caso «campo assente» ha un effetto visibile e dipende da D-8 bis (tappa T1b, non T1a).

## 4. Cornice comune [P]

**Struttura (un componente, usato dal foglio di uso e, se approvato, da quello delle impostazioni).**

1. **Testata:** icona; nome del widget; stanza (area di HA del dispositivo, se c'è); **stato in parole** («Accesa, 60 %», «Aperta al 40 %», «Spento: si accende dalla rete»); etichetta «Da collegare» grigia se non collegato (coerente con design.md del 2026-10-20 e ISSUE-082).
2. **Corpo:** i blocchi di capacità nell'ordine del profilo, poi l'eventuale pannello specifico, poi «Informazioni» (chiuso).
3. **Azioni della cornice** (in fondo, pulsanti icona con nuvoletta UI-010 o pulsanti con testo, D-4):
   - «**Collega**» (o «Cambia dispositivo» se già collegato): apre la scelta del dispositivo;
   - «**Impostazioni del widget**»: ciò che vale solo per questo widget;
   - «**Impostazioni del dispositivo**»: ciò che vale per ogni widget dello stesso dispositivo;
   - «**Elimina**» con `ConfirmSheet` in variante `danger`: oggi non è nel foglio (D-5).
4. **Piede:** «Fatto» come unico pulsante principale.

**Separazione delle impostazioni, coerente con la regola di ADR-0019 riportata nella richiesta** («copia al collegamento, poi widget indipendenti, impostazioni del dispositivo condivise»). La proposta lascia ad ADR-0019 la definizione del modello dati e delle chiavi:

| Gruppo | Contenuto (da `cardSettings` di oggi) | Effetto di una modifica | Regola |
|---|---|---|---|
| **Impostazioni del widget** | nome e icona del widget, intestazione, cornice e trasparenza, dimensione e pagina, «Controlli nella scheda» (ordine e visibilità), visibilità condizionale, nascondi, `tapAction`, `navigateOnTap`, `artworkMode`, periodo del grafico, aspetto del separatore | solo questo widget | Alla creazione del collegamento sono copiate dalla memoria del dispositivo, poi ogni widget va per conto suo |
| **Impostazioni del dispositivo** | entità sorelle e mappe (auto, aspirapolvere, `adaptiveBindings`, sveglie Sonos, script della stanza, sensore di movimento della videocamera, lettori per lo stream), motore e connessione della videocamera, telecomando collegato (`remoteId`), lettori collegati, modalità preferite del clima, transizione delle luci, valuta e decimali, ultimo elenco delle sorgenti (TV), preferiti tra le sorgenti (se approvati, D-13) | tutti i widget dello stesso dispositivo | Condivise |
| **Non sono impostazioni** | comandi al dispositivo (accensione, livello, sorgente…) | il dispositivo reale tramite HA | Restano nel corpo del pannello, mai nelle impostazioni |

**[V]** Alcune voci sono al confine e la classificazione definitiva spetta ad ADR-0019. Due esempi: la transizione delle luci, che modifica ogni comando inviato, e il periodo del grafico. Il tavolo sopra vale come punto di partenza.

**Preferenze in `localStorage` [O], oggi assenti dalla tabella.** Selezione dei calendari, ultima scelta del lettore, lettori Sonos aggiuntivi, gruppi compressi della stanza, preferenze della mappa dell'aspirapolvere. Stanno nel browser del singolo tablet, non in `cardSettings`: non seguono il widget su un altro dispositivo né la memoria per dispositivo. **[V]** Possibile classificazione da sottoporre ad ADR-0019: calendari scelti e lettori Sonos aggiuntivi descrivono il dispositivo; gruppi compressi e preferenze della mappa sono preferenze di vista del widget; l'ultimo lettore scelto è uno stato di sessione, non un'impostazione.

**Migrazione e conflitti: domande da inoltrare ad ADR-0019, non regole decise qui.**

| Caso | Fatto di oggi [O] | Domanda per ADR-0019 |
|---|---|---|
| **Valori divergenti** | Due widget dello stesso dispositivo possono già avere valori diversi per chiavi che diventerebbero condivise (es. `climateFavoriteModes`, `lightTransition`, valuta e decimali dei costi) | Quando la chiave diventa «del dispositivo», quale valore vince: il widget creato per primo, quello modificato per ultimo, quello della pagina corrente? Si avvisa l'utente? |
| **«Cambia dispositivo» (D-6)** | Le impostazioni copiate al collegamento restano nel widget | Le impostazioni del widget copiate dal dispositivo precedente restano, si azzerano o si ricopiano dal nuovo dispositivo? Le impostazioni del dispositivo precedente restano in memoria? |
| **«Elimina» sull'ultimo widget** | L'eliminazione toglie la scheda e le sue `cardSettings` | La memoria del dispositivo si cancella con l'ultimo widget o si conserva per un collegamento futuro? |
| **Chiavi in `localStorage`** | Elenco sopra | Si migrano nel modello per dispositivo, restano nel browser o si abbandonano? |

Il criterio della tappa T9 include un test di migrazione di dati esistenti con valori divergenti (sezione 8).

**Dove si aprono [O/V].** ADR-0016 vuole i dettagli in uso e le impostazioni solo in modifica. Mostrare i pulsanti delle impostazioni anche in uso, dentro la cornice, cambierebbe ADR-0016: è la domanda D-4. Un foglio unico «Uso e impostazioni» non è proposto (sezione 10).

## 5. Pannelli specifici che restano [P]

| Pannello | Perché nessun blocco basta | Parti comuni che usa comunque |
|---|---|---|
| **Videocamera dal vivo** | flusso HLS/WebRTC/MJPEG, token che cambia, motore go2rtc, PTZ via `onvif.ptz` (`CameraFeed.tsx`, 775 righe) | cornice, ACC, AZI (foto, registra), ESI |
| **Calendario** | l'agenda arriva da `calendar.get_events`, non dallo stato; scelta di più calendari | cornice, INF |
| **Sonos** (gruppi, timer di spegnimento, coda, sveglie) | gruppi: due elenchi con spunte (membri e altoparlanti disponibili), volume per altoparlante, `join`/`unjoin`; servizi propri dell'integrazione chiamati per nome (`sonos.set_sleep_timer`, `clear_sleep_timer`, `get_queue` con risposta, `update_alarm`) | cornice, VOL per riga, MM, SCE, CAM (ora della sveglia), AZI |
| **Scegli contenuto** (`BROWSE_MEDIA`) | navigazione ad albero con il comando websocket `media_player/browse_media`, miniature, ritorno al livello superiore, poi `play_media` (oggi `MediaChooser.tsx`, 152 righe, e la capacità adattiva `adaptiveMediaBrowse`) | cornice, ESI |
| **Casa 3D** | fuori dal modello a capacità (ADR-0014, ADR-0017) | nessuna (pagina intera) |
| *Candidati da decidere (D-12)*: **Nordpool** | integrazione HACS, non di core; prezzi futuri da attributi `raw_today`/`raw_tomorrow`/`tomorrow_valid` con regole di IVA e øre (`nordpoolData.ts:87-137`): LET non basta | cornice, INF |
| *Candidati da decidere (D-12)*: **Meteo con previsioni** | serve `weather.get_forecasts` con risposta | LET |
| *Candidati*: **Attività** (`todo`) | elenco modificabile secondo i flag | cornice |
| *Candidati*: **Aspirapolvere, mappa e stanze** | immagine della mappa e `clean_area` per stanze | AZI, SCE, LET per il resto (oggi `VacuumDetails`, 753 righe) |
| *Composti, non specifici*: **Auto, Stanza, Gruppo di luci** | sono più entità: righe di blocchi | tutti i blocchi in forma di riga |
| *Composto*: **Telecomando TV** | è un TAS più MM e SCE | — |

**Copertura Sonos [P]** (funzioni di oggi → dove andrebbero; da completare con la tabella di copertura di T7k)

| Funzione di oggi | Dove sta oggi [O] | Destinazione proposta |
|---|---|---|
| Riproduzione, volume, sorgente, copertina | `MediaDetails`, adattivo | MM, VOL, SCE, IMM |
| Gruppi (unisci, separa, volume per altoparlante) | pannello Sonos e pagina Sonos | pannello specifico Sonos |
| Timer di spegnimento (impostazione `sonosSleepMinutes`, `sonos.set_sleep_timer`) | solo adattivo (`operationalProfile.ts:600-620`) | pannello specifico Sonos (SCE per i minuti, AZI per «Annulla timer») |
| Coda (`sonos.get_queue`) | solo adattivo (`useMediaResources.ts:80-86`) | pannello specifico Sonos |
| Sveglie: attiva/disattiva e **ora** (`sonos.update_alarm`, `inputType: 'time'`) | solo adattivo (`operationalProfile.ts:673-705`) | pannello specifico Sonos con ACC e **CAM** |
| Scegli contenuto | `MediaChooser`, `adaptiveMediaBrowse` | pannello specifico «Scegli contenuto» |
| Lettori Sonos aggiuntivi (`localStorage`) | pannello attuale | impostazioni del dispositivo, se ADR-0019 lo conferma (sezione 4) |

## 6. Stima delle righe di codice risparmiate [V]

**Metodo.** Righe dei file citati nell'inventario. Ho stimato quanto sparirebbe e quanto andrebbe scritto di nuovo; non ho fatto nessuna misura. Incertezza ±30 %. **Esclusi dalla stima:** i test, le pagine intere (Luci, Multimedia, Sonos, Batterie, Stanze, Casa 3D; sezione 10) e le facce legacy.

**Stima per blocco (righe TS nuove, [V], per analogia con i controlli esistenti):** ACC 60-80; LIV 150-180; VOL 60-80 (riusa LIV); SCE 200-250 (tre forme e ricerca, D-7); MM 80-100 (con la barra di posizione); AZI 60-80; COL 100-130; TEM 80-100; LET 200-250 (sostituisce 5 cronologie, solo serie dal recorder); IMM 50-70; COD 120-150 (tastierino); TAS 80-100; INF 60-80; ESI 40-50; DIS 40-60; CAM 100-150. **Totale 1 500-1 900.**

| Scenario | Righe tolte (stima) | Righe nuove (stima) | Saldo |
|---|---|---|---|
| **A. Solo pannelli (dato principale):** cornice e blocchi sostituiscono i `*Details` dove bastano (luce 276, ventilatore 167, tapparella 237, serratura 91, sensore 98, automazione ~45, clima 307, tosaerba 120, TV 329, allarme 198 + PinPad 103 trasformato in COD, costi 258, auto 367; parti di Multimedia, Aspirapolvere e Stanza ~700, **esclusi** «Scegli contenuto», timer, coda e sveglie Sonos, che restano pannelli specifici) e le 5 famiglie CSS di sezione diventano una. **Nordpool (141) non è contato**: nessun blocco adatto (D-12) | TS 2 900-3 500; CSS 1 000-1 500 | TS 2 100-2 600 (cornice ~300, 16 blocchi 1 500-1 900, modello esteso ~300-400); CSS 200-300 | **TS −300…−1 400; CSS −800…−1 200** |
| **B. Più aiutanti condivisi (condizionato a D-8):** 7 hook di «richiesto o confermato» (926 righe) → 1 (~250); 5 esiti → 1; 5 serie di aiutanti per gli attributi (~410) → 1 (~150); 4 wrapper di icona (411) → 1 (~150); formattazione doppia (~150) | TS 1 900-2 300 | TS 500-600 | **altri TS −1 300…−1 800, solo se D-8 sceglie un'attesa unica** |
| *A + B (solo con D-8)* | | | *TS −1 600…−3 200 (4-9 % dei 36 570); CSS −800…−1 200 (16-24 % dei 4 946)* |

**Test da riscrivere [V].** Le guardie interessate (`AdaptiveCategoryWidget.test` 763 righe, `SystemSheets` 570, famiglie `Av*`, `Utility*`, `Comfort*`, `Controls*`, `Operational*`, `WidgetCommands`, `WidgetGestureControl`, `WidgetDesignModel`, `HaEntityToCapabilities`, `FixSheetsReview`, `CategoryPages`) sono 41 file per circa **12 000 righe** (conteggio con `wc -l` del 2026-10-23). Ordine di grandezza delle righe da riscrivere o sostituire lungo tutte le tappe: **qualche migliaio (3 000-6 000)**, più un test per blocco (16) e uno di migrazione (T9). Il risparmio netto sul codice di prodotto non tiene conto di questo costo.
| *C. Facce legacy convertite all'adattivo (non proposto qui)* | gli hook `use*Control` e le facce legacy | — | possibile ulteriore riduzione di diverse migliaia di righe, ma cambia le facce dei widget creati dal foglio di aggiunta (D-15, sezione 10) |

**[V]** Il risparmio maggiore non viene dai pannelli specifici, che restano, ma da tre fonti: le classi CSS di sezione, gli aiutanti duplicati e la **rimozione del doppio contenuto** in `DetailsSheet`, oggi pagato due volte in DOM e in tempo di rendering.

## 7. Rischi

| Rischio | Effetto | Mitigazione proposta |
|---|---|---|
| **Prestazioni, ISSUE-109** (blocchi di 160-490 ms per ricalcolo dello stile) e **ISSUE-112** (foglio visibile 361-380 ms dopo il tocco, contenuto che sparisce alla chiusura) | Un pannello più ricco o una cornice montata in anticipo peggiorano l'apertura | La correzione di ISSUE-112 appartiene al flusso che la gestisce (0.9.27/ISSUE-109): la cornice ne riusa l'esito e **non deve peggiorare la misura di riferimento**. Montare cronologia, immagini e contenuti multimediali dopo l'apertura (`Skeleton`); righe piatte, senza ombre (il raster delle ombre è la causa nota del lag sul Mali-G52); barra di posizione dei media con temporizzatore locale al blocco; nessun `will-change` né `backdrop-filter`; nessun `ResizeObserver` per riga; misura sul Tab M11 a ogni tappa che cambia il foglio, confrontata con la misura di riferimento |
| **Tensione con ADR-0011 (Kit 2 soft UI)** | Il Kit 2 disegna pulsanti, chip e interruttori in rilievo o incavati con `box-shadow`; righe piatte nel pannello si discostano dallo stile confermato | Domanda di stile, non decisa qui: il mockup mostra righe piatte dentro il pannello e mantiene il rilievo solo sulla superficie del foglio e sul pulsante principale. Da confermare con l'utente insieme alla misura sul Tab M11 |
| **Barra di posizione multimediale** (`SEEK`) | Un aggiornamento al secondo via contesto renderebbe di nuovo tutti i consumatori | Posizione calcolata nel blocco da `media_position` e `media_position_updated_at`, temporizzatore locale fermo a pannello chiuso o in pausa |
| **Pagine intere con gli stessi controlli** (Luci con `BrightnessKnob` in `LightsPage.tsx`, Multimedia, Sonos, Batterie, Stanze) | Restando come sono, i blocchi aggiungerebbero una terza copia degli stessi controlli; cambiandole senza domanda si altererebbe un comportamento visibile | Fuori dal perimetro di questa proposta e della stima (sezione 10); un loro passaggio ai blocchi richiede una domanda e una tappa a parte |
| **Contesto runtime con la mappa intera `entities`** | Ogni cambio di stato fa rendere di nuovo tutti i blocchi | I blocchi ricevono `entityId` e derivano con `useMemo`. Va verificato se `home-assistant-js-websocket` conserva l'identità degli oggetti non cambiati (non verificato) |
| **Test che fissano nomi di classe e testi** (`ctl-*`, `aca-media-*`, `utility-*`, «Apri dettagli», «Impostazioni del widget»; `AdaptiveCategoryWidget.test.tsx` 763 righe, `SystemSheets.test.tsx` 570, famiglie `Av*`, `Utility*`, `Comfort*`, `Controls*`) | Ogni migrazione rompe test che controllano nomi, non comportamenti | Migrare un pannello per tappa e aggiornare nella stessa tappa le guardie di quel pannello, con test di comportamento (ruoli, nomi accessibili, servizi chiamati) al posto dei nomi di classe; e2e `isolated-browser` e `m11-overview` da aggiornare (usano «Apri dettagli») |
| **Migrazione dei pannelli attuali** | Funzioni presenti solo in un pannello (posizioni rapide della tapparella, membri del gruppo luci, «Scegli contenuto», statistiche dell'aspirapolvere) potrebbero sparire | Tabella di copertura funzione per funzione prima di togliere ogni `*Details` **e prima di T6** (anche la parte adattiva ha funzioni che esistono solo lì, vedi D-2); nessuna funzione tolta senza domanda (memoria «Bulk proposals vs user words») |
| **Migrazione delle impostazioni verso il gruppo «dispositivo»** | Valori divergenti tra widget, cambio di dispositivo, eliminazione dell'ultimo widget, preferenze in `localStorage`: perdite di configurazione o scelte implicite | Domande inoltrate ad ADR-0019 (sezione 4); test di migrazione con valori divergenti nel criterio di T9 |
| **Comportamento visibile che cambia unificando** (timeout 10 o 30 s, testi di esito, forme di scelta) | Cambi non richiesti | Domande separate D-7, D-8, D-10; nessuna tappa che li cambia senza risposta |
| **Dipendenza da ADR-0019** | Una cornice progettata prima del modello dati divergerebbe | Le tappe T9 e T10 partono solo dopo l'accettazione di ADR-0019; le tappe T1a, T2, T3 e T4 non dipendono dalle impostazioni |
| **Conflitto con il flusso 0.9.27** | Stessi file (`WidgetSettingsSheet`, `DetailsSheet`, barre di modifica) modificati in parallelo | Realizzazione solo dopo il rilascio della 0.9.27 o su file disgiunti; ricontrollare `git status` a ogni tappa |
| **Fatti di HA non osservati su dispositivi reali** | Attributi reali diversi dalla documentazione (es. TV LG) | Tappa T0: collegare almeno la TV LG (decisione di REP-20261023-001) e osservare attributi, flag e `source_list` prima di T8. Se T0 non è autorizzata, T8 si chiude con il criterio alternativo (dati di prova tratti dal codice di `webostv`) e la prova reale resta «non eseguita» |
| **Accessibilità non provata** (TalkBack, testo al 125-150 %, dito vero) | `role="slider"` su `button` (GestureControl) e `<select>` nativo mai provati con TalkBack | Prova sul Tab M11 inclusa nella tappa Z |
| **Ramo `dev` di HA più avanti della versione installata** | Bit nuovi (es. `CoverEntityFeature.SPEED`) non presenti sul banco 2026.9.4 | Rileggere le costanti sul tag della versione installata nella tappa T1a; i bit sconosciuti si ignorano |

## 8. Tappe piccole e misurabili [P]

Nessuna è autorizzata. Ogni tappa termina con: `npx tsc -p tsconfig.strict.json --noEmit`, `npx eslint src`, `node scripts/lint-typography.mjs`, `node scripts/lint-theme-colors.mjs`, i test mirati della tappa e, dove cambia il foglio, una misura sul Tab M11 (apertura del foglio confrontata con ISSUE-112). Modelli: piano e revisione con un modello grande; realizzazione con un modello leggero (memoria del progetto «Model choice vs credit»).

| Tappa | Contenuto | Comportamento visibile | Prerequisito | Criterio misurabile | Modello |
|---|---|---|---|---|---|
| **T0** | Collegare la TV LG in HA e osservarne attributi e flag (fuori da Acasystem) | nessuno in Acasystem | decisione dell'utente su REP-20261023-001 | attributi reali registrati in un report | utente o agente su HA, con autorizzazione |
| **T1a** | Estensione di `Capability` (image, panel, gruppo, sola lettura, conferma, ragione d'indisponibilità) e un lettore unico di `supported_features` e `supported_color_modes` **usato solo dal codice nuovo**; i 12 punti di lettura esistenti non si toccano | **nessuno** | — (file nuovi o disgiunti da quelli della 0.9.27; ricontrollare `git status`) | test per dominio che confrontano i bit con le costanti di core del tag installato; suite verde; nessun file esistente di controls, home, media o utilities modificato | leggero (Haiku/Sonnet) |
| **T1b** | Riconciliazione delle due liste di bit dei media e passaggio dei 12 punti di lettura (controls, home, media, utilities) al lettore unico | **sì**, per i lettori senza `supported_features` | **D-8 bis**; rilascio della 0.9.27 (stessi file) | test del caso «campo assente» secondo la risposta a D-8 bis; guardie esistenti verdi | Sonnet |
| **T2** | Primitive grafiche `PanelSection`, `PanelRow`, `FactList` (senza HA) e galleria nel kit | nessuno (non ancora usate) | — | test di ruoli e nomi; lint dei livelli | leggero |
| **T3** | Blocchi ACC, LIV, VOL con −/+, ESI, DIS in `components/widgets/` | nessuno finché non sono usati | D-8, D-10 per i testi | un test per blocco: compare solo con la capacità, nome accessibile, −/+, attesa ed errore | leggero |
| **T4** | Blocchi SCE (regola di forma), AZI, MM, COL, TEM, LET, IMM, COD, TAS, INF, CAM | nessuno finché non sono usati | D-7, D-11, D-14 | come T3; per CAM: validazione HH:MM, `min`/`max`/`step`, `pattern` | leggero |
| **T5** | Cornice comune nel foglio di uso, con il corpo montato dopo l'apertura | **sì**: testata, stato in parole, azioni | D-1, D-3, D-4, D-5, D-6; **stato di ISSUE-112 nel flusso che la gestisce** (correzione già rilasciata o esplicitamente non in conflitto); rilascio della 0.9.27 | tempo dal tocco al foglio visibile ≤ misura di riferimento di ISSUE-112 sul Tab M11; alla chiusura del `<dialog>` il contenuto resta visibile fino alla fine dell'animazione d'uscita (nessun fotogramma con corpo vuoto nel profilo adb+CDP); focus sul titolo all'apertura e ritorno al widget alla chiusura; pannello completo utilizzabile a 1280×665 | Sonnet |
| **T6** | Rimozione del doppio contenuto in `DetailsSheet` | **sì** | D-2, D-17; **tabella di copertura funzione per funzione**, separata per D-2 (a) e (b) | un solo controllo per capacità nel foglio (test); ogni funzione della tabella di copertura ancora raggiungibile secondo l'opzione scelta | leggero |
| **T7a…T7m** | Migrazione di un pannello per tappa: **T7a** luce, **T7b** tapparella, **T7c** ventilatore, **T7d** interruttore e sensore, **T7e** serratura (COD), **T7f** clima, **T7g** allarme, **T7h** multimedia (con «Scegli contenuto» come pannello specifico), **T7i** tosaerba, **T7j** costi, **T7k** Sonos (blocchi più pannello specifico esteso: gruppi, timer, coda, sveglie con CAM), **T7l** videocamera (solo inserimento del pannello dal vivo nella cornice), **T7m** aspirapolvere (blocchi; mappa e stanze secondo D-12) | **sì**, per ciascun tipo | T3-T6; tabella di copertura del tipo | ogni funzione della tabella di copertura presente; guardie del tipo aggiornate; nessuna regressione negli e2e | leggero (Sonnet per T7h, T7k, T7l) |
| *Restano sul pannello attuale* | **Nordpool**, **Attività** e **Meteo** (candidati D-12); **Calendario** (specifico, legacy: D-15); **Stanza**, **Auto**, **Gruppo di luci** fino a T10; pagine intere (sezione 10) | — | — | — | — |
| **T8** | Pannello TV per capacità (webOS, Android TV, Apple TV): sorgenti e app in SCE, TAS, avviso d'accensione | **sì** | T7h, D-13; T0 per il criterio principale | **Principale (con T0):** Netflix selezionabile da `source_list` su banco reale; testo DIS se manca l'accensione. **Alternativo (senza T0):** test con dati di prova costruiti dal codice di `webostv` (attributi con e senza `TURN_ON`, elenco conservato da spento), prova reale registrata come «non eseguita» | Sonnet |
| **T9** | Separazione «Impostazioni del widget» / «Impostazioni del dispositivo» nei fogli | **sì** | ADR-0019 accettata e realizzata, con risposta alle domande di migrazione (sezione 4); D-4 | ogni chiave classificata, comprese quelle in `localStorage`; test sulla condivisione tra due widget dello stesso dispositivo; **test di migrazione di dati esistenti con valori divergenti** (es. due `climateFavoriteModes` diversi) secondo la regola di ADR-0019 | Sonnet |
| **T10** | Composti: auto (incluso il localizzatore della «Posizione»), stanza, gruppo di luci come righe di blocchi | **sì** | T7, D-15 | copertura funzione per funzione | leggero |
| **Z** | Prova sul Tab M11 e su telefono: dito vero, TalkBack, testo al 125/150 %, profilo adb+CDP dell'apertura | — | ogni tappa visibile | misure registrate; nessun blocco del thread > riferimento | agente sul tablet con autorizzazione |

## 9. Domande per l'utente

Ogni domanda riguarda **un solo** comportamento visibile. Le opzioni non sono in ordine di preferenza e nessuna è consigliata. **[V]** accanto a ogni domanda riporta solo i fatti utili alla scelta.

- **D-1 — Quale pannello riceve la cornice comune?** (a) solo il foglio di uso (tocco in uso); (b) solo il foglio delle impostazioni e di «Collega»; (c) entrambi. [V] Oggi sono due fogli separati; la richiesta parla di «pannello per la configurazione», che oggi si apre solo per i widget non collegati o in modifica.
- **D-2 — Comandi doppi nel foglio di uso.** Per i widget di categoria il foglio mostra il blocco adattivo e, sotto, il pannello del tipo. (a) resta solo la composizione per blocchi; (b) resta solo il pannello del tipo; (c) restano entrambi come oggi. [V] **Con (b) sparirebbero funzioni che oggi esistono solo nella parte adattiva:** transizione delle luci (`lightTransition`), scelta della voce attiva (`activeId`), «Scegli contenuto» adattivo (`adaptiveMediaBrowse`), timer di spegnimento Sonos (`sonosSleepMinutes`), sveglie Sonos con l'ora, ore e periodo della cronologia (`adaptiveHistoryHours`, `adaptivePeriod`), pausa della videocamera (`cameraPaused`) e la manopola a gesto (D-17). Con (a) va verificato al contrario che nessuna funzione del solo pannello del tipo sparisca. In entrambi i casi T6 richiede prima una tabella di copertura.
- **D-3 — Testata del pannello.** Mostrare in alto stanza e stato in parole («Soggiorno · Accesa, 60 %»)? (a) sì; (b) solo il nome, come oggi.
- **D-4 — Impostazioni del widget e del dispositivo nel pannello di uso.** (a) due voci separate visibili anche in uso (cambia ADR-0016, che vuole le impostazioni solo in modifica); (b) due voci separate solo in modifica; (c) una sola voce «Impostazioni» come oggi, con le due parti dentro.
- **D-5 — «Elimina» nel pannello.** (a) presente nel pannello, con conferma; (b) presente solo in modifica; (c) solo dalla barra della modifica, come oggi.
- **D-6 — Cambiare il dispositivo collegato.** (a) voce «Cambia dispositivo» nella cornice; (b) solo dentro le impostazioni del widget, come oggi.
- **D-7 — Forma delle scelte da elenco.** (a) forma automatica: fino a 3 voci un selettore a segmenti, fino a circa 8 pulsanti a pastiglia, oltre un elenco a comparsa con ricerca, al posto del `<select>` nativo; (b) sempre un elenco a comparsa; (c) lasciare le forme attuali tipo per tipo.
- **D-8 — Attesa di conferma.** (a) un'unica attesa di 10 s per tutti; (b) un'unica attesa di 30 s; (c) attese diverse per famiglia come oggi. Allo scadere: (i) messaggio visibile «Il dispositivo non ha risposto. Riprova.»; (ii) ritorno silenzioso al valore confermato. *D-8 bis (stessa area, regola tecnica con effetto visibile):* se un lettore multimediale non dichiara `supported_features`, (a) si mostrano tutti i comandi, come fa oggi Multimedia; (b) non se ne mostra nessuno, come fa oggi l'adattivo.
- **D-9 — Conferma prima delle azioni delicate.** Per quali azioni chiedere «Sei sicuro?»: sblocca e apri la serratura, disinserisci l'allarme, apri il cancello o il garage, attiva la sirena. Una risposta per azione.
- **D-10 — Tasti −/+ accanto a ogni cursore.** (a) sempre, anche dove oggi c'è solo il gesto (controlli adattivi); (b) solo dove ci sono oggi.
- **D-11 — Saturazione del colore delle luci.** Oggi si sceglie solo la tonalità. (a) aggiungere la saturazione, che è una funzione nuova; (b) lasciare solo la tonalità.
- **D-12 — Pannelli specifici oltre a quelli concordati** (videocamera dal vivo, calendario, Sonos, «Scegli contenuto», Casa 3D). Meteo con previsioni, Attività, mappa e stanze dell'aspirapolvere, **Nordpool** (prezzi futuri da attributi, integrazione non di core): (a) restano specifici; (b) vanno ricondotti ai blocchi, accettando di perdere ciò che i blocchi non sanno fare. Una risposta per pannello.
- **D-13 — Sorgenti della TV.** (a) l'elenco completo come lo dà la TV; (b) alcune sorgenti preferite (es. Netflix) in cima, scelte nelle impostazioni del dispositivo (funzione nuova). Con la TV spenta: (i) mostrare l'ultimo elenco conosciuto, disattivato; (ii) nasconderlo. Senza accensione dalla rete: (x) mostrare il pulsante «Accendi» disattivato con la spiegazione; (y) non mostrarlo.
- **D-14 — Informazioni tecniche.** Oggi `EntityInfoSection` mostra tutti gli attributi con le chiavi grezze. (a) sezione «Informazioni» in italiano, con le chiavi grezze in una parte «Informazioni tecniche» chiusa; (b) come oggi.
- **D-15 — Widget creati dal foglio di aggiunta (legacy) e composti.** (a) anche il loro pannello usa cornice e blocchi; (b) restano con il pannello attuale. Per Stanza, Auto e Gruppo di luci: (i) righe compatte dei blocchi; (ii) pannelli attuali.
- **D-16 — Domini senza widget** (umidificatore, scaldacqua, valvola, sirena, evento, aggiornamento, immagine, testo, data e ora, persona e localizzatore). Con i blocchi diventano possibili a basso costo, ma sono funzioni nuove: (a) aggiungerli in un incarico separato; (b) non ora. Una risposta per dominio. [V] Persona e localizzatore oggi entrano solo come entità sorella dell'auto.
- **D-17 — Manopola a gesto nel pannello.** Oggi `GestureControl` compare anche nel foglio di uso (parte adattiva in `detailsMode`). (a) resta anche nel pannello, accanto a cursore e −/+; (b) solo sulla faccia del widget; nel pannello cursore e −/+.

## 10. Cosa resta fuori

- Qualsiasi realizzazione nel codice; i commit; il banco e il tablet.
- Un foglio unico «Uso e impostazioni»: cambierebbe ADR-0016 e non è proposto qui.
- La conversione delle facce dei widget (scenario C): riguarda la faccia sulla pagina, non il pannello.
- Il modello dati della memoria per dispositivo (ADR-0019, altro flusso) e la 0.9.27 / ISSUE-109.
- L'installazione degli aggiornamenti dal launcher (`update.install`), i moduli per i parametri degli script (`fields`), la PTZ standard (non esiste in HA), i collegamenti diretti dentro Netflix (non nello standard).
- Il collegamento della TV in HA e la rete di HA (REP-20261023-001, opzioni A-F): sono prerequisiti della tappa T0, da decidere a parte.
- Il gergo nei testi attuali («Attendo conferma da Home Assistant…»): segnalato in D-8 e D-14 solo per i nuovi blocchi.
- Le prove su dispositivo (TalkBack, testo ingrandito): pianificate nella tappa Z.
- **Le pagine intere** (Luci con `BrightnessKnob` in `LightsPage.tsx`, Multimedia, Sonos, Batterie, Stanze, Casa 3D): censite dall'inventario ma **fuori dal perimetro** di blocchi, tappe e stima. Usare i blocchi anche lì richiederebbe una domanda e una tappa a parte; finché non c'è, restano come sono e la duplicazione con i blocchi va accettata come rischio (sezione 7).
- I widget per i domini oggi senza widget (D-16), compresi `image`, `text`, `date`/`time`/`input_datetime`, `person`/`device_tracker`; una mappa per la posizione di persone o dell'auto.
- I modi `white` e i canali bianchi di `rgbw`/`rgbww` delle luci; `camera.record` (scrive sul server di HA, richiede `allowlist_external_dirs`).

**Proposte da registrare nel registro dei problemi** (non registrate qui per non scrivere `project-status.md` in parallelo con altri flussi): doppio contenuto in `DetailsSheet`; 12 letture di `supported_features` con regole opposte per i media; 7 hook di «richiesto o confermato» con timeout diversi; `GestureControl` con `role="slider"` su un `button` senza −/+ (WCAG 2.5.7); `EntityInfoSection` con chiavi grezze; luci a colori senza saturazione; TV LG senza un tipo dedicato e lista delle app solo per Apple TV.

## Avanzamento e modifiche

| File | Modifica |
|---|---|
| `documentazione/reports/REP-20261023-002-studio-pannelli-widget.md` | nuovo (questo report) |
| `documentazione/design/proposte/pannello-widget-comune.html` | nuovo, mockup statico marcato PROPOSTA: solo HTML e CSS in linea, nessuno script, colori del Kit 2 di `themes/kit2/tokens.css` (fondo `#e4ebf5`, accento viola `#6d5dfc`, scuro `#1b1d23`) |
| `documentazione/design/proposte/` | nuova cartella, segnalata come proposta in `design/README.md` |
| `documentazione/decisions/ADR-0020-pannelli-per-capacita.md` | nuova bozza, stato «Proposta» |
| `documentazione/reports/README.md`, `documentazione/decisions/README.md`, `documentazione/design/README.md` | una riga o un paragrafo aggiunti, dopo aver riletto il file |
| Revisione dopo la critica (2026-10-23) | report, ADR-0020 e mockup rivisti (sezione «Rettifiche dopo la critica»); nel mockup righe piatte dentro il pannello, nomi accessibili corretti, esempio 4 con la variante delle azioni; le tre righe di indice aggiornate solo nella parte di questo studio |

Appunti preparatori (non versionati): `backup/studio-pannelli/inventario.md`, `capacita-ha.md`, `primitive.md`.

**Correzione rispetto agli appunti.** `capacita-ha.md` diceva che con la TV spenta `source_list` sparisce. Il codice di core (`media_player/entity.py`) dice altro: `source_list` e `sound_mode_list` sono attributi di capacità e restano anche con lo stato `off`; spariscono solo volume, contenuto e immagine. Inoltre `webostv` conserva l'ultimo elenco quando la TV è spenta. **[V]** Con la TV «non disponibile» (senza automazione d'accensione) la presenza dell'elenco non è stata verificata: memorizzarlo nelle impostazioni del dispositivo (ADR-0019) resta utile come riserva.

## Verifiche ed evidenze

| Controllo | Comando o procedura | Esito | Evidenza e limiti |
|---|---|---|---|
| Versione corrente di HA | GitHub API `repos/home-assistant/core/releases/latest`, 2026-10-23 | Eseguito | `2026.10.2`, pubblicata il 2026-10-16T20:04:09Z. Banco 2026.9.4 (REP-20261023-001) |
| Bit di `media_player`, `light`, `cover`, `climate` | lettura di `homeassistant/components/<dominio>/const.py` sul ramo `dev` | Eseguito | Valori nella sezione 2. Ramo `dev`, non il tag installato |
| Attributi del lettore spento | `media_player/entity.py` (`state_attributes`, `capability_attributes`) | Eseguito | Con `off` restano solo `group_members` e gli attributi di capacità |
| Comportamento di `webostv` | `webostv/media_player.py` e la pagina `home-assistant.io/integrations/webostv/` (build della documentazione 2026.10.2) | Eseguito | `TURN_ON` solo con automazione di accensione; elenco conservato da spento; `select_source` → `launch_app`/`set_input`; Netflix compare solo come voce d'esempio di `source_list` |
| Azioni `join`/`unjoin` | `home-assistant.io/integrations/media_player/` | Eseguito, parziale | Descrizioni lette; campi non dettagliati nella pagina (NV) |
| `FanEntityFeature` e gli altri domini | documentazione per sviluppatori tramite riassuntore | Non verificato sul codice | NV, ora marcato riga per riga nella matrice (sezione 2) |
| Fatti di codice citati dalla critica | `grep` in sola lettura sul working tree del 2026-10-23: `operationalProfile.ts` (righe 600-705 e 1275), `useMediaResources.ts:80-86`, `nordpoolData.ts`, `AdaptiveCategoryWidget.tsx:164-174`, `CarDetails.tsx:156-183`, `MediaChooser.tsx` (152 righe); `wc -l` sui 41 file di test di guardia | Eseguito | numeri di riga soggetti a scorrimento per le modifiche di altri flussi |
| Inventario del codice | lettura del working tree e conteggi con grep (appunti) | Eseguito | numeri di riga soggetti a scorrimento |
| Mockup | apertura nel browser | **Non eseguito** | vietato aprire browser sul PC in questo incarico: da guardare a cura dell'utente o in una tappa successiva |
| Test, lint, build | — | Non eseguiti | nessuna modifica al codice |

## Controllo del diff e decisioni

- **Diff rispetto alla richiesta:** solo documenti e un mockup statico. Nessun file sotto `progetto/` è stato toccato. Gli indici sono stati modificati solo con aggiunte, dopo averli riletti.
- **Decisioni:** bozza [ADR-0020](../decisions/ADR-0020-pannelli-per-capacita.md) in stato **Proposta**, non approvata. Il numero 0019 è riservato alla memoria per dispositivo (altro flusso) e lo 0015 resta riservato a «Hub e bridge».
- **Nessuna nuova funzione autorizzata.** I blocchi per domini senza widget, la saturazione del colore e i preferiti tra le sorgenti sono elencati solo come domande.

## Chiusura e punto di ripresa

Lo studio è completato. **Nessuna tappa di realizzazione è autorizzata.**

**Prossimo passo:** le risposte dell'utente a D-1…D-17. In parallelo, l'esito di ADR-0019 (con le domande di migrazione della sezione 4) e la decisione sul collegamento della TV (REP-20261023-001), che sblocca T0. Senza nessuna risposta si possono avviare, se l'utente le autorizza, solo le tappe **T1a** e **T2**, che non cambiano nulla di visibile e non toccano i file della 0.9.27. T1b richiede D-8 bis e il rilascio della 0.9.27.

## Rettifiche dopo la critica (2026-10-23)

Una revisione critica dello stesso workflow ha segnalato 16 rilievi. Sono stati verificati in sola lettura sul codice (sezione «Verifiche») e **applicati tutti**, con le scelte seguenti dove il rilievo ammetteva alternative:

| Rilievo | Esito |
|---|---|
| Capacità `input` senza blocco (ora della sveglia Sonos) | Applicato: nuovo blocco **CAM** (sezione 3), righe `input_datetime`/`date`/`time`/`text` nella matrice, tabella di copertura Sonos (sezione 5) |
| LET e Nordpool | Applicato con la seconda opzione: LET resta solo storico dal recorder; Nordpool spostato tra i candidati specifici (D-12), marcato HACS non di core; 141 righe tolte dal saldo |
| «Scegli contenuto», coda e timer Sonos | Applicato: «Scegli contenuto» al livello 3; pannello Sonos esteso a timer, coda e sveglie; quota Multimedia del saldo ridotta da ~1 000 a ~700 righe |
| T1 con effetti visibili | Applicato: T1a (nuovo codice, nessun effetto) e T1b (prerequisiti D-8 bis e rilascio della 0.9.27) |
| Migrazione delle impostazioni senza regole | Applicato come **domande per ADR-0019**, non come regole (sezione 4); test di migrazione nel criterio di T9 |
| T6 senza tabella di copertura | Applicato: tabella richiesta per D-2 (a) e (b); funzioni esistenti solo nell'adattivo elencate in D-2 |
| Manopola a gesto | Applicato: nuova domanda **D-17** |
| Pagine intere | Applicato con la prima opzione: dichiarate fuori perimetro (sezione 10) ed escluse dalla stima; rischio della terza copia registrato |
| Fatti di HA senza NV; `camera.record` | Applicato: NV riga per riga; `camera.record` tra i limiti |
| VOL, ACC del clima, MM con `SEEK`, COL | Applicato nel catalogo e nella matrice; `white` e `rgbw`/`rgbww` dichiarati fuori |
| Domini spariti | Applicato: righe `image`, `text`, data e ora, persona e localizzatore; D-16 e sezione 10 estese; localizzatore tra le entità sorelle dell'auto |
| Mockup con ombre e una sola variante | Applicato: righe piatte dentro il pannello; tensione con ADR-0011 registrata come rischio e domanda di stile; aggiunta una variante «azioni come oggi» (D-4 c, D-5 c, D-6 b) e una nota che la disposizione disegnata non è consigliata |
| Accessibilità del mockup | Applicato: esito «Comando eseguito», `aria-valuetext` con unità, nomi con il dispositivo, «Altre 6…» come pulsante con `aria-haspopup`; regole di focus e altezza utile aggiunte al catalogo. **Limite:** l'altezza a 1280×665 non è misurata (nessun browser), solo annotata come da verificare in T5 |
| ISSUE-112 in T5 e ADR-0020 | Applicato: prerequisito di T5; ADR-0020 chiede solo di non peggiorare la misura di riferimento; criterio di chiusura del `<dialog>` definito |
| Stima | Applicato: stima per blocco (aggregata per analogia, [V]); ordine di grandezza dei test (41 file, ~12 000 righe, 3 000-6 000 da riscrivere); A come dato principale, B condizionato a D-8 nel riepilogo e in ADR-0020 |
| T7 e T8 | Applicato: sottotappe T7a…T7m con tutti i tipi, riga dei tipi che restano sul pannello attuale, criterio alternativo di T8 senza T0 |

**Non applicati:** nessuno. Le scelte che restano aperte sono state trasformate in domande (D-12, D-16, D-17, stile delle righe piatte) o inoltrate ad ADR-0019, senza decidere al posto dell'utente.

**Da aggiornare a cura di chi chiude l'incarico:** `project-status.md`, con le proposte dell'elenco della sezione 10.
