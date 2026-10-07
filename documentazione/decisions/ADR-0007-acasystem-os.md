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
