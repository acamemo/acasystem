# REP-20261029-003 — Widget del gateway Zigbee

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261029-003, widget del gateway Zigbee |
| Stato | Completato (non committato) |
| Data | 2026-10-29 |
| Autore / modello | Claude Code, `claude-opus-5-5`. La sessione è stata avviata da un'altra sessione Claude Code. |
| Commit di partenza | `5c321b9` |
| Richiesta di riferimento | «mi serve un widget per zigbee gateway» |
| Autorizzazione | Lo studio e la proposta sono stati fatti prima del codice; l'utente ha poi scelto il perimetro (vedi «Decisioni dell'utente»). Sono autorizzati il widget nel frontend, l'esempio in `#/mockup` (solo `src/utils/mockup/*`) e i test. Nessun commit, push o cambio di dipendenze senza richiesta. |

## Obiettivo e perimetro

Il widget mostra lo stato del coordinatore Zigbee di Home Assistant e permette di aggiungere dispositivi Zigbee senza aprire HA (principio «tutti fanno tutto», REP-20261028-004). Il lavoro tocca solo il frontend `progetto/acasystem/frontend/src`; backend, banco, HA reale e tablet non sono toccati.

**Modifiche preesistenti.** Il working tree contiene il lavoro non committato del widget TV (REP-20261029-001/002), anche in alcuni file toccati qui:
- `utils/mockup/mockData.ts`, `haStore.ts`, `mockConnection.ts`;
- `__tests__/MockupHa.test.ts`.

In questi file ho solo aggiunto righe; le modifiche altrui sono conservate. `git diff --stat` coincide con `git diff --ignore-cr-at-eol --stat`.

## Studio: come HA espone il coordinatore Zigbee

Fonti lette il 2026-10-29. Ho letto il codice sorgente; nessuna prova è stata fatta su un HA reale.

- home-assistant/core, ramo `dev` al commit `632725fd`, cartella `homeassistant/components/zha/`: `websocket_api.py`, `services.yaml`, `services.py`, `helpers.py`, `__init__.py`, `const.py` e `manifest.json` (zha 2.4.2). Anche `components/config/*` e `components/mqtt/__init__.py`. https://github.com/home-assistant/core/tree/dev/homeassistant/components/zha
- zigpy/zha, tag 2.4.2 (`c048c4a8`): `zha/zigbee/device.py` e i sensori del coordinatore. https://github.com/zigpy/zha/tree/2.4.2
- Koenkk/zigbee2mqtt, `master` a `344b6e03` (2026-10-02, versione 2.14.2): `lib/extension/homeassistant.ts` e `lib/extension/bridge.ts`.
- Documentazione di Zigbee2MQTT, pagina «Device availability». https://www.zigbee2mqtt.io/guide/configuration/device-availability.html

| Tema | ZHA | Zigbee2MQTT (scoperta MQTT) |
|---|---|---|
| Stato del coordinatore | Stato della config entry `zha` (`loaded`, `setup_retry`…), leggibile senza amministratore. Non esiste un'entità «in linea». | `binary_sensor.*_bridge_connection_state` (connectivity, `on`/`off`). Le altre entità del bridge diventano `unavailable`. |
| Numero di dispositivi | Registro dispositivi: identificatori `("zha", ieee)`, escluso il coordinatore e i gruppi. | Dispositivi con `via_device_id` uguale al bridge, esclusi i gruppi. |
| Non raggiungibili | Entità `unavailable`. | Solo se in Z2M è attivata la disponibilità, che è spenta per impostazione predefinita. |
| Batteria scarica | `sensor` con `device_class: battery`. | `sensor` battery e `binary_sensor` battery_low. |
| Aggiunta (permit join) | Servizio `zha.permit` (`duration` 0–254 s), **solo amministratore**. | `switch.*_bridge_permit_join` (254 s acceso, 0 spento). |
| Canale e PAN | WebSocket `zha/network/settings`, **solo amministratore**. | Solo nel topic MQTT `bridge/info`; si legge con `mqtt/subscribe`, solo amministratore. |
| Firmware | `sw_version`, `manufacturer` e `model` del coordinatore nel registro. | `sw_version` (versione di Z2M) e `hw_version` («tipo revisione») del bridge. |
| Altro | WebSocket solo amministratore: backup (`zha/network/backups/create`), cambio canale, topologia. | `button.*_bridge_restart`, `select.*_bridge_log_level`. |

