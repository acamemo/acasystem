# ADR-0007 — Acasystem «OS»: accenti, tema unico, launcher a widget e tipografia

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0007 — Acasystem «OS»: accenti, tema unico, launcher a widget e tipografia |
| Stato | Accettata |
| Data e autore | 2026-10-06; scheda redatta da Claude Code (Opus 5.5) |
| Decisore e autorizzazione | Utente committente, chat del 2026-10-05/06 e piano approvato. «Io userei quell'arancione ed andrei a ricavare un blu elettrico e userei quelli come accent abbinati allo stile metallo». «Andrei ad eliminare la parte di Appearence, il tema sarà acasystem». «La parte di griglie la voglio personalizzabile come si personalizza la ui di android in stile widget, deve dare l'idea di un os con neuromorphism». «Io odio le scritte tutte in maiuscolo o quando ci sta spaziatura fra lettere […] non usare il grassetto». Risposte alle domande: arancione «#ff622a della pallina»; Aspetto «Eliminarlo tutto»; griglia «Pagine fisse con swipe»; regole del kit «Tieni il kit com'è». |
| Collegamenti | REQ-03; ADR-0004, ADR-0005, [ADR-0006](ADR-0006-sistema-metallo.md), [ADR-0008](ADR-0008-struttura-frontend-backend.md); [REP-20261006-001](../reports/REP-20261006-001-acasystem-os.md); reference UI-001, UI-003, UI-008, UI-009 |
| Sostituisce / sostituita da | Supera di ADR-0006 soltanto la scelta «nessun accento». Il resto di ADR-0006 resta valido. |

## Contesto ed evidenze

L'obiettivo minimo è rifare il frontend Tunet di Home Assistant con un'interfaccia migliore. Il kit Metallo (REP-20261005-012) è approvato come base; al checkpoint l'utente segnala però un uso eccessivo del nero e delle ombre negli stati di hover e selezione.

## Decisione umana

1. **Accenti.**
   - Arancione `#ff622a` e blu elettrico derivato. Il blu proposto è `#295bff`, hsl(226 100% 58%): stessa saturazione e luminosità dell'arancione, con tinta spostata di 210°.
   - Ruoli proposti: arancione per acceso/attivo/primario, blu per selezione/navigazione/focus.
   - Varianti più scure per testo e icone sul metallo, fissate da test di contrasto.
2. **Tema unico** Acasystem. Il pannello Aspetto è eliminato del tutto: tema, lingua (italiano fisso), unità (da Home Assistant), font (Inter), sfondi, blocco impostazioni e ritorno automatico alla home.
3. **Launcher stile Android:**
   - pagine fisse a celle, senza scorrimento verticale;
   - widget spostabili e ridimensionabili con pressione lunga, più l'alternativa da tastiera;
   - swipe tra le pagine e indicatore a pallina (UI-009);
   - copertina con calendario e ora (UI-008).
4. **Tipografia:**
   - mai testo tutto maiuscolo, mai spaziatura tra le lettere, mai grassetto (pesi 300/400/500);
   - maiuscola solo a inizio frase;
   - primitive tipografiche dedicate.
5. **Kit tenuto com'è:** testo inciso a gradiente e raggio 24px delle card restano come eccezioni volute alle regole della skill impeccable. Il bilanciamento di nero e ombre è approvato con il piano.

## Alternative e motivazioni

Alternative proposte e non scelte:

| Tema | Alternativa scartata |
|---|---|
| Arancione | #ef8231 |
| Pannello Aspetto | Conservare lingua, unità, blocco e ritorno alla home nel pannello Sistema |
| Griglia | Griglia a celle con scorrimento verticale |
| Kit | Testo inciso pieno e card a 16px |

Le scelte sono dell'utente; il blu esatto e le varianti ink sono scelte esecutive verificate con test.

## Conseguenze

- **Accesso alle impostazioni:** senza il blocco, i pannelli restano accessibili a chiunque usi il tablet finché ruoli e sessioni (REQ-05/06, ISSUE-006/008) non saranno progettati. Da registrare come problema aperto.
- **Font:** il collegamento a Google Fonts sparisce, perché i font alternativi servivano solo al selettore.
- **Configurazioni salvate:** le preferenze di tema, lingua e sfondo già salvate vengono ignorate.
- **Disposizione schede:** il modello della griglia passa dall'ordine con impaginazione automatica a coordinate di cella, con migrazione una tantum delle configurazioni esistenti.

## Verifiche e revisione

Esiti in REP-20261006-001:
- matrice degli stati approvata dall'utente;
- contrasti di accenti e varianti;
- regole tipografiche verificate da `lint:typography`;
- launcher verificato con mouse, tocco e tastiera.

Revisione quando l'utente definirà nuovi colori, ruoli o una variante scura.

## Annotazione del 2026-10-06 — checkpoint 1 del kit

L'utente approva la matrice degli stati dell'ondata 1 (REP-20261006-001) con le parole «ok, rosso va bene, usa Acceso/Spento e procedi con l'ondata 2».

- **Colore di errore:** `#b91c1c` (`--aca-danger`), con le varianti ink calcolate per testo e icone.
- **Interruttore:** etichette predefinite «Acceso»/«Spento»; la traccia è allargata a 6,75 em per contenerle.
- **Esito del checkpoint:** autorizzata l'ondata 2 (launcher, widget, sistema).

