# Gateway Zigbee

Modo: **Operate**. Richiesta del 2026-11-12 «vogliamo finire tutto?», REQ-18/19 e ADR-0049; [REP002](../../reports/REP-20261112-002-widget-rimanenti.md), attuazione locale .70. Hub e terminali restano distinti. Nessun nuovo broker, trasporto, scanner universale o aggiornamento firmware.

## Rete e dispositivi

Si conserva la scelta automatica esistente della prima rete ZHA/Zigbee2MQTT rilevata. Stato ignoto, non collegato, errore di lettura e rete caricata sono distinti. Registri limitati nel tempo, aggiornamenti tramite eventi e rilettura, retry esplicito; dati precedenti qualificati come tali. Un insieme di entità tecniche indisponibili non significa automaticamente dispositivo guasto. I nomi restano leggibili e i dettagli tecnici secondari.

## Associazione e manutenzione

Apertura esplicita e temporanea: ZHA usa il servizio permit con durata254 secondi o0 per chiudere, Zigbee2MQTT usa soltanto l'esatto controllo permit_join del bridge, riconosciuto anche se rinominato tramite unique_id. Nessun ripiego su uno switch generico. Lock condiviso fra Home e dettagli, guardie contro doppi invii, scope casa/account/connessione/visibilità, nessun comando al mount o timer che riapre/chiude autonomamente la rete.

Per ZHA il conto alla rovescia è stimato dall'accettazione HA. Comparso in Home Assistant indica un nuovo elemento osservato nel registro, non una certificazione dell'abbinamento fisico. Timeout e risposte tardive restano esiti incerti senza reinvio automatico. Per Zigbee2MQTT lo stato osservato del permit rimane distinto dalla richiesta.

Informazioni tecniche e Manutenzione usano Disclosure comuni, senza blur sovrapposto. La copia ZHA richiede amministratore verificato attraverso auth/current_user; ruolo ignoto sospende l'azione e il server conserva la verifica dei permessi. Il testo Richiesta di copia accettata da Home Assistant descrive il contratto dell'adattatore esistente, senza dichiarare copia completa: il timeout backend10s resta distinto dai5–30s possibili del servizio HA. Riavvio e comandi esistenti restano tracciati e personali.

Test ZHA/Z2M e QA locale sono simulati; nessuna radio, qualità rete, backup effettivo o dispositivo reale collaudato. Il report distingue il membro non disponibile dalla rete offline e registra le prove visive.

Fonti primarie lette il 2026-11-12: [ZHA servizi Core 2026.11.1](https://github.com/home-assistant/core/blob/2026.11.1/homeassistant/components/zha/services.yaml), [ZHA WebSocket 2026.11.1](https://github.com/home-assistant/core/blob/2026.11.1/homeassistant/components/zha/websocket_api.py), [Zigbee2MQTT discovery2.6.3](https://github.com/Koenkk/zigbee2mqtt/blob/2.6.3/lib/extension/homeassistant.ts), [integrazione HA](https://www.zigbee2mqtt.io/guide/usage/integrations/home_assistant.html). La consultazione documentale non attesta la versione installata.