Non confermati: i nomi delle chiavi di `NetworkBackup.as_dict()`, cioè canale e PAN in ZHA.

## Decisioni dell'utente (2026-10-29)

Proposta fatta: riquadro con stato, numero di dispositivi, avvisi e conto alla rovescia; dettagli con aggiunta, elenchi e informazioni sul gateway; canale escluso. Risposte dell'utente:
- integrazioni: «ZHA e Zigbee2MQTT»;
- dettagli: «Basta così», più «Riavvia Zigbee2MQTT» e «Backup della rete ZHA»;
- riquadro: «Sì, come proposto».

## Criteri di completamento

1. Un nuovo tipo di widget «Gateway Zigbee» (`zigbee_card_*`) si aggiunge dal foglio, gruppo «Dispositivi», senza scegliere niente. Riconosce da solo ZHA o Zigbee2MQTT.
2. Il riquadro (predefinito 2×2, in riga 2×1, al massimo 4×2) mostra:
   - stato «Attivo» o «Non raggiungibile»;
   - numero di dispositivi;
   - «N non rispondono» e «N batterie scariche»;
   - «Aggiunta aperta · m:ss» mentre l'aggiunta è aperta.
3. I dettagli contengono:
   - «Aggiungi un dispositivo Zigbee»: 254 s; ZHA con `zha.permit`, Z2M con l'interruttore del bridge. Ci sono il conto alla rovescia, l'elenco dei nuovi e «Chiudi l'aggiunta»;
   - gli elenchi «Non rispondono» e «Batterie scariche»;
   - stato, numero di dispositivi, integrazione, modello e firmware (per Z2M anche la versione);
   - «Salva una copia della rete» per ZHA e «Riavvia Zigbee2MQTT» per Z2M.
4. In `#/mockup` c'è una rete ZHA con una batteria scarica. Toccando «Aggiungi», dopo 6 s si aggiunge un «Sensore finestra».
5. Test e controlli richiesti superati; prova su `#/mockup` a 1280×665 e a 390×844.

## Avanzamento e modifiche

**Nuovi file** in `components/widgets/utilities/zigbee/`:
- `zigbeeData.ts`: legge le reti dai registri e dagli stati. Conta come «non risponde» solo un dispositivo con tutte le entità `unavailable`, perché `unknown` significa solo che non c'è ancora una lettura. La batteria è scarica al 20% o meno, come nella pagina delle batterie.
- `useZigbeeNetwork.ts`: legge `config/device_registry/list`, `config/entity_registry/list` e `config_entries/get` (`domain: zha`) con la connessione del widget. Rilegge quando cambia il numero di entità, così un dispositivo appena aggiunto compare da solo.
- `useZigbeeJoin.ts`: finestra d'aggiunta condivisa tra riquadro e dettagli. Per ZHA il conto alla rovescia è dell'app, perché HA non ne espone uno. Per Z2M l'aggiunta è aperta finché l'interruttore è acceso; se è stata aperta altrove, il tempo non si mostra. Il rifiuto `unauthorized` ha un testo proprio.
- `ZigbeeWidget.tsx` e `ZigbeeDetails.tsx`, composti con le primitive condivise dei widget utilità (`UtilityCard`, `Chip`, `Section`, `StatList`, `CommandButton`; ADR-0004).

**Registrazione:**
- `components/widgets/utilities/index.ts`: icona `server`.
- `templates/sheets/catalog.ts`: gruppo «Dispositivi» e categoria «Utilità».
- `templates/sheets/categoryPages.ts`: il tipo non va collegato a un dispositivo.
- `api/cardActions.ts` e `utils/cardUtils.ts`.
- `templates/launcher/DetailsSheet.tsx`: il tipo `zigbee` è escluso dalla testata del singolo dispositivo, che altrimenti mostrava «Dispositivo non disponibile».

