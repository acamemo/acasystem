# ACA SYSTEM — Specifica di design

Aggiornato: 2026-10-14 (barra unica in basso, ADR-0013; in precedenza 2026-10-12, grandezza visiva tra pagine, nome della copertina con le lineette, animazioni su livelli e versione in Sistema; in precedenza 2026-10-10, PageShell, pressione che rimpicciolisce, vista delle pagine a trasformazioni e nuvoletta UI-010; 2026-10-08, modifica semplificata e griglia per pagina, e 2026-10-06, sezione «Sistema Metallo»). Questo documento è la fonte delle scelte visive e delle proposte UI/UX. Requisiti, ruoli e comportamento dell'app sono nel [modulo funzionalità](../funzionalita/README.md); stato effettivo e incarichi in [project-status.md](../project-status.md). HOME, controlli condivisi e finestre di gestione schede/pagine hanno il primo materiale Neumorphism, verificato sul banco locale. Pulsanti, emblema di benvenuto e card di stato (SensorCard) usano il materiale a pressione adattato da UI-003 ([REP-20261005-011](../reports/REP-20261005-011-materiale-pressione.md)); le altre card dispositivo, il dimmer con riscontro HA e le altre schermate restano da convertire.

## Scopo e responsabilità

Descrivere come presentare le funzionalità autorizzate: stile, colori, gerarchia, componenti e feedback. Il design non aggiunge funzionalità, permessi o automazioni. Una schermata proposta non autorizza lo sviluppo del comportamento rappresentato.

La fase 1 minima è Home Assistant personalizzato graficamente, con Tunet come punto di partenza React e pilota in ufficio. Il suo perimetro è in [pilot-scope.md](../funzionalita/pilot-scope.md). L'analisi tecnica di Tunet deve precedere la scelta di componenti e librerie da integrare.

## Direzione corrente: Kit 2 (dal 2026-10-07)

### Proposte di design per tutti i widget (2026-10-14)

**Widget adattivi e gestuali, incarico successivo approvato:** [REP-20261014-004](../reports/REP-20261014-004-widget-adattivi-gesti.md) sostituisce la composizione statica dei 20 concept con card Compatta/Standard/Grande/Pagina e capacità simulate condivise fra card, dettagli e configurazione. Il sistemista seleziona dispositivo, visibilità e ordine; anche Pagina mostra solo i selezionati, con scorrimento interno. I dettagli contengono tutte le capacità del profilo. Pressione/trascinamento verticale (6 px di soglia, 160 px di corsa) regola valori e colore; luminosità e tonalità sono controlli distinti. Feedback grigio→accento per valori, tonalità effettiva per colore, caldo/freddo per bianco; tastiera, cursori e +/− restano disponibili. Le preferenze sono solo in memoria. Lo sviluppo nel kit è autorizzato; non costituisce accettazione grafica finale o integrazione dei widget operativi.

**Bilanciamento della galleria:** le colonne usano `auto-fill`, per mantenere la medesima larghezza delle card anche nelle categorie con pochi elementi; nessun allargamento a tutta riga del singolo widget. Controllo individuale desktop/telefono e correzione registrati in REP-20261014-002.

**Minimalizzazione successiva richiesta dall'utente:** le 20 card proposte non mostrano più l'intestazione con nome del tipo e icona; restano valori, stati e controlli. Il nome è conservato come etichetta accessibile della card. Altezza ridotta da 28 a 25 rem, recuperando 48 px senza ridurre il contenuto funzionale.

**Rettifica umana successiva:** calendario, data, orologio e meteo mantengono i design già realizzati della Copertina. La scheda Widget esclude i cinque tipi `calendar`, `cover_calendar`, `cover_clock`, `weather` e `cover_weather` e mostra 20 proposte residue, senza modificare il catalogo applicativo. Gli originali restano nella sezione Copertina dei Prototipi; non sono proposte da rifare.

Su richiesta umana, la scheda «Widget» del kit presenta tutti i 25 tipi del catalogo in card di altezza 28 rem, con superficie soft UI e primitive dei prototipi Principale e Temperatura: pulsanti tondi, tessere, slider orizzontali e termometro a colonna. Ogni tipo ha contenuti dimostrativi distinti e controlli in memoria; i filtri seguono le categorie del vassoio. Sono **proposte da valutare**, non una direzione approvata né modifiche ai widget operativi. Realizzazione e verifiche in [REP-20261014-002](../reports/REP-20261014-002-design-widget-kit.md). Anteprima `#/ui-kit?tab=widgets`.

### Etichette delle tessere (2026-10-14)

**Aggiornamento successivo, vassoio stabile e animato:** il piano umano implementato in [REP-20261014-001](../reports/REP-20261014-001-vassoio-stabile-animato.md) fissa tessere 6,5 × 8 rem e fila 9 rem. Icona, nome (due righe riservate, troncamento visivo e titolo completo) e misura hanno posizioni uniformi; le misure non vanno a capo. La pillola cambia subito; escluse in fade 140 ms, conservate in ricomposizione 220 ms, nuove in fade 160 ms dopo 60 ms. Pannello fermo; ricerca e movimento ridotto senza animazioni. Nuove scelte, trascinamento e chiusura interrompono le transizioni.

Su richiesta umana con screenshot di «Temperatura» e del vassoio Widget, le tessere dei kit Metallo e Kit 2 usano etichette più piccole (`--aca-step--1`) e un gruppo icona/nome centrato sui due assi, senza la precedente separazione tra icona in alto e nome in basso. Le tessere del vassoio mantengono il gruppo centrato, con etichette ulteriormente ridotte (0,9 × `--aca-step--1`), colonna vincolata alla larghezza disponibile e margini laterali di `--aca-space-2`. I nomi lunghi possono andare a capo all'interno della tessera. La modifica riguarda le tessere, non la scala dei testi delle pagine o dei valori dei dispositivi; non cambia le interazioni né attiva widget.

Verifica locale: 14/14 test in `WidgetTrayCategories.test.tsx` e `MetalKit.test.tsx`, controlli di tipografia e colori a zero violazioni. Prova nel browser senza GPU a 1280 e 390 px; banco Docker non aggiornato e prova con il dito non eseguita.

Dal 2026-10-07 la base grafica dell'app è Kit 2, una soft UI (ADR-0011, REP-20261007-007, REP-20261007-008). Ha fondo e accento derivati, tema chiaro e scuro e accenti viola, rosso, ciano e arancione. Lo stato acceso è incassato con l'inchiostro d'accento, e la pressione incassa l'elemento. L'app la applica come pelle delle famiglie del materiale (`themes/kit2/skin.css`). La sezione seguente descrive il kit Metallo, conservato come alternativa.

## Sistema Metallo (fonte corrente dal 2026-10-06 al 2026-10-07, conservato)

