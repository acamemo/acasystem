# Stanze

Modo: **Operate**. Richiesta del 2026-11-12 «vogliamo finire tutto?», REQ-18/19 e ADR-0049; [REP002](../../reports/REP-20261112-002-widget-rimanenti.md), build locale .70. Home, schermata completa, Console ed explorer condividono appartenenza e controlli, con primitive ACA Vetro Bianco e transizioni esistenti.

## Appartenenza conservativa

Gli entityIds storici restano associazioni esplicite, anche quando è presente areaId. Nessuna migrazione al mount. Una nuova associazione confermata dall'utente registra roomMembershipSource='area' e segue il registro HA corrente: area diretta dell'entità prima dell'area del dispositivo; niente raggruppamento per nome, marchio o integrazione. ID nascosti/disabilitati esclusi senza abilitarli. Aggiunte, esclusioni e ruoli espliciti esistenti restano validi; lo snapshot originale non viene cancellato.

Stanza da collegare è una sezione unica per schede native e categorie. La scelta legge insieme aree, dispositivi ed entità, con scadenza e Riprova; Collega la stanza applica area, nome, icona, appartenenza e provenienza nella stessa operazione con memoria e vero ACK. Rimosso il vecchio aggiornamento separato che salvava campi indipendenti. Cambi di contesto, fonte o ruoli invalidano risposte e comandi tardivi.

## Uso

Tessera con nome e riepilogo prioritario; nelle taglie piccole si riducono le informazioni dal markup, mantenendo interi i controlli presenti. Nei dettagli: letture con unità native e controlli già previsti per luci, clima, media, aspirapolvere e altre entità compatibili. I gruppi non deducono consumi né nuovi stati aggregati; il comando accettato non certifica un'azione fisica. Capacità e servizi effettivi, permessi personali e percorso tracciato restano obbligatori.

Il cambio termostato azzera la richiesta in preparazione, senza trasferirla ad altri canali. La luce principale e gli altri ruoli appartengono allo scope della stanza. Registri non pronti sospendono i comandi; le associazioni storiche restano leggibili e recuperabili. Tecnica e manutenzione sono separate secondo entity_category, senza classificazione dal nome.

Verifiche simulate, audit dei callback, geometrie e limiti hardware nel REP002. Nessun cambio al modello globale dei dispositivi, al layout dei profili, ai servizi o ai permessi.

Fonti primarie lette il 2026-11-12: [Aree HA](https://www.home-assistant.io/docs/organizing/areas/), [registro aree](https://contributors.home-assistant.io/core/integrations/area-registry/), [registro entità](https://contributors.home-assistant.io/core/entities/registry/). L'appartenenza all'area non sostituisce device_id per i widget di prodotto.
