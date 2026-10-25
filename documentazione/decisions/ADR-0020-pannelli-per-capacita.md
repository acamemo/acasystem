# ADR-0020 — Pannelli dei widget per capacità: cornice comune, blocchi di capacità, pannelli specifici

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0020: i pannelli dei widget si compongono dalle capacità dichiarate da Home Assistant, su tre livelli (cornice comune, blocchi condivisi, pannelli specifici). |
| Stato | **Proposta**, non approvata. |
| Data e autore | 2026-10-23. Claude Code (Opus 5.5, `claude-opus-5-5`), bozza dell'agente. |
| Decisore e autorizzazione | Utente, 2026-10-23: richiesta di «uno studio delle interfacce per realizzare delle interfacce che possono essere comuni a tutti i widget e poi le interfacce specifiche per il singolo widget […] per risparmiare linee di codice». Sulla proposta di metodo (capacità di HA, tre livelli) ha risposto «avvialo subito in parallelo». Questa risposta autorizza **lo studio**, non l'architettura né la realizzazione: **non ancora approvata**. |
| Collegamenti | Studio e piano: [REP-20261023-002](../reports/REP-20261023-002-studio-pannelli-widget.md). Mockup: [pannello-widget-comune.html](../design/proposte/pannello-widget-comune.html). Decisioni: [ADR-0004](ADR-0004-principi-frontend.md), [ADR-0005](ADR-0005-typescript-italiano-icone.md), [ADR-0011](ADR-0011-kit2-base-grafica.md), [ADR-0016](ADR-0016-schermo-intero-interazioni.md), [ADR-0018](ADR-0018-pagine-fuori-vista.md), ADR-0019 (memoria della configurazione per dispositivo, in scrittura da un altro flusso). Problemi: ISSUE-082, ISSUE-109, ISSUE-112. Diagnosi: [REP-20261023-001](../reports/REP-20261023-001-rilevamento-dispositivi.md). |
| Sostituisce / sostituita da | Nessuna. Se fosse accettata con l'opzione D-4 (a) del report, modificherebbe in parte ADR-0016 (impostazioni solo in modifica): andrebbe annotato lì. |

## Contesto ed evidenze

**Osservazioni nel codice** (working tree del 2026-10-23, base `7298d4d`):

- Il tocco su un widget apre due fogli diversi: `DetailsSheet` in uso, `WidgetSettingsSheet` per «Collega» e in modifica. Nessuno dei due ha una testata comune.
- Il percorso adattivo ricava già le capacità da `supported_features` e dagli attributi (`utils/haEntityToCapabilities.ts`, `adaptive/operationalProfile.ts`). I 20 pannelli `*Details` invece no.
- Per i widget di categoria `DetailsSheet` mostra i comandi due volte: prima il blocco adattivo, poi il pannello del tipo.
- Gli stessi controlli sono scritti più volte a mano: accensione 7, cursore con −/+ 7 e più, scelta da elenco 6 forme, «richiesto o confermato» 7 hook in 4 famiglie con timeout di 10 o 30 s, 5 famiglie CSS di sezione, 12 letture di `supported_features` con regole diverse.
- Le impostazioni del widget e del dispositivo stanno insieme in `cardSettings`.

**Fatti esterni** (fonti primarie consultate il 2026-10-23; ultima versione stabile 2026.10.2 del 2026-10-16, banco 2026.9.4):

- Le azioni di un'entità sono offerte secondo i flag di `supported_features`; le luci dichiarano la capacità in `supported_color_modes` (`light/const.py`, ramo `dev`).
- Un `media_player` spento non pubblica volume, contenuto e immagine, mentre `source_list` resta, perché è un attributo di capacità (`media_player/entity.py`).
- La TV LG (`webostv`): l'accensione è dichiarata solo se esiste l'automazione col trigger di accensione (Wake-on-LAN o HDMI-CEC). Le app, Netflix compresa, si scelgono con `select_source`. Con la TV spenta l'integrazione conserva l'ultimo elenco delle sorgenti (`webostv/media_player.py`; `home-assistant.io/integrations/webostv/`).