> **Precedenza.** Questa sezione, con [ADR-0006](../decisions/ADR-0006-sistema-metallo.md) e [ADR-0007](../decisions/ADR-0007-acasystem-os.md), supera le scelte di colore e tema delle sezioni successive (temi chiaro/scuro, #222222, #ef8231, materiali di REP-008/009/011), che restano come storico: i file di quelle implementazioni (`neumorphism.css`, `themes.js`, componenti legacy) sono stati cancellati il 2026-10-07 (ISSUE-029). Implementazione e verifiche in [REP-20261005-012](../reports/REP-20261005-012-sistema-metallo.md) e [REP-20261006-001](../reports/REP-20261006-001-acasystem-os.md).

**Materiale.** Ogni controllo e contenitore ha i quattro livelli del pulsante [UI-003](componenti/originali/UI-003-pulsante-pressione.jsx.txt):

| Livello | Aspetto |
|---|---|
| Socket | Grafite derivata dalla base (luminosità × 0,5, circa rgb(99)); nei pozzetti un grigio più tenue (base − 0,30) |
| Guscio | Ombre di contatto |
| Faccia | Gradiente dalla base bianca (255) a un passo più scuro (circa 222), sette ombre interne più lo strato LED |
| Contenuto | Inter, etichetta incisa |

| Comportamento | Uso |
|---|---|
| `press` | Hover solo con mouse: faccia leggermente più luminosa (`brightness(1.04)`), nessun incasso. Click: guscio e faccia scalano insieme a 0,96 (0,985 sulla card), così l'ombra di contatto segue la faccia e il bordo resta uniforme; socket e ombre esterne fermi (REP-20261007-003, REP-20261007-005). |
| `static` | Superfici informative. |
| `well` | Incassato, per campi e tracce. |

- **Forme:** pillola, cerchio, arrotondata, card (24px, eccezione voluta alle regole impeccable, come il testo inciso a gradiente).
- **Fisica:** una sola per stato. Luce dall'alto a sinistra; l'ombra scura in alto a sinistra solo sugli elementi incassati.

**Colori.** Dal 2026-10-07 (REP-20261007-005) ogni famiglia deriva da una sola base con i colori relativi OKLCH: `--aca-base` (bianco puro, `#ffffff`) per pagina (base − 0,035), facce, pozzetti, grafite e inchiostri; `--aca-orange`, `--aca-blue` e `--aca-danger` per chiaro, inchiostro (luminosità 0,40, croma × 0,6) e inchiostro per icone (0,49, × 0,75). Cambiando una base cambia l'intera scala; i passi di luminosità fissi mantengono i contrasti (≥ 4,5:1 testo, ≥ 3:1 icone), verificati anche per una base verde. Socket ≥ 3:1 contro ogni faccia. I valori esadecimali della tabella seguente descrivono le basi e le varianti alla data della loro introduzione.

| Ruolo | Valore | Uso |
|---|---|---|
| Arancione | `#ff622a` | Acceso, attivo, azione principale, riempimenti, sfera dell'indicatore, data della copertina. |
| Blu elettrico | `#295bff` | Focus, selezione (LED e testo), pagina corrente, informazioni. |
| Rosso | `#b91c1c` | Errore. Confermato dall'utente il 2026-10-06. |
| Varianti ink | Testo ≥4,5:1, icone ≥3:1 | Testi e icone colorati sul metallo. |

Il colore non è mai l'unico segnale: restano la profondità, il LED e il testo.

**Tipografia.** Solo Inter, servito in locale; scala in rem con rapporto 1,2; pesi 300/400/500.
- Mai testo tutto maiuscolo, mai spaziatura tra le lettere, mai grassetto (richiesta dell'utente); solo la prima lettera della frase maiuscola.
- Primitive: Display, Title, Heading, Body, Label, Caption, Numeric (cifre tabellari), IconText.
- Controllo automatico: `npm run lint:typography`.

**Stati.** Riposo, hover, click, focus (anello blu), selezione, disabilitato, caricamento, errore e «richiesto vs confermato» (`pending`) su interruttore e cursore.
- Interruttore con etichette «Acceso»/«Spento».
- Sheet (foglio dal basso) e Popover; scala semantica degli z-index.
- Matrice completa nella pagina di prova `frontend/kit.html`.

**Interfaccia «OS».** Barra di stato nella fascia in basso, con ora, connessione, Sistema, chip e «Modifica» (dal 2026-10-14, [ADR-0013](../decisions/ADR-0013-barra-unica.md); in precedenza in alto); copertina con calendario a strappo ([UI-008](componenti/originali/UI-008-calendario-strappo.txt)) e orologio; pagine di widget a celle stile Android, modificabili con pressione lunga; swipe tra le pagine con l'indicatore a pallina ([UI-009](componenti/originali/UI-009-indicatore-pallina.txt)); dettagli dei dispositivi in fogli; Sistema come pagina intera. Il pannello Aspetto non esiste più.

**Schermata di base e celle «+»** (richiesta dell'utente del 2026-10-07, [REP-20261007-001](../reports/REP-20261007-001-launcher-polish.md)):
- All'avvio il launcher apre sempre «Principale», la prima pagina di widget, anche se vuota. La copertina resta alla sua sinistra, raggiungibile con lo swipe. La pagina vista l'ultima volta non decide più l'avvio.
- Su ogni pagina di widget, in vista normale e in modifica, ogni cella libera è un pozzetto tenue con un «+» discreto. Hover, focus e tocco lasciano il pozzetto trasparente come a riposo: il bordo interno si scurisce appena (fino al 28% al tocco, 18% a riposo) e la pressione è data dalla scala; niente riempimento metallico né ombre al 55% (alleggerito il 2026-10-07, REP-20261007-004). Il tocco apre l'aggiunta e il widget va nella cella toccata, alla taglia scelta, oppure nel punto libero più vicino. La griglia ha una sola fermata di tabulazione e si percorre con le frecce. Dal 2026-10-08 ([REP-20261008-001](../reports/REP-20261008-001-modifica-semplificata-griglia-per-pagina.md)), in modifica con un widget selezionato, le celle libere mostrano l'icona di spostamento e il tocco sposta lì il widget («Sposta … qui»).
- La griglia non cambia cella né posizione tra vista normale e modifica: il piè di pagina è una fascia di altezza costante che contiene l'indicatore e, in vista normale, la barra di stato con i suoi comandi (ora, connessione, Sistema, chip, «Modifica»; dal 2026-10-14, ADR-0013) o, in modifica, la barra dei comandi.
- In modifica l'unica azione arancione è «Fine». «Aggiungi widget», «Pagina» e «Nuova pagina» sono controlli metallici della stessa altezza. La × di rimozione è un piccolo pomello centrato sullo spigolo, con area di tocco di 44 px. *Superato il 2026-10-08 (REP-20261008-001): la barra della modifica contiene «+ Widget» e «Pagine»; le pagine nuove nascono dal menu «Nuova» dell'editor delle pagine e i widget si rimuovono dal cestino della barra del widget. Dal 2026-10-09 (REP-20261009-002) «Nuova» crea subito una pagina vuota, senza menu.*
- La conferma di rimozione usa la variante «danger» del pulsante (inchiostro rosso sul metallo). Il pallino degli aggiornamenti di Sistema è blu, perché è un'informazione e non un errore.

**Spaziature e cornice.** Scala su base 4 px in `tokens.css` (`--aca-space-1…7`), margine laterale unico `--aca-gutter` per barra di stato, pagine e piè di pagina, altezza dei controlli della cornice `--aca-control-height` (44 px). Il raggio delle celle `--aca-radius-cell` è definito una volta sulla griglia e vale per widget, pozzetti, anteprima di rilascio e maniglie. *Dal 2026-10-14 (ADR-0013) la barra di stato sta nella fascia in basso e la fascia in alto riserva solo l'area sicura (nessun margine extra per ora): il margine laterale vale per le pillole della barra di stato, le pagine e il piè di pagina.*

## Indicazioni umane confermate

| Elemento | Indicazione | Fonte / stato |
|---|---|---|
| Stile | Neumorphism, o neumorfismo | Utente, 2026-10-05: «Neumorphism si chiama lo stile». |
| Temi | Tema chiaro e tema scuro | Piano di raccolta approvato dall'utente, 2026-10-05. |
| Base chiara | Colore chiaro preciso da definire nella fase UI | Indicazione successiva: sostituire la base grigia con un colore chiaro. Nessun valore chiaro ancora scelto. |
| Riferimento scuro | `#222222` | Colore iniziale conservato come riferimento del tema scuro nel piano approvato. |
| Accento | Arancione `#ef8231` in entrambi i temi | Piano di raccolta approvato dall'utente, 2026-10-05. |
| Reference principale | Primo switch, UI-001 | Base per profondità, rilievo, movimento e illuminazione degli altri design. |
| Reference di animazione | Switch Wi-Fi, UI-007 | Riferimento aggiuntivo per feedback luminoso e animazioni. |
| Reference di pulsanti, card ed emblema | Pulsante a pressione, UI-003 | Richiesta umana del 2026-10-05 (REP-20261005-011): struttura a strati e interazioni di hover/click per barra superiore, card di stato e benvenuto. UI-001 resta la reference principale per switch e regolazione. |
| Microinterazioni | Priorità esplicita, con feedback durante il gesto | Indicazioni e risposte umane riprese nel piano approvato. |
| Reference | [Articolo Clay](https://clay.global/blog/neumorphism-ui) e tre immagini fornite in chat | Ispirazione estetica; non schermate ACA approvate. |
| Logo | Non ancora disponibile | Da definire; nessun logo generato o adottato. |
| Lingua delle nuove interfacce | Italiano | Precisazione umana durante REP-20261005-006; data/ora nel locale it-IT. Traduzione legacy ancora parziale. |
| Icone dei componenti migrati | mx-icons | Pacchetto npm confermato dall'utente; prima adozione 1.1.2 in HOME, currentColor per seguire i temi. |

La prima [migrazione HOME](../reports/REP-20261005-006-migrazione-home-typescript.md) conserva l'aspetto Tunet per isolare la conversione; testi e icone sono gli adattamenti richiesti. [ADR-0005](../decisions/ADR-0005-typescript-italiano-icone.md) delimita questa adozione. Button/Container/Icon, Heading/Text e Flex costituiscono il primo strato condiviso; varianti, token e materiale Neumorphism completi restano da progettare nel relativo incarico.

## Primo materiale HOME implementato

[REP-20261005-008](../reports/REP-20261005-008-home-neumorphism.md) documenta la ripresa da Antigravity, autorizzata nella chat: «stoppo e prosegui tu?» e conferma di Gemini fermo. La HOME vuota, intestazione, navigazione, modifica, menu impostazioni e gestore pagine usano il materiale comune. I due pulsanti legacy Entità/Indicatori adottano Button/Icon senza convertire la logica JSX dei rispettivi adattatori.

| Ruolo | Scuro | Chiaro | Natura della scelta |
|---|---|---|---|
| Superficie | #222222 | #f2f3f5 | Scuro confermato; chiaro scelto nell'esecuzione della UI, non nuova approvazione umana. |
| Testo principale / secondario | #f5f5f7 / #a1a1aa | #1e293b / #475569 | Coppie opache verificate nei test di contrasto. |
| Azione principale | #ef8231 con testo #222222 | #ef8231 con testo #222222 | Accento umano confermato; testo scuro evita il contrasto insufficiente del bianco. |
| Testo/icona selezionati e focus | #ef8231 | #9b3f10 | Arancione più scuro sul tema chiaro per leggibilità; l'accento delle azioni rimane #ef8231. |
| Ombra / luce | #141414 / #303030 | #cbd0d7 / #ffffff | Direzione coerente dall'alto a sinistra; rilievo a riposo, incasso per selezione/pressione. |

Button centralizza primary/secondary/control; plain conserva i componenti legacy. Container espone superfici raised/inset. Materiale in src/styles/neumorphism.css, token in themes.js. Il simbolo di benvenuto è decorativo, non dichiara uno stato di impianto. Focus separato dal rilievo; selezione stabile tramite aria-current/pressed/expanded; movimento e illuminazione durante interazioni, senza cicli infiniti. Transizioni dei controlli 180 ms; pulsanti azione 56 px, controlli 44 px CSS. Il wrapper mobile preesistente può ridimensionare le entità dell'intestazione.

Il fondo segue la superficie nei temi dark/light e modalità Follow theme; sfondi personalizzati e temi legacy conservano i meccanismi precedenti. Il selettore del tema esistente resta responsabile della persistenza. La base chiara iniziale di Antigravity #e0e5ec è stata schiarita a #f2f3f5; l'originale acquisito è conservato nel backup di passaggio.

Controlli eseguiti: coppie testo/superficie opache, focus nel browser, due temi, desktop, mobile e tablet. La regola prefers-reduced-motion disattiva transizioni/animazioni della porzione; verificata nel CSS distribuito, non mediante cambio della preferenza del sistema operativo. Non è attestata conformità WCAG complessiva, leggibilità sul tablet fisico o copertura di tutte le schermate/stati. Reference originali conservate; nessun codice originale importato o nuova dipendenza.

La separazione in moduli e la creazione di questo file sono richieste dall'utente nel presente [incarico](../reports/REP-20261005-002-moduli-documentali-design.md). Le indicazioni precedenti e i calcoli sui colori sono conservati nell'[annotazione del report del pilota](../reports/REP-20261005-001-direzione-pilota.md#annotazione-del-2026-10-05--risposte-successive-e-stile-grafico).

La successiva richiesta di [raccolta e microinterazioni](../reports/REP-20261005-003-raccolta-componenti-microinterazioni.md) aggiorna la direzione inizialmente scura: sono richiesti entrambi i temi, con arancione comune. Le [sette reference](componenti/README.md) sono conservate come originali testuali; non sono una UI implementata né autorizzano installazioni. Sequenza richiesta: accumulo, preparazione HA e poi UI, con incarichi dedicati alle fasi successive.

## Finestre di gestione implementate

[REP-20261005-009](../reports/REP-20261005-009-gestione-schede-pagine.md) estende il materiale ad aggiunta scheda, nuova pagina, modifica pagina e selettore icone. Modal separa intestazione, corpo scorrevole e azioni sempre raggiungibili; Input usa incasso e focus; Choice usa selezione stabile; Switch espone un pulsante nativo con role switch, indicatore luminoso e corsa del pomello. Movimento ridotto elimina le transizioni conservando posizione e stato. Le reference originali rimangono intatte.

Testi italiani e mx-icons per i controlli; nomi e catalogo delle icone già salvate restano compatibili. La griglia del selettore calcola le colonne dalla larghezza disponibile per mantenere coerente la virtualizzazione su mobile. Verificati dialoghi a 320/390 px e desktop, senza comandi fisici o creazione di pagine sul banco reale. Impostazioni/profili e pagine dispositivo non sono convertiti da questo gruppo.

## Materiale a pressione implementato

Richiesta umana del 2026-10-05, [REP-20261005-011](../reports/REP-20261005-011-materiale-pressione.md): applicare lo stile di [UI-003](componenti/originali/UI-003-pulsante-pressione.jsx.txt) a pillola di navigazione, pulsanti circolari Modifica/Impostazioni, card di stato, emblema di benvenuto e pulsanti «Aggiungi scheda»/«Carica profilo». Materiale in src/styles/neumorphism.css; il pulsante principale e quello secondario usano le stesse primitive Button e la card la nuova primitiva Card.

**Strati.** Socket (l'elemento, scuro), guscio (ombra esterna) e faccia (`::before`, gradiente più sette ombre interne). Riposo: il guscio solleva l'elemento. Pressione alleggerita il 2026-10-07 su richiesta dell'utente (REP-20261007-003): nessuna sequenza in hover; al click scala soltanto la faccia, a 0,96 (0,985 sulla card, 0,95 per il pomello ospitato), con socket, guscio e ombre fermi. Fino a quella data: hover con guscio a zero, faccia ristretta di 1,5 px e contenuto a 0,975; click con faccia a 0,975. Selezione stabile (aria-current/pressed/expanded): aspetto premuto mantenuto con inchiostro d'accento e bagliore; il colore non è l'unico segnale. Rilievo alleggerito (2026-10-07, REP-20261007-004): la coppia soft UI del socket, ombra scura e luce bianca, è al 10% di alpha (prima 16% e 80%; sulla card ombra al 6%); la linea di contatto del guscio porta il bordo. Accessibilità del rilievo (2026-10-07, REP-20261007-003): linea di contatto del guscio al 45% (27% sulla card); LED di selezione più spesso sulle card; disabilitato al 45% di opacità; contorno di sistema nei temi a contrasto di Windows (`forced-colors`) e contorno grafite con LED più spesso con `prefers-contrast: more`. Transizioni: pressione 120 ms, rilascio 200–220 ms con ease-out marcato; pomello dell'interruttore 220 ms (l'originale usava 300 e 250 ms).

**Adattamenti, scelte esecutive non approvate come colori ufficiali.**

| Originale UI-003 | ACA | Motivo |
|---|---|---|
| Faccia grigio metallico chiaro, testo a gradiente scuro | Facce derivate dai temi: scuro #2b2b2b → #202020, chiaro #ffffff → #e3e7ed; testo nel colore del tema | Il design non approva integralmente i colori delle reference; scuro #222222 e accento #ef8231 sono confermati. |
| `clip-path` che si restringe | Il `::before` si restringe con la proprietà inset | I raggi dei controlli variano per elemento (pillola, cerchio, 18 px, 14 px) e arrivano da utility Tailwind: un `clip-path` richiederebbe di conoscerli. Il risultato visivo è lo stesso. |
| Overlay `::after` che sfuma l'alone | Ombra neumorfica chiara e scura nel guscio | Luce coerente dall'alto a sinistra nei due temi. |
| Unità em | rem per il guscio; em risolto su `--aca-u` (16 px, 24 px sulla card, 20 px sull'emblema) per la faccia | Ombre indipendenti dalla dimensione del testo. |
| Pulsante unico a pillola | Raggio proprio di ciascun elemento: pillola, cerchio 50% per le icone, 18 px per le azioni | Le forme già approvate restano. |

**Pulsante principale.** Faccia arancione `#f8a35f → #e8761e`, socket `#8f4310`, testo #222222. Contrasto del testo sulle facce: 4,85–7,88. Su facce scure e chiare i testi principale/secondario e l'inchiostro selezionato superano 4,5 in ogni stato (calcoli sRGB opachi in REP-20261005-011; non è una conformità WCAG complessiva).

**Card.** La primitiva Card applica il materiale fuori dalla modifica; in modifica resta lo stile precedente (bordo blu, jiggle, trascinamento). Sostituisce con `!important` sfondo, bordo, ombra e sfocatura inline di `getCardStyle`, e cede il passo a un altro materiale scelto nel pannello Disposizione. È adottata per ora da SensorCard; le altre card restano con il materiale precedente.

**Emblema.** Disco di benvenuto in socket con faccia statica, senza hover.

**Token.** `--aca-socket`, `--aca-face`, `--aca-face-active`, `--aca-shell-rest|hover|selected`, `--aca-face-inset|-hover|-active`, `--aca-card-shell-rest|hover` in neumorphism.css: valori espliciti per scuro e chiaro, derivati da `--bg-secondary` per i temi legacy. Ogni elenco di ombre ha lo stesso numero di strati in tutti gli stati, così le transizioni interpolano; un test lo verifica. Cambiare la faccia in un grigio metallico chiaro, come nell'originale, richiede di modificare solo `--aca-face*` e le ombre interne del tema.

**Movimento ridotto.** Le transizioni e la scala sono disattivate; ombre, anello e profondità dello stato restano.

**Limiti noti.** La card è stata osservata su una replica del suo markup e degli stili inline di `getCardStyle`, perché il browser di verifica non aveva una sessione Home Assistant; lo stato `:active` è coperto da un test sul CSS e non dal browser; il movimento ridotto non è stato emulato dal sistema operativo; non c'è verifica su tablet fisico. Le etichette secondarie delle card (opacità 0,6) hanno un contrasto preesistente di circa 3:1: [ISSUE-022](../project-status.md#issue-022).

## Spiegazione dello stile

Il neumorfismo, chiamato anche soft UI, usa luce e ombra per far apparire i controlli come parti della superficie: alcuni emergono in rilievo, altri sembrano incassati. Fondo ed elementi hanno tonalità vicine; una coppia di ombre, chiara e scura, suggerisce volume. Forme arrotondate e una direzione della luce coerente completano l'effetto. Questa descrizione segue l'[articolo Clay](https://clay.global/blog/neumorphism-ui), aggiornato il 2026-03-05 e consultato il 2026-10-05.

Le reference ricevute mostrano tre varianti: chiara neutra con accento viola, scura grafite con accento verde e chiara lilla con accenti colorati. Per ACA i colori confermati sono quelli della tabella precedente; verde, viola e lilla delle immagini non diventano colori di prodotto.

**Direzione confermata:** due temi, chiaro e scuro, con accento `#ef8231`; `#222222` resta il riferimento scuro. Il primo switch UI-001 guida la qualità del materiale: volume, parti in rilievo, corsa e illuminazione del controllo. Gli altri componenti devono derivare da questo linguaggio, senza diventare una collezione di stili indipendenti. UI-007 aggiunge la reference del feedback luminoso.

**Dettagli ancora da progettare:** colore della base chiara, superfici, ombre, testi e colori semantici per ciascun tema. Tempi, geometrie e colori degli originali non vengono approvati integralmente; il lampeggio infinito Wi-Fi originale è conservato come fonte, mentre il comportamento ACA approvato mantiene stabile lo stato attivo. Modalità di scelta del tema, impostazione iniziale e persistenza saranno definite nella fase UI.

## Microinterazioni richieste

Le microinterazioni sono una priorità del design. Devono accompagnare il gesto e rendere comprensibili richiesta, attività in corso e risultato; non bastano transizioni decorative al passaggio del mouse. Questa sezione descrive comportamenti confermati per la futura UI, non eseguiti dalla raccolta.

### Regolazione della luminosità

- Il gesto sull'icona permette di regolare la luminosità quando il dispositivo e il perimetro funzionale prevedono tale controllo.
- L'anteprima nell'icona varia immediatamente con il gesto: intensità luminosa interna e percentuale visibile. Il valore richiesto deve restare distinguibile da quello confermato da HA.
- Come scelto dall'utente, anche la luce reale cambia durante il gesto, senza attendere soltanto il rilascio. La futura integrazione deve limitare la frequenza degli invii: strategia, frequenza e gestione del valore finale saranno progettate con HA.
- Distinguere valore richiesto, aggiornamento in corso e valore confermato. Un errore o un dispositivo non disponibile non deve apparire come un cambiamento riuscito; dettaglio del recupero e dei timeout da definire nella fase di integrazione.
- Prevedere un'alternativa senza trascinamento, per esempio `+`/`−`, oltre all'operabilità da tastiera. Direzione del gesto, area, sensibilità, passo e limiti saranno concordati nella fase UI.

### Animazione e stati

- Animazioni ricche durante azioni e attese, con effetti coerenti di rilievo, movimento e illuminazione.
- Stato attivo stabile, senza lampeggio continuo. Pulsazioni temporanee possono comunicare connessione o aggiornamento in corso; non devono trasformarsi in animazione permanente di ogni dispositivo acceso.
- Prevedere movimento ridotto, conservando informazione e feedback di stato. Effetti e tempi del catalogo sono riferimenti da adattare, non durate obbligatorie del prodotto.

Riferimenti primari consultati il 2026-10-05: [WCAG 2.2, alternativa al trascinamento](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html), criterio 2.5.7 livello AA, e [animazioni da interazione](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), criterio 2.3.3 livello AAA, sulle animazioni di movimento non essenziali. Sono riferimenti progettuali; nessuna conformità è attestata.

### Modifica manuale dei widget (implementata, REP-20261007-027)

> Dal 2026-10-08 selezione, pomelli, spostamento e alternative senza trascinamento seguono la [modifica semplificata](#modifica-semplificata-e-griglia-per-pagina-implementata-rep-20261008-001). Le voci superate sono annotate e restano come storico.

- **Aggiunta:** «+ Widget» apre un vassoio di tipi che sale dal basso. Una scheda trascinata in alto segue il dito alla misura predefinita e va nella cella mostrata; un tocco la aggiunge dove c'è posto. Il pannello di aggiunta non chiede più la dimensione.
- **Selezione** (aggiornata da REP-20261007-029): i widget non selezionati non hanno icone. Un tocco seleziona; la barra in alto sale, l'indicatore scende e sale la barra del widget (Rimuovi, Impostazioni, frecce, Annulla, Conferma). Il widget selezionato ha due pomelli grandi in alto (sposta, ridimensiona) e bordi trascinabili senza icone. *Superata il 2026-10-08: barra Rimuovi · Annulla · Conferma, otto pallini al posto dei pomelli, impostazioni col doppio tocco.* *Dal 2026-10-14 (ADR-0013) la barra di stato non è più in alto: nella fascia in basso scende, l'indicatore scende e sale la barra del widget.*
- **Ridimensionamento:** da ogni lato e angolo, con il lato opposto fermo. Il widget cambia misura dal vivo. *Dal 2026-10-08 dalla cornice di presa con gli otto pallini.*
- **Spostamento:** sotto il dito c'è la copia del widget, sollevata; sotto, l'incavo della destinazione, rosso se non c'è posto. Gli altri widget fanno spazio e si riducono fino al minimo; annuncio vocale dei widget ridotti. *Dal 2026-10-08 parte dopo una pressione di 1 s, o subito se il widget è già selezionato.*
- **Accessibilità:** vibrazione breve dove disponibile; movimento ridotto senza inclinazione né animazioni; restano l'alternativa senza trascinamento (comandi a schermo, tastiera). *Dal 2026-10-08 i comandi a schermo sono sostituiti da «Sposta qui» sulle celle libere e dalle sezioni «Dimensione» e «Pagina» delle impostazioni; la tastiera resta.*

### Vista delle pagine (implementata, REP-20261007-028)

> Dal 2026-10-08 l'editor delle pagine segue la [modifica semplificata](#modifica-semplificata-e-griglia-per-pagina-implementata-rep-20261008-001). Le voci superate sono annotate.

- **Apertura:** pressione lunga sul vuoto (cella libera, sfondo, copertina); su un widget la pressione lunga apre la modifica dei widget. *Dal 2026-10-08 la pressione dura 1 s e l'editor si apre anche con «Pagine» nella barra della modifica.*
- **Schede:** le pagine diventano schede al 72 % con le vicine ai lati e l'anello d'accento su quella al centro. La barra in alto sale e l'indicatore scende. *Dal 2026-10-14 (ADR-0013) nella fascia in basso scendono la barra di stato e l'indicatore, e sale la barra della vista pagine; la pillola «Annulla» in alto ha una riserva nel calcolo delle schede.* *Annotazione del 2026-10-14 (REP-20261014-010, ISSUE-062): nella vista pagine le celle «+» vuote non sono disegnate, per ridurre lo scatto sul Tab M11; in modifica restano visibili. Effetto sul tablet non confermato.* *Confermata dall'utente il 2026-10-15 (risposta «Tienila»): la regola resta. ISSUE-062 resta aperto solo per la chiusura della vista pagine (frame peggiore ancora circa 211-233 ms sul M11); l'apertura è mitigata (da 345-411 a 156-178 ms).*
- **Barra in basso:** cestino (conferma solo con widget; mai su «Principale» né sulla copertina), + (pagina vuota dopo quella al centro), matita (nome e icona), Fine. *Superata il 2026-10-08: Elimina · Nuova (menu con le pagine pronte) · Principale · Nascondi/Mostra · Fine; matita e foglio della pagina eliminati. Superata il 2026-10-09: vedi [editor delle pagine con icone](#editor-delle-pagine-con-icone-e-nuvoletta-implementata-rep-20261009-002).*
- **Riordino:** trascinando il nome «⠿» sotto la scheda; Alt + frecce come alternativa. Un tocco sulla scheda la apre. *Superato il 2026-10-08: pressione di 1 s sulla scheda e trascinamento, «Sposta prima/dopo» e Alt+frecce; il tocco sul nome lo cambia in linea. Dal 2026-10-09 il nome si cambia nella barra in basso.*
- **Pagine vuote:** quelle create dall'utente restano anche fuori dalla modifica.
- **Nuova pagina:** la scheda apre il suo spazio, entra in dissolvenza e la vista la segue senza scatti (REP-20261007-029).

### Personalizzazione come Android (implementata, REP-20261007-030…038)

Fonti consultate il 2026-10-07: AOSP Launcher3, Pixel, Samsung One UI, Material You. Elenco nei report.

- **Copertina:** orologio, data e meteo sono widget veri. Si spostano tra la copertina e le pagine; dal vassoio se ne aggiungono altri.
- **Trascinamento:**
  - la card tenuta oscilla;
  - al bordo la pagina cambia dopo 450 ms, anche se è la copia del widget a uscire dallo schermo, e lo annuncia una freccia luminosa;
  - gli altri widget si spostano dopo 650 ms di sosta;
  - in alto, la zona «Rimuovi» (*eliminata il 2026-10-08: si rilascia sul cestino della barra del widget*).
- **Rimozione:** subito, con «Widget rimosso · Annulla» per 5 s.
- **Schermata Home** (in Sistema): «Blocca la disposizione» e griglia Compatta / Normale / Ampia (una disposizione per densità). *Dal 2026-10-08 la densità vale per le pagine senza una scelta di colonne.*
- **Vista pagine:** icona casa per la pagina principale. *Dal 2026-10-08 anche l'etichetta «Principale» sulla scheda. Superato il 2026-10-10 (REP-20261009-005): niente etichette sulla scheda.*
- **Vassoio:** categorie, ricerca, forma del widget in celle.
- **Widget:** cornice sì/no e trasparenza dello sfondo.
- **Pile:** widget tenuto sul centro di un altro, «Crea pila»; scorrimento col dito, puntini, rotazione automatica, «Modifica pila».
- **Aspetto:** sfondi predefiniti o foto del dispositivo; accento «Dallo sfondo».

### Modifica semplificata e griglia per pagina (implementata, REP-20261008-001)

Richiesta dell'utente del 2026-10-08, con le decisioni U1–U9 e le scelte esecutive del [report](../reports/REP-20261008-001-modifica-semplificata-griglia-per-pagina.md). Verificata con test e nell'anteprima di sviluppo; non ancora sul Lenovo Tab M11.

**Pressione lunga** (1 s, tolleranza 8 px; oltre, la pagina scorre):
- solleva un widget, apre l'editor delle pagine dal vuoto e solleva una scheda nell'editor;
- riscontro: dopo 180 ms la card sale in modo lineare verso scala 1,03 con l'ombra; sul vuoto la pagina corrente affonda a 0,98 con l'ombra della scheda; al rilascio tutto torna in 120 ms; *superato il 2026-10-09 (REP-20261009-004): il riscontro è il rimpicciolimento al 90 %, vedi [PageShell, pressione, vista pagine e nuvoletta](#pageshell-pressione-vista-pagine-e-nuvoletta-implementata-rep-20261009-004-e-003)*;
- a 1 s vibrazione e copia sollevata che oscilla come ogni copia trattenuta; il widget è selezionato e sale la sua barra; *dal 2026-10-09 la copia torna al 100 % e oscilla solo durante il trascinamento*;
- movimento ridotto: niente scala né oscillazione, solo il cambio di stato;
- un widget già selezionato si trascina subito; il tocco singolo seleziona e non sposta.

**Widget selezionato:**
- anello e otto pallini del colore della selezione (`--aca-selection`, oggi l'accento di Kit 2), di diametro clamp(1rem, 14 % della cella, 1,5rem), con un alone del colore della pagina; il widget sta sopra i vicini;
- la presa è una cornice continua, 2rem fuori e min(1rem, 16 %) dentro: la direzione è quella del pallino più vicino al punto toccato e il lato opposto resta fermo;
- sugli assi che non si possono ridimensionare pallini e fasce non compaiono; un widget di una sola misura ha solo l'anello;
- comparsa con scala da 0,5 e dissolvenza in 160 ms; con il movimento ridotto solo dissolvenza; nei colori forzati Highlight e Canvas.

**Barra del widget:** Rimuovi · Annulla · Conferma. *Dal 2026-10-13 (0.9.2, [REP-20261013-001](../reports/REP-20261013-001-barre-ridondanze.md)) «Conferma» è sostituito da «Fine»: Rimuovi · Annulla · Fine. Un solo tocco su «Fine» tiene le modifiche ed esce dalla modifica.*
- Durante lo spostamento il cestino diventa una pillola «Rimuovi» larga fino a 20rem, con inchiostro rosso; col dito sopra si riempie di rosso con testo bianco e vibra. Annulla e Conferma si nascondono. *Dal 2026-10-13 si nascondono Annulla e Fine.*
- La copia sopra il cestino si riduce a 0,6 con «Rilascia per rimuovere» sopra il dito. Il rilascio rimuove con «… rimosso · Annulla» per 5 s.
- Contrasti calcolati del testo «Rimuovi»: 8,12:1 sul tema chiaro e 6,17:1 sullo scuro; bianco sul rosso 6,47:1.

**Impostazioni del widget:**
- doppio tocco entro 280 ms sul widget selezionato, anche su una pila; Invio, Spazio e lettore di schermo le aprono subito;
- fuori dalla modifica il doppio tocco vale solo sull'area che apre i dettagli: il primo tocco li apre dopo 280 ms, il secondo apre le impostazioni; con la disposizione bloccata i dettagli si aprono subito;
- in modifica il foglio ha le sezioni «Dimensione» (Larghezza e Altezza, − e + in quadrati) e «Pagina» (precedente e successiva); i limiti sono `aria-disabled` e il motivo è scritto nella sezione.

**Celle libere con un widget selezionato:** icona di spostamento, etichetta «Sposta {nome} qui»; il tocco lo sposta facendo spazio agli altri, la selezione resta e «Annulla» si accende.

**Barra della modifica:** «+ Widget» e «Pagine» («Modifica le pagine»).

**Editor delle pagine:**
- etichette «Principale» e «Nascosta» sul bordo superiore della scheda; il corpo delle nascoste è al 55 %; la copertina disattivata compare come «Nascosta» solo qui; *etichette tolte il 2026-10-10 (REP-20261009-005), resta il corpo al 55 %*;
- sotto la scheda al centro: «Prima» e «Dopo», il nome con una piccola matita, che si cambia in linea, e il selettore «Colonne» − / valore / + con «N × M quadrati». Sotto 72rem il selettore va su una seconda riga riservata a tutte le schede, che restano della stessa altezza. *Superato il 2026-10-09 (REP-20261009-002): una sola riga di icone, il nome passa nella barra.*
- il nome delle schede laterali le porta al centro;
- barra: Elimina · Nuova (menu con «Pagina vuota» e le pagine pronte Luci, Stanze, Multimedia, Sonos, Batterie) · Principale · Nascondi/Mostra · Fine; testi accanto alle icone da 40rem; le azioni non disponibili spiegano il motivo nella pillola dei messaggi, che nella vista pagine scende dall'alto. *Superata il 2026-10-09 (REP-20261009-002): barra di sole icone con il nome, «Nuova» senza menu; i motivi restano nella pillola.*
- la scheda tenuta 1 s si solleva e si trascina; la copertina resta prima.

**Griglia per pagina e gap dinamico:**
- ogni pagina può scegliere le colonne; le righe vengono da un'area di riferimento della classe di schermo, quindi la disposizione non cambia con l'area viva; il telefono verticale mostra metà delle colonne, il tablet verticale tre quarti;
- la Copertina ha 3 colonne: sul Lenovo tre quadrati 1×1, sul telefono 2×3 (orologio 2×1, data e meteo 1×1);
- le pagine senza scelta seguono la densità di Sistema; in orizzontale a densità normale hanno 8 colonne dove la cella resta di almeno 84 px;
- i quadrati sono i più grandi possibili; lo spazio che avanza va nei gap, diversi tra orizzontale e verticale, dal gap minimo della classe fino a mezza cella; oltre il tetto la griglia si centra.

### Editor delle pagine con icone e nuvoletta (implementata, REP-20261009-002)

Richiesta dell'utente del 2026-10-09, con le scelte esecutive del [report](../reports/REP-20261009-002-editor-pagine-icone.md). Verificata con test e nell'anteprima di sviluppo a 1024×472 e 390×844; non ancora sul Lenovo Tab M11.

- **Barra:** cestino · «+» · casetta e nome della pagina al centro · occhio · «Fine». Sono icone senza testo e senza sfondo, con il nome accessibile; hanno testo solo il nome e «Fine». Sul telefono la barra resta nella fascia e il nome va in ellissi.
- **«+»:** crea subito una pagina vuota di widget dopo quella al centro; il menu delle pagine pronte non c'è più.
- **Casetta:** rende principale la pagina al centro, cioè quella da cui parte il tablet (interpretazione da confermare con l'utente, che aveva scritto «copertina»). Premuta usa l'inchiostro dell'accento nel tema chiaro e l'accento nello scuro. Sulla Copertina è disattivata con il motivo e il nome non si tocca.
- **Nome:** al tocco diventa un campo alto 46 px con il testo selezionato; cestino, «+» e occhio si nascondono finché il campo è aperto, casetta e «Fine» restano. Invio salva, Esc annulla, il nome vuoto è rifiutato con un avviso sopra la barra. *Superato il 2026-10-10 (REP-20261009-005): senza matita, tra due separatori, e al tocco tutta la barra diventa il campo; vedi la sezione seguente a quella di PageShell.*
- **Sotto la scheda al centro:** una sola riga con la freccia «prima» a sinistra, «− ▦N +» al centro e la freccia «dopo» a destra; icone da 44 px senza sfondo, ombra né scritte. Resta visibile il numero delle colonne.
- **Nuvoletta** delle icone dell'editor: 500 ms di pressione col dito, senza eseguire l'azione; 300 ms di sosta del mouse; subito col fuoco da tastiera. Sopra l'icona, o sotto se manca spazio; con l'azione non disponibile dice anche il motivo. Dopo il rilascio resta da 1,5 a 5 s secondo il testo; Esc, un tocco o uno scorrimento la chiudono. Col movimento ridotto compare senza dissolvenza.
- **Stile della nuvoletta provvisorio**, scelto nell'esecuzione e non confermato: superficie della pagina, ombra incassata e angoli di Kit 2, nelle variabili `--aca-tip-*`. *Superato il 2026-10-09: il design dell'utente [UI-010](componenti/originali/UI-010-tooltip.jsx.txt) è applicato in [REP-20261009-003](../reports/REP-20261009-003-vista-pagine-animazione.md), vedi la sezione seguente.*

### PageShell, pressione, vista pagine e nuvoletta (implementata, REP-20261009-004 e 003)

Richiesta e decisioni dell'utente del 2026-10-09 (D1–D5), con le scelte esecutive nei report [REP-20261009-004](../reports/REP-20261009-004-pageshell.md) e [REP-20261009-003](../reports/REP-20261009-003-vista-pagine-animazione.md) e la decisione in [ADR-0012](../decisions/ADR-0012-pageshell.md). Verificata con test e nell'anteprima di sviluppo a 1024×472 e 390×844 (Chromium senza GPU); non ancora sul Lenovo Tab M11.

**Pressione lunga (sostituisce il riscontro del 2026-10-08):**
- tra 180 ms e 1 s l'elemento premuto si rimpicciolisce in modo lineare fino al 90 % della sua misura (`--aca-hold-scale`) senza spostarsi: il centro resta fermo; niente ombra, crescita, rotazione o oscillazione;
- vale per il widget, per lo sfondo vuoto premuto e per le schede della vista pagine;
- a 1 s vibrazione e sollevamento: la copia nasce al 90 % e torna al 100 % in circa 150 ms, poi oscilla (±0,9° e ±0,5 px, 300 ms, a partire da zero) solo durante il trascinamento; la scheda sollevata della vista torna alla sua scala a riposo con la stessa oscillazione;
- movimento ridotto: nessuna scala, transizione o oscillazione.

**Trascinamento:** il widget si aggancia al centro della copia, non al suo angolo, quindi una copia piccola sopra celle grandi cade nella cella sotto il dito. Dopo il giro di pagina al bordo il bersaglio è valido subito e un rilascio subito dopo sposta il widget.

**Copertina:**
- come ogni pagina, ha le caselle vuote sempre visibili: fuori dalla modifica sono pozzetti tenui senza «+», non interattivi e nascosti agli assistivi; in modifica diventano celle con «+», nello stesso strato (D5);
- la barra in alto non compare mai sulla copertina, nemmeno in modifica (D1). *Dal 2026-10-14 (ADR-0013) D1 vale così: sulla copertina la fascia in basso mostra solo l'indicatore; la barra di stato non compare mai (è nascosta, inerte e muta).*

**Barre in modifica:**
- «Fine» non è più nella barra in alto: sta nella barra in basso della modifica, accanto a «+ Widget» e «Pagine», come azione primaria con testo, 44 px di altezza; la matita della barra in alto non si trasforma più; *Dal 2026-10-14 (ADR-0013) «Modifica» sta nello stesso angolo di «Fine», con matita e testo (solo icona da 44 px alla densità minima), e le due non sono mai visibili insieme.*
- in modifica la barra in alto sale su tutte le pagine e resta inerte (scelta esecutiva); Connessione e Sistema tornano con «Fine»; *Dal 2026-10-14 la barra di stato scende in modifica su tutte le pagine e resta inerte; Connessione e Sistema tornano con «Fine».*
- entrando in modifica dalla matita con la tastiera il fuoco passa a «Fine»; con «Fine» o Esc torna alla matita, e sulla copertina al cursore «Pagina» dell'indicatore; *Dal 2026-10-14 il pulsante è «Modifica» (`data-launcher-edit`).*
- nel passaggio tra la barra della modifica e quella della vista pagine, la barra che arriva aspetta 180 ms (220 ms il gruppo «Pagine») quella che va via, senza mostrare due «Fine» insieme; *Dal 2026-10-14 la stessa attesa vale tra la barra di stato e la barra della modifica: la barra che arriva attende 180 ms (220 ms il gruppo «Pagine»); con il movimento ridotto solo dissolvenza di 120 ms, mai le due barre insieme. Una guardia di 400 ms, solo per il puntatore, ignora il secondo tocco nello stesso angolo su «Modifica», «Fine» e «Pagine».*
- su tablet in verticale (768–834 px) la barra della modifica può passare alla densità corta, con «+ Widget» e «Pagine» solo icone. *Dal 2026-10-14 anche la barra di stato ha tre densità (testo, «short», icone); vedi «Barra unica in basso».*

**Vista pagine:**
- le pagine restano a larghezza piena e la griglia non si rimisura: la scheda è una foto della pagina scalata di k = min(0,72, (H − riserva)/H), con una sola durata (360 ms) e una sola curva (`cubic-bezier(0.23, 1, 0.32, 1)`) per tutte le parti; con il movimento ridotto è immediata;
- il gruppo scheda più comandi è centrato in verticale; «Principale» e «Nascosta» (*tolte il 2026-10-10, REP-20261009-005*) e i comandi compaiono dopo che il corpo li ha liberati;
- si scorre con trascinamento a mouse o dito (soglia 8 px, resistenza ai bordi, flick), Tab, Maiusc+Tab e Alt+frecce; rotella e trackpad non scorrono le schede;
- Tab nella vista non sposta le schede: porta al centro quella che ha il fuoco da tastiera;
- una pagina nuova entra con dissolvenza e crescita, una eliminata sparisce e le vicine scivolano; le schede riordinate scivolano dalla posizione precedente.

**Nuvoletta UI-010** (icone senza testo dell'editor): fondo d'accento di Kit 2 scurito fino a luminosità 0,45 con saturazione ridotta insieme, quindi tinta fedele e dentro sRGB; testo bianco, contrasto di almeno 4,5:1 su ogni accento (6,39:1 al minimo nelle prove); Inter 16 px peso 500; raggio 5 px; ombra `0 10px 10px` al 10 %; triangolino 8×8 che indica il centro dell'icona anche contro il bordo dello schermo; sale dall'icona in 300 ms con la curva `cubic-bezier(0.68, -0.55, 0.265, 1.55)`; con il movimento ridotto solo dissolvenza di 120 ms. Attivazione invariata: pressione di 500 ms, sosta del mouse di 300 ms, fuoco.

### Nome della pagina animato e ombre non ritagliate (implementata, REP-20261009-005 e 006)

Richiesta dell'utente del 2026-10-09 dopo la prova della 0.7, con le scelte esecutive nei report [REP-20261009-005](../reports/REP-20261009-005-barra-nome-animata.md) e [REP-20261009-006](../reports/REP-20261009-006-ombre-non-ritagliate.md). Verificata con test e nel browser a 1024×472 e 390×844 (Chromium senza GPU); non ancora sul Lenovo Tab M11.

**Schede della vista pagine:**
- niente etichette sulla scheda: «Principale» e «Nascosta» non compaiono più in alto a sinistra; la pagina principale si riconosce dalla casetta accesa nella barra, la nascosta dall'occhio barrato quando è al centro e dal corpo al 55 %; il nome accessibile della scheda continua a dire «principale» e «nascosta».

**Nome della pagina nella barra dell'editor:**
- a riposo è solo testo, senza matita, tra due separatori verticali sottili (1 px × 1,25 rem, inchiostro attenuato al 35 %); resta alto 44 px e toccabile. I separatori stanno sul nome modificabile, non sull'etichetta fissa «Copertina» (scelta da confermare). *Superato il 2026-10-12 (REP-20261012-002): anche la Copertina ha le due lineette, vedi la sezione seguente;*
- toccando il nome le icone e «Fine» svaniscono in dissolvenza (e diventano inerti), la barra cambia larghezza e diventa un solo campo con il nome selezionato, centrato nella barra e largo al massimo 28 rem e mai oltre la fascia; un nome lungo scorre dentro il campo;
- Invio, «Fatto» della tastiera Android, Tab e l'uscita dal campo con un nome valido salvano; Esc annulla; un nome vuoto è rifiutato con l'avviso e il campo resta aperto. La chiusura ripete la scia al contrario: il campo svanisce, la barra torna alla larghezza normale e le icone ricompaiono nella seconda metà della scia, a barra quasi assestata; il fuoco torna sul nome;
- una sola durata (240 ms) e una sola curva (`--aca-ease-out`), sulla sola barra delle pagine; la barra del widget non cambia. Con il movimento ridotto il passaggio è immediato.

**Ombre ai bordi delle barre:**
- il ritaglio del contenitore delle pagine non sta più al bordo dell'area tra le barre ma arriva ai bordi dello schermo, sotto le barre: le ombre e le prese dei widget della prima e dell'ultima riga e quella della scheda tenuta premuta entrano nelle fasce invece di essere tagliate con una linea dritta. Le barre stanno sopra le pagine e lo spazio tra le barre non cambia (celle, gap, griglia e vista pagine identici);
- le fasce vuote non prendono i tocchi, come prima: pressione lunga, scorrimento e trascinamento partono solo dall'area delle pagine; le pillole e l'indicatore li ricevono;
- sul telefono, dove la barra di stato ha anche la riga dei chip, il bordo di ritaglio sta circa 64 px sopra l'area delle pagine e non proprio al bordo dello schermo: oltre i circa 23 px dell'ombra, nessun taglio visibile; *Superato il 2026-10-14 (ADR-0013): la riga dei chip in alto non esiste più e la fascia in alto riserva solo l'area sicura; il ritaglio ai bordi dello schermo resta.*
- la scheda sollevata della vista pagine non cresce e resta alla scala a riposo: la proposta di ancorarne l'origine in alto non è applicata, perché la sposterebbe dal suo pulsante di apertura.

### Grandezza tra pagine, nome della copertina, animazioni su livelli e versione (implementata, REP-20261012-001, 002, 003 e 004)

Richieste e decisioni dell'utente del 2026-10-12 dopo la prova della 0.8 sul tablet, con le scelte esecutive nei report [REP-20261012-001](../reports/REP-20261012-001-widget-tra-pagine-grandezza-visiva.md), [REP-20261012-002](../reports/REP-20261012-002-nome-copertina-separatori.md), [REP-20261012-003](../reports/REP-20261012-003-lag-tablet-prestazioni.md) e [REP-20261012-004](../reports/REP-20261012-004-versione-da-env.md). Verificata con test, con prove nel browser senza GPU e, per la fluidità, con misure sul tablet delle demo (TB336ZU); la resa a vista sul tablet è da confermare.

**Grandezza visiva tra pagine** (scelta dell'utente «Grandezza visiva»):
- un widget spostato su una pagina con celle di misura diversa (per esempio dalla copertina, con celle di circa 320 px, a Principale, con celle di circa 112 px) mantiene circa la grandezza che si vede, convertita nelle celle della pagina di arrivo, entro i limiti del widget e della griglia;
- se dove si rilascia non c'è posto, si rimpicciolisce per primo, fino alla grandezza più grande che entra, al minimo quello del widget (1×1 se non ne ha un altro); gli altri widget si limitano a spostarsi, e solo se nessuna grandezza entra si rimpiccioliscono anche loro;
- l'anteprima mostra la grandezza che verrà usata e la misura si prende una volta, al sollevamento;
- dal menu («Sposta nella pagina» e frecce) vale la stessa conversione, con la misura reale dello schermo e, in sua assenza, le aree di riferimento della classe;
- lo spostamento nella stessa pagina e il ridimensionamento non cambiano. L'annuncio al lettore di schermo non riporta ancora la nuova grandezza (proposta [ISSUE-045](../project-status.md#issue-045)).

**Nome della copertina:** un unico design per tutte le pagine. Il nome della copertina ha le stesse due lineette (1 px × 1,25 rem, inchiostro attenuato al 35 %), lo stesso spazio e la stessa altezza di quello delle altre pagine; resta non rinominabile e non è un pulsante.

**Animazioni su livelli, aspetto invariato** (obiettivo: scorrimento e vista pagine fluidi sul tablet):
- widget, celle libere e barre (stato, modifica, indicatore, vista pagine) stanno su livelli propri del compositore;
- nella vista pagine l'angolo della scheda è fisso e l'ombra, in due strati separati, sfuma solo in opacità: non si animano più `border-radius` e `box-shadow`. Le animazioni della vista sono solo trasformazioni e opacità, con le stesse durata e curva;
- alla chiusura della vista gli angoli della pagina tornano subito quadrati, invece di scendere insieme alla scala;
- con il movimento ridotto l'ombra della scheda compare subito;
- l'oscillazione dei widget in modifica gira solo nella pagina corrente e resta ferma nella vista pagine: le schede non sono più ruotate di 0,25°;
- entrando in modifica i controlli dei widget non animano più l'ombra; uscendo sì (proposta [ISSUE-044](../project-status.md#issue-044));
- in Kit 2, dentro i widget, i pulsanti con pressione non hanno più il livello annidato, perché la loro pressione affonda e non scala; la cornice del widget lo mantiene e il Metallo è invariato.

L'aspetto a riposo resta quello dei Kit 2 e Metallo, senza colori, ombre, raggi o posizioni diversi. Il compositore aggancia i livelli ai pixel del dispositivo: testo e bordi possono spostarsi di pochi pixel del dispositivo rispetto a prima (misurato sul PC senza GPU: fino a 2 px del dispositivo, circa 1 px CSS a DPR 2, per il testo di alcuni widget). Differenze e misure nel [report](../reports/REP-20261012-003-lag-tablet-prestazioni.md#aspetto-differenze-rilevate); la resa sulla GPU del tablet è da confermare a vista.

**Versione:** in fondo a Sistema, nella sezione «Informazioni», la riga «Versione» mostra la versione del banco, scritta in `progetto/.env` (`ACASYSTEM_VERSION`) e letta dal backend in `/api/health`; il ripiego, se il backend non risponde, è la stessa variabile incorporata nella build.

### Barra unica in basso (implementata, REP-20261013-002, ADR-0013)

Su approvazione dell'utente del 2026-10-13. Presentazione e comportamento stanno qui e in [ADR-0013](../decisions/ADR-0013-barra-unica.md); i numeri sono misure in Chromium headless con raster software, non sul tablet.
- **Una sola barra.** La barra di stato lascia l'alto e sta nella fascia in basso, in posizione assoluta nell'area di griglia della fascia (riga 1 da 40rem, riga 2 sotto), quindi non dimensiona le colonne. La fascia in alto riserva solo l'area sicura: le pagine guadagnano 64 px in ogni stato. L'avviso di connessione resta in cima, con un margine superiore.
- **Due pillole in Kit 2**, come i gruppi della barra della modifica (`--aca-socket-shadow`), con `will-change` solo sulle pillole. Sinistra: ora (`Display sm`, 33 px, tratto sottile, da provare con la persona), connessione, ingranaggio Sistema (44 px, solo icona, nuvoletta UI-010, pallino blu degli aggiornamenti). Destra: chip scorrevoli con maschere ai bordi, poi «Modifica» con matita e testo, nell'angolo di «Fine». Sistema sta lontano da «Modifica» ed è raggiungibile anche con la disposizione bloccata.
- **Densità**, scelte da `footerBand.ts` sulla barra misurata: testo; «short» (la parola «Sincronizzato» resta solo per i lettori di schermo); «icons» («Modifica» solo icona, con `aria-label` e `title`). Prima cede «Sincronizzato», poi «Modifica», poi si stringono le tacche dell'indicatore. Le parole delle fasi anomale della connessione restano scritte, al massimo in ellissi. Sotto 40rem «Sincronizzato» è sempre solo per i lettori di schermo. In Sistema → Collegamento la connessione resta scritta per intero.
- **Passaggi.** In modifica la barra di stato scende e la barra della modifica sale dopo 180 ms; con il movimento ridotto solo dissolvenza di 120 ms. In copertina e nella vista pagine la barra è nascosta e inerte.
- **Griglia.** Il rettangolo della griglia è identico tra vista normale, modifica, selezione e vista pagine; la fascia ha altezza costante (88 px, 152 px sotto 40rem). Celle prima → dopo: 1024×640 da 75 a 88 px; 1280×800 da 107 a 120; 1280×665 da 80 a 93; 390×700 da 57 a 75; 1024×472, 1024×568, 640×1024, 844×390 e 390×844 invariate o quasi (112, 112, 89, 91, 82). `REFERENCE_AREAS` non cambia: righe, chiavi e disposizioni salvate restano.
- **Vista pagine.** La pillola «Annulla» è agganciata in alto all'area delle pagine e il calcolo delle schede tiene una riserva pari alla pillola (`--aca-undo-room`). Le schede restano alla stessa altezza e posizione, ma sugli schermi limitati dalla larghezza il contenuto si rimpicciolisce (1024×472: `k` da 0,72 a 0,6146; 844×390: da 0,647 a 0,5099); distanza minima tra pillola e scheda 16 px. La nota «Disposizione bloccata» e la pillola sono sopra la fascia anche sul telefono in verticale.
- **Accessibilità.** Radice `div` con `role=group` «Stato e comandi» dentro il footer: sparisce il landmark `banner`. `role=status` della connessione sempre nel DOM. Ordine di tabulazione: pagina, Sistema, chip, «Modifica», indicatore. Il chip multimedia premibile ha un'area di tocco di 44 px.
- **Non fatto:** avviso «Allarme scattato» in cima, pulsante «Casa», chip multimedia tolto, «Mostra l'ora» (proposte ISSUE-050…058). Da provare sul tablet: TalkBack, gesto dal bordo superiore, soglia dei 40rem con testo ingrandito, prestazioni.

## Uso proposto nell'app

Queste sono proposte progettuali da precisare, non componenti implementati o un layout definitivo.

- **Superfici:** rilievo contenuto per gruppi di controlli e dispositivi; dati, grafici e messaggi devono restare facilmente leggibili. Evitare di moltiplicare rilievi e contenitori senza una funzione nella gerarchia.
- **Colori:** arancione per azioni principali e selezione, con un ruolo coerente tra schermate. Colori di successo, avviso ed errore restano da definire; il colore non è l'unica informazione sullo stato.
- **Testi e icone:** caratteri leggibili e peso sufficiente; proposta di testi chiari sulle superfici scure, testi scuri sulla base chiara e `#222222` sui pulsanti arancioni. Font, dimensioni e set di icone restano aperti.
- **Interazione:** la pressione può modificare il rilievo; le microinterazioni richieste seguono la sezione precedente. Lo stato del dispositivo deve arrivare dal sistema; l'aspetto premuto non conferma l'esecuzione di un comando.
- **Touch e tastiera:** comandi identificabili, aree di tocco da dimensionare sul client scelto e focus visibile. Il funzionamento non deve dipendere dal passaggio del mouse.
- **Asset:** valutare disponibilità locale di font, icone e altri asset per sostenere l'obiettivo offline. La disponibilità non è ancora verificata.

## Componenti e stati da progettare

| Elemento candidato | Aspetto da definire | Feedback da distinguere |
|---|---|---|
| Card dispositivo | Nome, icona, stato e comando autorizzato | Dato aggiornato, comando in corso, errore o dispositivo non disponibile. |
| Pulsante | Rilievo, etichetta e gerarchia dell'azione | Normale, focus, pressione, attesa, disabilitazione. |
| Interruttore | Indicazione leggibile di accensione e spegnimento | Stato reale separato dalla richiesta di cambio. |
| Regolazione | Valore, unità e interazione appropriata alla funzione prevista | Valore confermato, aggiornamento in corso e limite applicabile. |
| Messaggio di stato | Testo e simbolo coerenti | Informazione, errore, indisponibilità e riconnessione. |

Sono candidati del futuro kit di componenti: schermate, comandi e copertura devono essere concordati nel perimetro funzionale. Forme, raggi, spaziature, ombre e tempi di transizione non hanno ancora valori approvati. Le viste per ruoli avanzati e funzioni future non entrano automaticamente nella fase 1.

## Leggibilità e controlli previsti

Riferimenti primari consultati il 2026-10-05:

- [WCAG 2.2, contrasto del testo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): almeno 4,5:1 per testo ordinario e 3:1 per testo grande, con le eccezioni del criterio.
- [WCAG 2.2, contrasto non testuale](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html): le informazioni visive necessarie a identificare controlli e stati devono essere distinguibili secondo il criterio 1.4.11. Le ombre decorative non sostituiscono queste informazioni.
- [WCAG 2.2, uso del colore](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html): colore accompagnato da altri segnali visivi quando comunica significato.

Calcoli già eseguiti su coppie sRGB opache, riportati nel report del pilota:

| Coppia | Contrasto calcolato | Risultato limitato alla soglia del testo ordinario |
|---|---|---|
| `#ef8231` e `#222222` | Circa 5,99:1 | Supera 4,5:1. |
| `#ffffff` e `#ef8231` | Circa 2,66:1 | Non raggiunge 4,5:1; evitare testo bianco ordinario su arancione. |
| `#ffffff` e `#222222` | Circa 15,91:1 | Supera 4,5:1. |

Questi risultati non provano il contrasto delle reference, dei componenti futuri, di trasparenze o degli stati. Non costituiscono un collaudo del frontend o una conformità complessiva.

**Controlli da pianificare nel futuro incarico UI:** entrambi i temi e l'accento, contrasto delle varianti effettive, chiarezza degli stati, focus/touch, alternativa senza trascinamento, movimento ridotto, anteprima dell'icona e percentuale durante la regolazione, aggiornamento della luce con frequenza limitata e conferma HA, errore/indisponibilità, leggibilità sul client e nell'illuminazione dell'ufficio, adattamento alle dimensioni concordate e conservazione dei comandi previsti. Sono Non eseguiti; evidenze future in [verification.md](../verification.md) e report pertinenti.

## Pannelli e caricamenti implementati

Richiesta umana del 2026-10-05, [REP-20261005-010](../reports/REP-20261005-010-pannelli-skeleton.md): apertura stile macOS con scala iniziale 0,96, dissolvenza, piccolo superamento 1,008 e assestamento a 1 in 360 ms; chiusura con scala 0,97 e opacità zero in 180 ms. Sono scelte esecutive entro la direzione spring richiesta. Il backdrop sfuma separatamente. Copertura: 31 slot dell'orchestrazione, inclusi dialoghi dispositivi e pannelli Aspetto/Disposizione/Intestazione; il menu impostazioni conserva la propria transizione precedente.

Skeleton condiviso in TypeScript per liste, riepiloghi compatti, grafici e caricamento lazy dei pannelli, con shimmer delle forme decorative e un solo stato annunciato in italiano. Sono applicati a stanze/dispositivi dell'area, profili, attività, calendario, cronologia sensori, consumi e temperature. I selettori multimediali avevano già placeholder: aggiunta la variante senza movimento. Gli indicatori di scrittura, aggiornamento firmware e dispositivo in azione restano distinti dai fetch di contenuti.

Le liste già disponibili restano visibili durante il refresh; stanze e profili riservano almeno 216 px anche a risultato vuoto o errore. Grafici placeholder: sensore 350 px, consumi 320 px (contenitore minimo 352 px con padding anche per le barre da 220 px), temperature 140 px, corrispondenti agli ingombri dei rispettivi contenuti. Il numero effettivo di elementi può estendere le liste: non è dichiarato CLS nullo in ogni schermata. Il fallback lazy è un telaio generico, non una replica esatta di ogni pannello legacy.

Con movimento ridotto le animazioni di pannello/backdrop e lo shimmer sono disattivati; l'uscita viene completata senza attesa animata. Durante l'uscita il contenuto è inert e aria-hidden; focus e scroll sono preservati anche nel passaggio tra dialoghi. Le prove e i loro limiti sono in [verification.md](../verification.md).

## Questioni aperte e continuità

Logo, font, palette completa, scala delle spaziature, geometria e ombre, schermate, client e librerie restano aperti ([ISSUE-012](../project-status.md#issue-012)). Nessuna nuova dipendenza è adottata dalla sola scelta dello stile.

Per riprendere il design: leggere incarico attivo, questo documento, requisiti pertinenti e stato; rispettare stile e colori confermati; registrare ogni proposta distinguendola dalle indicazioni umane. Quando una proposta viene approvata, riportare fonte e data. Se cambia un comportamento, aggiornare anche il modulo funzionalità; se cambia soltanto la presentazione, aggiornare il design e le verifiche pertinenti.


### 2026-10-14 — Grafici nei concept adattivi

Richiesta umana successiva a REP-20261014-004: ogni card del kit riserva metà del contenuto al grafico e metà ai controlli. Curve, barre, anelli e sequenze di stato scelti secondo il dispositivo. Il grafico cresce con la dimensione della card, usa lo stato locale e non aggiunge comandi; serie esplicitamente simulate. Gesti, dettagli e selezione del sistemista conservati. Evidenze in [REP-20261014-005](../reports/REP-20261014-005-grafici-widget.md).


### 2026-10-14 — Pagine di categoria nel launcher

Le categorie sono pagine ordinarie del launcher già popolate, con le stesse griglie, cornici, dimensioni e modifiche delle pagine vuote. Prima/dopo collegamento viene riusato il medesimo componente operativo; prima, i controlli sono inert e il tap apre la configurazione. Non aggiunte intestazioni decorative o grafiche di configurazione. Orologio, Data e Meteo di casa riusano i componenti della Copertina. I grafici dei concept restano nella galleria simulata. Esiti in [REP-20261014-006](../reports/REP-20261014-006-pagine-categoria.md).


**Correzione del flusso iniziale, 2026-10-14:** tutte le categorie sono presenti dalla prima apertura del launcher, senza selezione in Nuova pagina. L’utente rimuove quelle inutili con i comandi esistenti; il riavvio non le ricrea. Presentazione dei widget invariata. [REP-20261014-007](../reports/REP-20261014-007-categorie-iniziali.md).


### 2026-10-14 — Griglie iniziali piene per categoria

La base della pagina dipende da numero e ingombro dei widget: rettangoli completamente occupati, dimensioni entro i limiti del registro, distanze regolari e gruppo centrato con celle quadrate. Basi per classe di schermo persistite; colonne scelte esplicitamente prevalgono. Aggiornate automaticamente soltanto vecchie disposizioni ancora iniziali. Le pagine reali usano le primitive del kit e i widget operativi, non i 20 nuovi concept simulati: distinzione in ISSUE-064 e [REP-20261014-008](../reports/REP-20261014-008-griglie-categoria.md).

### 2026-10-14 — Verifica della build sul Tab M11

[REP-20261014-009](../reports/REP-20261014-009-banco-tablet.md), banco 0.9.7: tutte le card da associare restano visibili con HA caricato. L'ordine CSS è dichiarato prima dei fogli dei widget, così il reset non annulla gli spazi delle primitive; stile, colori e ombre conservati. Verificate sette categorie in orizzontale e verticale, vassoio ad altezza fissa, «4 × 1», movimento ridotto, tap/configurazione, pressione lunga e trascinamento. Lo scroll touch orizzontale cede al browser e non produce un'aggiunta al rilascio; il drag dal vassoio inizia verticalmente. Rimane la distinzione tra concept e card operative (ISSUE-064); stato non associato di Calendario/Attività ancora con skeleton, gruppi Multimedia/Sonos poco distinguibili a vista. Sono osservazioni UX, non nuovi comportamenti implementati.


### 2026-10-15 — Presentazione dei venti widget operativi

La richiesta di [REP-20261015-003](../reports/REP-20261015-003-widget-operativi.md) estende i concept all'operatività conservando materiale soft-well e palette esistenti. Componenti di gesto, grafico e stili sono condivisi con la galleria; i dati HA rimangono separati dai dati dimostrativi. Il CSS necessario è importato direttamente dal percorso operativo.

Compatta mostra il controllo prioritario; Standard e Grande limitano i controlli allo spazio misurato, Pagina dispone di scorrimento interno. Visibilità e ordine sono persistenti, con fallback ai controlli frequenti; i dettagli accessibili da tocco/tastiera conservano tutte le capacità. Anteprima del gesto, richiesta pendente, errore e valore confermato hanno stati distinti. Cronologia assente o fallita è esplicita e non diventa una serie dimostrativa. La vista camera in pausa locale rimane distinta dallo spegnimento.

Restano i gesti 500 ms/14 px/60 ms, movimento ridotto e miglioramenti del login. Nessun cambio del materiale concordato è autorizzato da un'ottimizzazione: eventuali interventi prestazionali devono derivare dalle tracce e conservare l'aspetto. Esiti visivi, M11 e limiti sono registrati nel report 003; non anticipati da questa specifica.


Aggiornamento operativo REP-20261015-003: verificate Compatta 2×1, Standard 2×2, Grande 3×3 e Pagina 4×4; i minimi salvati precedenti, compresi 1×1, restano validi. L’estensione dei massimi non riallarga una tessera esistente. Anteprima camera contenuta nel proprio spazio e ultimo controllo Pagina raggiungibile con lo scorrimento interno. Prestazioni e accessibilità manuale M11 ancora da verificare.

### 2026-10-19 — Widget non associati: attenuati, con «Collega» (decisione umana)

Su proposta di [REP-20261019-002](../reports/REP-20261019-002-correzioni-issue062-075-077.md) (ISSUE-076) l'utente ha scelto il 2026-10-19 l'**opzione B**: «il widget resta visibile ma attenuato, con sopra un pulsante «Collega» alto almeno 48 px. In modifica il pulsante lascia il posto a un'etichetta «Da collegare». È l'opzione che cambia di più l'aspetto, e va misurata sul tablet.» Un widget di categoria non associato non imita più un'entità offline: niente rosso, niente «Non disponibile» o «Spento»; il contenuto resta nel tono attenuato, senza `opacity`; un solo pulsante primario «Collega» con icona di collegamento (almeno 48 px) e il nome del tipo in Caption; nelle tessere a una riga un cerchio da 48 px con «Collega» sotto; in modifica nessun pulsante e l'etichetta «Da collegare». Calendario e Attività non associati restano come prima (bersaglio di tocco). Applicata in parte: il **grado di attenuazione** (per molti tipi il layer attenuato è quasi vuoto, nelle taglie a una riga è nascosto) attende la conferma dell'utente; non si decide da soli fra dati d'esempio attenuati e nascondimento. Misurata sul Tab M11 con il banco 0.9.12: pulsante 151×51 px, cerchio 48×48 px. Dettagli e limiti in [REP-20261019-003](../reports/REP-20261019-003-issue076-widget-da-collegare.md). L'osservazione del 2026-10-14 sullo stato non associato di Calendario e Attività con skeleton è storica. **Annotazione del 2026-10-19 (banco 0.9.13, REP-20261019-003):** il modo di attenuare è cambiato rispetto alla 0.9.12: le parole e le cifre restano non disegnate, ma le forme vuote del widget (binari, pillole, quadranti, controlli) restano visibili in inchiostro attenuato, con icona e nome del tipo in alto e il pulsante «Collega» sopra il widget (isolamento dello z-index, nessun livello del compositore). Gli stati segnaposto non affermano nulla (lettori in pausa, riempimenti a zero, nessun lucchetto chiuso). Provata sul Tab M11: restano tessere senza nome del tipo e un Allarme quasi vuoto, da decidere con l'utente. La scelta non autorizza nuove funzioni. **Sesta passata (2026-10-19, dopo la prova sul Tab M11):** in ogni tessera non associata di dimensione piena icona e nome del tipo stanno sempre in alto e il pulsante «Collega» subito sotto; l'icona di testata del widget non è disegnata (l'icona compare una volta); gli elementi dell'anteprima a meno di 10 px dal nome o dal pulsante, o per più di un quarto fuori dalla tessera, non sono disegnati; la Videocamera ha il riquadro sotto il pulsante; a una riga il nome va su due righe, senza puntini, accanto o sotto il cerchio (48 px, 44 px nelle tessere più basse). Dettagli in [REP-20261019-003](../reports/REP-20261019-003-issue076-widget-da-collegare.md). **Rifinitura (2026-10-19, banco 0.9.14, misurata sul Tab M11):** lo schema della tessera non collegata di dimensione normale è **icona e nome del tipo sempre visibili, una sola volta, in alto, con «Collega» subito sotto** in uno spazio proprio (almeno 8 px da ogni elemento visibile dell'anteprima); l'anteprima attenuata usa sagome neutre (barre e pillole) al posto di parole e valori, per Meteo, Stanza, Costi energetici, Prezzo dell'energia, Sensore e Allarme; nelle tessere 1×1 il nome va su due righe senza puntini con il cerchio da 48 px (44 px nelle più basse; l'icona del tipo manca per mancanza di spazio). **Sagome neutre e gruppo in alto sono scelte esecutive in attesa del giudizio dell'utente.** Limite: a testo ingrandito l'anteprima delle 2×2 si nasconde e il nome può essere tagliato.

### 2026-10-20 — Widget non associati: il widget completo, spento, con una piccola etichetta (decisione umana)

Alla domanda su come segnalare il collegamento, vedendo le foto della 0.9.14, l'utente ha scelto il 2026-10-20 «Etichetta piccola»: «non vorrei un pulsante gigante ma i widget completi ma in stato spento». **Sostituisce l'opzione B del 2026-10-19** (pulsante «Collega» grande sopra un'anteprima attenuata). Un widget di categoria non associato è il widget completo, con il suo aspetto normale, **spento** dove ha senso (luce, ventilatore, clima, lettori, Sonos, TV: «Spento»; aspirapolvere e tosaerba: «Inattivo») e con un valore neutro «–» dove non si può dire nulla (sensore, tapparella, meteo, energia, auto, stanza). Serratura, allarme e videocamera non affermano nulla sulla sicurezza: nessuna parola di stato, nessuna immagine, nessun rosso, nessun «Non disponibile»; nell'Allarme nessun tasto e nessuna icona di stato (lo scudo con la spunta direbbe «inserito»), nella Serratura né il tasto singolo «Sblocca» delle tessere 1×1 e 1×2 (due tasti o nessuno), nella Stanza nessuna riga «Tutto spento». Una piccola etichetta «Da collegare» (Caption, icona di collegamento, blu del Kit 2 al 14%) sta in una riga propria in alto a destra, sopra il widget, e non copre né il nome né i controlli; nelle tessere di una cella resta l'icona (le parole per i lettori di schermo). Il tocco su tutta la tessera, fuori dalla modifica, apre la configurazione (un solo bersaglio «Collega <tipo>»); in modifica l'etichetta resta e il tocco serve a selezionare e spostare. I tasti del widget sono disegnati a piena opacità e inerti; in modifica sono attenuati come in ogni widget. La scelta non autorizza nuove funzioni. Dettagli e limiti in [REP-20261020-001](../reports/REP-20261020-001-widget-spenti-stanza.md). **Annotazione del 2026-10-20 (quarta passata, decisione umana):** vedendo le foto della 0.9.15 l'utente ha precisato «per mostrare lo stato spento intendo che al posto del colore principale presentano tutto con grigio». Dentro la tessera non collegata ogni colore principale e d'accento (blu e viola del Kit 2, colori di stato, riempimenti, bagliori, sfumature, icone, anelli, ombre, inchiostro) è un grigio dei token esistenti del Kit 2 a croma zero, in chiaro e in scuro, e **l'etichetta «Da collegare» è grigia** (sfondo dell’inchiostro attenuato grigio, `--aca-g-mid`, al 16%, testo in inchiostro): questo sostituisce «blu del Kit 2 al 14%» sopra. Il testo resta a contrasto ≥ 4,5:1; niente rosso; l'ottenimento avviene sovrascrivendo i token nella tessera, non con `filter`, `opacity` o `will-change` (ISSUE-062). Le tessere Android TV e Apple TV non mostrano più la riga di stato con l'icona «!» (restava «Spento» due volte). **Domanda aperta (revisione del 2026-10-20, non decisa):** la superficie del widget (`--k2-bg`) e la cornice della tessera con la sua ombra restano nella tinta azzurrina del Kit 2, come nei widget collegati; sono grigi solo inchiostro, icone, riempimenti, bagliori ed etichetta. Se «tutto con grigio» comprende anche superficie e cornice, va deciso dall’utente su un confronto prima/dopo ([REP-20261020-001](../reports/REP-20261020-001-widget-spenti-stanza.md), ISSUE-082). Anche Calendario e Attività non collegati (avviso proprio, non marcati `data-unbound`, fuori incarico) restano nei toni attuali accanto alle tessere grigie: se vadano in grigio lo decide l’utente.

**Stato «da collegare» in grigio, decisione dell'utente del 2026-10-20** (vedendo le foto della 0.9.15: «per mostrare lo stato spento intendo che al posto del colore principale presentano tutto con grigio»): lo stato «da collegare» è il widget completo, con la sua struttura, **in grigio** al posto del colore principale (blu e viola del Kit 2, stato, riempimenti, bagliori, sfumature, icone, anelli), in chiaro e in scuro, con l'etichetta «Da collegare» grigia e leggibile (sfondo dell'inchiostro attenuato grigio `--aca-g-mid` al 16%, contrasto del testo almeno 4,5:1). Android TV e Apple TV mostrano «Spento» una volta sola, senza icona di avviso. Il grigio è ottenuto ridichiarando i token dentro la tessera, senza `filter` né `opacity`. Provato sul Tab M11 con il banco 0.9.16. **Non deciso:** se anche superficie, cornice e Calendario/Attività vadano in grigio (ISSUE-082); finché l'utente non risponde restano nella tinta del Kit 2.

### 2026-10-21 — Cornice a schermo intero (decisione umana, ADR-0016, REP-20261021-003)

Su richiesta dell'utente del 2026-10-21 («vai, procedi con G3-G5 e C1-C3») il launcher è a schermo intero in uso; realizzata nel codice e provata sul Tab M11 (banco 0.9.22) per quanto indicato in [REP-20261021-003](../reports/REP-20261021-003-interazioni-schermo-intero.md), «G3-G5 e C1-C3 — esito». **Sostituisce, per il launcher, la barra unica in basso con barra di stato** ([ADR-0013](../decisions/ADR-0013-barra-unica.md)); il resto di quella sezione è storico.

**Annotazione del 2026-10-21 (sera, ripristino 0.9.23).** Su richiesta esplicita dell'utente («sono scomparsi i + e non funziona più l'animazione che tenendo premuto mi apre le pagine») due punti di questa sezione sono rovesciati ([ADR-0016](../decisions/ADR-0016-schermo-intero-interazioni.md), «Rettifica dell'utente»): le celle vuote in uso mostrano di nuovo il «+» (apre «Aggiungi un widget»); la pressione lunga sullo spazio vuoto restringe la pagina e apre la vista pagine, dove compare in alto, al centro, la barra con la pallina (dissolvenza dall'alto verso il basso, uscita inversa). Il resto (ingranaggio, nessuna barra in uso) resta. Il testo sopra è storico.

**Annotazione del 2026-10-23.** Su richiesta esplicita dell'utente («se premo per avere l'animazione della pagina, la schermata dopo l'animazione è corretta, però nel momento in cui ritorno sulla pagina o clicco su un altra pagina con i widget presenti, questi hanno l'animazione shake attiva, inoltre sono presenti il pulsante "+ Widget" che è ridondante siccome siamo pieni di segni + per aggiungere i widget e un pulsante con pagine e fine che sono anche essi ridondanti»; risposte: tocco su una pagina nella vista pagine = «Torna alla pagina in uso», solo la barra del widget con «Fine», tremolio in modifica = «Nessuno») e sulla seconda richiesta («dopo l'aggiunta del widget, vorrei si partisse col widget con highlight e modifica, la stessa animazione che c'è quando tieni premuto un widget, così è evidenziato e si capisce dove è posizionato») sono superate qui: la barra della modifica con «+ Widget» e «Pagine» e il vassoio dei tipi non si mostrano più; il tocco su una scheda, «Fine» ed Esc chiudono la vista pagine e la modifica e portano alla pagina in uso; la modifica dei widget esiste solo con un widget selezionato (barra Rimuovi · Annulla · Fine, cornice e maniglie), senza tremolio; il widget appena aggiunto da una cella «+» compare selezionato. Le voci precedenti restano come storico. Vedi [ADR-0016](../decisions/ADR-0016-schermo-intero-interazioni.md), terza rettifica, e [REP-20261021-003](../reports/REP-20261021-003-interazioni-schermo-intero.md).
- **Uso.** Nessuna barra in basso, orario, «Sincronizzato», «Modifica», indicatore delle pagine né chip delle persone. La griglia occupa tutto lo schermo e ha la stessa area in uso e in modifica (1219×594 a 1280×665 nella prova headless). Le celle vuote non mostrano «+».
- **Ingranaggio di Sistema.** Sempre visibile in alto a destra, piccolo e discreto, con un pallino rosso per un problema di connessione e blu per gli aggiornamenti; sul Tab M11 in orizzontale (da 60rem) si riservano circa 20 px in alto. L'avviso di connessione compare solo con un problema ed è sovrapposto, senza spostare la griglia.
- **Modifica.** La pressione lunga sullo spazio vuoto, o sul corpo di un widget nelle pagine piene (mai sui comandi), entra in modifica: l'indicatore delle pagine scende dall'alto con dissolvenza come barra in alto e la barra in basso sale dal basso. «Pagine» apre la vista pagine, che non si apre più dalla pressione lunga. Con il movimento ridotto restano solo le dissolvenze.
- **Indicatore.** Visibile per circa 2 s a ogni cambio pagina, senza intercettare il tocco.
- **Widget.** Il tocco sul corpo di un widget apre i dettagli (anche per i 20 adattivi, senza il pallino informazioni). Un widget da collegare, in uso, mostra solo l'avviso; in modifica un tocco seleziona, un secondo tocco sul selezionato apre le impostazioni (per un widget da collegare, subito «Collega»), e il dito sposta il widget subito.
- **Accessibilità.** Comandi invisibili ma raggiungibili da tastiera e lettori di schermo («Modifica la disposizione», «Pagina precedente», «Pagina successiva»), suggerimento la prima volta, voce «Modifica le pagine» in Sistema → Schermata Home.
- **Aperto.** Le barre coprono ancora le celle dell'ultima riga e circa 30 px della prima in modifica (D-11); il titolo della pagina si sovrappone ai chip «Da collegare» con l'indicatore acceso (ISSUE-105). La Casa 3D è a schermo intero fuori dal pager (rotta `#/casa`). Le scelte esecutive sui testi e sui tempi non sono state dettate dall'utente. Non provati col dito: pagine piene, cestino, TalkBack.

**Annotazione del 2026-10-23 (0.9.28, pressione).** Su richiesta dell'utente la pagina premuta sul vuoto non si rimpicciolisce più per tutta la durata della pressione (il testo sopra sul rimpicciolimento tra 180 ms e 1 s vale ormai per il widget e per la scheda della vista pagine, non per la pagina): il contatore della pressione corre senza cambiare nulla e solo alla soglia (500 ms) la pagina si rimpicciolisce con l'animazione della vista pagine, che si apre. Il tocco breve sul vuoto non mostra nulla; il tocco breve su un «+» ha il cenno della casella (si abbassa a 0,92 e torna, il «+» fa un quarto di giro, 200 ms, solo `scale`, `rotate` e `opacity`; con movimento ridotto solo un'attenuazione) e poi apre la scelta dei widget. Dettagli e verifiche in [REP-20261021-003](../reports/REP-20261021-003-interazioni-schermo-intero.md). Non provato sul tablet.

**Annotazione del 2026-10-23 (0.9.28, coreografia, blocco 1: pressione e vista pagine).** Con le risposte dell'utente alla coreografia ([REP-20261023-006](../reports/REP-20261023-006-coreografia-animazioni.md), «Risposte dell'utente (2026-10-23)») valgono queste regole di presentazione per il launcher: **niente scuotimento, oscillazione, rotazione né scivolamenti decorativi nei riscontri; solo scale piccole, mai oltre ±10 %** (tocco sul «+» 0,93, scheda sollevata 1,05, pagina o elemento che entra o esce 0,92 con dissolvenza); restano i movimenti necessari (scorrimento delle pagine, passo delle frecce, barre che salgono e scendono). Soglia della pressione lunga invariata (0,5 s, vibrazione alla soglia). Sostituisce il cenno del «+» della annotazione precedente (abbassamento a 0,92, quarto di giro del «+»): ora la casella scende a 0,93 dal tocco e resta giù finché il foglio parte; la scheda tenuta nella vista pagine non cambia fino alla soglia, poi sale del 5 % senza oscillare. **Ordine all'apertura della vista pagine**, da T0 (il primo fotogramma dopo il blocco del cambio di stato, quando parte il movimento): caselle fuori in 0,1 s, poi la pagina si rimpicciolisce (+80 ms), poi indicatore (+120), barra in basso (+160) e comandi sotto le schede (+200). Alla chiusura le caselle tornano in 0,18 s, la scheda resta arrotondata finché non copre lo schermo, e una pressione lunga che comincia durante la chiusura è ignorata. Tempi, curve e scale sono ora token su `:root` (`--aca-dur-*`, `--aca-motion-ease-*`, `--aca-scale-*`, `--aca-stagger`) in `themes/acasystem/tokens.css`. Non ancora misurato sul tablet. Le regole per fogli, Sistema, widget e avvisi seguono nei blocchi successivi.

**Annotazione del 2026-10-23 (0.9.28, coreografia, blocco 2: fogli, Sistema, pillole e avvisi).** Con le risposte dell'utente («va bene» per fogli e Sistema, «perfetto» per pillole e avvisi) valgono queste regole. **Fogli:** salgono in 0,28 s e scendono in 0,2 s; mentre salgono mostrano solo la struttura (intestazione) e il contenuto compare all'arrivo in 0,16 s; mentre scendono il contenuto resta visibile fino alla fine, anche se lo stato del foglio è già azzerato; il velo entra in 0,2 s ed esce in 0,16 s; due fogli di seguito si sovrappongono per circa 0,1 s (il secondo parte quando il primo è uscito per metà). Con movimento ridotto il pannello sfuma in 0,12 s. **Sistema:** entra con una dissolvenza e una piccola scala (0,96, nessuno scivolamento) in 0,24 s ed esce in 0,16 s; si monta trasparente mentre il launcher resta visibile, e il launcher si copre e si ferma solo a fine ingresso; all'uscita il launcher torna visibile e attivo sotto Sistema ancora opaco, che poi sfuma. Il tocco sull'ingranaggio e la prima immagine di Sistema sono distanziati di circa 2 fotogrammi più il costo del montaggio. Sistema scorre dentro il suo livello (non più col documento). **Pillole e avvisi:** i toast e l'avviso di connessione entrano ed escono con dissolvenza e scala 0,92 (uscita in 0,16 s); l'ingranaggio inerte si attenua in 0,16 s; il nome nell'indicatore cambia con una dissolvenza incrociata di 0,12 s; la barra del widget non cambia larghezza quando compare «Rimuovi» (gli altri comandi sfumano al loro posto). Tempi e scale in token (`--aca-dur-*`, `--aca-scale-*`). Non ancora misurato sul tablet. [REP-20261023-006](../reports/REP-20261023-006-coreografia-animazioni.md), «Blocco 2 della realizzazione».

**Annotazione del 2026-10-23 (0.9.28, coreografia, blocco 3: widget).** Con le risposte dell'utente («comparsa delle caselle col +»; «immaginavo la sagoma piatta con i bordi che al posto di essere solidi sono spezzettati»; il resto approvato) valgono queste regole per i widget. **Ridimensionamento:** durante il gesto il widget è una sagoma piatta, senza ombra, con bordo tratteggiato (rosso se la misura è rifiutata), per ogni widget, con o senza cornice o trasparente; la faccia e il contenuto sfumano in 0,1 s, la prima nuova misura aspetta (al massimo 0,1 s), il contenuto non viene calcolato per tutta la durata del gesto e, raggiunta la misura finale, torna con una dissolvenza di 0,2 s; anello e pallini restano. Le caselle «+» che compaiono o spariscono (ridimensionamento, spostamento, rimozione, ripristino) sfumano in 0,16 s con una scala 0,92: mai di colpo. **Spostamento:** la copia sollevata nasce alla grandezza del widget e sale a 1,04 in 0,15 s, ferma sotto il dito (niente scuotimento); la sua ombra sfuma, non si allarga. Al rilascio valido vola nella casella in 0,2 s (scala di nuovo 1, ombra che sfuma) e solo allora il layout cambia; se il rilascio non è valido torna alla casella di partenza in 0,24 s; sul cestino si restringe e sfuma in 0,16 s, poi la rimozione. Dopo l'atterraggio compaiono prima le caselle «+», poi l'anello (+0,04 s) e i pallini (+0,08 s). **Rimozione dalla barra o con Canc:** il widget scende a 0,92 e sfuma in 0,16 s, poi si rimuove; «Annulla» della pillola lo rimette da 0,92 in 0,24 s (dopo 0,06 s). **Widget aggiunto:** prima scende il foglio, poi (a 0,16 s) il widget entra da 0,92 in 0,24 s, con anello e pallini dopo di lui; se la pagina è piena le pagine scorrono prima alla pagina con spazio. Dove non si anima e con movimento ridotto tutto avviene subito o con dissolvenze di 0,12 s, senza scale. Non ancora provato col dito né misurato sul tablet. [REP-20261023-006](../reports/REP-20261023-006-coreografia-animazioni.md), «Blocco 3 della realizzazione».

**Annotazione del 2026-10-24 (0.9.28, ottimizzazione, giro 1).** Con la scelta dell'utente («B», continuare a ottimizzare la coreografia) e le sue risposte su due punti ([REP-20261023-006](../reports/REP-20261023-006-coreografia-animazioni.md), «Ottimizzazione 0.9.28, giro 1») valgono queste modifiche di presentazione; le altre regole di questo documento restano. **Sistema:** stessa dissolvenza con la stessa piccola scala (0,96), ma più breve, scelta dell'utente «Dissolvenza più breve»: entra in 0,14 s (prima 0,24) ed esce in 0,096 s (prima 0,16); l'annotazione del 2026-10-23 sopra resta come storico per i valori precedenti. **«Fine» della vista pagine:** su scelta dell'utente («Risposta più rapida») la chiusura parte nel momento del tocco, come nella 0.9.27, senza i due fotogrammi di attesa che l'apertura mantiene: i primi fotogrammi del ritorno delle schede possono essere meno fluidi, la risposta al tocco è più rapida. Tutto il resto dell'aspetto approvato (scale entro il 10 %, nessuno scuotimento, sagoma tratteggiata, caselle «+» in dissolvenza, ordine delle scene) non cambia: le correzioni interne al giro (ritardo dell'indicatore con una classe invece di un selettore sulla radice, condizione delle pagine fuori vista su un attributo, misura delle schede ricordata, direzione della finestra stabile all'atterraggio, scrittura di `data-aca-input` solo se cambia, commit del rilascio alla fine reale del volo) non hanno effetto visibile. Non ancora misurato sul tablet.

### 2026-10-27 — Consolle a schermo intero: stessi componenti del widget (decisione umana, ADR-0025, REP-20261027-002)

Il tocco su uno spazio vuoto dei widget TV, lettore musica e gruppi, telecamera, robot aspirapolvere, stanza e clima apre una **consolle a schermo intero** al posto della tendina:
- si allarga dal widget e ci ritorna;
- ha due colonne da 900 px e una sotto;
- si chiude con la freccia, il tasto Indietro, Esc o scorrendo in basso dall'intestazione.

Gli altri widget restano sulla tendina.

**Regola (richiesta dell'utente del 2026-10-27: «hai ricreato i pulsanti non hai preso i componenti usati nella ui del widget base»):** la consolle usa gli stessi componenti del widget e non ricrea pulsanti propri.
- I tasti base della TV vengono da un'unica faccia condivisa (`TvFace`), con le stesse misure, lo stesso stato «in attesa» e le stesse regole di disattivazione del widget.
- I comandi ripetuti usano sempre le parti comuni di `components/widgets/media/parts/Controls.tsx`:
  - trasporto (`Transport`);
  - coppia −/+ (`StepPair`);
  - volume (`VolumeControl`).
- Il riproduttore è la card «In riproduzione» ispirata alla reference [UI-011](componenti/originali/UI-011-riproduttore-now-playing.html.txt): copertina e titolo, barra sottile con i tempi, tasti di trasporto centrati.
  - È adattata ai materiali del tema, senza vetro, blur né ombre animate.
  - La condividono TV e lettore musica.