## Annotazione del 2026-10-07 — modifica manuale estesa

Su richiesta dell'utente (REP-20261007-027) la modifica del launcher si estende dentro questa decisione: ridimensionamento da ogni lato, vassoio dei tipi trascinabili, anteprima dal vivo, riordino automatico che riduce i widget fino al minimo, dimensione tolta dal pannello di aggiunta. Restano l'alternativa senza trascinamento e la pressione lunga per entrare in modifica; nessun nuovo ADR.

## Annotazione del 2026-10-07 — vista delle pagine

Su richiesta dell'utente (REP-20261007-028) la pressione lunga distingue il bersaglio: su un widget apre la modifica dei widget, sul vuoto la vista delle pagine, con eliminazione, nuova pagina, nome e riordino trascinando. Le pagine vuote create dall'utente restano nel pager anche fuori dalla modifica. Rientra in questa decisione; nessun nuovo ADR.

## Annotazione del 2026-10-08 — personalizzazione come Android

Su richiesta dell'utente (piano approvato in chat il 2026-10-07; REP-20261007-030…038) il launcher si avvicina alla personalizzazione della schermata Home di Android:
- copertina con widget veri;
- zona «Rimuovi» e «Annulla»;
- riordino dopo 650 ms;
- blocco della disposizione e pagina principale;
- densità della griglia;
- vassoio per categorie;
- aspetto del widget;
- pile di widget;
- sfondo con accento ricavato.

**Fonti consultate il 2026-10-07:** AOSP Launcher3 (Workspace, SpringLoadedDragController, LauncherAccessibilityDelegate, strings), developer.android.com app widgets, support.google.com Pixel, Samsung One UI, source.android.com Material. Le alternative senza trascinamento restano. Rientra in questa decisione; nessun nuovo ADR.

## Annotazione del 2026-10-08 — modifica semplificata e griglia per pagina

Su richiesta dell'utente del 2026-10-08 ([REP-20261008-001](../reports/REP-20261008-001-modifica-semplificata-griglia-per-pagina.md)) la modifica del launcher si semplifica dentro questa decisione:
- **widget:** pressione lunga di 1 s con riscontro, che vale anche per aprire l'editor delle pagine; otto pallini sul widget selezionato al posto dei pomelli; barra Rimuovi · Annulla · Conferma; cestino della barra come bersaglio di rilascio; impostazioni col doppio tocco;
- **pagine:** barra della modifica con «+ Widget» e «Pagine»; nell'editor nome cambiato in linea, riordino con pressione lunga sulla scheda, menu «Nuova» con le pagine pronte e Nascondi/Mostra; il foglio della pagina è eliminato;
- **griglia:** colonne scelte per pagina, righe automatiche e deterministiche per classe di schermo, Copertina a 3 colonne, gap dinamico diverso per asse. La soglia della classe del tablet non cambia.

Delle annotazioni precedenti supera la zona «Rimuovi», il riordino trascinando il nome e la matita «nome e icona». Restano le alternative senza trascinamento: «Sposta qui» sulle celle libere, sezioni «Dimensione» e «Pagina» nelle impostazioni, frecce da tastiera, «Sposta prima/dopo» e Alt+frecce. Il layout resta alla versione 1, con il campo `columns` e chiavi di posizione per griglia. Nessun nuovo ADR.

## Annotazione del 2026-10-09 — editor delle pagine con icone

Su richiesta dell'utente del 2026-10-09 ([REP-20261009-002](../reports/REP-20261009-002-editor-pagine-icone.md)), dentro questa decisione:
- «Nuova» crea subito una pagina vuota di widget; il menu delle pagine pronte è tolto, quelle esistenti restano;
- il nome della pagina si cambia in linea nella barra dell'editor, accanto alla casetta della pagina principale, e non più sotto la scheda;
- le azioni della barra, le frecce e il selettore delle colonne sono icone senza testo, con una nuvoletta alla pressione lunga, al passaggio del mouse e al fuoco.

Dell'annotazione del 2026-10-08 supera il menu «Nuova» con le pagine pronte. Restano le alternative senza trascinamento, compresi «Sposta prima/dopo» e Alt+frecce. Nessun nuovo ADR.

## Annotazione del 2026-10-14 — una sola barra in basso e «Fine» al posto di «Conferma»

Il testo storico resta com'è; la nuova scelta è registrata in [ADR-0013](ADR-0013-barra-unica.md) (accettata dall'utente il 2026-10-13, piano [REP-20261013-002](../reports/REP-20261013-002-piano-barra-unica.md)).
- **Interfaccia OS.** La «barra di stato» descritta in design.md come parte dell'interfaccia OS non sta più in alto: sta nella fascia in basso, con ora, connessione, Sistema, chip e «Modifica». In alto resta solo l'area sicura. L'indicatore a pallina (UI-009, riga 26) non cambia.
- **Riga 98, barra del widget.** «Rimuovi · Annulla · Conferma» è superata dalla 0.9.2 ([REP-20261013-001](../reports/REP-20261013-001-barre-ridondanze.md)): la barra del widget è «Rimuovi · Annulla · Fine»; un solo tocco su «Fine» tiene le modifiche ed esce dalla modifica.
