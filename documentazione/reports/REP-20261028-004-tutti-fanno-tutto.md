# REP-20261028-004 — Tutti fanno tutto: attivazione automatica, riparazione da sola, nessun blocco dell'installatore

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261028-004 |
| Stato | Sviluppo fatto e verificato con HA simulato; prova reale in corso; non committato |
| Data | 2026-10-28, in ufficio (Europe/Rome) |
| Autore / modello | Claude Code, `claude-opus-5-5` (piano e controllo); implementazione con agenti Sonnet |
| Commit di partenza | `451649f`, con il lavoro non committato di REP-20261028-003 nell'albero |
| Richiesta di riferimento | Vista la schermata «Servizio non attivo… chiedi all'installatore di attivarla»: «l'installatore non deve essere obbligato ad andare sul posto, come risolviamo questa problematica?». Poi: «L'account creato dall'utente, dal sistemista, da chicchessia, deve permettere agli utenti di fare tutto sull'app senza richiedere un aiuto da vicino del sistemista… (abbiamo clienti distanti anche 60km da noi)». E: «non è che ci sta un amministratore o ci sta un utente standard che non può fare cose. Tutti devono poter fare tutto, fondamentalmente… Deve essere così semplice da usare che non devono nemmeno arrivarci a chiamare». |
| Autorizzazione | «Scrivi il piano e procedi con lo sviluppo: attivazione automatica, riparazione da sola, via tutti i blocchi dell'installatore.» (2026-10-28) |

## Principio

Nell'app tutti possono fare tutto: sistemista, programmatore, cliente o nonno del cliente. Nessuna funzione richiede l'installatore, un account amministratore, un terminale o un'uscita a domicilio. Il sistema si ripara da solo; un pulsante visibile a tutti è solo l'ultima risorsa, da indicare al telefono.

L'account di HA del tablet può restare non amministratore: le operazioni passano dal server con l'utente di servizio e l'app non mostra differenze. Così un tablet rubato non dà i poteri di amministratore su HA. [Scelta dell'agente; l'utente può chiedere diversamente.]

## Cosa cambia

| # | Oggi | Dopo |
|---|---|---|
| T1 | Il servizio si attiva solo con `docker exec … activate` e la password del proprietario (ADR-0022 punto 3) | **Su HA OS** l'add-on usa il token del Supervisor (`homeassistant_api: true`) per creare da solo l'utente «Acasystem (servizio)» e il suo token. **Altrove** il server attiva da solo quando entra un amministratore di HA, con la sua sessione, senza password. Il comando da terminale resta come strada di riserva |
| T2 | Token scaduto, revocato o utente sospeso: funzione spenta finché l'installatore non interviene | Controllo all'avvio, periodico e a ogni rifiuto: il server rifà l'attivazione da solo, rinnova il token prima della scadenza e riattiva l'utente di servizio sospeso |
| T3 | Messaggio «chiedi all'installatore di attivarla» | Pulsante «Ripara il servizio» per tutti: rilancia subito T1/T2. Testo per il caso senza mezzi automatici (solo fuori da HA OS e senza amministratore entrato) |
| T4 | `INSTALLER_ONLY_OPERATIONS`: togliere l'accensione della TV, leggere il registro | Per tutti |
| T5 | Voci create a mano in HA non toccabili da Acasystem | Toccabili; restano escluse solo le integrazioni di sistema di HA (Supervisor, backup, Sole, Meteo…), che non sono dispositivi |
| T6 | Testi «chiedi all'installatore», «serve l'installatore», «lo inserisce l'installatore» | Ogni testo diventa una soluzione automatica o un'azione che chiunque fa nell'app (per esempio il MAC della TV letto da HA o dalla rete, oppure scritto dal cliente) |
| T7 | Campi dei flussi ancora non disegnati: `serial_port`, `file`, `entity`, `qr_code` (REP-20261028-003, S1b) | Disegnati: scelta della porta seriale, caricamento del file in HA, scelta dell'entità, codice QR mostrato a schermo |
| T8 | Versione di HA non verificata: l'attivazione si ferma | L'attivazione prova lo stesso e verifica l'esito (crea e annulla un flusso di prova); se fallisce lo dice nel registro e riprova al giro successivo |