Il dettaglio per dominio è nella sezione 2 del report. Il resto è stato letto dalla documentazione per sviluppatori tramite un riassuntore; i punti non verificati sono marcati NV nel report.

**Inferenze.** Il risparmio di codice viene soprattutto dalle parti condivise (sezioni, aiutanti, doppio contenuto), non dai pannelli specifici. Stima non misurata (±30 %). **Dato principale (scenario A, solo pannelli):** 300-1 400 righe TS e 800-1 200 di CSS in meno. **Condizionato a D-8** (scenario B, attesa e aiutanti unificati): altre 1 300-1 800 righe TS, per un totale di 1 600-3 200 solo se D-8 viene decisa in quel senso. Esclusi i test (41 file di guardia, circa 12 000 righe, di cui 3 000-6 000 da riscrivere), le pagine intere e le facce legacy.

## Proposta o decisione

**Proposta dell'agente, non decisa.**

1. **Livello 1 — cornice comune**, un solo componente:
   - testata: icona, nome, stanza, stato in parole, etichetta «Da collegare»;
   - corpo: i blocchi;
   - azioni: «Collega» o «Cambia dispositivo», «Impostazioni del widget», «Impostazioni del dispositivo», «Elimina» con conferma;
   - piede: «Fatto».

   La cornice **non deve peggiorare la misura di riferimento** dell'apertura e della chiusura del foglio. La correzione di ISSUE-112 resta al flusso che la gestisce (0.9.27/ISSUE-109) e non fa parte di questa decisione. La presenza e la posizione di ogni azione dipendono dalle domande D-1, D-3, D-4, D-5 e D-6 del report; il mockup ne disegna due varianti, nessuna consigliata.
