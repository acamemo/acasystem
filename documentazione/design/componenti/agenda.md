# Calendario e Attività

Modo: **Operate**. Richiesta del 2026-11-12 «vogliamo finire tutto?», REQ-18/19 e ADR-0049; attuazione locale .70 nel [REP002](../../reports/REP-20261112-002-widget-rimanenti.md). ACA Vetro Bianco, primitive e transizioni comuni. Tipi, ID, calendari associati e lista salvata conservati.

## Fonti e interazione

La selezione multipla Calendari usa lo stesso componente nelle categorie e nei widget storici, conserva riferimenti mancanti e applica una sola patch su Applica. Attività usa Lista di attività e la stessa API di salvataggio. Memoria e adozione storiche sono parte del cambiamento; una bozza locale non conclude la conferma della centrale. Attesa e errore sono distinti, niente doppio invio o riavvio automatico di un comando incerto. Cambi fonte, risorsa, proprietario o connessione invalidano completamenti tardivi; la propria patch ottimistica rimane in attesa dell'ACK.

Calendario mostra gli appuntamenti non conclusi, intervalli, luogo e giornate intere; i dettagli raccolgono più fonti senza duplicare l'intestazione adattiva. Date giornaliere e datetime restano distinti, la fine è esclusiva e il fuso è quello della casa. Una risposta incompleta non significa agenda vuota. Si conserva una scelta globale dei calendari già esplicitamente salvata nei dettagli; in sua assenza si segue l'associazione del widget. Solo un gesto umano salva una nuova preferenza. Nessun nuovo editor appuntamenti, espansione locale di ricorrenze o servizio cloud.

Attività distingue stato osservato, comando accettato, rifiuto ed esito non determinato. Aggiunta, completamento e rimozione sono quelli già presenti: disponibili solo con capacità HA e servizio corrispondenti. Mancanza di capacità equivale a sola lettura; identificatori ambigui non sono azionabili. Conferma riletta dopo l'azione, mutex condiviso fra Home/dettagli, nessun replay offline. Le letture hanno scadenza e retry esplicito, conservando e qualificando dati precedenti quando possibile.

## Densità e verifica

Home sintetica: le taglie fisicamente piccole mostrano un riepilogo o una sola riga; righe complete e aggiunta compaiono solo quando lo spazio basta. Nomi lunghi accessibili per intero nei dettagli. Schermata completa con scorrimento comune, nessun blur o animazione per riga aggiunto. Errori e attese mutuamente esclusivi. Test e QA del pacchetto esatto, negativi e limiti nel REP002; dati reali, Safari/iPhone e hardware non sono certificati dalla simulazione.

Fonti primarie lette il 2026-11-12: [Calendar entity](https://contributors.home-assistant.io/core/entities/calendar/), [Calendar Core 2026.10.4](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/calendar/__init__.py), [Todo capacità 2026.10.4](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/todo/const.py), [Todo servizi 2026.10.4](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/todo/services.py). Contratti di riferimento, non prova della specifica integrazione installata.