## Decisioni toccate

- **ADR-0022** (identità di servizio): il punto 3 (attivazione dal terminale) e l'alternativa 2 (token del Supervisor, scartata come uso continuo) cambiano. Il token del Supervisor serve solo a creare e riparare l'utente di servizio visibile; le operazioni restano dell'utente di servizio, limitate dall'elenco della facciata. Annotazione datata nell'ADR.
- **REQ-06 / AC-06** (ruoli admin/cliente): superati dal principio. Annotazione in `product.md`.
- **ADR-0024** e **AC-19 punto (4)**: già superati il 2026-10-28 per il completamento senza installatore.

## Tappe

| Tappa | Contenuto | Chi |
|---|---|---|
| B1 | Server: T1, T2, T3 (endpoint di riparazione), T4, T5, T6 lato server, T8; `homeassistant_api: true` nel pacchetto HA OS | Agente Sonnet |
| B2 | Server e frontend dei campi: T7 | Agente Sonnet |
| F1 | Frontend: pulsante «Ripara il servizio» dove oggi c'è «Servizio non attivo», testi senza installatore, MAC della TV inseribile dal cliente | Agente Sonnet |
| V | Suite complete, build, prova nel browser con HA simulato; prova reale sulla VM HA OS con l'add-on (non eseguibile finché l'add-on non è installato) | Orchestratore |

## Criteri di completamento

1. Nessun testo dell'interfaccia dice «installatore» come condizione per andare avanti.
2. Su HA OS, con l'add-on appena installato, il servizio si attiva senza azioni di nessuno (da provare sulla VM).
3. Con un utente non amministratore, ogni operazione dell'app è permessa.
4. Token revocato o utente sospeso: entro il giro successivo, o con «Ripara il servizio», la funzione torna.
5. Suite e controlli verdi; testi in italiano semplice.

## Sviluppo (2026-10-28)

Tre agenti Sonnet in parallelo (B1 server, B2 campi, F1 app), poi controllo e correzioni dell'orchestratore.

