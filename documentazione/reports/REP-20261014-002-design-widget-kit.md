# Design di tutti i widget nel kit

| Campo | Valore |
|---|---|
| ID | REP-20261014-002 |
| Stato | Completato; direzione grafica in attesa del parere umano |
| Data | 2026-10-14 |
| Autore | Codex |
| Commit di partenza | 7298d4df0d33bc92123517776d9ebc7c12ecefa6 |
| Richiesta | Realizzare nella pagina del kit tutti i design dei widget inseribili, prendendo come riferimento Principale e Temperatura, per la valutazione grafica dell'utente. |
| Autorizzazione | Galleria di proposte visive con dati simulati e primitive esistenti; nessuna integrazione HA, modifica ai widget operativi o pagine precompilate. |

## Perimetro e criteri

Copertura dell'intero catalogo ADD_WIDGET_TYPES, organizzata per categorie esistenti. Superfici soft UI, controlli tondi, tessere, slider e tipografia coerenti con i due prototipi; controlli dimostrativi in memoria. Nuova scheda Widget nella pagina UI kit. Verifica copertura, interazioni simulate, responsive e controlli statici. Preservare le modifiche preesistenti, incluse quelle al kit; nessun commit o aggiornamento Docker.

## Avanzamento e verifiche

Realizzata WidgetDesignGallery.tsx, con widgetDesigns.css e caricamento lazy nella nuova scheda «Widget» di UiKitPage. Tutti i 25 tipi del catalogo hanno un concept popolato e distinto, raggruppato nelle categorie esistenti. Primitive condivise: superfici, tipografia, Tile, pulsanti tondi, Slider, Meter, ProgressRing e Toggle. I controlli cambiano soltanto lo stato React locale; nessun provider HA, comando remoto o salvataggio del launcher. I due prototipi originali restano nella scheda Prototipi.

| Controllo | Esito e limiti |
|---|---|
| `npm run typecheck`, `npm run lint` | Superati dopo la correzione degli elementi semantici dt/dd. |
| `npm run lint:typography`, `npm run lint:theme-colors` | 0 violazioni, rispettivamente 431 e 305 file. |
| `npx prettier --check` sui file della galleria, UiKitPage e relativo test | Superato. |
| `npm run test -- --maxWorkers=4 src/__tests__/WidgetDesignGallery.test.tsx` | 3/3 test: copertura esatta del catalogo senza duplicati, filtro di tutte le categorie, controllo locale dei valori. |
| `npm run build` | Superato; avviso Vite sul chunk hls >500 kB, fuori dall'intervento. |
| Chromium headless senza GPU, 1280×844 e 390×844 | 25/25 card in entrambi i viewport; nessun overflow dei contenuti misurati; filtro Sicurezza mostra 3 card; 0 errori JavaScript. Screenshot di Luce, Clima, Videocamera, Multimedia, Aspirapolvere, Costi e Orologio, ispezione rappresentativa. Script `backup/test-design-widget.cjs`, screenshot `backup/design-widget-*.png`, esclusi da Git. |
| Detector Impeccable | Nessun rilievo sui due nuovi file. |

## Chiusura e punto di ripresa

### Controllo individuale del bilanciamento (2026-10-14)

Su richiesta umana controllati uno a uno i 20 concept a 390×844 e 1280×844: sensore, luce, ventilatore, tapparella, stanza, clima, serratura, videocamera, allarme, Android TV, Apple TV, multimedia, Sonos, aspirapolvere, tosaerba, auto, attività, costi, prezzo energia, separatore. Il centro verticale del gruppo dei figli diretti coincide con il centro della card (scarto arrotondato a 0,1 px: 0); i gruppi che prevedono centratura orizzontale risultano centrati (scarto 0,1 px: 0). Nessun overflow dell'area interna. Il clima mantiene la composizione intenzionale a due colonne, con termometro a destra; righe di stato mantengono etichette a sinistra e valori a destra.

Acquisiti e ispezionati gli screenshot individuali e i due fogli di confronto desktop/telefono: nessun difetto di allineamento rilevato, nessuna modifica al codice necessaria. Evidenze locali `backup/bilanciamento-*.png`, procedura `backup/check-bilanciamento.cjs`, escluse da Git. È un controllo grafico locale dei prototipi, non una prova dei widget operativi sul tablet.

**Rettifica nello stesso controllo:** il confronto desktop ha poi evidenziato che `auto-fit` allargava le card delle categorie con pochi elementi (Clima, Energia, Separatore) fino a occupare lo spazio delle colonne vuote. Sostituito con `auto-fill`: le colonne mantengono la stessa larghezza anche nelle categorie incomplete. La centratura geometrica era corretta, ma le proporzioni fra categorie non erano coerenti.

### Rettifica del 2026-10-14 — card minimali

Su richiesta umana successiva rimossa dalle 20 card l'intestazione nome/icona, conservando il nome accessibile e le icone dei controlli. Altezza da 28 a 25 rem (48 px risparmiati). La precedente descrizione delle dimensioni resta storica.

Verifica della minimalizzazione: typecheck e lint superati; Chromium senza GPU a 390 e 1280 px conferma 20 card senza overflow misurati e zero errori JavaScript. Script di verifica aggiornato per non cercare l'orologio già escluso. Banco non aggiornato.

### Rettifica del 2026-10-14 — componenti della Copertina

L'utente precisa che calendario, data, orologio e meteo sono già realizzati come componenti di default della Copertina e non vanno riprogettati nel kit. Rimossi dalla nuova galleria i concept `calendar`, `cover_calendar`, `cover_clock`, `weather` e `cover_weather`, conservando gli originali nella scheda Prototipi. La galleria presenta ora 20 proposte; il catalogo applicativo conserva tutti i 25 tipi. Aggiornato il test per copertura delle sole proposte residue e assenza dei duplicati. I risultati precedenti descrivono la prima versione.

Controlli della rettifica: typecheck, lint, tipografia/colori superati; 3/3 test della galleria in 21,96 s. Chromium senza GPU a 390×844 conferma 20 card e nessuno dei cinque tipi esclusi. Nessuna modifica ai componenti originali della Copertina o al banco Docker.

Galleria disponibile su `http://127.0.0.1:5173/#/ui-kit?tab=widgets`. Aggiornati indice, design, stato e verifiche. Modifiche preesistenti preservate; nessun commit, Docker o deploy. Suite completa e prova sul tablet non eseguite. Il prossimo passo è il parere umano sui singoli design: non sono approvazioni grafiche né funzioni operative implementate; l'integrazione nelle griglie precompilate resta fuori da questo intervento.