2. **Livello 2 — blocchi di capacità condivisi** in `components/widgets/` (conoscono le entità; le parti solo grafiche vanno in `primitives`/`system`). Sono 16: accensione, livello, volume, scelta da elenco, comandi multimediali, azioni in fila, colore e bianco, temperatura obiettivo, lettura con storico (solo dal recorder), immagine, codice e conferma, tastierino direzionale, informazioni, campo (ora, data, testo, numero), esito del comando, disponibilità. Ogni blocco compare solo se HA dichiara la capacità. Riceve `entityId` e la capacità, non la mappa intera delle entità. Ha un nome accessibile in italiano, −/+ accanto a ogni cursore e il valore richiesto distinguibile senza colore.
3. **Livello 3 — pannelli specifici** solo dove nessun blocco basta: videocamera dal vivo, calendario, Sonos (gruppi, timer di spegnimento, coda, sveglie), «Scegli contenuto» (`BROWSE_MEDIA`), Casa 3D. Meteo con previsioni, Attività, mappa dell'aspirapolvere e Nordpool (integrazione HACS, non di core, con prezzi futuri da attributi) sono candidati da decidere (D-12). Auto, Stanza e Gruppo di luci sono composti di blocchi, non pannelli specifici.
4. **Un solo modello di capacità.** Si estende `Capability` (immagine, rimando a un pannello, gruppo, sola lettura, conferma, ragione d'indisponibilità). `supported_features` si legge in un solo punto, con i bit allineati alle costanti di core della versione installata.
5. **Impostazioni separate in due gruppi:** del widget (proprie di ogni widget) e del dispositivo (condivise), secondo la regola di ADR-0019 «copia al collegamento, poi widget indipendenti, impostazioni del dispositivo condivise». Il modello dati, la classificazione finale delle chiavi (comprese le preferenze oggi in `localStorage`) e le regole di migrazione spettano ad ADR-0019. Questa proposta le inoltra come domande: valori divergenti tra widget, «Cambia dispositivo», eliminazione dell'ultimo widget, chiavi in `localStorage` (sezione 4 del report).

Non fa parte della proposta: la realizzazione, che va per tappe T0-T10 e Z nel report, ciascuna da autorizzare; i cambi di comportamento visibile senza risposta alle domande D-1…D-17; i widget per i domini oggi assenti; il foglio unico «Uso e impostazioni»; le pagine intere (Luci, Multimedia, Sonos, Batterie, Stanze, Casa 3D), che restano come sono.

## Alternative e motivazioni

| Alternativa | Pro | Contro |
|---|---|---|
| **A. Tre livelli per capacità (proposta)** | Continua la direzione già presa dal percorso adattivo; un dispositivo nuovo riceve un pannello sensato senza codice dedicato; elimina il doppio contenuto; risparmio stimato dell'1-4 % del TS (scenario A; 4-9 % solo con D-8) e del 16-24 % del CSS dei gruppi interessati | Tocca molti test che fissano i nomi di classe; dipende da ADR-0019 per le impostazioni; richiede decisioni sul comportamento visibile |
| B. Un pannello scritto a mano per ogni tipo (oggi) | Nessuna migrazione | Duplicazioni che crescono con ogni tipo; dispositivi nuovi senza pannello; comportamento incoerente (timeout, testi, forme di scelta) |
| C. Solo pannello generico, senza pannelli specifici | Massimo risparmio | Perderebbe videocamera dal vivo, calendario, gruppi Sonos e Casa 3D, che le capacità standard non descrivono |
| D. Foglio unico «Uso e impostazioni» | Una sola apertura di `<dialog>` | Cambia ADR-0016; non richiesto; non proposto ora |

**Questioni irrisolte:** domande D-1…D-17; contenuto di ADR-0019 e regole di migrazione; righe piatte nel pannello rispetto al rilievo del Kit 2 (ADR-0011); dispositivi reali assenti sul banco (REP-20261023-001); identità degli oggetti entità in `home-assistant-js-websocket`, che decide il costo dei nuovi rendering (non verificato).

## Conseguenze

- **Comportamento:** cambierebbe solo nelle tappe autorizzate, dopo le risposte. Effetti visibili possibili: testata e azioni nel foglio, fine del doppio contenuto, forme di scelta uniformi, attesa e testi di esito uniformi, −/+ ovunque.
- **Dati:** nessun cambio finché non c'è ADR-0019. Poi le chiavi si dividono tra widget e dispositivo; serve una migrazione delle impostazioni esistenti, con un test su dati reali con valori divergenti.
- **Codice:** nuova cartella condivisa dei blocchi; primitive grafiche `PanelSection`, `PanelRow`, `FactList`; i `*Details` sostituiti uno per tappa; le guardie dei test aggiornate verso test di comportamento.
- **Prestazioni:** rischio su ISSUE-109 e ISSUE-112, mitigato dal montaggio ritardato dei blocchi pesanti, da righe piatte senza ombre (in tensione con il rilievo del Kit 2, da confermare) e da una barra di posizione multimediale aggiornata localmente nel blocco. Va misurato sul Tab M11 a ogni tappa visibile, senza peggiorare la misura di riferimento.
- **Test:** circa 41 file di guardia (~12 000 righe) interessati; 3 000-6 000 righe da riscrivere verso test di comportamento, più un test per blocco.
- **Infrastruttura e licenze:** nessuna nuova dipendenza.

## Verifiche e revisione

**Da verificare se accettata:**

- per ogni dominio, un test che confronta capacità e bit con le costanti di core della versione installata;
- un test per blocco (compare solo con la capacità; nomi accessibili; −/+; attesa ed errore);
- una tabella di copertura per ogni pannello migrato e prima della rimozione del doppio contenuto (T6);
- sul Tab M11: misura di apertura e chiusura del foglio (ISSUE-112), TalkBack, testo al 125/150 %, dito vero;
- osservazione degli attributi reali della TV LG dopo il collegamento (tappa T0).

**Risultati esistenti:** nessuno, solo lo studio, rivisto il 2026-10-23 dopo una critica (sezione «Rettifiche dopo la critica» del report).

**Condizioni di revisione:** l'esito di ADR-0019; un cambio delle capacità in una nuova versione di HA; misure di prestazione peggiori del riferimento.