**B1, server:**
- `services/devices/serviceKeeper.ts` (nuovo): attivazione e riparazione. Su HA OS usa il proxy del Supervisor (`http://supervisor/core/api`, `ws://supervisor/core/websocket`, [documentazione delle app](https://contributors.home-assistant.io/apps/guides/communication/), letta il 2026-10-28). Altrove usa il token di un amministratore di HA che fa una richiesta (`onAdministrator` nel middleware di autenticazione), solo in memoria e per quella volta.
- Controllo all'avvio, ogni 10 minuti, a ogni rifiuto del token: rinnovo sotto i 30 giorni, riattivazione dell'utente sospeso, nuova creazione se cancellato; attesa crescente da 10 minuti a 6 ore dopo un errore; una voce di registro `service.repair` per esito, senza segreti.
- `POST /api/dispositivi/servizio/ripara` per tutti: `{ active, message }`; `GET /stato` aggiunge `service.repairable`.
- `INSTALLER_ONLY_OPERATIONS` vuoto; le voci create a mano in HA si toccano; restano protette solo le integrazioni di sistema e la voce Wake on LAN usata da una TV.
- Testi: nessun «installatore» (test che lo controlla). MAC della TV: dalla persona, poi dal registro di HA, poi dalla scoperta di rete quando c'è un solo candidato.
- `progetto/ha-app/repository/acasystem/config.yaml`: `homeassistant_api: true`.
- Fonte HA (`home-assistant/core`, `dev`): `components/config/auth.py` e `auth_provider_homeassistant.py`, i comandi usati sono `@require_admin`, quindi bastano il token del Supervisor o quello di un amministratore.
- **Correzione dell'orchestratore (T8):** con una versione di HA non verificata le funzioni restano accese se le sonde RD-02/RD-03 passano; prima restavano spente fino a una scelta dell'installatore (`compatibility.ts`).

**B2, campi dei flussi:** `serial_port` (WS `usb/list_serial_ports`, porte consigliate prima, scrittura libera ammessa), `file` (`POST /api/dispositivi/flussi/:flowId/file`, fino a 10 MB, inoltrato a `POST /api/file_upload` di HA; accettati solo gli id caricati per quel flusso), `entity` (dal registro delle entità con i filtri del selettore), `qr_code` (codificatore QR scritto in casa, SVG, provato con le matrici di zxing). Restano non disegnati selettori che nessuna integrazione scopribile usa (`duration`, `object`, date e ore…).

**F1, app:** pulsante «Ripara il servizio» in «Aggiungi un dispositivo», «Dispositivi trovati» e «Trovati in rete»; tolto l'unico controllo `isAdmin` (accensione della TV, «Avanzate»); campo «Indirizzo MAC della TV» con controllo del formato; test che vieta «installatore» nei testi dell'app.

**Pulizia del diff:** un agente aveva riformattato con Prettier file non suoi. Ripristinati: sei file con soli fine riga cambiati; `LauncherScreen.tsx`, `PowerStep.tsx` e `FlowFormStep.tsx` ricostruiti da `HEAD` più le sole modifiche reali.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Backend | `npm run typecheck`, `lint`, `npx vitest run` | Superato | 37 file, 617 passati e 1 saltato; il test della cache dei loghi era instabile sotto carico (contava anche i controlli dell'identità) ed è stato ristretto alle chiamate dei loghi |
| Frontend | `typecheck`, `lint`, `lint:typography`, `lint:theme-colors`, `build` | Superato | 0 violazioni; build riuscita |
| Frontend, suite completa | `npx vitest run` | Superato con instabilità note | 3511/3519; gli 8 falliti (`ConsolePrimitive`, `LauncherColumns`, `LauncherScreen`, `WidgetDesignGallery`) passano tutti rilanciati da soli (257/257): tempi sotto carico |
| Istanza `:3004`, HA reale | HA della VM 2026.10.4, account del proprietario dell'utente | Superato | Servizio spento all'avvio; dopo l'accesso del proprietario e «Ripara il servizio» il log passa a «flows on»; «Dispositivi trovati» mostra 8 dispositivi con i loghi letti da HA; al riavvio il servizio resta attivo |
| HA OS con l'add-on | — | Non eseguito | Serve l'add-on installato sulla VM HA OS; proxy del Supervisor verificato solo su documentazione e sorgente |

## Questioni residue

- Prova reale del percorso HA OS (token del Supervisor sui comandi `config/auth/*`).
- Fuori da HA OS, senza `TUNET_SERVICE_SECRET_FILE` il segreto non si salva nel volume dei dati (regola di ADR-0022): l'attivazione automatica fallisce con «riprova più tardi». Sui clienti (HA OS) il percorso è già separato.
- I nomi interni `REQUIRES_INSTALLER` e `requiresInstaller` restano come codici; i testi non li mostrano.
- `SystemPage` mantiene il controllo `is_admin`/`is_owner` per la posizione della casa, perché è HA a imporlo.

## Chiusura e punto di ripresa

**Stato:** sviluppo fatto e verificato con HA simulato; prova reale in corso sull'istanza `:3004`. Non committato.

**Annotazione 2026-10-28, dopo la prova reale:** l'utente ha segnalato tessere comparse tutte insieme e nomi generici. Corretto: lo scheletro c'è a ogni apertura e dopo «Ripara il servizio», le tessere entrano una alla volta (600 ms la prima, poi 140 ms); un dispositivo senza nome prende quello dell'integrazione letto da HA (`manifest/list`, una volta per dominio). Backend 618+1, test della schermata 33/33.

**Punto di ripresa:** prova LG; poi prova dell'add-on su HA OS.
