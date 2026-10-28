# REP-20261027-003 — Flusso unico «Aggiungi un dispositivo» filtrato per famiglia, prima la TV (piano)

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261027-003, piano del flusso unico per famiglia (REQ-18, REQ-19) |
| Stato | In attesa di input (piano scritto; decisioni P-1…P-5 dell'utente) |
| Data | 2026-10-27, Europe/Rome |
| Autore / modello | Claude Code, `claude-opus-5-5` |
| Commit di partenza | `ea77f46` su `master` |
| Richiesta di riferimento | «allora anche noi dai singoli widget per collegare un dispositivo, come un TV, dovremmo aggiungere un flusso che permetta di aggiungere questi tipi di televisori, e stessa cosa per ogni dispositivo che ogni widget legge, sei d'accordo?»; dopo la proposta dell'agente (un motore, un filtro per famiglia, prima la TV): «Sì, prepara il piano per il flusso unico filtrato per famiglia, partendo dalla TV.» |
| Obiettivo di prodotto ribadito | 2026-10-27, prima delle risposte a P-1…P-5: «l'obiettivo di acasystem, oltre a quello di fornire un interfaccia personalizzata della nostra azienda di HA, deve andare completamente a bypassare HA, anzi deve essere una versione migliorata di HA attuale, perciò dobbiamo anche attenerci non solo a ricreare le funzioni base di HA di accoppiamento coi dispositivi, dobbiamo studiarle e fornire nella nostra interfaccia una versione facilitata di tali flussi» |
| Autorizzazione | Solo il piano. Nessun codice, banco, HA o tablet toccati. La realizzazione richiede l'approvazione dell'utente del piano e delle scelte P-1…P-5. |

## Obiettivo e perimetro

**Problema osservato.** Collegare la TV Samsung su `localhost:3007` è stato difficile per l'utente. Dal codice a `ea77f46`:
- dal widget TV, «Aggiungi un dispositivo» c'è solo per il tipo `androidtv` (`templates/sheets/AddWidgetSheet.tsx:485`, `templates/sheets/CategoryBindingSection.tsx:48`), non per `appletv`;
- quel percorso apre subito il catalogo con una sola marca consigliata, LG (`RECOMMENDED_HANDLERS = { tv: ['webostv'] }`, `templates/devices/deviceTexts.ts:148`); per una Samsung bisogna cercare la marca e scrivere l'indirizzo IP;
- il collegamento con un tocco («Televisori in rete», `GET /api/dispositivi/tv-in-rete` e `POST …/:tvId/collega`, F5) e «Pronti da aggiungere» esistono solo dentro il widget «Rileva dispositivi» (`components/widgets/utilities/discover/DiscoverDetails.tsx`), che il cliente deve prima aggiungere.

**Risultato voluto.** Una sola schermata «Aggiungi un dispositivo», la stessa da ogni ingresso, filtrata per la famiglia del widget che la apre. Prima la TV; le altre famiglie entrano dopo con soli dati (marche consigliate, testi di abbinamento), senza un flusso nuovo.

**Ordine della schermata per una famiglia:**
1. **In rete:** gli apparecchi della famiglia che HA vede (per la TV: «Televisori in rete» con «Collega»; le scoperte di HA della famiglia con «Aggiungi»).
2. **Già in Home Assistant:** quelli della famiglia senza widget, con «Usa questo».
3. **Marche consigliate** per la famiglia.
4. **Altra marca:** il catalogo completo, come oggi.
5. Quando le liste 1-2 sono vuote, una riga che dice il motivo se il server lo conosce (servizio spento, versione di HA non provata); il resto di ISSUE-122 resta fuori.

**Modifiche ammesse (dopo l'approvazione):** frontend dei fogli e dei dispositivi, il widget «Rileva dispositivi» se si sceglie P-3, un campo in più nella risposta di `/tv-in-rete` o del catalogo se si sceglie P-4. Nessuna rotta nuova necessaria per la TV.

**Esclusi:** attivazione dell'identità di servizio senza terminale (ISSUE-121) e versioni di HA (ISSUE-124), che restano prerequisiti; accensione della Samsung via Wi-Fi; famiglie diverse dalla TV (solo predisposte); pulsante generale «Aggiungi dispositivo» nel «+» del launcher o in Sistema (proposta separata); grafica del widget TV e consolle ([REP-20261027-002](REP-20261027-002-consolle-widget.md)).

**Collegamenti:** REQ-18, REQ-19, AC-18, AC-19; [ADR-0021](../decisions/ADR-0021-configurazione-dispositivi-da-acasystem.md), [ADR-0022](../decisions/ADR-0022-identita-di-servizio-dispositivi.md), [ADR-0024](../decisions/ADR-0024-aggiunta-libera-dispositivi-scoperti.md); [REP-20261026-006](REP-20261026-006-rileva-dispositivi.md) (F1-F5); ISSUE-118, ISSUE-121…125.

**Modifiche preesistenti:** albero di lavoro pulito a `ea77f46` (solo `.claude/` non tracciata). Il lavoro della consolle (REP-20261027-002) tocca i file del widget TV, non i fogli: se riprende in parallelo, coordinare `AddWidgetSheet.tsx`.

## Principio: flussi di HA studiati e resi più facili

Dall'obiettivo ribadito dall'utente il 2026-10-27. Oggi F4 disegna i passi dallo schema che HA manda (`data_schema`): è la stessa sequenza dell'interfaccia di HA con la nostra grafica. Il principio nuovo: per ogni integrazione si studia il flusso di HA e Acasystem ne offre una versione più facile, senza perdere nulla di ciò che HA permette. Le leve, per ogni passo:
- **Compilare da solo** ciò che Acasystem sa già (indirizzo dalla rete, nome dal modello, stanza dal widget).
- **Saltare** i passi con un'unica scelta sensata, tenendoli raggiungibili in «Altre opzioni».
- **Spiegare con parole e immagini** l'azione sull'apparecchio (PIN sullo schermo, «Consenti», tasto da premere).
- **Prevenire gli errori noti** (TV spenta, rete diversa, modello che non si fa scoprire) prima di avviare il flusso, con il motivo e il rimedio.
- **Completare dopo il collegamento** ciò che in HA si fa in altre pagine: opzioni dell'integrazione (sorgenti, app), telecomando, accensione, stanza, widget.

Il modulo generico di F4 resta il ripiego per le integrazioni non ancora studiate. Il principio vale per tutte le famiglie; questo piano lo applica prima alle TV (T0). Se l'utente lo conferma come regola generale, va scritto in REQ-18 o in un ADR (proposta, non fatto).

## Piano a passi

**T0 — Studio dei flussi di HA per le TV (solo documenti).**
- Fonti: codice di HA al tag della versione in uso (2026.10.4) per `config_flow.py`, `strings.json` e il flusso delle opzioni di `samsungtv`, `webostv`, `androidtv_remote`, `braviatv`, `philips_js`, `panasonic_viera`, `apple_tv`, `roku`, `cast`; documentazione delle integrazioni; i flussi osservati sull'HA reale per la Samsung.
- Per ogni integrazione una scheda: passi e campi di HA, scoperta (SSDP, zeroconf, DHCP), cosa chiede sull'apparecchio, errori e motivi di interruzione, opzioni dopo il collegamento, accensione; poi la versione Acasystem con le leve sopra e i passi eliminati.
- Esito: una sezione o un allegato di questo report, che guida T2-T5 e le marche di T3.

**T1 — Pezzi condivisi fuori dal widget.**
- Spostare `useTvsOnNetwork`, `useDiscoveredDevices`, `useUnboundDevices` e la riga `TvRow` da `components/widgets/utilities/discover/` a un livello che sia i fogli sia il widget possono importare (le regole di livello vietano ai widget di importare dai fogli). Scelta esecutiva del punto esatto, secondo [ADR-0004](../decisions/ADR-0004-principi-frontend.md).
- Aggiungere a ciascuna un filtro `family` opzionale, usando le tabelle già presenti in `utils/devices/classify.ts` (`PLATFORM_FAMILY`, `TV_PLATFORMS`).

**T2 — Componente `DeviceFinder` (`templates/devices/`).**
- Prop `family` (facoltativa: senza, tutte le famiglie) e i quattro gruppi dell'elenco sopra.
- «Collega», «Aggiungi» e «Altra marca» aprono `AddDeviceFlow` sul posto, come oggi in «Rileva dispositivi» (`tvId`, `discoveredFlowId`, catalogo).
- «Usa questo» seleziona il dispositivo nel foglio che ha aperto la schermata.

**T3 — Marche consigliate per famiglia dai dati.**
- TV: Samsung (`samsungtv`), LG (`webostv`), Android/Google TV (`androidtv_remote`), Sony (`braviatv`), Philips (`philips_js`), Panasonic (`panasonic_viera`), Apple TV (`apple_tv`), Roku (`roku`). Sono già i gestori di `TV_BRANDS` nel server (`services/devices/tvClassify.ts`).
- Una sola fonte: o `RECOMMENDED_HANDLERS` per famiglia nel frontend, o un campo «famiglia» nel catalogo del server (P-4 decide se il server ne è coinvolto).
- Testi di abbinamento per le marche nuove in `PAIRING_HINTS` (cosa fare sulla TV: «Consenti», PIN, codice).

**T4 — Ingressi dal widget TV.**
- In «Aggiungi un widget» (passo `device`) e in «Collega» (`CategoryBindingSection`): `DeviceFinder family="tv"` al posto di `AddDeviceFlow kind="tv"` diretto.
- Vale per `androidtv` e, se P-2, per `appletv`.
- Se non c'è nessuna TV in HA, la schermata si apre già sulla ricerca (P-1).
- Alla fine il nuovo lettore è selezionato nel foglio e il telecomando collegato da solo (`pairedRemoteId`, già nel widget).

**T5 — Niente IP a mano per la TV (P-4).** Scelta una marca dal catalogo, se HA vede in rete un apparecchio di quella marca (DHCP/SSDP con prefisso MAC o produttore, già calcolato da `classifyTvs`), l'indirizzo è proposto e basta confermarlo; resta modificabile.

**T6 — «Rileva dispositivi» sullo stesso componente (P-3).** Il widget mostra `DeviceFinder` senza filtro, così le liste sono una sola implementazione. Il comportamento visibile resta quello di oggi.

**T7 — Prove.**
- Test unitari: filtro per famiglia, ordine dei gruppi, ingresso con lista vuota, marche consigliate, indirizzo proposto; i test di `TvOnNetwork`, `DiscoverDetails` e dei fogli aggiornati.
- Controlli: typecheck strict, ESLint, tipografia e colori, suite completa del frontend (e del backend se P-4 tocca il server).
- **Prova reale** sulla copia `acasystem-ha-s45` (`localhost:3007`, servizio attivo): «Rimuovi dispositivo» sulla Samsung, poi dal widget TV «Aggiungi un widget → TV → Collega» e PIN dal Tab M11; conteggio dei tocchi; ripetuta con un utente non amministratore. Serve l'utente davanti alla TV.

**Dopo la TV (fuori da questo piano):** luci e prese (Shelly, Hue, WiZ, TP-Link), clima e sensori, poi le altre famiglie; per ognuna solo dati di T3 più una prova reale (ISSUE-123). Matter, Zigbee/Z-Wave e i cloud dei produttori restano «Richiede l'installatore» o passo esterno, come in F4.

## Esito di T0: flussi TV di Home Assistant 2026.10.4

**Metodo.** Tre subagenti Claude Code (modello Sonnet) hanno letto, al tag `2026.10.4` di `home-assistant/core` (esistente: tutti i file hanno risposto), `config_flow.py`, `strings.json`, `manifest.json` e, dove serviva, `media_player.py`, `remote.py`, `bridge.py`, `__init__.py` dei nove domini, più le pagine `https://www.home-assistant.io/integrations/<dominio>/` (consultate il 2026-10-27). L'agente principale ha ricontrollato sui file scaricati: richiesta del PIN all'ingresso del passo e `KEY_POWEROFF` di `samsungtv`; nessuna chiamata Wake on LAN nei file letti di `samsungtv`; `set_wol_mode(True)` di `braviatv`; `digest_auth_pairing` di `philips_js`; PIN casuale generato da HA e aggregazione di 15 s di `apple_tv`; nuovo abbinamento automatico su `ConnectionClosed` di `androidtv_remote`; `single_config_entry` di `cast`; `poweron`/`poweroff` di `roku`. I numeri di riga riportati dai subagenti non sono tutti esatti (per `apple_tv` non corrispondono): qui si citano le funzioni. Non sono state lette le librerie esterne (`samsungtvws`, `aiowebostv`, `panasonic-viera`, `pybravia`, `haphilipsjs`, `pyatv`, `androidtvremote2`, `rokuecp`): durata dei PIN e attese sulla TV restano non verificate. Legenda: [C] codice di HA, [D] documentazione, [X] deduzione.

### Riepilogo

| Integrazione | Si fa scoprire da HA | Passi HA (manuale) | Azione sulla TV | Accensione da spenta | Passo che resta all'utente in Acasystem |
|---|---|---|---|---|---|
| `samsungtv` | SSDP, DHCP (OUI e `tizen*`), zeroconf AirPlay [C] | `user` (host) → `pairing` (vuoto) o `encrypted_pairing` (PIN) per H/J [C] | «Consenti» (attesa fino a 31 s) o PIN a 4 cifre [C] | Solo con un'automazione sul trigger `samsungtv.turn_on`; nessun WoL nel codice letto, la doc dice il contrario [C][D] | Premere «Consenti» o scrivere il PIN |
| `webostv` (LG) | Solo SSDP [C] | `user` (host) → `pairing` (vuoto); da SSDP direttamente `pairing` [C] | «Sì» sul popup [C] | Solo con automazione sul trigger `webostv.turn_on` (WoL consigliato, meglio via cavo, impostazione sulla TV) [C][D] | Confermare il popup |
| `panasonic_viera` | Nessuna [C] | `user` (host, nome) → `pairing` (PIN) solo per i modelli cifrati [C] | PIN; uno nuovo a ogni errore [X da C] | Da interfaccia no: `on_action` solo in YAML; da spenta l'entità risulta non disponibile [C] | Scrivere il PIN (modelli cifrati) |
| `androidtv_remote` (Hisense, TCL, Xiaomi, Google TV) | Solo zeroconf `_androidtvremote2._tcp` [C] | `user` (host) → `pair` (PIN) [C] | PIN; se annullato sulla TV, HA ne chiede uno nuovo da solo [C] | Tasto `POWER` se HA la crede spenta; niente WoL [C] | Scrivere il PIN |
| `cast` | zeroconf; una sola voce per tutta la casa, ogni Cast diventa un lettore da solo [C] | `user`/`config` con `known_hosts` facoltativo [C] | Nessuna | No: `turn_on` avvia solo una schermata, `turn_off` chiude l'app [C] | Nessuno |
| `roku` | SSDP, HomeKit [C] | `user` (host) e fine [C] | Nessuna; se rifiuta, «Accesso alla rete» nelle impostazioni del Roku [D] | `poweron`/`poweroff` distinti [C]; effetto da standby non verificato | Nessuno |
| `braviatv` (Sony) | SSDP [C] | `user` (host) → `authorize` (PSK sì/no, SSL) → `pin` o `psk` [C] | Attivare «Controllo remoto»; poi PIN a schermo o chiave PSK impostata sulla TV [D] | Il flusso attiva il WoL sulla TV (`set_wol_mode(True)`) e `turn_on` è supportato [C]; cosa invii la libreria non verificato | Attivare il controllo remoto e scrivere PIN o chiave |
| `philips_js` | zeroconf `_philipstv_rpc` / `_philipstv_s_rpc` [C] | `user` (host, `api_version` 1/5/6) → `pair` (PIN) solo per API 6 [C] | PIN (API 6); modelli vecchi: jointSPACE [D] | Solo con automazione sul trigger o TV raggiungibile; WoL/IR esterni [C][D] | Scrivere il PIN (API 6) |
| `apple_tv` | zeroconf, molti servizi; aggrega 15 s [C] | `user` (nome o IP) → `confirm` → un abbinamento per ogni protocollo [C] | Di norma più PIN in sequenza, uno per protocollo; per DMAP è HA a mostrare un PIN da digitare sulla Apple TV [C][X] | `atv.power.turn_on()` se disponibile; lo spegnimento non è reale [C] | Scrivere uno o più PIN |

### Cosa si semplifica, valido per tutte

1. **I passi senza campi si inviano da soli.** `samsungtv` (`confirm`, `pairing`), `webostv` (`pairing`), `androidtv_remote` (`zeroconf_confirm`), `roku` (`discovery_confirm`), `braviatv` e `philips_js` (`confirm`/`zeroconf_confirm`) hanno pagine con il solo «Invia». In Acasystem diventano un'unica schermata «Guarda la TV» prima di partire [C].
2. **I campi tecnici si compilano da soli.** Indirizzo sempre (già in F5); `api_version` di Philips letta da `/system` sulle porte 1925/1926 [D]; per Sony la scelta PIN o PSK proposta da Acasystem invece della domanda di HA; per Apple TV l'IP al posto del nome, che evita la scansione [C].
3. **I passi si spiegano prima di avviare il flusso, perché il PIN compare appena il passo si apre** (Samsung H/J, Panasonic, Sony, Android TV, Philips) [C]. Il flusso va avviato solo quando la persona è davanti alla TV, e la schermata deve dire quanti codici arriveranno (Apple TV).
4. **Gli errori evitabili si controllano prima.** TV accesa e raggiungibile sulla stessa rete; TV già collegata (MAC, UDN, numero di serie). Per Sony e Roku, se fallisce, si indica l'impostazione da attivare sulla TV, che HA dice solo dopo [C][D].
5. **Dopo il collegamento, in un solo passo, quello che in HA sta altrove:**
   - accensione: un'automazione sul trigger di Samsung, LG e Philips, solo dove la TV può accendersi (WoL con il MAC già noto, meglio via cavo) [D];
   - app di Android TV, che nelle opzioni di HA sono vuote [C]: YouTube, Netflix, Prime Video e Disney+ con i link della doc;
   - sorgenti LG (default «tutte»);
   - abbinamento Cast + Android TV per la stessa TV [D].
6. **Cast è un caso a parte.** Se la voce «Google Cast» manca la si crea senza domande; se l'mDNS non passa, l'IP va in `known_hosts` [C].

### Effetti sul piano

- **T3, marche consigliate:** Roku e Cast non chiedono nulla e vanno per primi quando sono in rete. Panasonic non si fa scoprire, quindi è solo «per marca» con l'indirizzo proposto (T5).
- **T5, indirizzo proposto:** serve a tutte le marche tranne Cast. Per Panasonic è l'unica strada.
- **Nuovo, da approvare (P-6):** una scheda di guida per marca prima del flusso, con l'azione sulla TV, le impostazioni da attivare (Sony «Controllo remoto», Roku «Accesso alla rete», LG «LG Connect Apps») e il numero di codici attesi.
- **Nuovo, da approvare (P-7):** il passo «Accensione» dopo il collegamento crea l'automazione di accensione per Samsung, LG e Philips. Oggi `PowerStep` esiste; va verificato cosa fa per ogni marca prima di estenderlo.
- **Restano da provare su TV vere:** durata dei PIN e attese (librerie non lette); Samsung WoL (doc e codice non concordano); nomi dei tasti Android TV `MEDIA_REWIND`/`MEDIA_FAST_FORWARD` (solo doc); numero di PIN di Apple TV per modello; risposta SSDP di Roku senza numero di serie.

Le schede complete dei subagenti (passi, campi, errori e opzioni per integrazione) non sono copiate qui. I file di HA scaricati sono nella cartella temporanea della sessione e non sono conservati.

## Scelte per l'utente

| ID | Domanda | Proposta dell'agente |
|---|---|---|
| P-1 | Dal widget TV senza televisori in HA: la schermata di ricerca si apre subito, o resta la riga «Aggiungi un dispositivo» sotto la lista vuota? | Si apre subito: è il caso del cliente che parte da zero. |
| P-2 | Il widget Apple TV riceve lo stesso ingresso (filtrato su `apple_tv`)? | Sì, costo minimo. |
| P-3 | «Rileva dispositivi» passa sul componente condiviso? | Sì: una sola implementazione, niente divergenze. |
| P-4 | Indirizzo proposto dalla rete quando si sceglie una marca (piccola modifica al server)? | Sì: toglie la parte più difficile per un cliente. |
| P-5 | Chi fa la prova reale e quando (PIN sulla TV)? | L'utente con il Tab M11 su `localhost:3007`, dopo i test automatici. |
| P-6 | Scheda di guida per marca prima del flusso (azione sulla TV, impostazioni da attivare, quanti codici)? Nata da T0. | Sì: è il punto in cui HA è più difficile. |
| P-7 | Il passo «Accensione» crea l'automazione di accensione per Samsung, LG e Philips dove la TV lo consente? Nata da T0. | Sì, ma come passo successivo, dopo aver verificato `PowerStep` e con una TV LG via cavo. |

## Criteri di completamento

1. Dal widget TV (e Apple TV se P-2) la schermata mostra, in ordine, TV in rete con «Collega», TV già in HA senza widget, marche consigliate, altra marca.
2. Una TV riconosciuta in rete si collega con «Collega» + conferma sulla TV + nome e stanza, e il foglio torna con il lettore e il telecomando già scelti.
3. «Rileva dispositivi» mostra le stesse liste di oggi (se P-3).
4. Controlli e suite verdi; prova reale registrata in `verification.md` con l'esito vero, compresi i limiti.

## Avanzamento e modifiche

**2026-10-27:** scritto questo piano dopo una lettura del codice a `ea77f46` (fogli, `templates/devices/`, `components/widgets/utilities/discover/`, `routes/devices.ts`, `services/devices/tvClassify.ts`). Nessun codice modificato.

**2026-10-27 notte, T1-T6 realizzati** (l'utente: «Confermo P-1…P-7 come proposte. Procedi con T1-T6 e i test di T7.»). Il codice l'ha scritto un subagente Claude Code (modello Sonnet); l'agente principale ha rivisto il diff, ha corretto due punti e ha ripetuto i controlli. Nessun commit. Il server e i file del widget TV non sono stati toccati.
- **T1/T2:** il nuovo `components/widgets/utilities/discover/DeviceFinder.tsx` sta nello strato dei widget, quindi lo usano sia i fogli sia «Rileva dispositivi»; un trasloco non serviva, perché i template possono importare i widget. Con una famiglia l'ordine è: Televisori in rete, Trovati in rete, «Già in Home Assistant» con «Usa questo», Marche consigliate, Altra marca. Se le liste sono vuote compare una riga sola che lo dice; se il servizio è spento compare il motivo. I tre hook hanno un filtro facoltativo `{ family, handlers }`.
- **T3:** `utils/devices/recommendedBrands.ts` è una tabella di soli dati con le 8 marche TV. Una marca avvia subito la sua integrazione: `startDomain` passa da `DiscoveredFlowProps`, `AddDeviceFlow` e `useDeviceFlow`. `RECOMMENDED_HANDLERS` del catalogo resta com'era (solo LG «consigliato» in «Altra marca»), perché unirlo avrebbe mostrato i nomi tecnici delle integrazioni.
- **T4 e P-1/P-2:** «Aggiungi un widget» e «Collega» aprono `DeviceFinder family="tv"` per Android TV e Apple TV; per Apple TV c'è anche `handlers=['apple_tv']`, ma «Già in HA» si filtra solo per famiglia. Nel foglio, se non c'è nessuna TV, la ricerca si apre subito; «Esci» torna ai tipi di widget. In «Collega» resta la riga.
- **T5 (P-4) senza modifiche al server:** se `/tv-in-rete` ha una TV collegabile della stessa marca, la riga dice «Trovata in rete: …» e il tocco usa il suo `tvId`, quindi l'indirizzo lo compila il server. Per una marca non trovata in rete l'indirizzo va ancora scritto.
- **P-6:** il nuovo `GuideStep.tsx` («Prima di cominciare», «Sono davanti alla TV, continua») compare prima di ogni chiamata al server per «Collega» e per le marche. `PAIRING_HINTS` ha i testi per 7 marche e `HANDLER_HINTS` per tutte e 8. **Correzioni dell'agente principale:** niente guida per Roku, dove sulla TV non succede nulla e la guida sarebbe solo un tocco in più; dopo la guida, anche per una marca scelta, i passi senza campi partono da soli (`TvConsentStep`), come già con «Collega». Effetto: un tocco in meno rispetto a prima per LG via marca; la guida aggiunge un tocco a «Collega».
- **T6:** `DiscoverDetails.tsx` usa `DeviceFinder` senza famiglia, con gli stessi testi e lo stesso comportamento di prima.
- **P-7, solo verifica:** `PowerStep` chiama `setupPower`. La ricetta del server (`powerRecipe.ts`) vale solo per LG `webostv`: crea `wake_on_lan` e l'automazione sul trigger `webostv.turn_on`. `deviceService.ts` restituisce `power` solo per `webostv`, quindi per Samsung e Philips il passo non compare. Estenderlo richiede ricette nuove nel server: non fatto.

**2026-10-27/28 notte, prova reale sul Tab M11** (istanza `:3013`, via USB con `adb reverse tcp:3013 tcp:3013`; copia `acasystem-ha-s45`, HA 2026.10.4; comandi seguiti con un ascolto in sola lettura degli eventi di HA).
1. **Lista dei lettori:** con la Samsung già in HA il foglio mostra la Samsung spenta e le due LG irraggiungibili come se fossero pronte, e la ricerca non si apre da sola (P-1 vale solo con la lista vuota). È ISSUE-120 nel foglio. L'agente ha proposto di mostrare «Spenta» e «Non raggiungibile»; l'utente: «Per ora no».
2. **«Rimuovi dispositivo» è difficile da trovare:** compare solo in `CategoryBindingSection`, cioè nelle impostazioni di una pagina di categoria con una TV collegata. Su autorizzazione dell'utente («procedi 2») la voce `samsungtv` è stata rimossa dall'agente con l'API di HA.
3. **Difetto di T5:** dopo la rimozione HA ha riscoperto la Samsung via SSDP e ha aperto un suo flusso (`confirm`), così la TV è passata da «Televisori in rete» a «Trovati in rete». La riga «Samsung» delle marche guarda solo `/tv-in-rete`, quindi ha chiesto l'indirizzo. Correzione da fare: considerare anche le scoperte di HA con lo stesso gestore.
4. **Collegamento:** l'utente ha ricollegato la TV dal tablet con il PIN (voce creata alle 00:26:47). Il suo giudizio: «È abbastanza semplice configurare il televisore con l'interfaccia che abbiamo fatto». Il percorso esatto scelto (scoperta di HA o indirizzo scritto) non è registrato.
5. **Comandi:** spegnimento, volume, canali e telecomando hanno funzionato all'inizio, poi i tasti hanno smesso. Lo fanno anche dopo ricarica, riavvio della TV e nuovo abbinamento: ISSUE-126. Acasystem invia i comandi correttamente, perché tutti arrivano a HA.
   - **Corretto il 2026-10-28** (l'utente: «Sì, correggi ora il difetto di T5»). In `DeviceFinder.tsx` la riga della marca usa prima una scoperta di HA aggiungibile con lo stesso gestore: mostra «Trovata in rete: <nome>» e, dopo la guida, ne riprende il flusso (`POST /scoperti/:id/aggiungi`). Se non c'è, usa `/tv-in-rete`; se manca anche quella, avvia l'integrazione. In `AddDeviceFlow.tsx`, dopo la guida, i passi senza campi si inviano da soli anche quando si riprende una scoperta (`guided`), così il PIN compare subito dopo «continua». «Aggiungi» in «Trovati in rete» resta senza guida, come prima. Nuovo test in `DeviceFinder.test.tsx`: 7 file dei dispositivi, 125/125.
6. **Osservazioni sulla grafica (widget TV, flusso REP-20261027-002):** i tasti volume ± e canale ± della tendina sembrano ridondanti rispetto alle manopole. È una proposta, non applicata.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Lettura del codice | Ricerca nei sorgenti a `ea77f46` | Eseguito | Punti citati sopra con file e righe; nessuna prova dell'app. |
| T0, studio dei flussi | Lettura dei sorgenti di HA al tag `2026.10.4` e della documentazione, tre subagenti; ricontrollo a campione dell'agente principale | Eseguito | Vedi «Esito di T0»; librerie esterne non lette; nessuna prova su TV. |
| Typecheck strict, ESLint, tipografia, colori | `npm run typecheck`, `lint`, `lint:typography`, `lint:theme-colors` in `progetto/acasystem/frontend` | Superato | 0 violazioni (603 e 411 file). |
| Test dei dispositivi | 7 file con `vitest --maxWorkers=4` | Superato | 124/124, con il nuovo `DeviceFinder.test.tsx` (15). |
| Suite completa | `npx vitest run --maxWorkers=4` | Superato | 232 file, 3446 test. |
| Prova nell'app | Istanza separata `127.0.0.1:3013`, stessa HA di prova | Non eseguito | Il server risponde (`/api/health` 200, «flows on»); serve l'accesso dell'utente. |
| Prova reale con la Samsung sul Tab M11 | T7, istanza `:3013`, utente davanti alla TV | Parziale | Collegamento con PIN riuscito e giudicato «abbastanza semplice»; difetto di T5 con le scoperte di HA; tasti ignorati dalla TV (ISSUE-126). Non provati: cliente non amministratore, guida della marca con la TV trovata, altre marche. |

## Controllo del diff e decisioni

Solo documenti. Nessun ADR nuovo: il piano applica ADR-0021 e ADR-0024. Il pulsante generale e le altre famiglie restano proposte.

## Chiusura e punto di ripresa

In attesa dell'approvazione del piano e delle risposte a P-1…P-5. L'utente ha detto di voler cambiare alcune scelte, poi ha ribadito l'obiettivo di prodotto: il principio e T0 sono stati aggiunti; le scelte restano da confermare (con il principio, P-1 e P-4 seguono la direzione «più facile di HA»). **T0 è fatto (2026-10-27):** l'utente ha detto di confermare le scelte dopo lo studio; ora P-1…P-7. **Aggiornamento, stessa notte:** P-1…P-7 confermate, T1-T6 realizzati e controlli verdi, senza commit. **Punto di ripresa:** l'utente accede all'istanza `localhost:3013` (o sul tablet con `adb reverse tcp:3013 tcp:3013`), poi la prova reale di T7: «Rimuovi dispositivo» sulla Samsung, poi «Aggiungi un widget → TV», guida e PIN; infine il commit, su richiesta. Le ricette di accensione per Samsung e Philips (P-7) vanno pianificate a parte. In origine: poi T1-T7 nell'ordine; prerequisito per la prova reale: servizio attivo sulla copia `acasystem-ha-s45`.