**`#/mockup`:**
- `mockData.ts`: coordinatore ZHA SONOFF con firmware `7.4.4.0 build 0`. Il «Sensore soggiorno», già ZHA, ora è collegato a lui. Nuovi «Pulsante ingresso» (batteria al 12%), «Sensore movimento corridoio» e «Presa lampada lettura». La presa e il sensore sono fra i non raggiungibili dello scenario «Non raggiungibili». C'è anche il dispositivo che si aggiunge con `zigbeeJoinedDevice`.
- `haStore.ts`: `zha.permit` aggiunge il sensore dopo 6 s; con durata 0 l'aggiunta in attesa si annulla.
- `mockConnection.ts`: risponde a `config_entries/get` e a `zha/network/backups/create`.

**Test:**
- Nuovo `__tests__/ZigbeeGateway.test.tsx` con 20 test.
- Aggiornate tre attese per le aggiunte alla casa e al catalogo:
  - `UtilityMatchers`: icona del nuovo tipo;
  - `MockupHa`: due prese invece di una, e tre dispositivi senza widget invece di due, perché si aggiunge la presa Zigbee.

**Nota sul comportamento.** Il tipo è nella categoria «Utilità». Il test del catalogo richiede che ogni tipo appartenga a una categoria. Di conseguenza, chi sceglie la pagina «Utilità» già popolata trova anche il widget Zigbee. Senza Zigbee il widget mostra «Nessun gateway Zigbee in Home Assistant».

## Verifiche ed evidenze

Ambiente: Windows 11, in `progetto/acasystem/frontend`.

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Tipi | `npm run typecheck` | Superato | Nessun errore. |
| Lint | `npm run lint` | Superato | Nessun avviso. |
| Tipografia | `npm run lint:typography` | Superato | 0 violazioni su 617 file. |
| Colori del tema | `npm run lint:theme-colors` | Superato | 0 violazioni su 562 file. |
| Build | `npm run build` | Superato | Resta l'avviso preesistente sul blocco `hls` oltre 500 kB. |
| Test mirati | `npx vitest run` su ZigbeeGateway, UtilityMatchers, MockupHa, MockupRoute, CategoryPages, CategoryPageGrid | Superato | 20/20 nel file nuovo. Il test della testata dei dettagli fallisce se si toglie la correzione (provato) e passa con la correzione. |
| Suite completa | `npx vitest run` | Vedi «Suite completa» sotto | |
| Browser | `dist` servita sulla porta 4317 e Playwright headless da `progetto/acasystem/node_modules/playwright`, `#/mockup`, pagina «Utilità», a 1280×665 (DPR 1,5) e 390×844 (DPR 3) | Superato | Riquadro «Attivo», «4 dispositivi», «1 batteria scarica». Dettagli senza testata del dispositivo. «Aggiungi» mostra il conto alla rovescia e dopo 6 s «Sensore finestra · Aggiunto». Il riquadro mostra «Aggiunta aperta · 4:06». Nessun errore in console. Gesti sintetici: non provato sul Tab M11 né con un gateway reale. |

## Controllo del diff e decisioni

Il diff corrisponde alla richiesta e alle scelte dell'utente. Nessun ADR nuovo. Nessuna dipendenza aggiunta. Il backend non è toccato.

**Limiti noti:**
- Su ZHA, `zha.permit` e il backup richiedono un account amministratore di HA; con un account diverso il widget lo dice.
- Su Z2M, «non rispondono» funziona solo se in Zigbee2MQTT è attiva la disponibilità.
- Il canale non si mostra.
- Con più gateway il widget mostra il primo: prima ZHA, poi i bridge Z2M.

## Chiusura e punto di ripresa

Il lavoro è completo nel working tree e non è committato. Restano da fare:
- prova con un gateway reale ZHA o Zigbee2MQTT;
- prova sul Tab M11;
- commit, quando l'utente lo chiede.

Nessun altro incarico attivo da questo report.
