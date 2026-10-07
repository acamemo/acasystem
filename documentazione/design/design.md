# ACA SYSTEM — Specifica di design

Aggiornato: 2026-10-06 (sezione «Sistema Metallo»). Questo documento è la fonte delle scelte visive e delle proposte UI/UX. Requisiti, ruoli e comportamento dell'app sono nel [modulo funzionalità](../funzionalita/README.md); stato effettivo e incarichi in [project-status.md](../project-status.md). HOME, controlli condivisi e finestre di gestione schede/pagine hanno il primo materiale Neumorphism, verificato sul banco locale. Pulsanti, emblema di benvenuto e card di stato (SensorCard) usano il materiale a pressione adattato da UI-003 ([REP-20261005-011](../reports/REP-20261005-011-materiale-pressione.md)); le altre card dispositivo, il dimmer con riscontro HA e le altre schermate restano da convertire.

## Scopo e responsabilità

Descrivere come presentare le funzionalità autorizzate: stile, colori, gerarchia, componenti e feedback. Il design non aggiunge funzionalità, permessi o automazioni. Una schermata proposta non autorizza lo sviluppo del comportamento rappresentato.

La fase 1 minima è Home Assistant personalizzato graficamente, con Tunet come punto di partenza React e pilota in ufficio. Il suo perimetro è in [pilot-scope.md](../funzionalita/pilot-scope.md). L'analisi tecnica di Tunet deve precedere la scelta di componenti e librerie da integrare.

## Sistema Metallo (fonte corrente dal 2026-10-06)

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

**Interfaccia «OS».** Barra di stato; copertina con calendario a strappo ([UI-008](componenti/originali/UI-008-calendario-strappo.txt)) e orologio; pagine di widget a celle stile Android, modificabili con pressione lunga; swipe tra le pagine con l'indicatore a pallina ([UI-009](componenti/originali/UI-009-indicatore-pallina.txt)); dettagli dei dispositivi in fogli; Sistema come pagina intera. Il pannello Aspetto non esiste più.

**Schermata di base e celle «+»** (richiesta dell'utente del 2026-10-07, [REP-20261007-001](../reports/REP-20261007-001-launcher-polish.md)):
- All'avvio il launcher apre sempre «Principale», la prima pagina di widget, anche se vuota. La copertina resta alla sua sinistra, raggiungibile con lo swipe. La pagina vista l'ultima volta non decide più l'avvio.
- Su ogni pagina di widget, in vista normale e in modifica, ogni cella libera è un pozzetto tenue con un «+» discreto. Hover, focus e tocco lasciano il pozzetto trasparente come a riposo: il bordo interno si scurisce appena (fino al 28% al tocco, 18% a riposo) e la pressione è data dalla scala; niente riempimento metallico né ombre al 55% (alleggerito il 2026-10-07, REP-20261007-004). Il tocco apre l'aggiunta e il widget va nella cella toccata, alla taglia scelta, oppure nel punto libero più vicino. La griglia ha una sola fermata di tabulazione e si percorre con le frecce.
- La griglia non cambia cella né posizione tra vista normale e modifica: il piè di pagina è una fascia di altezza costante che contiene l'indicatore e, in modifica, la barra dei comandi.
- In modifica l'unica azione arancione è «Fine». «Aggiungi widget», «Pagina» e «Nuova pagina» sono controlli metallici della stessa altezza. La × di rimozione è un piccolo pomello centrato sullo spigolo, con area di tocco di 44 px.
- La conferma di rimozione usa la variante «danger» del pulsante (inchiostro rosso sul metallo). Il pallino degli aggiornamenti di Sistema è blu, perché è un'informazione e non un errore.

**Spaziature e cornice.** Scala su base 4 px in `tokens.css` (`--aca-space-1…7`), margine laterale unico `--aca-gutter` per barra di stato, pagine e piè di pagina, altezza dei controlli della cornice `--aca-control-height` (44 px). Il raggio delle celle `--aca-radius-cell` è definito una volta sulla griglia e vale per widget, pozzetti, anteprima di rilascio e maniglie.

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
