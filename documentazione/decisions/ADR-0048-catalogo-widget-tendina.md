# ADR-0048 — Catalogo widget a tendina con anteprime

| Campo | Valore |
|---|---|
| Stato | Accettata; implementata e verificata localmente in REP006 e REP007 |
| Data e autore | 2026-11-06, Codex; nome esatto del modello non disponibile |
| Decisore e autorizzazione | L'utente autorizza «procedi» e precisa apertura dal basso verso l'alto, catalogo destra/sinistra e schede intere. Nell'ultima correzione richiede attivazione tramite scroll verso il basso, senza pulsante inferiore, salita automatica del catalogo e dissolvenza della Home. [Report REP006](../reports/REP-20261106-006-catalogo-widget-tendina.md). |
| Collegamenti | [ADR-0004](ADR-0004-principi-frontend.md), [brief](../design/componenti/catalogo-widget.md) |
| Sostituisce / sostituita da | Sostituisce la sola presentazione del catalogo dei tipi nel popup «Aggiungi un widget». Conserva associazione, aggiunta, ID, flussi discovery/auto-add e regole della pagina. |

## Decisione

Aprire il catalogo dalla Home tramite **scroll verso il basso**, senza pulsante/maniglia di apertura. Il comando avvia automaticamente la traslazione da fuori schermo in basso verso l'alto, contemporanea alla dissolvenza della griglia principale. Su touch rispettare il verso logico dello scroll: dito verso l'alto sulle superfici passive. Tendina a tutto schermo, anteprime dimostrative nei gruppi del catalogo attuale, sfogliabili **destra/sinistra per pagine con il dito, senza pulsanti precedente/successiva**. Schede e nomi devono entrare interamente nello spazio disponibile; selezione del widget e successiva associazione quando necessaria. Il catalogo non è una lista verticale. **Chiusura mediante swipe verso il basso sulle superfici passive del catalogo, senza pulsante X o maniglia cliccabile**. Distinguere gli assi del gesto e preservare lo scroll verticale dei moduli; frecce della tastiera, Escape/Indietro e focus restano disponibili.

**Evoluzione esplicita dopo la consegna,2026-11-06:** l'utente richiede «sempre col dito senza pulsanti» e chiusura «scorrendo verso il basso». [REP007](../reports/REP-20261106-007-catalogo-widget-solo-gesti.md) attua la richiesta; gli esiti REP006 rimangono storici per i controlli ora ritirati. Nessuna modifica del modello dati o delle regole di aggiunta autorizzata da questa scelta di presentazione.

**Rettifiche2026-11-06 prima della consegna:** superate sia la prima interpretazione dall'alto/lista verticale sia la successiva apertura da maniglia inferiore. Le indicazioni esplicite dell'utente precedono la consegna; prove e checkpoint delle interpretazioni precedenti rimangono nel report, distinti dal flusso qui confermato e poi verificato localmente.

Le anteprime sono isolate dalla casa reale: nessun comando, log personale, stream o richiesta live. Riusano parti visuali sicure con un runtime sintetico privato; i tipi con effetti autonomi usano vignette presentazionali. Il catalogo attiva le miniature quando entrano nell'area visibile e non modifica il protocollo di inizializzazione della Home.

## Conseguenze e motivazioni

**Estensione umana2026-11-09:** «scorrimento dal basso verso l'alto da acasystem indipendentemente dalla pagina» e gesto inverso per tornare alle pagine, [REP005](../reports/REP-20261109-005-gesti-catalogo-tutte-pagine.md). Vale per tutte le pagine Home, comprese quelle speciali e le celle libere; la consultazione non modifica la pagina corrente. L'eventuale aggiunta da una pagina speciale sceglie una destinazione widget valida già presente, evitando configurazioni orfane nel tipo speciale. Restano invariati i blocchi, i comandi e i moduli aperti. La correzione della misura del figlio reale di `PageShell` è necessaria al gesto su queste pagine, senza aggirare la preparazione. Implementata e verificata localmente in REP005, banco .50 invariato; nessuna nuova infrastruttura grafica o API.

Nuova presentazione attivata dallo scroll senza trascinamento obbligatorio o nuovo controllo nella Home. Il gesto rispetta comandi e contenuti scorrevoli dei widget, schermate aperte e blocchi; non aggira permessi o uso esclusivo. La scena già esistente conserva continuità dello sfondo e dei materiali durante dissolvenza e ritorno. Materiali e primitive ACA rimangono la fonte comune, senza nuove dipendenze o cambi dei widget esistenti.

Misure di animazione, soglie del gesto e API private sono scelte esecutive da verificare in REP006, non proprietà attribuite ad Android o Apple. Build e anteprima locali; pubblicazione e aggiornamento del banco rimangono separati. Test simulati non certificano hardware Android/M11 o Safari/iPhone.
# Evoluzione successiva del2026-11-09

[ADR-0049](ADR-0049-widget-prodotti-per-dispositivo.md) aggiorna gli ingressi delle due utilità: primi accessi diretti, aggiunta alla Home secondaria; i prodotti restano posizionabili con conferma. Gesti, materiale e struttura del catalogo descritti sotto restano validi. La cronologia originaria viene conservata.

